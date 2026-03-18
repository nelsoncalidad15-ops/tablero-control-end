import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell, LabelList
} from 'recharts';
import { 
  TrendingUp, Filter, Calendar, MapPin, ChevronRight, 
  Info, AlertCircle, CheckCircle2, BarChart3, Activity
} from 'lucide-react';
import { DashboardFrame, LuxuryKPICard, SkeletonLoader, StatusBadge, InsightCard, DataTable } from './DashboardUI';
import { PostventaKpiRecord, LoadingState } from '../types';
import { fetchPostventaKpiData } from '../services/dataService';
import { MONTHS } from '../constants';
import { Icons } from './Icon';

interface PostventaKpiDashboardProps {
  sheetUrl: string;
  onBack?: () => void;
}

interface KpiDefinition {
  key: keyof PostventaKpiRecord;
  label: string;
  obj?: number;
  unit?: string;
  type: 'number' | 'percentage';
  better: 'higher' | 'lower';
}

const KPI_DEFS: KpiDefinition[] = [
  { key: 'lvs', label: 'LVS', obj: 4.80, type: 'number', better: 'higher' },
  { key: 'email_validos', label: 'Email Válidos', obj: 95, unit: '%', type: 'percentage', better: 'higher' },
  { key: 'tasa_respuesta', label: 'Tasa de Respuesta', obj: 30, unit: '%', type: 'percentage', better: 'higher' },
  { key: 'dac', label: 'DAC', obj: 0.2, unit: '%', type: 'percentage', better: 'lower' },
  { key: 'contrato_mantenimiento', label: 'Contrato Mantenimiento', obj: 20, type: 'number', better: 'higher' },
  { key: 'reporte_tecnico', label: 'Reporte Técnico', obj: 48, type: 'number', better: 'higher' },
  { key: 'reporte_garantia', label: 'Reporte Garantía', obj: 48, type: 'number', better: 'higher' },
  { key: 'ampliacion_trabajo', label: 'Ampliación de Trabajo', obj: 50, unit: '%', type: 'percentage', better: 'higher' },
  { key: 'ppt_diario', label: 'PPT Diario', obj: 26, type: 'number', better: 'higher' },
  { key: 'conversion_ppt_serv', label: 'Conversión PPT vs Serv', obj: 60, unit: '%', type: 'percentage', better: 'higher' },
  { key: 'oudi_servicios', label: 'OUDI Servicios', obj: 12, unit: '%', type: 'percentage', better: 'higher' },
  { key: 'costos_controlables', label: 'Costos Controlables', obj: 80, unit: '%', type: 'percentage', better: 'lower' },
  { key: 'costo_sueldos', label: 'Costo Sueldos', obj: 60, unit: '%', type: 'percentage', better: 'lower' },
  { key: 'stock_muerto', label: 'Stock Muerto', obj: 15, unit: '%', type: 'percentage', better: 'lower' },
  { key: 'meses_stock', label: 'Meses de Stock', obj: 4, unit: 'M', type: 'number', better: 'lower' },
  { key: 'cotizacion_seguros', label: 'Cotización Seguros', type: 'number', better: 'higher' },
  { key: 'uodi_repuestos', label: 'UDIG Repuestos', obj: 7, unit: '%', type: 'percentage', better: 'higher' },
  { key: 'uodi_posventa', label: 'UODI Posventa', obj: 6.33, unit: '%', type: 'percentage', better: 'higher' },
  { key: 'incentivo_calidad', label: 'Incentivo Calidad', type: 'number', better: 'higher' },
  { key: 'plan_incentivo_posventa', label: 'Plan Incentivo Posventa', type: 'number', better: 'higher' },
  { key: 'plan_incentivo_repuestos', label: 'Plan Incentivo Repuestos', obj: 120, unit: '%', type: 'percentage', better: 'higher' },
];

const PostventaKpiDashboard: React.FC<PostventaKpiDashboardProps> = ({ sheetUrl, onBack }) => {
  const [data, setData] = useState<PostventaKpiRecord[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([]);
  const [activeKpi, setActiveKpi] = useState<KpiDefinition>(KPI_DEFS[0]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(LoadingState.LOADING);
      try {
        const result = await fetchPostventaKpiData(sheetUrl);
        setData(result);
        
        // Initial filters
        const uniqueBranches = Array.from(new Set(result.map(d => d.sucursal))).sort();
        const uniqueYears = Array.from(new Set(result.map(d => d.anio))).sort((a, b) => b - a);
        
        setSelectedBranches(uniqueBranches);
        setSelectedYears(uniqueYears.length > 0 ? [uniqueYears[0]] : []);
        setSelectedMonths([]); // Empty means "All" or "Anual" in some contexts, but here we'll treat it as all
        
        setLoading(LoadingState.SUCCESS);
      } catch (error) {
        setLoading(LoadingState.ERROR);
      }
    };
    loadData();
  }, [sheetUrl]);

  const uniqueValues = useMemo(() => ({
    branches: Array.from(new Set(data.map(d => d.sucursal))).sort(),
    months: MONTHS,
    years: Array.from(new Set(data.map(d => d.anio))).sort((a, b) => b - a)
  }), [data]);

  const toggleFilter = (list: any[], value: any, setter: (val: any[]) => void) => {
    if (list.includes(value)) {
      setter(list.filter(item => item !== value));
    } else {
      setter([...list, value]);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter(d => {
      const matchBranch = selectedBranches.length === 0 || selectedBranches.includes(d.sucursal);
      const matchMonth = selectedMonths.length === 0 || selectedMonths.includes(d.mes);
      const matchYear = selectedYears.length === 0 || selectedYears.includes(d.anio);
      return matchBranch && matchMonth && matchYear;
    });
  }, [data, selectedBranches, selectedMonths, selectedYears]);

  const trendData = useMemo(() => {
    const baseData = data.filter(d => {
      const matchBranch = selectedBranches.length === 0 || selectedBranches.includes(d.sucursal);
      const matchYear = selectedYears.length === 0 || selectedYears.includes(d.anio);
      return matchBranch && matchYear;
    });

    const monthGroups: Record<string, number[]> = {};
    baseData.forEach(d => {
      const val = d[activeKpi.key];
      if (val !== null && val !== undefined) {
        if (!monthGroups[d.mes]) monthGroups[d.mes] = [];
        monthGroups[d.mes].push(val as number);
      }
    });

    return MONTHS.map(m => {
      const vals = monthGroups[m];
      return {
        mes: m,
        valor: vals && vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
      };
    }).filter(d => d.valor !== null);
  }, [data, selectedBranches, selectedYears, activeKpi]);

  const getStatusColor = (val: number | null, kpi: KpiDefinition) => {
    if (val === null || kpi.obj === undefined) return 'text-slate-300';
    const isHigherBetter = kpi.better === 'higher';
    const met = isHigherBetter ? val >= kpi.obj : val <= kpi.obj;
    return met ? 'text-emerald-500' : 'text-rose-500';
  };

  const formatValue = (val: number | null | undefined, kpi: KpiDefinition) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    const formatted = val.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    return `${formatted}${kpi.unit || ''}`;
  };

  // if (loading === LoadingState.LOADING) return <SkeletonLoader />;

  const currentKpiValue = filteredData.length > 0 
    ? filteredData.reduce((acc, curr) => acc + (curr[activeKpi.key] as number || 0), 0) / filteredData.length
    : null;

  const tableColumns = [
    { accessor: 'sucursal', header: 'Sucursal' },
    { accessor: 'mes', header: 'Mes' },
    { accessor: 'anio', header: 'Año' },
    ...KPI_DEFS.map(kpi => ({
      accessor: kpi.key as string,
      header: kpi.label,
      render: (val: any) => (
        <span className={`font-black italic ${getStatusColor(val, kpi)}`}>
          {formatValue(val, kpi)}
        </span>
      )
    }))
  ];

  return (
    <DashboardFrame
      title="Gestión de KPIs Postventa"
      subtitle="Performance & Operations Monitoring"
      lastUpdated={new Date().toLocaleTimeString()}
      filters={null}
      isLoading={loading === LoadingState.LOADING}
      onBack={onBack}
      onExport={() => alert('Exportando reporte de KPIs...')}
    >
      <div className="space-y-8 pb-20">
        {/* Sticky Filter Bar */}
        <div className="sticky top-[80px] z-30 -mx-6 px-10 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 mb-8 shadow-sm transition-all">
          <div className="max-w-[1600px] mx-auto flex flex-col gap-4">
            {/* Years Filter */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center gap-2 min-w-[80px]">
                <Icons.Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Año</span>
              </div>
              <div className="flex gap-2">
                {uniqueValues.years.map(y => (
                  <button
                    key={y}
                    onClick={() => toggleFilter(selectedYears, y, setSelectedYears)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${
                      selectedYears.includes(y)
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* Months Filter */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center gap-2 min-w-[80px]">
                <Icons.Clock className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mes</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedMonths([])}
                  className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${
                    selectedMonths.length === 0
                      ? 'bg-slate-950 text-white border-slate-950 shadow-lg scale-105'
                      : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                  }`}
                >
                  Anual
                </button>
                {uniqueValues.months.map(m => (
                  <button
                    key={m}
                    onClick={() => toggleFilter(selectedMonths, m, setSelectedMonths)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${
                      selectedMonths.includes(m)
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105'
                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {m.substring(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Branches Filter */}
            <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-1">
              <div className="flex items-center gap-2 min-w-[80px]">
                <Icons.MapPin className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sucursal</span>
              </div>
              <div className="flex gap-2">
                {uniqueValues.branches.map(b => (
                  <button
                    key={b}
                    onClick={() => toggleFilter(selectedBranches, b, setSelectedBranches)}
                    className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border ${
                      selectedBranches.includes(b)
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg scale-105'
                        : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trend Chart - Large and Central */}
        <div className="bg-white p-10 rounded-[3rem] flex flex-col shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-blue-500/20">
                <Icons.BarChart className="text-white w-8 h-8" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-950 uppercase tracking-tight italic">Tendencia de Desempeño</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {activeKpi.label} <span className="mx-2 text-slate-200">|</span> {selectedBranches.length === uniqueValues.branches.length ? 'Todas las Sucursales' : selectedBranches.join(', ')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-3xl border border-slate-100">
              <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Valor Promedio</span>
                <span className="text-xl font-black text-slate-950 italic">{formatValue(currentKpiValue, activeKpi)}</span>
              </div>
              {activeKpi.obj !== undefined && (
                <div className="px-6 py-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Objetivo Meta</span>
                  <span className="text-xl font-black text-slate-400 italic">{activeKpi.obj}{activeKpi.unit || ''}</span>
                </div>
              )}
            </div>
          </div>

          <div className="h-[500px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 40, right: 40, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="mes" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fontWeight: 'black', fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  domain={['auto', 'auto']}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '2rem', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', padding: '24px' }}
                  formatter={(value: number) => [formatValue(value, activeKpi), activeKpi.label]}
                />
                <Line 
                  type="monotone" 
                  dataKey="valor" 
                  stroke="#2563eb" 
                  strokeWidth={6} 
                  dot={{ r: 6, fill: '#2563eb', strokeWidth: 4, stroke: '#fff' }}
                  activeDot={{ r: 10, strokeWidth: 0 }}
                  name={activeKpi.label}
                  animationDuration={1500}
                >
                  <LabelList 
                    dataKey="valor" 
                    position="top" 
                    content={(props: any) => {
                      const { x, y, value } = props;
                      if (value === null || value === undefined) return null;
                      return (
                        <text 
                          x={x} 
                          y={y - 20} 
                          fill="#2563eb" 
                          fontSize={12} 
                          fontFamily="Inter"
                          fontWeight="900" 
                          textAnchor="middle"
                        >
                          {formatValue(value, activeKpi)}
                        </text>
                      );
                    }}
                  />
                </Line>
                {activeKpi.obj !== undefined && (
                  <Line 
                    type="step" 
                    dataKey={() => activeKpi.obj} 
                    stroke="#cbd5e1" 
                    strokeDasharray="10 10" 
                    strokeWidth={2}
                    dot={false}
                    name="Objetivo"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {KPI_DEFS.map((kpi, idx) => {
            const avgVal = filteredData.length > 0 
              ? filteredData.reduce((acc, curr) => acc + (curr[kpi.key] as number || 0), 0) / filteredData.length
              : null;
            
            const isActive = activeKpi.key === kpi.key;

            return (
              <button
                key={kpi.key}
                onClick={() => setActiveKpi(kpi)}
                className={`p-8 rounded-[2.5rem] border transition-all text-left relative overflow-hidden group ${
                  isActive 
                    ? 'bg-slate-950 border-slate-950 shadow-2xl shadow-slate-900/40 scale-[1.02]' 
                    : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-xl hover:shadow-slate-200/40'
                }`}
              >
                <div className="flex justify-between items-start mb-8">
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isActive ? 'text-blue-400' : 'text-slate-400'}`}>
                    {kpi.label}
                  </span>
                  {kpi.obj !== undefined && (
                    <div className={`text-[9px] font-black px-3 py-1.5 rounded-xl ${isActive ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}>
                      OBJ: {kpi.obj}{kpi.unit || ''}
                    </div>
                  )}
                </div>
                
                <div className="flex items-baseline gap-3">
                  <span className={`text-3xl font-black italic tracking-tighter ${isActive ? 'text-white' : 'text-slate-950'}`}>
                    {formatValue(avgVal, kpi)}
                  </span>
                  {kpi.obj !== undefined && avgVal !== null && (
                    <div className={`flex items-center ${getStatusColor(avgVal, kpi)}`}>
                      {(kpi.better === 'higher' ? avgVal >= kpi.obj : avgVal <= kpi.obj) 
                        ? <Icons.CheckCircle2 className="w-3.5 h-3.5" /> 
                        : <Icons.AlertCircle className="w-3.5 h-3.5" />
                      }
                    </div>
                  )}
                </div>

                {isActive && (
                  <div className="absolute -right-4 -bottom-4 text-white/5">
                    <Icons.TrendingUp className="w-20 h-20" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-10 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight italic">Detalle de Gestión</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Listado completo de indicadores por sucursal y periodo</p>
            </div>
          </div>
          <DataTable 
            data={filteredData}
            columns={tableColumns}
            pageSize={12}
          />
        </div>
      </div>
    </DashboardFrame>
  );
};

export default PostventaKpiDashboard;
