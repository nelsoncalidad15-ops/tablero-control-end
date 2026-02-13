import React, { useState, useEffect } from 'react';
import { AppConfig, AreaType } from '../types';
import { AREAS } from '../constants';
import { Icons } from './Icon';

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
  const [sheetUrls, setSheetUrls] = useState<Record<AreaType, string>>({
      postventa: config.sheetUrls?.postventa || '',
      rrhh: config.sheetUrls?.rrhh || '',
      calidad: config.sheetUrls?.calidad || '',
      ventas: config.sheetUrls?.ventas || ''
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
            calidad: config.sheetUrls?.calidad || '',
            ventas: config.sheetUrls?.ventas || ''
        });
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // HARDCODED PASSWORD for simplicity. 
    // In a real full-stack app, this would validate against a server.
    if (passwordInput === 'autosol2025') {
        setIsAuthenticated(true);
        setErrorMsg('');
    } else {
        setErrorMsg('Contraseña incorrecta');
    }
  };

  const handleUrlChange = (areaId: AreaType, val: string) => {
      setSheetUrls(prev => ({ ...prev, [areaId]: val }));
  };

  const handleSave = () => {
      onSave({
          ...localConfig,
          sheetUrls: sheetUrls
      });
      onClose();
  };

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
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-100 flex gap-2">
                     <Icons.Help className="w-4 h-4 flex-shrink-0 mt-0.5" />
                     <div>
                        <p className="font-semibold mb-1">Modo Administrador Activo</p>
                        <p>Para cada área, pega el enlace "Publicado en la web" (CSV) de Google Sheet.</p>
                     </div>
                </div>

                {/* Dynamic Sheet URL Sections */}
                <div className="space-y-4">
                    <h3 className="font-medium text-slate-900 border-b pb-2">Fuentes de Datos (Google Sheets CSV)</h3>
                    {AREAS.map(area => (
                        <div key={area.id}>
                            <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                {React.createElement(Icons[area.icon as keyof typeof Icons], { className: "w-4 h-4 text-slate-500" })}
                                {area.name}
                            </label>
                            <input
                            type="text"
                            value={sheetUrls[area.id]}
                            onChange={(e) => handleUrlChange(area.id, e.target.value)}
                            placeholder={`https://docs.google.com/... (CSV para ${area.name})`}
                            className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary p-2 border text-sm font-mono text-slate-600"
                            />
                        </div>
                    ))}
                </div>

                {/* Gemini API Section */}
                <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                    Gemini API Key (Global)
                    </label>
                    <input
                    type="password"
                    value={localConfig.geminiApiKey}
                    onChange={(e) => setLocalConfig(prev => ({ ...prev, geminiApiKey: e.target.value }))}
                    placeholder="Pegar API Key aquí..."
                    className="w-full border-slate-300 rounded-lg shadow-sm focus:ring-primary focus:border-primary p-2 border font-mono"
                    />
                </div>
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