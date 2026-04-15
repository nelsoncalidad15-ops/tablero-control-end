
import { AutoRecord, AreaConfig, AreaType, ReportTemplate } from './types';

// Mock data based on the user's provided Excel snippet
export const MOCK_DATA: AutoRecord[] = [
  { id: '1', mes: 'Enero', anio: 2026, sucursal: 'Santa Fe', ppt_diarios: 27.41, avance_ppt: 603, servicios_diarios: 17.86, servicios_totales: 393, objetivo_mensual: 480, dias_laborables: 22 },
  { id: '2', mes: 'Enero', anio: 2026, sucursal: 'Jujuy', ppt_diarios: 23.95, avance_ppt: 527, servicios_diarios: 13.73, servicios_totales: 302, objetivo_mensual: 400, dias_laborables: 22 },
  { id: '3', mes: 'Enero', anio: 2026, sucursal: 'Express', ppt_diarios: 8.09, avance_ppt: 178, servicios_diarios: 4.82, servicios_totales: 106, objetivo_mensual: 140, dias_laborables: 22 },
  { id: '4', mes: 'Enero', anio: 2026, sucursal: 'Taller Movil', ppt_diarios: 6.4, avance_ppt: 64, servicios_diarios: 5.4, servicios_totales: 54, objetivo_mensual: 60, dias_laborables: 10 },
  
  { id: '5', mes: 'Febrero', anio: 2026, sucursal: 'Santa Fe', ppt_diarios: 29.63, avance_ppt: 563, servicios_diarios: 17.84, servicios_totales: 339, objetivo_mensual: 480, dias_laborables: 19 },
  { id: '6', mes: 'Febrero', anio: 2026, sucursal: 'Jujuy', ppt_diarios: 24.68, avance_ppt: 469, servicios_diarios: 15.26, servicios_totales: 290, objetivo_mensual: 400, dias_laborables: 19 },
  { id: '7', mes: 'Febrero', anio: 2026, sucursal: 'Express', ppt_diarios: 7.26, avance_ppt: 138, servicios_diarios: 4.47, servicios_totales: 85, objetivo_mensual: 140, dias_laborables: 19 },
  { id: '8', mes: 'Febrero', anio: 2026, sucursal: 'Taller Movil', ppt_diarios: 4.15, avance_ppt: 54, servicios_diarios: 3.77, servicios_totales: 49, objetivo_mensual: 60, dias_laborables: 13 },
];

export const DEFAULT_SHEET_KEY = "postventa";
export const QUALITY_SHEET_KEY = "quality";
export const SALES_QUALITY_SHEET_KEY = "sales_quality";
export const SALES_CLAIMS_SHEET_KEY = "sales_claims";
export const INTERNAL_POSTVENTA_SHEET_KEY = "internal_postventa";
export const DETAILED_QUALITY_SHEET_KEY = "detailed_quality";
export const DETAILED_QUALITY_SALTA_SHEET_KEY = "detailed_quality_salta";
export const POSTVENTA_KPI_SHEET_KEY = "postventa_kpi";
export const POSTVENTA_BILLING_SHEET_KEY = "postventa_billing";
export const PCGC_SHEET_KEY = "pcgc";
export const CEM_OS_SHEET_KEY = "cem_os";
export const CEM_OS_SALTA_SHEET_KEY = "cem_os_salta";
export const ACTION_PLAN_SHEET_KEY = "action_plan";
export const ACTION_PLAN_SALES_SHEET_KEY = "action_plan_sales";
export const HR_GRADES_SHEET_KEY = "hr_grades";
export const HR_RELATORIO_SHEET_KEY = "hr_relatorio";
export const HR_CONTACTS_SHEET_KEY = "hr_contacts";
export const HR_PHASES_SHEET_KEY = "hr_phases";

export const GEMINI_MODEL = "gemini-3-flash-preview";

export const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export const YEARS = [2024, 2025, 2026];

export const BRANCHES = ["Salta", "Jujuy", "Express", "MOVIL", "Santa Fe", "Tartagal"];

export const BRANCH_COLORS = {
  "Salta": "#ef4444",
  "Jujuy": "#3b82f6",
  "Express": "#6366f1",
  "MOVIL": "#f59e0b",
  "Santa Fe": "#10b981",
  "Tartagal": "#ec4899",
  "TODAS": "#0f172a"
};

export const KPI_DEFS = [
  { id: 'lvs', name: 'LVS', target: 4.8, unit: '', direction: 'up' },
  { id: 'email_validos', name: 'Emails Válidos', target: 95, unit: '%', direction: 'up' },
  { id: 'tasa_respuesta', name: 'Tasa Respuesta', target: 30, unit: '%', direction: 'up' },
  { id: 'dac', name: 'DAC', target: 0.2, unit: '%', direction: 'down' },
  { id: 'contrato_mantenimiento', name: 'Contrato Mant.', target: 20, unit: 'un', direction: 'up' },
  { id: 'reporte_tecnico', name: 'Reporte Técnico', target: 48, unit: 'un', direction: 'up' },
  { id: 'reporte_garantia', name: 'Reporte Garantía', target: 48, unit: 'un', direction: 'up' },
  { id: 'ampliacion_trabajo', name: 'Ampliación Trab.', target: 50, unit: '%', direction: 'up' },
  { id: 'ppt_diario', name: 'PPT Diario', target: 26, unit: 'un', direction: 'up' },
  { id: 'conversion_ppt_serv', name: 'Conv. PPT/Serv', target: 60, unit: '%', direction: 'up' },
  { id: 'oudi_servicios', name: 'OUDI Servicios', target: 12, unit: '%', direction: 'up' },
  { id: 'grado_ocupacion', name: 'Grado Ocupación', target: 95, unit: '%', direction: 'up' },
  { id: 'productividad', name: 'Productividad', target: 97, unit: '%', direction: 'up' },
  { id: 'costos_controlables', name: 'Costos Contr.', target: 80, unit: '%', direction: 'down' },
  { id: 'costo_sueldos', name: 'Costo Sueldos', target: 60, unit: '%', direction: 'down' },
  { id: 'stock_muerto', name: 'Stock Muerto', target: 15, unit: '%', direction: 'down' },
  { id: 'meses_stock', name: 'Meses Stock', target: 3, unit: 'm', direction: 'down' },
  { id: 'cotizacion_seguros', name: 'Cotiz. Seguros', target: 10, unit: '%', direction: 'up' },
  { id: 'uodi_repuestos', name: 'UODI Repuestos', target: 7, unit: '%', direction: 'up' },
  { id: 'margen_bruto_primario', name: 'Margen Bruto', target: 23, unit: '%', direction: 'up' },
  { id: 'uodi_posventa', name: 'UODI Posventa', target: 7, unit: '%', direction: 'up' },
  { id: 'incentivo_calidad', name: 'Inc. Calidad', target: 100, unit: '%', direction: 'up' },
  { id: 'plan_incentivo_posventa', name: 'Plan Inc. Posv.', target: 100, unit: '%', direction: 'up' },
  { id: 'plan_incentivo_repuestos', name: 'Plan Inc. Rep.', target: 120, unit: '%', direction: 'up' },
  { id: 'uops_total', name: 'UOPS Total', target: 100, unit: '%', direction: 'up' },
];

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
    color: 'bg-[#001E50]', 
    description: 'Gestión de talento, capacitación y desempeño.' 
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

export const DEFAULT_REPORT_TEMPLATE: ReportTemplate = {
  ventas: {
    enabled: true,
    modules: [
      { id: 'kpis', label: 'Indicadores Principales (CEM)', enabled: true, size: 'full' },
      { id: 'process', label: 'Adherencia a Procesos', enabled: true, size: 'half' },
      { id: 'delivery', label: 'Experiencia de Entrega', enabled: true, size: 'half' },
      { id: 'claims', label: 'Gestión de Reclamos', enabled: true, size: 'full' },
    ]
  },
  postventa: {
    enabled: true,
    modules: [
      { id: 'kpis', label: 'Indicadores LVS', enabled: true, size: 'full' },
      { id: 'resolution', label: 'Resolución de Casos', enabled: true, size: 'half' },
      { id: 'claims', label: 'Motivos de Reclamo', enabled: true, size: 'half' },
    ]
  },
  globalComments: ''
};

export const DEFAULT_CONFIG = {
  sheetUrls: {
    postventa: DEFAULT_SHEET_KEY,
    rrhh: HR_GRADES_SHEET_KEY,
    calidad: QUALITY_SHEET_KEY,
    ventas: '',
    detailed_quality: DETAILED_QUALITY_SHEET_KEY,
    detailed_quality_salta: DETAILED_QUALITY_SALTA_SHEET_KEY,
    postventa_kpis: POSTVENTA_KPI_SHEET_KEY,
    postventa_billing: POSTVENTA_BILLING_SHEET_KEY,
    pcgc: PCGC_SHEET_KEY,
    cem_os: CEM_OS_SHEET_KEY,
    cem_os_salta: CEM_OS_SALTA_SHEET_KEY,
    sales_quality: SALES_QUALITY_SHEET_KEY,
    sales_claims: SALES_CLAIMS_SHEET_KEY,
    internal_postventa: INTERNAL_POSTVENTA_SHEET_KEY,
    action_plan: ACTION_PLAN_SHEET_KEY,
    action_plan_sales: ACTION_PLAN_SALES_SHEET_KEY,
    hr_relatorio: HR_RELATORIO_SHEET_KEY,
    hr_contacts: HR_CONTACTS_SHEET_KEY,
    hr_phases: HR_PHASES_SHEET_KEY
  } as Record<AreaType, string> & { 
    detailed_quality: string; 
    detailed_quality_salta: string; 
    postventa_kpis: string; 
    postventa_billing: string; 
    pcgc: string; 
    cem_os: string;
    cem_os_salta: string;
    sales_quality: string;
    sales_claims: string;
    internal_postventa: string;
    action_plan: string;
    action_plan_sales: string;
    hr_relatorio: string;
    hr_contacts: string;
    hr_phases: string;
  },
  geminiApiKey: '',
  reportTemplate: DEFAULT_REPORT_TEMPLATE
};
