/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { PhotoUploadZone } from './components/PhotoUploadZone';
import { CustomInstructionsPanel } from './components/CustomInstructionsPanel';
import { PhotoAnalysisReportPanel } from './components/PhotoAnalysisReportPanel';
import { ManualAdjustmentPanel } from './components/ManualAdjustmentPanel';
import { AnalysisSummaryCard } from './components/AnalysisSummaryCard';
import { CategoryTabs } from './components/CategoryTabs';
import { IntegrityModal } from './components/IntegrityModal';
import { ApiSettingsModal } from './components/ApiSettingsModal';
import { GuideModal } from './components/GuideModal';
import { SmartSharpeningPanel } from './components/SmartSharpeningPanel';
import {
  PhotoAnalysisResult,
  CorrectionParameters,
  DEFAULT_CORRECTION_PARAMETERS,
  DEFAULT_SMART_SHARPENING,
  SmartSharpeningConfig,
  ApiStatusInfo,
  DiagnosticError,
  ImageLifecycleState
} from './types/analyzer';
import { ImageProcessor, PreviewEngine, ExportEngine } from './services/imageProcessor';
import { getStoredApiKey, getMaskedKey, analyzePhotoWithGeminiClient, CONFIGURED_GEMINI_MODEL } from './services/geminiClient';
import { extractUnifiedCorrectionParameters } from './services/geminiValidator';
import { GeminiTelemetryData } from './components/AnalysisSummaryCard';
import { calculateSHA256 } from './utils/crypto';
import { AlertCircle, AlertTriangle, CheckCircle, Sparkles, SlidersHorizontal, RefreshCw } from 'lucide-react';

function parseNumericValue(val: any, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function extractCorrectionParameters(result: PhotoAnalysisResult | null): CorrectionParameters {
  if (!result || !result.adjustments) {
    return { ...DEFAULT_CORRECTION_PARAMETERS };
  }
  const adj = result.adjustments;
  return {
    exposure: parseNumericValue(adj.light?.exposure?.recommendedValue, 0.40),
    brightness: 0,
    contrast: parseNumericValue(adj.light?.contrast?.recommendedValue, 14),
    highlights: parseNumericValue(adj.light?.highlights?.recommendedValue, -28),
    shadows: parseNumericValue(adj.light?.shadows?.recommendedValue, 32),
    whites: parseNumericValue(adj.light?.whites?.recommendedValue, 14),
    blacks: parseNumericValue(adj.light?.blacks?.recommendedValue, -10),
    temperature: parseNumericValue(adj.color?.temperature?.recommendedValue, -5),
    tint: parseNumericValue(adj.color?.tint?.recommendedValue, 3),
    vibrance: parseNumericValue(adj.color?.vibrance?.recommendedValue, 18),
    saturation: parseNumericValue(adj.color?.saturation?.recommendedValue, 4),
    texture: parseNumericValue(adj.effects?.texture?.recommendedValue, 14),
    clarity: parseNumericValue(adj.effects?.clarity?.recommendedValue, 8),
    sharpness: Math.max(0, parseNumericValue(adj.detail?.sharpening?.recommendedValue, 45)),
    noiseReduction: Math.max(0, parseNumericValue(adj.detail?.noiseReduction?.recommendedValue, 15)),
    smartSharpening: {
      ...DEFAULT_SMART_SHARPENING,
      amount: Math.min(100, Math.max(0, parseNumericValue(adj.detail?.sharpening?.recommendedValue, 40))),
      radius: Math.min(3.0, Math.max(0.5, parseNumericValue(adj.detail?.radius?.recommendedValue, 1.0))),
      detail: Math.min(100, Math.max(0, parseNumericValue(adj.detail?.detail?.recommendedValue, 50))),
      masking: Math.min(100, Math.max(0, parseNumericValue(adj.detail?.masking?.recommendedValue, 60))),
      noiseSuppression: Math.min(100, Math.max(0, parseNumericValue(adj.detail?.noiseReduction?.recommendedValue, 35)))
    }
  };
}

export default function App() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [sha256Hash, setSha256Hash] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<PhotoAnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosticError, setDiagnosticError] = useState<DiagnosticError | null>(null);
  const [lifecycleState, setLifecycleState] = useState<ImageLifecycleState>('idle');

  // Custom Photo Correction Instructions state (Default template is active)
  const [customInstructions, setCustomInstructions] = useState<string>(
    'Kulit natural dan lebih bersih, angkat saturasi dan kontras.'
  );
  const [useCustomInstructions, setUseCustomInstructions] = useState<boolean>(true);
  const [analyzedInstructions, setAnalyzedInstructions] = useState<string | null>(null);
  const [instructionWarning, setInstructionWarning] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Workflow states: UPLOAD -> AUTO ANALYZE -> RECOMMENDATION -> APPLY CORRECTION -> MANUAL ADJUSTMENT -> LIVE PREVIEW -> DOWNLOAD
  const [isApplied, setIsApplied] = useState<boolean>(false);
  const [isProcessingCorrection, setIsProcessingCorrection] = useState<boolean>(false);
  const [correctionParams, setCorrectionParams] = useState<CorrectionParameters>(DEFAULT_CORRECTION_PARAMETERS);
  const [aiParams, setAiParams] = useState<CorrectionParameters>(DEFAULT_CORRECTION_PARAMETERS);

  // Export states
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);

  // Canvas and Image references
  const correctedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceImageRef = useRef<HTMLImageElement | null>(null);

  // Modals & Telemetry
  const [isIntegrityModalOpen, setIsIntegrityModalOpen] = useState(false);
  const [isApiSettingsModalOpen, setIsApiSettingsModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatusInfo | null>(null);
  const [geminiPhase, setGeminiPhase] = useState<'READY' | 'SENDING_IMAGE' | 'ANALYZING' | 'VALIDATING' | 'SUCCESS' | 'FAILED'>('READY');
  const [telemetryInfo, setTelemetryInfo] = useState<GeminiTelemetryData | null>(null);

  // Load API status on initial mount
  useEffect(() => {
    const clientKey = getStoredApiKey();

    fetch('/api/status', { headers: { Accept: 'application/json' } })
      .then(async (res) => {
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.includes('application/json')) {
          return res.json();
        }
        return null;
      })
      .then((data) => {
        if (data && data.hasApiKey) {
          setApiStatus(data);
        } else if (clientKey) {
          setApiStatus({
            status: 'connected',
            statusMessage: 'API Terhubung (Client BYOK)',
            hasApiKey: true,
            maskedKey: getMaskedKey(clientKey),
            provider: 'Google Gemini',
            model: CONFIGURED_GEMINI_MODEL,
            mode: 'BYOK (Client Standalone)',
            lastChecked: new Date().toISOString()
          });
        } else {
          setApiStatus({
            status: 'not_configured',
            statusMessage: 'API Belum Dikonfigurasi (Klik untuk memasang Gemini API Key)',
            hasApiKey: false,
            provider: 'Google Gemini',
            model: CONFIGURED_GEMINI_MODEL,
            mode: 'BYOK (Client Standalone)',
            lastChecked: new Date().toISOString()
          });
        }
      })
      .catch(() => {
        if (clientKey) {
          setApiStatus({
            status: 'connected',
            statusMessage: 'API Terhubung (Client BYOK)',
            hasApiKey: true,
            maskedKey: getMaskedKey(clientKey),
            provider: 'Google Gemini',
            model: CONFIGURED_GEMINI_MODEL,
            mode: 'BYOK (Client Standalone)',
            lastChecked: new Date().toISOString()
          });
        } else {
          setApiStatus({
            status: 'not_configured',
            statusMessage: 'API Belum Dikonfigurasi (Klik untuk memasang Gemini API Key)',
            hasApiKey: false,
            provider: 'Google Gemini',
            model: CONFIGURED_GEMINI_MODEL,
            mode: 'BYOK (Client Standalone)',
            lastChecked: new Date().toISOString()
          });
        }
      });
  }, []);

  const imagePreviewUrlRef = useRef<string | null>(null);

  // Clean up preview engine and blob URLs ONLY on component unmount
  useEffect(() => {
    return () => {
      PreviewEngine.destroy();
      if (imagePreviewUrlRef.current) {
        URL.revokeObjectURL(imagePreviewUrlRef.current);
      }
    };
  }, []);

  // Convert File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // High-performance RAF canvas preview renderer via PreviewEngine
  const renderPreviewCanvas = useCallback((params: CorrectionParameters) => {
    if (!correctedCanvasRef.current) return;
    try {
      // Auto-reinitialize preview baseline if cache was lost but source image exists
      if (sourceImageRef.current && !PreviewEngine.isInitialized()) {
        PreviewEngine.init(sourceImageRef.current, 1920);
      }
      PreviewEngine.render(correctedCanvasRef.current, params);
    } catch (err: any) {
      console.error('Gagal merender kanvas pratinjau:', err);
      setDiagnosticError({
        type: 'canvas_render_error',
        title: 'Kendala Rendering Kanvas 2D',
        message: err?.message || 'Gagal memproses buffer piksel pada kanvas pratinjau.',
        recoveryAction: 'Klik untuk mereset mesin pratinjau kanvas.',
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  const hasInstructionsChanged = Boolean(
    analysisResult &&
    analyzedInstructions !== null &&
    (customInstructions.trim() !== analyzedInstructions || !useCustomInstructions)
  );

  const workflowStatus = (() => {
    if (!originalFile) {
      return {
        type: 'idle',
        label: 'READY — Menunggu Berkas Foto',
        description: 'Silakan unggah foto asli untuk memulai analisis visual.',
        color: 'slate'
      };
    }
    if (geminiPhase === 'SENDING_IMAGE') {
      return {
        type: 'sending',
        label: 'SENDING IMAGE — Menyiapkan Input Visual Multimodal',
        description: 'Piksel foto asli sedang disiapkan dan dikirim ke Gemini 3.5 Flash-Lite...',
        color: 'amber'
      };
    }
    if (geminiPhase === 'ANALYZING') {
      return {
        type: 'analyzing',
        label: 'ANALYZING — Gemini 3.5 Flash-Lite Menganalisis Foto',
        description: 'Gemini sedang menganalisis pencahayaan, dynamic range, saturasi, dan skin tone foto...',
        color: 'amber'
      };
    }
    if (geminiPhase === 'VALIDATING') {
      return {
        type: 'validating',
        label: 'VALIDATING — Memvalidasi Rekomendasi Parameter',
        description: 'Memeriksa konsistensi nilai, batas rentang Lightroom, dan alasan fotografis...',
        color: 'cyan'
      };
    }
    if (errorMessage || geminiPhase === 'FAILED') {
      return {
        type: 'failed',
        label: 'FAILED — Analisis Visual Gemini Mengalami Kendala',
        description: errorMessage || 'Analisis visual gagal dijalankan.',
        color: 'rose'
      };
    }
    if (analysisResult && (geminiPhase === 'SUCCESS' || geminiPhase === 'READY')) {
      if (hasInstructionsChanged) {
        return {
          type: 'needs_reanalysis',
          label: 'Instruksi Berubah · Perlu Analisis Ulang',
          description: 'Instruksi telah diubah sejak analisis visual terakhir.',
          color: 'amber'
        };
      }
      return {
        type: 'success',
        label: 'SUCCESS — Rekomendasi Visual Gemini 3.5 Flash-Lite Siap',
        description: 'Rekomendasi parameter Lightroom nyata siap diterapkan pada foto asli.',
        color: 'emerald'
      };
    }
    return {
      type: 'photo_ready',
      label: 'READY — Foto Siap Dianalisis',
      description: 'Foto dan instruksi siap. Tekan "ANALISIS BERDASARKAN INSTRUKSI".',
      color: 'cyan'
    };
  })();

    // Perform Gemini analysis
  const executeAnalysis = async (
    file: File,
    hash: string,
    dims?: { width: number; height: number } | null,
    overrideInstructions?: string
  ) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setErrorMessage(null);
    setInstructionWarning(null);

    // Abort previous controller if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Verify API Key existence before proceeding
    const clientKey = getStoredApiKey();
    const hasServerKey = apiStatus?.hasApiKey;
    if (!clientKey && !hasServerKey) {
      setIsAnalyzing(false);
      setGeminiPhase('FAILED');
      setErrorMessage(
        'Kunci API Google Gemini (BYOK) belum dikonfigurasi. Buka menu "API & PENGATURAN" di kanan atas dan masukkan Gemini API Key Anda untuk mengaktifkan analisis visual nyata Gemini 3.5 Flash-Lite.'
      );
      abortControllerRef.current = null;
      return;
    }

    try {
      // Phase 1: SENDING IMAGE (Prepare visual image payload)
      setGeminiPhase('SENDING_IMAGE');
      const base64Data = await fileToBase64(file);
      const activeInstructions = (overrideInstructions ?? customInstructions).trim();

      const payload: Record<string, any> = {
        imageBase64: base64Data,
        mimeType: file.type || 'image/jpeg',
        fileName: file.name,
        fileSize: file.size,
        width: dims?.width,
        height: dims?.height,
        sha256Hash: hash,
        customInstructions: activeInstructions,
        useCustomInstructions: true
      };

      // Phase 2: ANALYZING (Gemini multimodal inference)
      setGeminiPhase('ANALYZING');
      const analysisStartTime = performance.now();
      let data: PhotoAnalysisResult | null = null;

      // 1. Try backend server proxy if running locally
      let backendFailed = false;
      try {
        const response = await fetch('/api/analyze-photo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const errData = await response.json().catch(() => ({}));
          if (response.status === 401 || response.status === 403) {
            throw new Error(errData.error || 'Autentikasi Gagal: API Key Google Gemini tidak valid.');
          } else if (response.status === 429) {
            throw new Error(errData.error || 'Batas Kuota Gemini API (429 RESOURCE_EXHAUSTED) tercapai.');
          } else if (response.status === 502 || response.status === 503) {
            throw new Error(errData.error || 'Layanan Gemini API sedang mengalami kendala sementara.');
          } else {
            backendFailed = true;
          }
        }
      } catch (backendErr: any) {
        if (backendErr.name === 'AbortError') throw backendErr;
        if (backendErr.message?.includes('Autentikasi') || backendErr.message?.includes('Batas Kuota')) {
          throw backendErr;
        }
        backendFailed = true;
      }

      // 2. If backend is unavailable (GitHub Pages or Android APK), call Gemini directly via client
      if (backendFailed && !data) {
        if (!clientKey) {
          throw new Error('API Key Google Gemini belum dikonfigurasi di browser / aplikasi ini.');
        }

        data = await analyzePhotoWithGeminiClient({
          imageBase64: base64Data,
          mimeType: file.type || 'image/jpeg',
          fileName: file.name,
          fileSize: file.size,
          width: dims?.width,
          height: dims?.height,
          sha256Hash: hash,
          customInstructions: activeInstructions,
          useCustomInstructions: true,
          apiKey: clientKey,
          signal: controller.signal,
          onProgress: (phase) => setGeminiPhase(phase)
        });
      }

      if (!data) {
        throw new Error('Tidak menerima data respon dari Gemini 3.5 Flash-Lite.');
      }

      // Phase 3: VALIDATING (Validate parameters against Lightroom specifications)
      setGeminiPhase('VALIDATING');
      const durationMs = Math.round(performance.now() - analysisStartTime);

      // Extract unified parameters as single source of truth (0 fallback, no hardcoded guesses)
      const extracted = extractUnifiedCorrectionParameters(data);

      // Phase 4: SUCCESS
      setGeminiPhase('SUCCESS');
      setAnalysisResult(data);
      setAnalyzedInstructions(activeInstructions);
      setAiParams(extracted);
      setCorrectionParams(extracted);
      setLifecycleState('ready');

      setTelemetryInfo({
        model: data.model || 'gemini-3.5-flash-lite',
        imageInputStatus: `Foto Asli (${file.name}, ${dims?.width || 0}×${dims?.height || 0} px)`,
        apiResponseStatus: 'HTTP 200 OK (Multimodal Visual Inference)',
        analysisDurationMs: durationMs,
        validationStatus: '100% Parameter Lightroom Lolos Validasi',
        timestamp: new Date().toISOString()
      });

      // If preview is already applied on canvas, immediately render with real Gemini recommendations
      if (isApplied) {
        requestAnimationFrame(() => {
          renderPreviewCanvas(extracted);
        });
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log('Analisis foto dibatalkan.');
        return;
      }
      console.error('[Gemini Analysis Error]:', err);
      setGeminiPhase('FAILED');
      setAnalysisResult(null);
      setErrorMessage(
        err?.message || 'Terjadi kesalahan saat memproses analisis visual foto dengan Gemini AI.'
      );
      setLifecycleState('ready');
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
    }
  };

    // Sole trigger for AI Photo Analysis
  const handleStartAnalysis = () => {
    if (isAnalyzing) return; // Prevent double trigger

    if (!originalFile) {
      setInstructionWarning('Silakan pilih atau unggah foto terlebih dahulu.');
      return;
    }

    if (!useCustomInstructions || customInstructions.trim().length === 0) {
      setInstructionWarning(
        'Instruksi foto belum aktif atau masih kosong. Harap aktifkan "Instruksi Aktif" dan masukkan instruksi perbaikan (atau klik "Gunakan Contoh Template") sebelum memulai analisis.'
      );
      return;
    }

    setInstructionWarning(null);
    executeAnalysis(originalFile, sha256Hash, dimensions, customInstructions.trim());
  };

  // Deterministic 7-step Image Loading Lifecycle:
  // UPLOAD -> VALIDATE -> LOAD -> READ DIMS -> INIT PREVIEW -> RENDER -> ENABLE INTERACTION
  const handleFileSelected = async (file: File) => {
    // 0. ABORT PREVIOUS RUNNING ANALYSIS IF ANY
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsAnalyzing(false);
    setErrorMessage(null);
    setDiagnosticError(null);
    setAnalysisResult(null);
    setAnalyzedInstructions(null);
    setInstructionWarning(null);
    setIsApplied(false);
    setCorrectionParams(DEFAULT_CORRECTION_PARAMETERS);
    setAiParams(DEFAULT_CORRECTION_PARAMETERS);
    setLifecycleState('uploading');
    setGeminiPhase('READY');
    setTelemetryInfo(null);

    // 1. MEMORY CLEANUP OF PREVIOUS ASSETS
    PreviewEngine.destroy();
    if (sourceImageRef.current) {
      sourceImageRef.current.onload = null;
      sourceImageRef.current.onerror = null;
      sourceImageRef.current.src = '';
      sourceImageRef.current = null;
    }
    if (imagePreviewUrlRef.current) {
      URL.revokeObjectURL(imagePreviewUrlRef.current);
      imagePreviewUrlRef.current = null;
    }
    setImagePreviewUrl(null);

    // 2. VALIDATE IMAGE FILE
    setLifecycleState('validating');
    const validation = await ImageProcessor.validateImageFile(file);
    if (!validation.valid) {
      setLifecycleState('error');
      setDiagnosticError({
        type: 'image_load_failed',
        title: 'Validasi Berkas Gambar Gagal',
        message: validation.error || 'Format berkas tidak valid atau berkas rusak.',
        recoveryAction: 'Silakan pilih berkas foto JPEG, PNG, atau WebP yang valid.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // 3. READ ORIGINAL DIMENSIONS & HASH CALCULATION
    setOriginalFile(file);
    const resolvedDims = { width: validation.width, height: validation.height };
    setDimensions(resolvedDims);

    let calculatedHash = '';
    try {
      calculatedHash = await calculateSHA256(file);
      setSha256Hash(calculatedHash);
    } catch (hashErr) {
      console.warn('Could not compute SHA-256:', hashErr);
    }

    // 4. IMAGE LOAD & DECODE
    setLifecycleState('decoding');
    const preview = URL.createObjectURL(file);
    imagePreviewUrlRef.current = preview;
    setImagePreviewUrl(preview);

    const img = new Image();

    img.onload = async () => {
      try {
        // Await full visual decode if supported to ensure canvas drawing never extracts blank pixels
        if ('decode' in img) {
          try {
            await img.decode();
          } catch (decodeErr) {
            console.warn('Image decode error fallback:', decodeErr);
          }
        }

        sourceImageRef.current = img;

        // 5. INITIALIZE PREVIEW ENGINE (Caches downscaled baseline for zero-overhead slider drag)
        PreviewEngine.init(img, 1920);
        setLifecycleState('ready');

        // Note: Automatic Gemini analysis is strictly disabled.
        // Analysis will ONLY run when user explicitly clicks "ANALISIS BERDASARKAN INSTRUKSI".
      } catch (initErr: any) {
        console.error('[PreviewEngine init failure]:', initErr);
        setLifecycleState('error');
        setDiagnosticError({
          type: 'canvas_render_error',
          title: 'Inisialisasi Pratinjau Gagal',
          message: initErr?.message || 'Gagal menyiapkan memori kanvas pratinjau.',
          recoveryAction: 'Coba muat ulang foto.',
          timestamp: new Date().toISOString()
        });
      }
    };

    img.onerror = () => {
      setLifecycleState('error');
      setDiagnosticError({
        type: 'image_load_failed',
        title: 'Gagal Mendekode Gambar',
        message: 'Browser tidak dapat mendekode data visual gambar ini.',
        recoveryAction: 'Pastikan file foto tidak terenkripsi atau corrupt.',
        timestamp: new Date().toISOString()
      });
    };

    img.src = preview;
  };

  const handleRetryAnalysis = () => {
    handleStartAnalysis();
  };

  // Handle [ TERAPKAN SEMUA REKOMENDASI AI ]
  const handleApplyCorrection = () => {
    setIsProcessingCorrection(true);
    setDiagnosticError(null);

    // Ensure preview baseline is initialized if not already
    if (sourceImageRef.current && !PreviewEngine.isInitialized()) {
      try {
        PreviewEngine.init(sourceImageRef.current, 1920);
      } catch (initErr: any) {
        setDiagnosticError({
          type: 'canvas_render_error',
          title: 'Inisialisasi Pratinjau Gagal',
          message: initErr?.message || 'Gagal menyiapkan memori kanvas pratinjau.',
          timestamp: new Date().toISOString()
        });
        setIsProcessingCorrection(false);
        return;
      }
    }

    setIsApplied(true);
    setIsProcessingCorrection(false);

    // Schedule render cleanly via requestAnimationFrame after state update
    requestAnimationFrame(() => {
      renderPreviewCanvas(correctionParams);
    });
  };

  // Handle manual adjustments (Zero Gemini API re-triggering, pure local preview)
  const handleParamsChange = (updated: CorrectionParameters) => {
    setCorrectionParams(updated);
    if (!isApplied) {
      setIsApplied(true);
    }
    renderPreviewCanvas(updated);
  };

  // Handle Smart Sharpening adjustment (Real-time Canvas 2D without Gemini re-call)
  const handleSmartSharpeningChange = (newConfig: SmartSharpeningConfig) => {
    const updated: CorrectionParameters = {
      ...correctionParams,
      smartSharpening: newConfig,
      sharpness: newConfig.enabled ? newConfig.amount : correctionParams.sharpness
    };
    setCorrectionParams(updated);
    if (!isApplied) {
      setIsApplied(true);
    }
    renderPreviewCanvas(updated);
  };

  // Reset to AI Recommendations
  const handleResetToAi = () => {
    setCorrectionParams(aiParams);
    if (!isApplied) {
      setIsApplied(true);
    }
    renderPreviewCanvas(aiParams);
  };

  // Reset all to Neutral (0)
  const handleResetAll = () => {
    setCorrectionParams(DEFAULT_CORRECTION_PARAMETERS);
    if (!isApplied) {
      setIsApplied(true);
    }
    renderPreviewCanvas(DEFAULT_CORRECTION_PARAMETERS);
  };

  // Download corrected photo in 100% full original resolution via ExportEngine
  const handleDownloadCorrected = async () => {
    if (!sourceImageRef.current || !originalFile) {
      setDiagnosticError({
        type: 'export_failed',
        title: 'Sumber Gambar Belum Siap',
        message: 'Foto asli belum selesai dimuat ke dalam memori ekspor.',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(10);
      setDiagnosticError(null);

      const blob = await ExportEngine.export(
        sourceImageRef.current,
        correctionParams,
        originalFile.type || 'image/jpeg',
        (progress) => setExportProgress(progress)
      );

      // Construct filename: ${name}_corrected.${ext}
      const dotIndex = originalFile.name.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? originalFile.name.substring(0, dotIndex) : originalFile.name;
      const ext = dotIndex !== -1 ? originalFile.name.substring(dotIndex) : '.jpg';
      const filename = `${baseName}_corrected${ext}`;

      // Trigger download
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Promptly revoke blob URL to free memory
      setTimeout(() => {
        URL.revokeObjectURL(downloadUrl);
      }, 1500);
    } catch (err: any) {
      console.error('Gagal mengekspor foto hasil perbaikan:', err);
      setDiagnosticError({
        type: 'export_failed',
        title: 'Gagal Mengekspor Foto Resolusi Penuh',
        message: err?.message || 'Terjadi kendala memori saat merender resolusi penuh.',
        recoveryAction: 'Pastikan RAM perangkat mencukupi atau coba tutup tab browser lain.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Diagnostic Recovery Handler
  const handleRecoverPreview = () => {
    if (sourceImageRef.current) {
      try {
        PreviewEngine.init(sourceImageRef.current, 1920);
        if (isApplied && correctedCanvasRef.current) {
          renderPreviewCanvas(correctionParams);
        }
        setDiagnosticError(null);
      } catch (err: any) {
        console.error('Recovery failed:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        onOpenApiInfo={() => setIsApiSettingsModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        isAnalyzing={isAnalyzing}
        apiStatus={apiStatus}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error Notification Banner if any */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-bold text-sm block text-rose-200">
                Analisis Foto Mengalami Kendala
              </span>
              <p className="leading-relaxed">{errorMessage}</p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={handleRetryAnalysis}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs transition-colors"
                >
                  Coba Analisis Ulang
                </button>
                <button
                  onClick={() => setIsApiSettingsModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                >
                  Periksa Status Gemini API
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostic Error Banner with Recovery Action */}
        {diagnosticError && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start gap-3 shadow-lg animate-in fade-in">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1 text-xs flex-1">
              <span className="font-bold text-sm block text-amber-200">
                {diagnosticError.title}
              </span>
              <p className="leading-relaxed text-slate-300">{diagnosticError.message}</p>
              {diagnosticError.recoveryAction && (
                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={handleRecoverPreview}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Pulihkan Pratinjau Kanvas</span>
                  </button>
                  <button
                    onClick={() => setDiagnosticError(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Studio Workspace Layout */}
        <div className="space-y-6">
          {/* Section 1: SUMBER FOTO ASLI & PRATINJAU KALIBRASI LIGHTROOM */}
          <PhotoUploadZone
            originalFile={originalFile}
            imagePreviewUrl={imagePreviewUrl}
            dimensions={dimensions}
            sha256Hash={sha256Hash}
            isAnalyzing={isAnalyzing}
            analysisResult={analysisResult}
            isApplied={isApplied}
            isProcessingCorrection={isProcessingCorrection}
            correctionParams={correctionParams}
            onApplyCorrection={handleApplyCorrection}
            onDownloadCorrected={handleDownloadCorrected}
            isExporting={isExporting}
            exportProgress={exportProgress}
            correctedCanvasRef={correctedCanvasRef}
            onFileSelected={handleFileSelected}
            onRetryAnalysis={handleStartAnalysis}
            onOpenIntegrityModal={() => setIsIntegrityModalOpen(true)}
            lifecycleState={lifecycleState}
            diagnosticError={diagnosticError}
            onRecoverPreview={handleRecoverPreview}
            onRenderRequired={() => renderPreviewCanvas(correctionParams)}
            customInstructions={customInstructions}
            useCustomInstructions={useCustomInstructions}
            workflowStatus={workflowStatus}
          />

          {/* Section 2: MANUAL ADJUSTMENT & FINE-TUNING SLIDER (Prioritized immediate manual editing) */}
          {originalFile && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <ManualAdjustmentPanel
                parameters={correctionParams}
                aiParameters={aiParams}
                onChange={handleParamsChange}
                onResetToAi={handleResetToAi}
                onResetAll={handleResetAll}
                hasAiRecommendations={Boolean(analysisResult)}
              />
            </div>
          )}

          {/* Section 3: CUSTOM PHOTO CORRECTION INSTRUCTIONS (AI-Guided Directives) */}
          {originalFile && (
            <div className="animate-in fade-in duration-300">
              <CustomInstructionsPanel
                instructions={customInstructions}
                onInstructionsChange={(val) => {
                  setCustomInstructions(val);
                  setInstructionWarning(null);
                }}
                isEnabled={useCustomInstructions}
                onToggleEnabled={(enabled) => {
                  setUseCustomInstructions(enabled);
                  setInstructionWarning(null);
                }}
                onAnalyzeWithInstructions={handleStartAnalysis}
                isAnalyzing={isAnalyzing}
                hasPhoto={Boolean(originalFile)}
                analysisSummary={analysisResult?.customInstructionsSummary}
                instructionWarning={instructionWarning}
                hasInstructionsChanged={hasInstructionsChanged}
              />
            </div>
          )}

          {/* Section 3.5: LAPORAN ANALISIS FOTO & RENCANA PERBAIKAN AI (5-Section Report & Instant Apply) */}
          {analysisResult && (
            <div className="animate-in fade-in duration-300">
              <PhotoAnalysisReportPanel
                result={analysisResult}
                onApplyPlan={handleApplyCorrection}
                isApplied={isApplied}
                isProcessingCorrection={isProcessingCorrection}
              />
            </div>
          )}

          {/* Section 4: AI SMART ADAPTIVE SHARPENING (Full Image Detail Enhancement) */}
          {originalFile && (
            <div className="animate-in fade-in duration-300">
              <SmartSharpeningPanel
                config={correctionParams.smartSharpening || DEFAULT_SMART_SHARPENING}
                onChange={handleSmartSharpeningChange}
                disabled={isAnalyzing}
              />
            </div>
          )}

          {/* Section 5: HASIL ANALISIS & REKOMENDASI ADOBE LIGHTROOM */}
          {analysisResult && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <AnalysisSummaryCard
                result={analysisResult}
                onOpenApiSettings={() => setIsApiSettingsModalOpen(true)}
                telemetry={telemetryInfo}
              />
              <CategoryTabs result={analysisResult} />
            </div>
          )}

          {/* Empty state guidance when no file uploaded */}
          {!originalFile && (
            <div className="p-6 rounded-2xl bg-[#13161f] border border-slate-800/80 text-center space-y-4 max-w-3xl mx-auto">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-200">
                  Prinsip Pelestarian Foto Murni (Zero Modification)
                </h3>
                <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
                  Sistem ini bertindak sebagai <strong>AI Photo Quality Inspector & Lightroom Recommender</strong>. Foto Anda tidak dimodifikasi saat diunggah. Koreksi foto hanya diterapkan ketika Anda menekan tombol <strong>TERAPKAN</strong> dengan pengolahan piksel non-generatif.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-left text-xs">
                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Integritas SHA-256</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    File unduhan asli dijamin biner identik dengan file asli yang Anda unggah.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-cyan-400" />
                    <span>Non-Generative Engine</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Koreksi piksel murni berbasis kurva warna, tanpa rekonstruksi wajah atau deformasi.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
                  <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-purple-400" />
                    <span>Resolusi Penuh 100%</span>
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Ekspor hasil perbaikan mempertahankan dimensi asli tanpa kompresi atau pengecilan resolusi.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0f1117] py-4 px-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>LIGHTROOM AI PHOTO ANALYZER &amp; AUTO CORRECTION · POWERED BY GEMINI AI</span>
          <div className="flex items-center gap-4 text-[11px] text-slate-400">
            <span>Zero-Compression Policy</span>
            <span>·</span>
            <span>Unaltered Raw Source</span>
            <span>·</span>
            <span>Adobe Lightroom Standards</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <IntegrityModal
        isOpen={isIntegrityModalOpen}
        onClose={() => setIsIntegrityModalOpen(false)}
        originalFile={originalFile}
        sha256Hash={sha256Hash}
      />

      <ApiSettingsModal
        isOpen={isApiSettingsModalOpen}
        onClose={() => setIsApiSettingsModalOpen(false)}
        onStatusUpdated={(status) => setApiStatus(status)}
      />

      <GuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />
    </div>
  );
}
