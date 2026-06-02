import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Icons } from './Icon';
import BrandMark from './BrandMark';
import {
  fetchActionPlanData,
  fetchCemOsData,
  fetchDetailedQualityData,
  fetchInternalPostventaData,
  fetchQualityData,
  fetchSalesClaimsData,
} from '../services/dataService';
import { MONTHS } from '../constants';
import {
  ActionPlanRecord,
  AppConfig,
  CemOsRecord,
  DetailedQualityRecord,
  InternalPostventaRecord,
  LoadingState,
  QualityRecord,
  SalesClaimsRecord,
} from '../types';

interface ProfessionalReportProps {
  config: AppConfig;
  onBack: () => void;
}

type BranchCode = 'JUJUY' | 'SALTA';

const BRANCHES: BranchCode[] = ['JUJUY', 'SALTA'];

const getDefaultStudyMonth = () => {
  const now = new Date();
  const previousMonthIndex = (now.getMonth() - 1 + 12) % 12;
  return MONTHS[previousMonthIndex];
};

const getLatestAvailableMonth = (months: string[]) => {
  const uniqueMonths = Array.from(new Set(months.filter(Boolean)));
  const ordered = uniqueMonths
    .map(month => ({ month, index: MONTHS.indexOf(month) }))
    .filter(item => item.index >= 0)
    .sort((a, b) => b.index - a.index);

  return ordered[0]?.month || null;
};

const normalizeBranch = (value: string) => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (normalized.includes('JUJUY') || normalized === '3059') return 'JUJUY';
  if (normalized.includes('SALTA') || normalized === '3087' || normalized === '3089') return 'SALTA';
  return normalized;
};

const isValidDateValue = (value: string) => {
  if (!value) return false;
  const cleaned = String(value).trim();
  if (!cleaned) return false;
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(cleaned)) return true;
  if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}/.test(cleaned)) return true;
  return !Number.isNaN(Date.parse(cleaned));
};

const uniqueCount = (values: Array<string | undefined | null>) =>
  new Set(values.map(v => String(v || '').trim()).filter(Boolean)).size;

const average = (values: Array<number | null | undefined>) => {
  const valid = values.filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

const buildReasonRanking = (rawValues: string[], limit = 6) => {
  const counts: Record<string, number> = {};

  rawValues.forEach(raw => {
    String(raw || '')
      .split(/[,;\n\r]+/)
      .map(item => item.trim())
      .filter(item => item && !['sin motivo', 'sin motivos', '-', '0', 'n/a'].includes(item.toLowerCase()))
      .forEach(item => {
        counts[item] = (counts[item] || 0) + 1;
      });
  });

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

const getMonthShortKey = (month: string) => {
  const map: Record<string, string> = {
    Enero: 'ene',
    Febrero: 'feb',
    Marzo: 'mar',
    Abril: 'abr',
    Mayo: 'may',
    Junio: 'jun',
    Julio: 'jul',
    Agosto: 'ago',
    Septiembre: 'sep',
    Octubre: 'oct',
    Noviembre: 'nov',
    Diciembre: 'dic',
  };

  return map[month] || '';
};

const EditableText = ({
  defaultText,
  className,
}: {
  defaultText: string;
  className: string;
}) => (
  <p
    contentEditable
    suppressContentEditableWarning
    className={className}
  >
    {defaultText}
  </p>
);

const ProfessionalReport: React.FC<ProfessionalReportProps> = ({ config, onBack }) => {
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [selectedMonth, setSelectedMonth] = useState<string>(getDefaultStudyMonth());
  const [reportData, setReportData] = useState<{
    cemOs: CemOsRecord[];
    detailedQuality: DetailedQualityRecord[];
    qualityClaims: QualityRecord[];
    salesClaims: SalesClaimsRecord[];
    internalPostventa: InternalPostventaRecord[];
    actionPlans: ActionPlanRecord[];
  }>({
    cemOs: [],
    detailedQuality: [],
    qualityClaims: [],
    salesClaims: [],
    internalPostventa: [],
    actionPlans: [],
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(LoadingState.LOADING);

      try {
        const results = await Promise.allSettled([
          fetchDetailedQualityData(config.sheetUrls.detailed_quality || ''),
          fetchDetailedQualityData(config.sheetUrls.detailed_quality_salta || ''),
          fetchQualityData(config.sheetUrls.calidad || ''),
          fetchSalesClaimsData(config.sheetUrls.sales_claims || ''),
          fetchCemOsData(config.sheetUrls.cem_os || ''),
          fetchCemOsData(config.sheetUrls.cem_os_salta || ''),
          fetchInternalPostventaData(config.sheetUrls.internal_postventa || ''),
          fetchActionPlanData(config.sheetUrls.action_plan || ''),
          fetchActionPlanData(config.sheetUrls.action_plan_sales || ''),
        ]);

        const pick = <T,>(index: number): T[] => {
          const result = results[index];
          return result.status === 'fulfilled' ? (result.value as T[]) : [];
        };

        setReportData({
          detailedQuality: [
            ...pick<DetailedQualityRecord>(0).map(item => ({ ...item, sucursal: 'JUJUY' })),
            ...pick<DetailedQualityRecord>(1).map(item => ({ ...item, sucursal: 'SALTA' })),
          ],
          qualityClaims: pick<QualityRecord>(2),
          salesClaims: pick<SalesClaimsRecord>(3),
          cemOs: [
            ...pick<CemOsRecord>(4).map(item => ({ ...item, sucursal: 'JUJUY' })),
            ...pick<CemOsRecord>(5).map(item => ({ ...item, sucursal: 'SALTA' })),
          ],
          internalPostventa: pick<InternalPostventaRecord>(6),
          actionPlans: [...pick<ActionPlanRecord>(7), ...pick<ActionPlanRecord>(8)],
        });

        setLoading(LoadingState.SUCCESS);
      } catch (error) {
        console.error('Error loading professional report data', error);
        setLoading(LoadingState.ERROR);
      }
    };

    loadData();
  }, [config]);

  useEffect(() => {
    const loadedMonths = [
      ...reportData.cemOs.map(item => item.mes),
      ...reportData.detailedQuality.map(item => item.mes),
      ...reportData.qualityClaims.map(item => item.mes),
      ...reportData.salesClaims.map(item => item.mes),
      ...reportData.internalPostventa.map(item => item.mes),
      ...reportData.actionPlans.map(item => item.mes),
    ];

    const latestMonth = getLatestAvailableMonth(loadedMonths);

    if (!latestMonth) return;

    const hasSelectedMonthData = loadedMonths.some(month => month === selectedMonth);
    if (!hasSelectedMonthData) {
      setSelectedMonth(latestMonth);
    }
  }, [reportData, selectedMonth]);

  const metrics = useMemo(() => {
    const cemMonth = reportData.cemOs.filter(item => item.mes === selectedMonth);
    const lvsMonth = reportData.detailedQuality.filter(item => item.mes === selectedMonth);
    const salesClaimsMonth = reportData.salesClaims.filter(item => item.mes === selectedMonth);
    const postventaClaimsMonth = reportData.qualityClaims.filter(item => item.mes === selectedMonth);
    const internalPostventaMonth = reportData.internalPostventa.filter(item => item.mes === selectedMonth);

    const osAvg = average(cemMonth.map(item => item.cem_score));
    const patentados = uniqueCount(cemMonth.map(item => item.chasis || item.dominio));
    const declarados = uniqueCount(
      cemMonth
        .filter(item => isValidDateValue(item.fecha_link_llega))
        .map(item => item.chasis || item.dominio)
    );
    const respondieron = uniqueCount(
      cemMonth
        .filter(item => item.cem_score !== null)
        .map(item => item.chasis || item.dominio)
    );

    const lvsAvg = average(lvsMonth.map(item => item.q4_score));
    const tratoAvg = average(lvsMonth.map(item => item.q1_score));
    const reparacionAvg = average(lvsMonth.map(item => item.q3_score));

    const branchBreakdown = BRANCHES.map(branch => {
      const branchOs = cemMonth.filter(item => normalizeBranch((item as any).sucursal || item.codigo) === branch);
      const branchLvs = lvsMonth.filter(item => normalizeBranch(item.sucursal || '') === branch);
      const branchClaims = postventaClaimsMonth.filter(
        item => normalizeBranch(item.sucursal || item.sector || '') === branch
      );

      return {
        branch,
        os: round(average(branchOs.map(item => item.cem_score))),
        patentados: uniqueCount(branchOs.map(item => item.chasis || item.dominio)),
        declarados: uniqueCount(
          branchOs
            .filter(item => isValidDateValue(item.fecha_link_llega))
            .map(item => item.chasis || item.dominio)
        ),
        lvs: round(average(branchLvs.map(item => item.q4_score))),
        postventaClaims: branchClaims.length,
        resolvedClaims: branchClaims.filter(item => String(item.resuelto || '').toUpperCase() === 'SI').length,
      };
    });

    const osEvolution = MONTHS.map(month => {
      const monthData = reportData.cemOs.filter(item => item.mes === month);
      return {
        name: month,
        value: round(average(monthData.map(item => item.cem_score))),
        highlight: month === selectedMonth,
      };
    });

    const lvsEvolution = MONTHS.map(month => {
      const monthData = reportData.detailedQuality.filter(item => item.mes === month);
      return {
        name: month,
        value: round(average(monthData.map(item => item.q4_score))),
        highlight: month === selectedMonth,
      };
    });

    const consolidatedClaims = {
      ventas: salesClaimsMonth.length,
      postventa: postventaClaimsMonth.length,
      postventaUnique: uniqueCount(postventaClaimsMonth.map(item => item.orden)),
      postventaResolved: postventaClaimsMonth.filter(item => String(item.resuelto || '').toUpperCase() === 'SI').length,
      postventaPending: postventaClaimsMonth.filter(item => String(item.resuelto || '').toUpperCase() !== 'SI').length,
    };

    const topSalesClaimReasons = buildReasonRanking(salesClaimsMonth.map(item => item.motivo));
    const topPostventaClaimReasons = buildReasonRanking(postventaClaimsMonth.map(item => item.motivo));

    const internalPostventaScore = {
      total: internalPostventaMonth.length,
      servicio: round(average(internalPostventaMonth.map(item => item.servicio_prestado))),
      trato: round(average(internalPostventaMonth.map(item => item.trato_personal))),
      organizacion: round(average(internalPostventaMonth.map(item => item.organizacion))),
      taller: round(average(internalPostventaMonth.map(item => item.trabajo_taller))),
    };

    const selectedMonthKey = getMonthShortKey(selectedMonth);
    const actionPlansMonth = reportData.actionPlans
      .filter(plan => plan.isPlan)
      .filter(plan => {
        if (plan.mes === selectedMonth) return true;
        const tracking = selectedMonthKey ? plan.seguimiento?.[selectedMonthKey] : '';
        return Boolean(tracking && tracking.trim());
      })
      .slice(0, 6);

    return {
      osAvg: round(osAvg),
      patentados,
      declarados,
      respondieron,
      lvsAvg: round(lvsAvg),
      tratoAvg: round(tratoAvg),
      reparacionAvg: round(reparacionAvg),
      branchBreakdown,
      osEvolution,
      lvsEvolution,
      consolidatedClaims,
      topSalesClaimReasons,
      topPostventaClaimReasons,
      internalPostventaScore,
      actionPlansMonth,
    };
  }, [reportData, selectedMonth]);

  const handlePrint = () => window.print();

  const executiveSummary = `El presente informe consolida el cierre de ${selectedMonth} para Dirección, integrando la lectura de los indicadores generales de marca OS y LVS, junto con el comportamiento de reclamos y el seguimiento de acciones correctivas. En esta edición se prioriza una lectura ejecutiva, con foco en el mes analizado y en las desvíos que requieren decisiones de gestión.`;
  const closureNote =
    selectedMonth === 'Abril'
      ? 'Para el mes de Abril, el corte operativo considerado en este informe fue el 20 de mayo. En ventas y postventa el cierre suele consolidarse entre los días 20 y 22 del mes siguiente.'
      : `El periodo analizado corresponde a ${selectedMonth}. El cierre operativo de ventas y postventa se consolida habitualmente entre los días 20 y 22 del mes siguiente, por lo que los indicadores aquí presentados responden al mes ya cerrado.`;
  const commercialSummary = `OS marca cerró en ${metrics.osAvg.toFixed(2)} puntos, sobre ${metrics.patentados} patentados y ${metrics.declarados} declarados. La lectura ejecutiva sugiere revisar la conversión de base declarada a respuesta efectiva, priorizando seguimiento comercial y trazabilidad del contacto.`;
  const postventaSummary = `LVS general cerró en ${metrics.lvsAvg.toFixed(2)} puntos. La mirada consolidada de Jujuy y Salta permite comparar desempeño, detectar dispersiones y orientar decisiones sobre atención, reparación y resolución de reclamos del periodo.`;
  const actionSummary = `Las acciones listadas a continuación reúnen desvíos abiertos o con seguimiento durante ${selectedMonth}. Este bloque queda editable para completar definiciones, responsables y fechas antes de emitir la versión final del PDF.`;

  if (loading === LoadingState.LOADING) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <div className="rounded-[2rem] border border-neutral-200 bg-white px-10 py-8 shadow-xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-neutral-400">Preparando Informe</p>
          <p className="mt-4 text-3xl font-black italic tracking-tight text-neutral-900">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (loading === LoadingState.ERROR) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-8">
        <div className="max-w-xl rounded-[2rem] border border-neutral-200 bg-white px-10 py-10 shadow-xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-neutral-400">Reporte Ejecutivo</p>
          <h2 className="mt-4 text-3xl font-black italic tracking-tight text-neutral-900">No fue posible cargar la información</h2>
          <p className="mt-4 text-sm leading-7 text-neutral-600">
            Revisá las fuentes configuradas del tablero y volvé a intentar. El informe necesita datos de OS, LVS, reclamos y plan de acción.
          </p>
          <button
            onClick={onBack}
            className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-neutral-900 px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-white"
          >
            <Icons.ArrowLeft className="h-4 w-4" />
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-200 p-4 md:p-8 print:p-0 print:bg-white">
      <div className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-neutral-300 bg-white px-6 py-5 shadow-lg print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-700"
          >
            <Icons.ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-neutral-400">Calidad Autosol</p>
            <h1 className="text-2xl font-black italic tracking-tight text-neutral-900">Informe Ejecutivo para Dirección</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={event => setSelectedMonth(event.target.value)}
            className="rounded-2xl border border-neutral-300 bg-neutral-50 px-5 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-neutral-800 outline-none"
          >
            {MONTHS.map(month => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-3 rounded-2xl bg-neutral-900 px-6 py-3 text-[11px] font-black uppercase tracking-[0.25em] text-white shadow-lg"
          >
            <Icons.Printer className="h-4 w-4" />
            Descargar PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[210mm] overflow-hidden bg-white shadow-2xl print:shadow-none">
        <section className="page-break-after min-h-[297mm] bg-neutral-950 p-8 text-white flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <BrandMark variant="light" className="mb-10" />
              <p className="text-[11px] font-black uppercase tracking-[0.45em] text-neutral-400">Área de Calidad</p>
              <h2 className="mt-6 max-w-4xl text-[3.15rem] font-black uppercase italic leading-[0.92] tracking-tight">
                Informe de Cierre
                <span className="block text-neutral-300">Dirección y Dueños</span>
              </h2>
            </div>
            <div className="rounded-[2rem] border border-white/15 px-6 py-4 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-500">Mes de estudio</p>
              <p className="mt-2 text-3xl font-black italic text-white">{selectedMonth}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'OS Marca', value: metrics.osAvg.toFixed(2) },
              { label: 'LVS Marca', value: metrics.lvsAvg.toFixed(2) },
              { label: 'Reclamos Postventa', value: String(metrics.consolidatedClaims.postventa) },
            ].map(card => (
              <div key={card.label} className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-neutral-500">{card.label}</p>
                <p className="mt-4 text-4xl font-black italic tracking-tight text-white">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <EditableText
              defaultText={closureNote}
              className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-neutral-200 outline-none"
            />
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-neutral-500">
              Documento interno de gestión. Editable antes de exportar.
            </p>
          </div>
        </section>

        <section className="page-break-after min-h-[297mm] bg-white p-8">
          <SectionHeader
            title={`Resumen Ejecutivo - ${selectedMonth}`}
            subtitle="Síntesis formal para lectura directiva"
            page="01"
          />

          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-6">
              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-7">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-500">Contexto del cierre</h3>
                <EditableText
                  defaultText={executiveSummary}
                  className="mt-4 rounded-xl bg-white p-4 text-sm leading-7 text-neutral-700 outline-none"
                />
              </div>

              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-7">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-500">Resumen comercial</h3>
                <EditableText
                  defaultText={commercialSummary}
                  className="mt-4 rounded-xl bg-white p-4 text-sm leading-7 text-neutral-700 outline-none"
                />
              </div>

              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-7">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-500">Resumen postventa</h3>
                <EditableText
                  defaultText={postventaSummary}
                  className="mt-4 rounded-xl bg-white p-4 text-sm leading-7 text-neutral-700 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 content-start">
              <MetricCard title="Patentados" value={String(metrics.patentados)} hint="Base del mes analizado" />
              <MetricCard title="Declarados" value={String(metrics.declarados)} hint="Con link recibido" />
              <MetricCard title="Respondieron OS" value={String(metrics.respondieron)} hint="Encuestas con score" />
              <MetricCard
                title="Reclamos Internos"
                value={String(metrics.consolidatedClaims.ventas + metrics.consolidatedClaims.postventa)}
                hint="Ventas + Postventa"
              />
              <MetricCard title="Trato Postventa" value={metrics.tratoAvg.toFixed(2)} hint="Promedio Q1" />
              <MetricCard title="Calidad Reparación" value={metrics.reparacionAvg.toFixed(2)} hint="Promedio Q3" />
              <MetricCard title="OR Únicas" value={String(metrics.consolidatedClaims.postventaUnique)} hint="Casos postventa" />
              <MetricCard title="Resueltos" value={String(metrics.consolidatedClaims.postventaResolved)} hint="Cierre del mes" />
            </div>
          </div>
        </section>

        <section className="page-break-after min-h-[297mm] bg-white p-8">
          <SectionHeader
            title={`OS General de Marca - ${selectedMonth}`}
            subtitle="Patentados, declarados y evolución histórica"
            page="02"
          />

          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-5">
              <HighlightCard title="Promedio OS" value={metrics.osAvg.toFixed(2)} />
              <div className="grid grid-cols-2 gap-4">
                <MetricCard title="Patentados" value={String(metrics.patentados)} hint="Unidades base" />
                <MetricCard title="Declarados" value={String(metrics.declarados)} hint="Con gestión de envío" />
                <MetricCard title="Respondieron" value={String(metrics.respondieron)} hint="Encuestas válidas" />
                <MetricCard
                  title="Conversión Declarado/Respuesta"
                  value={`${metrics.declarados ? Math.round((metrics.respondieron / metrics.declarados) * 100) : 0}%`}
                  hint="Eficacia de respuesta"
                />
              </div>

              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-6">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-500">Lectura ejecutiva</h3>
                <EditableText
                  defaultText="Incorporar aquí una interpretación comercial del mes, el impacto de la base patentada y la lectura de cumplimiento frente al objetivo de marca."
                  className="mt-4 rounded-xl bg-white p-4 text-sm leading-7 text-neutral-700 outline-none"
                />
              </div>
            </div>

              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-6 flex flex-col">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-500 text-center">Evolución Histórica OS</h3>
              <div className="mt-6 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.osEvolution} margin={{ top: 16, right: 20, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d4d4d4" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#404040' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#404040' }} domain={[0, 5]} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={28}>
                      {metrics.osEvolution.map(item => (
                        <Cell key={item.name} fill={item.highlight ? '#171717' : '#a3a3a3'} />
                      ))}
                      <LabelList dataKey="value" position="top" style={{ fill: '#171717', fontSize: 11, fontWeight: 800 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>

        <section className="page-break-after min-h-[297mm] bg-white p-8">
          <SectionHeader
            title={`LVS y Reclamos Postventa - ${selectedMonth}`}
            subtitle="Consolidado y apertura por sucursal"
            page="03"
          />

          <div className="grid grid-cols-1 gap-6">
            <div className="flex flex-col gap-5">
              <HighlightCard title="Promedio LVS" value={metrics.lvsAvg.toFixed(2)} />
              <div className="grid grid-cols-2 gap-4">
                {metrics.branchBreakdown.map(item => (
                  <div key={item.branch} className="rounded-[1.75rem] border border-neutral-200 bg-neutral-50 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-neutral-500">{item.branch}</p>
                    <p className="mt-4 text-3xl font-black italic text-neutral-900">LVS {item.lvs.toFixed(2)}</p>
                    <div className="mt-4 space-y-2 text-xs font-semibold text-neutral-600">
                      <div className="flex justify-between"><span>OS</span><span>{item.os.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Reclamos</span><span>{item.postventaClaims}</span></div>
                      <div className="flex justify-between"><span>Resueltos</span><span>{item.resolvedClaims}</span></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-6">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-500">Resumen postventa</h3>
                <EditableText
                  defaultText="Completar aquí la lectura comparativa entre Jujuy y Salta, destacando el mes estudiado, desvíos observados y prioridades de intervención."
                  className="mt-4 rounded-xl bg-white p-4 text-sm leading-7 text-neutral-700 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-6">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-500 text-center">Evolución Histórica LVS</h3>
                <div className="mt-4 h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics.lvsEvolution} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d4d4d4" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#404040' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#404040' }} domain={[0, 5]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#171717" strokeWidth={3} dot={{ r: 4, fill: '#737373' }} activeDot={{ r: 7, fill: '#171717' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-900 p-6 text-white">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-400">Encuesta interna postventa</h3>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <MiniScore label="Servicio" value={metrics.internalPostventaScore.servicio} />
                  <MiniScore label="Trato" value={metrics.internalPostventaScore.trato} />
                  <MiniScore label="Organización" value={metrics.internalPostventaScore.organizacion} />
                  <MiniScore label="Taller" value={metrics.internalPostventaScore.taller} />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
                  Base interna del mes: {metrics.internalPostventaScore.total} encuestas
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="page-break-after min-h-[297mm] bg-white p-8">
          <SectionHeader
            title={`Reclamos del Mes - ${selectedMonth}`}
            subtitle="Incidencias internas, motivos y resolución"
            page="04"
          />

          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-6 flex flex-col">
              <div className="grid grid-cols-2 gap-4">
                <MetricCard title="Reclamos Ventas" value={String(metrics.consolidatedClaims.ventas)} hint="Mes estudiado" />
                <MetricCard title="Reclamos Postventa" value={String(metrics.consolidatedClaims.postventa)} hint="Mes estudiado" />
                <MetricCard title="Pendientes" value={String(metrics.consolidatedClaims.postventaPending)} hint="Postventa" />
                <MetricCard title="Resueltos" value={String(metrics.consolidatedClaims.postventaResolved)} hint="Postventa" />
              </div>

              <div className="mt-6 flex-1">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-500 text-center">Motivos principales postventa</h3>
                <div className="mt-4 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.topPostventaClaimReasons} layout="vertical" margin={{ top: 0, right: 24, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d4d4d4" />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={170}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#404040' }}
                        interval={0}
                      />
                      <Tooltip />
                      <Bar dataKey="value" fill="#171717" radius={[0, 10, 10, 0]} barSize={18}>
                        <LabelList dataKey="value" position="right" style={{ fill: '#171717', fontSize: 11, fontWeight: 800 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-6 flex-1">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-500 text-center">Motivos principales ventas</h3>
                <div className="mt-4 h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.topSalesClaimReasons} layout="vertical" margin={{ top: 0, right: 24, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#d4d4d4" />
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={170}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 700, fill: '#404040' }}
                        interval={0}
                      />
                      <Tooltip />
                      <Bar dataKey="value" fill="#737373" radius={[0, 10, 10, 0]} barSize={18}>
                        <LabelList dataKey="value" position="right" style={{ fill: '#404040', fontSize: 11, fontWeight: 800 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-900 p-6 text-white">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-400">Resumen de reclamos</h3>
                <EditableText
                  defaultText="Agregar aquí una síntesis ejecutiva sobre recurrencia, criticidad, responsables involucrados y necesidad de escalamiento a Dirección."
                  className="mt-4 rounded-xl bg-white/5 p-4 text-sm leading-7 text-neutral-200 outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="page-break-after min-h-[297mm] bg-white p-8">
          <SectionHeader
            title={`Plan de Acción - ${selectedMonth}`}
            subtitle="Bloque editable para seguimiento y validación"
            page="05"
          />

          <div className="grid grid-cols-1 gap-5">
            <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-6">
              <EditableText
                defaultText={actionSummary}
                className="rounded-xl bg-white p-4 text-sm leading-7 text-neutral-700 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 min-h-0">
              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-6 overflow-hidden">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-500">Acciones relevadas del sistema</h3>
                <div className="mt-4 pr-2">
                  <div className="space-y-4">
                    {metrics.actionPlansMonth.length > 0 ? (
                      metrics.actionPlansMonth.map(plan => (
                        <div key={plan.id} className="rounded-[1.5rem] border border-neutral-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-400">
                                {plan.nombre_kpi || 'Plan de acción'}
                              </p>
                              <p className="mt-2 text-sm font-bold text-neutral-900">{plan.causa_raiz || 'Sin causa raíz cargada'}</p>
                            </div>
                            <span className="rounded-full bg-neutral-900 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white">
                              {plan.estado || 'Abierto'}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-neutral-600">
                            <div><span className="font-black uppercase text-neutral-400">Responsable:</span> {plan.responsable || 'A definir'}</div>
                            <div><span className="font-black uppercase text-neutral-400">Sector:</span> {plan.sector || 'General'}</div>
                            <div><span className="font-black uppercase text-neutral-400">Acción inmediata:</span> {plan.accion_inmediata || 'Sin registrar'}</div>
                            <div><span className="font-black uppercase text-neutral-400">Acción correctiva:</span> {plan.accion_correctiva || 'Sin registrar'}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-neutral-300 bg-white p-6 text-sm text-neutral-500">
                        No se encontraron planes asociados al mes seleccionado. Podés completar este bloque manualmente antes de exportar.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-neutral-200 bg-neutral-900 p-6 text-white">
                <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-400">Plan ejecutivo editable</h3>
                <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-white/10">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-white/10">
                      <tr>
                        <th className="px-3 py-3 font-black uppercase tracking-[0.18em] text-neutral-300">Acción</th>
                        <th className="px-3 py-3 font-black uppercase tracking-[0.18em] text-neutral-300">Responsable</th>
                        <th className="px-3 py-3 font-black uppercase tracking-[0.18em] text-neutral-300">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4].map(row => (
                        <tr key={row} className="border-t border-white/10">
                          <td contentEditable suppressContentEditableWarning className="px-3 py-4 align-top outline-none">Completar acción prioritaria {row}</td>
                          <td contentEditable suppressContentEditableWarning className="px-3 py-4 align-top outline-none">Responsable</td>
                          <td contentEditable suppressContentEditableWarning className="px-3 py-4 align-top outline-none">dd/mm/aaaa</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <EditableText
                  defaultText="Agregar aquí un cierre ejecutivo del plan de acción: prioridades, escalamiento requerido, recursos necesarios y fecha estimada de revisión por Dirección."
                  className="mt-5 rounded-xl bg-white/5 p-4 text-sm leading-7 text-neutral-200 outline-none"
                />
              </div>
            </div>

            <div className="rounded-[2rem] border border-neutral-200 bg-neutral-50 p-6">
              <h3 className="text-[11px] font-black uppercase tracking-[0.28em] text-neutral-500">Conclusión final</h3>
              <EditableText
                defaultText="Espacio para completar la conclusión final del informe, decisiones acordadas con Dirección y próximos pasos de seguimiento."
                className="mt-4 rounded-xl bg-white p-4 text-sm leading-7 text-neutral-700 outline-none"
              />
            </div>
          </div>
        </section>

        <section className="min-h-[297mm] bg-neutral-950 text-white p-8 flex flex-col justify-center items-center text-center">
          <BrandMark variant="light" className="mb-10" />
          <p className="text-[11px] font-black uppercase tracking-[0.45em] text-neutral-500">Cierre del informe</p>
          <h2 className="mt-8 text-6xl font-black uppercase italic tracking-tight">Dirección</h2>
          <EditableText
            defaultText="Este documento resume el cierre del periodo bajo análisis y queda disponible para su validación, comentarios y definición de acciones."
            className="mt-8 max-w-4xl rounded-[1.5rem] border border-white/10 bg-white/5 p-6 text-lg leading-8 text-neutral-200 outline-none"
          />
          <p className="mt-12 text-[10px] font-black uppercase tracking-[0.35em] text-neutral-500">
            Autosol - Informe ejecutivo editable previo a exportación
          </p>
        </section>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page { size: A4 portrait; margin: 0; }
              body { margin: 0 !important; background: white !important; }
              .print\\:hidden { display: none !important; }
              .page-break-after { page-break-after: always; }
            }
            [contenteditable="true"] {
              transition: background-color 0.2s ease, outline-color 0.2s ease;
            }
            [contenteditable="true"]:hover {
              background: rgba(0, 0, 0, 0.04);
            }
            .bg-neutral-900 [contenteditable="true"]:hover,
            .bg-neutral-950 [contenteditable="true"]:hover {
              background: rgba(255, 255, 255, 0.08);
            }
            [contenteditable="true"]:focus {
              outline: 2px solid #404040;
              outline-offset: 2px;
            }
            .bg-neutral-900 [contenteditable="true"]:focus,
            .bg-neutral-950 [contenteditable="true"]:focus {
              outline: 2px solid #d4d4d4;
            }
          `,
        }}
      />
    </div>
  );
};

const SectionHeader = ({
  title,
  subtitle,
  page,
}: {
  title: string;
  subtitle: string;
  page: string;
}) => (
  <div className="mb-6 flex items-start justify-between">
    <div>
      <h2 className="text-4xl font-black uppercase italic tracking-tight text-neutral-900">{title}</h2>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.35em] text-neutral-400">{subtitle}</p>
    </div>
    <div className="rounded-[1.5rem] border border-neutral-200 bg-neutral-50 px-5 py-3 text-right">
      <p className="text-[9px] font-black uppercase tracking-[0.22em] text-neutral-400">Página</p>
      <p className="mt-1 text-2xl font-black italic text-neutral-900">{page}</p>
    </div>
  </div>
);

const MetricCard = ({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) => (
  <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5">
    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-neutral-400">{title}</p>
    <p className="mt-3 text-3xl font-black italic tracking-tight text-neutral-900">{value}</p>
    <p className="mt-2 text-[11px] font-semibold text-neutral-500">{hint}</p>
  </div>
);

const HighlightCard = ({
  title,
  value,
}: {
  title: string;
  value: string;
}) => (
  <div className="rounded-[2rem] bg-neutral-900 p-7 text-white">
    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">{title}</p>
    <p className="mt-5 text-7xl font-black italic tracking-tight">{value}</p>
  </div>
);

const MiniScore = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <div className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4 text-center">
    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">{label}</p>
    <p className="mt-3 text-2xl font-black italic text-white">{value.toFixed(2)}</p>
  </div>
);

export default ProfessionalReport;
