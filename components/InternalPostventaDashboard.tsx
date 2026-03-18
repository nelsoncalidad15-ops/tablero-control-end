
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell, 
  AreaChart, 
  Area,
  PieChart, 
  Pie,
  LabelList
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from './Icon';
import { DashboardFrame, ChartWrapper } from './DashboardUI';
import { InternalPostventaRecord, LoadingState } from '../types';
import { fetchInternalPostventaData } from '../services/dataService';
import { MONTHS } from '../constants';

interface InternalPostventaDashboardProps {
  sheetUrl: string;
  onBack: () => void;
}

const GaugeChart = ({ value, label, min = 0, max = 5, isDark = true }: { value: number, label: string, min?: number, max?: number, isDark?: boolean }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const radius = 80;
  const strokeWidth = 25;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="relative w-full max-w-[200px] aspect-[2/1] flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 180 100" className="w-full h-full">
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d="M 20 90 A 70 70 0 0 1 160 90"
            fill="none"
            stroke="#1e3a8a" // Dark blue from image
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
          <text x="90" y="85" textAnchor="middle" className="text-4xl font-light fill-slate-400 italic">
            {value.toFixed(2)}
          </text>
          <text x="20" y="98" textAnchor="middle" className="text-[8px] font-bold fill-slate-500">{min.toFixed(2)}</text>
          <text x="160" y="98" textAnchor="middle" className="text-[8px] font-bold fill-slate-500">{max.toFixed(2)}</text>
        </svg>
      </div>
      <div className="mt-2 text-center">
        <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic">{label}</span>
      </div>
    </div>
  );
};

const InternalPostventaDashboard: React.FC<InternalPostventaDashboardProps> = ({ sheetUrl, onBack }) => {
  const [data, setData] = useState<InternalPostventaRecord[]>([]);
  const [loading, setLoading] = useState(LoadingState.LOADING);
  const [selectedMonth, setSelectedMonth] = useState<string>('Febrero');
  const [selectedSucursal, setSelectedSucursal] = useState<string>('Todas');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(LoadingState.LOADING);
        const result = await fetchInternalPostventaData(sheetUrl);
        setData(result);
        
        // Set default month to the latest one in the data
        if (result.length > 0) {
          const availableMonths = Array.from(new Set(result.map(r => r.mes))).filter(m => m && m !== 'Unknown');
          const latestMonth = availableMonths.sort((a, b) => MONTHS.indexOf(b) - MONTHS.indexOf(a))[0];
          if (latestMonth) setSelectedMonth(latestMonth);
        }
        
        setLoading(LoadingState.SUCCESS);
      } catch (error) {
        console.error("Error loading internal postventa data", error);
        setLoading(LoadingState.ERROR);
      }
    };
    loadData();
  }, [sheetUrl]);

  const filteredData = useMemo(() => {
    return data.filter(r => {
      const monthMatch = selectedMonth === 'Todas' || r.mes === selectedMonth;
      const sucursalMatch = selectedSucursal === 'Todas' || r.sucursal === selectedSucursal;
      return monthMatch && sucursalMatch;
    });
  }, [data, selectedMonth, selectedSucursal]);

  const sucursales = useMemo(() => {
    const s = new Set(data.map(r => r.sucursal));
    return ['Todas', ...Array.from(s)].filter(Boolean);
  }, [data]);

  const metrics = useMemo(() => {
    const validData = filteredData.filter(r => r.servicio_prestado !== null);
    const count = validData.length || 1;
    
    const avg = (key: keyof InternalPostventaRecord) => {
      const scores = filteredData.map(r => Number(r[key])).filter(v => !isNaN(v) && v > 0);
      return scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    };
    
    return {
      lvs: avg('servicio_prestado'),
      trato: avg('trato_personal'),
      organizacion: avg('organizacion'),
      trabajoTaller: avg('trabajo_taller'),
      lavado: avg('lavado'),
      totalEncuestas: filteredData.length,
      contactados: filteredData.filter(r => r.estado === 'Contactado').length
    };
  }, [filteredData]);

  const lvsByMonth = useMemo(() => {
    const months = MONTHS;
    return months.map(m => {
      const monthData = data.filter(r => r.mes === m && (selectedSucursal === 'Todas' || r.sucursal === selectedSucursal));
      const scores = monthData.map(r => Number(r.servicio_prestado)).filter(v => !isNaN(v) && v > 0);
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      return { name: m.toLowerCase(), value: Number(avg.toFixed(2)) };
    }).filter(m => m.value > 0);
  }, [data, selectedSucursal]);

  const rankingAsesores = useMemo(() => {
    const asesores: Record<string, { sum: number, count: number }> = {};
    filteredData.forEach(r => {
      if (r.asesor && r.servicio_prestado) {
        if (!asesores[r.asesor]) asesores[r.asesor] = { sum: 0, count: 0 };
        asesores[r.asesor].sum += r.servicio_prestado;
        asesores[r.asesor].count += 1;
      }
    });
    return Object.entries(asesores)
      .map(([name, stats]) => ({ name, value: Number((stats.sum / stats.count).toFixed(2)), count: stats.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  const rankingTecnicos = useMemo(() => {
    const tecnicos: Record<string, { sum: number, count: number }> = {};
    filteredData.forEach(r => {
      if (r.tecnicos && r.servicio_prestado) {
        if (!tecnicos[r.tecnicos]) tecnicos[r.tecnicos] = { sum: 0, count: 0 };
        tecnicos[r.tecnicos].sum += r.servicio_prestado;
        tecnicos[r.tecnicos].count += 1;
      }
    });
    return Object.entries(tecnicos)
      .map(([name, stats]) => ({ name, value: Number((stats.sum / stats.count).toFixed(2)), count: stats.count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData]);

  const serviciosFrecuentes = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(r => {
      if (r.servicio) {
        counts[r.servicio] = (counts[r.servicio] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredData]);

  const estadoData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(r => {
      const estado = r.estado || 'Sin Estado';
      counts[estado] = (counts[estado] || 0) + 1;
    });
    const total = filteredData.length || 1;
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      percentage: ((value / total) * 100).toFixed(2)
    })).sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const COLORS = ['#3b82f6', '#1e3a8a', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#ec4899'];

  if (loading === LoadingState.ERROR) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white">
        <Icons.AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-black uppercase italic">Error al cargar datos</h2>
        <button onClick={onBack} className="mt-8 px-8 py-3 bg-white/10 rounded-full text-xs font-black uppercase tracking-widest">Volver</button>
      </div>
    );
  }

  return (
    <DashboardFrame 
      title="ENCUESTA INTERNA - POSTVENTA" 
      subtitle="Satisfaction & Quality Monitoring"
      className="bg-slate-950"
      isLoading={loading === LoadingState.LOADING}
      onBack={onBack}
      lastUpdated="06/03/2026 11:00"
    >
      <div className="px-8 space-y-12 pb-20">
        {/* Header Info & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-white/5 p-8 rounded-[2rem] border border-white/10">
          <div className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-4">Mes de Análisis</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-6 py-3 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[180px] appearance-none cursor-pointer"
              >
                {['Todas', ...MONTHS].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block px-4">Sucursal</label>
              <select 
                value={selectedSucursal}
                onChange={(e) => setSelectedSucursal(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-xl px-6 py-3 text-xs font-bold text-white focus:ring-2 focus:ring-blue-500 outline-none min-w-[180px] appearance-none cursor-pointer"
              >
                {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-12">
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Total Encuestas</p>
              <p className="text-4xl font-black text-white italic tracking-tighter">{metrics.totalEncuestas}</p>
            </div>
            <div className="w-px h-12 bg-white/10"></div>
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Contactados</p>
              <p className="text-4xl font-black text-blue-400 italic tracking-tighter">{metrics.contactados}</p>
            </div>
          </div>
        </div>

        {/* Gauges Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {[
            { label: 'LVS (Servicio)', value: metrics.lvs },
            { label: 'Trato Personal', value: metrics.trato },
            { label: 'Organización', value: metrics.organizacion },
            { label: 'Trabajo Taller', value: metrics.trabajoTaller },
            { label: 'Lavado', value: metrics.lavado },
          ].map((m, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0f172a] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden group"
            >
              <div className="bg-[#1e3a8a] py-2 px-4 mb-8 -mx-8 -mt-8 rounded-t-[2.5rem] text-center">
                <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{m.label}</span>
              </div>
              <GaugeChart value={m.value} label="" />
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-600/5 rounded-full blur-3xl group-hover:bg-blue-600/10 transition-colors"></div>
            </motion.div>
          ))}
        </div>

        {/* Main Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LVS Trend */}
          <ChartWrapper title="Evolución LVS" isDark={true} className="lg:col-span-8">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lvsByMonth} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLvs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} />
                  <YAxis domain={[4.5, 5.0]} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorLvs)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartWrapper>

          {/* Survey Status */}
          <ChartWrapper title="Estado de Encuestas" isDark={true} className="lg:col-span-4">
            <div className="h-[350px] w-full flex flex-col justify-center">
              <ResponsiveContainer width="100%" height="220">
                <PieChart>
                  <Pie
                    data={estadoData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {estadoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 mt-6">
                {estadoData.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="text-[10px] font-black text-slate-400 uppercase">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-white">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </ChartWrapper>

          {/* Rankings */}
          <ChartWrapper title="Top 5 Asesores (Calidad)" isDark={true} className="lg:col-span-4">
            <div className="space-y-4">
              {rankingAsesores.map((a, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 font-black text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white uppercase italic">{a.name}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{a.count} encuestas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-blue-400 italic leading-none">{a.value}</p>
                    <div className="w-12 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${(a.value / 5) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartWrapper>

          <ChartWrapper title="Top 5 Técnicos (Calidad)" isDark={true} className="lg:col-span-4">
            <div className="space-y-4">
              {rankingTecnicos.map((t, i) => (
                <div key={i} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-black text-xs">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white uppercase italic">{t.name}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{t.count} encuestas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-indigo-400 italic leading-none">{t.value}</p>
                    <div className="w-12 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${(t.value / 5) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ChartWrapper>

          <ChartWrapper title="Servicios más Frecuentes" isDark={true} className="lg:col-span-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={serviciosFrecuentes} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 8, fill: '#64748b', fontWeight: 'bold'}} 
                    width={100}
                  />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12}>
                    <LabelList dataKey="value" position="right" style={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartWrapper>

          {/* Recent Comments Table */}
          <ChartWrapper title="Comentarios Recientes" isDark={true} className="lg:col-span-12">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Fecha</th>
                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Cliente</th>
                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Asesor</th>
                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Servicio</th>
                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">LVS</th>
                    <th className="pb-4 text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Comentario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredData
                    .filter(r => r.observaciones || r.obs_servicio_prestado)
                    .slice(0, 10)
                    .map((r, i) => (
                    <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-4 text-[10px] font-bold text-slate-400">{r.created_at?.split('T')[0]}</td>
                      <td className="py-4 px-4 text-[10px] font-black text-white uppercase italic">{r.cliente_nombre || 'S/D'}</td>
                      <td className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase">{r.asesor}</td>
                      <td className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase">{r.servicio}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-black ${Number(r.servicio_prestado) >= 4 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {r.servicio_prestado || '-'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-[10px] text-slate-400 max-w-xs truncate italic">
                        "{r.observaciones || r.obs_servicio_prestado}"
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartWrapper>
        </div>
      </div>
    </DashboardFrame>
  );
};

export default InternalPostventaDashboard;
