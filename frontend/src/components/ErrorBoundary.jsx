import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './Button.jsx';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6">
          <div className="glass-card max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-xl flex flex-col items-center text-center animate-fadeIn">
            <div className="h-14 w-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-6 animate-pulse">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-display">Something went wrong</h2>
            <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">
              An unexpected error occurred while rendering this view. Stale browser history or mismatched permissions might be the cause.
            </p>
            <div className="w-full bg-slate-50 border border-slate-250 p-4 rounded-2xl text-[11px] font-mono text-left text-slate-600 mt-6 max-h-[120px] overflow-y-auto scrollbar-thin break-all">
              {this.state.error?.toString() || 'Unknown rendering exception'}
            </div>
            <div className="flex gap-3 w-full mt-6">
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.href = '/dashboard';
                }}
                className="flex-1 text-xs font-bold"
              >
                Go to Dashboard
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
