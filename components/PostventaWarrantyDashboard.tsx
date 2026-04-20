import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import {
  Area,
  AreaChart,
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
  const monthlyChartRef = React.useRef<HTMLDivElement | null>(null);
  const typeChartRef = React.useRef<HTMLDivElement | null>(null);
  const detailTableRef = React.useRef<HTMLDivElement | null>(null);
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

  const chartRows = useMemo(() => {
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

  const detailRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(row => {
      const matchType = typeFilter === 'Todos' || (row.tipo || 'Sin Tipo') === typeFilter;
      const matchLot = lotFilter === 'Todos' || row.lote === lotFilter;
      const matchSearch =
        !q ||
        [row.claim, row.vin, row.numero, row.justificacion, row.cargo, row.control]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(q));
      return matchType && matchLot && matchSearch;
    });
  }, [rows, typeFilter, lotFilter, search]);

  const summary = useMemo(() => {
    const totalWork = chartRows.reduce((sum, row) => sum + (row.work || 0) + (row.e_work || 0), 0);
    const totalMaterial = chartRows.reduce((sum, row) => sum + (row.material || 0) + (row.e_material || 0), 0);
    const totalBilled = chartRows.reduce((sum, row) => sum + (row.total || 0), 0);
    const totalClaims = chartRows.length;
    const average = totalClaims > 0 ? totalBilled / totalClaims : 0;

    return { totalWork, totalMaterial, totalBilled, totalClaims, average };
  }, [chartRows]);

  const typeSummary = useMemo(() => {
    const groups: Record<string, { tipo: string; count: number; total: number }> = {};
    chartRows.forEach(row => {
      const key = row.tipo || 'Sin Tipo';
      if (!groups[key]) groups[key] = { tipo: key, count: 0, total: 0 };
      groups[key].count += 1;
      groups[key].total += row.total || 0;
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [chartRows]);

  const annualTrendData = useMemo(() => {
    const groups: Record<string, { mes: string; work: number; material: number; total: number }> = {};
    chartRows.forEach(row => {
      const key = row.mes || 'Sin mes';
      if (!groups[key]) groups[key] = { mes: key, work: 0, material: 0, total: 0 };
      groups[key].work += (row.work || 0) + (row.e_work || 0);
      groups[key].material += (row.material || 0) + (row.e_material || 0);
      groups[key].total += row.total || 0;
    });

    return Object.values(groups).sort((a, b) => {
      const orderA = MONTH_ORDER.indexOf(String(a.mes).toLowerCase());
      const orderB = MONTH_ORDER.indexOf(String(b.mes).toLowerCase());
      if (orderA !== -1 || orderB !== -1) return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
      return String(a.mes).localeCompare(String(b.mes), 'es');
    });
  }, [chartRows]);

  const lotSummaryData = useMemo(() => {
    return LOTS.map(lot => {
      const rowsForLot = chartRows.filter(row => row.lote === lot);
      const work = rowsForLot.reduce((sum, row) => sum + (row.work || 0) + (row.e_work || 0), 0);
      const material = rowsForLot.reduce((sum, row) => sum + (row.material || 0) + (row.e_material || 0), 0);
      const total = rowsForLot.reduce((sum, row) => sum + (row.total || 0), 0);
      return { lot, work, material, total };
    });
  }, [chartRows]);

  const monthlyLotMatrixData = useMemo(() => {
    const groups: Record<string, Record<string, number | string>> = {};

    chartRows.forEach(row => {
      const month = row.mes || 'Sin mes';
      if (!groups[month]) groups[month] = { mes: month };

      const lot = String(row.lote || 'Sin lote');
      const work = (row.work || 0) + (row.e_work || 0);
      const material = (row.material || 0) + (row.e_material || 0);
      const total = row.total || work + material;

      const workKey = `lot_${lot}_work`;
      const materialKey = `lot_${lot}_material`;
      const totalKey = `lot_${lot}_total`;

      groups[month][workKey] = Number(groups[month][workKey] || 0) + work;
      groups[month][materialKey] = Number(groups[month][materialKey] || 0) + material;
      groups[month][totalKey] = Number(groups[month][totalKey] || 0) + total;
    });

    return Object.values(groups).sort((a, b) => {
      const orderA = MONTH_ORDER.indexOf(String(a.mes).toLowerCase());
      const orderB = MONTH_ORDER.indexOf(String(b.mes).toLowerCase());
      if (orderA !== -1 || orderB !== -1) return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
      return String(a.mes).localeCompare(String(b.mes), 'es');
    });
  }, [chartRows]);

  const exportExcel = () => {
    const headers = ['MES', 'No.', 'Claim', 'Tipo', 'VIN', 'Work', 'e.Work', 'Material', 'e.Material', 'Total', 'Lote', 'FECHA', 'CARGO', 'CONTROL', 'COINCIDENCIA', 'CARGO IPSOS', 'JUSTIFICACION'];
    const lines = detailRows.map(row => [
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

    const blob = new Blob([[headers.join('\t'), ...lines].join('\n')], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `garantia_detalle_${Date.now()}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadImage = async (node: HTMLDivElement | null, filename: string) => {
    if (!node) return;
    const dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 2 });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
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
                onClick={exportExcel}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-[10px] font-black uppercase tracking-[0.28em] text-white transition-colors hover:bg-slate-800"
              >
                <Icons.Download className="h-4 w-4" />
                Excel
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
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Indicadores</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">Garantía operativa</h3>
            </div>
            <div className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700">
              Total {money(summary.totalBilled)}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {lotSummaryData.map(item => (
              <div key={item.lot} className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-400">Lote {item.lot}</p>
                <p className="mt-2 text-2xl font-black italic text-slate-950 leading-none">{money(item.total)}</p>
                <div className="mt-3 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500">
                  <span>W {money(item.work)}</span>
                  <span>M {money(item.material)}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {loading ? (
          <WarrantyLoadingView />
        ) : error ? (
          <div className="rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-rose-700">
            <p className="text-lg font-black">No se pudieron cargar los datos</p>
            <p className="mt-2 text-sm opacity-90">{error}</p>
          </div>
        ) : detailRows.length === 0 ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <Icons.Search className="mx-auto mb-4 h-12 w-12 text-slate-200" />
            <h3 className="text-xl font-black text-slate-950">No se encontraron datos</h3>
            <p className="mt-2 text-sm text-slate-500">Proba ajustar mes, tipo, lote o la busqueda por claim.</p>
          </div>
        ) : (
          <>
            <div ref={monthlyChartRef} className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Mes x lote</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">Facturación mensual por lote</h3>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-sky-700">
                    Total {money(summary.totalBilled)}
                  </div>
                  <button
                    onClick={() => downloadImage(monthlyChartRef.current, `garantia_mes_lote_${Date.now()}.png`)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em] text-slate-500 shadow-sm transition-colors hover:border-sky-200 hover:text-sky-700"
                  >
                    Imagen
                  </button>
                </div>
              </div>

              <div className="mt-4 h-[390px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyLotMatrixData.map(item => ({ ...item }))}
                    margin={{ top: 18, right: 12, left: 0, bottom: 8 }}
                    barCategoryGap="18%"
                    barGap={2}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} tickFormatter={(v) => compactMoney(Number(v))} />
                    <Tooltip content={<WarrantyTooltip />} />
                    {LOTS.map(lot => (
                      <React.Fragment key={lot}>
                        <Bar dataKey={`lot_${lot}_work`} name={`Lote ${lot} Work`} stackId={`lot_${lot}`} fill={COLORS.work} radius={[8, 8, 0, 0]}>
                          <LabelList
                            content={(props: any) => {
                              const { x, y, width, payload } = props;
                              if (!payload) return null;
                              const total = payload[`lot_${lot}_total`];
                              if (!total) return null;
                              return (
                                <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="900">
                                  {compactMoney(Number(total))}
                                </text>
                              );
                            }}
                          />
                        </Bar>
                        <Bar dataKey={`lot_${lot}_material`} name={`Lote ${lot} Material`} stackId={`lot_${lot}`} fill={COLORS.material} radius={[8, 8, 0, 0]} />
                      </React.Fragment>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
                <span className="rounded-full bg-slate-50 px-3 py-1 shadow-sm">Work</span>
                <span className="rounded-full bg-slate-50 px-3 py-1 shadow-sm">Material</span>
                {LOTS.map(lot => (
                  <span key={lot} className="rounded-full bg-white px-3 py-1 shadow-sm">Lote {lot}</span>
                ))}
              </div>
            </div>

            <div ref={typeChartRef} className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Tipo y volumen</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">Top tipos</h3>
                </div>
                <button
                  onClick={() => downloadImage(typeChartRef.current, `garantia_tipos_${Date.now()}.png`)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em] text-slate-500 shadow-sm transition-colors hover:border-sky-200 hover:text-sky-700"
                >
                  Imagen
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {typeSummary.slice(0, 6).map(item => (
                  <div key={item.tipo} className="rounded-[1.1rem] border border-slate-100 bg-slate-50/80 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-700">{item.tipo}</p>
                      <p className="text-sm font-black text-slate-950">{money(item.total)}</p>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${Math.max(6, Math.min(100, (item.total / (typeSummary[0]?.total || 1)) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div ref={detailTableRef} className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] md:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.45em] text-slate-400">Detalle</p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">Registros filtrados</h3>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{detailRows.length} filas</p>
                  <button
                    onClick={exportExcel}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em] text-slate-500 shadow-sm transition-colors hover:border-sky-200 hover:text-sky-700"
                  >
                    Excel
                  </button>
                </div>
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
                    {detailRows.slice(0, 60).map((row, idx) => (
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
                    {!detailRows.length && (
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



