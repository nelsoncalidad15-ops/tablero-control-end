import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fetchScoringData } from '../services/dataService';
import { ScoringRecord } from '../types';
import { Icons } from './Icon';

type RecordMode = 'all' | 'first' | 'latest';
type BranchFilter = 'all' | 'JUJUY' | 'SALTA';
type QuestionKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5aAutoDebit' | 'q7OtherPlan' | 'q9NeedsContact';

const QUESTIONS: Array<{ key: QuestionKey; label: string }> = [
  { key: 'q1', label: 'Plan exclusivo' }, { key: 'q2', label: 'Licitación cuota 2' },
  { key: 'q3', label: 'Adjudicación asegurada' }, { key: 'q4', label: 'Monto cuota 2' },
  { key: 'q5aAutoDebit', label: 'Débito automático' }, { key: 'q7OtherPlan', label: 'Otro plan reciente' },
  { key: 'q9NeedsContact', label: 'Necesita recontacto' },
];
const BANDS = [
  ['Hasta $300 mil', 0, 300000], ['$300 a $400 mil', 300001, 400000], ['$400 a $500 mil', 400001, 500000],
  ['$500 a $700 mil', 500001, 700000], ['$700 mil a $1 M', 700001, 1000000], ['Más de $1 M', 1000001, Infinity],
] as const;

const norm = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const answer = (value: string) => /^(si|s|yes)\b/.test(norm(value)) ? 'yes' : /^(no|n)\b/.test(norm(value)) ? 'no' : 'other';
const passed = (value: string) => norm(value).includes('paso') && !norm(value).includes('no paso');
const pct = (part: number, total: number) => total ? (part / total) * 100 : 0;
const percent = (value: number) => `${Math.round(value)}%`;
const money = (value: number | null) => value === null ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value);
const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const med = (values: number[]) => { if (!values.length) return null; const valuesSorted = [...values].sort((a, b) => a - b); const mid = Math.floor(valuesSorted.length / 2); return valuesSorted.length % 2 ? valuesSorted[mid] : (valuesSorted[mid - 1] + valuesSorted[mid]) / 2; };

const dateOf = (value: string): Date | null => {
  const iso = value.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const local = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  const date = iso ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])) : local ? new Date(Number(local[3]), Number(local[2]) - 1, Number(local[1])) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const dateLabel = (value: string) => { const date = dateOf(value); return date ? new Intl.DateTimeFormat('es-AR').format(date) : value || 'Sin fecha'; };
const identity = (record: ScoringRecord) => record.dniHash ? `dni:${record.dniHash}` : record.customerId ? `client:${record.customerId}` : `response:${record.id}`;

const selectedVersion = (records: ScoringRecord[], mode: RecordMode) => {
  if (mode === 'all') return records;
  const result = new Map<string, ScoringRecord>();
  records.forEach((record) => {
    const previous = result.get(identity(record));
    if (!previous) return void result.set(identity(record), record);
    const currentTime = dateOf(record.responseDate)?.getTime() || 0;
    const previousTime = dateOf(previous.responseDate)?.getTime() || 0;
    if ((mode === 'first' && currentTime < previousTime) || (mode === 'latest' && currentTime >= previousTime)) result.set(identity(record), record);
  });
  return Array.from(result.values());
};

const parseAmount = (raw: string): number | null => {
  const text = norm(raw);
  if (!text || text === '0' || /no sabe|sin dato|n\/a|no informa/.test(text)) return null;
  const multiplier = text.includes('millon') ? 1000000 : text.includes('mil') ? 1000 : 1;
  const parseToken = (token: string) => multiplier === 1000000 && /^\d+[.,]\d{1,2}$/.test(token) ? Number(token.replace(',', '.')) : Number(token.replace(/[.,]/g, ''));
  const values = (text.match(/\d[\d.,]*/g) || []).map(parseToken).filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return null;
  let value = (/\d[\d.,]*\s*(a|hasta|[-–])\s*\d/.test(text) && values.length > 1 ? (values[0] + values[1]) / 2 : values[0]) * multiplier;
  if (multiplier === 1 && value < 10000) value *= 1000;
  return Number.isFinite(value) && value > 0 && value <= 20000000 ? Math.round(value) : null;
};

const Kpi = ({ label, value, detail, tone = 'blue' }: { label: string; value: string | number; detail: string; tone?: 'blue' | 'emerald' | 'rose' | 'amber' }) => {
  const colors = { blue: 'border-blue-100 bg-blue-50/70', emerald: 'border-emerald-100 bg-emerald-50/70', rose: 'border-rose-100 bg-rose-50/70', amber: 'border-amber-100 bg-amber-50/70' };
  return <div className={`rounded-3xl border p-4 ${colors[tone]}`}><p className="text-[9px] font-black uppercase tracking-[.16em] text-slate-500">{label}</p><p className="mt-3 text-3xl font-black tracking-tighter">{value}</p><p className="mt-1 text-[10px] font-semibold text-slate-500">{detail}</p></div>;
};

const QuestionCard = ({ label, question, records }: { label: string; question: QuestionKey; records: ScoringRecord[] }) => {
  const yes = records.filter((record) => answer(record[question]) === 'yes').length;
  const no = records.filter((record) => answer(record[question]) === 'no').length;
  const unknown = Math.max(records.length - yes - no, 0);
  const chart = [{ name: 'Sí', value: yes, color: '#14b8a6' }, { name: 'No', value: no, color: '#fb7185' }, { name: 'S/D', value: unknown, color: '#cbd5e1' }].filter((item) => item.value);
  return <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><p className="min-h-10 text-[10px] font-black uppercase leading-4 tracking-[.14em] text-slate-500">{label}</p><div className="relative mx-auto h-36 max-w-[190px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={chart.length ? chart : [{ name: 'Sin datos', value: 1, color: '#e2e8f0' }]} dataKey="value" innerRadius={38} outerRadius={56} paddingAngle={3} stroke="none">{(chart.length ? chart : [{ name: 'Sin datos', value: 1, color: '#e2e8f0' }]).map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip formatter={(value: number, name: string) => [`${value} respuestas`, name]} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-black tracking-tighter">{percent(pct(yes, yes + no + unknown))}</span><span className="text-[8px] font-black uppercase tracking-[.18em] text-teal-600">Sí</span></div></div><div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold"><span className="rounded-xl bg-teal-50 px-2 py-2 text-teal-700">Sí {yes}</span><span className="rounded-xl bg-rose-50 px-2 py-2 text-rose-700">No {no}</span><span className="rounded-xl bg-slate-100 px-2 py-2 text-slate-500">S/D {unknown}</span></div></div>;
};

interface ScoringDashboardProps { onBack: () => void; }
const ScoringDashboard: React.FC<ScoringDashboardProps> = ({ onBack }) => {
  const [records, setRecords] = useState<ScoringRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branch, setBranch] = useState<BranchFilter>('all');
  const [mode, setMode] = useState<RecordMode>('latest');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [model, setModel] = useState('');
  const [advisor, setAdvisor] = useState('');
  const [result, setResult] = useState('');
  const [contact, setContact] = useState('');
  const [observationSearch, setObservationSearch] = useState('');
  const [hideEmptyObservations, setHideEmptyObservations] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetchScoringData().then((data) => { if (mounted) { setRecords(data); setError(''); } }).catch((reason: unknown) => { if (mounted) setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las respuestas de scoring.'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const options = useMemo(() => ({
    models: Array.from(new Set(records.map((record) => record.model).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    advisors: Array.from(new Set(records.map((record) => record.advisor).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
  }), [records]);
  const versionRecords = useMemo(() => selectedVersion(records, mode), [records, mode]);
  const filtered = useMemo(() => versionRecords.filter((record) => {
    const responseDate = dateOf(record.responseDate);
    const afterFrom = !fromDate || (responseDate && responseDate >= new Date(`${fromDate}T00:00:00`));
    const beforeTo = !toDate || (responseDate && responseDate <= new Date(`${toDate}T23:59:59`));
    const needsContact = answer(record.requiresContact || record.q9NeedsContact) === 'yes';
    return (branch === 'all' || record.branch === branch) && afterFrom && beforeTo && (!model || record.model === model) && (!advisor || record.advisor === advisor) && (!result || (result === 'passed' ? passed(record.scoringResult) : !passed(record.scoringResult))) && (!contact || (contact === 'yes' ? needsContact : !needsContact));
  }), [versionRecords, branch, fromDate, toDate, model, advisor, result, contact]);

  const metrics = useMemo(() => {
    const total = filtered.length;
    const passCount = filtered.filter((record) => passed(record.scoringResult)).length;
    const followUps = filtered.filter((record) => answer(record.requiresContact || record.q9NeedsContact) === 'yes').length;
    const autoDebit = filtered.filter((record) => answer(record.q5aAutoDebit) === 'yes').length;
    const allKeyYes = filtered.filter((record) => ['q1', 'q2', 'q3', 'q4'].every((key) => answer(record[key as QuestionKey]) === 'yes')).length;
    const anyKeyNo = filtered.filter((record) => ['q1', 'q2', 'q3', 'q4'].some((key) => answer(record[key as QuestionKey]) === 'no')).length;
    return { total, passCount, followUps, autoDebit, allKeyYes, anyKeyNo, unique: new Set(filtered.map(identity)).size, advisors: new Set(filtered.map((record) => record.advisor).filter(Boolean)).size, models: new Set(filtered.map((record) => record.model).filter(Boolean)).size };
  }, [filtered]);

  const origins = useMemo(() => {
    const groups = new Map<string, { origin: string; JUJUY: number; SALTA: number }>();
    filtered.forEach((record) => { const origin = record.q8ProposalOrigin || 'Sin dato'; const current = groups.get(origin) || { origin, JUJUY: 0, SALTA: 0 }; if (record.branch === 'JUJUY') current.JUJUY++; if (record.branch === 'SALTA') current.SALTA++; groups.set(origin, current); });
    return Array.from(groups.values()).sort((a, b) => b.JUJUY + b.SALTA - a.JUJUY - a.SALTA);
  }, [filtered]);

  const amounts = useMemo(() => {
    const enriched = filtered.map((record) => ({ record, estimated: parseAmount(record.q4aEstimatedAmount), first: parseAmount(record.q5FirstInstallment) }));
    const estimated = enriched.map((item) => item.estimated).filter((value): value is number => value !== null);
    const first = enriched.map((item) => item.first).filter((value): value is number => value !== null);
    const models = new Map<string, { model: string; estimated: number[]; first: number[] }>();
    const branches = new Map<string, { branch: string; estimated: number[]; first: number[] }>();
    enriched.forEach(({ record, estimated: estimate, first: firstPayment }) => {
      const modelEntry = models.get(record.model || 'Sin modelo') || { model: record.model || 'Sin modelo', estimated: [], first: [] }; if (estimate !== null) modelEntry.estimated.push(estimate); if (firstPayment !== null) modelEntry.first.push(firstPayment); models.set(modelEntry.model, modelEntry);
      const branchEntry = branches.get(record.branch) || { branch: record.branch, estimated: [], first: [] }; if (estimate !== null) branchEntry.estimated.push(estimate); if (firstPayment !== null) branchEntry.first.push(firstPayment); branches.set(branchEntry.branch, branchEntry);
    });
    return { estimated, first, bands: BANDS.map(([range, min, max]) => ({ range, estimada: estimated.filter((value) => value >= min && value <= max).length, primera: first.filter((value) => value >= min && value <= max).length })), byModel: Array.from(models.values()).map((item) => ({ model: item.model, estimada: avg(item.estimated) || 0, primera: avg(item.first) || 0, total: Math.max(item.estimated.length, item.first.length) })).sort((a, b) => b.total - a.total).slice(0, 8), byBranch: Array.from(branches.values()).map((item) => ({ branch: item.branch, estimada: avg(item.estimated), primera: avg(item.first) })) };
  }, [filtered]);

  const advisors = useMemo(() => {
    const groups = new Map<string, ScoringRecord[]>();
    filtered.forEach((record) => { const name = record.advisor || 'Sin asesor informado'; groups.set(name, [...(groups.get(name) || []), record]); });
    return Array.from(groups.entries()).map(([name, rows]) => ({ name, total: rows.length, q1: pct(rows.filter((r) => answer(r.q1) === 'yes').length, rows.length), q2: pct(rows.filter((r) => answer(r.q2) === 'yes').length, rows.length), q3: pct(rows.filter((r) => answer(r.q3) === 'yes').length, rows.length), q4: pct(rows.filter((r) => answer(r.q4) === 'yes').length, rows.length), debit: pct(rows.filter((r) => answer(r.q5aAutoDebit) === 'yes').length, rows.length), contact: pct(rows.filter((r) => answer(r.requiresContact || r.q9NeedsContact) === 'yes').length, rows.length), pass: pct(rows.filter((r) => passed(r.scoringResult)).length, rows.length) })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const otherPlans = useMemo(() => { const groups = new Map<string, number>(); filtered.forEach((record) => { const detail = record.q7aOtherPlanDetail.trim(); if (detail) groups.set(detail, (groups.get(detail) || 0) + 1); }); return Array.from(groups.entries()).map(([detail, count]) => ({ detail, count })).sort((a, b) => b.count - a.count).slice(0, 8); }, [filtered]);
  const paymentDays = useMemo(() => { const days = new Map<number, number>(); filtered.forEach((record) => { const date = dateOf(record.q5bFirstPaymentDate); if (date) days.set(date.getDate(), (days.get(date.getDate()) || 0) + 1); }); return Array.from(days.entries()).map(([day, count]) => ({ day: String(day), count })).sort((a, b) => Number(a.day) - Number(b.day)); }, [filtered]);
  const observations = useMemo(() => { const term = norm(observationSearch); return filtered.filter((record) => !hideEmptyObservations || record.q10CustomerObservation.trim()).filter((record) => !term || norm(`${record.customerName} ${record.advisor} ${record.q10CustomerObservation}`).includes(term)).sort((a, b) => (dateOf(b.responseDate)?.getTime() || 0) - (dateOf(a.responseDate)?.getTime() || 0)); }, [filtered, observationSearch, hideEmptyObservations]);
  const reset = () => { setBranch('all'); setMode('latest'); setFromDate(''); setToDate(''); setModel(''); setAdvisor(''); setResult(''); setContact(''); };
  return <div className="min-h-screen bg-slate-50 text-slate-900"><div className="mx-auto w-full max-w-[1680px] px-4 py-5 md:px-6 md:py-7">
    <motion.header initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_right,_rgba(45,212,191,.24),_transparent_28%),linear-gradient(135deg,_#0f172a,_#172554)] p-5 text-white shadow-[0_30px_80px_rgba(15,23,42,.24)] md:p-8"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start"><div><button onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-[.24em] text-slate-200 transition hover:bg-white/15"><Icons.ArrowLeft className="h-3.5 w-3.5" /> Volver a Ventas</button><p className="mt-6 text-[10px] font-black uppercase tracking-[.38em] text-teal-200">Planes de ahorro</p><h1 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Scoring de clientes</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Comprensión comercial, recontactos y montos informados para Jujuy y Salta.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[520px]">{[['Modalidad', mode === 'latest' ? 'Última respuesta' : mode === 'first' ? 'Primera respuesta' : 'Todas'], ['Muestra', `${filtered.length} registros`], ['Jujuy', `${filtered.filter((record) => record.branch === 'JUJUY').length} respuestas`], ['Salta', `${filtered.filter((record) => record.branch === 'SALTA').length} respuestas`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/20 px-3 py-3"><p className="text-[8px] font-black uppercase tracking-[.18em] text-slate-400">{label}</p><p className="mt-1 text-xs font-black text-white">{value}</p></div>)}</div></div></motion.header>

    <section className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5"><div className="mb-4 flex items-center gap-2"><div className="rounded-xl bg-slate-900 p-2 text-white"><Icons.Filter className="h-4 w-4" /></div><div><h2 className="text-sm font-black uppercase tracking-tight">Filtros</h2><p className="text-xs text-slate-500">Por defecto se toma la última respuesta de cada cliente.</p></div></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
      <select value={branch} onChange={(event) => setBranch(event.target.value as BranchFilter)} className="filter-control"><option value="all">Todas las sucursales</option><option value="JUJUY">Jujuy</option><option value="SALTA">Salta</option></select>
      <select value={mode} onChange={(event) => setMode(event.target.value as RecordMode)} className="filter-control"><option value="latest">Última respuesta</option><option value="first">Primera respuesta</option><option value="all">Todas las respuestas</option></select>
      <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="filter-control" aria-label="Fecha desde" /><input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="filter-control" aria-label="Fecha hasta" />
      <select value={model} onChange={(event) => setModel(event.target.value)} className="filter-control"><option value="">Todos los modelos</option>{options.models.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select value={advisor} onChange={(event) => setAdvisor(event.target.value)} className="filter-control"><option value="">Todos los asesores</option>{options.advisors.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <select value={result} onChange={(event) => setResult(event.target.value)} className="filter-control"><option value="">Todos los resultados</option><option value="passed">Paso scoring</option><option value="failed">No paso scoring</option></select>
      <select value={contact} onChange={(event) => setContact(event.target.value)} className="filter-control"><option value="">Recontacto: todos</option><option value="yes">Necesita recontacto</option><option value="no">Sin recontacto</option></select>
      <button onClick={reset} className="rounded-xl border border-slate-200 px-4 py-3 text-[10px] font-black uppercase tracking-[.16em] text-slate-600 transition hover:bg-slate-50">Limpiar filtros</button>
    </div></section>

    {loading ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <div key={index} className="h-32 animate-pulse rounded-3xl bg-slate-200" />)}</div> : error ? <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800"><div className="flex items-start gap-3"><Icons.AlertCircle className="mt-.5 h-5 w-5" /><div><p className="font-black">No se pudieron cargar las respuestas de scoring.</p><p className="mt-1 text-sm">{error}</p><p className="mt-3 text-xs">En Render verificá <code className="rounded bg-white px-1.5 py-1 font-bold">LINK_SCORING</code> y el permiso de lectura de la cuenta de servicio.</p></div></div></div> : <>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8"><Kpi label="Respuestas" value={metrics.total} detail="registros de la vista" /><Kpi label="Clientes únicos" value={metrics.unique} detail="por ID / DNI hash" /><Kpi label="Paso scoring" value={percent(pct(metrics.passCount, metrics.total))} detail={`${metrics.passCount} clientes`} tone="emerald" /><Kpi label="No pasó" value={metrics.total ? percent(100 - pct(metrics.passCount, metrics.total)) : '0%'} detail={`${metrics.total - metrics.passCount} clientes`} tone="rose" /><Kpi label="Recontacto" value={percent(pct(metrics.followUps, metrics.total))} detail={`${metrics.followUps} casos`} tone="amber" /><Kpi label="Débito automático" value={percent(pct(metrics.autoDebit, metrics.total))} detail={`${metrics.autoDebit} aceptaron`} tone="emerald" /><Kpi label="Asesores" value={metrics.advisors} detail="con respuestas" /><Kpi label="Modelos" value={metrics.models} detail="suscriptos" tone="amber" /></section>
      <section className="mt-5 grid gap-4 lg:grid-cols-2"><div className="rounded-3xl border border-teal-100 bg-teal-50 p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-teal-700">Comprensión completa</p><p className="mt-2 text-3xl font-black tracking-tighter">{percent(pct(metrics.allKeyYes, metrics.total))}</p><p className="mt-1 text-sm text-slate-600">{metrics.allKeyYes} clientes dijeron Sí en Q1 a Q4.</p></div><div className="rounded-3xl border border-rose-100 bg-rose-50 p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-rose-700">Desvío comercial</p><p className="mt-2 text-3xl font-black tracking-tighter">{percent(pct(metrics.anyKeyNo, metrics.total))}</p><p className="mt-1 text-sm text-slate-600">{metrics.anyKeyNo} clientes marcaron al menos un No en Q1 a Q4.</p></div></section>
      <section className="mt-7"><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[.2em] text-teal-600">Comprensión del proceso</p><h2 className="mt-1 text-xl font-black tracking-tight">Respuestas Sí / No</h2></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{QUESTIONS.map((question) => <QuestionCard key={question.key} label={question.label} question={question.key} records={filtered} />)}</div></section>      <section className="mt-7 grid gap-5 xl:grid-cols-[1.15fr_.85fr]"><div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.2em] text-indigo-600">Origen de la propuesta</p><h2 className="mt-1 text-xl font-black tracking-tight">Cómo conocieron la propuesta</h2><div className="mt-4 h-[320px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={origins} margin={{ top: 10, right: 12, left: -20, bottom: 50 }}><XAxis dataKey="origin" angle={-28} textAnchor="end" interval={0} tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Bar dataKey="JUJUY" name="Jujuy" fill="#2563eb" radius={[6, 6, 0, 0]} /><Bar dataKey="SALTA" name="Salta" fill="#f97316" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div><div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-600">Otro plan reciente</p><h2 className="mt-1 text-xl font-black tracking-tight">Detalles más repetidos</h2><div className="mt-5 space-y-2">{otherPlans.length ? otherPlans.map((item) => <div key={item.detail} className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-3 py-3"><p className="line-clamp-2 text-sm font-semibold text-slate-700">{item.detail}</p><span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-xs font-black text-amber-700">{item.count}</span></div>) : <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No hay detalle de otro plan con los filtros actuales.</p>}</div></div></section>

      <section className="mt-7"><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">Montos informados</p><h2 className="mt-1 text-xl font-black tracking-tight">Cuota 2 y primera cuota</h2><p className="mt-1 text-sm text-slate-500">Los rangos escritos se promedian; valores menores a 10.000 sin unidad se interpretan como miles.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Kpi label="Cuota 2 promedio" value={money(avg(amounts.estimated))} detail={`${amounts.estimated.length} montos interpretables`} /><Kpi label="Cuota 2 mediana" value={money(med(amounts.estimated))} detail="valor central" /><Kpi label="Primera cuota promedio" value={money(avg(amounts.first))} detail={`${amounts.first.length} montos interpretables`} tone="amber" /><Kpi label="Primera cuota mediana" value={money(med(amounts.first))} detail="valor central" tone="amber" /></div><div className="mt-4 grid gap-5 xl:grid-cols-2"><div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-black">Distribución por rangos</h3><div className="mt-4 h-[310px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={amounts.bands} margin={{ top: 8, right: 8, left: -20, bottom: 45 }}><XAxis dataKey="range" angle={-27} textAnchor="end" interval={0} tick={{ fontSize: 9 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Bar dataKey="estimada" name="Cuota 2" fill="#2563eb" radius={[6, 6, 0, 0]} /><Bar dataKey="primera" name="Primera cuota" fill="#f59e0b" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div><div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-black">Promedio por modelo</h3><div className="mt-4 h-[310px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={amounts.byModel} margin={{ top: 8, right: 8, left: -20, bottom: 70 }}><XAxis dataKey="model" angle={-32} textAnchor="end" interval={0} tick={{ fontSize: 8 }} /><YAxis tickFormatter={(value) => `$${Math.round(value / 1000)}k`} tick={{ fontSize: 10 }} /><Tooltip formatter={(value: number) => money(value)} /><Legend /><Bar dataKey="estimada" name="Cuota 2" fill="#38bdf8" radius={[6, 6, 0, 0]} /><Bar dataKey="primera" name="Primera cuota" fill="#fb923c" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{amounts.byBranch.map((item) => <div key={item.branch} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{item.branch}</p><div className="mt-3 grid grid-cols-2 gap-3"><div><p className="text-xs text-slate-500">Promedio cuota 2</p><p className="mt-1 font-black tracking-tight">{money(item.estimada)}</p></div><div><p className="text-xs text-slate-500">Promedio primera</p><p className="mt-1 font-black tracking-tight">{money(item.primera)}</p></div></div></div>)}</div></section>

      <section className="mt-7 grid gap-5 xl:grid-cols-[1.25fr_.75fr]"><div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-600">Desempeño por asesor</p><h2 className="mt-1 text-xl font-black tracking-tight">Comprensión y recontacto</h2></div><div className="overflow-x-auto"><table className="min-w-[880px] w-full text-left text-xs"><thead className="bg-slate-50 text-[9px] uppercase tracking-[.14em] text-slate-500"><tr><th className="px-4 py-3">Asesor</th><th className="px-3 py-3">Resp.</th><th className="px-3 py-3">Q1 Sí</th><th className="px-3 py-3">Q2 Sí</th><th className="px-3 py-3">Q3 Sí</th><th className="px-3 py-3">Q4 Sí</th><th className="px-3 py-3">Débito</th><th className="px-3 py-3">Recontacto</th><th className="px-3 py-3">Pasó</th></tr></thead><tbody>{advisors.map((item) => <tr key={item.name} className="border-t border-slate-100"><td className="max-w-[210px] truncate px-4 py-3 font-black text-slate-800">{item.name}</td><td className="px-3 py-3 font-bold">{item.total}</td>{[item.q1, item.q2, item.q3, item.q4, item.debit].map((value, index) => <td key={index} className="px-3 py-3"><span className={`rounded-lg px-2 py-1 font-black ${value >= 80 ? 'bg-emerald-50 text-emerald-700' : value >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>{percent(value)}</span></td>)}<td className="px-3 py-3"><span className={`rounded-lg px-2 py-1 font-black ${item.contact > 20 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{percent(item.contact)}</span></td><td className="px-3 py-3 font-black text-teal-700">{percent(item.pass)}</td></tr>)}</tbody></table></div></div><div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"><p className="text-[10px] font-black uppercase tracking-[.2em] text-sky-600">Pago de primera cuota</p><h2 className="mt-1 text-xl font-black tracking-tight">Frecuencia por día</h2><div className="mt-4 h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={paymentDays} margin={{ top: 8, right: 8, left: -25, bottom: 10 }}><XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="count" name="Respuestas" fill="#0ea5e9" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></div></section>      <section className="mt-7 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-rose-600">Voz del cliente</p><h2 className="mt-1 text-xl font-black tracking-tight">Observaciones de clientes</h2><p className="mt-1 text-sm text-slate-500">{observations.length} observaciones con los filtros actuales.</p></div><div className="flex flex-wrap items-center gap-3"><label className="flex items-center gap-2 text-xs font-semibold text-slate-600"><input type="checkbox" checked={hideEmptyObservations} onChange={(event) => setHideEmptyObservations(event.target.checked)} /> Ocultar vacías</label><div className="relative"><Icons.Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={observationSearch} onChange={(event) => setObservationSearch(event.target.value)} placeholder="Buscar texto, cliente o asesor" className="rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400" /></div></div></div><div className="overflow-x-auto"><table className="min-w-[1080px] w-full text-left text-xs"><thead className="bg-slate-50 text-[9px] uppercase tracking-[.14em] text-slate-500"><tr><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Sucursal</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Modelo</th><th className="px-4 py-3">Asesor</th><th className="px-4 py-3">Resultado</th><th className="px-4 py-3">Recontacto</th><th className="px-4 py-3">Observación</th></tr></thead><tbody>{observations.slice(0, 150).map((record) => { const risk = !passed(record.scoringResult) || answer(record.requiresContact || record.q9NeedsContact) === 'yes'; return <tr key={record.id} className={`border-t border-slate-100 align-top ${risk ? 'bg-rose-50/40' : ''}`}><td className="whitespace-nowrap px-4 py-3 text-slate-500">{dateLabel(record.responseDate)}</td><td className="px-4 py-3 font-bold">{record.branch}</td><td className="max-w-[180px] px-4 py-3 font-black text-slate-800">{record.customerName || 'Sin nombre'}</td><td className="max-w-[180px] px-4 py-3 text-slate-600">{record.model || '—'}</td><td className="max-w-[160px] px-4 py-3 text-slate-600">{record.advisor || '—'}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-black ${passed(record.scoringResult) ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{record.scoringResult || 'Sin resultado'}</span></td><td className="px-4 py-3 font-bold">{answer(record.requiresContact || record.q9NeedsContact) === 'yes' ? 'Sí' : 'No'}</td><td className="min-w-[300px] px-4 py-3 leading-5 text-slate-700">{record.q10CustomerObservation || '—'}</td></tr>; })}</tbody></table></div>{observations.length > 150 && <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Se muestran las primeras 150 observaciones para mantener una lectura ágil.</p>}</section>
    </>}
  </div></div>;
};

export default ScoringDashboard;