import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList
} from 'recharts';
import { motion } from 'motion/react';
import { Icons } from './Icon';
import { fetchDetailedQualityData } from '../services/dataService';
import { DetailedQualityRecord, LoadingState } from '../types';
import { MONTHS } from '../constants';
import { DashboardFrame, LuxuryKPICard, SkeletonLoader, StatusBadge, InsightCard, DataTable } from './DashboardUI';

interface DetailedQualityPostventaProps {
  sheetUrls: { jujuy: string; salta: string };
  onBack: () => void;
}

const DetailedQualityPostventa: React.FC<DetailedQualityPostventaProps> = ({ sheetUrls, onBack }) => {
  const [data, setData] = useState<DetailedQualityRecord[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedAsesor, setSelectedAsesor] = useState<string | null>(null);
  const [selectedLvsScore, setSelectedLvsScore] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSucursal, setSelectedSucursal] = useState<string | null>(null);

  const normalizeAdvisorName = (value: string | null | undefined) => {
    if (!value) return 'SIN ASESOR';
    return value
      .replace(/\d+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  };

  const normalizeBranchKey = (value: string | null | undefined) => {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .trim();
  };

  const normalizeMonthKey = (value: string | null | undefined) => {
    const normalized = String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\./g, '')
      .trim();

    const monthMap: Record<string, string> = {
      ene: 'Enero',
      enero: 'Enero',
      feb: 'Febrero',
      febrero: 'Febrero',
      mar: 'Marzo',
      marzo: 'Marzo',
      abr: 'Abril',
      abril: 'Abril',
      may: 'Mayo',
      mayo: 'Mayo',
      jun: 'Junio',
      junio: 'Junio',
      jul: 'Julio',
      julio: 'Julio',
      ago: 'Agosto',
      agosto: 'Agosto',
      sep: 'Septiembre',
      set: 'Septiembre',
      septiembre: 'Septiembre',
      oct: 'Octubre',
      octubre: 'Octubre',
      nov: 'Noviembre',
      noviembre: 'Noviembre',
      dic: 'Diciembre',
      diciembre: 'Diciembre',
    };

    return monthMap[normalized] || String(value || '').trim();
  };

  useEffect(() => {
    const loadData = async () => {
      setLoadingState(LoadingState.LOADING);
      try {
        const [jujuyData, saltaData] = await Promise.all([
          fetchDetailedQualityData(sheetUrls.jujuy).then(d => d.map(r => ({ ...r, sucursal: 'JUJUY', mes: normalizeMonthKey(r.mes) }))),
          fetchDetailedQualityData(sheetUrls.salta).then(d => d.map(r => ({ ...r, sucursal: 'SALTA', mes: normalizeMonthKey(r.mes) })))
        ]);
        
        const mergedData = [...jujuyData, ...saltaData];
        setData(mergedData);
        
        if (mergedData.length > 0) {
          // Default to all months to ensure data is visible
          setSelectedMonth(null);
        }
        
        setLoadingState(LoadingState.SUCCESS);
      } catch (error) {
        console.error(error);
        setLoadingState(LoadingState.ERROR);
      }
    };
    loadData();
  }, [sheetUrls]);

  // --- DATA PROCESSING ---

  const uniqueData = useMemo(() => {
    const seen = new Set();
    return data.filter((item) => {
      const key = item.cod_id?.trim();
      if (!key) return false;
      if (key === "0") return false;
      const branchKey = normalizeBranchKey(item.sucursal);
      const monthKey = normalizeMonthKey(item.mes || item.mes_raw).toUpperCase();
      const dedupeKey = `${branchKey}::${monthKey}::${key}`;
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
      return true;
    });
  }, [data]);

  const availableMonths = useMemo(() => {
    const months = [...new Set(uniqueData.map(d => normalizeMonthKey(d.mes || d.mes_raw)))];
    return months.sort((a, b) => MONTHS.indexOf(a) - MONTHS.indexOf(b));
  }, [uniqueData]);

  const filteredData = useMemo(() => {
    return uniqueData.filter(item => {
      const matchMonth = !selectedMonth || selectedMonth === "" ? true : normalizeMonthKey(item.mes || item.mes_raw) === normalizeMonthKey(selectedMonth);
      const matchAsesor = !selectedAsesor || selectedAsesor === "" ? true : normalizeAdvisorName(item.asesor) === selectedAsesor;
      const matchLvs = selectedLvsScore !== null ? item.q4_score === selectedLvsScore : true;
      const matchCategory = !selectedCategory || selectedCategory === "" ? true : item.categorizacion?.trim() === selectedCategory;
      const itemSucursal = item.sucursal?.trim().toUpperCase();
      const matchSucursal = !selectedSucursal || selectedSucursal === "" ? true : itemSucursal === selectedSucursal;
      return matchMonth && matchAsesor && matchLvs && matchCategory && matchSucursal;
    });
  }, [uniqueData, selectedMonth, selectedAsesor, selectedLvsScore, selectedCategory, selectedSucursal]);

  const clearFilters = () => {
    setSelectedMonth(null);
    setSelectedAsesor(null);
    setSelectedLvsScore(null);
    setSelectedCategory(null);
    setSelectedSucursal(null);
  };

  const asesores = useMemo(() => {
    return [...new Set(uniqueData.map(d => normalizeAdvisorName(d.asesor)).filter(Boolean))].sort();
  }, [uniqueData]);

  const metrics = useMemo(() => {
    const calcMetric = (key: keyof DetailedQualityRecord) => {
      const validRecords = filteredData.filter(d => d[key] !== null && d[key] !== undefined && typeof d[key] === 'number');
      const count = validRecords.length;
      const sum = validRecords.reduce((acc, curr) => acc + (curr[key] as number), 0);
      return { avg: count > 0 ? sum / count : 0, count };
    };

    return {
      q1: calcMetric('q1_score'),
      q2: calcMetric('q2_score'),
      q3: calcMetric('q3_score'),
      q4: calcMetric('q4_score'),
      q6: calcMetric('q6_score'),
      total: filteredData.length
    };
  }, [filteredData]);

  const categorizacionData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => {
      const rawCat = d.categorizacion?.trim();
      if (rawCat && rawCat !== '-' && rawCat !== '0' && rawCat !== '10' && rawCat !== '1') {
        const cats = rawCat.split(',').map(c => c.trim()).filter(c => c !== '');
        cats.forEach(cat => {
            counts[cat] = (counts[cat] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const advisorRanking = useMemo(() => {
    const stats: Record<string, { count: number; sumLvs: number; scores: Record<number, number> }> = {};
    filteredData.forEach(d => {
      const advisorName = normalizeAdvisorName(d.asesor);
      if (!stats[advisorName]) {
        stats[advisorName] = { count: 0, sumLvs: 0, scores: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
      }
      stats[advisorName].count++;
      const score = d.q4_score || 0;
      stats[advisorName].sumLvs += score;
      if (score >= 1 && score <= 5) {
        stats[advisorName].scores[score as 1|2|3|4|5]++;
      }
    });
    return Object.entries(stats)
      .map(([name, data]) => ({
        name,
        count: data.count,
        avgLvs: data.count > 0 ? data.sumLvs / data.count : 0,
        scores: data.scores
      }))
      .sort((a, b) => b.avgLvs - a.avgLvs || b.count - a.count);
  }, [filteredData]);

  const lvsDistribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredData.forEach(d => {
      if (d.q4_score) counts[d.q4_score]++;
    });
    return Object.entries(counts).map(([score, count]) => ({ score: `Nota ${score}`, count, val: score }));
  }, [filteredData]);

  if (loadingState === LoadingState.LOADING) return <SkeletonLoader />;

  const filters = (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6">
        <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Icons.MapPin className="w-3 h-3 text-rose-500" />
          Sucursal
        </h3>
        <select 
          value={selectedSucursal || ''} 
          onChange={(e) => setSelectedSucursal(e.target.value || null)}
          className="w-full text-xs font-black uppercase tracking-widest p-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
        >
          <option value="">Todas las sucursales</option>
          <option value="JUJUY">JUJUY</option>
          <option value="SALTA">SALTA</option>
        </select>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6">
        <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Icons.Calendar className="w-3 h-3 text-blue-500" />
          Periodo
        </h3>
        <select 
          value={selectedMonth || ''} 
          onChange={(e) => setSelectedMonth(e.target.value || null)}
          className="w-full text-xs font-black uppercase tracking-widest p-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
        >
          <option value="">Todos los meses</option>
          {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6">
        <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Icons.Users className="w-3 h-3 text-emerald-500" />
          Asesor
        </h3>
        <select 
          value={selectedAsesor || ''} 
          onChange={(e) => setSelectedAsesor(e.target.value || null)}
          className="w-full text-xs font-black uppercase tracking-widest p-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
        >
          <option value="">Todos los asesores</option>
          {asesores.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6">
        <h3 className="font-black text-[10px] text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <Icons.Star className="w-3 h-3 text-amber-500" />
          Calificación
        </h3>
        <select 
          value={selectedLvsScore || ''} 
          onChange={(e) => setSelectedLvsScore(e.target.value ? Number(e.target.value) : null)}
          className="w-full text-xs font-black uppercase tracking-widest p-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none cursor-pointer"
        >
          <option value="">Todas las notas</option>
          {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>Nota {s}</option>)}
        </select>
      </div>

      {(selectedMonth || selectedAsesor || selectedLvsScore || selectedCategory) && (
        <button 
          onClick={clearFilters}
          className="w-full py-3 rounded-xl bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
        >
          <Icons.X className="w-3 h-3" />
          Limpiar Filtros
        </button>
      )}
    </div>
  );

  return (
    <DashboardFrame
      title="Refuerzo Calidad Postventa"
      subtitle="Análisis Profundo - JUJUY & SALTA"
      context={
        <>
          <span className="px-3 py-1.5 rounded-full bg-slate-950 text-white text-[9px] font-black uppercase tracking-[0.2em]">
            Refuerzo
          </span>
          <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
            Mes: {selectedMonth || 'TODOS'}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">
            Sucursal: {selectedSucursal || 'JUJUY & SALTA'}
          </span>
        </>
      }
      lastUpdated={new Date().toLocaleTimeString()}
      onBack={onBack}
    >
      <div className="min-h-screen bg-slate-50/50 -m-6 p-8 space-y-10 pb-32">
        {/* Modern Header with Stats */}
        <div className="mt-24 flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-8 lg:p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Icons.ShieldCheck className="w-6 h-6" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                REFUERZO <span className="text-blue-600">CALIDAD</span>
              </h1>
            </div>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em] ml-16">
              Indicadores de Satisfacción Postventa • {selectedSucursal || 'Todas las Sucursales'}
            </p>
          </div>
          
          <div className="mt-8 lg:mt-0 flex items-center gap-10 relative z-10">
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.35em] block mb-2">Muestra Analizada</span>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-5xl md:text-6xl font-black text-slate-900 leading-none">{metrics.total}</span>
                <span className="text-xs font-black text-blue-500 uppercase tracking-widest">Casos</span>
              </div>
            </div>
            <div className="h-16 w-px bg-slate-100"></div>
            <div className="text-right">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.35em] block mb-2">Promedio LVS</span>
              <div className="flex items-baseline justify-end gap-2">
                <span className="text-5xl md:text-6xl font-black text-slate-900 leading-none">{metrics.q4.avg.toFixed(2)}</span>
                <span className="text-xs font-black text-blue-500 uppercase tracking-widest">/ 5.0</span>
              </div>
            </div>
          </div>

          {/* Decorative background text */}
          <div className="absolute -bottom-10 -left-10 text-[15rem] font-black text-slate-50 select-none pointer-events-none uppercase tracking-tighter opacity-40">
            {selectedSucursal || 'AUTOSOL'}
          </div>
        </div>

        {/* Professional Horizontal Filters Bar */}
        <div className="fixed top-[88px] left-1/2 z-50 w-[calc(100%-4rem)] max-w-[calc(100vw-4rem)] -translate-x-1/2">
          <div className="bg-white/95 backdrop-blur-md px-10 py-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-wrap items-center gap-10">
          <div className="flex flex-col gap-2.5">
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <Icons.Calendar className="w-3 h-3" /> Periodo
            </span>
            <select 
              value={selectedMonth || ''} 
              onChange={(e) => setSelectedMonth(e.target.value || null)}
              className="text-xs font-black uppercase tracking-widest text-slate-900 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 outline-none cursor-pointer hover:border-blue-200 transition-colors"
            >
              <option value="">Todos los meses</option>
              {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <Icons.Users className="w-3 h-3" /> Asesor de Servicio
            </span>
            <select 
              value={selectedAsesor || ''} 
              onChange={(e) => setSelectedAsesor(e.target.value || null)}
              className="text-xs font-black uppercase tracking-widest text-slate-900 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 outline-none cursor-pointer hover:border-blue-200 transition-colors min-w-[200px]"
            >
              <option value="">Todos los asesores</option>
              {asesores.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <Icons.Star className="w-3 h-3" /> Calificación LVS
            </span>
            <select 
              value={selectedLvsScore || ''} 
              onChange={(e) => setSelectedLvsScore(e.target.value ? Number(e.target.value) : null)}
              className="text-xs font-black uppercase tracking-widest text-slate-900 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 outline-none cursor-pointer hover:border-blue-200 transition-colors"
            >
              <option value="">Todas las notas</option>
              {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>Nota {s}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <Icons.MapPin className="w-3 h-3" /> Sucursal
            </span>
            <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
              {['', 'JUJUY', 'SALTA'].map((suc) => (
                <button
                  key={suc}
                  onClick={() => setSelectedSucursal(suc || null)}
                  className={`px-6 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    (selectedSucursal || '') === suc 
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-100' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {suc || 'Todas'}
                </button>
              ))}
            </div>
          </div>

          <div className="ml-auto">
            <button 
              onClick={clearFilters}
              className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10"
            >
              <Icons.X className="w-3 h-3" /> Limpiar Filtros
            </button>
          </div>
        </div>
        </div>

        <div className="h-8 md:h-12"></div>

        {/* KPI Cards Grid - Modern Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-8">
          {[
            { title: 'Satisfacción LVS', val: metrics.q4.avg, q: 'Q4', count: metrics.q4.count, icon: Icons.Star },
            { title: 'Trato Personal', val: metrics.q1.avg, q: 'Q1', count: metrics.q1.count, icon: Icons.UserCheck },
            { title: 'Organización', val: metrics.q2.avg, q: 'Q2', count: metrics.q2.count, icon: Icons.ClipboardList },
            { title: 'Calidad Reparación', val: metrics.q3.avg, q: 'Q3', count: metrics.q3.count, icon: Icons.Wrench }
            ,{ title: 'Lavado', val: metrics.q6.avg, q: 'Q6', count: metrics.q6.count, icon: Icons.Sparkles }
          ].map((kpi, i) => (
            <motion.div 
              key={i}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group"
            >
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <kpi.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">{kpi.title}</h3>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[9px] font-black text-slate-300 group-hover:text-blue-400 transition-colors">
                  {kpi.q}
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-6xl xl:text-7xl font-black text-slate-900 tracking-tighter leading-none">{kpi.val.toFixed(2)}</span>
                <span className="text-xl font-black text-blue-500">/5.0</span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black text-slate-700 uppercase tracking-[0.2em] shadow-sm">Muestra: {kpi.count}</span>
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{((kpi.val / 5) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(kpi.val / 5) * 100}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                  ></motion.div>
                </div>
              </div>
              {/* Subtle background decoration */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-slate-50 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </motion.div>
          ))}
        </div>

        {/* Categorización & Insights Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
            {/* Categorización Section */}
            <div className="xl:col-span-2 bg-white rounded-[3.5rem] border border-slate-100 shadow-sm p-12 relative overflow-hidden">
                <div className="flex justify-between items-start mb-16">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Categorización</h2>
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">
                            Perfil de Clientes Atendidos (Columna BX)
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-400">
                        <Icons.BarChart className="w-6 h-6" />
                    </div>
                </div>
                
                <div className="space-y-10">
                    {categorizacionData.slice(0, 6).map((item, idx) => {
                      const isSelected = selectedCategory === item.name;
                      return (
                        <div 
                            key={idx} 
                            onClick={() => setSelectedCategory(isSelected ? null : item.name)}
                            className={`flex items-center gap-10 group cursor-pointer p-4 rounded-3xl transition-all ${
                                isSelected ? 'bg-blue-50 border border-blue-100 shadow-sm' : 'hover:bg-slate-50'
                            }`}
                        >
                            <div className="w-56 text-right">
                            <span className={`text-[11px] font-black uppercase tracking-tight leading-tight block transition-colors ${
                                isSelected ? 'text-blue-600' : 'text-slate-900 group-hover:text-blue-600'
                            }`}>
                                {item.name}
                            </span>
                            </div>
                            <div className="flex-1 h-4 bg-slate-50 rounded-full overflow-hidden relative border border-slate-100/50">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(item.value / (categorizacionData[0]?.value || 1)) * 100}%` }}
                                transition={{ duration: 1.2, delay: idx * 0.1 }}
                                className={`h-full rounded-full transition-colors ${
                                    isSelected ? 'bg-blue-600' : 'bg-slate-900 group-hover:bg-blue-600'
                                }`}
                            ></motion.div>
                            </div>
                            <div className="w-16 text-right">
                                <span className={`text-lg font-black ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>{item.value}</span>
                                <span className="text-[9px] font-black text-slate-300 uppercase ml-1">Casos</span>
                            </div>
                        </div>
                      );
                    })}
                </div>
            </div>

            {/* Advisor LVS Performance Table */}
            <div className="bg-slate-900 rounded-[3.5rem] p-12 text-white relative overflow-hidden shadow-2xl shadow-slate-900/20">
                <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Performance LVS por Asesor</h3>
                    <div className="px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase tracking-widest">
                        Detalle de Notas
                    </div>
                </div>
                
                <div className="overflow-x-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="pb-4 text-[9px] font-black text-white/40 uppercase tracking-widest">Asesor</th>
                                <th className="pb-4 text-center text-[9px] font-black text-white/40 uppercase tracking-widest">Prom.</th>
                                <th className="pb-4 text-center text-[9px] font-black text-white/40 uppercase tracking-widest">5</th>
                                <th className="pb-4 text-center text-[9px] font-black text-white/40 uppercase tracking-widest">4</th>
                                <th className="pb-4 text-center text-[9px] font-black text-white/40 uppercase tracking-widest">3</th>
                                <th className="pb-4 text-center text-[9px] font-black text-white/40 uppercase tracking-widest">2</th>
                                <th className="pb-4 text-center text-[9px] font-black text-white/40 uppercase tracking-widest">1</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {advisorRanking.map((adv, idx) => (
                                <tr key={idx} className="group hover:bg-white/5 transition-colors">
                                    <td className="py-4">
                    <div className="text-[11px] font-black uppercase tracking-tight text-white group-hover:text-blue-400 transition-colors max-w-[180px]">
                        {adv.name}
                    </div>
                                        <div className="text-[8px] font-bold text-white/20 uppercase tracking-widest">
                                            {adv.count} Casos
                                        </div>
                                    </td>
                                    <td className="py-4 text-center">
                                        <span className={`text-sm font-black italic ${adv.avgLvs >= 4.5 ? 'text-emerald-400' : adv.avgLvs >= 4 ? 'text-blue-400' : 'text-rose-400'}`}>
                                            {adv.avgLvs.toFixed(1)}
                                        </span>
                                    </td>
                                    {[5, 4, 3, 2, 1].map(score => (
                                        <td key={score} className="py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`text-[10px] font-black ${adv.scores[score as 1|2|3|4|5] > 0 ? 'text-white' : 'text-white/10'}`}>
                                                    {adv.scores[score as 1|2|3|4|5]}
                                                </span>
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-12 pt-10 border-t border-white/5">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Icons.AlertCircle className="w-5 h-5" />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest">Alerta de Calidad</h4>
                    </div>
                    <p className="text-xs text-white/40 leading-relaxed font-medium">
                        Se detecta un {((lvsDistribution.find(d => Number(d.val) <= 3)?.count || 0) / metrics.total * 100).toFixed(1)}% de detractores en el periodo actual. Se recomienda revisión de comentarios en Q3.
                    </p>
                </div>
                {/* Decorative glow */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>
        </div>

        {/* Detailed List View - Modern Data Table */}
        <div className="bg-white rounded-[3.5rem] border border-slate-100 shadow-sm overflow-hidden">
          {/* Table Header Area */}
          <div className="p-12 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">
                Registro Detallado {selectedCategory && <span className="text-blue-600">— {selectedCategory}</span>}
              </h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">
                Historial de Operaciones Refuerzo {selectedSucursal || 'Jujuy & Salta'}
              </p>
            </div>
            <div className="flex items-center gap-6">
                <div className="px-6 py-3 bg-slate-50 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-100">
                    {filteredData.length} Resultados Encontrados
                </div>
                <button className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10">
                    <Icons.Download className="w-5 h-5" />
                </button>
            </div>
          </div>

          {/* Table Column Headers */}
          <div className="hidden lg:flex bg-slate-50/50 border-b border-slate-100">
            <div className="w-56 p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Asesor / Periodo</div>
            <div className="w-72 p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente / Operación</div>
            <div className="w-24 p-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Q1</div>
            <div className="w-24 p-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Q2</div>
            <div className="w-24 p-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Q3</div>
            <div className="w-36 p-8 text-center text-[10px] font-black text-white uppercase tracking-widest bg-slate-900">LVS (Q4)</div>
            <div className="flex-1 p-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Comentarios del Cliente</div>
          </div>

          <div className="divide-y divide-slate-50">
            {filteredData.slice(0, 50).map((row, idx) => (
              <div key={idx} className="flex flex-col lg:flex-row hover:bg-slate-50/30 transition-all group border-l-4 border-transparent hover:border-blue-500">
                {/* Asesor Info */}
                <div className="w-full lg:w-56 p-8 shrink-0 flex items-center lg:block gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 lg:hidden shrink-0">
                    <Icons.User className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-slate-900 uppercase tracking-tight mb-1">{normalizeAdvisorName(row.asesor)}</div>
                    <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{row.mes}</div>
                  </div>
                </div>

                {/* Client & OR Info */}
                <div className="w-full lg:w-72 p-8 shrink-0 flex items-center lg:block gap-4 border-t lg:border-t-0 border-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 lg:hidden shrink-0">
                    <Icons.FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2 leading-tight">{row.cliente}</div>
                    <div className="inline-flex px-3 py-1 bg-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest border border-slate-200/50">
                        OR: {row.orden || "—"}
                    </div>
                  </div>
                </div>

                {/* Scores Dots */}
                <div className="w-full lg:w-24 p-8 flex lg:flex-col items-center justify-between lg:justify-center gap-3 border-t lg:border-t-0 border-slate-50">
                  <span className="lg:hidden text-[10px] font-black text-slate-300 uppercase tracking-widest">Trato (Q1)</span>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{row.q1_score?.toFixed(1) || "—"}</span>
                    <div className={`w-2 h-2 rounded-full ${row.q1_score ? (row.q1_score >= 4 ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-100'}`}></div>
                  </div>
                </div>
                <div className="w-full lg:w-24 p-8 flex lg:flex-col items-center justify-between lg:justify-center gap-3 border-t lg:border-t-0 border-slate-50">
                  <span className="lg:hidden text-[10px] font-black text-slate-300 uppercase tracking-widest">Org (Q2)</span>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{row.q2_score?.toFixed(1) || "—"}</span>
                    <div className={`w-2 h-2 rounded-full ${row.q2_score ? (row.q2_score >= 4 ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-100'}`}></div>
                  </div>
                </div>
                <div className="w-full lg:w-24 p-8 flex lg:flex-col items-center justify-between lg:justify-center gap-3 border-t lg:border-t-0 border-slate-50">
                  <span className="lg:hidden text-[10px] font-black text-slate-300 uppercase tracking-widest">Rep (Q3)</span>
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{row.q3_score?.toFixed(1) || "—"}</span>
                    <div className={`w-2 h-2 rounded-full ${row.q3_score ? (row.q3_score >= 4 ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-100'}`}></div>
                  </div>
                </div>

                {/* LVS Score (Highlighted) */}
                <div className="w-full lg:w-36 p-8 flex lg:flex-col items-center justify-between lg:justify-center gap-3 bg-slate-50/50 border-t lg:border-t-0 border-slate-50">
                  <span className="lg:hidden text-[10px] font-black text-slate-900 uppercase tracking-widest">Satisfacción (LVS)</span>
                  <div className="flex flex-col items-center gap-2">
                    <span className={`text-2xl font-black italic ${Number(row.q4_score) >= 4.5 ? 'text-blue-600' : 'text-rose-600'}`}>
                        {row.q4_score?.toFixed(1) || "—"}
                    </span>
                    <div className={`w-2.5 h-2.5 rounded-full ${row.q4_score ? (row.q4_score >= 4 ? 'bg-blue-500' : 'bg-rose-500') : 'bg-slate-200'}`}></div>
                  </div>
                </div>

                {/* Comments Section */}
                <div className="flex-1 p-8 space-y-6 border-t lg:border-t-0 border-slate-50">
                  {[
                    { q: 'Q1', comment: row.q1_comment },
                    { q: 'Q2', comment: row.q2_comment },
                    { q: 'Q3', comment: row.q3_comment },
                    { q: 'LVS', comment: row.q4_comment, isMain: true }
                  ].map((c, ci) => {
                    if (!c.comment || c.comment.trim() === '-' || c.comment.trim() === '0' || c.comment.trim() === '') return null;
                    return (
                      <div key={ci} className="flex gap-5 items-start group/comment">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 mt-0.5 shadow-sm ${c.isMain ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                          {c.q}
                        </span>
                        <p className={`text-xs leading-relaxed ${c.isMain ? 'text-slate-900 font-bold' : 'text-slate-500 font-medium'}`}>
                          {c.comment}
                        </p>
                      </div>
                    );
                  })}
                  {(!row.q1_comment && !row.q2_comment && !row.q3_comment && !row.q4_comment) && (
                      <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest italic">Sin comentarios registrados</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Table Footer */}
          <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex justify-center">
             <button className="px-10 py-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-sm">
                Cargar más resultados
             </button>
          </div>
        </div>
      </div>
    </DashboardFrame>
  );
};

const CommentItem: React.FC<{ label: string; comment: string | undefined; isMain?: boolean }> = ({ label, comment, isMain }) => {
  if (!comment || comment.trim() === '-' || comment.trim() === '0' || comment.trim() === '') return null;
  return (
    <div className="flex gap-2">
      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded h-fit mt-0.5 shrink-0 ${isMain ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-400'}`}>
        {label}
      </span>
      <p className={`text-[11px] leading-relaxed ${isMain ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
        {comment}
      </p>
    </div>
  );
};

const ScoreDot: React.FC<{ score: number | null | undefined; isMain?: boolean }> = ({ score, isMain }) => {
  if (score === null || score === undefined) return <span className="text-slate-200 font-black">—</span>;
  const isHigh = score >= 4.5;
  const isMid = score >= 3.5;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`text-xs font-black ${isMain ? 'text-slate-950' : isHigh ? 'text-slate-900' : 'text-slate-400'}`}>
        {score.toFixed(1)}
      </span>
      <div className={`w-1.5 h-1.5 rounded-full ${isHigh ? 'bg-blue-500' : isMid ? 'bg-slate-300' : 'bg-rose-400'}`}></div>
    </div>
  );
};

export default DetailedQualityPostventa;
