import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DashboardFrame } from './DashboardUI';
import { Icons } from './Icon';
import { fetchSatisfactionSurveyData } from '../services/dataService';
import type { SatisfactionSurveyRecord } from '../types';

type SurveyProgram = 'SSI' | 'CSI';

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
const average = (values: Array<number | null>) => {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
};
const MIN_SSI_SURVEYS = 10;
const inputNumber = (value: string) => {
  const parsed = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};
const percentLabel = (value: number) => `${value.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const scoreLabel = (score: number | null) => score === null ? '—' : score.toLocaleString('es-AR', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const readScore = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = String(value ?? '').trim().replace(',', '.');
  if (!normalized) return null;
  const score = Number(normalized.match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(score) ? score : null;
};
const satisfactionScore = (record: SatisfactionSurveyRecord) => readScore(record.satisfaccion_general ?? record['satis. general'] ?? record['satisfaccion general']);
const recommendationScore = (record: SatisfactionSurveyRecord) => readScore(record.recomendacion ?? record['recom.'] ?? record['recom']);

type SsiMetrics = { n: number; k: number; sum: number; t2b: number; general: number | null };

const calculateSsiMetrics = (records: SatisfactionSurveyRecord[]): SsiMetrics => {
  const scores = records.map(satisfactionScore).filter((score): score is number => score !== null);
  const n = scores.length;
  const k = scores.filter(score => score >= 9 && score <= 10).length;
  const sum = scores.reduce((total, score) => total + score, 0);
  return { n, k, sum, t2b: n ? k / n * 100 : 0, general: n ? sum / n : null };
};

const calculateProjection = (metrics: SsiMetrics, target: number | null, futureScore: number | null) => {
  const minimumNeeded = Math.max(0, MIN_SSI_SURVEYS - metrics.n);
  if (target === null || futureScore === null) return { valid: false, message: 'Indicá el objetivo T2B y la nota esperada para proyectar.' };
  if (target < 0 || target > 100 || futureScore < 0 || futureScore > 10) return { valid: false, message: 'Usá un objetivo entre 0 y 100% y una nota entre 0 y 10.' };

  const countsAsTopBox = futureScore >= 9 ? 1 : 0;
  let objectiveNeeded = 0;
  if (metrics.t2b + 1e-9 < target) {
    if (!countsAsTopBox || target >= 100) return { valid: false, message: 'Ese objetivo no puede alcanzarse con la nota futura indicada.' };
    objectiveNeeded = Math.max(0, Math.ceil(((target / 100 * metrics.n) - metrics.k) / (1 - target / 100)));
  }

  const needed = Math.max(objectiveNeeded, minimumNeeded);
  const projectedN = metrics.n + needed;
  const projectedK = metrics.k + countsAsTopBox * needed;
  const projectedSum = metrics.sum + futureScore * needed;
  const projectedT2B = projectedN ? projectedK / projectedN * 100 : 0;
  if (projectedT2B + 1e-9 < target) return { valid: false, message: 'La nota futura no sostiene el objetivo mientras completa el mínimo de encuestas.' };
  return {
    valid: true,
    needed,
    objectiveNeeded,
    minimumNeeded,
    t2b: projectedT2B,
    general: projectedN ? projectedSum / projectedN : null,
    message: needed === 0
      ? 'El objetivo y el mínimo semestral ya están alcanzados.'
      : `Se proyectan ${needed} respuesta(s) adicional(es) con nota ${scoreLabel(futureScore)}.`
  };
};

const evaluateSsiReference = (metrics: SsiMetrics, top5: number | null, marketT2B: number | null, marketGeneral: number | null) => {
  if (top5 === null) return null;
  if (top5 < 0 || top5 > 100 || (marketT2B !== null && (marketT2B < 0 || marketT2B > 100)) || (marketGeneral !== null && (marketGeneral < 0 || marketGeneral > 10))) {
    return { tone: 'bg-amber-50 text-amber-700', text: 'Revisá los valores de referencia ingresados.' };
  }
  if (metrics.t2b + 1e-9 >= top5) return { tone: 'bg-emerald-50 text-emerald-700', text: 'La referencia Top 5 está alcanzada.' };
  if (marketT2B === null) return { tone: 'bg-amber-50 text-amber-700', text: `Faltan ${(top5 - metrics.t2b).toFixed(1)} p.p. para la referencia Top 5.` };
  if (metrics.t2b + 1e-9 >= marketT2B) return { tone: 'bg-emerald-50 text-emerald-700', text: 'No alcanza Top 5, pero cumple la media de mercado T2B.' };
  if (marketGeneral === null || metrics.general === null) return { tone: 'bg-amber-50 text-amber-700', text: 'Para completar la evaluación, ingresá la media general de mercado.' };
  return metrics.general + 1e-9 >= marketGeneral
    ? { tone: 'bg-amber-50 text-amber-700', text: 'Escenario orientativo: nivel 25% de ecualización.' }
    : { tone: 'bg-rose-50 text-rose-700', text: 'Escenario orientativo: nivel 50% de ecualización.' };
};

const isUncategorized = (value: unknown) => {
  const normalized = String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  return !normalized || normalized === 'sin categorizar' || normalized === 'sin categoria';
};

const inferredCategory = (record: SatisfactionSurveyRecord) => {
  if (!isUncategorized(record.categorizacion)) return record.categorizacion;
  const comment = String(record.motivo_calificacion || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/(demora|tiempo|puntual|rapidez|rapido|tardar)/.test(comment)) return 'Demora / tiempos';
  if (/(turno|agenda|cita)/.test(comment)) return 'Turnos y disponibilidad';
  if (/(filtro|repar|trabajo|servicio|calidad)/.test(comment)) return 'Calidad del trabajo';
  if (/(atencion|trato|personal|amable|respeto)/.test(comment)) return 'Atención y trato';
  if (/(respuesta|comunic|inform|seguimiento|contact)/.test(comment)) return 'Comunicación y seguimiento';
  return 'Otros';
};

const CATEGORY_COLORS = [
  { bar: '#a5b4fc', pill: 'bg-indigo-100/80 text-indigo-700' },
  { bar: '#67e8f9', pill: 'bg-cyan-100/80 text-cyan-700' },
  { bar: '#c4b5fd', pill: 'bg-violet-100/80 text-violet-700' },
  { bar: '#fdba74', pill: 'bg-orange-100/80 text-orange-700' },
  { bar: '#fda4af', pill: 'bg-rose-100/80 text-rose-700' },
  { bar: '#6ee7b7', pill: 'bg-emerald-100/80 text-emerald-700' },
];

const categoryColor = (category: string) => {
  const index = Array.from(category).reduce((total, character) => total + character.charCodeAt(0), 0) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
};

const splitCategories = (record: SatisfactionSurveyRecord) => {
  const manualCategory = String(record.categorizacion || '').trim();
  if (!isUncategorized(manualCategory)) {
    return manualCategory.split(/[,;]+/).map(category => category.trim()).filter(Boolean);
  }
  return [inferredCategory(record)];
};

const clientCategories = (record: SatisfactionSurveyRecord) =>
  splitCategories(record).filter(category => category !== 'Otros');

const ScorePill = ({ score }: { score: number | null }) => {
  const tone = score === null ? 'bg-slate-100 text-slate-400' : score >= 9 ? 'bg-emerald-100/80 text-emerald-700' : score >= 7 ? 'bg-amber-100/80 text-amber-700' : 'bg-rose-100/80 text-rose-700';
  return <span className={`inline-flex min-w-9 justify-center rounded-lg px-2 py-1 text-xs font-black ${tone}`}>{scoreLabel(score)}</span>;
};

const MetricCard = ({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; tone: string }) => (
  <div className="rounded-[1.6rem] border border-white/80 bg-white/75 p-5 shadow-[0_12px_30px_rgba(100,116,139,0.08)] backdrop-blur-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
        <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{value}</p>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{detail}</p>
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><Icon className="h-5 w-5" /></div>
    </div>
  </div>
);

interface SsiCsiDashboardProps {
  onBack: () => void;
}

const SsiCsiDashboard: React.FC<SsiCsiDashboardProps> = ({ onBack }) => {
  const [program, setProgram] = useState<SurveyProgram>('SSI');
  const [data, setData] = useState<SatisfactionSurveyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [wave, setWave] = useState('');
  const [province, setProvince] = useState('');
  const [channel, setChannel] = useState('');
  const [model, setModel] = useState('');
  const [scoreRange, setScoreRange] = useState('');
  const [search, setSearch] = useState('');
  const [targetT2B, setTargetT2B] = useState('');
  const [futureScore, setFutureScore] = useState('10');
  const [top5T2B, setTop5T2B] = useState('');
  const [marketT2B, setMarketT2B] = useState('');
  const [marketGeneral, setMarketGeneral] = useState('');

  useEffect(() => {
    let mounted = true;
    const source = program === 'SSI' ? 'ssi_surveys' : 'csi_surveys';
    setLoading(true);
    setError('');
    setData([]);
    void fetchSatisfactionSurveyData(source)
      .then(records => { if (mounted) setData(records); })
      .catch((requestError: unknown) => {
        if (mounted) setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar las encuestas.');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [program]);

  const filters = useMemo(() => ({
    years: unique(data.map(record => record.anio ? String(record.anio) : '')),
    semesters: unique(data.map(record => record.semestre)),
    waves: unique(data.map(record => record.ola)),
    provinces: unique(data.map(record => record.provincia)),
    channels: unique(data.map(record => record.canal_venta)),
    models: unique(data.map(record => record.modelo)),
  }), [data]);

  const filteredData = useMemo(() => data.filter(record => {
    const score = satisfactionScore(record);
    const matchesScore = !scoreRange || (score !== null && (
      scoreRange === 'claim' ? score <= 8 : score >= 9
    ));
    const haystack = [record.vin, record.modelo, record.categorizacion].join(' ').toLocaleLowerCase('es');
    return (!year || String(record.anio) === year)
      && (!semester || record.semestre === semester)
      && (!wave || record.ola === wave)
      && (!province || record.provincia === province)
      && (program === 'CSI' || !channel || record.canal_venta === channel)
      && (!model || record.modelo === model)
      && matchesScore
      && (!search.trim() || haystack.includes(search.trim().toLocaleLowerCase('es')));
  }), [data, year, semester, wave, province, channel, model, scoreRange, search, program]);

  const metrics = useMemo(() => {
    const general = average(filteredData.map(satisfactionScore));
    const recommendation = average(filteredData.map(recommendationScore));
    return { general, recommendation };
  }, [filteredData]);

  const ssiMetrics = useMemo(() => calculateSsiMetrics(filteredData), [filteredData]);
  const projection = useMemo(() => calculateProjection(ssiMetrics, inputNumber(targetT2B), inputNumber(futureScore)), [ssiMetrics, targetT2B, futureScore]);
  const referenceEvaluation = useMemo(() => evaluateSsiReference(ssiMetrics, inputNumber(top5T2B), inputNumber(marketT2B), inputNumber(marketGeneral)), [ssiMetrics, top5T2B, marketT2B, marketGeneral]);

  const deviations = useMemo(() => filteredData.filter(record => {
    const score = satisfactionScore(record);
    return score !== null && score <= 8;
  }), [filteredData]);

  const categories = useMemo(() => {
    const groups = new Map<string, number>();
    deviations.forEach(record => {
      clientCategories(record).forEach(category => groups.set(category, (groups.get(category) || 0) + 1));
    });
    return [...groups.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, cantidad]) => ({ name, cantidad, ...categoryColor(name) }));
  }, [deviations, program]);

  const categorizedDeviationCount = useMemo(() => deviations.filter(record => clientCategories(record).length > 0).length, [deviations]);

  const resetFilters = () => { setYear(''); setSemester(''); setWave(''); setProvince(''); setChannel(''); setModel(''); setScoreRange(''); setSearch(''); };
  const scope = program === 'SSI' ? 'Ventas' : 'Postventa';

  return (
    <DashboardFrame
      title={`Encuestas ${program}`}
      subtitle={`${scope} · experiencia del cliente`}
      onBack={onBack}
      isLoading={loading}
      lastUpdated={new Date().toLocaleTimeString('es-AR')}
      context={<span className="rounded-full bg-indigo-100 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-indigo-700">{scope}</span>}
    >
      <div className="space-y-6 bg-[radial-gradient(circle_at_top_right,#fce7f3_0,transparent_28%),radial-gradient(circle_at_top_left,#e0f2fe_0,transparent_32%)] pb-10">
        <section className="overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(120deg,#eef2ff,#fdf2f8_52%,#ecfeff)] p-5 text-slate-900 shadow-[0_20px_50px_rgba(148,163,184,0.13)] md:p-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.42em] text-indigo-500">Experiencia del cliente</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">SSI / CSI</h2>
              <p className="mt-2 max-w-xl text-sm text-slate-500">Resumen claro de satisfacción y oportunidades de mejora.</p>
            </div>
            <div className="flex rounded-2xl border border-white/80 bg-white/70 p-1.5 shadow-sm backdrop-blur">
              {(['SSI', 'CSI'] as SurveyProgram[]).map(item => (
                <button key={item} onClick={() => setProgram(item)} className={`rounded-xl px-5 py-3 text-xs font-black uppercase tracking-[0.18em] transition ${program === item ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' : 'text-slate-500 hover:bg-white hover:text-indigo-600'}`}>
                  {item} <span className="ml-1 text-[9px] opacity-70">{item === 'SSI' ? 'Ventas' : 'Postventa'}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[1.7rem] border border-white/80 bg-white/75 p-4 shadow-[0_12px_30px_rgba(148,163,184,0.08)] backdrop-blur-sm">
          <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${program === 'SSI' ? 'xl:grid-cols-8' : 'xl:grid-cols-7'}`}>
            <select value={year} onChange={event => setYear(event.target.value)} className="filter-select"><option value="">Año</option>{filters.years.map(value => <option key={value}>{value}</option>)}</select>
            <select value={semester} onChange={event => setSemester(event.target.value)} className="filter-select"><option value="">Semestre</option>{filters.semesters.map(value => <option key={value}>{value}</option>)}</select>
            <select value={wave} onChange={event => setWave(event.target.value)} className="filter-select"><option value="">Ola</option>{filters.waves.map(value => <option key={value}>{value}</option>)}</select>
            <select value={province} onChange={event => setProvince(event.target.value)} className="filter-select"><option value="">Provincia</option>{filters.provinces.map(value => <option key={value}>{value}</option>)}</select>
            {program === 'SSI' && <select value={channel} onChange={event => setChannel(event.target.value)} className="filter-select"><option value="">Canal de venta</option>{filters.channels.map(value => <option key={value}>{value}</option>)}</select>}
            <select value={model} onChange={event => setModel(event.target.value)} className="filter-select"><option value="">Modelo</option>{filters.models.map(value => <option key={value}>{value}</option>)}</select>
            <select value={scoreRange} onChange={event => setScoreRange(event.target.value)} className="filter-select"><option value="">Estado de satisfacción</option><option value="compliant">Conforme · 9 a 10</option><option value="claim">Desvío · 1 a 8</option></select>
            <div className="flex gap-2"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar VIN o modelo" className="filter-select min-w-0 flex-1" /><button onClick={resetFilters} title="Limpiar filtros" className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-indigo-400 transition hover:bg-indigo-100 hover:text-indigo-700"><Icons.X className="h-4 w-4" /></button></div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6 text-rose-800"><p className="font-black">No se pudieron cargar las encuestas {program}.</p><p className="mt-1 text-sm">{error}</p></div>
        ) : (
          <>
            <section className={`grid gap-4 ${program === 'SSI' ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
              <MetricCard label="Encuestas" value={String(filteredData.length)} detail="registros seleccionados" icon={Icons.ClipboardCheck} tone="bg-sky-100 text-sky-600" />
              <MetricCard label="Satisfacción general" value={scoreLabel(metrics.general)} detail="promedio sobre 10" icon={Icons.Star} tone="bg-amber-100 text-amber-600" />
              <MetricCard label="Recomendación" value={scoreLabel(metrics.recommendation)} detail="promedio sobre 10" icon={Icons.Heart} tone="bg-pink-100 text-pink-600" />
              {program === 'SSI' && <MetricCard label="T2B" value={percentLabel(ssiMetrics.t2b)} detail={`${ssiMetrics.k} respuestas de 9 a 10`} icon={Icons.Target} tone="bg-violet-100 text-violet-600" />}
            </section>

            {program === 'SSI' && <section className="rounded-[1.7rem] border border-white/80 bg-white/75 p-6 shadow-[0_12px_30px_rgba(148,163,184,0.08)] backdrop-blur-sm">
              <div className="flex items-center gap-3"><div className="rounded-xl bg-sky-100 p-2.5 text-sky-600"><Icons.TrendingUp className="h-5 w-5" /></div><div><h3 className="font-black text-slate-950">Simulador SSI</h3><p className="text-xs text-slate-400">Proyección basada en las encuestas seleccionadas</p></div></div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <label className="text-xs font-bold text-slate-500">Objetivo T2B (%)<input value={targetT2B} onChange={event => setTargetT2B(event.target.value)} inputMode="decimal" placeholder="Ej. 85" className="filter-select mt-1" /></label>
                <label className="text-xs font-bold text-slate-500">Nota futura (0 a 10)<input value={futureScore} onChange={event => setFutureScore(event.target.value)} inputMode="decimal" className="filter-select mt-1" /></label>
                <div className="rounded-2xl bg-violet-50 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-violet-500">Base actual</p><p className="mt-1 text-xl font-black text-violet-900">{ssiMetrics.n} / {MIN_SSI_SURVEYS}</p><p className="text-[10px] font-semibold text-violet-500">encuestas mínimas</p></div>
                <div className="rounded-2xl bg-sky-50 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-sky-500">Respuestas necesarias</p><p className="mt-1 text-xl font-black text-sky-900">{projection.valid ? projection.needed : '—'}</p><p className="text-[10px] font-semibold text-sky-500">para objetivo y mínimo</p></div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-sky-500">T2B proyectado</p><p className="mt-1 text-2xl font-black text-sky-900">{projection.valid ? percentLabel(projection.t2b ?? 0) : '—'}</p></div>
                <div className="rounded-2xl border border-pink-100 bg-pink-50/60 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-pink-500">Satisfacción proyectada</p><p className="mt-1 text-2xl font-black text-pink-900">{projection.valid ? scoreLabel(projection.general ?? null) : '—'}</p></div>
              </div>
              <p className={`mt-3 rounded-xl px-4 py-3 text-xs font-semibold ${projection.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>{projection.message}</p>

              <div className="mt-5 border-t border-slate-100 pt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Referencia de mercado (opcional)</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="text-xs font-bold text-slate-500">Referencia Top 5 (%)<input value={top5T2B} onChange={event => setTop5T2B(event.target.value)} inputMode="decimal" placeholder="Ej. 84,5" className="filter-select mt-1" /></label>
                  <label className="text-xs font-bold text-slate-500">Media mercado T2B (%)<input value={marketT2B} onChange={event => setMarketT2B(event.target.value)} inputMode="decimal" placeholder="Ej. 78" className="filter-select mt-1" /></label>
                  <label className="text-xs font-bold text-slate-500">Media general mercado (0 a 10)<input value={marketGeneral} onChange={event => setMarketGeneral(event.target.value)} inputMode="decimal" placeholder="Ej. 8,6" className="filter-select mt-1" /></label>
                </div>
                {referenceEvaluation && <p className={`mt-3 rounded-xl px-4 py-3 text-xs font-bold ${referenceEvaluation.tone}`}>{referenceEvaluation.text}</p>}
              </div>
            </section>}

            <section className="rounded-[1.7rem] border border-white/80 bg-white/75 p-6 shadow-[0_12px_30px_rgba(148,163,184,0.08)] backdrop-blur-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3"><div className="rounded-xl bg-violet-100 p-2.5 text-violet-600"><Icons.BarChart3 className="h-5 w-5" /></div><div><h3 className="font-black text-slate-950">Desvíos por categoría</h3><p className="text-xs text-slate-400">Distribución de calificaciones de 1 a 8</p></div></div>
                <span className="rounded-full bg-violet-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-violet-700">{categorizedDeviationCount} casos</span>
              </div>
              {categories.length ? (
                <div className="mt-6 h-[300px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories} layout="vertical" margin={{ top: 4, right: 38, bottom: 4, left: 16 }} barCategoryGap="24%">
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                      <YAxis type="category" dataKey="name" width={190} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                      <Tooltip cursor={{ fill: '#f5f3ff' }} formatter={(value: number) => [value, 'Casos']} contentStyle={{ borderRadius: 14, border: '1px solid #ede9fe', boxShadow: '0 12px 28px rgba(148,163,184,.14)' }} />
                      <Bar dataKey="cantidad" radius={[0, 8, 8, 0]} barSize={24}>{categories.map(item => <Cell key={item.name} fill={item.bar} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-400">No hay notas de 1 a 8 dentro de los filtros elegidos.</div>}
            </section>

            <section className="overflow-hidden rounded-[1.7rem] border border-white/80 bg-white/75 shadow-[0_12px_30px_rgba(148,163,184,0.08)] backdrop-blur-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5"><div><h3 className="font-black text-slate-950">Resumen de encuestas {program}</h3><p className="text-xs text-slate-400">Información esencial de cada respuesta</p></div><span className="rounded-full bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-700">{filteredData.length} registros</span></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-5 py-4">Nota</th>
                      <th className="px-5 py-4">Período</th>
                      <th className="px-5 py-4">Vehículo</th>
                      <th className="px-5 py-4">{program === 'SSI' ? 'Canal' : 'Sucursal'}</th>
                      <th className="px-5 py-4">Categoría</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map(record => (
                      <tr key={record.id} className="align-top text-sm transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4"><ScorePill score={satisfactionScore(record)} /></td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">{record.anio || '—'}<br /><span className="font-normal text-slate-400">{record.semestre} · Ola {record.ola}</span></td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-700">{record.modelo}<br /><span className="font-mono text-[10px] font-normal text-slate-400">{record.vin || 'Sin VIN'}</span></td>
                        <td className="px-5 py-4 text-xs text-slate-600">{program === 'SSI' ? record.canal_venta : record.provincia}</td>
                        <td className="max-w-xs px-5 py-4">{clientCategories(record).length ? <div className="flex flex-wrap gap-1.5">{clientCategories(record).map(category => <span key={category} className={`rounded-md px-2 py-1 text-[9px] font-black ${categoryColor(category).pill}`}>{category}</span>)}</div> : <span className="text-xs text-slate-300">—</span>}</td>
                      </tr>
                    ))}
                    {filteredData.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-400">No se encontraron encuestas con los filtros seleccionados.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </DashboardFrame>
  );
};

export default SsiCsiDashboard;
