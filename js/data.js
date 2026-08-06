/**
 * Data store & storage management for Mundi Trofeos · Tiendas Trofex · Premia
 * Sistema de Gestión de Rutas y Viáticos (Con Módulo de Viáticos Completo)
 */

const STORAGE_KEYS = {
  PILOTS: 'rutasyviaticos_pilots',
  VEHICLES: 'rutasyviaticos_vehicles',
  HISTORY: 'rutasyviaticos_history',
  INSPECTION: 'rutasyviaticos_current_inspection',
  SESSION: 'rutasyviaticos_session',
  VIATICOS_REQUESTS: 'rutasyviaticos_requests',
  VIATICOS_CATALOGS: 'rutasyviaticos_catalogs',
};

// Seed Pilots Data
const DEFAULT_PILOTS = [
  {
    id: 'p1',
    firstName: 'Carlos',
    lastName: 'Pérez',
    phone: '+502 5544-1234',
    age: '35',
    licenseNumber: 'GTM-12345',
    expirationDate: '2026-12-31',
    licenseType: 'C',
    country: 'Guatemala',
    puesto: 'Piloto Repartidor - Zona Central',
    email: 'carlos.perez@munditrofeos.com',
    licensePhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'p2',
    firstName: 'Juan',
    lastName: 'García',
    phone: '+504 9876-5432',
    age: '42',
    licenseNumber: 'HND-67890',
    expirationDate: '2025-08-15',
    licenseType: 'B',
    country: 'Honduras',
    puesto: 'Piloto Logístico - Zona Norte',
    email: 'juan.garcia@munditrofeos.com',
    licensePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'p3',
    firstName: 'Roberto',
    lastName: 'Alvarado',
    phone: '+503 7788-9900',
    age: '29',
    licenseNumber: 'SLV-11223',
    expirationDate: '2027-03-20',
    licenseType: 'A',
    country: 'El Salvador',
    puesto: 'Supervisor de Rutas - El Salvador',
    email: 'roberto.alvarado@munditrofeos.com',
    licensePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'p4',
    firstName: 'Luis Fernando',
    lastName: 'Zelaya',
    phone: '+505 8899-4455',
    age: '38',
    licenseNumber: 'NIC-44332',
    expirationDate: '2026-10-10',
    licenseType: 'B',
    country: 'Nicaragua',
    puesto: 'Piloto Transportista - Zona Pacífico',
    email: 'luis.zelaya@munditrofeos.com',
    licensePhoto: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'p5',
    firstName: 'Esteban',
    lastName: 'Monge',
    phone: '+506 8765-4321',
    age: '31',
    licenseNumber: 'CRI-99881',
    expirationDate: '2027-05-14',
    licenseType: 'C',
    country: 'Costa Rica',
    puesto: 'Piloto Entregas Rápidas - San José',
    email: 'esteban.monge@munditrofeos.com',
    licensePhoto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  }
];

// Seed Vehicles Data
const DEFAULT_VEHICLES = [
  {
    id: 'v1',
    plate: 'P-123GTM',
    brand: 'Toyota',
    model: 'HiAce',
    vehicleType: 'Panel',
    year: '2023',
    hasInsurance: 'Sí',
    policyNumber: 'POL-GTM-99881',
    policyExpiration: '2027-06-30',
    policyPhone: '+502 2339-5555',
    unitName: 'Toyota HiAce (P-123GTM)',
    chassisNumber: 'JTEBR3FJ2CK012345',
    country: 'Guatemala',
    rendimiento: 35,
    tipoCombustible: 'Diésel',
    esEmpresa: true
  },
  {
    id: 'v2',
    plate: 'C-456HND',
    brand: 'Hyundai',
    model: 'H100',
    vehicleType: 'Camioncito',
    year: '2022',
    hasInsurance: 'Sí',
    policyNumber: 'POL-HND-55442',
    policyExpiration: '2026-11-15',
    policyPhone: '+504 2235-9900',
    unitName: 'Hyundai H100 (C-456HND)',
    chassisNumber: 'KMHDN46D08U123456',
    country: 'Honduras',
    rendimiento: 28,
    tipoCombustible: 'Diésel',
    esEmpresa: true
  },
  {
    id: 'v3',
    plate: 'P-789SLV',
    brand: 'Chevrolet',
    model: 'Suburban',
    vehicleType: 'SUV',
    year: '2024',
    hasInsurance: 'Sí',
    policyNumber: 'POL-SLV-33211',
    policyExpiration: '2027-12-10',
    policyPhone: '+503 2244-8800',
    unitName: 'Chevrolet Suburban (P-789SLV)',
    chassisNumber: '1GNSKCKC4RR112233',
    country: 'El Salvador',
    rendimiento: 32,
    tipoCombustible: 'Gasolina',
    esEmpresa: true
  },
  {
    id: 'v4',
    plate: 'P-554GTM',
    brand: 'Isuzu',
    model: 'D-Max',
    vehicleType: 'Pickup',
    year: '2024',
    hasInsurance: 'Sí',
    policyNumber: 'POL-GTM-77119',
    policyExpiration: '2027-08-25',
    policyPhone: '+502 2200-1122',
    unitName: 'Isuzu D-Max (P-554GTM)',
    chassisNumber: 'MP1TFR85JAT987654',
    country: 'Guatemala',
    rendimiento: 40,
    tipoCombustible: 'Diésel',
    esEmpresa: true
  },
  {
    id: 'v5',
    plate: 'C-882NIC',
    brand: 'Isuzu',
    model: 'NPR',
    vehicleType: 'Camión',
    year: '2023',
    hasInsurance: 'Sí',
    policyNumber: 'POL-NIC-44556',
    policyExpiration: '2026-09-18',
    policyPhone: '+505 2266-7788',
    unitName: 'Isuzu NPR (C-882NIC)',
    chassisNumber: 'JALNPR75L70054321',
    country: 'Nicaragua',
    rendimiento: 22,
    tipoCombustible: 'Diésel',
    esEmpresa: true
  },
  {
    id: 'v6',
    plate: 'P-991CRI',
    brand: 'Chevrolet',
    model: 'Silverado',
    vehicleType: 'Pickup',
    year: '2023',
    hasInsurance: 'Sí',
    policyNumber: 'POL-CRI-66778',
    policyExpiration: '2027-04-30',
    policyPhone: '+506 2522-3344',
    unitName: 'Chevrolet Silverado (P-991CRI)',
    chassisNumber: '3GCUKREC5GG998877',
    country: 'Costa Rica',
    rendimiento: 30,
    tipoCombustible: 'Gasolina',
    esEmpresa: true
  }
];

// Seed Preset Distances Catalogs
const DEFAULT_PRESET_ROUTES = [
  { id: 'r1', origen: 'Ciudad de Guatemala', destino: 'Quetzaltenango', km: 205 },
  { id: 'r2', origen: 'Ciudad de Guatemala', destino: 'Escuintla', km: 62 },
  { id: 'r3', origen: 'Ciudad de Guatemala', destino: 'Puerto Barrios', km: 295 },
  { id: 'r4', origen: 'Ciudad de Guatemala', destino: 'San Pedro Sula (HND)', km: 390 },
  { id: 'r5', origen: 'Ciudad de Guatemala', destino: 'San Salvador (SLV)', km: 240 },
  { id: 'r6', origen: 'San Salvador', destino: 'Santa Ana', km: 65 },
  { id: 'r7', origen: 'Tegucigalpa', destino: 'San Pedro Sula', km: 250 },
  { id: 'r8', origen: 'Managua', destino: 'Granada', km: 45 },
  { id: 'r9', origen: 'San José', destino: 'Alajuela', km: 20 }
];

// Seed Travel Reasons Catalogs
const DEFAULT_MOTIVOS = [
  'Entrega de Trofeos y Premiaciones',
  'Surtido de Tiendas Trofex',
  'Supervisión de Tiendas Premia',
  'Auditoría de Inventario Regional',
  'Mantenimiento Preventivo de Unidades',
  'Visita Comercial y Prospección'
];

// Seed History Data
const DEFAULT_HISTORY = [
  {
    id: 'rh1',
    pilotId: 'p1',
    pilotName: 'Carlos Pérez',
    vehiclePlate: 'P-123GTM',
    vehicleUnit: 'Unidad H1',
    vehicleModel: 'Toyota',
    vehicleType: 'Panel',
    date: '2026-07-25',
    startTime: '07:30:00',
    endTime: '14:45:22',
    country: 'Guatemala',
    status: 'Completada',
    inspectionSummary: {
      interiorCleanliness: 'Bueno',
      exteriorCleanliness: 'Bueno',
      fuelLevel: 'Lleno',
      odometer: '124,500 km'
    }
  }
];

// Seed Viáticos Requests Data
const DEFAULT_VIATICOS_REQUESTS = [
  {
    id: 'vreq_101',
    correlativo: 'SOL-2026-001',
    solicitanteId: 'p1',
    solicitanteName: 'Carlos Pérez',
    puesto: 'Piloto Repartidor - Zona Central',
    vehiculoId: 'v1',
    vehiculoPlate: 'P-123GTM (Unidad H1)',
    fechaSalida: '2026-07-20',
    fechaRegreso: '2026-07-22',
    diasTotales: 3,
    motivo: 'Entrega de Trofeos y Premiaciones',
    kmTotal: 410,
    rendimiento: 35,
    precioGalon: 34.50,
    depreciacionPorKm: 0.50,
    totalHotel: 600.00,
    totalComidas: 330.00,
    totalGasolina: 404.14,
    totalDepreciacion: 205.00,
    totalOtros: 80.00,
    totalSolicitado: 1619.14,
    estado: 'Aprobada',
    recibos: [
      { id: 'rec1', concepto: 'Factura Hotel Quetzaltenango', monto: 600.00, tipo: 'Hotel' },
      { id: 'rec2', concepto: 'Factura Gasolinera Shell', monto: 405.00, tipo: 'Combustible' }
    ]
  }
];

// Helper Storage API
const Storage = {
  getPilots() {
    const data = localStorage.getItem(STORAGE_KEYS.PILOTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.PILOTS, JSON.stringify(DEFAULT_PILOTS));
      return DEFAULT_PILOTS;
    }
    const list = JSON.parse(data);
    const updated = list.map(p => {
      const matchSeed = DEFAULT_PILOTS.find(sp => sp.id === p.id || sp.licenseNumber === p.licenseNumber) || {};
      return {
        ...matchSeed,
        ...p,
        phone: p.phone || matchSeed.phone || '+502 5544-1234',
        puesto: p.puesto || matchSeed.puesto || 'Piloto Corporativo',
        country: p.country || matchSeed.country || 'Guatemala',
        age: p.age || matchSeed.age || '30',
        licenseType: p.licenseType || matchSeed.licenseType || 'C'
      };
    });
    return updated;
  },
  savePilots(pilots) {
    localStorage.setItem(STORAGE_KEYS.PILOTS, JSON.stringify(pilots));
  },

  getVehicles() {
    const data = localStorage.getItem(STORAGE_KEYS.VEHICLES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(DEFAULT_VEHICLES));
      return DEFAULT_VEHICLES;
    }
    const list = JSON.parse(data);
    const updated = list.map(v => {
      const matchSeed = DEFAULT_VEHICLES.find(sv => sv.id === v.id || sv.plate === v.plate) || {};
      return {
        ...matchSeed,
        ...v,
        brand: v.brand || matchSeed.brand || 'Toyota',
        model: v.model || matchSeed.model || 'HiAce',
        vehicleType: v.vehicleType || matchSeed.vehicleType || 'Panel',
        year: v.year || matchSeed.year || '2024',
        hasInsurance: v.hasInsurance || matchSeed.hasInsurance || 'Sí',
        policyNumber: v.hasInsurance === 'No' ? 'N/A' : (v.policyNumber || matchSeed.policyNumber || 'POL-GTM-99881'),
        policyExpiration: v.hasInsurance === 'No' ? '' : (v.policyExpiration || matchSeed.policyExpiration || '2027-06-30'),
        policyPhone: v.hasInsurance === 'No' ? 'N/A' : (v.policyPhone || matchSeed.policyPhone || '+502 2339-5555')
      };
    });
    return updated;
  },
  saveVehicles(vehicles) {
    localStorage.setItem(STORAGE_KEYS.VEHICLES, JSON.stringify(vehicles));
  },

  getHistory() {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(DEFAULT_HISTORY));
      return DEFAULT_HISTORY;
    }
    return JSON.parse(data);
  },
  saveHistory(history) {
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  },

  getCurrentInspection() {
    const data = localStorage.getItem(STORAGE_KEYS.INSPECTION);
    return data ? JSON.parse(data) : null;
  },
  saveCurrentInspection(inspection) {
    if (inspection) {
      localStorage.setItem(STORAGE_KEYS.INSPECTION, JSON.stringify(inspection));
    } else {
      localStorage.removeItem(STORAGE_KEYS.INSPECTION);
    }
  },

  getSession() {
    const data = localStorage.getItem(STORAGE_KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  },
  saveSession(sessionData) {
    if (sessionData) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessionData));
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  },

  clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  },

  // Viáticos Requests
  getViaticosRequests() {
    const data = localStorage.getItem(STORAGE_KEYS.VIATICOS_REQUESTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.VIATICOS_REQUESTS, JSON.stringify(DEFAULT_VIATICOS_REQUESTS));
      return DEFAULT_VIATICOS_REQUESTS;
    }
    return JSON.parse(data);
  },
  saveViaticosRequests(requests) {
    localStorage.setItem(STORAGE_KEYS.VIATICOS_REQUESTS, JSON.stringify(requests));
  },

  // Viáticos Catalogs (Preset Routes, Motivos, Rates)
  getViaticosCatalogs() {
    const data = localStorage.getItem(STORAGE_KEYS.VIATICOS_CATALOGS);
    if (!data) {
      const catalogs = {
        presetRoutes: DEFAULT_PRESET_ROUTES,
        motivos: DEFAULT_MOTIVOS,
        rates: {
          desayuno: 30.00,
          almuerzo: 40.00,
          cena: 40.00,
          depreciacionKm: 0.50,
          precioGalonGasolina: 34.50,
          precioGalonDiesel: 31.00
        }
      };
      localStorage.setItem(STORAGE_KEYS.VIATICOS_CATALOGS, JSON.stringify(catalogs));
      return catalogs;
    }
    return JSON.parse(data);
  },
  saveViaticosCatalogs(catalogs) {
    localStorage.setItem(STORAGE_KEYS.VIATICOS_CATALOGS, JSON.stringify(catalogs));
  }
};

// Utilities
function getLicenseStatus(expirationDateStr) {
  if (!expirationDateStr) return { status: 'Desconocido', colorClass: 'badge-gray', text: 'Desconocido' };
  const expDate = new Date(expirationDateStr);
  const today = new Date();
  const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { status: 'Vencida', colorClass: 'badge-danger', text: 'Vencida' };
  } else if (diffDays <= 45) {
    return { status: 'Por vencer', colorClass: 'badge-warning', text: `Vence en ${diffDays} días` };
  } else {
    return { status: 'Vigente', colorClass: 'badge-success', text: 'Vigente' };
  }
}

function formatDuration(startTime, endTime) {
  if (!startTime || !endTime) return '—';
  const [sh, sm, ss] = startTime.split(':').map(Number);
  const [eh, em, es] = endTime.split(':').map(Number);
  let diffSec = (eh * 3600 + em * 60 + (es || 0)) - (sh * 3600 + sm * 60 + (ss || 0));
  if (diffSec < 0) diffSec += 86400; // Handle midnight overlap
  
  const h = Math.floor(diffSec / 3600);
  const m = Math.floor((diffSec % 3600) / 60);
  const s = diffSec % 60;

  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  return `${m}m ${s}s`;
}

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return `Q ${num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,')}`;
}
