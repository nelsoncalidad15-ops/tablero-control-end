import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Icons } from './Icon';
import { DashboardFrame } from './DashboardUI';
import { buildApiUrl } from '../services/apiConfig';

type Filters = { year: number | null; month: number | null; branch: string; managementState: string; type: string };
type SummaryPayload = {
  privacyMode: 'aggregate-only';
  options: { years: number[]; months: Array<{ number: number; name: string }>; monthsByYear: Record<number, number[]>; branches: string[]; managementStates: string[]; types: string[] };
  filters: Filters;
  summary: { records: number; uniqueOrders: number; complete: number; pendingToComplete: number; observed: number; correctComplete: number; resolved: number; advisorCount: number; completionRate: number; states: { pendiente: number; incompleta: number; completa: number } };
  trends: Array<{ month: number; name: string; records: number; uniqueOrders: number; complete: number }>;
  managementByBranch: Array<{ name: string; records: number; completionRate: number; states: { pendiente: number; incompleta: number; completa: number } }>;
  sectors: Array<{ name: string; value: number }>;
  reasons: Array<{ name: string; value: number }>;
  matrix: Array<{ branch: string; months: Array<{ month: number; records: number; uniqueOrders: number; pendingToComplete: number; completionRate: number }> }>;
  aggregateTable: Array<{ year: number; month: number; branch: string; sector: string; type: string; state: string; count: number }>;
  dataQuality: { sourceRows: number; blankRows: number; invalidIdentityRows: number; invalidDateRows: number; rowsExcludedFromTimeAnalysis: number };
  availableData: { defaultYear: number | null; defaultMonth: number | null };
};

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const EMPTY_FILTERS: Filters = { year: null, month: null, branch: 'all', managementState: 'all', type: 'all' };
const formatNumber = (value: number) => new Intl.NumberFormat('es-AR').format(value || 0);

const SeguimientoReclamos: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [payload, setPayload] = useState<SummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [matrixMetric, setMatrixMetric] = useState<'records' | 'uniqueOrders' | 'pendingToComplete' | 'completionRate'>('records');
  const [branchSort, setBranchSort] = useState<'records' | 'pending' | 'completion'>('records');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [defaultsApplied, setDefaultsApplied] = useState(false);
  const forceRefreshRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(!payload);
      const forceRefresh = forceRefreshRef.current;
      forceRefreshRef.current = false;
      setRefreshing(forceRefresh);
      setError('');
      try {
        const query = new URLSearchParams();
        if (filters.year) query.set('year', String(filters.year));
        if (filters.month) query.set('month', String(filters.month));
        if (filters.branch !== 'all') query.set('branch', filters.branch);
        if (filters.managementState !== 'all') query.set('managementState', filters.managementState);
        if (filters.type !== 'all') query.set('type', filters.type);
        if (forceRefresh) query.set('refresh', '1');
        const response = await fetch(buildApiUrl(`/api/data/seguimiento_reclamos_pv?${query}`), { cache: 'no-store' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudieron cargar los indicadores.');
        if (cancelled) return;
        setPayload(result as SummaryPayload);
        if (!defaultsApplied) {
          setDefaultsApplied(true);
          setFilters({
            ...EMPTY_FILTERS,
            year: result.availableData?.defaultYear ?? null,
            month: result.availableData?.defaultMonth ?? null,
          });
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'Error al cargar los indicadores.');
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [filters, refreshKey]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setPage(0);
    setFilters(current => ({
      ...current,
      [key]: key === 'year' || key === 'month' ? (value ? Number(value) : null) : value,
    }));
  };
  const refresh = useCallback(() => {
    forceRefreshRef.current = true;
    setRefreshKey(key => key + 1);
  }, []);
  const clearFilters = () => setFilters({
    ...EMPTY_FILTERS,
    year: payload?.availableData.defaultYear ?? null,
    month: payload?.availableData.defaultMonth ?? null,
  });

  const branchChart = useMemo(() => {
    const rows = [...(payload?.managementByBranch || [])];
    return rows.sort((a, b) => branchSort === 'pending'
      ? (b.states.pendiente + b.states.incompleta) - (a.states.pendiente + a.states.incompleta)
      : branchSort === 'completion'
        ? b.completionRate - a.completionRate
        : b.records - a.records);
  }, [payload, branchSort]);

  const tableRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es-AR');
    return (payload?.aggregateTable || []).filter(row => !term ||
      `${row.year} ${MONTH_LABELS[row.month - 1]} ${row.branch} ${row.sector} ${row.type} ${row.state}`.toLocaleLowerCase('es-AR').includes(term));
  }, [payload, search]);
  const pageSize = 12;
  const visibleRows = tableRows.slice(page * pageSize, (page + 1) * pageSize);

  const filtersPanel = (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#001e50]">
        <Icons.Filter className="h-4 w-4 text-blue-600" /> Filtros
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AÃ±o
          <select value={filters.year ?? ''} onChange={event => updateFilter('year', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
            <option value="">Todos</option>{payload?.options.years.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Mes
          <select value={filters.month ?? ''} onChange={event => updateFilter('month', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
            <option value="">Todos</option>{payload?.options.months.filter(month => !filters.year || payload.options.monthsByYear[filters.year]?.includes(month.number)).map(month => <option key={month.number} value={month.number}>{month.name}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Sucursal
          <select value={filters.branch} onChange={event => updateFilter('branch', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
            <option value="all">Todas</option>{payload?.options.branches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado de gestiÃ³n
          <select value={filters.managementState} onChange={event => updateFilter('managementState', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
            <option value="all">Todos</option>{payload?.options.managementStates.map(state => <option key={state} value={state}>{state}</option>)}
          </select>
        </label>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tipo
          <select value={filters.type} onChange={event => updateFilter('type', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800">
            <option value="all">Todos</option><option value="RECLAMO">Reclamo</option><option value="QUEJA">Queja</option>
          </select>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button onClick={clearFilters} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Limpiar filtros</button>
        <button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-xl bg-[#001e50] px-3 py-2 text-xs font-bold text-white hover:bg-blue-900 disabled:opacity-60">
          <Icons.RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar datos
        </button>
      </div>
    </div>
  );

  return (
    <DashboardFrame title="Seguimiento de Reclamos" subtitle="Calidad Postventa Â· Indicadores agregados" onBack={onBack} isLoading={loading}>
      <div className="space-y-4 pb-10">
        {filtersPanel}
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <Icons.Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p><strong>Vista agregada.</strong> Este servicio no cuenta con autenticaciÃ³n de usuarios. Por seguridad, no muestra asesores, Ã³rdenes, clientes, notas ni detalle de reclamos.</p>
        </div>

        {error && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><span>{error}</span><button onClick={refresh} className="rounded-lg bg-rose-700 px-3 py-2 font-bold text-white">Reintentar</button></div>}

        {!error && payload && <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'Registros de reclamos', value: payload.summary.records, caption: 'Filas vÃ¡lidas en el filtro', color: 'text-[#001e50]', icon: Icons.ClipboardCheck },
              { title: 'OR Ãºnicas', value: payload.summary.uniqueOrders, caption: 'Sucursal + orden', color: 'text-blue-700', icon: Icons.Wrench },
              { title: 'Gestiones completas', value: payload.summary.complete, caption: `${payload.summary.completionRate}% de los registros`, color: 'text-emerald-700', icon: Icons.CheckCircle2 },
              { title: 'Pendientes de completar', value: payload.summary.pendingToComplete, caption: 'Pendientes + incompletas', color: 'text-amber-700', icon: Icons.Clock },
            ].map(card => <div key={card.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between"><p className="text-[10px] font-black uppercase tracking-wider text-slate-500">{card.title}</p><card.icon className={`h-4 w-4 ${card.color}`} /></div>
              <p className={`mt-2 text-3xl font-black ${card.color}`}>{formatNumber(card.value)}</p><p className="mt-1 text-xs text-slate-500">{card.caption}</p>
            </div>)}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ['Completitud', `${payload.summary.completionRate}%`],
              ['Observadas por Calidad', payload.summary.observed],
              ['Resueltos', payload.summary.resolved],
              ['Asesores con reclamos', payload.summary.advisorCount],
            ].map(([title, value]) => <div key={title} className="rounded-xl border border-slate-200 bg-white px-4 py-3"><p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{title}</p><p className="mt-1 text-xl font-black text-[#001e50]">{typeof value === 'number' ? formatNumber(value) : value}</p></div>)}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-black text-[#001e50]">GestiÃ³n por sucursal</h2><p className="text-xs text-slate-500">Vista agregada; el detalle por asesor requiere autenticaciÃ³n</p></div>
                <select value={branchSort} onChange={event => setBranchSort(event.target.value as typeof branchSort)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"><option value="records">Ordenar: registros</option><option value="pending">Ordenar: pendientes</option><option value="completion">Ordenar: completitud</option></select>
              </div>
              <div className="h-64">
                {branchChart.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={branchChart} layout="vertical" margin={{ left: 8, right: 20, top: 6, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={105} tick={{ fontSize: 11 }} /><Tooltip /><Legend />
                  <Bar dataKey="states.completa" name="Completa" stackId="a" fill="#15966b" /><Bar dataKey="states.incompleta" name="Incompleta" stackId="a" fill="#e9a23b" /><Bar dataKey="states.pendiente" name="Pendiente" stackId="a" fill="#94a3b8" />
                </BarChart></ResponsiveContainer> : <p className="pt-20 text-center text-sm text-slate-400">Sin registros para este filtro.</p>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-black text-[#001e50]">EvoluciÃ³n mensual</h2><p className="mb-2 text-xs text-slate-500">Registros y Ã³rdenes Ãºnicas del aÃ±o filtrado</p>
              <div className="h-64">
                {payload.trends.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={payload.trends}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="records" name="Registros" fill="#2563eb" radius={[5, 5, 0, 0]} /><Bar dataKey="uniqueOrders" name="OR Ãºnicas" fill="#76a9fa" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="pt-20 text-center text-sm text-slate-400">Sin registros para este filtro.</p>}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-black text-[#001e50]">DistribuciÃ³n por Sector Responsable</h2><p className="mb-2 text-xs text-slate-500">Cada registro se cuenta una vez</p>
              <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={payload.sectors.slice(0, 10)} layout="vertical" margin={{ left: 12, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" name="Registros" fill="#3b82f6" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
            </section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-black text-[#001e50]">Motivos declarados</h2><p className="mb-2 text-xs text-slate-500">Un registro puede sumar mÃ¡s de un motivo</p>
              <div className="h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={payload.reasons.slice(0, 10)} layout="vertical" margin={{ left: 12, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" name="Menciones" fill="#60a5fa" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-sm font-black text-[#001e50]">Sucursal Ã— Mes</h2><p className="text-xs text-slate-500">SeleccionÃ¡ una celda para aplicar sus filtros y actualizar los indicadores.</p></div>
              <select value={matrixMetric} onChange={event => setMatrixMetric(event.target.value as typeof matrixMetric)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold"><option value="records">Registros de reclamos</option><option value="uniqueOrders">OR Ãºnicas</option><option value="pendingToComplete">Pendientes de completar</option><option value="completionRate">% gestiones completas</option></select>
            </div>
            <div className="overflow-x-auto"><table className="min-w-[760px] border-separate border-spacing-1 text-xs"><thead><tr><th className="px-3 py-2 text-left text-slate-500">Sucursal</th>{MONTH_LABELS.map((name, index) => <th key={name} className="px-2 py-2 text-center text-slate-500">{name}</th>)}</tr></thead>
              <tbody>{payload.matrix.map(row => <tr key={row.branch}><th className="whitespace-nowrap px-3 py-2 text-left font-bold text-[#001e50]">{row.branch}</th>{MONTH_LABELS.map((name, index) => {
                const value = row.months.find(item => item.month === index + 1);
                const metric = value?.[matrixMetric] ?? 0;
                const alpha = matrixMetric === 'completionRate' ? Math.max(0.08, Number(metric) / 100) : Math.min(0.78, Number(metric) / Math.max(1, payload.summary.records) * 3);
                return <td key={name}><button onClick={() => { if (!value) return; setPage(0); setFilters(current => ({ ...current, year: current.year ?? payload.availableData.defaultYear, month: index + 1, branch: row.branch })); }} title={`${row.branch}, ${name}: ${metric}`} className="h-9 w-full rounded-md border border-blue-100 text-center font-bold text-[#001e50] hover:ring-2 hover:ring-blue-400" style={{ backgroundColor: `rgba(37,99,235,${alpha})` }}>{value ? `${metric}${matrixMetric === 'completionRate' ? '%' : ''}` : 'â€”'}</button></td>;
              })}</tr>)}</tbody></table></div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4"><div><h2 className="text-sm font-black text-[#001e50]">Resumen de seguimiento</h2><p className="text-xs text-slate-500">Agrupado por mes, sucursal, sector, tipo y estado; sin Ã³rdenes ni datos de clientes.</p></div>
              <input value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} placeholder="Buscar sucursal, sector o estado" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-72" />
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">AÃ±o</th><th className="px-4 py-3">Mes</th><th className="px-4 py-3">Sucursal</th><th className="px-4 py-3">Sector</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">GestiÃ³n</th><th className="px-4 py-3 text-right">Registros</th></tr></thead>
              <tbody>{visibleRows.map(row => <tr key={`${row.year}-${row.month}-${row.branch}-${row.sector}-${row.type}-${row.state}`} className="border-t border-slate-100"><td className="px-4 py-3">{row.year}</td><td className="px-4 py-3">{MONTH_LABELS[row.month - 1]}</td><td className="px-4 py-3 font-semibold">{row.branch}</td><td className="px-4 py-3">{row.sector}</td><td className="px-4 py-3">{row.type === 'SIN CLASIFICAR' ? 'Sin clasificar' : row.type.toLowerCase()}</td><td className="px-4 py-3">{row.state.toLowerCase()}</td><td className="px-4 py-3 text-right font-black">{formatNumber(row.count)}</td></tr>)}</tbody>
            </table>{visibleRows.length === 0 && <p className="p-8 text-center text-sm text-slate-400">No hay grupos para mostrar.</p>}</div>
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500"><span>{formatNumber(tableRows.length)} grupos agregados Â· {payload.summary.correctComplete} completas validadas como correctas</span><div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Anterior</button><span className="px-2 py-1.5">{page + 1} / {Math.max(1, Math.ceil(tableRows.length / pageSize))}</span><button disabled={(page + 1) * pageSize >= tableRows.length} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Siguiente</button></div></div>
          </section>

          {(payload.dataQuality.invalidIdentityRows > 0 || payload.dataQuality.invalidDateRows > 0 || payload.dataQuality.blankRows > 0) && <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-xs text-orange-900"><strong>Calidad de datos:</strong> {formatNumber(payload.dataQuality.invalidIdentityRows)} filas sin sucursal/orden vÃ¡lida; {formatNumber(payload.dataQuality.invalidDateRows)} con fecha no interpretable (excluidas del anÃ¡lisis temporal); {formatNumber(payload.dataQuality.blankRows)} filas vacÃ­as.</div>}
        </>}
      </div>
    </DashboardFrame>
  );
};

export default SeguimientoReclamos;

