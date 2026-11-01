/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  UploadCloud,
  FileImage,
  Download,
  ShieldCheck,
  RefreshCw,
  Copy,
  Check,
  Eye,
  SplitSquareVertical,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatBytes, downloadOriginalFile } from '../utils/crypto';
import { PhotoAnalysisResult, CorrectionParameters, ImageLifecycleState, DiagnosticError } from '../types/analyzer';

interface PhotoUploadZoneProps {
  originalFile: File | null;
  imagePreviewUrl: string | null;
  dimensions: { width: number; height: number } | null;
  sha256Hash: string;
  isAnalyzing: boolean;
  analysisResult: PhotoAnalysisResult | null;
  isApplied: boolean;
  isProcessingCorrection: boolean;
  correctionParams: CorrectionParameters;
  onApplyCorrection: () => void;
  onDownloadCorrected: () => void;
  isExporting: boolean;
  exportProgress: number;
  correctedCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onFileSelected: (file: File) => void;
  onRetryAnalysis: () => void;
  onOpenIntegrityModal: () => void;
  lifecycleState?: ImageLifecycleState;
  diagnosticError?: DiagnosticError | null;
  onRecoverPreview?: () => void;
  onRenderRequired?: () => void;
  customInstructions?: string;
  useCustomInstructions?: boolean;
  workflowStatus?: {
    type: string;
    label: string;
    description: string;
    color: string;
  };
}

export type PreviewMode = 'original' | 'applied' | 'split';

export const PhotoUploadZone: React.FC<PhotoUploadZoneProps> = ({
  originalFile,
  imagePreviewUrl,
  dimensions,
  sha256Hash,
  isAnalyzing,
  analysisResult,
  isApplied,
  isProcessingCorrection,
  correctionParams,
  onApplyCorrection,
  onDownloadCorrected,
  isExporting,
  exportProgress,
  correctedCanvasRef,
  onFileSelected,
  onRetryAnalysis,
  onOpenIntegrityModal,
  lifecycleState = 'idle',
  diagnosticError,
  onRecoverPreview,
  onRenderRequired,
  customInstructions,
  useCustomInstructions,
  workflowStatus,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoWrapperRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);

  // Preview Mode: default to 'split' when applied, otherwise 'original'
  const [previewMode, setPreviewMode] = useState<PreviewMode>('split');
  const [splitPosition, setSplitPosition] = useState<number>(50); // percentage 0 to 100
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);

  // Set default previewMode to 'split' once applied
  useEffect(() => {
    if (isApplied) {
      setPreviewMode('split');
    } else {
      setPreviewMode('original');
    }
  }, [isApplied]);

  // Ensure canvas is freshly painted whenever previewMode or isApplied changes
  useEffect(() => {
    if (isApplied && (previewMode === 'applied' || previewMode === 'split')) {
      onRenderRequired?.();
    }
  }, [isApplied, previewMode, onRenderRequired]);

  // Keyboard shortcut: Press '\' to toggle before/after like Adobe Lightroom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '\\' && isApplied) {
        setPreviewMode((prev) => (prev === 'applied' ? 'original' : 'applied'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isApplied]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileSelected(file);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  const handleCopyHash = () => {
    if (sha256Hash) {
      navigator.clipboard.writeText(sha256Hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleDownloadOriginal = () => {
    if (originalFile) {
      downloadOriginalFile(originalFile, originalFile.name);
    }
  };

  // Split drag handler tracking the photo wrapper dimensions directly
  const handleSplitMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingSplit || !photoWrapperRef.current) return;
    const rect = photoWrapperRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPosition(pct);
  };

  const handleSplitTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingSplit || !photoWrapperRef.current || !e.touches[0]) return;
    const rect = photoWrapperRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSplitPosition(pct);
  };

  return (
    <div className="bg-[#13161f] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Header bar of upload card */}
      <div className="px-4 py-3 bg-[#181c26] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileImage className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
            Sumber Foto Asli &amp; Pratinjau Kalibrasi Lightroom
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Zero Compression Guaranteed</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-400 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Non-Generative Processing</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {!originalFile ? (
          /* Empty upload dropzone */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[360px] ${
              isDragOver
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />
            <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-200 mb-1">
              Tarik &amp; Lepas Foto Asli ke Sini
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-4">
              Mendukung format JPEG, PNG, WebP, dan gambar resolusi tinggi kamera. File asli tidak diubah sama sekali.
            </p>
            <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs tracking-wide transition-colors shadow-md">
              Pilih Berkas Foto
            </span>
          </div>
        ) : (
          /* File loaded view */
          <div className="space-y-4">
            {/* Pre-Analysis Banner: Photo loaded & ready for manual trigger */}
            {!analysisResult && (
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    isAnalyzing
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      : customInstructions && customInstructions.trim().length > 0 && useCustomInstructions
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}>
                    {isAnalyzing ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        {workflowStatus?.label || (isAnalyzing ? 'Analisis Sedang Berjalan' : 'Foto Siap Dianalisis')}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        Manual Trigger Workflow
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {isAnalyzing
                        ? 'Gemini 3.5 Flash-Lite sedang menganalisis foto dan instruksi Anda...'
                        : 'Foto asli telah dimuat. Analisis AI hanya dijalankan ketika Anda menekan tombol di samping.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onRetryAnalysis}
                  disabled={isAnalyzing}
                  className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-extrabold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>
                    {isAnalyzing ? 'MENGANALISIS FOTO...' : 'ANALISIS BERDASARKAN INSTRUKSI'}
                  </span>
                </button>
              </div>
            )}

            {/* Step 3 Banner: Recommendation ready -> Apply Correction */}
            {analysisResult && !isApplied && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-slate-900 border border-amber-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shrink-0 shadow-lg">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Rekomendasi AI Selesai Dihitung
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        15 Parameter Teridentifikasi
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Foto asli belum dimodifikasi. Klik tombol di samping untuk menerapkan koreksi non-generatif langsung pada foto.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onApplyCorrection}
                  disabled={isProcessingCorrection}
                  className="w-full md:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 active:scale-95 text-slate-950 font-extrabold text-xs tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all cursor-pointer shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {isProcessingCorrection ? 'MEMPROSES PIKSEL...' : 'TERAPKAN RENCANA PERBAIKAN'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* When Applied: Toolbar for Before / After modes */}
            {isApplied && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-[#181c26] border border-slate-800">
                <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('split')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      previewMode === 'split'
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <SplitSquareVertical className="w-3.5 h-3.5" />
                    <span>Bilah Split (Before / After)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewMode('applied')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      previewMode === 'applied'
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Foto Hasil Koreksi (After)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewMode('original')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      previewMode === 'original'
                        ? 'bg-slate-800 text-white shadow-sm font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Foto Asli (Before)</span>
                  </button>

                  {/* Hold to Compare quick button */}
                  <button
                    type="button"
                    onMouseDown={() => setPreviewMode('original')}
                    onMouseUp={() => setPreviewMode('applied')}
                    onTouchStart={() => setPreviewMode('original')}
                    onTouchEnd={() => setPreviewMode('applied')}
                    className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-mono text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors select-none"
                    title="Tekan dan tahan untuk melihat foto asli sebelum dikoreksi"
                  >
                    <span>Tahan Bandingkan</span>
                    <kbd className="px-1 py-0.5 rounded bg-slate-950 text-[10px] text-slate-300 border border-slate-800">\</kbd>
                  </button>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Koreksi Aktif (Canvas 2D Engine)</span>
                </div>
              </div>
            )}

            {/* Active Parameters Notification Strip */}
            {isApplied && (
              <div className="px-3.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 overflow-hidden">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-slate-200 font-mono text-[11px] truncate">
                    Exposure: {correctionParams.exposure > 0 ? `+${correctionParams.exposure.toFixed(2)}` : correctionParams.exposure.toFixed(2)} EV ·
                    Contrast: {correctionParams.contrast > 0 ? `+${correctionParams.contrast}` : correctionParams.contrast} ·
                    Shadows: {correctionParams.shadows > 0 ? `+${correctionParams.shadows}` : correctionParams.shadows} ·
                    Highlights: {correctionParams.highlights} ·
                    Vibrance: {correctionParams.vibrance > 0 ? `+${correctionParams.vibrance}` : correctionParams.vibrance} ·
                    Sharpness: {correctionParams.sharpness}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-300/90 font-mono shrink-0">
                  Wajah &amp; Kulit Alami 100% Terlindungi
                </span>
              </div>
            )}

            {/* Image Preview Box with Split View / Canvas / Original */}
            <div
              onMouseMove={handleSplitMouseMove}
              onMouseUp={() => setIsDraggingSplit(false)}
              onTouchMove={handleSplitTouchMove}
              onTouchEnd={() => setIsDraggingSplit(false)}
              className="relative rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[380px] max-h-[620px] p-2 select-none"
            >
              {imagePreviewUrl ? (
                /* Centered Photo Wrapper matching exact image bounds */
                <div
                  ref={photoWrapperRef}
                  className="relative inline-flex items-center justify-center max-h-[580px] max-w-full overflow-hidden rounded shadow-2xl"
                >
                  {/* 1. BASE GEOMETRY PHOTO LAYER: Always present to maintain natural photo aspect ratio & prevent layout collapse */}
                  <img
                    src={imagePreviewUrl}
                    alt={originalFile ? originalFile.name : 'Foto Asli'}
                    className="max-h-[580px] w-auto max-w-full object-contain rounded block select-none pointer-events-none"
                  />

                  {/* 2. SINGLE PERSISTENT CANVAS: Overlays directly on top of base image when correction is active */}
                  <canvas
                    ref={correctedCanvasRef}
                    className={`absolute inset-0 w-full h-full object-contain rounded transition-opacity duration-150 ${
                      isApplied && previewMode !== 'original' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                    }`}
                  />

                  {/* 3. SPLIT COMPARISON OVERLAY: Shown only when isApplied and previewMode is 'split' */}
                  {isApplied && previewMode === 'split' && (
                    <>
                      <span className="absolute bottom-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold shadow-md pointer-events-none z-20">
                        SETELAH (KOREKSI AI)
                      </span>

                      {/* Overlay "BEFORE" (Original untouched) image clipped by splitPosition */}
                      <div
                        className="absolute inset-0 overflow-hidden rounded pointer-events-none z-20"
                        style={{ clipPath: `polygon(0 0, ${splitPosition}% 0, ${splitPosition}% 100%, 0 100%)` }}
                      >
                        <img
                          src={imagePreviewUrl}
                          alt="Foto Asli"
                          className="max-h-[580px] w-auto max-w-full object-contain rounded block"
                        />
                        <span className="absolute bottom-3 left-3 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/95 text-slate-200 border border-slate-700 font-bold shadow-md pointer-events-none">
                          SEBELUM (FOTO ASLI)
                        </span>
                      </div>

                      {/* Interactive Split Divider Handle on the photo */}
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setIsDraggingSplit(true);
                        }}
                        onTouchStart={() => setIsDraggingSplit(true)}
                        className="absolute top-0 bottom-0 w-1 bg-amber-400 cursor-ew-resize z-30 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.8)]"
                        style={{ left: `${splitPosition}%` }}
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-slate-950 flex items-center justify-center text-slate-950 shadow-2xl cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
                          <SplitSquareVertical className="w-4 h-4" />
                        </div>
                      </div>
                    </>
                  )}

                  {/* 4. BADGES FOR APPLIED AND ORIGINAL MODES */}
                  {isApplied && previewMode === 'applied' && (
                    <span className="absolute bottom-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold shadow-md pointer-events-none z-20">
                      HASIL KOREKSI TERAPKAN
                    </span>
                  )}

                  {isApplied && previewMode === 'original' && (
                    <span className="absolute bottom-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/90 text-slate-200 border border-slate-700 shadow pointer-events-none z-20">
                      FOTO ASLI (BELUM DIKOREKSI)
                    </span>
                  )}

                  {!isApplied && (
                    <span className="absolute bottom-3 right-3 text-[10px] font-mono px-2.5 py-1 rounded bg-slate-900/95 text-slate-200 border border-slate-700 shadow-lg pointer-events-none z-20">
                      FOTO ASLI · BELUM DIUBAH
                    </span>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 text-xs">Memuat pratinjau...</div>
              )}

              {/* Loading spinner during analysis */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center z-30">
                  <div className="w-12 h-12 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  <div>
                    <h4 className="text-sm font-semibold text-amber-400 font-sans">
                      Sedang Menganalisis Kondisi Fotografi...
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Mengevaluasi pencahayaan, white balance, kurva tonal, HSL, detail tekstur, dan noise sensor.
                    </p>
                  </div>
                </div>
              )}

              {/* Loading spinner during image validation / decoding */}
              {(lifecycleState === 'validating' || lifecycleState === 'decoding') && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center z-30">
                  <div className="w-12 h-12 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                  <div>
                    <h4 className="text-sm font-semibold text-emerald-400 font-sans">
                      {lifecycleState === 'validating' ? 'Memvalidasi Integritas Berkas...' : 'Menginisialisasi Pratinjau Kanvas...'}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Membaca dimensi piksel asli dan menyiapkan memori buffer pratinjau responsif.
                    </p>
                  </div>
                </div>
              )}

              {/* Loading spinner during processing correction */}
              {isProcessingCorrection && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-4 text-center z-30">
                  <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <div>
                    <h4 className="text-sm font-semibold text-cyan-400 font-sans">
                      Menerapkan Pengolahan Piksel Non-Generatif...
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Mengolah kurva eksposur, pemulihan sorotan, penyeimbangan warna, dan penajaman optik.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Technical Metadata Grid */}
            <div className="bg-[#181c26] border border-slate-800/80 rounded-lg p-3 sm:p-4 text-xs space-y-2.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-slate-300">
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono uppercase">Nama Berkas</span>
                  <span className="font-medium text-slate-200 truncate block" title={originalFile.name}>
                    {originalFile.name}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono uppercase">Format &amp; Ukuran</span>
                  <span className="font-mono text-slate-200 block truncate">
                    {originalFile.type || 'image/jpeg'} · {formatBytes(originalFile.size)}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono uppercase">Dimensi Asli</span>
                  <span className="font-mono text-slate-200 block">
                    {dimensions ? `${dimensions.width} × ${dimensions.height} px` : 'Membaca...'}
                  </span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-mono uppercase">Status Piksel Asli</span>
                  <span className="text-emerald-400 font-medium block">
                    100% Unaltered
                  </span>
                </div>
              </div>

              {/* SHA-256 Checksum Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded bg-slate-900/90 border border-slate-800 font-mono text-[11px]">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <span className="text-slate-400 shrink-0 font-semibold text-[10px] uppercase">SHA-256:</span>
                  <span className="text-amber-400/90 truncate font-mono text-[11px]" title={sha256Hash}>
                    {sha256Hash || 'Menghitung hash kriptografis...'}
                  </span>
                </div>
                <button
                  onClick={handleCopyHash}
                  disabled={!sha256Hash}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 transition-colors text-[10px]"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? 'Disalin' : 'Salin Hash'}</span>
                </button>
              </div>
            </div>

            {/* Action Bar for Photo */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                {/* PRIMARY ACTION: Download Corrected Photo (when applied) */}
                {isApplied ? (
                  <button
                    onClick={onDownloadCorrected}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {isExporting ? `Mengekspor (${exportProgress}%)...` : 'DOWNLOAD FOTO HASIL PERBAIKAN'}
                    </span>
                    <span className="text-[10px] bg-emerald-700/80 px-1.5 py-0.5 rounded font-mono">
                      100% Resolusi Asli
                    </span>
                  </button>
                ) : (
                  <button
                    onClick={onApplyCorrection}
                    disabled={isProcessingCorrection || !analysisResult}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>TERAPKAN SEMUA REKOMENDASI AI</span>
                  </button>
                )}

                {/* Original untouched download button */}
                <button
                  onClick={handleDownloadOriginal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors"
                  title="Unduh file asli yang diunggah tanpa modifikasi apapun"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Unduh Foto Asli (Zero Comp)</span>
                </button>

                <button
                  onClick={onOpenIntegrityModal}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Verifikasi SHA-256</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onRetryAnalysis}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-medium text-xs transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{analysisResult ? 'Analisis Ulang AI' : 'Analisis Berdasarkan Instruksi'}</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition-colors"
                >
                  <span>Ganti Foto</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
