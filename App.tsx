import React, { useEffect, useState } from 'react';
import { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Portal from './components/Portal';
import { Icons } from './components/Icon';
import { AppConfig, AreaConfig } from './types';
import { DEFAULT_CONFIG, AREAS, SALES_QUALITY_SHEET_KEY, SALES_CLAIMS_SHEET_KEY } from './constants';
import { primeBackendConnection } from './services/dataService';

const Dashboard = lazy(() => import('./components/Dashboard'));
const QualityDashboard = lazy(() => import('./components/QualityDashboard'));
const DetailedQualityPostventa = lazy(() => import('./components/DetailedQualityPostventa'));
const PostventaDashboard = lazy(() => import('./components/PostventaDashboard'));
const PostventaKpiDashboard = lazy(() => import('./components/PostventaKpiDashboard'));
const PostventaBillingDashboard = lazy(() => import('./components/PostventaBillingDashboard'));
const PostventaWarrantyDashboard = lazy(() => import('./components/PostventaWarrantyDashboard'));
const PostventaPvtOccupationDashboard = lazy(() => import('./components/PostventaPvtOccupationDashboard'));
const AmbienteSelection = lazy(() => import('./components/AmbienteSelection'));
const EnvironmentalConsumptionDashboard = lazy(() => import('./components/EnvironmentalConsumptionDashboard'));
const SalesQualityDashboard = lazy(() => import('./components/SalesQualityDashboard'));
const SsiCsiDashboard = lazy(() => import('./components/SsiCsiDashboard'));
const ScoringDashboard = lazy(() => import('./components/ScoringDashboard'));
const InternalPostventaDashboard = lazy(() => import('./components/InternalPostventaDashboard'));
const ActionPlanDashboard = lazy(() => import('./components/ActionPlanDashboard'));
const PCGCDashboard = lazy(() => import('./components/PCGCDashboard'));
const QualityObjectivesDashboard = lazy(() => import('./components/QualityObjectivesDashboard'));
const RRHHDashboard = lazy(() => import('./components/RRHHDashboard'));
const ExecutiveSummary = lazy(() => import('./components/ExecutiveSummary'));
const ProfessionalReport = lazy(() => import('./components/ProfessionalReport'));
const FullReportPrintView = lazy(() => import('./components/FullReportPrintView'));
const ReportConfigModal = lazy(() => import('./components/ReportConfigModal'));

const FRONTEND_ONLY_POSTVENTA = false;
const FRONTEND_ONLY_RRHH = false;

const resolveDataSource = (frontendKey: string, backendUrl: string, enabled: boolean) =>
  enabled ? frontendKey : backendUrl;

const preloadModule = (loader: () => Promise<any>) => {
  void loader();
};

// ─── Shared header for portal-style selection screens ────────────────────────
const SelectionHeader = ({
  area,
  onBack,
  backLabel = 'Volver al portal',
  showReport = false,
  onReport,
}: {
  area: string;
  onBack: () => void;
  backLabel?: string;
  showReport?: boolean;
  onReport?: () => void;
}) => (
  <header className="sticky top-0 z-40 flex min-h-[72px] items-center justify-between gap-5 border-b border-[#e6ecf2] bg-white px-[clamp(24px,4vw,72px)] py-3">
    <div className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-[#001e50]">
      <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#001e50] text-[15px] font-black italic">
        VW
      </span>
      <span>
        Autosol <span className="font-normal text-[#7c899e]">| {area}</span>
      </span>
    </div>
    <div className="flex items-center gap-2">
      {showReport && (
        <button
          onClick={onReport}
          className="inline-flex items-center gap-2 rounded-full bg-[#001e50] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_8px_20px_#001e501a] transition hover:bg-[#073b75]"
        >
          <Icons.FileText className="h-4 w-4" />
          Generar reporte
        </button>
      )}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 rounded-full border border-[#e6ecf2] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#65748a] transition hover:border-[#91b5d0] hover:text-[#001e50]"
      >
        <Icons.ArrowLeft className="h-4 w-4" />
        {backLabel}
      </button>
    </div>
  </header>
);

// ─── Shared card for portal-style selection screens ───────────────────────────
const SelectionCard = ({
  name,
  desc,
  icon: Icon,
  iconBg,
  onClick,
}: {
  name: string;
  desc: string;
  icon: React.ElementType;
  iconBg: string;
  onClick: () => void;
}) => (
  <motion.button
    whileHover={{ y: -3 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="group flex items-center gap-4 rounded-[14px] border border-[#e3eaf2] bg-white p-5 text-left transition-all hover:border-[#91b5d0] hover:shadow-[0_7px_22px_#001e500a] hover:-translate-y-0.5"
  >
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${iconBg}`}>
      <Icon className="h-5 w-5" />
    </span>
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm font-bold leading-snug text-[#001e50]">{name}</span>
      <span className="text-[11px] leading-snug text-[#6b7c90]">{desc}</span>
    </span>
    <Icons.ArrowRight className="ml-auto h-4 w-4 shrink-0 text-[#6e8ca9] transition group-hover:translate-x-0.5" />
  </motion.button>
);

function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [printReportLocation, setPrintReportLocation] = useState<'JUJUY' | 'SALTA' | null>(null);
  const [reportConfig, setReportConfig] = useState<{ location: 'JUJUY' | 'SALTA', month: string | null, template: any } | null>(null);

  const handlePrefetchArea = (areaId: string) => {
    if (areaId === 'executive') {
      preloadModule(() => import('./components/ExecutiveSummary'));
      preloadModule(() => import('./components/ProfessionalReport'));
      return;
    }

    if (areaId === 'calidad') {
      preloadModule(() => import('./components/QualityDashboard'));
      preloadModule(() => import('./components/SalesQualityDashboard'));
      preloadModule(() => import('./components/DetailedQualityPostventa'));
      preloadModule(() => import('./components/CemOsDashboard'));
      preloadModule(() => import('./components/PCGCDashboard'));
      preloadModule(() => import('./components/QualityObjectivesDashboard'));
      preloadModule(() => import('./components/ActionPlanDashboard'));
      preloadModule(() => import('./components/InternalPostventaDashboard'));
      preloadModule(() => import('./components/SsiCsiDashboard'));
      return;
    }

    if (areaId === 'postventa') {
      preloadModule(() => import('./components/PostventaDashboard'));
      preloadModule(() => import('./components/PostventaKpiDashboard'));
      preloadModule(() => import('./components/PostventaBillingDashboard'));
      preloadModule(() => import('./components/PostventaWarrantyDashboard'));
      preloadModule(() => import('./components/PostventaPvtOccupationDashboard'));
      return;
    }

    if (areaId === 'ambiente') {
      preloadModule(() => import('./components/EnvironmentalConsumptionDashboard'));
      return;
    }

    if (areaId === 'rrhh') {
      preloadModule(() => import('./components/RRHHDashboard'));
      preloadModule(() => import('./components/RRHHCalendarView'));
      preloadModule(() => import('./components/RRHHTalentView'));
      preloadModule(() => import('./components/RRHHCollaboratorsView'));
    }
  };

  useEffect(() => {
    primeBackendConnection();
  }, []);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
  };

  const handleSelectArea = (area: AreaConfig) => {
    if (area.id === 'rrhh') {
      window.location.href = 'https://nelsoncalidad15-ops.github.io/rrhh/';
      return;
    }
    handlePrefetchArea(area.id);
    if (area.id === 'executive' as any) {
        navigate('/executive');
        return;
    }
    if (area.id === 'calidad') {
        navigate('/calidad');
    } else if (area.id === 'postventa') {
        navigate('/postventa');
    } else if (area.id === 'ambiente') {
        navigate('/ambiente');
    } else if (area.id === 'ventas') {
        navigate('/calidad/ventas');
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
        </div>
      </div>
    </header>
  );

  // ── Pantalla de selección: Calidad ──────────────────────────────────────────
  const QualitySelection = () => (
    <PageWrapper>
      <div className="min-h-screen bg-[#f7f9fc] font-sans text-[#001e50]">
        <SelectionHeader
          area="Calidad"
          onBack={handleBackToPortal}
          showReport
          onReport={() => navigate('/report')}
        />
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-[clamp(24px,4vw,72px)] py-8">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#316487]">
              <span className="inline-block h-0.5 w-7 bg-[#008bc5]" />
              Centro de Calidad
            </p>
            <h2 className="mt-3 text-[2rem] font-bold tracking-tight text-[#001e50] md:text-[2.8rem]">Elegí un módulo</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#4a6078]">
              Accedé a los módulos de análisis para revisar rendimiento, satisfacción y desvíos.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          >
            {[
              { id: 'ventas',      path: '/calidad/ventas',               name: 'Ventas',         icon: Icons.BarChart,       iconBg: 'bg-orange-50 text-orange-600',  desc: 'Satisfacción en salón y procesos comerciales' },
              { id: 'postventa',   path: '/calidad/postventa_selection',  name: 'Postventa',      icon: Icons.Wrench,         iconBg: 'bg-[#edf4ff] text-[#2866b2]',  desc: 'Gestión de reclamos, taller y servicios' },
              { id: 'pcgc',        path: '/calidad/pcgc',                 name: 'PCGC',           icon: Icons.ClipboardList,  iconBg: 'bg-indigo-50 text-indigo-600',  desc: 'Programa de Calidad de Gestión y Auditoría' },
              { id: 'objetivos',   path: '/calidad/objetivos',            name: 'Objetivos',      icon: Icons.Target,         iconBg: 'bg-[#eaf7f0] text-[#217749]',  desc: 'Ventas y postventa desde Google Sheets' },
              { id: 'plan_accion', path: '/calidad/plan_accion',          name: 'Plan de Acción', icon: Icons.ClipboardCheck, iconBg: 'bg-[#eaf7f0] text-[#217749]',  desc: 'Control y verificación de desvíos' },
              { id: 'ssi_csi',     path: '/calidad/ssi-csi',              name: 'SSI / CSI',      icon: Icons.Heart,          iconBg: 'bg-indigo-50 text-indigo-600',  desc: 'Encuestas de ventas y postventa' },
            ].map((item) => (
              <SelectionCard key={item.id} name={item.name} desc={item.desc} icon={item.icon} iconBg={item.iconBg} onClick={() => navigate(item.path)} />
            ))}
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );

  // ── Pantalla de selección: Postventa ────────────────────────────────────────
  const PostventaSelection = () => (
    <PageWrapper>
      <div className="min-h-screen bg-[#f7f9fc] font-sans text-[#001e50]">
        <SelectionHeader area="Postventa" onBack={handleBackToPortal} />
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-[clamp(24px,4vw,72px)] py-8">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#316487]">
              <span className="inline-block h-0.5 w-7 bg-[#008bc5]" />
              Área de Postventa
            </p>
            <h2 className="mt-3 text-[2rem] font-bold tracking-tight text-[#001e50] md:text-[2.8rem]">Control Postventa</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#4a6078]">
              Gestión de taller, indicadores y facturación con una navegación clara y compacta.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
          >
            {([
              { id: 'operativo',    path: '/postventa/operativo',    name: 'Control Operativo', icon: Icons.Wrench,      iconBg: 'bg-[#edf4ff] text-[#2866b2]', desc: 'Gestión de taller' },
              { id: 'gestion_kpis', path: '/postventa/kpis',         name: 'Gestión KPIs',      icon: Icons.BarChart,    iconBg: 'bg-indigo-50 text-indigo-600', desc: 'Indicadores clave' },
              { id: 'facturacion',  path: '/postventa/facturacion',  name: 'Facturación',       icon: Icons.Banknote,    iconBg: 'bg-amber-50  text-amber-600',   desc: 'Avance de ventas' },
              { id: 'garantia',     path: '/postventa/garantia',     name: 'Garantía',          icon: Icons.ShieldCheck, iconBg: 'bg-[#eaf7f0] text-[#217749]',  desc: 'Lote vs PPT' },
              { id: 'ocupacion_pvt',path: '/postventa/ocupacion-pvt',name: 'Ocupación PVT',     icon: Icons.Users,       iconBg: 'bg-indigo-50 text-indigo-600', desc: 'Ocupación y productividad por técnico' },
            ] as const).map((item) => (
              <SelectionCard key={item.id} name={item.name} desc={item.desc} icon={item.icon} iconBg={item.iconBg} onClick={() => navigate(item.path)} />
            ))}
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );

  // ── Pantalla de selección: Calidad Postventa ────────────────────────────────
  const PostventaQualitySelection = () => (
    <PageWrapper>
      <div className="min-h-screen bg-[#f7f9fc] font-sans text-[#001e50]">
        <SelectionHeader area="Calidad · Postventa" onBack={() => navigate('/calidad')} backLabel="Volver a Calidad" />
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-[clamp(24px,4vw,72px)] py-8">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#316487]">
              <span className="inline-block h-0.5 w-7 bg-[#008bc5]" />
              Calidad Postventa
            </p>
            <h2 className="mt-3 text-[2rem] font-bold tracking-tight text-[#001e50] md:text-[2.8rem]">Gestión de Calidad</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#4a6078]">
              Seguimiento de reclamos, refuerzo e instancias internas con presentación limpia y profesional.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-3"
          >
            {([
              { id: 'claims',   path: '/calidad/postventa/claims',           name: 'Gestión de Reclamos', icon: Icons.AlertCircle,    iconBg: 'bg-[#edf4ff] text-[#2866b2]', desc: 'Seguimiento de quejas' },
              { id: 'refuerzo', path: '/calidad/refuerzo',                   name: 'Refuerzo',            icon: Icons.Activity,       iconBg: 'bg-indigo-50 text-indigo-600', desc: 'Análisis detallado' },
              { id: 'internal', path: '/calidad/postventa/internal_surveys', name: 'Encuesta Interna',    icon: Icons.ClipboardCheck, iconBg: 'bg-[#edf4ff] text-[#2866b2]', desc: 'Satisfacción post-servicio' },
            ] as const).map((item) => (
              <SelectionCard key={item.id} name={item.name} desc={item.desc} icon={item.icon} iconBg={item.iconBg} onClick={() => navigate(item.path)} />
            ))}
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );

  // ── Pantalla de selección: Ventas ───────────────────────────────────────────
  const VentasSelection = () => (
    <PageWrapper>
      <div className="min-h-screen bg-[#f7f9fc] font-sans text-[#001e50]">
        <SelectionHeader area="Calidad · Ventas" onBack={() => navigate('/calidad')} backLabel="Volver a Calidad" />
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-[clamp(24px,4vw,72px)] py-8">
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <p className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#316487]">
              <span className="inline-block h-0.5 w-7 bg-[#008bc5]" />
              Calidad Ventas
            </p>
            <h2 className="mt-3 text-[2rem] font-bold tracking-tight text-[#001e50] md:text-[2.8rem]">Control de Ventas</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#4a6078]">
              Encuestas, reclamos, CEM OS y scoring de Planes de Ahorro en una navegación clara.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            {([
              { id: 'surveys', path: '/calidad/ventas/surveys', name: 'Encuestas Internas',  icon: Icons.ClipboardCheck, iconBg: 'bg-[#edf4ff] text-[#2866b2]', desc: 'Satisfacción en salón' },
              { id: 'claims',  path: '/calidad/ventas/claims',  name: 'Gestión de Reclamos', icon: Icons.AlertCircle,    iconBg: 'bg-orange-50 text-orange-600', desc: 'Seguimiento de quejas' },
              { id: 'cem_os',  path: '/calidad/ventas/cem_os',  name: 'CEM OS',              icon: Icons.BarChart,       iconBg: 'bg-indigo-50 text-indigo-600', desc: 'Análisis de satisfacción general' },
              { id: 'scoring', path: '/calidad/ventas/scoring', name: 'Scoring',             icon: Icons.Target,         iconBg: 'bg-[#edf4ff] text-[#2866b2]', desc: 'Planes de ahorro y recontactos' },
            ] as const).map((item) => (
              <SelectionCard key={item.id} name={item.name} desc={item.desc} icon={item.icon} iconBg={item.iconBg} onClick={() => navigate(item.path)} />
            ))}
          </motion.div>
        </div>
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
      else if (effectiveType === 'ambiente') navigate('/ambiente');
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
      } else if (subType === 'ventas-scoring') {
        dashboardContent = <ScoringDashboard onBack={handleBack} />;
      } else if (subType === 'ventas-claims') {
        dashboardContent = <SalesQualityDashboard onBack={handleBack} initialTab="claims" config={config} />;
      } else if (subType === 'ventas-cem_os') {
        dashboardContent = <SalesQualityDashboard onBack={handleBack} initialTab="cem_os" config={config} />;
      } else if (subType === 'ssi-csi') {
        dashboardContent = <SsiCsiDashboard onBack={handleBack} />;
      } else if (subType === 'pcgc') {
        dashboardContent = <PCGCDashboard sheetUrl={config.sheetUrls.pcgc || ''} onBack={handleBack} />;
      } else if (subType === 'objetivos') {
        dashboardContent = (
          <QualityObjectivesDashboard
            legacySheetUrl={config.sheetUrls.quality_objectives || ''}
            summarySheetUrl={config.sheetUrls.quality_objectives_summary || ''}
            scalesSheetUrl={config.sheetUrls.quality_objectives_scales || ''}
            onBack={handleBack}
          />
        );
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
      window.location.href = 'https://nelsoncalidad15-ops.github.io/rrhh/';
      dashboardContent = (
        <div className="flex min-h-[50vh] items-center justify-center">
          <RouteLoader label="Redirigiendo a RRHH..." />
        </div>
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
      } else if (subType === 'garantia') {
        dashboardContent = (
          <PostventaWarrantyDashboard
            sheetUrls={{
              q1: config.sheetUrls.warranty_q1 || '',
              q2: config.sheetUrls.warranty_q2 || '',
              q3: config.sheetUrls.warranty_q3 || '',
              q4: config.sheetUrls.warranty_q4 || '',
            }}
            onBack={handleBack}
          />
        );
      } else if (subType === 'ocupacion-pvt') {
        dashboardContent = (
          <PostventaPvtOccupationDashboard
            sheetUrl={resolveDataSource('pvt_occupation', config.sheetUrls.pvt_occupation || '', FRONTEND_ONLY_POSTVENTA)}
            onBack={handleBack}
          />
        );
      }
    } else if (effectiveType === 'ambiente') {
      if (subType === 'consumos') {
        dashboardContent = <EnvironmentalConsumptionDashboard sheetUrl={config.sheetUrls.ambiente || ''} onBack={handleBack} />;
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
            <Route path="/" element={<PageWrapper><Portal onSelectArea={handleSelectArea} onPrefetchArea={handlePrefetchArea} /></PageWrapper>} />

            <Route path="/calidad" element={<QualitySelection />} />
            <Route path="/calidad/postventa_selection" element={<PostventaQualitySelection />} />
            <Route path="/calidad/ventas" element={<VentasSelection />} />
            <Route path="/calidad/ventas/surveys" element={<DashboardView type="calidad" subType="ventas-surveys" />} />
            <Route path="/calidad/ventas/claims" element={<DashboardView type="calidad" subType="ventas-claims" />} />
            <Route path="/calidad/ventas/scoring" element={<DashboardView type="calidad" subType="ventas-scoring" />} />
            <Route path="/calidad/ventas/cem_os" element={<DashboardView type="calidad" subType="ventas-cem_os" />} />
            <Route path="/calidad/ssi-csi" element={<DashboardView type="calidad" subType="ssi-csi" />} />
            <Route path="/calidad/postventa/claims" element={<DashboardView type="calidad" subType="postventa-claims" />} />
            <Route path="/calidad/postventa/internal_surveys" element={<DashboardView type="calidad" subType="postventa-internal" />} />
            <Route path="/calidad/postventa" element={<Navigate to="/calidad/postventa_selection" />} />
            <Route path="/calidad/pcgc" element={<DashboardView type="calidad" subType="pcgc" />} />
            <Route path="/calidad/objetivos" element={<DashboardView type="calidad" subType="objetivos" />} />
            <Route path="/calidad/plan_accion" element={<DashboardView type="calidad" subType="plan_accion" />} />
            <Route path="/calidad/refuerzo" element={<DashboardView type="calidad" subType="refuerzo" />} />

            <Route path="/executive" element={<DashboardView type="executive" />} />
            <Route path="/report" element={<ProfessionalReport config={config} onBack={() => navigate('/calidad')} />} />

            <Route path="/ambiente" element={<AmbienteSelection />} />
            <Route path="/ambiente/consumos" element={<DashboardView type="ambiente" subType="consumos" />} />

            <Route path="/postventa" element={<PostventaSelection />} />
            <Route path="/postventa/operativo" element={<DashboardView type="postventa" subType="operativo" />} />
            <Route path="/postventa/kpis" element={<DashboardView type="postventa" subType="kpis" />} />
            <Route path="/postventa/facturacion" element={<DashboardView type="postventa" subType="facturacion" />} />
            <Route path="/postventa/garantia" element={<DashboardView type="postventa" subType="garantia" />} />
            <Route path="/postventa/ocupacion-pvt" element={<DashboardView type="postventa" subType="ocupacion-pvt" />} />

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
