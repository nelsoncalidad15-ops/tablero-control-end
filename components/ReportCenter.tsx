import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Layers,
  LayoutTemplate,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import BrandMark from './BrandMark';
import { DirectionReportDocument } from '../types/directionReport';
import {
  deleteDirectionReportDraft,
  exportDraftToJsonFile,
  importDraftFromJsonFile,
  listDirectionReportDrafts,
} from '../services/directionReportDrafts';

interface ReportCenterProps {
  onBack: () => void;
}

const ReportCenter: React.FC<ReportCenterProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [drafts, setDrafts] = useState<DirectionReportDocument[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const list = await listDirectionReportDrafts();
      setDrafts(list);
    } finally {
      setLoadingDrafts(false);
    }
  };

  useEffect(() => {
    void refreshDrafts();
  }, []);

  const handleOpenDraft = (draftId: string) => {
    navigate(`/report/direccion?draftId=${encodeURIComponent(draftId)}`);
  };

  const handleDuplicateDraft = (draftId: string) => {
    navigate(`/report/direccion?duplicateId=${encodeURIComponent(draftId)}`);
  };

  const handleDeleteDraft = async (draftId: string) => {
    await deleteDirectionReportDraft(draftId);
    setDeleteConfirmId(null);
    await refreshDrafts();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportError(null);
    try {
      const imported = await importDraftFromJsonFile(file);
      await refreshDrafts();
      navigate(`/report/direccion?draftId=${encodeURIComponent(imported.id)}`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'No se pudo importar el archivo.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#001E50] font-sans">
      {/* Top Institutional Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-6 md:px-14 py-4">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#001E50] text-sm font-black italic text-[#001E50]">
              VW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold tracking-tight text-[#001E50]">Autosol</span>
                <span className="text-slate-300">|</span>
                <span className="text-sm font-semibold text-[#5A6A85]">Centro de Informes de Calidad</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Generación de reportes operativos e informes ejecutivos para Dirección
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#5A6A85] transition hover:border-[#0072CE] hover:text-[#001E50]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Calidad
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 md:px-14 py-10 space-y-12">
        {/* Hero Title */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200/80 pb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#001E50]/5 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0072CE]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0072CE]" />
              Módulo de Presentaciones y Reportes
            </div>
            <h1 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight text-[#001E50]">
              Seleccioná el tipo de informe a generar
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#5A6A85]">
              Elegí entre el reporte operativo habitual de Calidad o el nuevo editor visual de Informes Ejecutivos mensuales y trimestrales para Dirección.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-[#001E50] shadow-sm transition hover:border-[#0072CE] hover:bg-slate-50"
            >
              <Upload className="h-4 w-4 text-[#0072CE]" />
              Importar borrador (.json)
            </button>
          </div>
        </div>

        {importError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-xs font-semibold text-red-700">
            {importError}
          </div>
        )}

        {/* Two Main Report Option Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* OPCIÓN 1: REPORTE DE CALIDAD (EXISTENTE, INTACTO) */}
          <div className="group relative flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-8 shadow-[0_12px_36px_rgba(0,30,80,0.05)] transition-all hover:border-slate-300 hover:shadow-[0_18px_48px_rgba(0,30,80,0.09)]">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-[#001E50] transition group-hover:bg-[#001E50] group-hover:text-white">
                  <FileText className="h-7 w-7" />
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#5A6A85]">
                  Opción 1 · Formato Clásico
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-[#001E50]">
                Reporte de Calidad
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#5A6A85]">
                Reporte mensual estándar del área de Calidad con seguimiento de CEM Ventas (mes cerrado y en progreso), Verbatim, Encuestas Internas y gestión de reclamos.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-6">
                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>CEM Ventas y Postventa</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Encuestas Internas y Verbatim</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Filtro directo por mes y sucursal</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Impresión rápida sin cambios</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                onClick={() => navigate('/report')}
                className="w-full inline-flex items-center justify-between rounded-2xl border-2 border-[#001E50] bg-white px-6 py-4 text-xs font-extrabold uppercase tracking-[0.16em] text-[#001E50] transition hover:bg-[#001E50] hover:text-white"
              >
                <span>Abrir Reporte de Calidad</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* OPCIÓN 2: INFORME EJECUTIVO PARA DIRECCIÓN (NUEVO EDITOR VISUAL) */}
          <div className="group relative flex flex-col justify-between rounded-3xl border-2 border-[#001E50] bg-gradient-to-br from-[#001E50] via-[#002663] to-[#001840] p-8 text-white shadow-[0_20px_50px_rgba(0,30,80,0.22)] transition-all hover:shadow-[0_24px_60px_rgba(0,30,80,0.3)]">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0072CE] text-white shadow-lg shadow-[#0072CE]/30">
                  <LayoutTemplate className="h-7 w-7" />
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0072CE]/25 border border-[#0072CE]/40 px-3.5 py-1 text-[10px] font-bold uppercase tracking-widest text-sky-200">
                  <Sparkles className="h-3.5 w-3.5 text-sky-300" />
                  Opción 2 · Editor Visual Dirección
                </span>
              </div>

              <h2 className="mt-6 text-2xl font-extrabold tracking-tight text-white">
                Informe Ejecutivo para Dirección
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-200/90">
                Generador y editor visual de presentaciones ejecutivas mensuales y trimestrales (Q1–Q4) con composición dinámica A4, selección libre de módulos y planes de acción integrados en cada indicador.
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-6">
                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Informes Mensuales y Trimestrales</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Plan de acción integrado por KPI</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>SSI, Club SSI, CSI, Auditorías e Incentivos</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-200">
                  <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                  <span>Editor visual, fotos, borradores y PDF A4</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4">
              <button
                type="button"
                onClick={() => navigate('/report/direccion')}
                className="w-full inline-flex items-center justify-between rounded-2xl bg-[#0072CE] px-6 py-4 text-xs font-extrabold uppercase tracking-[0.16em] text-white shadow-lg shadow-[#0072CE]/30 transition hover:bg-[#0082eb]"
              >
                <span>Configurar Nuevo Informe para Dirección</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Saved Drafts & Historical Reports Section */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F7FA] text-[#001E50]">
                <FolderOpen className="h-5 w-5 text-[#0072CE]" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-[#001E50]">
                  Borradores e Informes Históricos Guardados
                </h3>
                <p className="text-xs text-[#5A6A85]">
                  Almacenados localmente en este navegador (IndexedDB). Podés continuar editando, duplicar para un nuevo período o exportar el archivo.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-[#001E50]">
              {drafts.length} {drafts.length === 1 ? 'informe guardado' : 'informes guardados'}
            </span>
          </div>

          {loadingDrafts ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              Cargando borradores guardados...
            </div>
          ) : drafts.length === 0 ? (
            <div className="py-12 text-center">
              <Layers className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-bold text-[#001E50]">
                Aún no tenés borradores guardados
              </p>
              <p className="mt-1 text-xs text-[#5A6A85]">
                Cuando crees o guardes un Informe Ejecutivo para Dirección, aparecerá aquí para que puedas reutilizar su diseño cada mes o trimestre.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {drafts.map(draft => {
                const periodBadge =
                  draft.periodType === 'monthly'
                    ? `Mensual · ${draft.month} ${draft.year}`
                    : `Trimestral · ${draft.quarter} ${draft.year}`;
                const branchBadge =
                  draft.branchSelection === 'BOTH'
                    ? 'Jujuy + Salta (Comparativo)'
                    : draft.branchSelection === 'JUJUY'
                      ? 'Autosol Jujuy (3059)'
                      : 'Autosol Salta (3087)';

                return (
                  <div
                    key={draft.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-[#F5F7FA]/60 p-5 transition hover:border-[#0072CE]/50 hover:bg-white hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#001E50] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          <Calendar className="h-3 w-3 text-sky-300" />
                          {periodBadge}
                        </span>
                        <span className="text-[11px] font-semibold text-[#5A6A85]">
                          {draft.pages.filter(p => p.visible).length} págs.
                        </span>
                      </div>

                      <h4 className="mt-3 text-base font-extrabold text-[#001E50] line-clamp-1">
                        {draft.name}
                      </h4>
                      <p className="mt-1 text-xs font-medium text-[#5A6A85]">
                        {branchBadge}
                      </p>
                      <p className="mt-2 text-[11px] text-slate-400">
                        Última modificación: {new Date(draft.updatedAt).toLocaleString('es-AR')}
                      </p>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-4">
                      <button
                        type="button"
                        onClick={() => handleOpenDraft(draft.id)}
                        className="flex-1 rounded-xl bg-[#001E50] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#0072CE]"
                      >
                        Abrir en Editor
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicateDraft(draft.id)}
                        title="Duplicar para otro período"
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-[#001E50] hover:border-[#0072CE]"
                      >
                        <Copy className="h-3.5 w-3.5 text-[#0072CE]" />
                        Duplicar
                      </button>
                      <button
                        type="button"
                        onClick={() => exportDraftToJsonFile(draft)}
                        title="Exportar borrador (.json)"
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:border-[#0072CE] hover:text-[#001E50]"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                      {deleteConfirmId === draft.id ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(draft.id)}
                          className="rounded-xl bg-red-600 px-2.5 py-2 text-[11px] font-bold text-white hover:bg-red-700"
                        >
                          Confirmar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(draft.id)}
                          title="Eliminar borrador"
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:border-red-200 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default ReportCenter;
