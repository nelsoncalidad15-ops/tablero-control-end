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
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [reloadCount, setReloadCount] = useState(0);
  
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
    let cancelled = false;

    const loadData = async () => {
      setLoadingState(LoadingState.LOADING);
      setSourceErrors([]);

      const requests = [
        {
          label: 'Jujuy',
          load: fetchDetailedQualityData(sheetUrls.jujuy).then(data =>
            data.map(record => ({ ...record, sucursal: 'JUJUY', mes: normalizeMonthKey(record.mes) }))
          ),
        },
        {
          label: 'Salta',
          load: fetchDetailedQualityData(sheetUrls.salta).then(data =>
            data.map(record => ({ ...record, sucursal: 'SALTA', mes: normalizeMonthKey(record.mes) }))
          ),
        },
      ];

      const results = await Promise.allSettled(requests.map(request => request.load));
      if (cancelled) return;

      const failedSources = results.flatMap((result, index) => {
        if (result.status === 'fulfilled') return [];
        console.error(`Error loading Refuerzo ${requests[index].label}:`, result.reason);
        return [requests[index].label];
      });
      const mergedData = results.flatMap(result =>
        result.status === 'fulfilled' ? result.value : []
      );

      setData(mergedData);
      setSourceErrors(failedSources);
      setSelectedMonth(null);
      setLoadingState(mergedData.length > 0 ? LoadingState.SUCCESS : LoadingState.ERROR);
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [sheetUrls.jujuy, sheetUrls.salta, reloadCount]);

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

  if (loadingState === LoadingState.ERROR) {
    const hasSourceErrors = sourceErrors.length > 0;
    const unavailableSources = sourceErrors.join(' y ');
    return (
      <DashboardFrame title="Refuerzo Calidad Postventa" onBack={onBack}>
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <Icons.AlertTriangle className="h-12 w-12 text-rose-500" />
          <h2 className="mt-5 text-xl font-bold text-slate-900">No se pudieron cargar datos de Refuerzo</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            {hasSourceErrors
              ? <>Revise el acceso privado de {unavailableSources} para la cuenta de servicio.</>
              : <>Las fuentes respondieron, pero no contienen registros compatibles para mostrar.</>}
          </p>
          <button
            type="button"
            onClick={() => setReloadCount(current => current + 1)}
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            <Icons.RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        </div>
      </DashboardFrame>
    );
  }

  return (
    <DashboardFrame
      title="Refuerzo Calidad Postventa"
      subtitle="Análisis Profundo • Jujuy & Salta"
      lastUpdated={new Date().toLocaleTimeString()}
      onBack={onBack}
    >
      <div className="space-y-5 pb-16 bg-[#f7f9fc]">
        {sourceErrors.length > 0 && (
          <div className="flex items-center justify-between gap-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span>Datos no disponibles: {sourceErrors.join(", ")}</span>
            <button
              type="button"
              aria-label="Reintentar carga de Refuerzo"
              title="Reintentar"
              onClick={() => setReloadCount(current => current + 1)}
              className="shrink-0 text-amber-900 hover:text-amber-700"
            >
              <Icons.RefreshCw className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Compact In-Flow Filters Bar - Responsive for all zooms */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 xl:gap-5">
            {/* Periodo */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Icons.Calendar className="w-3 h-3 text-blue-600" /> Periodo
              </span>
              <select 
                value={selectedMonth || ''} 
                onChange={(e) => setSelectedMonth(e.target.value || null)}
                className="text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 outline-none cursor-pointer hover:border-blue-300 transition-colors"
              >
                <option value="">Todos los meses</option>
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="hidden xl:block h-7 w-px bg-slate-200"></div>

            {/* Asesor */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Icons.Users className="w-3 h-3 text-emerald-600" /> Asesor
              </span>
              <select 
                value={selectedAsesor || ''} 
                onChange={(e) => setSelectedAsesor(e.target.value || null)}
                className="text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 outline-none cursor-pointer hover:border-blue-300 transition-colors max-w-[150px] sm:max-w-[180px] xl:max-w-[200px]"
              >
                <option value="">Todos los asesores</option>
                {asesores.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div className="hidden xl:block h-7 w-px bg-slate-200"></div>

            {/* Calificación LVS */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Icons.Star className="w-3 h-3 text-amber-500" /> Nota LVS
              </span>
              <select 
                value={selectedLvsScore || ''} 
                onChange={(e) => setSelectedLvsScore(e.target.value ? Number(e.target.value) : null)}
                className="text-xs font-bold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 outline-none cursor-pointer hover:border-blue-300 transition-colors"
              >
                <option value="">Todas las notas</option>
                {[5, 4, 3, 2, 1].map(s => <option key={s} value={s}>Nota {s}</option>)}
              </select>
            </div>

            <div className="hidden xl:block h-7 w-px bg-slate-200"></div>

            {/* Sucursal */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Icons.MapPin className="w-3 h-3 text-rose-500" /> Sucursal
              </span>
              <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-xl border border-slate-200">
                {['', 'JUJUY', 'SALTA'].map((suc) => (
                  <button
                    key={suc}
                    onClick={() => setSelectedSucursal(suc || null)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                      (selectedSucursal || '') === suc 
                        ? 'bg-white text-blue-600 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {suc || 'Todas'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline">
              Muestra: <strong className="text-slate-800">{metrics.total}</strong> casos
            </span>
            {(selectedMonth || selectedAsesor || selectedLvsScore || selectedCategory || selectedSucursal) && (
              <button 
                onClick={clearFilters}
                className="px-3 py-1.5 rounded-xl bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-all flex items-center gap-1.5"
              >
                <Icons.X className="w-3.5 h-3.5" />
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards Grid - 5 columns from lg (1024px) up for 125% zoom stability */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 xl:gap-4">
          {[
            { title: 'Satisfacción LVS', val: metrics.q4.avg, q: 'Q4', count: metrics.q4.count, icon: Icons.Star },
            { title: 'Trato Personal', val: metrics.q1.avg, q: 'Q1', count: metrics.q1.count, icon: Icons.UserCheck },
            { title: 'Organización', val: metrics.q2.avg, q: 'Q2', count: metrics.q2.count, icon: Icons.ClipboardList },
            { title: 'Calidad Reparación', val: metrics.q3.avg, q: 'Q3', count: metrics.q3.count, icon: Icons.Wrench },
            { title: 'Lavado', val: metrics.q6.avg, q: 'Q6', count: metrics.q6.count, icon: Icons.Sparkles }
          ].map((kpi, i) => (
            <div 
              key={i}
              className="bg-white p-3 sm:p-3.5 xl:p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex justify-between items-start mb-2 xl:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-7 h-7 xl:w-8 xl:h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                    <kpi.icon className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
                  </div>
                  <h3 className="text-[10px] xl:text-xs font-bold text-slate-700 uppercase tracking-tight leading-tight line-clamp-1">{kpi.title}</h3>
                </div>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold text-slate-500 shrink-0">
                  {kpi.q}
                </span>
              </div>

              <div className="flex items-baseline gap-1 mb-2 xl:mb-3">
                <span className="text-2xl sm:text-3xl xl:text-4xl font-black text-slate-900 tracking-tight leading-none">{kpi.val.toFixed(2)}</span>
                <span className="text-[11px] sm:text-xs font-semibold text-blue-600">/ 5.0</span>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[9px] xl:text-[10px]">
                  <span className="font-semibold text-slate-400 uppercase tracking-wider">Muestra: {kpi.count}</span>
                  <span className="font-bold text-blue-600">{((kpi.val / 5) * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    style={{ width: `${Math.min(100, Math.max(0, (kpi.val / 5) * 100))}%` }}
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Categorización & Advisor Ranking Grid - Side-by-side from lg up */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 xl:gap-5">
          {/* Categorización Section */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 xl:p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-base md:text-lg font-bold text-slate-900 uppercase tracking-tight">Categorización</h2>
                <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Perfil de Clientes Atendidos (Columna BX)
                </p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                <Icons.BarChart className="w-4 h-4" />
              </div>
            </div>
            
            <div className="space-y-2">
              {categorizacionData.slice(0, 6).map((item, idx) => {
                const isSelected = selectedCategory === item.name;
                return (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedCategory(isSelected ? null : item.name)}
                    className={`flex items-center gap-2.5 sm:gap-3.5 group cursor-pointer px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl transition-all ${
                      isSelected ? 'bg-blue-50 border border-blue-200 shadow-xs' : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="w-36 sm:w-48 xl:w-56 text-right shrink-0">
                      <span className={`text-[11px] sm:text-xs font-semibold uppercase tracking-tight block truncate transition-colors ${
                        isSelected ? 'text-blue-600 font-bold' : 'text-slate-700 group-hover:text-blue-600'
                      }`}>
                        {item.name}
                      </span>
                    </div>
                    <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/50">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.value / (categorizacionData[0]?.value || 1)) * 100}%` }}
                        transition={{ duration: 1.2, delay: idx * 0.08 }}
                        className={`h-full rounded-full transition-colors ${
                          isSelected ? 'bg-blue-600' : 'bg-slate-900 group-hover:bg-blue-600'
                        }`}
                      />
                    </div>
                    <div className="w-14 sm:w-16 text-right shrink-0">
                      <span className={`text-xs font-bold ${isSelected ? 'text-blue-600' : 'text-slate-900'}`}>{item.value}</span>
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-400 uppercase ml-1">casos</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advisor LVS Performance Table */}
          <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 xl:p-6 text-white shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold uppercase tracking-tight">Performance LVS por Asesor</h3>
                <div className="px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold uppercase tracking-wider">
                  Detalle Notas
                </div>
              </div>
              
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="pb-2.5 text-[9px] font-bold text-white/40 uppercase tracking-wider">Asesor</th>
                      <th className="pb-2.5 text-center text-[9px] font-bold text-white/40 uppercase tracking-wider">Prom.</th>
                      <th className="pb-2.5 text-center text-[9px] font-bold text-white/40 uppercase tracking-wider">5</th>
                      <th className="pb-2.5 text-center text-[9px] font-bold text-white/40 uppercase tracking-wider">4</th>
                      <th className="pb-2.5 text-center text-[9px] font-bold text-white/40 uppercase tracking-wider">3</th>
                      <th className="pb-2.5 text-center text-[9px] font-bold text-white/40 uppercase tracking-wider">2</th>
                      <th className="pb-2.5 text-center text-[9px] font-bold text-white/40 uppercase tracking-wider">1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {advisorRanking.map((adv, idx) => (
                      <tr key={idx} className="group hover:bg-white/5 transition-colors">
                        <td className="py-2">
                          <div className="text-xs font-bold uppercase tracking-tight text-white group-hover:text-blue-400 transition-colors max-w-[150px] truncate">
                            {adv.name}
                          </div>
                          <div className="text-[9px] font-medium text-white/30 uppercase tracking-wider">
                            {adv.count} casos
                          </div>
                        </td>
                        <td className="py-2 text-center">
                          <span className={`text-xs font-bold ${adv.avgLvs >= 4.5 ? 'text-emerald-400' : adv.avgLvs >= 4 ? 'text-blue-400' : 'text-rose-400'}`}>
                            {adv.avgLvs.toFixed(1)}
                          </span>
                        </td>
                        {[5, 4, 3, 2, 1].map(score => (
                          <td key={score} className="py-2 text-center">
                            <span className={`text-[10px] font-semibold ${adv.scores[score as 1|2|3|4|5] > 0 ? 'text-white' : 'text-white/15'}`}>
                              {adv.scores[score as 1|2|3|4|5]}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed List View - Modern Compact Data Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Header Area */}
          <div className="p-4 md:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base md:text-lg font-bold text-slate-900 uppercase tracking-tight">
                Registro Detallado {selectedCategory && <span className="text-blue-600">— {selectedCategory}</span>}
              </h2>
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Historial de Operaciones Refuerzo {selectedSucursal || 'Jujuy & Salta'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 uppercase tracking-wider">
                {filteredData.length} Casos
              </div>
            </div>
          </div>

          {/* Table Column Headers */}
          <div className="hidden lg:flex bg-slate-50/80 border-b border-slate-100 px-4 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <div className="w-48 shrink-0">Asesor / Periodo</div>
            <div className="w-60 shrink-0">Cliente / Operación</div>
            <div className="w-16 text-center shrink-0">Q1</div>
            <div className="w-16 text-center shrink-0">Q2</div>
            <div className="w-16 text-center shrink-0">Q3</div>
            <div className="w-24 text-center shrink-0 bg-slate-900 text-white rounded-t-lg">LVS (Q4)</div>
            <div className="flex-1 pl-4">Comentarios del Cliente</div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredData.slice(0, 50).map((row, idx) => (
              <div key={idx} className="flex flex-col lg:flex-row hover:bg-slate-50/70 transition-colors group border-l-4 border-transparent hover:border-blue-500 px-4 py-3 items-center">
                {/* Asesor Info */}
                <div className="w-full lg:w-48 shrink-0 flex items-center lg:block gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 lg:hidden shrink-0">
                    <Icons.User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-tight">{normalizeAdvisorName(row.asesor)}</div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">{row.mes}</div>
                  </div>
                </div>

                {/* Client & OR Info */}
                <div className="w-full lg:w-60 shrink-0 flex items-center lg:block gap-3 mt-2 lg:mt-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 lg:hidden shrink-0">
                    <Icons.FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 uppercase tracking-tight truncate max-w-[220px]">{row.cliente}</div>
                    <div className="inline-flex px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                      OR: {row.orden || "—"}
                    </div>
                  </div>
                </div>

                {/* Scores Q1, Q2, Q3 */}
                <div className="w-full lg:w-16 shrink-0 flex lg:flex-col items-center justify-between lg:justify-center gap-1 mt-2 lg:mt-0">
                  <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Trato (Q1)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{row.q1_score?.toFixed(1) || "—"}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${row.q1_score ? (row.q1_score >= 4 ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-200'}`} />
                  </div>
                </div>
                <div className="w-full lg:w-16 shrink-0 flex lg:flex-col items-center justify-between lg:justify-center gap-1 mt-1 lg:mt-0">
                  <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Org (Q2)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{row.q2_score?.toFixed(1) || "—"}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${row.q2_score ? (row.q2_score >= 4 ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-200'}`} />
                  </div>
                </div>
                <div className="w-full lg:w-16 shrink-0 flex lg:flex-col items-center justify-between lg:justify-center gap-1 mt-1 lg:mt-0">
                  <span className="lg:hidden text-[10px] font-bold text-slate-400 uppercase">Rep (Q3)</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{row.q3_score?.toFixed(1) || "—"}</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${row.q3_score ? (row.q3_score >= 4 ? 'bg-emerald-500' : 'bg-rose-500') : 'bg-slate-200'}`} />
                  </div>
                </div>

                {/* LVS Score (Q4) */}
                <div className="w-full lg:w-24 shrink-0 flex lg:flex-col items-center justify-between lg:justify-center gap-1 mt-2 lg:mt-0 bg-slate-50/80 py-1 px-2 rounded-xl">
                  <span className="lg:hidden text-[10px] font-bold text-slate-900 uppercase">LVS (Q4)</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-base font-black italic ${Number(row.q4_score) >= 4.5 ? 'text-blue-600' : 'text-rose-600'}`}>
                      {row.q4_score?.toFixed(1) || "—"}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${row.q4_score ? (row.q4_score >= 4 ? 'bg-blue-500' : 'bg-rose-500') : 'bg-slate-200'}`} />
                  </div>
                </div>

                {/* Comments Section */}
                <div className="flex-1 pl-0 lg:pl-4 space-y-1.5 w-full mt-2 lg:mt-0">
                  {[
                    { q: 'Q1', comment: row.q1_comment },
                    { q: 'Q2', comment: row.q2_comment },
                    { q: 'Q3', comment: row.q3_comment },
                    { q: 'LVS', comment: row.q4_comment, isMain: true }
                  ].map((c, ci) => {
                    if (!c.comment || c.comment.trim() === '-' || c.comment.trim() === '0' || c.comment.trim() === '') return null;
                    return (
                      <div key={ci} className="flex gap-2.5 items-start">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider shrink-0 mt-0.5 ${c.isMain ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {c.q}
                        </span>
                        <p className={`text-xs leading-snug ${c.isMain ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                          {c.comment}
                        </p>
                      </div>
                    );
                  })}
                  {(!row.q1_comment && !row.q2_comment && !row.q3_comment && !row.q4_comment) && (
                    <span className="text-[11px] text-slate-300 italic">Sin comentarios registrados</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Table Footer */}
          <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-center">
            <button className="px-5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 uppercase tracking-wider hover:bg-slate-100 transition-all shadow-xs">
              Cargar más resultados
            </button>
          </div>
        </div>
      </div>
    </DashboardFrame>
  );
};

export default DetailedQualityPostventa;
