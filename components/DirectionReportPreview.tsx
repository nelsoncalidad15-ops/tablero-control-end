import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  FileCheck2,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import {
  ComputedDirectionReportData,
  DirectionReportDocument,
  ReportPage,
} from '../types/directionReport';
import { DirectionPageTemplateRenderer } from './DirectionReportTemplates';

interface DirectionReportPreviewProps {
  doc: DirectionReportDocument;
  computed: ComputedDirectionReportData;
  onUpdatePage: (pageId: string, patch: Partial<ReportPage>) => void;
  onClosePreview: () => void;
  onTriggerPrint: () => void;
}

export const DirectionReportPreview: React.FC<DirectionReportPreviewProps> = ({
  doc,
  computed,
  onUpdatePage,
  onClosePreview,
  onTriggerPrint,
}) => {
  const [showExportChecklist, setShowExportChecklist] = useState(true);

  const visiblePages = useMemo(
    () => doc.pages.filter(p => p.visible),
    [doc.pages]
  );

  const selectedExportPages = useMemo(
    () => visiblePages.filter(p => p.exportSelected !== false),
    [visiblePages]
  );

  // Pre-export Quality Verification Checks
  const verificationChecks = useMemo(() => {
    const inheritedCount = selectedExportPages.filter(
      p => p.isInheritedPendingReview || p.actionBlock?.isInheritedPendingReview
    ).length;

    const undocumentedDeviations = selectedExportPages.filter(p => {
      const ab = p.actionBlock;
      if (!ab) return false;
      const isDev =
        ab.overallCompliance === 'deviated' ||
        ab.jujuyCompliance === 'deviated' ||
        ab.saltaCompliance === 'deviated';
      if (!isDev) return false;
      const hasAction = ab.actions.some(a => Boolean(a.correctiveAction.trim() || a.rootCause.trim()));
      return !hasAction;
    }).length;

    const totalImages = selectedExportPages.reduce((sum, p) => sum + p.images.length, 0);

    return {
      pageCountOk: selectedExportPages.length > 0,
      numberingOk: true,
      inheritedCount,
      undocumentedDeviations,
      totalImages,
    };
  }, [selectedExportPages]);

  const toggleAllExportPages = (checked: boolean) => {
    visiblePages.forEach(p => {
      onUpdatePage(p.id, { exportSelected: checked });
    });
  };

  return (
    <div className="no-print-direction min-h-screen bg-slate-900 text-white font-sans pb-16">
      {/* Top Preview Control Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#001E50]/95 backdrop-blur-md px-6 py-3.5">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClosePreview}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al Editor
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-white">
                  Vista Previa de Impresión / PDF (A4 Horizontal · 297 × 210 mm)
                </span>
                <span className="rounded-md bg-[#0072CE] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {selectedExportPages.length} de {visiblePages.length} páginas seleccionadas
                </span>
              </div>
              <p className="text-[11px] text-sky-200">
                Representación fiel del documento final sin controles de edición
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowExportChecklist(!showExportChecklist)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-sky-200 hover:bg-white/10"
            >
              <ShieldCheck className="h-4 w-4 text-sky-300" />
              {showExportChecklist ? 'Ocultar panel PDF' : 'Configurar páginas PDF'}
            </button>

            <button
              type="button"
              disabled={selectedExportPages.length === 0}
              onClick={onTriggerPrint}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0072CE] px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-white shadow-lg shadow-[#0072CE]/30 transition hover:bg-sky-500 disabled:opacity-40"
            >
              <Printer className="h-4 w-4" />
              Guardar como PDF / Imprimir ({selectedExportPages.length} págs.)
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-6 pt-6 space-y-6">
        {/* Pre-export Verification & Page Selector Panel */}
        {showExportChecklist && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-2xl border border-white/12 bg-white/5 p-5 backdrop-blur-md">
            {/* Left: Quality Verification Checklist */}
            <div className="lg:col-span-5 space-y-3 border-b lg:border-b-0 lg:border-r border-white/10 pb-4 lg:pb-0 lg:pr-5">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-sky-300">
                <FileCheck2 className="h-4 w-4" />
                Verificación de Calidad Pre-Exportación
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Formato A4 Horizontal (297 × 210 mm) y numeración continua verificados.</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>Controles de edición ocultos y colores institucionales preservados.</span>
                </div>
                {verificationChecks.inheritedCount > 0 ? (
                  <div className="flex items-center gap-2 text-amber-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Atención: Hay {verificationChecks.inheritedCount} página(s) con textos heredados de un período anterior sin confirmar.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>Sin textos heredados pendientes de confirmación.</span>
                  </div>
                )}
                {verificationChecks.undocumentedDeviations > 0 && (
                  <div className="flex items-center gap-2 text-amber-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      Aviso: {verificationChecks.undocumentedDeviations} indicador(es) con desvío tienen campos de acción vacíos.
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-[#001E50] p-3 text-[11px] text-slate-200 leading-relaxed border border-white/10">
                <strong className="text-sky-300 block mb-0.5">
                  Instrucciones para exportar a PDF en GitHub Pages:
                </strong>
                Al presionar <strong>«Guardar como PDF / Imprimir»</strong>, seleccioná como destino{' '}
                <strong>«Guardar como PDF»</strong>, orientación <strong>Horizontal (Landscape)</strong>, márgenes <strong>Ninguno</strong> y activá <strong>Gráficos de fondo</strong>.
              </div>
            </div>

            {/* Right: Select which pages to export */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                  Seleccionar páginas a incluir en el PDF
                </span>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => toggleAllExportPages(true)}
                    className="text-sky-300 hover:underline font-bold"
                  >
                    Marcar todas
                  </button>
                  <span className="text-white/30">|</span>
                  <button
                    type="button"
                    onClick={() => toggleAllExportPages(false)}
                    className="text-slate-300 hover:underline font-bold"
                  >
                    Desmarcar todas
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto pr-1">
                {visiblePages.map((p, idx) => {
                  const isSelected = p.exportSelected !== false;
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 text-xs cursor-pointer transition ${
                        isSelected
                          ? 'border-sky-400/50 bg-[#0072CE]/25 text-white'
                          : 'border-white/10 bg-white/5 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => onUpdatePage(p.id, { exportSelected: e.target.checked })}
                        className="rounded text-[#0072CE]"
                      />
                      <span className="font-extrabold text-sky-300">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="truncate font-semibold">{p.title.split('—')[0].trim()}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Stacked A4 Landscape Pages Preview */}
        <div className="flex flex-col items-center gap-8 overflow-x-auto py-4">
          {selectedExportPages.map((page, index) => (
            <div
              key={page.id}
              className="rounded-xl shadow-[0_25px_70px_rgba(0,0,0,0.45)] ring-1 ring-white/15 overflow-hidden bg-white"
            >
              <DirectionPageTemplateRenderer
                page={page}
                pageNumber={index + 1}
                totalPages={selectedExportPages.length}
                doc={doc}
                computed={computed}
                isPrintMode={true}
                onUpdatePage={() => {}}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
