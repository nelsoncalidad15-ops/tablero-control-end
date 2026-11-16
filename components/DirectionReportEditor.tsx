import React, { useState } from 'react';
import {
  AlertTriangle,
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  FilePlus2,
  Image as ImageIcon,
  Layers,
  Layout,
  Plus,
  Printer,
  Redo2,
  RotateCcw,
  Save,
  Settings2,
  Sliders,
  Sparkles,
  SplitSquareVertical,
  Trash2,
  Undo2,
  Wand2,
} from 'lucide-react';
import { MONTHS, YEARS } from '../constants';
import {
  BranchSelection,
  ComputedDirectionReportData,
  DirectionReportDocument,
  PageLayoutVariant,
  PhotoLayoutPreset,
  QuarterCode,
  ReportPage,
  ReportPeriodType,
  ReportTemplateType,
} from '../types/directionReport';
import { QUARTER_LABELS } from '../services/directionReportData';
import { exportDraftToJsonFile } from '../services/directionReportDrafts';
import { PHOTO_LAYOUT_OPTIONS, readFileAsDataUrl } from './DirectionReportImageBlock';
import { ComplianceBadge, DirectionPageTemplateRenderer } from './DirectionReportTemplates';

interface DirectionReportEditorProps {
  doc: DirectionReportDocument;
  computed: ComputedDirectionReportData;
  canUndo: boolean;
  canRedo: boolean;
  lastSavedAt: string | null;
  isSaving: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSaveDraft: () => void;
  onUpdateDocumentMeta: (patch: Partial<DirectionReportDocument>) => void;
  onUpdatePage: (pageId: string, patch: Partial<ReportPage>) => void;
  onAddPage: (templateType: ReportTemplateType, afterPageId?: string) => void;
  onDuplicatePage: (pageId: string) => void;
  onMovePage: (pageId: string, direction: -1 | 1) => void;
  onDeletePage: (pageId: string) => void;
  onSplitActionPlanToContinuation: (pageId: string) => void;
  onResetReportContent: () => void;
  onOpenDuplicateReportModal: (targetParams: {
    name: string;
    periodType: ReportPeriodType;
    year: number;
    month: string;
    quarter: QuarterCode;
    branchSelection: BranchSelection;
    keepImages: boolean;
  }) => void;
  onOpenPreview: () => void;
  onTriggerPrint: () => void;
  onBackToConfig: () => void;
  onAddActionPlanPage?: (sourcePageId: string) => void;
}

const TEMPLATE_CATALOG: Array<{
  type: ReportTemplateType;
  name: string;
  desc: string;
}> = [
  { type: 'cover', name: 'Plantilla 1: Portada Ejecutiva', desc: 'Identidad Autosol, período, sucursales y fecha de emisión' },
  { type: 'executive_summary', name: 'Plantilla 2: Resumen Ejecutivo', desc: '4 indicadores principales de marca vs. objetivo y síntesis directiva' },
  { type: 'indicator_evolution', name: 'Plantilla 3: Indicador + Evolución + Plan', desc: 'KPI protagonista, gráfico histórico y plan de acción integrado' },
  { type: 'branch_comparison', name: 'Plantilla 4: Comparación Jujuy / Salta', desc: 'Diseño simétrico comparativo entre ambas sucursales' },
  { type: 'survey_study', name: 'Plantilla 5: Encuestas SSI / CSI / Club SSI', desc: 'Métricas del estudio seleccionado, brechas y causas' },
  { type: 'audits', name: 'Plantilla 6: Auditorías (PCGC / ISO / GAMS)', desc: 'Resultados, desvíos mandatorios, evidencia y acciones' },
  { type: 'incentives', name: 'Plantilla 7: Resumen de Incentivos', desc: 'Escalas, porcentaje aplicable, penalización e importe estimado' },
  { type: 'analysis_causes', name: 'Plantilla 8: Matriz y Análisis de Causas', desc: 'Matriz de objetivos y composición en dos columnas' },
  { type: 'action_plan_continuation', name: 'Plantilla 9: Continuación Plan de Acción', desc: 'Ampliación de causas, responsables y seguimiento' },
  { type: 'photo_evidences', name: 'Plantilla 10: Fotografías y Evidencias', desc: '1, 2 o 4 fotos o captura oficial con comentario lateral' },
  { type: 'next_steps', name: 'Plantilla 11: Próximos Pasos (Cierre)', desc: '3 prioridades estratégicas para seguimiento de Dirección' },
  { type: 'custom', name: 'Página Personalizada desde Cero', desc: 'Tarjetas manuales, gráfico editable y comentarios libres' },
];

export const DirectionReportEditor: React.FC<DirectionReportEditorProps> = ({
  doc,
  computed,
  canUndo,
  canRedo,
  lastSavedAt,
  isSaving,
  onUndo,
  onRedo,
  onSaveDraft,
  onUpdateDocumentMeta,
  onUpdatePage,
  onAddPage,
  onDuplicatePage,
  onMovePage,
  onDeletePage,
  onSplitActionPlanToContinuation,
  onResetReportContent,
  onOpenDuplicateReportModal,
  onOpenPreview,
  onTriggerPrint,
  onBackToConfig,
  onAddActionPlanPage,
}) => {
  const [selectedPageId, setSelectedPageId] = useState<string>(doc.pages[0]?.id || '');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'quick' | 'advanced'>('quick');
  const [viewAllPagesMode, setViewAllPagesMode] = useState<boolean>(true);
  const [zoomScale, setZoomScale] = useState<number>(0.75);
  const [leftPanelOpen, setLeftPanelOpen] = useState<boolean>(true);
  const [rightPanelOpen, setRightPanelOpen] = useState<boolean>(true);

  // Modals
  const [showAddPageModal, setShowAddPageModal] = useState<boolean>(false);
  const [deletePageConfirmId, setDeletePageConfirmId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [showDuplicateReportModal, setShowDuplicateReportModal] = useState<boolean>(false);

  // Duplicate Report Modal State
  const [dupName, setDupName] = useState<string>(`${doc.name} (Nuevo Período)`);
  const [dupPeriodType, setDupPeriodType] = useState<ReportPeriodType>(doc.periodType);
  const [dupYear, setDupYear] = useState<number>(doc.year);
  const [dupMonth, setDupMonth] = useState<string>(doc.month);
  const [dupQuarter, setDupQuarter] = useState<QuarterCode>(doc.quarter);
  const [dupBranch, setDupBranch] = useState<BranchSelection>(doc.branchSelection);
  const [dupKeepImages, setDupKeepImages] = useState<boolean>(true);

  const activePage =
    doc.pages.find(p => p.id === selectedPageId) || doc.pages[0];

  const visiblePages = doc.pages.filter(p => p.visible);
  const activePageNumber = activePage
    ? Math.max(1, visiblePages.findIndex(p => p.id === activePage.id) + 1)
    : 1;

  const selectedImage =
    activePage?.images.find(img => img.id === selectedImageId) || null;

  const handleQuickUploadToActivePage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePage) return;
    const dataUrl = await readFileAsDataUrl(file);
    const newImg = {
      id: `img-${Date.now()}`,
      src: dataUrl,
      originalName: file.name,
      title: file.name.replace(/\.[^.]+$/, ''),
      caption: 'Evidencia incorporada al informe.',
      analysisText: '',
      branchTag: 'GENERAL' as const,
      crop: { zoom: 1, offsetX: 0, offsetY: 0, fitMode: 'cover' as const },
      alignment: 'center' as const,
      showBorder: true,
      widthPercent: 100,
    };
    onUpdatePage(activePage.id, {
      images: [...activePage.images, newImg],
    });
    setSelectedImageId(newImg.id);
    e.target.value = '';
  };

  return (
    <div className="no-print-direction flex h-screen flex-col overflow-hidden bg-[#E9EEF5] text-[#001E50] font-sans">
      {/* 6.3 TOP COMMAND TOOLBAR */}
      <header className="z-40 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5 shadow-xs shrink-0">
        {/* Left: Back to Config + Report Name + Save Status */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToConfig}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#5A6A85] transition hover:border-[#0072CE] hover:text-[#001E50]"
            title="Volver a la pantalla de configuración de módulos y período"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Configuración</span>
          </button>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          <div className="min-w-0">
            <input
              type="text"
              value={doc.name}
              onChange={e => onUpdateDocumentMeta({ name: e.target.value })}
              className="w-56 md:w-72 truncate bg-transparent text-sm font-extrabold text-[#001E50] outline-none border-b border-transparent focus:border-[#0072CE]"
            />
            <div className="flex items-center gap-2 text-[10px] text-[#5A6A85]">
              <span>{computed.periodLabel}</span>
              <span>·</span>
              <span className="text-emerald-700 font-semibold">
                {isSaving
                  ? 'Guardando...'
                  : lastSavedAt
                    ? `Guardado ${new Date(lastSavedAt).toLocaleTimeString('es-AR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`
                    : 'Autoguardado activo'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Mode Switcher + Undo/Redo + Add Page + Zoom */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Edit vs Advanced Design Mode */}
          <div className="flex rounded-xl bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => setEditMode('quick')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                editMode === 'quick'
                  ? 'bg-[#001E50] text-white shadow-xs'
                  : 'text-[#5A6A85] hover:text-[#001E50]'
              }`}
            >
              Edición rápida
            </button>
            <button
              type="button"
              onClick={() => setEditMode('advanced')}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                editMode === 'advanced'
                  ? 'bg-[#0072CE] text-white shadow-xs'
                  : 'text-[#5A6A85] hover:text-[#001E50]'
              }`}
            >
              Diseño avanzado
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-1.5 py-1">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              title="Deshacer cambio"
              className="rounded-lg p-1 text-[#001E50] hover:bg-slate-100 disabled:opacity-30"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              title="Rehacer cambio"
              className="rounded-lg p-1 text-[#001E50] hover:bg-slate-100 disabled:opacity-30"
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddPageModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#001E50] hover:border-[#0072CE]"
          >
            <Plus className="h-3.5 w-3.5 text-[#0072CE]" />
            <span>Agregar pág.</span>
          </button>

          {/* Zoom selector */}
          <select
            aria-label="Zoom del documento"
            value={zoomScale}
            onChange={e => setZoomScale(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#001E50] outline-none"
          >
            <option value={0.65}>65%</option>
            <option value={0.75}>75%</option>
            <option value={0.85}>85%</option>
            <option value={0.95}>95%</option>
            <option value={1}>100%</option>
          </select>
        </div>

        {/* Right: Save, Duplicate Report, Reset, Preview & PDF Export */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveDraft}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#001E50] hover:border-[#0072CE]"
            title="Guardar borrador en este navegador"
          >
            <Save className="h-3.5 w-3.5 text-[#0072CE]" />
            <span className="hidden xl:inline">Guardar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setDupName(`${doc.name.replace(/\s*\(.*\)$/, '')} — Nuevo Período`);
              setShowDuplicateReportModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#001E50] hover:border-[#0072CE]"
            title="Duplicar informe hacia un nuevo período conservando diseño"
          >
            <Copy className="h-3.5 w-3.5 text-[#0072CE]" />
            <span className="hidden xl:inline">Duplicar informe</span>
          </button>

          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="rounded-xl border border-slate-200 bg-white p-1.5 text-[#5A6A85] hover:border-amber-300 hover:text-amber-700"
            title="Restablecer contenido original del período"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onOpenPreview}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#001E50] bg-white px-3.5 py-1.5 text-xs font-extrabold text-[#001E50] hover:bg-slate-50"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Vista previa</span>
          </button>

          <button
            type="button"
            onClick={onTriggerPrint}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#001E50] px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-sm hover:bg-[#0072CE]"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </header>

      {/* 6.1 THREE-PANEL WORKSPACE (LEFT: PAGES | CENTER: DOCUMENT | RIGHT: PROPERTIES) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* PANEL IZQUIERDO: MINIATURAS DE PÁGINAS */}
        {leftPanelOpen ? (
          <aside className="w-68 border-r border-slate-200 bg-white flex flex-col shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#001E50]">
                  Páginas ({visiblePages.length})
                </h3>
                <p className="text-[10px] text-[#5A6A85]">Formato A4 Horizontal</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewAllPagesMode(!viewAllPagesMode)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold border ${
                    viewAllPagesMode
                      ? 'border-[#0072CE] bg-sky-50 text-[#0072CE]'
                      : 'border-slate-200 text-[#5A6A85]'
                  }`}
                  title="Alternar vista de 1 página o todas las páginas"
                >
                  {viewAllPagesMode ? '1 Pág.' : 'Todas'}
                </button>
                <button
                  type="button"
                  onClick={() => setLeftPanelOpen(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-[#001E50]"
                  title="Ocultar panel de páginas"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {doc.pages.map((page, index) => {
                const isSelected = page.id === activePage?.id;
                const visibleIdx = visiblePages.findIndex(v => v.id === page.id);
                const pageNumLabel = visibleIdx >= 0 ? String(visibleIdx + 1).padStart(2, '0') : 'Oculta';
                const hasPendingReview =
                  page.isInheritedPendingReview || page.actionBlock?.isInheritedPendingReview;
                const hasDeviation =
                  page.actionBlock?.overallCompliance === 'deviated' ||
                  page.actionBlock?.jujuyCompliance === 'deviated' ||
                  page.actionBlock?.saltaCompliance === 'deviated';

                return (
                  <div
                    key={page.id}
                    onClick={() => {
                      setSelectedPageId(page.id);
                      setSelectedImageId(null);
                      const el = document.getElementById(`editor-page-${page.id}`);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className={`group cursor-pointer rounded-xl border p-2.5 transition ${
                      isSelected
                        ? 'border-[#0072CE] bg-sky-50/60 ring-1 ring-[#0072CE]'
                        : page.visible
                          ? 'border-slate-200 bg-[#F5F7FA]/60 hover:border-slate-300 hover:bg-white'
                          : 'border-dashed border-slate-200 bg-slate-50 opacity-55'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase ${
                          page.templateType === 'cover'
                            ? 'bg-[#001E50] text-white'
                            : 'bg-slate-200 text-[#001E50]'
                        }`}
                      >
                        {pageNumLabel}
                      </span>

                      <div className="flex items-center gap-1">
                        {hasPendingReview && (
                          <span
                            title="Contiene textos heredados pendientes de revisión"
                            className="h-2 w-2 rounded-full bg-amber-500"
                          />
                        )}
                        {hasDeviation && (
                          <span
                            title="Indicador con desvío"
                            className="h-2 w-2 rounded-full bg-red-600"
                          />
                        )}
                      </div>

                      {/* Page Quick Actions */}
                      <div
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100"
                      >
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => onMovePage(page.id, -1)}
                          title="Subir página"
                          className="rounded p-0.5 text-slate-400 hover:text-[#001E50] disabled:opacity-20"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          disabled={index === doc.pages.length - 1}
                          onClick={() => onMovePage(page.id, 1)}
                          title="Bajar página"
                          className="rounded p-0.5 text-slate-400 hover:text-[#001E50] disabled:opacity-20"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicatePage(page.id)}
                          title="Duplicar página"
                          className="rounded p-0.5 text-slate-400 hover:text-[#0072CE]"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdatePage(page.id, { visible: !page.visible })}
                          title={page.visible ? 'Ocultar página' : 'Mostrar página'}
                          className="rounded p-0.5 text-slate-400 hover:text-[#001E50]"
                        >
                          {page.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </button>
                        {doc.pages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDeletePageConfirmId(page.id)}
                            title="Eliminar página"
                            className="rounded p-0.5 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="mt-1.5 text-xs font-extrabold text-[#001E50] line-clamp-1">
                      {page.title.split('—')[0].trim()}
                    </p>
                    <p className="text-[10px] text-[#5A6A85] truncate">{page.sectionTag}</p>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-100 p-3">
              <button
                type="button"
                onClick={() => setShowAddPageModal(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#001E50] px-3 py-2 text-xs font-bold text-white hover:bg-[#0072CE]"
              >
                <Plus className="h-3.5 w-3.5" />
                Insertar Nueva Página
              </button>
            </div>
          </aside>
        ) : (
          <div className="border-r border-slate-200 bg-white p-2 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLeftPanelOpen(true)}
              className="rounded-lg p-1.5 text-[#5A6A85] hover:bg-slate-100 hover:text-[#001E50]"
              title="Mostrar panel de páginas"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ÁREA CENTRAL: DOCUMENTO A4 HORIZONTAL */}
        <main className="flex-1 overflow-auto p-6 flex flex-col items-center">
          {viewAllPagesMode ? (
            <div className="space-y-8 pb-16 flex flex-col items-center">
              {visiblePages.map((p, idx) => (
                <div
                  key={p.id}
                  id={`editor-page-${p.id}`}
                  onClick={() => setSelectedPageId(p.id)}
                  style={{
                    width: `${297 * zoomScale}mm`,
                    height: `${210 * zoomScale}mm`,
                  }}
                  className={`relative shrink-0 transition cursor-pointer ${
                    p.id === activePage?.id ? 'ring-4 ring-[#0072CE]/60 rounded-xl' : ''
                  }`}
                >
                  <div
                    style={{
                      width: '297mm',
                      height: '210mm',
                      transform: `scale(${zoomScale})`,
                      transformOrigin: 'top left',
                    }}
                    className="rounded-xl bg-white shadow-[0_15px_45px_rgba(0,30,80,0.14)] overflow-hidden"
                  >
                    <DirectionPageTemplateRenderer
                      page={p}
                      pageNumber={idx + 1}
                      totalPages={visiblePages.length}
                      doc={doc}
                      computed={computed}
                      isPrintMode={false}
                      selectedImageId={selectedImageId}
                      onSelectImage={setSelectedImageId}
                      onUpdatePage={patch => onUpdatePage(p.id, patch)}
                      onSplitActionPlanToContinuation={onSplitActionPlanToContinuation}
                      onAddActionPlanPage={onAddActionPlanPage}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : activePage ? (
            <div className="pb-16 flex flex-col items-center">
              <div
                id={`editor-page-${activePage.id}`}
                style={{
                  width: `${297 * zoomScale}mm`,
                  height: `${210 * zoomScale}mm`,
                }}
                className="relative shrink-0"
              >
                <div
                  style={{
                    width: '297mm',
                    height: '210mm',
                    transform: `scale(${zoomScale})`,
                    transformOrigin: 'top left',
                  }}
                  className="rounded-xl bg-white shadow-[0_15px_45px_rgba(0,30,80,0.14)] overflow-hidden"
                >
                  <DirectionPageTemplateRenderer
                    page={activePage}
                    pageNumber={activePageNumber}
                    totalPages={visiblePages.length}
                    doc={doc}
                    computed={computed}
                    isPrintMode={false}
                    selectedImageId={selectedImageId}
                    onSelectImage={setSelectedImageId}
                    onUpdatePage={patch => onUpdatePage(activePage.id, patch)}
                    onSplitActionPlanToContinuation={onSplitActionPlanToContinuation}
                    onAddActionPlanPage={onAddActionPlanPage}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </main>

        {/* PANEL DERECHO: PROPIEDADES CONTEXTUALES */}
        {rightPanelOpen ? (
          <aside className="w-80 border-l border-slate-200 bg-white flex flex-col shrink-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-4 w-4 text-[#0072CE]" />
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#001E50]">
                    Propiedades
                  </h3>
                  <p className="text-[10px] text-[#5A6A85]">
                    {selectedImage
                      ? 'Imagen / Evidencia seleccionada'
                      : `Página ${activePageNumber} · ${activePage?.sectionTag || ''}`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRightPanelOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-[#001E50]"
                title="Ocultar panel de propiedades"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {activePage && (
              <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
                {/* 1. CONTEXTUAL IMAGE TOOLS (When an image is selected or on Photo page) */}
                {(selectedImage || activePage.templateType === 'photo_evidences' || activePage.templateType === 'audits') && (
                  <div className="rounded-2xl border border-slate-200 bg-[#F5F7FA] p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0072CE] flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5" />
                        Fotografías y Evidencias
                      </span>
                      <label className="cursor-pointer rounded-lg bg-[#001E50] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#0072CE]">
                        + Subir imagen
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleQuickUploadToActivePage}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {activePage.templateType === 'photo_evidences' && (
                      <div>
                        <span className="block text-[10px] font-bold text-[#5A6A85] mb-1">
                          Distribución de fotografías en la página
                        </span>
                        <select
                          value={activePage.photoLayout || 'two_comparative'}
                          onChange={e =>
                            onUpdatePage(activePage.id, {
                              photoLayout: e.target.value as PhotoLayoutPreset,
                            })
                          }
                          className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#001E50]"
                        >
                          {PHOTO_LAYOUT_OPTIONS.map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedImage && (
                      <div className="space-y-2.5 border-t border-slate-200 pt-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-[#001E50]">
                            Ajustes de imagen seleccionada
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedImageId(null)}
                            className="text-[10px] text-[#0072CE] hover:underline"
                          >
                            Listo
                          </button>
                        </div>

                        <div>
                          <span className="block text-[10px] text-[#5A6A85] mb-1">
                            Etiqueta de sucursal
                          </span>
                          <select
                            value={selectedImage.branchTag || 'GENERAL'}
                            onChange={e =>
                              onUpdatePage(activePage.id, {
                                images: activePage.images.map(img =>
                                  img.id === selectedImage.id
                                    ? { ...img, branchTag: e.target.value as any }
                                    : img
                                ),
                              })
                            }
                            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-[#001E50]"
                          >
                            <option value="GENERAL">General (Sin etiqueta)</option>
                            <option value="JUJUY">Jujuy (3059)</option>
                            <option value="SALTA">Salta (3087)</option>
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[10px] text-[#5A6A85] mb-1">
                              Ancho ({selectedImage.widthPercent}%)
                            </span>
                            <input
                              type="range"
                              min={50}
                              max={100}
                              step={5}
                              value={selectedImage.widthPercent}
                              onChange={e =>
                                onUpdatePage(activePage.id, {
                                  images: activePage.images.map(img =>
                                    img.id === selectedImage.id
                                      ? { ...img, widthPercent: Number(e.target.value) }
                                      : img
                                  ),
                                })
                              }
                              className="w-full"
                            />
                          </div>

                          <div>
                            <span className="block text-[10px] text-[#5A6A85] mb-1">
                              Alineación
                            </span>
                            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                              {(['left', 'center', 'right'] as const).map(align => (
                                <button
                                  key={align}
                                  type="button"
                                  onClick={() =>
                                    onUpdatePage(activePage.id, {
                                      images: activePage.images.map(img =>
                                        img.id === selectedImage.id ? { ...img, alignment: align } : img
                                      ),
                                    })
                                  }
                                  className={`flex-1 flex justify-center rounded py-1 ${
                                    selectedImage.alignment === align
                                      ? 'bg-[#001E50] text-white'
                                      : 'text-slate-500'
                                  }`}
                                >
                                  {align === 'left' ? (
                                    <AlignLeft className="h-3 w-3" />
                                  ) : align === 'center' ? (
                                    <AlignCenter className="h-3 w-3" />
                                  ) : (
                                    <AlignRight className="h-3 w-3" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-xs font-semibold text-[#001E50] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedImage.showBorder}
                            onChange={e =>
                              onUpdatePage(activePage.id, {
                                images: activePage.images.map(img =>
                                  img.id === selectedImage.id
                                    ? { ...img, showBorder: e.target.checked }
                                    : img
                                ),
                              })
                            }
                          />
                          <span>Mostrar marco institucional discreto</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. CONTEXTUAL ACTION PLAN TOOLS (When page has an Integrated Action Block) */}
                {activePage.actionBlock && (
                  <div className="rounded-2xl border border-slate-200 bg-[#F5F7FA] p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#001E50]">
                        Plan de Acción Integrado
                      </span>
                      <ComplianceBadge status={activePage.actionBlock.overallCompliance} compact />
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#5A6A85]">Visibilidad en página:</span>
                      <button
                        type="button"
                        onClick={() =>
                          onUpdatePage(activePage.id, {
                            actionBlock: {
                              ...activePage.actionBlock!,
                              visible: !activePage.actionBlock!.visible,
                              manuallyToggled: true,
                            },
                          })
                        }
                        className={`rounded-lg px-2.5 py-1 text-[10px] font-bold ${
                          activePage.actionBlock.visible
                            ? 'bg-[#001E50] text-white'
                            : 'bg-white border border-slate-200 text-[#001E50]'
                        }`}
                      >
                        {activePage.actionBlock.visible ? 'Visible en lámina' : 'Oculto (Mostrar)'}
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#5A6A85]">Formato del bloque:</span>
                      <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePage(activePage.id, {
                              actionBlock: { ...activePage.actionBlock!, layoutMode: 'compact' },
                            })
                          }
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            activePage.actionBlock.layoutMode === 'compact'
                              ? 'bg-[#001E50] text-white'
                              : 'text-[#5A6A85]'
                          }`}
                        >
                          Compacto
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdatePage(activePage.id, {
                              actionBlock: { ...activePage.actionBlock!, layoutMode: 'expanded' },
                            })
                          }
                          className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                            activePage.actionBlock.layoutMode === 'expanded'
                              ? 'bg-[#001E50] text-white'
                              : 'text-[#5A6A85]'
                          }`}
                        >
                          Ampliado
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSplitActionPlanToContinuation(activePage.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-[#0072CE] hover:border-[#0072CE]"
                    >
                      <SplitSquareVertical className="h-3.5 w-3.5" />
                      Crear página de continuación vinculada
                    </button>
                  </div>
                )}

                {/* 3. CONTEXTUAL CHART OPTIONS (When page has a chart) */}
                {(activePage.templateType === 'indicator_evolution' ||
                  activePage.templateType === 'branch_comparison' ||
                  activePage.templateType === 'custom') && (
                  <div className="rounded-2xl border border-slate-200 bg-[#F5F7FA] p-3.5 space-y-2.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0072CE] flex items-center gap-1.5">
                      <BarChart3 className="h-3.5 w-3.5" />
                      Opciones de Visualización del Gráfico
                    </span>

                    {activePage.templateType === 'indicator_evolution' && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => onUpdatePage(activePage.id, { chartType: 'bar' })}
                          className={`rounded-lg py-1.5 text-[11px] font-bold border ${
                            activePage.chartType !== 'line'
                              ? 'border-[#001E50] bg-[#001E50] text-white'
                              : 'border-slate-200 bg-white text-[#001E50]'
                          }`}
                        >
                          Gráfico de Barras
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdatePage(activePage.id, { chartType: 'line' })}
                          className={`rounded-lg py-1.5 text-[11px] font-bold border ${
                            activePage.chartType === 'line'
                              ? 'border-[#001E50] bg-[#001E50] text-white'
                              : 'border-slate-200 bg-white text-[#001E50]'
                          }`}
                        >
                          Línea de Evolución
                        </button>
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-xs font-semibold text-[#001E50] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePage.showChartTarget !== false}
                        onChange={e =>
                          onUpdatePage(activePage.id, { showChartTarget: e.target.checked })
                        }
                      />
                      <span>Mostrar línea de objetivo vigente</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-[#001E50] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePage.showChartLabels !== false}
                        onChange={e =>
                          onUpdatePage(activePage.id, { showChartLabels: e.target.checked })
                        }
                      />
                      <span>Mostrar etiquetas numéricas sobre barras</span>
                    </label>
                  </div>
                )}

                {/* 4. PAGE TEXT & ADVANCED TEMPLATE SETTINGS */}
                <div className="rounded-2xl border border-slate-200 bg-[#F5F7FA] p-3.5 space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#001E50]">
                    Encabezado y Pie de Página
                  </span>

                  <div>
                    <label className="block text-[10px] font-bold text-[#5A6A85] mb-1">
                      Etiqueta superior de sección
                    </label>
                    <input
                      type="text"
                      value={activePage.sectionTag}
                      onChange={e => onUpdatePage(activePage.id, { sectionTag: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#001E50]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#5A6A85] mb-1">
                      Título de la página
                    </label>
                    <input
                      type="text"
                      value={activePage.title}
                      onChange={e => onUpdatePage(activePage.id, { title: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#001E50]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#5A6A85] mb-1">
                      Pie de página personalizado
                    </label>
                    <input
                      type="text"
                      value={activePage.footerNote || ''}
                      onChange={e => onUpdatePage(activePage.id, { footerNote: e.target.value })}
                      placeholder="Documento confidencial Autosol..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#001E50]"
                    />
                  </div>

                  {/* Advanced Design Mode: Change Page Template */}
                  {editMode === 'advanced' && (
                    <div className="border-t border-slate-200 pt-3">
                      <label className="block text-[10px] font-extrabold uppercase text-[#0072CE] mb-1">
                        Cambiar Plantilla de esta Página (Modo Avanzado)
                      </label>
                      <select
                        value={activePage.templateType}
                        onChange={e =>
                          onUpdatePage(activePage.id, {
                            templateType: e.target.value as ReportTemplateType,
                          })
                        }
                        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-[#001E50]"
                      >
                        {TEMPLATE_CATALOG.map(t => (
                          <option key={t.type} value={t.type}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Export Draft JSON shortcut */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => exportDraftToJsonFile(doc)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#001E50] hover:border-[#0072CE]"
                  >
                    <Download className="h-3.5 w-3.5 text-[#0072CE]" />
                    Descargar archivo de respaldo (.json)
                  </button>
                </div>
              </div>
            )}
          </aside>
        ) : (
          <div className="border-l border-slate-200 bg-white p-2 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setRightPanelOpen(true)}
              className="rounded-lg p-1.5 text-[#5A6A85] hover:bg-slate-100 hover:text-[#001E50]"
              title="Mostrar panel de propiedades"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* MODAL: INSERT NEW PAGE FROM TEMPLATE */}
      {showAddPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#001E50]">
                  Insertar Nueva Página Prediseñada
                </h3>
                <p className="text-xs text-[#5A6A85]">
                  Elegí una plantilla corporativa A4 horizontal para incorporar después de la página actual
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPageModal(false)}
                className="rounded-xl border border-slate-200 px-3 py-1 text-xs font-bold text-[#5A6A85] hover:text-[#001E50]"
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {TEMPLATE_CATALOG.map(tpl => (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => {
                    onAddPage(tpl.type, activePage?.id);
                    setShowAddPageModal(false);
                  }}
                  className="flex flex-col items-start rounded-2xl border border-slate-200 bg-[#F5F7FA]/60 p-4 text-left transition hover:border-[#0072CE] hover:bg-sky-50/40"
                >
                  <span className="text-xs font-extrabold text-[#001E50]">{tpl.name}</span>
                  <span className="mt-1 text-[11px] text-[#5A6A85]">{tpl.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE PAGE */}
      {deletePageConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-[#001E50]">
              ¿Eliminar esta página del informe?
            </h3>
            <p className="mt-2 text-xs text-[#5A6A85] leading-relaxed">
              Podés recuperar la página inmediatamente usando el botón «Deshacer» de la barra superior, o simplemente ocultarla si preferís conservar su contenido.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeletePageConfirmId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-[#5A6A85]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeletePage(deletePageConfirmId);
                  setDeletePageConfirmId(null);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700"
              >
                Eliminar página
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM RESET REPORT CONTENT */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-[#001E50]">
              ¿Restablecer el diseño y contenido del informe?
            </h3>
            <p className="mt-2 text-xs text-[#5A6A85] leading-relaxed">
              Se volverán a generar las páginas según los módulos activos y los indicadores automáticos del período actual.
            </p>
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-[#5A6A85]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetReportContent();
                  setShowResetConfirm(false);
                }}
                className="rounded-xl bg-[#001E50] px-4 py-2 text-xs font-bold text-white hover:bg-[#0072CE]"
              >
                Restablecer contenido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DUPLICATE REPORT FOR A NEW PERIOD (Section 12) */}
      {showDuplicateReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0072CE]">
                Reutilización Inteligente de Informe
              </span>
              <h3 className="mt-1 text-lg font-extrabold text-[#001E50]">
                Duplicar informe hacia un nuevo período
              </h3>
              <p className="mt-1 text-xs text-[#5A6A85]">
                Se conservarán el diseño y la estructura, los indicadores automáticos se recalcularán con el nuevo período y los textos manuales anteriores quedarán marcados como <strong>«Pendiente de revisión»</strong>.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#001E50] mb-1">
                  Nombre del nuevo informe
                </label>
                <input
                  type="text"
                  value={dupName}
                  onChange={e => setDupName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-[#F5F7FA] px-3 py-2 font-bold text-[#001E50]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#001E50] mb-1">Tipo de período</label>
                  <select
                    value={dupPeriodType}
                    onChange={e => setDupPeriodType(e.target.value as ReportPeriodType)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-[#001E50]"
                  >
                    <option value="monthly">Informe Mensual</option>
                    <option value="quarterly">Informe Trimestral</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#001E50] mb-1">Año</label>
                  <select
                    value={dupYear}
                    onChange={e => setDupYear(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-[#001E50]"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {dupPeriodType === 'monthly' ? (
                  <div>
                    <label className="block font-bold text-[#001E50] mb-1">Nuevo Mes</label>
                    <select
                      value={dupMonth}
                      onChange={e => setDupMonth(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-[#001E50]"
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
                    <label className="block font-bold text-[#001E50] mb-1">Nuevo Trimestre</label>
                    <select
                      value={dupQuarter}
                      onChange={e => setDupQuarter(e.target.value as QuarterCode)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-[#001E50]"
                    >
                      {(['Q1', 'Q2', 'Q3', 'Q4'] as QuarterCode[]).map(q => (
                        <option key={q} value={q}>
                          {QUARTER_LABELS[q]}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-bold text-[#001E50] mb-1">Sucursales</label>
                  <select
                    value={dupBranch}
                    onChange={e => setDupBranch(e.target.value as BranchSelection)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold text-[#001E50]"
                  >
                    <option value="BOTH">Ambas (Jujuy + Salta)</option>
                    <option value="JUJUY">Autosol Jujuy (3059)</option>
                    <option value="SALTA">Autosol Salta (3087)</option>
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 font-semibold text-[#001E50] cursor-pointer">
                <input
                  type="checkbox"
                  checked={dupKeepImages}
                  onChange={e => setDupKeepImages(e.target.checked)}
                />
                <span>Conservar fotografías y capturas del informe original</span>
              </label>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDuplicateReportModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-[#5A6A85]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenDuplicateReportModal({
                    name: dupName.trim() || `${doc.name} (Duplicado)`,
                    periodType: dupPeriodType,
                    year: dupYear,
                    month: dupMonth,
                    quarter: dupQuarter,
                    branchSelection: dupBranch,
                    keepImages: dupKeepImages,
                  });
                  setShowDuplicateReportModal(false);
                }}
                className="rounded-xl bg-[#001E50] px-5 py-2 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-[#0072CE]"
              >
                Crear Duplicado y Actualizar Datos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
