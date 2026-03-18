import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ChevronRight, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Mail,
  User,
  Building2,
  Briefcase,
  Trophy,
  Calendar,
  Users
} from 'lucide-react';
import { CourseGrade, RelatorioItem } from '../types';
import { Icons } from './Icon';

interface RRHHCollaboratorsViewProps {
  grades: CourseGrade[];
  relatorio: RelatorioItem[];
  initialSearch?: string;
  initialSelectedId?: string | null;
  onNavigateToCalendar?: (event: RelatorioItem) => void;
}

const RRHHCollaboratorsView: React.FC<RRHHCollaboratorsViewProps> = ({
  grades,
  relatorio,
  initialSearch = '',
  initialSelectedId = null,
  onNavigateToCalendar
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCollabId, setSelectedCollabId] = useState<string | null>(
    initialSelectedId || grades[0]?.id || null
  );

  // Update selected collab if initialSelectedId changes
  useEffect(() => {
    if (initialSelectedId) {
      setSelectedCollabId(initialSelectedId);
    }
  }, [initialSelectedId]);

  const filteredCollabs = useMemo(() => {
    return grades
      .filter(g => g.colaborador.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => a.colaborador.localeCompare(b.colaborador));
  }, [grades, searchQuery]);

  const selectedCollab = useMemo(() => {
    return grades.find(g => g.id === selectedCollabId) || null;
  }, [grades, selectedCollabId]);

  const programCourses = useMemo(() => {
    if (!selectedCollab) return [];
    
    // Get all courses from the grades record
    // Filter out -1 (Not applicable)
    return Object.entries(selectedCollab.courses)
      .filter(([_, score]) => score !== -1)
      .map(([name, score]) => {
        let status: 'approved' | 'pending' | 'failed' = 'pending';
        if (score > 0) {
          status = score >= 60 ? 'approved' : 'failed';
        }
        
        return {
          name,
          score,
          status,
          type: 'finished' as const
        };
      }).sort((a, b) => {
        // Sort by status (pending first, then failed, then approved) then by name
        const statusOrder = { 'pending': 0, 'failed': 1, 'approved': 2 };
        if (a.status === b.status) return a.name.localeCompare(b.name);
        return statusOrder[a.status] - statusOrder[b.status];
      });
  }, [selectedCollab]);

  const upcomingCourses = useMemo(() => {
    if (!selectedCollab) return [];

    return relatorio
      .filter(r => r.nombre.toLowerCase() === selectedCollab.colaborador.toLowerCase())
      .map(r => ({
        name: r.curso,
        score: 0,
        status: 'pending' as const,
        type: 'relatorio' as const,
        relatorioItem: r
      })).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedCollab, relatorio]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Top Selector Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#001E50] rounded-xl flex items-center justify-center shadow-lg shadow-[#001E50]/20">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-xs font-black text-[#001E50] uppercase tracking-tight">Selección de Colaborador</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Visualización de legajo de capacitación</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input 
              type="text"
              placeholder="BUSCAR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-[#001E50] focus:border-[#00B0F0] outline-none transition-all"
            />
          </div>
          <select
            value={selectedCollabId || ''}
            onChange={(e) => setSelectedCollabId(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-[#001E50] focus:border-[#00B0F0] outline-none cursor-pointer uppercase tracking-tight"
          >
            <option value="" disabled>Seleccionar Colaborador...</option>
            {filteredCollabs.map(collab => (
              <option key={collab.id} value={collab.id}>
                {collab.colaborador}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {selectedCollab ? (
          <div className="space-y-8">
            {/* Profile Header */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#00B0F0]/5 rounded-full blur-3xl -mr-32 -mt-32" />
              
              <div className="relative flex flex-col md:flex-row md:items-center gap-8">
                <div className="w-24 h-24 bg-[#001E50] rounded-[2rem] flex items-center justify-center shadow-xl shadow-[#001E50]/20">
                  <User size={40} className="text-white" />
                </div>
                
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h2 className="text-3xl font-black text-[#001E50] uppercase italic tracking-tighter">
                      {selectedCollab.colaborador}
                    </h2>
                    <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                      Activo
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <Building2 size={16} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidad</p>
                        <p className="text-xs font-black text-[#001E50] uppercase">{selectedCollab.unidad}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <Briefcase size={16} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Área</p>
                        <p className="text-xs font-black text-[#001E50] uppercase">{selectedCollab.area}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <Trophy size={16} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ICF</p>
                        <p className="text-xs font-black text-[#00B0F0]">{selectedCollab.icf}%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mt-8 pt-8 border-t border-slate-50">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Cursos Completados</p>
                  <p className="text-2xl font-black text-emerald-700">{programCourses.filter(c => c.status === 'approved').length}</p>
                </div>
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                  <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Cursos Pendientes</p>
                  <p className="text-2xl font-black text-amber-700">{programCourses.filter(c => c.status === 'pending').length}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Próximas Inscripciones</p>
                  <p className="text-2xl font-black text-blue-700">{upcomingCourses.length}</p>
                </div>
              </div>
            </div>

            {/* Courses Sections - 75/25 Split */}
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Program Status Section (Main) */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-2 h-6 bg-[#001E50] rounded-full" />
                  <h3 className="text-sm font-black text-[#001E50] uppercase tracking-tight">Estado de Cursos del Programa</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {programCourses.length > 0 ? (
                    programCourses.map((courseData) => (
                      <CourseCard 
                        key={courseData.name} 
                        courseData={courseData} 
                      />
                    ))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin cursos registrados en el programa</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Section (Sidebar) */}
              <div className="w-full lg:w-80 space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-2 h-6 bg-[#00B0F0] rounded-full" />
                  <h3 className="text-sm font-black text-[#001E50] uppercase tracking-tight">Próximos (Relatorio)</h3>
                </div>
                <div className="flex flex-col gap-4">
                  {upcomingCourses.length > 0 ? (
                    upcomingCourses.map((courseData) => (
                      <CourseCard 
                        key={courseData.name} 
                        courseData={courseData} 
                        onNavigateToCalendar={onNavigateToCalendar} 
                        isCompact
                      />
                    ))
                  ) : (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin inscripciones próximas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[400px] flex flex-col items-center justify-center text-slate-300 bg-white rounded-3xl border border-dashed border-slate-200">
            <User size={48} className="opacity-10 mb-4" />
            <p className="text-sm font-black uppercase tracking-widest">Selecciona un colaborador para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface CourseCardProps {
  courseData: any;
  onNavigateToCalendar?: (event: RelatorioItem) => void;
  isCompact?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = ({ courseData, onNavigateToCalendar, isCompact }) => {
  const { name, score, status, type } = courseData;
  
  let statusColor = 'bg-rose-500';
  let textColor = 'text-rose-600';
  let bgColor = 'bg-rose-50';
  let statusText = 'Desaprobado';
  let Icon = AlertCircle;

  if (status === 'pending') {
    statusColor = 'bg-amber-500';
    textColor = 'text-amber-600';
    bgColor = 'bg-amber-50';
    statusText = type === 'relatorio' ? 'Próximamente' : 'Pendiente';
    Icon = Clock;
  } else if (status === 'approved') {
    statusColor = 'bg-emerald-500';
    textColor = 'text-emerald-600';
    bgColor = 'bg-emerald-50';
    statusText = type === 'relatorio' ? 'Finalizado' : 'Aprobado';
    Icon = CheckCircle2;
  }

  if (isCompact) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => onNavigateToCalendar?.(courseData.relatorioItem!)}
        className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all group cursor-pointer hover:border-[#00B0F0] relative overflow-hidden"
      >
        <div className={`absolute top-0 left-0 w-1 h-full ${statusColor}`} />
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg bg-white shadow-sm border border-slate-50 flex items-center justify-center flex-shrink-0 ${textColor}`}>
            <Icon size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-[10px] font-black text-[#001E50] leading-tight uppercase line-clamp-2 group-hover:text-[#00B0F0] transition-colors">
              {name}
            </h5>
            <div className="flex items-center gap-2 mt-1">
              <Calendar size={10} className="text-slate-400" />
              <span className="text-[8px] font-bold text-slate-400 uppercase">
                {courseData.relatorioItem?.claseFecha || 'Sin fecha'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={() => type === 'relatorio' && onNavigateToCalendar?.(courseData.relatorioItem!)}
      className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden ${type === 'relatorio' ? 'cursor-pointer hover:border-[#00B0F0]' : ''}`}
    >
      <div className={`absolute top-0 left-0 w-1.5 h-full ${statusColor}`} />
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
            {type === 'relatorio' ? 'Capacitación Programada' : 'Módulo de Formación'}
          </p>
          <h5 className="text-xs font-black text-[#001E50] leading-tight uppercase line-clamp-2 group-hover:text-[#00B0F0] transition-colors">
            {name}
          </h5>
        </div>
        <div className={`w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-50 flex items-center justify-center flex-shrink-0 ${textColor}`}>
          <Icon size={20} />
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-end justify-between">
          <div className="flex flex-col">
            <span className={`text-3xl font-black font-mono leading-none ${textColor}`}>
              {score}<span className="text-sm ml-0.5">%</span>
            </span>
            {type === 'relatorio' && (
              <span className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                <Calendar size={10} />
                {courseData.relatorioItem?.claseFecha || 'Sin fecha'}
              </span>
            )}
          </div>
          <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${bgColor} ${textColor}`}>
            {statusText}
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            className={`h-full rounded-full ${statusColor}`}
          />
        </div>
      </div>
      
      {type === 'relatorio' && (
        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-center gap-2 text-[9px] font-black text-[#00B0F0] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
          <Calendar size={12} />
          <span>Ver Detalles en Calendario</span>
        </div>
      )}
    </motion.div>
  );
};

export default RRHHCollaboratorsView;

