import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { motion } from 'motion/react';
import { ChartWrapper, DashboardFrame, DataTable, LuxuryKPICard, StatusBadge } from './DashboardUI';
import { Icons } from './Icon';
import { DEFAULT_CONFIG, MONTHS } from '../constants';
import { fetchPvtOccupationData } from '../services/dataService';
import { LoadingStatus, PvtOccupationRecord } from '../types';

interface PostventaPvtOccupationDashboardProps {
  sheetUrl?: string;
  onBack?: () => void;
}

const METRIC_DEFS = [
  { id: 'grado_ocupacion', label: 'Grado de ocupación', shortLabel: 'Ocupación', color: '#2563eb', soft: '#dbeafe', target: 95 },
  { id: 'grado_ocupacion_productiva', label: 'Grado de ocupación productiva', shortLabel: 'Ocupación productiva', color: '#0f766e', soft: '#ccfbf1', target: 90 },
  { id: 'productividad', label: 'Productividad', shortLabel: 'Productividad', color: '#7c3aed', soft: '#ede9fe', target: 100 },
  { id: 'productividad_siac', label: 'Productividad SIAC', shortLabel: 'Productividad SIAC', color: '#ea580c', soft: '#ffedd5', target: 100 },
] as const;

type MetricId = (typeof METRIC_DEFS)[number]['id'];

const formatPercent = (value: number) => `${value.toFixed(1)}%`;
const formatHours = (value: number) => value.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const getStatus = (value: number, target: number): 'success' | 'warning' | 'error' => {
  if (value >= target) return 'success';
  if (value >= target * 0.92) return 'warning';
  return 'error';
};

const aggregateMetrics = (records: PvtOccupationRecord[]) => {
  const totals = records.reduce(
    (acc, row) => {
      acc.horas_disponibles += row.horas_disponibles;
      acc.hs_trabajadas += row.hs_trabajadas;
      acc.horas_productivas_tracking += row.horas_productivas_tracking;
      acc.horas_no_productivas_tracking += row.horas_no_productivas_tracking;
      acc.horas_pauta_trabajadas += row.horas_pauta_trabajadas;
      acc.horas_vendidas_siac += row.horas_vendidas_siac;
      return acc;
    },
    {
      horas_disponibles: 0,
      hs_trabajadas: 0,
      horas_productivas_tracking: 0,
      horas_no_productivas_tracking: 0,
      horas_pauta_trabajadas: 0,
      horas_vendidas_siac: 0,
    }
  );

  const safePct = (numerator: number, denominator: number) => (denominator > 0 ? (numerator / denominator) * 100 : 0);

  return {
    ...totals,
    grado_ocupacion: safePct(totals.hs_trabajadas, totals.horas_disponibles),
    grado_ocupacion_productiva: safePct(totals.horas_productivas_tracking, totals.horas_disponibles),
    productividad: safePct(totals.horas_pauta_trabajadas, totals.horas_productivas_tracking),
    productividad_siac: safePct(totals.horas_vendidas_siac, totals.horas_productivas_tracking),
  };
};

const MetricKpiTile = ({ metric, value }: { metric: (typeof METRIC_DEFS)[number]; value: number }) => (
  <div className="rounded-[1.8rem] border border-white/70 bg-white/80 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <p className="text-[8px] font-black uppercase tracking-[0.24em] text-slate-400">Indicador</p>
        <h3 className="mt-2 text-sm font-black text-slate-950">{metric.shortLabel}</h3>
      </div>
      <StatusBadge status={getStatus(value, metric.target)} label={value >= metric.target ? 'En meta' : 'Seguimiento'} />
    </div>
    <p className="text-4xl font-black italic tracking-tighter text-slate-950">{formatPercent(value)}</p>
    <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(value, 140) / 1.4}%`, background: `linear-gradient(90deg, ${metric.color}, ${metric.color}AA)` }}
      />
    </div>
    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Objetivo {metric.target}%</p>
  </div>
);

const MonthlySummaryGrid = ({
  rows,
}: {
  rows: Array<ReturnType<typeof aggregateMetrics> & { mes: string; selected: boolean }>;
}) => (
  <div className="overflow-hidden rounded-[2rem] border border-white/60 bg-white/75 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
    <div className="grid grid-cols-[1.15fr_repeat(6,minmax(0,1fr))] border-b border-white/70 bg-slate-950 text-white">
      <div className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.22em]">Mes</div>
      <div className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-[0.22em]">Días disp.</div>
      <div className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-[0.22em]">Hs disp.</div>
      <div className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-[0.22em]">Productiva</div>
      <div className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-[0.22em]">Ocupación</div>
      <div className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-[0.22em]">Prod.</div>
      <div className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-[0.22em]">SIAC</div>
    </div>

    {rows.map((row) => (
      <div
        key={row.mes}
        className={`grid grid-cols-[1.15fr_repeat(6,minmax(0,1fr))] border-b border-slate-100 last:border-b-0 ${
          row.selected ? 'bg-blue-50/70' : 'bg-white/70'
        }`}
      >
        <div className="px-4 py-4 text-sm font-black uppercase tracking-tight text-slate-900">{row.mes}</div>
        <div className="px-3 py-4 text-center text-sm font-bold text-slate-600">{Math.round(row.horas_disponibles / 42) || 0}</div>
        <div className="px-3 py-4 text-center text-sm font-bold text-slate-600">{formatHours(row.horas_disponibles)}</div>
        <div className="px-3 py-4 text-center text-sm font-black text-teal-700">{formatPercent(row.grado_ocupacion_productiva)}</div>
        <div className="px-3 py-4 text-center text-sm font-black text-blue-700">{formatPercent(row.grado_ocupacion)}</div>
        <div className="px-3 py-4 text-center text-sm font-black text-violet-700">{formatPercent(row.productividad)}</div>
        <div className="px-3 py-4 text-center text-sm font-black text-orange-700">{formatPercent(row.productividad_siac)}</div>
      </div>
    ))}
  </div>
);

export const PostventaPvtOccupationDashboard: React.FC<PostventaPvtOccupationDashboardProps> = ({ sheetUrl, onBack }) => {
  const [data, setData] = useState<PvtOccupationRecord[]>([]);
  const [loading, setLoading] = useState<LoadingStatus>({ isLoading: true, error: null });
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading({ isLoading: true, error: null });
      try {
        const result = await fetchPvtOccupationData(sheetUrl || DEFAULT_CONFIG.sheetUrls.pvt_occupation);
        setData(result);
        setLoading({ isLoading: false, error: null });
      } catch {
        setLoading({ isLoading: false, error: 'No se pudo cargar la ocupación PVT.' });
      }
    };

    loadData();
  }, [sheetUrl]);

  const availableMonths = useMemo(() => {
    const months = Array.from(new Set(data.map((item) => item.mes)));
    return MONTHS.filter((month) => months.includes(month));
  }, [data]);

  const availableTechnicians = useMemo(
    () => Array.from(new Set(data.map((item) => item.tecnico))).sort((a, b) => a.localeCompare(b, 'es')),
    [data]
  );

  useEffect(() => {
    if (availableMonths.length > 0 && selectedMonths.length === 0) {
      setSelectedMonths([availableMonths[availableMonths.length - 1]]);
    }
  }, [availableMonths, selectedMonths.length]);

  const selectedTechScopedData = useMemo(() => {
    if (selectedTechnicians.length === 0) return data;
    return data.filter((row) => selectedTechnicians.includes(row.tecnico));
  }, [data, selectedTechnicians]);

  const filteredData = useMemo(() => {
    return selectedTechScopedData.filter((row) => selectedMonths.length === 0 || selectedMonths.includes(row.mes));
  }, [selectedTechScopedData, selectedMonths]);

  const totals = useMemo(() => aggregateMetrics(filteredData), [filteredData]);

  const technicianComparison = useMemo(() => {
    const grouped = new Map<string, PvtOccupationRecord[]>();
    filteredData.forEach((row) => grouped.set(row.tecnico, [...(grouped.get(row.tecnico) || []), row]));

    return Array.from(grouped.entries())
      .map(([tecnico, rows]) => ({ tecnico, ...aggregateMetrics(rows) }))
      .sort((a, b) => b.grado_ocupacion - a.grado_ocupacion);
  }, [filteredData]);

  const monthlySummary = useMemo(() => {
    return availableMonths.map((month) => {
      const monthRows = selectedTechScopedData.filter((row) => row.mes === month);
      return {
        mes: month,
        selected: selectedMonths.length === 0 || selectedMonths.includes(month),
        ...aggregateMetrics(monthRows),
      };
    });
  }, [availableMonths, selectedTechScopedData, selectedMonths]);

  const monthlyOccupationChart = useMemo(
    () =>
      monthlySummary.map((row) => ({
        ...row,
        fill: row.selected ? '#2563eb' : '#bfdbfe',
      })),
    [monthlySummary]
  );

  const hourDistribution = useMemo(
    () =>
      technicianComparison.map((row) => ({
        tecnico: row.tecnico,
        productivas: Number(row.horas_productivas_tracking.toFixed(1)),
        noProductivas: Number(row.horas_no_productivas_tracking.toFixed(1)),
        pauta: Number(row.horas_pauta_trabajadas.toFixed(1)),
        siac: Number(row.horas_vendidas_siac.toFixed(1)),
      })),
    [technicianComparison]
  );

  const toggleMonth = (month: string) => {
    if (month === 'TODOS') {
      setSelectedMonths([]);
      return;
    }
    setSelectedMonths((prev) => (prev.includes(month) ? prev.filter((item) => item !== month) : [...prev, month]));
  };

  const toggleTechnician = (tecnico: string) => {
    if (tecnico === 'TODOS') {
      setSelectedTechnicians([]);
      return;
    }
    setSelectedTechnicians((prev) => (prev.includes(tecnico) ? prev.filter((item) => item !== tecnico) : [...prev, tecnico]));
  };

  const selectedMonthLabel = selectedMonths.length === 0 ? 'Todos los meses' : `${selectedMonths.length} mes(es)`;
  const selectedTechLabel = selectedTechnicians.length === 0 ? 'Todos los técnicos' : `${selectedTechnicians.length} técnico(s)`;

  return (
    <DashboardFrame
      title="Ocupacion PVT"
      subtitle="Ocupación, productividad y lectura mensual por técnico"
      onBack={onBack}
      isLoading={loading.isLoading}
      lastUpdated={new Date().toLocaleString('es-AR')}
      context={
        <>
          <StatusBadge status="info" label={selectedMonthLabel} />
          <StatusBadge status="info" label={selectedTechLabel} />
        </>
      }
    >
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-[2.2rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(241,245,249,0.82))] p-6 shadow-[0_16px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl"
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_1fr]">
          <div className="space-y-3">
            <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-slate-400">
              <Icons.Calendar className="h-3 w-3" /> Mes
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleMonth('TODOS')}
                className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  selectedMonths.length === 0 ? 'border-blue-600 bg-blue-600 text-white' : 'border-white/60 bg-white/70 text-slate-500 hover:border-slate-200'
                }`}
              >
                Todos
              </button>
              {availableMonths.map((month) => (
                <button
                  key={month}
                  onClick={() => toggleMonth(month)}
                  className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                    selectedMonths.includes(month) ? 'border-blue-600 bg-blue-600 text-white' : 'border-white/60 bg-white/70 text-slate-500 hover:border-slate-200'
                  }`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-slate-400">
              <Icons.Users className="h-3 w-3" /> Técnico
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleTechnician('TODOS')}
                className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  selectedTechnicians.length === 0 ? 'border-slate-950 bg-slate-950 text-white' : 'border-white/60 bg-white/70 text-slate-500 hover:border-slate-200'
                }`}
              >
                Todos
              </button>
              {availableTechnicians.map((tecnico) => (
                <button
                  key={tecnico}
                  onClick={() => toggleTechnician(tecnico)}
                  className={`rounded-xl border px-4 py-2 text-[10px] font-black tracking-tight transition-all ${
                    selectedTechnicians.includes(tecnico) ? 'border-slate-950 bg-slate-950 text-white' : 'border-white/60 bg-white/70 text-slate-500 hover:border-slate-200'
                  }`}
                >
                  {tecnico}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {loading.error ? (
        <div className="rounded-[2rem] border border-rose-100 bg-rose-50 p-8 text-rose-700">
          <div className="flex items-center gap-3">
            <Icons.AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-black uppercase tracking-[0.2em]">{loading.error}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {METRIC_DEFS.map((metric) => (
              <LuxuryKPICard
                key={metric.id}
                title={metric.shortLabel}
                value={Number(totals[metric.id] || 0)}
                color={metric.color}
                icon={Icons.Activity}
                featured
                footerLabel="Consolidado"
                footerValue={formatPercent(totals[metric.id] || 0)}
                footerDetail={`Meta ${metric.target}%`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <ChartWrapper title="Grado de ocupación mensual" subtitle="Suma general según técnicos seleccionados" className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyOccupationChart} margin={{ top: 20, right: 24, left: 4, bottom: 20 }}>
                  <defs>
                    <linearGradient id="ocupacionMonthlyArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                  <YAxis tickFormatter={(value) => `${value}%`} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                  <Tooltip formatter={(value: number) => formatPercent(Number(value || 0))} />
                  <Legend />
                  <Bar dataKey="grado_ocupacion" name="Grado de ocupación" radius={[10, 10, 0, 0]}>
                    {monthlyOccupationChart.map((entry) => (
                      <Cell key={entry.mes} fill={entry.fill} />
                    ))}
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="grado_ocupacion_productiva"
                    name="Ocupación productiva"
                    stroke="#0f766e"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartWrapper>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
              {METRIC_DEFS.map((metric) => (
                <MetricKpiTile key={metric.id} metric={metric} value={totals[metric.id] || 0} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {METRIC_DEFS.map((metric) => (
              <ChartWrapper
                key={metric.id}
                title={metric.label}
                subtitle="Comparación por técnico con los meses filtrados"
                className="h-[380px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={technicianComparison}
                    layout="vertical"
                    margin={{ top: 12, right: 22, left: 22, bottom: 12 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `${value}%`} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                    <YAxis
                      type="category"
                      dataKey="tecnico"
                      width={122}
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }}
                    />
                    <Tooltip formatter={(value: number) => formatPercent(Number(value || 0))} />
                    <Bar dataKey={metric.id} name={metric.shortLabel} fill={metric.color} radius={[0, 10, 10, 0]}>
                      {technicianComparison.map((row) => (
                        <Cell
                          key={`${metric.id}-${row.tecnico}`}
                          fill={row[metric.id] >= metric.target ? metric.color : `${metric.color}B3`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartWrapper>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <ChartWrapper title="Matriz mensual de indicadores" subtitle="Lectura consolidada por mes, similar a una planilla ejecutiva" className="h-auto">
              <MonthlySummaryGrid rows={monthlySummary} />
            </ChartWrapper>

            <ChartWrapper title="Distribución horaria" subtitle="Horas productivas, no productivas, pauta y SIAC por técnico" className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourDistribution} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                  <defs>
                    <linearGradient id="pvtProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="pvtPauta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="tecnico"
                    angle={-18}
                    textAnchor="end"
                    height={70}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                  <Tooltip formatter={(value: number) => formatHours(Number(value || 0))} />
                  <Legend />
                  <Area type="monotone" dataKey="productivas" name="Hs productivas" stroke="#2563eb" fill="url(#pvtProd)" strokeWidth={2.2} />
                  <Area type="monotone" dataKey="pauta" name="Hs pauta" stroke="#7c3aed" fill="url(#pvtPauta)" strokeWidth={2.2} />
                  <Line type="monotone" dataKey="siac" name="Hs vendidas SIAC" stroke="#ea580c" strokeWidth={2.2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="noProductivas" name="Hs no productivas" stroke="#0f766e" strokeWidth={2.2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>

          <DataTable
            title="Detalle de ocupación"
            subtitle="Filas operativas del sheet, limpias para análisis y comparación"
            data={filteredData}
            pageSize={12}
            columns={[
              { header: 'Mes', accessor: 'mes' },
              { header: 'Técnico', accessor: 'tecnico' },
              { header: 'Hs disp.', accessor: 'horas_disponibles', render: (value) => formatHours(Number(value || 0)) },
              { header: 'Hs trabaj.', accessor: 'hs_trabajadas', render: (value) => formatHours(Number(value || 0)) },
              { header: 'Hs prod.', accessor: 'horas_productivas_tracking', render: (value) => formatHours(Number(value || 0)) },
              { header: 'Hs no prod.', accessor: 'horas_no_productivas_tracking', render: (value) => formatHours(Number(value || 0)) },
              { header: 'Pauta', accessor: 'horas_pauta_trabajadas', render: (value) => formatHours(Number(value || 0)) },
              { header: 'SIAC', accessor: 'horas_vendidas_siac', render: (value) => formatHours(Number(value || 0)) },
              { header: 'Ocup.', accessor: 'grado_ocupacion', render: (value) => formatPercent(Number(value || 0)) },
              { header: 'Ocup. prod.', accessor: 'grado_ocupacion_productiva', render: (value) => formatPercent(Number(value || 0)) },
              { header: 'Prod.', accessor: 'productividad', render: (value) => formatPercent(Number(value || 0)) },
              { header: 'Prod. SIAC', accessor: 'productividad_siac', render: (value) => formatPercent(Number(value || 0)) },
            ]}
          />
        </>
      )}
    </DashboardFrame>
  );
};

export default PostventaPvtOccupationDashboard;
