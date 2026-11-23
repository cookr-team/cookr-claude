import React, { ErrorInfo, ReactNode } from "react";

import { tr } from "../lib/tr";
interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  props: Props;
  public state: State = {
    hasError: false,
    error: null,
  };

  constructor(props: Props) {
    super(props);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Uncaught Error boundary]:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-slate-950 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
            <div className="w-16 h-16 bg-red-950/50 border border-red-500/30 rounded-2xl flex items-center justify-center text-red-500 mx-auto">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                {tr("Ocorreu um erro de carregamento")}
              </h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                {tr("A aplicação encontrou um problema ao conectar-se à base de dados ou ao inicializar o estado.")}
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-left font-mono text-xs text-red-400 overflow-x-auto max-h-40">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-medium rounded-xl transition-colors shadow-lg shadow-amber-500/10 cursor-pointer"
            >
              {tr("Reiniciar Aplicação")}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
