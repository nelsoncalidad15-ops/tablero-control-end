
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, LabelList, Cell, PieChart, Pie, Legend
} from 'recharts';
import { CemOsRecord, LoadingState } from '../types';
import { Icons } from './Icon';
import { DashboardFrame, LuxuryKPICard, SkeletonLoader, StatusBadge, InsightCard, DataTable, ChartWrapper } from './DashboardUI';

interface CemOsDashboardProps {
  data: CemOsRecord[];
  loadingState: LoadingState;
  selectedMonths: string[];
  selectedCanal: string | null;
  setSelectedCanal: (val: string | null) => void;
  selectedVendedor: string | null;
  setSelectedVendedor: (val: string | null) => void;
  selectedEstadoUnidad: string | null;
  setSelectedEstadoUnidad: (val: string | null) => void;
  selectedCodigo: string | null;
  setSelectedCodigo: (val: string | null) => void;
  selectedZona: string | null;
  setSelectedZona: (val: string | null) => void;
}

const COLORS = ['#001E50', '#00B0F0', '#10b981', '#64748b', '#ef4444', '#334155'];

const isValidDateValue = (val: string) => {
  if (!val) return false;
  const clean = val.trim();
  if (!clean) return false;

  const normalized = clean.replace(/\s+/g, ' ');
  const datePatterns = [
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/,
    /^\d{4}[/-]\d{1,2}[/-]\d{1,2}(?:[ T].*)?$/
  ];

  if (datePatterns.some(pattern => pattern.test(normalized))) return true;

  const parsed = Date.parse(normalized);
  return !Number.isNaN(parsed);
};

const CemOsDashboard: React.FC<CemOsDashboardProps> = ({ 
  data = [], 
  loadingState, 
  selectedMonths,
  selectedCanal,
  setSelectedCanal,
  selectedVendedor,
  setSelectedVendedor,
  selectedEstadoUnidad,
  setSelectedEstadoUnidad,
  selectedCodigo,
  setSelectedCodigo,
  selectedZona,
  setSelectedZona
}) => {
  const [activeView, setActiveView] = useState<'general' | 'ranking'>('general');

  // Available filters (kept for chart logic)
  const availableMonths = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const months = new Set(data.map(d => d.mes));
    const invalidValues = ['unknown', '#n', '', '0', '1'];
    return Array.from(months)
      .filter(m => m && !invalidValues.includes(m.toLowerCase()))
      .sort((a, b) => {
        const order = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return order.indexOf(a) - order.indexOf(b);
      });
  }, [data]);

  // Filtered Data
  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(d.mes);
      const matchCanal = !selectedCanal || d.canal_ventas === selectedCanal;
      const matchVend = !selectedVendedor || d.vendedor === selectedVendedor;
      const matchEstado = !selectedEstadoUnidad || d.estado_unidad === selectedEstadoUnidad;
      const matchCodigo = !selectedCodigo || d.codigo === selectedCodigo;
      const matchZona = !selectedZona || d.zona === selectedZona;
      return matchMonth && matchCanal && matchVend && matchEstado && matchCodigo && matchZona;
    });
  }, [data, selectedMonths, selectedCanal, selectedVendedor, selectedEstadoUnidad, selectedCodigo, selectedZona]);

  // KPIs
  const kpis = useMemo(() => {
    // Patentados: all records
    const total = filteredData.length;
    
    // Declared: unique emails that have a valid date in fecha_link_llega
    const declaredEmails = new Set(
      filteredData
        .filter(d => isValidDateValue(d.fecha_link_llega))
        .map(d => d.cliente_email)
        .filter(Boolean)
    );
    const declared = declaredEmails.size;

    // Respondieron: unique emails that have a CEM score
    const respondedEmails = new Set(
      filteredData
        .filter(d => d.cem_score !== null)
        .map(d => d.cliente_email)
        .filter(Boolean)
    );
    const responded = respondedEmails.size;

    // Faltan: difference between declared and responded (unique emails)
    const pending = Math.max(0, declared - responded);

    const cemScores = filteredData.map(d => d.cem_score).filter((v): v is number => v !== null);
    const avgCem = cemScores.length > 0 ? cemScores.reduce((acc, v) => acc + v, 0) / cemScores.length : 0;

    const responseRate = declared > 0 ? (responded / declared) * 100 : 0;

    return {
      total,
      declared,
      responded,
      pending,
      avgCem,
      responseRate
    };
  }, [filteredData]);

  // Chart Data by Month (Always Annual View)
  const chartDataByMonth = useMemo(() => {
    // We use ALL data for the chart, but apply other filters (canal, vendedor, estado, zona)
    const baseDataForChart = data.filter(d => {
      const matchCanal = !selectedCanal || d.canal_ventas === selectedCanal;
      const matchVend = !selectedVendedor || d.vendedor === selectedVendedor;
      const matchEstado = !selectedEstadoUnidad || d.estado_unidad === selectedEstadoUnidad;
      const matchCodigo = !selectedCodigo || d.codigo === selectedCodigo;
      const matchZona = !selectedZona || d.zona === selectedZona;
      return matchCanal && matchVend && matchEstado && matchCodigo && matchZona;
    });

    return availableMonths
      .filter(m => m !== 'Unknown' && m !== '#n' && m !== '')
      .map(m => {
        const monthData = baseDataForChart.filter(d => d.mes === m);
        const getAvg = (key: 'cem_score' | 'encuesta_interna_score' | 'encuesta_temprana_score') => {
          const values = monthData.map(d => d[key]).filter((v): v is number => v !== null);
          return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        };
        return {
          name: m,
          cem: getAvg('cem_score'),
          interna: getAvg('encuesta_interna_score'),
          temprana: getAvg('encuesta_temprana_score'),
          count: monthData.length
        };
      });
  }, [data, availableMonths, selectedCanal, selectedVendedor, selectedEstadoUnidad, selectedCodigo, selectedZona]);

  // Advisor Performance (Active vs Responded)
  const advisorStats = useMemo(() => {
    const advisors: Record<string, { active: number, responded: number }> = {};
    
    filteredData.forEach(d => {
      if (!d.vendedor) return;
      
      const name = d.vendedor;

      if (!advisors[name]) advisors[name] = { active: 0, responded: 0 };
      
      const hasLink = isValidDateValue(d.fecha_link_llega);
      const hasResponded = d.cem_score !== null;
      
      if (hasLink) {
        advisors[name].active += 1;
      }
      if (hasResponded) {
        advisors[name].responded += 1;
      }
    });

    return Object.entries(advisors)
      .map(([name, stats]) => ({ name, ...stats }))
      .filter(s => s.active > 0) // Only those with surveys sent
      .sort((a, b) => b.active - a.active);
  }, [filteredData]);

  const advisorRanking = useMemo(() => {
    const advisors: Record<string, number> = {};
    // User requested: NO FILTRES POR CODIGO(SUCURSAL) PONE TODOS LOS ASESORES COMERCIALES.
    // But we should still respect the month filter if one is active globally
    const rankingData = data.filter(d => {
      const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(d.mes);
      return matchMonth;
    });

    rankingData.forEach(d => {
      if (!d.vendedor || d.cem_score === null) return;
      const name = d.vendedor;
      advisors[name] = (advisors[name] || 0) + 1;
    });
    return Object.entries(advisors)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [data, selectedMonths]);

  const detailedRankingStats = useMemo(() => {
    const advisors: Record<string, { count: number, totalScore: number }> = {};
    // Use unified filters
    const baseData = data.filter(d => {
      const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(d.mes);
      const matchCodigo = !selectedCodigo || d.codigo === selectedCodigo;
      const matchZona = !selectedZona || d.zona === selectedZona;
      const matchCanal = !selectedCanal || d.canal_ventas === selectedCanal;
      return matchMonth && matchCodigo && matchZona && matchCanal;
    });

    baseData.forEach(d => {
      if (!d.vendedor || d.cem_score === null) return;
      const name = d.vendedor;
      if (!advisors[name]) advisors[name] = { count: 0, totalScore: 0 };
      advisors[name].count += 1;
      advisors[name].totalScore += d.cem_score;
    });

    return Object.entries(advisors)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        avg: stats.totalScore / stats.count
      }))
      .filter(s => s.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [data, selectedMonths, selectedCodigo, selectedZona, selectedCanal]);

  const COLORS_CHART = ['#001E50', '#00B0F0', '#10b981', '#64748b', '#ef4444', '#334155'];

  if (loadingState === LoadingState.LOADING) {
    return <SkeletonLoader />;
  }

  return (
    <div className="space-y-8">
        {/* View Switcher */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <button 
              onClick={() => setActiveView('general')}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'general' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Icons.BarChart className="w-3 h-3" />
              Vista General
            </button>
            <button 
              onClick={() => setActiveView('ranking')}
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'ranking' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Icons.ClipboardList className="w-3 h-3" />
              Ranking Asesores
            </button>
          </div>

          {(selectedMonths.length > 0 || selectedCanal || selectedVendedor || selectedEstadoUnidad || selectedCodigo || selectedZona) && (
            <button 
              onClick={() => { setSelectedCanal(null); setSelectedVendedor(null); setSelectedEstadoUnidad(null); setSelectedCodigo(null); setSelectedZona(null); }}
              className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
            >
              <Icons.X className="w-3 h-3" />
              Limpiar Filtros
            </button>
          )}
        </div>

        {activeView === 'general' ? (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              <LuxuryKPICard title="Patentados" value={kpis.total} color="bg-slate-900" icon={Icons.FileText} />
              <LuxuryKPICard title="Declarados" value={kpis.declared} color="bg-blue-600" icon={Icons.TrendingUp} />
              <LuxuryKPICard title="Respondieron" value={kpis.responded} color="bg-emerald-600" icon={Icons.Check} />
              <LuxuryKPICard title="Faltan" value={kpis.pending} color="bg-rose-600" icon={Icons.Activity} />
              <LuxuryKPICard title="Promedio CEM" value={kpis.avgCem} color="bg-indigo-600" icon={Icons.Star} featured />
            </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ChartWrapper title="CEM por Mes">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataByMonth}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 5]} tick={{fontSize: 9, fontWeight: 800, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                />
                <Bar dataKey="cem" fill="#001E50" radius={[6, 6, 0, 0]} barSize={32}>
                   <LabelList dataKey="cem" position="top" style={{ fontSize: 10, fontWeight: 900, fill: '#001E50' }} formatter={(v: number) => v.toFixed(2)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>

        <ChartWrapper title="Tasa de Respuesta General">
          <div className="h-[300px] flex flex-col items-center justify-center">
            <div className="relative">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-slate-50"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="88"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={552.92}
                  strokeDashoffset={552.92 * (1 - kpis.responseRate / 100)}
                  className="text-blue-600 transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-slate-900 tracking-tighter">{kpis.responseRate.toFixed(1)}%</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Global</span>
              </div>
            </div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-8 flex items-center gap-2">
              <span className="text-blue-600">{kpis.responded}</span>
              <span>de</span>
              <span className="text-slate-900">{kpis.declared}</span>
              <span>encuestas</span>
            </div>
          </div>
        </ChartWrapper>
      </div>

      {/* Verbatim Section */}
      <div className="space-y-12">
        <DataTable 
            title="Detalle de Clientes"
            subtitle={`${filteredData.length} registros encontrados`}
            data={filteredData}
            columns={[
                {
                    header: 'Información del Cliente',
                    accessor: 'cliente_nombre',
                    render: (_: any, row: CemOsRecord) => (
                        <div>
                            <div className="font-black text-slate-900 text-sm tracking-tight mb-1">{row.cliente_nombre} {row.cliente_apellido}</div>
                            <div className="flex flex-wrap gap-2">
                                <StatusBadge status="info" label={`VIN: ${row.chasis || 'N/A'}`} />
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID: {row.nro_cliente || 'N/A'}</div>
                            </div>
                        </div>
                    )
                },
                {
                    header: 'Asesor Comercial',
                    accessor: 'vendedor',
                    render: (val: string, row: CemOsRecord) => (
                        <div>
                            <div className="text-xs font-black text-slate-900 uppercase tracking-tight">{val}</div>
                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{row.canal_ventas}</div>
                        </div>
                    )
                },
                {
                    header: 'Calificaciones (OS)',
                    accessor: 'cem_score',
                    render: (_: any, row: CemOsRecord) => (
                        <div className="flex gap-3">
                            {[
                                { label: 'CEM', val: row.cem_score },
                                { label: 'INT', val: row.encuesta_interna_score },
                                { label: 'TEM', val: row.encuesta_temprana_score }
                            ].map((score, sIdx) => (
                                <div key={sIdx} className="flex flex-col items-center gap-1.5">
                                    <span className="text-[8px] text-slate-400 uppercase font-black tracking-widest">{score.label}</span>
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border ${
                                        score.val === null ? 'bg-slate-50 text-slate-300 border-slate-100' :
                                        score.val >= 4.5 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                                        score.val >= 3.5 ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                                    }`}>
                                        {score.val || '-'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                },
                {
                    header: 'Verbatim / Comentarios',
                    accessor: 'comentario_cem',
                    render: (_: any, row: CemOsRecord) => (
                        <div className="space-y-2 max-w-xs">
                            {row.comentario_cem && (
                                <div className="text-[10px] text-slate-600 italic leading-relaxed">
                                    <span className="font-black uppercase tracking-widest text-blue-500 mr-1">CEM:</span>
                                    "{row.comentario_cem}"
                                </div>
                            )}
                            {row.comentario_interna && (
                                <div className="text-[10px] text-slate-600 italic leading-relaxed">
                                    <span className="font-black uppercase tracking-widest text-emerald-500 mr-1">INT:</span>
                                    "{row.comentario_interna}"
                                </div>
                            )}
                        </div>
                    )
                }
            ]}
            pageSize={10}
        />
      </div>

      {/* Advisor Performance & Distribution Section */}
      <div className="grid grid-cols-1 gap-8">
        <ChartWrapper 
            title="Encuestas por Asesor"
            subtitle="Comparativa Activas vs Respondidas"
        >
          <div className="flex items-center justify-end gap-6 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-900"></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Activas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Respondidas</span>
            </div>
          </div>
          <div className="h-[700px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={advisorStats} layout="vertical" margin={{ left: 20, right: 60 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#1e293b' }} 
                  width={180}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px 16px' }}
                />
                <Bar dataKey="active" name="Activas" fill="#001E50" radius={[0, 6, 6, 0]} barSize={16}>
                   <LabelList dataKey="active" position="right" style={{ fontSize: 10, fontWeight: 900, fill: '#1e293b' }} />
                </Bar>
                <Bar dataKey="responded" name="Respondidas" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16}>
                   <LabelList dataKey="responded" position="right" style={{ fontSize: 10, fontWeight: 900, fill: '#10b981' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>
      </div>
        </>
      ) : (
        <>
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <ChartWrapper 
            title="Ranking de Asesores"
            subtitle="Performance por Encuestas CEM"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
            <div className="flex flex-col items-end gap-2 ml-auto">
              <div className="px-6 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtros: </span>
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedMonths.length > 0 ? selectedMonths.join(', ') : 'Anual'} | {selectedCodigo || 'Todas'} | {selectedZona || 'Todas'} | {selectedCanal || 'Todos'}</span>
              </div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{detailedRankingStats.length} asesores en el ranking</span>
            </div>
          </div>
          <div className="h-[800px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detailedRankingStats} layout="vertical" margin={{ left: 20, right: 120 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 11, fontWeight: 900, fill: '#1e293b' }} 
                  width={220}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)', padding: '16px 24px' }}
                  formatter={(value: number, name: string) => [
                    name === 'count' ? `${value} encuestas` : `${value.toFixed(2)} promedio`,
                    name === 'count' ? 'Cantidad' : 'Promedio OS'
                  ]}
                />
                <Bar dataKey="count" name="Cantidad Encuestas" fill="#001E50" radius={[0, 8, 8, 0]} barSize={32}>
                   <LabelList 
                      dataKey="count" 
                      position="right" 
                      content={(props: any) => {
                        const { x, y, width, height, value, index } = props;
                        const avg = detailedRankingStats[index]?.avg || 0;
                        return (
                          <g>
                            <rect 
                              x={x + width + 15} 
                              y={y + height / 2 - 12} 
                              width={40} 
                              height={24} 
                              rx={8} 
                              fill="#f8fafc" 
                            />
                            <text 
                              x={x + width + 35} 
                              y={y + height / 2 + 5} 
                              textAnchor="middle"
                              fill="#1e293b" 
                              fontSize={12} 
                              fontWeight={900}
                            >
                              {value}
                            </text>
                            
                            <rect 
                              x={x + width + 65} 
                              y={y + height / 2 - 12} 
                              width={85} 
                              height={24} 
                              rx={8} 
                              fill="#00B0F0" 
                            />
                            <text 
                              x={x + width + 107} 
                              y={y + height / 2 + 5} 
                              textAnchor="middle"
                              fill="white" 
                              fontSize={11} 
                              fontWeight={900}
                            >
                              OS: {avg.toFixed(2)}
                            </text>
                          </g>
                        );
                      }}
                   />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>
      </div>
    </>
  )}
    </div>
  );
};

export default CemOsDashboard;
