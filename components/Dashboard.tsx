import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { Icons } from './Icon';
import AIPanel from './AIPanel';
import GaugeChart from './GaugeChart';
import { fetchSheetData } from '../services/dataService';
import { AutoRecord, LoadingState, AreaConfig } from '../types';
import { MOCK_DATA, MONTHS, YEARS } from '../constants';

interface DashboardProps {
  area: AreaConfig;
  sheetUrl: string;
  apiKey: string;
  onBack: () => void;
  onOpenSettings: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ area, sheetUrl, apiKey, onBack, onOpenSettings }) => {
  const [data, setData] = useState<AutoRecord[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [isAIpanelOpen, setIsAIpanelOpen] = useState(false);

  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [availableBranches, setAvailableBranches] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoadingState(LoadingState.LOADING);
      try {
        if (!sheetUrl) {
          // If no sheet URL, we might want to show mock data or empty state
          // For now, let's show mock data but maybe we could show a "Connect Sheet" prompt
          setData(MOCK_DATA);
          setAvailableBranches([...new Set(MOCK_DATA.map(d => d.sucursal))]);
          setLoadingState(LoadingState.SUCCESS);
        } else {
          const fetchedData = await fetchSheetData(sheetUrl);
          setData(fetchedData);
          const branches = [...new Set(fetchedData.map(d => d.sucursal))].sort();
          setAvailableBranches(branches);
          
          // Initial selection logic
          if (branches.length > 0) {
              // Try to preserve selection if switching areas, otherwise default
              setSelectedBranches(branches.slice(0, 2)); 
          }
          
          setLoadingState(LoadingState.SUCCESS);
        }
      } catch (error) {
        console.error(error);
        setLoadingState(LoadingState.ERROR);
      }
    };

    loadData();
  }, [sheetUrl]); // Reload when sheetUrl changes

  const toggleBranch = (branch: string) => {
    if (selectedBranches.includes(branch)) {
      setSelectedBranches(selectedBranches.filter(b => b !== branch));
    } else {
      setSelectedBranches([...selectedBranches, branch]);
    }
  };

  // --- Filtering & Aggregation ---
  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchYear = item.anio === selectedYear;
      const matchMonth = selectedMonth ? item.mes === selectedMonth : true;
      const matchBranch = selectedBranches.length === 0 || selectedBranches.includes(item.sucursal);
      return matchYear && matchMonth && matchBranch;
    });
  }, [data, selectedYear, selectedMonth, selectedBranches]);

  const chartData = useMemo(() => {
    return MONTHS.map(m => {
      const entry: any = { MesAbrev: m };
      (availableBranches.length > 0 ? availableBranches : []).forEach(b => {
        const records = data.filter(d => d.mes === m && d.sucursal === b && d.anio === selectedYear);
        entry[`${b}_AvancePPT`] = records.reduce((s, r) => s + r.avance_ppt, 0);
        entry[`${b}_PPTDiario`] = records.reduce((s, r) => s + r.ppt_diarios, 0);
        entry[`${b}_Servicios`] = records.reduce((s, r) => s + r.servicios_diarios, 0);
      });
      return entry;
    });
  }, [data, selectedYear, availableBranches]); 

  const metrics = useMemo(() => {
    const pptDiarios = filteredData.reduce((sum, item) => sum + item.ppt_diarios, 0);
    const objMensual = filteredData.reduce((sum, item) => sum + item.objetivo_mensual, 0);
    const totalAvance = filteredData.reduce((sum, item) => sum + item.avance_ppt, 0);
    
    const diasLabMap = new Map<string, number>();
    filteredData.forEach(d => {
        const current = diasLabMap.get(d.sucursal) || 0;
        diasLabMap.set(d.sucursal, current + d.dias_laborables);
    });
    
    const diasLabTotal = Array.from(diasLabMap.values()).reduce((a,b) => a+b, 0);
    const diasLabList = Array.from(diasLabMap.entries()).map(([k,v]) => ({ sucursal: k, dias: v }));
    const percent = objMensual > 0 ? (totalAvance / objMensual) * 100 : 0;

    return { pptDiarios, objMensual, totalAvance, percent, diasLabTotal, diasLabList };
  }, [filteredData]);

  // Colors
  const BRANCH_COLORS: Record<string, string> = {
    'Jujuy': '#2563EB', 'Salta': '#1E3A8A', 'Express': '#10B981', 'Taller Movil': '#F59E0B', 'Tartagal': '#EF4444'
  };
  const getDefaultColor = (idx: number) => Object.values(BRANCH_COLORS)[idx % 5];

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5]">
        
      {/* Header */}
      <header className="bg-black text-white p-4 flex items-center justify-between shadow-md z-20 relative">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="hover:bg-gray-800 p-2 rounded-full transition-colors" title="Volver al Portal">
                <Icons.ArrowLeft className="w-5 h-5 text-gray-300" />
            </button>
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-bold text-xs border-2 border-slate-300">
                    VW
                </div>
                <span className="text-2xl font-bold tracking-tight">Autosol</span>
            </div>
            <div className="hidden md:block h-8 w-px bg-gray-700 mx-2"></div>
            <h1 className="text-xl font-medium hidden md:block flex items-center gap-2">
                Tablero de Control - <span className={`${area.color.replace('bg-', 'text-')} font-bold`}>{area.name}</span>
            </h1>
        </div>

        <div className="flex items-center gap-4">
            <div className="flex bg-gray-800 rounded p-1">
                {YEARS.map(year => (
                    <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
                        className={`px-4 py-1 text-sm font-medium rounded transition-colors ${selectedYear === year ? 'bg-white text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                        {year}
                    </button>
                ))}
            </div>
            <button onClick={onOpenSettings} className="text-gray-400 hover:text-white">
                <Icons.Settings className="w-6 h-6" />
            </button>
            <button onClick={() => setIsAIpanelOpen(true)} className="text-indigo-400 hover:text-indigo-300">
                <Icons.Brain className="w-6 h-6" />
            </button>
        </div>
      </header>

      {/* Month Selector */}
      <div className="bg-white border-b border-gray-200 py-3 px-4 overflow-x-auto whitespace-nowrap shadow-sm sticky top-0 z-10">
        <div className="flex gap-2 max-w-7xl mx-auto">
            <button
                onClick={() => setSelectedMonth(null)}
                className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${!selectedMonth ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
                TODOS
            </button>
            {MONTHS.map(month => (
                <button
                    key={month}
                    onClick={() => setSelectedMonth(month)}
                    className={`px-4 py-2 text-sm font-medium rounded border transition-colors ${selectedMonth === month ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                >
                    {month}
                </button>
            ))}
        </div>
      </div>

      <main className="flex-1 p-4 md:p-6 max-w-[1600px] w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Sidebar Filters */}
        <div className="md:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-700 mb-3 uppercase text-sm tracking-wider border-b pb-2">Sucursal</h3>
                <div className="space-y-2">
                    {availableBranches.map(branch => (
                        <label key={branch} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                            <input 
                                type="checkbox" 
                                checked={selectedBranches.includes(branch)}
                                onChange={() => toggleBranch(branch)}
                                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                            />
                            <span className="text-sm text-gray-700">{branch}</span>
                        </label>
                    ))}
                    {availableBranches.length === 0 && <p className="text-xs text-gray-400">Cargando...</p>}
                </div>
            </div>
             <div className="hidden md:block bg-indigo-50 p-4 rounded shadow-sm border border-indigo-100">
                <div className="flex items-center gap-2 mb-2 text-indigo-800">
                    <Icons.Sparkles className="w-4 h-4" />
                    <h3 className="font-bold text-sm">IA Insight ({area.name})</h3>
                </div>
                <p className="text-xs text-indigo-700 leading-relaxed">
                   Visualizando datos de: <strong>{sheetUrl ? 'Hoja conectada' : 'Datos Demo'}</strong>.
                </p>
                <button onClick={() => setIsAIpanelOpen(true)} className="mt-3 w-full py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700">
                    Abrir Asistente
                </button>
            </div>
        </div>

        {/* Dashboard Content */}
        <div className="md:col-span-10 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex flex-col">
                    <div className="flex justify-between items-center mb-2 border-b pb-1"><span className="font-bold text-gray-700 text-sm">Días lab</span></div>
                    <div className="flex-1 overflow-y-auto max-h-[140px]">
                        <table className="w-full text-sm">
                            <tbody>
                                {metrics.diasLabList.map((d, i) => (
                                    <tr key={i} className="border-b border-gray-50 last:border-0">
                                        <td className="py-1 text-gray-600">{d.sucursal}</td>
                                        <td className="py-1 text-right font-bold text-gray-800">{d.dias}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="font-bold text-gray-900 border-t">
                                    <td className="pt-2">Total</td>
                                    <td className="pt-2 text-right">{metrics.diasLabTotal}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-bold text-gray-900 tracking-tight">{metrics.pptDiarios.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                    <span className="text-xs font-bold text-gray-500 uppercase mt-2 tracking-wide">Métrica Diario</span>
                </div>
                <div className="bg-white p-6 rounded shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center">
                    <span className="text-4xl font-bold text-gray-900 tracking-tight">{metrics.objMensual.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
                    <span className="text-xs font-bold text-gray-500 uppercase mt-2 tracking-wide">Objetivo Mes</span>
                </div>
                <div className="bg-white p-2 rounded shadow-sm border border-gray-200">
                    <GaugeChart value={metrics.percent} label="Cumplimiento" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-80">
                 {/* Reusing Charts - Note: These column keys are specific to the autosol dataset. 
                     If other sheets have different columns, they will map to 0 unless headers match. */}
                 {['Avance PPT', 'PPT Diario', 'Servicios'].map((metric, idx) => {
                     const dataKeySuffix = metric === 'Avance PPT' ? 'AvancePPT' : metric === 'PPT Diario' ? 'PPTDiario' : 'Servicios';
                     return (
                        <div key={idx} className="bg-white p-4 rounded shadow-sm border border-gray-200 flex flex-col">
                            <h4 className="text-sm font-bold text-gray-700 mb-4 uppercase text-center border-b pb-2">{metric}</h4>
                            <div className="flex-1 w-full min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="MesAbrev" tick={{fontSize: 10}} axisLine={false} tickLine={false} interval={0} angle={-45} textAnchor="end" height={50}/>
                                        <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{fontSize: '12px'}} />
                                        {selectedBranches.map((b, i) => (
                                            <Line key={b} type="linear" dataKey={`${b}_${dataKeySuffix}`} name={b} stroke={BRANCH_COLORS[b] || getDefaultColor(i)} strokeWidth={2} dot={{r: 3}} />
                                        ))}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                     );
                 })}
            </div>
        </div>
      </main>

      {isAIpanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20" onClick={() => setIsAIpanelOpen(false)}></div>
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl p-4 animate-in slide-in-from-right duration-300">
                <button onClick={() => setIsAIpanelOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><Icons.Close className="w-6 h-6" /></button>
                <div className="h-full pt-8"><AIPanel data={filteredData} apiKey={apiKey} /></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;