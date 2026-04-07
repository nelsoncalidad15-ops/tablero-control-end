import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { DashboardFrame, LuxuryKPICard, SkeletonLoader, StatusBadge, InsightCard } from './DashboardUI';
import { AutoRecord, LoadingState, AreaConfig } from '../types';
import { fetchSheetData } from '../services/dataService';
import GaugeChart from './GaugeChart';
import { Icons } from './Icon';
import { MOCK_DATA, MONTHS, YEARS } from '../constants';

interface DashboardProps {
  area: AreaConfig;
  sheetUrl: string;
  apiKey: string;
  onBack: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ area, sheetUrl, apiKey, onBack }) => {
  const [data, setData] = useState<AutoRecord[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [isAIpanelOpen, setIsAIpanelOpen] = useState(false);

  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(2026);
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

  if (loadingState === LoadingState.LOADING) return <SkeletonLoader />;

  if (loadingState === LoadingState.ERROR) return (
    <div className="bg-rose-50 border border-rose-100 text-rose-700 p-8 rounded-[2.5rem] flex items-center gap-6 max-w-2xl mx-auto mt-12">
        <div className="p-4 bg-rose-100 rounded-2xl">
          <Icons.AlertTriangle className="w-8 h-8" />
        </div>
        <div>
            <h3 className="font-black uppercase tracking-tight text-lg">Error de Conexión</h3>
            <p className="text-sm font-bold opacity-70">No se pudieron cargar los datos del tablero.</p>
        </div>
    </div>
  );

  const filters = (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6">
        <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Icons.Calendar className="w-3 h-3 text-blue-500" />
          Año
        </h3>
        <div className="flex flex-wrap gap-2">
          {YEARS.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedYear === year
                ? 'bg-slate-950 text-white shadow-lg shadow-slate-900/20'
                : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-300'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6">
        <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Icons.MapPin className="w-3 h-3 text-emerald-500" />
          Sucursales
        </h3>
        <div className="space-y-2">
          {availableBranches.map(branch => (
            <label key={branch} className="flex items-center gap-3 group cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="relative flex items-center">
                <input 
                  type="checkbox"
                  checked={selectedBranches.includes(branch)}
                  onChange={() => toggleBranch(branch)}
                  className="peer appearance-none w-5 h-5 border-2 border-slate-100 rounded-lg checked:bg-slate-950 checked:border-slate-950 transition-all"
                />
                <Icons.Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 left-1 transition-opacity" />
              </div>
              <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-950 transition-colors uppercase tracking-tight">{branch}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <DashboardFrame
      title={`Tablero ${area.name}`}
      subtitle="Intelligence Control Panel"
      lastUpdated={new Date().toLocaleTimeString()}
      filters={filters}
      onExport={() => alert('Exportando reporte...')}
      onBack={onBack}
    >
      <div className="space-y-12 pb-20">
        {/* Month Selector */}
        <div className="bg-white rounded-[2.5rem] p-4 overflow-x-auto no-scrollbar border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 min-w-max">
            <button
              onClick={() => setSelectedMonth(null)}
              className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                !selectedMonth ? 'bg-slate-950 text-white shadow-xl shadow-slate-900/20' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              TODOS
            </button>
            {MONTHS.map(month => (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all ${
                  selectedMonth === month ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {month}
              </button>
            ))}
          </div>
        </div>

        {/* AI Insights Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <InsightCard 
            title="Análisis Predictivo"
            content={`Basado en el avance actual del ${metrics.percent.toFixed(1)}%, se proyecta un cumplimiento sólido para el cierre del periodo. Las sucursales con mayor tracción son ${selectedBranches.join(', ')}.`}
            icon={Icons.Brain}
          />
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Estado del Tablero</h4>
              <Icons.Activity className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex flex-wrap gap-3">
              <StatusBadge status={metrics.percent >= 95 ? 'success' : metrics.percent >= 85 ? 'warning' : 'error'} label={`Cumplimiento: ${metrics.percent.toFixed(1)}%`} />
              <StatusBadge status="info" label={`Días Lab: ${metrics.diasLabTotal}`} />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8">
          <LuxuryKPICard title="Métrica Diario" value={metrics.pptDiarios.toLocaleString('es-AR', { maximumFractionDigits: 2 })} color="bg-slate-950" icon={Icons.Activity} />
          <LuxuryKPICard title="Objetivo Mes" value={metrics.objMensual.toLocaleString('es-AR', { maximumFractionDigits: 0 })} color="bg-blue-600" icon={Icons.Target} />
          <LuxuryKPICard title="Avance Total" value={metrics.totalAvance.toLocaleString('es-AR', { maximumFractionDigits: 0 })} color="bg-emerald-600" icon={Icons.TrendingUp} />
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 flex flex-col items-center justify-center text-center group">
            <div className="w-full h-40">
              <GaugeChart value={metrics.percent} label="Cumplimiento" />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-4">% Cumplimiento Global</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {['Avance PPT', 'PPT Diario', 'Servicios'].map((metric, idx) => {
            const dataKeySuffix = metric === 'Avance PPT' ? 'AvancePPT' : metric === 'PPT Diario' ? 'PPTDiario' : 'Servicios';
            return (
              <div key={idx} className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-8 text-center">{metric}</h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="MesAbrev" tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 40px -10px rgb(0 0 0 / 0.1)' }} />
                      {selectedBranches.map((b, i) => (
                        <Line key={b} type="monotone" dataKey={`${b}_${dataKeySuffix}`} name={b} stroke={BRANCH_COLORS[b] || getDefaultColor(i)} strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6}} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })}
        </div>

        {/* Days Lab Table */}
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden max-w-2xl mx-auto">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic">Días Laborables</h3>
          </div>
          <div className="p-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="pb-4 text-left">Sucursal</th>
                  <th className="pb-4 text-right">Días</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {metrics.diasLabList.map((d, i) => (
                  <tr key={i} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 font-black text-slate-700 uppercase text-xs tracking-tight">{d.sucursal}</td>
                    <td className="py-4 text-right font-bold text-slate-900 font-mono">{d.dias}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-black text-slate-900 border-t-2 border-slate-100">
                  <td className="pt-4 uppercase text-xs tracking-tight italic">Total General</td>
                  <td className="pt-4 text-right font-mono text-lg">{metrics.diasLabTotal}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </DashboardFrame>
  );
};

export default Dashboard;
