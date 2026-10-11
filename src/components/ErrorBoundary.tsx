import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  title?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[HridayaDarpana ErrorBoundary] Uncaught error caught by boundary:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="h-full flex items-center justify-center min-h-[50vh] p-6">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-rose-200 shadow-stitch text-center space-y-4">
            <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {this.props.title || 'Unable to load this page.'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                An unexpected rendering error occurred while loading this section.
              </p>
              {this.state.error?.message && (
                <p className="text-[11px] font-mono text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100 overflow-x-auto text-left mt-2">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center space-x-2 mx-auto transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

