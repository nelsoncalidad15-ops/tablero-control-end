
import React from 'react';
import { motion } from 'motion/react';
import { AreaConfig } from '../types';
import { AREAS } from '../constants';
import { Icons } from './Icon';

interface PortalProps {
  onSelectArea: (area: AreaConfig) => void;
  onOpenSettings: () => void;
}

const Portal: React.FC<PortalProps> = ({ onSelectArea, onOpenSettings }) => {
  return (
    <div className="h-screen relative bg-slate-950 flex flex-col items-center justify-center font-sans overflow-hidden">
        
        {/* Immersive Background */}
        <motion.div 
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.4 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute inset-0 z-0"
            style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2800&auto=format&fit=crop")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'brightness(0.5) contrast(1.1) saturate(0)'
            }}
        />
        
        {/* Sophisticated Gradients */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-950/20 via-slate-950/80 to-slate-950"></div>
        <div className="absolute inset-0 z-0 bg-radial-gradient from-transparent to-slate-950/90"></div>

        {/* Main Content Container */}
        <div className="relative z-10 w-full px-4 py-4 md:py-[2vh] flex flex-col items-center h-full justify-between max-h-screen">
            
            {/* Header: Brand */}
            <motion.div 
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="flex flex-col items-center text-center w-full mb-[2vh]"
            >
                <div className="flex items-center gap-4 md:gap-6 mb-2">
                    <motion.div 
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="w-10 h-10 md:w-14 md:h-14 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-2xl shadow-white/10"
                    >
                         <span className="text-slate-950 font-black text-lg md:text-xl tracking-tighter italic">VW</span>
                    </motion.div>
                    <div className="h-8 md:h-10 w-px bg-white/20"></div>
                    <div className="flex flex-col text-left">
                        <h2 className="text-white text-lg md:text-2xl font-light tracking-[0.4em] uppercase leading-none">Autosol</h2>
                        <span className="text-blue-400 text-[7px] md:text-[9px] font-black uppercase tracking-[0.6em] mt-1 md:mt-2">GRUPO CENOA</span>
                    </div>
                </div>

                <h1 className="text-2xl md:text-4xl lg:text-6xl font-black text-white tracking-tighter leading-tight mb-1 uppercase italic">
                  Tablero de <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-indigo-400 to-white">Control</span>
                </h1>
                
                <p className="text-slate-400 text-xs md:text-base leading-relaxed max-w-2xl font-medium opacity-80 px-4">
                    Monitoreo estratégico y análisis de performance en tiempo real.
                </p>
            </motion.div>

            {/* Grid of Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3 w-full max-w-5xl flex-1 items-center content-center">
                {/* Sala de Situación Card */}
                <motion.button 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    whileHover={{ y: -5, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectArea({ id: 'executive' as any, name: 'Sala de Situación', icon: 'Activity', color: 'blue', description: 'Resumen Ejecutivo Unificado' })}
                    className="group relative bg-blue-600/10 backdrop-blur-3xl border border-blue-500/30 rounded-[2.5rem] p-4 text-left hover:bg-blue-600/20 hover:border-blue-500/50 transition-all duration-500 overflow-hidden shadow-xl shadow-blue-500/10"
                >
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-500 border border-white/20">
                            <Icons.Activity className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-white mb-1 md:mb-2 tracking-tight uppercase group-hover:text-blue-400 transition-colors">
                            Sala de Situación
                        </h3>
                        <p className="text-slate-400 text-[9px] md:text-[10px] leading-relaxed font-bold uppercase tracking-[0.25em] opacity-60 group-hover:opacity-100 transition-opacity max-w-[200px]">
                            Resumen Ejecutivo Unificado
                        </p>
                    </div>
                </motion.button>

                {/* Regular Areas */}
                {AREAS.map((area, idx) => {
                    const IconComponent = Icons[area.icon as keyof typeof Icons] || Icons.Home;
                    return (
                        <motion.button 
                            key={area.id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 + (idx * 0.05) }}
                            whileHover={{ y: -5, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelectArea(area)}
                            className="group relative bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-4 text-left hover:bg-white/10 hover:border-white/20 transition-all duration-500 overflow-hidden shadow-xl"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
                                  area.id === 'postventa' ? 'from-blue-600 to-indigo-800 shadow-blue-500/30' : 
                                  area.id === 'rrhh' ? 'from-purple-600 to-fuchsia-800 shadow-purple-500/30' : 
                                  area.id === 'calidad' ? 'from-emerald-600 to-teal-800 shadow-emerald-500/30' : 
                                  'from-orange-500 to-amber-700 shadow-orange-500/30'
                                } text-white shadow-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-all duration-500 border border-white/20`}>
                                    <IconComponent className="w-6 h-6" />
                                </div>

                                <h3 className="text-lg md:text-xl font-black text-white mb-1 md:mb-2 tracking-tight uppercase group-hover:text-blue-400 transition-colors">
                                    {area.name}
                                </h3>
                                <p className="text-slate-400 text-[9px] md:text-[10px] leading-relaxed font-bold uppercase tracking-[0.25em] opacity-60 group-hover:opacity-100 transition-opacity max-w-[200px]">
                                    {area.description}
                                </p>
                            </div>
                        </motion.button>
                    );
                })}

                {/* Settings & Logout in Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <motion.button 
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onOpenSettings}
                        className="bg-white/5 border border-white/10 rounded-3xl p-3 flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-white transition-all backdrop-blur-3xl"
                    >
                        <Icons.Settings className="w-5 h-5" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Configuración</span>
                    </motion.button>

                    <motion.button 
                        whileHover={{ scale: 1.05, backgroundColor: 'rgba(239,68,68,0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            localStorage.removeItem('autosol_auth');
                            window.location.reload();
                        }}
                        className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-3 flex flex-col items-center justify-center gap-1 text-rose-400 hover:text-rose-300 transition-all backdrop-blur-3xl"
                    >
                        <Icons.LogOut className="w-5 h-5" />
                        <span className="text-[8px] font-black uppercase tracking-widest">Cerrar Sesión</span>
                    </motion.button>
                </div>
            </div>

            {/* Footer info */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="w-full max-w-5xl mt-2 md:mt-4 px-6"
            >
                <div className="w-full flex flex-col md:flex-row items-center justify-between gap-2 md:gap-4 border-t border-white/10 pt-2 pb-2">
                  <p className="text-white/20 text-[8px] font-black uppercase tracking-[0.4em]">
                      Autosol Corporate Hub v2.5 • 2024
                  </p>
                  <div className="flex gap-6">
                    <span className="text-white/20 text-[8px] font-black uppercase tracking-widest cursor-pointer hover:text-white/40 transition-colors">Privacy</span>
                    <span className="text-white/20 text-[8px] font-black uppercase tracking-widest cursor-pointer hover:text-white/40 transition-colors">Security</span>
                    <span className="text-white/20 text-[8px] font-black uppercase tracking-widest cursor-pointer hover:text-white/40 transition-colors">Support</span>
                  </div>
                </div>
            </motion.div>
        </div>
    </div>
  );
};

export default Portal;
