import React, { useState, useMemo, useEffect } from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, ComposedChart, Line,
    ScatterChart, Scatter, LabelList
} from 'recharts';
import { DashboardFrame, LuxuryKPICard, SkeletonLoader, StatusBadge, InsightCard, DataTable, ChartWrapper } from './DashboardUI';
import { BillingRecord, LoadingState } from '../types';
import { fetchPostventaBillingData } from '../services/dataService';
import GaugeChart from './GaugeChart';
import { Icons } from './Icon';

interface PostventaBillingDashboardProps {
  sheetUrl: string;
  onBack?: () => void;
}

const PostventaBillingDashboard: React.FC<PostventaBillingDashboardProps> = ({ sheetUrl, onBack }) => {
  const [data, setData] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(LoadingState.LOADING);
        const result = await fetchPostventaBillingData(sheetUrl);
        setData(result);
        
        if (result.length > 0) {
            const years = Array.from(new Set(result.map(r => r.anio))).sort((a, b) => b - a);
            const latestYearData = result.filter(r => r.anio === years[0]);
            const latestMonth = latestYearData.sort((a, b) => b.nro_mes - a.nro_mes)[0]?.mes;
            
            if (years.length > 0) setSelectedYears([years[0]]);
            if (latestMonth) setSelectedMonths([latestMonth]);
            
            setSelectedBranches(Array.from(new Set(result.map(r => r.sucursal))));
            setSelectedAreas(Array.from(new Set(result.map(r => r.area))));
        }
        setError(null);
        setLoading(LoadingState.SUCCESS);
      } catch (err) {
        setError("Error al cargar los datos de facturación.");
        setLoading(LoadingState.ERROR);
      }
    };
    loadData();
  }, [sheetUrl]);

  const monthOrder = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const uniqueValues = useMemo(() => {
    return {
      years: Array.from(new Set(data.map(r => r.anio))).sort((a, b) => b - a),
      months: monthOrder.filter(m => data.some(r => r.mes === m)),
      branches: Array.from(new Set(data.map(r => r.sucursal))).sort(),
      areas: Array.from(new Set(data.map(r => r.area))).sort()
    };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter(r => 
      (selectedYears.length === 0 || selectedYears.includes(r.anio)) &&
      (selectedMonths.length === 0 || selectedMonths.includes(r.mes)) &&
      (selectedBranches.length === 0 || selectedBranches.includes(r.sucursal)) &&
      (selectedAreas.length === 0 || selectedAreas.includes(r.area))
    );
  }, [data, selectedYears, selectedMonths, selectedBranches, selectedAreas]);

  const toggleFilter = (list: any[], setList: React.Dispatch<React.SetStateAction<any[]>>, val: any) => {
    if (list.includes(val)) {
      setList(list.filter(item => item !== val));
    } else {
      setList([...list, val]);
    }
  };

  const stats = useMemo(() => {
    const totalObj = filteredData.reduce((acc, r) => acc + r.objetivo_mensual, 0);
    const totalAvance = filteredData.reduce((acc, r) => acc + r.avance_fecha, 0);
    const avgCumplimiento = totalObj > 0 ? (totalAvance / totalObj) * 100 : 0;
    
    const branchStats: Record<string, { obj: number, avance: number, cumplimiento: number }> = {};
    selectedBranches.forEach(branch => {
      const branchData = filteredData.filter(r => r.sucursal === branch);
      const obj = branchData.reduce((acc, r) => acc + r.objetivo_mensual, 0);
      const avance = branchData.reduce((acc, r) => acc + r.avance_fecha, 0);
      branchStats[branch] = {
        obj,
        avance,
        cumplimiento: obj > 0 ? (avance / obj) * 100 : 0
      };
    });

    return { totalObj, totalAvance, avgCumplimiento, branchStats };
  }, [filteredData, selectedBranches]);

  const branchComparisonData = useMemo(() => {
    const branches = Array.from(new Set(filteredData.map(r => r.sucursal)));
    return branches.map(branch => {
      const branchData = filteredData.filter(r => r.sucursal === branch);
      const obj = branchData.reduce((acc, r) => acc + r.objetivo_mensual, 0);
      const avance = branchData.reduce((acc, r) => acc + r.avance_fecha, 0);
      return {
        name: branch,
        Objetivo: obj,
        Avance: avance,
        Cumplimiento: obj > 0 ? (avance / obj) * 100 : 0
      };
    }).sort((a, b) => b.Avance - a.Avance);
  }, [filteredData]);

  const areaComparisonData = useMemo(() => {
    const areas = Array.from(new Set(filteredData.map(r => r.area)));
    return areas.map(area => {
      const areaData = filteredData.filter(r => r.area === area);
      const avance = areaData.reduce((acc, r) => acc + r.avance_fecha, 0);
      return { name: area, Avance: avance };
    });
  }, [filteredData]);

  const BRANCH_COLORS: Record<string, string> = {
    'Jujuy': '#2563EB',
    'Salta': '#1E3A8A',
    'Express': '#10B981',
    'Taller Movil': '#F59E0B',
    'Tartagal': '#EF4444',
    'Santa Fe': '#8B5CF6',
    'Movil': '#F59E0B'
  };

  const getDefaultColor = (idx: number) => ['#0f172a', '#00B0F0', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'][idx % 6];

  const annualComplianceData = useMemo(() => {
    const months = monthOrder;
    return months.map(month => {
      const entry: any = { name: month.substring(0, 3) };
      
      const monthData = data.filter(r => 
        r.mes === month && 
        (selectedYears.length === 0 || selectedYears.includes(r.anio))
      );

      selectedBranches.forEach(branch => {
        const branchMonthData = monthData.filter(r => r.sucursal === branch);
        const obj = branchMonthData.reduce((acc, r) => acc + r.objetivo_mensual, 0);
        const avance = branchMonthData.reduce((acc, r) => acc + r.avance_fecha, 0);
        entry[branch] = obj > 0 ? (avance / obj) * 100 : 0;
      });

      return entry;
    });
  }, [data, selectedYears, selectedBranches]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);

  const getComplianceColor = (val: number) => {
    if (val < 90) return 'bg-rose-500';
    if (val < 95) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // if (loading === LoadingState.LOADING) return <SkeletonLoader />;

  if (error) return (
    <div className="bg-rose-50 border border-rose-100 text-rose-700 p-8 rounded-[2.5rem] flex items-center gap-6 max-w-2xl mx-auto mt-12">
        <div className="p-4 bg-rose-100 rounded-2xl">
          <Icons.AlertTriangle className="w-8 h-8" />
        </div>
        <div>
            <h3 className="font-black uppercase tracking-tight text-lg">Error de Conexión</h3>
            <p className="text-sm font-bold opacity-70">{error}</p>
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
          {uniqueValues.years.map(year => (
            <button
              key={year}
              onClick={() => toggleFilter(selectedYears, setSelectedYears, year)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedYears.includes(year)
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
          {uniqueValues.branches.map(branch => (
            <label key={branch} className="flex items-center gap-3 group cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="relative flex items-center">
                <input 
                  type="checkbox"
                  checked={selectedBranches.includes(branch)}
                  onChange={() => toggleFilter(selectedBranches, setSelectedBranches, branch)}
                  className="peer appearance-none w-5 h-5 border-2 border-slate-100 rounded-lg checked:bg-slate-950 checked:border-slate-950 transition-all"
                />
                <Icons.Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 left-1 transition-opacity" />
              </div>
              <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-950 transition-colors uppercase tracking-tight">{branch}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6">
        <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Icons.Layers className="w-3 h-3 text-indigo-500" />
          Áreas
        </h3>
        <div className="space-y-2">
          {uniqueValues.areas.map(area => (
            <label key={area} className="flex items-center gap-3 group cursor-pointer p-2 rounded-xl hover:bg-slate-50 transition-colors">
              <div className="relative flex items-center">
                <input 
                  type="checkbox"
                  checked={selectedAreas.includes(area)}
                  onChange={() => toggleFilter(selectedAreas, setSelectedAreas, area)}
                  className="peer appearance-none w-5 h-5 border-2 border-slate-100 rounded-lg checked:bg-slate-950 checked:border-slate-950 transition-all"
                />
                <Icons.Check className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 left-1 transition-opacity" />
              </div>
              <span className="text-[10px] font-black text-slate-500 group-hover:text-slate-950 transition-colors uppercase tracking-tight">{area}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <DashboardFrame
      title="Facturación Postventa"
      subtitle="Intelligence Dashboard"
      lastUpdated={new Date().toLocaleTimeString()}
      filters={null}
      isLoading={loading === LoadingState.LOADING}
      onBack={onBack}
      onExport={() => alert('Exportando reporte de facturación...')}
    >
      <div className="space-y-8 pb-20">
        {/* Sticky Filter Bar - Refined UI */}
        <div className="sticky top-[80px] z-30 -mx-6 px-10 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 mb-8 shadow-sm transition-all">
          <div className="max-w-[1600px] mx-auto flex flex-col gap-4">
            {/* Years Filter */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center gap-2 min-w-[80px]">
                <Icons.Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Año:</span>
              </div>
              <div className="flex gap-2">
                {uniqueValues.years.map(year => (
                  <button
                    key={year}
                    onClick={() => toggleFilter(selectedYears, setSelectedYears, year)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                      selectedYears.includes(year)
                      ? 'bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-900/20 scale-105'
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>

            {/* Months Filter */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center gap-2 min-w-[80px]">
                <Icons.Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mes:</span>
              </div>
              <div className="flex gap-2">
                {monthOrder.map(month => {
                  const hasData = uniqueValues.months.includes(month);
                  const isSelected = selectedMonths.includes(month);
                  return (
                    <button
                      key={month}
                      disabled={!hasData}
                      onClick={() => toggleFilter(selectedMonths, setSelectedMonths, month)}
                      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                        !hasData ? 'opacity-20 cursor-not-allowed' :
                        isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-105' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      {month}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Branches Filter */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center gap-2 min-w-[80px]">
                <Icons.MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sucursal:</span>
              </div>
              <div className="flex gap-2">
                {uniqueValues.branches.map(branch => (
                  <button
                    key={branch}
                    onClick={() => toggleFilter(selectedBranches, setSelectedBranches, branch)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                      selectedBranches.includes(branch)
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-200 scale-105'
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {branch}
                  </button>
                ))}
              </div>
            </div>

            {/* Areas Filter */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-2 min-w-[80px]">
                <Icons.Layers className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Área:</span>
              </div>
              <div className="flex gap-2">
                {uniqueValues.areas.map(area => (
                  <button
                    key={area}
                    onClick={() => toggleFilter(selectedAreas, setSelectedAreas, area)}
                    className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                      selectedAreas.includes(area)
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-105'
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
          {/* Objetivo Mensual Card */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 flex flex-col group relative overflow-hidden transition-all hover:shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-slate-950"></div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-950 group-hover:scale-110 transition-transform">
                <Icons.Target className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Objetivo Mensual</span>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[150px] pr-2 no-scrollbar">
              {selectedBranches.map(b => (
                <div key={b} className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">{b}</span>
                  <span className="text-xl font-black text-slate-950 italic">
                    {formatCurrency(stats.branchStats[b]?.obj || 0)}
                  </span>
                </div>
              ))}
            </div>
            {selectedBranches.length > 1 && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-900 uppercase">Total</span>
                <span className="text-2xl font-black text-slate-950 italic">{formatCurrency(stats.totalObj)}</span>
              </div>
            )}
          </div>

          {/* Avance a la Fecha Card */}
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-8 flex flex-col group relative overflow-hidden transition-all hover:shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-600"></div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Icons.TrendingUp className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Avance a la Fecha</span>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto max-h-[150px] pr-2 no-scrollbar">
              {selectedBranches.map(b => (
                <div key={b} className="flex justify-between items-center border-b border-slate-50 pb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase">{b}</span>
                  <span className="text-xl font-black text-slate-950 italic">
                    {formatCurrency(stats.branchStats[b]?.avance || 0)}
                  </span>
                </div>
              ))}
            </div>
            {selectedBranches.length > 1 && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-900 uppercase">Total</span>
                <span className="text-2xl font-black text-blue-600 italic">{formatCurrency(stats.totalAvance)}</span>
              </div>
            )}
          </div>
          
          {/* Enhanced Compliance Gauge Card */}
          <div className="bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-800 p-8 flex flex-col group relative overflow-hidden transition-all hover:shadow-blue-900/20">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Icons.Activity className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">% Cumplimiento Actual</span>
            </div>
            
            <div className={`grid ${selectedBranches.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-4 flex-1 overflow-y-auto max-h-[200px] pr-2 custom-scrollbar`}>
              {selectedBranches.map(b => (
                <div key={b} className="flex flex-col items-center justify-center p-2 bg-white/5 rounded-2xl border border-white/5 shadow-sm">
                  <div className="w-full h-20">
                    <GaugeChart value={stats.branchStats[b]?.cumplimiento || 0} label="" />
                  </div>
                  <div className="mt-1 text-center">
                    <p className="text-[8px] font-black text-slate-400 uppercase truncate w-full px-1">{b}</p>
                    <p className="text-xs font-black text-white italic">{(stats.branchStats[b]?.cumplimiento || 0).toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedBranches.length > 1 && (
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-400 uppercase">Promedio</span>
                <span className="text-2xl font-black text-white italic">{stats.avgCumplimiento.toFixed(1)}%</span>
              </div>
            )}
            {selectedBranches.length === 1 && (
              <div className="mt-4 text-center">
                <p className="text-4xl font-black text-white italic">{stats.avgCumplimiento.toFixed(1)}%</p>
              </div>
            )}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          <ChartWrapper title="Tendencia de Cumplimiento Anual" subtitle="Evolución porcentual por mes y sucursal">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={annualComplianceData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '20px' }}
                    formatter={(val: any) => [`${val.toFixed(1)}%`, 'Cumplimiento']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', paddingBottom: '20px'}} />
                  {selectedBranches.map((branch, index) => (
                    <Bar 
                      key={branch} 
                      dataKey={branch} 
                      name={branch}
                      fill={BRANCH_COLORS[branch] || getDefaultColor(index)} 
                      radius={[4, 4, 0, 0]} 
                      barSize={selectedBranches.length > 3 ? 8 : 15} 
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartWrapper>

          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic mb-10">Rendimiento por Sucursal</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchComparisonData} margin={{ top: 40, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val/1000000}M`} tick={{fontSize: 10, fontWeight: 'black', fill: '#94a3b8'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '20px' }}
                    formatter={(val: any) => formatCurrency(val)}
                  />
                  <Bar dataKey="Avance" radius={[12, 12, 0, 0]} barSize={60}>
                    {branchComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#0f172a', '#00B0F0', '#10b981', '#f59e0b'][index % 4]} />
                    ))}
                    <LabelList 
                      dataKey="Avance" 
                      position="top" 
                      content={(props: any) => {
                        const { x, y, width, value } = props;
                        return (
                          <text x={x + width / 2} y={y - 15} fill="#64748b" fontSize={10} fontWeight="black" textAnchor="middle">
                            {formatCurrency(value)}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 p-10">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight italic mb-10">Distribución por Área</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={areaComparisonData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="Avance"
                    label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {areaComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#0f172a', '#00B0F0', '#10b981', '#f59e0b'][index % 4]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}
                    formatter={(val: any) => formatCurrency(val)}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', paddingTop: '20px'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Table */}
        <DataTable 
          title="Detalle de Gestión"
          subtitle="Análisis granular de operaciones"
          data={filteredData}
          columns={[
            { 
              header: 'Sucursal / Área', 
              accessor: 'sucursal',
              render: (val: string, row: BillingRecord) => (
                <div>
                  <div className="font-black text-slate-900 uppercase text-sm tracking-tight">{val}</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 opacity-60">{row.area}</div>
                </div>
              )
            },
            { 
              header: 'Objetivo', 
              accessor: 'objetivo_mensual', 
              render: (val: number) => <span className="text-sm font-bold text-slate-500 font-mono">{formatCurrency(val)}</span>
            },
            { 
              header: 'Avance', 
              accessor: 'avance_fecha', 
              render: (val: number) => <span className="text-sm font-black text-slate-900 font-mono">{formatCurrency(val)}</span>
            },
            { 
              header: 'Cumplimiento', 
              accessor: 'cumplimiento_fecha_pct', 
              render: (val: number) => (
                <div className="flex flex-col items-center gap-2">
                  <StatusBadge 
                    status={val >= 95 ? 'success' : val >= 90 ? 'warning' : 'error'} 
                    label={`${val.toFixed(1)}%`} 
                  />
                  <div className="w-24 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${val >= 95 ? 'bg-emerald-500' : val >= 90 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={{ width: `${Math.min(val, 100)}%` }}
                    ></div>
                  </div>
                </div>
              )
            }
          ]}
          pageSize={10}
        />
      </div>
    </DashboardFrame>
  );
};

export default PostventaBillingDashboard;
