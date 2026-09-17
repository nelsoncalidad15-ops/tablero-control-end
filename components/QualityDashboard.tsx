import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, ScatterChart, Scatter, ZAxis, ReferenceLine, ComposedChart, LineChart, Line
} from 'recharts';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { DashboardFrame, LuxuryKPICard, SkeletonLoader, StatusBadge, InsightCard, DataTable, ChartWrapper, MonthSelector } from './DashboardUI';
import { AreaConfig, QualityRecord, LoadingState } from '../types';
import { fetchQualityData } from '../services/dataService';
import { Icons } from './Icon';
import { MONTHS } from '../constants';

interface QualityDashboardProps {
  sheetUrl: string;
  onBack: () => void;
  area: AreaConfig;
}

const QualityDashboard: React.FC<QualityDashboardProps> = ({ sheetUrl, onBack, area }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<QualityRecord[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  
  // Filters
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
  const [selectedResponsable, setSelectedResponsable] = useState<string | null>(null);

  const [availableBranches, setAvailableBranches] = useState<string[]>([]);

  // Helper: Consistent Normalization
  const normalizeString = (str: string) => {
      if (!str) return '';
      const trimmed = str.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  useEffect(() => {
    const loadData = async () => {
      setLoadingState(LoadingState.LOADING);
      try {
        if (!sheetUrl) {
           setLoadingState(LoadingState.ERROR); 
           return;
        }
        const fetchedData = await fetchQualityData(sheetUrl);
        setData(fetchedData);
        
        const branches = [...new Set(fetchedData.map(d => d.sucursal))].sort();
        setAvailableBranches(branches);
        setLoadingState(LoadingState.SUCCESS);
      } catch (error) {
        console.error(error);
        setLoadingState(LoadingState.ERROR);
      }
    };
    loadData();
  }, [sheetUrl]);

  const toggleBranch = (branch: string) => {
    if (selectedBranches.includes(branch)) {
      setSelectedBranches(selectedBranches.filter(b => b !== branch));
    } else {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  const handleMotivoClick = (motivoName: string) => {
      if (selectedMotivo === motivoName) {
          setSelectedMotivo(null);
      } else {
          setSelectedMotivo(motivoName);
      }
  };

  const toggleMonth = (month: string) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

  // --- DATA PROCESSING LAYERS ---

  const baseFilteredData = useMemo(() => {
    return data.filter(item => {
      const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(item.mes);
      const matchBranch = selectedBranches.length === 0 || selectedBranches.includes(item.sucursal);
      return matchMonth && matchBranch;
    });
  }, [data, selectedMonths, selectedBranches]);

  const contextData = useMemo(() => {
      return baseFilteredData.filter(d => {
          if (selectedResponsable) {
              const resp = d.asesor ? normalizeString(d.asesor) : (d.responsable ? normalizeString(d.responsable) : 'Sin Asignar');
              return resp === selectedResponsable;
          }
          return true;
      });
  }, [baseFilteredData, selectedResponsable]);

  const displayData = useMemo(() => {
      return contextData.filter(d => {
          if (selectedMotivo) {
             if (!d.motivo) return false;
             const parts = d.motivo.split(/[,;\n\r]+/).map(s => normalizeString(s));
             if (!parts.includes(selectedMotivo)) return false;
          }
          return true;
      });
  }, [contextData, selectedMotivo]);

  const motivoChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    const IGNORED_MOTIVOS = ['motivos varios', 'sin motivo', 'n/a', 'ninguno', '-', '0', ''];

    contextData.forEach(d => {
        const raw = d.motivo || '';
        const parts = raw.split(/[,;\n\r]+/).map(s => s.trim());
        
        parts.forEach(part => {
            if (!part) return; 
            const normalized = normalizeString(part);
            if (IGNORED_MOTIVOS.includes(normalized.toLowerCase())) return;

            counts[normalized] = (counts[normalized] || 0) + 1;
        });
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [contextData]);

  const topMotivoChartData = useMemo(() => motivoChartData.slice(0, 10), [motivoChartData]);

  const resolutionChartData = useMemo(() => {
    const counts = { Si: 0, No: 0 };
    contextData.forEach(d => {
        const val = d.resuelto ? d.resuelto.trim().toLowerCase() : '';
        if (val === 'si' || val === 'sÃ­') counts.Si++;
        else if (val === 'no') counts.No++;
    });
    
    const res = [];
    if (counts.Si > 0) res.push({ name: 'Resuelto', value: counts.Si, fill: '#10B981' });
    if (counts.No > 0) res.push({ name: 'No Resuelto', value: counts.No, fill: '#EF4444' });
    return res;
  }, [contextData]);

  const dynamicChartHeight = Math.max(400, motivoChartData.length * 35);

  const sectorChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    contextData.forEach(d => {
        const raw = d.sector || 'Sin Asignar';
        const parts = raw.split(/[,;\n\r]+/).map(s => s.trim());
        parts.forEach(part => {
             if (!part || part.toLowerCase() === 'sin sector') return;
             const normalized = normalizeString(part);
             counts[normalized] = (counts[normalized] || 0) + 1;
        });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [contextData]);

  const uniqueClaimsCount = useMemo(() => {
    const uniqueOrders = new Set(
        displayData
            .map(d => d.orden)
            .filter(o => o && o.toString().trim() !== '')
    );
    return uniqueOrders.size;
  }, [displayData]);

  const totalClaimsCount = useMemo(() => displayData.length, [displayData]);

  const responsableTableData = useMemo(() => {
    const mapRespToOrs: Record<string, Set<string>> = {};

    baseFilteredData.forEach(d => {
        const key = d.asesor ? normalizeString(d.asesor) : (d.responsable ? normalizeString(d.responsable) : 'Sin Asignar');
        if (!mapRespToOrs[key]) mapRespToOrs[key] = new Set();
        if (d.orden) mapRespToOrs[key].add(d.orden.toString().trim());
    });

    return Object.entries(mapRespToOrs)
      .map(([name, setOfOrs]) => ({ name, value: setOfOrs.size }))
      .sort((a, b) => b.value - a.value);
  }, [baseFilteredData]);

  const annualClaimsChartData = useMemo(() => {
    const monthCounts: Record<string, Set<string>> = {};
    MONTHS.forEach(m => {
        monthCounts[m] = new Set();
    });

    // We use all data for the annual chart, or maybe just filtered by branch?
    // Usually annual charts show the full year trend.
    const chartBaseData = selectedBranches.length > 0 
        ? data.filter(d => selectedBranches.includes(d.sucursal))
        : data;

    chartBaseData.forEach(d => {
        if (d.mes && monthCounts[d.mes] && d.orden) {
            monthCounts[d.mes].add(d.orden.toString().trim());
        }
    });

    return MONTHS.map(m => ({
        name: m,
        value: monthCounts[m].size
    }));
  }, [data, selectedBranches]);

  // if (loadingState === LoadingState.LOADING) return <SkeletonLoader />;

  const filters = (
    <div className="space-y-6">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-white overflow-hidden">
            <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 font-black text-[9px] text-slate-400 uppercase tracking-[0.2em] flex items-center justify-between">
                Sucursales
                <Icons.MapPin className="w-3 h-3 text-slate-300" />
            </div>
            <div className="p-3 space-y-1 max-h-[300px] overflow-y-auto no-scrollbar">
                {availableBranches.map(b => (
                    <button
                        key={b}
                        onClick={() => toggleBranch(b)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-[11px] transition-all flex justify-between items-center group ${
                            selectedBranches.includes(b) ? 'bg-slate-950 text-white font-black shadow-lg shadow-slate-900/20' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        {b}
                        {selectedBranches.includes(b) ? (
                            <Icons.Check className="w-3 h-3" />
                        ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-blue-400 transition-colors"></div>
                        )}
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-white p-6">
            <h3 className="font-black text-[9px] text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                <span>Motivo de Reclamo</span>
                <Icons.Filter className="w-3 h-3 text-indigo-400" />
            </h3>
            <div className="relative">
                <select 
                    value={selectedMotivo || ''} 
                    onChange={(e) => setSelectedMotivo(e.target.value || null)}
                    className="w-full text-[11px] font-black uppercase tracking-widest p-4 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer pr-10"
                >
                    <option value="">Todos los motivos</option>
                    {motivoChartData.map(m => (
                        <option key={m.name} value={m.name}>
                            {m.name}
                        </option>
                    ))}
                </select>
                <Icons.ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-sm border border-white p-6">
            <h3 className="font-black text-[9px] text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                <span>Responsable / Asesor</span>
                <Icons.Users className="w-3 h-3 text-emerald-400" />
            </h3>
            <div className="relative">
                <select 
                    value={selectedResponsable || ''} 
                    onChange={(e) => setSelectedResponsable(e.target.value || null)}
                    className="w-full text-[11px] font-black uppercase tracking-widest p-4 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer pr-10"
                >
                    <option value="">Todos los asesores</option>
                    {responsableTableData.map(r => (
                        <option key={r.name} value={r.name}>
                            {r.name}
                        </option>
                    ))}
                </select>
                <Icons.ChevronDown className="w-4 h-4 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
        </div>
    </div>
  );

  return (
    <DashboardFrame
        title="Gestión de Reclamos"
        subtitle="Calidad Postventa • Análisis de Satisfacción y Procesos"
        lastUpdated={new Date().toLocaleTimeString()}
        onExport={() => navigate('/report')}
        isLoading={loadingState === LoadingState.LOADING}
        onBack={onBack}
    >
        <div className="space-y-5 pb-16 bg-[#f7f9fc]">

            {/* Compact Professional Filters Bar */}
            <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 xl:gap-6">
                    {/* Periodo */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Icons.Calendar className="w-3.5 h-3.5 text-blue-600" /> Periodo
                        </span>
                        <MonthSelector 
                            selectedMonths={selectedMonths} 
                            onToggle={toggleMonth} 
                            months={MONTHS} 
                        />
                    </div>

                    <div className="hidden xl:block h-8 w-px bg-slate-200"></div>

                    {/* Sucursal */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Icons.MapPin className="w-3.5 h-3.5 text-emerald-600" /> Sucursal
                        </span>
                        <div className="flex flex-wrap gap-1">
                            {['', ...availableBranches].map((suc) => (
                                <button
                                    key={suc}
                                    onClick={() => {
                                        if (suc === '') setSelectedBranches([]);
                                        else setSelectedBranches([suc]);
                                    }}
                                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
                                        (selectedBranches.length === 1 && selectedBranches[0] === suc) || (suc === '' && selectedBranches.length === 0)
                                            ? 'bg-slate-950 text-white border-slate-950 shadow-sm' 
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                    }`}
                                >
                                    {suc || 'Todas'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="hidden xl:block h-8 w-px bg-slate-200"></div>

                    {/* Responsable */}
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Icons.User className="w-3.5 h-3.5 text-indigo-600" /> Responsable
                        </span>
                        <select 
                            value={selectedResponsable || ''} 
                            onChange={(e) => setSelectedResponsable(e.target.value || null)}
                            className="text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 outline-none cursor-pointer hover:border-slate-300 transition-colors max-w-[160px] sm:max-w-[200px]"
                        >
                            <option value="">Todos los responsables</option>
                            {responsableTableData.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                        </select>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                    {(selectedMonths.length > 0 || selectedBranches.length > 0 || selectedMotivo || selectedResponsable) && (
                        <button 
                            onClick={() => {
                                setSelectedMonths([]);
                                setSelectedBranches([]);
                                setSelectedMotivo(null);
                                setSelectedResponsable(null);
                            }}
                            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1.5 hover:bg-slate-200 transition-all"
                            title="Limpiar filtros"
                        >
                            <Icons.X className="w-3.5 h-3.5" /> Limpiar
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => navigate('/report')}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-slate-800"
                    >
                        <Icons.FileText className="h-3.5 w-3.5" />
                        Generar reporte
                    </button>
                </div>
            </div>

            {/* Modern KPIs Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <motion.div 
                    whileHover={{ y: -3 }}
                    className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
                                <Icons.ClipboardList className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Volumen Total</h3>
                                <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Reclamos Únicos</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black text-slate-950 tracking-tight leading-none">{uniqueClaimsCount}</span>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Casos (ORs)</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    whileHover={{ y: -3 }}
                    className="bg-slate-950 p-5 md:p-6 rounded-2xl text-white shadow-lg shadow-slate-900/15"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white">
                                <Icons.Tag className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Análisis de Reclamos</h3>
                                <p className="text-xs font-bold text-white uppercase tracking-tight">Cantidad de Reclamos</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black text-white tracking-tight leading-none">{totalClaimsCount}</span>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Registros</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    whileHover={{ y: -3 }}
                    className="bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm"
                >
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                                <Icons.CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Efectividad</h3>
                                <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">Resolución</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-black text-slate-950 tracking-tight leading-none">
                            {Math.round((resolutionChartData.find(d => d.name === 'Resuelto')?.value || 0) / (uniqueClaimsCount || 1) * 100)}%
                        </span>
                        <div className="flex flex-col">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tasa de Éxito</span>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 xl:gap-5">
                {/* Annual Evolution - Large */}
                <div className="lg:col-span-2">
                    <ChartWrapper 
                        title="Evolucion anual de reclamos"
                        subtitle="Casos unicos por mes"
                    >
                        <div className="h-[340px] w-full mt-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={annualClaimsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#2563EB" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#1E40AF" stopOpacity={1} />
                                        </linearGradient>
                                        <linearGradient id="barGradientInactive" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#cbd5e1" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#94a3b8" stopOpacity={1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fontSize: 11, fill: '#64748b', fontWeight: 700}}
                                        interval={0}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b', fontWeight: 700}} />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc'}} 
                                        contentStyle={{borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 16px 30px -12px rgb(15 23 42 / 0.18)', fontSize: '12px', fontWeight: 600}} 
                                    />
                                    <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={34}>
                                        {annualClaimsChartData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={selectedMonths.includes(entry.name) ? "url(#barGradient)" : "url(#barGradientInactive)"}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartWrapper>
                </div>

                {/* Resolution Pie Chart */}
                <ChartWrapper title="Estado de resolucion" subtitle="Distribucion de casos">
                    <div className="h-[340px] relative mt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={resolutionChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={72}
                                    outerRadius={106}
                                    paddingAngle={6}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {resolutionChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Resuelto' ? '#10B981' : '#F43F5E'} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 16px 30px -12px rgb(15 23 42 / 0.18)'}} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 600, paddingTop: '10px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-4xl font-black text-slate-950 leading-none">
                                    {Math.round((resolutionChartData.find(d => d.name === 'Resuelto')?.value || 0) / (uniqueClaimsCount || 1) * 100)}%
                                </span>
                                <span className="block text-[10px] text-slate-400 font-black uppercase tracking-widest mt-3">Exito</span>
                            </div>
                        </div>
                    </div>
                </ChartWrapper>
            </div>

            {/* Motivos Chart - Full Width */}
            <ChartWrapper 
                title="Motivos de reclamo"
                subtitle="Top 10 de incidencias"
            >
                <div style={{ height: `${Math.max(500, topMotivoChartData.length * 55)}px` }} className="mt-7">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                            layout="vertical" 
                            data={topMotivoChartData} 
                            margin={{ top: 10, right: 100, left: 20, bottom: 10 }}
                            barCategoryGap={10}
                        >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                width={220} 
                                tick={{fontSize: 11, fill: '#64748b', fontWeight: 900}} 
                                axisLine={false}
                                tickLine={false}
                                interval={0} 
                            />
                            <Tooltip 
                                cursor={{fill: '#f8fafc', opacity: 0.5}} 
                                contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '20px'}} 
                            />
                            <Bar 
                                dataKey="value" 
                                barSize={32} 
                                radius={[0, 16, 16, 0]} 
                                label={{ position: 'right', fill: '#1e293b', fontSize: 12, fontWeight: 900, dx: 15 }}
                                onClick={(data) => handleMotivoClick(data.name)}
                                cursor="pointer"
                            >
                                {topMotivoChartData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={selectedMotivo === entry.name ? "#2563EB" : "#0f172a"} 
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </ChartWrapper>

            {/* Sector Responsable Chart - Full Width */}
            {sectorChartData.length > 0 && (
                <ChartWrapper 
                    title="Sector responsable"
                    subtitle="Distribucion por area"
                >
                    <div style={{ height: `${Math.max(400, sectorChartData.length * 55)}px` }} className="mt-7">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                layout="vertical" 
                                data={sectorChartData} 
                                margin={{ top: 10, right: 100, left: 20, bottom: 10 }}
                                barCategoryGap={10}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    type="category" 
                                    dataKey="name" 
                                    width={220} 
                                    tick={{fontSize: 11, fill: '#64748b', fontWeight: 900}} 
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0} 
                                />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc', opacity: 0.5}} 
                                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '20px'}} 
                                />
                                <Bar 
                                    dataKey="value" 
                                    barSize={32} 
                                    radius={[0, 16, 16, 0]} 
                                    label={{ position: 'right', fill: '#1e293b', fontSize: 12, fontWeight: 900, dx: 15 }}
                                    fill="#4f46e5"
                                >
                                    {sectorChartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={index % 2 === 0 ? "#4f46e5" : "#6366f1"} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>
            )}

            {/* Performance por Asesor Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Performance por Asesor</h3>
                        <p className="text-[11px] font-semibold text-slate-500">Distribución de carga</p>
                    </div>
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-700">
                        <Icons.Users className="w-4 h-4" />
                    </div>
                </div>
                <div className="p-4 md:p-5 overflow-x-auto no-scrollbar">
                    <div className="flex gap-3 min-w-max">
                        {responsableTableData.map((r, i) => {
                            const isSelected = selectedResponsable === r.name;
                            return (
                                <motion.button 
                                    key={i} 
                                    whileHover={{ y: -2 }}
                                    onClick={() => setSelectedResponsable(isSelected ? null : r.name)}
                                    className={`flex flex-col justify-center items-center min-w-[150px] p-4 rounded-xl transition-all border ${
                                        isSelected 
                                        ? 'bg-slate-950 text-white border-slate-950 shadow-md' 
                                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-50 text-slate-400'}`}>
                                        <Icons.User className="w-4 h-4" />
                                    </div>
                                    <span className="text-[11px] font-bold mb-2 text-center line-clamp-2 max-w-[130px] leading-tight">{r.name}</span>
                                    <div className={`text-2xl font-black ${isSelected ? 'text-blue-400' : 'text-slate-950'}`}>{r.value}</div>
                                    <div className="text-[9px] font-semibold opacity-60 mt-0.5">Reclamos</div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modern Detail Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 md:p-6 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Registros Detallados</h3>
                        <p className="text-xs text-slate-500 mt-1">Historial completo de gestiones</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl shadow-sm">
                            {displayData.length} Resultados
                        </span>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-1/3">Cliente / Información</th>
                                <th className="p-5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-2/3">Detalle del Reclamo y Gestión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayData.slice(0, 50).map((record, idx) => {
                                const isResolved = record.resuelto?.toLowerCase().includes('si');
                                const isNotResolved = record.resuelto?.toLowerCase().includes('no');
                                const advisor = record.asesor ? normalizeString(record.asesor) : (record.responsable ? normalizeString(record.responsable) : 'Sin Asignar');
                                
                                return (
                                <tr key={idx} className="hover:bg-slate-50/40 transition-colors group">
                                    <td className="p-5 align-top border-r border-slate-100">
                                        <div className="text-slate-950 font-bold text-base tracking-tight mb-3 leading-tight">{record.cliente}</div>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            <div className="flex items-center gap-1.5 bg-slate-950 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide shadow-sm">
                                                <Icons.FileText className="w-3 h-3 text-blue-400" />
                                                OR: {record.orden}
                                            </div>
                                            <div className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide border border-slate-200">
                                                <Icons.MapPin className="w-3 h-3 text-slate-400" />
                                                {record.sucursal}
                                            </div>
                                            {record.categorizacion && record.categorizacion !== '-' && (
                                                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide border border-blue-100">
                                                    <Icons.Tag className="w-3 h-3" />
                                                    {record.categorizacion}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-2.5">
                                            <div className="flex items-center gap-2.5 text-xs font-medium text-slate-600 group-hover:text-blue-700 transition-colors">
                                                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                                                    <Icons.User className="w-3.5 h-3.5" />
                                                </div>
                                                <span>Asesor: <strong>{advisor}</strong></span>
                                            </div>
                                            {record.sector && (
                                                <div className="flex items-center gap-2.5 text-xs font-medium text-slate-600">
                                                    <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center">
                                                        <Icons.ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                                                    </div>
                                                    <span>Sector: <strong>{normalizeString(record.sector)}</strong></span>
                                                </div>
                                            )}
                                        </div>

                                        {(isResolved || isNotResolved) && (
                                            <div className="mt-4">
                                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border ${
                                                    isResolved 
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                    : 'bg-rose-50 text-rose-700 border-rose-200'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${isResolved ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                    {isResolved ? 'Resuelto' : 'Pendiente'}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-5 text-sm text-slate-600 leading-relaxed align-top">
                                        <div className="space-y-4">
                                            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 relative group-hover:border-blue-100 transition-colors">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Observación del Reclamo</span>
                                                <p className="text-sm font-medium text-slate-700 leading-6">
                                                    {record.observacion || <span className="italic opacity-40">Sin descripción registrada</span>}
                                                </p>
                                            </div>
                                            
                                            {record.nota_reclamo && record.nota_reclamo.trim() !== '' && (
                                                <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 relative">
                                                    <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block mb-2">Nota del Reclamo</span>
                                                    <p className="text-sm font-medium text-slate-700 leading-6">
                                                        {record.nota_reclamo}
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {record.motivo && record.motivo !== 'Sin Motivo' && (
                                                <div className="flex flex-wrap gap-3">
                                                    {record.motivo.split(/[,;\n\r]+/).map((tag, tIdx) => {
                                                        const trimmedTag = normalizeString(tag);
                                                        if (!trimmedTag || ['Motivos Varios', 'Sin Motivo', 'Sin motivo'].includes(trimmedTag)) return null;
                                                        
                                                        const isSelected = selectedMotivo === trimmedTag;
                                                        
                                                        return (
                                                            <span key={tIdx} className={`text-[10px] font-semibold tracking-[0.08em] px-4 py-2 rounded-xl border transition-all ${
                                                                isSelected 
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                                                : 'bg-white text-slate-500 border-slate-200 group-hover:border-slate-300'
                                                            }`}>
                                                                {trimmedTag}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            
                                            {record.observacion_resolucion && (
                                                 <div className="mt-7 bg-slate-950 rounded-[1.75rem] p-7 text-[13px] text-slate-200 relative overflow-hidden shadow-lg">
                                                     <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                                     <div className="flex items-center gap-3 mb-4">
                                                        <Icons.CheckCircle className="w-4 h-4 text-blue-400" />
                                                        <span className="font-semibold text-blue-400 not-italic text-[11px] tracking-[0.14em]">Resolucion de Gestion</span>
                                                     </div>
                                                     <p className="leading-6 font-medium">
                                                         {record.observacion_resolucion}
                                                     </p>
                                                 </div>
                                            )}

                                            {/* Root Cause and Actions Section */}
                                            {(record.causa_raiz || record.accion_contencion || record.accion_correctiva) && (
                                                <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {record.causa_raiz && (
                                                        <div className="bg-rose-50/60 p-5 rounded-[1.5rem] border border-rose-100">
                                                            <span className="text-[10px] text-rose-500 font-semibold tracking-[0.1em] block mb-2">Causa Raiz</span>
                                                            <p className="text-[12px] font-medium text-slate-700 leading-6">{record.causa_raiz}</p>
                                                        </div>
                                                    )}
                                                    {record.accion_contencion && (
                                                        <div className="bg-amber-50/60 p-5 rounded-[1.5rem] border border-amber-100">
                                                            <span className="text-[10px] text-amber-600 font-semibold tracking-[0.1em] block mb-2">Accion Contencion</span>
                                                            <p className="text-[12px] font-medium text-slate-700 leading-6">{record.accion_contencion}</p>
                                                        </div>
                                                    )}
                                                    {record.accion_correctiva && (
                                                        <div className="bg-emerald-50/60 p-5 rounded-[1.5rem] border border-emerald-100">
                                                            <span className="text-[10px] text-emerald-600 font-semibold tracking-[0.1em] block mb-2">Accion Correctiva</span>
                                                            <p className="text-[12px] font-medium text-slate-700 leading-6">{record.accion_correctiva}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                                );})}
                        </tbody>
                    </table>
                </div>
                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-center">
                    <button className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-800 hover:bg-slate-950 hover:text-white transition-all shadow-sm">
                        Cargar mas resultados
                    </button>
                </div>
            </div>
        </div>
    </DashboardFrame>
  );
};

export default QualityDashboard;


