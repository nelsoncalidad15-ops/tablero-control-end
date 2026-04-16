import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  LayoutDashboard,
  Users,
  Calendar,
  Search,
  AlertCircle
} from 'lucide-react';
import { fetchHRGradesData, fetchHRRelatorioData, fetchHRContactsData, fetchCoursePhasesData } from '../services/dataService';
import { CourseGrade, RelatorioItem, LoadingState, CollaboratorContact, CoursePhase } from '../types';
import { SkeletonLoader } from './DashboardUI';

import RRHHTalentView from './RRHHTalentView';
import RRHHCollaboratorsView from './RRHHCollaboratorsView';
import RRHHCalendarView from './RRHHCalendarView';

interface RRHHDashboardProps {
  gradesUrl: string;
  relatorioUrl: string;
  contactsUrl: string;
  phasesUrl: string;
  onBack: () => void;
}

export type RRHHView = 'dashboard' | 'collaborators' | 'calendar';

const RRHHDashboard: React.FC<RRHHDashboardProps> = ({ gradesUrl, relatorioUrl, contactsUrl, phasesUrl, onBack }) => {
  const [view, setView] = useState<RRHHView>('dashboard');
  const [grades, setGrades] = useState<CourseGrade[]>([]);
  const [relatorio, setRelatorio] = useState<RelatorioItem[]>([]);
  const [contacts, setContacts] = useState<CollaboratorContact[]>([]);
  const [phases, setPhases] = useState<CoursePhase[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(null);

  const [selectedUnit, setSelectedUnit] = useState<string>('ALL');
  const [selectedArea, setSelectedArea] = useState<string>('ALL');
  const [selectedFunction, setSelectedFunction] = useState<string>('ALL');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      setLoadingState(LoadingState.LOADING);
      setErrorMessage(null);

      if (!gradesUrl || !relatorioUrl) {
        setLoadingState(LoadingState.ERROR);
        setErrorMessage('Faltan configurar las URLs de RRHH.');
        return;
      }

      try {
        const [gradesData, relatorioData, contactsData, phasesData] = await Promise.all([
          fetchHRGradesData(gradesUrl),
          fetchHRRelatorioData(relatorioUrl),
          fetchHRContactsData(contactsUrl),
          fetchCoursePhasesData(phasesUrl)
        ]);

        setGrades(gradesData);
        setRelatorio(relatorioData);
        setContacts(contactsData);
        setPhases(phasesData);
        setLoadingState(LoadingState.SUCCESS);
      } catch (error: any) {
        console.error('RRHHDashboard: Error loading HR data:', error);
        setLoadingState(LoadingState.ERROR);
        setErrorMessage(error.message || 'Error desconocido al cargar datos');
      }
    };

    loadData();
  }, [gradesUrl, relatorioUrl, contactsUrl, phasesUrl, retryCount]);

  const filteredGrades = useMemo(() => {
    return grades.filter(g => {
      const matchSearch = g.colaborador.toLowerCase().includes(searchQuery.toLowerCase());
      const matchUnit = selectedUnit === 'ALL' || g.unidad === selectedUnit;
      const matchArea = selectedArea === 'ALL' || g.area === selectedArea;
      const matchFunction = selectedFunction === 'ALL' || g.funcion === selectedFunction;

      if (showPendingOnly) {
        return matchSearch && matchUnit && matchArea && matchFunction && g.icf < 100;
      }

      return matchSearch && matchUnit && matchArea && matchFunction;
    });
  }, [grades, searchQuery, selectedUnit, selectedArea, selectedFunction, showPendingOnly]);

  const units = useMemo(() => ['ALL', ...new Set(grades.map(g => g.unidad))].sort(), [grades]);
  const areas = useMemo(() => ['ALL', ...new Set(grades.map(g => g.area))].sort(), [grades]);
  const functions = useMemo(() => ['ALL', ...new Set(grades.map(g => g.funcion))].sort(), [grades]);

  const handleResetFilters = () => {
    setSelectedUnit('ALL');
    setSelectedArea('ALL');
    setSelectedFunction('ALL');
    setShowPendingOnly(false);
    setSearchQuery('');
  };

  const handleSelectCollab = (id: string) => {
    setSelectedCollabId(id);
    setView('collaborators');
  };

  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<RelatorioItem | null>(null);

  const handleNavigateToCalendar = (event: RelatorioItem) => {
    setSelectedCalendarEvent(event);
    setView('calendar');
  };

  const renderView = () => {
    switch (view) {
      case 'dashboard':
        return (
          <RRHHTalentView
            grades={filteredGrades}
            relatorio={relatorio}
            phases={phases}
            units={units}
            areas={areas}
            functions={functions}
            selectedUnit={selectedUnit}
            setSelectedUnit={setSelectedUnit}
            selectedArea={selectedArea}
            setSelectedArea={setSelectedArea}
            selectedFunction={selectedFunction}
            setSelectedFunction={setSelectedFunction}
            onResetFilters={handleResetFilters}
            showPendingOnly={showPendingOnly}
            setShowPendingOnly={setShowPendingOnly}
            onSelectCollab={handleSelectCollab}
          />
        );
      case 'collaborators':
        return (
          <RRHHCollaboratorsView
            grades={grades}
            relatorio={relatorio}
            phases={phases}
            initialSearch={searchQuery}
            initialSelectedId={selectedCollabId}
            onNavigateToCalendar={handleNavigateToCalendar}
          />
        );
      case 'calendar':
        return (
          <RRHHCalendarView
            relatorio={relatorio}
            contacts={contacts}
            phases={phases}
            initialSelectedEvent={selectedCalendarEvent}
            onCloseEventDetail={() => setSelectedCalendarEvent(null)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/30 font-sans text-slate-900">
      <main className="flex flex-col min-w-0">
        <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/80 shadow-sm backdrop-blur-md">
          <div className="mx-auto w-full max-w-[1600px]">
            <div className="flex h-20 items-center justify-between border-b border-slate-50 px-8">
              <div className="flex items-center gap-4">
                <motion.button
                  type="button"
                  whileHover={{ x: -3 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onBack}
                  className="group flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:text-[#001E50]"
                  aria-label="Volver al tablero anterior"
                >
                  <ArrowLeft size={16} strokeWidth={2.2} className="transition-transform group-hover:-translate-x-0.5" />
                  <span className="text-[10px] font-black uppercase tracking-[0.28em]">Volver</span>
                </motion.button>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#001E50] shadow-xl shadow-[#001E50]/10">
                  <span className="font-display text-2xl font-bold text-white">A</span>
                </div>
                <div>
                  <h1 className="font-display text-lg font-bold leading-none tracking-tight text-[#001E50]">Autosol</h1>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00B0F0]">Talent Hub</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="group relative w-72">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#00B0F0]" size={18} strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Buscar en el hub..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-2.5 pl-11 pr-4 text-sm font-medium outline-none transition-all placeholder:text-slate-400 focus:border-[#00B0F0] focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-8">
              <nav className="flex items-center gap-2">
                <TabButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<LayoutDashboard size={20} strokeWidth={1.5} />} label="Dashboard" />
                <TabButton active={view === 'collaborators'} onClick={() => setView('collaborators')} icon={<Users size={20} strokeWidth={1.5} />} label="Colaboradores" />
                <TabButton active={view === 'calendar'} onClick={() => setView('calendar')} icon={<Calendar size={20} strokeWidth={1.5} />} label="Calendario" />
              </nav>

              <div className="flex items-center gap-4">
                <div className="h-6 w-1.5 rounded-full bg-[#00B0F0] shadow-sm shadow-[#00B0F0]/20" />
                <h2 className="font-display text-base font-semibold tracking-tight text-[#001E50]">
                  {view === 'dashboard' ? 'Gestión de Talento' : view === 'collaborators' ? 'Perfil de Colaboradores' : 'Calendario de Capacitación'}
                </h2>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1600px] flex-1 p-6">
          {loadingState === LoadingState.LOADING ? (
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <SkeletonLoader className="h-32 rounded-2xl" />
                <SkeletonLoader className="h-32 rounded-2xl" />
                <SkeletonLoader className="h-32 rounded-2xl" />
              </div>
              <SkeletonLoader className="h-96 rounded-2xl" />
            </div>
          ) : loadingState === LoadingState.ERROR ? (
            <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-slate-400">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <AlertCircle size={32} />
              </div>
              <h3 className="mb-2 text-lg font-black uppercase tracking-tight text-[#001E50]">Error de Carga</h3>
              <p className="mb-8 max-w-md text-center text-xs font-bold uppercase tracking-widest text-slate-400">
                {errorMessage || 'No se pudieron cargar los datos de RRHH.'}
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setRetryCount(prev => prev + 1)}
                  className="rounded-xl bg-[#001E50] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-[#003380]"
                >
                  Reintentar
                </button>
                <button
                  onClick={onBack}
                  className="rounded-xl bg-slate-100 px-8 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-200"
                >
                  Volver
                </button>
              </div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`group relative flex items-center gap-3 px-8 py-5 transition-all duration-300 ${
      active ? 'font-semibold text-[#00B0F0]' : 'font-medium text-slate-400 hover:text-[#001E50]'
    }`}
  >
    <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
    <span className="font-display text-xs uppercase tracking-widest">{label}</span>
    {active && (
      <motion.div
        layoutId="activeTab"
        className="absolute bottom-0 left-0 right-0 h-1 rounded-t-full bg-[#00B0F0] shadow-[0_-2px_8px_rgba(0,176,240,0.4)]"
      />
    )}
  </button>
);

export default RRHHDashboard;
