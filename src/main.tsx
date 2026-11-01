import React, { Component, ErrorInfo, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Flame } from 'lucide-react';

// Guarantee that Flame is always defined globally in the browser environment
// to eliminate any ReferenceError ('Flame is not defined')
if (typeof window !== 'undefined') {
  (window as any).Flame = Flame;
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lightroom AI Analyzer Crash:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0b0d12',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            maxWidth: '520px',
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f87171', marginBottom: '12px' }}>
              Terjadi Kendala Tampilan
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6, marginBottom: '20px' }}>
              Aplikasi mendeteksi adanya galat saat memuat modul visual di peramban. Anda dapat memuat ulang halaman untuk menyinkronkan kembali sesi.
            </p>
            {this.state.error?.message && (
              <pre style={{
                textAlign: 'left',
                fontSize: '11px',
                color: '#cbd5e1',
                background: '#090d16',
                padding: '12px',
                borderRadius: '8px',
                overflowX: 'auto',
                marginBottom: '20px',
                border: '1px solid #334155'
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              style={{
                backgroundColor: '#f59e0b',
                color: '#000',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                padding: '10px 24px',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Muat Ulang Halaman (F5)
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
