
import React, { useState } from 'react';
import { Icons } from './Icon';
import { MONTHS } from '../constants';
import { ReportTemplate, ReportModuleConfig } from '../types';

interface ReportConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (config: { location: 'JUJUY' | 'SALTA', month: string | null, template: ReportTemplate }) => void;
    initialLocation: 'JUJUY' | 'SALTA';
    template: ReportTemplate;
    onUpdateTemplate: (template: ReportTemplate) => void;
}

const ReportConfigModal: React.FC<ReportConfigModalProps> = ({ 
    isOpen, onClose, onGenerate, initialLocation, template, onUpdateTemplate 
}) => {
    const [location, setLocation] = useState<'JUJUY' | 'SALTA'>(initialLocation);
    const [month, setMonth] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    if (!isOpen) return null;

    const updateModule = (section: 'ventas' | 'postventa', moduleId: string, updates: Partial<ReportModuleConfig>) => {
        const newTemplate = { ...template };
        newTemplate[section].modules = newTemplate[section].modules.map(m => 
            m.id === moduleId ? { ...m, ...updates } : m
        );
        onUpdateTemplate(newTemplate);
    };

    const toggleSection = (section: 'ventas' | 'postventa') => {
        const newTemplate = { ...template };
        newTemplate[section].enabled = !newTemplate[section].enabled;
        onUpdateTemplate(newTemplate);
    };

    return (
        <div className="fixed inset-0 bg-[#001E50]/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-300 max-h-[90vh] flex flex-col border border-white/20">
                <div className="bg-[#001E50] p-10 text-white relative shrink-0 overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#00B0F0] rounded-full -mr-32 -mt-32 opacity-10 blur-3xl"></div>
                    
                    <button onClick={onClose} className="absolute top-8 right-8 text-white/40 hover:text-white transition-colors z-10">
                        <Icons.Close className="w-6 h-6" />
                    </button>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                                <Icons.FileText className="w-6 h-6 text-[#001E50]" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00B0F0]">Gestión Integral</span>
                                <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Reporte de Calidad</h2>
                            </div>
                        </div>
                        <p className="text-white/40 text-sm font-medium max-w-xs">Configure los parámetros para generar el informe gerencial de desempeño.</p>
                    </div>
                </div>

                <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar flex-1">
                    {/* Main Configuration */}
                    <div className="grid grid-cols-1 gap-10">
                        {/* Location Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Icons.MapPin className="w-4 h-4 text-[#00B0F0]" />
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Sucursal</label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {(['JUJUY', 'SALTA'] as const).map(loc => (
                                    <button
                                        key={loc}
                                        onClick={() => setLocation(loc)}
                                        className={`group relative py-5 px-6 rounded-2xl font-black text-sm transition-all border-2 overflow-hidden ${
                                            location === loc 
                                            ? 'bg-[#001E50] border-[#001E50] text-white shadow-2xl shadow-[#001E50]/20' 
                                            : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                                        }`}
                                    >
                                        <span className="relative z-10">{loc}</span>
                                        {location === loc && (
                                            <div className="absolute bottom-0 left-0 w-full h-1 bg-[#00B0F0]"></div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Month Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Icons.Calendar className="w-4 h-4 text-[#00B0F0]" />
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Periodo del Informe</label>
                            </div>
                            <div className="relative">
                                <select 
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 font-black text-slate-700 outline-none focus:border-[#00B0F0] transition-all appearance-none cursor-pointer"
                                    value={month || ''}
                                    onChange={(e) => setMonth(e.target.value || null)}
                                >
                                    <option value="">REPORTE ANUAL 2025</option>
                                    {MONTHS.map(m => (
                                        <option key={m} value={m}>{m.toUpperCase()}</option>
                                    ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-300">
                                    <Icons.ChevronDown className="w-5 h-5" />
                                </div>
                            </div>
                        </div>
                    </div>

                        {/* Advanced Toggle */}
                    <div className="pt-6 border-t border-slate-100 space-y-6">
                        {/* Global Comments / Conclusions */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Icons.MessageSquare className="w-4 h-4 text-[#00B0F0]" />
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Conclusiones y Próximos Pasos</label>
                            </div>
                            <textarea 
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-medium text-slate-700 outline-none focus:border-[#00B0F0] transition-all resize-none h-32 text-sm"
                                placeholder="Escriba aquí las conclusiones generales del reporte..."
                                value={template.globalComments || ''}
                                onChange={(e) => onUpdateTemplate({ ...template, globalComments: e.target.value })}
                            />
                        </div>

                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-[10px] font-black text-[#00B0F0] uppercase tracking-[0.2em] hover:text-[#001E50] transition-colors"
                        >
                            <Icons.Settings className={`w-4 h-4 transition-transform duration-500 ${showAdvanced ? 'rotate-180' : ''}`} />
                            {showAdvanced ? 'Cerrar Configuración de Estructura' : 'Personalizar Estructura del Reporte'}
                        </button>

                        {showAdvanced && (
                            <div className="mt-8 space-y-6 animate-in slide-in-from-top-4 duration-300">
                                {/* Ventas Section */}
                                <div className={`rounded-2xl border-2 p-4 transition-all ${template.ventas.enabled ? 'border-orange-100 bg-orange-50/30' : 'border-slate-100 bg-slate-50/50 opacity-60'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <Icons.BarChart className={`w-5 h-5 ${template.ventas.enabled ? 'text-orange-500' : 'text-slate-400'}`} />
                                            <span className="font-black text-xs uppercase tracking-tight text-[#001E50]">Calidad Ventas</span>
                                        </div>
                                        <button 
                                            onClick={() => toggleSection('ventas')}
                                            className={`w-10 h-5 rounded-full relative transition-all ${template.ventas.enabled ? 'bg-orange-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${template.ventas.enabled ? 'right-1' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                    {template.ventas.enabled && (
                                        <div className="space-y-3">
                                            {template.ventas.modules.map(mod => (
                                                <div key={mod.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-orange-100">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={mod.enabled} 
                                                        onChange={(e) => updateModule('ventas', mod.id, { enabled: e.target.checked })}
                                                        className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase flex-1">{mod.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Postventa Section */}
                                <div className={`rounded-2xl border-2 p-4 transition-all ${template.postventa.enabled ? 'border-blue-100 bg-blue-50/30' : 'border-slate-100 bg-slate-50/50 opacity-60'}`}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <Icons.Wrench className={`w-5 h-5 ${template.postventa.enabled ? 'text-blue-600' : 'text-slate-400'}`} />
                                            <span className="font-black text-xs uppercase tracking-tight text-[#001E50]">Calidad Postventa</span>
                                        </div>
                                        <button 
                                            onClick={() => toggleSection('postventa')}
                                            className={`w-10 h-5 rounded-full relative transition-all ${template.postventa.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${template.postventa.enabled ? 'right-1' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                    {template.postventa.enabled && (
                                        <div className="space-y-3">
                                            {template.postventa.modules.map(mod => (
                                                <div key={mod.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-blue-100">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={mod.enabled} 
                                                        onChange={(e) => updateModule('postventa', mod.id, { enabled: e.target.checked })}
                                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase flex-1">{mod.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-10 bg-slate-50 border-t border-slate-100 shrink-0">
                    <button
                        onClick={() => onGenerate({ location, month, template })}
                        className="w-full bg-[#00B0F0] text-[#001E50] py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-[#00B0F0]/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4"
                    >
                        <Icons.Printer className="w-6 h-6" />
                        Generar Reporte PDF
                    </button>
                    <p className="text-[9px] text-slate-400 text-center mt-6 font-bold uppercase tracking-[0.4em]">Volkswagen Autosol • Sistema de Gestión de Calidad</p>
                </div>
            </div>
        </div>
    );
};

export default ReportConfigModal;
