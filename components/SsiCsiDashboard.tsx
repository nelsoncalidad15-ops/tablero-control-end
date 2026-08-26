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

const inferredCategory = (record: SatisfactionSurveyRecord) => {
  if (record.categorizacion && record.categorizacion !== 'Sin categorizar') return record.categorizacion;
  const comment = String(record.motivo_calificacion || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/(demora|tiempo|puntual|rapidez|rapido|tardar)/.test(comment)) return 'Demora / tiempos';
  if (/(turno|agenda|cita)/.test(comment)) return 'Turnos y disponibilidad';
  if (/(filtro|repar|trabajo|servicio|calidad)/.test(comment)) return 'Calidad del trabajo';
  if (/(atencion|trato|personal|amable|respeto)/.test(comment)) return 'Atención y trato';
  if (/(respuesta|comunic|inform|seguimiento|contact)/.test(comment)) return 'Comunicación y seguimiento';
  return 'Otros comentarios';
};

const CATEGORY_COLORS = [
  { bar: '#4f46e5', pill: 'bg-indigo-100 text-indigo-700' },
  { bar: '#0891b2', pill: 'bg-cyan-100 text-cyan-700' },
  { bar: '#7c3aed', pill: 'bg-violet-100 text-violet-700' },
  { bar: '#ea580c', pill: 'bg-orange-100 text-orange-700' },
  { bar: '#e11d48', pill: 'bg-rose-100 text-rose-700' },
  { bar: '#059669', pill: 'bg-emerald-100 text-emerald-700' },
];

const categoryColor = (category: string) => {
  const index = Array.from(category).reduce((total, character) => total + character.charCodeAt(0), 0) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
};

const splitCategories = (record: SatisfactionSurveyRecord, fallbackToComment = true) => {
  const manualCategory = String(record.categorizacion || '').trim();
  if (manualCategory && manualCategory !== 'Sin categorizar') {
    return manualCategory.split(/[,;]+/).map(category => category.trim()).filter(Boolean);
  }
  return fallbackToComment ? [inferredCategory(record)] : ['Sin categorizar'];
};

const ScorePill = ({ score }: { score: number | null }) => {
  const tone = score === null ? 'bg-slate-100 text-slate-400' : score >= 9 ? 'bg-emerald-100 text-emerald-700' : score >= 7 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700';
  return <span className={`inline-flex min-w-9 justify-center rounded-lg px-2 py-1 text-xs font-black ${tone}`}>{scoreLabel(score)}</span>;
};

const MetricCard = ({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; tone: string }) => (
  <div className="rounded-[1.6rem] border border-white bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
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
    const haystack = [record.vin, record.nombre, record.modelo, record.motivo_calificacion, record.categorizacion].join(' ').toLocaleLowerCase('es');
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
    const detractors = filteredData.filter(record => {
      const score = satisfactionScore(record);
      return score !== null && score <= 8;
    }).length;
    return { general, recommendation, detractors, detractorRate: filteredData.length ? detractors / filteredData.length * 100 : 0 };
  }, [filteredData]);

  const deviations = useMemo(() => filteredData.filter(record => {
    const score = satisfactionScore(record);
    return score !== null && score <= 8;
  }), [filteredData]);

  const categories = useMemo(() => {
    const groups = new Map<string, number>();
    deviations.forEach(record => {
      splitCategories(record, program === 'CSI').forEach(category => groups.set(category, (groups.get(category) || 0) + 1));
    });
    return [...groups.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, cantidad]) => ({ name, cantidad, ...categoryColor(name) }));
  }, [deviations, program]);

  const showActionColumns = program === 'SSI' && filteredData.some(record => record.accion_correctiva || record.accion_preventiva);
  const showCauseColumn = program === 'SSI' && filteredData.some(record => record.causa_raiz);
  const resetFilters = () => { setYear(''); setSemester(''); setWave(''); setProvince(''); setChannel(''); setModel(''); setScoreRange(''); setSearch(''); };
  const scope = program === 'SSI' ? 'Ventas' : 'Postventa';

  return (
    <DashboardFrame
      title={`Encuestas ${program}`}
      subtitle={`${scope} · seguimiento de satisfacción`}
      onBack={onBack}
      isLoading={loading}
      lastUpdated={new Date().toLocaleTimeString('es-AR')}
      context={<span className="rounded-full bg-slate-950 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-white">{scope}</span>}
    >
      <div className="space-y-6 pb-10">
        <section className="overflow-hidden rounded-[2rem] bg-[linear-gradient(130deg,#0f172a,#172554_62%,#0c4a6e)] p-5 text-white shadow-[0_25px_65px_rgba(15,23,42,0.18)] md:p-7">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.42em] text-sky-300">Experiencia del cliente</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">SSI / CSI</h2>
              <p className="mt-2 max-w-xl text-sm text-slate-300">Lectura de encuestas, motivos de calificación y acciones de mejora por cada programa.</p>
            </div>
            <div className="flex rounded-2xl border border-white/15 bg-white/10 p-1.5 backdrop-blur">
              {(['SSI', 'CSI'] as SurveyProgram[]).map(item => (
                <button key={item} onClick={() => setProgram(item)} className={`rounded-xl px-5 py-3 text-xs font-black uppercase tracking-[0.18em] transition ${program === item ? 'bg-white text-slate-950 shadow-lg' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                  {item} <span className="ml-1 text-[9px] opacity-70">{item === 'SSI' ? 'Ventas' : 'Postventa'}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[1.7rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-4 ${program === 'SSI' ? 'xl:grid-cols-8' : 'xl:grid-cols-7'}`}>
            <select value={year} onChange={event => setYear(event.target.value)} className="filter-select"><option value="">Año</option>{filters.years.map(value => <option key={value}>{value}</option>)}</select>
            <select value={semester} onChange={event => setSemester(event.target.value)} className="filter-select"><option value="">Semestre</option>{filters.semesters.map(value => <option key={value}>{value}</option>)}</select>
            <select value={wave} onChange={event => setWave(event.target.value)} className="filter-select"><option value="">Ola</option>{filters.waves.map(value => <option key={value}>{value}</option>)}</select>
            <select value={province} onChange={event => setProvince(event.target.value)} className="filter-select"><option value="">Provincia</option>{filters.provinces.map(value => <option key={value}>{value}</option>)}</select>
            {program === 'SSI' && <select value={channel} onChange={event => setChannel(event.target.value)} className="filter-select"><option value="">Canal de venta</option>{filters.channels.map(value => <option key={value}>{value}</option>)}</select>}
            <select value={model} onChange={event => setModel(event.target.value)} className="filter-select"><option value="">Modelo</option>{filters.models.map(value => <option key={value}>{value}</option>)}</select>
            <select value={scoreRange} onChange={event => setScoreRange(event.target.value)} className="filter-select"><option value="">Estado de satisfacción</option><option value="compliant">Conforme · 9 a 10</option><option value="claim">Reclamo · 1 a 8</option></select>
            <div className="flex gap-2"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar VIN o motivo" className="filter-select min-w-0 flex-1" /><button onClick={resetFilters} title="Limpiar filtros" className="rounded-xl border border-slate-200 px-3 text-slate-400 transition hover:bg-slate-50 hover:text-slate-900"><Icons.X className="h-4 w-4" /></button></div>
          </div>
        </section>

        {error ? (
          <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-6 text-rose-800"><p className="font-black">No se pudieron cargar las encuestas {program}.</p><p className="mt-1 text-sm">{error}</p></div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Encuestas" value={String(filteredData.length)} detail="registros seleccionados" icon={Icons.ClipboardCheck} tone="bg-blue-50 text-blue-600" />
              <MetricCard label="Satisfacción general" value={scoreLabel(metrics.general)} detail="promedio sobre 10" icon={Icons.Star} tone="bg-amber-50 text-amber-600" />
              <MetricCard label="Recomendación" value={scoreLabel(metrics.recommendation)} detail="promedio sobre 10" icon={Icons.Heart} tone="bg-fuchsia-50 text-fuchsia-600" />
            </section>

            <div className="flex flex-wrap items-center gap-2 px-1">
              {[['', 'Todas las notas'], ['claim', 'Notas 1 a 8'], ['compliant', 'Notas 9 a 10']].map(([value, label]) => <button key={value || 'all'} onClick={() => setScoreRange(value)} className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.13em] transition ${scoreRange === value ? value === 'claim' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : value === 'compliant' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-950 text-white shadow-lg shadow-slate-200' : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800'}`}>{label}</button>)}
              <span className="ml-1 text-[10px] font-semibold text-slate-400">Las notas 1 a 8 se incluyen aunque VIN esté vacío.</span>
            </div>

            <section className="rounded-[1.7rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Icons.BarChart3 className="h-5 w-5" /></div><div><h3 className="font-black text-slate-950">Categorización de notas 1 a 8</h3><p className="text-xs text-slate-400">Frecuencia de la columna CATEGORIZACION, de mayor a menor</p></div></div>
                <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-700">{deviations.length} casos</span>
              </div>
              {categories.length ? (
                <div className="mt-6 h-[300px] min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categories} layout="vertical" margin={{ top: 4, right: 38, bottom: 4, left: 16 }} barCategoryGap="24%">
                      <XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                      <YAxis type="category" dataKey="name" width={190} axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
                      <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value: number) => [value, 'Casos']} contentStyle={{ borderRadius: 14, border: '1px solid #e2e8f0', boxShadow: '0 12px 28px rgba(15,23,42,.10)' }} />
                      <Bar dataKey="cantidad" radius={[0, 8, 8, 0]} barSize={24}>{categories.map(item => <Cell key={item.name} fill={item.bar} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm font-medium text-slate-400">No hay notas de 1 a 8 dentro de los filtros elegidos.</div>}
            </section>

            <section className="overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5"><div><h3 className="font-black text-slate-950">Detalle de encuestas {program}</h3><p className="text-xs text-slate-400">{program === 'SSI' ? 'Categorización, causa raíz y acciones asociadas' : 'Comentarios y datos de la experiencia postventa'}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">{filteredData.length} registros</span></div>
              <div className="overflow-x-auto">
                <table className={`w-full text-left ${program === 'SSI' ? 'min-w-[1320px]' : 'min-w-[850px]'}`}>
                  <thead className="bg-slate-50 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    <tr>
                      <th className="px-5 py-4">Nota</th>
                      <th className="px-5 py-4">Período</th>
                      <th className="px-5 py-4">Vehículo</th>
                      <th className="px-5 py-4">{program === 'SSI' ? 'Canal' : 'Sucursal'}</th>
                      <th className="px-5 py-4">{program === 'SSI' ? 'Categorización' : 'Motivo'}</th>
                      {showCauseColumn && <th className="px-5 py-4">Causa raíz</th>}
                      {showActionColumns && <><th className="px-5 py-4">Acción correctiva</th><th className="px-5 py-4">Prevención</th></>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map(record => (
                      <tr key={record.id} className="align-top text-sm transition-colors hover:bg-slate-50/70">
                        <td className="px-5 py-4"><ScorePill score={satisfactionScore(record)} /><span className="ml-2 text-[10px] font-bold text-slate-400">Rec. {scoreLabel(recommendationScore(record))}</span></td>
                        <td className="px-5 py-4 text-xs font-semibold text-slate-600">{record.anio || '—'}<br /><span className="font-normal text-slate-400">{record.semestre} · Ola {record.ola}</span></td>
                        <td className="px-5 py-4 text-xs font-bold text-slate-700">{record.modelo}<br /><span className="font-mono text-[10px] font-normal text-slate-400">{record.vin || 'Sin VIN'}{record.cod_id ? ` · ${record.cod_id}` : ''}</span></td>
                        <td className="px-5 py-4 text-xs text-slate-600">{program === 'SSI' ? record.canal_venta : record.provincia}<br />{program === 'CSI' && <span className="font-mono text-[10px] text-slate-400">CE {record.ce || '—'}</span>}</td>
                        <td className="max-w-xs px-5 py-4 text-xs leading-5 text-slate-600">
                          {program === 'SSI' ? <div className="flex flex-wrap gap-1.5">{splitCategories(record, false).map(category => <span key={category} className={`rounded-md px-2 py-1 text-[9px] font-black ${categoryColor(category).pill}`}>{category}</span>)}</div> : record.motivo_calificacion || '—'}
                        </td>
                        {showCauseColumn && <td className="max-w-sm px-5 py-4 text-xs leading-5 text-slate-600">{record.causa_raiz || '—'}</td>}
                        {showActionColumns && <><td className="max-w-xs px-5 py-4 text-xs leading-5 text-slate-600">{record.accion_correctiva || '—'}</td><td className="max-w-xs px-5 py-4 text-xs leading-5 text-slate-600">{record.accion_preventiva || '—'}</td></>}
                      </tr>
                    ))}
                    {filteredData.length === 0 && <tr><td colSpan={5 + Number(showCauseColumn) + (showActionColumns ? 2 : 0)} className="px-5 py-12 text-center text-sm text-slate-400">No se encontraron encuestas con los filtros seleccionados.</td></tr>}
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
