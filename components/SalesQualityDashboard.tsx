
import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, LabelList, BarChart, Bar, Legend
} from 'recharts';
import { Icons } from './Icon';
import { fetchSalesQualityData, fetchSalesClaimsData, fetchCemOsData } from '../services/dataService';
import { SalesQualityRecord, SalesClaimsRecord, CemOsRecord, LoadingState, AppConfig } from '../types';
import { MONTHS, SALES_QUALITY_SHEET_KEY, SALES_CLAIMS_SHEET_KEY, CEM_OS_SHEET_KEY, CEM_OS_SALTA_SHEET_KEY } from '../constants';
import CemOsDashboard from './CemOsDashboard';
import { DashboardFrame, LuxuryKPICard, SkeletonLoader, StatusBadge, InsightCard, DataTable, ChartWrapper, MonthSelector } from './DashboardUI';
import ChatBot from './ChatBot';

// --- SHARED COMPONENTS ---

const HalfDonutGauge = ({ value, title, color }: { value: number, title: string, color: string }) => {
    const percentage = (value / 5) * 100;
    const data = [
        { name: 'Score', value: percentage },
        { name: 'Remaining', value: 100 - percentage }
    ];

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center relative">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest absolute top-6">{title}</h3>
            <div className="w-full h-[140px] mt-6">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="100%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            <Cell key="cell-0" fill={color} />
                            <Cell key="cell-1" fill="#F1F5F9" />
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="absolute bottom-6 flex flex-col items-center">
                <span className="text-4xl font-bold text-slate-800 tracking-tighter">{value > 0 ? value.toFixed(2) : '-'}</span>
                <div className="flex justify-between w-32 text-[10px] text-slate-400 mt-1 font-medium">
                    <span>1.00</span>
                    <span>5.00</span>
                </div>
            </div>
        </div>
    );
};

const MiniDonut = ({ yes, no, title }: { yes: number, no: number, title: string }) => {
    const total = yes + no;
    const yesPercent = total > 0 ? (yes / total) * 100 : 0;
    
    const data = [
        { name: 'Si', value: yes },
        { name: 'No', value: no }
    ];

    return (
        <div className="bg-white/40 backdrop-blur-sm p-4 rounded-3xl border border-white/50 flex flex-col items-center group hover:bg-white/60 transition-all shadow-sm">
            <div className="h-32 w-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={50}
                            dataKey="value"
                            stroke="none"
                            paddingAngle={5}
                        >
                            <Cell fill="#3B82F6" className="drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]" /> 
                            <Cell fill="#F1F5F9" />
                        </Pie>
                         <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-black text-slate-900 tracking-tighter">{Math.round(yesPercent)}%</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SI</span>
                </div>
            </div>
            <div className="mt-4 text-center">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 group-hover:text-slate-600 transition-colors">
                    {title}
                </h4>
                <div className="flex gap-4">
                    <div className="flex flex-col">
                        <span className="text-xs font-black text-blue-600">{yes}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">SI</span>
                    </div>
                    <div className="w-px h-6 bg-slate-100"></div>
                    <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-400">{no}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase">NO</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DeliveryCircles = ({ data }: { data: any[] }) => {
    return (
        <div className="grid grid-cols-2 gap-4 h-full py-2">
            {data.map((item, idx) => {
                const percentage = (item.A / 5) * 100;
                const color = item.A >= 4.5 ? 'text-emerald-500' : item.A >= 4 ? 'text-blue-500' : 'text-amber-500';
                const bgColor = item.A >= 4.5 ? 'bg-emerald-50' : item.A >= 4 ? 'bg-blue-50' : 'bg-amber-50';
                const strokeColor = item.A >= 4.5 ? '#10B981' : item.A >= 4 ? '#3B82F6' : '#F59E0B';

                return (
                    <div key={idx} className="flex flex-col items-center justify-center p-4 rounded-3xl bg-slate-50/50 border border-slate-100/50 group hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all">
                        <div className="relative w-20 h-20 mb-3">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle
                                    cx="40"
                                    cy="40"
                                    r="34"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="transparent"
                                    className="text-slate-100"
                                />
                                <motion.circle
                                    initial={{ strokeDasharray: "0 214" }}
                                    animate={{ strokeDasharray: `${(percentage * 214) / 100} 214` }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    cx="40"
                                    cy="40"
                                    r="34"
                                    stroke={strokeColor}
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    fill="transparent"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-lg font-black tracking-tighter ${color}`}>
                                    {item.A.toFixed(1)}
                                </span>
                            </div>
                        </div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight">
                            {item.subject}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

// --- HELPER FUNCTIONS ---

const parseDateString = (dateStr: string): Date | null => {
    if (!dateStr || dateStr.length < 6) return null;
    const cleanStr = dateStr.trim();
    if (cleanStr.includes('/')) {
        const parts = cleanStr.split('/');
        if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
    }
    const d = new Date(cleanStr);
    return isNaN(d.getTime()) ? null : d;
};

// Add business days to a date (used for deadlines)
const addBusinessDays = (startDate: Date, days: number): Date => {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    while (count < days) {
        curDate.setDate(curDate.getDate() + 1);
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
    }
    return curDate;
};

// Calculate count of business days between two dates (inclusive of start, exclusive of end? strictly day count)
// Note: Logic assumes start <= end. Returns integer.
// Excludes Saturday (6) and Sunday (0).
const calculateBusinessDaysCount = (startDate: Date, endDate: Date): number => {
    let count = 0;
    const curDate = new Date(startDate.getTime());
    // Normalize to start of day
    curDate.setHours(0,0,0,0);
    const end = new Date(endDate.getTime());
    end.setHours(0,0,0,0);

    // If start is same as end, it counts as 1 day (or 0 if user wants difference) 
    // Usually "Delay days" means duration. If same day => 0 or 1?
    // Let's assume duration. 
    
    if (curDate > end) return 0; // Should not happen usually

    while (curDate < end) {
        const dayOfWeek = curDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sun or Sat
            count++;
        }
        curDate.setDate(curDate.getDate() + 1);
    }
    
    // Check if the final day is business day (if inclusive)? 
    // "Demora" usually implies difference. Standard NetWorkDays includes both start and end.
    // Let's use inclusive logic:
    const lastDayOfWeek = end.getDay();
    if (lastDayOfWeek !== 0 && lastDayOfWeek !== 6) {
        count++;
    }

    return count;
};


const normalizeString = (str: string) => {
    if (!str) return '';
    const trimmed = str.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

const normalizeSaleType = (type: string) => {
    if (!type) return '';
    const raw = type.trim().toUpperCase();
    const normalized = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized === 'DIRECTA' || normalized === 'TRADICIONAL' || normalized === 'DIRECCION') {
        return 'DIRECTA / TRADICIONAL';
    }
    return raw;
};

// --- SUB-VIEWS ---

// 1. SURVEY DASHBOARD (The original view)
const SurveyView = ({ 
    filteredData, 
    loadingState, 
    selectedMonths, setSelectedMonths, 
    selectedBranches, toggleBranch, availableBranches,
    selectedSaleTypes, toggleSaleType, availableSaleTypes,
    osFilter, setOsFilter
}: any) => {

    const calculateAverage = (key: keyof SalesQualityRecord) => {
        let sum = 0;
        let count = 0;
        filteredData.forEach((d: any) => {
            const val = d[key];
            if (typeof val === 'number' && val > 0) {
                sum += val;
                count++;
            }
        });
        return count > 0 ? sum / count : 0;
    };
  
    const calculateYesNo = (key: keyof SalesQualityRecord) => {
        let yes = 0;
        let no = 0;
        filteredData.forEach((d: any) => {
            const val = String(d[key]).toLowerCase().trim();
            if (val === 'si' || val === 'sí') yes++;
            else if (val === 'no') no++;
        });
        return { yes, no };
    };

    const metrics = useMemo(() => ({
        general: calculateAverage('cem_general'),
        trato: calculateAverage('cem_trato'),
        organizacion: calculateAverage('cem_organizacion'),
        asesoramiento: calculateAverage('cem_asesoramiento'),
        nps: calculateAverage('nps'),
        pruebaManejo: calculateYesNo('prueba_manejo'),
        financiacion: calculateYesNo('ofrecimiento_financiacion'),
        usados: calculateYesNo('toma_usados'),
        cle: calculateYesNo('contacto_entrega'),
        seguro: calculateYesNo('ofrecimiento_seguro'),
        app: calculateYesNo('app_mi_vw')
    }), [filteredData]);

    const contactMetrics = useMemo(() => {
        let totalRows = filteredData.length;
        let contactedEffective = 0;
        let effectiveViaWpp = 0;
        let effectiveOn1st = 0;
        let effectiveOn2nd = 0;
        let effectiveOn3rd = 0;
        const statusCounts: Record<string, number> = {};
        let onTime = 0;
        let late = 0;
    
        filteredData.forEach((d: SalesQualityRecord) => {
            const status = d.estado ? d.estado.trim() : 'Sin Estado';
            statusCounts[status] = (statusCounts[status] || 0) + 1;
            const normalizedStatus = status.toLowerCase();
            const hasDate1stCall = d.fecha_1_llamado && d.fecha_1_llamado.length > 5;
            const hasDate2ndCall = d.fecha_2_llamado && d.fecha_2_llamado.length > 5;
            const hasDate3rdCall = d.fecha_3_llamado && d.fecha_3_llamado.length > 5;
            const hasWppResponse = d.fecha_respuesta_wpp && d.fecha_respuesta_wpp.length > 5;
            
            if (normalizedStatus === 'contactado' && (hasDate1stCall || hasDate2ndCall || hasDate3rdCall || hasWppResponse)) {
                contactedEffective++;
            }
    
            if (hasWppResponse) effectiveViaWpp++;
            else {
                if (hasDate3rdCall) effectiveOn3rd++;
                else if (hasDate2ndCall) effectiveOn2nd++;
                else if (hasDate1stCall) effectiveOn1st++;
            }
    
            const deliveryDate = parseDateString(d.fecha_entrega);
            const firstCallDate = parseDateString(d.fecha_1_llamado);
    
            if (deliveryDate && firstCallDate) {
                const calculatedLimit = addBusinessDays(deliveryDate, 2);
                firstCallDate.setHours(0,0,0,0);
                calculatedLimit.setHours(0,0,0,0);
                if (firstCallDate <= calculatedLimit) onTime++;
                else late++;
            }
        });
    
        const percent = totalRows > 0 ? (contactedEffective / totalRows) * 100 : 0;
        const methodData = [
            { name: '1º Llamado', value: effectiveOn1st, fill: '#3B82F6' },
            { name: '2º Llamado', value: effectiveOn2nd, fill: '#6366F1' },
            { name: '3º Llamado', value: effectiveOn3rd, fill: '#8B5CF6' },
            { name: 'WhatsApp', value: effectiveViaWpp, fill: '#10B981' }
        ];
        const statusChartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
        const complianceData = [
            { name: 'A Tiempo', value: onTime, fill: '#10B981' },
            { name: 'Vencido', value: late, fill: '#EF4444' },
        ];
        return { percent, methodData, contactedEffective, totalRows, statusChartData, complianceData };
    }, [filteredData]);

    const deliveryData = useMemo(() => {
        return [
            { subject: 'Estado Vehículo', A: calculateAverage('estado_vehiculo'), fullMark: 5 },
            { subject: 'Explicación Entrega', A: calculateAverage('explicacion_entrega'), fullMark: 5 },
            { subject: 'Trámites Adm.', A: calculateAverage('explicacion_tramites'), fullMark: 5 },
            { subject: 'Plazo Entrega', A: calculateAverage('plazo_entrega'), fullMark: 5 },
        ];
    }, [filteredData]);

    const columns = [
        {
            header: 'Fecha',
            accessor: 'mes',
            render: (val: any) => <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{String(val)}</span>
        },
        {
            header: 'Cliente / Modelo',
            accessor: 'cliente',
            render: (_: any, row: any) => (
                <div>
                    <div className="font-black text-slate-900 text-sm tracking-tight mb-1">{row.cliente}</div>
                    <div className="flex gap-2">
                        <StatusBadge status="info" label={row.modelo || ''} />
                        <StatusBadge status="warning" label={normalizeSaleType(row.tipo_venta)} />
                    </div>
                </div>
            )
        },
        {
            header: 'OS (Gral)',
            accessor: 'cem_general',
            className: 'text-center',
            render: (val: any) => {
                const numVal = Number(val);
                return (
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-xs shadow-sm border ${
                        numVal >= 5 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                        numVal >= 4 ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        'bg-rose-50 text-rose-600 border-rose-100'
                    }`}>
                        {numVal || '-'}
                    </div>
                );
            }
        },
        {
            header: 'Rec. NPS',
            accessor: 'nps',
            className: 'text-center',
            render: (val: any) => {
                const numVal = Number(val);
                return (
                    <div className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-xs shadow-sm border ${
                        numVal >= 5 ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        numVal >= 4 ? 'bg-orange-50 text-orange-600 border-orange-100' :
                        'bg-slate-50 text-slate-400 border-slate-100'
                    }`}>
                        {numVal || '-'}
                    </div>
                );
            }
        },
        {
            header: 'Asesor',
            accessor: 'vendedor',
            render: (val: any) => <span className="text-[10px] font-black uppercase tracking-tight text-slate-500">{String(val)}</span>
        },
        {
            header: 'Comentarios / Observaciones',
            accessor: 'comentarios',
            render: (val: any) => val && String(val).length > 5 ? (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative group/comment max-w-md">
                    <div className="absolute -left-1 top-4 w-1 h-4 bg-amber-500 rounded-full"></div>
                    <p className="text-xs text-slate-700 italic leading-relaxed font-medium">"{String(val)}"</p>
                </div>
            ) : (
                <span className="text-slate-200 italic text-[10px] uppercase tracking-widest font-black">Sin comentarios</span>
            )
        }
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
                <LuxuryKPICard title="Satisfacción General (OS)" value={metrics.general} color="bg-slate-950" icon={Icons.Star} />
                <LuxuryKPICard title="CEM - Trato" value={metrics.trato} color="bg-blue-600" icon={Icons.Users} />
                <LuxuryKPICard title="CEM - Organización" value={metrics.organizacion} color="bg-indigo-600" icon={Icons.Layers} />
                <LuxuryKPICard title="CEM - Asesoramiento" value={metrics.asesoramiento} color="bg-emerald-600" icon={Icons.Activity} />
                <LuxuryKPICard title="Recomendación (NPS)" value={metrics.nps} color="bg-amber-600" icon={Icons.ThumbsUp} />
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                 <ChartWrapper 
                    title="Adherencia a Procesos"
                    subtitle="Cumplimiento de estándares de venta"
                    className="xl:col-span-3"
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
                        <MiniDonut yes={metrics.pruebaManejo.yes} no={metrics.pruebaManejo.no} title="Prueba de Manejo" />
                        <MiniDonut yes={metrics.financiacion.yes} no={metrics.financiacion.no} title="Ofrecimiento Finan." />
                        <MiniDonut yes={metrics.usados.yes} no={metrics.usados.no} title="Toma de Usados" />
                        <MiniDonut yes={metrics.cle.yes} no={metrics.cle.no} title="Contacto Post-Entrega" />
                        <MiniDonut yes={metrics.seguro.yes} no={metrics.seguro.no} title="Ofrecimiento Seguro" />
                        <MiniDonut yes={metrics.app.yes} no={metrics.app.no} title="App Mi VW" />
                    </div>
                </ChartWrapper>
                <ChartWrapper title="Experiencia de Entrega" subtitle="Puntajes promedio">
                    <div className="h-full min-h-[400px]">
                        <DeliveryCircles data={deliveryData} />
                    </div>
                </ChartWrapper>
            </div>

            <DataTable 
                title="Detalle de Encuestas y Feedback"
                subtitle={`${filteredData.length} registros filtrados`}
                data={filteredData}
                columns={columns}
                pageSize={10}
            />
        </div>
    );
};

// 2. CLAIMS DASHBOARD (New View)
const ClaimsView = ({ 
    filteredData, 
    annualFilteredData,
    loadingState, 
    selectedMonths, setSelectedMonths, 
    selectedBranches, toggleBranch, availableBranches,
    selectedSaleTypes, toggleSaleType, availableSaleTypes
}: any) => {
    
    // Logic similar to QualityDashboard (Postventa)
    const [selectedMotivo, setSelectedMotivo] = useState<string | null>(null);
    
    const filteredDataFinal = useMemo(() => {
        return filteredData.filter((item: SalesClaimsRecord) => {
            let matchMotivo = true;
            if (selectedMotivo) {
                 if (!item.motivo) matchMotivo = false;
                 else {
                     const parts = item.motivo.split(/[,;\n\r]+/).map(s => normalizeString(s));
                     if (!parts.includes(selectedMotivo)) matchMotivo = false;
                 }
            }
            return matchMotivo;
        });
    }, [filteredData, selectedMotivo]);

    // KPI: Total Claims (Unique nro_r ideally, or just rows)
    const totalClaims = filteredDataFinal.length;
    
    // KPI: Open Claims (Pending if Identificacion del Problema is empty)
    const openClaims = filteredDataFinal.filter((d: SalesClaimsRecord) => !d.identificacion_problema || d.identificacion_problema.trim() === '').length;

    // KPI: Avg Delay (Calculated dynamically via business days)
    const avgDelay = useMemo(() => {
        let sum = 0; 
        let count = 0;
        
        filteredDataFinal.forEach((d: SalesClaimsRecord) => {
            const startDate = parseDateString(d.fecha_reclamo);
            let endDate = d.fecha_finalizacion ? parseDateString(d.fecha_finalizacion) : new Date();
            
            if (startDate && endDate) {
                const days = calculateBusinessDaysCount(startDate, endDate);
                if (days >= 0) { // Safety check
                    sum += days;
                    count++;
                }
            }
        });
        
        return count > 0 ? (sum / count).toFixed(1) : 0;
    }, [filteredDataFinal]);

    // Chart: Motivos
    const motivoChartData = useMemo(() => {
        const counts: Record<string, number> = {};
        const IGNORED = ['motivos varios', 'sin motivo', 'n/a', 'ninguno', '-', '0', ''];
        filteredDataFinal.forEach((d: SalesClaimsRecord) => {
            const raw = d.motivo || '';
            const parts = raw.split(/[,;\n\r]+/).map(s => s.trim());
            parts.forEach(part => {
                if (!part) return;
                const normalized = normalizeString(part);
                if (IGNORED.includes(normalized.toLowerCase())) return;
                counts[normalized] = (counts[normalized] || 0) + 1;
            });
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredDataFinal]);

    // Chart: Effectiveness (Action Effective)
    const effectiveData = useMemo(() => {
        let yes = 0;
        let no = 0;
        filteredDataFinal.forEach((d: SalesClaimsRecord) => {
             const val = d.accion_efectiva ? d.accion_efectiva.toLowerCase() : '';
             if (val.includes('1') || val.includes('si')) yes++;
             else if (val.includes('0') || val.includes('no')) no++;
        });
        const res = [];
        if (yes > 0) res.push({ name: 'Efectiva', value: yes, fill: '#10B981' });
        if (no > 0) res.push({ name: 'No Efectiva', value: no, fill: '#EF4444' });
        return res;
    }, [filteredDataFinal]);

    // Chart: Sector
    const sectorData = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredDataFinal.forEach((d: SalesClaimsRecord) => {
            const sec = d.sector ? normalizeString(d.sector) : 'Sin Sector';
            counts[sec] = (counts[sec] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    }, [filteredDataFinal]);

    // Chart: Annual Claims Count
    const annualClaimsData = useMemo(() => {
        const counts: Record<string, number> = {};
        MONTHS.forEach(m => counts[m] = 0);
        
        // Keep the annual view visible even when a month filter is active.
        annualFilteredData.forEach((d: SalesClaimsRecord) => {
            if (d.mes && counts[d.mes] !== undefined) {
                counts[d.mes]++;
            }
        });

        return MONTHS.map(name => ({
            name,
            value: counts[name],
            isHighlighted: selectedMonths.includes(name)
        }));
    }, [annualFilteredData, selectedMonths]);

    const columns = [
        {
            header: 'Cliente / VIN / Canal',
            accessor: 'cliente',
            render: (_: any, row: any) => (
                <div className="min-w-[180px]">
                    <div className="font-black text-slate-950 text-xs uppercase tracking-tight mb-1">{row.cliente || 'S/D'}</div>
                    <div className="flex flex-col gap-1.5">
                        <div className="text-slate-400 text-[9px] font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 inline-block w-fit">{row.vin}</div>
                        <StatusBadge status="warning" label={normalizeSaleType(row.tipo_venta) || 'S/T'} />
                    </div>
                </div>
            )
        },
        {
            header: 'Fecha / R',
            accessor: 'fecha_reclamo',
            render: (_: any, row: any) => (
                <div className="min-w-[100px]">
                    <div className="font-black text-slate-900 text-[10px] uppercase tracking-widest">{row.fecha_reclamo}</div>
                    <div className="text-slate-400 text-[9px] font-bold uppercase tracking-widest">R: {row.nro_r}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                        <StatusBadge status="info" label={row.sucursal || ''} />
                        <StatusBadge 
                            status={row.estado?.toLowerCase().includes('cerrado') ? 'success' : 'warning'} 
                            label={row.estado || 'S/E'} 
                        />
                    </div>
                </div>
            )
        },
        {
            header: 'Motivo / Problema',
            accessor: 'reclamo',
            render: (_: any, row: any) => (
                <div className="min-w-[400px] max-w-2xl">
                    <div className="text-slate-950 font-bold text-[11px] leading-relaxed mb-3">"{row.reclamo || 'Sin descripción'}"</div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        <div className="text-blue-600 font-black text-[10px] uppercase tracking-wider">{row.motivo || 'Sin Motivo'}</div>
                    </div>
                </div>
            )
        },
        {
            header: 'Responsable',
            accessor: 'responsable',
            render: (_: any, row: any) => (
                <div className="min-w-[150px]">
                    <div className="font-black text-slate-900 text-[10px] uppercase tracking-wider mb-1">{normalizeString(row.responsable)}</div>
                    <div className="text-slate-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <Icons.MapPin className="w-2.5 h-2.5" />
                        {normalizeString(row.sector)}
                    </div>
                </div>
            )
        },
        {
            header: 'Análisis y Acciones',
            accessor: 'analisis_causa',
            render: (_: any, row: any) => (
                <div className="min-w-[350px] max-w-xl space-y-3">
                    {row.analisis_causa && (
                        <div className="flex gap-3">
                            <div className="w-px bg-slate-200 shrink-0"></div>
                            <div>
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Análisis de Causa</div>
                                <div className="text-[10px] font-medium text-slate-600 leading-tight italic">"{row.analisis_causa}"</div>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-3">
                        {row.accion_contencion && (
                            <div className="bg-orange-50/50 p-2 rounded-xl border border-orange-100/50">
                                <div className="text-[8px] font-black text-orange-600 uppercase tracking-widest mb-1">Contención</div>
                                <div className="text-[10px] font-bold text-slate-600 leading-tight">{row.accion_contencion}</div>
                            </div>
                        )}
                        {row.accion_preventiva && (
                            <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100/50">
                                <div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1">Preventiva</div>
                                <div className="text-[10px] font-bold text-slate-600 leading-tight">{row.accion_preventiva}</div>
                            </div>
                        )}
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                <LuxuryKPICard title="Total Reclamos" value={totalClaims} color="bg-slate-950" icon={Icons.AlertCircle} />
                <LuxuryKPICard title="Pendientes" value={openClaims} color="bg-orange-600" icon={Icons.Clock} />
                <LuxuryKPICard title="Días Prom. Demora" value={Number(avgDelay)} color="bg-blue-600" icon={Icons.Activity} />
            </div>

            <ChartWrapper 
                title="Motivos Principales de Reclamo"
                subtitle="Top Categorías"
            >
                <div className="h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={motivoChartData.slice(0, 15)} margin={{ top: 5, right: 50, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" hide />
                            <YAxis 
                                type="category" 
                                dataKey="name" 
                                width={180} 
                                tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} 
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip 
                                cursor={{fill: '#F8FAFC'}}
                                contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px -5px rgb(0 0 0 / 0.1)'}}
                            />
                            <Bar 
                                dataKey="value" 
                                fill="#0f172a" 
                                radius={[0, 10, 10, 0]} 
                                barSize={24}
                                onClick={(data) => setSelectedMotivo(data.name === selectedMotivo ? null : data.name)}
                                cursor="pointer"
                            >
                                <LabelList dataKey="value" position="right" style={{fontSize: 10, fontWeight: 900, fill: '#0f172a'}} offset={10} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </ChartWrapper>

            <div className="grid grid-cols-1 gap-6">
                <ChartWrapper 
                    title="Volumen Anual de Reclamos"
                    subtitle="Distribución por mes"
                >
                    <div className="h-[350px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={annualClaimsData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} 
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => val.substring(0, 3)}
                                />
                                <YAxis tick={{fontSize: 10, fontWeight: 900, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                <Tooltip 
                                    cursor={{fill: '#F8FAFC'}}
                                    contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px -5px rgb(0 0 0 / 0.1)'}}
                                />
                                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={30}>
                                    <LabelList dataKey="value" position="top" style={{fontSize: 10, fontWeight: 900, fill: '#0f172a'}} offset={10} />
                                    {annualClaimsData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.isHighlighted ? '#2563eb' : '#e2e8f0'} 
                                            fillOpacity={entry.isHighlighted ? 1 : 0.8}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartWrapper>
            </div>

            <DataTable 
                title="Listado de Reclamos"
                subtitle={selectedMotivo ? `Filtrado por: ${selectedMotivo}` : 'Todos los reclamos'}
                data={filteredDataFinal}
                columns={columns}
                pageSize={10}
            />
        </div>
    );
};


// --- MAIN CONTAINER ---

interface SalesQualityDashboardProps {
  onBack: () => void;
  initialTab?: 'surveys' | 'claims' | 'cem_os';
  config: AppConfig;
}

const SalesQualityDashboard: React.FC<SalesQualityDashboardProps> = ({ onBack, initialTab = 'surveys', config }) => {
  const [activeTab, setActiveTab] = useState<'surveys' | 'claims' | 'cem_os'>(initialTab);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  
  // Data States
  const [surveyData, setSurveyData] = useState<SalesQualityRecord[]>([]);
  const [claimsData, setClaimsData] = useState<SalesClaimsRecord[]>([]);
  const [cemOsData, setCemOsData] = useState<CemOsRecord[]>([]);

  // Filters State (Global or per tab, kept global for simplicity where possible)
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  
  // -- Survey Specific Filters --
  const [surveyBranches, setSurveyBranches] = useState<string[]>([]);
  const [availableSurveyBranches, setAvailableSurveyBranches] = useState<string[]>([]);
  const [selectedSaleTypes, setSelectedSaleTypes] = useState<string[]>([]);
  const [availableSaleTypes, setAvailableSaleTypes] = useState<string[]>([]);
  const [osFilter, setOsFilter] = useState<string | null>(null);
  const [selectedVendedor, setSelectedVendedor] = useState<string | null>(null);
  const [selectedAdministrativo, setSelectedAdministrativo] = useState<string | null>(null);

  const availableSurveyFilters = useMemo(() => {
    return {
      vendedores: [...new Set(surveyData.map(d => d.vendedor))].filter(Boolean).sort(),
      administrativos: [...new Set(surveyData.map(d => d.administrativo))].filter(Boolean).sort()
    };
  }, [surveyData]);

  // -- Claims Specific Filters --
  const [claimsBranches, setClaimsBranches] = useState<string[]>([]);
  const [availableClaimsBranches, setAvailableClaimsBranches] = useState<string[]>([]);

  // -- CEM OS Specific Filters --
  const [selectedCanal, setSelectedCanal] = useState<string | null>(null);
  const [selectedEstadoUnidad, setSelectedEstadoUnidad] = useState<string | null>(null);
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null);
  const [selectedZona, setSelectedZona] = useState<string | null>(null);

  const availableCemOsFilters = useMemo(() => {
    if (!cemOsData.length) return { codigos: [], zonas: [], canales: [], vendedores: [], estados: [] };
    return {
      codigos: [...new Set(cemOsData.map(d => d.codigo))].filter(Boolean).sort(),
      zonas: [...new Set(cemOsData.map(d => d.zona))].filter(Boolean).sort(),
      canales: [...new Set(cemOsData.map(d => d.canal_ventas))].filter(Boolean).sort(),
      vendedores: [...new Set(cemOsData.map(d => d.vendedor))].filter(Boolean).sort(),
      estados: [...new Set(cemOsData.map(d => d.estado_unidad))].filter(Boolean).sort()
    };
  }, [cemOsData]);

  useEffect(() => {
    const loadAllData = async () => {
      setLoadingState(LoadingState.LOADING);
      try {
        // Load Surveys
        const sData = await fetchSalesQualityData(config.sheetUrls.sales_quality || SALES_QUALITY_SHEET_KEY);
        setSurveyData(sData);
        setAvailableSurveyBranches([...new Set(sData.map(d => d.sucursal))].filter(Boolean).sort());
        
        // Load Claims
        const cData = await fetchSalesClaimsData(config.sheetUrls.sales_claims || SALES_CLAIMS_SHEET_KEY);
        setClaimsData(cData);
        setAvailableClaimsBranches([...new Set(cData.map(d => d.sucursal))].filter(Boolean).sort());

        // Combine and normalize Sale Types from both sources
        const allRawTypes = [
            ...sData.map(d => d.tipo_venta),
            ...cData.map(d => d.tipo_venta)
        ].map(t => t?.trim().toUpperCase()).filter(Boolean);
        
        const processedTypes = allRawTypes.map(t => normalizeSaleType(t));
        setAvailableSaleTypes([...new Set(processedTypes)].sort());

        // Load CEM OS
        const [cemJujuy, cemSalta] = await Promise.all([
          fetchCemOsData(config.sheetUrls.cem_os || CEM_OS_SHEET_KEY),
          fetchCemOsData(config.sheetUrls.cem_os_salta || CEM_OS_SALTA_SHEET_KEY)
        ]);
        setCemOsData([...cemJujuy, ...cemSalta]);

        setLoadingState(LoadingState.SUCCESS);
      } catch (error) {
        console.error(error);
        setLoadingState(LoadingState.ERROR);
      }
    };
    loadAllData();
  }, []);

  const toggleMonth = (month: string) => {
    if (selectedMonths.includes(month)) {
      setSelectedMonths(selectedMonths.filter(m => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  };

  const toggleSurveyBranch = (branch: string) => {
      if (surveyBranches.includes(branch)) setSurveyBranches(prev => prev.filter(b => b !== branch));
      else setSurveyBranches(prev => [...prev, branch]);
  };
  
  const toggleClaimsBranch = (branch: string) => {
      if (claimsBranches.includes(branch)) setClaimsBranches(prev => prev.filter(b => b !== branch));
      else setClaimsBranches(prev => [...prev, branch]);
  };

  const toggleSaleType = (type: string) => {
    if (selectedSaleTypes.includes(type)) setSelectedSaleTypes(prev => prev.filter(t => t !== type));
    else setSelectedSaleTypes(prev => [...prev, type]);
  };

  // --- FILTERING LOGIC MOVED TO PARENT ---
  const filteredSurveyData = useMemo(() => {
    return surveyData.filter((item: SalesQualityRecord) => {
      const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(item.mes);
      const matchBranch = surveyBranches.length === 0 || surveyBranches.includes(item.sucursal);
      
      const itemType = normalizeSaleType(item.tipo_venta);
      const matchSaleType = selectedSaleTypes.length === 0 || selectedSaleTypes.includes(itemType);
      
      const matchVendedor = !selectedVendedor || item.vendedor === selectedVendedor;
      const matchAdministrativo = !selectedAdministrativo || item.administrativo === selectedAdministrativo;
      let matchOS = true;
      if (osFilter) {
          if (!item.cem_general) {
              matchOS = false;
          } else {
              if (osFilter === 'low') matchOS = item.cem_general > 0 && item.cem_general <= 3;
              else if (osFilter === 'mid') matchOS = item.cem_general > 3 && item.cem_general < 5;
              else if (osFilter === 'top') matchOS = item.cem_general === 5;
              else matchOS = Math.floor(item.cem_general).toString() === osFilter;
          }
      }
      return matchMonth && matchBranch && matchOS && matchSaleType && matchVendedor && matchAdministrativo;
    });
  }, [surveyData, selectedMonths, surveyBranches, osFilter, selectedSaleTypes, selectedVendedor, selectedAdministrativo]);

  const filteredClaimsData = useMemo(() => {
    return claimsData.filter((item: SalesClaimsRecord) => {
        const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(item.mes);
        const matchBranch = claimsBranches.length === 0 || claimsBranches.includes(item.sucursal);
        
        const itemType = normalizeSaleType(item.tipo_venta);
        const matchSaleType = selectedSaleTypes.length === 0 || selectedSaleTypes.includes(itemType);
        
        return matchMonth && matchBranch && matchSaleType;
    });
  }, [claimsData, selectedMonths, claimsBranches, selectedSaleTypes]);

  const annualClaimsChartData = useMemo(() => {
    return claimsData.filter((item: SalesClaimsRecord) => {
        const matchBranch = claimsBranches.length === 0 || claimsBranches.includes(item.sucursal);

        const itemType = normalizeSaleType(item.tipo_venta);
        const matchSaleType = selectedSaleTypes.length === 0 || selectedSaleTypes.includes(itemType);

        return matchBranch && matchSaleType;
    });
  }, [claimsData, claimsBranches, selectedSaleTypes]);

  const totalUnidades = useMemo(() => {
    const uniqueVins = new Set();
    let activeData: any[] = [];
    
    if (activeTab === 'surveys') {
      activeData = filteredSurveyData;
    } else if (activeTab === 'claims') {
      activeData = filteredClaimsData;
    } else if (activeTab === 'cem_os') {
      activeData = cemOsData.filter(d => {
        const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(d.mes);
        const matchVendedor = !selectedVendedor || d.vendedor === selectedVendedor;
        const matchCanal = !selectedCanal || d.canal_ventas === selectedCanal;
        const matchCodigo = !selectedCodigo || d.codigo === selectedCodigo;
        const matchZona = !selectedZona || d.zona === selectedZona;
        const matchEstado = !selectedEstadoUnidad || d.estado_unidad === selectedEstadoUnidad;
        return matchMonth && matchVendedor && matchCanal && matchCodigo && matchZona && matchEstado;
      });
    }

    activeData.forEach(d => {
      if ('chasis' in d && d.chasis && d.chasis.trim() !== "") {
        uniqueVins.add(d.chasis.trim());
      } else if ('vin' in d && d.vin && d.vin.trim() !== "") {
        uniqueVins.add(d.vin.trim());
      } else if ('cod_id' in d && d.cod_id && d.cod_id.trim() !== "") {
        uniqueVins.add(d.cod_id.trim());
      }
    });
    return uniqueVins.size;
  }, [filteredSurveyData, filteredClaimsData, cemOsData, activeTab, selectedMonths]);

  const horizontalFilters = (
    <div className="flex flex-wrap items-center gap-4">
        {/* Sample Size Indicator */}
        <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-950 text-white rounded-2xl shadow-xl shadow-slate-900/20 border border-white/10">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-inner">
                <Icons.Package className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
                <span className="text-lg font-black leading-none tracking-tighter italic">{totalUnidades}</span>
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-400">Unidades</span>
            </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white/80 backdrop-blur-xl rounded-2xl shadow-sm border border-white p-1.5">
            <button 
                onClick={() => setActiveTab('surveys')}
                className={`px-4 py-2 rounded-xl text-[10px] transition-all flex items-center gap-2 ${
                    activeTab === 'surveys' ? 'bg-slate-950 text-white font-black shadow-lg shadow-slate-900/20' : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
                <Icons.Star className={`w-3 h-3 ${activeTab === 'surveys' ? 'text-amber-400' : 'text-slate-300'}`} />
                Encuestas
            </button>
            <button 
                onClick={() => setActiveTab('claims')}
                className={`px-4 py-2 rounded-xl text-[10px] transition-all flex items-center gap-2 ${
                    activeTab === 'claims' ? 'bg-slate-950 text-white font-black shadow-lg shadow-slate-900/20' : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
                <Icons.AlertCircle className={`w-3 h-3 ${activeTab === 'claims' ? 'text-rose-400' : 'text-slate-300'}`} />
                Reclamos
            </button>
            <button 
                onClick={() => setActiveTab('cem_os')}
                className={`px-4 py-2 rounded-xl text-[10px] transition-all flex items-center gap-2 ${
                    activeTab === 'cem_os' ? 'bg-slate-950 text-white font-black shadow-lg shadow-slate-900/20' : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
                <Icons.Activity className={`w-3 h-3 ${activeTab === 'cem_os' ? 'text-blue-400' : 'text-slate-300'}`} />
                CEM OS
            </button>
        </div>

        {activeTab !== 'cem_os' && (
            <>
                <div className="relative min-w-[140px]">
                    <select 
                        className="w-full text-[10px] font-black uppercase tracking-widest pl-4 pr-10 py-2.5 rounded-xl border border-white bg-white/80 backdrop-blur-xl text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm"
                        value={activeTab === 'surveys' ? (surveyBranches[0] || '') : (claimsBranches[0] || '')}
                        onChange={(e) => {
                            const val = e.target.value ? [e.target.value] : [];
                            if (activeTab === 'surveys') setSurveyBranches(val);
                            else setClaimsBranches(val);
                        }}
                    >
                        <option value="">Sucursal</option>
                        {(activeTab === 'surveys' ? availableSurveyBranches : availableClaimsBranches).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <Icons.ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative min-w-[140px]">
                    <select 
                        className="w-full text-[10px] font-black uppercase tracking-widest pl-4 pr-10 py-2.5 rounded-xl border border-white bg-white/80 backdrop-blur-xl text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm"
                        value={selectedSaleTypes[0] || ''}
                        onChange={(e) => setSelectedSaleTypes(e.target.value ? [e.target.value] : [])}
                    >
                        <option value="">Tipo Venta</option>
                        {availableSaleTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <Icons.ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
            </>
        )}

        {activeTab === 'surveys' && (
            <>
                <div className="relative min-w-[140px]">
                    <select 
                        className="w-full text-[10px] font-black uppercase tracking-widest pl-4 pr-10 py-2.5 rounded-xl border border-white bg-white/80 backdrop-blur-xl text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm"
                        value={osFilter || ''}
                        onChange={(e) => setOsFilter(e.target.value || null)}
                    >
                        <option value="">Nota OS</option>
                        <option value="5">Solo 5</option>
                        <option value="low">1-3</option>
                        <option value="4">Nota 4</option>
                    </select>
                    <Icons.ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative min-w-[160px]">
                    <select 
                        className="w-full text-[10px] font-black uppercase tracking-widest pl-4 pr-10 py-2.5 rounded-xl border border-white bg-white/80 backdrop-blur-xl text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm"
                        value={selectedVendedor || ''}
                        onChange={(e) => setSelectedVendedor(e.target.value || null)}
                    >
                        <option value="">Asesor Comercial</option>
                        {availableSurveyFilters.vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <Icons.ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative min-w-[160px]">
                    <select 
                        className="w-full text-[10px] font-black uppercase tracking-widest pl-4 pr-10 py-2.5 rounded-xl border border-white bg-white/80 backdrop-blur-xl text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm"
                        value={selectedAdministrativo || ''}
                        onChange={(e) => setSelectedAdministrativo(e.target.value || null)}
                    >
                        <option value="">Administrativo</option>
                        {availableSurveyFilters.administrativos.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <Icons.ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
            </>
        )}

        {activeTab === 'claims' && (
            <div className="relative min-w-[140px]">
                <select 
                    className="w-full text-[10px] font-black uppercase tracking-widest pl-4 pr-10 py-2.5 rounded-xl border border-white bg-white/80 backdrop-blur-xl text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer shadow-sm"
                    value={claimsBranches[0] || ''}
                    onChange={(e) => setClaimsBranches(e.target.value ? [e.target.value] : [])}
                >
                    <option value="">Sucursal</option>
                    {availableClaimsBranches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
                <Icons.ChevronDown className="w-3 h-3 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
        )}

        {activeTab === 'cem_os' && (
            <div className="flex flex-wrap gap-2">
                <select 
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border border-white bg-white/80 backdrop-blur-xl text-slate-600 outline-none shadow-sm"
                    value={selectedCodigo || ''}
                    onChange={(e) => setSelectedCodigo(e.target.value || null)}
                >
                    <option value="">Código</option>
                    {availableCemOsFilters.codigos.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border border-white bg-white/80 backdrop-blur-xl text-slate-600 outline-none shadow-sm"
                    value={selectedZona || ''}
                    onChange={(e) => setSelectedZona(e.target.value || null)}
                >
                    <option value="">Zona</option>
                    {availableCemOsFilters.zonas.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
                <select 
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border border-white bg-white/80 backdrop-blur-xl text-slate-600 outline-none shadow-sm"
                    value={selectedCanal || ''}
                    onChange={(e) => setSelectedCanal(e.target.value || null)}
                >
                    <option value="">Canal</option>
                    {availableCemOsFilters.canales.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select 
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border border-white bg-white/80 backdrop-blur-xl text-slate-600 outline-none shadow-sm"
                    value={selectedVendedor || ''}
                    onChange={(e) => setSelectedVendedor(e.target.value || null)}
                >
                    <option value="">Asesor</option>
                    {availableCemOsFilters.vendedores.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
                <select 
                    className="text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl border border-white bg-white/80 backdrop-blur-xl text-slate-600 outline-none shadow-sm"
                    value={selectedEstadoUnidad || ''}
                    onChange={(e) => setSelectedEstadoUnidad(e.target.value || null)}
                >
                    <option value="">Estado Unidad</option>
                    {availableCemOsFilters.estados.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>
        )}
    </div>
  );

  // if (loadingState === LoadingState.LOADING) return <SkeletonLoader />;

  return (
    <DashboardFrame
        title="Calidad de Ventas"
        subtitle={activeTab === 'surveys' ? "Encuestas de Satisfacción" : activeTab === 'claims' ? "Gestión de Reclamos" : "CEM OS"}
        lastUpdated={new Date().toLocaleTimeString()}
        filters={null}
        isLoading={loadingState === LoadingState.LOADING}
        onBack={onBack}
    >
        <div className="space-y-6 pb-20">

            {/* Horizontal Filters Bar */}
            <div className="flex flex-col gap-4">
                <div className="bg-white/50 backdrop-blur-xl p-4 rounded-[2rem] border border-white shadow-sm">
                    <MonthSelector 
                        selectedMonths={selectedMonths}
                        onToggle={toggleMonth}
                        months={MONTHS}
                    />
                </div>
                <div className="px-2">
                    {horizontalFilters}
                </div>
            </div>

            {activeTab === 'surveys' ? (
                <SurveyView 
                    data={surveyData}
                    filteredData={filteredSurveyData}
                    loadingState={loadingState}
                    selectedMonths={selectedMonths}
                    setSelectedMonths={setSelectedMonths}
                    selectedBranches={surveyBranches}
                    toggleBranch={toggleSurveyBranch}
                    availableBranches={availableSurveyBranches}
                    selectedSaleTypes={selectedSaleTypes}
                    toggleSaleType={toggleSaleType}
                    availableSaleTypes={availableSaleTypes}
                    osFilter={osFilter}
                    setOsFilter={setOsFilter}
                />
            ) : activeTab === 'claims' ? (
                <ClaimsView 
                    filteredData={filteredClaimsData}
                    annualFilteredData={annualClaimsChartData}
                    loadingState={loadingState}
                    selectedMonths={selectedMonths}
                    setSelectedMonths={setSelectedMonths}
                    selectedBranches={claimsBranches}
                    toggleBranch={toggleClaimsBranch}
                    availableBranches={availableClaimsBranches}
                    selectedSaleTypes={selectedSaleTypes}
                    toggleSaleType={toggleSaleType}
                    availableSaleTypes={availableSaleTypes}
                />
            ) : (
                <CemOsDashboard 
                    data={cemOsData}
                    loadingState={loadingState}
                    selectedMonths={selectedMonths}
                    selectedCodigo={selectedCodigo}
                    setSelectedCodigo={setSelectedCodigo}
                    selectedZona={selectedZona}
                    setSelectedZona={setSelectedZona}
                    selectedCanal={selectedCanal}
                    setSelectedCanal={setSelectedCanal}
                    selectedVendedor={selectedVendedor}
                    setSelectedVendedor={setSelectedVendedor}
                    selectedEstadoUnidad={selectedEstadoUnidad}
                    setSelectedEstadoUnidad={setSelectedEstadoUnidad}
                />
            )
            }
        </div>
        <ChatBot 
            apiKey={typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : ''}
            context={`Dashboard de Calidad de Ventas. Tab activo: ${activeTab}. Unidades analizadas: ${totalUnidades}.`}
        />
    </DashboardFrame>
  );
};

export default SalesQualityDashboard;
