import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
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
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="glass-panel p-6 rounded-2xl border-health-rose/30 bg-health-rose/5 text-center space-y-3 flex flex-col items-center justify-center min-h-[200px]">
          <AlertCircle className="h-8 w-8 text-health-rose animate-bounce" />
          <h4 className="text-xs uppercase tracking-widest text-health-rose font-bold">Diagnostic Component Error</h4>
          <p className="text-[10px] text-health-textMuted max-w-sm font-light leading-relaxed">
            An error occurred while loading this diagnostics layout block. If this is a developer sandbox, please check your network connection.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1.5 border border-health-rose/30 bg-health-rose/10 text-health-rose text-[9px] uppercase font-bold rounded-lg hover:bg-health-rose/25"
          >
            Retry Section Render
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
