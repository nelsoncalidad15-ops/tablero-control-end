import React, { useEffect, useState } from 'react';
import { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Portal from './components/Portal';
import { Icons } from './components/Icon';
import { AppConfig, AreaConfig } from './types';
import { DEFAULT_CONFIG, SALES_QUALITY_SHEET_KEY, SALES_CLAIMS_SHEET_KEY, AREAS } from './constants';
import { primeBackendConnection } from './services/dataService';

const Dashboard = lazy(() => import('./components/Dashboard'));
const QualityDashboard = lazy(() => import('./components/QualityDashboard'));
const DetailedQualityPostventa = lazy(() => import('./components/DetailedQualityPostventa'));
const PostventaDashboard = lazy(() => import('./components/PostventaDashboard'));
const PostventaKpiDashboard = lazy(() => import('./components/PostventaKpiDashboard'));
const PostventaBillingDashboard = lazy(() => import('./components/PostventaBillingDashboard'));
const SalesQualityDashboard = lazy(() => import('./components/SalesQualityDashboard'));
const InternalPostventaDashboard = lazy(() => import('./components/InternalPostventaDashboard'));
const ActionPlanDashboard = lazy(() => import('./components/ActionPlanDashboard'));
const PCGCDashboard = lazy(() => import('./components/PCGCDashboard'));
const RRHHDashboard = lazy(() => import('./components/RRHHDashboard'));
const ExecutiveSummary = lazy(() => import('./components/ExecutiveSummary'));
const ProfessionalReport = lazy(() => import('./components/ProfessionalReport'));
const FullReportPrintView = lazy(() => import('./components/FullReportPrintView'));
const ReportConfigModal = lazy(() => import('./components/ReportConfigModal'));

const FRONTEND_ONLY_POSTVENTA = false;
const FRONTEND_ONLY_RRHH = false;

const resolveDataSource = (frontendKey: string, backendUrl: string, enabled: boolean) =>
  enabled ? frontendKey : backendUrl;

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [printReportLocation, setPrintReportLocation] = useState<'JUJUY' | 'SALTA' | null>(null);
  const [reportConfig, setReportConfig] = useState<{ location: 'JUJUY' | 'SALTA', month: string | null, template: any } | null>(null);

  useEffect(() => {
    primeBackendConnection();
  }, []);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
  };


  const handleSelectArea = (area: AreaConfig) => {
    if (area.id === 'executive' as any) {
        navigate('/executive');
        return;
    }
    if (area.id === 'calidad') {
        navigate('/calidad');
    } else if (area.id === 'postventa') {
        navigate('/postventa');
    } else {
        navigate(`/dashboard/${area.id}`);
    }
  };

  const handleBackToPortal = () => {
    navigate('/');
  };

  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  );

  const RouteLoader = ({ label = 'Cargando módulo...' }: { label?: string }) => (
    <div className="flex min-h-[50vh] items-center justify-center px-6">
      <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 px-8 py-7 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_34px_rgba(15,23,42,0.24)]">
          <Icons.Activity className="h-5 w-5 animate-pulse" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">{label}</p>
      </div>
    </div>
  );

  const DashboardHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <header className="bg-white/80 backdrop-blur-3xl border-b border-slate-200/60 sticky top-0 z-50 px-6 md:px-12 py-6">
      <div className="w-full flex items-center justify-between">
        <div className="flex items-center gap-10">
          <motion.button 
            whileHover={{ scale: 1.1, x: -5 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack} 
            className="p-3 rounded-2xl bg-slate-50 border border-slate-100 transition-all text-slate-500 hover:text-blue-600 hover:border-blue-100"
          >
            <Icons.ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div className="h-10 w-px bg-slate-200/60"></div>
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center text-white font-black text-xl tracking-tighter italic shadow-2xl shadow-slate-900/20">VW</div>
            <div>
              <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tighter italic leading-none">{title}</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Autosol Intelligence System â€¢ v2.5</p>
            </div>
          </div>
        </div>
        
        <div className="hidden lg:flex items-center gap-12">
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">System Status</span>
            <div className="flex items-center gap-3 px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Online & Secure</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );

  const QualitySelection = () => (
    <PageWrapper>
      <div className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-slate-950 font-sans text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,_rgba(79,70,229,0.18),_transparent_26%),radial-gradient(circle_at_18%_14%,_rgba(56,189,248,0.11),_transparent_22%),radial-gradient(circle_at_82%_18%,_rgba(245,158,11,0.08),_transparent_20%),linear-gradient(180deg,_#020617_0%,_#050816_46%,_#020617_100%)]" />
          <div className="absolute inset-x-0 top-0 h-40 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.045),transparent)] opacity-35" />
          <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
          <div className="absolute bottom-8 right-0 h-80 w-80 rounded-full bg-violet-400/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-[1700px] flex-col gap-4 px-4 py-4 md:px-6 md:py-5 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex shrink-0 items-center justify-between rounded-[1.35rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] px-4 py-3 shadow-[0_24px_80px_rgba(2,6,23,0.30)] backdrop-blur-xl md:px-5"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white text-sm font-black italic text-slate-950 shadow-[0_10px_30px_rgba(255,255,255,0.12)] md:h-12 md:w-12 md:text-base">
                VW
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.34em] text-slate-400 md:text-[10px]">Autosol Group</p>
                <h1 className="text-lg font-black tracking-tight text-white md:text-xl lg:text-2xl">Centro de Calidad</h1>
              </div>
            </div>
            <button onClick={handleBackToPortal} className="hidden md:inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
              <Icons.ArrowLeft className="h-4 w-4" />
              Volver al Portal
            </button>
          </motion.div>

          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(135deg,rgba(5,8,22,0.94),rgba(10,15,33,0.88))] p-5 text-white shadow-[0_34px_100px_rgba(2,6,23,0.42)] backdrop-blur-xl md:p-6 lg:p-6"
          >
            <div className="flex flex-col gap-5 md:gap-6 lg:flex-row lg:items-stretch">
              <div className="flex flex-1 flex-col justify-between gap-4 md:gap-5">
                <div className="max-w-4xl">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px w-10 bg-gradient-to-r from-cyan-400/80 to-transparent" />
                  </div>
                  <h2 className="max-w-3xl text-[2.35rem] font-black leading-[0.94] tracking-tight text-balance md:text-[3.15rem] lg:text-[3.45rem]">
                    <span className="block">Visión operativa clara</span>
                    <span className="block text-white/90">para decisiones rápidas.</span>
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300/88 md:text-[15px] md:leading-7">
                    Seleccione el módulo de análisis para visualizar el rendimiento y la satisfacción del cliente en tiempo real.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 self-stretch rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] lg:w-[320px]">
                {[
                  { icon: Icons.Activity, label: 'Lectura', value: 'Rápida' },
                  { icon: Icons.Monitor, label: 'Control', value: 'Unificado' },
                  { icon: Icons.FileText, label: 'Reporte', value: 'Ejecutivo' },
                ].map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center justify-between rounded-[1.15rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-cyan-200">
                          <ItemIcon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[0.32em] text-slate-400">{item.label}</p>
                          <p className="mt-1 text-sm font-black text-white">{item.value}</p>
                        </div>
                      </div>
                      <Icons.ArrowRight className="h-4 w-4 text-slate-500" />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>
          
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.30)] backdrop-blur-xl md:p-5"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
            {[
              { id: 'ventas', path: '/calidad/ventas', name: 'Ventas', icon: Icons.BarChart, color: 'from-orange-500 to-amber-500', desc: 'Satisfacción en salón y procesos comerciales' },
              { id: 'postventa', path: '/calidad/postventa_selection', name: 'Postventa', icon: Icons.Wrench, color: 'from-blue-500 to-indigo-500', desc: 'Gestión de reclamos, taller y servicios' },
              { id: 'pcgc', path: '/calidad/pcgc', name: 'PCGC', icon: Icons.ClipboardList, color: 'from-indigo-500 to-purple-500', desc: 'Programa de Calidad de Gestión y Auditoría' },
              { id: 'plan_accion', path: '/calidad/plan_accion', name: 'Plan de Acción', icon: Icons.ClipboardCheck, color: 'from-emerald-500 to-teal-500', desc: 'Control y verificación de desvíos' },
            ].map((item) => (
              <motion.button 
                key={item.id}
                whileHover={{ y: -10 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.path)}
                className="group relative min-h-[190px] rounded-[1.65rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,16,32,0.90),rgba(15,23,42,0.80))] p-5 text-center transition-all hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.92))] hover:shadow-[0_18px_50px_rgba(15,23,42,0.34)] md:min-h-[210px] md:p-6"
              >
                <div className="flex h-full flex-col items-center justify-between">
                  <div className="flex h-full w-full flex-col items-center justify-center gap-6">
                    <div className={`flex h-20 w-20 items-center justify-center rounded-[1.8rem] border ${item.color.includes('orange') ? 'bg-orange-500/15 text-orange-300 border-orange-400/20' : item.color.includes('blue') ? 'bg-blue-500/15 text-blue-300 border-blue-400/20' : item.color.includes('indigo') ? 'bg-indigo-500/15 text-indigo-300 border-indigo-400/20' : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20'} shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`}>
                      <item.icon className="h-9 w-9" />
                    </div>
                    <div>
                      <h3 className="text-[1.45rem] font-black uppercase leading-none tracking-tight text-white md:text-[1.6rem]">{item.name}</h3>
                      <p className="mt-3 text-[0.7rem] font-black uppercase tracking-[0.42em] text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                  <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/5">
                    <div className="h-full w-1/2 rounded-full bg-blue-400 opacity-70 transition-all group-hover:w-full" />
                  </div>
                </div>
                </motion.button>
            ))}
            </div>

            <div className="flex justify-center pt-6">
              <button onClick={handleBackToPortal} className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-[0.32em] text-slate-300 transition-all hover:bg-white/10 hover:text-white">
                <Icons.ArrowLeft className="h-4 w-4" />
                Volver al Portal
              </button>
            </div>
          </motion.section>
        </div>
      </div>
    </PageWrapper>
  );

  const PostventaSelection = () => (
    <PageWrapper>
      <div className="min-h-screen relative bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
         {/* Immersive Background */}
         <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            className="absolute inset-0 z-0"
            style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=2800&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.4) contrast(1.1) saturate(0)'
            }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/20 via-slate-950/80 to-slate-950"></div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[4rem] shadow-2xl p-12 md:p-20 w-full text-center"
        >
          <div className="mb-20">
            <h2 className="text-6xl lg:text-8xl font-black text-white mb-6 uppercase italic tracking-tighter leading-[0.9]">Área de <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-400">Postventa</span></h2>
            <p className="text-indigo-400 font-black uppercase text-[12px] md:text-[14px] tracking-[0.6em] opacity-80">Operations & Service Management</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {([
              { id: 'operativo', path: '/postventa/operativo', name: 'Control Operativo', icon: Icons.Wrench, color: 'blue', desc: 'Gestión de taller' },
              { id: 'gestion_kpis', path: '/postventa/kpis', name: 'Gestión KPIs', icon: Icons.BarChart, color: 'indigo', desc: 'Indicadores clave' },
              { id: 'facturacion', path: '/postventa/facturacion', name: 'Facturación', icon: Icons.Banknote, color: 'amber', desc: 'Avance de ventas' }
            ] as const).map((item) => {
              const colorClasses = {
                blue: "bg-blue-500/20 text-blue-400 shadow-blue-500/40 border-blue-500/30",
                indigo: "bg-indigo-500/20 text-indigo-400 shadow-indigo-500/40 border-indigo-500/30",
                amber: "bg-amber-500/20 text-amber-400 shadow-amber-500/40 border-amber-500/30",
              }[item.color];

              return (
                <motion.button 
                  key={item.id}
                  whileHover={{ y: -15, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(item.path)}
                  className="p-12 bg-white/5 border border-white/10 rounded-[3rem] transition-all group text-center flex flex-col items-center relative overflow-hidden shadow-2xl"
                >
                  <div className={`${colorClasses} w-36 h-36 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700`}>
                    <item.icon className="w-16 h-16" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-black text-white uppercase tracking-tight leading-tight text-3xl mb-4 group-hover:text-blue-400 transition-colors">{item.name}</h3>
                  <p className="text-blue-400 text-[13px] font-bold uppercase tracking-[0.25em] leading-relaxed max-w-[240px]">{item.desc}</p>
                  <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
                </motion.button>
              );
            })}
          </div>

          <button onClick={handleBackToPortal} className="mt-20 text-white/40 font-black uppercase text-[12px] tracking-[0.6em] hover:text-white transition-colors flex items-center gap-6 mx-auto group">
            <Icons.ArrowLeft className="w-6 h-6 group-hover:-translate-x-3 transition-transform" />
            Volver al Portal Principal
          </button>
        </motion.div>
      </div>
    </PageWrapper>
  );

  const PostventaQualitySelection = () => (
    <PageWrapper>
      <div className="min-h-screen relative bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
         {/* Immersive Background */}
         <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            className="absolute inset-0 z-0"
            style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=2800&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.4) contrast(1.1) saturate(0)'
            }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/20 via-slate-950/80 to-slate-950"></div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[4rem] shadow-2xl p-12 md:p-20 w-full text-center"
        >
          <div className="mb-20">
            <h2 className="text-6xl lg:text-8xl font-black text-white mb-6 uppercase italic tracking-tighter leading-[0.9]">Calidad <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-400">Postventa</span></h2>
            <p className="text-blue-400 font-black uppercase text-[12px] md:text-[14px] tracking-[0.6em] opacity-80">Satisfaction & Quality Monitoring</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {([
              { id: 'claims', path: '/calidad/postventa/claims', name: 'Gestión de Reclamos', icon: Icons.AlertCircle, color: 'blue', desc: 'Seguimiento de quejas' },
              { id: 'refuerzo', path: '/calidad/refuerzo', name: 'Refuerzo', icon: Icons.Activity, color: 'indigo', desc: 'Análisis detallado' },
              { id: 'internal', path: '/calidad/postventa/internal_surveys', name: 'Encuesta Interna', icon: Icons.ClipboardCheck, color: 'blue', desc: 'Satisfacción post-servicio' }
            ] as const).map((item) => {
              const colorClasses = {
                blue: "bg-blue-500/20 text-blue-400 shadow-blue-500/40 border-blue-500/30",
                indigo: "bg-indigo-500/20 text-indigo-400 shadow-indigo-500/40 border-indigo-500/30",
              }[item.color];

              return (
                <motion.button 
                  key={item.id}
                  whileHover={{ y: -15, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(item.path)}
                  className="p-12 bg-white/5 border border-white/10 rounded-[3rem] transition-all group text-center flex flex-col items-center relative overflow-hidden shadow-2xl"
                >
                  <div className={`${colorClasses} w-36 h-36 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border group-hover:scale-110 group-hover:rotate-6 transition-all duration-700`}>
                    <item.icon className="w-16 h-16" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-black text-white uppercase tracking-tight leading-tight text-3xl mb-4 group-hover:text-blue-400 transition-colors">{item.name}</h3>
                  <p className="text-white/40 text-[13px] font-bold uppercase tracking-[0.25em] leading-relaxed max-w-[240px]">{item.desc}</p>
                  <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
                </motion.button>
              );
            })}
          </div>

          <button onClick={() => navigate('/calidad')} className="mt-20 text-white/40 font-black uppercase text-[12px] tracking-[0.6em] hover:text-white transition-colors flex items-center gap-6 mx-auto group">
            <Icons.ArrowLeft className="w-6 h-6 group-hover:-translate-x-3 transition-transform" />
            Volver a Selección de Calidad
          </button>
        </motion.div>
      </div>
    </PageWrapper>
  );

  const VentasSelection = () => (
    <PageWrapper>
      <div className="min-h-screen relative bg-slate-950 flex items-center justify-center p-4 overflow-hidden">
         {/* Immersive Background */}
         <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.3 }}
            className="absolute inset-0 z-0"
            style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=2800&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.4) contrast(1.1) saturate(0)'
            }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/20 via-slate-950/80 to-slate-950"></div>

        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[4rem] shadow-2xl p-12 md:p-20 w-full text-center"
        >
          <div className="mb-20">
            <h2 className="text-6xl lg:text-8xl font-black text-white mb-6 uppercase italic tracking-tighter leading-[0.9]">Calidad <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-400">Ventas</span></h2>
            <p className="text-orange-400 font-black uppercase text-[12px] md:text-[14px] tracking-[0.6em] opacity-80">Satisfaction & Performance Analysis</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {([
              { id: 'surveys', path: '/calidad/ventas/surveys', name: 'Encuestas Internas', icon: Icons.ClipboardCheck, color: 'blue', desc: 'Satisfacción en salón' },
              { id: 'claims', path: '/calidad/ventas/claims', name: 'Gestión de Reclamos', icon: Icons.AlertCircle, color: 'orange', desc: 'Seguimiento de quejas' },
              { id: 'cem_os', path: '/calidad/ventas/cem_os', name: 'CEM OS', icon: Icons.BarChart, color: 'indigo', desc: 'Análisis de satisfacción general' }
            ] as const).map((item) => {
              const colorClasses = {
                blue: "bg-blue-500/20 text-blue-400 shadow-blue-500/40 border-blue-500/30",
                orange: "bg-orange-500/20 text-orange-400 shadow-orange-500/40 border-orange-500/30",
                indigo: "bg-indigo-500/20 text-indigo-400 shadow-indigo-500/40 border-indigo-500/30",
              }[item.color];

              return (
                <motion.button 
                  key={item.id}
                  whileHover={{ y: -15, backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(item.path)}
                  className="p-12 bg-white/5 border border-white/10 rounded-[3rem] transition-all group text-center flex flex-col items-center relative overflow-hidden shadow-2xl"
                >
                  <div className={`${colorClasses} w-36 h-36 rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border group-hover:scale-110 group-hover:rotate-6 transition-all duration-700`}>
                    <item.icon className="w-16 h-16" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-black text-white uppercase tracking-tight leading-tight text-3xl mb-4 group-hover:text-orange-400 transition-colors">{item.name}</h3>
                  <p className="text-white/40 text-[13px] font-bold uppercase tracking-[0.25em] leading-relaxed max-w-[240px]">{item.desc}</p>
                  <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
                </motion.button>
              );
            })}
          </div>

          <button onClick={() => navigate('/calidad')} className="mt-20 text-white/40 font-black uppercase text-[12px] tracking-[0.6em] hover:text-white transition-colors flex items-center gap-6 mx-auto group">
            <Icons.ArrowLeft className="w-6 h-6 group-hover:-translate-x-3 transition-transform" />
            Volver a Selección de Calidad
          </button>
        </motion.div>
      </div>
    </PageWrapper>
  );

  const DashboardView = ({ type, subType }: { type: string, subType?: string }) => {
    const { areaId: paramAreaId } = useParams();
    const effectiveType = type === 'generic' ? paramAreaId : type;
    const area = AREAS.find(a => a.id === effectiveType);
    
    let dashboardContent;

    const handleBack = () => {
      if (effectiveType === 'calidad') {
        if (subType?.startsWith('ventas-')) navigate('/calidad/ventas');
        else if (subType?.startsWith('postventa-')) navigate('/calidad/postventa_selection');
        else navigate('/calidad');
      }
      else if (effectiveType === 'postventa') navigate('/postventa');
      else if (effectiveType === 'executive') navigate('/');
      else handleBackToPortal();
    };

    if (effectiveType === 'calidad') {
      if (subType === 'postventa-claims') {
        dashboardContent = <QualityDashboard area={area!} sheetUrl={config.sheetUrls.calidad} onBack={handleBack} />;
      } else if (subType === 'postventa-internal') {
        dashboardContent = <InternalPostventaDashboard sheetUrl={config.sheetUrls.internal_postventa || ''} onBack={handleBack} />;
      } else if (subType === 'refuerzo') {
        dashboardContent = (
          <DetailedQualityPostventa 
            sheetUrls={{ 
              jujuy: config.sheetUrls.detailed_quality || '', 
              salta: config.sheetUrls.detailed_quality_salta || '' 
            }} 
            onBack={handleBack} 
          />
        );
      } else if (subType === 'ventas-surveys') {
        dashboardContent = <SalesQualityDashboard onBack={handleBack} initialTab="surveys" config={config} />;
      } else if (subType === 'ventas-claims') {
        dashboardContent = <SalesQualityDashboard onBack={handleBack} initialTab="claims" config={config} />;
      } else if (subType === 'ventas-cem_os') {
        dashboardContent = <SalesQualityDashboard onBack={handleBack} initialTab="cem_os" config={config} />;
      } else if (subType === 'pcgc') {
        dashboardContent = <PCGCDashboard sheetUrl={config.sheetUrls.pcgc || ''} onBack={handleBack} />;
      } else if (subType === 'plan_accion') {
        dashboardContent = (
          <ActionPlanDashboard 
            sheetUrl={config.sheetUrls.action_plan || ''} 
            salesSheetUrl={config.sheetUrls.action_plan_sales || ''}
            formUrl={config.sheetUrls.action_plan_form || ''}
            onBack={handleBack} 
          />
        );
      }
    } else if (effectiveType === 'rrhh') {
      dashboardContent = (
        <RRHHDashboard 
          gradesUrl={resolveDataSource('hr_grades', config.sheetUrls.rrhh || '', FRONTEND_ONLY_RRHH)} 
          relatorioUrl={resolveDataSource('hr_relatorio', config.sheetUrls.hr_relatorio || '', FRONTEND_ONLY_RRHH)}
          contactsUrl={resolveDataSource('hr_contacts', config.sheetUrls.hr_contacts || '', FRONTEND_ONLY_RRHH)}
          phasesUrl={resolveDataSource('hr_phases', config.sheetUrls.hr_phases || '', FRONTEND_ONLY_RRHH)}
          onBack={handleBack} 
        />
      );
    } else if (effectiveType === 'executive') {
        dashboardContent = <ExecutiveSummary config={config} onBack={handleBack} />;
    } else if (effectiveType === 'postventa') {
      if (subType === 'operativo') {
        dashboardContent = <PostventaDashboard sheetUrl={resolveDataSource('postventa', config.sheetUrls.postventa, FRONTEND_ONLY_POSTVENTA)} onBack={handleBack} />;
      } else if (subType === 'kpis') {
        dashboardContent = <PostventaKpiDashboard sheetUrl={resolveDataSource('postventa_kpis', config.sheetUrls.postventa_kpis || '', FRONTEND_ONLY_POSTVENTA)} onBack={handleBack} />;
      } else if (subType === 'facturacion') {
        dashboardContent = <PostventaBillingDashboard sheetUrl={resolveDataSource('postventa_billing', config.sheetUrls.postventa_billing || '', FRONTEND_ONLY_POSTVENTA)} onBack={handleBack} />;
      }
    } else if (area) {
      const areaId = area.id as keyof typeof config.sheetUrls;
      dashboardContent = (
        <Dashboard 
          area={area}
          sheetUrl={config.sheetUrls[areaId] || ''}
          apiKey={config.geminiApiKey}
          onBack={handleBack}
        />
      );
    } else {
      dashboardContent = (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
          <Icons.AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm font-black uppercase tracking-widest">Área no encontrada</p>
          <button onClick={handleBackToPortal} className="mt-6 text-blue-600 font-black uppercase text-[10px] tracking-widest">Volver al Portal</button>
        </div>
      );
    }

    return (
      <PageWrapper>
        <div className="min-h-screen bg-slate-50">
          <main className="animate-fade-in w-full">
            <Suspense fallback={<RouteLoader label="Cargando dashboard..." />}>
              {dashboardContent}
            </Suspense>
          </main>
        </div>
      </PageWrapper>
    );
  };

  return (
    <>
      <Suspense fallback={<RouteLoader />}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><Portal onSelectArea={handleSelectArea} /></PageWrapper>} />
            
            <Route path="/calidad" element={<QualitySelection />} />
            <Route path="/calidad/postventa_selection" element={<PostventaQualitySelection />} />
            <Route path="/calidad/ventas" element={<VentasSelection />} />
            <Route path="/calidad/ventas/surveys" element={<DashboardView type="calidad" subType="ventas-surveys" />} />
            <Route path="/calidad/ventas/claims" element={<DashboardView type="calidad" subType="ventas-claims" />} />
            <Route path="/calidad/ventas/cem_os" element={<DashboardView type="calidad" subType="ventas-cem_os" />} />
            <Route path="/calidad/postventa/claims" element={<DashboardView type="calidad" subType="postventa-claims" />} />
            <Route path="/calidad/postventa/internal_surveys" element={<DashboardView type="calidad" subType="postventa-internal" />} />
            <Route path="/calidad/postventa" element={<Navigate to="/calidad/postventa_selection" />} />
            <Route path="/calidad/pcgc" element={<DashboardView type="calidad" subType="pcgc" />} />
            <Route path="/calidad/plan_accion" element={<DashboardView type="calidad" subType="plan_accion" />} />
            <Route path="/calidad/refuerzo" element={<DashboardView type="calidad" subType="refuerzo" />} />
            
            <Route path="/executive" element={<DashboardView type="executive" />} />
            <Route path="/report" element={<ProfessionalReport config={config} onBack={() => navigate('/executive')} />} />
            
            <Route path="/postventa" element={<PostventaSelection />} />
            <Route path="/postventa/operativo" element={<DashboardView type="postventa" subType="operativo" />} />
            <Route path="/postventa/kpis" element={<DashboardView type="postventa" subType="kpis" />} />
            <Route path="/postventa/facturacion" element={<DashboardView type="postventa" subType="facturacion" />} />
            
            <Route path="/dashboard/:areaId" element={<DashboardView type="generic" />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
        
        <ReportConfigModal 
          isOpen={!!printReportLocation}
          onClose={() => setPrintReportLocation(null)}
          initialLocation={printReportLocation || 'JUJUY'}
          template={config.reportTemplate || DEFAULT_CONFIG.reportTemplate}
          onUpdateTemplate={(newTemplate) => {
              handleSaveConfig({ ...config, reportTemplate: newTemplate });
          }}
          onGenerate={(cfg) => {
              setReportConfig(cfg);
              setPrintReportLocation(null);
          }}
        />
        
        {reportConfig && (
          <FullReportPrintView 
              location={reportConfig.location}
              config={reportConfig}
              onClose={() => setReportConfig(null)}
              sheetUrls={{
                  salesQuality: SALES_QUALITY_SHEET_KEY,
                  salesClaims: SALES_CLAIMS_SHEET_KEY,
                  postventaSummary: config.sheetUrls.calidad || '',
                  postventaDetailed: (reportConfig.location === 'JUJUY' ? config.sheetUrls.detailed_quality : config.sheetUrls.detailed_quality_salta) || ''
              }}
          />
        )}
      </Suspense>
    </>
  );
}

export default App;


