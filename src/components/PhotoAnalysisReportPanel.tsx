/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  PhotoAnalysisResult,
  PhotoAnalysisReport
} from '../types/analyzer';
import {
  FileSearch,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ListOrdered,
  Sparkles,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  Compass,
  Target
} from 'lucide-react';

interface PhotoAnalysisReportPanelProps {
  result: PhotoAnalysisResult;
  onApplyPlan: () => void;
  isApplied: boolean;
  isProcessingCorrection: boolean;
}

export const PhotoAnalysisReportPanel: React.FC<PhotoAnalysisReportPanelProps> = ({
  result,
  onApplyPlan,
  isApplied,
  isProcessingCorrection
}) => {
  const report: PhotoAnalysisReport | undefined = result.photoAnalysisReport;

  // Fallback defaults if report was partially mapped
  const sectionA = report?.sectionA_actualObservation || result.technicalSummary;
  const sectionB = report?.sectionB_detectedDefects || (result.detectedIssues || []).map((iss) => ({
    issue: iss.category,
    description: iss.description,
    priority: (iss.severity === 'critical' ? 'Tinggi' : iss.severity === 'moderate' ? 'Sedang' : 'Rendah') as 'Tinggi' | 'Sedang' | 'Rendah',
    affectedArea: iss.affectedAreas || 'Area Foto'
  }));

  const sectionC = report?.sectionC_userDirectiveInterpretation || {
    summary: result.customInstructionsSummary?.instructionGiven || 'Instruksi foto diproses secara adaptif.',
    visualGoals: result.customInstructionsSummary?.priorityObjectives || [
      'Pertahankan skin tone dan keaslian subjek',
      'Optimalisasi tonal kontras dan pencahayaan'
    ],
    relatedParameters: ['Exposure', 'Contrast', 'Highlights', 'Shadows', 'Vibrance', 'Texture'],
    priorityAreas: ['Wajah & Kulit Subjek', 'Bayangan Pakaian & Midtone', 'Latar Belakang'],
    unapplicableDirectives: result.customInstructionsSummary?.alignmentNote || 'Seluruh instruksi diselaraskan dalam batasan batas sensor.'
  };

  const sectionD = report?.sectionD_aiCorrectionPlan || [
    'Menyelaraskan nilai Exposure dan Shadows untuk mengangkat midtone tanpa memunculkan noise.',
    'Mereduksi Highlights secara terukur guna mengamankan tekstur area terang.',
    'Mengatur Vibrance dan HSL Mixer agar warna tampil lebih hidup tanpa merusak skin tone.',
    'Menambahkan Smart Adaptive Sharpening untuk mempertegas kontur mata dan serat kain.'
  ];

  const sectionE = report?.sectionE_expectedVisualOutcome ||
    'Foto hasil perbaikan akan memiliki tonalitas yang lebih berdimensi, bayangan bersih, dan kontras mikro yang tegas dengan warna kulit natural yang terjaga seutuhnya.';

  return (
    <div className="bg-[#12151e] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl space-y-0 transition-all">
      {/* Header Panel */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-[#161a25] to-[#12151e] border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
            <FileSearch className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                LAPORAN ANALISIS FOTO &amp; RENCANA PERBAIKAN
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold uppercase">
                Gemini 3.5 Flash-Lite
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Sintesis kecerdasan visual Gemini AI: Pengamatan Aktual, Arahan Pengguna, dan Strategi Parameter Lightroom.
            </p>
          </div>
        </div>

        {/* Action Button: TERAPKAN RENCANA PERBAIKAN */}
        <button
          type="button"
          onClick={onApplyPlan}
          disabled={isProcessingCorrection}
          className={`px-5 py-2.5 rounded-xl font-extrabold text-xs tracking-wider flex items-center gap-2.5 shadow-lg transition-all active:scale-95 cursor-pointer ${
            isApplied
              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 shadow-slate-900/40'
              : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>
            {isProcessingCorrection
              ? 'MEMPROSES RENCANA...'
              : isApplied
              ? 'RENCANA PERBAIKAN TELAH DITERAPKAN'
              : 'TERAPKAN RENCANA PERBAIKAN'}
          </span>
          {!isApplied && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>

      {/* 5-Section Report Body */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* BAGIAN A: HASIL YANG DIDAPAT DARI ANALISIS */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
          <div className="flex items-center gap-2 text-slate-200">
            <span className="w-6 h-6 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-bold text-xs flex items-center justify-center">
              A
            </span>
            <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-cyan-300">
              HASIL YANG DIDAPAT DARI ANALISIS
            </h3>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed pl-8">
            {sectionA}
          </p>
        </div>

        {/* BAGIAN B: KEKURANGAN FOTO */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-200">
              <span className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center">
                B
              </span>
              <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-rose-300">
                KEKURANGAN FOTO
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {sectionB.length} Masalah Teridentifikasi
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-0 sm:pl-8">
            {sectionB.map((defect, idx) => {
              const isHigh = defect.priority === 'Tinggi';
              const isMed = defect.priority === 'Sedang';
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold text-slate-200">
                      {isHigh ? (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      ) : isMed ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                      <span>{defect.issue}</span>
                    </div>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isHigh
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : isMed
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      }`}
                    >
                      Prioritas: {defect.priority}
                    </span>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {defect.description}
                  </p>

                  {defect.affectedArea && (
                    <span className="text-[10px] text-slate-500 block font-mono">
                      Area terdampak: {defect.affectedArea}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BAGIAN C: INTERPRETASI INSTRUKSI PENGGUNA */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3.5">
          <div className="flex items-center gap-2 text-slate-200">
            <span className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center justify-center">
              C
            </span>
            <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-amber-300">
              INTERPRETASI INSTRUKSI PENGGUNA
            </h3>
          </div>

          <div className="space-y-3 pl-0 sm:pl-8 text-xs">
            {/* Directives Quote */}
            <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
              <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                Instruksi Pengguna yang Dipahami AI:
              </span>
              <p className="text-amber-300/90 font-medium italic">
                "{sectionC.summary}"
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Visual Goals */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] uppercase">
                  <Target className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Tujuan Visual AI</span>
                </div>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {sectionC.visualGoals.map((g, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Related Parameters */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] uppercase">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Parameter Terkait</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {sectionC.relatedParameters.map((p, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-amber-300 font-semibold"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              {/* Priority Areas */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-300 font-bold text-[11px] uppercase">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Bagian Foto Prioritas</span>
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {sectionC.priorityAreas.map((a, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-emerald-300 font-semibold"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Unapplicable Directives / Safe Compromise note */}
            {sectionC.unapplicableDirectives && (
              <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800/90 text-slate-300 text-[11px] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-300 font-semibold">Penyelarasan Optis &amp; Batasan Sensor: </strong>
                  <span>{sectionC.unapplicableDirectives}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BAGIAN D: RENCANA PERBAIKAN AI */}
        <div className="p-4 sm:p-5 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-slate-200">
            <span className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 font-bold text-xs flex items-center justify-center">
              D
            </span>
            <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-indigo-300">
              RENCANA PERBAIKAN AI
            </h3>
          </div>

          <div className="space-y-2 pl-0 sm:pl-8">
            {sectionD.map((step, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start gap-3 text-xs"
              >
                <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 font-bold font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <p className="text-slate-300 leading-relaxed text-[12px] flex-1">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* BAGIAN E: HASIL VISUAL YANG DIHARAPKAN */}
        <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-emerald-500/10 via-slate-900 to-slate-900 border border-emerald-500/30 space-y-2.5">
          <div className="flex items-center gap-2 text-slate-200">
            <span className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center justify-center">
              E
            </span>
            <h3 className="text-xs sm:text-sm font-bold tracking-wide uppercase text-emerald-300">
              HASIL VISUAL YANG DIHARAPKAN
            </h3>
          </div>
          <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed pl-0 sm:pl-8 font-medium">
            {sectionE}
          </p>
        </div>
      </div>
    </div>
  );
};
