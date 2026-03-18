import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar as CalendarIcon, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  User,
  GraduationCap,
  AlertCircle,
  X,
  Info,
  CalendarDays,
  Building2
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { RelatorioItem } from '../types';

interface RRHHCalendarViewProps {
  relatorio: RelatorioItem[];
  initialSelectedEvent?: RelatorioItem | null;
  onCloseEventDetail?: () => void;
}

const RRHHCalendarView: React.FC<RRHHCalendarViewProps> = ({ 
  relatorio, 
  initialSelectedEvent,
  onCloseEventDetail
}) => {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<RelatorioItem | null>(null);

  // Helper to parse date string safely
  const parseDate = (dateStr: string | undefined, referenceMonth?: string): Date | null => {
    if (!dateStr || dateStr.toLowerCase().includes('sin') || dateStr.toLowerCase().includes('fecha')) return null;
    
    const months: Record<string, number> = {
      'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
      'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };

    try {
      const lowerDate = dateStr.toLowerCase();
      
      // Handle "DD de Mes" format (e.g., "08 de mayo")
      if (lowerDate.includes(' de ')) {
        const parts = lowerDate.split(' de ');
        const day = parseInt(parts[0]);
        const monthName = parts[1].trim();
        
        // Try to find month index
        let monthIndex = -1;
        for (const [name, index] of Object.entries(months)) {
          if (monthName.includes(name)) {
            monthIndex = index;
            break;
          }
        }

        if (day > 0 && monthIndex !== -1) {
          // Use year from referenceMonth if available (format M/YYYY)
          let year = new Date().getFullYear();
          if (referenceMonth && referenceMonth.includes('/')) {
            const yearPart = referenceMonth.split('/')[1];
            if (yearPart) year = parseInt(yearPart);
          }
          return new Date(year, monthIndex, day);
        }
      }

      // Standard numeric formats
      const parts = dateStr.split(/[/ -]/).map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        let d, m, y;
        if (parts[0] > 1000) {
          [y, m, d] = parts;
        } else {
          [d, m, y] = parts;
        }
        const date = new Date(y, m - 1, d);
        return isNaN(date.getTime()) ? null : date;
      }
      
      return null;
    } catch (e) {
      return null;
    }
  };

  // Handle initial selected event
  useEffect(() => {
    if (initialSelectedEvent) {
      setSelectedEvent(initialSelectedEvent);
      
      // Set calendar to the event's month
      const eventDate = parseDate(initialSelectedEvent.claseFecha, initialSelectedEvent.referenciaMeses);
      if (eventDate) {
        setCurrentDate(eventDate);
      }
    }
  }, [initialSelectedEvent]);

  const groupedByMonth = useMemo(() => {
    const groups: Record<string, RelatorioItem[]> = {};
    relatorio.forEach(item => {
      const month = item.referenciaMeses || 'Sin Fecha';
      if (!groups[month]) groups[month] = [];
      groups[month].push(item);
    });
    return groups;
  }, [relatorio]);

  const calendarDays = useMemo(() => {
    // Ensure currentDate is valid before using date-fns
    const dateToUse = isNaN(currentDate.getTime()) ? new Date() : currentDate;
    const start = startOfWeek(startOfMonth(dateToUse), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(dateToUse), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    return relatorio.filter(item => {
      const eventDate = parseDate(item.claseFecha, item.referenciaMeses);
      return eventDate ? isSameDay(day, eventDate) : false;
    });
  };

  const handleCloseModal = () => {
    setSelectedEvent(null);
    onCloseEventDetail?.();
  };

  return (
    <div className="space-y-6 relative">
      {/* Event Detail Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#001E50]/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              {/* Modal Header */}
              <div className="bg-[#001E50] p-6 text-white relative">
                <button 
                  onClick={handleCloseModal}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#00B0F0] flex items-center justify-center shadow-lg shadow-[#00B0F0]/20">
                    <GraduationCap size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-[8px] font-black uppercase rounded-full tracking-widest">Próximamente</span>
                    </div>
                    <h3 className="text-lg font-black leading-tight uppercase tracking-tight">{selectedEvent.curso}</h3>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Colaborador</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#001E50]">
                      <User size={14} className="text-[#00B0F0]" />
                      <span>{selectedEvent.nombre}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unidad</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#001E50]">
                      <Building2 size={14} className="text-[#00B0F0]" />
                      <span>{selectedEvent.unidad}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#001E50]">
                      <CalendarDays size={14} className="text-[#00B0F0]" />
                      <span>{selectedEvent.claseFecha || 'Sin Fecha'}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Horario</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-[#001E50]">
                      <Clock size={14} className="text-[#00B0F0]" />
                      <span>{selectedEvent.claseHora || 'Sin Horario'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={14} className="text-[#001E50]" />
                    <p className="text-[10px] font-black text-[#001E50] uppercase tracking-tight">Detalles del Registro</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Referencia</span>
                      <span className="text-[9px] font-black text-[#001E50]">{selectedEvent.referenciaMeses}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase">Registro</span>
                      <span className="text-[9px] font-black text-[#001E50]">{selectedEvent.fechaRegistro}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button 
                    onClick={handleCloseModal}
                    className="w-full py-3 bg-[#001E50] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-[#003380] transition-all shadow-lg shadow-[#001E50]/20"
                  >
                    Entendido
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'calendar' ? 'bg-white text-[#001E50] shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <CalendarIcon size={16} />
              <span>Vista Mensual</span>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'list' ? 'bg-white text-[#001E50] shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <List size={16} />
              <span>Vista de Lista</span>
            </button>
          </div>

          {viewMode === 'calendar' && (
            <div className="flex items-center gap-4 ml-4">
              <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                <ChevronLeft size={20} />
              </button>
              <h3 className="text-sm font-black text-[#001E50] uppercase tracking-widest min-w-[150px] text-center">
                {format(currentDate, 'MMMM yyyy', { locale: es })}
              </h3>
              <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase">Curso Pendiente</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day: string) => (
              <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {calendarDays.map((day: Date, idx: number) => {
              const events = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={idx} 
                  className={`min-h-[140px] p-2 border-r border-b border-slate-50 transition-colors ${
                    !isCurrentMonth ? 'bg-slate-50/30' : 'bg-white'
                  } ${isToday ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-xs font-black font-mono ${
                      isToday ? 'text-[#00B0F0]' : isCurrentMonth ? 'text-[#001E50]' : 'text-slate-300'
                    }`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {events.map((event, eIdx) => (
                      <button 
                        key={eIdx}
                        onClick={() => setSelectedEvent(event)}
                        className="w-full text-left p-1.5 bg-amber-50 border border-amber-100 rounded-md text-[9px] font-bold text-amber-700 leading-tight truncate hover:whitespace-normal hover:relative hover:z-10 hover:shadow-lg transition-all"
                        title={event.curso}
                      >
                        {event.curso}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedByMonth).sort().map(([month, items]) => (
            <div key={month} className="space-y-4">
              <div className="flex items-center gap-4">
                <h4 className="text-sm font-black text-[#001E50] uppercase tracking-widest bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                  {month}
                </h4>
                <div className="h-px flex-1 bg-slate-200"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase">{items.length} Cursos</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => setSelectedEvent(item)}
                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-[#00B0F0] transition-all group cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-[#001E50] group-hover:bg-[#00B0F0]/10 group-hover:text-[#00B0F0] transition-colors">
                        <GraduationCap size={20} />
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase">
                        <AlertCircle size={12} />
                        <span>Pendiente</span>
                      </div>
                    </div>
                    
                    <h5 className="text-xs font-black text-[#001E50] leading-tight mb-4 line-clamp-2 min-h-[2rem]">
                      {item.curso}
                    </h5>

                    <div className="space-y-2 pt-4 border-t border-slate-50">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                        <User size={12} className="text-slate-400" />
                        <span className="truncate">{item.nombre}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                        <MapPin size={12} className="text-slate-400" />
                        <span>{item.unidad}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                        <Clock size={12} className="text-slate-400" />
                        <span>{item.claseFecha || 'Sin Fecha'} {item.claseHora}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RRHHCalendarView;
