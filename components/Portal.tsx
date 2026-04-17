
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
  ].filter((area) => area.id !== 'ventas');

  return (
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
                        <h1 className="text-lg font-black tracking-tight text-white md:text-xl lg:text-2xl">Centro de Control Operativo</h1>
                    </div>
                </div>
            </motion.div>

            <div className="flex flex-1 min-h-0 flex-col gap-5">
              <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="min-h-0 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,14,30,0.96),rgba(6,10,24,0.92))] px-5 py-8 text-white shadow-[0_34px_100px_rgba(2,6,23,0.42)] backdrop-blur-xl md:px-10 md:py-12"
                >
                    <div className="mx-auto max-w-5xl text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.55em] text-indigo-300/80">Intelligence Hub</p>
                        <h2 className="mt-4 text-[2.7rem] font-black uppercase italic leading-[0.88] tracking-tighter md:text-[4.4rem] lg:text-[5.2rem]">
                            <span className="block text-white">Centro de</span>
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">calidad</span>
                        </h2>
                        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300/88 md:text-[15px]">
                            Seleccione el módulo de análisis para visualizar el rendimiento y la satisfacción del cliente en tiempo real.
                        </p>
                    </div>
                </motion.section>

              <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.1 }}
                  className="min-h-0 rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.30)] backdrop-blur-xl md:p-5"
                >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
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
                                whileHover={{ y: -4, scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => onSelectArea(isExecutive ? { id: 'executive' as any, name: 'Sala de Situación', icon: 'Activity', color: 'blue', description: 'Resumen Ejecutivo Unificado' } : area)}
                                className="group relative min-h-[190px] rounded-[1.65rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,16,32,0.90),rgba(15,23,42,0.80))] p-5 text-center transition-all hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.92))] hover:shadow-[0_18px_50px_rgba(15,23,42,0.34)] md:min-h-[210px] md:p-6"
                              >
                                  <div className="flex h-full flex-col items-center justify-between">
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
                                      <div className={`flex h-20 w-20 items-center justify-center rounded-[1.8rem] border ${palette} shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`}>
                                        <IconComponent className="h-9 w-9" />
                                      </div>
                                      <div>
                                        <h4 className="text-[1.45rem] font-black uppercase leading-none tracking-tight text-white md:text-[1.6rem]">{area.name}</h4>
                                        <p className="mt-3 text-[0.7rem] font-black uppercase tracking-[0.42em] text-slate-400">{area.description}</p>
                                      </div>
                                    </div>
                                    <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/5">
                                      <div className={`h-full w-1/2 rounded-full ${isExecutive ? 'bg-cyan-400' : 'bg-blue-400'} opacity-70 transition-all group-hover:w-full`} />
                                    </div>
                                  </div>
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

