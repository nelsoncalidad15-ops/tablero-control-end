
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from './Icon';
import { PCGCRecord, LoadingState } from '../types';
import { DashboardFrame } from './DashboardUI';
import { fetchPCGCData } from '../services/dataService';

interface PCGCDashboardProps {
    sheetUrl: string;
    onBack: () => void;
}

const PCGCDashboard: React.FC<PCGCDashboardProps> = ({ sheetUrl, onBack }) => {
    const [data, setData] = useState<PCGCRecord[]>([]);
    const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [completedIds, setCompletedIds] = useState<Set<string>>(() => {
        try {
            const saved = localStorage.getItem('pcgc_completed_ids');
            if (saved) {
                const parsed = JSON.parse(saved);
                return Array.isArray(parsed) ? new Set(parsed) : new Set();
            }
        } catch (e) {
            console.error("Error parsing pcgc_completed_ids", e);
        }
        return new Set();
    });
    const [filters, setFilters] = useState({
        sector: '',
        metodo: '',
        criticidad: '',
        seccion: '',
        modulo: '',
        subseccion: '',
        status: 'all', // 'all', 'pending', 'completed'
        search: ''
    });

    useEffect(() => {
        localStorage.setItem('pcgc_completed_ids', JSON.stringify(Array.from(completedIds)));
    }, [completedIds]);

    const toggleComplete = (id: string) => {
        setCompletedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(LoadingState.LOADING);
            setErrorMessage(null);
            try {
                const result = await fetchPCGCData(sheetUrl);
                setData(result);
                setLoading(LoadingState.SUCCESS);
            } catch (error: any) {
                console.error("Error loading PCGC data", error);
                setLoading(LoadingState.ERROR);
                
                // Try to parse the JSON error from our proxy
                try {
                    const errorData = JSON.parse(error.message);
                    setErrorMessage(errorData.details || errorData.error || "Error de conexión");
                } catch (e) {
                    setErrorMessage(error.message || "Error desconocido al cargar datos");
                }
            }
        };
        loadData();
    }, [sheetUrl]);

    const options = useMemo(() => {
        return {
            sectores: Array.from(new Set(data.map(r => r.sector))).filter(Boolean).sort(),
            metodos: Array.from(new Set(data.map(r => r.metodo))).filter(Boolean).sort(),
            criticidades: Array.from(new Set(data.map(r => r.criticidad))).filter(Boolean).sort(),
            secciones: Array.from(new Set(data.map(r => r.seccion))).filter(Boolean).sort(),
            modulos: Array.from(new Set(data.map(r => r.modulo))).filter(Boolean).sort(),
            subsecciones: Array.from(new Set(data.map(r => r.subseccion))).filter(Boolean).sort()
        };
    }, [data]);

    const filteredData = useMemo(() => {
        return data.filter(r => {
            const isCompleted = completedIds.has(r.id);
            const matchStatus = filters.status === 'all' || 
                               (filters.status === 'completed' && isCompleted) ||
                               (filters.status === 'pending' && !isCompleted);
            const matchSector = !filters.sector || r.sector === filters.sector;
            const matchMetodo = !filters.metodo || r.metodo === filters.metodo;
            const matchCriticidad = !filters.criticidad || r.criticidad === filters.criticidad;
            const matchSeccion = !filters.seccion || r.seccion === filters.seccion;
            const matchModulo = !filters.modulo || r.modulo === filters.modulo;
            const matchSubseccion = !filters.subseccion || r.subseccion === filters.subseccion;
            const matchSearch = !filters.search || 
                r.requerimiento.toLowerCase().includes(filters.search.toLowerCase()) ||
                r.observaciones.toLowerCase().includes(filters.search.toLowerCase()) ||
                r.modulo.toLowerCase().includes(filters.search.toLowerCase());
            return matchStatus && matchSector && matchMetodo && matchCriticidad && matchSeccion && matchModulo && matchSubseccion && matchSearch;
        });
    }, [data, filters, completedIds]);

    const progress = useMemo(() => {
        if (data.length === 0) return 0;
        // Calculate progress based on CURRENT filtered set (by sector/area)
        const currentSet = data.filter(r => {
            const matchSector = !filters.sector || r.sector === filters.sector;
            const matchSeccion = !filters.seccion || r.seccion === filters.seccion;
            return matchSector && matchSeccion;
        });
        if (currentSet.length === 0) return 0;
        const completedCount = currentSet.filter(r => completedIds.has(r.id)).length;
        return Math.round((completedCount / currentSet.length) * 100);
    }, [data, completedIds, filters.sector, filters.seccion]);

    const getCriticidadColor = (criticidad: string) => {
        switch (criticidad.toLowerCase()) {
            case 'crítico':
            case 'critico':
                return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'importante':
                return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'aconsejable':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            default:
                return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    /*
    if (loading === LoadingState.LOADING) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">Cargando Check List PCGC...</p>
            </div>
        );
    }
    */

    return (
        <DashboardFrame
            title="PCGC Check List"
            subtitle="Programa de Calidad de Gestión de Concesionarios"
            lastUpdated={new Date().toLocaleTimeString()}
            onBack={onBack}
            isLoading={loading === LoadingState.LOADING}
        >
            <div className="space-y-10 pb-20">
                {loading === LoadingState.ERROR ? (
                    <div className="bg-white border border-dashed border-slate-200 rounded-[3rem] p-20 text-center">
                        <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Icons.Help className="w-10 h-10 text-rose-500" />
                        </div>
                        <h3 className="text-xl font-black text-[#001E50] uppercase italic tracking-tighter mb-2">Error de Configuración</h3>
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest max-w-md mx-auto mb-8">
                            {errorMessage || "No se pudieron cargar los datos de PCGC. Por favor, verifica la URL en la configuración."}
                        </p>
                        <div className="flex justify-center gap-4">
                            <button 
                                onClick={() => window.location.reload()}
                                className="px-8 py-3 bg-[#001E50] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#003380] transition-all"
                            >
                                Reintentar
                            </button>
                            <button 
                                onClick={onBack}
                                className="px-8 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Volver
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header Stats Section */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                            <div className="flex items-center gap-4">
                                <div className="bg-white border border-slate-200 rounded-[2rem] p-6 flex items-center gap-8 shadow-xl shadow-slate-200/40">
                                    <div className="flex flex-col gap-2 min-w-[180px]">
                                        <div className="flex justify-between items-end">
                                            <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Cumplimiento</p>
                                            <p className="text-xl font-black text-blue-600 leading-none tabular-nums">{progress}%</p>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                                            />
                                        </div>
                                    </div>
                                    <div className="h-10 w-px bg-slate-100"></div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Pendientes</p>
                                        <p className="text-3xl font-black text-slate-950 leading-none tabular-nums">
                                            {data.filter(r => {
                                                const matchSector = !filters.sector || r.sector === filters.sector;
                                                const matchSeccion = !filters.seccion || r.seccion === filters.seccion;
                                                return matchSector && matchSeccion && !completedIds.has(r.id);
                                            }).length}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                {/* Filters Bar */}
                <div className="bg-white/50 backdrop-blur-xl rounded-[3rem] p-8 border border-white shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                Sector
                            </label>
                            <select 
                                value={filters.sector}
                                onChange={(e) => setFilters(prev => ({ ...prev, sector: e.target.value }))}
                                className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-[13px] font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer hover:bg-white"
                            >
                                <option value="">Todos</option>
                                {options.sectores.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                Sección
                            </label>
                            <select 
                                value={filters.seccion}
                                onChange={(e) => setFilters(prev => ({ ...prev, seccion: e.target.value }))}
                                className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-[13px] font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer hover:bg-white"
                            >
                                <option value="">Todas</option>
                                {options.secciones.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-violet-500 rounded-full"></div>
                                Módulo
                            </label>
                            <select 
                                value={filters.modulo}
                                onChange={(e) => setFilters(prev => ({ ...prev, modulo: e.target.value }))}
                                className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-[13px] font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer hover:bg-white"
                            >
                                <option value="">Todos</option>
                                {options.modulos.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                Método
                            </label>
                            <select 
                                value={filters.metodo}
                                onChange={(e) => setFilters(prev => ({ ...prev, metodo: e.target.value }))}
                                className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-[13px] font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer hover:bg-white"
                            >
                                <option value="">Todos</option>
                                {options.metodos.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                                Criticidad
                            </label>
                            <select 
                                value={filters.criticidad}
                                onChange={(e) => setFilters(prev => ({ ...prev, criticidad: e.target.value }))}
                                className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-[13px] font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer hover:bg-white"
                            >
                                <option value="">Todas</option>
                                {options.criticidades.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                                Buscar
                            </label>
                            <div className="relative">
                                <Icons.Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                <input 
                                    type="text"
                                    placeholder="Filtrar..."
                                    value={filters.search}
                                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                    className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.5rem] pl-14 pr-6 py-4 text-[13px] font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all hover:bg-white"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                                Estado
                            </label>
                            <select 
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full bg-slate-50/50 border border-slate-100 rounded-[1.5rem] px-6 py-4 text-[13px] font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer hover:bg-white"
                            >
                                <option value="all">Todos</option>
                                <option value="pending">Solo Pendientes</option>
                                <option value="completed">Solo Completados</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Content List */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredData.length > 0 ? (
                            filteredData.map((record, index) => (
                                <motion.div
                                    key={record.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.02 }}
                                    className={`bg-white border ${completedIds.has(record.id) ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'} rounded-[2.5rem] p-8 hover:shadow-2xl hover:shadow-slate-200/60 transition-all group relative overflow-hidden flex flex-col h-full cursor-pointer`}
                                    onClick={() => toggleComplete(record.id)}
                                >
                                    <div className="flex flex-col gap-8 flex-grow">
                                        {/* Top Meta Info */}
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex flex-wrap gap-2">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border ${getCriticidadColor(record.criticidad)}`}>
                                                    {record.criticidad}
                                                </span>
                                                <span className="bg-slate-50 text-slate-500 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border border-slate-100">
                                                    {record.metodo}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Módulo</p>
                                                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{record.modulo}</p>
                                                </div>
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${completedIds.has(record.id) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-300 group-hover:bg-slate-200'}`}>
                                                    <Icons.Check className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Main Content */}
                                        <div className={`space-y-6 flex-grow transition-all ${completedIds.has(record.id) ? 'opacity-50' : 'opacity-100'}`}>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 ${completedIds.has(record.id) ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'} rounded-lg flex items-center justify-center`}>
                                                        <Icons.ClipboardCheck className="w-4 h-4" />
                                                    </div>
                                                    <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${completedIds.has(record.id) ? 'text-emerald-600' : 'text-blue-600'}`}>Requerimiento</h4>
                                                </div>
                                                <p className={`font-bold leading-relaxed text-lg tracking-tight ${completedIds.has(record.id) ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                                                    {record.requerimiento}
                                                </p>
                                            </div>
                                            
                                            {record.observaciones && (
                                                <div className="bg-slate-50/80 rounded-[1.5rem] p-6 border border-slate-100/50">
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                        <Icons.Help className="w-3.5 h-3.5" />
                                                        Observaciones
                                                    </h4>
                                                    <p className="text-slate-600 text-[13px] leading-relaxed font-medium">
                                                        {record.observaciones}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Info */}
                                        <div className="pt-8 mt-auto border-t border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
                                                    <Icons.MapPin className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sector Responsable</p>
                                                    <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{record.sector}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sección</p>
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-tight">{record.seccion}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Decorative elements */}
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-700"></div>
                                </motion.div>
                            ))
                        ) : (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-white border border-dashed border-slate-200 rounded-[3rem] p-20 text-center col-span-full"
                            >
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Icons.Search className="w-10 h-10 text-slate-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">No se encontraron resultados</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Intenta ajustar los filtros de búsqueda</p>
                                <button 
                                    onClick={() => setFilters({ sector: '', metodo: '', criticidad: '', seccion: '', modulo: '', subseccion: '', status: 'all', search: '' })}
                                    className="mt-8 text-blue-600 font-black uppercase text-[10px] tracking-[0.3em] hover:underline"
                                >
                                    Limpiar todos los filtros
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </>
        )}
    </div>
</DashboardFrame>
    );
};

export default PCGCDashboard;
