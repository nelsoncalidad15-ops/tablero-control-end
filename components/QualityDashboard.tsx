import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts';
import { Icons } from './Icon';
import { fetchQualityData } from '../services/dataService';
import { QualityRecord, LoadingState, AreaConfig } from '../types';
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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
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

  // --- DATA PROCESSING LAYERS ---

  // Layer 1: Base Context (Month & Branch)
  const baseFilteredData = useMemo(() => {
    return data.filter(item => {
      const matchMonth = selectedMonth ? item.mes === selectedMonth : true;
      const matchBranch = selectedBranches.length === 0 || selectedBranches.includes(item.sucursal);
      return matchMonth && matchBranch;
    });
  }, [data, selectedMonth, selectedBranches]);

  // Layer 1.5: Context + Responsable (Used for Charts)
  const contextData = useMemo(() => {
      return baseFilteredData.filter(d => {
          if (selectedResponsable) {
              const resp = d.responsable ? normalizeString(d.responsable) : 'Sin Asignar';
              return resp === selectedResponsable;
          }
          return true;
      });
  }, [baseFilteredData, selectedResponsable]);

  // Layer 2: Display Data (Base + Responsable + Motivo Filter)
  // Used for the List/Table
  const displayData = useMemo(() => {
      return contextData.filter(d => {
          // Filter by Motivo
          if (selectedMotivo) {
             if (!d.motivo) return false;
             const parts = d.motivo.split(/[,;\n\r]+/).map(s => normalizeString(s));
             if (!parts.includes(selectedMotivo)) return false;
          }
          return true;
      });
  }, [contextData, selectedMotivo]);


  // --- AGGREGATIONS ---

  // Motivos for Chart
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

  // Resolution Chart Data
  const resolutionChartData = useMemo(() => {
    const counts = { Si: 0, No: 0 };
    contextData.forEach(d => {
        const val = d.resuelto ? d.resuelto.trim().toLowerCase() : '';
        if (val === 'si' || val === 'sí') counts.Si++;
        else if (val === 'no') counts.No++;
    });
    
    // Only return if we have data
    const res = [];
    if (counts.Si > 0) res.push({ name: 'Resuelto', value: counts.Si, fill: '#10B981' });
    if (counts.No > 0) res.push({ name: 'No Resuelto', value: counts.No, fill: '#EF4444' });
    return res;
  }, [contextData]);


  // Calculate dynamic height for the chart container based on items
  const dynamicChartHeight = Math.max(500, motivoChartData.length * 35);

  // Sectors for Chart
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

  // Unique Claims (OR) Logic
  const uniqueClaimsCount = useMemo(() => {
    const uniqueOrders = new Set(
        displayData
            .map(d => d.orden)
            .filter(o => o && o.toString().trim() !== '')
    );
    return uniqueOrders.size > 0 ? uniqueOrders.size : 0;
  }, [displayData]);

  // Total Motives Count
  const totalTagsDetected = useMemo(() => {
      let count = 0;
      const IGNORED_MOTIVOS = ['motivos varios', 'sin motivo', 'n/a', 'ninguno', '-', '0', ''];
      
      displayData.forEach(d => {
          if (!d.motivo) return;
          const parts = d.motivo.split(/[,;\n\r]+/).map(s => s.trim());
          parts.forEach(p => {
              if(!p) return;
              const n = normalizeString(p);
              if (!IGNORED_MOTIVOS.includes(n.toLowerCase())) count++;
          });
      });
      return count;
  }, [displayData]);

  // Responsable Table Data
  const responsableTableData = useMemo(() => {
    const mapRespToOrs: Record<string, Set<string>> = {};

    baseFilteredData.forEach(d => {
        const key = d.responsable ? normalizeString(d.responsable) : 'Sin Asignar';
        if (!mapRespToOrs[key]) mapRespToOrs[key] = new Set();
        if (d.orden) mapRespToOrs[key].add(d.orden.toString().trim());
    });

    return Object.entries(mapRespToOrs)
      .map(([name, setOfOrs]) => ({ name, value: setOfOrs.size }))
      .sort((a, b) => b.value - a.value);
  }, [baseFilteredData]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
        
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="hover:bg-slate-100 p-2 rounded-full transition-colors group">
                <Icons.ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-slate-700" />
            </button>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-3 tracking-tight">
                <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm shadow-blue-200">
                    <Icons.ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <span>Calidad <span className="text-slate-300 mx-2">/</span> Postventa</span>
            </h1>
        </div>
        <div className="flex items-center gap-3">
             <div className="px-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-500 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${loadingState === LoadingState.SUCCESS ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                {loadingState === LoadingState.SUCCESS ? 'Datos actualizados' : 'Cargando...'}
             </div>
        </div>
      </header>

      {/* Month Filters Bar */}
      <div className="bg-white border-b border-slate-200 py-2 px-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.02)] z-20 overflow-x-auto">
         <div className="flex gap-1 justify-center min-w-max mx-auto">
            <button 
                onClick={() => setSelectedMonth(null)}
                className={`px-4 py-1.5 text-xs uppercase font-bold rounded-md transition-all ${
                    !selectedMonth 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
                Todo el Año
            </button>
            <div className="w-px h-6 bg-slate-200 mx-2 self-center"></div>
            {MONTHS.map(m => (
                <button 
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                        selectedMonth === m 
                        ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                >
                    {m}
                </button>
            ))}
         </div>
      </div>

      <main className="flex-1 p-8 max-w-[1920px] mx-auto w-full space-y-8">
        
        {/* Row 1: Filters & KPIs */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Sidebar Filters */}
            <div className="xl:col-span-2 flex flex-col gap-6">
                
                {/* Branch Selection */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                        Sucursal
                    </h3>
                    <div className="space-y-2">
                        {availableBranches.map(b => (
                            <button
                                key={b}
                                onClick={() => toggleBranch(b)}
                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex justify-between items-center group ${
                                    selectedBranches.includes(b) 
                                    ? 'bg-slate-800 text-white shadow-md' 
                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <span>{b}</span>
                                {selectedBranches.includes(b) && <Icons.ClipboardCheck className="w-4 h-4 text-white/50" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Motive Dropdown (Auxiliary) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                     <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                        Filtro Rápido
                    </h3>
                    <select 
                        value={selectedMotivo || ''} 
                        onChange={(e) => setSelectedMotivo(e.target.value || null)}
                        className="w-full text-sm p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    >
                        <option value="">Todos los motivos</option>
                        {motivoChartData.map(m => (
                            <option key={m.name} value={m.name}>
                                {m.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Active Filters Display */}
                {(selectedMotivo || selectedResponsable) && (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Filtros Activos</h4>
                        <div className="flex flex-col gap-2">
                            {selectedMotivo && (
                                <div className="text-xs flex items-center justify-between bg-white p-2 rounded border border-blue-100 text-blue-600">
                                    <span className="truncate max-w-[120px]">{selectedMotivo}</span>
                                    <button onClick={() => setSelectedMotivo(null)} className="text-blue-400 hover:text-red-500">×</button>
                                </div>
                            )}
                             {selectedResponsable && (
                                <div className="text-xs flex items-center justify-between bg-white p-2 rounded border border-blue-100 text-blue-600">
                                    <span className="truncate max-w-[120px]">{selectedResponsable}</span>
                                    <button onClick={() => setSelectedResponsable(null)} className="text-blue-400 hover:text-red-500">×</button>
                                </div>
                            )}
                            <button 
                                onClick={() => { setSelectedMotivo(null); setSelectedResponsable(null); }}
                                className="mt-2 text-xs font-bold text-blue-600 hover:underline text-center"
                            >
                                Limpiar Todo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* KPIs - Reduced to 2 columns to fill space */}
            <div className="xl:col-span-10 grid grid-cols-1 md:grid-cols-2 gap-6 h-min">
                 {/* KPI 1 */}
                 <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
                     <div className="relative z-10">
                         <div className="flex items-center gap-2 mb-2">
                             <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md">
                                 <Icons.ClipboardCheck className="w-4 h-4" />
                             </div>
                             <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Reclamos (OR Únicas)</h3>
                         </div>
                         <div className="text-5xl font-extrabold text-slate-800 tracking-tight mt-2">
                             {uniqueClaimsCount}
                         </div>
                         <p className="text-sm text-slate-400 mt-1">Clientes con reclamos registrados</p>
                     </div>
                 </div>

                 {/* KPI 3 (Moved to 2nd position) */}
                 <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition-all">
                     <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 opacity-50 group-hover:scale-110 transition-transform"></div>
                     <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                             <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-md">
                                 <Icons.BarChart className="w-4 h-4" />
                             </div>
                             <h3 className="text-slate-500 text-xs font-bold uppercase tracking-wider">Puntos de Dolor</h3>
                         </div>
                         <div className="text-5xl font-extrabold text-slate-800 tracking-tight mt-2">
                             {totalTagsDetected}
                         </div>
                         <p className="text-sm text-slate-400 mt-1">Total motivos identificados</p>
                     </div>
                 </div>
            </div>
        </div>

        {/* Row 2: Charts Area */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            
            {/* Chart: Motivos de Reclamo (Scrollable) - Made Wider */}
             <div className="xl:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <h3 className="text-slate-800 font-bold text-sm uppercase tracking-wide">Motivos de Reclamo</h3>
                        {selectedMotivo && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                Filtrando por: {selectedMotivo}
                            </span>
                        )}
                         {selectedResponsable && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                                Asesor: {selectedResponsable}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">Clic en la barra para filtrar</span>
                </div>
                
                {/* Scrollable Container */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white relative" style={{ maxHeight: '600px' }}>
                    <div style={{ height: `${dynamicChartHeight}px`, width: '100%', minWidth: '500px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                layout="vertical" 
                                data={motivoChartData} 
                                margin={{ top: 20, right: 50, left: 10, bottom: 20 }}
                                barCategoryGap={4}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    type="category" 
                                    dataKey="name" 
                                    width={280} 
                                    tick={{fontSize: 11, fill: '#64748b', fontWeight: 500, cursor: 'pointer'}} 
                                    interval={0} 
                                    onClick={(data) => handleMotivoClick(data.value)}
                                />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc', opacity: 0.5}} 
                                    contentStyle={{
                                        fontSize: '12px', 
                                        borderRadius: '8px', 
                                        border: '1px solid #e2e8f0', 
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        padding: '8px 12px'
                                    }} 
                                />
                                <Bar 
                                    dataKey="value" 
                                    barSize={20} 
                                    radius={[0, 4, 4, 0]} 
                                    label={{ position: 'right', fill: '#94a3b8', fontSize: 11, fontWeight: 600, dx: 5 }}
                                    onClick={(data) => handleMotivoClick(data.name)}
                                    cursor="pointer"
                                >
                                    {motivoChartData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={selectedMotivo === entry.name ? "#2563EB" : "#94A3B8"} 
                                            className="transition-all duration-300 hover:opacity-80"
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Right Column: Resolution & Sectors */}
            <div className="xl:col-span-4 flex flex-col gap-8">
                
                {/* Chart: Resolución (Pie/Donut) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[320px]">
                    <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/30">
                        <h3 className="text-slate-800 font-bold text-sm uppercase tracking-wide">Resolución de Casos</h3>
                    </div>
                    <div className="flex-1 relative">
                        {resolutionChartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={resolutionChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {resolutionChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                         contentStyle={{fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                                No hay datos de resolución disponibles
                            </div>
                        )}
                        {/* Center Label for Donut */}
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <div className="text-center">
                                 <span className="text-2xl font-bold text-slate-800">
                                     {resolutionChartData.find(d => d.name === 'Resuelto')?.value || 0}
                                 </span>
                                 <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Resueltos</span>
                             </div>
                         </div>
                    </div>
                </div>

                {/* Chart: Reclamos por Sector */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[300px]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                        <h3 className="text-slate-800 font-bold text-sm uppercase tracking-wide">Áreas Afectadas</h3>
                    </div>
                    <div className="flex-1 p-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart layout="vertical" data={sectorChartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10, fill: '#64748b', fontWeight: 500}} interval={0} />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}} 
                                    contentStyle={{fontSize: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                />
                                <Bar dataKey="value" fill="#3B82F6" barSize={18} radius={[0, 4, 4, 0]}>
                                    {sectorChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill="#3B82F6" />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>

        {/* Row 3: Data Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Responsable Table (Interactive) */}
            <div className="xl:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[600px] flex flex-col">
                <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Asesor Responsable</span>
                    <span className="text-[10px] bg-white border border-slate-200 text-slate-500 px-2 py-0.5 rounded shadow-sm">
                        Clic para filtrar
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <table className="w-full text-xs">
                        <tbody>
                            {responsableTableData.map((r, i) => {
                                const isSelected = selectedResponsable === r.name;
                                return (
                                    <tr 
                                        key={i} 
                                        className={`
                                            transition-all cursor-pointer rounded-lg border-b border-transparent
                                            ${isSelected 
                                                ? 'bg-blue-600 text-white shadow-md transform scale-[1.02]' 
                                                : 'hover:bg-slate-50 text-slate-600 border-slate-50'
                                            }
                                        `}
                                        onClick={() => setSelectedResponsable(isSelected ? null : r.name)}
                                    >
                                        <td className="p-3 font-medium rounded-l-lg">{r.name}</td>
                                        <td className={`p-3 text-right font-bold rounded-r-lg ${isSelected ? 'text-blue-100' : 'text-slate-900'}`}>{r.value}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 p-3 border-t border-slate-200 text-xs font-medium text-slate-500 text-center">
                   {uniqueClaimsCount} reclamos listados
                </div>
            </div>

             {/* Detail Table */}
             <div className="xl:col-span-9 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-[600px] flex flex-col">
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                    <div className="px-6 py-4 w-1/4 font-bold text-xs text-slate-500 uppercase tracking-widest">Cliente / OR</div>
                    <div className="px-6 py-4 w-3/4 font-bold text-xs text-slate-500 uppercase tracking-widest">Detalle del Reclamo</div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left border-collapse">
                        <tbody>
                            {displayData.slice(0, 100).map((record, idx) => {
                                // Determine resolution status styling
                                const isResolved = record.resuelto?.toLowerCase().includes('si');
                                const isNotResolved = record.resuelto?.toLowerCase().includes('no');
                                
                                return (
                                <tr key={idx} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors group">
                                    <td className="px-6 py-5 w-1/4 align-top border-r border-slate-50">
                                        <div className="text-slate-900 font-bold text-xs mb-2">{record.cliente}</div>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                                OR: {record.orden}
                                            </span>
                                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                                {record.sucursal}
                                            </span>
                                        </div>
                                        {record.responsable && (
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 group-hover:text-blue-500 transition-colors">
                                                <Icons.Users className="w-3 h-3" />
                                                {normalizeString(record.responsable)}
                                            </div>
                                        )}
                                        {/* Resolution Badge in First Col */}
                                        {(isResolved || isNotResolved) && (
                                            <div className={`mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border ${isResolved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isResolved ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                {isResolved ? 'RESUELTO' : 'NO RESUELTO'}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 w-3/4 text-sm text-slate-600 leading-relaxed align-top flex flex-col gap-3">
                                        <div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Motivo / Observación</span>
                                            {record.observacion 
                                                ? record.observacion 
                                                : <span className="italic text-slate-300">Sin descripción detallada</span>
                                            }
                                        </div>
                                        
                                        {record.motivo && record.motivo !== 'Sin Motivo' && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {record.motivo.split(/[,;\n\r]+/).map((tag, tIdx) => {
                                                    const trimmedTag = normalizeString(tag);
                                                    if (!trimmedTag || ['Motivos Varios', 'Sin Motivo', 'Sin motivo'].includes(trimmedTag)) return null;
                                                    
                                                    const isSelected = selectedMotivo === trimmedTag;
                                                    
                                                    return (
                                                        <span key={tIdx} className={`text-[11px] px-2.5 py-0.5 rounded-full border transition-colors ${
                                                            isSelected 
                                                            ? 'bg-blue-600 text-white border-blue-600 font-medium' 
                                                            : 'bg-white text-slate-500 border-slate-200'
                                                        }`}>
                                                            {trimmedTag}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        
                                        {/* Resolution Observation Box */}
                                        {record.observacion_resolucion && (
                                             <div className="mt-2 bg-slate-50 border-l-2 border-slate-300 pl-3 py-1 text-xs text-slate-500 italic">
                                                 <span className="font-bold text-slate-400 not-italic text-[10px] uppercase mr-2">Resolución:</span>
                                                 {record.observacion_resolucion}
                                             </div>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>

      </main>
    </div>
  );
};

export default QualityDashboard;