export interface AutoRecord {
  id: string;
  fecha?: string;
  mes: string;
  anio: number;
  sucursal: string;
  ppt_diarios: number;
  avance_ppt: number;
  servicios_diarios: number;
  objetivo_mensual: number;
  dias_laborables: number;
  [key: string]: any; 
}

export interface QualityRecord {
  id: string;
  sucursal: string;
  mes: string;
  anio: number;
  sector: string; // "Sector Resp."
  motivo: string; // "Motivos de Reclamo"
  cliente: string;
  observacion: string; // "Reclamo / Observación"
  responsable: string; // "Responsable de Solución"
  estado: string; // "Estado de Reclamo"
  orden: string;
  resuelto?: string; // "Reclamo Resuelto? SI/ NO"
  observacion_resolucion?: string; // "Observacion de resolucion"
  [key: string]: any;
}

export interface DashboardMetrics {
  totalPPT: number;
  totalObjetivo: number;
  totalServicios: number;
  diasLaborables: { sucursal: string; dias: number }[];
  complianceRate: number; 
  trends: {
    mes: string;
    [key: string]: number | string; 
  }[];
}

export type AreaType = 'postventa' | 'rrhh' | 'calidad' | 'ventas';

export interface AreaConfig {
  id: AreaType;
  name: string;
  icon: string;
  color: string;
  description: string;
}

export interface AppConfig {
  sheetUrls: Record<AreaType, string>;
  geminiApiKey: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}