/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Camera, Sliders, KeyRound, Download } from 'lucide-react';
import { ApiStatusInfo } from '../types/analyzer';

interface HeaderProps {
  onOpenApiInfo: () => void;
  onOpenGuide: () => void;
  isAnalyzing: boolean;
  apiStatus?: ApiStatusInfo | null;
}

export const Header: React.FC<HeaderProps> = ({ onOpenApiInfo, onOpenGuide, isAnalyzing, apiStatus }) => {
  const getStatusColor = () => {
    if (isAnalyzing) return 'bg-amber-400 animate-pulse';
    if (!apiStatus) return 'bg-amber-400';
    switch (apiStatus.status) {
      case 'connected':
        return 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
      case 'not_configured':
      case 'quota_exceeded':
        return 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]';
      case 'invalid_key':
      case 'connection_error':
      case 'server_unavailable':
      default:
        return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
    }
  };

  const getStatusLabel = () => {
    if (isAnalyzing) return 'Menganalisis...';
    if (!apiStatus) return 'Memeriksa API...';
    return apiStatus.statusMessage || 'API Siap';
  };

  return (
    <header className="border-b border-slate-800/80 bg-[#0f1117]/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-950/20">
            <Camera className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white font-sans">
                LIGHTROOM AI ANALYZER V1.0
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PRO RECOMMENDER
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Sistem Analisis Fotografi & Rekomendasi Parameter Adobe Lightroom
            </p>
          </div>
        </div>

        {/* Status & Actions Zone */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div 
            onClick={onOpenApiInfo}
            title={getStatusLabel()}
            className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-slate-700 transition-colors"
          >
            <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
            <span className="font-mono text-[11px] text-slate-400">Model:</span>
            <span className="font-medium text-slate-200">gemini-3.5-flash-lite</span>
          </div>

          <a
            href="./Lightroom-AI-Analyzer-Release.apk"
            download="Lightroom-AI-Analyzer-Release.apk"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 hover:border-emerald-400 transition-colors shadow-sm"
            title="Unduh File APK Android Release Terbaru"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Unduh APK</span>
          </a>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-300 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Panduan Lightroom</span>
          </button>

          <button
            onClick={onOpenApiInfo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-amber-500/40 hover:border-amber-400 text-amber-300 transition-colors shadow-sm shadow-amber-950/20"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold">API & PENGATURAN</span>
          </button>
        </div>
      </div>
    </header>
  );
};
