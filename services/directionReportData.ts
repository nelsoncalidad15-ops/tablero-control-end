import { MONTHS, KPI_DEFS } from '../constants';
import {
  ActionPlanRecord,
  AppConfig,
  CemOsRecord,
  DetailedQualityRecord,
  InternalPostventaRecord,
  PCGCRecord,
  PostventaKpiRecord,
  QualityObjectiveScaleRecord,
  QualityObjectiveSummaryRecord,
  QualityRecord,
  SalesClaimsRecord,
  SalesQualityRecord,
  SatisfactionSurveyRecord,
} from '../types';
import {
  fetchActionPlanData,
  fetchCemOsData,
  fetchDetailedQualityData,
  fetchInternalPostventaData,
  fetchPCGCData,
  fetchPostventaKpiData,
  fetchQualityData,
  fetchQualityObjectivesData,
  fetchQualityObjectivesScalesData,
  fetchQualityObjectivesSummaryData,
  fetchSalesClaimsData,
  fetchSalesQualityData,
  fetchSatisfactionSurveyData,
} from './dataService';
import { ClubSsiRecord, splitClubCategories } from './clubSsi';
import {
  AuditEntryData,
  BranchIndicatorSnapshot,
  BranchSelection,
  ClosingPriorityItem,
  ComplianceStatus,
  ComputedDirectionReportData,
  DataSourceStatus,
  DirectionModuleId,
  DirectionReportDocument,
  EvolutionPoint,
  IncentiveEntryData,
  IntegratedActionBlock,
  IntegratedActionItem,
  ModuleCategoryKey,
  ModuleDefinition,
  QuarterCode,
  RawDirectionDataSources,
  ReportPage,
  ReportPeriodType,
  SurveyDisplaySubOptions,
  SurveyStudyComputed,
} from '../types/directionReport';

export const QUARTER_MONTHS: Record<QuarterCode, string[]> = {
  Q1: ['Enero', 'Febrero', 'Marzo'],
  Q2: ['Abril', 'Mayo', 'Junio'],
  Q3: ['Julio', 'Agosto', 'Septiembre'],
  Q4: ['Octubre', 'Noviembre', 'Diciembre'],
};

export const QUARTER_LABELS: Record<QuarterCode, string> = {
  Q1: '1° Trimestre (Ene – Mar)',
  Q2: '2° Trimestre (Abr – Jun)',
  Q3: '3° Trimestre (Jul – Sep)',
  Q4: '4° Trimestre (Oct – Dic)',
};

export const MODULE_CATEGORIES: Array<{
  key: ModuleCategoryKey;
  letter: string;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'A_indicadores',
    letter: 'A',
    title: 'Indicadores Principales',
    subtitle: 'OS de marca, LVS, Lavado, evolución y gestión de reclamos',
  },
  {
    key: 'B_encuestas',
    letter: 'B',
    title: 'Encuestas y Estudios',
    subtitle: 'Estudios diferenciados SSI, Club SSI y CSI (sin mezclar fuentes)',
  },
  {
    key: 'C_auditorias',
    letter: 'C',
    title: 'Auditorías y Cumplimiento',
    subtitle: 'PCGC Ventas, ISO 9001, GAMS, desvíos mandatorios y capítulos',
  },
  {
    key: 'D_incentivos',
    letter: 'D',
    title: 'Incentivos Comerciales y Postventa',
    subtitle: 'Escalas vigentes, penalizaciones, bonus e importe estimado',
  },
  {
    key: 'E_gestion_calidad',
    letter: 'E',
    title: 'Gestión de Calidad y Cierre Directivo',
    subtitle: 'Planes de acción integrados en cada indicador y prioridades de cierre',
  },
  {
    key: 'F_personalizado',
    letter: 'F',
    title: 'Contenido Personalizado y Evidencias',
    subtitle: 'Fotografías, capturas de auditoría, gráficos y conclusiones',
  },
];

export const DIRECTION_MODULES: ModuleDefinition[] = [
  // A. Indicadores principales
  {
    id: 'ventas_os',
    category: 'A_indicadores',
    label: 'Ventas: OS de Marca (CEM)',
    shortLabel: 'OS Ventas',
    description: 'Satisfacción general CEM OS, patentados, declarados, tasa de respuesta, evolución y plan de acción integrado.',
    defaultSourceType: 'available',
    suggestedMonthly: true,
    suggestedQuarterly: true,
    estimatedPages: 1,
  },
  {
    id: 'postventa_lvs',
    category: 'A_indicadores',
    label: 'Postventa: LVS y Calidad de Servicio',
    shortLabel: 'LVS Postventa',
    description: 'Indicador LVS (Q4), Trato personal (Q1), Organización (Q2), Calidad reparación (Q3) y plan de acción integrado.',
    defaultSourceType: 'available',
    suggestedMonthly: true,
    suggestedQuarterly: true,
    estimatedPages: 1,
  },
  {
    id: 'lavado',
    category: 'A_indicadores',
    label: 'Calidad de Lavado y Entrega',
    shortLabel: 'Lavado',
    description: 'Desempeño de lavado en CEM Postventa (Q6) y Encuesta Interna, comparativa por sucursal y acciones correctivas.',
    defaultSourceType: 'available',
    suggestedMonthly: true,
    suggestedQuarterly: false,
    estimatedPages: 1,
  },
  {
    id: 'cumplimiento_objetivos',
    category: 'A_indicadores',
    label: 'Cumplimiento de Objetivos de Calidad',
    shortLabel: 'Cumplimiento',
    description: 'Matriz ejecutiva de resultados frente a objetivos vigentes de Ventas y Postventa.',
    defaultSourceType: 'available',
    suggestedMonthly: true,
    suggestedQuarterly: true,
    estimatedPages: 1,
  },
  {
    id: 'evolucion_indicadores',
    category: 'A_indicadores',
    label: 'Evolución Comparativa de Indicadores',
    shortLabel: 'Evolución',
    description: 'Tendencias históricas y comparativa Jujuy (3059) vs. Salta (3087) a lo largo del año.',
    defaultSourceType: 'available',
    suggestedMonthly: false,
    suggestedQuarterly: true,
    estimatedPages: 1,
  },
  {
    id: 'reclamos_ventas',
    category: 'A_indicadores',
    label: 'Reclamos de Ventas',
    shortLabel: 'Reclamos Ventas',
    description: 'Volumen de reclamos comerciales, casos pendientes, motivos principales y acciones correctivas.',
    defaultSourceType: 'available',
    suggestedMonthly: true,
    suggestedQuarterly: true,
    estimatedPages: 1,
  },
  {
    id: 'reclamos_postventa',
    category: 'A_indicadores',
    label: 'Reclamos de Postventa',
    shortLabel: 'Reclamos Postventa',
    description: 'Reclamos de taller, OR únicas afectadas, tasa de resolución, ranking de motivos y plan de acción.',
    defaultSourceType: 'available',
    suggestedMonthly: true,
    suggestedQuarterly: true,
    estimatedPages: 1,
  },
  // B. Encuestas y estudios
  {
    id: 'encuestas_ssi',
    category: 'B_encuestas',
    label: 'Encuestas SSI (Estudio Ventas)',
    shortLabel: 'Estudio SSI',
    description: 'Encuestas válidas, T2B, Satisfacción general, Recomendación, brechas vs. Media de Mercado / Top 5 y causas.',
    defaultSourceType: 'available',
    suggestedMonthly: false,
    suggestedQuarterly: true,
    estimatedPages: 1,
  },
  {
    id: 'club_ssi',
    category: 'B_encuestas',
    label: 'Club SSI (Seguimiento Específico)',
    shortLabel: 'Club SSI',
    description: 'Módulo diferenciado de seguimiento Club SSI, categorización de hallazgos y acciones específicas.',
    defaultSourceType: 'available',
    suggestedMonthly: false,
    suggestedQuarterly: false,
    estimatedPages: 1,
  },
  {
    id: 'encuestas_csi',
    category: 'B_encuestas',
    label: 'Encuestas CSI (Estudio Postventa)',
    shortLabel: 'Estudio CSI',
    description: 'Módulo diferenciado CSI Postventa: T2B, Satisfacción, Recomendación, referencias de mercado y desvíos.',
    defaultSourceType: 'available',
    suggestedMonthly: false,
    suggestedQuarterly: false,
    estimatedPages: 1,
  },
  // C. Auditorías y cumplimiento
  {
    id: 'pcgc_ventas',
    category: 'C_auditorias',
    label: 'Auditoría PCGC (Ventas / Postventa)',
    shortLabel: 'PCGC',
    description: 'Estado de cumplimiento PCGC, resultados por capítulos, desvíos mandatorios y acciones correctivas.',
    defaultSourceType: 'manual',
    suggestedMonthly: false,
    suggestedQuarterly: true,
    estimatedPages: 1,
  },
  {
    id: 'auditoria_iso',
    category: 'C_auditorias',
    label: 'Auditoría ISO 9001',
    shortLabel: 'ISO 9001',
    description: 'Resultados de auditoría del Sistema de Gestión de Calidad ISO 9001, hallazgos y seguimiento.',
    defaultSourceType: 'manual',
    suggestedMonthly: false,
    suggestedQuarterly: false,
    estimatedPages: 1,
  },
  {
    id: 'auditoria_gams',
    category: 'C_auditorias',
    label: 'Auditoría GAMS / Garantías',
    shortLabel: 'GAMS',
    description: 'Evaluación de auditoría GAMS, desvíos detectados y plan de acción correctivo.',
    defaultSourceType: 'manual',
    suggestedMonthly: false,
    suggestedQuarterly: false,
    estimatedPages: 1,
  },
  // D. Incentivos
  {
    id: 'incentivos_ventas',
    category: 'D_incentivos',
    label: 'Resumen de Incentivos de Ventas',
    shortLabel: 'Incentivos Ventas',
    description: 'Escalas de cobro, penalizaciones, bonus e importe estimado para el área comercial.',
    defaultSourceType: 'manual',
    suggestedMonthly: false,
    suggestedQuarterly: true,
    estimatedPages: 1,
  },
  {
    id: 'incentivos_postventa',
    category: 'D_incentivos',
    label: 'Resumen de Incentivos de Postventa',
    shortLabel: 'Incentivos Postventa',
    description: 'Escalas de cobro, penalizaciones, bonus e importe estimado para Postventa.',
    defaultSourceType: 'manual',
    suggestedMonthly: false,
    suggestedQuarterly: true,
    estimatedPages: 1,
  },
  // E. Gestión de Calidad
  {
    id: 'planes_accion_integrados',
    category: 'E_gestion_calidad',
    label: 'Planes de Acción Integrados por Indicador',
    shortLabel: 'Planes Integrados',
    description: 'Activa el bloque automático INDICADOR → RESULTADO → DESVÍO → CAUSA → PLAN DE ACCIÓN debajo de cada KPI desviado.',
    defaultSourceType: 'available',
    suggestedMonthly: true,
    suggestedQuarterly: true,
    estimatedPages: 0, // Integrated directly inside indicator pages
  },
  {
    id: 'proximos_pasos',
    category: 'E_gestion_calidad',
    label: 'Cierre Ejecutivo: 3 Prioridades y Próximos Pasos',
    shortLabel: 'Próximos Pasos',
    description: 'Página final de síntesis con las 3 prioridades clave que requieren seguimiento o decisiones de Dirección.',
    defaultSourceType: 'available',
    suggestedMonthly: true,
    suggestedQuarterly: true,
    estimatedPages: 1,
  },
  // F. Contenido personalizado
  {
    id: 'evidencias_fotograficas',
    category: 'F_personalizado',
    label: 'Fotografías, Capturas y Evidencias',
    shortLabel: 'Fotografías',
    description: 'Lámina de evidencias visuales con diseños predefinidos (1, 2 o 4 fotos, o captura con análisis lateral).',
    defaultSourceType: 'manual',
    suggestedMonthly: false,
    suggestedQuarterly: false,
    estimatedPages: 1,
  },
  {
    id: 'conclusiones_ejecutivas',
    category: 'F_personalizado',
    label: 'Análisis y Causas (Doble Columna)',
    shortLabel: 'Análisis y Causas',
    description: 'Página ejecutiva de hallazgos estratégicos, causas raíz, impacto operativo y propuestas.',
    defaultSourceType: 'manual',
    suggestedMonthly: false,
    suggestedQuarterly: false,
    estimatedPages: 1,
  },
  {
    id: 'pagina_personalizada',
    category: 'F_personalizado',
    label: 'Página Personalizada con Gráfico / Tarjetas',
    shortLabel: 'Personalizada',
    description: 'Lámina flexible para incorporar indicadores adicionales, gráficos a medida o información complementaria.',
    defaultSourceType: 'manual',
    suggestedMonthly: false,
    suggestedQuarterly: false,
    estimatedPages: 1,
  },
];

export const DEFAULT_SURVEY_SUB_OPTIONS: SurveyDisplaySubOptions = {
  showGeneralSatisfaction: true,
  showRecommendation: true,
  showMarketComparison: true,
  showTop5Comparison: true,
  showDissatisfactionReasons: true,
};

export function getSuggestedModules(
  periodType: ReportPeriodType,
  rawSources?: RawDirectionDataSources | null,
  year?: number,
  quarter?: QuarterCode
): DirectionModuleId[] {
  if (periodType === 'monthly') {
    return [
      'ventas_os',
      'postventa_lvs',
      'lavado',
      'cumplimiento_objetivos',
      'reclamos_ventas',
      'reclamos_postventa',
      'planes_accion_integrados',
      'proximos_pasos',
    ];
  }

  const baseQuarterly: DirectionModuleId[] = [
    'ventas_os',
    'postventa_lvs',
    'cumplimiento_objetivos',
    'evolucion_indicadores',
    'reclamos_ventas',
    'reclamos_postventa',
    'incentivos_ventas',
    'incentivos_postventa',
    'planes_accion_integrados',
    'proximos_pasos',
  ];

  // Sugerir SSI y auditorías cuando existan datos del período
  if (!rawSources || (rawSources.ssiSurveys && rawSources.ssiSurveys.length > 0)) {
    baseQuarterly.push('encuestas_ssi');
  }
  if (!rawSources || (rawSources.pcgcChecklist && rawSources.pcgcChecklist.length > 0)) {
    baseQuarterly.push('pcgc_ventas');
  }

  return baseQuarterly;
}

export function estimatePageCount(
  enabledModules: DirectionModuleId[],
  branchSelection: BranchSelection
): { minPages: number; maxPages: number; label: string } {
  // Always includes Cover (1) + Executive Summary (1)
  let base = 2;
  for (const modId of enabledModules) {
    const def = DIRECTION_MODULES.find(m => m.id === modId);
    if (def) {
      base += def.estimatedPages;
    }
  }
  if (branchSelection === 'BOTH' && !enabledModules.includes('evolucion_indicadores')) {
    base += 1; // Comparative Jujuy / Salta page
  }
  const minPages = Math.max(3, base);
  const maxPages = minPages + (enabledModules.includes('planes_accion_integrados') ? 1 : 0);
  return {
    minPages,
    maxPages,
    label: minPages === maxPages ? `${minPages} páginas A4` : `${minPages} a ${maxPages} páginas A4`,
  };
}

// --- Helpers for normalizing and filtering ---

export function normalizeBranchCode(raw: unknown): 'JUJUY' | 'SALTA' | 'OTHER' {
  const s = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
  if (s.includes('JUJUY') || s.includes('3059') || s === 'JJY') return 'JUJUY';
  if (s.includes('SALTA') || s.includes('3087') || s.includes('3089') || s === 'SLA') return 'SALTA';
  return 'OTHER';
}

function isValidScore(val: unknown, min = 1, max = 5): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= min && val <= max;
}

function avgValid(values: Array<number | null | undefined>, min = 1, max = 5): { avg: number | null; count: number } {
  const valid = values.filter((v): v is number => isValidScore(v, min, max));
  if (valid.length === 0) return { avg: null, count: 0 };
  const sum = valid.reduce((acc, item) => acc + item, 0);
  return {
    avg: Number((sum / valid.length).toFixed(2)),
    count: valid.length,
  };
}

function isValidDateText(val: unknown): boolean {
  if (!val) return false;
  const s = String(val).trim();
  if (!s) return false;
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(s)) return true;
  if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}/.test(s)) return true;
  return !Number.isNaN(Date.parse(s));
}

function buildTopReasons(rawReasons: Array<string | undefined | null>, limit = 5): Array<{ name: string; value: number }> {
  const counts = new Map<string, { name: string; value: number }>();
  const ignored = new Set(['sin motivo', 'sin motivos', '-', '0', 'n/a', 'ninguno', 'sin categorizar', 'sin categoria']);

  rawReasons.forEach(raw => {
    String(raw || '')
      .split(/[,;\n\r]+/)
      .map(part => part.trim())
      .filter(Boolean)
      .forEach(part => {
        const key = part
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();
        if (!key || ignored.has(key)) return;
        const current = counts.get(key) || {
          name: part.charAt(0).toUpperCase() + part.slice(1),
          value: 0,
        };
        current.value += 1;
        counts.set(key, current);
      });
  });

  return Array.from(counts.values())
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'es'))
    .slice(0, limit);
}

export function evaluateCompliance(
  actual: number | null,
  target: number | null,
  direction: 'up' | 'down' = 'up'
): ComplianceStatus {
  if (actual === null || target === null || !Number.isFinite(actual) || !Number.isFinite(target)) {
    return 'pending_evaluation';
  }
  if (direction === 'up') {
    return actual + 0.0001 >= target ? 'compliant' : 'deviated';
  }
  return actual - 0.0001 <= target ? 'compliant' : 'deviated';
}

export function formatMetricAr(val: number | null | undefined, decimals = 2, suffix = ''): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return 'Sin datos';
  return `${val.toLocaleString('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

// --- Fetch All Data Sources Safely ---

export async function loadAllDirectionReportSources(config: AppConfig): Promise<RawDirectionDataSources> {
  const tasks: Array<{ label: string; run: () => Promise<any> }> = [
    { label: 'CEM OS Jujuy', run: () => fetchCemOsData(config.sheetUrls.cem_os || 'cem_os') },
    { label: 'CEM OS Salta', run: () => fetchCemOsData(config.sheetUrls.cem_os_salta || 'cem_os_salta') },
    { label: 'CEM Postventa Jujuy', run: () => fetchDetailedQualityData(config.sheetUrls.detailed_quality || 'detailed_quality') },
    { label: 'CEM Postventa Salta', run: () => fetchDetailedQualityData(config.sheetUrls.detailed_quality_salta || 'detailed_quality_salta') },
    { label: 'Reclamos Postventa', run: () => fetchQualityData(config.sheetUrls.calidad || 'quality') },
    { label: 'Reclamos Ventas', run: () => fetchSalesClaimsData(config.sheetUrls.sales_claims || 'sales_claims') },
    { label: 'Encuesta Interna Ventas', run: () => fetchSalesQualityData(config.sheetUrls.sales_quality || 'sales_quality') },
    { label: 'Encuesta Interna Postventa', run: () => fetchInternalPostventaData(config.sheetUrls.internal_postventa || 'internal_postventa') },
    { label: 'KPIs Postventa', run: () => fetchPostventaKpiData(config.sheetUrls.postventa_kpis || 'postventa_kpi') },
    { label: 'Plan de Acción Postventa', run: () => fetchActionPlanData(config.sheetUrls.action_plan || 'action_plan') },
    { label: 'Plan de Acción Ventas', run: () => fetchActionPlanData(config.sheetUrls.action_plan_sales || 'action_plan_sales') },
    { label: 'PCGC Checklist', run: () => fetchPCGCData(config.sheetUrls.pcgc || 'pcgc') },
    { label: 'Objetivos Resumen', run: () => fetchQualityObjectivesSummaryData(config.sheetUrls.quality_objectives_summary || 'quality_objectives_summary') },
    { label: 'Objetivos Escalas', run: () => fetchQualityObjectivesScalesData(config.sheetUrls.quality_objectives_scales || 'quality_objectives_scales') },
    { label: 'Encuestas SSI', run: () => fetchSatisfactionSurveyData(config.sheetUrls.ssi_surveys || 'ssi_surveys') },
    { label: 'Encuestas CSI', run: () => fetchSatisfactionSurveyData(config.sheetUrls.csi_surveys || 'csi_surveys') },
    { label: 'Objetivos Legacy', run: () => fetchQualityObjectivesData(config.sheetUrls.quality_objectives || 'quality_objectives') },
  ];

  const results: PromiseSettledResult<any>[] = new Array(tasks.length);
  // Load in batches of 4 to avoid overwhelming Render Free proxy
  for (let i = 0; i < tasks.length; i += 4) {
    const slice = tasks.slice(i, i + 4);
    const settled = await Promise.allSettled(slice.map(t => t.run()));
    settled.forEach((res, idx) => {
      results[i + idx] = res;
    });
  }

  const failedSources: string[] = [];
  const pick = <T,>(index: number): T[] => {
    const res = results[index];
    if (res && res.status === 'fulfilled' && Array.isArray(res.value)) {
      return res.value as T[];
    }
    if (res && res.status === 'rejected') {
      failedSources.push(tasks[index].label);
    }
    return [];
  };

  const cemJ = pick<CemOsRecord>(0).map(r => ({ ...r, sucursal: 'JUJUY' }));
  const cemS = pick<CemOsRecord>(1).map(r => ({ ...r, sucursal: 'SALTA' }));
  const dqJ = pick<DetailedQualityRecord>(2).map(r => ({ ...r, sucursal: 'JUJUY' }));
  const dqS = pick<DetailedQualityRecord>(3).map(r => ({ ...r, sucursal: 'SALTA' }));
  const qualityClaims = pick<QualityRecord>(4);
  const salesClaims = pick<SalesClaimsRecord>(5);
  const salesQuality = pick<SalesQualityRecord>(6);
  const internalPostventa = pick<InternalPostventaRecord>(7);
  const postventaKpis = pick<PostventaKpiRecord>(8);
  const apPv = pick<ActionPlanRecord>(9);
  const apSales = pick<ActionPlanRecord>(10);

  // Deduplicate action plans if both keys point to same sheet
  const seenPlanKeys = new Set<string>();
  const actionPlans: ActionPlanRecord[] = [];
  [...apPv, ...apSales].forEach(plan => {
    const key = `${plan.nro}-${plan.mes}-${plan.nombre_kpi}-${plan.provincia}`;
    if (!seenPlanKeys.has(key)) {
      seenPlanKeys.add(key);
      actionPlans.push(plan);
    }
  });

  const pcgcChecklist = pick<PCGCRecord>(11);
  let objectivesSummary = pick<QualityObjectiveSummaryRecord>(12);
  const objectivesScales = pick<QualityObjectiveScaleRecord>(13);
  const ssiSurveys = pick<SatisfactionSurveyRecord>(14);
  const csiSurveys = pick<SatisfactionSurveyRecord>(15);
  const legacyObjectives = pick<any>(16);

  if (objectivesSummary.length === 0 && legacyObjectives.length > 0) {
    objectivesSummary = legacyObjectives
      .filter((r: any) => r.tipo_registro !== 'escala')
      .map((r: any, idx: number) => ({
        id: `leg-${idx}`,
        area: r.area || '',
        indicador: r.indicador || '',
        periodo: r.periodo || '',
        anio: r.anio || 2026,
        vigencia_desde: r.vigencia_desde || '',
        vigencia_hasta: r.vigencia_hasta || '',
        tipo_input: 'numero',
        tipo_resultado: r.impacto_tipo || 'requisito',
        tipo_objetivo: 'requisito',
        objetivo_texto: r.requisito_mostrar || '',
        objetivo_valor: r.desde ?? r.hasta ?? null,
        unidad: '',
        orden: idx + 1,
        tiene_escala: true,
        tiene_bonus: r.tipo_registro === 'bonus',
        activa: true,
      }));
  }

  // Build ClubSsiRecord list from ssiSurveys that have categorizations/comments for Club SSI follow-up
  const clubSsiRecords: ClubSsiRecord[] = ssiSurveys.map((row, idx) => ({
    id: idx + 1,
    comment: row.motivo_calificacion || '',
    categories: splitClubCategories(row.categorizacion || ''),
    branch: normalizeBranchCode(row.provincia || row.ce),
    advisor: row.nombre || 'Sin asesor',
    year: row.anio ? String(row.anio) : '',
    semester: row.semestre || '',
    wave: row.ola || '',
    ce: row.ce || '',
    channel: row.canal_venta || '',
    model: row.modelo || '',
    saleDate: row.fecha_venta || '',
    satisfaction: row.satisfaccion_general,
    recommendation: row.recomendacion,
  }));

  return {
    cemOs: [...cemJ, ...cemS],
    detailedQuality: [...dqJ, ...dqS],
    qualityClaims,
    salesClaims,
    salesQuality,
    internalPostventa,
    postventaKpis,
    actionPlans,
    pcgcChecklist,
    objectivesSummary,
    objectivesScales,
    ssiSurveys,
    csiSurveys,
    clubSsiRecords,
    failedSources,
    loadedAt: new Date().toISOString(),
  };
}

// --- Resolve Active Target for an Indicator ---

function resolveIndicatorTarget(
  objectives: QualityObjectiveSummaryRecord[],
  indicatorHints: string[],
  fallbackTarget: number
): number {
  const normalizedHints = indicatorHints.map(h => h.toLowerCase());
  const match = objectives.find(obj => {
    const ind = (obj.indicador || '').toLowerCase();
    return obj.activa !== false && normalizedHints.some(h => ind.includes(h)) && obj.objetivo_valor !== null;
  });
  if (match && typeof match.objetivo_valor === 'number' && match.objetivo_valor > 0) {
    // If stored as percentage or 1-5 scale
    return match.objetivo_valor;
  }
  return fallbackTarget;
}

function recordMatchesYear(row: any, targetYear: number): boolean {
  const rowYear = Number(row?.anio);
  if (!rowYear || !Number.isFinite(rowYear)) {
    // Some sheets (like CEM OS or compact DetailedQuality) only contain current year rows without explicit year column
    return true;
  }
  return rowYear === targetYear;
}

// --- Compute Consolidated Metrics for Month or Quarter ---

export function computeDirectionReportData(
  raw: RawDirectionDataSources,
  params: {
    periodType: ReportPeriodType;
    year: number;
    month: string;
    quarter: QuarterCode;
    branchSelection: BranchSelection;
  }
): ComputedDirectionReportData {
  const { periodType, year, month, quarter } = params;
  const monthsInPeriod = periodType === 'monthly' ? [month] : QUARTER_MONTHS[quarter];
  const periodLabel =
    periodType === 'monthly'
      ? `${month} ${year}`
      : `${QUARTER_LABELS[quarter]} ${year}`;
  const periodShortLabel =
    periodType === 'monthly' ? `${month.slice(0, 3)} ${year}` : `${quarter} ${year}`;

  // Resolve official targets from quality_objectives_summary or standard VW definitions
  const osTarget = resolveIndicatorTarget(raw.objectivesSummary, ['cem', 'os'], 4.6);
  const lvsDef = KPI_DEFS.find(k => k.id === 'lvs');
  const lvsTarget = resolveIndicatorTarget(raw.objectivesSummary, ['lvs'], lvsDef?.target ?? 4.8);
  const lavadoTarget = resolveIndicatorTarget(raw.objectivesSummary, ['lavado'], 4.5);
  const ssiTargetScore = 8.8;
  const csiTargetScore = 8.8;

  // Check which months in the period actually have data in main sheets
  const monthsWithData = monthsInPeriod.filter(m => {
    const hasCem = raw.cemOs.some(r => r.mes === m && recordMatchesYear(r, year));
    const hasLvs = raw.detailedQuality.some(r => r.mes === m && recordMatchesYear(r, year));
    const hasClaims =
      raw.qualityClaims.some(r => r.mes === m && recordMatchesYear(r, year)) ||
      raw.salesClaims.some(r => r.mes === m && recordMatchesYear(r, year));
    return hasCem || hasLvs || hasClaims;
  });

  // Determine whether the period is Closed or Partial
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const lastPeriodMonthIdx = MONTHS.indexOf(monthsInPeriod[monthsInPeriod.length - 1]);

  let isClosedPeriod = true;
  if (year > currentYear) {
    isClosedPeriod = false;
  } else if (year === currentYear && lastPeriodMonthIdx >= currentMonthIdx) {
    isClosedPeriod = false;
  } else if (periodType === 'quarterly' && monthsWithData.length < 3 && monthsWithData.length > 0) {
    isClosedPeriod = false;
  }

  const periodClosureStatusLabel = isClosedPeriod
    ? 'Período Cerrado Oficial'
    : monthsWithData.length === 0
      ? 'Sin Registros Consolidados'
      : `Período Parcial (${monthsWithData.length}/${monthsInPeriod.length} meses con registros)`;

  const periodClosureDetail = isClosedPeriod
    ? `El período ${periodLabel} cuenta con cierre operativo consolidado (corte habitual entre los días 20 y 22 del mes siguiente).`
    : `Atención: ${periodLabel} contiene información preliminar o parcial (${monthsWithData.join(', ') || 'sin meses cerrados'}). Los indicadores de marca distinguen fecha de extracción vs. cierre definitivo del estudio.`;

  // Helper to compute BranchIndicatorSnapshot using individual valid observations across monthsInPeriod
  const computeBranchSnapshot = (targetBranch: 'JUJUY' | 'SALTA' | 'CONSOLIDADO'): BranchIndicatorSnapshot => {
    const matchesBranch = (row: any) => {
      const code = normalizeBranchCode(
        row?.sucursal || row?.nombre_sucursal || row?.concesionario || row?.provincia || row?.codigo || row?.sector
      );
      if (targetBranch === 'CONSOLIDADO') {
        return code === 'JUJUY' || code === 'SALTA' || !row?.sucursal;
      }
      return code === targetBranch;
    };

    const inPeriod = (row: any) => monthsInPeriod.includes(row?.mes) && recordMatchesYear(row, year);

    // 1. CEM OS (Ventas de Marca)
    const cemRows = raw.cemOs.filter(r => inPeriod(r) && matchesBranch(r));
    const uniqueChasis = (rows: CemOsRecord[]) =>
      new Set(rows.map((r, i) => (r.chasis || r.dominio || r.id || `row-${i}`).trim()).filter(Boolean)).size;

    const osPatentedCount = uniqueChasis(cemRows);
    const osDeclaredCount = uniqueChasis(cemRows.filter(r => isValidDateText(r.fecha_link_llega)));
    const respondedRows = cemRows.filter(r => isValidScore(r.cem_score, 1, 5));
    const osValidCount = uniqueChasis(respondedRows);
    const osScoreCalc = avgValid(cemRows.map(r => r.cem_score), 1, 5);
    const osResponseConversionPct =
      osDeclaredCount > 0 ? Number(((osValidCount / osDeclaredCount) * 100).toFixed(1)) : null;
    const osCompliance = evaluateCompliance(osScoreCalc.avg, osTarget, 'up');

    // 2. Encuesta Interna Ventas
    const sqRows = raw.salesQuality.filter(r => inPeriod(r) && matchesBranch(r));
    const intOs = avgValid(sqRows.map(r => r.cem_general), 1, 5);
    const intTrato = avgValid(sqRows.map(r => r.cem_trato), 1, 5);
    const intOrg = avgValid(sqRows.map(r => r.cem_organizacion), 1, 5);
    const intAses = avgValid(sqRows.map(r => r.cem_asesoramiento), 1, 5);
    const intVehiculo = avgValid(sqRows.map(r => r.estado_vehiculo), 1, 5);

    // 3. Postventa LVS (CEM DetailedQuality)
    let dqRows = raw.detailedQuality.filter(r => inPeriod(r) && matchesBranch(r));
    // Fallback for compact Salta format without month tag when only Salta has 'Unknown' month
    if (dqRows.length === 0 && targetBranch !== 'JUJUY') {
      const saltaUntagged = raw.detailedQuality.filter(
        r => r.mes === 'Unknown' && normalizeBranchCode(r.sucursal) === 'SALTA' && matchesBranch(r)
      );
      if (saltaUntagged.length > 0 && year === 2026) {
        dqRows = saltaUntagged;
      }
    }

    const lvsCalc = avgValid(dqRows.map(r => r.q4_score), 1, 5);
    const q1Calc = avgValid(dqRows.map(r => r.q1_score), 1, 5);
    const q2Calc = avgValid(dqRows.map(r => r.q2_score), 1, 5);
    const q3Calc = avgValid(dqRows.map(r => r.q3_score), 1, 5);
    const q6Calc = avgValid(dqRows.map(r => r.q6_score), 1, 5);
    const q7Calc = avgValid(dqRows.map(r => r.q7_score), 1, 5);
    const lvsCompliance = evaluateCompliance(lvsCalc.avg, lvsTarget, 'up');

    // 4. Encuesta Interna Postventa
    const ipRows = raw.internalPostventa.filter(r => inPeriod(r) && matchesBranch(r));
    const ipServ = avgValid(ipRows.map(r => r.servicio_prestado), 1, 5);
    const ipTrato = avgValid(ipRows.map(r => r.trato_personal), 1, 5);
    const ipOrg = avgValid(ipRows.map(r => r.organizacion), 1, 5);
    const ipTaller = avgValid(ipRows.map(r => r.trabajo_taller), 1, 5);
    const ipLavado = avgValid(ipRows.map(r => r.lavado), 1, 5);
    const ipValidCount = ipRows.filter(r =>
      [r.servicio_prestado, r.trato_personal, r.organizacion, r.trabajo_taller, r.lavado].some(v =>
        isValidScore(v, 1, 5)
      )
    ).length;

    // Lavado evaluation (uses CEM Q6 if available, else Internal Postventa Lavado)
    const primaryLavadoScore = q6Calc.avg ?? ipLavado.avg;
    const lavadoCompliance = evaluateCompliance(primaryLavadoScore, lavadoTarget, 'up');

    // 5. Reclamos Ventas
    const scRows = raw.salesClaims.filter(r => inPeriod(r) && matchesBranch(r));
    const salesClaimsTotal = scRows.length;
    const salesClaimsPending = scRows.filter(
      r =>
        String(r.estado || '').toLowerCase().includes('abiert') ||
        String(r.estado || '').toLowerCase().includes('pend') ||
        (!r.identificacion_problema && !r.fecha_finalizacion)
    ).length;
    const salesClaimsResolved = Math.max(0, salesClaimsTotal - salesClaimsPending);
    const delayValues = scRows
      .map(r => r.dias_demora)
      .filter((d): d is number => typeof d === 'number' && Number.isFinite(d) && d >= 0);
    const salesClaimsAvgDelayDays =
      delayValues.length > 0
        ? Number((delayValues.reduce((a, b) => a + b, 0) / delayValues.length).toFixed(1))
        : null;
    const salesClaimsTopReasons = buildTopReasons(scRows.map(r => r.motivo), 5);

    // 6. Reclamos Postventa
    const pvClaimsRows = raw.qualityClaims.filter(r => inPeriod(r) && matchesBranch(r));
    const pvClaimsTotal = pvClaimsRows.length;
    const pvClaimsUniqueOr = new Set(
      pvClaimsRows
        .map(r => {
          const ord = String(r.orden || '').trim();
          return ord && ord !== '—' ? `${normalizeBranchCode(r.sucursal)}-${ord}` : '';
        })
        .filter(Boolean)
    ).size;
    const pvClaimsResolved = pvClaimsRows.filter(
      r => String(r.resuelto || '').trim().toUpperCase() === 'SI'
    ).length;
    const pvClaimsPending = Math.max(0, pvClaimsTotal - pvClaimsResolved);
    const pvClaimsResolutionRatePct =
      pvClaimsTotal > 0 ? Number(((pvClaimsResolved / pvClaimsTotal) * 100).toFixed(1)) : null;
    const pvClaimsTopReasons = buildTopReasons(pvClaimsRows.map(r => r.motivo), 5);

    return {
      branch: targetBranch,
      osScore: osScoreCalc.avg,
      osTarget,
      osValidCount,
      osPatentedCount,
      osDeclaredCount,
      osResponseConversionPct,
      osCompliance,
      internalSalesOsScore: intOs.avg,
      internalSalesTrato: intTrato.avg,
      internalSalesOrg: intOrg.avg,
      internalSalesAses: intAses.avg,
      internalSalesDeliveryState: intVehiculo.avg,
      internalSalesCount: intOs.count,
      lvsScore: lvsCalc.avg,
      lvsTarget,
      lvsValidCount: lvsCalc.count,
      lvsTratoQ1: q1Calc.avg,
      lvsOrgQ2: q2Calc.avg,
      lvsReparacionQ3: q3Calc.avg,
      lvsLavadoQ6: q6Calc.avg,
      lvsRecomendacionQ7: q7Calc.avg,
      lvsCompliance,
      internalPvService: ipServ.avg,
      internalPvTrato: ipTrato.avg,
      internalPvOrg: ipOrg.avg,
      internalPvWorkshop: ipTaller.avg,
      internalPvLavado: ipLavado.avg,
      internalPvCount: ipValidCount,
      lavadoTarget,
      lavadoCompliance,
      salesClaimsTotal,
      salesClaimsPending,
      salesClaimsResolved,
      salesClaimsAvgDelayDays,
      salesClaimsTopReasons,
      pvClaimsTotal,
      pvClaimsUniqueOr,
      pvClaimsResolved,
      pvClaimsPending,
      pvClaimsResolutionRatePct,
      pvClaimsTopReasons,
    };
  };

  const consolidated = computeBranchSnapshot('CONSOLIDADO');
  const jujuy = computeBranchSnapshot('JUJUY');
  const salta = computeBranchSnapshot('SALTA');

  // Evolution across all 12 months of the selected year
  const evolution: EvolutionPoint[] = MONTHS.map(m => {
    const isPeriodMember = monthsInPeriod.includes(m);
    const cemM = raw.cemOs.filter(r => r.mes === m && recordMatchesYear(r, year));
    const dqM = raw.detailedQuality.filter(r => r.mes === m && recordMatchesYear(r, year));
    const scM = raw.salesClaims.filter(r => r.mes === m && recordMatchesYear(r, year));
    const pvcM = raw.qualityClaims.filter(r => r.mes === m && recordMatchesYear(r, year));

    const cemJ = cemM.filter(r => normalizeBranchCode(r.sucursal || r.codigo) === 'JUJUY');
    const cemS = cemM.filter(r => normalizeBranchCode(r.sucursal || r.codigo) === 'SALTA');
    const dqJ = dqM.filter(r => normalizeBranchCode(r.sucursal) === 'JUJUY');
    const dqS = dqM.filter(r => normalizeBranchCode(r.sucursal) === 'SALTA');

    return {
      month: m,
      shortMonth: m.slice(0, 3),
      isPeriodMember,
      osConsolidated: avgValid(cemM.map(r => r.cem_score), 1, 5).avg,
      osJujuy: avgValid(cemJ.map(r => r.cem_score), 1, 5).avg,
      osSalta: avgValid(cemS.map(r => r.cem_score), 1, 5).avg,
      osTarget,
      lvsConsolidated: avgValid(dqM.map(r => r.q4_score), 1, 5).avg,
      lvsJujuy: avgValid(dqJ.map(r => r.q4_score), 1, 5).avg,
      lvsSalta: avgValid(dqS.map(r => r.q4_score), 1, 5).avg,
      lvsTarget,
      lavadoConsolidated: avgValid(dqM.map(r => r.q6_score), 1, 5).avg,
      lavadoJujuy: avgValid(dqJ.map(r => r.q6_score), 1, 5).avg,
      lavadoSalta: avgValid(dqS.map(r => r.q6_score), 1, 5).avg,
      salesClaimsConsolidated: scM.length,
      salesClaimsJujuy: scM.filter(r => normalizeBranchCode(r.sucursal) === 'JUJUY').length,
      salesClaimsSalta: scM.filter(r => normalizeBranchCode(r.sucursal) === 'SALTA').length,
      pvClaimsConsolidated: pvcM.length,
      pvClaimsJujuy: pvcM.filter(r => normalizeBranchCode(r.sucursal) === 'JUJUY').length,
      pvClaimsSalta: pvcM.filter(r => normalizeBranchCode(r.sucursal) === 'SALTA').length,
    };
  });

  // Compute SSI, CSI, and Club SSI strictly separated!
  const computeSurveyStudy = (
    program: 'SSI' | 'CSI' | 'CLUB_SSI',
    records: SatisfactionSurveyRecord[],
    targetScore: number
  ): SurveyStudyComputed => {
    // Filter by year first
    const yearRecords = records.filter(r => !r.anio || r.anio === year);

    // Try matching by sale date month or wave/semester corresponding to period
    const matchesPeriodMonth = (r: SatisfactionSurveyRecord) => {
      const fVenta = String(r.fecha_venta || '').toLowerCase();
      for (const m of monthsInPeriod) {
        const mLow = m.toLowerCase();
        const mNum = MONTHS.indexOf(m) + 1;
        if (fVenta.includes(mLow)) return true;
        const slashMatch = fVenta.match(/^\d{1,2}\/(\d{1,2})\/\d{2,4}/);
        if (slashMatch && Number(slashMatch[1]) === mNum) return true;
      }
      return false;
    };

    const exactPeriodRows = yearRecords.filter(matchesPeriodMonth);
    const activeRows = exactPeriodRows.length > 0 ? exactPeriodRows : yearRecords;
    const periodMatchingMode: SurveyStudyComputed['periodMatchingMode'] =
      exactPeriodRows.length > 0 ? 'exact_period' : yearRecords.length > 0 ? 'semester_or_year' : 'no_data';

    const calcForSubset = (subset: SatisfactionSurveyRecord[]) => {
      const validSat = subset
        .map(r => r.satisfaccion_general)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10);
      const validRec = subset
        .map(r => r.recomendacion)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 10);

      const validCount = validSat.length;
      const t2bCount = validSat.filter(v => v >= 9).length;
      const t2bPercent = validCount > 0 ? Number(((t2bCount / validCount) * 100).toFixed(1)) : null;
      const satisfactionAvg =
        validCount > 0 ? Number((validSat.reduce((a, b) => a + b, 0) / validCount).toFixed(2)) : null;
      const recommendationAvg =
        validRec.length > 0 ? Number((validRec.reduce((a, b) => a + b, 0) / validRec.length).toFixed(2)) : null;
      const compliance = evaluateCompliance(satisfactionAvg, targetScore, 'up');
      const topReasons = buildTopReasons(subset.map(r => r.categorizacion), 5);

      return {
        validCount,
        t2bCount,
        t2bPercent,
        satisfactionAvg,
        recommendationAvg,
        compliance,
        topReasons,
      };
    };

    const allStats = calcForSubset(activeRows);
    const jujuyStats = calcForSubset(
      activeRows.filter(r => normalizeBranchCode(r.provincia || r.ce) === 'JUJUY')
    );
    const saltaStats = calcForSubset(
      activeRows.filter(r => normalizeBranchCode(r.provincia || r.ce) === 'SALTA')
    );

    return {
      program,
      sourceStatus:
        activeRows.length === 0
          ? 'unavailable'
          : periodMatchingMode === 'exact_period'
            ? 'available'
            : 'partial',
      periodMatchingMode,
      validSurveysCount: allStats.validCount,
      t2bCount: allStats.t2bCount,
      t2bPercent: allStats.t2bPercent,
      satisfactionAvg: allStats.satisfactionAvg,
      recommendationAvg: allStats.recommendationAvg,
      targetScore,
      compliance: allStats.compliance,
      topDissatisfactionReasons: allStats.topReasons,
      byBranch: {
        JUJUY: jujuyStats,
        SALTA: saltaStats,
      },
    };
  };

  const ssiStudy = computeSurveyStudy('SSI', raw.ssiSurveys, ssiTargetScore);
  const csiStudy = computeSurveyStudy('CSI', raw.csiSurveys, csiTargetScore);
  // Club SSI focuses on categorized follow-ups and verbatim tracking
  const clubSsiSubset = raw.ssiSurveys.filter(
    r => (r.categorizacion && r.categorizacion !== 'Sin categorizar') || Boolean(r.motivo_calificacion)
  );
  const clubSsiStudy = computeSurveyStudy('CLUB_SSI', clubSsiSubset, ssiTargetScore);

  // Matching Action Plans for the period
  const shortMonthKeys = monthsInPeriod.map(m => m.slice(0, 3).toLowerCase());
  const matchingActionPlans = raw.actionPlans.filter(plan => {
    if (!plan.isPlan) return false;
    if (monthsInPeriod.includes(plan.mes)) return true;
    return shortMonthKeys.some(k => Boolean(plan.seguimiento?.[k]?.trim()));
  });

  // PCGC Checklist Summary (note: checklist != audit score)
  const byCritMap = new Map<string, number>();
  const byModMap = new Map<string, number>();
  raw.pcgcChecklist.forEach(item => {
    const crit = (item.criticidad || 'General').trim();
    const mod = (item.modulo || 'General').trim();
    byCritMap.set(crit, (byCritMap.get(crit) || 0) + 1);
    byModMap.set(mod, (byModMap.get(mod) || 0) + 1);
  });

  const pcgcSummary = {
    totalRequirements: raw.pcgcChecklist.length,
    byCriticidad: Array.from(byCritMap.entries()).map(([name, value]) => ({ name, value })),
    byModulo: Array.from(byModMap.entries()).map(([name, value]) => ({ name, value })).slice(0, 6),
  };

  // Default Incentives Summary backed by actual results & scales
  const buildBranchIncentive = (
    branch: 'JUJUY' | 'SALTA',
    area: 'Ventas' | 'Postventa',
    snap: BranchIndicatorSnapshot
  ): IncentiveEntryData => {
    const isVentas = area === 'Ventas';
    const score = isVentas ? snap.osScore : snap.lvsScore;
    const target = isVentas ? snap.osTarget : snap.lvsTarget;
    const status = isVentas ? snap.osCompliance : snap.lvsCompliance;

    return {
      id: `inc-${branch.toLowerCase()}-${area.toLowerCase()}`,
      branch,
      area,
      indicatorName: isVentas ? 'CEM OS / Calidad Ventas' : 'CEM LVS / Calidad Postventa',
      currentResultText: score !== null ? `${formatMetricAr(score)} pts` : 'Pendiente de cierre',
      scaleReached:
        status === 'compliant'
          ? 'Escala Tramo 1 (Objetivo cumplido)'
          : status === 'deviated'
            ? 'Bajo escala mínima de objetivo'
            : 'Pendiente de validación',
      applicablePctText: status === 'compliant' ? '100%' : status === 'deviated' ? 'Sujeto a escala trimestral' : 'A definir',
      penaltyText: '0,00% (Validar desvíos mandatorios)',
      bonusText: status === 'compliant' ? 'Elegible según cumplimiento integral' : 'Sin bonus en tramo actual',
      estimatedAmountText: 'Carga manual Dirección',
      complianceStatus: status,
      notes: `Meta de referencia: ${target !== null ? formatMetricAr(target) : '—'} pts.`,
      isManualAmount: true,
    };
  };

  const defaultIncentives: IncentiveEntryData[] = [
    buildBranchIncentive('JUJUY', 'Ventas', jujuy),
    buildBranchIncentive('SALTA', 'Ventas', salta),
    buildBranchIncentive('JUJUY', 'Postventa', jujuy),
    buildBranchIncentive('SALTA', 'Postventa', salta),
  ];

  // Objectives Matrix
  const objectivesMatrix: ComputedDirectionReportData['objectivesMatrix'] = [
    {
      indicatorKey: 'ventas_os',
      area: 'Ventas',
      name: 'OS de Marca (CEM Ventas)',
      unit: 'pts',
      targetValue: osTarget,
      targetText: `>= ${formatMetricAr(osTarget)}`,
      jujuyValue: jujuy.osScore,
      saltaValue: salta.osScore,
      consolidatedValue: consolidated.osScore,
      jujuyStatus: jujuy.osCompliance,
      saltaStatus: salta.osCompliance,
      consolidatedStatus: consolidated.osCompliance,
    },
    {
      indicatorKey: 'postventa_lvs',
      area: 'Postventa',
      name: 'LVS Satisfacción Postventa (Q4)',
      unit: 'pts',
      targetValue: lvsTarget,
      targetText: `>= ${formatMetricAr(lvsTarget)}`,
      jujuyValue: jujuy.lvsScore,
      saltaValue: salta.lvsScore,
      consolidatedValue: consolidated.lvsScore,
      jujuyStatus: jujuy.lvsCompliance,
      saltaStatus: salta.lvsCompliance,
      consolidatedStatus: consolidated.lvsCompliance,
    },
    {
      indicatorKey: 'lavado',
      area: 'Postventa',
      name: 'Calidad de Lavado (Q6 / Interna)',
      unit: 'pts',
      targetValue: lavadoTarget,
      targetText: `>= ${formatMetricAr(lavadoTarget)}`,
      jujuyValue: jujuy.lvsLavadoQ6 ?? jujuy.internalPvLavado,
      saltaValue: salta.lvsLavadoQ6 ?? salta.internalPvLavado,
      consolidatedValue: consolidated.lvsLavadoQ6 ?? consolidated.internalPvLavado,
      jujuyStatus: jujuy.lavadoCompliance,
      saltaStatus: salta.lavadoCompliance,
      consolidatedStatus: consolidated.lavadoCompliance,
    },
    {
      indicatorKey: 'reclamos_postventa',
      area: 'Postventa',
      name: 'Tasa de Resolución Reclamos PV',
      unit: '%',
      targetValue: 90,
      targetText: '>= 90,0%',
      jujuyValue: jujuy.pvClaimsResolutionRatePct,
      saltaValue: salta.pvClaimsResolutionRatePct,
      consolidatedValue: consolidated.pvClaimsResolutionRatePct,
      jujuyStatus: evaluateCompliance(jujuy.pvClaimsResolutionRatePct, 90, 'up'),
      saltaStatus: evaluateCompliance(salta.pvClaimsResolutionRatePct, 90, 'up'),
      consolidatedStatus: evaluateCompliance(consolidated.pvClaimsResolutionRatePct, 90, 'up'),
    },
  ];

  // Compute real-time status for each module
  const moduleStatuses: ComputedDirectionReportData['moduleStatuses'] = {
    ventas_os: {
      status: consolidated.osValidCount > 0 ? (isClosedPeriod ? 'available' : 'partial') : 'unavailable',
      badgeLabel: consolidated.osValidCount > 0 ? (isClosedPeriod ? 'Automático disponible' : 'Datos parciales') : 'Sin datos en el período',
      detail: `${consolidated.osPatentedCount} patentados · ${consolidated.osValidCount} encuestas con score`,
      recordCount: consolidated.osPatentedCount,
    },
    postventa_lvs: {
      status: consolidated.lvsValidCount > 0 ? (isClosedPeriod ? 'available' : 'partial') : 'unavailable',
      badgeLabel: consolidated.lvsValidCount > 0 ? (isClosedPeriod ? 'Automático disponible' : 'Datos parciales') : 'Sin datos en el período',
      detail: `${consolidated.lvsValidCount} encuestas CEM Postventa válidas`,
      recordCount: consolidated.lvsValidCount,
    },
    lavado: {
      status:
        consolidated.lvsLavadoQ6 !== null || consolidated.internalPvLavado !== null
          ? 'available'
          : 'unavailable',
      badgeLabel:
        consolidated.lvsLavadoQ6 !== null || consolidated.internalPvLavado !== null
          ? 'Automático disponible'
          : 'Sin registros de lavado',
      detail: `CEM Q6: ${formatMetricAr(consolidated.lvsLavadoQ6)} · Interna: ${formatMetricAr(consolidated.internalPvLavado)}`,
      recordCount: consolidated.lvsValidCount + consolidated.internalPvCount,
    },
    cumplimiento_objetivos: {
      status: raw.objectivesSummary.length > 0 ? 'available' : 'partial',
      badgeLabel: raw.objectivesSummary.length > 0 ? 'Automático disponible' : 'Con metas de referencia',
      detail: `${raw.objectivesSummary.length} reglas de objetivos cargadas`,
      recordCount: raw.objectivesSummary.length,
    },
    evolucion_indicadores: {
      status: evolution.some(e => e.osConsolidated !== null || e.lvsConsolidated !== null)
        ? 'available'
        : 'unavailable',
      badgeLabel: 'Automático disponible',
      detail: 'Serie histórica anual Jujuy y Salta',
      recordCount: evolution.filter(e => e.osConsolidated !== null || e.lvsConsolidated !== null).length,
    },
    reclamos_ventas: {
      status: consolidated.salesClaimsTotal > 0 ? 'available' : 'partial',
      badgeLabel: consolidated.salesClaimsTotal > 0 ? 'Automático disponible' : '0 reclamos registrados',
      detail: `${consolidated.salesClaimsTotal} reclamos comerciales en ${periodShortLabel}`,
      recordCount: consolidated.salesClaimsTotal,
    },
    reclamos_postventa: {
      status: consolidated.pvClaimsTotal > 0 ? 'available' : 'partial',
      badgeLabel: consolidated.pvClaimsTotal > 0 ? 'Automático disponible' : '0 reclamos registrados',
      detail: `${consolidated.pvClaimsTotal} reclamos (${consolidated.pvClaimsUniqueOr} OR únicas)`,
      recordCount: consolidated.pvClaimsTotal,
    },
    encuestas_ssi: {
      status: ssiStudy.sourceStatus === 'available' ? 'pending_validation' : ssiStudy.sourceStatus,
      badgeLabel:
        ssiStudy.validSurveysCount > 0
          ? 'Automático · Validar referencias'
          : 'Sin encuestas SSI en período',
      detail: `${ssiStudy.validSurveysCount} encuestas SSI válidas (Referencias Top 5/Mercado editables)`,
      recordCount: ssiStudy.validSurveysCount,
    },
    club_ssi: {
      status: clubSsiStudy.validSurveysCount > 0 ? 'available' : 'unavailable',
      badgeLabel: clubSsiStudy.validSurveysCount > 0 ? 'Automático disponible' : 'Sin registros Club SSI',
      detail: `${clubSsiStudy.validSurveysCount} casos categorizados para seguimiento Club SSI`,
      recordCount: clubSsiStudy.validSurveysCount,
    },
    encuestas_csi: {
      status: csiStudy.sourceStatus === 'available' ? 'pending_validation' : csiStudy.sourceStatus,
      badgeLabel:
        csiStudy.validSurveysCount > 0
          ? 'Automático · Validar referencias'
          : 'Sin encuestas CSI en período',
      detail: `${csiStudy.validSurveysCount} encuestas CSI válidas`,
      recordCount: csiStudy.validSurveysCount,
    },
    pcgc_ventas: {
      status: 'manual',
      badgeLabel: 'Checklist + Resultado manual',
      detail: `${raw.pcgcChecklist.length} requisitos de referencia (Resultado de auditoría de carga manual)`,
      recordCount: raw.pcgcChecklist.length,
    },
    auditoria_iso: {
      status: 'manual',
      badgeLabel: 'Carga manual / Evidencia',
      detail: 'Resultados de auditoría ISO 9001 e incorporación de evidencias',
      recordCount: 0,
    },
    auditoria_gams: {
      status: 'manual',
      badgeLabel: 'Carga manual / Evidencia',
      detail: 'Resultados de auditoría GAMS y desvíos mandatorios',
      recordCount: 0,
    },
    incentivos_ventas: {
      status: 'manual',
      badgeLabel: 'Escalas + Resumen manual',
      detail: 'Escalas de objetivos vinculadas; importe estimado de carga manual',
      recordCount: raw.objectivesScales.length,
    },
    incentivos_postventa: {
      status: 'manual',
      badgeLabel: 'Escalas + Resumen manual',
      detail: 'Escalas de objetivos vinculadas; importe estimado de carga manual',
      recordCount: raw.objectivesScales.length,
    },
    planes_accion_integrados: {
      status: matchingActionPlans.length > 0 ? 'available' : 'manual',
      badgeLabel:
        matchingActionPlans.length > 0
          ? `${matchingActionPlans.length} planes sugeridos`
          : 'Integrado editable',
      detail: 'Integrado debajo de cada indicador con desvío',
      recordCount: matchingActionPlans.length,
    },
    proximos_pasos: {
      status: 'available',
      badgeLabel: 'Síntesis Directiva',
      detail: '3 prioridades clave del período para Dirección',
      recordCount: 3,
    },
    evidencias_fotograficas: {
      status: 'manual',
      badgeLabel: 'Editor visual integrado',
      detail: 'Subir fotos, arrastrar o pegar con Ctrl+V',
      recordCount: 0,
    },
    conclusiones_ejecutivas: {
      status: 'manual',
      badgeLabel: 'Carga manual editable',
      detail: 'Composición de 2 columnas para hallazgos e impacto',
      recordCount: 0,
    },
    pagina_personalizada: {
      status: 'manual',
      badgeLabel: 'Personalizable',
      detail: 'Gráfico personalizado, tarjetas e imágenes',
      recordCount: 0,
    },
  };

  return {
    periodLabel,
    periodShortLabel,
    monthsInPeriod,
    monthsWithData,
    isClosedPeriod,
    periodClosureStatusLabel,
    periodClosureDetail,
    consolidated,
    jujuy,
    salta,
    evolution,
    ssiStudy,
    csiStudy,
    clubSsiStudy,
    moduleStatuses,
    matchingActionPlans,
    pcgcSummary,
    defaultIncentives,
    objectivesMatrix,
  };
}

// --- Integrated Action Block Builder per Indicator ---
// Follows strictly:
// - If compliant: visible = false by default, no fabricated actions.
// - If deviated: visible = true, searches matching plans in Google Sheets, leaves empty fields if no plan exists (NEVER invents causes or actions).
// - Evaluates Jujuy and Salta individually.

export function buildIntegratedActionBlock(
  indicatorKey: string,
  indicatorLabel: string,
  jujuyCompliance: ComplianceStatus,
  saltaCompliance: ComplianceStatus,
  overallCompliance: ComplianceStatus,
  branchSelection: BranchSelection,
  matchingPlans: ActionPlanRecord[],
  enabledIntegratedPlans: boolean
): IntegratedActionBlock {
  // Determine effective compliance for the selected branch scope
  const hasDeviation =
    branchSelection === 'JUJUY'
      ? jujuyCompliance === 'deviated'
      : branchSelection === 'SALTA'
        ? saltaCompliance === 'deviated'
        : jujuyCompliance === 'deviated' || saltaCompliance === 'deviated' || overallCompliance === 'deviated';

  // Find plans from Google Sheets that match this indicator
  const keywordsByIndicator: Record<string, string[]> = {
    ventas_os: ['os', 'cem', 'venta', 'entrega'],
    postventa_lvs: ['lvs', 'postventa', 'taller', 'reparacion', 'servicio'],
    lavado: ['lavado', 'limpieza'],
    reclamos_ventas: ['reclamo', 'venta', 'comercial'],
    reclamos_postventa: ['reclamo', 'postventa', 'or', 'retorno'],
    encuestas_ssi: ['ssi', 'encuesta', 'satisfaccion'],
    club_ssi: ['club ssi', 'ssi'],
    encuestas_csi: ['csi', 'postventa'],
    pcgc_ventas: ['pcgc', 'auditoria', 'proceso'],
    auditoria_iso: ['iso', '9001', 'calidad'],
    auditoria_gams: ['gams', 'garantia'],
  };

  const keywords = keywordsByIndicator[indicatorKey] || [indicatorKey.toLowerCase()];
  const relevantPlans = matchingPlans.filter(plan => {
    const kpiText = `${plan.nombre_kpi} ${plan.sector} ${plan.origen} ${plan.requisito}`.toLowerCase();
    return keywords.some(kw => kpiText.includes(kw));
  });

  // Build empty or linked action rows without inventing text
  const actions: IntegratedActionItem[] = [];

  if (hasDeviation) {
    if (relevantPlans.length > 0) {
      relevantPlans.slice(0, 2).forEach((plan, idx) => {
        const planBranch = normalizeBranchCode(plan.provincia);
        const branchTag: 'JUJUY' | 'SALTA' | 'COMUN' =
          planBranch === 'JUJUY' ? 'JUJUY' : planBranch === 'SALTA' ? 'SALTA' : 'COMUN';
        actions.push({
          id: `act-${indicatorKey}-${idx}-${Date.now()}`,
          branch: branchTag,
          deviationSummary: plan.situacion_actual_cualitativo || plan.nombre_kpi || '',
          rootCause: plan.causa_raiz || '',
          correctiveAction: plan.accion_correctiva || plan.accion_inmediata || '',
          responsible: plan.responsable || plan.sector || '',
          targetDate: plan.fecha_inicio_est || plan.finalizacion_real || '',
          status:
            plan.verificacion_eficacia
              ? 'Verificado'
              : plan.estado?.toLowerCase().includes('cerrad') || plan.estado?.toLowerCase().includes('cumplid')
                ? 'Implementado'
                : 'En proceso',
          followUpNote: '',
          linkedSourcePlanId: plan.id,
          linkedSourcePlanNro: plan.nro,
        });
      });
    } else {
      // Create empty editable row(s) only for the deviated branch(es) — never invent causes or corrective actions!
      if (branchSelection === 'BOTH') {
        if (jujuyCompliance === 'deviated') {
          actions.push({
            id: `act-${indicatorKey}-jujuy`,
            branch: 'JUJUY',
            deviationSummary: '',
            rootCause: '',
            correctiveAction: '',
            responsible: '',
            targetDate: '',
            status: 'En proceso',
            followUpNote: '',
          });
        }
        if (saltaCompliance === 'deviated') {
          actions.push({
            id: `act-${indicatorKey}-salta`,
            branch: 'SALTA',
            deviationSummary: '',
            rootCause: '',
            correctiveAction: '',
            responsible: '',
            targetDate: '',
            status: 'En proceso',
            followUpNote: '',
          });
        }
        if (actions.length === 0) {
          actions.push({
            id: `act-${indicatorKey}-comun`,
            branch: 'COMUN',
            deviationSummary: '',
            rootCause: '',
            correctiveAction: '',
            responsible: '',
            targetDate: '',
            status: 'En proceso',
            followUpNote: '',
          });
        }
      } else {
        actions.push({
          id: `act-${indicatorKey}-${branchSelection.toLowerCase()}`,
          branch: branchSelection === 'JUJUY' ? 'JUJUY' : 'SALTA',
          deviationSummary: '',
          rootCause: '',
          correctiveAction: '',
          responsible: '',
          targetDate: '',
          status: 'En proceso',
          followUpNote: '',
        });
      }
    }
  }

  return {
    indicatorKey,
    indicatorLabel,
    visible: enabledIntegratedPlans && hasDeviation,
    layoutMode: 'compact',
    sharedActionsForBothBranches: false,
    jujuyCompliance,
    saltaCompliance,
    overallCompliance,
    jujuyAnalysis: '',
    saltaAnalysis: '',
    generalAnalysis: '',
    preventiveObservation: '',
    actions,
    isInheritedPendingReview: false,
  };
}

// --- Dynamic Page Composer ---
// Composes a balanced, intentional sequence of A4 landscape pages from the selected modules.

export function composeDirectionReportPages(
  params: {
    periodType: ReportPeriodType;
    year: number;
    month: string;
    quarter: QuarterCode;
    branchSelection: BranchSelection;
    enabledModules: DirectionModuleId[];
    surveySubOptions: SurveyDisplaySubOptions;
  },
  computed: ComputedDirectionReportData
): ReportPage[] {
  const { branchSelection, enabledModules } = params;
  const includeIntegratedPlans = enabledModules.includes('planes_accion_integrados');
  const pages: ReportPage[] = [];

  const branchTitle =
    branchSelection === 'JUJUY'
      ? 'Autosol Jujuy (3059)'
      : branchSelection === 'SALTA'
        ? 'Autosol Salta (3087)'
        : 'Autosol Jujuy (3059) · Autosol Salta (3087)';

  // 1. PLANTILLA 1: PORTADA EJECUTIVA
  pages.push({
    id: 'page-cover',
    templateType: 'cover',
    title: 'Informe Ejecutivo de Calidad',
    subtitle: `${computed.periodLabel} · ${branchTitle}`,
    sectionTag: 'DIRECCIÓN GENERAL',
    visible: true,
    exportSelected: true,
    layoutVariant: 'balanced_split',
    narrativeTitle: 'Alcance y Corte Operativo del Informe',
    narrativeBody: computed.periodClosureDetail,
    images: [],
  });

  // 2. PLANTILLA 2: RESUMEN EJECUTIVO
  pages.push({
    id: 'page-executive-summary',
    templateType: 'executive_summary',
    title: `Resumen Ejecutivo — ${computed.periodLabel}`,
    subtitle: `Síntesis de resultados clave y estado de cumplimiento (${branchTitle})`,
    sectionTag: 'SÍNTESIS DIRECTIVA',
    visible: true,
    exportSelected: true,
    layoutVariant: 'four_kpi_grid',
    narrativeTitle: 'Lectura Ejecutiva del Período',
    narrativeBody: '',
    secondaryNarrativeTitle: 'Foco de Gestión para Dirección',
    secondaryNarrativeBody: '',
    images: [],
  });

  // 3. VENTAS: OS DE MARCA (Plantilla 3 + Plan de Acción Integrado)
  if (enabledModules.includes('ventas_os')) {
    pages.push({
      id: 'page-ventas-os',
      templateType: 'indicator_evolution',
      moduleId: 'ventas_os',
      linkedIndicatorKey: 'ventas_os',
      title: `Ventas: OS de Marca (CEM) — ${computed.periodLabel}`,
      subtitle: 'Satisfacción comercial externa, embudo de respuesta y evolución vs. objetivo',
      sectionTag: 'CALIDAD VENTAS · CEM OS',
      visible: true,
      exportSelected: true,
      layoutVariant: branchSelection === 'BOTH' ? 'comparative_branches' : 'asymmetric_chart',
      chartType: 'bar',
      showChartTarget: true,
      showChartLabels: true,
      narrativeTitle: 'Interpretación Comercial OS',
      narrativeBody: '',
      actionBlock: buildIntegratedActionBlock(
        'ventas_os',
        'OS de Marca (Ventas)',
        computed.jujuy.osCompliance,
        computed.salta.osCompliance,
        computed.consolidated.osCompliance,
        branchSelection,
        computed.matchingActionPlans,
        includeIntegratedPlans
      ),
      images: [],
    });
  }

  // 4. POSTVENTA: LVS (Plantilla 3 + Plan de Acción Integrado)
  if (enabledModules.includes('postventa_lvs')) {
    pages.push({
      id: 'page-postventa-lvs',
      templateType: 'indicator_evolution',
      moduleId: 'postventa_lvs',
      linkedIndicatorKey: 'postventa_lvs',
      title: `Postventa: LVS y Calidad de Servicio — ${computed.periodLabel}`,
      subtitle: 'Índice LVS (Q4), Trato personal (Q1), Organización (Q2) y Calidad de reparación (Q3)',
      sectionTag: 'CALIDAD POSTVENTA · CEM LVS',
      visible: true,
      exportSelected: true,
      layoutVariant: branchSelection === 'BOTH' ? 'comparative_branches' : 'asymmetric_chart',
      chartType: 'line',
      showChartTarget: true,
      showChartLabels: true,
      narrativeTitle: 'Interpretación Operativa Postventa',
      narrativeBody: '',
      actionBlock: buildIntegratedActionBlock(
        'postventa_lvs',
        'LVS Postventa',
        computed.jujuy.lvsCompliance,
        computed.salta.lvsCompliance,
        computed.consolidated.lvsCompliance,
        branchSelection,
        computed.matchingActionPlans,
        includeIntegratedPlans
      ),
      images: [],
    });
  }

  // 5. LAVADO (Plantilla 3 adaptada + Plan de Acción Integrado)
  if (enabledModules.includes('lavado')) {
    pages.push({
      id: 'page-lavado',
      templateType: 'indicator_evolution',
      moduleId: 'lavado',
      linkedIndicatorKey: 'lavado',
      title: `Calidad de Lavado y Entrega — ${computed.periodLabel}`,
      subtitle: 'Evaluación externa CEM (Q6) y Encuesta Interna Postventa',
      sectionTag: 'POSTVENTA · LAVADO',
      visible: true,
      exportSelected: true,
      layoutVariant: 'balanced_split',
      chartType: 'bar',
      showChartTarget: true,
      showChartLabels: true,
      narrativeTitle: 'Observaciones sobre Calidad de Lavado',
      narrativeBody: '',
      actionBlock: buildIntegratedActionBlock(
        'lavado',
        'Calidad de Lavado',
        computed.jujuy.lavadoCompliance,
        computed.salta.lavadoCompliance,
        computed.consolidated.lavadoCompliance,
        branchSelection,
        computed.matchingActionPlans,
        includeIntegratedPlans
      ),
      images: [],
    });
  }

  // 6. COMPARACIÓN JUJUY / SALTA E INDICADORES EN EVOLUCIÓN (Plantilla 4)
  if (enabledModules.includes('evolucion_indicadores') || branchSelection === 'BOTH') {
    pages.push({
      id: 'page-branch-comparison',
      templateType: 'branch_comparison',
      moduleId: 'evolucion_indicadores',
      title: `Comparativo Jujuy (3059) vs. Salta (3087) — ${computed.periodLabel}`,
      subtitle: 'Equilibrio visual de desempeño entre sucursales, brechas frente al objetivo y tendencias',
      sectionTag: 'ANÁLISIS COMPARATIVO',
      visible: true,
      exportSelected: true,
      layoutVariant: 'comparative_branches',
      chartType: 'comparative',
      showChartTarget: true,
      showChartLabels: true,
      narrativeTitle: 'Lectura Comparativa entre Sucursales',
      narrativeBody: '',
      images: [],
    });
  }

  // 7. RECLAMOS DE VENTAS Y/O POSTVENTA
  if (enabledModules.includes('reclamos_ventas') || enabledModules.includes('reclamos_postventa')) {
    const bothClaims =
      enabledModules.includes('reclamos_ventas') && enabledModules.includes('reclamos_postventa');
    const claimsModuleId: DirectionModuleId = bothClaims
      ? 'reclamos_postventa'
      : enabledModules.includes('reclamos_ventas')
        ? 'reclamos_ventas'
        : 'reclamos_postventa';

    const jClaimsDev: ComplianceStatus =
      computed.jujuy.pvClaimsPending > 0 || computed.jujuy.salesClaimsPending > 0
        ? 'deviated'
        : 'compliant';
    const sClaimsDev: ComplianceStatus =
      computed.salta.pvClaimsPending > 0 || computed.salta.salesClaimsPending > 0
        ? 'deviated'
        : 'compliant';
    const allClaimsDev: ComplianceStatus =
      jClaimsDev === 'deviated' || sClaimsDev === 'deviated' ? 'deviated' : 'compliant';

    pages.push({
      id: 'page-claims',
      templateType: 'claims_module',
      moduleId: claimsModuleId,
      linkedIndicatorKey: claimsModuleId,
      title: bothClaims
        ? `Gestión de Reclamos Ventas y Postventa — ${computed.periodLabel}`
        : enabledModules.includes('reclamos_ventas')
          ? `Gestión de Reclamos de Ventas — ${computed.periodLabel}`
          : `Gestión de Reclamos de Postventa — ${computed.periodLabel}`,
      subtitle: 'Volumen del período, OR únicas, tasa de resolución, motivos principales y acciones correctivas',
      sectionTag: 'GESTIÓN DE RECLAMOS',
      visible: true,
      exportSelected: true,
      layoutVariant: 'balanced_split',
      chartType: 'bar',
      showChartLabels: true,
      narrativeTitle: 'Síntesis de Tratamiento de Reclamos',
      narrativeBody: '',
      actionBlock: buildIntegratedActionBlock(
        claimsModuleId,
        bothClaims ? 'Reclamos Ventas y Postventa' : 'Gestión de Reclamos',
        jClaimsDev,
        sClaimsDev,
        allClaimsDev,
        branchSelection,
        computed.matchingActionPlans,
        includeIntegratedPlans
      ),
      images: [],
    });
  }

  // 8. ENCUESTAS SSI (Plantilla 5 - Estudio Diferenciado SSI)
  if (enabledModules.includes('encuestas_ssi')) {
    pages.push({
      id: 'page-survey-ssi',
      templateType: 'survey_study',
      moduleId: 'encuestas_ssi',
      linkedIndicatorKey: 'encuestas_ssi',
      surveyProgram: 'SSI',
      title: `Estudio de Satisfacción SSI (Ventas) — ${computed.periodLabel}`,
      subtitle: 'Encuestas válidas, Top 2 Box (9–10), Satisfacción General, Recomendación y brechas de mercado',
      sectionTag: 'ESTUDIO DE MARCA · SSI VENTAS',
      visible: true,
      exportSelected: true,
      layoutVariant: 'balanced_split',
      narrativeTitle: 'Análisis del Estudio SSI',
      narrativeBody: '',
      surveyBenchmarkOverride: {
        marketT2B: null,
        top5T2B: null,
        marketScore: null,
        targetScore: 8.8,
        validatedForPeriod: false,
      },
      actionBlock: buildIntegratedActionBlock(
        'encuestas_ssi',
        'Estudio SSI Ventas',
        computed.ssiStudy.byBranch.JUJUY.compliance,
        computed.ssiStudy.byBranch.SALTA.compliance,
        computed.ssiStudy.compliance,
        branchSelection,
        computed.matchingActionPlans,
        includeIntegratedPlans
      ),
      images: [],
    });
  }

  // 9. CLUB SSI (Plantilla 5 - Módulo Diferenciado Club SSI)
  if (enabledModules.includes('club_ssi')) {
    pages.push({
      id: 'page-survey-club-ssi',
      templateType: 'survey_study',
      moduleId: 'club_ssi',
      linkedIndicatorKey: 'club_ssi',
      surveyProgram: 'CLUB_SSI',
      title: `Seguimiento Club SSI — ${computed.periodLabel}`,
      subtitle: 'Módulo diferenciado de categorización de comentarios, alertas tempranas y seguimiento comercial',
      sectionTag: 'GESTIÓN ESPECÍFICA · CLUB SSI',
      visible: true,
      exportSelected: true,
      layoutVariant: 'balanced_split',
      narrativeTitle: 'Análisis y Necesidades de Seguimiento Club SSI',
      narrativeBody: '',
      actionBlock: buildIntegratedActionBlock(
        'club_ssi',
        'Club SSI',
        computed.clubSsiStudy.byBranch.JUJUY.compliance,
        computed.clubSsiStudy.byBranch.SALTA.compliance,
        computed.clubSsiStudy.compliance,
        branchSelection,
        computed.matchingActionPlans,
        includeIntegratedPlans
      ),
      images: [],
    });
  }

  // 10. ENCUESTAS CSI (Plantilla 5 - Estudio Diferenciado CSI)
  if (enabledModules.includes('encuestas_csi')) {
    pages.push({
      id: 'page-survey-csi',
      templateType: 'survey_study',
      moduleId: 'encuestas_csi',
      linkedIndicatorKey: 'encuestas_csi',
      surveyProgram: 'CSI',
      title: `Estudio de Satisfacción CSI (Postventa) — ${computed.periodLabel}`,
      subtitle: 'Encuestas válidas, Top 2 Box (9–10), Satisfacción General, Recomendación y motivos de insatisfacción',
      sectionTag: 'ESTUDIO DE MARCA · CSI POSTVENTA',
      visible: true,
      exportSelected: true,
      layoutVariant: 'balanced_split',
      narrativeTitle: 'Análisis del Estudio CSI Postventa',
      narrativeBody: '',
      surveyBenchmarkOverride: {
        marketT2B: null,
        top5T2B: null,
        marketScore: null,
        targetScore: 8.8,
        validatedForPeriod: false,
      },
      actionBlock: buildIntegratedActionBlock(
        'encuestas_csi',
        'Estudio CSI Postventa',
        computed.csiStudy.byBranch.JUJUY.compliance,
        computed.csiStudy.byBranch.SALTA.compliance,
        computed.csiStudy.compliance,
        branchSelection,
        computed.matchingActionPlans,
        includeIntegratedPlans
      ),
      images: [],
    });
  }

  // 11. AUDITORÍAS (PCGC / ISO 9001 / GAMS) (Plantilla 6 + Plan de Acción Integrado)
  const hasAnyAudit =
    enabledModules.includes('pcgc_ventas') ||
    enabledModules.includes('auditoria_iso') ||
    enabledModules.includes('auditoria_gams');

  if (hasAnyAudit) {
    const auditEntries: AuditEntryData[] = [];
    if (enabledModules.includes('pcgc_ventas')) {
      auditEntries.push({
        id: 'audit-pcgc',
        auditType: 'PCGC',
        auditName: 'PCGC — Programa de Calidad de Gestión',
        branch: branchSelection === 'BOTH' ? 'AMBAS' : branchSelection,
        periodLabel: computed.periodLabel,
        scoreResult: '',
        numericResult: null,
        targetScore: 90,
        status: 'pending_evaluation',
        auditStateLabel: 'En preparación',
        mandatoryDeviationsCount: 0,
        pendingActionsCount: 0,
        checklistRefCount: computed.pcgcSummary.totalRequirements,
        chapters: [
          { id: 'ch-1', chapter: 'Procesos Comerciales Ventas', scorePct: null, mandatoryDeviations: 0, status: 'pending_evaluation' },
          { id: 'ch-2', chapter: 'Procesos de Servicio Postventa', scorePct: null, mandatoryDeviations: 0, status: 'pending_evaluation' },
          { id: 'ch-3', chapter: 'Gestión de Calidad y Mejora', scorePct: null, mandatoryDeviations: 0, status: 'pending_evaluation' },
        ],
        mainDeviationsText: '',
        observationsText: '',
        isManualSource: true,
      });
    }
    if (enabledModules.includes('auditoria_iso')) {
      auditEntries.push({
        id: 'audit-iso',
        auditType: 'ISO_9001',
        auditName: 'Auditoría SGC ISO 9001:2015',
        branch: branchSelection === 'BOTH' ? 'AMBAS' : branchSelection,
        periodLabel: computed.periodLabel,
        scoreResult: '',
        numericResult: null,
        targetScore: 100,
        status: 'pending_evaluation',
        auditStateLabel: 'Pendiente de auditoría',
        mandatoryDeviationsCount: 0,
        pendingActionsCount: 0,
        chapters: [],
        mainDeviationsText: '',
        observationsText: '',
        isManualSource: true,
      });
    }
    if (enabledModules.includes('auditoria_gams')) {
      auditEntries.push({
        id: 'audit-gams',
        auditType: 'GAMS',
        auditName: 'Auditoría GAMS / Garantías',
        branch: branchSelection === 'BOTH' ? 'AMBAS' : branchSelection,
        periodLabel: computed.periodLabel,
        scoreResult: '',
        numericResult: null,
        targetScore: 95,
        status: 'pending_evaluation',
        auditStateLabel: 'Pendiente de auditoría',
        mandatoryDeviationsCount: 0,
        pendingActionsCount: 0,
        chapters: [],
        mainDeviationsText: '',
        observationsText: '',
        isManualSource: true,
      });
    }

    pages.push({
      id: 'page-audits',
      templateType: 'audits',
      moduleId: 'pcgc_ventas',
      linkedIndicatorKey: 'pcgc_ventas',
      title: `Auditorías y Cumplimiento Normativo — ${computed.periodLabel}`,
      subtitle: 'Resultados de auditoría, estado por capítulos, desvíos mandatorios y acciones correctivas',
      sectionTag: 'AUDITORÍAS DE CALIDAD',
      visible: true,
      exportSelected: true,
      layoutVariant: 'balanced_split',
      narrativeTitle: 'Observaciones de Auditoría',
      narrativeBody: '',
      auditEntries,
      actionBlock: buildIntegratedActionBlock(
        'pcgc_ventas',
        'Auditorías de Calidad (PCGC / ISO / GAMS)',
        'pending_evaluation',
        'pending_evaluation',
        'pending_evaluation',
        branchSelection,
        computed.matchingActionPlans,
        includeIntegratedPlans
      ),
      images: [],
    });
  }

  // 12. INCENTIVOS (Plantilla 7)
  if (enabledModules.includes('incentivos_ventas') || enabledModules.includes('incentivos_postventa')) {
    const filteredIncentives = computed.defaultIncentives.filter(entry => {
      const areaOk =
        (entry.area === 'Ventas' && enabledModules.includes('incentivos_ventas')) ||
        (entry.area === 'Postventa' && enabledModules.includes('incentivos_postventa'));
      const branchOk =
        branchSelection === 'BOTH' || entry.branch === branchSelection;
      return areaOk && branchOk;
    });

    pages.push({
      id: 'page-incentives',
      templateType: 'incentives',
      moduleId: enabledModules.includes('incentivos_ventas') ? 'incentivos_ventas' : 'incentivos_postventa',
      title: `Resumen de Incentivos de Calidad — ${computed.periodLabel}`,
      subtitle: 'Escalas alcanzadas, porcentaje aplicable, penalizaciones, bonus e importe estimado',
      sectionTag: 'PROGRAMA DE INCENTIVOS',
      visible: true,
      exportSelected: true,
      layoutVariant: 'four_kpi_grid',
      narrativeTitle: 'Consideraciones sobre Incentivos del Período',
      narrativeBody: '',
      incentiveEntries: filteredIncentives,
      images: [],
    });
  }

  // 13. MATRIZ DE CUMPLIMIENTO DE OBJETIVOS / ANÁLISIS Y CAUSAS (Plantilla 8)
  if (enabledModules.includes('cumplimiento_objetivos') || enabledModules.includes('conclusiones_ejecutivas')) {
    pages.push({
      id: 'page-objectives-analysis',
      templateType: 'analysis_causes',
      moduleId: enabledModules.includes('cumplimiento_objetivos') ? 'cumplimiento_objetivos' : 'conclusiones_ejecutivas',
      title: `Matriz de Cumplimiento y Análisis de Causas — ${computed.periodLabel}`,
      subtitle: 'Evaluación integral frente a objetivos vigentes, hallazgos estratégicos y propuestas',
      sectionTag: 'CUMPLIMIENTO DE OBJETIVOS',
      visible: true,
      exportSelected: true,
      layoutVariant: 'two_columns_analysis',
      narrativeTitle: 'Principales Hallazgos y Causas Identificadas',
      narrativeBody: '',
      secondaryNarrativeTitle: 'Impacto Operativo y Acciones Propuestas',
      secondaryNarrativeBody: '',
      images: [],
    });
  }

  // 14. FOTOGRAFÍAS Y EVIDENCIAS (Plantilla 10)
  if (enabledModules.includes('evidencias_fotograficas')) {
    pages.push({
      id: 'page-photo-evidences',
      templateType: 'photo_evidences',
      moduleId: 'evidencias_fotograficas',
      title: `Evidencias Visuales y Capturas de Gestión — ${computed.periodLabel}`,
      subtitle: 'Registro fotográfico de instalaciones, auditorías y capturas oficiales',
      sectionTag: 'EVIDENCIAS Y REGISTROS',
      visible: true,
      exportSelected: true,
      layoutVariant: 'balanced_split',
      photoLayout: 'two_comparative',
      narrativeTitle: 'Observaciones sobre las Evidencias',
      narrativeBody: '',
      images: [],
    });
  }

  // 15. PÁGINA PERSONALIZADA (Si se seleccionó)
  if (enabledModules.includes('pagina_personalizada')) {
    pages.push({
      id: 'page-custom-1',
      templateType: 'custom',
      moduleId: 'pagina_personalizada',
      title: `Análisis Complementario — ${computed.periodLabel}`,
      subtitle: 'Indicadores personalizados, gráficos e información adicional para Dirección',
      sectionTag: 'INFORMACIÓN COMPLEMENTARIA',
      visible: true,
      exportSelected: true,
      layoutVariant: 'balanced_split',
      narrativeTitle: 'Comentarios y Conclusiones',
      narrativeBody: '',
      customCards: [
        {
          id: 'cc-1',
          label: 'Indicador Complementario 1',
          value: '—',
          target: '—',
          unit: '',
          branch: 'GENERAL',
          compliance: 'pending_evaluation',
          hint: 'Carga manual',
          isManual: true,
        },
        {
          id: 'cc-2',
          label: 'Indicador Complementario 2',
          value: '—',
          target: '—',
          unit: '',
          branch: 'GENERAL',
          compliance: 'pending_evaluation',
          hint: 'Carga manual',
          isManual: true,
        },
      ],
      customChart: {
        title: 'Gráfico Personalizado',
        subtitle: 'Datos editables desde el panel de propiedades',
        chartType: 'bar',
        showTargetLine: true,
        targetValue: 4.8,
        showValueLabels: true,
        unit: '',
        dataPoints: [
          { id: 'dp-1', label: 'Jujuy', value: computed.jujuy.osScore ?? 4.5, target: 4.6 },
          { id: 'dp-2', label: 'Salta', value: computed.salta.osScore ?? 4.5, target: 4.6 },
        ],
      },
      images: [],
    });
  }

  // 16. PLANTILLA 11: CIERRE EJECUTIVO Y PRÓXIMOS PASOS (3 Prioridades Clave)
  if (enabledModules.includes('proximos_pasos')) {
    const defaultPriorities: ClosingPriorityItem[] = [
      {
        id: 'prio-1',
        priorityNumber: 1,
        title: 'Prioridad 1 — Ventas / Satisfacción OS',
        areaAndBranch: branchTitle,
        KeyFinding: '',
        commitmentAction: '',
        responsible: 'Gerencia Comercial / Calidad',
        deadline: '',
        decisionRequired: '',
        status: 'Prioridad Alta',
      },
      {
        id: 'prio-2',
        priorityNumber: 2,
        title: 'Prioridad 2 — Postventa / LVS y Resolución',
        areaAndBranch: branchTitle,
        KeyFinding: '',
        commitmentAction: '',
        responsible: 'Gerencia Postventa / Calidad',
        deadline: '',
        decisionRequired: '',
        status: 'Seguimiento',
      },
      {
        id: 'prio-3',
        priorityNumber: 3,
        title: 'Prioridad 3 — Cumplimiento de Procesos y Auditorías',
        areaAndBranch: branchTitle,
        KeyFinding: '',
        commitmentAction: '',
        responsible: 'Calidad / Dirección',
        deadline: '',
        decisionRequired: '',
        status: 'Decisión Dirección',
      },
    ];

    pages.push({
      id: 'page-next-steps',
      templateType: 'next_steps',
      moduleId: 'proximos_pasos',
      title: `Cierre Ejecutivo y Próximos Pasos — ${computed.periodLabel}`,
      subtitle: 'Las tres prioridades estratégicas que requieren seguimiento, recursos o decisiones de Dirección',
      sectionTag: 'CIERRE DIRECTIVO',
      visible: true,
      exportSelected: true,
      layoutVariant: 'balanced_split',
      narrativeTitle: 'Conclusión General para Dirección',
      narrativeBody: '',
      closingPriorities: defaultPriorities,
      images: [],
    });
  }

  return pages;
}

// --- Duplicate Report Logic (Preserves Layout & Images, Updates Period, Marks Inherited Text) ---

export function duplicateDirectionReportForNewPeriod(
  sourceDoc: DirectionReportDocument,
  targetParams: {
    name: string;
    periodType: ReportPeriodType;
    year: number;
    month: string;
    quarter: QuarterCode;
    branchSelection: BranchSelection;
    keepImages: boolean;
  },
  newComputed: ComputedDirectionReportData
): DirectionReportDocument {
  const nowIso = new Date().toISOString();
  const branchTitle =
    targetParams.branchSelection === 'JUJUY'
      ? 'Autosol Jujuy (3059)'
      : targetParams.branchSelection === 'SALTA'
        ? 'Autosol Salta (3087)'
        : 'Autosol Jujuy (3059) · Autosol Salta (3087)';

  const duplicatedPages: ReportPage[] = sourceDoc.pages.map(page => {
    const hasManualText = Boolean(
      page.narrativeBody?.trim() ||
        page.secondaryNarrativeBody?.trim() ||
        page.actionBlock?.jujuyAnalysis?.trim() ||
        page.actionBlock?.saltaAnalysis?.trim() ||
        page.actionBlock?.generalAnalysis?.trim() ||
        page.actionBlock?.actions?.some(a => a.rootCause.trim() || a.correctiveAction.trim())
    );

    // Re-evaluate automatic compliance for the new period on indicator pages
    let updatedActionBlock = page.actionBlock ? { ...page.actionBlock } : undefined;
    if (updatedActionBlock && page.linkedIndicatorKey) {
      const freshBlock = buildIntegratedActionBlock(
        page.linkedIndicatorKey,
        updatedActionBlock.indicatorLabel,
        page.linkedIndicatorKey === 'ventas_os'
          ? newComputed.jujuy.osCompliance
          : page.linkedIndicatorKey === 'postventa_lvs'
            ? newComputed.jujuy.lvsCompliance
            : newComputed.jujuy.lavadoCompliance,
        page.linkedIndicatorKey === 'ventas_os'
          ? newComputed.salta.osCompliance
          : page.linkedIndicatorKey === 'postventa_lvs'
            ? newComputed.salta.lvsCompliance
            : newComputed.salta.lavadoCompliance,
        page.linkedIndicatorKey === 'ventas_os'
          ? newComputed.consolidated.osCompliance
          : page.linkedIndicatorKey === 'postventa_lvs'
            ? newComputed.consolidated.lvsCompliance
            : newComputed.consolidated.lavadoCompliance,
        targetParams.branchSelection,
        newComputed.matchingActionPlans,
        true
      );
      updatedActionBlock = {
        ...updatedActionBlock,
        jujuyCompliance: freshBlock.jujuyCompliance,
        saltaCompliance: freshBlock.saltaCompliance,
        overallCompliance: freshBlock.overallCompliance,
        isInheritedPendingReview: hasManualText,
      };
    }

    // Update period reference in title
    const baseTitle = page.title.split('—')[0].trim();
    const updatedTitle =
      page.templateType === 'cover'
        ? page.title
        : `${baseTitle} — ${newComputed.periodLabel}`;

    return {
      ...page,
      id: `${page.id}-dup-${Date.now().toString(36).slice(-4)}`,
      title: updatedTitle,
      subtitle:
        page.templateType === 'cover'
          ? `${newComputed.periodLabel} · ${branchTitle}`
          : page.subtitle,
      narrativeBody: page.templateType === 'cover' ? newComputed.periodClosureDetail : page.narrativeBody,
      isInheritedPendingReview: page.templateType === 'cover' ? false : hasManualText,
      actionBlock: updatedActionBlock,
      images: targetParams.keepImages ? page.images.map(img => ({ ...img })) : [],
      surveyBenchmarkOverride: page.surveyBenchmarkOverride
        ? { ...page.surveyBenchmarkOverride, validatedForPeriod: false }
        : undefined,
    };
  });

  return {
    id: `dir-rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: targetParams.name,
    createdAt: nowIso,
    updatedAt: nowIso,
    emittedDate: new Date().toLocaleDateString('es-AR'),
    periodType: targetParams.periodType,
    year: targetParams.year,
    month: targetParams.month,
    quarter: targetParams.quarter,
    branchSelection: targetParams.branchSelection,
    enabledModules: [...sourceDoc.enabledModules],
    surveySubOptions: { ...sourceDoc.surveySubOptions },
    pages: duplicatedPages,
    duplicatedFromId: sourceDoc.id,
    duplicatedFromPeriod: `${sourceDoc.periodType === 'monthly' ? sourceDoc.month : sourceDoc.quarter} ${sourceDoc.year}`,
  };
}
