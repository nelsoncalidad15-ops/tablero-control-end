import React, { useState } from 'react';
import { Icons } from './Icon';
import { AutoRecord } from '../types';
import { analyzeDataWithGemini } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface AIPanelProps {
  data: AutoRecord[];
  apiKey: string;
}

const AIPanel: React.FC<AIPanelProps> = ({ data, apiKey }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const handleAnalyze = async (customQuery?: string) => {
    if (!apiKey) return;
    setLoading(true);
    const result = await analyzeDataWithGemini(apiKey, data, customQuery);
    setAnalysis(result);
    setLoading(false);
  };

  if (!apiKey) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-xl border border-indigo-100 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Icons.Sparkles className="text-indigo-600 w-5 h-5" />
          <h3 className="font-semibold text-indigo-900">IA Assistant</h3>
        </div>
        <p className="text-sm text-indigo-700 mb-4">
          Configura tu API Key de Gemini para activar el análisis inteligente de tus datos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg text-white">
          <Icons.Brain className="w-5 h-5" />
        </div>
        <h3 className="font-bold text-slate-800">Gemini Insights</h3>
      </div>

      <div className="flex-1 overflow-y-auto mb-4 min-h-[150px] bg-slate-50 rounded-lg p-4 border border-slate-100 text-sm text-slate-700 prose prose-indigo max-w-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Analizando datos...</p>
          </div>
        ) : analysis ? (
           <ReactMarkdown>{analysis}</ReactMarkdown>
        ) : (
          <div className="text-center text-slate-400 mt-8">
            <p>Haz una pregunta o genera un resumen automático.</p>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej: ¿Cuál es la categoría más rentable?"
            className="flex-1 text-sm border-slate-300 rounded-lg p-2 border focus:ring-2 focus:ring-indigo-500 outline-none"
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !loading) {
                    handleAnalyze(query);
                }
            }}
          />
          <button 
            onClick={() => handleAnalyze(query)}
            disabled={loading}
            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Icons.Sparkles className="w-5 h-5" />
          </button>
        </div>
        
        <button 
          onClick={() => handleAnalyze()}
          disabled={loading}
          className="w-full py-2 text-sm text-indigo-600 font-medium bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
        >
          Generar Resumen Ejecutivo
        </button>
      </div>
    </div>
  );
};

export default AIPanel;