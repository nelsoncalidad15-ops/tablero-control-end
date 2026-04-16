
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

  const executiveHighlights = [
    {
      icon: 'Target',
      title: 'Lectura inmediata',
      description: 'El tablero se entiende en segundos, con una jerarquía visual más limpia.',
    },
    {
      icon: 'ShieldCheck',
      title: 'Control unificado',
      description: 'Calidad, postventa, RRHH y ventas conviven bajo una misma lógica ejecutiva.',
    },
    {
      icon: 'Clock',
      title: 'Decisión rápida',
      description: 'El acceso está pensado para detectar desvíos y actuar sin perder tiempo.',
    },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-slate-950 font-sans text-white">
        <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_34%),radial-gradient(circle_at_80%_18%,_rgba(245,158,11,0.12),_transparent_26%),linear-gradient(180deg,_#020617_0%,_#050816_45%,_#020617_100%)]" />
            <div className="absolute inset-x-0 top-0 h-56 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)] opacity-40" />
            <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="absolute bottom-8 right-0 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-[1700px] flex-col gap-4 px-4 py-4 md:px-6 md:py-5 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex shrink-0 items-center justify-between rounded-[1.25rem] border border-white/10 bg-white/6 px-4 py-3 shadow-[0_24px_80px_rgba(2,6,23,0.32)] backdrop-blur-xl md:px-5"
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-black italic text-slate-950 md:h-12 md:w-12 md:text-base">
                        VW
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400 md:text-[10px]">Autosol Group</p>
                        <h1 className="text-lg font-black tracking-tight text-white md:text-xl lg:text-2xl">Centro de Control Operativo</h1>
                    </div>
                </div>
            </motion.div>

            <div className="grid flex-1 min-h-0 gap-4 lg:grid-rows-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
                <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="grid min-h-0 gap-4 rounded-[1.75rem] border border-white/10 bg-[linear-gradient(135deg,rgba(5,8,22,0.92),rgba(10,15,33,0.86))] p-5 text-white shadow-[0_32px_90px_rgba(2,6,23,0.44)] backdrop-blur-xl md:p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-7"
                >
                    <div className="flex min-h-0 flex-col justify-between gap-5">
                        <div className="max-w-4xl">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-200">
                                <Icons.Sparkles className="h-3.5 w-3.5" />
                                Centro ejecutivo unificado
                            </div>
                            <h2 className="max-w-3xl text-3xl font-black leading-[0.92] tracking-tight md:text-4xl lg:text-[3.4rem]">
                                Visión operativa clara para decisiones rápidas.
                            </h2>
                            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-[15px] md:leading-7">
                                Calidad, postventa, RRHH y seguimiento ejecutivo en una sola vista.
                                La idea es leer rápido, detectar desvíos y actuar.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                                Lectura en una pantalla
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                                Sin ruido visual
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                                Navegación por área
                            </div>
                        </div>
                    </div>

                    <div className="grid min-h-0 gap-3">
                        {executiveHighlights.map((item, index) => {
                            const IconComponent = Icons[item.icon as keyof typeof Icons] || Icons.Info;
                            const accent = index === 0
                              ? 'border-cyan-400/20 from-cyan-400/20 to-blue-400/10'
                              : index === 1
                              ? 'border-emerald-400/20 from-emerald-400/20 to-cyan-400/10'
                              : 'border-amber-400/20 from-amber-400/20 to-orange-400/10';

                            return (
                              <div
                                key={item.title}
                                className={`rounded-[1.5rem] border bg-[linear-gradient(180deg,rgba(11,16,32,0.94),rgba(15,23,42,0.84))] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.28)] ${accent}`}
                              >
                                <div className="mb-3 flex items-center gap-3">
                                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
                                    <IconComponent className="h-5 w-5" />
                                  </div>
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-400">Principio</p>
                                    <h3 className="text-base font-black tracking-tight text-white">{item.title}</h3>
                                  </div>
                                </div>
                                <p className="max-w-md text-sm leading-6 text-slate-400">
                                  {item.description}
                                </p>
                              </div>
                            );
                        })}
                    </div>
                </motion.section>

                <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="min-h-0 rounded-[1.75rem] border border-white/10 bg-white/6 p-4 shadow-[0_28px_80px_rgba(2,6,23,0.3)] backdrop-blur-xl md:p-5"
                >
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-400">Acceso rápido</p>
                            <h3 className="mt-1 text-xl font-black tracking-tight text-white md:text-2xl">Áreas principales</h3>
                        </div>
                    </div>

                    <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
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
                                className="group rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,16,32,0.92),rgba(15,23,42,0.82))] p-4 text-left transition-all hover:border-white/30 hover:bg-[#10172b] hover:shadow-[0_18px_50px_rgba(15,23,42,0.35)] md:min-h-[150px] md:p-5"
                              >
                                  <div className="mb-3 flex items-start justify-between gap-3">
                                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${palette}`}>
                                        <IconComponent className="h-5.5 w-5.5" />
                                    </div>
                                    <Icons.ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1" />
                                  </div>
                                  <h4 className="max-w-[12rem] text-base font-black uppercase leading-5 tracking-tight text-white md:text-[1.02rem]">{area.name}</h4>
                                  <p className="mt-2 max-w-[13rem] text-sm leading-6 text-slate-400">{area.description}</p>
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

