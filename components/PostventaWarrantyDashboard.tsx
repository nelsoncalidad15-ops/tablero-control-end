import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Legend,
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

const money = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);

const compactMoney = (value: number) => {
  const abs = Math.abs(value || 0);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value || 0)}`;
};

const colors = {
  work: '#3b82f6',
  material: '#f59e0b',
  total: '#22c55e',
};

const statTone = {
  blue: 'from-blue-500/20 to-blue-500/5 border-blue-400/30 text-blue-200',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-400/30 text-amber-200',
  emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-400/30 text-emerald-200',
  slate: 'from-slate-500/20 to-slate-500/5 border-slate-400/30 text-slate-200',
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
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{label}</p>
      {payload.map((item: any) => (
        <p key={item.dataKey} className="mt-2 text-sm font-black" style={{ color: item.color }}>
          {item.name}: {money(Number(item.value || 0))}
        </p>
      ))}
    </div>
  );
};

const WarrantyDashboard: React.FC<PostventaWarrantyDashboardProps> = ({ sheetUrls, onBack }) => {
  const [rows, setRows] = useState<WarrantyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('Todos');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');
  const [lotFilter, setLotFilter] = useState<string>('Todos');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const urls = [sheetUrls.q1, sheetUrls.q2, sheetUrls.q3, sheetUrls.q4].filter((url): url is string => Boolean(url));
        const data = await Promise.all(
          urls.map(async (url, idx) => {
            const quarter = `Q${idx + 1}`;
            const items = await fetchWarrantyData(url);
            return items.map(item => ({ ...item, trimestre: quarter }));
          })
        );
        if (!alive) return;
        setRows(data.flat());
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los datos de garantía.');
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [sheetUrls.q1, sheetUrls.q2, sheetUrls.q3, sheetUrls.q4]);

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

  const lotChartData = useMemo(() => {
    const groups: Record<string, { lote: string; work: number; material: number; total: number; claims: number }> = {};
    filteredRows.forEach(row => {
      const key = row.lote || 'Sin lote';
      if (!groups[key]) groups[key] = { lote: key, work: 0, material: 0, total: 0, claims: 0 };
      groups[key].work += (row.work || 0) + (row.e_work || 0);
      groups[key].material += (row.material || 0) + (row.e_material || 0);
      groups[key].total += row.total || 0;
      groups[key].claims += 1;
    });
    return Object.values(groups).sort((a, b) => {
      const orderA = LOTS.indexOf(a.lote as any);
      const orderB = LOTS.indexOf(b.lote as any);
      if (orderA !== -1 || orderB !== -1) return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
      return a.lote.localeCompare(b.lote, 'es');
    });
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

  const topClaims = useMemo(() => {
    return [...filteredRows]
      .sort((a, b) => (b.total || 0) - (a.total || 0))
      .slice(0, 8);
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
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.10),_transparent_24%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)] px-4 py-4 text-white md:px-6 md:py-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '76px 76px' }} />
        <div className="absolute -left-24 top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-0 top-32 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1600px] flex-col gap-5">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-2xl md:px-5"
        >
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 transition-colors hover:bg-white/10 hover:text-white">
              <Icons.ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.38em] text-slate-400">Postventa</p>
              <h1 className="text-xl font-black italic tracking-tight text-white md:text-2xl">Garantía</h1>
            </div>
          </div>
          <div className="hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 md:flex">
            <Icons.ShieldCheck className="h-4 w-4 text-sky-300" />
            Lote vs PPT
          </div>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-4 shadow-[0_30px_90px_rgba(2,6,23,0.35)] backdrop-blur-2xl md:p-5"
        >
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.55em] text-sky-300/80">Lote vs PPT</p>
              <h2 className="mt-3 text-[2.2rem] font-black uppercase italic leading-[0.92] tracking-tighter text-white md:text-[3.4rem] lg:text-[4rem]">
                <span className="block">Garantía</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-blue-400 to-indigo-400">Operativa</span>
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300/85 md:text-[15px]">
                Seguimiento por mes, tipo, claim y lote para entender cuánto se factura realmente por garantía y dónde se concentra el volumen.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              <div className={`rounded-2xl border bg-gradient-to-br ${statTone.blue} p-4`}>
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Casos</p>
                <p className="mt-2 text-3xl font-black italic text-white">{summary.totalClaims}</p>
              </div>
              <div className={`rounded-2xl border bg-gradient-to-br ${statTone.amber} p-4`}>
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Work + e.Work</p>
                <p className="mt-2 text-3xl font-black italic text-white">{compactMoney(summary.totalWork)}</p>
              </div>
              <div className={`rounded-2xl border bg-gradient-to-br ${statTone.emerald} p-4`}>
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Material + e.Material</p>
                <p className="mt-2 text-3xl font-black italic text-white">{compactMoney(summary.totalMaterial)}</p>
              </div>
              <div className={`rounded-2xl border bg-gradient-to-br ${statTone.slate} p-4`}>
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Total</p>
                <p className="mt-2 text-3xl font-black italic text-white">{compactMoney(summary.totalBilled)}</p>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)] backdrop-blur-2xl md:p-5"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Mes</label>
                <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-black text-white outline-none">
                  <option value="Todos">Todos los meses</option>
                  {monthOptions.map(month => <option key={month} value={month}>{month}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Tipo</label>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-black text-white outline-none">
                  <option value="Todos">Todos los tipos</option>
                  {typeOptions.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Buscar Claim</label>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3">
                  <Icons.Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Claim, VIN, cargo o justificación"
                    className="w-full bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.28em] text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
                <Icons.Download className="h-4 w-4" />
                Descargar
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setLotFilter('Todos')}
              className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] transition-all ${lotFilter === 'Todos' ? 'border-sky-400 bg-sky-400/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
            >
              Todos
            </button>
            {LOTS.map(lot => (
              <button
                key={lot}
                onClick={() => setLotFilter(lot)}
                className={`rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] transition-all ${lotFilter === lot ? 'border-sky-400 bg-sky-400/20 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}
              >
                Lote {lot}
              </button>
            ))}
          </div>
        </motion.section>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-[380px] rounded-[2rem] border border-white/10 bg-white/5 animate-pulse" />
            <div className="h-[380px] rounded-[2rem] border border-white/10 bg-white/5 animate-pulse" />
          </div>
        ) : error ? (
          <div className="rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-6 text-rose-100">
            <p className="text-lg font-black">No se pudieron cargar los datos</p>
            <p className="mt-2 text-sm opacity-90">{error}</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)] backdrop-blur-2xl md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Lote vs PPT</p>
                    <h3 className="mt-1 text-xl font-black text-white">Facturación por lote</h3>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">
                    Total: {money(summary.totalBilled)}
                  </div>
                </div>
                <div className="mt-4 h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lotChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false} />
                      <XAxis dataKey="lote" tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(v) => compactMoney(Number(v))} />
                      <Tooltip content={<WarrantyTooltip />} />
                      <Legend wrapperStyle={{ color: '#cbd5e1', fontWeight: 800, fontSize: 11 }} />
                      <Bar dataKey="work" name="Work + e.Work" stackId="a" fill={colors.work} radius={[10, 10, 0, 0]} />
                      <Bar dataKey="material" name="Material + e.Material" stackId="a" fill={colors.material} radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)] backdrop-blur-2xl md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Tipo y volumen</p>
                    <h3 className="mt-1 text-xl font-black text-white">Concentración por tipo</h3>
                  </div>
                </div>
                <div className="mt-4 max-h-[320px] overflow-auto pr-1">
                  <table className="w-full border-separate border-spacing-y-2">
                    <thead className="sticky top-0 bg-[#0f172a]">
                      <tr className="text-left text-[9px] font-black uppercase tracking-[0.32em] text-slate-400">
                        <th className="pb-2">Tipo</th>
                        <th className="pb-2 text-right">Cantidad</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {typeSummary.length ? typeSummary.map(item => (
                        <tr key={item.tipo} className="rounded-2xl bg-white/5">
                          <td className="rounded-l-2xl px-3 py-3 text-sm font-black text-white">{item.tipo}</td>
                          <td className="px-3 py-3 text-right text-sm font-black text-slate-200">{item.count}</td>
                          <td className="rounded-r-2xl px-3 py-3 text-right text-sm font-black text-sky-300">{money(item.total)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="rounded-2xl px-3 py-6 text-center text-sm text-slate-400">No hay datos para este filtro.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)] backdrop-blur-2xl md:p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Vista rápida</p>
                <h3 className="mt-1 text-xl font-black text-white">Top claims</h3>
                <div className="mt-4 space-y-3">
                  {topClaims.length ? topClaims.map((row, idx) => (
                    <div key={`${row.claim}-${idx}`} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Claim</p>
                          <p className="mt-1 text-sm font-black text-white">{row.claim}</p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Lote {row.lote} · {row.tipo}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Total</p>
                          <p className="mt-1 text-lg font-black text-emerald-300">{money(row.total || 0)}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-6 text-sm text-slate-400">No hay registros para este filtro.</div>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-[0_28px_80px_rgba(2,6,23,0.28)] backdrop-blur-2xl md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Detalle</p>
                    <h3 className="mt-1 text-xl font-black text-white">Registros filtrados</h3>
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{filteredRows.length} filas</p>
                </div>
                <div className="mt-4 max-h-[420px] overflow-auto pr-1">
                  <table className="w-full border-separate border-spacing-y-2">
                    <thead className="sticky top-0 bg-[#0f172a]">
                      <tr className="text-left text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                        <th className="pb-2">Claim</th>
                        <th className="pb-2">Tipo</th>
                        <th className="pb-2">Lote</th>
                        <th className="pb-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.slice(0, 60).map((row, idx) => (
                        <tr key={`${row.id}-${idx}`} className="rounded-2xl bg-white/5">
                          <td className="rounded-l-2xl px-3 py-3 text-sm font-black text-white">{row.claim}</td>
                          <td className="px-3 py-3 text-xs font-bold uppercase tracking-[0.22em] text-slate-300">{row.tipo}</td>
                          <td className="px-3 py-3 text-sm font-black text-sky-300">{row.lote}</td>
                          <td className="rounded-r-2xl px-3 py-3 text-right text-sm font-black text-emerald-300">{money(row.total || 0)}</td>
                        </tr>
                      ))}
                      {!filteredRows.length && (
                        <tr>
                          <td colSpan={4} className="rounded-2xl px-3 py-6 text-center text-sm text-slate-400">No hay datos para este filtro.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WarrantyDashboard;
