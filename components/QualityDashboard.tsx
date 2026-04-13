import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, ScatterChart, Scatter, ZAxis, ReferenceLine, ComposedChart, LineChart, Line
} from 'recharts';
import { motion } from 'motion/react';
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
        title="Intelligence Hub"
        subtitle="Analisis de Calidad Autosol"
        lastUpdated={new Date().toLocaleTimeString()}
        isLoading={loadingState === LoadingState.LOADING}
        onBack={onBack}
    >
        <div className="space-y-8 pb-24 -m-6 p-6 md:p-8 bg-[#f6f8fb] min-h-screen">

            {/* Modern Header Section */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                <div className="max-w-3xl">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-semibold tracking-[0.16em] mb-4"
                    >
                        <Icons.Activity className="w-3 h-3" /> Calidad Postventa
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-black text-slate-950 tracking-tight leading-none mb-3">
                        GESTION DE <span className="text-blue-600">RECLAMOS</span>
                    </h1>
                    <p className="text-sm text-slate-500 leading-relaxed">
                        Analisis de Satisfaccion y Procesos • {area.name}
                    </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full xl:w-auto xl:min-w-[320px]">
                    <div className="text-right">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] block mb-2">Total Casos</span>
                        <div className="flex items-baseline justify-end gap-2">
                            <span className="text-5xl font-black text-slate-950 leading-none">{uniqueClaimsCount}</span>
                            <span className="text-xs font-black text-blue-500 uppercase tracking-widest">ORs</span>
                        </div>
                    </div>
                    <div className="h-12 w-px bg-slate-200"></div>
                    <div className="text-right">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] block mb-2">Resolucion</span>
                        <div className="flex items-baseline justify-end gap-2">
                            <span className="text-5xl font-black text-slate-950 leading-none">
                                {Math.round((resolutionChartData.find(d => d.name === 'Resuelto')?.value || 0) / (uniqueClaimsCount || 1) * 100)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Professional Horizontal Filters Bar - NOW AT THE TOP */}
            <div className="bg-white px-6 md:px-8 py-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-wrap items-end gap-6 md:gap-8">
                <div className="flex flex-col gap-2 min-w-[240px]">
                    <span className="text-[11px] font-semibold text-slate-500 tracking-[0.14em] flex items-center gap-2">
                        <Icons.Calendar className="w-3 h-3" /> Periodo
                    </span>
                    <MonthSelector 
                        selectedMonths={selectedMonths} 
                        onToggle={toggleMonth} 
                        months={MONTHS} 
                    />
                </div>

                <div className="hidden md:block h-10 w-px bg-slate-200"></div>

                <div className="flex flex-col gap-2 min-w-[240px]">
                    <span className="text-[11px] font-semibold text-slate-500 tracking-[0.14em] flex items-center gap-2">
                        <Icons.MapPin className="w-3 h-3" /> Sucursal
                    </span>
                    <div className="flex flex-wrap gap-2">
                        {['', ...availableBranches].map((suc) => (
                            <button
                                key={suc}
                                onClick={() => {
                                    if (suc === '') setSelectedBranches([]);
                                    else setSelectedBranches([suc]);
                                }}
                                className={`px-4 py-2 rounded-xl text-[11px] font-semibold transition-all border ${
                                    (selectedBranches.length === 1 && selectedBranches[0] === suc) || (suc === '' && selectedBranches.length === 0)
                                        ? 'bg-slate-950 text-white border-slate-950 shadow-sm' 
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                {suc || 'Todas'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="hidden md:block h-10 w-px bg-slate-200"></div>

                <div className="flex flex-col gap-2 min-w-[240px]">
                    <span className="text-[11px] font-semibold text-slate-500 tracking-[0.14em] flex items-center gap-2">
                        <Icons.User className="w-3 h-3" /> Responsable
                    </span>
                    <select 
                        value={selectedResponsable || ''} 
                        onChange={(e) => setSelectedResponsable(e.target.value || null)}
                        className="text-sm font-semibold text-slate-800 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 outline-none cursor-pointer hover:border-slate-300 transition-colors min-w-[220px]"
                    >
                        <option value="">Todos los responsables</option>
                        {responsableTableData.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                    </select>
                </div>

                <div className="ml-auto">
                    <button 
                        onClick={() => {
                            setSelectedMonths([]);
                            setSelectedBranches([]);
                            setSelectedMotivo(null);
                            setSelectedResponsable(null);
                        }}
                        className="px-5 py-2.5 bg-white text-slate-700 rounded-2xl text-[11px] font-semibold border border-slate-200 flex items-center gap-2.5 hover:bg-slate-50 transition-all"
                    >
                        <Icons.X className="w-3 h-3" /> Limpiar
                    </button>
                </div>
            </div>

            {/* Modern KPIs Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <motion.div 
                    whileHover={{ y: -4 }}
                    className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700">
                                <Icons.ClipboardList className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Volumen Total</h3>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Reclamos Unicos</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3 mb-10">
                        <span className="text-5xl font-black text-slate-950 tracking-tight leading-none">{uniqueClaimsCount}</span>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Casos</span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                                <Icons.TrendingDown className="w-3 h-3" /> -8%
                            </span>
                        </div>
                    </div>
                    {/* Decorative background number */}
                    <div className="hidden">
                        01
                    </div>
                </motion.div>

                <motion.div 
                    whileHover={{ y: -4 }}
                    className="bg-slate-950 p-7 rounded-[2rem] text-white shadow-lg shadow-slate-900/15"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                                <Icons.Tag className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Analisis de Reclamos</h3>
                                <p className="text-xs font-black text-white uppercase tracking-widest">Cantidad de Reclamos</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3 mb-10">
                        <span className="text-5xl font-black text-white tracking-tight leading-none">{totalClaimsCount}</span>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">Registros</span>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                                <Icons.Activity className="w-3 h-3" /> IA Activa
                            </span>
                        </div>
                    </div>
                    {/* Decorative background number */}
                    <div className="hidden">
                        02
                    </div>
                </motion.div>

                <motion.div 
                    whileHover={{ y: -4 }}
                    className="bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm"
                >
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                                <Icons.CheckCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Efectividad</h3>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Resolucion</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3 mb-10">
                        <span className="text-5xl font-black text-slate-950 tracking-tight leading-none">
                            {Math.round((resolutionChartData.find(d => d.name === 'Resuelto')?.value || 0) / (uniqueClaimsCount || 1) * 100)}%
                        </span>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Tasa</span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                                <Icons.TrendingUp className="w-3 h-3" /> +4%
                            </span>
                        </div>
                    </div>
                    {/* Decorative background number */}
                    <div className="hidden">
                        03
                    </div>
                </motion.div>
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Annual Evolution - Large */}
                <div className="xl:col-span-2">
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
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Performance por Asesor</h3>
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">Distribucion de carga</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-700">
                        <Icons.Users className="w-5 h-5" />
                    </div>
                </div>
                <div className="p-6 overflow-x-auto no-scrollbar">
                    <div className="flex gap-4 min-w-max">
                        {responsableTableData.map((r, i) => {
                            const isSelected = selectedResponsable === r.name;
                            return (
                                <motion.button 
                                    key={i} 
                                    whileHover={{ y: -3 }}
                                    onClick={() => setSelectedResponsable(isSelected ? null : r.name)}
                                    className={`flex flex-col justify-center items-center min-w-[170px] p-6 rounded-[1.75rem] transition-all border ${
                                        isSelected 
                                        ? 'bg-slate-950 text-white border-slate-950 shadow-xl shadow-slate-900/40' 
                                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-100'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-50 text-slate-400'}`}>
                                        <Icons.User className="w-5 h-5" />
                                    </div>
                                    <span className="text-[12px] font-semibold mb-3 text-center line-clamp-2 max-w-[140px] leading-tight">{r.name}</span>
                                    <div className={`text-3xl font-black ${isSelected ? 'text-blue-400' : 'text-slate-950'}`}>{r.value}</div>
                                    <div className="text-[10px] font-medium opacity-60 mt-1">Reclamos</div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modern Detail Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-8 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Registros Detallados</h3>
                        <p className="text-sm text-slate-500 mt-2">Historial completo de gestiones</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="text-sm font-semibold text-slate-600 bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-sm">
                            {displayData.length} Resultados
                        </span>
                        <button className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm">
                            <Icons.Download className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="p-8 text-[11px] font-semibold text-slate-500 tracking-[0.14em] w-1/3">Cliente / Informacion</th>
                                <th className="p-8 text-[11px] font-semibold text-slate-500 tracking-[0.14em] w-2/3">Detalle del Reclamo y Gestion</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayData.slice(0, 50).map((record, idx) => {
                                const isResolved = record.resuelto?.toLowerCase().includes('si');
                                const isNotResolved = record.resuelto?.toLowerCase().includes('no');
                                const advisor = record.asesor ? normalizeString(record.asesor) : (record.responsable ? normalizeString(record.responsable) : 'Sin Asignar');
                                
                                return (
                                <tr key={idx} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="p-8 align-top border-r border-slate-100">
                                        <div className="text-slate-950 font-black text-lg tracking-tight mb-5 leading-tight">{record.cliente}</div>
                                        <div className="flex flex-wrap gap-3 mb-10">
                                            <div className="flex items-center gap-2 bg-slate-950 text-white px-3.5 py-2 rounded-xl text-[10px] font-semibold tracking-wide shadow-sm">
                                                <Icons.FileText className="w-3 h-3 text-blue-400" />
                                                OR: {record.orden}
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-3.5 py-2 rounded-xl text-[10px] font-semibold tracking-wide border border-slate-200">
                                                <Icons.MapPin className="w-3 h-3 text-slate-300" />
                                                {record.sucursal}
                                            </div>
                                            {record.categorizacion && record.categorizacion !== '-' && (
                                                <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3.5 py-2 rounded-xl text-[10px] font-semibold tracking-wide border border-blue-100">
                                                    <Icons.Tag className="w-3 h-3" />
                                                    {record.categorizacion}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 text-[12px] font-semibold text-slate-600 group-hover:text-blue-700 transition-colors">
                                                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                                                    <Icons.User className="w-4 h-4" />
                                                </div>
                                                <span>Asesor: {advisor}</span>
                                            </div>
                                            {record.sector && (
                                                <div className="flex items-center gap-3 text-[12px] font-semibold text-slate-600">
                                                    <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
                                                        <Icons.ShieldCheck className="w-4 h-4 text-indigo-400" />
                                                    </div>
                                                    <span>Sector: {normalizeString(record.sector)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {(isResolved || isNotResolved) && (
                                            <div className="mt-7">
                                                <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full text-[10px] font-semibold tracking-[0.12em] border ${
                                                    isResolved 
                                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                    : 'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}>
                                                    <span className={`w-2 h-2 rounded-full ${isResolved ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                                                    {isResolved ? 'Resuelto' : 'Pendiente'}
                                                </div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-8 text-sm text-slate-600 leading-relaxed align-top">
                                        <div className="space-y-7">
                                            <div className="bg-slate-50/70 p-6 rounded-[1.5rem] border border-slate-200 relative group-hover:border-blue-100 transition-colors">
                                                <span className="text-[11px] text-slate-500 font-semibold tracking-[0.12em] block mb-4">Observacion del Reclamo</span>
                                                <p className="text-[15px] font-medium text-slate-700 leading-7">
                                                    {record.observacion || <span className="italic opacity-30">Sin descripcion registrada</span>}
                                                </p>
                                            </div>
                                            
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


