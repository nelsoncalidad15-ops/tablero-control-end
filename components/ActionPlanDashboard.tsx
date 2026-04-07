import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from './Icon';
import { fetchActionPlanData } from '../services/dataService';
import { ActionPlanRecord, LoadingState } from '../types';
import { DashboardFrame, SkeletonLoader, StatusBadge, LuxuryKPICard, DataTable } from './DashboardUI';

interface ActionPlanDashboardProps {
  sheetUrl: string;
  salesSheetUrl?: string;
  formUrl?: string;
  onBack: () => void;
}

const ActionPlanDashboard: React.FC<ActionPlanDashboardProps> = ({ sheetUrl, salesSheetUrl, formUrl, onBack }) => {
  const [activeTab, setActiveTab] = useState<'postventa' | 'ventas'>('postventa');
  const [data, setData] = useState<ActionPlanRecord[]>([]);
  const [loading, setLoading] = useState<LoadingState>(LoadingState.IDLE);
  const [selectedPlan, setSelectedPlan] = useState<ActionPlanRecord | null>(null);
  const [filter, setFilter] = useState<'all' | 'incomplete' | 'complete' | 'pending_verification'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const currentUrl = activeTab === 'postventa' ? sheetUrl : salesSheetUrl;

  useEffect(() => {
    const loadData = async () => {
      if (!currentUrl) {
        setData([]);
        return;
      }
      try {
        setLoading(LoadingState.LOADING);
        console.log(`ActionPlanDashboard: Loading data (attempt ${retryCount + 1})...`);
        const records = await fetchActionPlanData(currentUrl);
        setData(records.filter(r => r.isPlan));
        setLoading(LoadingState.SUCCESS);
        console.log("ActionPlanDashboard: Data loaded successfully");
      } catch (error) {
        console.error("Error loading action plan data:", error);
        setLoading(LoadingState.ERROR);
      }
    };
    loadData();
  }, [currentUrl, retryCount]);

  const filteredData = useMemo(() => {
    if (!data) return [];
    return data.filter(plan => {
      const matchesSearch = 
        (plan.nombre_kpi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (plan.responsable || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (plan.nro || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (plan.sector || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (filter === 'incomplete') return matchesSearch && plan.isIncomplete;
      if (filter === 'complete') return matchesSearch && !plan.isIncomplete;
      if (filter === 'pending_verification') return matchesSearch && !plan.verificacion_eficacia;
      return matchesSearch;
    });
  }, [data, filter, searchTerm]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, incomplete: 0, complete: 0, pendingVerification: 0 };
    const total = data.length;
    const incomplete = data.filter(p => p.isIncomplete).length;
    const complete = total - incomplete;
    const pendingVerification = data.filter(p => !p.verificacion_eficacia && !p.isIncomplete).length;
    return { total, incomplete, complete, pendingVerification };
  }, [data]);

  if (loading === LoadingState.LOADING) return <SkeletonLoader />;
  
  if (loading === LoadingState.ERROR) {
    return (
      <DashboardFrame title="Plan de Acción" onBack={onBack}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-12 text-center">
          <div className="w-24 h-24 bg-rose-50 rounded-[2.5rem] flex items-center justify-center text-rose-500 mb-8">
            <Icons.AlertTriangle className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter mb-4">Error al Cargar Datos</h3>
          <p className="text-slate-500 max-w-md font-medium leading-relaxed mb-10">
            Hubo un problema al intentar obtener la información del Google Sheet. Verifique que la URL sea correcta y esté publicada como CSV.
          </p>
          <button 
            onClick={() => setRetryCount(prev => prev + 1)}
            className="px-10 py-4 bg-slate-950 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-900/40 hover:scale-105 transition-all"
          >
            Reintentar
          </button>
        </div>
      </DashboardFrame>
    );
  }

  return (
    <DashboardFrame
      title="Plan de Acción"
      subtitle="Control y Verificación de Calidad"
      onBack={onBack}
    >
      <div className="space-y-8 p-6">
        {/* Tab Switcher */}
        <div className="flex items-center justify-center mb-8">
          <div className="bg-slate-100 p-1.5 rounded-[2rem] flex gap-2 border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveTab('postventa')}
              className={`px-10 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${
                activeTab === 'postventa' 
                ? 'bg-white text-blue-600 shadow-xl shadow-blue-500/10 border border-blue-100' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icons.Wrench className="w-4 h-4" />
              Postventa
            </button>
            <button
              onClick={() => setActiveTab('ventas')}
              className={`px-10 py-3 rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${
                activeTab === 'ventas' 
                ? 'bg-white text-orange-600 shadow-xl shadow-orange-500/10 border border-orange-100' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icons.BarChart className="w-4 h-4" />
              Ventas
            </button>
          </div>
        </div>

        {!currentUrl ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] bg-white rounded-[3rem] border border-slate-100 p-12 text-center">
            <div className="w-20 h-20 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-300 mb-6">
              <Icons.AlertCircle className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">URL No Configurada</h4>
            <p className="text-slate-400 text-xs font-medium max-w-sm">
              La URL para el Plan de Acción de {activeTab === 'postventa' ? 'Postventa' : 'Ventas'} no ha sido configurada.
            </p>
          </div>
        ) : data.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] bg-white rounded-[3rem] border border-slate-100 p-12 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mb-6">
              <Icons.ClipboardList className="w-10 h-10" />
            </div>
            <h4 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">No se encontraron datos</h4>
            <p className="text-slate-400 text-xs font-medium max-w-sm">
              Asegúrese de que el Google Sheet tenga el formato correcto y que los datos comiencen después de los encabezados.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <LuxuryKPICard 
                title="Total Planes" 
                value={stats.total} 
                icon={Icons.ClipboardList}
                color="bg-slate-900"
              />
              <LuxuryKPICard 
                title="Incompletos" 
                value={stats.incomplete} 
                icon={Icons.AlertCircle}
                color="bg-rose-600"
              />
              <LuxuryKPICard 
                title="Pend. Verificación" 
                value={stats.pendingVerification} 
                icon={Icons.ShieldAlert}
                color="bg-amber-500"
              />
              <LuxuryKPICard 
                title="Completos" 
                value={stats.complete} 
                icon={Icons.CheckCircle}
                color="bg-emerald-600"
              />
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col lg:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex bg-slate-100 p-1.5 rounded-2xl overflow-x-auto max-w-full">
                {(['all', 'incomplete', 'pending_verification', 'complete'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      filter === f ? 'bg-white text-blue-600 shadow-md border border-slate-200' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {f === 'all' ? 'Todos' : f === 'incomplete' ? 'Incompletos' : f === 'pending_verification' ? 'Pend. Verificación' : 'Completos'}
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-96">
                <Icons.Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Buscar por KPI, Responsable, Sector..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 outline-none transition-all placeholder:text-slate-300"
                />
              </div>
            </div>

            {/* Plans List */}
            <div className="grid grid-cols-1 gap-5">
              {filteredData.length === 0 ? (
                <div className="bg-white p-20 rounded-[3rem] border border-slate-100 text-center">
                  <Icons.SearchX className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">No hay planes que coincidan con el criterio</p>
                </div>
              ) : (
                filteredData.map((plan) => (
                  <motion.div
                    key={plan.id}
                    layoutId={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                      <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                          plan.isIncomplete ? 'bg-rose-50 text-rose-500 shadow-rose-500/10' : 
                          !plan.verificacion_eficacia ? 'bg-amber-50 text-amber-500 shadow-amber-500/10' :
                          'bg-emerald-50 text-emerald-500 shadow-emerald-500/10'
                        }`}>
                          {plan.isIncomplete ? <Icons.AlertCircle className="w-8 h-8" /> : 
                           !plan.verificacion_eficacia ? <Icons.ShieldAlert className="w-8 h-8" /> :
                           <Icons.CheckCircle className="w-8 h-8" />}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nº {plan.nro}</span>
                            <div className="h-3 w-px bg-slate-200"></div>
                            <StatusBadge 
                              status={plan.isIncomplete ? 'error' : !plan.verificacion_eficacia ? 'warning' : 'success'} 
                              label={plan.isIncomplete ? 'Incompleto' : !plan.verificacion_eficacia ? 'Pend. Verificación' : 'Verificado'} 
                            />
                            {plan.provincia && (
                              <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase tracking-widest">{plan.provincia}</span>
                            )}
                          </div>
                          <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase italic tracking-tighter leading-tight">{plan.nombre_kpi}</h3>
                          <div className="flex items-center gap-4 mt-2">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                              <Icons.Users className="w-3 h-3" /> {plan.responsable}
                            </p>
                            <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{plan.sector}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-10 text-right ml-auto">
                        <div className="hidden sm:block">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest block mb-1">Mes</span>
                          <span className="text-sm font-black text-slate-700 uppercase italic">{plan.mes}</span>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                          <Icons.ChevronRight className="w-6 h-6" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 h-1 bg-slate-100 w-full overflow-hidden">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: plan.isIncomplete ? '33%' : !plan.verificacion_eficacia ? '66%' : '100%' }}
                            className={`h-full ${plan.isIncomplete ? 'bg-rose-500' : !plan.verificacion_eficacia ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}
      </div>

        {/* Plan Detail Modal */}
        <AnimatePresence>
          {selectedPlan && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPlan(null)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
              />
              <motion.div 
                layoutId={selectedPlan.id}
                className="relative w-full max-w-5xl bg-white rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]"
              >
                {/* Header */}
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 backdrop-blur-xl">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center shadow-xl ${
                      selectedPlan.isIncomplete ? 'bg-rose-50 text-rose-500 shadow-rose-500/10' : 
                      !selectedPlan.verificacion_eficacia ? 'bg-amber-50 text-amber-500 shadow-amber-500/10' :
                      'bg-emerald-50 text-emerald-500 shadow-emerald-500/10'
                    }`}>
                      {selectedPlan.isIncomplete ? <Icons.AlertCircle className="w-8 h-8" /> : 
                       !selectedPlan.verificacion_eficacia ? <Icons.ShieldAlert className="w-8 h-8" /> :
                       <Icons.CheckCircle className="w-8 h-8" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Plan de Acción Nº {selectedPlan.nro}</span>
                        <StatusBadge 
                          status={selectedPlan.isIncomplete ? 'error' : !selectedPlan.verificacion_eficacia ? 'warning' : 'success'} 
                          label={selectedPlan.isIncomplete ? 'Incompleto' : !selectedPlan.verificacion_eficacia ? 'Pend. Verificación' : 'Verificado'} 
                        />
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">{selectedPlan.nombre_kpi}</h2>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPlan(null)}
                    className="w-12 h-12 rounded-2xl bg-white shadow-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-950 hover:rotate-90 transition-all duration-500"
                  >
                    <Icons.X className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                  {/* Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                      { label: 'Responsable', value: selectedPlan.responsable, icon: Icons.User },
                      { label: 'Sector', value: selectedPlan.sector, icon: Icons.Layers },
                      { label: 'Estado Gestión', value: selectedPlan.estado, icon: Icons.Activity, isStatus: true },
                      { label: 'Mes / Período', value: selectedPlan.mes, icon: Icons.Calendar }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all">
                        <div className="flex items-center gap-3 mb-3">
                          <item.icon className="w-3 h-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                        </div>
                        {item.isStatus ? (
                          <StatusBadge status={item.value === 'Finalizado' ? 'success' : 'warning'} label={item.value} />
                        ) : (
                          <p className="text-sm font-black text-slate-900 uppercase italic">{item.value}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Analysis Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-black text-blue-600 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Icons.Search className="w-4 h-4" /> Análisis y Diagnóstico
                      </h4>
                      
                      <div className="space-y-4">
                        <div className={`p-8 rounded-[2.5rem] border transition-all ${selectedPlan.causa_raiz ? 'bg-white border-slate-100 shadow-sm' : 'bg-rose-50/30 border-rose-100'}`}>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Causa Raíz (5 Porqués)</span>
                            {selectedPlan.causa_raiz && <Icons.CheckCircle className="w-4 h-4 text-emerald-500" />}
                          </div>
                          <p className={`text-sm leading-relaxed ${selectedPlan.causa_raiz ? 'text-slate-700 font-medium' : 'text-rose-400 italic font-bold'}`}>
                            {selectedPlan.causa_raiz || 'Pendiente de completar diagnóstico'}
                          </p>
                        </div>

                        <div className={`p-8 rounded-[2.5rem] border transition-all ${selectedPlan.accion_inmediata ? 'bg-white border-slate-100 shadow-sm' : 'bg-rose-50/30 border-rose-100'}`}>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción Inmediata (Contención)</span>
                            {selectedPlan.accion_inmediata && <Icons.CheckCircle className="w-4 h-4 text-emerald-500" />}
                          </div>
                          <p className={`text-sm leading-relaxed ${selectedPlan.accion_inmediata ? 'text-slate-700 font-medium' : 'text-rose-400 italic font-bold'}`}>
                            {selectedPlan.accion_inmediata || 'Pendiente de definir acción inmediata'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.4em] flex items-center gap-3">
                        <Icons.ShieldCheck className="w-4 h-4" /> Ejecución y Verificación
                      </h4>
                      
                      <div className="space-y-4">
                        <div className={`p-8 rounded-[2.5rem] border transition-all ${selectedPlan.accion_correctiva ? 'bg-white border-slate-100 shadow-sm' : 'bg-rose-50/30 border-rose-100'}`}>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción Correctiva / Preventiva</span>
                            {selectedPlan.accion_correctiva && <Icons.CheckCircle className="w-4 h-4 text-emerald-500" />}
                          </div>
                          <p className={`text-sm leading-relaxed ${selectedPlan.accion_correctiva ? 'text-slate-700 font-medium' : 'text-rose-400 italic font-bold'}`}>
                            {selectedPlan.accion_correctiva || 'Pendiente de definir plan correctivo'}
                          </p>
                        </div>

                        <div className={`p-8 rounded-[2.5rem] border transition-all ${selectedPlan.verificacion_eficacia ? 'bg-emerald-50/30 border-emerald-100 shadow-sm' : 'bg-amber-50/30 border-amber-100'}`}>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verificación de Eficacia</span>
                            {selectedPlan.verificacion_eficacia ? <Icons.ShieldCheck className="w-5 h-5 text-emerald-500" /> : <Icons.ShieldAlert className="w-5 h-5 text-amber-500" />}
                          </div>
                          <p className={`text-sm leading-relaxed ${selectedPlan.verificacion_eficacia ? 'text-emerald-700 font-bold' : 'text-amber-600 italic font-bold'}`}>
                            {selectedPlan.verificacion_eficacia || 'Pendiente de verificación de eficacia por Calidad'}
                          </p>
                          {selectedPlan.fecha_verificacion && (
                            <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center gap-2">
                                <Icons.Calendar className="w-3 h-3 text-emerald-400" />
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Verificado el: {selectedPlan.fecha_verificacion}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KPI Metrics */}
                  <div className="bg-slate-950 text-white p-10 rounded-[3.5rem] relative overflow-hidden shadow-2xl">
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
                      <div className="space-y-8">
                        <h4 className="text-[11px] font-black text-blue-400 uppercase tracking-[0.4em] flex items-center gap-3">
                          <Icons.Target className="w-4 h-4" /> Objetivo del KPI
                        </h4>
                        <div className="flex items-end gap-6">
                            <div className="text-6xl font-black italic tracking-tighter text-white">{selectedPlan.objetivo_kpi_cuantitativo}</div>
                            <div className="mb-2 text-sm font-medium text-slate-400 max-w-[200px] leading-tight">{selectedPlan.objetivo_kpi_cualitativo}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-8">
                        <h4 className="text-[11px] font-black text-rose-400 uppercase tracking-[0.4em] flex items-center gap-3">
                          <Icons.TrendingDown className="w-4 h-4" /> Situación / Desvío
                        </h4>
                        <div className="flex items-end gap-6">
                            <div className="text-6xl font-black italic tracking-tighter text-rose-500">{selectedPlan.situacion_actual_cuantitativo}</div>
                            <div className="mb-2 text-sm font-medium text-slate-400 max-w-[200px] leading-tight">{selectedPlan.situacion_actual_cualitativo}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[100px]"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px]"></div>
                  </div>

                  {/* Seguimiento Mensual */}
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center gap-3">
                      <Icons.Activity className="w-4 h-4" /> Seguimiento Mensual de Eficacia
                    </h4>
                    <div className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-12 gap-3">
                      {Object.entries(selectedPlan.seguimiento).map(([mes, valor]) => (
                        <div key={mes} className={`p-4 rounded-2xl border text-center transition-all ${valor ? 'bg-blue-50 border-blue-100 shadow-sm' : 'bg-slate-50 border-slate-100 opacity-40'}`}>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">{mes}</span>
                          <span className={`text-xs font-black ${valor ? 'text-blue-600' : 'text-slate-300'}`}>{valor || '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-10 border-t border-slate-100 bg-slate-50/80 backdrop-blur-xl flex justify-between items-center">
                  <div className="flex items-center gap-4 text-slate-400">
                    <Icons.Info className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Última actualización: {selectedPlan.fecha_alta}</span>
                  </div>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setSelectedPlan(null)}
                      className="px-10 py-4 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200"
                    >
                      Cerrar Vista
                    </button>
                    {formUrl && (
                      <button 
                        onClick={() => {
                          window.open(formUrl, '_blank');
                        }}
                        className="px-10 py-4 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/30 hover:bg-blue-600 transition-all flex items-center gap-4 group"
                      >
                        <Icons.Edit className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                        Gestionar Plan en Formulario
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </DashboardFrame>
  );
};

export default ActionPlanDashboard;
