/**
 * Application Logic for Mundi Trofeos · Tiendas Trofex · Premia
 * Sistema de Gestión de Rutas y Viáticos (Con Módulo de Viáticos Completo)
 */

// Global State
let currentRole = 'pilot'; // 'pilot' or 'admin'
let currentSessionUser = null;
let selectedTripType = null; // null = no option selected yet, 'single' (-1 dia), 'multi' (+1 dia)
let activeTimerInterval = null;

let inspectionFormState = {
  interiorCleanliness: 'Bueno',
  exteriorCleanliness: 'Bueno',
  fuelLevel: 'Lleno',
  fluids: {
    aceite: 'Correcto',
    radiador: 'Correcto',
    frenos: 'Correcto',
    hidraulico: 'Correcto'
  }
};

let multiDayVehicleOwnership = 'empresa'; // 'empresa' or 'propio'
let adminNewPilotPhotoUrl = '';
let currentOpenedRecordDetails = null; // Stores currently viewed modal record
let currentExportFilename = 'Documento_Oficial.pdf';

// Viáticos dynamic form counters
let legCounter = 0;
let hotelCounter = 0;
let otrosCounter = 0;
let reciboCounter = 0;

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) lucide.createIcons();
  initDateAndTimes();
  checkExistingSession();
});

function initDateAndTimes() {
  const dateInput = document.getElementById('insp-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
  }

  const startTimeInput = document.getElementById('insp-start-time');
  if (startTimeInput) {
    const now = new Date();
    startTimeInput.value = now.toTimeString().split(' ')[0];
  }

  // Viáticos default dates
  const fsalida = document.getElementById('vreq-fsalida');
  const fregreso = document.getElementById('vreq-fregreso');
  if (fsalida && fregreso) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 2);
    fsalida.value = today.toISOString().split('T')[0];
    fregreso.value = tomorrow.toISOString().split('T')[0];
  }
}

/* ==========================================================================
   AUTHENTICATION & SESSION MANAGEMENT
   ========================================================================== */

function checkExistingSession() {
  const session = Storage.getSession();
  if (session && session.isLoggedIn) {
    currentSessionUser = session;
    currentRole = session.role;
    showAppViews();
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  document.getElementById('navbar').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('pilot-view').style.display = 'none';
  document.getElementById('admin-view').style.display = 'none';
  populatePilotSelectInLogin();
}

function populatePilotSelectInLogin() {
  const pilots = Storage.getPilots();
  const select = document.getElementById('login-pilot-id');
  if (!select) return;

  select.innerHTML = pilots.map(p => {
    const firstName = (p.firstName || '').trim().split(/\s+/)[0] || '';
    const lastName = (p.lastName || '').trim().split(/\s+/)[0] || '';
    const displayName = `${firstName} ${lastName}`.trim() || 'Piloto';
    return `<option value="${p.id}">${displayName}</option>`;
  }).join('');
}

function switchLoginRole(role) {
  currentRole = role;
  const tabPilot = document.getElementById('tab-login-pilot');
  const tabAdmin = document.getElementById('tab-login-admin');
  const groupPilot = document.getElementById('group-pilot-select');
  const groupAdmin = document.getElementById('group-admin-email');

  if (role === 'pilot') {
    tabPilot.classList.add('active');
    tabAdmin.classList.remove('active');
    groupPilot.style.display = 'flex';
    groupAdmin.style.display = 'none';
  } else {
    tabAdmin.classList.add('active');
    tabPilot.classList.remove('active');
    groupPilot.style.display = 'none';
    groupAdmin.style.display = 'flex';
  }
}

function quickLogin(role) {
  switchLoginRole(role);
  if (role === 'pilot') {
    const pilots = Storage.getPilots();
    const firstPilot = pilots[0];
    const sessionData = {
      isLoggedIn: true,
      role: 'pilot',
      userId: firstPilot.id,
      name: `${firstPilot.firstName} ${firstPilot.lastName}`,
      country: firstPilot.country
    };
    Storage.saveSession(sessionData);
    currentSessionUser = sessionData;
    showAppViews();
    showToast(`Bienvenido Piloto, ${sessionData.name}`, 'success');
  } else {
    const sessionData = {
      isLoggedIn: true,
      role: 'admin',
      userId: 'admin1',
      name: 'Administrador General',
      country: 'Corporativo'
    };
    Storage.saveSession(sessionData);
    currentSessionUser = sessionData;
    showAppViews();
    showToast('Sesión de Administrador iniciada correctamente', 'success');
  }
}

function handleLoginSubmit(e) {
  e.preventDefault();
  if (currentRole === 'pilot') {
    const pilotId = document.getElementById('login-pilot-id').value;
    const pilots = Storage.getPilots();
    const pilot = pilots.find(p => p.id === pilotId);
    if (!pilot) {
      showToast('Seleccione un piloto válido', 'error');
      return;
    }
    const sessionData = {
      isLoggedIn: true,
      role: 'pilot',
      userId: pilot.id,
      name: `${pilot.firstName} ${pilot.lastName}`,
      country: pilot.country
    };
    Storage.saveSession(sessionData);
    currentSessionUser = sessionData;
    showAppViews();
    showToast(`Bienvenido ${sessionData.name}`, 'success');
  } else {
    const email = document.getElementById('login-admin-email').value;
    const sessionData = {
      isLoggedIn: true,
      role: 'admin',
      userId: 'admin1',
      name: 'Administrador General',
      email: email,
      country: 'Corporativo'
    };
    Storage.saveSession(sessionData);
    currentSessionUser = sessionData;
    showAppViews();
    showToast('Sesión de Administrador activada', 'success');
  }
}

function logoutSession() {
  if (activeTimerInterval) clearInterval(activeTimerInterval);
  Storage.clearSession();
  currentSessionUser = null;
  selectedTripType = null;
  showToast('Has cerrado sesión correctamente', 'warning');
  showLoginScreen();
}

/* ==========================================================================
   NAVIGATION & ROLE SWITCHING
   ========================================================================== */

function showAppViews() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('navbar').style.display = 'flex';

  document.getElementById('user-display-name').textContent = currentSessionUser.name;
  document.getElementById('user-display-role').textContent = currentSessionUser.role === 'admin' ? 'Administrador' : 'Piloto';
  document.getElementById('user-avatar-text').textContent = currentSessionUser.name.charAt(0).toUpperCase();

  const statusPillText = document.getElementById('status-pill-text');
  if (statusPillText) {
    statusPillText.textContent = currentSessionUser.role === 'admin' ? 'Administrador' : 'Pilotos';
  }

  updateNavRoleTabs(currentSessionUser.role);

  const pilotView = document.getElementById('pilot-view');
  const adminView = document.getElementById('admin-view');

  const roleSwitcher = document.getElementById('nav-role-switcher');

  if (currentSessionUser.role === 'pilot') {
    if (roleSwitcher) roleSwitcher.style.display = 'none';
    pilotView.style.display = 'flex';
    adminView.style.display = 'none';
    initPilotView();
  } else {
    if (roleSwitcher) roleSwitcher.style.display = 'flex';
    pilotView.style.display = 'none';
    adminView.style.display = 'flex';
    initAdminView();
  }

  if (window.lucide) lucide.createIcons();
}

function updateNavRoleTabs(role) {
  const btnPilot = document.getElementById('nbtn-pilot');
  const btnAdmin = document.getElementById('nbtn-admin');
  if (role === 'pilot') {
    btnPilot.classList.add('active');
    btnAdmin.classList.remove('active');
  } else {
    btnAdmin.classList.add('active');
    btnPilot.classList.remove('active');
  }
}

function switchUserRole(targetRole) {
  if (!currentSessionUser) return;
  currentSessionUser.role = targetRole;
  Storage.saveSession(currentSessionUser);
  showAppViews();
  showToast(`Modo cambiado a: ${targetRole === 'admin' ? 'Administrador' : 'Piloto'}`, 'success');
}

/* ==========================================================================
   PILOT TRIP TYPE SELECTION (-1 DÍA vs +1 DÍA)
   FORMS HIDDEN BY DEFAULT UNTIL OPTION IS CLICKED
   ========================================================================== */

function selectTripType(type) {
  selectedTripType = type;
  const cardSingle = document.getElementById('card-type-single');
  const cardMulti = document.getElementById('card-type-multi');
  const formSingle = document.getElementById('section-single-day-form');
  const formMulti = document.getElementById('section-multi-day-form');

  if (type === 'single') {
    cardSingle.classList.add('active');
    cardMulti.classList.remove('active');
    formSingle.style.display = 'flex';
    formMulti.style.display = 'none';
    showToast('Formulario de Viaje de 1 Día (-1 Día) desplegado.', 'info');
    formSingle.scrollIntoView({ behavior: 'smooth' });
  } else if (type === 'multi') {
    cardMulti.classList.add('active');
    cardSingle.classList.remove('active');
    formMulti.style.display = 'flex';
    formSingle.style.display = 'none';
    initViaticosForm();
    showToast('Formulario y Calculadora de Viáticos (+1 Día) desplegado.', 'info');
    formMulti.scrollIntoView({ behavior: 'smooth' });
  } else {
    cardSingle.classList.remove('active');
    cardMulti.classList.remove('active');
    formSingle.style.display = 'none';
    formMulti.style.display = 'none';
  }
}

/* ==========================================================================
   PILOT VIEW - SINGLE DAY ROUTE (-1 DÍA)
   ========================================================================== */

function initPilotView() {
  document.getElementById('pilot-welcome-name').textContent = `Hola, ${currentSessionUser.name}`;
  
  populatePilotDropdown();
  populateVehicleDropdown();
  checkActiveRouteStatus();
  renderPilotRouteHistory();
}

function getCountryAcronym(countryName) {
  if (!countryName) return 'GTM';
  const c = countryName.trim().toLowerCase();
  if (c.includes('guatemala')) return 'GTM';
  if (c.includes('honduras')) return 'HND';
  if (c.includes('salvador')) return 'SLV';
  if (c.includes('nicaragua')) return 'NIC';
  if (c.includes('costa rica')) return 'CRI';
  return countryName.substring(0, 3).toUpperCase();
}

function isVehicleAllowedForLicense(vehicleType, licenseType) {
  if (!licenseType) return true;
  const lType = licenseType.toUpperCase().trim();
  const vType = (vehicleType || '').toLowerCase().trim();

  // Tipo C: Only Light Vehicles (Panel, Pickup, Sedán, SUV)
  if (lType === 'C') {
    const isLight = vType.includes('panel') || vType.includes('pickup') || vType.includes('sedán') || vType.includes('sedan') || vType.includes('suv') || vType.includes('liviano');
    const isHeavyOrMedium = vType.includes('camioncito') || vType.includes('camión') || vType.includes('camion') || vType.includes('tráiler') || vType.includes('trailer');
    return isLight && !isHeavyOrMedium;
  }

  // Tipo B: Light & Medium Vehicles (Panel, Pickup, Sedán, SUV, Camioncito)
  if (lType === 'B') {
    const isHeavy = vType.includes('camión pesado') || vType.includes('camion pesado') || vType.includes('tráiler') || vType.includes('trailer');
    return !isHeavy;
  }

  // Tipo A: All Vehicles Allowed (Heavy, Medium, Light)
  if (lType === 'A') {
    return true;
  }

  return true;
}

function handlePilotChange() {
  const select = document.getElementById('insp-pilot-id');
  if (!select) return;
  const pilotId = select.value;
  const pilots = Storage.getPilots();
  const pilot = pilots.find(p => p.id === pilotId);

  const countryBox = document.getElementById('insp-pilot-country-box');
  if (countryBox && pilot) {
    const acronym = getCountryAcronym(pilot.country);
    countryBox.innerHTML = `<span class="country-acronym-badge" style="background:#2563eb; color:#fff; font-weight:800; padding:2px 8px; border-radius:4px;">${acronym}</span>`;
  }

  populateVehicleDropdown(pilot);
}

function populatePilotDropdown() {
  const pilots = Storage.getPilots();
  const select = document.getElementById('insp-pilot-id');
  if (!select) return;

  const currentUserId = currentSessionUser ? currentSessionUser.userId : '';
  const currentUserName = currentSessionUser ? (currentSessionUser.name || '').toLowerCase().trim() : '';

  const matchedPilot = pilots.find(p => 
    p.id === currentUserId || 
    `${p.firstName} ${p.lastName}`.toLowerCase().trim() === currentUserName
  );

  select.innerHTML = pilots.map(p => {
    const isSelected = matchedPilot ? p.id === matchedPilot.id : p.id === currentUserId;
    const countryAcronym = getCountryAcronym(p.country);
    return `
      <option value="${p.id}" ${isSelected ? 'selected' : ''}>
        ${p.firstName} ${p.lastName} [${countryAcronym}]
      </option>
    `;
  }).join('');

  if (currentSessionUser && currentSessionUser.role === 'pilot') {
    select.disabled = true;
    select.style.pointerEvents = 'none';
    select.style.background = 'var(--bg-app)';
    select.style.opacity = '0.95';
    select.style.cursor = 'not-allowed';
  } else {
    select.disabled = false;
    select.style.pointerEvents = 'auto';
    select.style.background = '#ffffff';
    select.style.opacity = '1';
    select.style.cursor = 'default';
  }

  handlePilotChange();
}

function populateVehicleDropdown(pilotObj) {
  const select = document.getElementById('insp-vehicle-id');
  if (!select) return;

  let pilot = pilotObj;
  if (!pilot) {
    const pilotId = document.getElementById('insp-pilot-id')?.value;
    const pilots = Storage.getPilots();
    pilot = pilots.find(p => p.id === pilotId);
  }

  const vehicles = Storage.getVehicles();
  const licenseType = pilot ? pilot.licenseType : 'C';

  // Filter vehicles according to license restriction
  const allowedVehicles = vehicles.filter(v => isVehicleAllowedForLicense(v.vehicleType, licenseType));

  if (allowedVehicles.length === 0) {
    select.innerHTML = `<option value="">⚠️ No hay vehículos livianos compatibles disponibles para Licencia Tipo ${licenseType}</option>`;
    const badgePlate = document.getElementById('vbadge-plate');
    const badgeModel = document.getElementById('vbadge-model');
    const badgeType = document.getElementById('vbadge-type');
    const badgeYear = document.getElementById('vbadge-year');
    const badgeIns = document.getElementById('vbadge-insurance');
    if (badgePlate) badgePlate.textContent = '—';
    if (badgeModel) badgeModel.textContent = '—';
    if (badgeType) badgeType.textContent = '—';
    if (badgeYear) badgeYear.textContent = '—';
    if (badgeIns) badgeIns.textContent = '—';
    return;
  }

  select.innerHTML = allowedVehicles.map(v => `
    <option value="${v.id}">${v.brand || ''} ${v.model || ''} - Placa: ${v.plate} (${v.vehicleType})</option>
  `).join('');

  handleVehicleChange();
}

function handleVehicleChange() {
  const vehicleId = document.getElementById('insp-vehicle-id')?.value;
  const vehicles = Storage.getVehicles();
  const v = vehicles.find(item => item.id === vehicleId);

  const badgePlate = document.getElementById('vbadge-plate');
  const badgeModel = document.getElementById('vbadge-model');
  const badgeType = document.getElementById('vbadge-type');
  const badgeYear = document.getElementById('vbadge-year');
  const badgeIns = document.getElementById('vbadge-insurance');

  if (v) {
    if (badgePlate) badgePlate.textContent = v.plate;
    if (badgeModel) badgeModel.textContent = `${v.brand || ''} ${v.model || ''}`.trim() || '—';
    if (badgeType) badgeType.textContent = v.vehicleType || '—';
    if (badgeYear) badgeYear.textContent = v.year || '—';
    if (badgeIns) {
      if (v.hasInsurance === 'Sí') {
        badgeIns.innerHTML = `<span style="color:#047857; font-weight:800;">✓ Sí (Pol: ${v.policyNumber || 'Vigente'})</span>`;
      } else {
        badgeIns.innerHTML = `<span style="color:#b91c1c; font-weight:800;">✕ No</span>`;
      }
    }
  }
}

function setQuality(type, val, targetEl) {
  const container = document.getElementById(`qs-${type}`);
  if (!container) return;

  container.querySelectorAll('.quality-pill-item').forEach(pill => {
    pill.classList.remove('active');
  });

  if (targetEl) {
    targetEl.classList.add('active');
  } else {
    container.querySelectorAll('.quality-pill-item').forEach(pill => {
      const onclickAttr = pill.getAttribute('onclick') || '';
      if (onclickAttr.includes(`'${val}'`)) {
        pill.classList.add('active');
      }
    });
  }

  if (type === 'interior') inspectionFormState.interiorCleanliness = val;
  if (type === 'exterior') inspectionFormState.exteriorCleanliness = val;
  if (type === 'fuel') inspectionFormState.fuelLevel = val;

  if (type === 'fluid-aceite') inspectionFormState.fluids.aceite = val;
  if (type === 'fluid-radiador') inspectionFormState.fluids.radiador = val;
  if (type === 'fluid-frenos') inspectionFormState.fluids.frenos = val;
  if (type === 'fluid-hidraulico') inspectionFormState.fluids.hidraulico = val;
}

function updateSwitchCardState(chk, labelId) {
  const lbl = document.getElementById(labelId);
  const card = chk.closest('.defect-switch-card');
  if (chk.checked) {
    if (lbl) {
      lbl.textContent = 'Sí';
      lbl.style.background = '#fef2f2';
      lbl.style.color = '#e11d48';
    }
    if (card) {
      card.style.borderColor = '#f43f5e';
      card.style.background = '#fff1f2';
    }
  } else {
    if (lbl) {
      lbl.textContent = 'No';
      lbl.style.background = '#f1f5f9';
      lbl.style.color = '#64748b';
    }
    if (card) {
      card.style.borderColor = 'var(--border-light)';
      card.style.background = '#ffffff';
    }
  }
}

function updateKitCardState(chk, labelId) {
  const lbl = document.getElementById(labelId);
  const card = chk.closest('.kit-switch-card');
  if (chk.checked) {
    if (lbl) {
      lbl.textContent = 'Sí';
      lbl.style.background = '#d1fae5';
      lbl.style.color = '#047857';
    }
    if (card) {
      card.style.borderColor = '#10b981';
      card.style.background = '#ecfdf5';
    }
  } else {
    if (lbl) {
      lbl.textContent = 'No';
      lbl.style.background = '#fef2f2';
      lbl.style.color = '#e11d48';
    }
    if (card) {
      card.style.borderColor = '#f43f5e';
      card.style.background = '#fff1f2';
    }
  }
}

function toggleDefectsSubOptions(hasDefects) {
  const container = document.getElementById('defects-suboptions-container');
  const labelText = document.getElementById('label-has-defects');
  const mainCard = document.querySelector('.defect-switch-card-main');

  if (hasDefects) {
    if (container) container.style.display = 'grid';
    if (labelText) {
      labelText.textContent = 'Sí (Presenta Daños)';
      labelText.style.color = '#e11d48';
      labelText.style.background = '#fef2f2';
    }
    if (mainCard) {
      mainCard.style.borderColor = '#f43f5e';
      mainCard.style.background = '#fff1f2';
    }
  } else {
    if (container) container.style.display = 'none';
    if (labelText) {
      labelText.textContent = 'No (Sin Daños)';
      labelText.style.color = '#64748b';
      labelText.style.background = '#f1f5f9';
    }
    if (mainCard) {
      mainCard.style.borderColor = 'var(--border-light)';
      mainCard.style.background = '#ffffff';
    }

    ['chk-dmg-carroceria', 'chk-dmg-vidrios', 'chk-dmg-llantas', 'chk-dmg-espejos', 'chk-alarm', 'chk-def-tablero'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });
  }
}

function handleDefectPhotoUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    defectPhotoBase64 = evt.target.result;
    const imgPreview = document.getElementById('preview-defect-photo');
    const container = document.getElementById('preview-defect-photo-container');
    if (imgPreview && container) {
      imgPreview.src = defectPhotoBase64;
      container.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

function handleStartRouteSubmit(e) {
  e.preventDefault();

  const pilotId = document.getElementById('insp-pilot-id').value;
  const vehicleId = document.getElementById('insp-vehicle-id').value;
  const date = document.getElementById('insp-date').value;
  const startTime = document.getElementById('insp-start-time').value || new Date().toTimeString().split(' ')[0];
  const fuelLevel = inspectionFormState.fuelLevel || 'Lleno';
  const odometer = document.getElementById('insp-odometer').value;

  const pilots = Storage.getPilots();
  const vehicles = Storage.getVehicles();
  const pilot = pilots.find(p => p.id === pilotId);
  const vehicle = vehicles.find(v => v.id === vehicleId);

  const hasDefects = document.getElementById('chk-has-defects').checked;

  const inspectionRecord = {
    id: `insp_${Date.now()}`,
    pilotId,
    pilotName: pilot ? `${pilot.firstName} ${pilot.lastName}` : 'Piloto',
    vehicleId,
    vehiclePlate: vehicle ? vehicle.plate : '—',
    vehicleUnit: vehicle ? vehicle.unitName : '—',
    vehicleModel: vehicle ? vehicle.model : '—',
    vehicleType: vehicle ? vehicle.vehicleType : '—',
    country: pilot ? pilot.country : 'Guatemala',
    date,
    startTime,
    fuelLevel,
    odometer,
    interiorCleanliness: inspectionFormState.interiorCleanliness,
    exteriorCleanliness: inspectionFormState.exteriorCleanliness,
    hasDefects,
    defectPhoto: hasDefects ? defectPhotoBase64 : null,
    damages: {
      carroceria: hasDefects ? document.getElementById('chk-dmg-carroceria').checked : false,
      vidrios: hasDefects ? document.getElementById('chk-dmg-vidrios').checked : false,
      llantas: hasDefects ? document.getElementById('chk-dmg-llantas').checked : false,
      espejos: hasDefects ? document.getElementById('chk-dmg-espejos').checked : false,
    },
    alarm: hasDefects ? document.getElementById('chk-alarm').checked : false,
    defectsTablero: hasDefects ? document.getElementById('chk-def-tablero').checked : false,
    fluids: {
      aceite: inspectionFormState.fluids.aceite,
      radiador: inspectionFormState.fluids.radiador,
      frenos: inspectionFormState.fluids.frenos,
      hidraulico: inspectionFormState.fluids.hidraulico,
    },
    kit: {
      llanta: document.getElementById('kit-llanta').checked,
      gato: document.getElementById('kit-gato').checked,
      triangulo: document.getElementById('kit-triangulo').checked,
      extintor: document.getElementById('kit-extintor').checked,
    },
    docs: {
      tarjeta: document.getElementById('doc-tarjeta').checked,
      licencia: document.getElementById('doc-licencia').checked,
    }
  };

  Storage.saveCurrentInspection(inspectionRecord);
  defectPhotoBase64 = null;
  showToast('Inspección registrada. Ruta iniciada.', 'success');
  checkActiveRouteStatus();
}

function checkActiveRouteStatus() {
  const currentInsp = Storage.getCurrentInspection();
  const banner = document.getElementById('active-route-banner');
  const selector = document.getElementById('section-trip-type-selector');
  const formSingle = document.getElementById('section-single-day-form');
  const formMulti = document.getElementById('section-multi-day-form');

  if (currentInsp) {
    banner.style.display = 'flex';
    selector.style.display = 'none';
    formSingle.style.display = 'none';
    formMulti.style.display = 'none';

    document.getElementById('ar-pilot-name').textContent = currentInsp.pilotName;
    document.getElementById('ar-vehicle-plate').textContent = currentInsp.vehiclePlate;
    document.getElementById('ar-vehicle-unit').textContent = currentInsp.vehicleUnit;
    document.getElementById('ar-vehicle-model').textContent = currentInsp.vehicleModel;
    document.getElementById('ar-start-time').textContent = currentInsp.startTime;
    document.getElementById('active-route-date').textContent = currentInsp.date;

    startLiveRouteTimer(currentInsp.startTime);
  } else {
    banner.style.display = 'none';
    selector.style.display = 'flex';
    selectTripType(selectedTripType);
    if (activeTimerInterval) clearInterval(activeTimerInterval);
  }
}

function startLiveRouteTimer(startTimeStr) {
  if (activeTimerInterval) clearInterval(activeTimerInterval);

  const [sh, sm, ss] = startTimeStr.split(':').map(Number);
  const startTime = new Date();
  startTime.setHours(sh, sm, ss || 0);

  activeTimerInterval = setInterval(() => {
    const now = new Date();
    let diffSec = Math.floor((now - startTime) / 1000);
    if (diffSec < 0) diffSec = 0;

    const hrs = String(Math.floor(diffSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, '0');
    const secs = String(diffSec % 60).padStart(2, '0');

    document.getElementById('active-route-timer').textContent = `${hrs}:${mins}:${secs}`;
  }, 1000);
}

function confirmEndRoute() {
  if (confirm('¿Desea finalizar la ruta de transporte?')) {
    const currentInsp = Storage.getCurrentInspection();
    if (!currentInsp) return;

    const endTime = new Date().toTimeString().split(' ')[0];
    const newHistoryRecord = {
      id: `rh_${Date.now()}`,
      tipo: 'Ruta 1 Día',
      pilotId: currentInsp.pilotId,
      pilotName: currentInsp.pilotName,
      vehiclePlate: currentInsp.vehiclePlate,
      vehicleUnit: currentInsp.vehicleUnit,
      vehicleModel: currentInsp.vehicleModel,
      vehicleType: currentInsp.vehicleType,
      date: currentInsp.date,
      startTime: currentInsp.startTime,
      endTime: endTime,
      country: currentInsp.country,
      status: 'Completada',
      fullInspection: currentInsp
    };

    const history = Storage.getHistory();
    history.unshift(newHistoryRecord);
    Storage.saveHistory(history);
    Storage.saveCurrentInspection(null);

    showToast('Ruta finalizada exitosamente.', 'success');
    selectedTripType = null;
    checkActiveRouteStatus();
    renderPilotRouteHistory();
  }
}

/* ==========================================================================
   PILOT VIEW - MULTI-DAY VIÁTICOS CALCULATOR (+1 DÍA)
   ========================================================================== */

function setVehicleOwnership(ownershipType) {
  multiDayVehicleOwnership = ownershipType;
  const pillEmpresa = document.getElementById('pill-owner-empresa');
  const pillPropio = document.getElementById('pill-owner-propio');
  const container = document.getElementById('fuel-deprec-fields-container');

  if (ownershipType === 'propio') {
    if (pillPropio) pillPropio.classList.add('active');
    if (pillEmpresa) pillEmpresa.classList.remove('active');
    if (container) container.style.display = 'flex';
  } else {
    if (pillEmpresa) pillEmpresa.classList.add('active');
    if (pillPropio) pillPropio.classList.remove('active');
    if (container) container.style.display = 'none';
  }

  recalculateViaticos();
}

function initViaticosForm() {
  const pilots = Storage.getPilots();
  const vehicles = Storage.getVehicles();
  const catalogs = Storage.getViaticosCatalogs();

  const solSelect = document.getElementById('vreq-solicitante');
  if (solSelect) {
    const currentUserId = currentSessionUser ? currentSessionUser.userId : '';
    const currentUserName = currentSessionUser ? (currentSessionUser.name || '').toLowerCase().trim() : '';

    const matchedPilot = pilots.find(p => 
      p.id === currentUserId || 
      `${p.firstName} ${p.lastName}`.toLowerCase().trim() === currentUserName
    );

    solSelect.innerHTML = pilots.map(p => {
      const isSelected = matchedPilot ? p.id === matchedPilot.id : p.id === currentUserId;
      return `
        <option value="${p.id}" ${isSelected ? 'selected' : ''}>
          ${p.firstName} ${p.lastName} (${p.country})
        </option>
      `;
    }).join('');

    if (currentSessionUser && currentSessionUser.role === 'pilot') {
      solSelect.disabled = true;
      solSelect.style.pointerEvents = 'none';
      solSelect.style.background = 'var(--bg-app)';
      solSelect.style.opacity = '0.95';
      solSelect.style.cursor = 'not-allowed';
    } else {
      solSelect.disabled = false;
      solSelect.style.pointerEvents = 'auto';
      solSelect.style.background = '#ffffff';
      solSelect.style.opacity = '1';
      solSelect.style.cursor = 'default';
    }

    handleViaticosSolicitanteChange();
  }

  const vehSelect = document.getElementById('vreq-vehiculo');
  if (vehSelect) {
    vehSelect.innerHTML = vehicles.map(v => `
      <option value="${v.id}">
        ${v.unitName} - Placa: ${v.plate} (${v.model} - ${v.rendimiento || 35} km/gal)
      </option>
    `).join('');
    handleViaticosVehicleChange();
  }

  const motSelect = document.getElementById('vreq-motivo');
  if (motSelect) {
    motSelect.innerHTML = catalogs.motivos.map(m => `
      <option value="${m}">${m}</option>
    `).join('');
  }

  const legsContainer = document.getElementById('viaticos-legs-container');
  if (legsContainer && legsContainer.children.length === 0) {
    addLegRow();
  }

  setVehicleOwnership(multiDayVehicleOwnership);
}

function handleViaticosSolicitanteChange() {
  const pilotId = document.getElementById('vreq-solicitante').value;
  const pilots = Storage.getPilots();
  const p = pilots.find(item => item.id === pilotId);
  const puestoInput = document.getElementById('vreq-puesto');
  if (puestoInput && p) {
    puestoInput.value = p.puesto || `Piloto - ${p.country}`;
  }
}

function handleViaticosVehicleChange() {
  const vehicleId = document.getElementById('vreq-vehiculo').value;
  const vehicles = Storage.getVehicles();
  const catalogs = Storage.getViaticosCatalogs();
  const v = vehicles.find(item => item.id === vehicleId);

  if (v) {
    document.getElementById('vreq-rendimiento').value = v.rendimiento || 35;
    const precioG = v.tipoCombustible === 'Gasolina' ? catalogs.rates.precioGalonGasolina : catalogs.rates.precioGalonDiesel;
    document.getElementById('vreq-preciogalon').value = precioG;

    if (v.esEmpresa === false) {
      setVehicleOwnership('propio');
    }
  }
  recalculateViaticos();
}

function addLegRow() {
  legCounter++;
  const container = document.getElementById('viaticos-legs-container');
  if (!container) return;

  const catalogs = Storage.getViaticosCatalogs();
  const routeOptions = catalogs.presetRoutes.map(r => `
    <option value="${r.km}">${r.origen} → ${r.destino} (${r.km} km)</option>
  `).join('');

  const row = document.createElement('div');
  row.className = 'leg-row-item';
  row.id = `leg-row-${legCounter}`;
  row.style.cssText = 'display: flex; gap: 10px; align-items: center; background: var(--bg-app); padding: 10px; border-radius: 8px; border: 1px solid var(--border-light);';
  row.innerHTML = `
    <select class="form-select-custom leg-preset-select" onchange="onPresetLegChange(${legCounter}, this.value)" style="flex: 2;">
      <option value="">-- Seleccionar Tramo Preestablecido --</option>
      ${routeOptions}
    </select>
    <input type="number" step="0.1" class="form-input-custom leg-km-input" id="leg-km-${legCounter}" placeholder="KM" oninput="recalculateViaticos()" style="flex: 1;">
    <button type="button" class="btn-logout-nav" onclick="removeLegRow(${legCounter})" style="padding: 6px 10px; font-size: 11px;">✕</button>
  `;
  container.appendChild(row);
}

function removeLegRow(id) {
  const row = document.getElementById(`leg-row-${id}`);
  if (row) row.remove();
  recalculateViaticos();
}

function onPresetLegChange(id, kmVal) {
  const input = document.getElementById(`leg-km-${id}`);
  if (input && kmVal) {
    input.value = kmVal;
    recalculateViaticos();
  }
}

function addHotelRow() {
  hotelCounter++;
  const container = document.getElementById('viaticos-hotels-container');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'hotel-row-item';
  row.id = `hotel-row-${hotelCounter}`;
  row.style.cssText = 'display: flex; gap: 10px; align-items: center; background: var(--bg-app); padding: 10px; border-radius: 8px; border: 1px solid var(--border-light); flex-wrap: wrap;';
  row.innerHTML = `
    <input type="text" class="form-input-custom hotel-nombre" placeholder="Nombre Hotel / Ciudad" style="flex: 2; min-width: 140px;">
    <input type="number" class="form-input-custom hotel-noches" placeholder="Noches" value="1" oninput="recalculateViaticos()" style="width: 80px;">
    <input type="number" step="0.01" class="form-input-custom hotel-precio" placeholder="Precio Noche (Q)" value="300.00" oninput="recalculateViaticos()" style="width: 120px;">
    <button type="button" class="btn-logout-nav" onclick="removeHotelRow(${hotelCounter})" style="padding: 6px 10px; font-size: 11px;">✕</button>
  `;
  container.appendChild(row);
  recalculateViaticos();
}

function removeHotelRow(id) {
  const row = document.getElementById(`hotel-row-${id}`);
  if (row) row.remove();
  recalculateViaticos();
}

function addOtrosRow() {
  otrosCounter++;
  const container = document.getElementById('viaticos-otros-container');
  if (!container) return;

  const row = document.createElement('div');
  row.id = `otros-row-${otrosCounter}`;
  row.style.cssText = 'display: flex; gap: 10px; align-items: center; background: var(--bg-app); padding: 10px; border-radius: 8px; border: 1px solid var(--border-light);';
  row.innerHTML = `
    <input type="text" class="form-input-custom otros-concepto" placeholder="Concepto (Ej. Peaje Escuintla)" style="flex: 2;">
    <input type="number" step="0.01" class="form-input-custom otros-monto" placeholder="Monto (Q)" oninput="recalculateViaticos()" style="flex: 1;">
    <button type="button" class="btn-logout-nav" onclick="removeOtrosRow(${otrosCounter})" style="padding: 6px 10px; font-size: 11px;">✕</button>
  `;
  container.appendChild(row);
}

function removeOtrosRow(id) {
  const row = document.getElementById(`otros-row-${id}`);
  if (row) row.remove();
  recalculateViaticos();
}

function addReciboRow() {
  reciboCounter++;
  const container = document.getElementById('viaticos-recibos-container');
  if (!container) return;

  const row = document.createElement('div');
  row.id = `recibo-row-${reciboCounter}`;
  row.style.cssText = 'display: flex; gap: 10px; align-items: center; background: var(--bg-app); padding: 10px; border-radius: 8px; border: 1px solid var(--border-light); flex-wrap: wrap;';
  row.innerHTML = `
    <select class="form-select-custom" style="width: 140px;">
      <option value="Hotel">Factura Hotel</option>
      <option value="Combustible">Factura Gasolina</option>
      <option value="Comidas">Recibo Comida</option>
      <option value="Otros">Otro Comprobante</option>
    </select>
    <input type="text" class="form-input-custom" placeholder="No. Factura / Proveedor" style="flex: 2; min-width: 140px;">
    <input type="number" step="0.01" class="form-input-custom recibo-monto" placeholder="Monto (Q)" oninput="recalculateViaticos()" style="width: 110px;">
    <button type="button" class="btn-logout-nav" onclick="removeReciboRow(${reciboCounter})" style="padding: 6px 10px; font-size: 11px;">✕</button>
  `;
  container.appendChild(row);
}

function removeReciboRow(id) {
  const row = document.getElementById(`recibo-row-${id}`);
  if (row) row.remove();
  recalculateViaticos();
}

function recalculateViaticos() {
  const catalogs = Storage.getViaticosCatalogs();

  let calculatedKm = 0;
  document.querySelectorAll('.leg-km-input').forEach(inp => {
    calculatedKm += parseFloat(inp.value) || 0;
  });

  const kmTotalInput = document.getElementById('vreq-kmtotal');
  if (calculatedKm > 0 && kmTotalInput) {
    kmTotalInput.value = calculatedKm;
  }
  const totalKm = parseFloat(kmTotalInput?.value) || 0;

  let totalHotel = 0;
  document.querySelectorAll('#viaticos-hotels-container .hotel-row-item').forEach(row => {
    const noches = parseFloat(row.querySelector('.hotel-noches')?.value) || 0;
    const precio = parseFloat(row.querySelector('.hotel-precio')?.value) || 0;
    totalHotel += noches * precio;
  });
  const badgeHotel = document.getElementById('badge-total-hotel');
  if (badgeHotel) badgeHotel.textContent = `Total Hotel: ${formatCurrency(totalHotel)}`;

  const fsalidaVal = document.getElementById('vreq-fsalida')?.value;
  const fregresoVal = document.getElementById('vreq-fregreso')?.value;
  let totalComidas = 0;

  const mealsContainer = document.getElementById('viaticos-meals-container');
  if (mealsContainer && fsalidaVal && fregresoVal) {
    const startDate = new Date(fsalidaVal);
    const endDate = new Date(fregresoVal);
    let dayCount = 0;
    let html = '';

    const cur = new Date(startDate);
    while (cur <= endDate && dayCount < 15) {
      dayCount++;
      const dateStr = cur.toISOString().split('T')[0];
      html += `
        <div style="background: var(--bg-app); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <span style="font-size: 13px; font-weight: 700; color: var(--dark-slate);">Día ${dayCount} (${dateStr})</span>
          <div style="display: flex; gap: 14px; font-size: 12px;">
            <label><input type="checkbox" class="chk-meal" data-price="${catalogs.rates.desayuno}" checked onchange="recalculateViaticos()"> Desayuno (Q${catalogs.rates.desayuno})</label>
            <label><input type="checkbox" class="chk-meal" data-price="${catalogs.rates.almuerzo}" checked onchange="recalculateViaticos()"> Almuerzo (Q${catalogs.rates.almuerzo})</label>
            <label><input type="checkbox" class="chk-meal" data-price="${catalogs.rates.cena}" checked onchange="recalculateViaticos()"> Cena (Q${catalogs.rates.cena})</label>
          </div>
        </div>
      `;
      cur.setDate(cur.getDate() + 1);
    }
    
    if (mealsContainer.dataset.lastRange !== `${fsalidaVal}_${fregresoVal}`) {
      mealsContainer.dataset.lastRange = `${fsalidaVal}_${fregresoVal}`;
      mealsContainer.innerHTML = html;
    }
  }

  document.querySelectorAll('.chk-meal').forEach(chk => {
    if (chk.checked) {
      totalComidas += parseFloat(chk.dataset.price) || 0;
    }
  });

  let totalGasolina = 0;
  let totalDepreciacion = 0;

  if (multiDayVehicleOwnership === 'propio') {
    const rendimiento = parseFloat(document.getElementById('vreq-rendimiento')?.value) || 35;
    const precioGalon = parseFloat(document.getElementById('vreq-preciogalon')?.value) || 34.50;
    const depreciacionKm = parseFloat(document.getElementById('vreq-depreciacionkm')?.value) || 0.50;

    const galones = rendimiento > 0 ? (totalKm / rendimiento) : 0;
    totalGasolina = galones * precioGalon;
    totalDepreciacion = totalKm * depreciacionKm;

    document.getElementById('vreq-galones-val').textContent = `${galones.toFixed(2)} gal`;
    document.getElementById('vreq-costogasolina-val').textContent = formatCurrency(totalGasolina);
    document.getElementById('vreq-costodeprec-val').textContent = formatCurrency(totalDepreciacion);

    document.getElementById('sum-combustible').textContent = formatCurrency(totalGasolina);
    document.getElementById('sum-depreciacion').textContent = formatCurrency(totalDepreciacion);
  } else {
    document.getElementById('sum-combustible').textContent = 'Q 0.00 (Empresa)';
    document.getElementById('sum-depreciacion').textContent = 'Q 0.00 (Empresa)';
  }

  let totalOtros = 0;
  document.querySelectorAll('.otros-monto').forEach(inp => {
    totalOtros += parseFloat(inp.value) || 0;
  });

  const totalGran = totalHotel + totalComidas + totalGasolina + totalDepreciacion + totalOtros;

  document.getElementById('sum-hotel').textContent = formatCurrency(totalHotel);
  document.getElementById('sum-comidas').textContent = formatCurrency(totalComidas);
  document.getElementById('sum-otros').textContent = formatCurrency(totalOtros);
  document.getElementById('sum-total-gran').textContent = formatCurrency(totalGran);
}

function handleSaveViaticosSubmit(e) {
  e.preventDefault();

  const solicitanteId = document.getElementById('vreq-solicitante').value;
  const pilots = Storage.getPilots();
  const pilot = pilots.find(p => p.id === solicitanteId);
  const vehiculoId = document.getElementById('vreq-vehiculo').value;
  const vehicles = Storage.getVehicles();
  const vehicle = vehicles.find(v => v.id === vehiculoId);

  const fSalida = document.getElementById('vreq-fsalida').value;
  const fRegreso = document.getElementById('vreq-fregreso').value;
  const motivo = document.getElementById('vreq-motivo').value;

  const sumTotalText = document.getElementById('sum-total-gran').textContent;
  const totalGran = parseFloat(sumTotalText.replace(/[^0-9.]/g, '')) || 0;

  const newRequest = {
    id: `vreq_${Date.now()}`,
    tipo: 'Solicitud Viáticos',
    correlativo: `SOL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    pilotId: solicitanteId,
    pilotName: pilot ? `${pilot.firstName} ${pilot.lastName}` : 'Solicitante',
    puesto: pilot ? (pilot.puesto || 'Piloto Corporativo') : 'Piloto Corporativo',
    licenseNumber: pilot ? pilot.licenseNumber : '—',
    licenseType: pilot ? pilot.licenseType : 'A',
    vehiclePlate: vehicle ? vehicle.plate : '—',
    vehicleUnit: vehicle ? vehicle.unitName : '—',
    vehicleModel: vehicle ? vehicle.model : '—',
    date: fSalida,
    fechaSalida: fSalida,
    fechaRegreso: fRegreso,
    motivo: motivo,
    country: pilot ? pilot.country : 'Guatemala',
    vehicleOwnership: multiDayVehicleOwnership,
    totalSolicitado: totalGran,
    status: 'Pendiente Aprobación'
  };

  const requests = Storage.getViaticosRequests();
  requests.unshift(newRequest);
  Storage.saveViaticosRequests(requests);

  showToast(`Solicitud de Viáticos (${newRequest.correlativo}) guardada con éxito.`, 'success');
  selectedTripType = null;
  checkActiveRouteStatus();
  renderPilotRouteHistory();
}

/**
 * RENDER PILOT ROUTE HISTORY (STRICTLY FILTERED BY LOGGED-IN PILOT)
 */
function renderPilotRouteHistory() {
  const tbody = document.getElementById('tbody-pilot-history');
  if (!tbody || !currentSessionUser || currentSessionUser.role !== 'pilot') return;

  const loggedInPilotId = currentSessionUser.userId;
  const loggedInPilotName = (currentSessionUser.name || '').toLowerCase();

  const allHistory = Storage.getHistory();
  const filteredHistory = allHistory.filter(h => 
    h.pilotId === loggedInPilotId || 
    (h.pilotName && h.pilotName.toLowerCase().includes(loggedInPilotName)) ||
    (h.fullInspection && (h.fullInspection.pilotId === loggedInPilotId || (h.fullInspection.pilotName && h.fullInspection.pilotName.toLowerCase().includes(loggedInPilotName))))
  );

  const allViaticosReqs = Storage.getViaticosRequests();
  const filteredViaticosReqs = allViaticosReqs.filter(vr => 
    vr.pilotId === loggedInPilotId || 
    (vr.pilotName && vr.pilotName.toLowerCase().includes(loggedInPilotName))
  );

  const combined = [];

  filteredViaticosReqs.forEach(vr => {
    combined.push({
      id: vr.id,
      isViatico: true,
      date: vr.fechaSalida,
      pilotName: vr.pilotName,
      vehiclePlate: vr.vehiclePlate,
      vehicleUnit: vr.vehicleUnit,
      tipo: 'Viáticos (+1 Día)',
      country: vr.country || 'Guatemala',
      horario: `${vr.fechaSalida} al ${vr.fechaRegreso}`,
      totalDisplay: formatCurrency(vr.totalSolicitado),
      status: vr.status || 'Pendiente'
    });
  });

  filteredHistory.forEach(h => {
    combined.push({
      id: h.id,
      isViatico: false,
      date: h.date,
      pilotName: h.pilotName,
      vehiclePlate: h.vehiclePlate,
      vehicleUnit: h.vehicleUnit,
      tipo: 'Ruta 1 Día',
      country: h.country || 'Guatemala',
      horario: `${h.startTime} - ${h.endTime}`,
      totalDisplay: formatDuration(h.startTime, h.endTime),
      status: h.status || 'Completada'
    });
  });

  if (combined.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); font-weight: 600;">No tienes registros archivados en tu historial.</td></tr>`;
    return;
  }

  tbody.innerHTML = combined.map(item => `
    <tr>
      <td><strong>${item.date}</strong></td>
      <td>${item.pilotName}</td>
      <td><span class="badge-chip badge-gray">${item.vehiclePlate}</span> (${item.vehicleUnit})</td>
      <td><span class="badge-chip ${item.isViatico ? 'badge-purple' : 'badge-success'}">${item.tipo}</span></td>
      <td>${item.horario}</td>
      <td><strong>${item.totalDisplay}</strong></td>
      <td>
        <button type="button" class="btn-secondary-custom" onclick="viewInspectionDetail('${item.id}')" style="padding: 4px 10px; font-size: 11px;">
          Ver Detalle
        </button>
      </td>
    </tr>
  `).join('');
}

/* ==========================================================================
   ADMIN PORTAL & CATALOG CONFIGURATION
   ========================================================================== */

function initAdminView() {
  updateAdminKPIs();
  renderAdminPilotsTable();
  renderAdminVehiclesTable();
  renderAdminPresetRoutesTable();
  renderAdminMotivos();
  renderAdminMonitoringTable();
}

function updateAdminKPIs() {
  const pilots = Storage.getPilots();
  const vehicles = Storage.getVehicles();
  const history = Storage.getHistory();
  const viaticosReqs = Storage.getViaticosRequests();
  const currentInsp = Storage.getCurrentInspection();

  document.getElementById('kpi-pilots-count').textContent = pilots.length;
  document.getElementById('kpi-vehicles-count').textContent = vehicles.length;
  document.getElementById('kpi-active-count').textContent = currentInsp ? '1' : '0';
  document.getElementById('kpi-viaticos-count').textContent = viaticosReqs.length;
}

function switchAdminTab(tabName) {
  ['pilots', 'vehicles', 'viaticos-config', 'monitoring'].forEach(t => {
    const btn = document.getElementById(`atab-${t}`);
    const content = document.getElementById(`admin-tab-content-${t}`);
    if (t === tabName) {
      btn.classList.add('active');
      content.style.display = 'flex';
    } else {
      btn.classList.remove('active');
      content.style.display = 'none';
    }
  });
}

function handleAdminPilotPhotoSelect(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      adminNewPilotPhotoUrl = e.target.result;
      const previewImg = document.getElementById('newp-photo-preview-img');
      const container = document.getElementById('newp-photo-preview-container');
      previewImg.src = e.target.result;
      container.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
}

function renderAdminPilotsTable() {
  const pilots = Storage.getPilots();
  const searchVal = (document.getElementById('search-pilots')?.value || '').toLowerCase();
  const tbody = document.getElementById('tbody-admin-pilots');
  if (!tbody) return;

  const filtered = pilots.filter(p => 
    p.firstName.toLowerCase().includes(searchVal) ||
    p.lastName.toLowerCase().includes(searchVal) ||
    (p.phone && p.phone.toLowerCase().includes(searchVal)) ||
    (p.email && p.email.toLowerCase().includes(searchVal)) ||
    (p.puesto && p.puesto.toLowerCase().includes(searchVal)) ||
    p.licenseNumber.toLowerCase().includes(searchVal) ||
    p.country.toLowerCase().includes(searchVal)
  );

  tbody.innerHTML = filtered.map(p => {
    const expInfo = getLicenseStatus(p.expirationDate);
    const photoThumb = p.licensePhoto 
      ? `<img src="${p.licensePhoto}" style="width:38px; height:28px; object-fit:cover; border-radius:4px; border:1px solid #cbd5e1; cursor:pointer;" onclick="viewPilotLicenseModal('${p.id}')" title="Ver Licencia">`
      : `<span style="font-size:10px; color:var(--text-muted);">Sin foto</span>`;

    const defaultEmail = `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase()}@munditrofeos.com`;

    return `
      <tr>
        <td>
          <div style="font-weight: 800; color: var(--dark-slate);">${p.firstName} ${p.lastName}</div>
          <div style="font-size: 11px; color: #64748b; font-weight: 500;">✉️ ${p.email || defaultEmail}</div>
        </td>
        <td>
          <div style="font-weight: 800; color: var(--primary); font-size: 13px;">📞 ${p.phone || 'N/A'}</div>
        </td>
        <td>
          <div style="font-weight: 700; color: #1e293b; font-size: 12px;">${p.puesto || 'Piloto Corporativo'}</div>
          <div style="font-size: 11px; color: #64748b;">🎂 ${p.age} años</div>
        </td>
        <td><code>${p.licenseNumber}</code></td>
        <td><span class="badge-chip badge-gray">Tipo ${p.licenseType}</span></td>
        <td>${p.expirationDate}</td>
        <td>${photoThumb}</td>
        <td><span class="badge-chip ${expInfo.colorClass}">${expInfo.text}</span></td>
        <td><span style="font-weight: 600; color: #334155;">📍 ${p.country}</span></td>
        <td>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <button type="button" class="btn-secondary-custom" onclick="viewPilotFullDetailsModal('${p.id}')" style="padding: 4px 8px; font-size: 11px; background: #e0f2fe; color: #0369a1; border-color: #bae6fd;" title="Ver todos los datos del piloto">
              👁️ Ficha
            </button>
            <button type="button" class="btn-secondary-custom" onclick="downloadPilotRecordPDF('${p.id}')" style="padding: 4px 8px; font-size: 11px;" title="Descargar Expediente PDF">
              📄 PDF
            </button>
            <button type="button" class="btn-logout-nav" onclick="deletePilot('${p.id}')" style="padding: 4px 8px; font-size: 11px;">
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function viewPilotFullDetailsModal(pilotId) {
  const pilots = Storage.getPilots();
  const p = pilots.find(item => item.id === pilotId);
  if (!p) return;

  const expInfo = getLicenseStatus(p.expirationDate);
  const title = document.getElementById('modal-detail-title');
  const body = document.getElementById('modal-inspection-body');
  const btnPdf = document.getElementById('btn-modal-download-pdf');
  if (btnPdf) btnPdf.style.display = 'none';

  const defaultEmail = `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase()}@munditrofeos.com`;

  title.textContent = `📋 Ficha de Conductor - ${p.firstName} ${p.lastName}`;
  body.innerHTML = `
    <div style="background: #ffffff; border-radius: 12px; padding: 10px;">
      <!-- Header Pilot Info -->
      <div style="display: flex; gap: 16px; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 16px;">
        <div style="width: 54px; height: 54px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; border: 2px solid #3b82f6; flex-shrink: 0;">
          ${p.firstName[0]}${p.lastName[0]}
        </div>
        <div>
          <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">${p.firstName} ${p.lastName}</h3>
          <p style="font-size: 12px; color: #64748b; margin: 2px 0 0 0; font-weight: 600;">${p.puesto || 'Piloto Repartidor'} · 📍 ${p.country}</p>
        </div>
      </div>

      <!-- Detail Grid (2 Columns) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
        <div style="background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Teléfono de Contacto</div>
          <div style="font-size: 14px; font-weight: 800; color: #2563eb; margin-top: 2px;">📞 ${p.phone || 'N/A'}</div>
        </div>

        <div style="background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Correo Electrónico</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">✉️ ${p.email || defaultEmail}</div>
        </div>

        <div style="background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Edad de Piloto</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">🎂 ${p.age} años</div>
        </div>

        <div style="background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">País de Operación</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px;">📍 ${p.country}</div>
        </div>

        <div style="background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">No. Licencia & Tipo</div>
          <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 2px;"><code>${p.licenseNumber}</code> (Tipo ${p.licenseType})</div>
        </div>

        <div style="background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Vencimiento & Estado</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-top: 2px; display: flex; align-items: center; gap: 8px;">
            ${p.expirationDate} <span class="badge-chip ${expInfo.colorClass}" style="font-size: 10px;">${expInfo.text}</span>
          </div>
        </div>
      </div>

      <!-- Photo Digitalized License Section -->
      ${p.licensePhoto ? `
        <div style="margin-top: 14px; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          <p style="font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Fotografía Oficial de Licencia Digitalizada</p>
          <img src="${p.licensePhoto}" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: var(--shadow-md);">
        </div>
      ` : ''}
    </div>
  `;
  openModal('modal-inspection-details');
}

/**
 * PDF Generator for Official Pilot File / Expediente (GRUPO PREMIA layout)
 */
function downloadPilotRecordPDF(pilotId) {
  const pilots = Storage.getPilots();
  const pilot = pilots.find(p => p.id === pilotId);
  if (!pilot) {
    showToast('No se encontró información del piloto.', 'error');
    return;
  }

  const expInfo = getLicenseStatus(pilot.expirationDate);
  const pilotFullName = `${pilot.firstName} ${pilot.lastName}`;

  const pilotPdfHtml = `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #000000; padding: 10px 5px;">
      
      <!-- Top Title Bar -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #000000; padding-bottom: 12px; margin-bottom: 16px;">
        <div>
          <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #000000; letter-spacing: -0.02em;">Expediente de Conductor Autorizado</h1>
          <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0; font-weight: 600;">GRUPO PREMIA · Consola de Administración · Generado ${new Date().toLocaleDateString('es-GT')}</p>
        </div>
        
        <!-- Mundi Trofeos Logo Image -->
        <div>
          <img src="logomundi.jpeg" alt="Mundi Trofeos Logo" style="max-height: 55px; max-width: 150px; object-fit: contain;">
        </div>
      </div>

      <!-- Metadata Grid (3 Columns) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; margin-bottom: 14px;">
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">NOMBRE DEL PILOTO</div>
          <div style="font-size: 14px; font-weight: 800; color: #000000; margin-top: 2px;">${pilotFullName}</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">TELÉFONO</div>
          <div style="font-size: 14px; font-weight: 800; color: #000000; margin-top: 2px;">${pilot.phone || 'N/A'}</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">EDAD / PUESTO</div>
          <div style="font-size: 14px; font-weight: 800; color: #000000; margin-top: 2px;">${pilot.age} años · ${pilot.puesto || 'Piloto Corporativo'}</div>
        </div>

        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">NO. LICENCIA</div>
          <div style="font-size: 14px; font-weight: 800; color: #000000; margin-top: 2px;">${pilot.licenseNumber} (Tipo ${pilot.licenseType})</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">FECHA VENCIMIENTO</div>
          <div style="font-size: 14px; font-weight: 800; color: #000000; margin-top: 2px;">${pilot.expirationDate}</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">PAÍS DE OPERACIÓN</div>
          <div style="font-size: 14px; font-weight: 800; color: #000000; margin-top: 2px;">${pilot.country}</div>
        </div>
      </div>

      <!-- Section: Expediente de Licencia Digitalizada -->
      <div style="margin-bottom: 18px;">
        <h3 style="font-size: 14px; font-weight: 800; color: #000000; margin: 0 0 6px 0;">Licencia Digitalizada & Estatus</h3>
        <div style="border-top: 1.5px solid #000000; padding: 10px 0;">
          <p style="font-size: 13px; margin: 0 0 10px 0;"><strong>Vigencia Legal:</strong> <span style="font-weight: 800; color: ${expInfo.text === 'Vigente' ? '#059669' : '#dc2626'};">${expInfo.text}</span></p>
          ${pilot.licensePhoto ? `
            <div style="text-align: center; margin-top: 12px; background: #ffffff; padding: 10px; border-radius: 8px; border: 1px solid #cbd5e1;">
              <img src="${pilot.licensePhoto}" style="max-width: 100%; max-height: 280px; object-fit: contain; border-radius: 6px; border: 1px solid #94a3b8;">
              <p style="font-size: 11px; color: #64748b; margin-top: 6px; font-weight: 600;">Fotografía oficial registrada en plataforma</p>
            </div>
          ` : `
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px dashed #cbd5e1; text-align: center; font-size: 12px; color: #64748b;">
              Sin fotografía de licencia digitalizada registrada.
            </div>
          `}
        </div>
      </div>

      <!-- Rounded Status Box -->
      <div style="border: 2px solid #0f172a; border-radius: 8px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; background: #ffffff; margin-bottom: 24px;">
        <span style="font-size: 15px; font-weight: 800; color: #000000; letter-spacing: 0.05em;">ESTADO DE EXPEDIENTE</span>
        <span style="font-size: 20px; font-weight: 900; color: #059669;">
          HABILITADO EN SISTEMA
        </span>
      </div>

      <!-- Signature Lines -->
      <div style="display: flex; justify-content: space-around; text-align: center; font-size: 11px; color: #334155; margin-bottom: 24px; margin-top: 35px;">
        <div style="border-top: 1.5px solid #000000; width: 220px; padding-top: 6px; font-weight: 700;">
          Firma del piloto
        </div>
        <div style="border-top: 1.5px solid #000000; width: 220px; padding-top: 6px; font-weight: 700;">
          Recursos Humanos / Administración
        </div>
      </div>

      <!-- Footer Text -->
      <div style="text-align: right; font-size: 10px; color: #94a3b8; font-weight: 500;">
        Documento generado desde la consola de gestión de pilotos — Grupo Premia
      </div>

    </div>
  `;

  const fileName = `Expediente_Piloto_${pilotFullName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  openPDFPreviewModal("Expediente de Piloto", pilotPdfHtml, fileName);
}

function viewPilotLicenseModal(pilotId) {
  const pilots = Storage.getPilots();
  const p = pilots.find(item => item.id === pilotId);
  if (!p || !p.licensePhoto) return;

  currentOpenedRecordDetails = { record: p, isViatico: false, isLicense: true };

  const title = document.getElementById('modal-detail-title');
  const body = document.getElementById('modal-inspection-body');
  const btnPdf = document.getElementById('btn-modal-download-pdf');
  if (btnPdf) btnPdf.style.display = 'none';

  title.textContent = `Licencia de Conducir - ${p.firstName} ${p.lastName}`;
  body.innerHTML = `
    <div style="text-align: center;">
      <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 12px;"><strong>No. Licencia:</strong> ${p.licenseNumber} (Tipo ${p.licenseType}) - Expira: ${p.expirationDate}</p>
      <img src="${p.licensePhoto}" style="max-width: 100%; max-height: 350px; object-fit: contain; border-radius: 12px; border: 1px solid var(--border-light); box-shadow: var(--shadow-md);">
    </div>
  `;
  openModal('modal-inspection-details');
}

function renderAdminVehiclesTable() {
  const vehicles = Storage.getVehicles();
  const searchVal = (document.getElementById('search-vehicles')?.value || '').toLowerCase();
  const tbody = document.getElementById('tbody-admin-vehicles');
  if (!tbody) return;

  const filtered = vehicles.filter(v => 
    v.plate.toLowerCase().includes(searchVal) ||
    (v.brand && v.brand.toLowerCase().includes(searchVal)) ||
    (v.model && v.model.toLowerCase().includes(searchVal)) ||
    (v.vehicleType && v.vehicleType.toLowerCase().includes(searchVal)) ||
    (v.policyNumber && v.policyNumber.toLowerCase().includes(searchVal))
  );

  tbody.innerHTML = filtered.map(v => {
    const insuranceBadge = v.hasInsurance === 'Sí'
      ? `<span class="badge-chip badge-success" style="background:#ecfdf5; color:#047857; border:1px solid #a7f3d0;">✓ Sí</span>`
      : `<span class="badge-chip badge-danger" style="background:#fef2f2; color:#b91c1c; border:1px solid #fecaca;">✕ No</span>`;

    return `
      <tr>
        <td><strong>${v.plate}</strong></td>
        <td>${v.brand || '—'}</td>
        <td>${v.model || '—'}</td>
        <td><span class="badge-chip badge-gray">${v.vehicleType || 'Panel'}</span></td>
        <td>${v.year || '—'}</td>
        <td>${insuranceBadge}</td>
        <td><code>${v.policyNumber || 'N/A'}</code></td>
        <td>${v.policyExpiration || 'N/A'}</td>
        <td><span style="font-size:12px; font-weight:600; color:#334155;">${v.policyPhone || 'N/A'}</span></td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" class="btn-secondary-custom" onclick="editVehicle('${v.id}')" style="padding: 4px 8px; font-size: 11px; font-weight: 700;">
              ✏️ Editar
            </button>
            <button type="button" class="btn-logout-nav" onclick="deleteVehicle('${v.id}')" style="padding: 4px 8px; font-size: 11px;">
              🗑️ Eliminar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAdminPresetRoutesTable() {
  const catalogs = Storage.getViaticosCatalogs();
  const tbody = document.getElementById('tbody-admin-preset-routes');
  if (!tbody) return;

  tbody.innerHTML = catalogs.presetRoutes.map(r => `
    <tr>
      <td><strong>${r.origen}</strong></td>
      <td><strong>${r.destino}</strong></td>
      <td><span class="badge-chip badge-success">${r.km} KM</span></td>
      <td>
        <button type="button" class="btn-logout-nav" onclick="deletePresetRoute('${r.id}')" style="padding: 4px 10px; font-size: 11px;">
          Eliminar
        </button>
      </td>
    </tr>
  `).join('');
}

function renderAdminMotivos() {
  const catalogs = Storage.getViaticosCatalogs();
  const container = document.getElementById('container-admin-motivos');
  if (!container) return;

  container.innerHTML = catalogs.motivos.map((m, idx) => `
    <span class="badge-chip badge-gray" style="font-size: 12px; padding: 6px 12px; display: inline-flex; align-items: center; gap: 8px;">
      ${m}
      <button type="button" onclick="deleteMotivo(${idx})" style="border: none; background: transparent; cursor: pointer; color: var(--rose); font-weight: 800;">✕</button>
    </span>
  `).join('');
}

function renderAdminMonitoringTable() {
  const history = Storage.getHistory();
  const viaticosReqs = Storage.getViaticosRequests();
  const currentInsp = Storage.getCurrentInspection();
  const tbody = document.getElementById('tbody-admin-monitoring');
  if (!tbody) return;

  let rowsHtml = '';

  if (currentInsp) {
    const cAcronym = getCountryAcronym(currentInsp.country);
    rowsHtml += `
      <tr style="background: #eff6ff;">
        <td><strong>${currentInsp.date}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <strong style="color: var(--dark-slate);">${currentInsp.pilotName}</strong>
            <span style="background: #2563eb; color: #ffffff; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em;">${cAcronym}</span>
          </div>
        </td>
        <td><span class="badge-chip badge-gray">${currentInsp.vehiclePlate}</span> (${currentInsp.vehicleUnit})</td>
        <td><span class="badge-chip badge-warning">Ruta 1 Día en Progreso</span></td>
        <td>${currentInsp.startTime} - En vivo</td>
        <td>—</td>
        <td><span class="badge-chip badge-warning">En Monitoreo</span></td>
        <td>
          <button type="button" class="btn-secondary-custom" onclick="viewInspectionDetail('current')" style="padding: 4px 10px; font-size: 11px;">
            Ver Checklist
          </button>
        </td>
      </tr>
    `;
  }

  viaticosReqs.forEach(vr => {
    const status = vr.status || 'Pendiente Aprobación';
    const cAcronym = getCountryAcronym(vr.country || 'Guatemala');
    let statusClass = 'badge-warning';
    if (status === 'Aprobada') statusClass = 'badge-success';
    if (status === 'Rechazada') statusClass = 'badge-rose';

    let actionButtonsHtml = `
      <button type="button" class="btn-secondary-custom" onclick="viewInspectionDetail('${vr.id}')" style="padding: 4px 8px; font-size: 11px;">
        Ver Solicitud
      </button>
    `;

    // Show approval and rejection options ONLY for trips of more than 1 day (+1 Día)
    if (status === 'Pendiente Aprobación' || status === 'Pendiente') {
      actionButtonsHtml += `
        <button type="button" class="btn-primary-lg" onclick="approveViaticosRequest('${vr.id}')" style="padding: 4px 8px; font-size: 10px; width: auto; background: #059669; border: none; font-weight: 700;">
          ✓ Aprobar
        </button>
        <button type="button" class="btn-logout-nav" onclick="rejectViaticosRequest('${vr.id}')" style="padding: 4px 8px; font-size: 10px;">
          ✕ Rechazar
        </button>
      `;
    }

    rowsHtml += `
      <tr>
        <td><strong>${vr.fechaSalida}</strong></td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <strong style="color: var(--dark-slate);">${vr.solicitanteName}</strong>
            <span style="background: #2563eb; color: #ffffff; font-weight: 800; font-size: 10px; padding: 2px 6px; border-radius: 4px; letter-spacing: 0.05em;">${cAcronym}</span>
          </div>
        </td>
        <td><span class="badge-chip badge-gray">${vr.vehiclePlate}</span></td>
        <td><span class="badge-chip badge-primary">Ruta Multidía (${vr.diasTotales} Días)</span></td>
        <td>${vr.fechaSalida} al ${vr.fechaRegreso}</td>
        <td><strong>${formatCurrency(vr.totalSolicitado)}</strong></td>
        <td><span class="badge-chip ${statusClass}">${status}</span></td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
            ${actionButtonsHtml}
          </div>
        </td>
      </tr>
    `;
  });

  history.forEach(item => {
    rowsHtml += `
      <tr>
        <td><strong>${item.date}</strong></td>
        <td>${item.pilotName}</td>
        <td><span class="badge-chip badge-gray">${item.vehiclePlate}</span> (${item.vehicleUnit})</td>
        <td><span class="badge-chip badge-success">Ruta 1 Día</span></td>
        <td>${item.startTime} - ${item.endTime}</td>
        <td>${formatDuration(item.startTime, item.endTime)}</td>
        <td><span class="badge-chip badge-success">Completada</span></td>
        <td>
          <button type="button" class="btn-secondary-custom" onclick="viewInspectionDetail('${item.id}')" style="padding: 4px 10px; font-size: 11px;">
            Ver Checklist
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;
}

function approveViaticosRequest(reqId) {
  let requests = Storage.getViaticosRequests();
  const req = requests.find(r => r.id === reqId);
  if (req) {
    req.status = 'Aprobada';
    Storage.saveViaticosRequests(requests);
    showToast(`Solicitud (${req.correlativo || req.id}) APROBADA exitosamente.`, 'success');
    renderAdminMonitoringTable();
    renderPilotRouteHistory();
  }
}

function rejectViaticosRequest(reqId) {
  let requests = Storage.getViaticosRequests();
  const req = requests.find(r => r.id === reqId);
  if (req) {
    req.status = 'Rechazada';
    Storage.saveViaticosRequests(requests);
    showToast(`Solicitud (${req.correlativo || req.id}) RECHAZADA.`, 'warning');
    renderAdminMonitoringTable();
    renderPilotRouteHistory();
  }
}

/* ==========================================================================
   ADMIN ACTIONS (PILOT, VEHICLE & CATALOG CRUD)
   ========================================================================== */

function setInsuranceChoice(choice) {
  const input = document.getElementById('newv-insurance');
  const btnYes = document.getElementById('btn-insurance-yes');
  const btnNo = document.getElementById('btn-insurance-no');
  const container = document.getElementById('insurance-details-container');
  if (!input || !btnYes || !btnNo) return;

  input.value = choice;
  if (choice === 'Sí') {
    btnYes.style.border = '2px solid #059669';
    btnYes.style.background = '#ecfdf5';
    btnYes.style.color = '#047857';
    btnYes.classList.add('active');

    btnNo.style.border = '2px solid #cbd5e1';
    btnNo.style.background = '#f8fafc';
    btnNo.style.color = '#64748b';
    btnNo.classList.remove('active');

    if (container) {
      container.style.display = 'block';
      container.style.opacity = '1';
    }
  } else {
    btnNo.style.border = '2px solid #dc2626';
    btnNo.style.background = '#fef2f2';
    btnNo.style.color = '#b91c1c';
    btnNo.classList.add('active');

    btnYes.style.border = '2px solid #cbd5e1';
    btnYes.style.background = '#f8fafc';
    btnYes.style.color = '#64748b';
    btnYes.classList.remove('active');

    if (container) {
      container.style.display = 'none';
    }
  }
}

function openModalAddPilot() {
  adminNewPilotPhotoUrl = '';
  document.getElementById('newp-photo-preview-container').style.display = 'none';
  openModal('modal-add-pilot');
}

function openModalAddVehicle() { 
  setInsuranceChoice('Sí');
  const policyNum = document.getElementById('newv-policy-number');
  const policyExp = document.getElementById('newv-policy-exp');
  const policyPhone = document.getElementById('newv-policy-phone');
  if (policyNum) policyNum.value = '';
  if (policyExp) policyExp.value = '';
  if (policyPhone) policyPhone.value = '';
  openModal('modal-add-vehicle'); 
}

function openModalAddPresetRoute() { openModal('modal-add-preset-route'); }
function openModalAddMotivo() { openModal('modal-add-motivo'); }

function handleSavePilotSubmit(e) {
  e.preventDefault();
  const firstName = document.getElementById('newp-firstname').value;
  const lastName = document.getElementById('newp-lastname').value;
  const phone = document.getElementById('newp-phone').value;
  const age = document.getElementById('newp-age').value;
  const licenseNumber = document.getElementById('newp-license').value;
  const licenseType = document.getElementById('newp-type').value;
  const expirationDate = document.getElementById('newp-expdate').value;
  const puesto = document.getElementById('newp-puesto').value;
  const country = document.getElementById('newp-country').value;

  const newPilot = {
    id: `p_${Date.now()}`,
    firstName,
    lastName,
    phone,
    age,
    licenseNumber,
    licenseType,
    expirationDate,
    puesto,
    country,
    licensePhoto: adminNewPilotPhotoUrl
  };

  const pilots = Storage.getPilots();
  pilots.push(newPilot);
  Storage.savePilots(pilots);

  closeModal('modal-add-pilot');
  showToast(`Piloto ${firstName} ${lastName} registrado con teléfono ${phone}.`, 'success');
  updateAdminKPIs();
  renderAdminPilotsTable();
  populatePilotDropdown();
  populatePilotSelectInLogin();
}

function deletePilot(id) {
  if (confirm('¿Confirma que desea eliminar este piloto?')) {
    let pilots = Storage.getPilots();
    pilots = pilots.filter(p => p.id !== id);
    Storage.savePilots(pilots);
    showToast('Piloto eliminado.', 'warning');
    updateAdminKPIs();
    renderAdminPilotsTable();
  }
}

function openModalAddVehicle() {
  const editIdInput = document.getElementById('edit-vehicle-id');
  if (editIdInput) editIdInput.value = '';

  const titleEl = document.getElementById('modal-vehicle-title');
  if (titleEl) titleEl.textContent = 'Registrar Nuevo Vehículo';

  const btnSubmit = document.getElementById('btn-submit-vehicle');
  if (btnSubmit) btnSubmit.textContent = 'Guardar Vehículo';

  document.getElementById('newv-plate').value = '';
  document.getElementById('newv-year').value = '';
  document.getElementById('newv-brand').value = '';
  document.getElementById('newv-model').value = '';
  document.getElementById('newv-type').value = 'Panel';
  document.getElementById('newv-country').value = 'Guatemala';
  setInsuranceChoice('Sí');
  document.getElementById('newv-policy-number').value = '';
  document.getElementById('newv-policy-exp').value = '';
  document.getElementById('newv-policy-phone').value = '';

  openModal('modal-add-vehicle');
}

function editVehicle(vehicleId) {
  const vehicles = Storage.getVehicles();
  const v = vehicles.find(item => item.id === vehicleId);
  if (!v) return;

  const editIdInput = document.getElementById('edit-vehicle-id');
  if (editIdInput) editIdInput.value = v.id;

  const titleEl = document.getElementById('modal-vehicle-title');
  if (titleEl) titleEl.textContent = 'Editar Registro de Vehículo';

  const btnSubmit = document.getElementById('btn-submit-vehicle');
  if (btnSubmit) btnSubmit.textContent = 'Guardar Cambios';

  document.getElementById('newv-plate').value = v.plate || '';
  document.getElementById('newv-year').value = v.year || '';
  document.getElementById('newv-brand').value = v.brand || '';
  document.getElementById('newv-model').value = v.model || '';
  document.getElementById('newv-type').value = v.vehicleType || 'Panel';
  document.getElementById('newv-country').value = v.country || 'Guatemala';

  setInsuranceChoice(v.hasInsurance === 'No' ? 'No' : 'Sí');

  document.getElementById('newv-policy-number').value = v.policyNumber || '';
  document.getElementById('newv-policy-exp').value = v.policyExpiration || '';
  document.getElementById('newv-policy-phone').value = v.policyPhone || '';

  openModal('modal-add-vehicle');
}

function handleSaveVehicleSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('edit-vehicle-id')?.value;
  const plate = document.getElementById('newv-plate').value.trim().toUpperCase();
  const year = document.getElementById('newv-year').value.trim();
  const brand = document.getElementById('newv-brand').value.trim();
  const model = document.getElementById('newv-model').value.trim();
  const vehicleType = document.getElementById('newv-type').value;
  const country = document.getElementById('newv-country').value;
  const hasInsurance = document.getElementById('newv-insurance').value; // "Sí" or "No"

  const policyNumber = hasInsurance === 'Sí' ? (document.getElementById('newv-policy-number').value.trim() || 'POL-998877') : 'N/A';
  const policyExpiration = hasInsurance === 'Sí' ? document.getElementById('newv-policy-exp').value : '';
  const policyPhone = hasInsurance === 'Sí' ? (document.getElementById('newv-policy-phone').value.trim() || 'N/A') : 'N/A';
  const unitName = `${brand} ${model}`;

  let vehicles = Storage.getVehicles();

  if (editId) {
    // EDIT EXISTING VEHICLE
    const index = vehicles.findIndex(v => v.id === editId);
    if (index !== -1) {
      if (vehicles.some((v, idx) => idx !== index && v.plate.toLowerCase() === plate.toLowerCase())) {
        showToast(`La placa "${plate}" ya pertenece a otro vehículo.`, 'error');
        return;
      }

      vehicles[index] = {
        ...vehicles[index],
        plate,
        year,
        brand,
        model,
        vehicleType,
        country,
        hasInsurance,
        policyNumber,
        policyExpiration,
        policyPhone,
        unitName
      };

      Storage.saveVehicles(vehicles);
      showToast(`Vehículo ${brand} ${model} (Placa ${plate}) actualizado con éxito.`, 'success');
    }
  } else {
    // CREATE NEW VEHICLE
    if (vehicles.some(v => v.plate.toLowerCase() === plate.toLowerCase())) {
      showToast(`La placa "${plate}" ya existe en la base de datos.`, 'error');
      return;
    }

    const newVehicle = {
      id: `v_${Date.now()}`,
      plate,
      brand,
      model,
      vehicleType,
      year,
      hasInsurance,
      policyNumber,
      policyExpiration,
      policyPhone,
      unitName,
      country,
      rendimiento: 35,
      tipoCombustible: 'Diésel',
      chassisNumber: `CH-${Date.now().toString().slice(-8)}`
    };

    vehicles.push(newVehicle);
    Storage.saveVehicles(vehicles);
    showToast(`Vehículo ${brand} ${model} (Placa ${plate}) registrado con éxito.`, 'success');
  }

  closeModal('modal-add-vehicle');
  updateAdminKPIs();
  renderAdminVehiclesTable();
  populateVehicleDropdown();
}

function deleteVehicle(id) {
  if (confirm('¿Confirma que desea eliminar este vehículo?')) {
    let vehicles = Storage.getVehicles();
    vehicles = vehicles.filter(v => v.id !== id);
    Storage.saveVehicles(vehicles);
    showToast('Vehículo eliminado.', 'warning');
    updateAdminKPIs();
    renderAdminVehiclesTable();
  }
}

function handleSavePresetRouteSubmit(e) {
  e.preventDefault();
  const origen = document.getElementById('newr-origen').value;
  const destino = document.getElementById('newr-destino').value;
  const km = parseFloat(document.getElementById('newr-km').value) || 100;

  const catalogs = Storage.getViaticosCatalogs();
  catalogs.presetRoutes.push({
    id: `r_${Date.now()}`,
    origen,
    destino,
    km
  });
  Storage.saveViaticosCatalogs(catalogs);

  closeModal('modal-add-preset-route');
  showToast(`Distancia ${origen} → ${destino} (${km} km) guardada.`, 'success');
  renderAdminPresetRoutesTable();
}

function deletePresetRoute(id) {
  const catalogs = Storage.getViaticosCatalogs();
  catalogs.presetRoutes = catalogs.presetRoutes.filter(r => r.id !== id);
  Storage.saveViaticosCatalogs(catalogs);
  renderAdminPresetRoutesTable();
  showToast('Distancia preestablecida eliminada.', 'info');
}

function handleSaveMotivoSubmit(e) {
  e.preventDefault();
  const texto = document.getElementById('newm-texto').value;

  const catalogs = Storage.getViaticosCatalogs();
  catalogs.motivos.push(texto);
  Storage.saveViaticosCatalogs(catalogs);

  closeModal('modal-add-motivo');
  showToast('Motivo de viaje agregado.', 'success');
  renderAdminMotivos();
}

function deleteMotivo(idx) {
  const catalogs = Storage.getViaticosCatalogs();
  catalogs.motivos.splice(idx, 1);
  Storage.saveViaticosCatalogs(catalogs);
  renderAdminMotivos();
}

function saveAdminRatesConfig() {
  const catalogs = Storage.getViaticosCatalogs();
  catalogs.rates.desayuno = parseFloat(document.getElementById('cfg-desayuno').value) || 30;
  catalogs.rates.almuerzo = parseFloat(document.getElementById('cfg-almuerzo').value) || 40;
  catalogs.rates.cena = parseFloat(document.getElementById('cfg-cena').value) || 40;
  catalogs.rates.depreciacionKm = parseFloat(document.getElementById('cfg-deprec').value) || 0.50;

  Storage.saveViaticosCatalogs(catalogs);
  showToast('Tarifas de viáticos actualizadas.', 'success');
}

/* ==========================================================================
   INSPECTION & VIÁTICOS DETAILS MODAL VIEWER
   ========================================================================== */

function viewInspectionDetail(recordId) {
  let record = null;
  let isViatico = false;

  if (recordId === 'current') {
    record = Storage.getCurrentInspection();
  } else {
    const viaticosReqs = Storage.getViaticosRequests();
    const foundV = viaticosReqs.find(v => v.id === recordId);
    if (foundV) {
      record = foundV;
      isViatico = true;
    } else {
      const history = Storage.getHistory();
      const foundH = history.find(h => h.id === recordId);
      if (foundH) record = foundH.fullInspection || foundH;
    }
  }

  if (!record) {
    showToast('No se encontró el registro.', 'error');
    return;
  }

  currentOpenedRecordDetails = { record, isViatico, isLicense: false };

  const title = document.getElementById('modal-detail-title');
  const body = document.getElementById('modal-inspection-body');
  const btnPdf = document.getElementById('btn-modal-download-pdf');
  if (btnPdf) btnPdf.style.display = 'inline-flex';

  if (isViatico) {
    title.textContent = `Solicitud de Viáticos (${record.correlativo || record.id})`;
    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="background: var(--bg-app); padding: 16px; border-radius: 12px; border: 1px solid var(--border-light);">
          <p style="font-size: 14px;"><strong>Solicitante:</strong> ${record.pilotName}</p>
          <p style="font-size: 14px;"><strong>Puesto:</strong> ${record.puesto || 'Piloto'}</p>
          <p style="font-size: 14px;"><strong>Vehículo:</strong> ${record.vehiclePlate} (${record.vehicleModel || 'Unidad'}) - Propiedad: ${record.vehicleOwnership === 'propio' ? 'Vehículo Propio' : 'De la Empresa'}</p>
          <p style="font-size: 14px;"><strong>Fechas:</strong> ${record.fechaSalida} al ${record.fechaRegreso}</p>
          <p style="font-size: 14px;"><strong>Motivo de Viaje:</strong> ${record.motivo}</p>
        </div>

        <h4 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--purple);">Monto Total Solicitado</h4>
        <div style="font-size: 28px; font-weight: 800; color: var(--primary); font-family: monospace;">
          ${formatCurrency(record.totalSolicitado)}
        </div>
      </div>
    `;
  } else {
    title.textContent = 'Detalle de Inspección de Seguridad Pre-Viaje';
    const fluidsInfo = record.fluids ? `
      <div><strong>Aceite Motor:</strong> ${record.fluids.aceite || 'Correcto'}</div>
      <div><strong>Radiador/Agua:</strong> ${record.fluids.radiador || 'Correcto'}</div>
      <div><strong>Frenos:</strong> ${record.fluids.frenos || 'Correcto'}</div>
      <div><strong>Hidráulico:</strong> ${record.fluids.hidraulico || 'Correcto'}</div>
    ` : '';

    const defectPhotoHtml = (record.defectPhoto || (record.fullInspection && record.fullInspection.defectPhoto)) ? `
      <div style="margin-top: 10px; text-align: center; background: var(--bg-app); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">
        <p style="font-size: 12px; font-weight: 700; color: var(--rose); margin-bottom: 8px;">📷 Evidencia Fotográfica de Defectos / Daños:</p>
        <img src="${record.defectPhoto || record.fullInspection.defectPhoto}" style="max-width: 100%; max-height: 250px; object-fit: contain; border-radius: 8px; border: 1px solid var(--border-light);">
      </div>
    ` : '';

    body.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div style="background: var(--bg-app); padding: 16px; border-radius: 12px; border: 1px solid var(--border-light);">
          <p style="font-size: 14px;"><strong>Piloto:</strong> ${record.pilotName || record.pilotId}</p>
          <p style="font-size: 14px;"><strong>Vehículo:</strong> ${record.vehiclePlate} (${record.vehicleUnit || 'Unidad'}) - ${record.vehicleModel || ''}</p>
          <p style="font-size: 14px;"><strong>Fecha / Hora:</strong> ${record.date} @ ${record.startTime}</p>
        </div>

        <h4 style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: var(--primary);">Resultados de Inspección Pre-Viaje</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; background: var(--bg-app); padding: 14px; border-radius: 8px;">
          <div><strong>Limpieza Interior:</strong> ${record.interiorCleanliness || 'Bueno'}</div>
          <div><strong>Limpieza Exterior:</strong> ${record.exteriorCleanliness || 'Bueno'}</div>
          <div><strong>Nivel Combustible:</strong> ${record.fuelLevel || 'Lleno'}</div>
          <div><strong>Odómetro:</strong> ${record.odometer || 'N/A'}</div>
          <div><strong>Defectos Reportados:</strong> ${record.hasDefects ? 'Sí' : 'No'}</div>
          ${fluidsInfo}
        </div>
        ${defectPhotoHtml}
      </div>
    `;
  }

  openModal('modal-inspection-details');
}

/* ==========================================================================
   EXACT REPLICA PDF DESIGN SYSTEM & TEMPLATE GENERATOR
   ========================================================================== */

function openPDFPreviewModal(title, rawBodyContentHtml, filename) {
  currentExportFilename = filename || 'Solicitud_Viaticos.pdf';

  const modalTitle = document.getElementById('pdf-preview-modal-title');
  if (modalTitle) modalTitle.textContent = `📄 ${title}`;

  const docView = document.getElementById('pdf-document-view');
  if (!docView) return;

  // Insert complete printable layout
  docView.innerHTML = rawBodyContentHtml;

  openModal('modal-pdf-preview');
}

function executePDFExport() {
  const docView = document.getElementById('pdf-document-view');
  if (!docView || !docView.innerHTML.trim()) {
    showToast('Error: No se encontró la vista del documento PDF.', 'error');
    return;
  }

  showToast('Generando y descargando archivo PDF...', 'info');

  const modalBody = document.querySelector('#modal-pdf-preview .modal-body-content');
  const prevScrollTop = modalBody ? modalBody.scrollTop : 0;
  if (modalBody) modalBody.scrollTop = 0;

  const opt = {
    margin: [4, 4, 4, 4],
    filename: currentExportFilename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      onclone: function(clonedDoc) {
        const clonedTarget = clonedDoc.getElementById('pdf-document-view');
        if (clonedTarget) {
          clonedTarget.style.display = 'block';
          clonedTarget.style.visibility = 'visible';
          clonedTarget.style.opacity = '1';
          clonedTarget.style.height = 'auto';
          clonedTarget.style.overflow = 'visible';
        }
      }
    },
    jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(docView).save().then(() => {
    if (modalBody) modalBody.scrollTop = prevScrollTop;
    showToast(`PDF descargado exitosamente: ${currentExportFilename}`, 'success');
  }).catch(err => {
    if (modalBody) modalBody.scrollTop = prevScrollTop;
    console.error('Error al exportar PDF con html2pdf:', err);
    showToast('Error al procesar descarga de PDF.', 'error');
  });
}

/**
 * 1. PDF: Solicitud de Viáticos (+1 Día) - REPLICA EXACTA DE LA IMAGEN DE REFERENCIA
 */
function downloadViaticosFormPDF() {
  const solSelect = document.getElementById('vreq-solicitante');
  const pilots = Storage.getPilots();
  const selectedPilotId = solSelect ? solSelect.value : '';
  const currentPilot = pilots.find(p => p.id === selectedPilotId) || {
    firstName: currentSessionUser ? currentSessionUser.name.split(' ')[0] : 'Steve',
    lastName: currentSessionUser ? currentSessionUser.name.split(' ')[1] || 'Recinos' : 'Recinos',
    puesto: document.getElementById('vreq-puesto')?.value || 'Supervisor de ventas',
    licenseNumber: '—',
    licenseType: 'A'
  };

  const pilotFullName = `${currentPilot.firstName} ${currentPilot.lastName}`;
  const puestoText = currentPilot.puesto || document.getElementById('vreq-puesto')?.value || 'Supervisor de ventas';
  const licenciaText = `${currentPilot.licenseNumber || '—'} (Tipo ${currentPilot.licenseType || 'A'})`;

  const vehSelect = document.getElementById('vreq-vehiculo');
  const vehicles = Storage.getVehicles();
  const selectedVehId = vehSelect ? vehSelect.value : '';
  const currentVeh = vehicles.find(v => v.id === selectedVehId) || {
    plate: 'P-123ABC',
    model: 'Mazda 3',
    unitName: 'Unidad H4'
  };
  const vehiculoText = `${currentVeh.plate} — ${currentVeh.model}`;

  const fSalida = document.getElementById('vreq-fsalida')?.value || '2026-07-28';
  const fRegreso = document.getElementById('vreq-fregreso')?.value || '2026-08-03';
  const motivo = document.getElementById('vreq-motivo')?.value || 'Entrega de mercadería';
  const kmTotal = parseFloat(document.getElementById('vreq-kmtotal')?.value) || 120.0;

  // Tramos HTML
  let tramosRowsHtml = '';
  const legRows = document.querySelectorAll('.leg-row-item');
  if (legRows.length > 0) {
    legRows.forEach(row => {
      const selectEl = row.querySelector('.leg-preset-select');
      const routeText = selectEl && selectEl.selectedIndex > 0 ? selectEl.options[selectEl.selectedIndex].text.replace(/\(\d+.*KM\)/i, '').trim() : 'Guatemala → Guatemala';
      const kmVal = parseFloat(row.querySelector('.leg-km-input')?.value) || (kmTotal / legRows.length);
      tramosRowsHtml += `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${routeText}</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; font-size: 13px;">${kmVal.toFixed(1)} km</td>
        </tr>
      `;
    });
  } else {
    tramosRowsHtml = `
      <tr>
        <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">Guatemala → Guatemala</td>
        <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; font-size: 13px;">${kmTotal.toFixed(1)} km</td>
      </tr>
    `;
  }

  // Hotel HTML
  let hotelRowsHtml = '';
  const hotelRows = document.querySelectorAll('#viaticos-hotels-container .hotel-row-item');
  if (hotelRows.length > 0) {
    hotelRows.forEach(row => {
      const nombre = row.querySelector('.hotel-nombre')?.value || 'Hotel Ciudad';
      const noches = row.querySelector('.hotel-noches')?.value || '1';
      const precio = parseFloat(row.querySelector('.hotel-precio')?.value) || 300;
      const subtotal = (parseFloat(noches) || 1) * precio;
      hotelRowsHtml += `
        <tr>
          <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${nombre}</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px;">${fSalida} al ${fRegreso}</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; text-align: center;">${noches}</td>
          <td style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 700; font-size: 13px;">Q ${subtotal.toFixed(2)}</td>
        </tr>
      `;
    });
  } else {
    hotelRowsHtml = `
      <tr>
        <td colspan="4" style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #475569;">Sin hoteles registrados</td>
      </tr>
    `;
  }

  // Comidas HTML
  const checkedMeals = document.querySelectorAll('.chk-meal:checked');
  let countDesayuno = 0, countAlmuerzo = 0, countCena = 0;
  checkedMeals.forEach(chk => {
    const text = chk.parentElement.textContent.toLowerCase();
    if (text.includes('desayuno')) countDesayuno++;
    if (text.includes('almuerzo')) countAlmuerzo++;
    if (text.includes('cena')) countCena++;
  });
  const catalogs = Storage.getViaticosCatalogs();
  const rateDesayuno = catalogs.rates.desayuno || 30;
  const rateAlmuerzo = catalogs.rates.almuerzo || 40;
  const rateCena = catalogs.rates.cena || 40;

  const totalComidasVal = (countDesayuno * rateDesayuno) + (countAlmuerzo * rateAlmuerzo) + (countCena * rateCena);

  // Combustible HTML
  let fuelHtmlSection = '';
  let valGasolina = 0, valDeprec = 0;

  if (multiDayVehicleOwnership === 'propio') {
    const rendimiento = parseFloat(document.getElementById('vreq-rendimiento')?.value) || 35;
    const precioGalon = parseFloat(document.getElementById('vreq-preciogalon')?.value) || 34.50;
    const depreciacionKm = parseFloat(document.getElementById('vreq-depreciacionkm')?.value) || 0.50;

    const galones = rendimiento > 0 ? (kmTotal / rendimiento) : 0;
    valGasolina = galones * precioGalon;
    valDeprec = kmTotal * depreciacionKm;

    fuelHtmlSection = `
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: #334155;">Galones requeridos</td>
        <td style="padding: 4px 0; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">${galones.toFixed(2)} gal</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: #334155;">Costo de gasolina</td>
        <td style="padding: 4px 0; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">Q ${valGasolina.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: #334155;">Depreciación de vehículo</td>
        <td style="padding: 4px 0; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">Q ${valDeprec.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      </tr>
    `;
  } else {
    fuelHtmlSection = `
      <tr>
        <td style="padding: 4px 0; font-size: 13px; color: #334155;">Vehículo de la Empresa</td>
        <td style="padding: 4px 0; text-align: right; font-size: 13px; font-weight: 700; color: #0f172a;">Q 0.00 (Empresa)</td>
      </tr>
    `;
  }

  // Totals calculations
  let valHotel = 0;
  document.querySelectorAll('#viaticos-hotels-container .hotel-row-item').forEach(row => {
    const n = parseFloat(row.querySelector('.hotel-noches')?.value) || 0;
    const p = parseFloat(row.querySelector('.hotel-precio')?.value) || 0;
    valHotel += n * p;
  });

  let valOtros = 0;
  document.querySelectorAll('.otros-monto').forEach(inp => {
    valOtros += parseFloat(inp.value) || 0;
  });

  const grandTotal = valHotel + totalComidasVal + valGasolina + valDeprec + valOtros;

  // EXACT IMAGE REPLICA HTML STRUCTURE (COMPACT SINGLE PAGE FIT)
  const replicaBodyHtml = `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #000000; padding: 4px 2px;">
      
      <!-- Top Title Bar -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000000; padding-bottom: 8px; margin-bottom: 10px;">
        <div>
          <h1 style="font-size: 18px; font-weight: 800; margin: 0; color: #000000; letter-spacing: -0.02em;">Solicitud de Viáticos</h1>
          <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0; font-weight: 600;">GRUPO PREMIA · Generado ${new Date().toLocaleDateString('es-GT')}</p>
        </div>
        
        <!-- Mundi Trofeos Logo Image -->
        <div>
          <img src="logomundi.jpeg" alt="Mundi Trofeos Logo" style="max-height: 42px; max-width: 130px; object-fit: contain;">
        </div>
      </div>

      <!-- Metadata Grid (3 Columns) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 10px;">
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">SOLICITANTE</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${pilotFullName}</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">PUESTO</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${puestoText}</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">LICENCIA</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${licenciaText}</div>
        </div>

        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">VEHÍCULO</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${vehiculoText}</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">FECHA SALIDA</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${fSalida}</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">FECHA REGRESO</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${fRegreso}</div>
        </div>
      </div>

      <!-- Motivo del Viaje -->
      <div style="border-bottom: 1.5px solid #000000; padding-bottom: 6px; margin-bottom: 10px;">
        <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">MOTIVO DEL VIAJE</div>
        <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${motivo}</div>
      </div>

      <!-- Section 1: Ruta y kilometraje -->
      <div style="margin-bottom: 10px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #000000; margin: 0 0 3px 0;">Ruta y kilometraje (${kmTotal.toFixed(1)} km totales)</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000000;">
              <th style="text-align: left; font-size: 9px; font-weight: 800; color: #64748b; padding-bottom: 2px;">TRAMO</th>
              <th style="text-align: right; font-size: 9px; font-weight: 800; color: #64748b; padding-bottom: 2px;">KM</th>
            </tr>
          </thead>
          <tbody>
            ${tramosRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Section 2: Hotel -->
      <div style="margin-bottom: 10px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #000000; margin: 0 0 3px 0;">Hotel</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1.5px solid #000000;">
              <th style="text-align: left; font-size: 9px; font-weight: 800; color: #64748b; padding-bottom: 2px;">HOTEL (DEPTO.)</th>
              <th style="text-align: left; font-size: 9px; font-weight: 800; color: #64748b; padding-bottom: 2px;">FECHAS</th>
              <th style="text-align: center; font-size: 9px; font-weight: 800; color: #64748b; padding-bottom: 2px;">NOCHES</th>
              <th style="text-align: right; font-size: 9px; font-weight: 800; color: #64748b; padding-bottom: 2px;">SUBTOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${hotelRowsHtml}
          </tbody>
        </table>
      </div>

      <!-- Section 3: Comidas -->
      <div style="margin-bottom: 10px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #000000; margin: 0 0 3px 0;">Comidas</h3>
        <div style="border-top: 1.5px solid #000000; border-bottom: 1px solid #cbd5e1; padding: 5px 0; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: #0f172a; font-weight: 600;">
            ${countDesayuno} desayuno(s) × Q${rateDesayuno}, ${countAlmuerzo} almuerzo(s) × Q${rateAlmuerzo}, ${countCena} cena(s) × Q${rateCena}
          </span>
          <span style="font-size: 12px; font-weight: 800; color: #000000;">
            Q ${totalComidasVal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </span>
        </div>
      </div>

      <!-- Section 4: Combustible y depreciación -->
      <div style="margin-bottom: 12px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #000000; margin: 0 0 3px 0;">Combustible y depreciación</h3>
        <table style="width: 100%; border-collapse: collapse; border-top: 1.5px solid #000000;">
          <tbody>
            ${fuelHtmlSection}
          </tbody>
        </table>
      </div>

      <!-- Rounded Total Box -->
      <div style="border: 1.5px solid #0f172a; border-radius: 6px; padding: 8px 14px; display: flex; justify-content: space-between; align-items: center; background: #ffffff; margin-bottom: 4px;">
        <span style="font-size: 13px; font-weight: 800; color: #000000; letter-spacing: 0.05em;">TOTAL SOLICITADO</span>
        <span style="font-size: 20px; font-weight: 900; color: #000000; font-family: monospace;">
          Q ${grandTotal.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
        </span>
      </div>

      <!-- Breakdown Subtext -->
      <div style="text-align: right; font-size: 10px; color: #475569; margin-bottom: 18px; font-weight: 600;">
        Hotel: Q ${valHotel.toFixed(2)} &nbsp;&nbsp;&nbsp; 
        Comidas: Q ${totalComidasVal.toFixed(2)} &nbsp;&nbsp;&nbsp; 
        Combustible: Q ${valGasolina.toFixed(2)} &nbsp;&nbsp;&nbsp; 
        Depreciación: Q ${valDeprec.toFixed(2)} &nbsp;&nbsp;&nbsp; 
        Otros: Q ${valOtros.toFixed(2)}
      </div>

      <!-- Signature Lines -->
      <div style="margin-top: 25px; display: flex; justify-content: space-around; text-align: center; font-size: 10px; color: #334155; margin-bottom: 12px;">
        <div style="border-top: 1.5px solid #000000; width: 200px; padding-top: 5px; font-weight: 700;">
          Firma del solicitante
        </div>
        <div style="border-top: 1.5px solid #000000; width: 200px; padding-top: 5px; font-weight: 700;">
          Autorizado por (Contabilidad)
        </div>
      </div>

      <!-- Footer Text -->
      <div style="text-align: right; font-size: 9px; color: #94a3b8; font-weight: 500;">
        Documento generado desde la calculadora de viáticos — Grupo Premia
      </div>

    </div>
  `;

  const fileName = `Solicitud_Viaticos_${pilotFullName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  openPDFPreviewModal("Solicitud de Viáticos", replicaBodyHtml, fileName);
}

/**
 * PDF Generator for Single-Day Route (-1 Día) with exact GRUPO PREMIA replica layout
 */
function downloadSingleDayFormPDF(recordParam = null) {
  let record = recordParam;

  if (!record) {
    const pilotSelect = document.getElementById('insp-pilot-id');
    const pilots = Storage.getPilots();
    const selectedPilotId = pilotSelect ? pilotSelect.value : '';
    const currentPilot = pilots.find(p => p.id === selectedPilotId) || {
      firstName: currentSessionUser ? currentSessionUser.name.split(' ')[0] : 'Piloto',
      lastName: currentSessionUser ? currentSessionUser.name.split(' ')[1] || '' : '',
      puesto: 'Piloto Repartidor',
      licenseNumber: '—',
      licenseType: 'A'
    };

    const vehSelect = document.getElementById('insp-vehicle-id');
    const vehicles = Storage.getVehicles();
    const selectedVehId = vehSelect ? vehSelect.value : '';
    const currentVeh = vehicles.find(v => v.id === selectedVehId) || {
      plate: 'P-554GTM',
      model: 'Toyota Hino',
      unitName: 'Unidad H4'
    };

    const hasDefects = document.getElementById('chk-has-defects')?.checked || false;
    let activeDefects = [];
    if (hasDefects) {
      if (document.getElementById('chk-dmg-carroceria')?.checked) activeDefects.push('Carrocería / Golpes');
      if (document.getElementById('chk-dmg-vidrios')?.checked) activeDefects.push('Parabrisas / Vidrios');
      if (document.getElementById('chk-dmg-llantas')?.checked) activeDefects.push('Llantas');
      if (document.getElementById('chk-dmg-espejos')?.checked) activeDefects.push('Espejos');
      if (document.getElementById('chk-alarm')?.checked) activeDefects.push('Alarma');
      if (document.getElementById('chk-def-tablero')?.checked) activeDefects.push('Falla en Tablero');
    }

    record = {
      pilotName: `${currentPilot.firstName} ${currentPilot.lastName}`,
      puesto: currentPilot.puesto || 'Piloto Repartidor',
      licenseNumber: currentPilot.licenseNumber || '—',
      licenseType: currentPilot.licenseType || 'A',
      vehiclePlate: currentVeh.plate,
      vehicleModel: currentVeh.model,
      vehicleUnit: currentVeh.unitName,
      date: document.getElementById('insp-date')?.value || new Date().toISOString().split('T')[0],
      startTime: document.getElementById('insp-start-time')?.value || new Date().toTimeString().split(' ')[0],
      interiorCleanliness: inspectionFormState.interiorCleanliness || 'Bueno',
      exteriorCleanliness: inspectionFormState.exteriorCleanliness || 'Bueno',
      fuelLevel: inspectionFormState.fuelLevel || 'Lleno (100%)',
      odometer: document.getElementById('insp-odometer')?.value || '125,430 KM',
      hasDefects: hasDefects,
      defectPhoto: hasDefects ? defectPhotoBase64 : null,
      defectsList: activeDefects,
      fluids: inspectionFormState.fluids,
      kit: {
        llanta: document.getElementById('kit-llanta')?.checked ? 'Sí' : 'No',
        gato: document.getElementById('kit-gato')?.checked ? 'Sí' : 'No',
        triangulo: document.getElementById('kit-triangulo')?.checked ? 'Sí' : 'No',
        extintor: document.getElementById('kit-extintor')?.checked ? 'Sí' : 'No'
      },
      docs: {
        tarjeta: document.getElementById('doc-tarjeta')?.checked ? 'Vigente' : 'No',
        licencia: document.getElementById('doc-licencia')?.checked ? 'Vigente' : 'No'
      }
    };
  }

  const pilotFullName = record.pilotName || 'Piloto Corporativo';
  const puestoText = record.puesto || 'Piloto Repartidor';
  const licenciaText = `${record.licenseNumber || '—'} (Tipo ${record.licenseType || 'A'})`;
  const vehiculoText = `${record.vehiclePlate} — ${record.vehicleModel || 'Unidad'} (${record.vehicleUnit || 'H4'})`;

  let defectsText = 'Sin daños ni defectos mecánicos reportados.';
  if (record.hasDefects) {
    if (record.defectsList && record.defectsList.length > 0) {
      defectsText = record.defectsList.join(', ');
    } else {
      defectsText = 'Defectos mecánicos indicados en inspección pre-viaje.';
    }
  }

  const aceiteVal = record.fluids ? (record.fluids.aceite || 'Correcto') : 'Correcto';
  const radiadorVal = record.fluids ? (record.fluids.radiador || 'Correcto') : 'Correcto';
  const frenosVal = record.fluids ? (record.fluids.frenos || 'Correcto') : 'Correcto';
  const hidraulicoVal = record.fluids ? (record.fluids.hidraulico || 'Correcto') : 'Correcto';

  const singleDayPdfHtml = `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #000000; padding: 4px 2px;">
      
      <!-- Top Title Bar -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000000; padding-bottom: 6px; margin-bottom: 8px;">
        <div>
          <h1 style="font-size: 18px; font-weight: 800; margin: 0; color: #000000; letter-spacing: -0.02em;">Reporte de Ruta de 1 Día o Menos</h1>
          <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0; font-weight: 600;">GRUPO PREMIA · Inspección Pre-Viaje · Generado ${new Date().toLocaleDateString('es-GT')}</p>
        </div>
        
        <!-- Mundi Trofeos Logo Image -->
        <div>
          <img src="logomundi.jpeg" alt="Mundi Trofeos Logo" style="max-height: 40px; max-width: 130px; object-fit: contain;">
        </div>
      </div>

      <!-- Metadata Grid (3 Columns) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px 10px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 8px;">
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">SOLICITANTE / PILOTO</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${pilotFullName}</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">PUESTO</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${puestoText}</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">LICENCIA</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${licenciaText}</div>
        </div>

        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">VEHÍCULO / UNIDAD</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${vehiculoText}</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">FECHA SALIDA</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${record.date || '—'}</div>
        </div>
        <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 3px;">
          <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">HORA DE SALIDA</div>
          <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">${record.startTime || '—'}</div>
        </div>
      </div>

      <!-- Motivo del Viaje -->
      <div style="border-bottom: 1.5px solid #000000; padding-bottom: 4px; margin-bottom: 8px;">
        <div style="font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">TIPO DE RECORRIDO</div>
        <div style="font-size: 12px; font-weight: 800; color: #000000; margin-top: 1px;">Recorrido Local / Diario (-1 Día) — Reparto Urbano</div>
      </div>

      <!-- Section 1: Limpieza, Combustible & Odómetro -->
      <div style="margin-bottom: 8px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #000000; margin: 0 0 3px 0;">1. Limpieza, Combustible & Odómetro</h3>
        <table style="width: 100%; border-collapse: collapse; border-top: 1.5px solid #000000;">
          <tbody>
            <tr>
              <td style="padding: 2px 0; font-size: 11px; color: #334155;">Limpieza Interior</td>
              <td style="padding: 2px 0; text-align: right; font-size: 11px; font-weight: 700; color: #0f172a;">${record.interiorCleanliness || 'Bueno'}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-size: 11px; color: #334155;">Limpieza Exterior</td>
              <td style="padding: 2px 0; text-align: right; font-size: 11px; font-weight: 700; color: #0f172a;">${record.exteriorCleanliness || 'Bueno'}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-size: 11px; color: #334155;">Nivel de Combustible</td>
              <td style="padding: 2px 0; text-align: right; font-size: 11px; font-weight: 700; color: #0f172a;">${record.fuelLevel || 'Lleno'}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-size: 11px; color: #334155;">Lectura de Odómetro</td>
              <td style="padding: 2px 0; text-align: right; font-size: 11px; font-weight: 700; color: #0f172a;">${record.odometer || 'N/A'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section 2: Defectos Mecánicos & Carrocería -->
      <div style="margin-bottom: 8px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #000000; margin: 0 0 3px 0;">2. Carrocería & Defectos Mecánicos</h3>
        <div style="border-top: 1.5px solid #000000; border-bottom: 1px solid #cbd5e1; padding: 4px 0; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; color: #0f172a; font-weight: 600;">¿Tiene Defectos Mecánicos o Daños?</span>
          <span style="font-size: 11px; font-weight: 800; color: ${record.hasDefects ? '#dc2626' : '#059669'};">${record.hasDefects ? 'SÍ' : 'NO'}</span>
        </div>
        <div style="padding: 3px 0; font-size: 11px; color: #475569;">
          <strong>Detalle:</strong> ${defectsText}
        </div>
        ${record.defectPhoto ? `
          <div style="margin-top: 4px; text-align: center; background: #ffffff; padding: 4px; border-radius: 4px; border: 1px solid #cbd5e1;">
            <img src="${record.defectPhoto}" style="max-width: 100%; max-height: 110px; object-fit: contain; border-radius: 4px;">
            <p style="font-size: 9px; color: #64748b; margin: 2px 0 0 0; font-weight: 600;">Evidencia fotográfica de daño o defecto mecánico</p>
          </div>
        ` : ''}
      </div>

      <!-- Section 3: Niveles de Fluidos -->
      <div style="margin-bottom: 8px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #000000; margin: 0 0 3px 0;">3. Niveles de Fluidos</h3>
        <table style="width: 100%; border-collapse: collapse; border-top: 1.5px solid #000000;">
          <tbody>
            <tr>
              <td style="padding: 2px 0; font-size: 11px; color: #334155;">Aceite de Motor</td>
              <td style="padding: 2px 0; text-align: right; font-size: 11px; font-weight: 700; color: #0f172a;">${aceiteVal}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-size: 11px; color: #334155;">Agua / Radiador</td>
              <td style="padding: 2px 0; text-align: right; font-size: 11px; font-weight: 700; color: #0f172a;">${radiadorVal}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-size: 11px; color: #334155;">Líquido de Frenos</td>
              <td style="padding: 2px 0; text-align: right; font-size: 11px; font-weight: 700; color: #0f172a;">${frenosVal}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0; font-size: 11px; color: #334155;">Líquido Hidráulico</td>
              <td style="padding: 2px 0; text-align: right; font-size: 11px; font-weight: 700; color: #0f172a;">${hidraulicoVal}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Section 4: Kit de Emergencia & Documentación -->
      <div style="margin-bottom: 10px;">
        <h3 style="font-size: 12px; font-weight: 800; color: #000000; margin: 0 0 3px 0;">4. Kit de Emergencia & Documentos</h3>
        <div style="border-top: 1.5px solid #000000; padding-top: 4px; font-size: 11px; color: #334155; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px;">
          <div>• Llanta de Repuesto: <strong>${record.kit ? (record.kit.llanta || 'Sí') : 'Sí'}</strong></div>
          <div>• Triquet / Gato: <strong>${record.kit ? (record.kit.gato || 'Sí') : 'Sí'}</strong></div>
          <div>• Triángulos de Señal: <strong>${record.kit ? (record.kit.triangulo || 'Sí') : 'Sí'}</strong></div>
          <div>• Extintor Recargado: <strong>${record.kit ? (record.kit.extintor || 'Sí') : 'Sí'}</strong></div>
          <div>• Tarjeta Circulación: <strong>${record.docs ? (record.docs.tarjeta || 'Vigente') : 'Vigente'}</strong></div>
          <div>• Licencia Conducir: <strong>${record.docs ? (record.docs.licencia || 'Vigente') : 'Vigente'}</strong></div>
        </div>
      </div>

      <!-- Rounded Total Box -->
      <div style="border: 1.5px solid #0f172a; border-radius: 6px; padding: 6px 12px; display: flex; justify-content: space-between; align-items: center; background: #ffffff; margin-bottom: 4px;">
        <span style="font-size: 12px; font-weight: 800; color: #000000; letter-spacing: 0.05em;">ESTADO DE INSPECCIÓN</span>
        <span style="font-size: 16px; font-weight: 900; color: #059669;">
          APROBADO PARA RUTA
        </span>
      </div>

      <!-- Breakdown Subtext -->
      <div style="text-align: right; font-size: 10px; color: #475569; margin-bottom: 12px; font-weight: 600;">
        Interior: ${record.interiorCleanliness || 'Bueno'} &nbsp;&nbsp;&nbsp; Exterior: ${record.exteriorCleanliness || 'Bueno'} &nbsp;&nbsp;&nbsp; Combustible: ${record.fuelLevel || 'Lleno'} &nbsp;&nbsp;&nbsp; Odómetro: ${record.odometer || 'N/A'}
      </div>

      <!-- Signature Lines -->
      <div style="margin-top: 25px; display: flex; justify-content: space-around; text-align: center; font-size: 10px; color: #334155; margin-bottom: 12px;">
        <div style="border-top: 1.5px solid #000000; width: 200px; padding-top: 5px; font-weight: 700;">
          Firma del piloto
        </div>
        <div style="border-top: 1.5px solid #000000; width: 200px; padding-top: 5px; font-weight: 700;">
          Verificado por Supervisión
        </div>
      </div>

      <!-- Footer Text -->
      <div style="text-align: right; font-size: 9px; color: #94a3b8; font-weight: 500;">
        Documento generado desde el módulo de inspección pre-viaje — Grupo Premia
      </div>

    </div>
  `;

  const fileName = `Inspeccion_Ruta_1Dia_${pilotFullName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  openPDFPreviewModal("Inspección Ruta de 1 Día", singleDayPdfHtml, fileName);
}

/**
 * 2. PDF: Historial del Piloto en Sesión
 */
function downloadPilotHistoryPDF() {
  if (!currentSessionUser || currentSessionUser.role !== 'pilot') return;

  const loggedInPilotId = currentSessionUser.userId;
  const loggedInPilotName = (currentSessionUser.name || '').toLowerCase();

  const allHistory = Storage.getHistory();
  const filteredHistory = allHistory.filter(h => 
    h.pilotId === loggedInPilotId || 
    (h.pilotName && h.pilotName.toLowerCase().includes(loggedInPilotName))
  );

  const allViaticosReqs = Storage.getViaticosRequests();
  const filteredViaticosReqs = allViaticosReqs.filter(vr => 
    vr.pilotId === loggedInPilotId || 
    (vr.pilotName && vr.pilotName.toLowerCase().includes(loggedInPilotName))
  );

  const combined = [];
  filteredViaticosReqs.forEach(vr => {
    combined.push({
      date: vr.fechaSalida,
      pilotName: vr.pilotName,
      vehiclePlate: vr.vehiclePlate,
      tipo: 'Viáticos (+1 Día)',
      horario: `${vr.fechaSalida} al ${vr.fechaRegreso}`,
      totalDisplay: formatCurrency(vr.totalSolicitado),
      status: vr.status || 'Pendiente'
    });
  });

  filteredHistory.forEach(h => {
    combined.push({
      date: h.date,
      pilotName: h.pilotName,
      vehiclePlate: h.vehiclePlate,
      tipo: 'Ruta 1 Día',
      horario: `${h.startTime} - ${h.endTime}`,
      totalDisplay: formatDuration(h.startTime, h.endTime),
      status: h.status || 'Completada'
    });
  });

  if (combined.length === 0) {
    showToast('No hay registros en el historial para exportar.', 'warning');
    return;
  }

  let tableRows = combined.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${item.date}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.pilotName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.vehiclePlate}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.tipo}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.horario}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${item.totalDisplay}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.status}</td>
    </tr>
  `).join('');

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; padding: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px;">
        <div>
          <h2 style="font-size: 18px; margin: 0; color: #0f172a;">Historial de Rutas y Viáticos</h2>
          <p style="font-size: 12px; color: #475569; margin: 4px 0 0 0;"><strong>Piloto:</strong> ${currentSessionUser.name} (${currentSessionUser.country})</p>
        </div>
        <img src="logomundi.jpeg" alt="Logo Mundi" style="max-height: 48px; max-width: 140px; object-fit: contain;">
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #0f172a; color: #ffffff;">
            <th style="padding: 8px; text-align: left;">Fecha</th>
            <th style="padding: 8px; text-align: left;">Piloto</th>
            <th style="padding: 8px; text-align: left;">Vehículo</th>
            <th style="padding: 8px; text-align: left;">Tipo</th>
            <th style="padding: 8px; text-align: left;">Horario / Fechas</th>
            <th style="padding: 8px; text-align: left;">Total / Duración</th>
            <th style="padding: 8px; text-align: left;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;

  const fileName = `Historial_Piloto_${currentSessionUser.name.replace(/\s+/g, '_')}.pdf`;
  openPDFPreviewModal("Historial Personal", bodyHtml, fileName);
}

/**
 * 3. PDF: Auditoría Global para Administrador
 */
function downloadAdminAuditPDF() {
  const history = Storage.getHistory();
  const viaticosReqs = Storage.getViaticosRequests();

  const combined = [];
  viaticosReqs.forEach(vr => {
    combined.push({
      date: vr.fechaSalida,
      pilotName: vr.pilotName,
      vehiclePlate: vr.vehiclePlate,
      motivo: vr.motivo || 'Viáticos (+1 Día)',
      horario: `${vr.fechaSalida} al ${vr.fechaRegreso}`,
      totalDisplay: formatCurrency(vr.totalSolicitado),
      status: vr.status || 'Pendiente'
    });
  });

  history.forEach(h => {
    combined.push({
      date: h.date,
      pilotName: h.pilotName,
      vehiclePlate: h.vehiclePlate,
      motivo: 'Inspección Ruta 1 Día',
      horario: `${h.startTime} - ${h.endTime}`,
      totalDisplay: formatDuration(h.startTime, h.endTime),
      status: h.status || 'Completada'
    });
  });

  if (combined.length === 0) {
    showToast('No hay datos registrados en auditoría para exportar.', 'warning');
    return;
  }

  let tableRows = combined.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${item.date}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.pilotName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.vehiclePlate}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.motivo}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.horario}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700;">${item.totalDisplay}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${item.status}</td>
    </tr>
  `).join('');

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; padding: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #9333ea; padding-bottom: 10px; margin-bottom: 16px;">
        <div>
          <h2 style="font-size: 18px; margin: 0; color: #9333ea;">Reporte de Auditoría Global de Flotas</h2>
          <p style="font-size: 12px; color: #475569; margin: 4px 0 0 0;">Resumen Consolidado Corporativo de Flotas, Inspecciones y Solicitudes de Viáticos.</p>
        </div>
        <img src="logomundi.jpeg" alt="Logo Mundi" style="max-height: 48px; max-width: 140px; object-fit: contain;">
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1;">
        <thead>
          <tr style="background: #9333ea; color: #ffffff;">
            <th style="padding: 8px; text-align: left;">Fecha</th>
            <th style="padding: 8px; text-align: left;">Piloto / Solicitante</th>
            <th style="padding: 8px; text-align: left;">Placa Vehículo</th>
            <th style="padding: 8px; text-align: left;">Motivo / Tipo</th>
            <th style="padding: 8px; text-align: left;">Horario / Fechas</th>
            <th style="padding: 8px; text-align: left;">Total / Duración</th>
            <th style="padding: 8px; text-align: left;">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;

  const fileName = `Reporte_Auditoria_Global_Flotas_${Date.now()}.pdf`;
  openPDFPreviewModal("Auditoría Global", bodyHtml, fileName);
}

/**
 * 4. PDF: Detalle de Registro (Modales)
 */
function downloadModalDetailsPDF() {
  if (!currentOpenedRecordDetails) {
    showToast('No se encontró información del registro para generar PDF.', 'warning');
    return;
  }

  const { record, isViatico, isLicense } = currentOpenedRecordDetails;

  if (isViatico) {
    // Dynamically set form values temporarily to reuse downloadViaticosFormPDF
    const solSelect = document.getElementById('vreq-solicitante');
    if (solSelect && record.pilotId) solSelect.value = record.pilotId;

    const kmInput = document.getElementById('vreq-kmtotal');
    if (kmInput) kmInput.value = record.totalKm || 120;

    downloadViaticosFormPDF();
  } else if (isLicense || record.licenseNumber) {
    const bodyHtml = `
      <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; font-size: 13px; text-align: center; font-family: Arial, sans-serif;">
        <h3 style="margin: 0 0 10px 0; color: #0f172a;">Expediente de Conductor: ${record.firstName} ${record.lastName}</h3>
        <p style="margin: 4px 0;"><strong>No. Licencia:</strong> ${record.licenseNumber} (Tipo ${record.licenseType})</p>
        <p style="margin: 4px 0;"><strong>Fecha de Vencimiento:</strong> ${record.expirationDate}</p>
        <p style="margin: 4px 0;"><strong>Puesto:</strong> ${record.puesto || 'Piloto'}</p>
        ${record.licensePhoto ? `<div style="margin-top: 14px;"><img src="${record.licensePhoto}" style="max-width: 100%; max-height: 350px; border-radius: 8px; border: 1px solid #cbd5e1;"></div>` : ''}
      </div>
    `;
    closeModal('modal-inspection-details');
    openPDFPreviewModal(`LICENCIA DE CONDUCIR - ${record.firstName}_${record.lastName}`, bodyHtml, `Licencia_${record.licenseNumber}.pdf`);
  } else {
    closeModal('modal-inspection-details');
    downloadSingleDayFormPDF(record);
  }
}

function exportRouteHistory() {
  downloadPilotHistoryPDF();
}

/* ==========================================================================
   MODALS & TOAST UTILITIES
   ========================================================================== */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-message ${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
