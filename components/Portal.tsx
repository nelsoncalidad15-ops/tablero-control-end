import React from 'react';
import { AreaConfig } from '../types';
import { AREAS } from '../constants';
import { Icons } from './Icon';

interface PortalProps {
  onSelectArea: (area: AreaConfig) => void;
  onOpenSettings: () => void;
}

const Portal: React.FC<PortalProps> = ({ onSelectArea, onOpenSettings }) => {
  return (
    <div className="min-h-screen relative bg-slate-900 flex flex-col items-center font-sans">
        
        {/* Background Image Layer */}
        <div 
            className="absolute inset-0 z-0"
            style={{
                backgroundImage: 'url("https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2800&auto=format&fit=crop")', // Imagen profesional de autos/taller
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.4 // Oscurecer para legibilidad
            }}
        ></div>
        
        {/* Overlay Gradient for smooth fade */}
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-black/70 via-black/40 to-slate-100/90 h-[70vh]"></div>

        {/* Content Layer */}
        <div className="relative z-10 w-full flex flex-col items-center">
            
            {/* Header Area */}
            <div className="w-full py-16 px-6 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white font-bold text-3xl border-2 border-white/30 mb-6 shadow-2xl">
                    VW
                </div>
                <h1 className="text-5xl font-extrabold tracking-tight text-white mb-4 drop-shadow-md">
                    Portal Corporativo Autosol
                </h1>
                <p className="text-slate-200 text-lg max-w-xl font-light drop-shadow">
                    Inteligencia de negocios centralizada y gestión operativa en tiempo real.
                </p>
            </div>

            {/* Portal Grid */}
            <div className="max-w-7xl w-full px-6 mb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {AREAS.map((area) => {
                        const IconComponent = Icons[area.icon as keyof typeof Icons] || Icons.Home;
                        return (
                            <button 
                                key={area.id}
                                onClick={() => onSelectArea(area)}
                                className="bg-white/95 backdrop-blur rounded-xl shadow-xl border-t-4 border-transparent hover:border-indigo-500 p-8 flex flex-col items-center text-center hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group relative overflow-hidden"
                            >
                                <div className={`p-4 rounded-full text-white mb-6 ${area.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <IconComponent className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-700 transition-colors">
                                    {area.name}
                                </h3>
                                <p className="text-slate-500 text-sm leading-relaxed mb-4">
                                    {area.description}
                                </p>
                                
                                <div className="mt-auto pt-4 border-t border-slate-100 w-full">
                                    <span className="text-indigo-600 font-semibold text-xs uppercase tracking-wider group-hover:underline">
                                        Acceder
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

        </div>

        {/* Footer / Settings Button */}
        <div className="fixed bottom-6 right-6 z-50">
            <button 
                onClick={onOpenSettings}
                className="bg-white/90 backdrop-blur text-slate-600 p-3 rounded-full shadow-lg border border-slate-200 hover:text-indigo-600 hover:scale-110 transition-all duration-300"
                title="Configuración de Administrador"
            >
                <Icons.Settings className="w-6 h-6" />
            </button>
        </div>
        
    </div>
  );
};

export default Portal;