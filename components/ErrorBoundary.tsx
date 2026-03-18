
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Icons } from './Icon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-12 shadow-2xl">
            <div className="w-20 h-20 bg-rose-500/20 rounded-3xl flex items-center justify-center text-rose-500 mx-auto mb-8">
              <Icons.AlertTriangle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Algo salió mal</h2>
            <p className="text-slate-400 font-medium mb-8">
              Se ha producido un error inesperado en la aplicación.
            </p>
            <div className="bg-black/40 rounded-2xl p-4 mb-8 text-left overflow-auto max-h-40">
              <code className="text-rose-400 text-xs font-mono break-all">
                {this.state.error?.message || 'Error desconocido'}
              </code>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3"
            >
              <Icons.Activity className="w-5 h-5" />
              Reiniciar Aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
