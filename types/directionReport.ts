import {
  ActionPlanRecord,
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
import { ClubSsiRecord } from '../services/clubSsi';

export type ReportPeriodType = 'monthly' | 'quarterly';
export type QuarterCode = 'Q1' | 'Q2' | 'Q3' | 'Q4';
export type BranchSelection = 'JUJUY' | 'SALTA' | 'BOTH';
export type SingleBranch = 'JUJUY' | 'SALTA';

export type DataSourceStatus =
  | 'available'
  | 'partial'
  | 'manual'
  | 'unavailable'
  | 'pending_validation';

export type ComplianceStatus =
  | 'compliant'
  | 'deviated'
  | 'pending_evaluation';

export type ModuleCategoryKey =
  | 'A_indicadores'
  | 'B_encuestas'
  | 'C_auditorias'
  | 'D_incentivos'
  | 'E_gestion_calidad'
  | 'F_personalizado';

export type DirectionModuleId =
  // A. Indicadores principales
  | 'ventas_os'
  | 'postventa_lvs'
  | 'lavado'
  | 'cumplimiento_objetivos'
  | 'evolucion_indicadores'
  | 'reclamos_ventas'
  | 'reclamos_postventa'
  // B. Encuestas y estudios (diferenciados, nunca mezclados)
  | 'encuestas_ssi'
  | 'club_ssi'
  | 'encuestas_csi'
  // C. Auditorías y cumplimiento
  | 'pcgc_ventas'
  | 'auditoria_iso'
  | 'auditoria_gams'
  // D. Incentivos
  | 'incentivos_ventas'
  | 'incentivos_postventa'
  // E. Gestión de Calidad (Planes integrados + Cierre de prioridades)
  | 'planes_accion_integrados'
  | 'proximos_pasos'
  // F. Contenido personalizado
  | 'evidencias_fotograficas'
  | 'conclusiones_ejecutivas'
  | 'pagina_personalizada';

export interface SurveyDisplaySubOptions {
  showGeneralSatisfaction: boolean;
  showRecommendation: boolean;
  showMarketComparison: boolean;
  showTop5Comparison: boolean;
  showDissatisfactionReasons: boolean;
}

export interface ModuleDefinition {
  id: DirectionModuleId;
  category: ModuleCategoryKey;
  label: string;
  shortLabel: string;
  description: string;
  defaultSourceType: DataSourceStatus;
  suggestedMonthly: boolean;
  suggestedQuarterly: boolean;
  estimatedPages: number;
}

export type ActionItemStatus = 'Pendiente' | 'En proceso' | 'Implementado' | 'Verificado';

export interface IntegratedActionItem {
  id: string;
  branch: 'JUJUY' | 'SALTA' | 'COMUN';
  deviationSummary: string;
  rootCause: string;
  correctiveAction: string;
  responsible: string;
  targetDate: string;
  status: ActionItemStatus;
  followUpNote: string;
  linkedSourcePlanId?: string;
  linkedSourcePlanNro?: string;
}

export interface IntegratedActionBlock {
  indicatorKey: string;
  indicatorLabel: string;
  visible: boolean;
  manuallyToggled?: boolean;
  layoutMode: 'compact' | 'expanded';
  sharedActionsForBothBranches: boolean;
  jujuyCompliance: ComplianceStatus;
  saltaCompliance: ComplianceStatus;
  overallCompliance: ComplianceStatus;
  jujuyAnalysis: string;
  saltaAnalysis: string;
  generalAnalysis: string;
  preventiveObservation: string;
  actions: IntegratedActionItem[];
  isInheritedPendingReview?: boolean;
}

export type PhotoLayoutPreset =
  | 'single_large'
  | 'two_comparative'
  | 'four_grid'
  | 'side_analysis'
  | 'screenshot_comment';

export interface ImageCropSettings {
  zoom: number; // 1 to 3
  offsetX: number; // -50 to 50 (%)
  offsetY: number; // -50 to 50 (%)
  fitMode: 'cover' | 'contain';
}

export interface ReportImageItem {
  id: string;
  src: string;
  originalName?: string;
  title: string;
  caption: string;
  analysisText: string;
  branchTag?: 'JUJUY' | 'SALTA' | 'GENERAL';
  crop: ImageCropSettings;
  alignment: 'left' | 'center' | 'right';
  showBorder: boolean;
  widthPercent: number;
}

export interface AuditChapterScore {
  id: string;
  chapter: string;
  scorePct: number | null;
  mandatoryDeviations: number;
  status: ComplianceStatus;
}

export interface AuditEntryData {
  id: string;
  auditType: 'PCGC' | 'ISO_9001' | 'GAMS' | 'OTRA';
  auditName: string;
  branch: 'JUJUY' | 'SALTA' | 'AMBAS';
  periodLabel: string;
  scoreResult: string;
  numericResult: number | null;
  targetScore: number | null;
  status: ComplianceStatus;
  auditStateLabel: 'Aprobada' | 'Con observaciones' | 'Desvío crítico' | 'Pendiente de auditoría' | 'En preparación';
  mandatoryDeviationsCount: number;
  pendingActionsCount: number;
  checklistRefCount?: number;
  chapters: AuditChapterScore[];
  mainDeviationsText: string;
  observationsText: string;
  isManualSource: boolean;
}

export interface IncentiveEntryData {
  id: string;
  branch: 'JUJUY' | 'SALTA';
  area: 'Ventas' | 'Postventa';
  indicatorName: string;
  currentResultText: string;
  scaleReached: string;
  applicablePctText: string;
  penaltyText: string;
  bonusText: string;
  estimatedAmountText: string;
  complianceStatus: ComplianceStatus;
  notes: string;
  isManualAmount: boolean;
}

export interface SurveyBenchmarkOverride {
  marketT2B: number | null;
  top5T2B: number | null;
  marketScore: number | null;
  targetScore: number | null;
  validatedForPeriod: boolean;
}

export interface ClosingPriorityItem {
  id: string;
  priorityNumber: number;
  title: string;
  areaAndBranch: string;
  KeyFinding: string;
  commitmentAction: string;
  responsible: string;
  deadline: string;
  decisionRequired: string;
  status: 'Prioridad Alta' | 'Seguimiento' | 'Decisión Dirección';
}

export interface CustomMetricCard {
  id: string;
  label: string;
  value: string;
  target: string;
  unit: string;
  branch: 'JUJUY' | 'SALTA' | 'GENERAL';
  compliance: ComplianceStatus;
  hint: string;
  isManual: boolean;
}

export interface CustomChartSeriesPoint {
  id: string;
  label: string;
  value: number;
  secondaryValue?: number;
  target?: number;
}

export interface CustomChartConfig {
  title: string;
  subtitle: string;
  chartType: 'bar' | 'line' | 'comparative';
  showTargetLine: boolean;
  targetValue: number | null;
  showValueLabels: boolean;
  unit: string;
  dataPoints: CustomChartSeriesPoint[];
}

export type ReportTemplateType =
  | 'cover' // Plantilla 1: Portada ejecutiva
  | 'executive_summary' // Plantilla 2: Resumen ejecutivo
  | 'indicator_evolution' // Plantilla 3: Indicadores y evolución (OS, LVS, Lavado) + Plan integrado
  | 'branch_comparison' // Plantilla 4: Comparación Jujuy / Salta
  | 'survey_study' // Plantilla 5: Encuestas SSI / CSI / Club SSI (separados) + Plan integrado
  | 'audits' // Plantilla 6: Auditorías (PCGC / ISO / GAMS) + Plan integrado
  | 'incentives' // Plantilla 7: Incentivos
  | 'analysis_causes' // Plantilla 8: Cumplimiento objetivos / Análisis y causas
  | 'claims_module' // Reclamos Ventas / Postventa + Plan integrado
  | 'action_plan_continuation' // Plantilla 9 / Continuación de Plan de Acción vinculado a indicador
  | 'photo_evidences' // Plantilla 10: Fotografías y evidencias
  | 'next_steps' // Plantilla 11: Cierre ejecutivo / 3 prioridades para Dirección
  | 'custom'; // Página personalizada desde cero

export type PageLayoutVariant =
  | 'balanced_split'
  | 'two_hero_kpis'
  | 'four_kpi_grid'
  | 'asymmetric_chart'
  | 'two_columns_analysis'
  | 'comparative_branches';

export interface ReportPage {
  id: string;
  templateType: ReportTemplateType;
  moduleId?: DirectionModuleId;
  linkedIndicatorKey?: string;
  continuationOfPageId?: string;
  title: string;
  subtitle: string;
  sectionTag: string;
  visible: boolean;
  exportSelected: boolean;
  layoutVariant: PageLayoutVariant;
  chartType?: 'bar' | 'line' | 'comparative';
  showChartTarget?: boolean;
  showChartLabels?: boolean;
  narrativeTitle: string;
  narrativeBody: string;
  secondaryNarrativeTitle?: string;
  secondaryNarrativeBody?: string;
  footerNote?: string;
  isInheritedPendingReview?: boolean;
  actionBlock?: IntegratedActionBlock;
  photoLayout?: PhotoLayoutPreset;
  images: ReportImageItem[];
  auditEntries?: AuditEntryData[];
  incentiveEntries?: IncentiveEntryData[];
  surveyProgram?: 'SSI' | 'CSI' | 'CLUB_SSI';
  surveyBenchmarkOverride?: SurveyBenchmarkOverride;
  closingPriorities?: ClosingPriorityItem[];
  customCards?: CustomMetricCard[];
  customChart?: CustomChartConfig;
}

export interface DirectionReportDocument {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  emittedDate: string;
  periodType: ReportPeriodType;
  year: number;
  month: string; // e.g., 'Septiembre'
  quarter: QuarterCode; // e.g., 'Q3'
  branchSelection: BranchSelection;
  enabledModules: DirectionModuleId[];
  surveySubOptions: SurveyDisplaySubOptions;
  pages: ReportPage[];
  duplicatedFromId?: string;
  duplicatedFromPeriod?: string;
}

export interface FavoriteReportPreset {
  id: string;
  name: string;
  description: string;
  periodType: ReportPeriodType;
  branchSelection: BranchSelection;
  enabledModules: DirectionModuleId[];
  surveySubOptions: SurveyDisplaySubOptions;
  createdAt: string;
}

// --- Computed Metrics Data Structures ---

export interface BranchIndicatorSnapshot {
  branch: 'JUJUY' | 'SALTA' | 'CONSOLIDADO';
  // OS de Marca (CEM OS)
  osScore: number | null;
  osTarget: number | null;
  osValidCount: number;
  osPatentedCount: number;
  osDeclaredCount: number;
  osResponseConversionPct: number | null;
  osCompliance: ComplianceStatus;
  // Encuesta Interna Ventas
  internalSalesOsScore: number | null;
  internalSalesTrato: number | null;
  internalSalesOrg: number | null;
  internalSalesAses: number | null;
  internalSalesDeliveryState: number | null;
  internalSalesCount: number;
  // Postventa LVS (CEM Postventa)
  lvsScore: number | null;
  lvsTarget: number | null;
  lvsValidCount: number;
  lvsTratoQ1: number | null;
  lvsOrgQ2: number | null;
  lvsReparacionQ3: number | null;
  lvsLavadoQ6: number | null;
  lvsRecomendacionQ7: number | null;
  lvsCompliance: ComplianceStatus;
  // Encuesta Interna Postventa
  internalPvService: number | null;
  internalPvTrato: number | null;
  internalPvOrg: number | null;
  internalPvWorkshop: number | null;
  internalPvLavado: number | null;
  internalPvCount: number;
  // Lavado consolidado (CEM Q6 + Interna)
  lavadoTarget: number | null;
  lavadoCompliance: ComplianceStatus;
  // Reclamos Ventas
  salesClaimsTotal: number;
  salesClaimsPending: number;
  salesClaimsResolved: number;
  salesClaimsAvgDelayDays: number | null;
  salesClaimsTopReasons: Array<{ name: string; value: number }>;
  // Reclamos Postventa
  pvClaimsTotal: number;
  pvClaimsUniqueOr: number;
  pvClaimsResolved: number;
  pvClaimsPending: number;
  pvClaimsResolutionRatePct: number | null;
  pvClaimsTopReasons: Array<{ name: string; value: number }>;
}

export interface SurveyStudyComputed {
  program: 'SSI' | 'CSI' | 'CLUB_SSI';
  sourceStatus: DataSourceStatus;
  periodMatchingMode: 'exact_period' | 'semester_or_year' | 'no_data';
  validSurveysCount: number;
  t2bCount: number;
  t2bPercent: number | null;
  satisfactionAvg: number | null;
  recommendationAvg: number | null;
  targetScore: number | null;
  compliance: ComplianceStatus;
  topDissatisfactionReasons: Array<{ name: string; value: number }>;
  byBranch: {
    JUJUY: {
      validCount: number;
      t2bPercent: number | null;
      satisfactionAvg: number | null;
      recommendationAvg: number | null;
      compliance: ComplianceStatus;
      topReasons: Array<{ name: string; value: number }>;
    };
    SALTA: {
      validCount: number;
      t2bPercent: number | null;
      satisfactionAvg: number | null;
      recommendationAvg: number | null;
      compliance: ComplianceStatus;
      topReasons: Array<{ name: string; value: number }>;
    };
  };
}

export interface EvolutionPoint {
  month: string;
  shortMonth: string;
  isPeriodMember: boolean;
  osConsolidated: number | null;
  osJujuy: number | null;
  osSalta: number | null;
  osTarget: number | null;
  lvsConsolidated: number | null;
  lvsJujuy: number | null;
  lvsSalta: number | null;
  lvsTarget: number | null;
  lavadoConsolidated: number | null;
  lavadoJujuy: number | null;
  lavadoSalta: number | null;
  salesClaimsConsolidated: number;
  salesClaimsJujuy: number;
  salesClaimsSalta: number;
  pvClaimsConsolidated: number;
  pvClaimsJujuy: number;
  pvClaimsSalta: number;
}

export interface RawDirectionDataSources {
  cemOs: CemOsRecord[];
  detailedQuality: DetailedQualityRecord[];
  qualityClaims: QualityRecord[];
  salesClaims: SalesClaimsRecord[];
  salesQuality: SalesQualityRecord[];
  internalPostventa: InternalPostventaRecord[];
  postventaKpis: PostventaKpiRecord[];
  actionPlans: ActionPlanRecord[];
  pcgcChecklist: PCGCRecord[];
  objectivesSummary: QualityObjectiveSummaryRecord[];
  objectivesScales: QualityObjectiveScaleRecord[];
  ssiSurveys: SatisfactionSurveyRecord[];
  csiSurveys: SatisfactionSurveyRecord[];
  clubSsiRecords: ClubSsiRecord[];
  failedSources: string[];
  loadedAt: string;
}

export interface ComputedDirectionReportData {
  periodLabel: string;
  periodShortLabel: string;
  monthsInPeriod: string[];
  monthsWithData: string[];
  isClosedPeriod: boolean;
  periodClosureStatusLabel: string;
  periodClosureDetail: string;
  consolidated: BranchIndicatorSnapshot;
  jujuy: BranchIndicatorSnapshot;
  salta: BranchIndicatorSnapshot;
  evolution: EvolutionPoint[];
  ssiStudy: SurveyStudyComputed;
  csiStudy: SurveyStudyComputed;
  clubSsiStudy: SurveyStudyComputed;
  moduleStatuses: Record<DirectionModuleId, {
    status: DataSourceStatus;
    badgeLabel: string;
    detail: string;
    recordCount: number;
  }>;
  matchingActionPlans: ActionPlanRecord[];
  pcgcSummary: {
    totalRequirements: number;
    byCriticidad: Array<{ name: string; value: number }>;
    byModulo: Array<{ name: string; value: number }>;
  };
  defaultIncentives: IncentiveEntryData[];
  objectivesMatrix: Array<{
    indicatorKey: string;
    area: 'Ventas' | 'Postventa';
    name: string;
    unit: string;
    targetValue: number | null;
    targetText: string;
    jujuyValue: number | null;
    saltaValue: number | null;
    consolidatedValue: number | null;
    jujuyStatus: ComplianceStatus;
    saltaStatus: ComplianceStatus;
    consolidatedStatus: ComplianceStatus;
  }>;
}
