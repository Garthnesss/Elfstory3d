import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ErrorBoundary: previously a render crash anywhere in the tree produced a
// white screen and the in-progress run (held only in React state until the
// next save) was silently lost. Now the crash shows a recoverable screen;
// zone-transition / autosave / exit saves in localStorage stay loadable.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('ElfStory render crash:', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#090B10',
            color: '#ECE4D4',
            padding: '24px',
            fontFamily: 'Georgia, serif',
          }}
        >
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <h1 style={{ color: '#E5A93B', marginBottom: 12 }}>The lantern guttered out</h1>
            <p style={{ lineHeight: 1.6, marginBottom: 8 }}>
              ElfStory hit an unexpected error and stopped rendering. Your last saved expedition
              (zone transitions and autosaves are kept in this browser) should still be loadable.
            </p>
            <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 20 }}>
              {this.state.error.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                minHeight: 44,
                padding: '10px 24px',
                borderRadius: 6,
                border: 'none',
                background: '#F59E0B',
                color: '#0B0D12',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Reload ElfStory
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
