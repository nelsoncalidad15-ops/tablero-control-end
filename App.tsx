import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Portal from './components/Portal';
import Dashboard from './components/Dashboard';
import QualityDashboard from './components/QualityDashboard';
import DetailedQualityPostventa from './components/DetailedQualityPostventa';
import PostventaDashboard from './components/PostventaDashboard';
import PostventaKpiDashboard from './components/PostventaKpiDashboard';
import PostventaBillingDashboard from './components/PostventaBillingDashboard';
import SalesQualityDashboard from './components/SalesQualityDashboard';
import InternalPostventaDashboard from './components/InternalPostventaDashboard';
import ActionPlanDashboard from './components/ActionPlanDashboard';
import PCGCDashboard from './components/PCGCDashboard';
import RRHHDashboard from './components/RRHHDashboard';
import ExecutiveSummary from './components/ExecutiveSummary';
import ProfessionalReport from './components/ProfessionalReport';
import FullReportPrintView from './components/FullReportPrintView';
import ReportConfigModal from './components/ReportConfigModal';
import SettingsModal from './components/SettingsModal';
import { Icons } from './components/Icon';
import { AppConfig, AreaConfig, AreaType } from './types';
import { DEFAULT_CONFIG, SALES_QUALITY_SHEET_KEY, SALES_CLAIMS_SHEET_KEY, AREAS } from './constants';

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem('autosolPortalConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            ...DEFAULT_CONFIG,
            ...parsed,
            sheetUrls: {
              ...DEFAULT_CONFIG.sheetUrls,
              ...(parsed.sheetUrls || {})
            }
          };
        }
      }
    } catch (e) {
      console.error("Failed to parse saved config", e);
    }
    return DEFAULT_CONFIG;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGloballyAuthenticated, setIsGloballyAuthenticated] = useState(() => {
    try {
      const savedConfig = localStorage.getItem('autosolPortalConfig');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed && typeof parsed === 'object' && !parsed.isPasswordProtected) {
          return true;
        }
      }
      return localStorage.getItem('autosol_global_auth') === 'true';
    } catch (e) {
      console.error("Error checking global auth", e);
      return true;
    }
  });
  const [globalPasswordInput, setGlobalPasswordInput] = useState('');
  const [showGlobalAuthError, setShowGlobalAuthError] = useState(false);
  const [printReportLocation, setPrintReportLocation] = useState<'JUJUY' | 'SALTA' | null>(null);
  const [reportConfig, setReportConfig] = useState<{ location: 'JUJUY' | 'SALTA', month: string | null, template: any } | null>(null);

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('autosolPortalConfig', JSON.stringify(newConfig));
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
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Autosol Intelligence System • v2.5</p>
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
          <div className="h-10 w-px bg-slate-200/60"></div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="group flex items-center gap-4 px-6 py-3 rounded-2xl bg-slate-950 text-white hover:bg-blue-600 transition-all shadow-xl shadow-slate-900/10"
          >
            <Icons.Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
            <span className="text-[10px] font-black uppercase tracking-widest">Configuración</span>
          </button>
        </div>
      </div>
    </header>
  );

  const QualitySelection = () => (
    <PageWrapper>
      <div className="min-h-screen relative bg-[#020617] flex items-center justify-center p-4 overflow-hidden">
        {/* Immersive Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full"
        >
          <div className="text-center mb-16">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.4em] mb-8"
            >
                <Icons.ShieldCheck className="w-3 h-3" /> Intelligence Hub
            </motion.div>
            <h2 className="text-6xl lg:text-7xl font-black text-white mb-6 uppercase italic tracking-tighter leading-[0.9]">
                CENTRO DE <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">CALIDAD</span>
            </h2>
            <p className="text-slate-400 font-medium text-base md:text-lg max-w-2xl mx-auto">Seleccione el módulo de análisis para visualizar el rendimiento y la satisfacción del cliente en tiempo real.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
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
                className="group relative p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-left transition-all hover:bg-white/[0.08] hover:border-white/20 overflow-hidden"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mb-3">{item.name}</h3>
                <p className="text-slate-400 text-xs font-medium leading-relaxed">{item.desc}</p>
                
                {/* Decorative element */}
                <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors"></div>
              </motion.button>
            ))}
          </div>

          <div className="mt-20 flex flex-col items-center gap-8">
            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/report')}
                className="px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-blue-500/20 flex items-center gap-4 group"
            >
                <Icons.FileText className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Generar Reporte Profesional
            </motion.button>
            <button onClick={handleBackToPortal} className="text-slate-500 font-black uppercase text-[10px] tracking-[0.4em] hover:text-white transition-colors flex items-center gap-3">
              <Icons.ArrowLeft className="w-4 h-4" /> Volver al Portal
            </button>
          </div>
        </motion.div>
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
          gradesUrl={config.sheetUrls.rrhh || ''} 
          relatorioUrl={config.sheetUrls.hr_relatorio || ''} 
          onBack={handleBack} 
        />
      );
    } else if (effectiveType === 'executive') {
        dashboardContent = <ExecutiveSummary config={config} onBack={handleBack} />;
    } else if (effectiveType === 'postventa') {
      if (subType === 'operativo') {
        dashboardContent = <PostventaDashboard sheetUrl={config.sheetUrls.postventa} onBack={handleBack} onOpenSettings={() => setIsSettingsOpen(true)} />;
      } else if (subType === 'kpis') {
        dashboardContent = <PostventaKpiDashboard sheetUrl={config.sheetUrls.postventa_kpis || ''} onBack={handleBack} />;
      } else if (subType === 'facturacion') {
        dashboardContent = <PostventaBillingDashboard sheetUrl={config.sheetUrls.postventa_billing || ''} onBack={handleBack} />;
      }
    } else if (area) {
      const areaId = area.id as keyof typeof config.sheetUrls;
      dashboardContent = (
        <Dashboard 
          area={area}
          sheetUrl={config.sheetUrls[areaId] || ''}
          apiKey={config.geminiApiKey}
          onBack={handleBack}
          onOpenSettings={() => setIsSettingsOpen(true)}
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
            {dashboardContent}
          </main>
        </div>
      </PageWrapper>
    );
  };

  const handleGlobalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPassword = config.globalPassword || 'autosol2026';
    if (globalPasswordInput === targetPassword) {
        setIsGloballyAuthenticated(true);
        localStorage.setItem('autosol_global_auth', 'true');
        setShowGlobalAuthError(false);
    } else {
        setShowGlobalAuthError(true);
    }
  };

  if (config.isPasswordProtected && !isGloballyAuthenticated) {
    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 shadow-2xl text-center"
            >
                <div className="w-20 h-20 bg-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-white/10 mx-auto mb-10">
                    <span className="text-slate-950 font-black text-2xl tracking-tighter italic">VW</span>
                </div>
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Acceso Restringido</h2>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-10 opacity-60">Autosol Intelligence System</p>
                
                <form onSubmit={handleGlobalLogin} className="space-y-6">
                    <div className="relative">
                        <input 
                            type="password"
                            value={globalPasswordInput}
                            onChange={(e) => setGlobalPasswordInput(e.target.value)}
                            placeholder="CONTRASEÑA"
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white text-center font-black tracking-[0.5em] outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-white/20"
                        />
                        {showGlobalAuthError && (
                            <motion.p 
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-4"
                            >
                                Contraseña Incorrecta
                            </motion.p>
                        )}
                    </div>
                    <button 
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-[0.3em] py-5 rounded-2xl shadow-xl shadow-blue-500/20 transition-all"
                    >
                        Entrar al Sistema
                    </button>
                </form>
            </motion.div>
        </div>
    );
  }

  return (
    <>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageWrapper><Portal onSelectArea={handleSelectArea} onOpenSettings={() => setIsSettingsOpen(true)} /></PageWrapper>} />
          
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
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={config} 
        onSave={handleSaveConfig} 
      />
      
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
    </>
  );
}

export default App;
