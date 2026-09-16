import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Icons } from './Icon';

const AmbienteSelection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f7f9fc] font-sans text-[#001e50]">
      {/* Header — igual al portal */}
      <header className="sticky top-0 z-40 flex min-h-[72px] items-center justify-between gap-5 border-b border-[#e6ecf2] bg-white px-[clamp(24px,4vw,72px)] py-3">
        <div className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-[#001e50]">
          <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#001e50] text-[15px] font-black italic">
            VW
          </span>
          <span>
            Autosol <span className="font-normal text-[#7c899e]">| Ambiente</span>
          </span>
        </div>
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 rounded-full border border-[#e6ecf2] bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#65748a] transition hover:border-[#91b5d0] hover:text-[#001e50]"
        >
          <Icons.ArrowLeft className="h-4 w-4" />
          Volver al portal
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-[clamp(24px,4vw,72px)] py-8">
        {/* Hero título */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-[1.25rem] bg-[#e7f6f5] text-[#16786f]">
            <Icons.Leaf className="h-7 w-7" />
          </div>
          <p className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#316487]">
            <span className="inline-block h-0.5 w-7 bg-[#008bc5]" />
            Gestión Ambiental
          </p>
          <h2 className="mt-3 text-[2rem] font-bold tracking-tight text-[#001e50] md:text-[2.8rem]">
            Ambiente Autosol
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#4a6078]">
            Seguimiento claro de recursos, intensidad de consumo y comparativas entre sedes.
          </p>
        </motion.div>

        {/* Tarjeta de módulo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mx-auto w-full max-w-2xl"
        >
          <motion.button
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/ambiente/consumos')}
            className="group flex w-full items-center gap-5 rounded-[14px] border border-[#e3eaf2] bg-white p-6 text-left transition-all hover:border-[#91b5d0] hover:shadow-[0_7px_22px_#001e500a] hover:-translate-y-0.5"
          >
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#e7f6f5] text-[#16786f]">
              <div className="relative">
                <Icons.Droplet className="h-7 w-7" />
                <Icons.Zap className="absolute -right-3 -top-3 h-4 w-4 text-amber-500" />
              </div>
            </span>
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.28em] text-[#6b7c90]">Módulo disponible</span>
              <span className="text-lg font-bold leading-snug text-[#001e50]">Consumos</span>
              <span className="text-sm leading-6 text-[#4a6078]">Agua, energía, indicadores ponderados y detalle mensual.</span>
            </span>
            <Icons.ArrowRight className="ml-auto h-5 w-5 shrink-0 text-[#6e8ca9] transition group-hover:translate-x-0.5" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
};

export default AmbienteSelection;
