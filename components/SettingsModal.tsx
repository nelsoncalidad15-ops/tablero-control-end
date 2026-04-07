import React, { useState, useEffect } from 'react';
import { AppConfig, AreaType } from '../types';
import { AREAS } from '../constants';
import { Icons } from './Icon';
import { buildApiUrl, resolveApiBase } from '../services/apiConfig';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Config State
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);
  const [activeTab, setActiveTab] = useState<'urls' | 'structure' | 'security'>('urls');
  const [sheetUrls, setSheetUrls] = useState<Record<string, string>>({
      postventa: config.sheetUrls?.postventa || '',
      rrhh: config.sheetUrls?.rrhh || '',
      hr_relatorio: config.sheetUrls?.hr_relatorio || '',
      calidad: config.sheetUrls?.calidad || '',
      ventas: config.sheetUrls?.ventas || '',
      detailed_quality: config.sheetUrls?.detailed_quality || '',
      detailed_quality_salta: config.sheetUrls?.detailed_quality_salta || '',
      postventa_kpis: config.sheetUrls?.postventa_kpis || '',
      postventa_billing: config.sheetUrls?.postventa_billing || '',
      pcgc: config.sheetUrls?.pcgc || '',
      cem_os: config.sheetUrls?.cem_os || '',
      cem_os_salta: config.sheetUrls?.cem_os_salta || '',
      sales_quality: config.sheetUrls?.sales_quality || '',
      sales_claims: config.sheetUrls?.sales_claims || '',
      internal_postventa: config.sheetUrls?.internal_postventa || '',
      action_plan: config.sheetUrls?.action_plan || '',
      action_plan_sales: config.sheetUrls?.action_plan_sales || '',
      action_plan_form: config.sheetUrls?.action_plan_form || ''
  });

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
        setIsAuthenticated(false);
        setPasswordInput('');
        setErrorMsg('');
        setLocalConfig(config);
        setSheetUrls({
            postventa: config.sheetUrls?.postventa || '',
            rrhh: config.sheetUrls?.rrhh || '',
            hr_relatorio: config.sheetUrls?.hr_relatorio || '',
            calidad: config.sheetUrls?.calidad || '',
            ventas: config.sheetUrls?.ventas || '',
            detailed_quality: config.sheetUrls?.detailed_quality || '',
            detailed_quality_salta: config.sheetUrls?.detailed_quality_salta || '',
            postventa_kpis: config.sheetUrls?.postventa_kpis || '',
            postventa_billing: config.sheetUrls?.postventa_billing || '',
            pcgc: config.sheetUrls?.pcgc || '',
            cem_os: config.sheetUrls?.cem_os || '',
            cem_os_salta: config.sheetUrls?.cem_os_salta || '',
            sales_quality: config.sheetUrls?.sales_quality || '',
            sales_claims: config.sheetUrls?.sales_claims || '',
            internal_postventa: config.sheetUrls?.internal_postventa || '',
            action_plan: config.sheetUrls?.action_plan || '',
            action_plan_sales: config.sheetUrls?.action_plan_sales || '',
            action_plan_form: config.sheetUrls?.action_plan_form || ''
        });
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // HARDCODED PASSWORD for simplicity. 
    // In a real full-stack app, this would validate against a server.
    if (passwordInput === 'autosol2026') {
        setIsAuthenticated(true);
        setErrorMsg('');
    } else {
        setErrorMsg('Contraseña incorrecta');
    }
  };

  const handleUrlChange = (areaId: string, val: string) => {
      setSheetUrls(prev => ({ ...prev, [areaId]: val }));
  };

  const handleSave = () => {
      onSave({
          ...localConfig,
          sheetUrls: sheetUrls as any
      });
      onClose();
  };

  const downloadCSV = (name: string, columns: string[]) => {
    const csvContent = columns.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Plantilla_${name.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const DATA_STRUCTURES = [
    {
        id: 'postventa',
        name: 'Postventa (Control Operativo)',
        description: 'Datos de PPT y servicios diarios para el dashboard de Postventa.',
        columns: ['Fecha', 'Mes', 'Año', 'Sucursal', 'PPT Diarios', 'Avance PPT', 'Servicios Diarios', 'Avance Servis', 'Objetivo Mensual', 'Días Laborables']
    },
    {
        id: 'calidad',
        name: 'Calidad (Gestión Reclamos Postventa)',
        description: 'Registro de reclamos de taller para el dashboard de Calidad Postventa.',
        columns: ['Sucursal', 'Mes', 'Año', 'Sector Resp.', 'Motivos de Reclamo', 'Cliente', 'Reclamo / Observación', 'Responsable de Solución', 'Asesor asignado', 'Estado de Reclamo', 'Orden', 'Reclamo Resuelto? SI/ NO', 'Observacion de resolucion']
    },
    {
        id: 'sales_quality',
        name: 'Calidad Ventas (Encuestas Internas)',
        description: 'Encuestas internas realizadas por el equipo de calidad de ventas.',
        columns: ['Mes', 'Año', 'Sucursal', 'Vendedor', 'Modelo', 'Cliente', 'VIN', 'Estado', 'Tipo de Venta', 'Comentarios', 'NPS', 'Fecha Entrega', 'Fecha 1º Llamado', 'Fecha 2º Llamado', 'Fecha 3º Llamado', 'Fecha Contacto Efectivo', 'Fecha Envío WPP', 'Fecha Respuesta WPP', 'CEM Asesoramiento', 'CEM Organización', 'CEM Trato', 'CEM General (OS)', 'Prueba Manejo', 'Ofrecimiento Financiación', 'Toma Usados', 'Contacto Entrega', 'Explicación Trámites', 'Estado Vehículo', 'Plazo Entrega', 'Explicación Entrega', 'Ofrecimiento Seguro', 'App Mi VW']
    },
    {
        id: 'sales_claims',
        name: 'Calidad Ventas (Gestión Reclamos)',
        description: 'Seguimiento de reclamos y quejas del área de ventas.',
        columns: ['Nro de R', 'Número de VIN', 'Receptor', 'Fecha Reclamo/ Queja', 'Fecha de finalización', 'Mes de entrega', 'Tipo de Venta', 'Cliente', 'Sucursal', 'Reclamo / Observación', 'Sector Resp.', 'Responsable del Tratamiento', 'Acción Preventiva', 'Acción efectiva (1: si - 0: no)', 'Evidencia de efectividad', 'Estado de Reclamo', 'Motivos de Reclamo']
    },
    {
        id: 'cem_os',
        name: 'CEM OS (Jujuy y Salta)',
        description: 'Resultados oficiales de encuestas CEM enviadas por Volkswagen.',
        columns: ['Mes', 'Zona', 'Código', 'Canal Ventas', 'Chasis', 'Entrega Final', 'Entrega Reportada', 'Vendedor', 'Nro Cliente', 'Cliente Nombre', 'Cliente Apellido', 'Cliente DNI', 'Cliente Calle', 'Cliente Ciudad', 'Cliente CP', 'Cliente Estado', 'Cliente Celular', 'Cliente Tel Casa', 'Cliente Tel Oficina', 'Cliente Email', 'Fecha Dominio', 'Dominio', 'Mail Encuesta Interna', 'CEM Score', 'Encuesta Interna Score', 'Encuesta Temprana Score', 'Estado Encuesta Interna', 'Fecha Link Llega', 'Fecha Link Caduca', 'Estado Unidad', 'Contactado', 'Gestionado', 'Comentario Interna', 'Comentario CEM']
    },
    {
        id: 'internal_postventa',
        name: 'Encuesta Interna Postventa (LVS)',
        description: 'Encuestas internas de satisfacción de servicio postventa.',
        columns: ['or sucur', 'tecnicos', 'op nombre', 'or operario', 'or codigo', 'or fecini', 'or fecfin', 'or nombre', 'ser nombre', 'fv dominio', 'cli telefo', 'cli email', 'au nombre', 'mar nombre', 'fv chasis', 'created at', 'estadonombre', 'nombre sucursal', 'servicio prestado', 'trato personal', 'organizacion', 'trabajo del taller', 'lavado', 'observacion servicio prestado', 'observacion trato personal', 'observacion organizacion', 'observacion trabajo del taller', 'observacion lavado', 'tipo contacto', 'observacion tipo contacto', 'observaciones', 'observacion observaciones']
    },
    {
        id: 'detailed_quality',
        name: 'Refuerzo Postventa (Jujuy/Salta)',
        description: 'Análisis detallado de encuestas LVS oficiales.',
        columns: ['Mes', 'Cod ID', 'Fecha Servicio', 'VIN', 'Modelo', 'Cliente', 'Orden', 'Asesor', 'Q1 Score', 'Q1 Comment', 'Q2 Score', 'Q2 Comment', 'Q3 Score', 'Q3 Comment', 'Q4 Score', 'Q4 Comment', 'Q6 Score', 'Q7 Score', 'Q8 Val', 'Comentario Cliente', 'Estado Cliente', 'Categorización']
    },
    {
        id: 'postventa_kpis',
        name: 'Gestión KPIs Postventa',
        description: 'Indicadores clave de rendimiento para el área de Postventa.',
        columns: ['Sucursal', 'Mes', 'LVS', 'Email Válidos', 'Tasa Respuesta', 'DAC', 'Contrato Mantenimiento', 'Reporte Técnico', 'Reporte Garantía', 'Ampliación Trabajo', 'PPT Diario', 'OUDI Servicios', 'Costos Controlables', 'Costo Sueldos', 'Stock Muerto', 'Meses Stock', 'Cotización Seguros', 'UODI Repuestos', 'UODI Posventa', 'Incentivo Calidad', 'Plan Incentivo Posventa', 'Plan Incentivo Repuestos', 'UOPS Total']
    },
    {
        id: 'postventa_billing',
        name: 'Avance de Facturación',
        description: 'Seguimiento de objetivos de facturación mensual.',
        columns: ['Nro Mes', 'Mes', 'Sucursal', 'Area', 'Objetivo Mensual', 'Avance Fecha', 'Cumplimiento Fecha %', 'Cumplimiento Cierre %', 'Objetivo Diario', 'Promedio Diario', 'Desvio Fecha', 'Dif Dias Operacion', 'Año']
    },
    {
        id: 'pcgc',
        name: 'PCGC Checklist',
        description: 'Checklist de auditoría del Programa de Calidad de Gestión.',
        columns: ['Modulo', 'Seccion', 'Subseccion', 'Sector', 'Requerimiento', 'Observaciones', 'Metodo', 'Criticidad']
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-slate-50 p-4 border-b flex justify-between items-center flex-shrink-0">
          <h2 className="font-semibold text-lg text-slate-800 flex items-center gap-2">
            <Icons.Settings className="w-5 h-5 text-slate-500" />
            Configuración del Portal
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <Icons.Close className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          
          {!isAuthenticated ? (
            // --- LOGIN VIEW ---
            <div className="flex flex-col items-center justify-center py-8">
                <div className="bg-slate-100 p-4 rounded-full mb-4">
                    <Icons.Wrench className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Acceso Administrativo</h3>
                <p className="text-slate-500 text-sm mb-6 text-center max-w-xs">
                    Solo el personal autorizado puede modificar las fuentes de datos y configuraciones.
                </p>
                
                <form onSubmit={handleLogin} className="w-full max-w-xs">
                    <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Contraseña de administrador"
                        className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary p-3 border mb-3 text-center"
                        autoFocus
                    />
                    {errorMsg && <p className="text-red-500 text-sm mb-3 text-center">{errorMsg}</p>}
                    <button 
                        type="submit"
                        className="w-full py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        Ingresar
                    </button>
                </form>
            </div>
          ) : (
            // --- SETTINGS VIEW ---
            <>
                <div className="flex border-b border-slate-200 mb-6">
                    <button 
                        onClick={() => setActiveTab('urls')}
                        className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'urls' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Fuentes de Datos
                    </button>
                    <button 
                        onClick={() => setActiveTab('structure')}
                        className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'structure' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Estructura de Datos
                    </button>
                    <button 
                        onClick={() => setActiveTab('security')}
                        className={`px-4 py-2 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === 'security' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                        Seguridad
                    </button>
                </div>

                {activeTab === 'urls' ? (
                    <>
                        <div className="p-4 bg-blue-50 text-blue-800 text-xs rounded-xl border border-blue-100 flex gap-3 mb-6">
                            <Icons.Help className="w-5 h-5 flex-shrink-0 text-blue-500" />
                            <div className="space-y-2">
                                <p className="font-bold text-sm">¿Cómo obtener los enlaces CSV?</p>
                                <ol className="list-decimal list-inside space-y-1 opacity-90">
                                    <li>Abre tu Google Sheet.</li>
                                    <li>Ve a <b>Archivo</b> &gt; <b>Compartir</b> &gt; <b>Publicar en la web</b>.</li>
                                    <li>Selecciona la <b>Hoja específica</b> (no todo el documento).</li>
                                    <li>Cambia "Página web" por <b>Valores separados por comas (.csv)</b>.</li>
                                    <li>Copia el enlace generado y pégalo aquí abajo.</li>
                                </ol>
                            </div>
                        </div>

                        {/* Dynamic Sheet URL Sections */}
                        <div className="space-y-8">
                            <section>
                                <h3 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                                    Dashboards de Ventas
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CEM VENTAS ENCUESTAS INTERNAS (sales_quality)</label>
                                            <input
                                                type="text"
                                                value={sheetUrls.sales_quality || ''}
                                                onChange={(e) => handleUrlChange('sales_quality', e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CEM VENTAS RECLAMOS INTERNO (sales_claims)</label>
                                            <input
                                                type="text"
                                                value={sheetUrls.sales_claims || ''}
                                                onChange={(e) => handleUrlChange('sales_claims', e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                                placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CEM VENTAS OS (Jujuy)</label>
                                                <input
                                                    type="text"
                                                    value={sheetUrls.cem_os || ''}
                                                    onChange={(e) => handleUrlChange('cem_os', e.target.value)}
                                                    className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">CEM VENTAS OS (Salta)</label>
                                                <input
                                                    type="text"
                                                    value={sheetUrls.cem_os_salta || ''}
                                                    onChange={(e) => handleUrlChange('cem_os_salta', e.target.value)}
                                                    className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                                    Dashboards de RRHH
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Calificaciones y Talentos (RRHH)</label>
                                            <input
                                                type="text"
                                                value={sheetUrls.rrhh || ''}
                                                onChange={(e) => handleUrlChange('rrhh', e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Relatorio de Cursos (RRHH)</label>
                                            <input
                                                type="text"
                                                value={sheetUrls.hr_relatorio || ''}
                                                onChange={(e) => handleUrlChange('hr_relatorio', e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                    Dashboards de Postventa
                                </h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Encuesta Interna LVS (Postventa)</label>
                                            <input
                                                type="text"
                                                value={sheetUrls.internal_postventa || ''}
                                                onChange={(e) => handleUrlChange('internal_postventa', e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">RECLAMOS POSTVENTA INTERNO (calidad)</label>
                                            <input
                                                type="text"
                                                value={sheetUrls.calidad || ''}
                                                onChange={(e) => handleUrlChange('calidad', e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">REFUERZO LVS (Jujuy)</label>
                                                <input
                                                    type="text"
                                                    value={sheetUrls.detailed_quality || ''}
                                                    onChange={(e) => handleUrlChange('detailed_quality', e.target.value)}
                                                    className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">REFUERZO LVS (Salta)</label>
                                                <input
                                                    type="text"
                                                    value={sheetUrls.detailed_quality_salta || ''}
                                                    onChange={(e) => handleUrlChange('detailed_quality_salta', e.target.value)}
                                                    className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">GESTIÓN DE KPIS (postventa_kpis)</label>
                                                <input
                                                    type="text"
                                                    value={sheetUrls.postventa_kpis || ''}
                                                    onChange={(e) => handleUrlChange('postventa_kpis', e.target.value)}
                                                    className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AVANCE PPT (postventa)</label>
                                                <input
                                                    type="text"
                                                    value={sheetUrls.postventa || ''}
                                                    onChange={(e) => handleUrlChange('postventa', e.target.value)}
                                                    className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                                    Otros Módulos
                                </h3>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PCGC Checklist</label>
                                            <input
                                                type="text"
                                                value={sheetUrls.pcgc || ''}
                                                onChange={(e) => handleUrlChange('pcgc', e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AVANCE DE FACTURACIÓN (postventa_billing)</label>
                                            <input
                                                type="text"
                                                value={sheetUrls.postventa_billing || ''}
                                                onChange={(e) => handleUrlChange('postventa_billing', e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PLAN DE ACCIÓN INTEGRAL (action_plan)</label>
                                            <input
                                                type="text"
                                                value={sheetUrls.action_plan || ''}
                                                onChange={(e) => handleUrlChange('action_plan', e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan de Acción Ventas (Sheet)</label>
                                            <input
                                                type="text"
                                                value={sheetUrls.action_plan_sales || ''}
                                                onChange={(e) => handleUrlChange('action_plan_sales', e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Formulario de Carga (Google Form)</label>
                                            <input
                                                type="text"
                                                value={sheetUrls.action_plan_form || ''}
                                                onChange={(e) => handleUrlChange('action_plan_form', e.target.value)}
                                                className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-2 border text-[10px] font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Gemini API Section */}
                        <div className="pt-8 border-t border-slate-100 mt-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">
                                    Backend API URL (VITE_API_URL)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={resolveApiBase()}
                                        disabled
                                        className="flex-1 bg-slate-100 border-slate-200 rounded-xl shadow-sm p-3 border font-mono text-[10px] text-slate-500"
                                    />
                                    <button 
                                        onClick={() => {
                                            const debugUrl = buildApiUrl('/api/health');
                                            window.open(debugUrl, '_blank');
                                        }}
                                        className="px-4 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all"
                                    >
                                        Verificar
                                    </button>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-1 italic">
                                    Esta URL se toma desde `VITE_API_URL`. Si queda vacÃ­a, la app usarÃ¡ el mismo origen donde fue publicada.
                                </p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">
                                    Gemini AI Intelligence Key
                                </label>
                                <input
                                    type="password"
                                    value={localConfig.geminiApiKey}
                                    onChange={(e) => setLocalConfig(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                                    placeholder="Pegar API Key aquí..."
                                    className="w-full bg-slate-50 border-slate-200 rounded-xl shadow-sm p-3 border font-mono text-xs"
                                />
                            </div>
                        </div>
                    </>
                ) : activeTab === 'structure' ? (
                    <div className="space-y-6">
                        <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-100 flex gap-3">
                            <Icons.AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500" />
                            <div>
                                <p className="font-bold text-sm mb-1">Guía de Estructura de Datos</p>
                                <p className="opacity-90">Para que el sistema funcione, tus hojas de cálculo deben tener exactamente estas columnas. Puedes descargar una plantilla para cada módulo.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {DATA_STRUCTURES.map((struct, i) => (
                                <div key={i} className="bg-slate-50 border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                                        <div>
                                            <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest">{struct.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-medium mt-0.5">{struct.description}</p>
                                        </div>
                                        <button 
                                            onClick={() => downloadCSV(struct.name, struct.columns)}
                                            className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                                        >
                                            <Icons.Download className="w-3 h-3" />
                                            Plantilla
                                        </button>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex flex-wrap gap-2">
                                            {struct.columns.map((col, j) => (
                                                <span key={j} className="px-3 py-1.5 bg-white text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 shadow-sm">
                                                    {col}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="bg-slate-50 border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
                                    <div>
                                        <h4 className="font-black text-slate-900 text-xs uppercase tracking-widest">Plan de Acción (Estructura Sheet)</h4>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Estructura compleja con encabezados en fila 6 y 7.</p>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <p className="text-[10px] text-slate-500 mb-4">El sistema espera que los datos comiencen en la fila 8. Las columnas principales son:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {['Nº', 'Mes', 'Fecha de alta', 'PROVINCIA', 'Carácter', 'Sector', 'Origen', 'Norma', 'Requisito', 'Nombre KPI', 'Objetivo KPI (Cuant/Cual)', 'Situación Actual (Cuant/Cual)', 'Estado', 'Causa Raíz', 'Acción Inmediata', 'Acción Correctiva', 'Responsable'].map((col, j) => (
                                            <span key={j} className="px-3 py-1.5 bg-white text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 shadow-sm">
                                                {col}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'security' ? (
                    <div className="space-y-8">
                        <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Protección Global</h4>
                            
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Solicitar Contraseña al Inicio</p>
                                        <p className="text-[10px] text-slate-500">Si está activo, los usuarios deberán ingresar una clave para ver la web.</p>
                                    </div>
                                    <button 
                                        onClick={() => setLocalConfig(prev => ({ ...prev, isPasswordProtected: !prev.isPasswordProtected }))}
                                        className={`w-12 h-6 rounded-full transition-all relative ${localConfig.isPasswordProtected ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localConfig.isPasswordProtected ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                {localConfig.isPasswordProtected && (
                                    <div className="space-y-2 animate-fade-in">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Contraseña Global</label>
                                        <input
                                            type="text"
                                            value={localConfig.globalPassword || ''}
                                            onChange={(e) => setLocalConfig(prev => ({ ...prev, globalPassword: e.target.value }))}
                                            placeholder="Ej: autosol2025"
                                            className="w-full bg-white border-slate-200 rounded-xl shadow-sm p-3 border font-mono text-xs"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-indigo-50 text-indigo-800 text-xs rounded-xl border border-indigo-100 flex gap-3">
                            <Icons.ShieldCheck className="w-5 h-5 flex-shrink-0 text-indigo-500" />
                            <p className="opacity-90">Esta configuración afecta a todos los usuarios que accedan a la URL de la aplicación.</p>
                        </div>
                    </div>
                ) : null}
            </>
          )}

        </div>

        {/* Footer */}
        {isAuthenticated && (
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 flex-shrink-0">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors"
            >
                Cancelar
            </button>
            <button 
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
                Guardar Cambios
            </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
