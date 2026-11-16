import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  FolderOpen,
  Layers,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { MONTHS, YEARS } from '../constants';
import {
  BranchSelection,
  ComputedDirectionReportData,
  DirectionModuleId,
  DirectionReportDocument,
  DirectionTargets,
  FavoriteReportPreset,
  QuarterCode,
  RawDirectionDataSources,
  ReportPeriodType,
  SurveyDisplaySubOptions,
} from '../types/directionReport';
import {
  DEFAULT_DIRECTION_TARGETS,
  estimatePageCount,
  formatMetricAr,
  getSuggestedModules,
  QUARTER_LABELS,
} from '../services/directionReportData';
import {
  deleteFavoritePreset,
  listDirectionReportDrafts,
  listFavoritePresets,
  saveFavoritePreset,
} from '../services/directionReportDrafts';

interface DirectionReportConfigProps {
  reportName: string;
  periodType: ReportPeriodType;
  year: number;
  month: string;
  quarter: QuarterCode;
  branchSelection: BranchSelection;
  enabledModules: DirectionModuleId[];
  surveySubOptions: SurveyDisplaySubOptions;
  targets: DirectionTargets;
  computed: ComputedDirectionReportData;
  rawSources: RawDirectionDataSources | null;
  isLoadingData: boolean;
  onChangeReportName: (name: string) => void;
  onChangePeriodType: (type: ReportPeriodType) => void;
  onChangeYear: (year: number) => void;
  onChangeMonth: (month: string) => void;
  onChangeQuarter: (quarter: QuarterCode) => void;
  onChangeBranchSelection: (branch: BranchSelection) => void;
  onChangeEnabledModules: (modules: DirectionModuleId[]) => void;
  onChangeSurveySubOptions: (opts: SurveyDisplaySubOptions) => void;
  onChangeTargets: (targets: DirectionTargets) => void;
  onGenerateAndOpenEditor: () => void;
  onOpenExistingDraft: (draft: DirectionReportDocument) => void;
  onDuplicateExistingDraft: (draft: DirectionReportDocument) => void;
  onBackToReportCenter: () => void;
}

interface CleanModuleItem {
  id: DirectionModuleId;
  label: string;
  shortDesc: string;
  group: 'principales' | 'estudios' | 'auditorias' | 'gestion';
  tag: string;
}

const CLEAN_MODULE_LIST: CleanModuleItem[] = [
  // Principales
  {
    id: 'ventas_os',
    label: 'OS de Marca — Ventas (CEM)',
    shortDesc: 'Calificación oficial CEM, cumplimiento y evolución',
    group: 'principales',
    tag: 'Ventas',
  },
  {
    id: 'postventa_lvs',
    label: 'LVS Satisfacción — Postventa',
    shortDesc: 'Índice de satisfacción oficial, evolución y desvíos',
    group: 'principales',
    tag: 'Postventa',
  },
  {
    id: 'lavado',
    label: 'Calidad de Lavado y Entrega (CEM Q6)',
    shortDesc: 'Calificación de entrega y acondicionamiento',
    group: 'principales',
    tag: 'Postventa',
  },
  {
    id: 'evolucion_indicadores',
    label: 'Evolución Anual Comparativa',
    shortDesc: 'Histórico mes a mes con escala desde 4,5',
    group: 'principales',
    tag: 'Consolidado',
  },
  {
    id: 'cumplimiento_objetivos',
    label: 'Cumplimiento de Objetivos',
    shortDesc: 'Semáforo de cumplimiento vs metas de marca',
    group: 'principales',
    tag: 'Consolidado',
  },

  // Gestión de Calidad
  {
    id: 'planes_accion_integrados',
    label: 'Planes de Acción por Indicador',
    shortDesc: 'Causas raíz y acciones correctivas en hoja dedicada',
    group: 'gestion',
    tag: 'Calidad',
  },
  {
    id: 'proximos_pasos',
    label: 'Cierre Institucional / Fin de Informe',
    shortDesc: 'Carátula de cierre, conformidad de Dirección y firmas',
    group: 'gestion',
    tag: 'Dirección',
  },
  {
    id: 'evidencias_fotograficas',
    label: 'Fotografías y Evidencias',
    shortDesc: 'Lámina visual para fotos, auditorías o capturas',
    group: 'gestion',
    tag: 'Evidencias',
  },

  // Estudios de Red
  {
    id: 'encuestas_ssi',
    label: 'Estudio SSI (Ventas VW)',
    shortDesc: 'Satisfacción y recomendación de red oficial',
    group: 'estudios',
    tag: 'Red VW',
  },
  {
    id: 'encuestas_csi',
    label: 'Estudio CSI (Postventa VW)',
    shortDesc: 'Satisfacción oficial de clientes de taller',
    group: 'estudios',
    tag: 'Red VW',
  },
  {
    id: 'club_ssi',
    label: 'Club SSI Especial',
    shortDesc: 'Módulo de fidelización y seguimiento exclusivo',
    group: 'estudios',
    tag: 'Red VW',
  },

  // Auditorías e Incentivos
  {
    id: 'pcgc_ventas',
    label: 'Auditoría PCGC (Ventas / PV)',
    shortDesc: 'Cumplimiento por capítulos y desvíos mandatorios',
    group: 'auditorias',
    tag: 'Auditoría',
  },
  {
    id: 'auditoria_iso',
    label: 'Auditoría ISO 9001',
    shortDesc: 'Resultados y hallazgos del sistema de gestión',
    group: 'auditorias',
    tag: 'Calidad',
  },
  {
    id: 'auditoria_gams',
    label: 'Auditoría GAMS / Garantías',
    shortDesc: 'Evaluación de procesos de garantía y taller',
    group: 'auditorias',
    tag: 'Postventa',
  },
  {
    id: 'incentivos_ventas',
    label: 'Incentivos de Ventas',
    shortDesc: 'Resumen de cumplimiento de escalas y bonus',
    group: 'auditorias',
    tag: 'Comercial',
  },
  {
    id: 'incentivos_postventa',
    label: 'Incentivos de Postventa',
    shortDesc: 'Resumen de escala y liquidación de taller',
    group: 'auditorias',
    tag: 'Comercial',
  },
];

export const DirectionReportConfig: React.FC<DirectionReportConfigProps> = ({
  reportName,
  periodType,
  year,
  month,
  quarter,
  branchSelection,
  enabledModules,
  surveySubOptions,
  targets,
  computed,
  rawSources,
  isLoadingData,
  onChangeReportName,
  onChangePeriodType,
  onChangeYear,
  onChangeMonth,
  onChangeQuarter,
  onChangeBranchSelection,
  onChangeEnabledModules,
  onChangeSurveySubOptions,
  onChangeTargets,
  onGenerateAndOpenEditor,
  onOpenExistingDraft,
  onDuplicateExistingDraft,
  onBackToReportCenter,
}) => {
  const [showTargetsModal, setShowTargetsModal] = useState(false);
  const [showDraftsSection, setShowDraftsSection] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<DirectionReportDocument[]>([]);
  const [activeTab, setActiveTab] = useState<'principales' | 'todos'>('principales');

  useEffect(() => {
    void listDirectionReportDrafts().then(setSavedDrafts);
  }, []);

  const toggleModule = (id: DirectionModuleId) => {
    if (enabledModules.includes(id)) {
      onChangeEnabledModules(enabledModules.filter(m => m !== id));
    } else {
      onChangeEnabledModules([...enabledModules, id]);
    }
  };

  // Preset Shortcuts
  const applyPresetMinimal = () => {
    onChangeEnabledModules([
      'ventas_os',
      'postventa_lvs',
      'lavado',
      'evolucion_indicadores',
      'planes_accion_integrados',
      'proximos_pasos',
    ]);
  };

  const applyPresetOfficial = () => {
    onChangeEnabledModules(getSuggestedModules(periodType, rawSources, year, quarter));
  };

  const applyPresetComplete = () => {
    onChangeEnabledModules([
      'ventas_os',
      'postventa_lvs',
      'lavado',
      'evolucion_indicadores',
      'encuestas_ssi',
      'encuestas_csi',
      'pcgc_ventas',
      'planes_accion_integrados',
      'proximos_pasos',
      'evidencias_fotograficas',
    ]);
  };

  const pageEstimation = estimatePageCount(enabledModules, branchSelection);

  const displayedModules =
    activeTab === 'principales'
      ? CLEAN_MODULE_LIST.filter(m => m.group === 'principales' || m.group === 'gestion')
      : CLEAN_MODULE_LIST;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#001E50] font-sans pb-28">
      {/* Top Institutional Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToReportCenter}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 text-[#5A6A85] transition hover:border-[#0072CE] hover:text-[#001E50]"
              title="Volver"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#001E50] text-xs font-black text-white">
              VW
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-extrabold text-[#001E50]">
                Nuevo Informe para Dirección
              </h1>
              <p className="text-[11px] text-[#5A6A85]">
                Configuración rápida · A4 Horizontal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline-block rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-[#5A6A85]">
              {pageEstimation.label}
            </span>

            <button
              type="button"
              onClick={onGenerateAndOpenEditor}
              className="inline-flex items-center gap-2 rounded-xl bg-[#001E50] px-4 sm:px-5 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#001E50]/15 transition hover:bg-[#0072CE]"
            >
              <span>Generar Informe</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-5xl px-4 sm:px-8 pt-6 space-y-6">
        {/* BLOQUE 1: PERÍODO Y SUCURSAL */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-[#0072CE]" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#001E50]">
                1. Período y Concesionario
              </h2>
            </div>
            {/* Period Status Badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                computed.isClosedPeriod
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              <Clock className="h-3 w-3" />
              {computed.periodClosureStatusLabel}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Modalidad: Mensual vs Trimestral */}
            <div className="space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5A6A85]">
                Tipo de Período
              </label>

              {/* Segmented Control */}
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => onChangePeriodType('monthly')}
                  className={`rounded-lg py-2 text-xs font-extrabold transition ${
                    periodType === 'monthly'
                      ? 'bg-white text-[#001E50] shadow-xs'
                      : 'text-[#5A6A85] hover:text-[#001E50]'
                  }`}
                >
                  Mensual
                </button>
                <button
                  type="button"
                  onClick={() => onChangePeriodType('quarterly')}
                  className={`rounded-lg py-2 text-xs font-extrabold transition ${
                    periodType === 'quarterly'
                      ? 'bg-white text-[#001E50] shadow-xs'
                      : 'text-[#5A6A85] hover:text-[#001E50]'
                  }`}
                >
                  Trimestral
                </button>
              </div>

              {/* Selectores Año y Mes/Trimestre */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-[#5A6A85] mb-1">
                    Año
                  </label>
                  <select
                    aria-label="Año del informe"
                    value={year}
                    onChange={e => onChangeYear(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#001E50] outline-none focus:border-[#0072CE] focus:bg-white"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>
                        Año {y}
                      </option>
                    ))}
                  </select>
                </div>

                {periodType === 'monthly' ? (
                  <div>
                    <label className="block text-[10px] font-bold text-[#5A6A85] mb-1">
                      Mes
                    </label>
                    <select
                      aria-label="Mes del informe"
                      value={month}
                      onChange={e => onChangeMonth(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#001E50] outline-none focus:border-[#0072CE] focus:bg-white"
                    >
                      {MONTHS.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-[#5A6A85] mb-1">
                      Trimestre
                    </label>
                    <select
                      aria-label="Trimestre del informe"
                      value={quarter}
                      onChange={e => onChangeQuarter(e.target.value as QuarterCode)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-[#001E50] outline-none focus:border-[#0072CE] focus:bg-white"
                    >
                      {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterCode[]).map(q => (
                        <option key={q} value={q}>
                          {QUARTER_LABELS[q]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Sucursales */}
            <div className="space-y-3">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5A6A85]">
                Concesionario
              </label>

              <div className="space-y-2">
                {[
                  {
                    id: 'BOTH' as BranchSelection,
                    label: 'Ambas Sucursales',
                    desc: 'Jujuy (3059) y Salta (3087) por separado',
                  },
                  {
                    id: 'JUJUY' as BranchSelection,
                    label: 'Autosol Jujuy',
                    desc: 'Concesionario 3059 únicamente',
                  },
                  {
                    id: 'SALTA' as BranchSelection,
                    label: 'Autosol Salta',
                    desc: 'Concesionario 3087 únicamente',
                  },
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => onChangeBranchSelection(b.id)}
                    className={`w-full flex items-center justify-between rounded-xl border px-3.5 py-2 text-left transition ${
                      branchSelection === b.id
                        ? 'border-[#0072CE] bg-sky-50/70 text-[#001E50] ring-1 ring-[#0072CE]'
                        : 'border-slate-200 bg-slate-50/50 text-[#5A6A85] hover:bg-white hover:text-[#001E50]'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-extrabold">{b.label}</p>
                      <p className="text-[10px] text-slate-400">{b.desc}</p>
                    </div>
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        branchSelection === b.id
                          ? 'border-[#0072CE] bg-[#0072CE] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {branchSelection === b.id && <Check className="h-2.5 w-2.5" />}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Nombre identificatorio */}
          <div className="border-t border-slate-100 pt-3">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A85] mb-1">
              Título del Informe
            </label>
            <input
              type="text"
              value={reportName}
              onChange={e => onChangeReportName(e.target.value)}
              placeholder="Ej: Informe Ejecutivo Dirección"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-bold text-[#001E50] outline-none focus:border-[#0072CE] focus:bg-white"
            />
          </div>
        </section>

        {/* BLOQUE 2: CONTENIDO DEL INFORME (SELECCIÓN RÁPIDA Y LIMPIA) */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#0072CE]" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#001E50]">
                  2. Contenido a Incluir en el Informe
                </h2>
              </div>
              <p className="text-[11px] text-[#5A6A85] mt-0.5">
                Activá los módulos que querés mostrar. El informe se compondrá automáticamente.
              </p>
            </div>

            {/* Accesos rápidos minimalistas */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={applyPresetMinimal}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-[#001E50] hover:bg-white hover:border-[#0072CE] transition"
              >
                <Sparkles className="h-3 w-3 text-[#0072CE]" />
                Recomendado Dirección
              </button>
              <button
                type="button"
                onClick={applyPresetComplete}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-[#5A6A85] hover:bg-white hover:text-[#001E50] transition"
              >
                Completo
              </button>
            </div>
          </div>

          {/* Filtro Principales vs Todos */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('principales')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                activeTab === 'principales'
                  ? 'bg-[#001E50] text-white'
                  : 'bg-slate-100 text-[#5A6A85] hover:text-[#001E50]'
              }`}
            >
              Módulos Principales ({CLEAN_MODULE_LIST.filter(m => m.group === 'principales' || m.group === 'gestion').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('todos')}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                activeTab === 'todos'
                  ? 'bg-[#001E50] text-white'
                  : 'bg-slate-100 text-[#5A6A85] hover:text-[#001E50]'
              }`}
            >
              Todos los Módulos ({CLEAN_MODULE_LIST.length})
            </button>
          </div>

          {/* Grilla compacta de módulos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {displayedModules.map(mod => {
              const isChecked = enabledModules.includes(mod.id);
              return (
                <div
                  key={mod.id}
                  onClick={() => toggleModule(mod.id)}
                  role="checkbox"
                  aria-checked={isChecked}
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleModule(mod.id);
                    }
                  }}
                  className={`cursor-pointer rounded-xl border p-3 transition select-none flex items-start gap-2.5 ${
                    isChecked
                      ? 'border-[#0072CE] bg-sky-50/50 ring-1 ring-[#0072CE]/60'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                      isChecked
                        ? 'border-[#001E50] bg-[#001E50] text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isChecked && <Check className="h-3 w-3" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <p className="text-xs font-bold text-[#001E50] truncate">{mod.label}</p>
                      <span className="shrink-0 rounded px-1.5 py-0.2 bg-slate-100 text-[9px] font-semibold text-slate-500">
                        {mod.tag}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#5A6A85] line-clamp-1 mt-0.5">{mod.shortDesc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sub-opciones de Encuestas SSI / CSI si están activas */}
          {(enabledModules.includes('encuestas_ssi') || enabledModules.includes('encuestas_csi')) && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#001E50] mb-2">
                Métricas visibles en Encuestas de Red:
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { key: 'showGeneralSatisfaction' as const, label: 'Satisfacción general' },
                  { key: 'showRecommendation' as const, label: 'Recomendación' },
                  { key: 'showMarketComparison' as const, label: 'Media de Mercado' },
                  { key: 'showTop5Comparison' as const, label: 'Top 5' },
                ].map(sub => (
                  <label
                    key={sub.key}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-[#001E50] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={surveySubOptions[sub.key]}
                      onChange={e =>
                        onChangeSurveySubOptions({
                          ...surveySubOptions,
                          [sub.key]: e.target.checked,
                        })
                      }
                      className="rounded text-[#001E50]"
                    />
                    <span>{sub.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* BLOQUE 3: OBJETIVOS DE MARCA (COLAPSABLE / MINIMALISTA) */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div
            onClick={() => setShowTargetsModal(!showTargetsModal)}
            className="flex items-center justify-between cursor-pointer select-none"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-[#0072CE]" />
              <div>
                <span className="text-xs font-bold text-[#001E50]">
                  Metas y Objetivos Oficiales de Marca
                </span>
                <span className="ml-2 text-[11px] text-[#5A6A85] hidden sm:inline">
                  (OS ≥ {targets.os ?? 4.6} · LVS ≥ {targets.lvs ?? 4.8} · Lavado ≥ {targets.lavado ?? 4.5})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0072CE]">
              <span>{showTargetsModal ? 'Ocultar' : 'Ajustar metas'}</span>
              {showTargetsModal ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </div>

          {showTargetsModal && (
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold text-[#5A6A85] block">CEM OS Ventas</span>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    max="5"
                    value={targets.os ?? ''}
                    onChange={e =>
                      onChangeTargets({
                        ...targets,
                        os: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-[#001E50]"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Oficial: ≥ 4.60</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold text-[#5A6A85] block">CEM LVS Postventa</span>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    max="5"
                    value={targets.lvs ?? ''}
                    onChange={e =>
                      onChangeTargets({
                        ...targets,
                        lvs: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-[#001E50]"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Oficial: ≥ 4.80</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold text-[#5A6A85] block">Calidad Lavado Q6</span>
                  <input
                    type="number"
                    step="0.05"
                    min="1"
                    max="5"
                    value={targets.lavado ?? ''}
                    onChange={e =>
                      onChangeTargets({
                        ...targets,
                        lavado: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-[#001E50]"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Oficial: ≥ 4.50</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold text-[#5A6A85] block">Estudio SSI Ventas</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={targets.ssi ?? ''}
                    onChange={e =>
                      onChangeTargets({
                        ...targets,
                        ssi: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-[#001E50]"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Oficial: ≥ 8.80</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <span className="text-[10px] font-bold text-[#5A6A85] block">Estudio CSI Postventa</span>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={targets.csi ?? ''}
                    onChange={e =>
                      onChangeTargets({
                        ...targets,
                        csi: e.target.value === '' ? null : Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-[#001E50]"
                  />
                  <span className="text-[9px] text-slate-400 block mt-0.5">Oficial: ≥ 8.80</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onChangeTargets(DEFAULT_DIRECTION_TARGETS)}
                  className="text-xs font-bold text-[#0072CE] hover:underline"
                >
                  Restablecer valores oficiales estándar
                </button>
              </div>
            </div>
          )}
        </section>

        {/* BORRADORES ANTERIORES (COMPACTO Y COLAPSABLE) */}
        {savedDrafts.length > 0 && (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div
              onClick={() => setShowDraftsSection(!showDraftsSection)}
              className="flex items-center justify-between cursor-pointer select-none"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-[#5A6A85]" />
                <span className="text-xs font-bold text-[#001E50]">
                  Borradores e Informes Guardados ({savedDrafts.length})
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#5A6A85]">
                <span>{showDraftsSection ? 'Ocultar' : 'Ver borradores'}</span>
                {showDraftsSection ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>

            {showDraftsSection && (
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {savedDrafts.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#001E50] truncate">{d.name}</p>
                      <p className="text-[10px] text-slate-500">
                        {d.periodType === 'monthly' ? `${d.month} ${d.year}` : `${d.quarter} ${d.year}`} ·{' '}
                        {d.pages.filter(p => p.visible).length} págs.
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenExistingDraft(d)}
                        className="rounded-lg bg-[#001E50] px-2 py-1 text-[10px] font-bold text-white hover:bg-[#0072CE]"
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicateExistingDraft(d)}
                        className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:text-[#001E50]"
                        title="Duplicar"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      {/* Floating Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 backdrop-blur-md px-4 py-3 shadow-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-[#001E50] truncate">
              {reportName}
            </p>
            <p className="text-[11px] text-[#5A6A85] truncate">
              {periodType === 'monthly' ? `${month} ${year}` : `${QUARTER_LABELS[quarter]} ${year}`} ·{' '}
              {branchSelection === 'BOTH'
                ? 'Ambas Sucursales'
                : branchSelection === 'JUJUY'
                  ? 'Autosol Jujuy'
                  : 'Autosol Salta'}{' '}
              · Extensión estimada: {pageEstimation.label} ({enabledModules.length} módulos)
            </p>
          </div>

          <button
            type="button"
            onClick={onGenerateAndOpenEditor}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#001E50] px-6 py-2.5 text-xs font-extrabold text-white shadow-md shadow-[#001E50]/20 transition hover:bg-[#0072CE]"
          >
            <span>Generar y Abrir Editor</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
