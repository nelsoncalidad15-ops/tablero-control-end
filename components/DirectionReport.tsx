import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MONTHS } from '../constants';
import { AppConfig } from '../types';
import {
  BranchSelection,
  DirectionModuleId,
  DirectionReportDocument,
  QuarterCode,
  RawDirectionDataSources,
  ReportPage,
  ReportPeriodType,
  ReportTemplateType,
  SurveyDisplaySubOptions,
} from '../types/directionReport';
import {
  buildIntegratedActionBlock,
  composeDirectionReportPages,
  computeDirectionReportData,
  DEFAULT_SURVEY_SUB_OPTIONS,
  duplicateDirectionReportForNewPeriod,
  getSuggestedModules,
  loadAllDirectionReportSources,
} from '../services/directionReportData';
import {
  getDirectionReportDraft,
  saveDirectionReportDraft,
} from '../services/directionReportDrafts';
import { DirectionReportConfig } from './DirectionReportConfig';
import { DirectionReportEditor } from './DirectionReportEditor';
import { DirectionReportPreview } from './DirectionReportPreview';
import { DirectionReportPrint } from './DirectionReportPrint';

interface DirectionReportProps {
  config: AppConfig;
  onBack: () => void;
}

const EMPTY_RAW_SOURCES: RawDirectionDataSources = {
  cemOs: [],
  detailedQuality: [],
  qualityClaims: [],
  salesClaims: [],
  salesQuality: [],
  internalPostventa: [],
  postventaKpis: [],
  actionPlans: [],
  pcgcChecklist: [],
  objectivesSummary: [],
  objectivesScales: [],
  ssiSurveys: [],
  csiSurveys: [],
  clubSsiRecords: [],
  failedSources: [],
  loadedAt: new Date().toISOString(),
};

function getDefaultClosedMonth(): string {
  const now = new Date();
  const prevIdx = (now.getMonth() - 1 + 12) % 12;
  return MONTHS[prevIdx] || 'Septiembre';
}

export const DirectionReport: React.FC<DirectionReportProps> = ({ config, onBack }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [step, setStep] = useState<'config' | 'editor' | 'preview'>('config');

  // Data Sources State
  const [rawSources, setRawSources] = useState<RawDirectionDataSources | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Configuration State
  const [periodType, setPeriodType] = useState<ReportPeriodType>('quarterly');
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<string>(getDefaultClosedMonth());
  const [quarter, setQuarter] = useState<QuarterCode>('Q3');
  const [branchSelection, setBranchSelection] = useState<BranchSelection>('BOTH');
  const [enabledModules, setEnabledModules] = useState<DirectionModuleId[]>(() =>
    getSuggestedModules('quarterly', null, 2026, 'Q3')
  );
  const [surveySubOptions, setSurveySubOptions] = useState<SurveyDisplaySubOptions>(
    DEFAULT_SURVEY_SUB_OPTIONS
  );
  const [reportName, setReportName] = useState<string>(
    'Informe Ejecutivo Dirección — Q3 2026'
  );

  // Active Document & Undo/Redo Stack
  const [doc, setDoc] = useState<DirectionReportDocument | null>(null);
  const [undoStack, setUndoStack] = useState<DirectionReportDocument[]>([]);
  const [redoStack, setRedoStack] = useState<DirectionReportDocument[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const autoSaveTimerRef = useRef<number | null>(null);

  // Load Raw Data Sources on mount
  useEffect(() => {
    let active = true;
    setIsLoadingData(true);
    void loadAllDirectionReportSources(config)
      .then(loaded => {
        if (!active) return;
        setRawSources(loaded);
      })
      .finally(() => {
        if (active) setIsLoadingData(false);
      });
    return () => {
      active = false;
    };
  }, [config]);

  // Keep default report name in sync while in config step
  useEffect(() => {
    if (step === 'config' && !doc) {
      const pText = periodType === 'monthly' ? `${month} ${year}` : `${quarter} ${year}`;
      const bText =
        branchSelection === 'BOTH'
          ? 'Jujuy y Salta'
          : branchSelection === 'JUJUY'
            ? 'Jujuy'
            : 'Salta';
      setReportName(`Informe Ejecutivo Dirección — ${pText} (${bText})`);
    }
  }, [periodType, year, month, quarter, branchSelection, step, doc]);

  // Compute Metrics Reactive to Active Period & Branch
  const effectivePeriodParams = useMemo(
    () => ({
      periodType: doc ? doc.periodType : periodType,
      year: doc ? doc.year : year,
      month: doc ? doc.month : month,
      quarter: doc ? doc.quarter : quarter,
      branchSelection: doc ? doc.branchSelection : branchSelection,
    }),
    [doc, periodType, year, month, quarter, branchSelection]
  );

  const computed = useMemo(
    () =>
      computeDirectionReportData(
        rawSources || EMPTY_RAW_SOURCES,
        effectivePeriodParams
      ),
    [rawSources, effectivePeriodParams]
  );

  // Check URL Query Params for draftId or duplicateId
  useEffect(() => {
    const draftId = searchParams.get('draftId');
    const duplicateId = searchParams.get('duplicateId');

    if (draftId) {
      void getDirectionReportDraft(draftId).then(found => {
        if (found) {
          setPeriodType(found.periodType);
          setYear(found.year);
          setMonth(found.month);
          setQuarter(found.quarter);
          setBranchSelection(found.branchSelection);
          setEnabledModules(found.enabledModules);
          setSurveySubOptions(found.surveySubOptions);
          setReportName(found.name);
          setDoc(found);
          setUndoStack([]);
          setRedoStack([]);
          setStep('editor');
        }
        setSearchParams({}, { replace: true });
      });
    } else if (duplicateId && rawSources) {
      void getDirectionReportDraft(duplicateId).then(found => {
        if (found) {
          const nextQuarter: QuarterCode =
            found.quarter === 'Q1'
              ? 'Q2'
              : found.quarter === 'Q2'
                ? 'Q3'
                : found.quarter === 'Q3'
                  ? 'Q4'
                  : 'Q1';
          const nextMonth =
            MONTHS[(MONTHS.indexOf(found.month) + 1) % 12] || found.month;
          const targetComputed = computeDirectionReportData(rawSources, {
            periodType: found.periodType,
            year: found.year,
            month: nextMonth,
            quarter: nextQuarter,
            branchSelection: found.branchSelection,
          });
          const duplicated = duplicateDirectionReportForNewPeriod(
            found,
            {
              name: `${found.name} (Duplicado)`,
              periodType: found.periodType,
              year: found.year,
              month: nextMonth,
              quarter: nextQuarter,
              branchSelection: found.branchSelection,
              keepImages: true,
            },
            targetComputed
          );
          setPeriodType(duplicated.periodType);
          setYear(duplicated.year);
          setMonth(duplicated.month);
          setQuarter(duplicated.quarter);
          setBranchSelection(duplicated.branchSelection);
          setEnabledModules(duplicated.enabledModules);
          setSurveySubOptions(duplicated.surveySubOptions);
          setReportName(duplicated.name);
          setDoc(duplicated);
          setStep('editor');
          void saveDirectionReportDraft(duplicated);
        }
        setSearchParams({}, { replace: true });
      });
    }
  }, [searchParams, rawSources, setSearchParams]);

  // Helper to push state to Undo Stack and trigger Auto-save
  const applyDocChange = useCallback(
    (updater: (current: DirectionReportDocument) => DirectionReportDocument) => {
      setDoc(prev => {
        if (!prev) return prev;
        const next = updater(prev);
        setUndoStack(stack => [...stack.slice(-24), prev]);
        setRedoStack([]);

        if (autoSaveTimerRef.current) {
          window.clearTimeout(autoSaveTimerRef.current);
        }
        autoSaveTimerRef.current = window.setTimeout(() => {
          setIsSaving(true);
          void saveDirectionReportDraft(next)
            .then(saved => {
              setLastSavedAt(saved.updatedAt);
            })
            .finally(() => setIsSaving(false));
        }, 900);

        return next;
      });
    },
    []
  );

  const handleUndo = () => {
    if (undoStack.length === 0 || !doc) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(stack => stack.slice(0, -1));
    setRedoStack(stack => [doc, ...stack]);
    setDoc(previous);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !doc) return;
    const next = redoStack[0];
    setRedoStack(stack => stack.slice(1));
    setUndoStack(stack => [...stack, doc]);
    setDoc(next);
  };

  const handleManualSave = async () => {
    if (!doc) return;
    setIsSaving(true);
    try {
      const saved = await saveDirectionReportDraft(doc);
      setLastSavedAt(saved.updatedAt);
    } finally {
      setIsSaving(false);
    }
  };

  // Generate Pages from Config and Open Editor
  const handleGenerateAndOpenEditor = async () => {
    const freshComputed = computeDirectionReportData(rawSources || EMPTY_RAW_SOURCES, {
      periodType,
      year,
      month,
      quarter,
      branchSelection,
    });

    const pages = composeDirectionReportPages(
      {
        periodType,
        year,
        month,
        quarter,
        branchSelection,
        enabledModules,
        surveySubOptions,
      },
      freshComputed
    );

    const nowIso = new Date().toISOString();
    const newDoc: DirectionReportDocument = {
      id: doc?.id || `dir-rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: reportName.trim() || `Informe Ejecutivo Dirección — ${freshComputed.periodLabel}`,
      createdAt: doc?.createdAt || nowIso,
      updatedAt: nowIso,
      emittedDate: new Date().toLocaleDateString('es-AR'),
      periodType,
      year,
      month,
      quarter,
      branchSelection,
      enabledModules,
      surveySubOptions,
      pages,
    };

    setDoc(newDoc);
    setUndoStack([]);
    setRedoStack([]);
    setStep('editor');
    const saved = await saveDirectionReportDraft(newDoc);
    setLastSavedAt(saved.updatedAt);
  };

  const handleUpdatePage = (pageId: string, patch: Partial<ReportPage>) => {
    applyDocChange(current => ({
      ...current,
      pages: current.pages.map(p => (p.id === pageId ? { ...p, ...patch } : p)),
    }));
  };

  const handleAddPage = (templateType: ReportTemplateType, afterPageId?: string) => {
    applyDocChange(current => {
      const newPage: ReportPage = {
        id: `page-${templateType}-${Date.now().toString(36)}`,
        templateType,
        title: `Nueva Lámina — ${computed.periodLabel}`,
        subtitle: 'Subtítulo descriptivo de la sección',
        sectionTag: 'SECCIÓN EJECUTIVA',
        visible: true,
        exportSelected: true,
        layoutVariant: 'balanced_split',
        narrativeTitle: 'Análisis Ejecutivo',
        narrativeBody: '',
        images: [],
        actionBlock:
          templateType === 'indicator_evolution' ||
          templateType === 'claims_module' ||
          templateType === 'survey_study' ||
          templateType === 'audits' ||
          templateType === 'action_plan_continuation'
            ? buildIntegratedActionBlock(
                'custom_kpi',
                'Indicador Evaluado',
                'deviated',
                'deviated',
                'deviated',
                current.branchSelection,
                computed.matchingActionPlans,
                true
              )
            : undefined,
      };

      const idx = afterPageId
        ? current.pages.findIndex(p => p.id === afterPageId)
        : current.pages.length - 1;
      const insertAt = idx >= 0 ? idx + 1 : current.pages.length;
      const nextPages = [...current.pages];
      nextPages.splice(insertAt, 0, newPage);
      return { ...current, pages: nextPages };
    });
  };

  const handleDuplicatePage = (pageId: string) => {
    applyDocChange(current => {
      const idx = current.pages.findIndex(p => p.id === pageId);
      if (idx < 0) return current;
      const source = current.pages[idx];
      const copy: ReportPage = {
        ...JSON.parse(JSON.stringify(source)),
        id: `${source.id}-copy-${Date.now().toString(36).slice(-4)}`,
        title: `${source.title} (Copia)`,
      };
      const nextPages = [...current.pages];
      nextPages.splice(idx + 1, 0, copy);
      return { ...current, pages: nextPages };
    });
  };

  const handleMovePage = (pageId: string, direction: -1 | 1) => {
    applyDocChange(current => {
      const idx = current.pages.findIndex(p => p.id === pageId);
      const targetIdx = idx + direction;
      if (idx < 0 || targetIdx < 0 || targetIdx >= current.pages.length) return current;
      const nextPages = [...current.pages];
      const [moved] = nextPages.splice(idx, 1);
      nextPages.splice(targetIdx, 0, moved);
      return { ...current, pages: nextPages };
    });
  };

  const handleDeletePage = (pageId: string) => {
    applyDocChange(current => {
      if (current.pages.length <= 1) return current;
      return {
        ...current,
        pages: current.pages.filter(p => p.id !== pageId),
      };
    });
  };

  // Split an extensive Action Plan into a linked Continuation Page
  const handleSplitActionPlanToContinuation = (pageId: string) => {
    applyDocChange(current => {
      const idx = current.pages.findIndex(p => p.id === pageId);
      if (idx < 0) return current;
      const sourcePage = current.pages[idx];
      const sourceBlock = sourcePage.actionBlock;
      if (!sourceBlock) return current;

      const firstHalf = sourceBlock.actions.slice(0, 2);
      const secondHalf =
        sourceBlock.actions.length > 2
          ? sourceBlock.actions.slice(2)
          : [
              {
                id: `act-cont-${Date.now()}`,
                branch: current.branchSelection === 'SALTA' ? ('SALTA' as const) : ('JUJUY' as const),
                deviationSummary: '',
                rootCause: '',
                correctiveAction: '',
                responsible: '',
                targetDate: '',
                status: 'En proceso' as const,
                followUpNote: '',
              },
            ];

      const updatedSource: ReportPage = {
        ...sourcePage,
        actionBlock: {
          ...sourceBlock,
          actions: firstHalf,
        },
      };

      const continuationPage: ReportPage = {
        id: `${sourcePage.id}-cont-${Date.now().toString(36).slice(-4)}`,
        templateType: 'action_plan_continuation',
        moduleId: sourcePage.moduleId,
        linkedIndicatorKey: sourcePage.linkedIndicatorKey,
        continuationOfPageId: sourcePage.id,
        title: `${sourcePage.title.split('—')[0].trim()} — Continuación Plan de Acción`,
        subtitle: `Seguimiento detallado vinculado a ${sourceBlock.indicatorLabel}`,
        sectionTag: `${sourcePage.sectionTag} · CONTINUACIÓN`,
        visible: true,
        exportSelected: true,
        layoutVariant: 'balanced_split',
        narrativeTitle: `Ampliación de Causas y Seguimiento (${sourceBlock.indicatorLabel})`,
        narrativeBody: '',
        actionBlock: {
          ...sourceBlock,
          visible: true,
          layoutMode: 'expanded',
          actions: secondHalf,
        },
        images: [],
      };

      const nextPages = [...current.pages];
      nextPages[idx] = updatedSource;
      nextPages.splice(idx + 1, 0, continuationPage);
      return { ...current, pages: nextPages };
    });
  };

  const handleDuplicateReportToNewPeriod = async (targetParams: {
    name: string;
    periodType: ReportPeriodType;
    year: number;
    month: string;
    quarter: QuarterCode;
    branchSelection: BranchSelection;
    keepImages: boolean;
  }) => {
    if (!doc) return;
    const targetComputed = computeDirectionReportData(rawSources || EMPTY_RAW_SOURCES, {
      periodType: targetParams.periodType,
      year: targetParams.year,
      month: targetParams.month,
      quarter: targetParams.quarter,
      branchSelection: targetParams.branchSelection,
    });

    const duplicated = duplicateDirectionReportForNewPeriod(
      doc,
      targetParams,
      targetComputed
    );

    setPeriodType(duplicated.periodType);
    setYear(duplicated.year);
    setMonth(duplicated.month);
    setQuarter(duplicated.quarter);
    setBranchSelection(duplicated.branchSelection);
    setReportName(duplicated.name);
    setDoc(duplicated);
    setUndoStack([]);
    setRedoStack([]);
    const saved = await saveDirectionReportDraft(duplicated);
    setLastSavedAt(saved.updatedAt);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <>
      {step === 'config' && (
        <div className="no-print-direction">
          <DirectionReportConfig
            reportName={reportName}
            periodType={periodType}
            year={year}
            month={month}
            quarter={quarter}
            branchSelection={branchSelection}
            enabledModules={enabledModules}
            surveySubOptions={surveySubOptions}
            computed={computed}
            rawSources={rawSources}
            isLoadingData={isLoadingData}
            onChangeReportName={setReportName}
            onChangePeriodType={setPeriodType}
            onChangeYear={setYear}
            onChangeMonth={setMonth}
            onChangeQuarter={setQuarter}
            onChangeBranchSelection={setBranchSelection}
            onChangeEnabledModules={setEnabledModules}
            onChangeSurveySubOptions={setSurveySubOptions}
            onGenerateAndOpenEditor={handleGenerateAndOpenEditor}
            onOpenExistingDraft={existing => {
              setPeriodType(existing.periodType);
              setYear(existing.year);
              setMonth(existing.month);
              setQuarter(existing.quarter);
              setBranchSelection(existing.branchSelection);
              setEnabledModules(existing.enabledModules);
              setSurveySubOptions(existing.surveySubOptions);
              setReportName(existing.name);
              setDoc(existing);
              setUndoStack([]);
              setRedoStack([]);
              setStep('editor');
            }}
            onDuplicateExistingDraft={existing => {
              const targetComputed = computeDirectionReportData(
                rawSources || EMPTY_RAW_SOURCES,
                {
                  periodType,
                  year,
                  month,
                  quarter,
                  branchSelection,
                }
              );
              const duplicated = duplicateDirectionReportForNewPeriod(
                existing,
                {
                  name: `${existing.name} (${periodType === 'monthly' ? month : quarter} ${year})`,
                  periodType,
                  year,
                  month,
                  quarter,
                  branchSelection,
                  keepImages: true,
                },
                targetComputed
              );
              setDoc(duplicated);
              setUndoStack([]);
              setRedoStack([]);
              setStep('editor');
              void saveDirectionReportDraft(duplicated);
            }}
            onBackToReportCenter={onBack}
          />
        </div>
      )}

      {step === 'editor' && doc && (
        <DirectionReportEditor
          doc={doc}
          computed={computed}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          lastSavedAt={lastSavedAt}
          isSaving={isSaving}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSaveDraft={handleManualSave}
          onUpdateDocumentMeta={patch =>
            applyDocChange(curr => ({ ...curr, ...patch }))
          }
          onUpdatePage={handleUpdatePage}
          onAddPage={handleAddPage}
          onDuplicatePage={handleDuplicatePage}
          onMovePage={handleMovePage}
          onDeletePage={handleDeletePage}
          onSplitActionPlanToContinuation={handleSplitActionPlanToContinuation}
          onResetReportContent={handleGenerateAndOpenEditor}
          onOpenDuplicateReportModal={handleDuplicateReportToNewPeriod}
          onOpenPreview={() => setStep('preview')}
          onTriggerPrint={handleTriggerPrint}
          onBackToConfig={() => setStep('config')}
        />
      )}

      {step === 'preview' && doc && (
        <DirectionReportPreview
          doc={doc}
          computed={computed}
          onUpdatePage={handleUpdatePage}
          onClosePreview={() => setStep('editor')}
          onTriggerPrint={handleTriggerPrint}
        />
      )}

      {/* Always mounted when a document exists so window.print() exports A4 Landscape cleanly */}
      {doc && <DirectionReportPrint doc={doc} computed={computed} />}
    </>
  );
};

export default DirectionReport;
