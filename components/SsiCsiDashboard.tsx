import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Heart,
  HelpCircle,
  LayoutGrid,
  ListFilter,
  MessageSquareText,
  RotateCcw,
  Search,
  Settings2,
  SlidersHorizontal,
  Star,
  Table as TableIcon,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { DashboardFrame } from './DashboardUI';
import { fetchSatisfactionSurveyData } from '../services/dataService';
import type { SatisfactionSurveyRecord } from '../types';
import { splitClubCategories, clubScore } from '../services/clubSsi';

type SurveyProgram = 'SSI' | 'CSI';
type FilterKey = 'year' | 'semester' | 'wave' | 'province' | 'channel' | 'model';
type Filters = Record<FilterKey, string>;
/** '' = todas · 'ok' = 9 a 10 · 'dev' = 0 a 8 · '0'..'10' = nota exacta */
type ScoreFilter = string;
type SortMode = 'worst' | 'best' | 'recent';

interface Row {
  record: SatisfactionSurveyRecord;
  sat: number | null;
  rec: number | null;
  comment: string;
  categories: string[];
  categoryKeys: Set<string>;
  period: string;
  periodOrder: number;
  haystack: string;
  index: number;
}

interface VwBenchmarks {
  top5T2B: number; // Porcentaje ej 85.0
  marketT2B: number; // Porcentaje ej 78.0
  marketScore: number; // Escala 0-10 ej 8.5
}

const DEFAULT_BENCHMARKS: VwBenchmarks = {
  top5T2B: 85.0,
  marketT2B: 78.0,
  marketScore: 8.5,
};

const STORAGE_KEY_BENCHMARKS_SSI = 'autosol_ssi_benchmarks_v1';
const STORAGE_KEY_BENCHMARKS_CSI = 'autosol_csi_benchmarks_v1';

const getInitialBenchmarks = (prog: SurveyProgram): VwBenchmarks => {
  try {
    const key = prog === 'SSI' ? STORAGE_KEY_BENCHMARKS_SSI : STORAGE_KEY_BENCHMARKS_CSI;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.top5T2B === 'number') return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_BENCHMARKS;
};

const saveBenchmarks = (prog: SurveyProgram, b: VwBenchmarks) => {
  try {
    const key = prog === 'SSI' ? STORAGE_KEY_BENCHMARKS_SSI : STORAGE_KEY_BENCHMARKS_CSI;
    localStorage.setItem(key, JSON.stringify(b));
  } catch {
    // ignore
  }
};

const EMPTY_FILTERS: Filters = { year: '', semester: '', wave: '', province: '', channel: '', model: '' };
const PAGE_SIZE = 15;

const FIELDS: { key: FilterKey; label: string; get: (record: SatisfactionSurveyRecord) => string; ssiOnly?: boolean }[] = [
  { key: 'year', label: 'Año', get: record => (record.anio ? String(record.anio) : '') },
  { key: 'semester', label: 'Semestre', get: record => record.semestre },
  { key: 'wave', label: 'Ola', get: record => record.ola },
  { key: 'province', label: 'Provincia', get: record => record.provincia },
  { key: 'channel', label: 'Canal', get: record => record.canal_venta, ssiOnly: true },
  { key: 'model', label: 'Modelo', get: record => record.modelo },
];

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const unique = (values: string[]) =>
  [...new Set(values.filter(value => value && !value.startsWith('Sin ')))].sort((a, b) =>
    a.localeCompare(b, 'es', { numeric: true })
  );

const average = (values: Array<number | null>) => {
  const valid = values.filter((value): value is number => value !== null && !isNaN(value));
  return {
    value: valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null,
    base: valid.length,
  };
};

/** Formateador a 2 decimales para análisis gerencial */
const fmt2 = (val: number | null) =>
  val === null
    ? '—'
    : val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPct = (val: number | null) =>
  val === null
    ? '—'
    : `${val.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const formatVin = (vin?: string) => {
  if (!vin || !vin.trim() || vin.startsWith('Sin ')) return '—';
  return vin.trim();
};

const firstNumber = (value: string) => Number(value.match(/\d+/)?.[0] || 0);

const band = (score: number | null) => (score === null ? 'none' : score >= 9 ? 'ok' : score >= 7 ? 'mid' : 'low');
const BAND_BADGE = {
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200 border-emerald-200',
  mid: 'bg-amber-50 text-amber-700 ring-amber-200 border-amber-200',
  low: 'bg-rose-50 text-rose-700 ring-rose-200 border-rose-200',
  none: 'bg-slate-50 text-slate-400 ring-slate-200 border-slate-200',
} as const;

const matchesScore = (score: number | null, filter: ScoreFilter) => {
  if (!filter) return true;
  if (score === null) return false;
  if (filter === 'ok') return score >= 9;
  if (filter === 'dev') return score <= 8;
  return score === Number(filter);
};

const scoreFilterLabel = (filter: ScoreFilter) =>
  filter === 'ok' ? 'Conformes 9–10' : filter === 'dev' ? 'Desvíos 0–8' : `Nota ${filter}`;

const cardStyle = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm transition';
const selectClass =
  'h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100';

const Segmented = <T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  label: string;
}) => (
  <div role="group" aria-label={label} className="flex shrink-0 rounded-xl bg-slate-100 p-1">
    {options.map(option => (
      <button
        key={option.value}
        type="button"
        aria-pressed={value === option.value}
        onClick={() => onChange(option.value)}
        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
          value === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const ScoreBadge = ({ label, score }: { label: string; score: number | null }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${
      BAND_BADGE[band(score)]
    }`}
  >
    <span className="opacity-70 text-[10px]">{label}</span>
    <b className="tabular-nums">{score ?? '—'}</b>
  </span>
);

interface SsiCsiDashboardProps {
  onBack: () => void;
}

const SsiCsiDashboard: React.FC<SsiCsiDashboardProps> = ({ onBack }) => {
  const [program, setProgram] = useState<SurveyProgram>('SSI');
  const [data, setData] = useState<SatisfactionSurveyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  // Benchmarks VW
  const [benchmarks, setBenchmarks] = useState<VwBenchmarks>(() => getInitialBenchmarks('SSI'));
  const [isEditingBenchmarks, setIsEditingBenchmarks] = useState(false);
  const [tempBenchmarks, setTempBenchmarks] = useState<VwBenchmarks>(benchmarks);

  // Filtros
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Simulador
  const [showSimulator, setShowSimulator] = useState(false);
  const [futureScore, setFutureScore] = useState<number>(10);
  const [additionalSurveys, setAdditionalSurveys] = useState<number>(5);

  // Tabla / Vista
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [onlyWithComment, setOnlyWithComment] = useState(false);
  const [sort, setSort] = useState<SortMode>('worst');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loaded = getInitialBenchmarks(program);
    setBenchmarks(loaded);
    setTempBenchmarks(loaded);
  }, [program]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    setData([]);
    void fetchSatisfactionSurveyData(program === 'SSI' ? 'ssi_surveys' : 'csi_surveys')
      .then(records => {
        if (mounted) setData(records);
      })
      .catch((requestError: unknown) => {
        if (mounted)
          setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar las encuestas.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [program, attempt]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setExpandedComments({});
  }, [program, filters, scoreFilter, category, search, onlyWithComment, sort]);

  const fields = FIELDS.filter(field => !field.ssiOnly || program === 'SSI');

  const rows = useMemo<Row[]>(() => {
    return data.map((record, index) => {
      const categories = splitClubCategories(record.categorizacion || '');
      const comment = String(record.motivo_calificacion || '').trim();
      const semester = firstNumber(record.semestre || '');
      const wave = firstNumber(record.ola || '');
      return {
        record,
        sat: clubScore(String(record.satisfaccion_general ?? '')),
        rec: clubScore(String(record.recomendacion ?? '')),
        comment,
        categories,
        categoryKeys: new Set(categories.map(normalize)),
        period: [record.anio || '', semester ? `S${semester}` : '', wave ? `Ola ${wave}` : ''].filter(Boolean).join(' · '),
        periodOrder: (record.anio || 0) * 10000 + semester * 100 + wave,
        haystack: normalize([comment, record.modelo, record.vin, record.categorizacion].join(' ')),
        index,
      };
    });
  }, [data]);

  const options = useMemo(
    () =>
      Object.fromEntries(
        FIELDS.map(field => [field.key, unique(data.map(field.get))])
      ) as Record<FilterKey, string[]>,
    [data]
  );

  const matches = (row: Row, skip?: 'category' | 'score') => {
    for (const field of fields) {
      const value = filters[field.key];
      if (value && field.get(row.record) !== value) return false;
    }
    const term = normalize(search);
    if (term && !row.haystack.includes(term)) return false;
    if (
      skip !== 'category' &&
      category &&
      (category === '__none' ? row.categoryKeys.size > 0 : !row.categoryKeys.has(category))
    )
      return false;
    if (skip !== 'score' && !matchesScore(row.sat, scoreFilter)) return false;
    return true;
  };

  const filtered = useMemo(() => rows.filter(row => matches(row)), [
    rows,
    filters,
    search,
    category,
    scoreFilter,
    program,
  ]);

  const categoryBase = useMemo(() => rows.filter(row => matches(row, 'category')), [
    rows,
    filters,
    search,
    scoreFilter,
    program,
  ]);

  // Indicadores Principales Gerenciales
  const kpis = useMemo(() => {
    // Encuestas válidas: total de encuestas con Satis. General numérico válido (0 a 10)
    const validSatRows = filtered.filter(row => row.sat !== null);
    const validCount = validSatRows.length;

    // T2B: notas 9 o 10
    const top2BoxCount = validSatRows.filter(row => row.sat !== null && row.sat >= 9).length;
    const t2bPercent = validCount > 0 ? (top2BoxCount / validCount) * 100 : null;

    // Satisfacción General promedio
    const satAvg = average(filtered.map(row => row.sat));

    // Recomendación promedio
    const recAvg = average(filtered.map(row => row.rec));

    // Brecha frente al Top 5 (puntos porcentuales)
    const gapTop5 =
      t2bPercent !== null && typeof benchmarks.top5T2B === 'number'
        ? t2bPercent - benchmarks.top5T2B
        : null;

    // Brecha frente a Media de Mercado
    const gapMarket =
      t2bPercent !== null && typeof benchmarks.marketT2B === 'number'
        ? t2bPercent - benchmarks.marketT2B
        : null;

    return {
      validCount,
      totalCount: filtered.length,
      top2BoxCount,
      t2bPercent,
      satAvg: satAvg.value,
      satBase: satAvg.base,
      recAvg: recAvg.value,
      recBase: recAvg.base,
      gapTop5,
      gapMarket,
      withComment: filtered.filter(row => row.comment).length,
    };
  }, [filtered, benchmarks]);

  // Gráfico de Desvíos por Categoría
  const categoryStats = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; name: string; mentions: number; uniqueRows: Set<string> }
    >();

    categoryBase.forEach(row => {
      row.categories.forEach(name => {
        const key = normalize(name);
        const item = groups.get(key) || { key, name, mentions: 0, uniqueRows: new Set<string>() };
        item.mentions++;
        item.uniqueRows.add(row.record.id);
        groups.set(key, item);
      });
    });

    const list = [...groups.values()]
      .map(item => ({
        key: item.key,
        name: item.name,
        mentions: item.mentions,
        uniqueCount: item.uniqueRows.size,
      }))
      .sort((a, b) => b.uniqueCount - a.uniqueCount || b.mentions - a.mentions || a.name.localeCompare(b.name, 'es'));

    const categorizedRows = categoryBase.filter(row => row.categoryKeys.size > 0).length;
    const maxUnique = list[0]?.uniqueCount || 1;

    return {
      list,
      categorizedRows,
      uncategorizedRows: categoryBase.length - categorizedRows,
      maxUnique,
    };
  }, [categoryBase]);

  // Simulador SSI Proyecciones
  const simulation = useMemo(() => {
    const K = kpis.top2BoxCount;
    const N = kpis.validCount;
    const E = Math.max(0, additionalSurveys || 0);
    const Q = futureScore >= 9 ? 1 : 0;

    const projectedN = N + E;
    const projectedK = K + E * Q;
    const projectedT2B = projectedN > 0 ? (projectedK / projectedN) * 100 : 0;

    // Promedio proyectado
    const currentSum = filtered
      .filter(row => row.sat !== null)
      .reduce((acc, row) => acc + (row.sat as number), 0);
    const projectedAvg = projectedN > 0 ? (currentSum + E * futureScore) / projectedN : 0;

    // Mínimo de 10 encuestas semestrales
    const minSemestral = 10;
    const minPending = Math.max(0, minSemestral - N);

    // Encuestas requeridas para alcanzar Top 5 con nota 9-10
    const targetFraction = benchmarks.top5T2B / 100;
    let requiredForTarget: number | null = null;
    let achievable = true;

    if (futureScore >= 9) {
      if (kpis.t2bPercent !== null && kpis.t2bPercent >= benchmarks.top5T2B) {
        requiredForTarget = 0;
      } else if (targetFraction < 1) {
        // (K + E) / (N + E) >= t  =>  E(1 - t) >= tN - K  =>  E >= (tN - K)/(1 - t)
        const needed = Math.ceil((targetFraction * N - K) / (1 - targetFraction));
        requiredForTarget = Math.max(0, needed);
      }
    } else {
      achievable = false;
    }

    return {
      projectedN,
      projectedT2B,
      projectedAvg,
      minPending,
      minSemestral,
      requiredForTarget,
      achievable,
    };
  }, [kpis, additionalSurveys, futureScore, benchmarks, filtered]);

  // Lista de comentarios/encuestas ordenadas
  const commentRows = useMemo(() => {
    let list = filtered;
    if (onlyWithComment) {
      list = list.filter(row => row.comment);
    }
    const sorted = [...list];
    if (sort === 'worst') {
      sorted.sort((a, b) => ((a.sat ?? 99) - (b.sat ?? 99)) || (a.rec ?? 99) - (b.rec ?? 99) || b.index - a.index);
    } else if (sort === 'best') {
      sorted.sort((a, b) => ((b.sat ?? -1) - (a.sat ?? -1)) || (b.rec ?? -1) - (a.rec ?? -1) || b.index - a.index);
    } else {
      sorted.sort((a, b) => b.index - a.index);
    }
    return sorted;
  }, [filtered, onlyWithComment, sort]);

  const toggleCategory = (key: string) => setCategory(current => (current === key ? '' : key));
  const setFilter = (key: FilterKey, value: string) => setFilters(current => ({ ...current, [key]: value }));
  const resetAll = () => {
    setFilters(EMPTY_FILTERS);
    setScoreFilter('');
    setCategory('');
    setSearch('');
  };

  const changeProgram = (next: SurveyProgram) => {
    if (next !== program) {
      resetAll();
      setProgram(next);
    }
  };

  const toggleCommentExpand = (id: string) => {
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activeCategoryObj = categoryStats.list.find(i => i.key === category);
  const categoryHeaderTitle =
    category === '__none'
      ? 'Encuestas sin categorizar'
      : activeCategoryObj
      ? `Comentarios de clientes – ${activeCategoryObj.name}`
      : `Resumen de encuestas ${program}`;

  const chips = [
    ...fields
      .filter(field => filters[field.key])
      .map(field => ({
        id: field.key,
        label: `${field.label}: ${filters[field.key]}`,
        clear: () => setFilter(field.key, ''),
      })),
    ...(scoreFilter ? [{ id: 'score', label: scoreFilterLabel(scoreFilter), clear: () => setScoreFilter('') }] : []),
    ...(category
      ? [
          {
            id: 'category',
            label: category === '__none' ? 'Sin categorizar' : activeCategoryObj?.name || category,
            clear: () => setCategory(''),
          },
        ]
      : []),
    ...(search.trim() ? [{ id: 'search', label: `“${search.trim()}”`, clear: () => setSearch('') }] : []),
  ];

  const panelFilterCount = fields.filter(field => filters[field.key]).length;
  const scope = program === 'SSI' ? 'Ventas' : 'Postventa';

  return (
    <DashboardFrame
      title={`SSI / CSI · Autosol Intelligence`}
      subtitle={`Gestión y análisis de encuestas ${program} (${scope})`}
      onBack={onBack}
      className="bg-slate-50/60"
    >
      <div className="mx-auto w-full max-w-7xl space-y-4 pb-12">
        {/* Barra superior de herramientas y filtros */}
        <section className={`${cardStyle} space-y-2.5 p-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              label="Programa"
              value={program}
              onChange={changeProgram}
              options={[
                {
                  value: 'SSI',
                  label: (
                    <>
                      SSI <span className="hidden font-normal text-slate-400 sm:inline">Ventas</span>
                    </>
                  ),
                },
                {
                  value: 'CSI',
                  label: (
                    <>
                      CSI <span className="hidden font-normal text-slate-400 sm:inline">Postventa</span>
                    </>
                  ),
                },
              ]}
            />

            <label className="relative order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar por comentario, modelo o VIN..."
                aria-label="Buscar encuestas"
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <Segmented
              label="Estado de satisfacción"
              value={scoreFilter === 'ok' || scoreFilter === 'dev' ? scoreFilter : ''}
              onChange={value => setScoreFilter(value)}
              options={[
                { value: '', label: 'Todas' },
                {
                  value: 'ok',
                  label: (
                    <>
                      Conformes <span className="hidden text-slate-400 md:inline">9–10</span>
                    </>
                  ),
                },
                {
                  value: 'dev',
                  label: (
                    <>
                      Desvíos <span className="hidden text-slate-400 md:inline">0–8</span>
                    </>
                  ),
                },
              ]}
            />

            <button
              type="button"
              onClick={() => setShowFilters(v => !v)}
              aria-expanded={showFilters}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
                showFilters || panelFilterCount
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros
              {panelFilterCount > 0 && (
                <span className="rounded-full bg-indigo-600 px-1.5 text-[10px] text-white">
                  {panelFilterCount}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition ${showFilters ? 'rotate-180' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowSimulator(v => !v)}
              aria-expanded={showSimulator}
              className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
                showSimulator
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Calculator className="h-3.5 w-3.5" />
              Simulador SSI
            </button>

            <button
              type="button"
              onClick={() => setIsEditingBenchmarks(v => !v)}
              title="Configurar referencias y objetivos Volkswagen"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>

          {/* Panel desplegable de filtros adicionales */}
          {showFilters && (
            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {fields.map(field => (
                <select
                  key={field.key}
                  aria-label={field.label}
                  value={filters[field.key]}
                  onChange={event => setFilter(field.key, event.target.value)}
                  className={selectClass}
                >
                  <option value="">{field.label}: todos</option>
                  {options[field.key].map(value => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}

          {/* Chips de filtros activos */}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
              {chips.map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-2.5 pr-1.5 text-[11px] font-medium text-indigo-700 transition hover:bg-indigo-100"
                >
                  {chip.label}
                  <X className="h-3 w-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1 px-1.5 text-[11px] font-semibold text-slate-400 hover:text-slate-700"
              >
                <RotateCcw className="h-3 w-3" /> Limpiar todo
              </button>
            </div>
          )}
        </section>

        {/* Modal / Panel de configuración de Benchmarks VW */}
        {isEditingBenchmarks && (
          <section className={`${cardStyle} border-indigo-200 bg-indigo-50/50 p-4`}>
            <div className="flex items-center justify-between border-b border-indigo-100 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  Referencias y Objetivos Volkswagen ({program})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingBenchmarks(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Referencia Top 5 T2B (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={tempBenchmarks.top5T2B}
                  onChange={e =>
                    setTempBenchmarks(prev => ({ ...prev, top5T2B: parseFloat(e.target.value) || 0 }))
                  }
                  className={selectClass}
                />
                <span className="text-[10px] text-slate-400">Meta del Top 5 de concesionarios</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Media de Mercado T2B (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={tempBenchmarks.marketT2B}
                  onChange={e =>
                    setTempBenchmarks(prev => ({ ...prev, marketT2B: parseFloat(e.target.value) || 0 }))
                  }
                  className={selectClass}
                />
                <span className="text-[10px] text-slate-400">Promedio nacional de la red</span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Score General promedio mercado (0–10)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tempBenchmarks.marketScore}
                  onChange={e =>
                    setTempBenchmarks(prev => ({ ...prev, marketScore: parseFloat(e.target.value) || 0 }))
                  }
                  className={selectClass}
                />
                <span className="text-[10px] text-slate-400">Calificación media de satisfacción</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3 pt-2 border-t border-indigo-100">
              <button
                type="button"
                onClick={() => {
                  setTempBenchmarks(DEFAULT_BENCHMARKS);
                  setBenchmarks(DEFAULT_BENCHMARKS);
                  saveBenchmarks(program, DEFAULT_BENCHMARKS);
                  setIsEditingBenchmarks(false);
                }}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
              >
                Restablecer
              </button>
              <button
                type="button"
                onClick={() => {
                  setBenchmarks(tempBenchmarks);
                  saveBenchmarks(program, tempBenchmarks);
                  setIsEditingBenchmarks(false);
                }}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Guardar referencias
              </button>
            </div>
          </section>
        )}

        {/* Sección compacta y desplegable: Simulador SSI */}
        {showSimulator && (
          <section className={`${cardStyle} border-indigo-300 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/60 p-5 shadow-md`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Simulador SSI – Proyección de Escenarios</h3>
                  <p className="text-[11px] text-slate-500">
                    Proyección hipotética: evalúa el impacto de futuras encuestas en el T2B sin alterar datos reales.
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                Modelo Hipotético
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Controles de simulación */}
              <div className="rounded-xl border border-indigo-100 bg-white/80 p-3.5 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Calificación futura esperada (0–10):
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setFutureScore(s)}
                        className={`h-7 w-7 rounded-md text-xs font-bold transition ${
                          futureScore === s
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : s >= 9
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : s >= 7
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {futureScore >= 9 ? 'Aporta al Top Two Box (T2B)' : 'No computa en T2B (desvío)'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cantidad de encuestas adicionales (E):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={additionalSurveys}
                      onChange={e => setAdditionalSurveys(parseInt(e.target.value) || 0)}
                      className={`${selectClass} w-24 text-center font-bold`}
                    />
                    <div className="flex gap-1">
                      {[+1, +5, +10].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setAdditionalSurveys(prev => Math.max(0, prev + n))}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                          +{n}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resultados proyectados */}
              <div className="rounded-xl border border-indigo-100 bg-white/80 p-3.5 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Proyección resultante ({simulation.projectedN} encuestas)
                </p>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-600">T2B Proyectado:</span>
                  <div className="text-right">
                    <span className="text-lg font-bold tabular-nums text-slate-900">
                      {fmtPct(simulation.projectedT2B)}
                    </span>
                    <span
                      className={`ml-1 text-xs font-bold ${
                        simulation.projectedT2B >= (kpis.t2bPercent || 0)
                          ? 'text-emerald-600'
                          : 'text-rose-600'
                      }`}
                    >
                      {simulation.projectedT2B >= (kpis.t2bPercent || 0) ? '▲' : '▼'}{' '}
                      {Math.abs(simulation.projectedT2B - (kpis.t2bPercent || 0)).toFixed(1)} pp
                    </span>
                  </div>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-600">Promedio General Proyectado:</span>
                  <div className="text-right">
                    <span className="text-lg font-bold tabular-nums text-slate-900">
                      {fmt2(simulation.projectedAvg)}
                    </span>
                    <span className="ml-1 text-[11px] text-slate-400">
                      (actual: {fmt2(kpis.satAvg)})
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Meta Top 5 ({benchmarks.top5T2B}%):</span>
                    <span
                      className={`font-bold ${
                        simulation.projectedT2B >= benchmarks.top5T2B
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {simulation.projectedT2B >= benchmarks.top5T2B
                        ? 'Alcanzado ✓'
                        : `Faltan ${(benchmarks.top5T2B - simulation.projectedT2B).toFixed(1)} pp`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Objetivos y Mínimos */}
              <div className="rounded-xl border border-indigo-100 bg-white/80 p-3.5 space-y-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Cumplimiento de Auditoría y Metas
                </p>

                <div className="rounded-lg bg-slate-50 p-2 text-xs">
                  <span className="font-semibold text-slate-700 block mb-0.5">Mínimo semestral (10 encuestas):</span>
                  {simulation.minPending > 0 ? (
                    <span className="text-amber-700 font-medium">
                      Faltan <b>{simulation.minPending}</b> encuestas para el mínimo de auditoría ({kpis.validCount}/10).
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium">
                      Mínimo de auditoría cubierto ({kpis.validCount} encuestas válidas).
                    </span>
                  )}
                </div>

                <div className="rounded-lg bg-indigo-50/60 p-2 text-xs">
                  <span className="font-semibold text-indigo-950 block mb-0.5">Para alcanzar el Top 5 ({benchmarks.top5T2B}%):</span>
                  {simulation.requiredForTarget === 0 ? (
                    <span className="text-emerald-700 font-bold">
                      ¡Objetivo ya alcanzado con el T2B actual!
                    </span>
                  ) : simulation.requiredForTarget !== null ? (
                    <span className="text-indigo-900">
                      Se necesitan <b>{simulation.requiredForTarget}</b> encuestas consecutivas con nota 9 o 10.
                    </span>
                  ) : (
                    <span className="text-rose-600">
                      No es posible alcanzar el objetivo con notas inferiores a 9.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <div className="space-y-4 py-8" role="status">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/60" />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-2xl bg-slate-200/60" />
          </div>
        ) : error ? (
          <div className={`${cardStyle} flex flex-col items-start gap-2 border-rose-200 bg-rose-50 p-5 text-rose-800`}>
            <p className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-4 w-4" /> No se pudieron cargar las encuestas {program}.
            </p>
            <p className="text-sm">{error}</p>
            <button
              type="button"
              className="text-sm font-semibold underline"
              onClick={() => setAttempt(v => v + 1)}
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {/* 3. Indicadores del dashboard (5 Tarjetas Superiores Requeridas) */}
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              {/* Tarjeta 1: Encuestas válidas */}
              <div className={`${cardStyle} p-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Encuestas válidas</span>
                  <Users className="h-4 w-4 text-sky-500" />
                </div>
                <div className="mt-2">
                  <p className="text-3xl font-extrabold tabular-nums text-slate-900">
                    {kpis.validCount.toLocaleString('es-AR')}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    de {kpis.totalCount} registros filtrados
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Nota 0 a 10 válida</span>
                  <span>{kpis.withComment} con texto</span>
                </div>
              </div>

              {/* Tarjeta 2: SSI - Top Two Box (T2B) */}
              <div className={`${cardStyle} p-4 flex flex-col justify-between border-l-4 border-l-indigo-500`}>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                    {program} – T2B (9–10)
                  </span>
                  <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="mt-2">
                  <p className="text-3xl font-extrabold tabular-nums text-indigo-950">
                    {fmtPct(kpis.t2bPercent)}
                  </p>
                  <p className="text-[11px] font-medium text-slate-600 mt-0.5">
                    {kpis.top2BoxCount} de {kpis.validCount} encuestas con nota 9 o 10
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100">
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full transition-all"
                      style={{ width: `${Math.min(100, kpis.t2bPercent || 0)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Tarjeta 3: Satisfacción General */}
              <div className={`${cardStyle} p-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Satisfacción General</span>
                  <Star className="h-4 w-4 text-amber-500" />
                </div>
                <div className="mt-2">
                  <p className="text-3xl font-extrabold tabular-nums text-slate-900">
                    {fmt2(kpis.satAvg)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Escala 0 a 10 · promedio</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Base: {kpis.satBase} resp.</span>
                  <span>Mercado: {benchmarks.marketScore.toFixed(2)}</span>
                </div>
              </div>

              {/* Tarjeta 4: Recomendación */}
              <div className={`${cardStyle} p-4 flex flex-col justify-between`}>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Recomendación</span>
                  <Heart className="h-4 w-4 text-pink-500" />
                </div>
                <div className="mt-2">
                  <p className="text-3xl font-extrabold tabular-nums text-slate-900">
                    {fmt2(kpis.recAvg)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Escala 0 a 10 · promedio</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Base: {kpis.recBase} resp.</span>
                  <span>{kpis.recBase > 0 ? 'Válidas' : 'Sin datos'}</span>
                </div>
              </div>

              {/* Tarjeta 5: Brecha frente al Top 5 */}
              <div
                className={`${cardStyle} p-4 flex flex-col justify-between ${
                  kpis.gapTop5 !== null && kpis.gapTop5 >= 0
                    ? 'bg-emerald-50/40 border-emerald-200'
                    : 'bg-amber-50/30 border-amber-200'
                }`}
              >
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Brecha vs Top 5
                  </span>
                  <Award
                    className={`h-4 w-4 ${
                      kpis.gapTop5 !== null && kpis.gapTop5 >= 0
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  />
                </div>
                <div className="mt-2">
                  <p
                    className={`text-3xl font-extrabold tabular-nums ${
                      kpis.gapTop5 === null
                        ? 'text-slate-400'
                        : kpis.gapTop5 >= 0
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {kpis.gapTop5 === null
                      ? '—'
                      : `${kpis.gapTop5 >= 0 ? '+' : ''}${kpis.gapTop5.toFixed(1)} pp`}
                  </p>
                  <p className="text-[11px] font-semibold mt-0.5">
                    {kpis.gapTop5 === null ? (
                      <span className="text-slate-400">Sin datos</span>
                    ) : kpis.gapTop5 >= 0 ? (
                      <span className="text-emerald-700">Objetivo alcanzado ✓</span>
                    ) : (
                      <span className="text-amber-700">Pendiente de objetivo</span>
                    )}
                  </p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Ref. Top 5: {benchmarks.top5T2B}%</span>
                  <span>Red: {benchmarks.marketT2B}%</span>
                </div>
              </div>
            </section>

            {/* Comparativa visual de T2B frente a Referencias Volkswagen */}
            <section className={`${cardStyle} p-4`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Posicionamiento T2B frente a Referencias de Red Volkswagen
                  </h4>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                    T2B Real: <b>{fmtPct(kpis.t2bPercent)}</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Media Red: <b>{benchmarks.marketT2B}%</b>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Top 5 Meta: <b>{benchmarks.top5T2B}%</b>
                  </span>
                </div>
              </div>

              {/* Barra comparativa con marcadores */}
              <div className="relative pt-4 pb-2">
                <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden relative">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, kpis.t2bPercent || 0))}%` }}
                  />
                </div>
                {/* Marcador Media Mercado */}
                <div
                  className="absolute top-1 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                  style={{ left: `${Math.min(98, Math.max(2, benchmarks.marketT2B))}%` }}
                >
                  <span className="h-6 w-0.5 bg-slate-500 shadow-sm" />
                  <span className="text-[9px] font-bold text-slate-500 whitespace-nowrap bg-white/90 px-1 rounded ring-1 ring-slate-200">
                    Media {benchmarks.marketT2B}%
                  </span>
                </div>
                {/* Marcador Top 5 */}
                <div
                  className="absolute top-1 -translate-x-1/2 flex flex-col items-center pointer-events-none"
                  style={{ left: `${Math.min(98, Math.max(2, benchmarks.top5T2B))}%` }}
                >
                  <span className="h-6 w-0.5 bg-emerald-600 shadow-sm" />
                  <span className="text-[9px] font-bold text-emerald-700 whitespace-nowrap bg-emerald-50 px-1 rounded ring-1 ring-emerald-300">
                    Top 5 {benchmarks.top5T2B}%
                  </span>
                </div>
              </div>
            </section>

            {/* 6. Gráfico de desvíos por categoría */}
            <section className={`${cardStyle} p-4 sm:p-5`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Desvíos y Motivos por Categoría
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {categoryStats.list.length} categorías
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Seleccioná una barra para filtrar automáticamente los comentarios en la tabla inferior.
                  </p>
                </div>
                {category && (
                  <button
                    type="button"
                    onClick={() => setCategory('')}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                  >
                    <X className="h-3.5 w-3.5" /> Quitar filtro de categoría
                  </button>
                )}
              </div>

              {categoryStats.list.length ? (
                <div className="space-y-1.5 pt-1">
                  {categoryStats.list.map(item => {
                    const isSelected = category === item.key;
                    const isDimmed = Boolean(category) && !isSelected;
                    const pctOfBase =
                      categoryBase.length > 0
                        ? Math.round((item.uniqueCount / categoryBase.length) * 100)
                        : 0;

                    return (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleCategory(item.key)}
                        className={`group block w-full rounded-xl px-3 py-2 text-left transition ${
                          isSelected
                            ? 'bg-indigo-50/90 ring-2 ring-indigo-500 shadow-sm'
                            : 'hover:bg-slate-50/90'
                        } ${isDimmed ? 'opacity-40 hover:opacity-100' : ''}`}
                      >
                        <div className="flex items-center justify-between text-xs gap-3">
                          <span
                            className={`font-semibold min-w-0 break-words ${
                              isSelected ? 'text-indigo-950 font-bold' : 'text-slate-800'
                            }`}
                          >
                            {item.name}
                          </span>
                          <div className="shrink-0 text-right tabular-nums text-slate-500 text-[11px]">
                            <span className="font-bold text-slate-800">{item.uniqueCount}</span> encuestas
                            únicas{' '}
                            <span className="text-slate-400">
                              ({item.mentions} menciones · {pctOfBase}%)
                            </span>
                          </div>
                        </div>

                        {/* Barra de progreso */}
                        <div className="mt-1.5 h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              isSelected
                                ? 'bg-indigo-600'
                                : 'bg-indigo-400 group-hover:bg-indigo-500'
                            }`}
                            style={{
                              width: `${Math.max(
                                3,
                                (item.uniqueCount / categoryStats.maxUnique) * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-slate-400">
                  No hay categorías registradas en los filtros actuales.
                </div>
              )}

              {categoryStats.uncategorizedRows > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <button
                    type="button"
                    onClick={() => toggleCategory('__none')}
                    className={`font-semibold hover:text-indigo-600 ${
                      category === '__none' ? 'text-indigo-700 underline' : ''
                    }`}
                  >
                    {categoryStats.uncategorizedRows} encuestas sin categorizar
                  </button>
                  <span className="text-slate-400">
                    Total: {categoryBase.length} encuestas analizadas
                  </span>
                </div>
              )}
            </section>

            {/* 7. Tabla inferior: Comentarios originales del cliente */}
            <section className={`${cardStyle} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">{categoryHeaderTitle}</h3>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-bold text-indigo-800 tabular-nums">
                    {commentRows.length} casos
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={onlyWithComment}
                      onChange={e => setOnlyWithComment(e.target.checked)}
                      className="h-3.5 w-3.5 accent-indigo-600 rounded"
                    />
                    Solo con comentario
                  </label>

                  <select
                    aria-label="Ordenar tabla"
                    value={sort}
                    onChange={e => setSort(e.target.value as SortMode)}
                    className={`${selectClass} w-auto text-xs`}
                  >
                    <option value="worst">Peor nota primero</option>
                    <option value="best">Mejor nota primero</option>
                    <option value="recent">Últimos cargados</option>
                  </select>

                  <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode('table')}
                      title="Vista tabla"
                      className={`p-1.5 rounded-md ${
                        viewMode === 'table' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <TableIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('cards')}
                      title="Vista tarjetas"
                      className={`p-1.5 rounded-md ${
                        viewMode === 'cards' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {commentRows.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No se encontraron encuestas con los filtros seleccionados.
                  {chips.length > 0 && (
                    <button
                      type="button"
                      onClick={resetAll}
                      className="ml-2 font-semibold text-indigo-600 hover:underline"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              ) : viewMode === 'table' ? (
                /* Vista Tabla */
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left border-collapse">
                    <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 w-16 text-center">Sat.</th>
                        <th className="px-3 py-3 w-16 text-center">Recom.</th>
                        <th className="px-4 py-3 w-32">Período / Ola</th>
                        <th className="px-4 py-3 w-40">Modelo / VIN</th>
                        <th className="px-4 py-3 w-28">{program === 'SSI' ? 'Canal' : 'Sucursal'}</th>
                        <th className="px-4 py-3 w-44">Categorías</th>
                        <th className="px-4 py-3">Comentario del cliente (Q1.1)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {commentRows.slice(0, visibleCount).map(row => {
                        const isExpanded = !!expandedComments[row.record.id];
                        const where = program === 'SSI' ? row.record.canal_venta : row.record.provincia;
                        const hasText = Boolean(row.comment);

                        return (
                          <tr
                            key={row.record.id}
                            className="align-top hover:bg-slate-50/70 transition-colors"
                          >
                            <td className="px-4 py-3 text-center">
                              <ScoreBadge label="" score={row.sat} />
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="font-semibold tabular-nums text-slate-700">
                                {row.rec ?? '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              <span className="font-bold text-slate-800">{row.record.anio || '—'}</span>
                              <br />
                              <span className="text-[11px] text-slate-400">
                                {row.record.semestre || 'Semestre'} · Ola {row.record.ola || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-800 block leading-tight">
                                {row.record.modelo || '—'}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500 font-semibold select-all">
                                {formatVin(row.record.vin)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-medium">
                              {where && !where.startsWith('Sin ') ? where : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {row.categories.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.categories.map(cat => {
                                    const key = normalize(cat);
                                    const isCurrent = category === key;
                                    return (
                                      <button
                                        key={key}
                                        type="button"
                                        onClick={() => toggleCategory(key)}
                                        title="Filtrar por esta categoría"
                                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                                          isCurrent
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                                        }`}
                                      >
                                        {cat}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-slate-300 italic">Sin categorizar</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {hasText ? (
                                <div className="space-y-1 max-w-xl">
                                  <p
                                    className={`leading-relaxed text-slate-700 ${
                                      isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
                                    }`}
                                  >
                                    {row.comment}
                                  </p>
                                  {row.comment.length > 120 && (
                                    <button
                                      type="button"
                                      onClick={() => toggleCommentExpand(row.record.id)}
                                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                                    >
                                      {isExpanded ? (
                                        <>
                                          Ver menos <ChevronUp className="h-3 w-3" />
                                        </>
                                      ) : (
                                        <>
                                          Ver completo <ChevronDown className="h-3 w-3" />
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Sin comentario registrado</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Vista Tarjetas */
                <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                  {commentRows.slice(0, visibleCount).map(row => {
                    const isExpanded = !!expandedComments[row.record.id];
                    const where = program === 'SSI' ? row.record.canal_venta : row.record.provincia;
                    const hasText = Boolean(row.comment);

                    return (
                      <article
                        key={row.record.id}
                        className="rounded-xl border border-slate-200 bg-white p-3.5 flex flex-col justify-between shadow-xs hover:border-slate-300 transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <p className="font-bold text-slate-900 text-xs">{row.record.modelo}</p>
                              <p className="text-[10px] text-slate-400">
                                {[
                                  where && !where.startsWith('Sin ') ? where : '',
                                  row.period,
                                  formatVin(row.record.vin),
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <ScoreBadge label="Sat" score={row.sat} />
                              <ScoreBadge label="Rec" score={row.rec} />
                            </div>
                          </div>

                          <div className="my-2">
                            {hasText ? (
                              <div>
                                <p
                                  className={`text-xs text-slate-700 leading-relaxed ${
                                    isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-3'
                                  }`}
                                >
                                  {row.comment}
                                </p>
                                {row.comment.length > 130 && (
                                  <button
                                    type="button"
                                    onClick={() => toggleCommentExpand(row.record.id)}
                                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 mt-1"
                                  >
                                    {isExpanded ? 'Ver menos' : 'Ver completo'}
                                  </button>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                Sin comentario registrado
                              </p>
                            )}
                          </div>
                        </div>

                        {row.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-100">
                            {row.categories.map(cat => {
                              const key = normalize(cat);
                              const isCurrent = category === key;
                              return (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => toggleCategory(key)}
                                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                                    isCurrent
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                                  }`}
                                >
                                  {cat}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}

              {visibleCount < commentRows.length && (
                <div className="flex justify-center border-t border-slate-100 bg-slate-50/50 p-3">
                  <button
                    type="button"
                    onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
                  >
                    Mostrar más encuestas ({commentRows.length - visibleCount} restantes)
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardFrame>
  );
};

export default SsiCsiDashboard;
