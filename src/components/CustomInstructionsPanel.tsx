/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Copy,
  Check,
  Info,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { CustomInstructionsSummary } from '../types/analyzer';

interface CustomInstructionsPanelProps {
  instructions: string;
  onInstructionsChange: (value: string) => void;
  isEnabled: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onAnalyzeWithInstructions: () => void;
  isAnalyzing: boolean;
  hasPhoto: boolean;
  analysisSummary?: CustomInstructionsSummary;
  instructionWarning?: string | null;
  hasInstructionsChanged?: boolean;
}

const DEFAULT_PRIMARY_TEMPLATE = 'Kulit natural dan lebih bersih, angkat saturasi dan kontras.';

export const CustomInstructionsPanel: React.FC<CustomInstructionsPanelProps> = ({
  instructions,
  onInstructionsChange,
  isEnabled,
  onToggleEnabled,
  onAnalyzeWithInstructions,
  isAnalyzing,
  hasPhoto,
  analysisSummary,
  instructionWarning,
  hasInstructionsChanged,
}) => {
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const characterCount = instructions.length;
  const wordCount = instructions.trim().length > 0 ? instructions.trim().split(/\s+/).length : 0;

  const handleClear = () => {
    onInstructionsChange('');
  };

  const handleApplyExample = () => {
    onInstructionsChange(DEFAULT_PRIMARY_TEMPLATE);
    if (!isEnabled) {
      onToggleEnabled(true);
    }
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  return (
    <div className="rounded-xl bg-[#141822] border border-slate-800 shadow-xl overflow-hidden transition-all">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide">
                CUSTOM PHOTO CORRECTION INSTRUCTIONS
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                AI Directives
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Panduan instruksi khusus pengguna untuk mengarahkan analisis dan rekomendasi parameter Adobe Lightroom oleh Gemini 3.5 Flash-Lite.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onToggleEnabled(!isEnabled)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              isEnabled
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm'
                : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isEnabled ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-400" />
                <span>Instruksi Aktif</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-500" />
                <span>Instruksi Nonaktif</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Instruction Warning Banner (Validation Notice) */}
        {instructionWarning && (
          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 shadow-md animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-200 block">Pemberitahuan Instruksi</span>
              <p className="leading-relaxed">{instructionWarning}</p>
            </div>
          </div>
        )}

        {/* Instructions Textarea Box */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-300 font-medium flex items-center gap-1.5">
              <span>Instruksi Khusus Perbaikan Foto</span>
              <span className="text-[11px] text-slate-500 font-normal">
                (Bahasa Indonesia atau English didukung)
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApplyExample}
                className="text-[11px] text-amber-400/90 hover:text-amber-300 transition-colors flex items-center gap-1 hover:underline"
                title={`Muat template default: "${DEFAULT_PRIMARY_TEMPLATE}"`}
              >
                {copiedTemplate ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-semibold">Template Dimuat!</span>
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Gunakan Contoh Template</span>
                  </>
                )}
              </button>
              {instructions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-rose-400/90 hover:text-rose-300 transition-colors flex items-center gap-1 hover:underline ml-2"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              value={instructions}
              onChange={(e) => onInstructionsChange(e.target.value)}
              placeholder={`Contoh template:\n"${DEFAULT_PRIMARY_TEMPLATE}"\n\n(Klik "Gunakan Contoh Template" di atas atau ketik instruksi khusus Anda)`}
              rows={4}
              disabled={!isEnabled}
              className={`w-full px-3.5 py-3 rounded-lg bg-slate-950 border text-xs sm:text-[13px] leading-relaxed transition-all resize-y min-h-[110px] max-h-[300px] font-sans ${
                !isEnabled
                  ? 'border-slate-800 text-slate-600 bg-slate-950/40 cursor-not-allowed placeholder-slate-700'
                  : 'border-slate-700/80 text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50'
              }`}
            />
          </div>
        </div>

        {/* Toolbar Bar: Counters, Status & Action */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Status Indicator & Stats */}
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span
                className={`w-2 h-2 rounded-full ${
                  !isEnabled
                    ? 'bg-slate-600'
                    : instructions.trim().length === 0
                    ? 'bg-amber-400'
                    : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span className={!isEnabled ? 'text-slate-500' : 'text-slate-300'}>
                {!isEnabled
                  ? 'Nonaktif · Tidak dikirim ke AI'
                  : instructions.trim().length === 0
                  ? 'Siap · Tuliskan instruksi di atas'
                  : 'Aktif · Memandu rekomendasi parameter'}
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-400 border-l border-slate-800 pl-3">
              {characterCount} karakter · {wordCount} kata
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAnalyzeWithInstructions}
              disabled={!hasPhoto || isAnalyzing}
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                !hasPhoto || isAnalyzing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 active:scale-95 shadow-amber-500/20'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>
                {isAnalyzing
                  ? 'Menganalisis Berdasarkan Instruksi...'
                  : 'Analisis Berdasarkan Instruksi'}
              </span>
            </button>
          </div>
        </div>

        {/* Notice when user altered instructions after analysis */}
        {hasInstructionsChanged && !isAnalyzing && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-3 shadow animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Instruksi telah diubah sejak analisis terakhir. Rekomendasi sebelumnya perlu dianalisis ulang.</span>
            </div>
            <button
              type="button"
              onClick={onAnalyzeWithInstructions}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shrink-0"
            >
              Perbarui Analisis
            </button>
          </div>
        )}

        {/* Active Analysis Fulfillment Banner (Visible after analysis) */}
        {analysisSummary && analysisSummary.enabled && (
          <div className="mt-3 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Instruksi Pengguna Berhasil Diterapkan ke Rekomendasi Lightroom</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                100% Non-Generatif
              </span>
            </div>

            {analysisSummary.priorityObjectives && analysisSummary.priorityObjectives.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {analysisSummary.priorityObjectives.map((obj, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-900/90 text-slate-200 border border-slate-700/80 flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>{obj}</span>
                  </span>
                ))}
              </div>
            )}

            {analysisSummary.alignmentNote && (
              <p className="text-xs text-slate-300 leading-relaxed border-t border-emerald-500/20 pt-2">
                <strong className="text-emerald-300 font-medium">Catatan Penyelarasan AI: </strong>
                {analysisSummary.alignmentNote}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
