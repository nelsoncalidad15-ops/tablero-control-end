
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Icons } from './Icon';
import { GoogleGenAI } from "@google/genai";
import Markdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatBotProps {
  apiKey?: string;
  context?: string;
}

const ChatBot: React.FC<ChatBotProps> = ({ apiKey, context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: '¡Hola! Soy el asistente inteligente de Autosol. ¿En qué puedo ayudarte hoy con los reportes o datos del dashboard?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const finalApiKey = apiKey || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : '');
      const ai = new GoogleGenAI({ apiKey: finalApiKey || '' });
      const model = "gemini-3-flash-preview";
      
      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: `Eres el asistente inteligente de Autosol (Grupo Cenoa). 
          Tu objetivo es ayudar a los usuarios a entender los datos de los dashboards de Calidad, Postventa y Ventas.
          Sé profesional, conciso y amable. 
          Si no tienes datos específicos, explica cómo navegar por el sistema para encontrarlos.
          
          CONTEXTO ACTUAL DEL DASHBOARD:
          ${context || 'No hay contexto específico proporcionado.'}

          El sistema cuenta con áreas de:
          - Calidad (Ventas, Postventa, PCGC, Refuerzo Jujuy/Salta)
          - Postventa (Control Operativo, KPIs, Facturación)
          - Ventas (Encuestas, Reclamos, CEM OS)
          Responde siempre en español.`,
        },
      });

      const response = await chat.sendMessage({ message: userMessage });
      const aiText = response.text || 'Lo siento, no pude procesar tu solicitud.';
      
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      console.error("ChatBot Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Hubo un error al conectar con el asistente. Por favor, verifica tu conexión o API Key.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100] font-sans print:hidden">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-20 right-0 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-10rem)] bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-slate-950 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Icons.Brain className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest italic">Autosol AI</h3>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">En Línea</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/10' 
                      : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'
                  }`}>
                    <div className="markdown-body">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 p-4 rounded-3xl rounded-tl-none border border-slate-100 flex gap-2">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">
              <div className="relative flex items-center">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Escribe tu pregunta..."
                  className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 p-3 bg-slate-950 text-white rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 disabled:hover:bg-slate-950"
                >
                  <Icons.TrendingUp className="w-4 h-4 rotate-90" />
                </button>
              </div>
              <p className="text-[9px] text-center text-slate-400 mt-4 font-black uppercase tracking-widest">
                Powered by Gemini AI • Autosol Intelligence
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-500 ${
          isOpen ? 'bg-slate-950 text-white rotate-90' : 'bg-blue-600 text-white'
        }`}
      >
        {isOpen ? <Icons.X className="w-8 h-8" /> : <Icons.MessageSquare className="w-8 h-8" />}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-slate-50 rounded-full"></span>
        )}
      </motion.button>
    </div>
  );
};

export default ChatBot;
