Warning: truncated output (original token count: 9851)
Total output lines: 708

import React, { useEffect, useState } from 'react';
import { Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Portal from './components/Portal';
import { Icons } from './components/Icon';
import { AppConfig, AreaConfig } from './types';
import { DEFAULT_CONFIG, AREAS, SALES_QUALITY_SHEET_KEY, SALES_CLAIMS_SHEET_KEY } from './constants';
import { primeBackendConnection } from './services/dataService';
import { clearDashboardSession, getDashboardToken, loginToDashboard, saveDashboardSession, verifyDashboardSession } from './services/auth';

const Dashboard = lazy(() => import('./components/Dashboard'));
const QualityDashboard = lazy(() => import('./components/QualityDashboard'));
const SeguimientoReclamos = lazy(() => import('./components/SeguimientoReclamos'));
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

const DashboardLogin = ({ onSuccess }: { onSuccess: () => void }) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await loginToDashboard(password);
      if (result.token && result.expiresAt) saveDashboardSession(result.token, result.expiresAt);
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo iniciar sesiÃ³n.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f7fb] px-5 py-10">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#001e50] text-white">VW</div>
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-600">Autosol Â· Tablero de control</p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#001e50]">IngresÃ¡ para continuar</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">La portada estÃ¡ disponible. Para consultar los indicadores, ingresÃ¡ la contraseÃ±a del tablero.</p>
        <label htmlFor="dashboard-password" className="mt-6 block text-xs font-bold text-slate-700">ContraseÃ±a</label>
        <input
          id="dashboard-password"
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={event => setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="mt-5 w-full rounded-xl bg-[#001e50] px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-900 disabled:cursor-wait disabled:opacity-60">
          {loading ? 'Verificandoâ€¦' : 'Ingresar al tablero'}
        </button>
        <p className="mt-4 text-center text-[11px] text-slate-400">El acceso queda guardado en este navegador durante 7 dÃ­as.</p>
      </form>
    </main>
  );
};

// â”€â”€â”€ Shared header for portal-style selection screens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Shared card for portal-style selection screens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
  const [authStatus, setAuthStatus] = useState<'checking' | 'required' | 'authenticated'>(() =>
    getDashboardToken() ? 'checking' : 'required'
  );

  useEffect(() => {
    let active = true;
    const token = getDashboardToken();
    if (!token) return;
    void verifyDashboardSession(token).then(result => {
      if (!active) return;
      if (!result.enabled || result.valid) setAuthStatus('authenticated');
      else {
        clearDashboardSession();
        setAuthStatus('required');
      }
    }).catch(() => {
      if (active) setAuthStatus(token ? 'checking' : 'required');
    });
    return () => { active = false; };
  }, []);

  const handlePrefetchArea = (areaId: string) => {
    if (areaId === 'executive') {
      preloadModule(() => import('./components/ExecutiveSumma…4851 tokens truncated…{{
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
          <p className="text-sm font-black uppercase tracking-widest">Ãrea no encontrada</p>
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
          {location.pathname !== '/' && authStatus !== 'authenticated' ? (
            authStatus === 'checking' ? <RouteLoader label="Verificando accesoâ€¦" /> :
              <DashboardLogin onSuccess={() => setAuthStatus('authenticated')} />
          ) : <Routes location={location} key={location.pathname}>
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
            <Route path="/calidad/postventa/seguimiento-reclamos" element={<DashboardView type="calidad" subType="postventa-seguimiento-reclamos" />} />
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
          </Routes>}
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

