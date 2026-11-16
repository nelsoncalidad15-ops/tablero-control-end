import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileSpreadsheet,
  FolderOpen,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { MONTHS, YEARS } from '../constants';
import {
  BranchSelection,
  ComputedDirectionReportData,
  DataSourceStatus,
  DirectionModuleId,
  DirectionReportDocument,
  FavoriteReportPreset,
  QuarterCode,
  RawDirectionDataSources,
  ReportPeriodType,
  SurveyDisplaySubOptions,
} from '../types/directionReport';
import {
  DIRECTION_MODULES,
  estimatePageCount,
  formatMetricAr,
  getSuggestedModules,
  MODULE_CATEGORIES,
  QUARTER_LABELS,
  QUARTER_MONTHS,
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
  onGenerateAndOpenEditor: () => void;
  onOpenExistingDraft: (draft: DirectionReportDocument) => void;
  onDuplicateExistingDraft: (draft: DirectionReportDocument) => void;
  onBackToReportCenter: () => void;
}

const SOURCE_STATUS_STYLE: Record<DataSourceStatus, { bg: string; text: string; dot: string }> = {
  available: {
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  partial: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    dot: 'bg-amber-500',
  },
  pending_validation: {
    bg: 'bg-sky-50 border-sky-200',
    text: 'text-[#0072CE]',
    dot: 'bg-[#0072CE]',
  },
  manual: {
    bg: 'bg-slate-100 border-slate-200',
    text: 'text-[#001E50]',
    dot: 'bg-[#001E50]',
  },
  unavailable: {
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
  },
};

export const DirectionReportConfig: React.FC<DirectionReportConfigProps> = ({
  reportName,
  periodType,
  year,
  month,
  quarter,
  branchSelection,
  enabledModules,
  surveySubOptions,
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
  onGenerateAndOpenEditor,
  onOpenExistingDraft,
  onDuplicateExistingDraft,
  onBackToReportCenter,
}) => {
  const [presets, setPresets] = useState<FavoriteReportPreset[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<DirectionReportDocument[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [showPresetForm, setShowPresetForm] = useState(false);

  useEffect(() => {
    void listFavoritePresets().then(setPresets);
    void listDirectionReportDrafts().then(setSavedDrafts);
  }, []);

  const toggleModule = (id: DirectionModuleId) => {
    if (enabledModules.includes(id)) {
      onChangeEnabledModules(enabledModules.filter(m => m !== id));
    } else {
      onChangeEnabledModules([...enabledModules, id]);
    }
  };

  const handleApplySuggested = (type: ReportPeriodType) => {
    onChangePeriodType(type);
    const suggested = getSuggestedModules(type, rawSources, year, quarter);
    onChangeEnabledModules(suggested);
  };

  const handleSaveFavoritePreset = async () => {
    if (!newPresetName.trim()) return;
    await saveFavoritePreset({
      name: newPresetName.trim(),
      description: `${periodType === 'monthly' ? 'Mensual' : 'Trimestral'} · ${enabledModules.length} módulos`,
      periodType,
      branchSelection,
      enabledModules,
      surveySubOptions,
    });
    setNewPresetName('');
    setShowPresetForm(false);
    setPresets(await listFavoritePresets());
  };

  const handleApplyPreset = (preset: FavoriteReportPreset) => {
    onChangePeriodType(preset.periodType);
    onChangeBranchSelection(preset.branchSelection);
    onChangeEnabledModules(preset.enabledModules);
    onChangeSurveySubOptions(preset.surveySubOptions);
  };

  const handleDeletePreset = async (id: string) => {
    await deleteFavoritePreset(id);
    setPresets(await listFavoritePresets());
  };

  const pageEstimation = estimatePageCount(enabledModules, branchSelection);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#001E50] font-sans pb-24">
      {/* Top Institutional Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-6 md:px-12 py-3.5">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onBackToReportCenter}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-2 text-[#5A6A85] transition hover:border-[#0072CE] hover:text-[#001E50]"
              title="Volver al Centro de Informes"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#001E50] text-xs font-black italic text-[#001E50]">
              VW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-[#001E50]">
                  Informe Ejecutivo para Dirección
                </span>
                <span className="rounded-md bg-[#001E50]/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0072CE]">
                  Paso 1 · Configuración
                </span>
              </div>
              <p className="text-[11px] text-[#5A6A85]">
                Definí el período, sucursales y módulos antes de componer el diseño A4 horizontal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5A6A85]">
                Estimación de extensión
              </span>
              <span className="text-xs font-extrabold text-[#001E50]">
                {pageEstimation.label} (A4 Horizontal)
              </span>
            </div>

            <button
              type="button"
              onClick={onGenerateAndOpenEditor}
              className="inline-flex items-center gap-2.5 rounded-xl bg-[#001E50] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-[#001E50]/20 transition hover:bg-[#0072CE]"
            >
              <span>Generar Diseño y Abrir Editor</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1480px] px-6 md:px-12 pt-8 space-y-8">
        {/* Source Warning if any failed */}
        {rawSources && rawSources.failedSources.length > 0 && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3.5 text-xs text-amber-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 font-semibold">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Algunas fuentes secundarias no respondieron ({rawSources.failedSources.join(', ')}). Podés continuar con el informe utilizando las fuentes disponibles y los bloques editables sin datos ficticios.
              </span>
            </div>
          </div>
        )}

        {/* STEP 1 & 2: PERIOD, BRANCHES & LIVE SNAPSHOT */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 8 Cols: Period Type, Year, Month/Quarter & Branch Selector */}
          <div className="lg:col-span-8 rounded-3xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-xs space-y-6">
            {/* Report Title */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0072CE]">
                Nombre identificatorio del informe
              </label>
              <input
                type="text"
                value={reportName}
                onChange={e => onChangeReportName(e.target.value)}
                placeholder="Ej: Informe Ejecutivo Dirección — Q3 2026"
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-[#F5F7FA] px-4 py-2.5 text-base font-extrabold text-[#001E50] outline-none transition focus:border-[#0072CE] focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              {/* 3.1 Tipo de Informe */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#001E50]">
                  <Calendar className="h-4 w-4 text-[#0072CE]" />
                  1. Tipo de Informe y Período
                </label>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleApplySuggested('monthly')}
                    className={`flex flex-col items-start rounded-2xl border-2 p-3.5 text-left transition ${
                      periodType === 'monthly'
                        ? 'border-[#001E50] bg-[#001E50] text-white shadow-md'
                        : 'border-slate-200 bg-[#F5F7FA] text-[#001E50] hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-extrabold uppercase tracking-wider">
                      Informe Mensual
                    </span>
                    <span
                      className={`mt-1 text-[11px] leading-snug ${
                        periodType === 'monthly' ? 'text-sky-200' : 'text-[#5A6A85]'
                      }`}
                    >
                      Seguimiento operativo de un mes específico
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplySuggested('quarterly')}
                    className={`flex flex-col items-start rounded-2xl border-2 p-3.5 text-left transition ${
                      periodType === 'quarterly'
                        ? 'border-[#001E50] bg-[#001E50] text-white shadow-md'
                        : 'border-slate-200 bg-[#F5F7FA] text-[#001E50] hover:border-slate-300'
                    }`}
                  >
                    <span className="text-xs font-extrabold uppercase tracking-wider">
                      Informe Trimestral
                    </span>
                    <span
                      className={`mt-1 text-[11px] leading-snug ${
                        periodType === 'quarterly' ? 'text-sky-200' : 'text-[#5A6A85]'
                      }`}
                    >
                      Consolidado real Q1, Q2, Q3 o Q4 sobre registros válidos
                    </span>
                  </button>
                </div>

                {/* Year & Month / Quarter Selectors */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A85] mb-1">
                      Año de Estudio
                    </span>
                    <select
                      aria-label="Año del informe"
                      value={year}
                      onChange={e => onChangeYear(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-[#001E50] outline-none focus:border-[#0072CE]"
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
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A85] mb-1">
                        Mes de Estudio
                      </span>
                      <select
                        aria-label="Mes del informe"
                        value={month}
                        onChange={e => onChangeMonth(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-[#001E50] outline-none focus:border-[#0072CE]"
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
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-[#5A6A85] mb-1">
                        Trimestre Consolidado
                      </span>
                      <select
                        aria-label="Trimestre del informe"
                        value={quarter}
                        onChange={e => onChangeQuarter(e.target.value as QuarterCode)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-[#001E50] outline-none focus:border-[#0072CE]"
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

              {/* 3.2 Selección de Sucursales */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#001E50]">
                  <Building2 className="h-4 w-4 text-[#0072CE]" />
                  2. Selección de Sucursales
                </label>

                <div className="space-y-2">
                  {[
                    {
                      id: 'BOTH' as BranchSelection,
                      title: 'Ambas Sucursales (Comparativo Jujuy / Salta)',
                      desc: 'Compara Jujuy (3059) y Salta (3087) y evalúa desvíos individualmente',
                    },
                    {
                      id: 'JUJUY' as BranchSelection,
                      title: 'Autosol Jujuy (CE 3059)',
                      desc: 'Informe exclusivo para la operación de Jujuy',
                    },
                    {
                      id: 'SALTA' as BranchSelection,
                      title: 'Autosol Salta (CE 3087)',
                      desc: 'Informe exclusivo para la operación de Salta',
                    },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChangeBranchSelection(opt.id)}
                      className={`w-full flex items-center justify-between rounded-xl border px-4 py-2.5 text-left transition ${
                        branchSelection === opt.id
                          ? 'border-[#0072CE] bg-sky-50/70 ring-1 ring-[#0072CE]'
                          : 'border-slate-200 bg-[#F5F7FA]/60 hover:bg-white'
                      }`}
                    >
                      <div>
                        <p className="text-xs font-extrabold text-[#001E50]">{opt.title}</p>
                        <p className="text-[10px] text-[#5A6A85]">{opt.desc}</p>
                      </div>
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          branchSelection === opt.id
                            ? 'border-[#0072CE] bg-[#0072CE] text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {branchSelection === opt.id && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right 4 Cols: Live Period Status & Automatic Indicators Preview */}
          <div className="lg:col-span-4 rounded-3xl border border-slate-200/90 bg-[#001E50] p-6 text-white flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-sky-300">
                  Diagnóstico del Período
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    computed.isClosedPeriod
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                  }`}
                >
                  {computed.isClosedPeriod ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )}
                  {computed.periodClosureStatusLabel}
                </span>
              </div>

              <h3 className="mt-3 text-2xl font-extrabold tracking-tight">
                {computed.periodLabel}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">
                {computed.periodClosureDetail}
              </p>

              {/* Quick Preview of Real Consolidated Metrics */}
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/12 pt-4">
                <div className="rounded-xl bg-white/8 p-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-sky-300 block">
                    OS Marca Consolidado
                  </span>
                  <p className="mt-1 text-xl font-extrabold tabular-nums">
                    {isLoadingData ? '...' : formatMetricAr(computed.consolidated.osScore)}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    J: {formatMetricAr(computed.jujuy.osScore)} · S: {formatMetricAr(computed.salta.osScore)}
                  </p>
                </div>

                <div className="rounded-xl bg-white/8 p-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-sky-300 block">
                    LVS Postventa (Q4)
                  </span>
                  <p className="mt-1 text-xl font-extrabold tabular-nums">
                    {isLoadingData ? '...' : formatMetricAr(computed.consolidated.lvsScore)}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    J: {formatMetricAr(computed.jujuy.lvsScore)} · S: {formatMetricAr(computed.salta.lvsScore)}
                  </p>
                </div>

                <div className="rounded-xl bg-white/8 p-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-sky-300 block">
                    Reclamos Período
                  </span>
                  <p className="mt-1 text-base font-extrabold tabular-nums">
                    {computed.consolidated.salesClaimsTotal} V · {computed.consolidated.pvClaimsTotal} PV
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {computed.consolidated.pvClaimsUniqueOr} OR únicas en taller
                  </p>
                </div>

                <div className="rounded-xl bg-white/8 p-3">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-sky-300 block">
                    Composición Estimada
                  </span>
                  <p className="mt-1 text-base font-extrabold text-sky-300">
                    {pageEstimation.label}
                  </p>
                  <p className="text-[10px] text-slate-300">
                    {enabledModules.length} módulos activos
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-white/12">
              <button
                type="button"
                onClick={onGenerateAndOpenEditor}
                className="w-full inline-flex items-center justify-between rounded-xl bg-[#0072CE] px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-white transition hover:bg-sky-500"
              >
                <span>Ingresar al Editor Visual</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* STEP 3: CONTENT SELECTION (GROUPS A - F) + SMART PRESETS */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <div className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0072CE]">
                <Layers className="h-3.5 w-3.5" />
                3. Selección Libre de Módulos e Indicadores
              </div>
              <h2 className="mt-1 text-xl font-extrabold text-[#001E50]">
                Marcá o desmarcá qué información incluirá el informe
              </h2>
              <p className="text-xs text-[#5A6A85]">
                El documento A4 se compondrá dinámicamente según tu selección, sin páginas vacías ni secciones forzadas.
              </p>
            </div>

            {/* Smart Presets & Favorites Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  onChangeEnabledModules(getSuggestedModules('monthly', rawSources, year, quarter))
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-[#F5F7FA] px-3 py-2 text-xs font-bold text-[#001E50] transition hover:border-[#0072CE] hover:bg-white"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#0072CE]" />
                Sugerida Mensual
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeEnabledModules(getSuggestedModules('quarterly', rawSources, year, quarter))
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-[#F5F7FA] px-3 py-2 text-xs font-bold text-[#001E50] transition hover:border-[#0072CE] hover:bg-white"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#0072CE]" />
                Sugerida Trimestral
              </button>
              <button
                type="button"
                onClick={() =>
                  onChangeEnabledModules(['ventas_os', 'postventa_lvs', 'planes_accion_integrados'])
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#5A6A85] hover:border-slate-300 hover:text-[#001E50]"
              >
                Síntesis Breve (OS + LVS)
              </button>
              <button
                type="button"
                onClick={() => setShowPresetForm(!showPresetForm)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#001E50] px-3 py-2 text-xs font-bold text-white hover:bg-[#0072CE]"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Guardar Favorita
              </button>
            </div>
          </div>

          {/* Save Favorite Configuration Form */}
          {showPresetForm && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 p-4">
              <input
                type="text"
                value={newPresetName}
                onChange={e => setNewPresetName(e.target.value)}
                placeholder="Nombre de la configuración favorita (ej: Cierre Trimestral Completo)..."
                className="flex-1 min-w-[240px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-[#001E50] outline-none"
              />
              <button
                type="button"
                onClick={handleSaveFavoritePreset}
                className="rounded-xl bg-[#0072CE] px-4 py-2 text-xs font-bold text-white hover:bg-[#001E50]"
              >
                Guardar configuración
              </button>
              <button
                type="button"
                onClick={() => setShowPresetForm(false)}
                className="text-xs font-semibold text-[#5A6A85] hover:text-[#001E50]"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* Saved Favorite Presets Pills */}
          {presets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5A6A85] mr-1">
                Favoritas guardadas:
              </span>
              {presets.map(preset => (
                <div
                  key={preset.id}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-[#F5F7FA] pl-3 pr-1.5 py-1 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="font-bold text-[#001E50] hover:text-[#0072CE] flex items-center gap-1"
                  >
                    <BookmarkCheck className="h-3.5 w-3.5 text-[#0072CE]" />
                    <span>{preset.name}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(preset.id)}
                    className="rounded p-1 text-slate-400 hover:text-red-600"
                    title="Eliminar configuración favorita"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Module Groups A through F */}
          <div className="space-y-8">
            {MODULE_CATEGORIES.map(category => {
              const catModules = DIRECTION_MODULES.filter(m => m.category === category.key);

              return (
                <div key={category.key} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#001E50] text-xs font-extrabold text-white">
                      {category.letter}
                    </span>
                    <div>
                      <h3 className="text-sm font-extrabold text-[#001E50]">{category.title}</h3>
                      <p className="text-[11px] text-[#5A6A85]">{category.subtitle}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {catModules.map(mod => {
                      const isChecked = enabledModules.includes(mod.id);
                      const modStatus = computed.moduleStatuses[mod.id] || {
                        status: mod.defaultSourceType,
                        badgeLabel: 'Disponible',
                        detail: '',
                        recordCount: 0,
                      };
                      const style = SOURCE_STATUS_STYLE[modStatus.status];

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
                          className={`group cursor-pointer rounded-2xl border p-4 transition select-none flex flex-col justify-between ${
                            isChecked
                              ? 'border-[#0072CE] bg-sky-50/40 ring-1 ring-[#0072CE] shadow-xs'
                              : 'border-slate-200 bg-[#F5F7FA]/50 hover:border-slate-300 hover:bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5">
                                <span
                                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                                    isChecked
                                      ? 'border-[#001E50] bg-[#001E50] text-white'
                                      : 'border-slate-300 bg-white'
                                  }`}
                                >
                                  {isChecked && <Check className="h-3.5 w-3.5" />}
                                </span>
                                <span className="text-xs font-extrabold text-[#001E50]">
                                  {mod.label}
                                </span>
                              </div>
                            </div>

                            <p className="mt-2 text-[11px] leading-relaxed text-[#5A6A85]">
                              {mod.description}
                            </p>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-200/60 pt-2.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold ${style.bg} ${style.text}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                              {modStatus.badgeLabel}
                            </span>
                            <span className="text-[10px] font-medium text-[#5A6A85] truncate max-w-[160px]">
                              {modStatus.detail}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sub-options for Group B (Encuestas SSI / CSI) */}
                  {category.key === 'B_encuestas' &&
                    (enabledModules.includes('encuestas_ssi') ||
                      enabledModules.includes('encuestas_csi') ||
                      enabledModules.includes('club_ssi')) && (
                      <div className="mt-2 rounded-2xl border border-slate-200 bg-[#F5F7FA] p-4">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#001E50] mb-2.5">
                          Métricas a visualizar dentro de las láminas de Encuestas (SSI / CSI):
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { key: 'showGeneralSatisfaction' as const, label: 'Satisfacción general' },
                            { key: 'showRecommendation' as const, label: 'Recomendación' },
                            { key: 'showMarketComparison' as const, label: 'Comparación Media de Mercado' },
                            { key: 'showTop5Comparison' as const, label: 'Comparación Top 5' },
                            { key: 'showDissatisfactionReasons' as const, label: 'Principales motivos de insatisfacción' },
                          ].map(sub => (
                            <label
                              key={sub.key}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#001E50] cursor-pointer"
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
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick Access to Existing Drafts to Open or Duplicate */}
        {savedDrafts.length > 0 && (
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <FolderOpen className="h-5 w-5 text-[#0072CE]" />
                <div>
                  <h3 className="text-base font-extrabold text-[#001E50]">
                    Reutilizar o Duplicar un Informe Anterior
                  </h3>
                  <p className="text-xs text-[#5A6A85]">
                    Al duplicar un informe anterior se conserva todo su diseño e imágenes, se actualizan los indicadores automáticos al nuevo período y los textos manuales quedan marcados para revisión.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {savedDrafts.slice(0, 6).map(d => (
                <div
                  key={d.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-[#F5F7FA]/60 p-4"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-[#001E50] truncate">{d.name}</p>
                    <p className="text-[10px] text-[#5A6A85]">
                      {d.periodType === 'monthly' ? `${d.month} ${d.year}` : `${d.quarter} ${d.year}`} ·{' '}
                      {d.pages.filter(p => p.visible).length} págs.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenExistingDraft(d)}
                      className="rounded-lg bg-[#001E50] px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-[#0072CE]"
                    >
                      Abrir
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicateExistingDraft(d)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-[#001E50] hover:border-[#0072CE]"
                    >
                      <Copy className="h-3 w-3 text-[#0072CE]" />
                      Duplicar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
