
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Icons } from './Icon';
import { 
    fetchDetailedQualityData, 
    fetchSalesQualityData, 
    fetchQualityData, 
    fetchSalesClaimsData, 
    fetchCemOsData,
    fetchInternalPostventaData
} from '../services/dataService';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    Cell, LineChart, Line, LabelList, PieChart, Pie 
} from 'recharts';
import { MONTHS, YEARS } from '../constants';
import { LoadingState, AppConfig, DetailedQualityRecord, SalesQualityRecord, QualityRecord, SalesClaimsRecord, CemOsRecord, InternalPostventaRecord } from '../types';

interface ProfessionalReportProps {
  config: AppConfig;
  onBack: () => void;
}

const ProfessionalReport: React.FC<ProfessionalReportProps> = ({ config, onBack }) => {
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[new Date().getMonth()]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
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

  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(LoadingState.LOADING);
      try {
        const results = await Promise.allSettled([
          fetchDetailedQualityData(config.sheetUrls.detailed_quality || ''),
          fetchDetailedQualityData(config.sheetUrls.detailed_quality_salta || ''),
          fetchSalesQualityData(config.sheetUrls.sales_quality || ''),
          fetchQualityData(config.sheetUrls.calidad || ''),
          fetchSalesClaimsData(config.sheetUrls.sales_claims || ''),
          fetchCemOsData(config.sheetUrls.cem_os || ''),
          fetchCemOsData(config.sheetUrls.cem_os_salta || ''),
          fetchInternalPostventaData(config.sheetUrls.internal_postventa || '')
        ]);

        const pick = <T,>(index: number): T[] => {
          const result = results[index];
          if (result.status === 'fulfilled') return result.value as T[];
          console.warn('[Report] Fuente no disponible:', result.reason);
          return [];
        };

        const dqJ = pick<DetailedQualityRecord>(0);
        const dqS = pick<DetailedQualityRecord>(1);
        const sq = pick<SalesQualityRecord>(2);
        const q = pick<QualityRecord>(3);
        const sc = pick<SalesClaimsRecord>(4);
        const coJ = pick<CemOsRecord>(5);
        const coS = pick<CemOsRecord>(6);
        const ip = pick<InternalPostventaRecord>(7);

        setData({
          detailedQuality: [
            ...dqJ.map(d => ({ ...d, sucursal: 'JUJUY' })),
            ...dqS.map(d => ({ ...d, sucursal: 'SALTA' }))
          ],
          salesQuality: sq,
          quality: q,
          salesClaims: sc,
          cemOs: [
            ...coJ.map(d => ({ ...d, sucursal: 'JUJUY' })),
            ...coS.map(d => ({ ...d, sucursal: 'SALTA' }))
          ],
          internalPostventa: ip
        });
        setLoading(LoadingState.SUCCESS);
      } catch (error) {
        console.error("Error loading report data", error);
        setLoading(LoadingState.ERROR);
      }
    };
    loadAllData();
  }, [config]);

  // Logic for closed months
  const getClosedMonths = (currentMonth: string) => {
    const monthIdx = MONTHS.indexOf(currentMonth);
    const mMinus1Idx = (monthIdx - 1 + 12) % 12;
    const mMinus2Idx = (monthIdx - 2 + 12) % 12;
    
    return {
      current: currentMonth,
      mMinus1: MONTHS[mMinus1Idx],
      mMinus2: MONTHS[mMinus2Idx]
    };
  };

  const reportMonths = useMemo(() => getClosedMonths(selectedMonth), [selectedMonth]);

  const normalizeBranchKey = (value: string) => {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  };

  const isDate = (val: string) => {
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

  const filteredMetrics = useMemo(() => {
    const branchFilter = (d: any) => {
        if (!selectedBranch) return true;
        const branchValue = normalizeBranchKey(d.sucursal || d.nombre_sucursal || d.concesionario || d.codigo || '');
        if (selectedBranch === 'JUJUY') return branchValue === 'JUJUY' || branchValue === '3059';
        if (selectedBranch === 'SALTA') return branchValue === 'SALTA' || branchValue === '3087' || branchValue === '3089';
        return branchValue === normalizeBranchKey(selectedBranch);
    };

    const getDetailedQualityMonthData = (month: string) => {
        const monthData = data.detailedQuality.filter(d => d.mes === month && branchFilter(d));
        if (monthData.length > 0) return monthData;

        // Salta's detailed sheet can arrive without a month marker in compact exports.
        // In that case, fall back to the branch's rows so the CEM section doesn't render blank.
        if (selectedBranch === 'SALTA') {
            const branchData = data.detailedQuality.filter(d => branchFilter(d));
            if (branchData.length > 0) return branchData;
        }

        return monthData;
    };

    const calculateCemMetrics = (month: string) => {
        const monthData = data.cemOs.filter(d => d.mes === month && branchFilter(d));
        const patentados = monthData.length;
        const declaredRecords = monthData.filter(d => isDate(d.fecha_link_llega));
        const declarados = new Set(declaredRecords.map(d => d.chasis).filter(Boolean)).size;
        const respondedRecords = monthData.filter(d => d.cem_score !== null);
        const respondieron = new Set(respondedRecords.map(d => d.chasis).filter(Boolean)).size;
        const scores = monthData.filter(d => d.cem_score !== null);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + (b.cem_score || 0), 0) / scores.length : 0;
        return { avg, patentados, declarados, respondieron };
    };

    const calculateLvsMetrics = (month: string) => {
        const monthData = getDetailedQualityMonthData(month);
        const scores = monthData.filter(d => d.q4_score !== null);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + (b.q4_score || 0), 0) / scores.length : 0;
        return { avg };
    };

    // 1. CEM Ventas (External)
    const cemCurrent = calculateCemMetrics(reportMonths.current);
    const cemM1 = calculateCemMetrics(reportMonths.mMinus1);
    const cemM2 = calculateCemMetrics(reportMonths.mMinus2);
    
    // CEM Evolution (Unfiltered by month)
    const cemEvolution = MONTHS.map(m => {
        const monthData = data.cemOs.filter(d => d.mes === m && branchFilter(d));
        const scores = monthData.filter(d => d.cem_score !== null);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + (b.cem_score || 0), 0) / scores.length : 0;
        return { name: m, value: parseFloat(avg.toFixed(2)) };
    });

    // 2. Encuesta Interna Ventas - Month - 1
    const internalVentasData = data.salesQuality.filter(d => d.mes === reportMonths.mMinus1 && branchFilter(d));
    const avgInternalOS = internalVentasData.filter(d => d.cem_general !== null).reduce((a, b) => a + (b.cem_general || 0), 0) / (internalVentasData.filter(d => d.cem_general !== null).length || 1);
    const avgInternalTrato = internalVentasData.filter(d => d.cem_trato !== null).reduce((a, b) => a + (b.cem_trato || 0), 0) / (internalVentasData.filter(d => d.cem_trato !== null).length || 1);
    const avgInternalOrg = internalVentasData.filter(d => d.cem_organizacion !== null).reduce((a, b) => a + (b.cem_organizacion || 0), 0) / (internalVentasData.filter(d => d.cem_organizacion !== null).length || 1);
    const avgInternalAses = internalVentasData.filter(d => d.cem_asesoramiento !== null).reduce((a, b) => a + (b.cem_asesoramiento || 0), 0) / (internalVentasData.filter(d => d.cem_asesoramiento !== null).length || 1);

    // Adherencia a Procesos (Internal Ventas)
    const calculateProcessMetric = (data: any[], key: string) => {
        let yes = 0;
        let no = 0;
        data.forEach(d => {
            const val = String(d[key] || '').toLowerCase().trim();
            if (val === 'si' || val === 'sí') yes++;
            else if (val === 'no') no++;
        });
        const total = yes + no;
        return total > 0 ? (yes / total) * 100 : 0;
    };

    const processMetrics = [
        { name: 'Prueba Manejo', value: calculateProcessMetric(internalVentasData, 'prueba_manejo') },
        { name: 'Financiación', value: calculateProcessMetric(internalVentasData, 'ofrecimiento_financiacion') },
        { name: 'Toma Usados', value: calculateProcessMetric(internalVentasData, 'toma_usados') },
        { name: 'App Mi VW', value: calculateProcessMetric(internalVentasData, 'app_mi_vw') }
    ];

    // 3. Reclamos Ventas - Month - 1
    const claimsVentasData = data.salesClaims.filter(d => d.mes === reportMonths.mMinus1 && branchFilter(d));
    const totalClaimsVentas = claimsVentasData.length;
    const pendingClaimsVentas = claimsVentasData.filter(d => !d.identificacion_problema || d.identificacion_problema.trim() === '').length;
    
    const salesClaimsReasons: Record<string, number> = {};
    claimsVentasData.forEach(d => {
        if (d.motivo && d.motivo.toLowerCase() !== 'sin motivos' && d.motivo.toLowerCase() !== 'sin motivo') {
            const parts = d.motivo.split(/[,;\n\r]+/).map(s => s.trim());
            parts.forEach(p => {
                if (p && p.toLowerCase() !== 'sin motivos' && p.toLowerCase() !== 'sin motivo') {
                    salesClaimsReasons[p] = (salesClaimsReasons[p] || 0) + 1;
                }
            });
        }
    });
    const topSalesClaimsReasons = Object.entries(salesClaimsReasons)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    // 4. CEM Postventa (External LVS)
    const lvsCurrent = calculateLvsMetrics(reportMonths.current);
    const lvsM1 = calculateLvsMetrics(reportMonths.mMinus1);
    const lvsM2 = calculateLvsMetrics(reportMonths.mMinus2);

    const lvsDataM2 = getDetailedQualityMonthData(reportMonths.mMinus2);
    const avgQ1 = lvsDataM2.filter(d => d.q1_score !== null).reduce((a, b) => a + (b.q1_score || 0), 0) / (lvsDataM2.filter(d => d.q1_score !== null).length || 1);
    const avgQ3 = lvsDataM2.filter(d => d.q3_score !== null).reduce((a, b) => a + (b.q3_score || 0), 0) / (lvsDataM2.filter(d => d.q3_score !== null).length || 1);

    // 5. Reclamos Postventa - Month - 1
    const claimsPostventaData = data.quality.filter(d => d.mes === reportMonths.mMinus1 && branchFilter(d));
    const totalClaimsPostventa = claimsPostventaData.length;
    const uniqueClaimsPostventa = new Set(claimsPostventaData.map(d => d.orden).filter(o => o && o.toString().trim() !== '')).size;
    const pendingClaimsPostventa = claimsPostventaData.filter(d => String(d.resuelto || '').toUpperCase() !== 'SI').length;
    const resolvedClaimsPostventa = claimsPostventaData.filter(d => String(d.resuelto || '').toUpperCase() === 'SI').length;
    
    const postventaReasons: Record<string, number> = {};
    claimsPostventaData.forEach(d => {
        if (d.motivo && d.motivo.toLowerCase() !== 'sin motivos' && d.motivo.toLowerCase() !== 'sin motivo') {
            const parts = d.motivo.split(/[,;\n\r]+/).map(s => s.trim());
            parts.forEach(p => {
                if (p && p.toLowerCase() !== 'sin motivos' && p.toLowerCase() !== 'sin motivo') {
                    postventaReasons[p] = (postventaReasons[p] || 0) + 1;
                }
            });
        }
    });
    const topPostventaReasons = Object.entries(postventaReasons)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    // Annual Evolution of Claims (Unique ORs)
    const annualClaimsEvolution = MONTHS.map(m => {
        const monthData = data.quality.filter(d => d.mes === m && branchFilter(d));
        const unique = new Set(monthData.map(d => d.orden).filter(o => o && o.toString().trim() !== '')).size;
        return { name: m, value: unique };
    });

    // 6. Encuesta Interna Postventa
    const internalPostventaData = data.internalPostventa.filter(d => d.mes === reportMonths.mMinus1 && branchFilter(d));
    const avgScore = (key: keyof InternalPostventaRecord) => {
        const scores = internalPostventaData.map(r => Number(r[key])).filter(v => !isNaN(v) && v > 0);
        return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    };

    const internalPostventaMetrics = {
        lvs: avgScore('servicio_prestado'),
        trato: avgScore('trato_personal'),
        organizacion: avgScore('organizacion'),
        trabajoTaller: avgScore('trabajo_taller'),
        lavado: avgScore('lavado'),
        total: internalPostventaData.length
    };

    const topServicios = (() => {
        const counts: Record<string, number> = {};
        internalPostventaData.forEach(r => {
            if (r.servicio) counts[r.servicio] = (counts[r.servicio] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
    })();

    // Verbatim CEM Ventas OS
    const cemVentasDataM2 = data.cemOs.filter(d => d.mes === reportMonths.mMinus2 && branchFilter(d));
    const verbatimVentas = cemVentasDataM2
        .filter(d => d.comentario_cem && d.comentario_cem.trim() !== '')
        .map(d => ({
            comentario: d.comentario_cem,
            cliente: `${d.cliente_nombre || ''} ${d.cliente_apellido || ''}`.trim(),
            vendedor: d.vendedor,
            canal: d.canal_ventas,
            score: d.cem_score
        }));

    // Annual Survey Counts (Ventas) - Now showing unique surveys (Respondieron)
    const annualSurveyCounts = MONTHS.map(m => {
        const monthData = data.cemOs.filter(d => d.mes === m && branchFilter(d));
        const count = new Set(monthData.filter(d => d.cem_score !== null).map(d => d.chasis).filter(Boolean)).size;
        return { name: m, value: count };
    });

    // Annual Postventa Counts
    const annualPostventaCounts = MONTHS.map(m => {
        const count = data.detailedQuality.filter(d => d.mes === m && branchFilter(d)).length;
        return { name: m, value: count };
    });

    return {
        cemVentas: {
            current: cemCurrent,
            m1: cemM1,
            m2: cemM2,
            evolution: cemEvolution,
            verbatim: verbatimVentas.filter((v: any) => (v.score ?? 0) >= 1 && (v.score ?? 0) <= 5),
            annualCounts: annualSurveyCounts
        },
        internalVentas: {
            avgOS: avgInternalOS,
            avgTrato: avgInternalTrato,
            avgOrg: avgInternalOrg,
            avgAses: avgInternalAses,
            processMetrics
        },
        claimsVentas: {
            total: totalClaimsVentas,
            pending: pendingClaimsVentas,
            topReasons: topSalesClaimsReasons
        },
        cemPostventa: {
            current: lvsCurrent,
            m1: lvsM1,
            m2: lvsM2,
            avgTrato: avgQ1,
            avgReparacion: avgQ3,
            annualCounts: annualPostventaCounts
        },
        internalPostventa: {
            ...internalPostventaMetrics,
            topServicios
        },
        claimsPostventa: {
            total: totalClaimsPostventa,
            unique: uniqueClaimsPostventa,
            pending: pendingClaimsPostventa,
            resolved: resolvedClaimsPostventa,
            topReasons: topPostventaReasons,
            evolution: annualClaimsEvolution
        }
    };
  }, [data, selectedMonth, selectedBranch, reportMonths]);

  const handlePrint = () => {
    window.print();
  };

  if (loading === LoadingState.LOADING) return <div className="p-20 text-center font-black uppercase tracking-widest animate-pulse">Cargando Reporte...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-10 print:p-0 print:bg-white">
        {/* Controls - Hidden on Print */}
        <div className="max-w-5xl mx-auto mb-10 bg-white p-6 rounded-[2rem] shadow-xl flex flex-wrap items-center justify-between gap-6 print:hidden">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-blue-600 transition-all">
                    <Icons.ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-xl font-black text-slate-900 tracking-tighter italic">GENERADOR DE REPORTE</h1>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configuración de Informe Mensual</p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <select 
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-slate-50 border border-slate-100 text-slate-900 text-[11px] font-black rounded-xl px-6 py-3 outline-none uppercase tracking-widest"
                >
                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <select 
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="bg-slate-50 border border-slate-100 text-slate-900 text-[11px] font-black rounded-xl px-6 py-3 outline-none uppercase tracking-widest"
                >
                    <option value="">Todas las Sucursales</option>
                    <option value="JUJUY">Jujuy (3059)</option>
                    <option value="SALTA">Salta (3087)</option>
                </select>

                <button 
                    onClick={handlePrint}
                    className="px-8 py-3 bg-blue-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-900/20 hover:scale-105 transition-all flex items-center gap-3"
                >
                    <Icons.Printer className="w-4 h-4" />
                    Imprimir / Guardar PDF
                </button>
            </div>
        </div>

        {/* REPORT CONTENT */}
        <div ref={reportRef} className="max-w-[297mm] mx-auto bg-white shadow-2xl print:shadow-none min-h-[210mm] overflow-hidden print:block">
            
            {/* PAGE 1: COVER SLIDE */}
            <div className="h-[210mm] relative overflow-hidden page-break-after-always bg-slate-950 print:bg-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                {/* Modern Background Elements */}
                <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] print:hidden"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] print:hidden"></div>
                <div className="absolute inset-0 opacity-10 print:hidden" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                
                <div className="absolute top-12 left-12 flex items-center gap-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/10 print:bg-slate-50 print:border print:border-slate-200">
                        <span className="text-slate-950 font-black text-2xl">A</span>
                    </div>
                    <div>
                        <div className="text-xs font-black text-blue-400 uppercase tracking-[0.3em] print:!text-blue-600">Autosol</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest print:!text-slate-500">Grupo Cenoa</div>
                    </div>
                </div>

                {/* CENTER CONTENT - Absolute positioned for print reliability */}
                <div className="absolute inset-0 flex flex-col justify-center items-center p-12 pointer-events-none">
                    <div className="text-center space-y-10 max-w-5xl px-12 pointer-events-auto">
                        <div 
                            className="inline-block px-8 py-2.5 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-[0.5em] mb-4 print:!bg-blue-50 print:!text-blue-600 print:!border-blue-100"
                        >
                            Reporte de Gestión Estratégica
                        </div>
                        <h1 className="text-[80px] md:text-[100px] font-black text-white tracking-tighter italic leading-[0.9] uppercase print:!text-black">
                            REUNIÓN DE<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 print:!text-blue-600 print:!bg-none print:!bg-clip-border">CALIDAD</span>
                        </h1>
                        <div className="h-1.5 w-40 bg-gradient-to-r from-blue-500 to-emerald-500 mx-auto rounded-full print:!bg-blue-600"></div>
                        <h2 className="text-2xl md:text-3xl font-black text-slate-300 tracking-tighter italic uppercase print:!text-slate-700">
                            {selectedBranch || 'CONSOLIDADO GENERAL'} — {selectedMonth} {YEARS[0]}
                        </h2>
                    </div>
                </div>

                <div className="absolute bottom-12 right-12 flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1 print:!text-slate-400">Certificación de Calidad</p>
                        <p className="text-2xl font-black text-white italic tracking-tighter print:!text-black">Volkswagen Autosol</p>
                    </div>
                    <div className="w-16 h-16 border-2 border-white/20 rounded-full flex items-center justify-center font-black text-3xl text-white backdrop-blur-sm print:!border-slate-300 print:!text-black">W</div>
                </div>
            </div>

            {/* PAGE 2: TOPICS SLIDE */}
            <div className="h-[210mm] p-12 relative overflow-hidden page-break-after-always bg-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-bl-[200px]"></div>
                
                <div className="flex items-center gap-4 mb-12">
                    <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-white font-black text-xs">A</div>
                    <div className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Temario de Gestión</div>
                </div>

                <div className="grid grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-5xl font-black text-slate-900 tracking-tighter italic mb-8 uppercase">CONTENIDO</h2>
                        <ul className="space-y-3">
                            {[
                                "Resultados KPI: CEM Ventas",
                                "Encuesta Interna - Ventas",
                                "Gestión de Reclamos - Ventas",
                                "Verbatim CEM Ventas OS",
                                "Resultados KPI: CEM Postventa",
                                "Encuesta Interna - Postventas",
                                "Gestión de Reclamos - Postventa"
                            ].map((topic, i) => (
                                <li key={i} className="flex items-center gap-4 text-lg font-black text-slate-700 tracking-tight italic group">
                                    <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">0{i+1}</span>
                                    {topic}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-600/5 rounded-[3rem] -rotate-3"></div>
                        <div className="relative bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-xl">
                            <Icons.ClipboardList className="w-24 h-24 text-blue-600 mb-4" />
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                Análisis detallado de los indicadores de satisfacción del cliente y gestión interna correspondientes al periodo seleccionado.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-12 right-12 flex items-center gap-4">
                    <p className="text-xl font-black text-slate-900 italic">Autosol</p>
                    <div className="w-10 h-10 border-2 border-slate-900 rounded-full flex items-center justify-center font-black text-lg">W</div>
                </div>
            </div>
                 {/* PAGE 3: CEM VENTAS (CERRADO) */}
            <div className="h-[210mm] p-12 page-break-after-always bg-white flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">CEM VENTAS — {reportMonths.mMinus2.toUpperCase()} (CERRADO)</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Indicadores Externos de Satisfacción (Marca)</p>
                    </div>
                    <div className="px-6 py-2 bg-blue-900 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-xl shadow-blue-900/20">KPI ESTRATÉGICO</div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'Patentados', value: filteredMetrics.cemVentas.m2.patentados, color: 'text-slate-950' },
                        { label: 'Declarados', value: filteredMetrics.cemVentas.m2.declarados, color: 'text-slate-900' },
                        { label: 'Respondieron', value: filteredMetrics.cemVentas.m2.respondieron, color: 'text-emerald-600' },
                        { label: 'Faltan', value: filteredMetrics.cemVentas.m2.declarados - filteredMetrics.cemVentas.m2.respondieron, color: 'text-rose-500' },
                        { label: 'Promedio CEM', value: filteredMetrics.cemVentas.m2.avg.toFixed(2), color: 'text-blue-900', highlight: true }
                    ].map((m, i) => (
                        <div key={i} className={`p-4 rounded-[1.5rem] border text-center shadow-sm transition-all ${m.highlight ? 'bg-blue-900 border-blue-800 scale-105 shadow-blue-900/20' : 'bg-slate-50 border-slate-100'}`}>
                            <p className={`text-[8px] font-black uppercase tracking-widest mb-1 ${m.highlight ? 'text-blue-200' : 'text-slate-400'}`}>{m.label}</p>
                            <p className={`text-3xl font-black italic ${m.highlight ? 'text-white' : m.color}`}>{m.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-6 flex-1 mb-6 min-h-0">
                    <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col min-h-0">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Evolución Histórica CEM (OS)</h4>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredMetrics.cemVentas.evolution} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                    <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="value" fill="#1e40af" radius={[10, 10, 0, 0]} barSize={30}>
                                        <LabelList dataKey="value" position="top" style={{ fill: '#1e40af', fontSize: 12, fontWeight: '900' }} offset={10} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col min-h-0">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Cantidad de Encuestas Anual</h4>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredMetrics.cemVentas.annualCounts} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="value" fill="#0ea5e9" radius={[10, 10, 0, 0]} barSize={25}>
                                        <LabelList dataKey="value" position="top" style={{ fill: '#0ea5e9', fontSize: 11, fontWeight: '900' }} offset={10} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-blue-900 rounded-[2rem] text-white relative overflow-hidden shadow-xl shadow-blue-900/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full"></div>
                    <p contentEditable suppressContentEditableWarning={true} className="text-xs leading-relaxed font-medium outline-none focus:bg-white/10 p-2 rounded transition-all cursor-text border border-transparent hover:border-white/20">
                        El índice CEM de {filteredMetrics.cemVentas.m2.avg.toFixed(2)} refleja la percepción del cliente en el proceso de entrega para el mes cerrado de {reportMonths.mMinus2}.
                    </p>
                </div>
            </div>

            {/* PAGE 3.5: CEM VENTAS (EN PROGRESO) */}
            <div className="h-[210mm] p-12 page-break-after-always bg-white flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase flex items-center gap-4">
                            CEM VENTAS — {reportMonths.mMinus1.toUpperCase()} 
                            <span className="flex items-center gap-2 px-4 py-1 bg-blue-100 text-blue-600 text-xs rounded-full normal-case not-italic tracking-normal">
                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                                EN PROGRESO
                            </span>
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Indicadores Externos de Satisfacción (Marca)</p>
                    </div>
                    <div className="px-6 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-xl shadow-blue-600/20">KPI ESTRATÉGICO</div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'Patentados', value: filteredMetrics.cemVentas.m1.patentados, color: 'text-slate-950' },
                        { label: 'Declarados', value: filteredMetrics.cemVentas.m1.declarados, color: 'text-slate-900' },
                        { label: 'Respondieron', value: filteredMetrics.cemVentas.m1.respondieron, color: 'text-emerald-600' },
                        { label: 'Faltan', value: filteredMetrics.cemVentas.m1.declarados - filteredMetrics.cemVentas.m1.respondieron, color: 'text-rose-500' },
                        { label: 'Promedio CEM', value: filteredMetrics.cemVentas.m1.avg.toFixed(2), color: 'text-blue-900' }
                    ].map((m, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-center shadow-sm">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
                            <p className={`text-3xl font-black italic ${m.color}`}>{m.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-6 flex-1 mb-6 min-h-0">
                    <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col min-h-0">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Evolución Histórica CEM (OS)</h4>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredMetrics.cemVentas.evolution} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                    <YAxis domain={[0, 5]} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} barSize={30}>
                                        <LabelList dataKey="value" position="top" style={{ fill: '#2563eb', fontSize: 12, fontWeight: '900' }} offset={10} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 flex flex-col min-h-0">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Cantidad de Encuestas Anual</h4>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredMetrics.cemVentas.annualCounts} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="value" fill="#60a5fa" radius={[10, 10, 0, 0]} barSize={25}>
                                        <LabelList dataKey="value" position="top" style={{ fill: '#60a5fa', fontSize: 11, fontWeight: '900' }} offset={10} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-blue-600 rounded-[2rem] text-white relative overflow-hidden shadow-xl shadow-blue-600/20">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full"></div>
                    <p contentEditable suppressContentEditableWarning={true} className="text-xs leading-relaxed font-medium outline-none focus:bg-white/10 p-2 rounded transition-all cursor-text border border-transparent hover:border-white/20">
                        El índice CEM de {filteredMetrics.cemVentas.m1.avg.toFixed(2)} para el mes de {reportMonths.mMinus1} se encuentra actualmente en progreso. 
                        Se han recibido {filteredMetrics.cemVentas.m1.respondieron} respuestas de {filteredMetrics.cemVentas.m1.declarados} encuestas declaradas.
                    </p>
                </div>
            </div>

            {/* PAGE 4: VERBATIM CEM VENTAS */}
            <div className="min-h-[210mm] p-12 page-break-after-always bg-white flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">VERBATIM CEM — {reportMonths.mMinus2.toUpperCase()}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Comentarios de Clientes (Notas 1 a 5)</p>
                    </div>
                    <div className="px-6 py-2 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-full">DETALLE DE EXPERIENCIA</div>
                </div>

                <div className="rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden mb-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="p-3 text-[10px] font-black uppercase tracking-widest">Score</th>
                                <th className="p-3 text-[10px] font-black uppercase tracking-widest">Comentario del Cliente</th>
                                <th className="p-3 text-[10px] font-black uppercase tracking-widest">Cliente</th>
                                <th className="p-3 text-[10px] font-black uppercase tracking-widest">Vendedor</th>
                                <th className="p-3 text-[10px] font-black uppercase tracking-widest">Canal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMetrics.cemVentas.verbatim.length > 0 ? (
                                filteredMetrics.cemVentas.verbatim.map((v: any, i: number) => (
                                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="p-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${(v.score ?? 0) >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {(v.score ?? 0).toFixed(0)}
                                            </div>
                                        </td>
                                        <td className="p-3 text-[10px] font-medium text-slate-600 leading-tight italic">"{v.comentario}"</td>
                                        <td className="p-3 text-[9px] font-black text-slate-900 uppercase">{v.cliente}</td>
                                        <td className="p-3 text-[9px] font-bold text-slate-500 uppercase">{v.vendedor}</td>
                                        <td className="p-3 text-[9px] font-bold text-slate-400 uppercase">{v.canal}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-slate-400 font-black uppercase tracking-widest italic">No se registraron comentarios críticos en este periodo</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PAGE 5: ENCUESTA INTERNA VENTAS */}
            <div className="h-[210mm] p-12 page-break-after-always bg-white flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">ENCUESTA INTERNA — {reportMonths.mMinus1.toUpperCase()}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Gestión de Calidad Interna (Ventas)</p>
                    </div>
                    <div className="px-6 py-2 bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-xl shadow-amber-600/20">AUDITORÍA INTERNA</div>
                </div>

                <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                    <div className="space-y-4 flex flex-col">
                        <div className="p-4 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm flex-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Satisfacción General (OS)</p>
                            <div className="relative w-80 h-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { value: filteredMetrics.internalVentas.avgOS },
                                                { value: 5 - filteredMetrics.internalVentas.avgOS }
                                            ]}
                                            cx="50%"
                                            cy="100%"
                                            startAngle={180}
                                            endAngle={0}
                                            innerRadius={100}
                                            outerRadius={140}
                                            paddingAngle={0}
                                            dataKey="value"
                                        >
                                            <Cell fill="#d97706" />
                                            <Cell fill="#f1f5f9" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-7xl font-black text-slate-950 italic">
                                    {filteredMetrics.internalVentas.avgOS.toFixed(2)}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { label: 'Trato', value: filteredMetrics.internalVentas.avgTrato },
                                { label: 'Organización', value: filteredMetrics.internalVentas.avgOrg },
                                { label: 'Asesoramiento', value: filteredMetrics.internalVentas.avgAses }
                            ].map((m, i) => (
                                <div key={i} className="p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100 text-center shadow-sm">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
                                    <p className="text-2xl font-black text-slate-900 italic">{m.value.toFixed(2)}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col min-h-0">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 italic text-center">Cumplimiento de Estándares de Venta</h4>
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4 flex-1 min-h-0">
                            {filteredMetrics.internalVentas.processMetrics.map(m => (
                                <div key={m.name} className="flex flex-col items-center">
                                    <div className="relative w-56 h-28">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { value: m.value },
                                                        { value: 100 - m.value }
                                                    ]}
                                                    cx="50%"
                                                    cy="100%"
                                                    startAngle={180}
                                                    endAngle={0}
                                                    innerRadius={70}
                                                    outerRadius={100}
                                                    paddingAngle={0}
                                                    dataKey="value"
                                                >
                                                    <Cell fill="#d97706" />
                                                    <Cell fill="#f1f5f9" />
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-4xl font-black text-slate-950">
                                            {m.value.toFixed(0)}%
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center mt-2 leading-tight">{m.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* PAGE 6: RECLAMOS VENTAS */}
            <div className="h-[210mm] p-12 page-break-after-always bg-white flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">RECLAMOS VENTAS — {reportMonths.mMinus1.toUpperCase()}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Gestión de Incidencias y Post-Venta</p>
                    </div>
                    <div className="px-6 py-2 bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-xl shadow-rose-600/20">INCIDENCIAS</div>
                </div>

                <div className="flex flex-col flex-1 gap-6 min-h-0">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-6 bg-rose-50 rounded-[2.5rem] border border-rose-100 flex flex-col items-center justify-center text-center shadow-sm">
                            <div className="text-5xl font-black text-rose-600 italic mb-1">{filteredMetrics.claimsVentas.total}</div>
                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Total Reclamos</p>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex flex-col items-center justify-center text-center shadow-sm">
                            <div className="text-5xl font-black text-slate-900 italic mb-1">{filteredMetrics.claimsVentas.pending}</div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Casos Pendientes</p>
                        </div>
                        <div className="p-6 bg-rose-900 rounded-[2.5rem] text-white shadow-xl shadow-rose-900/20 flex flex-col justify-center">
                            <h4 className="text-[9px] font-black text-rose-300 uppercase tracking-widest mb-1 italic">Análisis de Gestión</h4>
                            <p contentEditable suppressContentEditableWarning={true} className="text-[10px] leading-tight font-medium outline-none focus:bg-white/10 p-2 rounded transition-all cursor-text border border-transparent hover:border-white/20">
                                Se observa un volumen de {filteredMetrics.claimsVentas.total} reclamos en el periodo. 
                                La prioridad se centra en la resolución de los {filteredMetrics.claimsVentas.pending} casos pendientes.
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col flex-1 min-h-0">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 italic text-center">Motivos de Reclamo - Análisis Detallado</h4>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredMetrics.claimsVentas.topReasons} layout="vertical" margin={{ left: 40, right: 80, top: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: '900', fill: '#1e293b'}} width={200} interval={0} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                    <Bar dataKey="value" fill="#0f172a" radius={[0, 10, 10, 0]} barSize={20}>
                                        <LabelList dataKey="value" position="right" style={{ fill: '#0f172a', fontSize: 12, fontWeight: '900' }} offset={15} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAGE 7: CEM POSTVENTA (CERRADO) */}
            <div className="h-[210mm] p-12 page-break-after-always bg-white flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">CEM POSTVENTA — {reportMonths.mMinus2.toUpperCase()} (CERRADO)</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Indicadores de Satisfacción en Servicio (LVS)</p>
                    </div>
                    <div className="px-6 py-2 bg-blue-900 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-xl shadow-blue-900/20">KPI SERVICIO</div>
                </div>

                <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                    <div className="space-y-6 flex flex-col min-h-0">
                        <div className="p-8 bg-blue-900 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-blue-900/40 flex-1 flex flex-col justify-center">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">Satisfacción LVS (VW) - {reportMonths.mMinus2}</p>
                            <div className="text-[100px] font-black italic tracking-tighter leading-none mb-6">{filteredMetrics.cemPostventa.m2.avg.toFixed(2)}</div>
                            <div className="flex gap-4">
                                <div className="px-6 py-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 flex-1">
                                    <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest mb-1">Trato Personal</p>
                                    <p className="text-2xl font-black italic">{filteredMetrics.cemPostventa.avgTrato.toFixed(2)}</p>
                                </div>
                                <div className="px-6 py-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 flex-1">
                                    <p className="text-[8px] font-black text-blue-200 uppercase tracking-widest mb-1">Calidad Reparación</p>
                                    <p className="text-2xl font-black italic">{filteredMetrics.cemPostventa.avgReparacion.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Análisis de Postventa</h4>
                            <p contentEditable suppressContentEditableWarning={true} className="text-xs leading-relaxed font-medium text-slate-600 outline-none focus:bg-white p-2 rounded transition-all cursor-text border border-transparent hover:border-slate-200">
                                El nivel de satisfacción en postventa para el mes cerrado de {reportMonths.mMinus2} se mantiene sólido y dentro de los estándares de calidad esperados.
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col min-h-0">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 italic text-center">Cantidad de Encuestas Anual (Postventa)</h4>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredMetrics.cemPostventa.annualCounts} margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} domain={[0, 'dataMax + 20']} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                    <Bar dataKey="value" fill="#0369a1" radius={[10, 10, 0, 0]} barSize={25}>
                                        <LabelList dataKey="value" position="top" style={{ fill: '#0369a1', fontSize: 12, fontWeight: '900' }} offset={10} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAGE 7.1: CEM POSTVENTA (EN PROGRESO) */}
            <div className="h-[210mm] p-12 page-break-after-always bg-white flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase flex items-center gap-4">
                            CEM POSTVENTA — {reportMonths.mMinus1.toUpperCase()}
                            <span className="flex items-center gap-2 px-4 py-1 bg-blue-100 text-blue-600 text-xs rounded-full normal-case not-italic tracking-normal">
                                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                                EN PROGRESO
                            </span>
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Indicadores de Satisfacción en Servicio (LVS)</p>
                    </div>
                    <div className="px-6 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-xl shadow-blue-600/20">KPI SERVICIO</div>
                </div>

                <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
                    <div className="space-y-6 flex flex-col min-h-0">
                        <div className="p-8 bg-blue-600 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-blue-600/40 flex-1 flex flex-col justify-center">
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                            <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-2">Satisfacción LVS (VW) - {reportMonths.mMinus1}</p>
                            <div className="text-[100px] font-black italic tracking-tighter leading-none mb-6">{filteredMetrics.cemPostventa.m1.avg.toFixed(2)}</div>
                            <div className="flex gap-4">
                                <div className="px-6 py-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10 flex-1">
                                    <p className="text-[8px] font-black text-blue-100 uppercase tracking-widest mb-1">Estado</p>
                                    <p className="text-2xl font-black italic">EN PROGRESO</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Análisis de Postventa</h4>
                            <p contentEditable suppressContentEditableWarning={true} className="text-xs leading-relaxed font-medium text-slate-600 outline-none focus:bg-white p-2 rounded transition-all cursor-text border border-transparent hover:border-slate-200">
                                El nivel de satisfacción en postventa para el mes de {reportMonths.mMinus1} se encuentra actualmente en proceso de medición. El promedio actual es de {filteredMetrics.cemPostventa.m1.avg.toFixed(2)}.
                            </p>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col min-h-0">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 italic text-center">Cantidad de Encuestas Anual (Postventa)</h4>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredMetrics.cemPostventa.annualCounts} margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} domain={[0, 'dataMax + 20']} />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={25}>
                                        <LabelList dataKey="value" position="top" style={{ fill: '#3b82f6', fontSize: 12, fontWeight: '900' }} offset={10} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAGE 7.5: ENCUESTA INTERNA - POSTVENTA */}
            <div className="h-[210mm] p-12 page-break-after-always bg-white flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-950 uppercase italic tracking-tighter leading-none">ENCUESTA INTERNA</h2>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.5em] mt-2">POSTVENTA — {reportMonths.mMinus1.toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-black text-slate-950 italic leading-none">VW</div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Autosol Intelligence</div>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-8">
                    {[
                        { label: 'LVS (Servicio)', value: filteredMetrics.internalPostventa.lvs },
                        { label: 'Trato Personal', value: filteredMetrics.internalPostventa.trato },
                        { label: 'Organización', value: filteredMetrics.internalPostventa.organizacion },
                        { label: 'Trabajo Taller', value: filteredMetrics.internalPostventa.trabajoTaller },
                        { label: 'Lavado', value: filteredMetrics.internalPostventa.lavado },
                    ].map((m, i) => (
                        <div key={i} className="bg-slate-50 rounded-3xl p-4 border border-slate-100 text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 h-6 flex items-center justify-center">{m.label}</p>
                            <p className="text-2xl font-black text-slate-950 italic leading-none mb-2">{m.value.toFixed(2)}</p>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600" style={{ width: `${(m.value / 5) * 100}%` }}></div>
                            </div>
                            <div className="flex justify-between mt-1 text-[7px] font-bold text-slate-400">
                                <span>0.00</span>
                                <span>5.00</span>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 gap-6 flex-1 min-h-0">
                    <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col min-h-0">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 italic text-center">Servicios más Frecuentes</h4>
                        <div className="flex-1 min-h-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={filteredMetrics.internalPostventa.topServicios} layout="vertical" margin={{ left: 40, right: 40 }}>
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} 
                                        width={150}
                                        interval={0}
                                    />
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={15}>
                                        <LabelList dataKey="value" position="right" style={{ fill: '#64748b', fontSize: 12, fontWeight: 'bold' }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-950 rounded-[2rem] text-white">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 italic">Insights de Calidad Interna</h4>
                        <p contentEditable suppressContentEditableWarning={true} className="text-xs leading-relaxed font-medium text-slate-300 outline-none focus:bg-white/10 p-2 rounded transition-all cursor-text border border-transparent hover:border-white/10">
                            La percepción interna del servicio se mantiene en niveles de excelencia, con un fuerte enfoque en el trato personal y la organización del taller. El lavado continúa siendo un área de oportunidad para maximizar la satisfacción final.
                        </p>
                    </div>
                </div>
            </div>

            {/* PAGE 8: RECLAMOS POSTVENTA */}
            <div className="h-[210mm] p-12 page-break-after-always bg-white flex flex-col overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">RECLAMOS POSTVENTA — {reportMonths.mMinus1.toUpperCase()}</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Gestión de Incidencias en Taller</p>
                    </div>
                    <div className="px-6 py-2 bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-full shadow-xl shadow-emerald-700/20">GESTIÓN TALLER</div>
                </div>

                <div className="flex flex-col flex-1 gap-6 min-h-0">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-[2rem] border border-slate-100 text-center shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Cantidad de Reclamos</p>
                            <p className="text-3xl font-black text-slate-950 italic">{filteredMetrics.claimsPostventa.total}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-[2rem] border border-slate-100 text-center shadow-sm">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reclamos Únicos (OR)</p>
                            <p className="text-3xl font-black text-slate-950 italic">{filteredMetrics.claimsPostventa.unique}</p>
                        </div>
                        <div className="p-4 bg-emerald-900 rounded-[2rem] text-white relative overflow-hidden shadow-xl shadow-emerald-900/20 flex flex-col justify-center text-center">
                            <p className="text-[9px] font-black text-emerald-300 uppercase tracking-widest mb-1">Resolución</p>
                            <p className="text-3xl font-black text-white italic">{filteredMetrics.claimsPostventa.resolved}</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-6 flex-1 min-h-0">
                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col flex-[1.5] min-h-0">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 italic text-center">Motivos de Reclamo - Análisis Detallado</h4>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={filteredMetrics.claimsPostventa.topReasons} layout="vertical" margin={{ left: 40, right: 80, top: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} 
                                            width={180}
                                            interval={0}
                                        />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                        <Bar dataKey="value" fill="#0f172a" radius={[0, 10, 10, 0]} barSize={16}>
                                            <LabelList dataKey="value" position="right" style={{ fill: '#0f172a', fontSize: 12, fontWeight: '900' }} offset={10} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col flex-1 min-h-0">
                            <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 italic text-center">Evolución Anual de Reclamos (OR Únicas)</h4>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={filteredMetrics.claimsPostventa.evolution} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#1e293b'}} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                                        <Bar dataKey="value" fill="#0369a1" radius={[10, 10, 0, 0]} barSize={20}>
                                            <LabelList dataKey="value" position="top" style={{ fill: '#0369a1', fontSize: 12, fontWeight: '900' }} />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAGE 9: CLOSING SLIDE */}
            <div className="h-[210mm] flex flex-col justify-center items-center p-12 bg-slate-950 text-white relative overflow-hidden page-break-after-always">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px]"></div>
                
                <div className="absolute top-12 left-12 flex items-center gap-6">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-950 font-black text-2xl">A</div>
                    <div className="text-xs font-black text-white uppercase tracking-[0.3em]">Grupo Cenoa</div>
                </div>

                <div className="text-center relative z-10 mb-8">
                    <h2 contentEditable suppressContentEditableWarning={true} className="text-[100px] font-black tracking-tighter italic leading-[0.8] mb-6 outline-none focus:bg-white/10 p-6 rounded uppercase cursor-text">
                        ¡MUCHAS<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 text-[120px]">GRACIAS!</span>
                    </h2>
                    <p contentEditable suppressContentEditableWarning={true} className="text-xl text-slate-400 max-w-2xl leading-relaxed font-medium outline-none focus:bg-white/10 p-4 rounded cursor-text mx-auto">
                        Este reporte ha sido generado para el análisis estratégico de la calidad en Autosol. 
                        Quedamos a su disposición para cualquier consulta adicional.
                    </p>
                </div>

                <div className="relative z-10 w-full max-w-2xl p-6 bg-white/5 backdrop-blur-2xl rounded-[3rem] border border-white/10 text-center shadow-2xl mx-auto">
                    <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] mb-4">Visualización Interactiva</h4>
                    <div className="flex items-center justify-center gap-6 text-white font-black text-lg uppercase tracking-widest">
                        <Icons.ExternalLink className="w-6 h-6 text-blue-400" />
                        https://nelsoncalidad15-ops.github.io/tablero-control-end/
                    </div>
                </div>

                <div className="absolute bottom-12 right-12 flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-2xl font-black text-white italic tracking-tighter">Autosol</p>
                    </div>
                    <div className="w-16 h-16 border-2 border-white/20 rounded-full flex items-center justify-center font-black text-2xl text-white">W</div>
                </div>
            </div>
        </div>

        {/* Global Print Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
            @media print {
                body { background: white !important; margin: 0 !important; padding: 0 !important; }
                .print\\:hidden { display: none !important; }
                .page-break-after-always { page-break-after: always !important; }
                @page { size: A4 landscape; margin: 0; }
                .recharts-wrapper { width: 100% !important; }
            }
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f5f9;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 10px;
            }
            [contenteditable="true"]:hover {
                background: rgba(0, 0, 0, 0.05);
                border-radius: 4px;
            }
            .bg-slate-950 [contenteditable="true"]:hover {
                background: rgba(255, 255, 255, 0.1);
            }
            [contenteditable="true"]:focus {
                background: rgba(0, 0, 0, 0.05);
                outline: 2px solid #1e40af;
                outline-offset: 2px;
            }
            .bg-slate-950 [contenteditable="true"]:focus {
                background: rgba(255, 255, 255, 0.1);
                outline: 2px solid #3b82f6;
            }
        `}} />
    </div>
  );
};

export default ProfessionalReport;
