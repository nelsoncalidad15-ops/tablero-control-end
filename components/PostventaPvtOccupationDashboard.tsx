import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  { id: 'grado_ocupacion', label: 'Grado de ocupación', color: '#2563eb', target: 95 },
  { id: 'grado_ocupacion_productiva', label: 'Ocupación productiva', color: '#0f766e', target: 90 },
  { id: 'productividad', label: 'Productividad', color: '#7c3aed', target: 100 },
  { id: 'productividad_siac', label: 'Productividad SIAC', color: '#ea580c', target: 100 },
] as const;

const formatPercent = (value: number) => `${value.toFixed(2)}%`;
const formatHours = (value: number) => value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
      } catch (error) {
        setLoading({ isLoading: false, error: 'No se pudo cargar la ocupación PVT.' });
      }
    };

    loadData();
  }, [sheetUrl]);

  const availableMonths = useMemo(() => {
    const months = Array.from(new Set(data.map(item => item.mes)));
    return MONTHS.filter(month => months.includes(month));
  }, [data]);

  const availableTechnicians = useMemo(() => {
    return Array.from(new Set(data.map(item => item.tecnico))).sort((a, b) => a.localeCompare(b, 'es'));
  }, [data]);

  useEffect(() => {
    if (availableMonths.length > 0 && selectedMonths.length === 0) {
      setSelectedMonths([availableMonths[availableMonths.length - 1]]);
    }
  }, [availableMonths, selectedMonths.length]);

  const filteredData = useMemo(() => {
    return data.filter(row => {
      const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(row.mes);
      const technicianMatch = selectedTechnicians.length === 0 || selectedTechnicians.includes(row.tecnico);
      return monthMatch && technicianMatch;
    });
  }, [data, selectedMonths, selectedTechnicians]);

  const totals = useMemo(() => aggregateMetrics(filteredData), [filteredData]);

  const technicianComparison = useMemo(() => {
    const grouped = new Map<string, PvtOccupationRecord[]>();

    filteredData.forEach(row => {
      const key = row.tecnico;
      grouped.set(key, [...(grouped.get(key) || []), row]);
    });

    return Array.from(grouped.entries())
      .map(([tecnico, rows]) => ({ tecnico, ...aggregateMetrics(rows) }))
      .sort((a, b) => b.grado_ocupacion - a.grado_ocupacion);
  }, [filteredData]);

  const trendData = useMemo(() => {
    const source = selectedTechnicians.length === 0
      ? data
      : data.filter(row => selectedTechnicians.includes(row.tecnico));

    return availableMonths.map(month => {
      const monthRows = source.filter(row => row.mes === month);
      return {
        mes: month,
        selected: selectedMonths.includes(month),
        ...aggregateMetrics(monthRows),
      };
    });
  }, [availableMonths, data, selectedMonths, selectedTechnicians]);

  const hourDistribution = useMemo(() => {
    return technicianComparison.map(row => ({
      tecnico: row.tecnico,
      Productivas: Number(row.horas_productivas_tracking.toFixed(2)),
      'No productivas': Number(row.horas_no_productivas_tracking.toFixed(2)),
      Pauta: Number(row.horas_pauta_trabajadas.toFixed(2)),
      SIAC: Number(row.horas_vendidas_siac.toFixed(2)),
    }));
  }, [technicianComparison]);

  const toggleMonth = (month: string) => {
    if (month === 'TODOS') {
      setSelectedMonths([]);
      return;
    }
    setSelectedMonths(prev => (prev.includes(month) ? prev.filter(item => item !== month) : [...prev, month]));
  };

  const toggleTechnician = (tecnico: string) => {
    if (tecnico === 'TODOS') {
      setSelectedTechnicians([]);
      return;
    }
    setSelectedTechnicians(prev => (prev.includes(tecnico) ? prev.filter(item => item !== tecnico) : [...prev, tecnico]));
  };

  const selectedMonthLabel = selectedMonths.length === 0 ? 'Todos los meses' : `${selectedMonths.length} mes(es)`;
  const selectedTechLabel = selectedTechnicians.length === 0 ? 'Todos los técnicos' : `${selectedTechnicians.length} técnico(s)`;

  return (
    <DashboardFrame
      title="Ocupacion PVT"
      subtitle="Comparativa por mes y técnico"
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
        className="bg-white/70 rounded-[2rem] border border-white/60 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-xl"
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
              <Icons.Calendar className="w-3 h-3" /> Mes
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleMonth('TODOS')}
                className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${selectedMonths.length === 0 ? 'border-blue-600 bg-blue-600 text-white' : 'border-white/60 bg-white/40 text-slate-500 hover:border-slate-200'}`}
              >
                Todos
              </button>
              {availableMonths.map(month => (
                <button
                  key={month}
                  onClick={() => toggleMonth(month)}
                  className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${selectedMonths.includes(month) ? 'border-blue-600 bg-blue-600 text-white' : 'border-white/60 bg-white/40 text-slate-500 hover:border-slate-200'}`}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 border-t border-white/40 pt-5">
            <span className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">
              <Icons.Users className="w-3 h-3" /> Técnico
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleTechnician('TODOS')}
                className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${selectedTechnicians.length === 0 ? 'border-slate-950 bg-slate-950 text-white' : 'border-white/60 bg-white/40 text-slate-500 hover:border-slate-200'}`}
              >
                Todos
              </button>
              {availableTechnicians.map(tecnico => (
                <button
                  key={tecnico}
                  onClick={() => toggleTechnician(tecnico)}
                  className={`rounded-xl border px-4 py-2 text-[10px] font-black tracking-tight transition-all ${selectedTechnicians.includes(tecnico) ? 'border-slate-950 bg-slate-950 text-white' : 'border-white/60 bg-white/40 text-slate-500 hover:border-slate-200'}`}
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
            {METRIC_DEFS.map(metric => (
              <LuxuryKPICard
                key={metric.id}
                title={metric.label}
                value={Number((totals as any)[metric.id] || 0)}
                color={metric.color}
                icon={Icons.Activity}
                featured
                footerLabel="Consolidado"
                footerValue={formatPercent((totals as any)[metric.id] || 0)}
                footerDetail={`Objetivo ${metric.target}%`}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartWrapper title="Evolución mensual" subtitle="Promedios ponderados de los 4 indicadores" className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                  <YAxis tickFormatter={(value) => `${value}%`} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                  <Tooltip formatter={(value: number) => formatPercent(Number(value || 0))} />
                  <Legend />
                  {METRIC_DEFS.map(metric => (
                    <Line
                      key={metric.id}
                      type="monotone"
                      dataKey={metric.id}
                      name={metric.label}
                      stroke={metric.color}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartWrapper>

            <ChartWrapper title="Comparativa por técnico" subtitle="Resultado consolidado según filtros activos" className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={technicianComparison} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="tecnico"
                    angle={-18}
                    textAnchor="end"
                    height={70}
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis tickFormatter={(value) => `${value}%`} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} />
                  <Tooltip formatter={(value: number) => formatPercent(Number(value || 0))} />
                  <Legend />
                  {METRIC_DEFS.map(metric => (
                    <Bar key={metric.id} dataKey={metric.id} name={metric.label} fill={metric.color} radius={[8, 8, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartWrapper title="Distribución de horas" subtitle="Productivas, no productivas, pauta y SIAC por técnico" className="h-[420px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourDistribution} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
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
                  <Bar dataKey="Productivas" stackId="a" fill="#2563eb" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="No productivas" stackId="a" fill="#f97316" />
                  <Bar dataKey="Pauta" stackId="b" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="SIAC" stackId="b" fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartWrapper>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {METRIC_DEFS.map(metric => {
                const value = (totals as any)[metric.id] || 0;
                return (
                  <div key={metric.id} className="rounded-[2rem] border border-white/60 bg-white/70 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-xl">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">Indicador</p>
                        <h3 className="mt-2 text-base font-black text-slate-950">{metric.label}</h3>
                      </div>
                      <StatusBadge status={getStatus(value, metric.target)} label={value >= metric.target ? 'En objetivo' : 'Revisar'} />
                    </div>
                    <p className="text-4xl font-black italic tracking-tighter text-slate-950">{formatPercent(value)}</p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Meta sugerida {metric.target}%</p>
                  </div>
                );
              })}
            </div>
          </div>

          <DataTable
            title="Detalle de ocupación"
            subtitle="Filas operativas del sheet ya limpias para comparar"
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
