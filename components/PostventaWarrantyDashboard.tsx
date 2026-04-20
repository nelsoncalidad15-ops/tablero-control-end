import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Icons } from './Icon';
import { fetchWarrantyData } from '../services/dataService';
import { MONTHS } from '../constants';
import { WarrantyRecord } from '../types';

interface PostventaWarrantyDashboardProps {
  sheetUrls: {
    q1: string;
    q2?: string;
    q3?: string;
    q4?: string;
  };
  onBack: () => void;
}

const LOTS = ['7', '14', '21', '28'] as const;
const MONTH_ORDER = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const COLORS = {
  work: '#2563eb',
  material: '#f59e0b',
  total: '#14b8a6',
};

const money = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);

const compactMoney = (value: number) => {
  const abs = Math.abs(value || 0);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value || 0)}`;
};

const resolveMonthOptions = (rows: WarrantyRecord[]) => {
  const unique = Array.from(new Set(rows.map(r => r.mes).filter(Boolean)));
  const ordered = MONTHS.filter(m => unique.includes(m));
  const extras = unique.filter(m => !ordered.includes(m));
  return [...ordered, ...extras];
};

const WarrantyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
      {payload.map((item: any) => (
        <p key={item.dataKey} className="mt-2 text-sm font-black" style={{ color: item.color }}>
          {item.name}: {money(Number(item.value || 0))}
        </p>
      ))}
    </div>
  );
};

const WarrantyLoadingView = () => (
  <div className="space-y-4">
    <div className="rounded-[1.5rem] border border-slate-200 bg-white/85 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <div className="h-3 w-40 rounded-full bg-slate-100" />
      <div className="mt-3 h-7 w-56 rounded-full bg-slate-100" />
      <div className="mt-3 h-3 w-80 rounded-full bg-slate-100" />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="h-[320px] rounded-[2rem] border border-slate-200 bg-white/90 animate-pulse shadow-[0_18px_60px_rgba(15,23,42,0.06)]" />
      <div className="h-[320px] rounded-[2rem] border border-slate-200 bg-white/90 animate-pulse shadow-[0_18px_60px_rgba(15,23,42,0.06)]" />
    </div>
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="h-[420px] rounded-[2rem] border border-slate-200 bg-white/90 animate-pulse shadow-[0_18px_60px_rgba(15,23,42,0.06)]" />
      <div className="h-[420px] rounded-[2rem] border border-slate-200 bg-white/90 animate-pulse shadow-[0_18px_60px_rgba(15,23,42,0.06)]" />
    </div>
  </div>
);


const WarrantyDashboard: React.FC<PostventaWarrantyDashboardProps> = ({ sheetUrls, onBack }) => {
  const [rows, setRows] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('Todos');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');
  const [lotFilter, setLotFilter] = useState<string>('Todos');
  const [search, setSearch] = useState('');
  const cacheKey = useMemo(
    () => ['warranty-dashboard', sheetUrls.q1, sheetUrls.q2 || '', sheetUrls.q3 || '', sheetUrls.q4 || ''].join('|'),
    [sheetUrls.q1, sheetUrls.q2, sheetUrls.q3, sheetUrls.q4]
  );

  useEffect(() => {
    let alive = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const cached = typeof window !== 'undefined' ? window.sessionStorage.getItem(cacheKey) : null;
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed?.rows) && parsed.rows.length) {
            setRows(parsed.rows);
          }
        }

        const urls = [sheetUrls.q1, sheetUrls.q2, sheetUrls.q3, sheetUrls.q4].filter((url): url is string => Boolean(url));
        const data = await Promise.all(
          urls.map(async (url, idx) => {
            const quarter = `Q${idx + 1}`;
            const items = await fetchWarrantyData(url);
            return items.map(item => ({ ...item, trimestre: quarter }));
          })
        );

        if (!alive) return;
        const flatRows = data.flat();
        setRows(flatRows);
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(cacheKey, JSON.stringify({ rows: flatRows, savedAt: Date.now() }));
        }
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos de garantia.');
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [sheetUrls.q1, sheetUrls.q2, sheetUrls.q3, sheetUrls.q4, cacheKey]);

  const monthOptions = useMemo(() => resolveMonthOptions(rows), [rows]);
  const typeOptions = useMemo(() => {
    const unique = Array.from(new Set(rows.map(r => r.tipo || 'Sin Tipo').filter(Boolean)));
    return unique.sort((a, b) => a.localeCompare(b, 'es'));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(row => {
      const matchMonth = monthFilter === 'Todos' || row.mes === monthFilter;
      const matchType = typeFilter === 'Todos' || (row.tipo || 'Sin Tipo') === typeFilter;
      const matchLot = lotFilter === 'Todos' || row.lote === lotFilter;
      const matchSearch =
        !q ||
        [row.claim, row.vin, row.numero, row.justificacion, row.cargo, row.control]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(q));
      return matchMonth && matchType && matchLot && matchSearch;
    });
  }, [rows, monthFilter, typeFilter, lotFilter, search]);

  const summary = useMemo(() => {
    const totalWork = filteredRows.reduce((sum, row) => sum + (row.work || 0) + (row.e_work || 0), 0);
    const totalMaterial = filteredRows.reduce((sum, row) => sum + (row.material || 0) + (row.e_material || 0), 0);
    const totalBilled = filteredRows.reduce((sum, row) => sum + (row.total || 0), 0);
    const totalClaims = filteredRows.length;
    const average = totalClaims > 0 ? totalBilled / totalClaims : 0;

    return { totalWork, totalMaterial, totalBilled, totalClaims, average };
  }, [filteredRows]);

  const typeSummary = useMemo(() => {
    const groups: Record<string, { tipo: string; count: number; total: number }> = {};
    filteredRows.forEach(row => {
      const key = row.tipo || 'Sin Tipo';
      if (!groups[key]) groups[key] = { tipo: key, count: 0, total: 0 };
      groups[key].count += 1;
      groups[key].total += row.total || 0;
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [filteredRows]);

  const monthLotSeriesData = useMemo(() => {
    const months = [...new Set(filteredRows.map(row => row.mes || 'Sin mes'))];
    months.sort((a, b) => {
      const orderA = MONTH_ORDER.indexOf(String(a).toLowerCase());
      const orderB = MONTH_ORDER.indexOf(String(b).toLowerCase());
      if (orderA !== -1 || orderB !== -1) return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
      return String(a).localeCompare(String(b), 'es');
    });

    const chartByLot: Record<string, Array<{ mes: string; work: number; material: number; total: number }>> = {};
    LOTS.forEach(lot => {
      chartByLot[lot] = months.map(mes => ({ mes, work: 0, material: 0, total: 0 }));
    });

    filteredRows.forEach(row => {
      const month = row.mes || 'Sin mes';
      const lot = row.lote || 'Sin lote';
      if (!LOTS.includes(lot as any)) return;
      const series = chartByLot[lot];
      const target = series.find(item => item.mes === month);
      if (!target) return;
      target.work += (row.work || 0) + (row.e_work || 0);
      target.material += (row.material || 0) + (row.e_material || 0);
      target.total += row.total || 0;
    });

    return chartByLot;
  }, [filteredRows]);

  const exportCsv = () => {
    const headers = ['MES', 'No.', 'Claim', 'Tipo', 'VIN', 'Work', 'e.Work', 'Material', 'e.Material', 'Total', 'Lote', 'FECHA', 'CARGO', 'CONTROL', 'COINCIDENCIA', 'CARGO IPSOS', 'JUSTIFICACION'];
    const lines = filteredRows.map(row => [
      row.mes,
      row.numero,
      row.claim,
      row.tipo,
      row.vin,
      row.work,
      row.e_work,
      row.material,
      row.e_material,
      row.total,
      row.lote,
      row.fecha,
      row.cargo,
      row.control,
      row.coincidencia,
      row.cargo_ipsos,
      row.justificacion,
    ].map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','));

    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `garantia_lote_vs_ppt_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.10),_transparent_26%),linear-gradient(180deg,_#f8fbff_0%,_#eef3ff_100%)] px-4 py-4 text-slate-900 md:px-6 md:py-6">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(37,99,235,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.08) 1px, transparent 1px)',
            backgroundSize: '88px 88px',
          }}
        />
        <div className="absolute -left-28 top-24 h-80 w-80 rounded-full bg-sky-400/12 blur-3xl" />
        <div className="absolute right-0 top-32 h-96 w-96 rounded-full bg-indigo-400/12 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1600px] flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-[1.5rem] border border-slate-200 bg-white/80 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl md:px-5"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 transition-colors hover:border-sky-200 hover:text-sky-700"
            >
              <Icons.ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.38em] text-slate-400">Postventa</p>
              <h1 className="text-xl font-black italic tracking-tight text-slate-950 md:text-2xl">Garantia</h1>
            </div>
          </div>
          <div className="hidden items-center gap-3 rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-sky-700 md:flex">
            <Icons.ShieldCheck className="h-4 w-4 text-sky-500" />
            Lote vs PPT
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-5"
        >
          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr_0.75fr_auto]">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Mes</label>
              <select
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950 outline-none transition-colors focus:border-sky-300"
              >
                <option value="Todos">Todos los meses</option>
                {monthOptions.map(month => <option key={month} value={month}>{month}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Tipo</label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-950 outline-none transition-colors focus:border-sky-300"
              >
                <option value="Todos">Todos los tipos</option>
                {typeOptions.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Buscar Claim</label>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Icons.Search className="h-4 w-4 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Claim, VIN, cargo o justificacion"
                  className="w-full bg-transparent text-sm font-medium text-slate-950 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={exportCsv}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[0.28em] text-white transition-colors hover:bg-slate-800"
              >
                <Icons.Download className="h-4 w-4" />
                Descargar
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setLotFilter('Todos')}
              className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] transition-all ${
                lotFilter === 'Todos'
                  ? 'border-sky-300 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
            {LOTS.map(lot => (
              <button
                key={lot}
                onClick={() => setLotFilter(lot)}
                className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] transition-all ${
                  lotFilter === lot
                    ? 'border-sky-300 bg-sky-50 text-sky-700'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Lote {lot}
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-6"
        >
          <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.5em] text-sky-500/80">Lote vs PPT</p>
                <h2 className="mt-3 text-[2.2rem] font-black uppercase italic leading-[0.92] tracking-tighter text-slate-950 md:text-[3.1rem] lg:text-[3.7rem]">
                  <span className="block">Garantia</span>
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500">Operativa</span>
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 md:text-[15px]">
                  Seguimiento por mes, tipo, claim y lote para entender cuanto se factura realmente por garantia y donde se concentra el volumen.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Casos', value: compactMoney(summary.totalClaims), tone: 'bg-sky-50 text-sky-700 border-sky-100' },
                  { label: 'Work + e.Work', value: money(summary.totalWork), tone: 'bg-indigo-50 text-indigo-700 border-indigo-100' },
                  { label: 'Material + e.Material', value: money(summary.totalMaterial), tone: 'bg-amber-50 text-amber-700 border-amber-100' },
                  { label: 'Total', value: money(summary.totalBilled), tone: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
                ].map(item => (
                  <div key={item.label} className={`min-w-0 rounded-[1.3rem] border p-4 ${item.tone}`}>
                    <p className="text-[9px] font-black uppercase tracking-[0.35em] opacity-70">{item.label}</p>
                    <p className="mt-2 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(1.05rem,1.55vw,1.75rem)] font-black italic leading-none tracking-tight">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-slate-200 bg-slate-50/80 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Indicadores</p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">Resumen operativo</h3>
                </div>
                <div className="rounded-full border border-sky-100 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700">
                  Promedio {money(summary.average)}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-white bg-white p-4 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Lotes activos</p>
                  <p className="mt-2 text-[clamp(1.2rem,2vw,1.9rem)] font-black italic text-slate-950 leading-none">{Object.keys(monthLotSeriesData).length}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white bg-white p-4 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Tipos</p>
                  <p className="mt-2 text-[clamp(1.2rem,2vw,1.9rem)] font-black italic text-slate-950 leading-none">{typeSummary.length}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white bg-white p-4 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Claims top</p>
                  <p className="mt-2 text-[clamp(1.2rem,2vw,1.9rem)] font-black italic text-slate-950 leading-none">{Math.min(filteredRows.length, 60)}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white bg-white p-4 shadow-sm">
                  <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Meses</p>
                  <p className="mt-2 text-[clamp(1.2rem,2vw,1.9rem)] font-black italic text-slate-950 leading-none">{monthOptions.length}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {loading ? (
          <WarrantyLoadingView />
        ) : error ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-700">
            <p className="text-lg font-black">No se pudieron cargar los datos</p>
            <p className="mt-2 text-sm opacity-90">{error}</p>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <Icons.Search className="mx-auto mb-4 h-12 w-12 text-slate-200" />
            <h3 className="text-xl font-black text-slate-950">No se encontraron datos</h3>
            <p className="mt-2 text-sm text-slate-500">Proba ajustar mes, tipo, lote o la busqueda por claim.</p>
          </div>
        ) : (
          <>
        <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Lote vs PPT</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Facturación por mes y lote</h3>
              </div>
              <div className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700">
                Total {money(summary.totalBilled)}
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {LOTS.map(lot => {
                const chartData = monthLotSeriesData[lot] || [];
                const lotTotal = chartData.reduce((sum, item) => sum + (item.total || 0), 0);
                return (
                  <div key={lot} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Lote {lot}</p>
                        <h4 className="mt-1 text-base font-black text-slate-950">Work vs Material</h4>
                      </div>
                      <div className="rounded-full border border-white bg-white px-3 py-1 text-[9px] font-black uppercase tracking-[0.28em] text-slate-500 shadow-sm">
                        {money(lotTotal)}
                      </div>
                    </div>
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 18, right: 6, left: 0, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(v) => compactMoney(Number(v))} />
                          <Tooltip content={<WarrantyTooltip />} />
                          <Bar dataKey="work" name="Work" stackId="a" fill={COLORS.work} radius={[10, 10, 0, 0]}>
                            <LabelList
                              content={(props: any) => {
                                const { x, y, width, payload } = props;
                                if (!payload || !payload.total) return null;
                                return (
                                  <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="900">
                                    {compactMoney(Number(payload.total || 0))}
                                  </text>
                                );
                              }}
                            />
                          </Bar>
                          <Bar dataKey="material" name="Material" stackId="a" fill={COLORS.material} radius={[10, 10, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Tipo y volumen</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">Distribución por tipo</h3>
              </div>
            </div>
            <div className="mt-4 h-[520px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeSummary.slice(0, 8).map(item => ({ ...item, formatted: compactMoney(item.total) }))} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(v) => compactMoney(Number(v))} />
                  <YAxis type="category" dataKey="tipo" tick={{ fill: '#0f172a', fontSize: 10, fontWeight: 800 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={<WarrantyTooltip />} />
                  <Bar dataKey="total" name="Volumen" fill={COLORS.total} radius={[0, 12, 12, 0]}>
                    <LabelList dataKey="formatted" position="right" fill="#0f172a" fontSize={10} fontWeight={900} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Detalle</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">Registros filtrados</h3>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{filteredRows.length} filas</p>
          </div>
          <div className="mt-4 max-h-[520px] overflow-auto pr-1">
            <table className="w-full border-separate border-spacing-y-2">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                  <th className="pb-2">Claim</th>
                  <th className="pb-2">Mes</th>
                  <th className="pb-2">Lote</th>
                  <th className="pb-2">Tipo</th>
                  <th className="pb-2 text-right">Work</th>
                  <th className="pb-2 text-right">Material</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2">Justificación</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 60).map((row, idx) => (
                  <tr key={`${row.id}-${idx}`} className="rounded-[1rem] bg-slate-50">
                    <td className="rounded-l-[1rem] px-3 py-3 text-sm font-black text-slate-950">{row.claim}</td>
                    <td className="px-3 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{row.mes}</td>
                    <td className="px-3 py-3 text-sm font-black text-sky-700">{row.lote}</td>
                    <td className="px-3 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{row.tipo}</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-indigo-700">{money((row.work || 0) + (row.e_work || 0))}</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-amber-700">{money((row.material || 0) + (row.e_material || 0))}</td>
                    <td className="px-3 py-3 text-right text-sm font-black text-emerald-700">{money(row.total || 0)}</td>
                    <td className="rounded-r-[1rem] px-3 py-3 text-xs font-medium text-slate-600">
                      <span className="block max-w-[280px] truncate">{row.justificacion || '—'}</span>
                    </td>
                  </tr>
                ))}
                {!filteredRows.length && (
                  <tr>
                    <td colSpan={8} className="rounded-[1rem] px-3 py-6 text-center text-sm text-slate-500">No hay datos para este filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </>
        )}
      </div>
    </div>
  );
};

export default WarrantyDashboard;
