/**
 * components/ErrorBoundary.jsx
 * Catches render-time errors and shows a friendly fallback UI.
 */
import { Component } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log to your error tracking service (Sentry, etc.)
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'var(--bg-base)' }}
      >
        <div
          className="glass-heavy rounded-3xl p-8 max-w-md w-full text-center"
          style={{ border: '1px solid var(--border-2)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <AlertTriangle size={28} style={{ color: 'var(--danger)' }} />
          </div>

          <h2
            className="font-display font-bold text-xl mb-2"
            style={{ color: 'var(--text-1)' }}
          >
            Something went wrong
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>
            An unexpected error occurred. The team has been notified.
          </p>

          {import.meta.env.DEV && this.state.error && (
            <pre
              className="text-left text-xs p-4 rounded-xl mb-6 overflow-auto max-h-40"
              style={{ background: 'var(--glass-2)', color: 'var(--accent-rose)', border: '1px solid var(--border-1)' }}
            >
              {this.state.error.message}
            </pre>
          )}

          <button onClick={this.reset} className="btn-primary gap-2">
            <RefreshCw size={15} />
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
