import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ComposedChart, Bar, Area, Legend, Cell, LabelList, ReferenceLine, BarChart,
  ScatterChart, Scatter, ZAxis
} from 'recharts';
import { Icons } from './Icon';
import GaugeChart from './GaugeChart';
import { fetchSheetData } from '../services/dataService';
import { AutoRecord, LoadingState } from '../types';
import { MOCK_DATA, MONTHS, YEARS } from '../constants';
import { motion } from 'motion/react';
import { DashboardFrame, LuxuryKPICard, SkeletonLoader, StatusBadge, InsightCard, DataTable, MonthSelector, ChartWrapper } from './DashboardUI';
import ChatBot from './ChatBot';

interface PostventaDashboardProps {
  sheetUrl: string;
  onBack: () => void;
}

const PostventaDashboard: React.FC<PostventaDashboardProps> = ({ sheetUrl, onBack }) => {
  const [data, setData] = useState<AutoRecord[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);

  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]); 
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);
  
  const [expandedChart, setExpandedChart] = useState<string | null>(null);

  const [activeBranch, setActiveBranch] = useState<string | null>(null);

  const BRANCH_COLORS: Record<string, string> = {
    'Santa Fe': '#1e40af',
    'Jujuy': '#3b82f6',
    'Express': '#64748b',
    'Taller Movil': '#f59e0b',
    'Tartagal': '#ef4444',
  };

  const getDefaultColor = (index: number) => {
      const colors = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#10B981'];
      return colors[index % colors.length];
  };

  useEffect(() => {
    const loadData = async () => {
      setLoadingState(LoadingState.LOADING);
      try {
        let fetchedData = [];
        if (!sheetUrl) {
          fetchedData = MOCK_DATA;
        } else {
          fetchedData = await fetchSheetData(sheetUrl);
        }
        setData(fetchedData);
        const branches = [...new Set(fetchedData.map(d => d.sucursal))].filter(Boolean).sort();
        setAvailableBranches(branches);
        if (selectedBranches.length === 0) setSelectedBranches(branches);
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

  const toggleMonth = (month: string) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
        const matchYear = item.anio === selectedYear;
        const matchMonth = selectedMonths.length > 0 ? selectedMonths.includes(item.mes) : true;
        const matchBranch = selectedBranches.includes(item.sucursal);
        return matchYear && matchMonth && matchBranch;
    });
  }, [data, selectedYear, selectedMonths, selectedBranches]);

  const metrics = useMemo(() => {
      let pptDiariosTotal = 0;
      let pptDiariosKTotal = 0;
      let servisDiariosMTotal = 0;
      let objMensualTotal = 0;
      let totalAvancePPT = 0;
      let totalServicios = 0;
      const diasLabMap: Record<string, number> = {};
      const pptDiariosMap: Record<string, number> = {};
      const pptDiariosKMap: Record<string, number> = {};
      const servisDiariosMMap: Record<string, number> = {};
      const objMensualMap: Record<string, number> = {};
      const avancePPTMap: Record<string, number> = {};
      const branchStats: Record<string, { pptDiarios: number, objMensual: number, diasLab: number, servisVsPPT: number }> = {};

      selectedBranches.forEach(b => {
          const branchData = filteredData.filter(d => d.sucursal === b);
          const pptDiarios = branchData.reduce((acc, curr) => acc + curr.ppt_diarios, 0);
          const pptDiariosK = branchData.reduce((acc, curr) => acc + (curr.ppt_diarios_k || 0), 0);
          const servisDiariosM = branchData.reduce((acc, curr) => acc + (curr.servicios_diarios_m || 0), 0);
          const objMensual = branchData.reduce((acc, curr) => acc + curr.objetivo_mensual, 0);
          const diasLab = branchData.reduce((acc, curr) => acc + curr.dias_laborables, 0);
          const avance = branchData.reduce((acc, curr) => acc + curr.avance_ppt, 0);
          const servicios = branchData.reduce((acc, curr) => acc + curr.servicios_totales, 0);
          const servisVsPPT = avance > 0 ? (servicios / avance) * 100 : 0;

          pptDiariosMap[b] = pptDiarios;
          pptDiariosKMap[b] = pptDiariosK;
          servisDiariosMMap[b] = servisDiariosM;
          objMensualMap[b] = objMensual;
          avancePPTMap[b] = avance;
          diasLabMap[b] = diasLab;
          branchStats[b] = { pptDiarios, objMensual, diasLab, servisVsPPT };

          pptDiariosTotal += pptDiarios;
          pptDiariosKTotal += pptDiariosK;
          servisDiariosMTotal += servisDiariosM;
          objMensualTotal += objMensual;
          totalAvancePPT += avance;
          totalServicios += servicios;
      });

      const diasLabTotal = Object.values(diasLabMap).reduce((a,b) => a+b, 0);
      const servisVsPPT = totalAvancePPT > 0 ? (totalServicios / totalAvancePPT) * 100 : 0;
      
      return { pptDiariosTotal, pptDiariosKTotal, servisDiariosMTotal, objMensualTotal, totalAvancePPT, totalServicios, servisVsPPT, diasLabMap, diasLabTotal, pptDiariosMap, pptDiariosKMap, servisDiariosMMap, objMensualMap, avancePPTMap, branchStats };
  }, [filteredData, selectedBranches]);

  const targetVsActualData = useMemo(() => {
      const monthlyData = MONTHS.map(m => {
          const entry: any = { 
              name: m.substring(0, 3), 
              fullMonth: m,
              isActive: true // User requested "no se filtre" for this chart
          };
          const monthRecords = data.filter(d => 
              d.mes === m && d.anio === selectedYear
          );
          
          let totalAvance = 0;
          let totalObj = 0;

          selectedBranches.forEach(b => {
              const record = monthRecords.find(d => d.sucursal === b);
              const avance = record ? record.avance_ppt : 0;
              const obj = record ? record.objetivo_mensual : 0;
              entry[`${b}_Avance`] = avance;
              entry[`${b}_Objetivo`] = obj;
              entry[`${b}_MetSuccess`] = avance >= obj;
              totalAvance += avance;
              totalObj += obj;
          });

          entry.TotalAvance = totalAvance;
          entry.TotalObjetivo = totalObj;
          entry.TotalMetSuccess = totalAvance >= totalObj;

          return entry;
      });

      // Add Annual Total Entry
      let annualAvance = 0;
      let annualObj = 0;
      const annualEntry: any = {
          name: 'ANUAL',
          fullMonth: 'Total Anual',
          isActive: true,
          isAnnual: true
      };

      selectedBranches.forEach(b => {
          const branchYearData = data.filter(d => d.sucursal === b && d.anio === selectedYear);
          const avance = branchYearData.reduce((acc, curr) => acc + curr.avance_ppt, 0);
          const obj = branchYearData.reduce((acc, curr) => acc + curr.objetivo_mensual, 0);
          annualEntry[`${b}_Avance`] = avance;
          annualEntry[`${b}_Objetivo`] = obj;
          annualEntry[`${b}_MetSuccess`] = avance >= obj;
          annualAvance += avance;
          annualObj += obj;
      });

      annualEntry.TotalAvance = annualAvance;
      annualEntry.TotalObjetivo = annualObj;
      annualEntry.TotalMetSuccess = annualAvance >= annualObj;

      return [...monthlyData, annualEntry];
  }, [data, selectedYear, selectedBranches]);

  const lineChartData = useMemo(() => {
      return MONTHS.map(m => {
          const entry: any = { 
              MesAbrev: m.substring(0, 3),
              isActive: true
          };
          const monthData = data.filter(d => d.mes === m && d.anio === selectedYear);
          selectedBranches.forEach(b => {
              const record = monthData.find(d => d.sucursal === b);
              entry[`${b}_AvancePPT`] = record ? record.avance_ppt : 0;
              entry[`${b}_PPTDiarios`] = record ? record.ppt_diarios : 0;
              entry[`${b}_ServiciosTotales`] = record ? record.servicios_totales : 0;
              entry[`${b}_ServiciosDiarios`] = record ? record.servicios_diarios : 0;
          });
          return entry;
      });
  }, [data, selectedYear, selectedBranches]);

  const getStroke = (branch: string, index: number) => BRANCH_COLORS[branch] || getDefaultColor(index);

  // if (loadingState === LoadingState.LOADING) return <SkeletonLoader />;

  const filters = (
    <div className="flex flex-wrap items-center gap-4">
        {/* Branch Multi-selector */}
        <div className="flex flex-wrap gap-2">
            {availableBranches.map(b => (
                <button
                    key={b}
                    onClick={() => toggleBranch(b)}
                    className={`px-4 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border ${selectedBranches.includes(b) ? 'bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-900/20' : 'bg-white text-slate-400 border-slate-100 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    {b}
                </button>
            ))}
        </div>

        <div className="w-px h-8 bg-slate-200 mx-2 shrink-0 self-center"></div>

        {/* Year Selector */}
        <div className="flex gap-2">
            {YEARS.map(y => (
                <button 
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    className={`px-4 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border ${selectedYear === y ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border-slate-100 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    {y}
                </button>
            ))}
        </div>
    </div>
  );

  return (
    <DashboardFrame 
        title="Gestión de Postventa" 
        subtitle="Performance Operativa y Objetivos PPT"
        lastUpdated={new Date().toLocaleTimeString()}
        filters={null}
        isLoading={loadingState === LoadingState.LOADING}
        onBack={onBack}
    >
        <div className="space-y-8 pb-20 pt-6">
            {/* Horizontal Filters Bar */}
            <div className="flex flex-col gap-4 py-2">
                <div className="bg-white/50 backdrop-blur-xl p-4 rounded-[2rem] border border-white shadow-sm">
                    <MonthSelector 
                        selectedMonths={selectedMonths}
                        onToggle={toggleMonth}
                        months={MONTHS}
                    />
                </div>
                <div className="px-2">
                    {filters}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
                {/* Avance de PPT Card (New) */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 flex flex-col group relative overflow-hidden transition-all hover:shadow-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                            <Icons.TrendingUp className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Avance de PPT</span>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
                        {selectedBranches.map(b => (
                            <div key={b} className="flex flex-col border-b border-slate-50 pb-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-slate-500 uppercase">{b}</span>
                                    <span className="text-xl font-black text-slate-950 italic">
                                        {metrics.avancePPTMap[b].toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-[8px] font-bold text-slate-300 uppercase">K: {metrics.pptDiariosKMap[b].toFixed(1)}</span>
                                    <span className="text-[8px] font-bold text-slate-300 uppercase">M: {metrics.servisDiariosMMap[b].toFixed(1)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {selectedBranches.length > 1 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-900 uppercase">Total</span>
                            <span className="text-2xl font-black text-blue-600 italic">{metrics.totalAvancePPT.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                        </div>
                    )}
                </div>

                {/* Objetivo Mensual Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 flex flex-col group relative overflow-hidden transition-all hover:shadow-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-600"></div>
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                            <Icons.ClipboardCheck className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Objetivo PPT</span>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
                        {selectedBranches.map(b => (
                            <div key={b} className="flex justify-between items-center border-b border-slate-50 pb-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase">{b}</span>
                                <span className="text-xl font-black text-slate-950 italic">
                                    {metrics.objMensualMap[b].toLocaleString('es-AR', { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                        ))}
                    </div>
                    {selectedBranches.length > 1 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-900 uppercase">Total</span>
                            <span className="text-2xl font-black text-emerald-600 italic">{metrics.objMensualTotal.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                        </div>
                    )}
                </div>

                {/* PPT Diarios (Col K) Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 flex flex-col group relative overflow-hidden transition-all hover:shadow-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                            <Icons.BarChart className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">PPT Diarios (Col K)</span>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
                        {selectedBranches.map(b => (
                            <div key={b} className="flex justify-between items-center border-b border-slate-50 pb-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase">{b}</span>
                                <span className="text-xl font-black text-slate-950 italic">
                                    {(metrics.pptDiariosKMap[b] || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                                </span>
                            </div>
                        ))}
                    </div>
                    {selectedBranches.length > 1 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-900 uppercase">Total</span>
                            <span className="text-2xl font-black text-blue-600 italic">{(metrics.pptDiariosKTotal || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}</span>
                        </div>
                    )}
                </div>
                
                {/* Servis Diarios (Col M) Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 flex flex-col group relative overflow-hidden transition-all hover:shadow-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600"></div>
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <Icons.Activity className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Servis Diarios (Col M)</span>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
                        {selectedBranches.map(b => (
                            <div key={b} className="flex justify-between items-center border-b border-slate-50 pb-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase">{b}</span>
                                <span className="text-xl font-black text-slate-950 italic">
                                    {(metrics.servisDiariosMMap[b] || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}
                                </span>
                            </div>
                        ))}
                    </div>
                    {selectedBranches.length > 1 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-900 uppercase">Total</span>
                            <span className="text-2xl font-black text-indigo-600 italic">{(metrics.servisDiariosMTotal || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 })}</span>
                        </div>
                    )}
                </div>

                {/* Días Laborables Card */}
                <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 flex flex-col group relative overflow-hidden transition-all hover:shadow-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                    <div className="flex items-center justify-between mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                            <Icons.Calendar className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Días Lab</span>
                    </div>
                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[150px] pr-2 custom-scrollbar">
                        {selectedBranches.map(b => (
                            <div key={b} className="flex justify-between items-center border-b border-slate-50 pb-2">
                                <span className="text-[10px] font-black text-slate-500 uppercase">{b}</span>
                                <span className="text-xl font-black text-slate-950 italic">{metrics.diasLabMap[b]}</span>
                            </div>
                        ))}
                    </div>
                    {selectedBranches.length > 1 && (
                        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-900 uppercase">Total</span>
                            <span className="text-2xl font-black text-amber-600 italic">{metrics.diasLabTotal}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Large Gauge Chart Section - Moved here, below KPIs */}
            <div className="bg-slate-950 rounded-[3rem] shadow-2xl border border-slate-800 p-10 md:p-16 flex flex-col group relative overflow-hidden transition-all hover:shadow-blue-900/40">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"></div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
                    <div>
                        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Performance: % Servis vs PPT</h2>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Análisis de Conversión por Sucursal</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">&lt; 50%</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">50-60%</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">&gt; 60%</span>
                        </div>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                    {selectedBranches.map(b => {
                        const val = metrics.branchStats[b].servisVsPPT;
                        const color = val < 50 ? '#f43f5e' : val <= 60 ? '#f59e0b' : '#10b981';
                        return (
                            <div key={b} className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-[2.5rem] border border-white/5 shadow-inner transition-transform hover:scale-105">
                                <div className="w-full h-32">
                                    <GaugeChart value={val} label="" color={color} />
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{b}</p>
                                    <p className={`text-2xl font-black italic`} style={{ color }}>{val.toFixed(1)}%</p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {selectedBranches.length > 1 && (
                    <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                                <Icons.Activity className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Promedio General</p>
                                <p className="text-4xl font-black text-white italic">{metrics.servisVsPPT.toFixed(1)}%</p>
                            </div>
                        </div>
                        <div className="flex-1 max-w-md w-full">
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-1000"
                                    style={{ width: `${Math.min(metrics.servisVsPPT, 100)}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Chart */}
            <ChartWrapper 
                title="Cumplimiento de Objetivos (PPT)"
                subtitle="Comparativa Mensual y Total Anual"
            >
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                    <div className="lg:col-span-3 h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={targetVsActualData} margin={{top: 20, right: 30, left: 0, bottom: 0}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 10, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '20px'}} 
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-6 rounded-[2rem] shadow-2xl border border-slate-100 min-w-[240px]">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-3">{data.fullMonth} {selectedYear}</p>
                                                    <div className="space-y-3">
                                                        {selectedBranches.map(b => {
                                                            const pct = data[`${b}_Objetivo`] > 0 ? (data[`${b}_Avance`] / data[`${b}_Objetivo`] * 100).toFixed(1) : '0';
                                                            return (
                                                                <div key={b} className="flex justify-between items-center gap-6">
                                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight">{b}</span>
                                                                    <div className="text-right">
                                                                        <div className={`text-xs font-black ${data[`${b}_MetSuccess`] ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                            {data[`${b}_Avance`].toLocaleString()} ({pct}%)
                                                                        </div>
                                                                        <div className="text-[8px] font-bold text-slate-300 uppercase">Obj: {data[`${b}_Objetivo`].toLocaleString()}</div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center">
                                                            <span className="text-[9px] font-black text-slate-900 uppercase">Total</span>
                                                            <div className="text-right">
                                                                <div className="text-xs font-black text-blue-600">
                                                                    {data.TotalAvance.toLocaleString()} ({data.TotalObjetivo > 0 ? (data.TotalAvance / data.TotalObjetivo * 100).toFixed(1) : 0}%)
                                                                </div>
                                                                <div className="text-[8px] font-bold text-slate-400 uppercase">Obj: {data.TotalObjetivo.toLocaleString()}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                {selectedBranches.map((b, i) => (
                                        <Bar 
                                            key={b}
                                            dataKey={`${b}_Avance`} 
                                            name={b}
                                            barSize={selectedBranches.length > 3 ? 12 : 20} 
                                            radius={[6, 6, 0, 0]}
                                            onMouseEnter={() => setActiveBranch(b)}
                                            onMouseLeave={() => setActiveBranch(null)}
                                        >
                                            <LabelList 
                                                dataKey={`${b}_Avance`} 
                                                position="top" 
                                                content={(props: any) => {
                                                    const { x, y, width, value, index } = props;
                                                    if (!targetVsActualData[index].isActive || value === 0) return null;
                                                    return (
                                                        <text x={x + width / 2} y={y - 10} fill="#64748b" fontSize={8} fontWeight={900} textAnchor="middle">
                                                            {value.toLocaleString()}
                                                        </text>
                                                    );
                                                }}
                                            />
                                            {targetVsActualData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry.isAnnual ? '#3b82f6' : (entry[`${b}_MetSuccess`] ? '#10B981' : '#EF4444')} 
                                                    fillOpacity={entry.isActive ? 1 : 0.1}
                                                />
                                            ))}
                                        </Bar>
                                ))}
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    
                    {/* Annual Summary Sidebar */}
                    <div className="bg-slate-50 rounded-[2rem] p-6 flex flex-col justify-center space-y-6">
                        <div className="text-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen Anual {selectedYear}</span>
                            <h3 className="text-2xl font-black text-slate-950 italic mt-1">Avance PPT</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Avance</p>
                                <p className="text-2xl font-black text-blue-600 italic">{metrics.totalAvancePPT.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Objetivo</p>
                                <p className="text-2xl font-black text-slate-950 italic">{metrics.objMensualTotal.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">% Cumplimiento</p>
                                <p className={`text-2xl font-black italic ${metrics.totalAvancePPT >= metrics.objMensualTotal ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {metrics.objMensualTotal > 0 ? (metrics.totalAvancePPT / metrics.objMensualTotal * 100).toFixed(1) : 0}%
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </ChartWrapper>

            {/* Line Charts Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {[
                    { title: 'Avance PPT', key: 'AvancePPT', color: '#3b82f6', id: 'avance' },
                    { title: 'PPT Diarios', key: 'PPTDiarios', color: '#6366f1', id: 'diarios' },
                    { title: 'Servicios Totales', key: 'ServiciosTotales', color: '#a855f7', id: 'servicios' },
                    { title: 'Servicios Diarios', key: 'ServiciosDiarios', color: '#f59e0b', id: 'servicios_diarios' }
                ].map((chart, idx) => (
                    <ChartWrapper 
                        key={idx}
                        title={chart.title}
                        action={
                            <button 
                                onClick={() => setExpandedChart(chart.id)}
                                className="p-2 rounded-lg bg-slate-50 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                                <Icons.Maximize className="w-4 h-4" />
                            </button>
                        }
                    >
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={lineChartData} margin={{top: 30, right: 10, left: 10, bottom: 0}}>
                                    <defs>
                                        {selectedBranches.map((b, i) => (
                                            <linearGradient key={`grad-${b}`} id={`grad-${b}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={getStroke(b, i)} stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor={getStroke(b, i)} stopOpacity={0}/>
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                    <XAxis dataKey="MesAbrev" tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 9, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '16px'}} />
                                    {selectedBranches.map((b, i) => (
                                        <React.Fragment key={b}>
                                            <Area 
                                                type="monotone" 
                                                dataKey={`${b}_${chart.key}`} 
                                                stroke="none" 
                                                fill={`url(#grad-${b})`} 
                                                connectNulls
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey={`${b}_${chart.key}`} 
                                                stroke={getStroke(b, i)} 
                                                strokeWidth={3} 
                                                dot={false}
                                                activeDot={{ r: 6, strokeWidth: 0 }}
                                                name={b}
                                                connectNulls
                                            >
                                                <LabelList 
                                                    dataKey={`${b}_${chart.key}`} 
                                                    position="top" 
                                                    content={(props: any) => {
                                                        const { x, y, value, index } = props;
                                                        if (!lineChartData[index].isActive || value === 0) return null;
                                                        return (
                                                            <text x={x} y={y - 12} fill={getStroke(b, i)} fontSize={8} fontWeight={900} textAnchor="middle">
                                                                {value.toLocaleString()}
                                                            </text>
                                                        );
                                                    }}
                                                />
                                            </Line>
                                            <Scatter 
                                                dataKey={`${b}_${chart.key}`} 
                                                fill={getStroke(b, i)}
                                                line={false}
                                                shape="circle"
                                            />
                                        </React.Fragment>
                                    ))}
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartWrapper>
                ))}
            </div>

            {/* Detailed Data Table */}
            <DataTable 
                title="Detalle de Operaciones"
                subtitle="Registros consolidados por mes y sucursal"
                data={filteredData} 
                columns={[
                    { 
                        header: 'Sucursal', 
                        accessor: 'sucursal',
                        render: (val: string) => <StatusBadge status="info" label={val} />
                    },
                    { 
                        header: 'Mes', 
                        accessor: 'mes',
                        render: (val: string) => <span className="font-black text-slate-900 uppercase text-[10px] tracking-widest">{val}</span>
                    },
                    { 
                        header: 'Avance PPT', 
                        accessor: 'avance_ppt', 
                        render: (val: number) => <span className="font-mono font-bold text-slate-700">{(val || 0).toLocaleString()}</span>
                    },
                    { 
                        header: 'Objetivo', 
                        accessor: 'objetivo_mensual', 
                        render: (val: number) => <span className="font-mono text-slate-400">{(val || 0).toLocaleString()}</span>
                    },
                    { 
                        header: 'Cumplimiento', 
                        accessor: 'avance_ppt', 
                        render: (val: number, row: AutoRecord) => {
                            const pct = (val / row.objetivo_mensual * 100).toFixed(1);
                            const isSuccess = Number(pct) >= 100;
                            return (
                                <div className="flex items-center gap-3">
                                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-1000 ${isSuccess ? 'bg-emerald-500' : 'bg-blue-500'}`} 
                                            style={{ width: `${Math.min(Number(pct), 100)}%` }}
                                        ></div>
                                    </div>
                                    <span className={`text-[10px] font-black ${isSuccess ? 'text-emerald-600' : 'text-blue-600'}`}>{pct}%</span>
                                </div>
                            );
                        }
                    },
                    { 
                        header: 'Servicios', 
                        accessor: 'servicios_totales', 
                        render: (val: number) => <span className="font-mono font-bold text-slate-700">{(val || 0).toLocaleString()}</span>
                    }
                ]}
                pageSize={10}
            />
        </div>

        {/* ChatBot Integration */}
        <ChatBot 
            apiKey={typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : ''}
            context={`Dashboard de Gestión de Postventa. Año: ${selectedYear}. Sucursales: ${selectedBranches.join(', ')}. PPT Diarios: ${metrics.pptDiariosTotal}.`}
        />

        {/* Expanded Chart Modal */}
        {expandedChart && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setExpandedChart(null)}
                    className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl"
                />
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="bg-white w-full max-w-7xl h-full max-h-[90vh] rounded-[4rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 md:p-16"
                >
                    <button 
                        onClick={() => setExpandedChart(null)}
                        className="absolute top-10 right-10 w-16 h-16 flex items-center justify-center bg-slate-50 hover:bg-slate-100 rounded-[2rem] transition-all text-slate-500 hover:text-slate-900"
                    >
                        <Icons.Minimize className="w-8 h-8" />
                    </button>

                    <div className="mb-16">
                        <h2 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic">
                            {expandedChart === 'cumplimiento' ? 'Cumplimiento de Objetivos' : 
                             expandedChart === 'avance' ? 'Avance PPT' :
                             expandedChart === 'diarios' ? 'PPT Diarios' :
                             expandedChart === 'servicios' ? 'Servicios Totales' : 'Servicios Diarios'}
                        </h2>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-[0.5em] mt-4">Vista Detallada de Performance Operativa</p>
                    </div>

                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            {expandedChart === 'cumplimiento' ? (
                                <ComposedChart data={targetVsActualData} margin={{top: 40, right: 40, left: 20, bottom: 20}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                    <XAxis dataKey="name" tick={{fontSize: 12, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 12, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{borderRadius: '32px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '30px'}} 
                                    />
                                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '40px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8'}} />
                                    {selectedBranches.map((b, i) => (
                                        <Bar 
                                            key={b}
                                            dataKey={`${b}_Avance`} 
                                            name={b}
                                            barSize={32} 
                                            radius={[12, 12, 0, 0]}
                                        >
                                            {targetVsActualData.map((entry, index) => (
                                                <Cell 
                                                    key={`cell-${index}`} 
                                                    fill={entry[`${b}_MetSuccess`] ? '#10B981' : '#EF4444'} 
                                                    fillOpacity={entry.isActive ? 1 : 0.1}
                                                />
                                            ))}
                                            <LabelList 
                                                dataKey={`${b}_Avance`} 
                                                position="top" 
                                                content={(props: any) => {
                                                    const { x, y, width, value, index } = props;
                                                    if (!targetVsActualData[index].isActive || value === 0) return null;
                                                    return (
                                                        <text x={x + width / 2} y={y - 15} fill="#64748b" fontSize={11} fontWeight={900} textAnchor="middle">
                                                            {value.toLocaleString()}
                                                        </text>
                                                    );
                                                }}
                                            />
                                        </Bar>
                                    ))}
                                </ComposedChart>
                            ) : (
                                <ComposedChart 
                                    data={lineChartData} 
                                    margin={{top: 40, right: 40, left: 20, bottom: 20}}
                                >
                                    <defs>
                                        {selectedBranches.map((b, i) => (
                                            <linearGradient key={`grad-exp-${b}`} id={`grad-exp-${b}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={getStroke(b, i)} stopOpacity={0.1}/>
                                                <stop offset="95%" stopColor={getStroke(b, i)} stopOpacity={0}/>
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                                    <XAxis dataKey="MesAbrev" tick={{fontSize: 12, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <YAxis tick={{fontSize: 12, fontWeight: 900, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{borderRadius: '32px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '30px'}} />
                                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '40px', fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', color: '#94a3b8'}} />
                                    {selectedBranches.map((b, i) => (
                                        <React.Fragment key={b}>
                                            <Area 
                                                type="monotone" 
                                                dataKey={`${b}_${expandedChart === 'avance' ? 'AvancePPT' : expandedChart === 'diarios' ? 'PPTDiarios' : expandedChart === 'servicios' ? 'ServiciosTotales' : 'ServiciosDiarios'}`} 
                                                stroke="none" 
                                                fill={`url(#grad-exp-${b})`} 
                                                connectNulls
                                            />
                                            <Line 
                                                key={b}
                                                type="monotone" 
                                                dataKey={`${b}_${expandedChart === 'avance' ? 'AvancePPT' : expandedChart === 'diarios' ? 'PPTDiarios' : expandedChart === 'servicios' ? 'ServiciosTotales' : 'ServiciosDiarios'}`} 
                                                stroke={getStroke(b, i)} 
                                                strokeWidth={6} 
                                                dot={(props: any) => {
                                                    const { cx, cy, payload, key } = props;
                                                    if (!payload.isActive) return <circle key={key} cx={cx} cy={cy} r={0} />;
                                                    return <circle key={key} cx={cx} cy={cy} r={8} fill={getStroke(b, i)} stroke="white" strokeWidth={3} />;
                                                }}
                                                activeDot={{r: 12, strokeWidth: 4, stroke: 'white'}}
                                                name={b}
                                                connectNulls
                                            >
                                                <LabelList 
                                                    dataKey={`${b}_${expandedChart === 'avance' ? 'AvancePPT' : expandedChart === 'diarios' ? 'PPTDiarios' : expandedChart === 'servicios' ? 'ServiciosTotales' : 'ServiciosDiarios'}`} 
                                                    position="top" 
                                                    content={(props: any) => {
                                                        const { x, y, value, index } = props;
                                                        if (!lineChartData[index].isActive || value === 0) return null;
                                                        return (
                                                            <text x={x} y={y - 20} fill={getStroke(b, i)} fontSize={11} fontWeight={900} textAnchor="middle">
                                                                {value.toLocaleString()}
                                                            </text>
                                                        );
                                                    }}
                                                />
                                            </Line>
                                        </React.Fragment>
                                    ))}
                                </ComposedChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </motion.div>
            </div>
        )}
    </DashboardFrame>
  );
};

export default PostventaDashboard;
