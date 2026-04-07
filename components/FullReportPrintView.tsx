
import React, { useState, useEffect, useMemo } from 'react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Tooltip
} from 'recharts';
import { Icons } from './Icon';
import { 
    fetchSalesQualityData, 
    fetchSalesClaimsData, 
    fetchQualityData, 
    fetchDetailedQualityData 
} from '../services/dataService';
import { 
    SalesQualityRecord, 
    SalesClaimsRecord, 
    QualityRecord, 
    DetailedQualityRecord,
    LoadingState,
    ReportTemplate
} from '../types';

interface FullReportPrintViewProps {
    location: 'JUJUY' | 'SALTA';
    config: {
        month: string | null;
        template: ReportTemplate;
    };
    sheetUrls: {
        salesQuality: string;
        salesClaims: string;
        postventaSummary: string;
        postventaDetailed: string;
    };
    onClose: () => void;
}

const FullReportPrintView: React.FC<FullReportPrintViewProps> = ({ location, config, sheetUrls, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{
        salesQuality: SalesQualityRecord[];
        salesClaims: SalesClaimsRecord[];
        postventaSummary: QualityRecord[];
        postventaDetailed: DetailedQualityRecord[];
    } | null>(null);

    useEffect(() => {
        const loadAllData = async () => {
            try {
                const [sq, sc, ps, pd] = await Promise.all([
                    fetchSalesQualityData(sheetUrls.salesQuality),
                    fetchSalesClaimsData(sheetUrls.salesClaims),
                    fetchQualityData(sheetUrls.postventaSummary),
                    fetchDetailedQualityData(sheetUrls.postventaDetailed)
                ]);

                const normalizeBranchValue = (value: unknown) =>
                    String(value || '')
                        .trim()
                        .toUpperCase()
                        .normalize('NFD')
                        .replace(/[\u0300-\u036f]/g, '');

                const matchesLocation = (value: unknown) => {
                    const normalized = normalizeBranchValue(value);
                    if (!normalized) return false;
                    if (location === 'JUJUY') {
                        return normalized.includes('JUJUY') || normalized === '3059';
                    }
                    return normalized.includes('SALTA') || normalized === '3087' || normalized === '3089';
                };
                
                // Apply filters
                const filterByMonth = (records: any[]) => {
                    if (!config.month) return records;
                    return records.filter(r => r.mes === config.month);
                };

                setData({
                    salesQuality: filterByMonth(sq.filter(d => matchesLocation(d.sucursal))),
                    salesClaims: filterByMonth(sc.filter(d => matchesLocation(d.sucursal))),
                    postventaSummary: filterByMonth(ps.filter(d => matchesLocation(d.sucursal))),
                    postventaDetailed: filterByMonth(pd) // Detailed sheets are already per location
                });
                setLoading(false);
                
                // Trigger print after a short delay to allow charts to render
                setTimeout(() => {
                    window.print();
                    onClose();
                }, 2000);
            } catch (error) {
                console.error("Error loading report data", error);
                setLoading(false);
            }
        };
        loadAllData();
    }, [location, config, sheetUrls, onClose]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-[#001E50] z-[100] flex flex-col items-center justify-center text-white">
                <div className="w-24 h-24 border-4 border-white/10 border-t-[#00B0F0] rounded-full animate-spin mb-8"></div>
                <div className="text-center space-y-2">
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Preparando Reporte Gerencial</h2>
                    <p className="text-[#00B0F0] font-bold text-xs uppercase tracking-[0.4em]">Sucursal {location} • {config.month || 'Anual 2025'}</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="print-only bg-white text-[#001E50] font-sans">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&display=swap');
                
                @media print {
                    @page { size: landscape; margin: 0; }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        font-family: 'Inter', sans-serif;
                    }
                    .no-print { display: none !important; }
                    .print-only { display: block !important; }
                    .page-break { page-break-after: always; }
                    .slide-container { 
                        width: 297mm; 
                        height: 210mm; 
                        padding: 12mm 15mm; 
                        position: relative;
                        overflow: hidden;
                        background: white;
                        display: flex;
                        flex-direction: column;
                    }
                    .vw-gradient-bg {
                        background: linear-gradient(135deg, #001E50 0%, #002a70 100%);
                    }
                }
                `}
            </style>

            {/* --- SLIDE 1: TEMAS (INDEX) --- */}
            <div className="slide-container page-break">
                <div className="flex justify-between items-center mb-16">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-[#001E50] rounded-full flex items-center justify-center text-white font-black text-xl">A</div>
                        <div>
                            <span className="font-black text-[#001E50] text-xl tracking-tighter block leading-none">AUTOSOL</span>
                            <span className="text-[8px] font-bold text-[#00B0F0] uppercase tracking-[0.3em]">Excelencia en el Servicio</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <h1 className="text-4xl font-black text-[#001E50] tracking-tighter uppercase leading-none">Reporte de Calidad</h1>
                        <p className="text-[#00B0F0] font-bold text-xs uppercase tracking-widest mt-1">{location} • {config.month || 'ANUAL 2025'}</p>
                    </div>
                </div>

                <div className="flex-1 flex flex-col justify-center">
                    <h2 className="text-6xl font-black text-[#001E50] mb-12 tracking-tighter italic">TEMAS</h2>
                    <div className="grid grid-cols-2 gap-x-20 gap-y-6">
                        <IndexItem number="01" title="Resultados KPI Principales: CEM Ventas" />
                        <IndexItem number="02" title="Adherencia a Procesos y Experiencia de Entrega" />
                        <IndexItem number="03" title="Gestión y Categorización de Reclamos - Ventas" />
                        <IndexItem number="04" title="Resultados KPI Principales: CEM Postventa" />
                        <IndexItem number="05" title="Gestión y Categorización de Reclamos - Postventa" />
                        <IndexItem number="06" title="Conclusiones y Próximos Pasos" />
                    </div>
                </div>

                <div className="mt-auto pt-8 border-t border-slate-100 flex justify-between items-end">
                    <div className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">
                        Documento Confidencial • Volkswagen Autosol
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Página</p>
                        <p className="text-sm font-black text-[#001E50]">01</p>
                    </div>
                </div>
            </div>

            {/* --- VENTAS: KPI PRINCIPALES --- */}
            {config.template.ventas.enabled && (
                <VentasKpiSlide data={data} location={location} month={config.month} />
            )}

            {/* --- VENTAS: PROCESOS Y ENTREGA --- */}
            {config.template.ventas.enabled && (
                <VentasProcesosSlide data={data} location={location} />
            )}

            {/* --- VENTAS: RECLAMOS --- */}
            {config.template.ventas.enabled && (
                <VentasReclamosSlide data={data} location={location} />
            )}

            {/* --- POSTVENTA: KPI PRINCIPALES --- */}
            {config.template.postventa.enabled && (
                <PostventaKpiSlide data={data} location={location} month={config.month} />
            )}

            {/* --- POSTVENTA: RECLAMOS --- */}
            {config.template.postventa.enabled && (
                <PostventaReclamosSlide data={data} location={location} />
            )}

            {/* --- SLIDE 06: CONCLUSIONES --- */}
            <ConclusionesSlide template={config.template} location={location} />

            {/* --- FINAL SLIDE --- */}
            <div className="slide-container flex flex-col items-center justify-center text-center vw-gradient-bg text-white">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-[#001E50] font-black text-4xl mb-12 shadow-2xl">A</div>
                <h1 className="text-7xl font-black tracking-tighter mb-6 italic">¡MUCHAS GRACIAS!</h1>
                <div className="w-32 h-1.5 bg-[#00B0F0] mb-12"></div>
                
                <div className="space-y-4 mb-16">
                    <p className="text-white/60 font-bold uppercase tracking-[0.4em] text-sm">Visualiza los gráficos actualizados en:</p>
                    <a href="https://nelsoncalidad15-ops.github.io/tablero-control-end/" className="text-2xl font-black text-[#00B0F0] hover:underline tracking-tight">
                        nelsoncalidad15-ops.github.io/tablero-control-end/
                    </a>
                </div>

                <p className="text-white/30 font-bold uppercase tracking-widest text-[10px]">Volkswagen Autosol • Gestión de Excelencia 2025</p>
            </div>
        </div>
    );
};

// --- HELPER COMPONENTS ---

const IndexItem = ({ number, title }: { number: string, title: string }) => (
    <div className="flex items-center gap-6 group">
        <span className="text-4xl font-black text-[#00B0F0]/30 group-hover:text-[#00B0F0] transition-colors">{number}</span>
        <span className="text-xl font-bold text-[#001E50] tracking-tight">{title}</span>
    </div>
);

const SectionHeader = ({ title, subtitle, page }: { title: string, subtitle: string, page: string }) => (
    <div className="flex justify-between items-start mb-10 shrink-0">
        <div>
            <h2 className="text-3xl font-black text-[#001E50] uppercase tracking-tight leading-none mb-2">{title}</h2>
            <p className="text-[#00B0F0] font-bold text-xs uppercase tracking-[0.3em]">{subtitle}</p>
        </div>
        <div className="text-right">
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest block mb-1">Página</span>
            <span className="text-lg font-black text-[#001E50]">{page}</span>
        </div>
    </div>
);

const VentasKpiSlide = ({ data, location, month }: any) => {
    const { salesQuality } = data;
    const calculateAverage = (key: string) => {
        const valid = salesQuality.filter((d: any) => typeof d[key] === 'number' && d[key] > 0);
        return valid.length > 0 ? (valid.reduce((acc: number, curr: any) => acc + curr[key], 0) / valid.length).toFixed(2) : '0.00';
    };

    return (
        <div className="slide-container page-break">
            <SectionHeader title="Resultados KPI Principales: CEM Ventas" subtitle="Encuesta Interna - Ventas" page="02" />
            
            <div className="grid grid-cols-4 gap-6 mb-10">
                <KpiCard title="Satisfacción General (OS)" value={calculateAverage('cem_general')} color="#001E50" />
                <KpiCard title="CEM - Trato" value={calculateAverage('cem_trato')} color="#00B0F0" />
                <KpiCard title="CEM - Organización" value={calculateAverage('cem_organizacion')} color="#001E50" />
                <KpiCard title="CEM - Asesoramiento" value={calculateAverage('cem_asesoramiento')} color="#00B0F0" />
            </div>

            <div className="flex-1 bg-slate-50 rounded-[3rem] p-10 flex flex-col">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Evolución de Satisfacción</h3>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center space-y-4">
                        <Icons.Activity className="w-16 h-16 text-[#00B0F0] mx-auto opacity-20" />
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Análisis de Tendencias del Periodo</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VentasProcesosSlide = ({ data, location }: any) => {
    const { salesQuality } = data;
    
    const processData = [
        { name: 'Prueba Manejo', pct: salesQuality.length > 0 ? (salesQuality.filter((d: any) => String(d.prueba_manejo).toLowerCase().includes('si')).length / salesQuality.length) * 100 : 0 },
        { name: 'Financiación', pct: salesQuality.length > 0 ? (salesQuality.filter((d: any) => String(d.ofrecimiento_financiacion).toLowerCase().includes('si')).length / salesQuality.length) * 100 : 0 },
        { name: 'Toma Usados', pct: salesQuality.length > 0 ? (salesQuality.filter((d: any) => String(d.toma_usados).toLowerCase().includes('si')).length / salesQuality.length) * 100 : 0 },
        { name: 'Seguro', pct: salesQuality.length > 0 ? (salesQuality.filter((d: any) => String(d.ofrecimiento_seguro).toLowerCase().includes('si')).length / salesQuality.length) * 100 : 0 },
        { name: 'App Mi VW', pct: salesQuality.length > 0 ? (salesQuality.filter((d: any) => String(d.app_mi_vw).toLowerCase().includes('si')).length / salesQuality.length) * 100 : 0 },
    ];

    const effectivenessData = useMemo(() => {
        const counts: Record<string, number> = {};
        salesQuality.forEach((d: any) => {
            const val = d.estado || 'Sin Datos';
            counts[val] = (counts[val] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [salesQuality]);

    return (
        <div className="slide-container page-break">
            <SectionHeader title="Adherencia a Procesos y Experiencia" subtitle="Gestión de Calidad en el Punto de Venta" page="03" />
            
            <div className="grid grid-cols-2 gap-10 flex-1">
                <div className="bg-slate-50 rounded-[2.5rem] p-8 flex flex-col">
                    <h3 className="text-xs font-black text-[#001E50] uppercase tracking-widest mb-8">Adherencia a Procesos</h3>
                    <div className="space-y-6 flex-1 justify-center flex flex-col">
                        {processData.map((p, i) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                                    <span>{p.name}</span>
                                    <span className="text-[#00B0F0]">{Math.round(p.pct)}%</span>
                                </div>
                                <div className="w-full bg-white rounded-full h-3 overflow-hidden border border-slate-200">
                                    <div className="bg-[#001E50] h-full transition-all duration-1000" style={{ width: `${p.pct}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="bg-slate-50 rounded-[2.5rem] p-8 flex-1">
                        <h3 className="text-xs font-black text-[#001E50] uppercase tracking-widest mb-6">Efectividad por Canal vs Estado Gestión</h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={effectivenessData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                        {effectivenessData.map((_, index) => <Cell key={index} fill={['#001E50', '#00B0F0', '#64748B', '#94A3B8'][index % 4]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-4">
                            {effectivenessData.map((d, i) => (
                                <div key={i} className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#001E50', '#00B0F0', '#64748B', '#94A3B8'][i % 4] }}></div>
                                    <span className="truncate">{d.name}: {d.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-[#001E50] rounded-[2.5rem] p-8 text-white">
                        <h3 className="text-xs font-black text-[#00B0F0] uppercase tracking-widest mb-2">Experiencia de Entrega</h3>
                        <p className="text-2xl font-black tracking-tighter italic">"Excelencia en cada contacto"</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VentasReclamosSlide = ({ data, location }: any) => {
    const { salesClaims } = data;
    const claimsMotives = useMemo(() => {
        const counts: Record<string, number> = {};
        salesClaims.forEach((d: any) => {
            const raw = d.motivo || '';
            raw.split(/[,;\n\r]+/).forEach((p: string) => {
                const t = p.trim();
                if (t && !['0', '-', 'n/a'].includes(t.toLowerCase())) {
                    counts[t] = (counts[t] || 0) + 1;
                }
            });
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [salesClaims]);

    return (
        <div className="slide-container page-break">
            <SectionHeader title="Gestión y Categorización de Reclamos - Ventas" subtitle="Análisis de Insatisfacción Detectada" page="04" />
            
            <div className="flex-1 bg-slate-50 rounded-[3rem] p-10 flex flex-col">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Motivos Principales de Reclamo</h3>
                    <div className="bg-[#001E50] text-white px-6 py-2 rounded-full">
                        <span className="text-[10px] font-black uppercase tracking-widest mr-3">Total Reclamos:</span>
                        <span className="text-xl font-black">{salesClaims.length}</span>
                    </div>
                </div>
                
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={claimsMotives} margin={{ right: 60, left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={250} tick={{fontSize: 11, fontWeight: 'bold', fill: '#001E50'}} axisLine={false} tickLine={false} />
                            <Bar dataKey="value" fill="#001E50" radius={[0, 6, 6, 0]} barSize={30}>
                                <LabelList dataKey="value" position="right" style={{fontSize: 16, fontWeight: '900', fill: '#00B0F0'}} offset={15} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const PostventaKpiSlide = ({ data, location, month }: any) => {
    const { postventaDetailed, postventaSummary } = data;
    const calculateAvg = (key: string) => {
        const valid = postventaDetailed.filter((d: any) => d[key]);
        return valid.length > 0 ? (valid.reduce((acc: number, curr: any) => acc + curr[key], 0) / valid.length).toFixed(2) : '0.00';
    };

    const resolutionData = useMemo(() => {
        const counts = { Si: 0, No: 0 };
        postventaSummary.forEach((d: any) => {
            const val = String(d.resuelto).toLowerCase();
            if (val.includes('si')) counts.Si++;
            else if (val.includes('no')) counts.No++;
        });
        return [
            { name: 'Resuelto', value: counts.Si, fill: '#10B981' },
            { name: 'Pendiente', value: counts.No, fill: '#EF4444' }
        ].filter(d => d.value > 0);
    }, [postventaSummary]);

    return (
        <div className="slide-container page-break">
            <SectionHeader title="Resultados KPI Principales: CEM Postventa" subtitle="Encuesta Interna - Postventa Calidad" page="05" />
            
            <div className="grid grid-cols-4 gap-6 mb-10">
                <KpiCard title="Satisfacción LVS (Q4)" value={calculateAvg('q4_score')} color="#001E50" />
                <KpiCard title="Trato Personal (Q1)" value={calculateAvg('q1_score')} color="#00B0F0" />
                <KpiCard title="Organización (Q2)" value={calculateAvg('q2_score')} color="#001E50" />
                <KpiCard title="Calidad Reparación (Q3)" value={calculateAvg('q3_score')} color="#00B0F0" />
            </div>

            <div className="grid grid-cols-3 gap-8 flex-1">
                <div className="bg-slate-50 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Reclamos (OR Únicas)</span>
                    <span className="text-7xl font-black text-[#001E50] tracking-tighter">{postventaSummary.length}</span>
                    <div className="w-12 h-1 bg-[#00B0F0] mt-6"></div>
                </div>

                <div className="bg-slate-50 rounded-[2.5rem] p-8 flex flex-col">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Resolución de Casos</h3>
                    <div className="flex-1 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={resolutionData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                                    {resolutionData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-3xl font-black text-[#001E50]">{resolutionData.find(d => d.name === 'Resuelto')?.value || 0}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Resueltos</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#001E50] rounded-[2.5rem] p-8 text-white flex flex-col justify-center">
                    <h3 className="text-xs font-black text-[#00B0F0] uppercase tracking-widest mb-4">Puntos de Dolor</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#00B0F0]"></div>
                            <span className="text-xs font-bold uppercase tracking-tight">Demoras en Taller</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#00B0F0]"></div>
                            <span className="text-xs font-bold uppercase tracking-tight">Falta de Repuestos</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-[#00B0F0]"></div>
                            <span className="text-xs font-bold uppercase tracking-tight">Comunicación Asesor</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PostventaReclamosSlide = ({ data, location }: any) => {
    const { postventaSummary } = data;
    const claimsMotives = useMemo(() => {
        const counts: Record<string, number> = {};
        postventaSummary.forEach((d: any) => {
            const raw = d.motivo || '';
            raw.split(/[,;\n\r]+/).forEach((p: string) => {
                const t = p.trim();
                if (t && !['0', '-', 'n/a', 'sin motivo'].includes(t.toLowerCase())) {
                    counts[t] = (counts[t] || 0) + 1;
                }
            });
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
    }, [postventaSummary]);

    return (
        <div className="slide-container page-break">
            <SectionHeader title="Gestión y Categorización de Reclamos - Postventa" subtitle="Análisis de Motivos de Reclamo" page="06" />
            
            <div className="flex-1 bg-slate-50 rounded-[3rem] p-10 flex flex-col">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-10">Motivos de Reclamo Identificados</h3>
                <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={claimsMotives} margin={{ right: 60, left: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" hide />
                            <YAxis type="category" dataKey="name" width={250} tick={{fontSize: 11, fontWeight: 'bold', fill: '#001E50'}} axisLine={false} tickLine={false} />
                            <Bar dataKey="value" fill="#00B0F0" radius={[0, 6, 6, 0]} barSize={30}>
                                <LabelList dataKey="value" position="right" style={{fontSize: 16, fontWeight: '900', fill: '#001E50'}} offset={15} />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

const ConclusionesSlide = ({ template, location }: { template: ReportTemplate, location: string }) => {
    return (
        <div className="slide-container page-break">
            <SectionHeader title="Conclusiones y Próximos Pasos" subtitle="Resumen Ejecutivo de Gestión" page="07" />
            
            <div className="flex-1 grid grid-cols-12 gap-10">
                <div className="col-span-8 bg-slate-50 rounded-[3rem] p-12 flex flex-col">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 bg-[#001E50] rounded-xl flex items-center justify-center text-white">
                            <Icons.MessageSquare className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-[#001E50] uppercase tracking-widest">Observaciones Generales</h3>
                    </div>
                    
                    <div className="flex-1 text-slate-700 text-lg leading-relaxed whitespace-pre-wrap font-medium">
                        {template.globalComments || "No se han registrado conclusiones específicas para este periodo. Se recomienda realizar un seguimiento de los indicadores de satisfacción y gestión de reclamos para identificar oportunidades de mejora continua."}
                    </div>
                </div>

                <div className="col-span-4 flex flex-col gap-6">
                    <div className="bg-[#001E50] rounded-[2.5rem] p-8 text-white flex-1">
                        <h3 className="text-xs font-black text-[#00B0F0] uppercase tracking-widest mb-6">Próximos Pasos</h3>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-[#00B0F0] flex items-center justify-center shrink-0 text-[#001E50] font-black text-[10px]">1</div>
                                <p className="text-xs font-bold leading-tight">Reforzar capacitación en procesos de entrega y explicación técnica.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-[#00B0F0] flex items-center justify-center shrink-0 text-[#001E50] font-black text-[10px]">2</div>
                                <p className="text-xs font-bold leading-tight">Optimizar tiempos de respuesta en gestión de reclamos críticos.</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-6 h-6 rounded-full bg-[#00B0F0] flex items-center justify-center shrink-0 text-[#001E50] font-black text-[10px]">3</div>
                                <p className="text-xs font-bold leading-tight">Implementar seguimiento post-servicio a las 48hs de la entrega.</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-slate-100 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center">
                        <Icons.ShieldCheck className="w-12 h-12 text-[#001E50] mb-4 opacity-20" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compromiso con la Calidad</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KpiCard = ({ title, value, color }: { title: string, value: string, color: string }) => (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: color }}></div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 h-8 flex items-center leading-tight">{title}</span>
        <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black tracking-tighter transition-transform group-hover:scale-110" style={{ color }}>{value}</span>
            <span className="text-[10px] font-bold text-slate-200">/ 5.0</span>
        </div>
    </div>
);

const PrintStatCard = ({ title, value, color }: { title: string, value: string, color: string }) => (
    <KpiCard title={title} value={value} color={color} />
);

export default FullReportPrintView;
