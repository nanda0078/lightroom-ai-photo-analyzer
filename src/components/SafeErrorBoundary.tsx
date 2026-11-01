/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface SafeErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface SafeErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SafeErrorBoundary extends Component<SafeErrorBoundaryProps, SafeErrorBoundaryState> {
  constructor(props: SafeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SafeErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[SafeErrorBoundary] Error in [${this.props.fallbackTitle || 'Component'}]:`, error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/90 border border-rose-500/30 text-slate-200 shadow-xl space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-rose-400">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-200">
              {this.props.fallbackTitle || 'Kendala Rendering Komponen'}
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Terjadi kendala saat merender bagian ini. Foto yang sudah diunggah dan data analisis lainnya tetap aman.
          </p>
          {this.state.error?.message && (
            <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300 overflow-x-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs transition-all cursor-pointer shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Coba Tampilkan Kembali</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
