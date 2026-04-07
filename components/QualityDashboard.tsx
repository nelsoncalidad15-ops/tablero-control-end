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
        if (val === 'si' || val === 'sí') counts.Si++;
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
        subtitle="Análisis de Calidad Autosol"
        lastUpdated={new Date().toLocaleTimeString()}
        isLoading={loadingState === LoadingState.LOADING}
        onBack={onBack}
    >
        <div className="space-y-10 pb-32 -m-6 p-8 bg-[#f8fafc] min-h-screen">

            {/* Modern Header Section */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
                <div>
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 text-[10px] font-black uppercase tracking-[0.3em] mb-4"
                    >
                        <Icons.Activity className="w-3 h-3" /> Dashboard de Calidad
                    </motion.div>
                    <h1 className="text-6xl font-black text-slate-950 uppercase italic tracking-tighter leading-none mb-4">
                        GESTIÓN DE <span className="text-blue-600">RECLAMOS</span>
                    </h1>
                    <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em] ml-1">
                        Análisis de Satisfacción y Procesos • {area.name}
                    </p>
                </div>
                
                <div className="flex items-center gap-8">
                    <div className="text-right">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] block mb-2">Total Casos</span>
                        <div className="flex items-baseline justify-end gap-2">
                            <span className="text-5xl font-black text-slate-950 leading-none">{uniqueClaimsCount}</span>
                            <span className="text-xs font-black text-blue-500 uppercase tracking-widest">ORs</span>
                        </div>
                    </div>
                    <div className="h-12 w-px bg-slate-200"></div>
                    <div className="text-right">
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] block mb-2">Resolución</span>
                        <div className="flex items-baseline justify-end gap-2">
                            <span className="text-5xl font-black text-slate-950 leading-none">
                                {Math.round((resolutionChartData.find(d => d.name === 'Resuelto')?.value || 0) / (uniqueClaimsCount || 1) * 100)}%
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Professional Horizontal Filters Bar - NOW AT THE TOP */}
            <div className="bg-white/80 backdrop-blur-xl px-10 py-8 rounded-[2.5rem] border border-white shadow-xl shadow-slate-200/50 flex flex-wrap items-center gap-10">
                <div className="flex flex-col gap-2.5">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Icons.Calendar className="w-3 h-3" /> Periodo
                    </span>
                    <MonthSelector 
                        selectedMonths={selectedMonths} 
                        onToggle={toggleMonth} 
                        months={MONTHS} 
                    />
                </div>

                <div className="h-12 w-px bg-slate-100"></div>

                <div className="flex flex-col gap-2.5">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Icons.MapPin className="w-3 h-3" /> Sucursal
                    </span>
                    <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                        {['', 'JUJUY', 'SALTA', 'TARTAGAL'].map((suc) => (
                            <button
                                key={suc}
                                onClick={() => {
                                    if (suc === '') setSelectedBranches([]);
                                    else setSelectedBranches([suc]);
                                }}
                                className={`px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                                    (selectedBranches.length === 1 && selectedBranches[0] === suc) || (suc === '' && selectedBranches.length === 0)
                                        ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {suc || 'Todas'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="h-12 w-px bg-slate-100"></div>

                <div className="flex flex-col gap-2.5">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <Icons.User className="w-3 h-3" /> Responsable
                    </span>
                    <select 
                        value={selectedResponsable || ''} 
                        onChange={(e) => setSelectedResponsable(e.target.value || null)}
                        className="text-xs font-black uppercase tracking-widest text-slate-900 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 outline-none cursor-pointer hover:border-blue-200 transition-colors min-w-[200px]"
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
                        className="px-6 py-3 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10"
                    >
                        <Icons.X className="w-3 h-3" /> Limpiar
                    </button>
                </div>
            </div>

            {/* Modern KPIs Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                <motion.div 
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden group"
                >
                    <div className="flex justify-between items-start mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-blue-500/10">
                                <Icons.ClipboardList className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Volumen Total</h3>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Reclamos Únicos</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3 mb-10">
                        <span className="text-8xl font-black text-slate-900 tracking-tighter leading-none">{uniqueClaimsCount}</span>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Casos</span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1 mt-1">
                                <Icons.TrendingDown className="w-3 h-3" /> -8%
                            </span>
                        </div>
                    </div>
                    {/* Decorative background number */}
                    <div className="absolute -bottom-10 -right-10 text-[12rem] font-black text-slate-50 select-none pointer-events-none leading-none opacity-50">
                        01
                    </div>
                </motion.div>

                <motion.div 
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="bg-[#0f172a] p-10 rounded-[3.5rem] text-white relative overflow-hidden group shadow-2xl shadow-slate-900/40"
                >
                    <div className="flex justify-between items-start mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                                <Icons.Tag className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Análisis de Reclamos</h3>
                                <p className="text-xs font-black text-white uppercase tracking-widest">Cantidad de Reclamos</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3 mb-10">
                        <span className="text-8xl font-black text-white tracking-tighter leading-none">{totalClaimsCount}</span>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-indigo-300 uppercase tracking-widest">Registros</span>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1 mt-1">
                                <Icons.Activity className="w-3 h-3" /> IA Activa
                            </span>
                        </div>
                    </div>
                    {/* Decorative background number */}
                    <div className="absolute -bottom-10 -right-10 text-[12rem] font-black text-white/5 select-none pointer-events-none leading-none">
                        02
                    </div>
                </motion.div>

                <motion.div 
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden group"
                >
                    <div className="flex justify-between items-start mb-12">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shadow-lg shadow-emerald-500/10">
                                <Icons.CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Efectividad</h3>
                                <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Resolución</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-3 mb-10">
                        <span className="text-8xl font-black text-slate-900 tracking-tighter leading-none">
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
                    <div className="absolute -bottom-10 -right-10 text-[12rem] font-black text-slate-50 select-none pointer-events-none leading-none opacity-50">
                        03
                    </div>
                </motion.div>
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Annual Evolution - Large */}
                <div className="xl:col-span-2">
                    <ChartWrapper 
                        title="Evolución Anual de Reclamos"
                        subtitle="Reclamos (OR Únicas) por mes"
                    >
                        <div className="h-[400px] w-full mt-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={annualClaimsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#2563EB" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#1E40AF" stopOpacity={1} />
                                        </linearGradient>
                                        <linearGradient id="barGradientInactive" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#0f172a" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#0f172a" stopOpacity={1} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 900}}
                                        interval={0}
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 900}} />
                                    <Tooltip 
                                        cursor={{fill: '#f8fafc'}} 
                                        contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', textTransform: 'uppercase', fontSize: '10px', fontWeight: 900}} 
                                    />
                                    <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={45}>
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
                <ChartWrapper title="Estado de Resolución" subtitle="Distribución de casos">
                    <div className="h-[400px] relative mt-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={resolutionChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={90}
                                    outerRadius={130}
                                    paddingAngle={12}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {resolutionChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.name === 'Resuelto' ? '#10B981' : '#F43F5E'} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)'}} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', paddingTop: '20px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <span className="text-5xl font-black text-slate-950 italic leading-none">
                                    {Math.round((resolutionChartData.find(d => d.name === 'Resuelto')?.value || 0) / (uniqueClaimsCount || 1) * 100)}%
                                </span>
                                <span className="block text-[10px] text-slate-400 font-black uppercase tracking-widest mt-3">Éxito</span>
                            </div>
                        </div>
                    </div>
                </ChartWrapper>
            </div>

            {/* Motivos Chart - Full Width */}
            <ChartWrapper 
                title="Motivos de Reclamo"
                subtitle="Frecuencia de incidencias - Top 10 Análisis Detallado"
            >
                <div style={{ height: `${Math.max(500, topMotivoChartData.length * 55)}px` }} className="mt-10">
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
                    title="Sector Responsable"
                    subtitle="Distribución de reclamos por área de responsabilidad"
                >
                    <div style={{ height: `${Math.max(400, sectorChartData.length * 55)}px` }} className="mt-10">
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
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-10 py-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">Performance por Asesor</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Distribución de carga</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Icons.Users className="w-5 h-5" />
                    </div>
                </div>
                <div className="p-8 overflow-x-auto no-scrollbar">
                    <div className="flex gap-6 min-w-max">
                        {responsableTableData.map((r, i) => {
                            const isSelected = selectedResponsable === r.name;
                            return (
                                <motion.button 
                                    key={i} 
                                    whileHover={{ y: -5, scale: 1.02 }}
                                    onClick={() => setSelectedResponsable(isSelected ? null : r.name)}
                                    className={`flex flex-col justify-center items-center min-w-[180px] p-8 rounded-[2.5rem] transition-all border ${
                                        isSelected 
                                        ? 'bg-slate-950 text-white border-slate-950 shadow-xl shadow-slate-900/40' 
                                        : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-100'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-6 ${isSelected ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-50 text-slate-300'}`}>
                                        <Icons.User className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-tight mb-4 text-center line-clamp-2 max-w-[140px]">{r.name}</span>
                                    <div className={`text-4xl font-black italic ${isSelected ? 'text-blue-400' : 'text-slate-950'}`}>{r.value}</div>
                                    <div className="text-[8px] font-black uppercase tracking-widest opacity-40 mt-2">Reclamos</div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modern Detail Table */}
            <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-12 border-b border-slate-50 bg-slate-50/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
                    <div>
                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Registros Detallados</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Historial completo de gestiones</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border border-slate-100 px-8 py-4 rounded-2xl shadow-sm">
                            {displayData.length} Resultados
                        </span>
                        <button className="w-14 h-14 rounded-2xl bg-slate-950 text-white flex items-center justify-center hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/20">
                            <Icons.Download className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="p-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] w-1/3">Cliente / Información</th>
                                <th className="p-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] w-2/3">Detalle del Reclamo y Gestión</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {displayData.slice(0, 50).map((record, idx) => {
                                const isResolved = record.resuelto?.toLowerCase().includes('si');
                                const isNotResolved = record.resuelto?.toLowerCase().includes('no');
                                const advisor = record.asesor ? normalizeString(record.asesor) : (record.responsable ? normalizeString(record.responsable) : 'Sin Asignar');
                                
                                return (
                                <tr key={idx} className="hover:bg-slate-50/30 transition-colors group border-l-4 border-transparent hover:border-blue-500">
                                    <td className="p-12 align-top border-r border-slate-50/50">
                                        <div className="text-slate-950 font-black uppercase text-lg tracking-tight mb-6 leading-tight">{record.cliente}</div>
                                        <div className="flex flex-wrap gap-3 mb-10">
                                            <div className="flex items-center gap-2 bg-slate-950 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10">
                                                <Icons.FileText className="w-3 h-3 text-blue-400" />
                                                OR: {record.orden}
                                            </div>
                                            <div className="flex items-center gap-2 bg-slate-50 text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-100">
                                                <Icons.MapPin className="w-3 h-3 text-slate-300" />
                                                {record.sucursal}
                                            </div>
                                            {record.categorizacion && record.categorizacion !== '-' && (
                                                <div className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                                    <Icons.Tag className="w-3 h-3" />
                                                    {record.categorizacion}
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-4 text-[11px] font-black text-slate-400 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                                                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                                    <Icons.User className="w-4 h-4" />
                                                </div>
                                                <span>Asesor: {advisor}</span>
                                            </div>
                                            {record.sector && (
                                                <div className="flex items-center gap-4 text-[11px] font-black text-slate-400 uppercase tracking-tight">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                                                        <Icons.ShieldCheck className="w-4 h-4 text-indigo-400" />
                                                    </div>
                                                    <span>Sector: {normalizeString(record.sector)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {(isResolved || isNotResolved) && (
                                            <div className="mt-10">
                                                <div className={`inline-flex items-center gap-3 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${
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
                                    <td className="p-12 text-sm text-slate-600 leading-relaxed align-top">
                                        <div className="space-y-10">
                                            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-50 shadow-sm relative group-hover:border-blue-100 transition-colors">
                                                <span className="text-[10px] text-slate-300 font-black uppercase tracking-[0.3em] block mb-6">Observación del Reclamo</span>
                                                <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                                    {record.observacion || <span className="italic opacity-30">Sin descripción registrada</span>}
                                                </p>
                                            </div>
                                            
                                            {record.motivo && record.motivo !== 'Sin Motivo' && (
                                                <div className="flex flex-wrap gap-3">
                                                    {record.motivo.split(/[,;\n\r]+/).map((tag, tIdx) => {
                                                        const trimmedTag = normalizeString(tag);
                                                        if (!trimmedTag || ['Motivos Varios', 'Sin Motivo', 'Sin motivo'].includes(trimmedTag)) return null;
                                                        
                                                        const isSelected = selectedMotivo === trimmedTag;
                                                        
                                                        return (
                                                            <span key={tIdx} className={`text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl border transition-all ${
                                                                isSelected 
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-500/20' 
                                                                : 'bg-white text-slate-400 border-slate-100 group-hover:border-slate-200'
                                                            }`}>
                                                                {trimmedTag}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                            
                                            {record.observacion_resolucion && (
                                                 <div className="mt-10 bg-slate-900 rounded-[2.5rem] p-10 text-[12px] text-slate-300 italic relative overflow-hidden shadow-2xl">
                                                     <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                                                     <div className="flex items-center gap-3 mb-6">
                                                        <Icons.CheckCircle className="w-4 h-4 text-blue-400" />
                                                        <span className="font-black text-blue-400 not-italic text-[10px] uppercase tracking-[0.3em]">Resolución de Gestión</span>
                                                     </div>
                                                     <p className="leading-relaxed font-medium">
                                                         {record.observacion_resolucion}
                                                     </p>
                                                 </div>
                                            )}

                                            {/* Root Cause and Actions Section */}
                                            {(record.causa_raiz || record.accion_contencion || record.accion_correctiva) && (
                                                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    {record.causa_raiz && (
                                                        <div className="bg-rose-50/50 p-6 rounded-3xl border border-rose-100">
                                                            <span className="text-[9px] text-rose-400 font-black uppercase tracking-widest block mb-2">Causa Raíz</span>
                                                            <p className="text-[11px] font-bold text-slate-700">{record.causa_raiz}</p>
                                                        </div>
                                                    )}
                                                    {record.accion_contencion && (
                                                        <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                                                            <span className="text-[9px] text-amber-500 font-black uppercase tracking-widest block mb-2">Acción Contención</span>
                                                            <p className="text-[11px] font-bold text-slate-700">{record.accion_contencion}</p>
                                                        </div>
                                                    )}
                                                    {record.accion_correctiva && (
                                                        <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                                                            <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest block mb-2">Acción Correctiva</span>
                                                            <p className="text-[11px] font-bold text-slate-700">{record.accion_correctiva}</p>
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
                <div className="p-12 bg-slate-50/50 border-t border-slate-50 flex justify-center">
                    <button className="px-12 py-5 bg-white border border-slate-200 rounded-[2rem] text-[11px] font-black text-slate-950 uppercase tracking-[0.3em] hover:bg-slate-950 hover:text-white transition-all shadow-xl shadow-slate-900/5">
                        Cargar más resultados
                    </button>
                </div>
            </div>
        </div>
    </DashboardFrame>
  );
};

export default QualityDashboard;
