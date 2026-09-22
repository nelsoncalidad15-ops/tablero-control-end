import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Icons } from './Icon';
import { DashboardFrame, ChartWrapper } from './DashboardUI';
import { LoadingState, AppConfig, DetailedQualityRecord, SalesQualityRecord, QualityRecord, SalesClaimsRecord, CemOsRecord, InternalPostventaRecord } from '../types';
import { 
    fetchDetailedQualityData, 
    fetchSalesQualityData, 
    fetchQualityData, 
    fetchSalesClaimsData, 
    fetchCemOsData,
    fetchInternalPostventaData
} from '../services/dataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, LabelList, PieChart, Pie } from 'recharts';
import { MONTHS, YEARS } from '../constants';
import './ExecutiveSummary.css';

interface ExecutiveSummaryProps {
  config: AppConfig;
  onBack: () => void;
}

type BranchGaugePoint = {
    branch: string;
    value: number;
    inProgressValue?: number;
    closedValue?: number;
};

const countUniqueClaims = <T extends { id: string; sucursal?: string; anio?: number }>(
    rows: T[],
    getClaimNumber: (row: T) => string | undefined
) => new Set(rows.map(row => {
    const claimNumber = getClaimNumber(row)?.trim().toUpperCase();
    return claimNumber
        ? `${row.anio || ''}|${row.sucursal || ''}|${claimNumber}`
        : row.id;
})).size;

export const OS_TARGETS: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number> = {
    Q1: 4.80,
    Q2: 4.81,
    Q3: 4.82,
    Q4: 4.83
};

export const MONTH_TO_QUARTER: Record<string, 'Q1' | 'Q2' | 'Q3' | 'Q4'> = {
    'Enero': 'Q1',
    'Febrero': 'Q1',
    'Marzo': 'Q1',
    'Abril': 'Q2',
    'Mayo': 'Q2',
    'Junio': 'Q2',
    'Julio': 'Q3',
    'Agosto': 'Q3',
    'Septiembre': 'Q3',
    'Octubre': 'Q4',
    'Noviembre': 'Q4',
    'Diciembre': 'Q4'
};

export const QUARTER_MONTHS: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', string[]> = {
    Q1: ['Enero', 'Febrero', 'Marzo'],
    Q2: ['Abril', 'Mayo', 'Junio'],
    Q3: ['Julio', 'Agosto', 'Septiembre'],
    Q4: ['Octubre', 'Noviembre', 'Diciembre']
};

export const getOsTargetInfo = (months: string[]) => {
    if (!months || months.length === 0) {
        return {
            target: 4.815,
            label: 'Anual'
        };
    }

    const quarters = Array.from(new Set(months.map(m => MONTH_TO_QUARTER[m]).filter(Boolean))) as ('Q1' | 'Q2' | 'Q3' | 'Q4')[];
    
    if (quarters.length === 1) {
        const q = quarters[0];
        return {
            target: OS_TARGETS[q],
            label: q
        };
    }

    const total = months.reduce((sum, m) => sum + (OS_TARGETS[MONTH_TO_QUARTER[m]] || 4.80), 0);
    const avg = total / months.length;
    quarters.sort();
    return {
        target: avg,
        label: quarters.join('-')
    };
};

export const LVS_TARGETS: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', number> = {
    Q1: 4.80,
    Q2: 4.81,
    Q3: 4.82,
    Q4: 4.83
};

export const getLvsTargetInfo = (months: string[]) => {
    if (!months || months.length === 0) {
        return {
            target: 4.815,
            label: 'Anual'
        };
    }

    const quarters = Array.from(new Set(months.map(m => MONTH_TO_QUARTER[m]).filter(Boolean))) as ('Q1' | 'Q2' | 'Q3' | 'Q4')[];
    
    if (quarters.length === 1) {
        const q = quarters[0];
        return {
            target: LVS_TARGETS[q],
            label: q
        };
    }

    const total = months.reduce((sum, m) => sum + (LVS_TARGETS[MONTH_TO_QUARTER[m]] || 4.80), 0);
    const avg = total / months.length;
    quarters.sort();
    return {
        target: avg,
        label: quarters.join('-')
    };
};

const GaugeMetric: React.FC<{ 
    title: string, 
    value: number, 
    inProgressValue?: number,
    closedValue?: number,
    target: number, 
    inProgressTarget?: number,
    closedTarget?: number,
    targetLabel?: string,
    icon: React.ReactNode, 
    monthName: string, 
    inProgressMonthName?: string,
    closedMonthName?: string,
    comparisonSeries?: BranchGaugePoint[]
}> = ({ 
    title, 
    value, 
    inProgressValue, 
    closedValue, 
    target, 
    inProgressTarget, 
    closedTarget, 
    targetLabel, 
    icon, 
    monthName, 
    inProgressMonthName, 
    closedMonthName, 
    comparisonSeries 
}) => {
    const isSuccess = value >= target;
    const color = isSuccess ? '#10b981' : '#ef4444';
    
    const effInProgressTarget = inProgressTarget ?? target;
    const inProgressIsSuccess = inProgressValue !== undefined ? inProgressValue >= effInProgressTarget : null;
    const inProgressColor = inProgressIsSuccess === true ? 'text-emerald-400' : inProgressIsSuccess === false ? 'text-rose-400' : 'text-slate-500';

    const effClosedTarget = closedTarget ?? target;
    const closedIsSuccess = closedValue !== undefined ? closedValue >= effClosedTarget : null;
    const closedColor = closedIsSuccess === true ? 'text-emerald-400' : closedIsSuccess === false ? 'text-rose-400' : 'text-slate-500';

    // Data for the gauge (half circle)
    const data = [
        { value: value, fill: color },
        { value: Math.max(0, 5 - value), fill: 'rgba(255,255,255,0.05)' }
    ];

    const hasComparison = (comparisonSeries || []).length > 1;

    const MiniGauge: React.FC<{ point: BranchGaugePoint }> = ({ point }) => {
        const pointIsSuccess = point.value >= target;
        const pointColor = pointIsSuccess ? '#10b981' : '#ef4444';
        const pointData = [
            { value: point.value, fill: pointColor },
            { value: Math.max(0, 5 - point.value), fill: 'rgba(255,255,255,0.05)' }
        ];

        return (
            <div className="executive-mini-gauge rounded-2xl border border-slate-200 bg-slate-50 p-3 min-h-[170px] flex flex-col">
                <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] truncate">{point.branch}</span>
                    <span className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.25em] border ${pointIsSuccess ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {point.value.toFixed(2)}
                    </span>
                </div>

                <div className="relative w-full aspect-square max-w-[115px] mx-auto">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={pointData}
                                cx="50%"
                                cy="50%"
                                innerRadius="82%"
                                outerRadius="100%"
                                startAngle={225}
                                endAngle={-45}
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={20}
                            >
                                <Cell key="cell-0" fill={pointColor} />
                                <Cell key="cell-1" fill="rgba(255,255,255,0.05)" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.35em] mb-1">{monthName}</span>
                        <span className={`text-2xl font-black tracking-tighter ${pointIsSuccess ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {point.value.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="executive-gauge-card bg-white rounded-[18px] border border-slate-200 p-5 flex flex-col items-center justify-center relative overflow-hidden group transition-all duration-300 min-h-[275px]"
        >
            {/* Decorative background glow */}
            <div className={`absolute inset-0 opacity-[0.03] transition-opacity duration-1000 group-hover:opacity-[0.1] ${isSuccess ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            
            <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSuccess ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'} border border-white/10`}>
                    {icon}
                </div>
                <h4 className="text-[11px] font-bold text-[#001e50] uppercase tracking-[0.08em]">{title}</h4>
            </div>
            
            {hasComparison ? (
                <div className={`grid gap-3 mt-2 w-full relative z-10 ${comparisonSeries!.length === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                    {comparisonSeries!.map(point => (
                        <MiniGauge key={point.branch} point={point} />
                    ))}
                </div>
            ) : (
                <>
                    <div className="relative w-full aspect-square max-w-[160px] z-10">
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
                                    className={`text-4xl font-black tracking-tighter ${isSuccess ? 'text-emerald-600' : 'text-rose-600'}`}
                                >
                                    {value.toFixed(2)}
                                </motion.span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4 w-full relative z-10">
                        <div className="flex flex-col items-center border-r border-white/10">
                            <div className="flex items-center gap-1 mb-1">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Objetivo</span>
                                {targetLabel && (
                                    <span className="text-[7.5px] font-bold px-1 py-0.5 rounded bg-[#001e50]/5 text-[#001e50] border border-[#001e50]/10">
                                        {targetLabel}
                                    </span>
                                )}
                            </div>
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
                </>
            )}

            <div className={`mt-4 px-4 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-[0.08em] relative z-10 transition-all duration-300 ${
                isSuccess 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/10'
            }`}>
                {isSuccess ? 'Objetivo Cumplido' : 'Bajo Objetivo'}
            </div>
        </motion.div>
    );
};

const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({ config, onBack }) => {
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  
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
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);

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
    const allowed = ['JUJUY', 'SALTA'];
    return allowed.filter(branch =>
      data.salesQuality.some(d => d.sucursal === branch) ||
      data.quality.some(d => d.sucursal === branch) ||
      data.detailedQuality.some(d => d.sucursal === branch) ||
      data.cemOs.some(d => d.sucursal === branch)
    );
  }, [data]);

  const filteredData = useMemo(() => {
    const filterByYearMonthBranch = (list: any[], months: string[] = []) => {
        return list.filter(d => {
            const matchYear = !selectedYear || d.anio === selectedYear || (d.fecha_reclamo && d.fecha_reclamo.includes(selectedYear.toString()));
            const matchMonth = months.length === 0 || months.includes(d.mes);
            const matchBranch = selectedBranches.length === 0 || selectedBranches.includes(d.sucursal);
            return matchYear && matchMonth && matchBranch;
        });
    };

    const previousMonths = (offset: number) => MONTHS.filter(month =>
        selectedMonths.some(selected => MONTHS.indexOf(selected) - offset === MONTHS.indexOf(month))
    );
    const inProgressMonths = previousMonths(1);
    const closedMonths = previousMonths(2);
    const monthLabel = (months: string[]) => months.map(month => month.slice(0, 3)).join(' / ');

    return {
        detailedQuality: filterByYearMonthBranch(data.detailedQuality, selectedMonths),
        salesQuality: filterByYearMonthBranch(data.salesQuality, selectedMonths),
        quality: filterByYearMonthBranch(data.quality, selectedMonths),
        salesClaims: filterByYearMonthBranch(data.salesClaims, selectedMonths),
        cemOs: filterByYearMonthBranch(data.cemOs, selectedMonths),
        internalPostventa: filterByYearMonthBranch(data.internalPostventa, selectedMonths),
        
        // In Progress Month Data (M-1)
        inProgressMonthName: monthLabel(inProgressMonths),
        inProgressMonths,
        inProgressDetailedQuality: inProgressMonths.length ? filterByYearMonthBranch(data.detailedQuality, inProgressMonths) : [],
        inProgressSalesQuality: inProgressMonths.length ? filterByYearMonthBranch(data.salesQuality, inProgressMonths) : [],
        inProgressCemOs: inProgressMonths.length ? filterByYearMonthBranch(data.cemOs, inProgressMonths) : [],
        inProgressInternalPostventa: inProgressMonths.length ? filterByYearMonthBranch(data.internalPostventa, inProgressMonths) : [],

        // Closed Month Data (M-2)
        closedMonthName: monthLabel(closedMonths),
        closedMonths,
        closedDetailedQuality: closedMonths.length ? filterByYearMonthBranch(data.detailedQuality, closedMonths) : [],
        closedSalesQuality: closedMonths.length ? filterByYearMonthBranch(data.salesQuality, closedMonths) : [],
        closedCemOs: closedMonths.length ? filterByYearMonthBranch(data.cemOs, closedMonths) : [],
        closedInternalPostventa: closedMonths.length ? filterByYearMonthBranch(data.internalPostventa, closedMonths) : []
    };
  }, [data, selectedYear, selectedMonths, selectedBranches]);

  const metrics = useMemo(() => {
    const calculateAvg = (list: any[], key: string) => {
        const scores = list.map(d => d[key]).filter((v): v is number => v !== null && !isNaN(v));
        return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    };

    const comparisonBranches = selectedBranches.length > 1 ? selectedBranches : [];
    const makeBranchSeries = (list: any[], key: string) => {
        if (comparisonBranches.length === 0) return [];
        return comparisonBranches.map(branch => {
            const branchCurrent = list.filter(d => {
                const matchYear = !selectedYear || d.anio === selectedYear || (d.fecha_reclamo && d.fecha_reclamo.includes(selectedYear.toString()));
                const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(d.mes);
                return matchYear && matchMonth && d.sucursal === branch;
            });

            const branchInProgress = filteredData.inProgressMonths.length
                ? list.filter(d => {
                    const matchYear = !selectedYear || d.anio === selectedYear || (d.fecha_reclamo && d.fecha_reclamo.includes(selectedYear.toString()));
                    const matchMonth = filteredData.inProgressMonths.includes(d.mes);
                    return matchYear && matchMonth && d.sucursal === branch;
                })
                : [];

            const branchClosed = filteredData.closedMonths.length
                ? list.filter(d => {
                    const matchYear = !selectedYear || d.anio === selectedYear || (d.fecha_reclamo && d.fecha_reclamo.includes(selectedYear.toString()));
                    const matchMonth = filteredData.closedMonths.includes(d.mes);
                    return matchYear && matchMonth && d.sucursal === branch;
                })
                : [];

            return {
                branch,
                value: calculateAvg(branchCurrent, key),
                inProgressValue: branchInProgress.length > 0 ? calculateAvg(branchInProgress, key) : undefined,
                closedValue: branchClosed.length > 0 ? calculateAvg(branchClosed, key) : undefined
            };
        });
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

    const cemBranchSeries = makeBranchSeries(data.cemOs, 'cem_score');
    const lvsBranchSeries = makeBranchSeries(data.detailedQuality, 'q4_score');
    const osInternalBranchSeries = makeBranchSeries(data.salesQuality, 'cem_general');
    const lvsInternalBranchSeries = makeBranchSeries(data.internalPostventa, 'servicio_prestado');

    // 4. Total Reclamos (Internal Sales)
    const totalSalesClaims = countUniqueClaims(filteredData.salesClaims, row => row.nro_r);

    // 5. Total Reclamos (Internal Postventa)
    const totalPostventaClaims = countUniqueClaims(filteredData.quality, row => row.orden);

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
        const count = countUniqueClaims(
            data.quality.filter(d => d.mes === m && (!selectedYear || d.anio === selectedYear) && (selectedBranches.length === 0 || selectedBranches.includes(d.sucursal))),
            row => row.orden
        );
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
        const count = countUniqueClaims(
            data.salesClaims.filter(d => d.mes === m && (!selectedYear || d.anio === selectedYear) && (selectedBranches.length === 0 || selectedBranches.includes(d.sucursal))),
            row => row.nro_r
        );
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
        cemBranchSeries,
        lvsBranchSeries,
        osInternalBranchSeries,
        lvsInternalBranchSeries,
        totalSalesClaims,
        totalPostventaClaims,
        topPostventaReasons,
        postventaEvolution,
        topSalesReasons,
        topAdvisors,
        salesClaimsEvolution
    };
  }, [filteredData, data.cemOs, data.detailedQuality, data.salesQuality, data.internalPostventa, data.quality, data.salesClaims, selectedYear, selectedMonths, selectedBranches]);

  // Quarterly targets for OS (Ventas)
  const osTarget = useMemo(() => getOsTargetInfo(selectedMonths), [selectedMonths]);
  const osInProgressTarget = useMemo(() => getOsTargetInfo(filteredData.inProgressMonths), [filteredData.inProgressMonths]);
  const osClosedTarget = useMemo(() => getOsTargetInfo(filteredData.closedMonths), [filteredData.closedMonths]);

  // Quarterly targets for LVS (Postventa)
  const lvsTarget = useMemo(() => getLvsTargetInfo(selectedMonths), [selectedMonths]);
  const lvsInProgressTarget = useMemo(() => getLvsTargetInfo(filteredData.inProgressMonths), [filteredData.inProgressMonths]);
  const lvsClosedTarget = useMemo(() => getLvsTargetInfo(filteredData.closedMonths), [filteredData.closedMonths]);

  return (
    <DashboardFrame 
        title="REUNIÓN DE CALIDAD" 
        subtitle="REPORTE DE GESTIÓN ESTRATÉGICA"
        onBack={onBack}
        isLoading={loading === LoadingState.LOADING}
        className="executive-summary-shell print:bg-white"
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
        <div className="executive-summary-content relative space-y-6 pb-10 print:p-0 print:space-y-8">
            {/* Professional Tech Background Elements */}
            <div className="hidden fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-blue-600/10 blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.05] pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            </div>

            {/* Header Section with Glassmorphism */}
            <div className="executive-toolbar flex flex-col gap-3 bg-white p-4 rounded-[18px] border border-slate-200 print:hidden">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#001e50] rounded-xl flex items-center justify-center text-white shrink-0">
                            <Icons.Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-[#008bc5] uppercase tracking-[0.2em]">Sala de situación</p>
                            <h2 className="text-xl md:text-2xl font-bold text-[#001e50] tracking-tight leading-tight">Panel ejecutivo</h2>
                        </div>
                    </div>

                    <div className="executive-filter-summary text-[11px] font-semibold text-[#586d83]">
                        {selectedYear} · {osTarget.label && osTarget.label !== 'Anual' ? `${osTarget.label} · ` : ''}{selectedMonths.length ? selectedMonths.map(m => m.slice(0, 3)).join(' / ') : 'Todos los meses'} · {selectedBranches.length ? selectedBranches.join(' / ') : 'Todas las sucursales'}
                    </div>
                </div>

                <div className="executive-filter-row">
                    <span className="executive-filter-label">Año</span>
                    <div className="executive-filter-options">
                        {YEARS.map(y => (
                            <button
                                type="button"
                                key={y}
                                onClick={() => setSelectedYear(y)}
                                aria-pressed={selectedYear === y}
                                className={`executive-filter-button ${selectedYear === y ? 'is-active' : ''}`}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="executive-filter-row">
                    <span className="executive-filter-label">Trimestre</span>
                    <div className="executive-filter-options">
                        {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => {
                            const qMonths = QUARTER_MONTHS[q];
                            const isQActive = qMonths.length === selectedMonths.length && qMonths.every(m => selectedMonths.includes(m));
                            return (
                                <button
                                    type="button"
                                    key={q}
                                    onClick={() => {
                                        if (isQActive) {
                                            setSelectedMonths([]);
                                        } else {
                                            setSelectedMonths([...qMonths]);
                                        }
                                    }}
                                    aria-pressed={isQActive}
                                    className={`executive-filter-button ${isQActive ? 'is-active' : ''}`}
                                    title={`${q}: ${qMonths.map(m => m.slice(0, 3)).join(', ')} (Obj. OS / LVS: ${OS_TARGETS[q].toFixed(2)})`}
                                >
                                    {q} <span className="opacity-70 text-[9px] font-normal ml-1">({OS_TARGETS[q].toFixed(2)})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="executive-filter-row">
                    <span className="executive-filter-label">Meses</span>
                    <div className="executive-filter-options executive-month-options">
                        <button type="button" onClick={() => setSelectedMonths([])} aria-pressed={selectedMonths.length === 0} className={`executive-filter-button ${selectedMonths.length === 0 ? 'is-active' : ''}`}>Todos</button>
                        {MONTHS.map(month => (
                            <button
                                type="button"
                                key={month}
                                onClick={() => setSelectedMonths(current => current.includes(month) ? current.filter(item => item !== month) : [...current, month])}
                                aria-pressed={selectedMonths.includes(month)}
                                className={`executive-filter-button ${selectedMonths.includes(month) ? 'is-active' : ''}`}
                            >{month.slice(0, 3)}</button>
                        ))}
                    </div>
                </div>

                <div className="executive-filter-row">
                    <span className="executive-filter-label">Sucursal</span>
                    <div className="executive-filter-options">
                        <button type="button" onClick={() => setSelectedBranches([])} aria-pressed={selectedBranches.length === 0} className={`executive-filter-button ${selectedBranches.length === 0 ? 'is-active' : ''}`}>Todas</button>
                        {availableBranches.map(branch => (
                            <button
                                type="button"
                                key={branch}
                                onClick={() => setSelectedBranches(current => current.includes(branch) ? current.filter(item => item !== branch) : [...current, branch])}
                                aria-pressed={selectedBranches.includes(branch)}
                                className={`executive-filter-button ${selectedBranches.includes(branch) ? 'is-active' : ''}`}
                            >{branch}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main KPIs with Gauges */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <GaugeMetric 
                    title="VENTAS OS (EXTERNO)" 
                    value={metrics.avgCEM} 
                    inProgressValue={metrics.inProgressAvgCEM}
                    closedValue={metrics.closedAvgCEM}
                    target={osTarget.target}
                    inProgressTarget={osInProgressTarget.target}
                    closedTarget={osClosedTarget.target}
                    targetLabel={osTarget.label}
                    icon={<Icons.TrendingUp className="w-6 h-6" />}
                    monthName={selectedMonths.length ? selectedMonths.map(m => m.slice(0, 3)).join(' / ') : 'Anual'}
                    inProgressMonthName={filteredData.inProgressMonthName}
                    closedMonthName={filteredData.closedMonthName}
                    comparisonSeries={metrics.cemBranchSeries}
                />
                <GaugeMetric 
                    title="POSTVENTA LVS (EXTERNO)" 
                    value={metrics.avgLVS} 
                    inProgressValue={metrics.inProgressAvgLVS}
                    closedValue={metrics.closedAvgLVS}
                    target={lvsTarget.target}
                    inProgressTarget={lvsInProgressTarget.target}
                    closedTarget={lvsClosedTarget.target}
                    targetLabel={lvsTarget.label}
                    icon={<Icons.Settings className="w-6 h-6" />}
                    monthName={selectedMonths.length ? selectedMonths.map(m => m.slice(0, 3)).join(' / ') : 'Anual'}
                    inProgressMonthName={filteredData.inProgressMonthName}
                    closedMonthName={filteredData.closedMonthName}
                    comparisonSeries={metrics.lvsBranchSeries}
                />
                <GaugeMetric 
                    title="VENTAS OS (INTERNO)" 
                    value={metrics.avgOSInternal} 
                    inProgressValue={metrics.inProgressAvgOSInternal}
                    closedValue={metrics.closedAvgOSInternal}
                    target={osTarget.target}
                    inProgressTarget={osInProgressTarget.target}
                    closedTarget={osClosedTarget.target}
                    targetLabel={osTarget.label}
                    icon={<Icons.UserCheck className="w-6 h-6" />}
                    monthName={selectedMonths.length ? selectedMonths.map(m => m.slice(0, 3)).join(' / ') : 'Anual'}
                    inProgressMonthName={filteredData.inProgressMonthName}
                    closedMonthName={filteredData.closedMonthName}
                    comparisonSeries={metrics.osInternalBranchSeries}
                />
                <GaugeMetric 
                    title="POSTVENTA LVS (INTERNO)" 
                    value={metrics.avgLVSInternal} 
                    inProgressValue={metrics.inProgressAvgLVSInternal}
                    closedValue={metrics.closedAvgLVSInternal}
                    target={lvsTarget.target}
                    inProgressTarget={lvsInProgressTarget.target}
                    closedTarget={lvsClosedTarget.target}
                    targetLabel={lvsTarget.label}
                    icon={<Icons.ShieldCheck className="w-6 h-6" />}
                    monthName={selectedMonths.length ? selectedMonths.map(m => m.slice(0, 3)).join(' / ') : 'Anual'}
                    inProgressMonthName={filteredData.inProgressMonthName}
                    closedMonthName={filteredData.closedMonthName}
                    comparisonSeries={metrics.lvsInternalBranchSeries}
                />
            </div>

            {/* Claims Volume Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <ChartWrapper title="Motivos de Reclamo - Top 10 Análisis Detallado" isDark={false}>
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
                                        <LabelList dataKey="value" position="right" style={{ fill: '#2866b2', fontSize: 12, fontWeight: '900' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartWrapper>

                    <ChartWrapper title="Evolución Anual de Reclamos" isDark={false}>
                        <div className="h-[450px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metrics.postventaEvolution} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }} />
                                    <Line type="monotone" dataKey="value" stroke="#2866b2" strokeWidth={3} dot={{ r: 4, fill: '#2866b2', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} label={{ position: 'top', fill: '#2866b2', fontSize: 11, fontWeight: '700', offset: 10 }} />
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
                    <ChartWrapper title="Motivos Principales de Reclamo" isDark={false}>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.topSalesReasons} layout="vertical" margin={{ left: 40, right: 60, top: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} width={120} />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }} />
                                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 10, 10, 0]} barSize={30}>
                                        {/* @ts-ignore */}
                                        <LabelList dataKey="value" position="right" style={{ fill: '#b76a00', fontSize: 12, fontWeight: '900' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </ChartWrapper>

                    <ChartWrapper title="Volumen Anual de Reclamos" isDark={false}>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={metrics.salesClaimsEvolution} margin={{ top: 20, right: 40, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }} />
                                    <Line type="monotone" dataKey="value" stroke="#e99408" strokeWidth={3} dot={{ r: 4, fill: '#e99408', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} label={{ position: 'top', fill: '#a65e00', fontSize: 11, fontWeight: '700', offset: 10 }} />
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
                    <ChartWrapper title="Ranking de Asesores (Top Respuestas CEM)" isDark={false}>
                        <div className="h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={metrics.topAdvisors} layout="vertical" margin={{ left: 40, right: 60, top: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} width={120} />
                                    <Tooltip cursor={{fill: '#1e293b'}} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }} />
                                    <Bar dataKey="value" fill="#10b981" radius={[0, 10, 10, 0]} barSize={30}>
                                        {/* @ts-ignore */}
                                        <LabelList dataKey="value" position="right" style={{ fill: '#047857', fontSize: 12, fontWeight: '900' }} />
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
