import React, { useEffect, useMemo, useState } from 'react';
import { DashboardFrame } from './DashboardUI';
import { Icons } from './Icon';
import { LoadingState, QualityObjectiveRecord } from '../types';
import { fetchQualityObjectivesData } from '../services/dataService';

interface QualityObjectivesDashboardProps {
  sheetUrl: string;
  onBack: () => void;
}

type IndicatorGroup = {
  indicator: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  requirements: QualityObjectiveRecord[];
  scales: QualityObjectiveRecord[];
  bonuses: QualityObjectiveRecord[];
};

type AreaGroup = {
  area: string;
  totalRows: number;
  indicators: IndicatorGroup[];
};

const AREA_THEME: Record<string, {
  badge: string;
  glow: string;
  accent: string;
  text: string;
}> = {
  ventas: {
    badge: 'border-orange-200/80 bg-orange-50 text-orange-700',
    glow: 'bg-orange-400/10',
    accent: 'from-orange-500 to-amber-400',
    text: 'text-orange-600',
  },
  postventa: {
    badge: 'border-sky-200/80 bg-sky-50 text-sky-700',
    glow: 'bg-sky-400/10',
    accent: 'from-sky-500 to-blue-500',
    text: 'text-sky-600',
  },
};

const TYPE_THEME: Record<string, string> = {
  requisito: 'border-slate-200 bg-slate-100 text-slate-700',
  escala: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  bonus: 'border-violet-200 bg-violet-50 text-violet-700',
};

const normalizeText = (value: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatDate = (value: string) => {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-AR');
};

const formatCell = (value: number | null | string) => {
  if (value == null || value === '') return '-';
  return String(value);
};

const pickAreaTheme = (area: string) => AREA_THEME[normalizeText(area)] || AREA_THEME.postventa;

const QualityObjectivesDashboard: React.FC<QualityObjectivesDashboardProps> = ({ sheetUrl, onBack }) => {
  const [data, setData] = useState<QualityObjectiveRecord[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoading(LoadingState.LOADING);
      setErrorMessage(null);

      try {
        const result = await fetchQualityObjectivesData(sheetUrl);
        setData(result);
        setLoading(LoadingState.SUCCESS);
      } catch (error: any) {
        setLoading(LoadingState.ERROR);
        setErrorMessage(error?.message || 'No se pudieron cargar los objetivos.');
      }
    };

    loadData();
  }, [sheetUrl, retryCount]);

  const availableYears = useMemo(() => {
    return Array.from(new Set(data.map(item => item.anio).filter(Boolean))).sort((a, b) => b - a);
  }, [data]);

  useEffect(() => {
    if (selectedYear === 'all' && availableYears.length > 0) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesYear = selectedYear === 'all' || String(item.anio) === selectedYear;
      const matchesArea = selectedArea === 'all' || normalizeText(item.area) === selectedArea;
      return matchesYear && matchesArea;
    });
  }, [data, selectedArea, selectedYear]);

  const groupedData = useMemo<AreaGroup[]>(() => {
    const byArea = filteredData.reduce<Record<string, QualityObjectiveRecord[]>>((acc, item) => {
      const key = item.area || 'Sin area';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    return Object.entries(byArea)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([area, items]) => {
        const byIndicator = items.reduce<Record<string, QualityObjectiveRecord[]>>((acc, item) => {
          const key = item.indicador || 'Sin indicador';
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {});

        const indicators = Object.entries(byIndicator)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([indicator, rows]) => {
            const sortedRows = rows.sort((left, right) => {
              const period = left.periodo.localeCompare(right.periodo);
              if (period !== 0) return period;
              return left.escala.localeCompare(right.escala);
            });

            return {
              indicator,
              vigenciaDesde: sortedRows[0]?.vigencia_desde || '',
              vigenciaHasta: sortedRows[sortedRows.length - 1]?.vigencia_hasta || sortedRows[0]?.vigencia_hasta || '',
              requirements: sortedRows.filter(row => row.tipo_registro === 'requisito'),
              scales: sortedRows.filter(row => row.tipo_registro === 'escala'),
              bonuses: sortedRows.filter(row => row.tipo_registro === 'bonus'),
            };
          });

        return {
          area,
          totalRows: items.length,
          indicators,
        };
      });
  }, [filteredData]);

  const summary = useMemo(() => {
    const escalas = filteredData.filter(item => item.tipo_registro === 'escala').length;
    const bonus = filteredData.filter(item => item.tipo_registro === 'bonus').length;
    const areas = new Set(filteredData.map(item => normalizeText(item.area))).size;
    const indicators = new Set(filteredData.map(item => `${normalizeText(item.area)}::${normalizeText(item.indicador)}`)).size;
    return { escalas, bonus, areas, indicators };
  }, [filteredData]);

  const filters = (
    <div className="space-y-3">
      <div className="rounded-[1.4rem] border border-slate-200/80 bg-white/92 p-4 shadow-[0_10px_26px_rgba(15,23,42,0.05)]">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-white">
            <Icons.Filter className="h-3.5 w-3.5" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.22em] text-slate-400">Filtros</p>
            <p className="text-[13px] font-black text-slate-950">Objetivos</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Ano</span>
            <select
              value={selectedYear}
              onChange={event => setSelectedYear(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
            >
              <option value="all">Todos</option>
              {availableYears.map(year => (
                <option key={year} value={String(year)}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[8px] font-black uppercase tracking-[0.18em] text-slate-400">Area</span>
            <select
              value={selectedArea}
              onChange={event => setSelectedArea(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
            >
              <option value="all">Ventas + Postventa</option>
              <option value="ventas">Ventas</option>
              <option value="postventa">Postventa</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardFrame
      title="Objetivos Ventas / Postventa"
      subtitle="Programa de calidad conectado a Google Sheets"
      lastUpdated={new Date().toLocaleTimeString('es-AR')}
      onBack={onBack}
      isLoading={loading === LoadingState.LOADING}
      filters={filters}
      className="bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0.04),_transparent_22%),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_100%)]"
    >
      {loading === LoadingState.ERROR ? (
        <div className="rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <Icons.AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-950">No se pudieron cargar los objetivos</h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">{errorMessage}</p>
          <button
            onClick={() => setRetryCount(count => count + 1)}
            className="mt-5 rounded-full bg-slate-950 px-5 py-2.5 text-[9px] font-black uppercase tracking-[0.24em] text-white transition hover:bg-slate-800"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-4 pb-6">
          <section className="relative overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(135deg,#0f172a_0%,#111827_52%,#1d4ed8_100%)] px-5 py-5 text-white shadow-[0_18px_48px_rgba(15,23,42,0.15)]">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute left-0 bottom-0 h-40 w-40 rounded-full bg-sky-400/15 blur-3xl" />
            </div>
            <div className="relative flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-sky-200/80">Programa 2026</p>
                <h2 className="mt-2 text-[1.3rem] font-black uppercase italic leading-tight tracking-tight md:text-[1.8rem]">
                  Incentivos de calidad
                </h2>
                <p className="mt-1.5 max-w-2xl text-[12px] leading-5 text-slate-200/85 md:text-[13px]">
                  Vista compacta para leer requisitos, escalas y bonus por area e indicador.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:w-[420px]">
                {[
                  { label: 'Areas', value: summary.areas, icon: Icons.Layers },
                  { label: 'Indicadores', value: summary.indicators, icon: Icons.Target },
                  { label: 'Escalas', value: summary.escalas, icon: Icons.Table },
                  { label: 'Bonus', value: summary.bonus, icon: Icons.Star },
                ].map(item => (
                  <div key={item.label} className="rounded-[1rem] border border-white/10 bg-white/10 p-2.5 backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[7px] font-black uppercase tracking-[0.14em] text-slate-200/75">{item.label}</p>
                        <p className="mt-1 text-lg font-black tracking-tight text-white">{item.value}</p>
                      </div>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/12 text-white">
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {groupedData.length === 0 ? (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Icons.SearchX className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black uppercase italic tracking-tight text-slate-950">Sin datos para los filtros actuales</h3>
              <p className="mt-2 text-sm text-slate-500">Cambie el ano o el area para revisar otras vigencias del programa.</p>
            </div>
          ) : (
            groupedData.map(group => {
              const theme = pickAreaTheme(group.area);

              return (
                <section
                  key={group.area}
                  className="relative overflow-hidden rounded-[1.8rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]"
                >
                  <div className={`pointer-events-none absolute -right-12 top-0 h-36 w-36 rounded-full blur-3xl ${theme.glow}`} />
                  <div className="relative mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                    <div>
                      <div className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] ${theme.badge}`}>
                        {group.area}
                      </div>
                      <h2 className="mt-1.5 text-[1.25rem] font-black tracking-tight text-slate-950">{group.area}</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <div className="rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2 shadow-sm">
                        <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">Indicadores</p>
                        <p className={`mt-0.5 text-[15px] font-black ${theme.text}`}>{group.indicators.length}</p>
                      </div>
                      <div className="rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2 shadow-sm">
                        <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">Registros</p>
                        <p className="mt-0.5 text-[15px] font-black text-slate-950">{group.totalRows}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
                    {group.indicators.map(indicator => {
                      const totalScales = indicator.scales.length;
                      const totalRequirements = indicator.requirements.length;
                      const totalBonuses = indicator.bonuses.length;

                      return (
                        <article
                          key={`${group.area}-${indicator.indicator}`}
                          className="overflow-hidden rounded-[1.2rem] border border-slate-200/80 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.05)]"
                        >
                          <div className={`relative overflow-hidden bg-gradient-to-r ${theme.accent} px-3.5 py-3 text-white`}>
                            <div className="relative flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                              <div className="min-w-0">
                                <p className="text-[7px] font-black uppercase tracking-[0.18em] text-white/75">Indicador</p>
                                <h3 className="mt-0.5 truncate text-[1rem] font-black tracking-tight">{indicator.indicator}</h3>
                                <p className="mt-0.5 text-[11px] text-white/80">
                                  {indicator.vigenciaDesde ? `${formatDate(indicator.vigenciaDesde)} a ${formatDate(indicator.vigenciaHasta)}` : 'Vigencia sin definir'}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                <span className="rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em]">
                                  {totalRequirements} req
                                </span>
                                <span className="rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em]">
                                  {totalScales} esc
                                </span>
                                {totalBonuses > 0 && (
                                  <span className="rounded-full border border-white/20 bg-white/15 px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em]">
                                    {totalBonuses} bon
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2.5 p-3">
                            {indicator.requirements.length > 0 && (
                              <div className="rounded-[1rem] border border-slate-200/80 bg-slate-50/70 p-2.5">
                                <div className="mb-2 flex items-center gap-2">
                                  <span className={`inline-flex rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] ${TYPE_THEME.requisito}`}>
                                    Requisitos
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                                  {indicator.requirements.map(row => (
                                    <div key={row.id} className="rounded-[0.9rem] border border-slate-200 bg-white p-2.5 shadow-sm">
                                      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-slate-400">{row.periodo || 'Periodo'}</p>
                                      <p className="mt-1 text-[14px] font-black tracking-tight leading-tight text-slate-950">{row.requisito_mostrar || '-'}</p>
                                      <p className="mt-1 text-[11px] text-slate-500">{row.rango_mostrar || 'Objetivo sin rango visible'}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {indicator.scales.length > 0 && (
                              <div className="rounded-[1rem] border border-slate-200/80 bg-white p-2.5">
                                <div className="mb-2 flex items-center gap-2">
                                  <span className={`inline-flex rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] ${TYPE_THEME.escala}`}>
                                    Escalas
                                  </span>
                                </div>
                                <div className="space-y-2">
                                  {indicator.scales.map(row => (
                                    <div key={row.id} className="rounded-[0.9rem] border border-slate-200 bg-slate-50/70 p-2.5">
                                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                        <div className="min-w-0">
                                          <div className="flex flex-wrap items-center gap-1">
                                            <span className="rounded-full bg-slate-950 px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-white">
                                              {row.periodo || '-'}
                                            </span>
                                            <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-slate-600">
                                              {row.escala || 'Escala'}
                                            </span>
                                          </div>
                                          <p className="mt-1.5 text-[13px] font-black tracking-tight leading-tight text-slate-950">{row.rango_mostrar || row.requisito_mostrar || '-'}</p>
                                          <p className="mt-0.5 text-[11px] text-slate-500">
                                            Desde {formatCell(row.desde)} / Hasta {formatCell(row.hasta)}
                                          </p>
                                        </div>
                                        <div className="rounded-[0.85rem] border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-right md:min-w-[82px]">
                                          <p className="text-[7px] font-black uppercase tracking-[0.12em] text-emerald-600/70">{row.impacto_tipo || 'impacto'}</p>
                                          <p className="mt-0.5 text-[13px] font-black text-emerald-700">{row.impacto_mostrar || '-'}</p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {indicator.bonuses.length > 0 && (
                              <div className="rounded-[1rem] border border-violet-200/80 bg-[linear-gradient(135deg,rgba(139,92,246,0.08),rgba(255,255,255,1))] p-2.5">
                                <div className="mb-2 flex items-center gap-2">
                                  <span className={`inline-flex rounded-full border px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] ${TYPE_THEME.bonus}`}>
                                    Bonus
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                                  {indicator.bonuses.map(row => (
                                    <div key={row.id} className="rounded-[0.9rem] border border-violet-200 bg-white/90 p-2.5 shadow-sm">
                                      <p className="text-[7px] font-black uppercase tracking-[0.12em] text-violet-400">{row.periodo || 'Anual'}</p>
                                      <p className="mt-1 text-[13px] font-black tracking-tight leading-tight text-slate-950">{row.requisito_mostrar || row.rango_mostrar || '-'}</p>
                                      <p className="mt-0.5 text-[11px] text-slate-500">{row.indicador}</p>
                                      <div className="mt-2 inline-flex rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[12px] font-black text-violet-700">
                                        {row.impacto_mostrar || '-'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })
          )}
        </div>
      )}
    </DashboardFrame>
  );
};

export default QualityObjectivesDashboard;
