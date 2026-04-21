
import React from 'react';
import { motion } from 'motion/react';
import { AreaConfig } from '../types';
import { AREAS } from '../constants';
import { Icons } from './Icon';

interface PortalProps {
  onSelectArea: (area: AreaConfig) => void;
  onPrefetchArea?: (areaId: string) => void;
  }

const Portal: React.FC<PortalProps> = ({ onSelectArea, onPrefetchArea }) => {
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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_82%_16%,_rgba(168,85,247,0.11),_transparent_24%),radial-gradient(circle_at_50%_112%,_rgba(14,165,233,0.08),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#050816_48%,_#020617_100%)]" />
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

            <div className="flex flex-1 min-h-0 flex-col gap-4">
              <motion.section
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7 }}
                  className="min-h-0 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(135deg,rgba(5,8,22,0.94),rgba(10,15,33,0.88))] p-5 text-white shadow-[0_34px_100px_rgba(2,6,23,0.42)] backdrop-blur-xl md:p-6 lg:p-6"
                >
                    <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr] lg:items-stretch">
                        <div className="flex h-full flex-col justify-between gap-4 md:gap-5">
                            <div className="max-w-4xl">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="h-px w-10 bg-gradient-to-r from-cyan-400/80 to-transparent" />
                                </div>
                                <h2 className="max-w-3xl text-[2.35rem] font-black leading-[0.94] tracking-tight text-balance md:text-[3.15rem] lg:text-[3.45rem]">
                                    <span className="block">Visión operativa clara</span>
                                    <span className="block text-white/90">para decisiones rápidas.</span>
                                </h2>
                                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300/88 md:text-[15px] md:leading-7">
                                    Calidad, postventa, RRHH y seguimiento ejecutivo en una sola vista.
                                    La idea es leer rápido, detectar desvíos y actuar.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 self-stretch rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            {[
                                { icon: Icons.Activity, label: 'Monitoreo', value: 'Directo' },
                                { icon: Icons.Monitor, label: 'Control', value: 'Centralizado' },
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
                  className="min-h-0 rounded-[1.85rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-4 shadow-[0_28px_80px_rgba(2,6,23,0.30)] backdrop-blur-xl md:p-5"
                >
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="mt-1 text-xl font-black tracking-tight text-white md:text-2xl">Áreas principales</h3>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
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
                                onMouseEnter={() => onPrefetchArea?.(area.id)}
                                onFocus={() => onPrefetchArea?.(area.id)}
                                onTouchStart={() => onPrefetchArea?.(area.id)}
                                onClick={() => onSelectArea(isExecutive ? { id: 'executive' as any, name: 'Sala de Situación', icon: 'Activity', color: 'blue', description: 'Resumen Ejecutivo Unificado' } : area)}
                                className="group relative min-h-[160px] rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,16,32,0.90),rgba(15,23,42,0.80))] p-4 text-left transition-all hover:border-white/20 hover:bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(15,23,42,0.92))] hover:shadow-[0_18px_50px_rgba(15,23,42,0.34)] md:min-h-[166px] md:p-5"
                              >
                                  <div className="flex h-full flex-col justify-between">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${palette} shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`}>
                                          <IconComponent className="h-5.5 w-5.5" />
                                      </div>
                                      <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.28em] text-slate-300 transition-colors group-hover:bg-cyan-400/10 group-hover:text-cyan-200">
                                        abrir
                                      </div>
                                    </div>
                                    <div className="mt-4">
                                      <h4 className="max-w-[12rem] text-[0.98rem] font-black uppercase leading-5 tracking-tight text-white md:text-[1.02rem]">{area.name}</h4>
                                      <p className="mt-2 max-w-[13rem] text-sm leading-6 text-slate-400">{area.description}</p>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">
                                      <span>Acceso directo</span>
                                      <Icons.ChevronRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1" />
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

