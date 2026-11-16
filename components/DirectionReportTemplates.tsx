import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  EyeOff,
  FileCheck2,
  Link2,
  Maximize2,
  Minimize2,
  Plus,
  ShieldAlert,
  SplitSquareVertical,
  Trash2,
} from 'lucide-react';
import BrandMark from './BrandMark';
import { ActionPlanRecord } from '../types';
import {
  ActionItemStatus,
  AuditEntryData,
  BranchSelection,
  ClosingPriorityItem,
  ComplianceStatus,
  ComputedDirectionReportData,
  DirectionReportDocument,
  IncentiveEntryData,
  IntegratedActionBlock,
  IntegratedActionItem,
  ReportPage,
  SurveyDisplaySubOptions,
} from '../types/directionReport';
import {
  evaluateCompliance,
  formatMetricAr,
} from '../services/directionReportData';
import { DirectionReportImageBlock } from './DirectionReportImageBlock';

// --- Design Tokens (Volkswagen & Autosol Corporate Identity) ---
export const VW_COLORS = {
  navy: '#001E50',
  blue: '#0072CE',
  sky: '#38BDF8',
  bgLight: '#F5F7FA',
  textSecondary: '#5A6A85',
  compliantText: '#15803D',
  compliantBg: '#F0FDF4',
  compliantBorder: '#BBF7D0',
  warningText: '#B45309',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  deviatedText: '#B91C1C',
  deviatedBg: '#FEF2F2',
  deviatedBorder: '#FECACA',
};

// --- Compliance Status Badge ---
export const ComplianceBadge: React.FC<{
  status: ComplianceStatus;
  compact?: boolean;
  customLabel?: string;
}> = ({ status, compact = false, customLabel }) => {
  if (status === 'compliant') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] font-bold uppercase tracking-wider text-[#15803D] ${
          compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
        }`}
      >
        <CheckCircle2 className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {customLabel || 'Cumple objetivo'}
      </span>
    );
  }

  if (status === 'deviated') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#FECACA] bg-[#FEF2F2] font-bold uppercase tracking-wider text-[#B91C1C] ${
          compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
        }`}
      >
        <AlertTriangle className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        {customLabel || 'Desvío vs. objetivo'}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 font-bold uppercase tracking-wider text-[#5A6A85] ${
        compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
      }`}
    >
      <Clock className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      {customLabel || 'Pendiente de evaluación'}
    </span>
  );
};

// --- Inherited Block Warning Banner (Shown when report is duplicated for a new period) ---
export const InheritedReviewBanner: React.FC<{
  isInherited?: boolean;
  isPrintMode?: boolean;
  onConfirmReview: () => void;
}> = ({ isInherited, isPrintMode, onConfirmReview }) => {
  if (!isInherited || isPrintMode) return null;
  return (
    <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900">
      <div className="flex items-center gap-2 font-semibold">
        <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
        <span>
          Texto o plan heredado de un período anterior · Revisá y actualizá antes de confirmar.
        </span>
      </div>
      <button
        type="button"
        onClick={onConfirmReview}
        className="inline-flex items-center gap-1 rounded-md bg-amber-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-amber-800 shrink-0"
      >
        <Check className="h-3 w-3" />
        Confirmar bloque
      </button>
    </div>
  );
};

// --- INTEGRATED ACTION PLAN BLOCK (INDICADOR -> RESULTADO -> DESVÍO -> CAUSA -> PLAN DE ACCIÓN) ---

interface IntegratedActionSectionProps {
  block: IntegratedActionBlock;
  branchSelection: BranchSelection;
  matchingPlans: ActionPlanRecord[];
  isPrintMode?: boolean;
  quickEditMode?: boolean;
  onUpdateBlock: (nextBlock: IntegratedActionBlock) => void;
  onSplitToContinuationPage?: () => void;
}

export const IntegratedIndicatorActionSection: React.FC<IntegratedActionSectionProps> = ({
  block,
  branchSelection,
  matchingPlans,
  isPrintMode = false,
  onUpdateBlock,
  onSplitToContinuationPage,
}) => {
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [showPreventiveInput, setShowPreventiveInput] = useState(Boolean(block.preventiveObservation));

  const jujuyDeviated = block.jujuyCompliance === 'deviated';
  const saltaDeviated = block.saltaCompliance === 'deviated';
  const hasDeviation =
    branchSelection === 'JUJUY'
      ? jujuyDeviated
      : branchSelection === 'SALTA'
        ? saltaDeviated
        : jujuyDeviated || saltaDeviated || block.overallCompliance === 'deviated';

  const isPendingEval =
    !hasDeviation &&
    (block.overallCompliance === 'pending_evaluation' ||
      (branchSelection === 'JUJUY' && block.jujuyCompliance === 'pending_evaluation') ||
      (branchSelection === 'SALTA' && block.saltaCompliance === 'pending_evaluation'));

  const hasDocumentedActions = block.actions.some(
    a => Boolean(a.correctiveAction.trim() || a.rootCause.trim())
  );

  // Filter plans from Google Sheets relevant to this indicator
  const relevantSheetPlans = matchingPlans.filter(p => p.isPlan);

  const handleAddActionRow = (defaultBranch: 'JUJUY' | 'SALTA' | 'COMUN') => {
    const newItem: IntegratedActionItem = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      branch: defaultBranch,
      deviationSummary: '',
      rootCause: '',
      correctiveAction: '',
      responsible: '',
      targetDate: '',
      status: 'En proceso',
      followUpNote: '',
    };
    onUpdateBlock({
      ...block,
      visible: true,
      manuallyToggled: true,
      actions: [...block.actions, newItem],
    });
  };

  const handleLinkSheetPlan = (plan: ActionPlanRecord) => {
    const pBranch = String(plan.provincia || '').toUpperCase();
    const branchTag: 'JUJUY' | 'SALTA' | 'COMUN' = pBranch.includes('JUJUY')
      ? 'JUJUY'
      : pBranch.includes('SALTA')
        ? 'SALTA'
        : 'COMUN';

    const linkedItem: IntegratedActionItem = {
      id: `act-linked-${plan.id}-${Date.now()}`,
      branch: branchTag,
      deviationSummary: plan.situacion_actual_cualitativo || plan.nombre_kpi || '',
      rootCause: plan.causa_raiz || '',
      correctiveAction: plan.accion_correctiva || plan.accion_inmediata || '',
      responsible: plan.responsable || plan.sector || '',
      targetDate: plan.fecha_inicio_est || plan.finalizacion_real || '',
      status: plan.verificacion_eficacia ? 'Verificado' : 'En proceso',
      followUpNote: '',
      linkedSourcePlanId: plan.id,
      linkedSourcePlanNro: plan.nro,
    };

    // Replace empty placeholder row if there's only 1 empty row, otherwise append
    const hasOnlyEmptyRow =
      block.actions.length === 1 &&
      !block.actions[0].rootCause.trim() &&
      !block.actions[0].correctiveAction.trim();

    onUpdateBlock({
      ...block,
      visible: true,
      actions: hasOnlyEmptyRow ? [linkedItem] : [...block.actions, linkedItem],
    });
    setShowPlanPicker(false);
  };

  const updateActionItem = (id: string, patch: Partial<IntegratedActionItem>) => {
    onUpdateBlock({
      ...block,
      actions: block.actions.map(item => (item.id === id ? { ...item, ...patch } : item)),
    });
  };

  const removeActionItem = (id: string) => {
    onUpdateBlock({
      ...block,
      actions: block.actions.filter(item => item.id !== id),
    });
  };

  // CASE 1: Indicator is Compliant and user has not manually opened the action block
  if (!hasDeviation && !block.visible) {
    return (
      <div className="mt-auto pt-2">
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${
            isPendingEval
              ? 'border-slate-200 bg-[#F5F7FA]'
              : 'border-[#BBF7D0] bg-[#F0FDF4]/80'
          }`}
        >
          <div className="flex items-center gap-3">
            <ComplianceBadge status={isPendingEval ? 'pending_evaluation' : 'compliant'} />
            <span className="text-xs font-semibold text-[#001E50]">
              {isPendingEval
                ? 'Datos insuficientes o meta pendiente de validación para determinar desvío.'
                : `${block.indicatorLabel}: Meta alcanzada en el período evaluado.`}
            </span>
          </div>

          {!isPrintMode && (
            <div className="flex items-center gap-2">
              {!showPreventiveInput && (
                <button
                  type="button"
                  onClick={() => setShowPreventiveInput(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-[#001E50] hover:border-[#0072CE]"
                >
                  <Plus className="h-3 w-3 text-[#0072CE]" />
                  Observación preventiva
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  onUpdateBlock({
                    ...block,
                    visible: true,
                    manuallyToggled: true,
                    actions:
                      block.actions.length > 0
                        ? block.actions
                        : [
                            {
                              id: `act-prev-${Date.now()}`,
                              branch: branchSelection === 'SALTA' ? 'SALTA' : branchSelection === 'JUJUY' ? 'JUJUY' : 'COMUN',
                              deviationSummary: 'Acción preventiva / Mejora continua',
                              rootCause: '',
                              correctiveAction: '',
                              responsible: '',
                              targetDate: '',
                              status: 'En proceso',
                              followUpNote: '',
                            },
                          ],
                  })
                }
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-bold text-[#5A6A85] hover:border-[#001E50] hover:text-[#001E50]"
              >
                <Plus className="h-3 w-3" />
                Agregar plan de acción
              </button>
            </div>
          )}
        </div>

        {(showPreventiveInput || block.preventiveObservation.trim()) && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-white px-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#0072CE]">
                Observación / Acción Preventiva
              </span>
              {!isPrintMode && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPreventiveInput(false);
                    onUpdateBlock({ ...block, preventiveObservation: '' });
                  }}
                  className="text-[10px] text-slate-400 hover:text-red-600"
                >
                  Quitar
                </button>
              )}
            </div>
            {isPrintMode ? (
              <p className="mt-1 text-xs text-[#001E50]">{block.preventiveObservation}</p>
            ) : (
              <input
                type="text"
                value={block.preventiveObservation}
                onChange={e => onUpdateBlock({ ...block, preventiveObservation: e.target.value })}
                placeholder="Escribir observación o acción preventiva para sostener el cumplimiento..."
                className="mt-1 w-full bg-transparent text-xs text-[#001E50] outline-none"
              />
            )}
          </div>
        )}
      </div>
    );
  }

  // CASE 2: Indicator is Deviated, but user explicitly hid the block
  if (hasDeviation && !block.visible) {
    if (isPrintMode) return null;
    return (
      <div className="mt-auto pt-2">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              Advertencia: Existe un incumplimiento en {block.indicatorLabel} y el bloque de plan de acción está oculto.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onUpdateBlock({ ...block, visible: true, manuallyToggled: true })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#001E50] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#0072CE]"
          >
            <Eye className="h-3 w-3" />
            Mostrar Análisis y Plan de Acción
          </button>
        </div>
      </div>
    );
  }

  // CASE 3: Visible Integrated Action Block (INDICADOR -> RESULTADO -> DESVÍO -> CAUSA -> PLAN DE ACCIÓN)
  // Determine which branches need action when BOTH are selected
  const branchScopeNote =
    branchSelection === 'BOTH'
      ? jujuyDeviated && !saltaDeviated
        ? 'Desvío focalizado en Autosol Jujuy (3059) · Salta (3087) cumple objetivo'
        : !jujuyDeviated && saltaDeviated
          ? 'Desvío focalizado en Autosol Salta (3087) · Jujuy (3059) cumple objetivo'
          : jujuyDeviated && saltaDeviated
            ? 'Desvío en ambas sucursales · Acciones diferenciadas por sede'
            : 'Seguimiento preventivo Jujuy / Salta'
      : branchSelection === 'JUJUY'
        ? 'Autosol Jujuy (3059)'
        : 'Autosol Salta (3087)';

  const visibleActions = isPrintMode
    ? block.actions.slice(0, block.layoutMode === 'expanded' ? 4 : 3)
    : block.actions;

  return (
    <div className="mt-auto pt-2">
      <InheritedReviewBanner
        isInherited={block.isInheritedPendingReview}
        isPrintMode={isPrintMode}
        onConfirmReview={() => onUpdateBlock({ ...block, isInheritedPendingReview: false })}
      />

      <div
        className={`rounded-xl border transition ${
          hasDeviation
            ? 'border-[#FECACA] bg-gradient-to-b from-[#FEF2F2]/50 to-white'
            : 'border-slate-200 bg-[#F5F7FA]/70'
        } ${block.layoutMode === 'expanded' ? 'p-3.5' : 'p-2.5'}`}
      >
        {/* Header Bar of the Integrated Action Plan */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                hasDeviation
                  ? 'bg-[#B91C1C] text-white'
                  : 'bg-[#001E50] text-white'
              }`}
            >
              Análisis y Plan de Acción
            </span>
            <span className="text-[11px] font-bold text-[#001E50]">
              {branchScopeNote}
            </span>
            {hasDeviation && !hasDocumentedActions && !isPrintMode && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[9px] font-bold text-amber-800">
                <AlertCircle className="h-3 w-3 text-amber-600" />
                Incumplimiento sin acción documentada
              </span>
            )}
          </div>

          {/* Editor Controls for the Integrated Action Plan */}
          {!isPrintMode && (
            <div className="flex flex-wrap items-center gap-1.5">
              {relevantSheetPlans.length > 0 && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowPlanPicker(!showPlanPicker)}
                    className="inline-flex items-center gap-1 rounded-md border border-[#0072CE]/40 bg-sky-50 px-2 py-1 text-[10px] font-bold text-[#0072CE] hover:bg-sky-100"
                  >
                    <Link2 className="h-3 w-3" />
                    Vincular plan existente ({relevantSheetPlans.length})
                  </button>
                  {showPlanPicker && (
                    <div className="absolute right-0 bottom-full mb-1 z-30 w-80 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                      <p className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-[#5A6A85]">
                        Seleccionar Plan de Google Sheets
                      </p>
                      {relevantSheetPlans.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleLinkSheetPlan(p)}
                          className="w-full text-left rounded-lg p-2 hover:bg-slate-50 transition border-b border-slate-100 last:border-0"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-[#001E50]">
                            <span>#{p.nro} · {p.nombre_kpi}</span>
                            <span className="text-[#0072CE]">{p.provincia || p.sector}</span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-[#5A6A85] line-clamp-1">
                            Causa: {p.causa_raiz || 'Sin causa'}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {branchSelection === 'BOTH' && (
                <>
                  <button
                    type="button"
                    onClick={() => handleAddActionRow('JUJUY')}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-[#001E50] hover:border-[#0072CE]"
                  >
                    <Plus className="h-2.5 w-2.5 text-[#0072CE]" />
                    Acción Jujuy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddActionRow('SALTA')}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-[#001E50] hover:border-[#0072CE]"
                  >
                    <Plus className="h-2.5 w-2.5 text-[#0072CE]" />
                    Acción Salta
                  </button>
                </>
              )}

              {branchSelection !== 'BOTH' && (
                <button
                  type="button"
                  onClick={() => handleAddActionRow(branchSelection === 'JUJUY' ? 'JUJUY' : 'SALTA')}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-[#001E50] hover:border-[#0072CE]"
                >
                  <Plus className="h-2.5 w-2.5 text-[#0072CE]" />
                  Agregar acción
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  onUpdateBlock({
                    ...block,
                    layoutMode: block.layoutMode === 'compact' ? 'expanded' : 'compact',
                  })
                }
                title="Alternar vista compacta / ampliada"
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-[#5A6A85] hover:text-[#001E50]"
              >
                {block.layoutMode === 'compact' ? (
                  <>
                    <Maximize2 className="h-2.5 w-2.5" />
                    Ampliar
                  </>
                ) : (
                  <>
                    <Minimize2 className="h-2.5 w-2.5" />
                    Compacto
                  </>
                )}
              </button>

              {onSplitToContinuationPage && block.actions.length >= 2 && (
                <button
                  type="button"
                  onClick={onSplitToContinuationPage}
                  title="Crear página de continuación vinculada a este indicador"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-[#0072CE] hover:border-[#0072CE]"
                >
                  <SplitSquareVertical className="h-2.5 w-2.5" />
                  Continuar en otra pág.
                </button>
              )}

              <button
                type="button"
                onClick={() => onUpdateBlock({ ...block, visible: false, manuallyToggled: true })}
                title="Ocultar bloque de plan de acción"
                className="rounded-md border border-slate-200 bg-white p-1 text-slate-400 hover:text-slate-700"
              >
                <EyeOff className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Action Items Executive Grid (Causa Raíz -> Acción Correctiva -> Responsable -> Fecha -> Estado) */}
        <div className="mt-2 space-y-1.5">
          {visibleActions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-center text-[11px] text-[#5A6A85]">
              Sin acciones registradas para este indicador. Hacé clic en «Agregar acción» o «Vincular plan existente» para documentar la respuesta correctiva.
            </div>
          ) : (
            visibleActions.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-12 items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-2.5 py-1.5 text-[11px] shadow-2xs"
              >
                {/* Sucursal Tag */}
                <div className="col-span-2 flex items-center gap-1.5">
                  {!isPrintMode ? (
                    <select
                      value={item.branch}
                      onChange={e =>
                        updateActionItem(item.id, {
                          branch: e.target.value as 'JUJUY' | 'SALTA' | 'COMUN',
                        })
                      }
                      className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider outline-none ${
                        item.branch === 'JUJUY'
                          ? 'bg-[#001E50] text-white'
                          : item.branch === 'SALTA'
                            ? 'bg-[#0072CE] text-white'
                            : 'bg-slate-200 text-[#001E50]'
                      }`}
                    >
                      <option value="JUJUY">JUJUY</option>
                      <option value="SALTA">SALTA</option>
                      <option value="COMUN">CONJUNTA</option>
                    </select>
                  ) : (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                        item.branch === 'JUJUY'
                          ? 'bg-[#001E50] text-white'
                          : item.branch === 'SALTA'
                            ? 'bg-[#0072CE] text-white'
                            : 'bg-slate-200 text-[#001E50]'
                      }`}
                    >
                      {item.branch === 'COMUN' ? 'CONJUNTA' : item.branch}
                    </span>
                  )}
                  {item.linkedSourcePlanNro && (
                    <span className="text-[9px] font-bold text-[#0072CE]">
                      #{item.linkedSourcePlanNro}
                    </span>
                  )}
                </div>

                {/* Causa Raíz */}
                <div className="col-span-3">
                  <span className="block text-[8px] font-bold uppercase tracking-wider text-[#5A6A85]">
                    Causa identificada
                  </span>
                  {isPrintMode ? (
                    <p className="font-semibold text-[#001E50] leading-tight">
                      {item.rootCause || 'Pendiente de especificar'}
                    </p>
                  ) : (
                    <input
                      type="text"
                      value={item.rootCause}
                      onChange={e => updateActionItem(item.id, { rootCause: e.target.value })}
                      placeholder="Hacé clic para redactar causa..."
                      className="w-full bg-transparent font-semibold text-[#001E50] outline-none placeholder:text-slate-300 focus:border-b focus:border-[#0072CE]"
                    />
                  )}
                </div>

                {/* Acción Correctiva */}
                <div className="col-span-4">
                  <span className="block text-[8px] font-bold uppercase tracking-wider text-[#0072CE]">
                    Acción correctiva ejecutiva
                  </span>
                  {isPrintMode ? (
                    <p className="font-semibold text-[#001E50] leading-tight">
                      {item.correctiveAction || 'Pendiente de especificar'}
                    </p>
                  ) : (
                    <input
                      type="text"
                      value={item.correctiveAction}
                      onChange={e => updateActionItem(item.id, { correctiveAction: e.target.value })}
                      placeholder="Hacé clic para redactar acción correctiva..."
                      className="w-full bg-transparent font-semibold text-[#001E50] outline-none placeholder:text-slate-300 focus:border-b focus:border-[#0072CE]"
                    />
                  )}
                </div>

                {/* Responsable & Fecha */}
                <div className="col-span-2 grid grid-cols-2 gap-1">
                  <div>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-[#5A6A85]">
                      Resp.
                    </span>
                    {isPrintMode ? (
                      <p className="font-bold text-[#001E50] truncate">
                        {item.responsible || '—'}
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={item.responsible}
                        onChange={e => updateActionItem(item.id, { responsible: e.target.value })}
                        placeholder="Área/Resp."
                        className="w-full bg-transparent font-bold text-[#001E50] outline-none placeholder:text-slate-300"
                      />
                    )}
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold uppercase tracking-wider text-[#5A6A85]">
                      Fecha
                    </span>
                    {isPrintMode ? (
                      <p className="font-semibold text-[#5A6A85] truncate">
                        {item.targetDate || '—'}
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={item.targetDate}
                        onChange={e => updateActionItem(item.id, { targetDate: e.target.value })}
                        placeholder="dd/mm"
                        className="w-full bg-transparent font-semibold text-[#5A6A85] outline-none placeholder:text-slate-300"
                      />
                    )}
                  </div>
                </div>

                {/* Estado + Eliminar */}
                <div className="col-span-1 flex items-center justify-end gap-1">
                  {!isPrintMode ? (
                    <select
                      value={item.status}
                      onChange={e =>
                        updateActionItem(item.id, {
                          status: e.target.value as ActionItemStatus,
                        })
                      }
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold outline-none ${
                        item.status === 'Verificado' || item.status === 'Implementado'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.status === 'En proceso'
                            ? 'bg-sky-50 text-[#0072CE]'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En proceso">En proceso</option>
                      <option value="Implementado">Implementado</option>
                      <option value="Verificado">Verificado</option>
                    </select>
                  ) : (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                        item.status === 'Verificado' || item.status === 'Implementado'
                          ? 'bg-emerald-50 text-emerald-700'
                          : item.status === 'En proceso'
                            ? 'bg-sky-50 text-[#0072CE]'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  )}
                  {!isPrintMode && (
                    <button
                      type="button"
                      onClick={() => removeActionItem(item.id)}
                      className="text-slate-300 hover:text-red-600 p-0.5"
                      title="Quitar fila"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// --- A4 Landscape Corporate Page Frame (297mm × 210mm) ---

interface PageFrameA4Props {
  page: ReportPage;
  pageNumber: number;
  totalPages: number;
  doc: DirectionReportDocument;
  computed: ComputedDirectionReportData;
  isPrintMode?: boolean;
  onUpdatePage: (patch: Partial<ReportPage>) => void;
  children: React.ReactNode;
}

export const PageFrameA4: React.FC<PageFrameA4Props> = ({
  page,
  pageNumber,
  totalPages,
  doc,
  computed,
  isPrintMode = false,
  onUpdatePage,
  children,
}) => {
  const formattedPageNum = String(pageNumber).padStart(2, '0');
  const formattedTotal = String(totalPages).padStart(2, '0');
  const branchBadge =
    doc.branchSelection === 'BOTH'
      ? 'Jujuy (3059) · Salta (3087)'
      : doc.branchSelection === 'JUJUY'
        ? 'Autosol Jujuy (3059)'
        : 'Autosol Salta (3087)';

  if (page.templateType === 'cover') {
    return (
      <div
        className="direction-a4-page relative flex flex-col justify-between overflow-hidden bg-[#001E50] text-white select-none"
        style={{
          width: '297mm',
          height: '210mm',
          padding: '16mm 18mm',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Minimalist geometric architectural accents */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-[38%] bg-gradient-to-bl from-[#0072CE]/25 via-[#002868]/40 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-2 w-full bg-gradient-to-r from-[#0072CE] via-sky-400 to-[#001E50]" />
        <div className="pointer-events-none absolute top-14 right-18 bottom-14 w-px bg-white/12" />

        {/* Top Identity Row */}
        <div className="relative z-10 flex items-start justify-between gap-8">
          <div className="flex items-center gap-5">
            <div className="rounded-2xl bg-white px-5 py-3 shadow-lg">
              <img
                src={`${import.meta.env.BASE_URL}images/autosol-vw-logo.png`}
                alt="Volkswagen Autosol"
                className="h-9 w-auto"
              />
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.28em] text-sky-300">
                Concesionario Oficial Volkswagen
              </p>
              <p className="mt-0.5 text-xs font-medium text-slate-300">
                Sistema de Gestión de Calidad y Experiencia al Cliente
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-right backdrop-blur-xs">
            <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-sky-300">
              {doc.periodType === 'monthly' ? 'Período Mensual' : 'Período Trimestral'}
            </p>
            <p className="mt-1 text-xl font-extrabold tracking-tight text-white">
              {computed.periodLabel}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-300">
              {computed.periodClosureStatusLabel}
            </p>
          </div>
        </div>

        {/* Center Executive Cover Composition */}
        <div className="relative z-10 my-auto max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-sky-400/30 bg-[#0072CE]/20 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.28em] text-sky-200">
            <span className="h-2 w-2 rounded-full bg-sky-300" />
            {page.sectionTag || 'DIRECCIÓN GENERAL'}
          </div>

          {isPrintMode ? (
            <h1 className="text-5xl font-extrabold tracking-tight leading-[1.04] text-white">
              {page.title}
            </h1>
          ) : (
            <input
              type="text"
              value={page.title}
              onChange={e => onUpdatePage({ title: e.target.value })}
              className="w-full bg-transparent text-5xl font-extrabold tracking-tight leading-[1.04] text-white outline-none border-b border-transparent focus:border-sky-400"
            />
          )}

          <div className="h-1 w-28 rounded-full bg-[#0072CE]" />

          {isPrintMode ? (
            <p className="text-xl font-semibold text-sky-100">{page.subtitle}</p>
          ) : (
            <input
              type="text"
              value={page.subtitle}
              onChange={e => onUpdatePage({ subtitle: e.target.value })}
              className="w-full bg-transparent text-xl font-semibold text-sky-100 outline-none border-b border-transparent focus:border-sky-400"
            />
          )}

          {/* Key Executive Summary Pills on Cover */}
          <div className="grid grid-cols-4 gap-4 pt-4 max-w-3xl">
            <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">
                OS de Marca
              </p>
              <p className="mt-1 text-2xl font-extrabold text-white">
                {formatMetricAr(computed.consolidated.osScore)}
              </p>
              <p className="text-[10px] text-sky-300">
                Meta: {formatMetricAr(computed.consolidated.osTarget)}
              </p>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">
                LVS Postventa
              </p>
              <p className="mt-1 text-2xl font-extrabold text-white">
                {formatMetricAr(computed.consolidated.lvsScore)}
              </p>
              <p className="text-[10px] text-sky-300">
                Meta: {formatMetricAr(computed.consolidated.lvsTarget)}
              </p>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">
                Sucursales
              </p>
              <p className="mt-1 text-base font-extrabold text-white truncate">
                {doc.branchSelection === 'BOTH' ? 'Jujuy · Salta' : doc.branchSelection}
              </p>
              <p className="text-[10px] text-sky-300">
                {doc.branchSelection === 'BOTH' ? '3059 y 3087' : doc.branchSelection === 'JUJUY' ? 'CE 3059' : 'CE 3087'}
              </p>
            </div>
            <div className="rounded-xl border border-white/12 bg-white/6 px-4 py-3">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300">
                Emisión
              </p>
              <p className="mt-1 text-base font-extrabold text-white">
                {doc.emittedDate}
              </p>
              <p className="text-[10px] text-sky-300">
                {totalPages} láminas ejecutivas
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Note & Footer */}
        <div className="relative z-10 flex items-end justify-between gap-8 border-t border-white/15 pt-4">
          <div className="flex-1 max-w-3xl">
            <p className="text-[9px] font-bold uppercase tracking-widest text-sky-300 mb-1">
              {page.narrativeTitle || 'Nota metodológica y corte del período'}
            </p>
            {isPrintMode ? (
              <p className="text-xs leading-relaxed text-slate-300">{page.narrativeBody}</p>
            ) : (
              <textarea
                value={page.narrativeBody}
                onChange={e => onUpdatePage({ narrativeBody: e.target.value })}
                rows={2}
                className="w-full resize-none bg-transparent text-xs leading-relaxed text-slate-200 outline-none border border-transparent focus:border-white/20 rounded p-1"
              />
            )}
          </div>

          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Autosol S.R.L. · Dirección
            </p>
            <p className="mt-0.5 text-xs font-extrabold text-white">
              Pág. {formattedPageNum} / {formattedTotal}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Standard Interior Corporate Page (A4 Landscape 297 × 210 mm)
  return (
    <div
      className="direction-a4-page relative flex flex-col justify-between overflow-hidden bg-white text-[#001E50]"
      style={{
        width: '297mm',
        height: '210mm',
        padding: '10mm 14mm 9mm 14mm',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      {/* Top Institutional Accent Bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#001E50] via-[#0072CE] to-[#001E50]" />

      {/* Consistent Corporate Header */}
      <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-2.5 shrink-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#0072CE]" />
            {isPrintMode ? (
              <span className="text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#0072CE]">
                {page.sectionTag}
              </span>
            ) : (
              <input
                type="text"
                value={page.sectionTag}
                onChange={e => onUpdatePage({ sectionTag: e.target.value })}
                className="bg-transparent text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#0072CE] outline-none"
              />
            )}
            <span className="text-slate-300">·</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#5A6A85]">
              {branchBadge}
            </span>
          </div>

          {isPrintMode ? (
            <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-[#001E50] leading-tight">
              {page.title}
            </h2>
          ) : (
            <input
              type="text"
              value={page.title}
              onChange={e => onUpdatePage({ title: e.target.value })}
              className="mt-0.5 w-full bg-transparent text-xl font-extrabold tracking-tight text-[#001E50] leading-tight outline-none border-b border-transparent focus:border-[#0072CE]"
            />
          )}

          {isPrintMode ? (
            <p className="text-[11px] font-medium text-[#5A6A85]">{page.subtitle}</p>
          ) : (
            <input
              type="text"
              value={page.subtitle}
              onChange={e => onUpdatePage({ subtitle: e.target.value })}
              className="w-full bg-transparent text-[11px] font-medium text-[#5A6A85] outline-none border-b border-transparent focus:border-slate-300"
            />
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="inline-block rounded-md bg-[#F5F7FA] border border-slate-200 px-2.5 py-0.5 text-[10px] font-extrabold text-[#001E50]">
              {computed.periodShortLabel}
            </span>
            <p className="mt-0.5 text-[9px] font-semibold text-[#5A6A85]">
              {computed.isClosedPeriod ? 'Período cerrado' : 'Corte parcial'}
            </p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#001E50] text-xs font-black italic text-[#001E50]">
            VW
          </div>
        </div>
      </header>

      {/* Main Dynamic Body Area */}
      <div className="my-2.5 flex flex-1 flex-col min-h-0 overflow-hidden">
        {children}
      </div>

      {/* Consistent Discrete Corporate Footer */}
      <footer className="flex items-center justify-between gap-4 border-t border-slate-200/80 pt-2 text-[9px] text-[#5A6A85] shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-extrabold text-[#001E50]">AUTOSOL S.R.L.</span>
          <span>·</span>
          <span>Informe Ejecutivo para Dirección</span>
          <span>·</span>
          <span>{computed.periodLabel}</span>
        </div>

        <div className="flex-1 max-w-md text-center truncate">
          {!isPrintMode ? (
            <input
              type="text"
              value={page.footerNote || ''}
              onChange={e => onUpdatePage({ footerNote: e.target.value })}
              placeholder="Nota al pie opcional (hacé clic para editar)..."
              className="w-full bg-transparent text-center text-[9px] text-[#5A6A85] outline-none placeholder:text-slate-300"
            />
          ) : (
            <span>{page.footerNote || 'Documento confidencial de gestión de calidad'}</span>
          )}
        </div>

        <div className="font-extrabold text-[#001E50] tabular-nums">
          Página {formattedPageNum} de {formattedTotal}
        </div>
      </footer>
    </div>
  );
};

// --- TEMPLATE RENDERER FOR ALL 11+ CORPORATE TEMPLATES ---

interface DirectionPageTemplateRendererProps {
  page: ReportPage;
  pageNumber: number;
  totalPages: number;
  doc: DirectionReportDocument;
  computed: ComputedDirectionReportData;
  isPrintMode?: boolean;
  isLoadingData?: boolean;
  selectedImageId?: string | null;
  onSelectImage?: (id: string | null) => void;
  onUpdatePage: (patch: Partial<ReportPage>) => void;
  onSplitActionPlanToContinuation?: (pageId: string) => void;
  onAddActionPlanPage?: (sourcePageId: string) => void;
}

export const DirectionPageTemplateRenderer: React.FC<DirectionPageTemplateRendererProps> = ({
  page,
  pageNumber,
  totalPages,
  doc,
  computed,
  isPrintMode = false,
  isLoadingData = false,
  selectedImageId,
  onSelectImage,
  onUpdatePage,
  onSplitActionPlanToContinuation,
  onAddActionPlanPage,
}) => {
  const activeSnap =
    doc.branchSelection === 'JUJUY'
      ? computed.jujuy
      : doc.branchSelection === 'SALTA'
        ? computed.salta
        : computed.consolidated;

  const isComparative = doc.branchSelection === 'BOTH';

  // 1. COVER PAGE
  if (page.templateType === 'cover') {
    return (
      <PageFrameA4
        page={page}
        pageNumber={pageNumber}
        totalPages={totalPages}
        doc={doc}
        computed={computed}
        isPrintMode={isPrintMode}
        onUpdatePage={onUpdatePage}
      >
        <div />
      </PageFrameA4>
    );
  }

  // 2. PLANTILLA 2: RESUMEN EJECUTIVO
  if (page.templateType === 'executive_summary') {
    const showStudies =
      doc.enabledModules.includes('encuestas_ssi') || doc.enabledModules.includes('encuestas_csi');

    const executiveCards = [
      {
        id: 'os',
        name: 'Ventas · OS de Marca (CEM)',
        target: doc.targets?.os ?? 4.6,
        jujuyScore: computed.jujuy.osScore,
        jujuyStatus: computed.jujuy.osCompliance,
        saltaScore: computed.salta.osScore,
        saltaStatus: computed.salta.osCompliance,
      },
      {
        id: 'lvs',
        name: 'Postventa · LVS Satisfacción (CEM)',
        target: doc.targets?.lvs ?? 4.8,
        jujuyScore: computed.jujuy.lvsScore,
        jujuyStatus: computed.jujuy.lvsCompliance,
        saltaScore: computed.salta.lvsScore,
        saltaStatus: computed.salta.lvsCompliance,
      },
      {
        id: 'lavado',
        name: 'Postventa · Calidad de Lavado (CEM Q6)',
        target: doc.targets?.lavado ?? 4.5,
        jujuyScore: computed.jujuy.lvsLavadoQ6,
        jujuyStatus: evaluateCompliance(computed.jujuy.lvsLavadoQ6, doc.targets?.lavado ?? 4.5, 'up'),
        saltaScore: computed.salta.lvsLavadoQ6,
        saltaStatus: evaluateCompliance(computed.salta.lvsLavadoQ6, doc.targets?.lavado ?? 4.5, 'up'),
      },
      ...(showStudies
        ? [
            {
              id: 'ssi_csi',
              name: 'Estudios de Red · SSI / CSI',
              target: doc.targets?.ssi ?? 8.8,
              jujuyScore:
                computed.ssiStudy.validSurveysCount > 0
                  ? computed.ssiStudy.byBranch.JUJUY.satisfactionAvg
                  : computed.csiStudy.byBranch.JUJUY.satisfactionAvg,
              jujuyStatus:
                computed.ssiStudy.validSurveysCount > 0
                  ? computed.ssiStudy.byBranch.JUJUY.compliance
                  : computed.csiStudy.byBranch.JUJUY.compliance,
              saltaScore:
                computed.ssiStudy.validSurveysCount > 0
                  ? computed.ssiStudy.byBranch.SALTA.satisfactionAvg
                  : computed.csiStudy.byBranch.SALTA.satisfactionAvg,
              saltaStatus:
                computed.ssiStudy.validSurveysCount > 0
                  ? computed.ssiStudy.byBranch.SALTA.compliance
                  : computed.csiStudy.byBranch.SALTA.compliance,
            },
          ]
        : []),
    ];

    return (
      <PageFrameA4
        page={page}
        pageNumber={pageNumber}
        totalPages={totalPages}
        doc={doc}
        computed={computed}
        isPrintMode={isPrintMode}
        onUpdatePage={onUpdatePage}
      >
        <div className="flex flex-col justify-between h-full gap-3">
          <InheritedReviewBanner
            isInherited={page.isInheritedPendingReview}
            isPrintMode={isPrintMode}
            onConfirmReview={() => onUpdatePage({ isInheritedPendingReview: false })}
          />

          {/* Tarjetas Ejecutivas Principales: Jujuy y Salta por separado, sin promediar juntos */}
          <div className={`grid ${executiveCards.length === 4 ? 'grid-cols-4' : 'grid-cols-3'} gap-3`}>
            {executiveCards.map(card => {
              const singleVal = doc.branchSelection === 'SALTA' ? card.saltaScore : card.jujuyScore;
              const singleStatus = doc.branchSelection === 'SALTA' ? card.saltaStatus : card.jujuyStatus;

              return (
                <div
                  key={card.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#F5F7FA]/80 p-3.5 shadow-2xs"
                >
                  {/* Encabezado: Nombre del Indicador y Meta */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/70 pb-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#001E50] line-clamp-1">
                      {card.name}
                    </span>
                    <span className="text-[10px] font-extrabold text-[#0072CE] shrink-0">
                      Obj: ≥ {formatMetricAr(card.target)}
                    </span>
                  </div>

                  {/* Cuerpo: Si es ambas sucursales, mostrar Jujuy y Salta por separado */}
                  {isComparative ? (
                    <div className="my-2.5 grid grid-cols-2 gap-2">
                      {/* Autosol Jujuy */}
                      <div className="rounded-xl border border-slate-200/60 bg-white p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-extrabold uppercase text-[#001E50]">Jujuy (3059)</span>
                          {isLoadingData && card.jujuyScore == null ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-bold text-amber-700 border border-amber-200 animate-pulse">
                              Cargando...
                            </span>
                          ) : (
                            <ComplianceBadge status={card.jujuyStatus} compact />
                          )}
                        </div>
                        <p className="mt-1 text-2xl font-black text-[#001E50] tabular-nums">
                          {isLoadingData && card.jujuyScore == null ? (
                            <span className="text-xs font-bold text-amber-600 animate-pulse">Sincronizando...</span>
                          ) : (
                            formatMetricAr(card.jujuyScore)
                          )}
                        </p>
                      </div>

                      {/* Autosol Salta */}
                      <div className="rounded-xl border border-slate-200/60 bg-white p-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-extrabold uppercase text-[#0072CE]">Salta (3087)</span>
                          {isLoadingData && card.saltaScore == null ? (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-bold text-amber-700 border border-amber-200 animate-pulse">
                              Cargando...
                            </span>
                          ) : (
                            <ComplianceBadge status={card.saltaStatus} compact />
                          )}
                        </div>
                        <p className="mt-1 text-2xl font-black text-[#001E50] tabular-nums">
                          {isLoadingData && card.saltaScore == null ? (
                            <span className="text-xs font-bold text-amber-600 animate-pulse">Sincronizando...</span>
                          ) : (
                            formatMetricAr(card.saltaScore)
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="my-3 flex items-baseline justify-between rounded-xl border border-slate-200/60 bg-white p-3">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase text-[#5A6A85] block">
                          Autosol {doc.branchSelection === 'SALTA' ? 'Salta (3087)' : 'Jujuy (3059)'}
                        </span>
                        <span className="text-3xl font-black text-[#001E50] tabular-nums">
                          {isLoadingData && singleVal == null ? (
                            <span className="text-xs font-bold text-amber-600 animate-pulse">Sincronizando...</span>
                          ) : (
                            formatMetricAr(singleVal)
                          )}
                        </span>
                      </div>
                      {isLoadingData && singleVal == null ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-bold text-amber-700 border border-amber-200 animate-pulse">
                          Cargando...
                        </span>
                      ) : (
                        <ComplianceBadge status={singleStatus} />
                      )}
                    </div>
                  )}

                  <div className="text-[9px] font-semibold text-[#5A6A85] flex items-center justify-between pt-1 border-t border-slate-200/50">
                    <span>Resultado Oficial de Marca</span>
                    <span className="text-[#001E50] font-bold">Autosol S.R.L.</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Editable Executive Narrative Blocks */}
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                {isPrintMode ? (
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#001E50]">
                    {page.narrativeTitle || 'Síntesis de Resultados del Período'}
                  </h3>
                ) : (
                  <input
                    type="text"
                    value={page.narrativeTitle}
                    onChange={e => onUpdatePage({ narrativeTitle: e.target.value })}
                    className="w-full bg-transparent text-xs font-extrabold uppercase tracking-wider text-[#001E50] outline-none"
                  />
                )}
              </div>
              {isPrintMode ? (
                <p className="mt-2.5 text-xs leading-relaxed text-[#001E50] whitespace-pre-wrap">
                  {page.narrativeBody ||
                    `Resumen consolidado de ${computed.periodLabel}. Los indicadores automáticos provienen de las bases oficiales de CEM Ventas, CEM Postventa y registros internos de Calidad.`}
                </p>
              ) : (
                <textarea
                  value={page.narrativeBody}
                  onChange={e => onUpdatePage({ narrativeBody: e.target.value })}
                  placeholder="Hacé clic aquí para redactar el resumen ejecutivo de los principales resultados del período..."
                  className="mt-2.5 flex-1 w-full resize-none bg-transparent text-xs leading-relaxed text-[#001E50] outline-none placeholder:text-slate-400"
                />
              )}
            </div>

            <div className="flex flex-col rounded-xl border border-slate-200 bg-[#001E50] p-4 text-white">
              <div className="flex items-center justify-between border-b border-white/15 pb-2">
                {isPrintMode ? (
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                    {page.secondaryNarrativeTitle || 'Foco Directivo y Decisiones Clave'}
                  </h3>
                ) : (
                  <input
                    type="text"
                    value={page.secondaryNarrativeTitle || 'Foco Directivo y Decisiones Clave'}
                    onChange={e => onUpdatePage({ secondaryNarrativeTitle: e.target.value })}
                    className="w-full bg-transparent text-xs font-extrabold uppercase tracking-wider text-sky-300 outline-none"
                  />
                )}
              </div>
              {isPrintMode ? (
                <p className="mt-2.5 text-xs leading-relaxed text-slate-100 whitespace-pre-wrap">
                  {page.secondaryNarrativeBody ||
                    'Cada indicador incluido en este informe incorpora debajo de sus resultados su evaluación de cumplimiento y, cuando existe desvío, su causa raíz y plan de acción correctivo.'}
                </p>
              ) : (
                <textarea
                  value={page.secondaryNarrativeBody || ''}
                  onChange={e => onUpdatePage({ secondaryNarrativeBody: e.target.value })}
                  placeholder="Hacé clic aquí para destacar los puntos de atención prioritaria o decisiones requeridas de Dirección..."
                  className="mt-2.5 flex-1 w-full resize-none bg-transparent text-xs leading-relaxed text-white outline-none placeholder:text-slate-400"
                />
              )}
            </div>
          </div>
        </div>
      </PageFrameA4>
    );
  }

  // 3. PLANTILLA 3: INDICADORES, EVOLUCIÓN ANUAL Y ENLACE A PLAN DE ACCIÓN
  if (page.templateType === 'indicator_evolution') {
    const isOs = page.moduleId === 'ventas_os';
    const isLavado = page.moduleId === 'lavado';

    const mainScore = isOs
      ? activeSnap.osScore
      : isLavado
        ? activeSnap.lvsLavadoQ6
        : activeSnap.lvsScore;
    const mainTarget = isOs
      ? activeSnap.osTarget
      : isLavado
        ? activeSnap.lavadoTarget
        : activeSnap.lvsTarget;
    const mainCompliance = isOs
      ? activeSnap.osCompliance
      : isLavado
        ? evaluateCompliance(activeSnap.lvsLavadoQ6, activeSnap.lavadoTarget, 'up')
        : activeSnap.lvsCompliance;

    const jujuyVal = isOs
      ? computed.jujuy.osScore
      : isLavado
        ? computed.jujuy.lvsLavadoQ6
        : computed.jujuy.lvsScore;
    const saltaVal = isOs
      ? computed.salta.osScore
      : isLavado
        ? computed.salta.lvsLavadoQ6
        : computed.salta.lvsScore;

    const jujuyComp = isOs
      ? computed.jujuy.osCompliance
      : isLavado
        ? evaluateCompliance(computed.jujuy.lvsLavadoQ6, mainTarget, 'up')
        : computed.jujuy.lvsCompliance;
    const saltaComp = isOs
      ? computed.salta.osCompliance
      : isLavado
        ? evaluateCompliance(computed.salta.lvsLavadoQ6, mainTarget, 'up')
        : computed.salta.lvsCompliance;

    const hasAnyDeviation =
      jujuyComp === 'deviated' || saltaComp === 'deviated' || mainCompliance === 'deviated';

    const hasLinkedPlanPage = doc.pages.some(
      p => p.templateType === 'action_plan_continuation' && p.continuationOfPageId === page.id
    );

    const chartData = computed.evolution.map(pt => ({
      name: pt.shortMonth,
      isPeriod: pt.isPeriodMember,
      Consolidado: isOs ? pt.osConsolidated : isLavado ? pt.lavadoConsolidated : pt.lvsConsolidated,
      Jujuy: isOs ? pt.osJujuy : isLavado ? pt.lavadoJujuy : pt.lvsJujuy,
      Salta: isOs ? pt.osSalta : isLavado ? pt.lavadoSalta : pt.lvsSalta,
      Objetivo: mainTarget,
    }));

    // Origen del eje Y: por defecto 4.5 para apreciar variaciones de forma nítida
    const numericVals = chartData.flatMap(d =>
      [d.Jujuy, d.Salta, d.Consolidado].filter(
        (v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0
      )
    );
    const minVal = numericVals.length > 0 ? Math.min(...numericVals) : 4.5;
    const yOrigin = minVal < 4.5 ? Math.max(3.8, Math.floor(minVal * 10) / 10) : 4.5;
    const yTicks =
      yOrigin === 4.5
        ? [4.5, 4.6, 4.7, 4.8, 4.9, 5.0]
        : [
            yOrigin,
            Number((yOrigin + (5.0 - yOrigin) * 0.25).toFixed(2)),
            Number((yOrigin + (5.0 - yOrigin) * 0.5).toFixed(2)),
            Number((yOrigin + (5.0 - yOrigin) * 0.75).toFixed(2)),
            5.0,
          ];

    const indicatorTitle = isOs
      ? 'CEM OS Ventas'
      : isLavado
        ? 'Calidad de Lavado (CEM Q6)'
        : 'CEM LVS Postventa (Q4)';

    return (
      <PageFrameA4
        page={page}
        pageNumber={pageNumber}
        totalPages={totalPages}
        doc={doc}
        computed={computed}
        isPrintMode={isPrintMode}
        onUpdatePage={onUpdatePage}
      >
        <div className="flex flex-col justify-between h-full gap-3">
          {/* Grilla Limpia: Izquierda Resultados por Sucursal | Derecha Gráfico de Evolución */}
          <div className="grid grid-cols-12 gap-5 flex-1 min-h-0">
            {/* Columna Izquierda: Resultados Jujuy y Salta por separado + Acción Directiva */}
            <div className="col-span-4 flex flex-col justify-between gap-3">
              <div className="space-y-3">
                {/* Autosol Jujuy (3059) */}
                <div className="rounded-2xl border border-slate-200 bg-[#F5F7FA] p-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#001E50] block">
                        Autosol Jujuy (CE 3059)
                      </span>
                      <p className="text-[10px] text-[#5A6A85]">
                        Objetivo: ≥ {formatMetricAr(mainTarget)} pts
                      </p>
                    </div>
                    <ComplianceBadge status={jujuyComp} />
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-3xl font-black tracking-tight text-[#001E50] tabular-nums">
                      {formatMetricAr(jujuyVal)}
                    </span>
                    <span className="text-xs font-bold text-[#5A6A85]">
                      {jujuyVal !== null && mainTarget !== null
                        ? `${jujuyVal >= mainTarget ? '+' : ''}${formatMetricAr(jujuyVal - mainTarget)} pts`
                        : '—'}
                    </span>
                  </div>
                </div>

                {/* Autosol Salta (3087) si es comparativo */}
                {isComparative && (
                  <div className="rounded-2xl border border-slate-200 bg-[#F5F7FA] p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#0072CE] block">
                          Autosol Salta (CE 3087)
                        </span>
                        <p className="text-[10px] text-[#5A6A85]">
                          Objetivo: ≥ {formatMetricAr(mainTarget)} pts
                        </p>
                      </div>
                      <ComplianceBadge status={saltaComp} />
                    </div>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-3xl font-black tracking-tight text-[#001E50] tabular-nums">
                        {formatMetricAr(saltaVal)}
                      </span>
                      <span className="text-xs font-bold text-[#5A6A85]">
                        {saltaVal !== null && mainTarget !== null
                          ? `${saltaVal >= mainTarget ? '+' : ''}${formatMetricAr(saltaVal - mainTarget)} pts`
                          : '—'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Botón o Aviso para Plan de Acción en Hoja Siguiente */}
                {!isPrintMode && (
                  <div className="pt-1">
                    {hasLinkedPlanPage ? (
                      <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-[11px] font-bold text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Plan de Acción documentado en la hoja siguiente</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddActionPlanPage?.(page.id)}
                        className={`w-full inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-extrabold uppercase tracking-wider transition shadow-xs ${
                          hasAnyDeviation
                            ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                            : 'bg-[#001E50] hover:bg-[#0072CE] text-white'
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                        <span>
                          {hasAnyDeviation
                            ? 'Agregar hoja de Plan de Acción por desvío'
                            : 'Agregar hoja de Plan de Acción'}
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Comentario Ejecutivo Conciso */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3.5 flex flex-col justify-between">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#0072CE] block">
                  {page.narrativeTitle || `Lectura Ejecutiva · ${indicatorTitle}`}
                </span>
                {isPrintMode ? (
                  <p className="mt-1 text-xs leading-relaxed text-[#001E50]">
                    {page.narrativeBody ||
                      `Desempeño registrado en el período ${computed.periodLabel}. Los datos corresponden exclusivamente a las calificaciones oficiales de marca.`}
                  </p>
                ) : (
                  <textarea
                    value={page.narrativeBody}
                    onChange={e => onUpdatePage({ narrativeBody: e.target.value })}
                    rows={3}
                    placeholder="Escribí aquí una síntesis o decisión directiva sobre este indicador..."
                    className="mt-1.5 w-full resize-none bg-transparent text-xs leading-relaxed text-[#001E50] outline-none placeholder:text-slate-300"
                  />
                )}
              </div>
            </div>

            {/* Columna Derecha: Gráfico de Evolución Anual (Escala 4.5 a 5.0) */}
            <div className="col-span-8 flex flex-col rounded-2xl border border-slate-200 bg-[#F5F7FA]/70 p-4 min-h-0">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/60">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#001E50]">
                    Evolución Anual {doc.year} — {indicatorTitle}
                  </h4>
                  <p className="text-[10px] text-[#5A6A85]">
                    Escala ampliada desde {formatMetricAr(yOrigin, 1)} hasta 5,00 pts · Meta: ≥ {formatMetricAr(mainTarget)} pts
                  </p>
                </div>

                {!isPrintMode && (
                  <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => onUpdatePage({ chartType: 'bar' })}
                      className={`rounded px-2 py-0.5 ${page.chartType !== 'line' ? 'bg-[#001E50] text-white' : 'text-[#5A6A85]'}`}
                    >
                      Barras
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdatePage({ chartType: 'line' })}
                      className={`rounded px-2 py-0.5 ${page.chartType === 'line' ? 'bg-[#001E50] text-white' : 'text-[#5A6A85]'}`}
                    >
                      Líneas
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  {page.chartType === 'line' ? (
                    <LineChart data={chartData} margin={{ top: 18, right: 20, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#001E50' }} />
                      <YAxis
                        domain={[yOrigin, 5.0]}
                        ticks={yTicks}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#5A6A85' }}
                        tickFormatter={v => v.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                      />
                      <Tooltip />
                      {isComparative && <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />}
                      {page.showChartTarget !== false && mainTarget && (
                        <ReferenceLine y={mainTarget} stroke="#15803D" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Meta: ${mainTarget}`, fill: '#15803D', fontSize: 10, position: 'top' }} />
                      )}
                      {isComparative ? (
                        <>
                          <Line type="monotone" dataKey="Jujuy" name="Jujuy (3059)" stroke="#001E50" strokeWidth={2.8} dot={{ r: 4 }} connectNulls />
                          <Line type="monotone" dataKey="Salta" name="Salta (3087)" stroke="#0072CE" strokeWidth={2.8} dot={{ r: 4 }} connectNulls />
                        </>
                      ) : (
                        <Line type="monotone" dataKey="Consolidado" name="Resultado" stroke="#001E50" strokeWidth={3} dot={{ r: 4, fill: '#0072CE' }} connectNulls />
                      )}
                    </LineChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 18, right: 20, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#001E50' }} />
                      <YAxis
                        domain={[yOrigin, 5.0]}
                        ticks={yTicks}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#5A6A85' }}
                        tickFormatter={v => v.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                      />
                      <Tooltip />
                      {isComparative && <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />}
                      {page.showChartTarget !== false && mainTarget && (
                        <ReferenceLine y={mainTarget} stroke="#15803D" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: `Meta: ${mainTarget}`, fill: '#15803D', fontSize: 10, position: 'top' }} />
                      )}
                      {isComparative ? (
                        <>
                          <Bar dataKey="Jujuy" name="Jujuy (3059)" fill="#001E50" radius={[4, 4, 0, 0]} barSize={16}>
                            <LabelList dataKey="Jujuy" position="top" style={{ fill: '#001E50', fontSize: 9, fontWeight: 800 }} />
                          </Bar>
                          <Bar dataKey="Salta" name="Salta (3087)" fill="#0072CE" radius={[4, 4, 0, 0]} barSize={16}>
                            <LabelList dataKey="Salta" position="top" style={{ fill: '#0072CE', fontSize: 9, fontWeight: 800 }} />
                          </Bar>
                        </>
                      ) : (
                        <Bar dataKey="Consolidado" name="Resultado" radius={[6, 6, 0, 0]} barSize={26}>
                          {chartData.map(entry => (
                            <Cell key={entry.name} fill={entry.isPeriod ? '#001E50' : '#94A3B8'} />
                          ))}
                          {page.showChartLabels !== false && (
                            <LabelList dataKey="Consolidado" position="top" style={{ fill: '#001E50', fontSize: 9, fontWeight: 800 }} />
                          )}
                        </Bar>
                      )}
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </PageFrameA4>
    );
  }

  // 4. PLANTILLA 4: COMPARACIÓN JUJUY (3059) / SALTA (3087)
  if (page.templateType === 'branch_comparison') {
    const compBarData = [
      {
        metric: 'OS Marca (Ventas)',
        Jujuy: computed.jujuy.osScore ?? 0,
        Salta: computed.salta.osScore ?? 0,
        Objetivo: doc.targets?.os ?? 4.6,
      },
      {
        metric: 'LVS Postventa (Q4)',
        Jujuy: computed.jujuy.lvsScore ?? 0,
        Salta: computed.salta.lvsScore ?? 0,
        Objetivo: doc.targets?.lvs ?? 4.8,
      },
      {
        metric: 'Calidad Lavado (Q6)',
        Jujuy: computed.jujuy.lvsLavadoQ6 ?? 0,
        Salta: computed.salta.lvsLavadoQ6 ?? 0,
        Objetivo: doc.targets?.lavado ?? 4.5,
      },
    ];

    const renderBranchColumn = (snap: typeof computed.jujuy, title: string, code: string, accentColor: string) => {
      const isJujuy = code === '3059';
      const osScore = snap.osScore;
      const osTarget = doc.targets?.os ?? 4.6;
      const lvsScore = snap.lvsScore;
      const lvsTarget = doc.targets?.lvs ?? 4.8;
      const lavadoScore = snap.lvsLavadoQ6;
      const lavadoTarget = doc.targets?.lavado ?? 4.5;

      return (
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <span
                className="inline-block rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white"
                style={{ backgroundColor: accentColor }}
              >
                Concesionario {code}
              </span>
              <h3 className="mt-1 text-base font-extrabold text-[#001E50]">{title}</h3>
            </div>
            <div className="text-right">
              <span className="text-[9px] font-bold uppercase text-[#5A6A85] block">Estado General</span>
              <ComplianceBadge
                status={
                  snap.osCompliance === 'deviated' || snap.lvsCompliance === 'deviated'
                    ? 'deviated'
                    : snap.osCompliance === 'compliant' && snap.lvsCompliance === 'compliant'
                      ? 'compliant'
                      : 'pending_evaluation'
                }
                compact
              />
            </div>
          </div>

          <div className="my-2.5 grid grid-cols-3 gap-2.5">
            {/* OS Ventas */}
            <div className="rounded-xl border border-slate-200/70 bg-[#F5F7FA] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-[#5A6A85]">OS Ventas</span>
                <ComplianceBadge status={snap.osCompliance} compact />
              </div>
              <p className="mt-1 text-2xl font-black text-[#001E50] tabular-nums">
                {formatMetricAr(osScore)}
              </p>
              <p className="text-[10px] text-[#5A6A85]">
                Meta: ≥ {formatMetricAr(osTarget)}
              </p>
            </div>

            {/* LVS Postventa */}
            <div className="rounded-xl border border-slate-200/70 bg-[#F5F7FA] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-[#5A6A85]">LVS Postventa</span>
                <ComplianceBadge status={snap.lvsCompliance} compact />
              </div>
              <p className="mt-1 text-2xl font-black text-[#001E50] tabular-nums">
                {formatMetricAr(lvsScore)}
              </p>
              <p className="text-[10px] text-[#5A6A85]">
                Meta: ≥ {formatMetricAr(lvsTarget)}
              </p>
            </div>

            {/* Lavado CEM Q6 */}
            <div className="rounded-xl border border-slate-200/70 bg-[#F5F7FA] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-[#5A6A85]">Lavado (Q6)</span>
                <ComplianceBadge status={evaluateCompliance(lavadoScore, lavadoTarget, 'up')} compact />
              </div>
              <p className="mt-1 text-2xl font-black text-[#001E50] tabular-nums">
                {formatMetricAr(lavadoScore)}
              </p>
              <p className="text-[10px] text-[#5A6A85]">
                Meta: ≥ {formatMetricAr(lavadoTarget)}
              </p>
            </div>
          </div>
        </div>
      );
    };

    return (
      <PageFrameA4
        page={page}
        pageNumber={pageNumber}
        totalPages={totalPages}
        doc={doc}
        computed={computed}
        isPrintMode={isPrintMode}
        onUpdatePage={onUpdatePage}
      >
        <div className="flex flex-col justify-between h-full gap-3">
          {/* Symmetrical Side-by-Side Branch Cards */}
          <div className="grid grid-cols-2 gap-4">
            {renderBranchColumn(computed.jujuy, 'Autosol Jujuy', '3059', '#001E50')}
            {renderBranchColumn(computed.salta, 'Autosol Salta', '3087', '#0072CE')}
          </div>

          {/* Bottom Comparative Chart + Synthesis */}
          <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
            <div className="col-span-7 rounded-xl border border-slate-200 bg-[#F5F7FA]/60 p-3.5 flex flex-col min-h-0">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#001E50] mb-1">
                Comparativa de Indicadores Clave de Marca (Escala 4,5 a 5,0)
              </h4>
              <p className="text-[10px] text-[#5A6A85] mb-2">
                Comparación directa entre CE 3059 (Jujuy) y CE 3087 (Salta)
              </p>
              <div className="flex-1 min-h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={compBarData} margin={{ top: 18, right: 14, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="metric" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#001E50' }} />
                    <YAxis
                      domain={[4.5, 5.0]}
                      ticks={[4.5, 4.6, 4.7, 4.8, 4.9, 5.0]}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#5A6A85' }}
                      tickFormatter={v => v.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    />
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                    <Bar dataKey="Jujuy" name="Jujuy (3059)" fill="#001E50" radius={[4, 4, 0, 0]} barSize={24}>
                      <LabelList dataKey="Jujuy" position="top" style={{ fill: '#001E50', fontSize: 9, fontWeight: 800 }} />
                    </Bar>
                    <Bar dataKey="Salta" name="Salta (3087)" fill="#0072CE" radius={[4, 4, 0, 0]} barSize={24}>
                      <LabelList dataKey="Salta" position="top" style={{ fill: '#0072CE', fontSize: 9, fontWeight: 800 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="col-span-5 rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0072CE]">
                {page.narrativeTitle || 'Conclusiones Comparativas Jujuy vs. Salta'}
              </span>
              {isPrintMode ? (
                <p className="mt-2 text-xs leading-relaxed text-[#001E50] whitespace-pre-wrap">
                  {page.narrativeBody ||
                    'Comparación equilibrada entre ambas sucursales. Las diferencias de desempeño permiten focalizar los planes de acción específicamente en la sede que presenta el desvío.'}
                </p>
              ) : (
                <textarea
                  value={page.narrativeBody}
                  onChange={e => onUpdatePage({ narrativeBody: e.target.value })}
                  placeholder="Escribí aquí las conclusiones del análisis comparativo entre Jujuy (3059) y Salta (3087)..."
                  className="mt-2 flex-1 w-full resize-none bg-transparent text-xs leading-relaxed text-[#001E50] outline-none placeholder:text-slate-300"
                />
              )}
            </div>
          </div>
        </div>
      </PageFrameA4>
    );
  }

  // 5. PLANTILLA 5: ENCUESTAS SSI / CSI / CLUB SSI (MÓDULOS DIFERENCIADOS + PLAN INTEGRADO)
  if (page.templateType === 'survey_study') {
    const prog = page.surveyProgram || 'SSI';
    const study: typeof computed.ssiStudy =
      prog === 'CSI'
        ? computed.csiStudy
        : prog === 'CLUB_SSI'
          ? computed.clubSsiStudy
          : computed.ssiStudy;

    const subOpts: SurveyDisplaySubOptions = doc.surveySubOptions;
    const isClubSsi = prog === 'CLUB_SSI';
    const overrides = page.surveyBenchmarkOverride;

    const activeBranchStudy =
      doc.branchSelection === 'JUJUY'
        ? study.byBranch.JUJUY
        : doc.branchSelection === 'SALTA'
          ? study.byBranch.SALTA
          : {
              validCount: study.validSurveysCount,
              t2bPercent: study.t2bPercent,
              satisfactionAvg: study.satisfactionAvg,
              recommendationAvg: study.recommendationAvg,
              compliance: study.compliance,
              topReasons: study.topDissatisfactionReasons,
            };

    const gapMarket =
      activeBranchStudy.t2bPercent !== null && overrides?.marketT2B !== null && overrides?.marketT2B !== undefined
        ? Number((activeBranchStudy.t2bPercent - overrides.marketT2B).toFixed(1))
        : null;
    const gapTop5 =
      activeBranchStudy.t2bPercent !== null && overrides?.top5T2B !== null && overrides?.top5T2B !== undefined
        ? Number((activeBranchStudy.t2bPercent - overrides.top5T2B).toFixed(1))
        : null;

    return (
      <PageFrameA4
        page={page}
        pageNumber={pageNumber}
        totalPages={totalPages}
        doc={doc}
        computed={computed}
        isPrintMode={isPrintMode}
        onUpdatePage={onUpdatePage}
      >
        <div className="flex flex-col justify-between h-full gap-2.5">
          {/* Upper KPI Strip */}
          <div className="grid grid-cols-5 gap-3">
            <div className="rounded-xl bg-[#001E50] p-3 text-white">
              <span className="text-[9px] font-bold uppercase tracking-wider text-sky-300 block">
                Encuestas Válidas ({prog === 'CLUB_SSI' ? 'Club SSI' : prog})
              </span>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">
                {activeBranchStudy.validCount}
              </p>
              <p className="text-[9px] text-slate-300">
                {study.periodMatchingMode === 'exact_period'
                  ? 'Período exacto'
                  : study.periodMatchingMode === 'semester_or_year'
                    ? 'Acumulado año/ola'
                    : 'Sin registros'}
              </p>
            </div>

            {subOpts.showGeneralSatisfaction && (
              <div className="rounded-xl border border-slate-200 bg-[#F5F7FA] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#5A6A85]">
                    Satisfacción Gral.
                  </span>
                  <ComplianceBadge status={activeBranchStudy.compliance} compact />
                </div>
                <p className="mt-1 text-2xl font-extrabold text-[#001E50] tabular-nums">
                  {formatMetricAr(activeBranchStudy.satisfactionAvg)}
                </p>
                <p className="text-[9px] text-[#5A6A85]">Escala 0 a 10 pts</p>
              </div>
            )}

            {subOpts.showRecommendation && (
              <div className="rounded-xl border border-slate-200 bg-[#F5F7FA] p-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#5A6A85] block">
                  Recomendación
                </span>
                <p className="mt-1 text-2xl font-extrabold text-[#001E50] tabular-nums">
                  {formatMetricAr(activeBranchStudy.recommendationAvg)}
                </p>
                <p className="text-[9px] text-[#5A6A85]">Promedio nota recom.</p>
              </div>
            )}

            {!isClubSsi && (
              <div className="rounded-xl border border-slate-200 bg-[#F5F7FA] p-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#5A6A85] block">
                  Top 2 Box (Notas 9–10)
                </span>
                <p className="mt-1 text-2xl font-extrabold text-[#0072CE] tabular-nums">
                  {activeBranchStudy.t2bPercent !== null
                    ? `${formatMetricAr(activeBranchStudy.t2bPercent, 1)}%`
                    : 'Sin datos'}
                </p>
                <p className="text-[9px] text-[#5A6A85]">Proporción conformes</p>
              </div>
            )}

            {/* Market & Top 5 Reference Card (Explicitly separated & editable per period) */}
            {!isClubSsi && (subOpts.showMarketComparison || subOpts.showTop5Comparison) ? (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#001E50]">
                    Referencias {prog}
                  </span>
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold text-amber-700">
                    Carga manual período
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[10px]">
                  {subOpts.showMarketComparison && (
                    <div>
                      <span className="text-[#5A6A85] block text-[8px] uppercase font-bold">Media Mercado %</span>
                      {!isPrintMode ? (
                        <input
                          type="number"
                          step="0.1"
                          value={overrides?.marketT2B ?? ''}
                          onChange={e =>
                            onUpdatePage({
                              surveyBenchmarkOverride: {
                                marketT2B: e.target.value ? Number(e.target.value) : null,
                                top5T2B: overrides?.top5T2B ?? null,
                                marketScore: overrides?.marketScore ?? null,
                                targetScore: overrides?.targetScore ?? 8.8,
                                validatedForPeriod: true,
                              },
                            })
                          }
                          placeholder="Ej: 78.0"
                          className="w-full border-b border-slate-200 font-extrabold text-[#001E50] outline-none"
                        />
                      ) : (
                        <strong className="text-[#001E50]">
                          {overrides?.marketT2B != null ? `${overrides.marketT2B}%` : 'Pend.'}
                        </strong>
                      )}
                      {gapMarket !== null && (
                        <span className={`block text-[9px] font-bold ${gapMarket >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          Brecha: {gapMarket >= 0 ? `+${gapMarket}` : gapMarket} pp
                        </span>
                      )}
                    </div>
                  )}
                  {subOpts.showTop5Comparison && (
                    <div>
                      <span className="text-[#5A6A85] block text-[8px] uppercase font-bold">Top 5 T2B %</span>
                      {!isPrintMode ? (
                        <input
                          type="number"
                          step="0.1"
                          value={overrides?.top5T2B ?? ''}
                          onChange={e =>
                            onUpdatePage({
                              surveyBenchmarkOverride: {
                                marketT2B: overrides?.marketT2B ?? null,
                                top5T2B: e.target.value ? Number(e.target.value) : null,
                                marketScore: overrides?.marketScore ?? null,
                                targetScore: overrides?.targetScore ?? 8.8,
                                validatedForPeriod: true,
                              },
                            })
                          }
                          placeholder="Ej: 85.0"
                          className="w-full border-b border-slate-200 font-extrabold text-[#001E50] outline-none"
                        />
                      ) : (
                        <strong className="text-[#001E50]">
                          {overrides?.top5T2B != null ? `${overrides.top5T2B}%` : 'Pend.'}
                        </strong>
                      )}
                      {gapTop5 !== null && (
                        <span className={`block text-[9px] font-bold ${gapTop5 >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                          Brecha: {gapTop5 >= 0 ? `+${gapTop5}` : gapTop5} pp
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#5A6A85] block">
                  Jujuy vs. Salta
                </span>
                <p className="mt-1 text-xs font-extrabold text-[#001E50]">
                  Jujuy: {formatMetricAr(study.byBranch.JUJUY.satisfactionAvg)} ({study.byBranch.JUJUY.validCount})
                </p>
                <p className="mt-0.5 text-xs font-extrabold text-[#0072CE]">
                  Salta: {formatMetricAr(study.byBranch.SALTA.satisfactionAvg)} ({study.byBranch.SALTA.validCount})
                </p>
              </div>
            )}
          </div>

          {/* Middle Section: Clean Study Interpretation & Concessionaire Breakdown */}
          <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
            <div className="col-span-5 rounded-xl border border-slate-200 bg-[#F5F7FA]/70 p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#001E50] block">
                  Apertura por Concesionario ({prog === 'CLUB_SSI' ? 'Club SSI' : prog})
                </span>
                <p className="mt-1 text-xs text-[#5A6A85]">
                  Muestra válida y satisfacción por punto de atención:
                </p>

                <div className="mt-3.5 space-y-2.5">
                  <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-200 shadow-2xs">
                    <div>
                      <p className="text-xs font-extrabold text-[#001E50]">Autosol Jujuy (3059)</p>
                      <p className="text-[10px] text-[#5A6A85]">{study.byBranch.JUJUY.validCount} encuestas válidas</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-[#001E50]">
                        {study.byBranch.JUJUY.validCount > 0 ? formatMetricAr(study.byBranch.JUJUY.satisfactionAvg) : 'S/D'}
                      </span>
                      <span className="text-[10px] font-bold text-[#5A6A85] block">/ 10 pts</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-3 border border-slate-200 shadow-2xs">
                    <div>
                      <p className="text-xs font-extrabold text-[#0072CE]">Autosol Salta (3087)</p>
                      <p className="text-[10px] text-[#5A6A85]">{study.byBranch.SALTA.validCount} encuestas válidas</p>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-extrabold text-[#0072CE]">
                        {study.byBranch.SALTA.validCount > 0 ? formatMetricAr(study.byBranch.SALTA.satisfactionAvg) : 'S/D'}
                      </span>
                      <span className="text-[10px] font-bold text-[#5A6A85] block">/ 10 pts</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-sky-50 border border-sky-100 p-2.5 mt-2">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#0072CE] block">
                  Metodología Oficial Volkswagen
                </span>
                <p className="text-[10px] text-[#001E50]">
                  Evaluación sobre clientes encuestados por la marca. Métrica Top 2 Boxes (T2B) sobre notas 9 y 10.
                </p>
              </div>
            </div>

            <div className="col-span-7 rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0072CE]">
                  {page.narrativeTitle || `Lectura y Conclusiones del Estudio ${prog}`}
                </span>
                {isPrintMode ? (
                  <p className="mt-3 text-xs leading-relaxed text-[#001E50] whitespace-pre-wrap">
                    {page.narrativeBody ||
                      `Evaluación oficial del programa ${prog}. Los datos reflejan la percepción de clientes contactados por Volkswagen para el seguimiento de estándares de atención y servicio.`}
                  </p>
                ) : (
                  <textarea
                    value={page.narrativeBody}
                    onChange={e => onUpdatePage({ narrativeBody: e.target.value })}
                    rows={5}
                    placeholder={`Redactar interpretación de resultados y hallazgos específicos de ${prog}...`}
                    className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-[#F5F7FA]/50 p-3 text-xs leading-relaxed text-[#001E50] outline-none focus:border-[#0072CE] focus:bg-white placeholder:text-slate-400"
                  />
                )}
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[10px] text-[#5A6A85]">
                <span>Trazabilidad independiente de datos</span>
                <span className="font-extrabold text-[#001E50]">{prog === 'CLUB_SSI' ? 'Club SSI' : prog}</span>
              </div>
            </div>
          </div>

          {/* Integrated Action Plan for this Survey Study */}
          {page.actionBlock && (
            <IntegratedIndicatorActionSection
              block={page.actionBlock}
              branchSelection={doc.branchSelection}
              matchingPlans={computed.matchingActionPlans}
              isPrintMode={isPrintMode}
              onUpdateBlock={nextBlock => onUpdatePage({ actionBlock: nextBlock })}
            />
          )}
        </div>
      </PageFrameA4>
    );
  }

  // 6. PLANTILLA 6: AUDITORÍAS (PCGC / ISO 9001 / GAMS) + PLAN DE ACCIÓN INTEGRADO
  if (page.templateType === 'audits') {
    const entries = page.auditEntries || [];

    const updateAuditEntry = (id: string, patch: Partial<AuditEntryData>) => {
      onUpdatePage({
        auditEntries: entries.map(e => (e.id === id ? { ...e, ...patch } : e)),
      });
    };

    const addAuditEntry = () => {
      const next: AuditEntryData = {
        id: `audit-${Date.now()}`,
        auditType: 'OTRA',
        auditName: 'Nueva Auditoría de Calidad',
        branch: doc.branchSelection === 'BOTH' ? 'AMBAS' : doc.branchSelection,
        periodLabel: computed.periodLabel,
        scoreResult: '',
        numericResult: null,
        targetScore: 90,
        status: 'pending_evaluation',
        auditStateLabel: 'En preparación',
        mandatoryDeviationsCount: 0,
        pendingActionsCount: 0,
        chapters: [],
        mainDeviationsText: '',
        observationsText: '',
        isManualSource: true,
      };
      onUpdatePage({ auditEntries: [...entries, next] });
    };

    return (
      <PageFrameA4
        page={page}
        pageNumber={pageNumber}
        totalPages={totalPages}
        doc={doc}
        computed={computed}
        isPrintMode={isPrintMode}
        onUpdatePage={onUpdatePage}
      >
        <div className="flex flex-col justify-between h-full gap-2.5">
          {/* Methodological Note for PCGC */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-[#F5F7FA] px-3.5 py-1.5 text-[10px] text-[#5A6A85]">
            <span>
              <strong className="text-[#001E50]">Referencia documental:</strong> La base PCGC conectada ({computed.pcgcSummary.totalRequirements} requisitos) corresponde al listado de control. Los resultados oficiales de auditoría y desvíos mandatorios se registran a continuación.
            </span>
            {!isPrintMode && (
              <button
                type="button"
                onClick={addAuditEntry}
                className="inline-flex items-center gap-1 rounded-md bg-[#001E50] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-white hover:bg-[#0072CE] shrink-0"
              >
                <Plus className="h-3 w-3" />
                Agregar auditoría
              </button>
            )}
          </div>

          {/* Audit Cards Grid */}
          <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
            <div className="col-span-8 flex flex-col gap-2.5 overflow-y-auto pr-1">
              {entries.map(audit => (
                <div
                  key={audit.id}
                  className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="rounded bg-[#001E50] px-2 py-0.5 text-[9px] font-extrabold uppercase text-white">
                        {audit.auditType.replace('_', ' ')}
                      </span>
                      {isPrintMode ? (
                        <h4 className="text-sm font-extrabold text-[#001E50]">{audit.auditName}</h4>
                      ) : (
                        <input
                          type="text"
                          value={audit.auditName}
                          onChange={e => updateAuditEntry(audit.id, { auditName: e.target.value })}
                          className="flex-1 bg-transparent text-sm font-extrabold text-[#001E50] outline-none border-b border-transparent focus:border-[#0072CE]"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {!isPrintMode ? (
                        <select
                          value={audit.status}
                          onChange={e => {
                            const nextStatus = e.target.value as ComplianceStatus;
                            updateAuditEntry(audit.id, { status: nextStatus });
                            if (page.actionBlock && nextStatus === 'deviated') {
                              onUpdatePage({
                                actionBlock: {
                                  ...page.actionBlock,
                                  visible: true,
                                  overallCompliance: 'deviated',
                                },
                              });
                            }
                          }}
                          className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-[#001E50]"
                        >
                          <option value="pending_evaluation">Pendiente de evaluación</option>
                          <option value="compliant">Cumple estándar</option>
                          <option value="deviated">Con desvío / No conformidad</option>
                        </select>
                      ) : (
                        <ComplianceBadge status={audit.status} compact />
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-4 gap-3 text-xs">
                    <div className="rounded-lg bg-[#F5F7FA] p-2">
                      <span className="text-[9px] font-bold uppercase text-[#5A6A85] block">
                        Resultado / Puntaje
                      </span>
                      {isPrintMode ? (
                        <p className="mt-0.5 text-base font-extrabold text-[#001E50]">
                          {audit.scoreResult || 'Pendiente'}
                        </p>
                      ) : (
                        <input
                          type="text"
                          value={audit.scoreResult}
                          onChange={e => updateAuditEntry(audit.id, { scoreResult: e.target.value })}
                          placeholder="Ej: 92,5% / Aprobada"
                          className="mt-0.5 w-full bg-transparent text-sm font-extrabold text-[#001E50] outline-none"
                        />
                      )}
                    </div>

                    <div className="rounded-lg bg-[#F5F7FA] p-2">
                      <span className="text-[9px] font-bold uppercase text-[#5A6A85] block">
                        Sucursal / Alcance
                      </span>
                      {isPrintMode ? (
                        <p className="mt-0.5 font-bold text-[#001E50]">{audit.branch}</p>
                      ) : (
                        <select
                          value={audit.branch}
                          onChange={e =>
                            updateAuditEntry(audit.id, {
                              branch: e.target.value as 'JUJUY' | 'SALTA' | 'AMBAS',
                            })
                          }
                          className="mt-0.5 w-full bg-transparent font-bold text-[#001E50] outline-none"
                        >
                          <option value="AMBAS">Jujuy y Salta</option>
                          <option value="JUJUY">Jujuy (3059)</option>
                          <option value="SALTA">Salta (3087)</option>
                        </select>
                      )}
                    </div>

                    <div className="rounded-lg bg-[#F5F7FA] p-2">
                      <span className="text-[9px] font-bold uppercase text-[#5A6A85] block">
                        Desvíos Mandatorios
                      </span>
                      {isPrintMode ? (
                        <p className="mt-0.5 font-extrabold text-[#B91C1C]">
                          {audit.mandatoryDeviationsCount}
                        </p>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={audit.mandatoryDeviationsCount}
                          onChange={e =>
                            updateAuditEntry(audit.id, {
                              mandatoryDeviationsCount: Number(e.target.value) || 0,
                            })
                          }
                          className="mt-0.5 w-full bg-transparent font-extrabold text-[#B91C1C] outline-none"
                        />
                      )}
                    </div>

                    <div className="rounded-lg bg-[#F5F7FA] p-2">
                      <span className="text-[9px] font-bold uppercase text-[#5A6A85] block">
                        Acciones Pendientes
                      </span>
                      {isPrintMode ? (
                        <p className="mt-0.5 font-extrabold text-[#001E50]">
                          {audit.pendingActionsCount}
                        </p>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={audit.pendingActionsCount}
                          onChange={e =>
                            updateAuditEntry(audit.id, {
                              pendingActionsCount: Number(e.target.value) || 0,
                            })
                          }
                          className="mt-0.5 w-full bg-transparent font-extrabold text-[#001E50] outline-none"
                        />
                      )}
                    </div>
                  </div>

                  {/* Principales Desvíos / Observaciones */}
                  <div className="mt-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#0072CE] block">
                      Principales hallazgos / desvíos de la auditoría
                    </span>
                    {isPrintMode ? (
                      <p className="mt-0.5 text-[11px] text-[#001E50]">
                        {audit.mainDeviationsText || 'Sin desvíos críticos documentados en este bloque.'}
                      </p>
                    ) : (
                      <input
                        type="text"
                        value={audit.mainDeviationsText}
                        onChange={e => updateAuditEntry(audit.id, { mainDeviationsText: e.target.value })}
                        placeholder="Describir capítulos observados o desvíos detectados..."
                        className="mt-0.5 w-full bg-transparent text-[11px] text-[#001E50] outline-none border-b border-transparent focus:border-slate-300"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Evidence / Screenshot Upload for Audits */}
            <div className="col-span-4 flex flex-col rounded-xl border border-slate-200 bg-[#F5F7FA]/60 p-3 min-h-0">
              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#001E50] mb-1.5">
                Evidencia Oficial / Captura de Auditoría
              </span>
              <DirectionReportImageBlock
                images={page.images}
                layoutPreset="single_large"
                isPrintMode={isPrintMode}
                selectedImageId={selectedImageId}
                onSelectImage={onSelectImage}
                onChangeImages={nextImages => onUpdatePage({ images: nextImages })}
                compactMode
              />
            </div>
          </div>

          {/* Integrated Action Plan for Audits */}
          {page.actionBlock && (
            <IntegratedIndicatorActionSection
              block={page.actionBlock}
              branchSelection={doc.branchSelection}
              matchingPlans={computed.matchingActionPlans}
              isPrintMode={isPrintMode}
              onUpdateBlock={nextBlock => onUpdatePage({ actionBlock: nextBlock })}
            />
          )}
        </div>
      </PageFrameA4>
    );
  }

  // 8. PLANTILLA 7: INCENTIVOS (VENTAS Y POSTVENTA)
  if (page.templateType === 'incentives') {
    const entries = page.incentiveEntries || computed.defaultIncentives;

    const updateEntry = (id: string, patch: Partial<IncentiveEntryData>) => {
      onUpdatePage({
        incentiveEntries: entries.map(item => (item.id === id ? { ...item, ...patch } : item)),
      });
    };

    return (
      <PageFrameA4
        page={page}
        pageNumber={pageNumber}
        totalPages={totalPages}
        doc={doc}
        computed={computed}
        isPrintMode={isPrintMode}
        onUpdatePage={onUpdatePage}
      >
        <div className="flex flex-col justify-between h-full gap-3">
          <div className="rounded-lg border border-slate-200 bg-[#F5F7FA] px-3.5 py-2 text-[10px] text-[#5A6A85] flex items-center justify-between">
            <span>
              <strong className="text-[#001E50]">Módulo de Resumen de Incentivos:</strong> Los resultados de calidad se vinculan automáticamente con el período {computed.periodLabel}. Los tramos, penalizaciones e importes estimados pueden completarse o ajustarse manualmente para Dirección.
            </span>
            <span className="rounded bg-[#001E50]/10 px-2 py-0.5 text-[9px] font-bold text-[#001E50]">
              Resumen Respaldado / Editable
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            {entries.map(item => (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[9px] font-extrabold uppercase text-white ${
                        item.branch === 'JUJUY' ? 'bg-[#001E50]' : 'bg-[#0072CE]'
                      }`}
                    >
                      {item.branch}
                    </span>
                    <h4 className="text-sm font-extrabold text-[#001E50]">
                      Incentivos {item.area}
                    </h4>
                  </div>
                  <ComplianceBadge status={item.complianceStatus} compact />
                </div>

                <div className="my-2 grid grid-cols-2 gap-2.5 text-xs">
                  <div className="rounded-lg bg-[#F5F7FA] p-2">
                    <span className="text-[9px] font-bold uppercase text-[#5A6A85] block">
                      Resultado Período
                    </span>
                    <p className="mt-0.5 font-extrabold text-[#001E50]">{item.currentResultText}</p>
                  </div>

                  <div className="rounded-lg bg-[#F5F7FA] p-2">
                    <span className="text-[9px] font-bold uppercase text-[#5A6A85] block">
                      Escala de Cobro
                    </span>
                    {isPrintMode ? (
                      <p className="mt-0.5 font-bold text-[#001E50]">{item.scaleReached}</p>
                    ) : (
                      <input
                        type="text"
                        value={item.scaleReached}
                        onChange={e => updateEntry(item.id, { scaleReached: e.target.value })}
                        className="mt-0.5 w-full bg-transparent font-bold text-[#001E50] outline-none"
                      />
                    )}
                  </div>

                  <div className="rounded-lg bg-[#F5F7FA] p-2">
                    <span className="text-[9px] font-bold uppercase text-[#5A6A85] block">
                      % Aplicable / Bonus
                    </span>
                    {isPrintMode ? (
                      <p className="mt-0.5 font-extrabold text-[#0072CE]">{item.applicablePctText}</p>
                    ) : (
                      <input
                        type="text"
                        value={item.applicablePctText}
                        onChange={e => updateEntry(item.id, { applicablePctText: e.target.value })}
                        className="mt-0.5 w-full bg-transparent font-extrabold text-[#0072CE] outline-none"
                      />
                    )}
                  </div>

                  <div className="rounded-lg bg-[#F5F7FA] p-2">
                    <span className="text-[9px] font-bold uppercase text-[#5A6A85] block">
                      Penalizaciones
                    </span>
                    {isPrintMode ? (
                      <p className="mt-0.5 font-bold text-[#B91C1C]">{item.penaltyText}</p>
                    ) : (
                      <input
                        type="text"
                        value={item.penaltyText}
                        onChange={e => updateEntry(item.id, { penaltyText: e.target.value })}
                        className="mt-0.5 w-full bg-transparent font-bold text-[#B91C1C] outline-none"
                      />
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-[#001E50] px-3.5 py-2 text-white">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-sky-300">
                    Importe / Impacto Estimado (Manual)
                  </span>
                  {isPrintMode ? (
                    <span className="text-sm font-extrabold">{item.estimatedAmountText}</span>
                  ) : (
                    <input
                      type="text"
                      value={item.estimatedAmountText}
                      onChange={e => updateEntry(item.id, { estimatedAmountText: e.target.value })}
                      placeholder="$ 0 / % Mayorista"
                      className="bg-transparent text-right text-sm font-extrabold text-white outline-none border-b border-white/20 focus:border-sky-300"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#0072CE] block">
              {page.narrativeTitle || 'Notas Ejecutivas sobre Liquidación e Incentivos'}
            </span>
            {isPrintMode ? (
              <p className="mt-1 text-xs text-[#001E50]">
                {page.narrativeBody ||
                  'Los porcentajes de cobro y bonus se encuentran sujetos al cierre definitivo de marca y validación de requisitos mandatorios del trimestre.'}
              </p>
            ) : (
              <input
                type="text"
                value={page.narrativeBody}
                onChange={e => onUpdatePage({ narrativeBody: e.target.value })}
                placeholder="Agregar comentario sobre liquidación, escalas o condiciones del trimestre..."
                className="mt-1 w-full bg-transparent text-xs text-[#001E50] outline-none"
              />
            )}
          </div>
        </div>
      </PageFrameA4>
    );
  }

  // 9. PLANTILLA 8: MATRIZ DE CUMPLIMIENTO DE OBJETIVOS Y ANÁLISIS DE CAUSAS (2 COLUMNAS)
  if (page.templateType === 'analysis_causes') {
    return (
      <PageFrameA4
        page={page}
        pageNumber={pageNumber}
        totalPages={totalPages}
        doc={doc}
        computed={computed}
        isPrintMode={isPrintMode}
        onUpdatePage={onUpdatePage}
      >
        <div className="flex flex-col justify-between h-full gap-3">
          {/* Upper Matrix of Active Objectives */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            <div className="bg-[#001E50] px-4 py-2 text-white flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider">
                Matriz Consolidada de Cumplimiento frente a Objetivos Vigentes
              </span>
              <span className="text-[9px] text-sky-300 font-semibold">
                Valores vinculados automáticamente
              </span>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-[#F5F7FA] text-[9px] font-extrabold uppercase tracking-wider text-[#5A6A85]">
                  <th className="py-2 px-3">Área</th>
                  <th className="py-2 px-3">Indicador</th>
                  <th className="py-2 px-3">Objetivo</th>
                  <th className="py-2 px-3">Jujuy (3059)</th>
                  <th className="py-2 px-3">Salta (3087)</th>
                  <th className="py-2 px-3">Consolidado</th>
                  <th className="py-2 px-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody>
                {computed.objectivesMatrix.map(row => (
                  <tr key={row.indicatorKey} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 px-3 font-bold text-[#0072CE]">{row.area}</td>
                    <td className="py-2 px-3 font-extrabold text-[#001E50]">{row.name}</td>
                    <td className="py-2 px-3 font-bold text-[#5A6A85]">{row.targetText}</td>
                    <td className="py-2 px-3 font-bold tabular-nums">
                      {formatMetricAr(row.jujuyValue, row.unit === '%' ? 1 : 2, row.unit === '%' ? '%' : '')}
                    </td>
                    <td className="py-2 px-3 font-bold tabular-nums">
                      {formatMetricAr(row.saltaValue, row.unit === '%' ? 1 : 2, row.unit === '%' ? '%' : '')}
                    </td>
                    <td className="py-2 px-3 font-extrabold text-[#001E50] tabular-nums">
                      {formatMetricAr(row.consolidatedValue, row.unit === '%' ? 1 : 2, row.unit === '%' ? '%' : '')}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <ComplianceBadge status={row.consolidatedStatus} compact />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Lower Two-Column Analysis (Principales Hallazgos & Causas vs. Impacto & Acciones Propuestas) */}
          <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="rounded-xl border border-slate-200 bg-[#F5F7FA] p-4 flex flex-col">
              {isPrintMode ? (
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#001E50] border-b border-slate-200 pb-2">
                  {page.narrativeTitle || 'Principales Hallazgos y Causas Identificadas'}
                </h4>
              ) : (
                <input
                  type="text"
                  value={page.narrativeTitle}
                  onChange={e => onUpdatePage({ narrativeTitle: e.target.value })}
                  className="bg-transparent text-xs font-extrabold uppercase tracking-wider text-[#001E50] border-b border-slate-200 pb-2 outline-none"
                />
              )}
              {isPrintMode ? (
                <p className="mt-2.5 text-xs leading-relaxed text-[#001E50] whitespace-pre-wrap">
                  {page.narrativeBody || 'Espacio destinado a sintetizar los hallazgos estructurales del período y las causas raíz transversales identificadas.'}
                </p>
              ) : (
                <textarea
                  value={page.narrativeBody}
                  onChange={e => onUpdatePage({ narrativeBody: e.target.value })}
                  placeholder="Redactar principales hallazgos y causas identificadas en el período..."
                  className="mt-2.5 flex-1 w-full resize-none bg-transparent text-xs leading-relaxed text-[#001E50] outline-none placeholder:text-slate-400"
                />
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col">
              {isPrintMode ? (
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#0072CE] border-b border-slate-100 pb-2">
                  {page.secondaryNarrativeTitle || 'Impacto Operativo y Propuestas de Mejora'}
                </h4>
              ) : (
                <input
                  type="text"
                  value={page.secondaryNarrativeTitle || 'Impacto Operativo y Propuestas de Mejora'}
                  onChange={e => onUpdatePage({ secondaryNarrativeTitle: e.target.value })}
                  className="bg-transparent text-xs font-extrabold uppercase tracking-wider text-[#0072CE] border-b border-slate-100 pb-2 outline-none"
                />
              )}
              {isPrintMode ? (
                <p className="mt-2.5 text-xs leading-relaxed text-[#001E50] whitespace-pre-wrap">
                  {page.secondaryNarrativeBody || 'Síntesis del impacto comercial/postventa y lineamientos estratégicos propuestos para el próximo corte.'}
                </p>
              ) : (
                <textarea
                  value={page.secondaryNarrativeBody || ''}
                  onChange={e => onUpdatePage({ secondaryNarrativeBody: e.target.value })}
                  placeholder="Redactar el impacto estimado y las propuestas de intervención..."
                  className="mt-2.5 flex-1 w-full resize-none bg-transparent text-xs leading-relaxed text-[#001E50] outline-none placeholder:text-slate-400"
                />
              )}
            </div>
          </div>
        </div>
      </PageFrameA4>
    );
  }

  // 10. PLANTILLA 9 / CONTINUACIÓN DE PLAN DE ACCIÓN VINCULADO A UN INDICADOR
  if (page.templateType === 'action_plan_continuation') {
    return (
      <PageFrameA4
        page={page}
        pageNumber={pageNumber}
        totalPages={totalPages}
        doc={doc}
        computed={computed}
        isPrintMode={isPrintMode}
        onUpdatePage={onUpdatePage}
      >
        <div className="flex flex-col justify-between h-full gap-3">
          <div className="rounded-xl border border-slate-200 bg-[#F5F7FA] p-3.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0072CE] block">
              Continuación de Análisis y Seguimiento
            </span>
            {isPrintMode ? (
              <p className="mt-1 text-xs text-[#001E50]">
                {page.narrativeBody || 'Detalle ampliado de causas raíz, acciones correctivas y seguimiento de eficacia vinculados al indicador.'}
              </p>
            ) : (
              <textarea
                value={page.narrativeBody}
                onChange={e => onUpdatePage({ narrativeBody: e.target.value })}
                rows={2}
                placeholder="Contexto adicional para la página de continuación del plan de acción..."
                className="mt-1 w-full resize-none bg-transparent text-xs text-[#001E50] outline-none"
              />
            )}
          </div>

          {page.actionBlock && (
            <div className="flex-1 flex flex-col justify-start">
              <IntegratedIndicatorActionSection
                block={{ ...page.actionBlock, visible: true, layoutMode: 'expanded' }}
                branchSelection={doc.branchSelection}
                matchingPlans={computed.matchingActionPlans}
                isPrintMode={isPrintMode}
                onUpdateBlock={nextBlock => onUpdatePage({ actionBlock: nextBlock })}
              />
            </div>
          )}
        </div>
      </PageFrameA4>
    );
  }

  // 11. PLANTILLA 10: FOTOGRAFÍAS, CAPTURAS Y EVIDENCIAS
  if (page.templateType === 'photo_evidences') {
    return (
      <PageFrameA4
        page={page}
        pageNumber={pageNumber}
        totalPages={totalPages}
        doc={doc}
        computed={computed}
        isPrintMode={isPrintMode}
        onUpdatePage={onUpdatePage}
      >
        <div className="flex flex-col justify-between h-full gap-3">
          <div className="flex-1 min-h-0 flex flex-col">
            <DirectionReportImageBlock
              images={page.images}
              layoutPreset={page.photoLayout || 'two_comparative'}
              isPrintMode={isPrintMode}
              selectedImageId={selectedImageId}
              onSelectImage={onSelectImage}
              onChangeImages={nextImages => onUpdatePage({ images: nextImages })}
              onChangeLayoutPreset={preset => onUpdatePage({ photoLayout: preset })}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-[#F5F7FA] px-4 py-2.5 shrink-0">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#0072CE] block">
              {page.narrativeTitle || 'Síntesis Documental de Evidencias'}
            </span>
            {isPrintMode ? (
              <p className="mt-0.5 text-xs text-[#001E50]">
                {page.narrativeBody || 'Registro visual incorporado para respaldo de Dirección y seguimiento de estándares físicos y digitales.'}
              </p>
            ) : (
              <input
                type="text"
                value={page.narrativeBody}
                onChange={e => onUpdatePage({ narrativeBody: e.target.value })}
                placeholder="Comentario general sobre las fotografías o capturas de esta página..."
                className="mt-0.5 w-full bg-transparent text-xs text-[#001E50] outline-none"
              />
            )}
          </div>
        </div>
      </PageFrameA4>
    );
  }

  // 12. PLANTILLA 11: CIERRE INSTITUCIONAL (FIN DEL INFORME)
  if (page.templateType === 'next_steps') {
    return (
      <PageFrameA4
        page={page}
        pageNumber={pageNumber}
        totalPages={totalPages}
        doc={doc}
        computed={computed}
        isPrintMode={isPrintMode}
        onUpdatePage={onUpdatePage}
      >
        <div className="flex flex-col justify-between h-full py-3">
          <InheritedReviewBanner
            isInherited={page.isInheritedPendingReview}
            isPrintMode={isPrintMode}
            onConfirmReview={() => onUpdatePage({ isInheritedPendingReview: false })}
          />

          {/* Banner Institucional de Cierre */}
          <div className="rounded-2xl bg-gradient-to-r from-[#001E50] via-[#002868] to-[#001E50] p-6 text-white flex items-center justify-between shadow-md">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-sky-300 block">
                Cierre de Informe · Dirección General
              </span>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-white">
                Fin del Informe Ejecutivo
              </h3>
              <p className="mt-1 text-xs text-slate-300">
                Sistema de Gestión de Calidad y Experiencia al Cliente · {computed.periodLabel}
              </p>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="text-sm font-extrabold text-white">Autosol S.R.L.</span>
              <span className="text-xs text-sky-200">Concesionario Oficial Volkswagen</span>
              <span className="mt-1 rounded-md bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-slate-200">
                Jujuy (3059) · Salta (3087)
              </span>
            </div>
          </div>

          {/* Bloque Central de Conclusiones Finales */}
          <div className="flex-1 my-4 rounded-2xl border border-slate-200 bg-white p-6 flex flex-col justify-between shadow-xs">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#0072CE] block">
                {page.narrativeTitle || 'Conclusiones y Consideraciones Finales de Calidad'}
              </span>
              {isPrintMode ? (
                <p className="mt-3 text-xs leading-relaxed text-[#001E50] whitespace-pre-wrap">
                  {page.narrativeBody ||
                    'El presente informe consolida los resultados oficiales de Calidad y Experiencia del Cliente correspondientes al período evaluado. Se ratifica el compromiso con los estándares de excelencia de marca Volkswagen, manteniendo el seguimiento riguroso de cada oportunidad de mejora a través de sus respectivos planes de acción.'}
                </p>
              ) : (
                <textarea
                  value={page.narrativeBody}
                  onChange={e => onUpdatePage({ narrativeBody: e.target.value })}
                  rows={5}
                  placeholder="Redactar palabras de cierre, conclusiones o agradecimiento para Dirección..."
                  className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-[#F5F7FA]/60 p-4 text-xs leading-relaxed text-[#001E50] outline-none focus:border-[#0072CE] focus:bg-white placeholder:text-slate-400"
                />
              )}
            </div>

            {/* Firmas / Conformidad Directiva */}
            <div className="mt-6 border-t border-slate-100 pt-6">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#5A6A85] block mb-6 text-center">
                Conformidad y Revisión de Dirección
              </span>
              <div className="grid grid-cols-3 gap-8 text-center">
                <div className="border-t border-slate-300 pt-2">
                  <p className="text-xs font-extrabold text-[#001E50]">Nelson Tolaba</p>
                  <p className="text-[10px] text-[#5A6A85]">Responsable de Calidad</p>
                  <p className="text-[9px] text-slate-400">Autosol Jujuy y Salta</p>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <p className="text-xs font-extrabold text-[#001E50]">Gerencia General</p>
                  <p className="text-[10px] text-[#5A6A85]">Operaciones Autosol</p>
                  <p className="text-[9px] text-slate-400">Revisión de Cumplimiento</p>
                </div>
                <div className="border-t border-slate-300 pt-2">
                  <p className="text-xs font-extrabold text-[#001E50]">Dirección General</p>
                  <p className="text-[10px] text-[#5A6A85]">Autosol S.R.L.</p>
                  <p className="text-[9px] text-slate-400">Aprobación Final</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pie Institucional */}
          <div className="flex items-center justify-between text-[10px] text-[#5A6A85] px-2">
            <span>Documento confidencial para uso exclusivo de Dirección</span>
            <span className="font-semibold text-[#001E50]">¡Muchas Gracias! · Autosol S.R.L.</span>
          </div>
        </div>
      </PageFrameA4>
    );
  }

  // 13. CUSTOM PAGE (PÁGINA PERSONALIZADA DESDE CERO)
  const customCards = page.customCards || [];
  const customChart = page.customChart;

  return (
    <PageFrameA4
      page={page}
      pageNumber={pageNumber}
      totalPages={totalPages}
      doc={doc}
      computed={computed}
      isPrintMode={isPrintMode}
      onUpdatePage={onUpdatePage}
    >
      <div className="flex flex-col justify-between h-full gap-3">
        {/* Custom Cards Row */}
        {customCards.length > 0 && (
          <div className={`grid grid-cols-${Math.min(4, Math.max(2, customCards.length))} gap-3`}>
            {customCards.map(card => (
              <div
                key={card.id}
                className="rounded-xl border border-slate-200 bg-[#F5F7FA] p-3"
              >
                <div className="flex items-center justify-between">
                  {isPrintMode ? (
                    <span className="text-[10px] font-extrabold uppercase text-[#001E50]">
                      {card.label}
                    </span>
                  ) : (
                    <input
                      type="text"
                      value={card.label}
                      onChange={e =>
                        onUpdatePage({
                          customCards: customCards.map(c =>
                            c.id === card.id ? { ...c, label: e.target.value } : c
                          ),
                        })
                      }
                      className="bg-transparent text-[10px] font-extrabold uppercase text-[#001E50] outline-none"
                    />
                  )}
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[8px] font-bold text-[#001E50]">
                    Manual
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between">
                  {isPrintMode ? (
                    <span className="text-2xl font-extrabold text-[#001E50]">{card.value}</span>
                  ) : (
                    <input
                      type="text"
                      value={card.value}
                      onChange={e =>
                        onUpdatePage({
                          customCards: customCards.map(c =>
                            c.id === card.id ? { ...c, value: e.target.value } : c
                          ),
                        })
                      }
                      className="w-24 bg-transparent text-2xl font-extrabold text-[#001E50] outline-none border-b border-transparent focus:border-[#0072CE]"
                    />
                  )}
                  <span className="text-[10px] text-[#5A6A85]">Meta: {card.target}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Middle Custom Chart + Custom Narrative / Image */}
        <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
          {customChart ? (
            <div className="col-span-6 rounded-xl border border-slate-200 bg-[#F5F7FA]/60 p-3 flex flex-col min-h-0">
              <h4 className="text-xs font-extrabold uppercase text-[#001E50] mb-1">
                {customChart.title}
              </h4>
              <div className="flex-1 min-h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customChart.dataPoints} margin={{ top: 16, right: 16, left: -12, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#001E50' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#5A6A85' }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#001E50" radius={[6, 6, 0, 0]} barSize={32}>
                      <LabelList dataKey="value" position="top" style={{ fill: '#001E50', fontSize: 10, fontWeight: 800 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}

          <div className={`${customChart ? 'col-span-6' : 'col-span-12'} flex flex-col gap-3 min-h-0`}>
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 flex-1 flex flex-col">
              {isPrintMode ? (
                <h4 className="text-xs font-extrabold uppercase text-[#0072CE]">
                  {page.narrativeTitle || 'Análisis y Comentarios'}
                </h4>
              ) : (
                <input
                  type="text"
                  value={page.narrativeTitle}
                  onChange={e => onUpdatePage({ narrativeTitle: e.target.value })}
                  className="bg-transparent text-xs font-extrabold uppercase text-[#0072CE] outline-none"
                />
              )}
              {isPrintMode ? (
                <p className="mt-2 text-xs leading-relaxed text-[#001E50] whitespace-pre-wrap">
                  {page.narrativeBody || 'Contenido complementario incorporado para Dirección.'}
                </p>
              ) : (
                <textarea
                  value={page.narrativeBody}
                  onChange={e => onUpdatePage({ narrativeBody: e.target.value })}
                  placeholder="Escribí aquí tus comentarios, conclusiones o información complementaria..."
                  className="mt-2 flex-1 w-full resize-none bg-transparent text-xs leading-relaxed text-[#001E50] outline-none"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </PageFrameA4>
  );
};
