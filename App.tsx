import React, { useState } from 'react';
import Portal from './components/Portal';
import Dashboard from './components/Dashboard';
import QualityDashboard from './components/QualityDashboard';
import SettingsModal from './components/SettingsModal';
import { Icons } from './components/Icon';
import { AppConfig, AreaConfig } from './types';
import { DEFAULT_CONFIG } from './constants';

function App() {
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('autosolPortalConfig');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.sheetUrl && !parsed.sheetUrls) {
            return {
                ...DEFAULT_CONFIG,
                sheetUrls: {
                    ...DEFAULT_CONFIG.sheetUrls,
                    postventa: parsed.sheetUrl
                },
                geminiApiKey: parsed.geminiApiKey
            };
        }
        return parsed;
    }
    return DEFAULT_CONFIG;
  });

  const [currentView, setCurrentView] = useState<'portal' | 'dashboard' | 'quality_selection'>('portal');
  const [selectedArea, setSelectedArea] = useState<AreaConfig | null>(null);
  
  // For Quality Sub-selection
  const [qualitySubArea, setQualitySubArea] = useState<'ventas' | 'postventa' | null>(null);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setConfig(newConfig);
    localStorage.setItem('autosolPortalConfig', JSON.stringify(newConfig));
  };

  const handleSelectArea = (area: AreaConfig) => {
    setSelectedArea(area);
    if (area.id === 'calidad') {
        setCurrentView('quality_selection');
    } else {
        setCurrentView('dashboard');
    }
  };

  const handleBackToPortal = () => {
    setCurrentView('portal');
    setSelectedArea(null);
    setQualitySubArea(null);
  };

  // Logic to render the correct component
  const renderContent = () => {
    if (currentView === 'portal') {
        return <Portal onSelectArea={handleSelectArea} onOpenSettings={() => setIsSettingsOpen(true)} />;
    }

    if (currentView === 'quality_selection') {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                 <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full text-center">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Área de Calidad</h2>
                    <p className="text-slate-500 mb-8">Seleccione el departamento para visualizar indicadores.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            disabled
                            className="p-6 border-2 border-slate-100 rounded-xl hover:border-orange-500 hover:bg-orange-50 transition-all group opacity-50 cursor-not-allowed"
                        >
                            <div className="bg-orange-100 text-orange-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icons.BarChart className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-700 group-hover:text-orange-700">Calidad Ventas</h3>
                            <span className="text-xs text-slate-400 block mt-2">(Próximamente)</span>
                        </button>

                        <button 
                            onClick={() => {
                                setQualitySubArea('postventa');
                                setCurrentView('dashboard'); // Will be caught by next condition
                            }}
                            className="p-6 border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                        >
                            <div className="bg-blue-100 text-blue-600 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Icons.Wrench className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-slate-700 group-hover:text-blue-700">Calidad Postventa</h3>
                        </button>
                    </div>

                    <button onClick={handleBackToPortal} className="mt-8 text-slate-400 hover:text-slate-600 text-sm">
                        ← Volver al Portal
                    </button>
                 </div>
            </div>
        );
    }

    if (currentView === 'dashboard' && selectedArea) {
        // Special Routing for Quality Postventa
        if (selectedArea.id === 'calidad' && qualitySubArea === 'postventa') {
            return (
                <QualityDashboard 
                    area={selectedArea}
                    sheetUrl={config.sheetUrls.calidad} // This url is specific for quality
                    onBack={handleBackToPortal}
                />
            );
        }
        
        // Default Dashboard for other areas (Postventa Taller, RRHH, etc)
        return (
            <Dashboard 
                area={selectedArea}
                sheetUrl={config.sheetUrls[selectedArea.id]}
                apiKey={config.geminiApiKey}
                onBack={handleBackToPortal}
                onOpenSettings={() => setIsSettingsOpen(true)}
            />
        );
    }
  };

  return (
    <>
      {renderContent()}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={config} 
        onSave={handleSaveConfig} 
      />
    </>
  );
}

export default App;