import { AutoRecord, AreaConfig, AreaType } from './types';

// Mock data reflecting the structure if CSV fails
export const MOCK_DATA: AutoRecord[] = [
  { id: '1', mes: 'Enero', anio: 2025, sucursal: 'Jujuy', ppt_diarios: 24, avance_ppt: 527, servicios_diarios: 13.7, objetivo_mensual: 5000, dias_laborables: 22 },
  { id: '2', mes: 'Enero', anio: 2025, sucursal: 'Salta', ppt_diarios: 27, avance_ppt: 603, servicios_diarios: 17.9, objetivo_mensual: 6500, dias_laborables: 22 },
  { id: '3', mes: 'Febrero', anio: 2025, sucursal: 'Jujuy', ppt_diarios: 25, avance_ppt: 469, servicios_diarios: 15.3, objetivo_mensual: 5000, dias_laborables: 20 },
  { id: '4', mes: 'Febrero', anio: 2025, sucursal: 'Salta', ppt_diarios: 30, avance_ppt: 563, servicios_diarios: 18.3, objetivo_mensual: 6500, dias_laborables: 20 },
];

export const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTxUrEIVysJ9HgBXHOJnZ_MGPL2Huqw1b4h1zQB-SugNLB2TzTmx7CnQrPIAKKnHA/pub?gid=1177925024&single=true&output=csv";
export const QUALITY_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSdwJV5wBpgzMypIn6wyrj12zwFTMc4vVf_OGvLmD1C7XOmXaZQ6bEiTHOPNIiJ7HnXi1xyLiqHjCUN/pub?gid=2126173420&single=true&output=csv";
export const GEMINI_MODEL = "gemini-3-flash-preview";

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const YEARS = [2024, 2025, 2026];

export const AREAS: AreaConfig[] = [
  { 
    id: 'postventa', 
    name: 'Postventa', 
    icon: 'Wrench', 
    color: 'bg-blue-600', 
    description: 'Gestión de talleres, PPT y servicios diarios.' 
  },
  { 
    id: 'rrhh', 
    name: 'RRHH', 
    icon: 'Users', 
    color: 'bg-purple-600', 
    description: 'Control de personal, asistencia y nómina.' 
  },
  { 
    id: 'calidad', 
    name: 'Calidad', 
    icon: 'ClipboardCheck', 
    color: 'bg-green-600', 
    description: 'Auditorías, satisfacción y procesos.' 
  },
  { 
    id: 'ventas', 
    name: 'Ventas', 
    icon: 'BarChart', 
    color: 'bg-orange-500', 
    description: 'Objetivos de ventas, patentamientos y leads.' 
  }
];

export const DEFAULT_CONFIG = {
  sheetUrls: {
    postventa: DEFAULT_SHEET_URL,
    rrhh: '',
    calidad: QUALITY_SHEET_URL,
    ventas: ''
  } as Record<AreaType, string>,
  geminiApiKey: ''
};