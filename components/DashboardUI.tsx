import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from './Icon';
import { toJpeg } from 'html-to-image';

interface DashboardFrameProps {
  title: string;
  subtitle?: string;
  lastUpdated?: string;
  children: React.ReactNode;
  filters?: React.ReactNode;
  onExport?: () => void;
  onBack?: () => void;
  isLoading?: boolean;
  className?: string;
}

export const DashboardFrame: React.FC<DashboardFrameProps> = ({ 
  title, 
  subtitle, 
  lastUpdated, 
  children, 
  filters,
  onExport,
  onBack,
  isLoading = false,
  className = "bg-[#F8FAFC]"
}) => {
  const [isTvMode, setIsTvMode] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullScreen(false);
      }
    }
  };

  return (
    <div className={`flex flex-col min-h-screen transition-all duration-700 ${className}`}>
      {/* Compact Glass Header Bar */}
      {!isTvMode && (
        <div className="flex-none z-40 flex flex-row justify-between items-center gap-2 bg-white/70 sticky top-0 p-3 md:p-4 border-b border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.03)] backdrop-blur-xl w-full print:hidden">
          <div className="flex items-center gap-3 md:gap-6">
            {onBack && (
              <motion.button 
                whileHover={{ scale: 1.05, x: -3 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBack} 
                className="p-2 rounded-xl bg-white/50 border border-white/40 transition-all text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-100 shadow-sm backdrop-blur-md"
              >
                <Icons.ArrowLeft className="w-4 h-4" />
              </motion.button>
            )}
            <div className="flex items-center gap-2 md:gap-4">
              <motion.div 
                initial={{ rotate: -10, scale: 0.9 }}
                animate={{ rotate: -3, scale: 1 }}
                whileHover={{ rotate: 0, scale: 1.05 }}
                className="w-8 h-8 md:w-11 md:h-11 bg-slate-950 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-slate-900/30 transition-all duration-500"
              >
                <Icons.Activity className="w-4 h-4 md:w-5 md:h-5" />
              </motion.div>
              <div>
                <h1 className="text-sm md:text-xl font-black text-slate-950 uppercase tracking-tight italic leading-none">{title}</h1>
                <p className="hidden xs:flex text-[6px] md:text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] md:tracking-[0.5em] mt-1 md:mt-2 items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></span>
                  {subtitle || 'Autosol Intelligence System'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {lastUpdated && (
              <div className="hidden xl:flex flex-col items-end mr-2 md:mr-4 border-r border-slate-200/50 pr-4 md:pr-6">
                <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1.5">Última Sincronización</span>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight leading-none">{lastUpdated}</span>
              </div>
            )}
            
            <div className="flex bg-white/40 p-1 md:p-1.5 rounded-xl md:rounded-2xl border border-white/60 shadow-inner backdrop-blur-md">
              <button 
                onClick={() => setIsTvMode(!isTvMode)}
                className={`p-1.5 md:p-2 rounded-lg md:rounded-xl transition-all flex items-center gap-2 ${isTvMode ? 'bg-slate-950 text-white shadow-lg' : 'text-slate-400 hover:text-slate-950 hover:bg-white/60'}`}
                title="Modo TV"
              >
                <Icons.Monitor className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <button 
                onClick={toggleFullScreen}
                className="p-1.5 md:p-2 rounded-lg md:rounded-xl text-slate-400 hover:text-slate-950 hover:bg-white/60 transition-all"
                title="Pantalla Completa"
              >
                {isFullScreen ? <Icons.Minimize className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <Icons.Maximize className="w-3.5 h-3.5 md:w-4 md:h-4" />}
              </button>
              <button 
                onClick={() => setShowReportModal(true)}
                className="p-1.5 md:p-2 rounded-lg md:rounded-xl text-slate-400 hover:text-blue-600 hover:bg-white/60 transition-all"
                title="Reporte Gerencial"
              >
                <Icons.FileText className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 items-start w-full px-4 md:px-6 pb-6">
        {/* Filters Sidebar (Hidden in TV Mode) */}
        {!isTvMode && filters && (
          <motion.div 
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full lg:w-64 flex-shrink-0"
          >
            <div className="sticky top-8 space-y-6">
              {filters}
            </div>
          </motion.div>
        )}

        {/* Dashboard Content */}
        <div className="flex-1 min-w-0 w-full">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center min-h-[60vh] space-y-8"
              >
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-28 h-28 border-[4px] border-slate-100 rounded-full"
                  ></motion.div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="w-28 h-28 border-[4px] border-blue-600 rounded-full border-t-transparent absolute top-0 left-0 shadow-[0_0_30px_rgba(37,99,235,0.3)]"
                  ></motion.div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icons.Activity className="w-10 h-10 text-slate-200 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic">Analizando Datos</h3>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em] mt-4 animate-pulse">Optimizando visualización...</p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {isTvMode && (
                  <div className="fixed top-8 right-8 z-50 flex gap-4">
                    <button 
                      onClick={() => setIsTvMode(false)}
                      className="p-4 bg-white/10 backdrop-blur-3xl border border-white/20 rounded-2xl text-white hover:bg-white/20 transition-all"
                    >
                      <Icons.X className="w-6 h-6" />
                    </button>
                  </div>
                )}
                {children}
                
                {/* Professional Footer */}
                {!isTvMode && (
                  <div className="pt-16 pb-8 border-t border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-8 print:hidden">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-950 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                        <Icons.Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] leading-none mb-1">Autosol Intelligence System</span>
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Versión 2.0.5 • Enterprise Edition</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4">
                      <div className="flex items-center gap-2">
                        <Icons.Shield className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Seguridad Encriptada</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Icons.Cloud className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cloud Sync Active</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-950 text-white rounded-xl text-[8px] font-black uppercase tracking-[0.2em] shadow-lg shadow-slate-900/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-2"></span>
                        Sistema Operativo
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Management Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <ManagementReportModal 
            onClose={() => setShowReportModal(false)} 
            title={title}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ManagementReportModal = ({ onClose, title }: { onClose: () => void, title: string }) => {
  const navigate = useNavigate();
  const [selectedModules, setSelectedModules] = useState<string[]>(['cover', 'kpis', 'charts', 'table']);
  const [isGenerating, setIsGenerating] = useState(false);

  const modules = [
    { id: 'cover', name: 'Portada Profesional', icon: Icons.FileText },
    { id: 'kpis', name: 'Indicadores Clave (KPIs)', icon: Icons.Activity },
    { id: 'charts', name: 'Gráficos de Performance', icon: Icons.BarChart },
    { id: 'table', name: 'Detalle de Operaciones', icon: Icons.Table },
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      // navigate('/report'); // Report route not implemented yet, but keeping the logic
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col"
      >
        <div className="p-10">
          <div className="flex justify-between items-start mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-950 uppercase tracking-tighter italic leading-none">Reporte Gerencial</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">Configura tu informe profesional</p>
            </div>
            <button onClick={onClose} className="p-3 bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-950 transition-all">
              <Icons.X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4 mb-10">
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Módulos a incluir</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {modules.map(mod => (
                <button
                  key={mod.id}
                  onClick={() => {
                    if (selectedModules.includes(mod.id)) {
                      setSelectedModules(selectedModules.filter(m => m !== mod.id));
                    } else {
                      setSelectedModules([...selectedModules, mod.id]);
                    }
                  }}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    selectedModules.includes(mod.id) 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                      : 'bg-white border-slate-100 text-slate-600 hover:border-blue-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${selectedModules.includes(mod.id) ? 'bg-white/20' : 'bg-slate-50'}`}>
                    <mod.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-tight">{mod.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-6 rounded-3xl mb-10">
            <div className="flex items-center gap-4 text-slate-500">
              <Icons.Info className="w-5 h-5 shrink-0" />
              <p className="text-[10px] font-bold leading-relaxed uppercase tracking-widest">
                El reporte se generará en formato PDF de alta resolución, optimizado para presentaciones directivas y envío por correo electrónico.
              </p>
            </div>
          </div>

          <button 
            disabled={isGenerating || selectedModules.length === 0}
            onClick={handleGenerate}
            className="w-full py-6 bg-slate-950 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-slate-900/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-4"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Generando Reporte...
              </>
            ) : (
              <>
                <Icons.Download className="w-5 h-5" />
                Generar Reporte Profesional
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const ChartWrapper = ({ title, subtitle, children, className, action, isDark = false }: { title: string, subtitle?: string, children: React.ReactNode, className?: string, action?: React.ReactNode, isDark?: boolean }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadChart = async () => {
    if (!chartRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toJpeg(chartRef.current, { 
        quality: 0.95, 
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      const link = document.createElement('a');
      link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error downloading chart:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`${isDark ? 'bg-slate-900/90 border-white/10 shadow-2xl' : 'bg-white/70 border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.03)]'} rounded-[2rem] border p-8 relative group transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] backdrop-blur-xl flex flex-col ${className || ''}`}
    >
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className={`w-1 h-6 ${isDark ? 'bg-blue-500' : 'bg-blue-600'} rounded-full`}></div>
          <div>
            <h3 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'} uppercase tracking-tight italic`}>{title}</h3>
            {subtitle && <p className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-widest mt-1`}>{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {action}
          <button 
            disabled={isDownloading}
            onClick={downloadChart}
            className={`w-10 h-10 flex items-center justify-center ${isDark ? 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white' : 'bg-white/50 hover:bg-white text-slate-400 hover:text-blue-600'} rounded-xl transition-all disabled:opacity-50 border ${isDark ? 'border-white/10' : 'border-white/60'} backdrop-blur-md`}
            title="Descargar JPG"
          >
            {isDownloading ? <div className={`w-4 h-4 border-2 ${isDark ? 'border-white/30 border-t-white' : 'border-blue-600/30 border-t-blue-600'} rounded-full animate-spin`}></div> : <Icons.Download className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div ref={chartRef} className={`flex-1 min-h-0 ${isDark ? 'bg-transparent' : 'bg-transparent'}`}>
        {children}
      </div>
    </motion.div>
  );
};

export const MonthSelector = ({ selectedMonths, onToggle, months }: { 
  selectedMonths: string[], 
  onToggle: (month: string) => void,
  months: string[]
}) => (
  <div className="flex flex-wrap gap-2">
    <button 
      onClick={() => months.forEach(m => { if(selectedMonths.includes(m)) onToggle(m) })}
      className={`px-4 py-2.5 text-[9px] uppercase font-black rounded-xl transition-all border ${selectedMonths.length === 0 ? 'bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-900/20' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'}`}
    >
      Anual
    </button>
    <div className="w-px h-8 bg-slate-200 mx-1 shrink-0 self-center"></div>
    {months.map(m => (
      <button 
        key={m}
        onClick={() => onToggle(m)}
        className={`px-3 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border ${selectedMonths.includes(m) ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border-slate-100 hover:text-slate-900 hover:bg-slate-50'}`}
      >
        {m.substring(0, 3)}
      </button>
    ))}
  </div>
);

const Sparkline = ({ data, color }: { data: number[], color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((d - min) / (range || 1)) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-16 h-8 overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
      />
    </svg>
  );
};

export const LuxuryKPICard = ({ title, value, color, icon: Icon, trend, isDark = false, isDanger = false, breakdown, sparklineData, featured = false }: { 
  title: string, 
  value: string | number, 
  color: string, 
  icon: any,
  trend?: { value: number, isUp: boolean },
  isDark?: boolean,
  isDanger?: boolean,
  featured?: boolean,
  breakdown?: { name: string, value: string | number, secondaryValue?: string | number, percentage?: number }[],
  sparklineData?: number[]
}) => (
  <motion.div 
    whileHover={{ y: -4, scale: 1.02, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
    animate={isDanger ? { 
      boxShadow: ["0 0 0px rgba(225,29,72,0)", "0 0 20px rgba(225,29,72,0.15)", "0 0 0px rgba(225,29,72,0)"],
      borderColor: ["rgba(225,29,72,0.1)", "rgba(225,29,72,0.3)", "rgba(225,29,72,0.1)"]
    } : {}}
    transition={isDanger ? { duration: 2, repeat: Infinity } : {}}
    className={`${isDark ? 'bg-slate-900/90 border-white/10 shadow-2xl' : 'bg-white/70 border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.03)]'} 
      ${featured ? 'ring-2 ring-indigo-500/10 shadow-[0_16px_40px_rgba(79,70,229,0.08)]' : ''}
      ${isDanger ? 'border-rose-500/30 bg-rose-50/10' : ''}
      p-4 rounded-[1.5rem] border hover:border-blue-500/20 transition-all group overflow-hidden relative flex flex-col h-full backdrop-blur-xl`}
  >
    <div className={`absolute -right-12 -top-12 w-40 h-40 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-1000 ${color}`}></div>
    
    <div className="relative z-10 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div 
            className={`p-2 rounded-lg ${isDanger ? 'bg-rose-600 text-white animate-pulse' : (color.startsWith('bg-') ? `${color.replace('-600', '-50')} ${color.replace('bg-', 'text-')}` : '')} shadow-sm`}
            style={!isDanger && !color.startsWith('bg-') ? { backgroundColor: color + '20', color: color } : {}}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
          <p className={`text-[8px] font-black ${isDark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em]`}>{title}</p>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${trend.isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} border border-current/10`}>
            {trend.isUp ? <Icons.ArrowUp className="w-2 h-2" /> : <Icons.ArrowDown className="w-2 h-2" />}
            {trend.value}%
          </div>
        )}
      </div>

      <div className="flex-grow">
        {breakdown && breakdown.length > 0 && (
          <div className="space-y-2 mb-3">
            {breakdown.map((item, i) => (
              <div key={i} className="group/item">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate mr-2">{item.name}</span>
                  <div className="text-right flex flex-col items-end">
                    <span className={`text-base font-black italic leading-none ${isDark ? 'text-white' : 'text-slate-900'} ${isDanger && item.percentage === 100 ? 'text-rose-600' : ''}`}>{item.value}</span>
                    {item.secondaryValue && (
                      <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">
                        OBJ: {item.secondaryValue}
                      </span>
                    )}
                  </div>
                </div>
                {item.percentage !== undefined && (
                  <div className="h-0.5 w-full bg-slate-100/50 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(item.percentage, 100)}%` }}
                      className={`h-full ${isDanger ? 'bg-rose-600' : item.percentage >= 95 ? 'bg-emerald-500' : item.percentage >= 90 ? 'bg-amber-500' : 'bg-rose-500'}`}
                      style={!isDanger && !color.startsWith('bg-') && item.percentage >= 95 ? { backgroundColor: color } : {}}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-slate-100/50 mt-auto flex items-end justify-between">
        <div>
          <span className={`block mb-0.5 font-black text-slate-400 uppercase tracking-widest ${featured ? 'text-[8px]' : 'text-[7px]'}`}>Consolidado</span>
          <h4 className={`font-black ${isDark ? 'text-white' : 'text-slate-900'} tracking-tighter leading-none italic ${featured ? 'text-4xl md:text-5xl opacity-100' : 'text-sm opacity-40'}`}>
            {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : value}
          </h4>
        </div>
        {sparklineData && (
          <div className="pb-1">
            <Sparkline data={sparklineData} color={isDanger ? '#ef4444' : (!color.startsWith('bg-') ? color : '#2563eb')} />
          </div>
        )}
      </div>
    </div>
    <div 
      className={`absolute -right-12 -top-12 w-40 h-40 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-1000 ${color.startsWith('bg-') ? color : ''}`}
      style={!color.startsWith('bg-') ? { backgroundColor: color } : {}}
    ></div>
  </motion.div>
);

export const StatusBadge = ({ status, label }: { status: 'success' | 'warning' | 'error' | 'info', label: string }) => {
  const configs = {
    success: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
    warning: { bg: 'bg-amber-50', text: 'text-amber-600', dot: 'bg-amber-500' },
    error: { bg: 'bg-rose-50', text: 'text-rose-600', dot: 'bg-rose-500' },
    info: { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' }
  };
  const config = configs[status];
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.text} text-[9px] font-black uppercase tracking-widest border border-current/10`}>
      <span className={`w-1 h-1 rounded-full ${config.dot} animate-pulse`}></span>
      {label}
    </div>
  );
};

export const InsightCard = ({ title, content, icon: Icon }: { title: string, content: React.ReactNode, icon: any }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-slate-950 p-6 rounded-[2rem] text-white overflow-hidden relative group"
  >
    <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon className="w-16 h-16 rotate-12" />
    </div>
    <div className="relative z-10">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400">{title}</h4>
      </div>
      <div className="text-xs font-medium leading-relaxed text-slate-300 italic">"{content}"</div>
    </div>
  </motion.div>
);

export const DataTable = ({ data, columns, title, subtitle, pageSize = 10 }: { 
  data: any[], 
  columns: { header: string, accessor: string, render?: (val: any, row: any) => React.ReactNode }[],
  title?: string,
  subtitle?: string,
  pageSize?: number
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(data.length / pageSize);
  const currentData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="bg-white/70 rounded-[2.5rem] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.03)] overflow-hidden transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] backdrop-blur-xl"
    >
      {(title || subtitle) && (
        <div className="px-6 py-4 border-b border-white/40 bg-white/30">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-slate-900 rounded-full"></div>
            <div>
              {title && <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight italic">{title}</h3>}
              {subtitle && <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{subtitle}</p>}
            </div>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/20 border-b border-white/40">
              {columns.map((col, i) => (
                <th key={i} className="px-6 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/40">
            {currentData.map((row, i) => (
              <tr key={i} className="hover:bg-white/40 transition-all group border-l-4 border-transparent hover:border-blue-600">
                {columns.map((col, j) => (
                  <td key={j} className="px-6 py-4 text-[9px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                    {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-8 py-4 bg-white/20 border-t border-white/40 flex items-center justify-between">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl bg-white/50 border border-white/60 text-slate-400 disabled:opacity-30 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm backdrop-blur-md"
            >
              <Icons.ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl bg-white/50 border border-white/60 text-slate-400 disabled:opacity-30 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm backdrop-blur-md"
            >
              <Icons.ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export const SkeletonLoader = ({ className }: { className?: string }) => {
  if (className) {
    return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`}></div>;
  }
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="h-40 bg-slate-200 rounded-[2rem]"></div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-slate-200 rounded-[2rem]"></div>
        <div className="h-80 bg-slate-200 rounded-[2rem]"></div>
      </div>
    </div>
  );
};
