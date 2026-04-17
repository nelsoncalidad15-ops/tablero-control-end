
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Icons } from './Icon';
import { DashboardFrame, LuxuryKPICard, SkeletonLoader, InsightCard, ChartWrapper, StatusBadge } from './DashboardUI';
import { LoadingState, AppConfig, DetailedQualityRecord, SalesQualityRecord, QualityRecord, SalesClaimsRecord, CemOsRecord, InternalPostventaRecord } from '../types';
import { 
    fetchDetailedQualityData, 
    fetchSalesQualityData, 
    fetchQualityData, 
    fetchSalesClaimsData, 
    fetchCemOsData,
    fetchInternalPostventaData
} from '../services/dataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, Legend, LabelList, PieChart, Pie } from 'recharts';
import { MONTHS, YEARS } from '../constants';

interface ExecutiveSummaryProps {
  config: AppConfig;
  onBack: () => void;
}

const GaugeMetric: React.FC<{ 
    title: string, 
    value: number, 
    inProgressValue?: number,
    closedValue?: number,
    target: number, 
    icon: React.ReactNode, 
    monthName: string, 
    inProgressMonthName?: string,
    closedMonthName?: string
}> = ({ title, value, inProgressValue, closedValue, target, icon, monthName, inProgressMonthName, closedMonthName }) => {
    const isSuccess = value >= target;
    const color = isSuccess ? '#10b981' : '#ef4444';
    
    const inProgressIsSuccess = inProgressValue !== undefined ? inProgressValue >= target : null;
    const inProgressColor = inProgressIsSuccess === true ? 'text-emerald-400' : inProgressIsSuccess === false ? 'text-rose-400' : 'text-slate-500';

    const closedIsSuccess = closedValue !== undefined ? closedValue >= target : null;
    const closedColor = closedIsSuccess === true ? 'text-emerald-400' : closedIsSuccess === false ? 'text-rose-400' : 'text-slate-500';

    // Data for the gauge (half circle)
    const data = [
        { value: value, fill: color },
        { value: Math.max(0, 5 - value), fill: 'rgba(255,255,255,0.05)' }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 backdrop-blur-xl rounded-[3.5rem] border border-white/10 p-10 flex flex-col items-center justify-center relative overflow-hidden group hover:bg-white/[0.08] transition-all duration-500 shadow-2xl min-h-[550px]"
        >
            {/* Decorative background glow */}
            <div className={`absolute inset-0 opacity-[0.03] transition-opacity duration-1000 group-hover:opacity-[0.1] ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            
            <div className="flex items-center gap-4 mb-8 relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} border border-white/10`}>
                    {icon}
                </div>
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em]">{title}</h4>
            </div>
            
            <div className="relative w-full aspect-square max-w-[260px] relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius="85%"
                            outerRadius="100%"
                            startAngle={225}
                            endAngle={-45}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={20}
                        >
                            <Cell key="cell-0" fill={color} />
                            <Cell key="cell-1" fill="rgba(255,255,255,0.05)" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-2">{monthName}</span>
                        <motion.span 
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`text-6xl font-black tracking-tighter italic ${isSuccess ? 'text-emerald-400' : 'text-rose-400'} drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
                        >
                            {value.toFixed(2)}
                        </motion.span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mt-10 w-full relative z-10">
                <div className="flex flex-col items-center border-r border-white/10">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Objetivo</span>
                    <span className="text-lg font-black text-white">{target.toFixed(2)}</span>
                </div>
                <div className="flex flex-col items-center border-r border-white/10">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">En Progreso</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase mb-1">{inProgressMonthName || '--'}</span>
                    <span className={`text-xl font-black ${inProgressColor}`}>
                        {inProgressValue !== undefined ? inProgressValue.toFixed(2) : '--'}
                    </span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 mb-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Cerrado</span>
                    </div>
                    <span className="text-[9px] font-black text-slate-400 uppercase mb-1">{closedMonthName || '--'}</span>
                    <span className={`text-xl font-black ${closedColor}`}>
                        {closedValue !== undefined ? closedValue.toFixed(2) : '--'}
                    </span>
                </div>
            </div>

            <div className={`mt-10 px-10 py-3 rounded-full border text-[11px] font-black uppercase tracking-[0.4em] relative z-10 shadow-2xl transition-all duration-500 ${
                isSuccess 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/10'
            }`}>
                {isSuccess ? 'Objetivo Cumplido' : 'Bajo Objetivo'}
            </div>
        </motion.div>
    );
};

const ReportCover: React.FC<{ year: number, month: string, branch: string }> = ({ year, month, branch }) => {
    return (
        <div className="min-h-[85vh] flex flex-col items-center justify-center relative overflow-hidden rounded-[4rem] border border-white/10 bg-slate-950 mb-20 group">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        rotate: [0, 5, 0],
                        opacity: [0.1, 0.15, 0.1]
                    }}
                    transition={{ duration: 20, repeat: Infinity }}
                    className="absolute -top-1/4 -left-1/4 w-full h-full bg-blue-600 rounded-full blur-[150px]"
                />
                <motion.div 
                    animate={{ 
                        scale: [1, 1.3, 1],
                        rotate: [0, -5, 0],
                        opacity: [0.05, 0.1, 0.05]
                    }}
                    transition={{ duration: 25, repeat: Infinity, delay: 2 }}
                    className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-indigo-600 rounded-full blur-[150px]"
                />
                <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center px-8">
                <motion.div 
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 1 }}
                    className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center text-slate-950 shadow-[0_0_50px_rgba(255,255,255,0.2)] mb-12 transform -rotate-6 group-hover:rotate-0 transition-transform duration-700"
                >
                    <Icons.Activity className="w-12 h-12" />
                </motion.div>

                <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 1 }}
                >
                    <h1 className="text-[12vw] font-black text-white leading-[0.85] tracking-tighter italic uppercase mb-8">
                        Reporte<br />
                        <span className="text-blue-500">Gerencial</span>
                    </h1>
                </motion.div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.6, duration: 1 }}
                    className="flex flex-col items-center space-y-6"
                >
                    <div className="h-px w-40 bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
                    
                    <div className="flex items-center gap-8">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-1">Periodo</p>
                            <p className="text-2xl font-black text-white uppercase italic">{month || 'Anual'} {year}</p>
                        </div>
                        <div className="w-px h-12 bg-white/10"></div>
                        <div className="text-left">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-1">Sucursal</p>
                            <p className="text-2xl font-black text-white uppercase italic">{branch || 'Todas'}</p>
                        </div>
                    </div>

                    <div className="pt-12">
                        <div className="px-10 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-full">
                            <p className="text-[11px] font-black text-blue-400 uppercase tracking-[0.6em]">Autosol Intelligence System • Enterprise Edition</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Decorative Bar */}
            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600"></div>
        </div>
    );
};

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ config, onBack }) => {
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  
  // Helper: Consistent Normalization
  const normalizeString = (str: string) => {
      if (!str) return '';
      const trimmed = str.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  const [data, setData] = useState<{
    detailedQuality: DetailedQualityRecord[];
    salesQuality: SalesQualityRecord[];
    quality: QualityRecord[];
    salesClaims: SalesClaimsRecord[];
    cemOs: CemOsRecord[];
    internalPostventa: InternalPostventaRecord[];
  }>({
    detailedQuality: [],
    salesQuality: [],
    quality: [],
    salesClaims: [],
    cemOs: [],
    internalPostventa: []
  });

  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(LoadingState.LOADING);
      try {
        const [detailedQualityJujuy, detailedQualitySalta, salesQuality, quality, salesClaims, cemOsJujuy, cemOsSalta, internalPostventa] = await Promise.all([
          fetchDetailedQualityData(config.sheetUrls.detailed_quality || ''),
          fetchDetailedQualityData(config.sheetUrls.detailed_quality_salta || ''),
          fetchSalesQualityData(config.sheetUrls.sales_quality || ''),
          fetchQualityData(config.sheetUrls.calidad || ''),
          fetchSalesClaimsData(config.sheetUrls.sales_claims || ''),
          fetchCemOsData(config.sheetUrls.cem_os || ''),
          fetchCemOsData(config.sheetUrls.cem_os_salta || ''),
          fetchInternalPostventaData(config.sheetUrls.internal_postventa || '')
        ]);

        // Tag data with sucursal and default anio if missing (defaulting to 2026 as per user request)
        const dqJ = detailedQualityJujuy.map(d => ({ ...d, sucursal: 'JUJUY', anio: d.anio || 2026 }));
        const dqS = detailedQualitySalta.map(d => ({ ...d, sucursal: 'SALTA', anio: d.anio || 2026 }));
        
        const coJ = cemOsJujuy.map(d => ({ ...d, sucursal: 'JUJUY', anio: d.anio || 2026 }));
        const coS = cemOsSalta.map(d => ({ ...d, sucursal: 'SALTA', anio: d.anio || 2026 }));

        setData({ 
          detailedQuality: [...dqJ, ...dqS], 
          salesQuality: salesQuality.map(d => ({ ...d, anio: d.anio || 2026, sucursal: d.sucursal ? d.sucursal.toUpperCase().trim() : 'GENERAL' })), 
          quality: quality.map(d => ({ ...d, anio: d.anio || 2026, sucursal: d.sucursal ? d.sucursal.toUpperCase().trim() : 'GENERAL' })), 
          salesClaims: salesClaims.map(d => ({ ...d, anio: d.anio || 2026, sucursal: d.sucursal ? d.sucursal.toUpperCase().trim() : 'GENERAL' })),
          cemOs: [...coJ, ...coS],
          internalPostventa: internalPostventa.map(d => ({ ...d, anio: d.anio || 2026 }))
        });
        setLoading(LoadingState.SUCCESS);
      } catch (error) {
        console.error("Error loading executive summary data", error);
        setLoading(LoadingState.ERROR);
      }
    };
    loadAllData();
  }, [config]);

  const availableBranches = useMemo(() => {
    const branches = new Set<string>();
    data.salesQuality.forEach(d => d.sucursal && branches.add(d.sucursal));
    data.quality.forEach(d => d.sucursal && branches.add(d.sucursal));
    data.detailedQuality.forEach(d => d.sucursal && branches.add(d.sucursal));
    data.cemOs.forEach(d => d.sucursal && branches.add(d.sucursal));
    return Array.from(branches).filter(b => b !== 'Unknown').sort();
  }, [data]);

  const filteredData = useMemo(() => {
    const filterByYearMonthBranch = (list: any[], month?: string) => {
        return list.filter(d => {
            const matchYear = !selectedYear || d.anio === selectedYear || (d.fecha_reclamo && d.fecha_reclamo.includes(selectedYear.toString()));
            const matchMonth = !month || d.mes === month;
            const matchBranch = !selectedBranch || d.sucursal === selectedBranch;
            return matchYear && matchMonth && matchBranch;
        });
    };

    const selectedMonthIndex = selectedMonth ? MONTHS.indexOf(selectedMonth) : -1;
    
    const inProgressMonthIndex = selectedMonthIndex - 1;
    const inProgressMonth = inProgressMonthIndex >= 0 ? MONTHS[inProgressMonthIndex] : undefined;
    
    const closedMonthIndex = selectedMonthIndex - 2;
    const closedMonth = closedMonthIndex >= 0 ? MONTHS[closedMonthIndex] : undefined;

    return {
        detailedQuality: filterByYearMonthBranch(data.detailedQuality, selectedMonth),
        salesQuality: filterByYearMonthBranch(data.salesQuality, selectedMonth),
        quality: filterByYearMonthBranch(data.quality, selectedMonth),
        salesClaims: filterByYearMonthBranch(data.salesClaims, selectedMonth),
        cemOs: filterByYearMonthBranch(data.cemOs, selectedMonth),
        internalPostventa: filterByYearMonthBranch(data.internalPostventa, selectedMonth),
        
        // In Progress Month Data (M-1)
        inProgressMonthName: inProgressMonth,
        inProgressDetailedQuality: inProgressMonth ? filterByYearMonthBranch(data.detailedQuality, inProgressMonth) : [],
        inProgressSalesQuality: inProgressMonth ? filterByYearMonthBranch(data.salesQuality, inProgressMonth) : [],
        inProgressCemOs: inProgressMonth ? filterByYearMonthBranch(data.cemOs, inProgressMonth) : [],
        inProgressInternalPostventa: inProgressMonth ? filterByYearMonthBranch(data.internalPostventa, inProgressMonth) : [],

        // Closed Month Data (M-2)
        closedMonthName: closedMonth,
        closedDetailedQuality: closedMonth ? filterByYearMonthBranch(data.detailedQuality, closedMonth) : [],
        closedSalesQuality: closedMonth ? filterByYearMonthBranch(data.salesQuality, closedMonth) : [],
        closedCemOs: closedMonth ? filterByYearMonthBranch(data.cemOs, closedMonth) : [],
        closedInternalPostventa: closedMonth ? filterByYearMonthBranch(data.internalPostventa, closedMonth) : []
    };
  }, [data, selectedYear, selectedMonth, selectedBranch]);

  const metrics = useMemo(() => {
    const calculateAvg = (list: any[], key: string) => {
        const scores = list.map(d => d[key]).filter((v): v is number => v !== null && !isNaN(v));
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    };

    // Current Metrics (M)
    const avgCEM = calculateAvg(filteredData.cemOs, 'cem_score');
    const avgLVS = calculateAvg(filteredData.detailedQuality, 'q4_score');
    const avgOSInternal = calculateAvg(filteredData.salesQuality, 'cem_general');
    const avgLVSInternal = calculateAvg(filteredData.internalPostventa, 'servicio_prestado');

    // In Progress Metrics (M-1)
    const inProgressAvgCEM = calculateAvg(filteredData.inProgressCemOs, 'cem_score');
    const inProgressAvgLVS = calculateAvg(filteredData.inProgressDetailedQuality, 'q4_score');
    const inProgressAvgOSInternal = calculateAvg(filteredData.inProgressSalesQuality, 'cem_general');
    const inProgressAvgLVSInternal = calculateAvg(filteredData.inProgressInternalPostventa, 'servicio_prestado');

    // Closed Metrics (M-2)
    const closedAvgCEM = calculateAvg(filteredData.closedCemOs, 'cem_score');
    const closedAvgLVS = calculateAvg(filteredData.closedDetailedQuality, 'q4_score');
    const closedAvgOSInternal = calculateAvg(filteredData.closedSalesQuality, 'cem_general');
    const closedAvgLVSInternal = calculateAvg(filteredData.closedInternalPostventa, 'servicio_prestado');

    // 4. Total Reclamos (Internal Sales)
    const totalSalesClaims = filteredData.salesClaims.length;

    // 5. Total Reclamos (Internal Postventa)
    const totalPostventaClaims = filteredData.quality.length;

    // 6. Motivos de Reclamo (Postventa Internal) - Robust logic from QualityDashboard
    const postventaReasons: Record<string, number> = {};
    const IGNORED_MOTIVOS = ['motivos varios', 'sin motivo', 'n/a', 'ninguno', '-', '0', ''];
    
    filteredData.quality.forEach(d => {
        const raw = d.motivo || '';
        const parts = raw.split(/[,;\n\r]+/).map((s: string) => s.trim());
        
        parts.forEach((part: string) => {
            if (!part) return; 
            const normalized = normalizeString(part);
            if (IGNORED_MOTIVOS.includes(normalized.toLowerCase())) return;

            postventaReasons[normalized] = (postventaReasons[normalized] || 0) + 1;
        });
    });
    const topPostventaReasons = Object.entries(postventaReasons)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    // 6. Evolución Anual de Reclamos (Postventa Internal)
    const postventaEvolution = MONTHS.map(m => {
        const count = data.quality.filter(d => d.mes === m && (!selectedYear || d.anio === selectedYear) && (!selectedBranch || d.sucursal === selectedBranch)).length;
        return { name: m, value: count };
    });

    // 7. Motivos Principales de Reclamo (Sales Internal) - Robust logic from SalesQualityDashboard
    const salesReasons: Record<string, number> = {};
    const IGNORED_REASONS = ['motivos varios', 'sin motivo', 'n/a', 'ninguno', '-', '0', ''];
    filteredData.salesClaims.forEach(d => {
        const raw = d.motivo || '';
        const parts = raw.split(/[,;\n\r]+/).map((s: string) => s.trim());
        parts.forEach((part: string) => {
            if (!part) return;
            const normalized = part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            if (IGNORED_REASONS.includes(normalized.toLowerCase())) return;
            salesReasons[normalized] = (salesReasons[normalized] || 0) + 1;
        });
    });
    const topSalesReasons = Object.entries(salesReasons)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // 8. Ranking de Asesores (CEM OS)
    const advisorStats: Record<string, number> = {};
    filteredData.cemOs.forEach(d => {
        if (d.vendedor && d.cem_score !== null) {
            advisorStats[d.vendedor] = (advisorStats[d.vendedor] || 0) + 1;
        }
    });
    const topAdvisors = Object.entries(advisorStats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // 9. Volumen Anual de Reclamos (Sales Internal)
    const salesClaimsEvolution = MONTHS.map(m => {
        const count = data.salesClaims.filter(d => d.mes === m && (!selectedYear || d.anio === selectedYear) && (!selectedBranch || d.sucursal === selectedBranch)).length;
        return { name: m, value: count };
    });

    return {
        avgCEM,
        avgLVS,
        avgOSInternal,
        avgLVSInternal,
        inProgressAvgCEM,
        inProgressAvgLVS,
        inProgressAvgOSInternal,
        inProgressAvgLVSInternal,
        closedAvgCEM,
        closedAvgLVS,
        closedAvgOSInternal,
        closedAvgLVSInternal,
        totalSalesClaims,
        totalPostventaClaims,
        topPostventaReasons,
        postventaEvolution,
        topSalesReasons,
        topAdvisors,
        salesClaimsEvolution
    };
  }, [filteredData, data.quality, data.salesClaims, selectedYear, selectedBranch]);

  return (
    <DashboardFrame 
        title="REUNIÓN DE CALIDAD" 
        subtitle="REPORTE DE GESTIÓN ESTRATÉGICA"
        context={
            <>
                <span className="px-3 py-1.5 rounded-full bg-slate-950 text-white text-[9px] font-black uppercase tracking-[0.2em]">
                    Resumen
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
                    Año: {selectedYear}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
                    Mes: {selectedMonth || 'TODOS'}
                </span>
                <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
                    Sucursal: {selectedBranch || 'TODAS'}
                </span>
            </>
        }
        onBack={onBack}
        isLoading={loading === LoadingState.LOADING}
        className="bg-slate-950 print:bg-white"
    >
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                .no-print { display: none !important; }
                body { background: white !important; color: black !important; margin: 0; padding: 0; }
                .bg-slate-950 { background: white !important; }
                .text-white { color: black !important; }
                .text-slate-400 { color: #64748b !important; }
                .border-white\\/10 { border-color: #e2e8f0 !important; }
                .shadow-2xl, .shadow-xl { box-shadow: none !important; }
                .backdrop-blur-2xl, .backdrop-blur-xl { backdrop-filter: none !important; background: rgba(255,255,255,0.05) !important; }
                .rounded-[2.5rem], .rounded-[3rem], .rounded-[3.5rem] { border-radius: 1rem !important; }
                
                /* Avoid blank pages and force layout */
                .print-container { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 20px !important; }
                .chart-wrapper { page-break-inside: avoid; margin-bottom: 30px !important; }
                
                /* Hide background decorative elements */
                .bg-blue-600\\/10, .bg-indigo-600\\/10 { display: none !important; }
                
                /* Ensure charts are visible */
                svg { max-width: 100% !important; }
            }
        `}} />
        <div className="relative space-y-12 pb-20 px-4 md:px-8 print:p-0 print:space-y-8">
            {/* Report Cover Section */}
            <ReportCover 
                year={selectedYear} 
                month={selectedMonth} 
                branch={selectedBranch} 
            />

            {/* Professional Tech Background Elements */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.05] pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>

            {/* Header Section with Glassmorphism */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/5 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white/10 print:hidden">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-600/20 transform -rotate-2">
                        <Icons.Activity className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter italic leading-none">PANEL DE CONTROL</h2>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mt-2">Monitoreo Estratégico Autosol</p>
                    </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-inner">
                        {YEARS.map(y => (
                            <button
                                key={y}
                                onClick={() => setSelectedYear(y)}
                                className={`px-8 py-2.5 rounded-xl text-[11px] font-black transition-all duration-500 ${
                                    selectedYear === y ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-white'
                                }`}
                            >
                                {y}
                            </button>
                        ))}
                    </div>

                    <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-white/5 backdrop-blur-md border border-white/10 text-white text-[11px] font-black rounded-2xl px-8 py-3.5 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase tracking-widest shadow-sm"
                    >
                        <option value="" className="bg-slate-900">Todos los Meses</option>
                        {MONTHS.map(m => <option key={m} value={m} className="bg-slate-900">{m}</option>)}
                    </select>

                    <select 
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="bg-white/5 backdrop-blur-md border border-white/10 text-white text-[11px] font-black rounded-2xl px-8 py-3.5 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all uppercase tracking-widest shadow-sm"
                    >
                        <option value="" className="bg-slate-900">Todas las Sucursales</option>
                        {availableBranches.map(b => <option key={b} value={b} className="bg-slate-900">{b}</option>)}
                    </select>
                </div>
            </div>

            {/* Main KPIs with Gauges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <GaugeMetric 
                    title="VENTAS OS (EXTERNO)" 
                    value={metrics.avgCEM} 
                    inProgressValue={metrics.inProgressAvgCEM}
                    closedValue={metrics.closedAvgCEM}
                    target={4.80}
                    icon={<Icons.TrendingUp className="w-6 h-6" />}
                    monthName={selectedMonth || 'Actual'}
                    inProgressMonthName={filteredData.inProgressMonthName}
                    closedMonthName={filteredData.closedMonthName}
                />
                <GaugeMetric 
                    title="POSTVENTA LVS (EXTERNO)" 
                    value={metrics.avgLVS} 
                    inProgressValue={metrics.inProgressAvgLVS}
                    closedValue={metrics.closedAvgLVS}
                    target={4.80}
                    icon={<Icons.Settings className="w-6 h-6" />}
                    monthName={selectedMonth || 'Actual'}
                    inProgressMonthName={filteredData.inProgressMonthName}
                    closedMonthName={filteredData.closedMonthName}
                />
                <GaugeMetric 
                    title="VENTAS OS (INTERNO)" 
                    value={metrics.avgOSInternal} 
                    inProgressValue={metrics.inProgressAvgOSInternal}
                    closedValue={metrics.closedAvgOSInternal}
                    target={4.80}
                    icon={<Icons.UserCheck className="w-6 h-6" />}
                    monthName={selectedMonth || 'Actual'}
                    inProgressMonthName={filteredData.inProgressMonthName}
                    closedMonthName={filteredData.closedMonthName}
                />
                <GaugeMetric 
                    title="POSTVENTA LVS (INTERNO)" 
                    value={metrics.avgLVSInternal} 
                    inProgressValue={metrics.inProgressAvgLVSInternal}
                    closedValue={metrics.closedAvgLVSInternal}
                    target={4.80}
                    icon={<Icons.ShieldCheck className="w-6 h-6" />}
                    monthName={selectedMonth || 'Actual'}
                    inProgressMonthName={filteredData.inProgressMonthName}
                    closedMonthName={filteredData.closedMonthName}
                />
            </div>

            {/* Claims Volume Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 p-8 flex items-center justify-between group hover:bg-white/[0.08] transition-all duration-500 shadow-2xl">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                            <Icons.AlertCircle className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Reclamos Ventas</h4>
                            <p className="text-4xl font-black text-white tracking-tighter italic">{metrics.totalSalesClaims}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Acumulado</span>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl rounded-[3rem] border border-white/10 p-8 flex items-center justify-between group hover:bg-white/[0.08] transition-all duration-500 shadow-2xl">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                            <Icons.ClipboardList className="w-8 h-8" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Reclamos Postventa</h4>
                            <p className="text-4xl font-black text-white tracking-tighter italic">{metrics.totalPostventaClaims}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Total Acumulado</span>
                    </div>
                </div>
            </div>

            {/* POSTVENTA SECTION */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-4">
                    <div className="h-px flex-1 bg-white/10"></div>
                    <h3 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.5em] italic">Gestión Postventa (Interno)</h3>
                    <div className="h-px flex-1 bg-white/10"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ChartWrapper title="Motivos de Reclamo - Top 10 Análisis Detallado" isDark={true}>
                        <div className="h-[450px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.topPostventaReasons} layout="vertical" margin={{ left: 40, right: 60, top: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} width={180} />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }} />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={30}>
                                        <Cell fill="#3b82f6" />
                                        {/* @ts-ignore */}
                                        <LabelList dataKey="name" position="insideLeft" style={{ fill: '#fff', fontSize: 9, fontWeight: '900', textTransform: 'uppercase' }} offset={10} />
                                        {/* @ts-ignore */}
                                        <LabelList dataKey="value" position="right" style={{ fill: '#60a5fa', fontSize: 12, fontWeight: '900' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartWrapper>

                    <ChartWrapper title="Evolución Anual de Reclamos" isDark={true}>
                        <div className="h-[450px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metrics.postventaEvolution} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }} />
                                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} label={{ position: 'top', fill: '#60a5fa', fontSize: 11, fontWeight: '900', offset: 10 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartWrapper>
                </div>
            </div>

            {/* VENTAS SECTION */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-4">
                    <div className="h-px flex-1 bg-white/10"></div>
                    <h3 className="text-[11px] font-black text-amber-400 uppercase tracking-[0.5em] italic">Gestión Ventas (Interno)</h3>
                    <div className="h-px flex-1 bg-white/10"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ChartWrapper title="Motivos Principales de Reclamo" isDark={true}>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.topSalesReasons} layout="vertical" margin={{ left: 40, right: 60, top: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} width={120} />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }} />
                                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 10, 10, 0]} barSize={30}>
                                        {/* @ts-ignore */}
                                        <LabelList dataKey="value" position="right" style={{ fill: '#fbbf24', fontSize: 12, fontWeight: '900' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartWrapper>

                    <ChartWrapper title="Volumen Anual de Reclamos" isDark={true}>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metrics.salesClaimsEvolution} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }} />
                                    <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={4} dot={{ r: 6, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} label={{ position: 'top', fill: '#fbbf24', fontSize: 11, fontWeight: '900', offset: 10 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartWrapper>
                </div>
            </div>

            {/* ADVISOR RANKING SECTION */}
            <div className="space-y-8">
                <div className="flex items-center gap-4 px-4">
                    <div className="h-px flex-1 bg-white/10"></div>
                    <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.5em] italic">Desempeño de Asesores</h3>
                    <div className="h-px flex-1 bg-white/10"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <ChartWrapper title="Ranking de Asesores (Top Respuestas CEM)" isDark={true}>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.topAdvisors} layout="vertical" margin={{ left: 40, right: 60, top: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} width={120} />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }} />
                                    <Bar dataKey="value" fill="#10b981" radius={[0, 10, 10, 0]} barSize={30}>
                                        {/* @ts-ignore */}
                                        <LabelList dataKey="value" position="right" style={{ fill: '#34d399', fontSize: 12, fontWeight: '900' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartWrapper>
                </div>
            </div>
        </div>
    </DashboardFrame>
  );
};

export default ExecutiveSummary;
