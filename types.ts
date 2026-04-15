
export interface AutoRecord {
  id: string;
  fecha?: string;
  mes: string;
  anio: number;
  sucursal: string;
  ppt_diarios: number;
  ppt_diarios_k?: number;
  avance_ppt: number;
  servicios_diarios: number;
  servicios_diarios_m?: number;
  servicios_totales: number; // New field for "Avance Servis"
  objetivo_mensual: number;
  dias_laborables: number;
  [key: string]: any; 
}

export interface QualityRecord {
  id: string;
  sucursal: string;
  mes: string;
  anio: number;
  sector: string; // "Sector Resp." (Column D)
  motivo: string; // "Motivos de Reclamo"
  cliente: string;
  observacion: string; // "Reclamo / Observación"
  responsable: string; // "Responsable de Solución"
  asesor?: string; // "Asesor asignado" (Column K)
  estado: string; // "Estado de Reclamo"
  orden: string;
  resuelto?: string; // "Reclamo Resuelto? SI/ NO"
  observacion_resolucion?: string; // "Observacion de resolucion"
  [key: string]: any;
}

export interface SalesClaimsRecord {
    id: string;
    nro_r: string; // Nro de R
    vin: string; // Número de VIN
    receptor: string; // Receptor
    fecha_reclamo: string; // Fecha Reclamo/ Queja
    fecha_finalizacion: string; // Fecha de finalización
    mes: string; // Mes de entrega
    tipo_venta: string; // Tipo de Venta
    cliente: string; // Cliente
    sucursal: string; // Sucursal
    reclamo: string; // Reclamo / Observación
    sector: string; // Sector Resp.
    responsable: string; // Responsable del Tratamiento
    identificacion_problema: string; // Identificacion del Problema
    analisis_causa: string; // Analisis de Causa
    accion_contencion: string; // Acción Contención
    accion_preventiva: string; // Acción Preventiva
    accion_efectiva: string; // Acción efectiva (1: si - 0: no)
    evidencia: string; // Evidencia de efectividad
    dias_demora: number; // Días de demora (Calculated or from sheet)
    estado: string; // Estado de Reclamo
    motivo: string; // Motivos de Reclamo
    [key: string]: any;
}

export interface SalesQualityRecord {
  id: string;
  mes: string;
  anio: number;
  sucursal: string;
  vendedor: string;
  modelo: string;
  cliente: string;
  vin: string; // New: Column E
  estado: string; // Column N (Contactado, Buzon, etc)
  tipo_venta: string; // New: Plan, Tradicional, etc.
  comentarios: string; // New field
  nps: number | null; // Changed to allow null
  
  // Contact Logic
  fecha_entrega: string; // New: Base for calculation
  fecha_limite_contacto: string; // Kept as optional fallback
  fecha_1_llamado: string;
  fecha_2_llamado: string;
  fecha_3_llamado: string;
  fecha_contacto_efectivo: string;
  fecha_recontacto: string;
  fecha_envio_wpp: string;
  fecha_respuesta_wpp: string;

  // CEM Scores (1-5)
  cem_asesoramiento: number | null;
  cem_organizacion: number | null;
  cem_trato: number | null;
  cem_general: number | null; // OS

  // Yes/No Questions
  prueba_manejo: string;
  ofrecimiento_financiacion: string;
  toma_usados: string;
  contacto_entrega: string; // CLE
  explicacion_tramites: number; // Changed to number for Radar chart
  estado_vehiculo: number; // 1-5
  plazo_entrega: number; // 1-5
  explicacion_entrega: number; // 1-5
  ofrecimiento_seguro: string;
  app_mi_vw: string;
  
  [key: string]: any;
}

export interface DetailedQualityRecord {
  id: string;
  sucursal?: string;
  mes: string;
  cod_id: string;
  fecha_servicio: string;
  vin: string;
  modelo: string;
  cliente: string;
  orden: string;
  asesor: string;
  q1_score: number | null;
  q1_comment: string;
  q2_score: number | null;
  q2_comment: string;
  q3_score: number | null;
  q3_comment: string;
  q4_score: number | null; // LVS
  q4_comment: string;
  q6_score: number | null; // Lavado
  q7_score: number | null; // Recomendación
  q8_val: string; // Visita Repetida
  comentario_cliente: string;
  estado_cliente: string;
  categorizacion: string;
  [key: string]: any;
}

export interface PCGCRecord {
  id: string;
  modulo: string;
  seccion: string;
  subseccion: string;
  sector: string;
  requerimiento: string;
  observaciones: string;
  metodo: string;
  criticidad: string;
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

export interface ReportModuleConfig {
    id: string;
    label: string;
    enabled: boolean;
    size: 'full' | 'half';
    customText?: string;
}

export interface ReportTemplate {
    ventas: {
        enabled: boolean;
        modules: ReportModuleConfig[];
    };
    postventa: {
        enabled: boolean;
        modules: ReportModuleConfig[];
    };
    globalComments?: string;
}

export interface PostventaKpiRecord {
  id: string;
  sucursal: string;
  mes: string;
  anio: number;
  lvs: number | null;
  email_validos: number | null;
  tasa_respuesta: number | null;
  dac: number | null;
  contrato_mantenimiento: number | null;
  reporte_tecnico: number | null;
  reporte_garantia: number | null;
  ampliacion_trabajo: number | null;
  ppt_diario: number | null;
  conversion_ppt_serv: number | null;
  oudi_servicios: number | null;
  costos_controlables: number | null;
  costo_sueldos: number | null;
  stock_muerto: number | null;
  meses_stock: number | null;
  cotizacion_seguros: number | null;
  uodi_repuestos: number | null;
  uodi_posventa: number | null;
  incentivo_calidad: number | null;
  plan_incentivo_posventa: number | null;
  plan_incentivo_repuestos: number | null;
  uops_total: number | null;
  [key: string]: any;
}

export interface BillingRecord {
  id: string;
  nro_mes: number;
  mes: string;
  sucursal: string;
  area: string;
  objetivo_mensual: number;
  avance_fecha: number;
  cumplimiento_fecha_pct: number;
  cumplimiento_cierre_pct: number;
  objetivo_diario: number;
  promedio_diario: number;
  desvio_fecha: number;
  dif_dias_operacion: number;
  anio: number;
  [key: string]: any;
}

export interface CemOsRecord {
  id: string;
  mes: string;
  zona: string;
  codigo: string;
  canal_ventas: string;
  chasis: string;
  entrega_final: string;
  entrega_reportada: string;
  vendedor: string;
  nro_cliente: string;
  cliente_nombre: string;
  cliente_apellido: string;
  cliente_dni: string;
  cliente_calle: string;
  cliente_ciudad: string;
  cliente_cp: string;
  cliente_estado: string;
  cliente_celular: string;
  cliente_tel_casa: string;
  cliente_tel_oficina: string;
  cliente_email: string;
  fecha_dominio: string;
  dominio: string;
  mail_encuesta_interna: string;
  cem_score: number | null;
  encuesta_interna_score: number | null;
  encuesta_temprana_score: number | null;
  estado_encuesta_interna: string;
  fecha_link_llega: string;
  fecha_link_caduca: string;
  estado_unidad: string;
  contactado: string;
  gestionado: string;
  comentario_interna: string;
  comentario_cem: string;
  [key: string]: any;
}

export interface InternalPostventaRecord {
  id: string;
  sucursal: string;
  tecnicos: string;
  asesor: string;
  operario: string;
  codigo: string;
  fecha_inicio: string;
  fecha_fin: string;
  mes: string;
  anio: number;
  servicio: string;
  dominio: string;
  telefono: string;
  email: string;
  auto: string;
  marca: string;
  chasis: string;
  created_at: string;
  estado: string;
  nombre_sucursal: string;
  cliente_nombre?: string;
  
  // Scores (1-5)
  servicio_prestado: number | null;
  trato_personal: number | null;
  organizacion: number | null;
  trabajo_taller: number | null;
  lavado: number | null;
  
  // Observations
  obs_servicio_prestado: string;
  obs_trato_personal: string;
  obs_organizacion: string;
  obs_trabajo_taller: string;
  obs_lavado: string;
  
  tipo_contacto: string;
  obs_tipo_contacto: string;
  observaciones: string;
  obs_observaciones: string;
  
  [key: string]: any;
}

export interface ActionPlanRecord {
  id: string;
  nro: string;
  mes: string;
  fecha_alta: string;
  provincia: string;
  caracter: string;
  sector: string;
  origen: string;
  norma: string;
  requisito: string;
  nombre_kpi: string;
  objetivo_kpi_cuantitativo: string;
  objetivo_kpi_cualitativo: string;
  situacion_actual_cuantitativo: string;
  situacion_actual_cualitativo: string;
  enviar_desvio: string;
  estado: string;
  causa_raiz: string;
  accion_inmediata: string;
  accion_correctiva: string;
  responsable: string;
  indicador_eficiencia: string;
  objetivo_indicador: string;
  fecha_inicio_est: string;
  duracion_est: string;
  inicio_real: string;
  finalizacion_real: string;
  duracion_real: string;
  estado_final: string;
  verificacion_eficacia: string;
  fecha_verificacion: string;
  requiere_modificar_riesgos: string;
  puede_ocurrir_otra_area: string;
  // Seguimiento mensual
  seguimiento: Record<string, string>;
  isIncomplete: boolean;
  isPlan: boolean;
}

export interface CourseGrade {
  id: string;
  unidad: string;
  colaborador: string;
  area: string;
  funcion: string;
  icf: number;
  courses: Record<string, number>;
  icfByFunction?: Record<string, number>;
  coursesByFunction?: Record<string, Record<string, number>>;
}

export interface RelatorioItem {
  id: string;
  curso: string;
  nombre: string;
  unidad: string;
  area?: string;
  fechaRegistro: string;
  referenciaMeses: string;
  clase: string;
  claseFecha?: string;
  claseHora?: string;
  modalidad?: string;
  linkCurso?: string;
}

export interface CoursePhase {
  curso: string;
  fase: string;
  modalidad: string;
}

export interface CollaboratorContact {
  nombre: string;
  telefono: string;
}

export interface AppConfig {
  sheetUrls: Record<AreaType, string> & { 
    detailed_quality?: string; 
    detailed_quality_salta?: string;
    postventa_kpis?: string;
    postventa_billing?: string;
    pcgc?: string;
    cem_os?: string;
    cem_os_salta?: string;
    sales_quality?: string;
    sales_claims?: string;
    internal_postventa?: string;
    action_plan?: string;
    action_plan_sales?: string;
    action_plan_form?: string;
    hr_relatorio?: string;
    hr_contacts?: string;
    hr_phases?: string;
  };
  geminiApiKey: string;
  reportTemplate?: ReportTemplate;
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface LoadingStatus {
  isLoading: boolean;
  error: string | null;
}
