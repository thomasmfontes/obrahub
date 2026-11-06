import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary capturou um erro não tratado:', error, errorInfo);
  }

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-amber-100"
        >
          <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-amber-100">
              <AlertTriangle className="w-8 h-8 stroke-[2.2]" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Ocorreu um imprevisto
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed">
                Não se preocupe, seus dados salvos continuam protegidos. Tente recarregar a página para restabelecer a conexão com o ObraHub.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="bg-slate-50 rounded-xl p-3 text-left border border-slate-200/80 overflow-hidden">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Detalhe técnico
                </p>
                <p className="text-xs font-mono text-slate-700 break-words line-clamp-3">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={this.handleReload}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-semibold text-sm rounded-xl transition flex items-center justify-center space-x-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>Recarregar ObraHub</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
