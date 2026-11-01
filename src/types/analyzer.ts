/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ImageLifecycleState =
  | 'idle'
  | 'uploading'
  | 'validating'
  | 'decoding'
  | 'preview_ready'
  | 'analyzing'
  | 'ready'
  | 'error';

export interface DiagnosticError {
  type: 'canvas_render_error' | 'image_load_failed' | 'out_of_memory' | 'invalid_dimensions' | 'export_failed';
  title: string;
  message: string;
  recoveryAction?: string;
  timestamp: string;
}

export type ParameterStatus = 'TOO_LOW' | 'TOO_HIGH' | 'NORMAL' | 'NOT_DETECTABLE';
export type AdjustmentDirection = 'INCREASE' | 'DECREASE' | 'HOLD';

export type ApiConnectionStatus = 
  | 'connected'           // API Terhubung (Hijau)
  | 'not_configured'      // API Belum Dikonfigurasi (Kuning)
  | 'invalid_key'         // API Key Tidak Valid (Merah)
  | 'connection_error'    // Koneksi Bermasalah (Merah)
  | 'quota_exceeded'      // Kuota API Habis (Kuning/Merah)
  | 'server_unavailable'; // Server Tidak Tersedia (Merah)

export interface ApiStatusInfo {
  status: ApiConnectionStatus;
  statusMessage: string;
  hasApiKey: boolean;
  maskedKey?: string;
  provider: string;
  model: string;
  mode: string;
  lastChecked: string | null;
  errorDetails?: string | null;
}

export interface SmartSharpeningConfig {
  enabled: boolean;
  preset: 25 | 40 | 60 | 80 | null; // Selected quick preset or custom
  amount: number;             // 0 to 100 (%)
  radius: number;             // 0.5 to 3.0 (px)
  detail: number;             // 0 to 100 (%)
  masking: number;            // 0 to 100 (%)
  noiseSuppression: number;   // 0 to 100 (%)
  texturePreservation: number;// 0 to 100 (%)
  edgePreservation: number;   // 0 to 100 (%)
  haloSuppression: number;    // 0 to 100 (%)
}

export const DEFAULT_SMART_SHARPENING: SmartSharpeningConfig = {
  enabled: true,
  preset: 40,
  amount: 40,
  radius: 1.0,
  detail: 50,
  masking: 60,
  noiseSuppression: 35,
  texturePreservation: 75,
  edgePreservation: 70,
  haloSuppression: 80
};

export interface CorrectionParameters {
  exposure: number;       // -5.00 to +5.00 EV
  brightness: number;     // -100 to +100
  contrast: number;       // -100 to +100
  highlights: number;     // -100 to +100
  shadows: number;        // -100 to +100
  whites: number;         // -100 to +100
  blacks: number;         // -100 to +100
  temperature: number;    // -100 to +100
  tint: number;           // -100 to +100
  vibrance: number;       // -100 to +100
  saturation: number;     // -100 to +100
  texture: number;        // -100 to +100
  clarity: number;        // -100 to +100
  sharpness: number;      // 0 to 100
  noiseReduction: number; // 0 to 100

  // AI Smart Adaptive Sharpening (Full Image Intelligent Detail Enhancement)
  smartSharpening?: SmartSharpeningConfig;
}

export const DEFAULT_CORRECTION_PARAMETERS: CorrectionParameters = {
  exposure: 0,
  brightness: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  whites: 0,
  blacks: 0,
  temperature: 0,
  tint: 0,
  vibrance: 0,
  saturation: 0,
  texture: 0,
  clarity: 0,
  sharpness: 0,
  noiseReduction: 0,
  smartSharpening: DEFAULT_SMART_SHARPENING
};

export interface LightroomParameter {
  parameterName: string;
  category: 'light' | 'color' | 'effects' | 'detail';
  status: ParameterStatus;
  currentCondition: string;
  currentValue?: number | string | null;
  recommendedValue: number | string;
  unit?: string;
  adjustmentDirection: AdjustmentDirection;
  adjustmentRequired: boolean;
  reason: string;
  confidence: number; // 0.0 - 1.0
  typicalRange?: string; // e.g. "-5.00 to +5.00 EV", "-100 to +100"
}

export interface HSLChannel {
  channel: 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Aqua' | 'Blue' | 'Purple' | 'Magenta';
  hue: LightroomParameter;
  saturation: LightroomParameter;
  luminance: LightroomParameter;
}

export interface ColorGradingZone {
  hue: LightroomParameter;
  saturation: LightroomParameter;
  luminance: LightroomParameter;
}

export interface DetectedDefect {
  issue: string;
  description: string;
  priority: 'Tinggi' | 'Sedang' | 'Rendah';
  affectedArea: string;
}

export interface UserDirectiveInterpretation {
  summary: string;
  visualGoals: string[];
  relatedParameters: string[];
  priorityAreas: string[];
  unapplicableDirectives?: string;
}

export interface PhotoAnalysisReport {
  // A. HASIL YANG DIDAPAT DARI ANALISIS
  sectionA_actualObservation: string;
  // B. KEKURANGAN FOTO
  sectionB_detectedDefects: DetectedDefect[];
  // C. INTERPRETASI INSTRUKSI PENGGUNA
  sectionC_userDirectiveInterpretation: UserDirectiveInterpretation;
  // D. RENCANA PERBAIKAN AI
  sectionD_aiCorrectionPlan: string[];
  // E. HASIL VISUAL YANG DIHARAPKAN
  sectionE_expectedVisualOutcome: string;
}

export interface CustomInstructionsSummary {
  enabled: boolean;
  instructionGiven?: string;
  appliedSuccessfully: boolean;
  priorityObjectives: string[];
  alignmentNote: string;
}

export interface PhotoAnalysisResult {
  analysisTimestamp: string;
  model?: string;
  modelUsed?: string;
  customInstructionsSummary?: CustomInstructionsSummary;
  photoAnalysisReport?: PhotoAnalysisReport;
  analysis?: {
    exposure?: { status: string; recommended_value: number; reason: string };
    contrast?: { status: string; recommended_value: number; reason: string };
    highlights?: { status: string; recommended_value: number; reason: string };
    shadows?: { status: string; recommended_value: number; reason: string };
    [key: string]: any;
  };
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  sha256Hash: string;
  
  overallQuality: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Perlu Perbaikan Signifikan';
  technicalSummary: string;
  
  detectedIssues: {
    category: 'Pencahayaan' | 'Warna' | 'Efek' | 'Detail';
    severity: 'critical' | 'moderate' | 'minor';
    description: string;
    affectedAreas: string;
  }[];
  
  optimalParametersCount: number;
  needsAdjustmentCount: number;

  adjustments: {
    light: {
      exposure: LightroomParameter;
      contrast: LightroomParameter;
      highlights: LightroomParameter;
      shadows: LightroomParameter;
      whites: LightroomParameter;
      blacks: LightroomParameter;
      autoTone: LightroomParameter;
      toneCurve: LightroomParameter;
      parametricCurve: LightroomParameter;
      pointCurve: LightroomParameter;
      rgbCurveRed: LightroomParameter;
      rgbCurveGreen: LightroomParameter;
      rgbCurveBlue: LightroomParameter;
    };
    color: {
      temperature: LightroomParameter;
      tint: LightroomParameter;
      vibrance: LightroomParameter;
      saturation: LightroomParameter;
      hslMixer: HSLChannel[];
      pointColor: {
        colorSelection: string;
        hue: LightroomParameter;
        saturation: LightroomParameter;
        luminance: LightroomParameter;
        colorRange: LightroomParameter;
      };
      colorGrading: {
        shadows: ColorGradingZone;
        midtones: ColorGradingZone;
        highlights: ColorGradingZone;
        global: ColorGradingZone;
        blending: LightroomParameter;
        balance: LightroomParameter;
      };
    };
    effects: {
      texture: LightroomParameter;
      clarity: LightroomParameter;
      dehaze: LightroomParameter;
      vignette: LightroomParameter;
      grain: LightroomParameter;
      grainSize: LightroomParameter;
      grainRoughness: LightroomParameter;
    };
    detail: {
      sharpening: LightroomParameter;
      radius: LightroomParameter;
      detail: LightroomParameter;
      masking: LightroomParameter;
      noiseReduction: LightroomParameter;
      luminance: LightroomParameter;
      luminanceDetail: LightroomParameter;
      luminanceContrast: LightroomParameter;
      colorNoiseReduction: LightroomParameter;
      colorDetail: LightroomParameter;
      colorSmoothness: LightroomParameter;
    };
  };
  
  preservation: {
    originalImageUnchanged: boolean;
    faceModificationAllowed: boolean;
    skinModificationAllowed: boolean;
    generativeEditingAllowed: boolean;
    zeroCompressionVerified: boolean;
    statement: string;
  };
  engineUsed?: string;
  quotaNotice?: string;
}
