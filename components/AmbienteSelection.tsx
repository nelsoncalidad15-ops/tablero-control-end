import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Icons } from './Icon';

const AmbienteSelection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.13),_transparent_27%),linear-gradient(180deg,_#0f172a_0%,_#020617_100%)] px-4 py-6 text-white md:px-6 md:py-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '72px 72px' }} />
        <div className="absolute -left-20 top-28 h-72 w-72 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[1180px] flex-col justify-center gap-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto w-full max-w-3xl text-center"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] border border-emerald-300/25 bg-emerald-400/10 text-emerald-200 shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
            <Icons.Leaf className="h-7 w-7" />
          </div>
          <p className="mt-5 text-[10px] font-black uppercase tracking-[0.55em] text-teal-200/80">Gestion ambiental</p>
          <h1 className="mt-4 text-[2.9rem] font-black uppercase italic leading-[0.9] tracking-tighter text-white md:text-[4.2rem]">
            <span className="block">Ambiente</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-teal-300 to-cyan-300">Autosol</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300/85 md:text-[15px]">
            Seguimiento claro de recursos, intensidad de consumo y comparativas entre sedes.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.08 }}
          className="mx-auto w-full max-w-2xl rounded-[2.25rem] border border-white/10 bg-white/5 p-4 shadow-[0_30px_90px_rgba(2,6,23,0.45)] backdrop-blur-2xl md:p-5"
        >
          <motion.button
            whileHover={{ y: -5, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/ambiente/consumos')}
            className="group relative w-full overflow-hidden rounded-[1.8rem] border border-teal-300/20 bg-[linear-gradient(135deg,rgba(20,184,166,0.16),rgba(14,116,144,0.12),rgba(15,23,42,0.3))] p-7 text-left shadow-[0_18px_50px_rgba(15,118,110,0.18)] transition-all hover:border-teal-200/45 sm:p-8"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-100/55 to-transparent" />
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-5">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] border border-cyan-200/20 bg-cyan-400/10 text-cyan-100 shadow-[0_18px_40px_rgba(8,145,178,0.18)]">
                  <div className="relative">
                    <Icons.Droplet className="h-9 w-9" />
                    <Icons.Zap className="absolute -right-3 -top-3 h-5 w-5 text-amber-300" />
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.32em] text-teal-100/70">Modulo disponible</p>
                  <h2 className="mt-2 text-[1.55rem] font-black uppercase tracking-tight text-white">Consumos</h2>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-300/85">Agua, energia, indicadores ponderados y detalle mensual.</p>
                </div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center self-end rounded-2xl border border-white/10 bg-white/10 text-white transition-transform group-hover:translate-x-1 sm:self-auto">
                <Icons.ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </motion.button>
        </motion.section>

        <div className="flex justify-center">
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-[0.28em] text-slate-300 transition-all hover:bg-white/10 hover:text-white">
            <Icons.ArrowLeft className="h-4 w-4" />
            Volver al portal
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmbienteSelection;
