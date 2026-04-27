import React, { useEffect, useMemo, useState } from 'react';
import { DashboardFrame } from './DashboardUI';
import { Icons } from './Icon';
import { LoadingState, QualityObjectiveRecord } from '../types';
import { fetchQualityObjectivesData } from '../services/dataService';

interface QualityObjectivesDashboardProps {
  sheetUrl: string;
  onBack: () => void;
}

const AREA_STYLES: Record<string, string> = {
  ventas: 'border-orange-200 bg-orange-50 text-orange-700',
  postventa: 'border-blue-200 bg-blue-50 text-blue-700',
};

const TYPE_STYLES: Record<string, string> = {
  requisito: 'border-slate-200 bg-slate-100 text-slate-700',
  escala: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  bonus: 'border-violet-200 bg-violet-50 text-violet-700',
};

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
    const years = Array.from(new Set(data.map(item => item.anio).filter(Boolean))).sort((a, b) => b - a);
    return years;
  }, [data]);

  useEffect(() => {
    if (selectedYear === 'all' && availableYears.length > 0) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesYear = selectedYear === 'all' || String(item.anio) === selectedYear;
      const matchesArea = selectedArea === 'all' || item.area.toLowerCase() === selectedArea;
      return matchesYear && matchesArea;
    });
  }, [data, selectedArea, selectedYear]);

  const groupedData = useMemo(() => {
    const byArea = filteredData.reduce<Record<string, QualityObjectiveRecord[]>>((acc, item) => {
      const key = item.area || 'Sin área';
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
          .map(([indicator, rows]) => ({
            indicator,
            rows: rows.sort((left, right) => {
              const period = left.periodo.localeCompare(right.periodo);
              if (period !== 0) return period;
              return left.escala.localeCompare(right.escala);
            }),
          }));

        return { area, indicators };
      });
  }, [filteredData]);

  const summary = useMemo(() => {
    const requisitos = filteredData.filter(item => item.tipo_registro === 'requisito').length;
    const escalas = filteredData.filter(item => item.tipo_registro === 'escala').length;
    const bonus = filteredData.filter(item => item.tipo_registro === 'bonus').length;
    const areas = new Set(filteredData.map(item => item.area)).size;
    return { requisitos, escalas, bonus, areas };
  }, [filteredData]);

  const filters = (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Icons.Filter className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Filtros</p>
            <p className="text-sm font-black text-slate-950">Objetivos</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Año</span>
            <select
              value={selectedYear}
              onChange={event => setSelectedYear(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
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
            <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Área</span>
            <select
              value={selectedArea}
              onChange={event => setSelectedArea(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
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
    >
      {loading === LoadingState.ERROR ? (
        <div className="rounded-[2.5rem] border border-rose-200 bg-white p-10 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
            <Icons.AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-950">No se pudieron cargar los objetivos</h3>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500">{errorMessage}</p>
          <button
            onClick={() => setRetryCount(count => count + 1)}
            className="mt-6 rounded-full bg-slate-950 px-5 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-white transition hover:bg-slate-800"
          >
            Reintentar
          </button>
        </div>
      ) : (
        <div className="space-y-8 pb-12">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Áreas activas', value: summary.areas, icon: Icons.Layers },
              { label: 'Requisitos', value: summary.requisitos, icon: Icons.ClipboardCheck },
              { label: 'Escalas', value: summary.escalas, icon: Icons.Table },
              { label: 'Bonus', value: summary.bonus, icon: Icons.Star },
            ].map(item => (
              <div key={item.label} className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-400">{item.label}</p>
                    <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">{item.value}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_32px_rgba(15,23,42,0.18)]">
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            ))}
          </section>

          {groupedData.length === 0 ? (
            <div className="rounded-[2.5rem] border border-slate-200 bg-white p-12 text-center shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Icons.SearchX className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-950">Sin datos para los filtros actuales</h3>
              <p className="mt-3 text-sm text-slate-500">Cambie el año o el área para revisar otras vigencias del programa.</p>
            </div>
          ) : (
            groupedData.map(group => {
              const areaKey = group.area.toLowerCase();
              const areaStyle = AREA_STYLES[areaKey] || 'border-slate-200 bg-slate-50 text-slate-700';

              return (
                <section key={group.area} className="rounded-[2.5rem] border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)] md:p-7">
                  <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] ${areaStyle}`}>
                        {group.area}
                      </div>
                      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{group.area}</h2>
                      <p className="mt-1 text-sm text-slate-500">Objetivos, escalas y bonificaciones vigentes para el programa de calidad.</p>
                    </div>
                    <div className="rounded-[1.5rem] bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                      {group.indicators.length} indicadores
                    </div>
                  </div>

                  <div className="space-y-6">
                    {group.indicators.map(block => (
                      <article key={`${group.area}-${block.indicator}`} className="overflow-hidden rounded-[2rem] border border-slate-200/70">
                        <div className="flex flex-col gap-3 bg-[linear-gradient(135deg,#0f172a,#1e293b)] px-5 py-4 text-white md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-300">Indicador</p>
                            <h3 className="mt-1 text-lg font-black tracking-tight">{block.indicator}</h3>
                          </div>
                          <div className="text-sm text-slate-300">
                            {block.rows[0]?.vigencia_desde ? `${formatDate(block.rows[0].vigencia_desde)} a ${formatDate(block.rows[0].vigencia_hasta)}` : 'Vigencia sin definir'}
                          </div>
                        </div>

                        <div className="overflow-x-auto bg-white">
                          <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                              <tr className="text-left text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Periodo</th>
                                <th className="px-4 py-3">Objetivo</th>
                                <th className="px-4 py-3">Escala</th>
                                <th className="px-4 py-3">Rango</th>
                                <th className="px-4 py-3">Impacto</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {block.rows.map(row => {
                                const typeStyle = TYPE_STYLES[row.tipo_registro] || 'border-slate-200 bg-slate-100 text-slate-700';

                                return (
                                  <tr key={row.id} className="align-top">
                                    <td className="px-4 py-4">
                                      <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] ${typeStyle}`}>
                                        {row.tipo_registro}
                                      </span>
                                    </td>
                                    <td className="px-4 py-4 font-bold text-slate-700">{row.periodo || '-'}</td>
                                    <td className="px-4 py-4">
                                      <div className="font-black text-slate-950">{row.requisito_mostrar || '-'}</div>
                                      <div className="mt-1 text-xs text-slate-500">
                                        Desde {formatCell(row.desde)} / Hasta {formatCell(row.hasta)}
                                      </div>
                                    </td>
                                    <td className="px-4 py-4 font-bold text-slate-700">{row.escala || '-'}</td>
                                    <td className="px-4 py-4 text-slate-600">{row.rango_mostrar || '-'}</td>
                                    <td className="px-4 py-4">
                                      <div className="font-black text-slate-950">{row.impacto_mostrar || '-'}</div>
                                      <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">{row.impacto_tipo || '-'}</div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </article>
                    ))}
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
