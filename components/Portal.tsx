
import React from 'react';
import { motion } from 'motion/react';
import { AreaConfig } from '../types';
import { AREAS } from '../constants';
import { Icons } from './Icon';

interface PortalProps {
  onSelectArea: (area: AreaConfig) => void;
  }

const Portal: React.FC<PortalProps> = ({ onSelectArea }) => {
  const portalAreas = [
    { id: 'executive', name: 'Sala de Situación', icon: 'Activity', description: 'Resumen ejecutivo central.' } as any,
    ...AREAS.map((area) => ({
      ...area,
      description:
        area.id === 'postventa'
          ? 'Taller, PPT y servicios.'
          : area.id === 'rrhh'
          ? 'Talento y desempeño.'
          : area.id === 'calidad'
          ? 'Auditorías y satisfacción.'
          : 'Ventas y leads.',
    })),
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-white">
        <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_34%),radial-gradient(circle_at_80%_18%,_rgba(245,158,11,0.12),_transparent_26%),linear-gradient(180deg,_#020617_0%,_#050816_45%,_#020617_100%)]" />
            <div className="absolute inset-x-0 top-0 h-56 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-40" />
            <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="absolute bottom-8 right-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-8 md:py-8">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 flex items-center justify-between rounded-[1.5rem] border border-white/10 bg-white/6 px-5 py-4 shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur-xl"
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-base font-black italic text-slate-950">
                        VW
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Autosol Group</p>
                        <h1 className="text-xl font-black tracking-tight text-white md:text-2xl">Centro de Control Operativo</h1>
                    </div>
                </div>
            </motion.div>

            <div className="grid flex-1 grid-cols-1 gap-5">
                <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="rounded-[1.85rem] border border-white/10 bg-[linear-gradient(135deg,rgba(5,8,22,0.92),rgba(10,15,33,0.86))] px-6 py-6 text-white shadow-[0_32px_90px_rgba(2,6,23,0.44)] backdrop-blur-xl md:px-8 md:py-7"
                >
                    <div className="max-w-2xl">
                        <h2 className="max-w-xl text-4xl font-black leading-[0.96] tracking-tight md:text-5xl">
                            Visión operativa clara para decisiones rápidas.
                        </h2>
                        <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-300 md:text-base">
                            Calidad, postventa, RRHH y seguimiento ejecutivo en una sola vista.
                            Leer rápido, detectar desvíos y actuar.
                        </p>
                    </div>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="rounded-[1.85rem] border border-white/10 bg-white/6 p-6 shadow-[0_28px_80px_rgba(2,6,23,0.3)] backdrop-blur-xl"
                >
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-400">Acceso rápido</p>
                            <h3 className="mt-2 text-2xl font-black tracking-tight text-white">Áreas principales</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                        {portalAreas.map((area, idx) => {
                            const IconComponent = Icons[area.icon as keyof typeof Icons] || Icons.Home;
                            const isExecutive = area.id === 'executive';
                            const palette = isExecutive
                              ? 'bg-blue-500/15 text-blue-300 border-blue-400/20'
                              : area.id === 'postventa'
                              ? 'bg-blue-500/15 text-blue-300 border-blue-400/20'
                              : area.id === 'rrhh'
                              ? 'bg-amber-500/15 text-amber-300 border-amber-400/20'
                              : area.id === 'calidad'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20'
                              : 'bg-orange-500/15 text-orange-300 border-orange-400/20';

                            return (
                              <motion.button
                                key={area.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.12 + idx * 0.05 }}
                                whileHover={{ y: -5 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => onSelectArea(isExecutive ? { id: 'executive' as any, name: 'Sala de Situación', icon: 'Activity', color: 'blue', description: 'Resumen Ejecutivo Unificado' } : area)}
                                className="rounded-[1.65rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,16,32,0.92),rgba(15,23,42,0.82))] p-6 text-left transition-all hover:border-white/30 hover:bg-[#10172b] hover:shadow-[0_18px_50px_rgba(15,23,42,0.35)] md:min-h-[210px]"
                              >
                                  <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border ${palette}`}>
                                      <IconComponent className="h-5.5 w-5.5" />
                                  </div>
                                  <h4 className="max-w-[12rem] text-lg font-black uppercase leading-6 tracking-tight text-white">{area.name}</h4>
                                  <p className="mt-3 max-w-[13rem] text-[15px] leading-7 text-slate-400">{area.description}</p>
                              </motion.button>
                            );
                        })}
                    </div>
                </motion.section>
            </div>
        </div>
    </div>
  );
};

export default Portal;

