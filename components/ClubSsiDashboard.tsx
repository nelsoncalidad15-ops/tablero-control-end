import React, { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchClubSsiData } from '../services/dataService';
import { ClubSsiRecord, summarizeClubSsi, averageClubScore } from '../services/clubSsi';

const panel = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';

export default function ClubSsiDashboard() {
  const [rows, setRows] = useState<ClubSsiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [branch, setBranch] = useState('');
  const [dimensions, setDimensions] = useState<Record<string, string>>({});
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetchClubSsiData().then(data => { if (active) setRows(data); })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : 'No se pudo cargar Club SSI.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);
  useEffect(() => { setPage(0); }, [branch, dimensions, category, search]);
  const categories = useMemo(() => summarizeClubSsi(rows), [rows]);
  const filtered = useMemo(() => rows.filter(row => (!branch || row.branch === branch)
    && Object.entries(dimensions).every(([key, value]) => !value || row[key as keyof ClubSsiRecord] === value)
    && (!category || (category === '__none' ? !row.categories.length : row.categories.some(name => name.localeCompare(category, 'es', { sensitivity: 'base' }) === 0)))
    && (!search || row.comment.toLocaleLowerCase().includes(search.toLocaleLowerCase()))), [rows, branch, dimensions, category, search]);
  const summary = useMemo(() => summarizeClubSsi(filtered), [filtered]);
  const mentions = summary.reduce((sum, item) => sum + item.value, 0);
  const categorized = filtered.filter(row => row.categories.length).length;
  const multiple = filtered.filter(row => row.categories.length > 1).length;
  const satisfaction = averageClubScore(filtered, 'satisfaction');
  const recommendation = averageClubScore(filtered, 'recommendation');
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  if (loading) return <div className={panel} role="status">Cargando indicadores de Club SSI…</div>;
  if (error) return <div className={panel} role="alert"><h3 className="font-semibold text-slate-900">No pudimos cargar Club SSI</h3><p className="mt-2 text-sm text-slate-600">{error}</p><button className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-white" onClick={() => setAttempt(value => value + 1)}>Reintentar</button></div>;
  return <div className="space-y-5 text-slate-800">
    <section className={`${panel} flex flex-wrap items-end gap-4`} aria-label="Filtros de Club SSI">
      {[
        { label: 'Provincia', value: branch, set: setBranch, options: [...new Set(rows.map(row => row.branch))].sort() },
        ...[['year', 'Año'], ['semester', 'Semestre'], ['wave', 'Ola'], ['channel', 'Canal Venta']].map(([key, label]) => ({
          label, value: dimensions[key] || '', set: (value: string) => setDimensions(previous => ({ ...previous, [key]: value })),
          options: [...new Set(rows.map(row => String(row[key as keyof ClubSsiRecord] || '')).filter(Boolean))].sort(),
        })),
        { label: 'Categoría', value: category, set: setCategory, options: categories.map(item => item.name) },
      ].map(filter => <label key={filter.label} className="flex min-w-0 flex-col gap-2 text-xs font-medium">{filter.label}<select className="max-w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm" value={filter.value} onChange={event => filter.set(event.target.value)}><option value="">Todas las opciones</option>{filter.options.map(option => <option key={option}>{option}</option>)}{filter.label === 'Categoría' && <option value="__none">Sin categorizar</option>}</select></label>)}
      <label className="flex flex-1 flex-col gap-2 text-xs font-medium">Buscar comentario<input className="rounded-lg border border-slate-200 p-2 text-sm" value={search} onChange={event => setSearch(event.target.value)} placeholder="Escribí una palabra…" /></label>
      <button className="py-2 text-sm text-blue-700" onClick={() => { setBranch(''); setDimensions({}); setCategory(''); setSearch(''); }}>Limpiar filtros</button>
    </section>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {[
        ['Satisfacción general', satisfaction.value === null ? '—' : `${satisfaction.value.toFixed(1)} / 10`, `${satisfaction.count} respuestas válidas`],
        ['Recomendación', recommendation.value === null ? '—' : `${recommendation.value.toFixed(1)} / 10`, `${recommendation.count} respuestas válidas`],
        ['Registros', filtered.length, 'Base del análisis seleccionado'],
        ['Menciones', mentions, 'Una por categoría en cada registro'],
        ['Cobertura', filtered.length ? `${Math.round(categorized / filtered.length * 100)}%` : '—', `${categorized} registros categorizados`],
        ['Multicategoría', multiple, 'Registros con más de una categoría'],
      ].map(([label, value, note]) => <article className={panel} key={label}><p className="text-sm text-slate-500">{label}</p><p className="my-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p><p className="text-xs text-slate-500">{note}</p></article>)}
    </div>
    {!filtered.length ? <div className={`${panel} text-center text-slate-500`}>{rows.length ? 'No hay registros para estos filtros.' : 'La planilla todavía no contiene registros.'}</div> : <>
      <div className="grid gap-5 xl:grid-cols-3">
        <section className={`${panel} xl:col-span-2 min-w-0`}><h3 className="font-semibold">Categorías más mencionadas</h3><p className="mt-1 text-sm text-slate-500">Cantidad de registros por categoría · hasta 12 principales</p>
          {summary.length ? <div className="mt-5" style={{ height: Math.max(260, Math.min(summary.length, 12) * 42) }}><ResponsiveContainer width="100%" height="100%"><BarChart data={summary.slice(0, 12)} layout="vertical" margin={{ left: 0, right: 24 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={145} tick={{ fontSize: 11 }} tickFormatter={value => value.length > 23 ? `${value.slice(0, 22)}…` : value} /><Tooltip formatter={value => [value, 'Registros']} /><Bar dataKey="value" fill="#2563eb" radius={[0, 5, 5, 0]} maxBarSize={22} /></BarChart></ResponsiveContainer></div> : <p className="py-12 text-sm text-slate-500">Estos registros aún no tienen categorías.</p>}
        </section>
        <section className={panel}><h3 className="font-semibold">Distribución de menciones</h3><p className="mt-1 text-sm text-slate-500">Participación sobre {mentions} menciones.</p><div className="mt-5 max-h-96 space-y-4 overflow-auto">{summary.map(item => <div key={item.name}><div className="mb-2 flex justify-between gap-3 text-sm"><span>{item.name}</span><span className="whitespace-nowrap font-medium">{(item.value / mentions * 100).toFixed(1)}%</span></div><div className="h-1.5 rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${item.value / mentions * 100}%` }} /></div></div>)}</div><p className="mt-6 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">Un registro puede aportar a varias categorías. Las categorías separadas por comas se cuentan individualmente, sin repetir la misma dentro de un registro.</p></section>
      </div>
      <section className={panel}><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Detalle de comentarios</h3><span className="text-xs text-slate-500">{filtered.length} registros · {filtered.length - categorized} sin categorizar</span></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr>{['Provincia / período', 'Vehículo / canal', 'Calificaciones', 'Comentario', 'Categorías'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{filtered.slice(page * 20, page * 20 + 20).map(row => <tr key={row.id} className="border-b border-slate-100 align-top"><td className="p-3"><p className="font-medium">{row.branch}</p><p className="mt-1 text-xs text-slate-500">{row.year} · {row.semester} · Ola {row.wave || '—'}</p><p className="mt-1 text-xs text-slate-500">CE {row.ce || '—'}</p></td><td className="min-w-48 p-3"><p>{row.model || 'Sin modelo'}</p><p className="mt-1 text-xs text-slate-500">{row.channel || 'Sin canal'} · {row.saleDate || 'Sin fecha'}</p></td><td className="min-w-40 p-3 text-xs"><p>Satisfacción: {row.satisfaction ?? '—'}</p><p className="mt-1">Recomendación: {row.recommendation ?? '—'}</p></td><td className="min-w-64 max-w-xl whitespace-pre-wrap break-words p-3 leading-relaxed">{row.comment || 'Sin comentario'}</td><td className="min-w-48 p-3"><div className="flex flex-wrap gap-1.5">{(row.categories.length ? row.categories : ['Sin categorizar']).map(name => <span key={name} className="rounded-lg bg-blue-50 px-2 py-1 text-xs text-blue-800">{name}</span>)}</div></td></tr>)}</tbody></table></div><div className="mt-4 flex items-center justify-end gap-4 text-sm"><button disabled={!page} onClick={() => setPage(value => value - 1)} className="disabled:opacity-30">Anterior</button><span>{page + 1} / {pages}</span><button disabled={page + 1 >= pages} onClick={() => setPage(value => value + 1)} className="disabled:opacity-30">Siguiente</button></div></section>
    </>}
  </div>;
}
