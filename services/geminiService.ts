import { GoogleGenAI } from "@google/genai";
import { AutoRecord } from '../types';
import { GEMINI_MODEL } from '../constants';

export const analyzeDataWithGemini = async (apiKey: string, data: AutoRecord[], query?: string): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  // Calculate quick stats
  const totalPPT = data.reduce((sum, item) => sum + item.avance_ppt, 0);
  const totalObjetivo = data.reduce((sum, item) => sum + item.objetivo_mensual, 0);
  const compliance = totalObjetivo > 0 ? (totalPPT / totalObjetivo) * 100 : 0;
  
  const byBranch = data.reduce((acc, curr) => {
    acc[curr.sucursal] = (acc[curr.sucursal] || 0) + curr.avance_ppt;
    return acc;
  }, {} as Record<string, number>);

  const contextData = `
    Resumen de Autosol Dashboard:
    - Total Avance PPT: ${totalPPT.toFixed(2)}
    - Objetivo Total: ${totalObjetivo.toFixed(2)}
    - Cumplimiento Global: ${compliance.toFixed(1)}%
    - Desglose por Sucursal: ${JSON.stringify(byBranch)}
    - Muestra de datos (JSON): ${JSON.stringify(data.slice(0, 5))}
  `;

  const prompt = query 
    ? `Contexto: ${contextData}\n\nPregunta del usuario: ${query}\n\nResponde como un gerente de taller automotriz.`
    : `Contexto: ${contextData}\n\nActúa como un gerente regional de Volkswagen. Dame 3 observaciones críticas sobre el rendimiento de las sucursales (PPT y Servicios) y una recomendación estratégica breve.`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error al conectar con Gemini AI. Verifica tu API Key.";
  }
};