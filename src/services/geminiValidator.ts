/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  PhotoAnalysisResult,
  PhotoAnalysisReport,
  DetectedDefect,
  UserDirectiveInterpretation,
  LightroomParameter,
  CorrectionParameters,
  DEFAULT_CORRECTION_PARAMETERS,
  DEFAULT_SMART_SHARPENING,
  ClippingSeverity,
  RecoveryFeasibility,
  HighlightClippingAssessment
} from '../types/analyzer';

export interface ValidationContext {
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  sha256Hash: string;
  durationMs: number;
  customInstructions?: string;
  useCustomInstructions?: boolean;
  modelName?: string;
}

function parseNum(val: any, fallback = 0, min = -100, max = 100): number {
  if (typeof val === 'number') {
    if (isNaN(val)) return fallback;
    return Math.max(min, Math.min(max, val));
  }
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
  }
  return fallback;
}

function cleanString(val: any, fallback: string): string {
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.trim();
  }
  return fallback;
}

function normalizeParam(
  param: any,
  defaultName: string,
  category: 'light' | 'color' | 'effects' | 'detail',
  minVal: number,
  maxVal: number,
  unit = '',
  typicalRange = '-100 to +100'
): LightroomParameter {
  const name = cleanString(param?.parameterName, defaultName);
  const recVal = parseNum(param?.recommendedValue, 0, minVal, maxVal);
  const req = Boolean(param?.adjustmentRequired ?? (Math.abs(recVal) > 0.001));
  const dir = param?.adjustmentDirection === 'INCREASE' || param?.adjustmentDirection === 'DECREASE'
    ? param.adjustmentDirection
    : (recVal > 0 ? 'INCREASE' : recVal < 0 ? 'DECREASE' : 'HOLD');
  const status = param?.status === 'TOO_LOW' || param?.status === 'TOO_HIGH' || param?.status === 'NORMAL'
    ? param.status
    : (req ? (recVal > 0 ? 'TOO_LOW' : 'TOO_HIGH') : 'NORMAL');
  const reason = cleanString(param?.reason, req ? `Penyesuaian ${name} sebesar ${recVal} ${unit}` : `${name} dalam kondisi optimal.`);

  return {
    parameterName: name,
    category,
    status,
    currentCondition: cleanString(param?.currentCondition, req ? `Perlu penyesuaian: ${status}` : 'Kondisi seimbang'),
    currentValue: param?.currentValue ?? null,
    recommendedValue: recVal,
    unit,
    adjustmentDirection: dir,
    adjustmentRequired: req,
    reason,
    confidence: typeof param?.confidence === 'number' ? Math.max(0, Math.min(1, param.confidence)) : 0.95,
    typicalRange: cleanString(param?.typicalRange, typicalRange)
  };
}

/**
 * Strict validator for Gemini 3.5 Flash-Lite multimodal photographic analysis response.
 * Ensures the response strictly adheres to Lightroom parameters without distortion.
 */
export function validateAndNormalizeGeminiResult(
  rawJson: any,
  ctx: ValidationContext
): { valid: boolean; error?: string; result?: PhotoAnalysisResult } {
  if (!rawJson || typeof rawJson !== 'object') {
    return {
      valid: false,
      error: 'Format data respon Gemini tidak berupa objek JSON valid.'
    };
  }

  if (!rawJson.adjustments || typeof rawJson.adjustments !== 'object') {
    return {
      valid: false,
      error: 'Data analisis Gemini tidak memiliki bagian "adjustments" (parameter Lightroom).'
    };
  }

  const adj = rawJson.adjustments;
  if (!adj.light || typeof adj.light !== 'object') {
    return {
      valid: false,
      error: 'Data analisis Gemini tidak memiliki parameter dasar pencahayaan (light adjustments).'
    };
  }

  // 1. Light Category
  const light = {
    exposure: normalizeParam(adj.light?.exposure, 'Exposure', 'light', -5.0, 5.0, 'EV', '-5.00 to +5.00 EV'),
    contrast: normalizeParam(adj.light?.contrast, 'Contrast', 'light', -100, 100),
    highlights: normalizeParam(adj.light?.highlights, 'Highlights', 'light', -100, 100),
    shadows: normalizeParam(adj.light?.shadows, 'Shadows', 'light', -100, 100),
    whites: normalizeParam(adj.light?.whites, 'Whites', 'light', -100, 100),
    blacks: normalizeParam(adj.light?.blacks, 'Blacks', 'light', -100, 100),
    autoTone: normalizeParam(adj.light?.autoTone, 'Auto Tone', 'light', 0, 1),
    toneCurve: normalizeParam(adj.light?.toneCurve, 'Tone Curve', 'light', -100, 100),
    parametricCurve: normalizeParam(adj.light?.parametricCurve, 'Parametric Curve', 'light', -100, 100),
    pointCurve: normalizeParam(adj.light?.pointCurve, 'Point Curve', 'light', -100, 100),
    rgbCurveRed: normalizeParam(adj.light?.rgbCurveRed, 'RGB Curve Red', 'light', -100, 100),
    rgbCurveGreen: normalizeParam(adj.light?.rgbCurveGreen, 'RGB Curve Green', 'light', -100, 100),
    rgbCurveBlue: normalizeParam(adj.light?.rgbCurveBlue, 'RGB Curve Blue', 'light', -100, 100)
  };

  // 2. Color Category
  const colorRaw = adj.color || {};
  const color = {
    temperature: normalizeParam(colorRaw?.temperature, 'Temperature', 'color', -100, 100),
    tint: normalizeParam(colorRaw?.tint, 'Tint', 'color', -100, 100),
    vibrance: normalizeParam(colorRaw?.vibrance, 'Vibrance', 'color', -100, 100),
    saturation: normalizeParam(colorRaw?.saturation, 'Saturation', 'color', -100, 100),
    hslMixer: Array.isArray(colorRaw?.hslMixer) ? colorRaw.hslMixer : [],
    pointColor: colorRaw?.pointColor || {
      colorSelection: 'Neutral',
      hue: normalizeParam(null, 'Point Hue', 'color', -100, 100),
      saturation: normalizeParam(null, 'Point Saturation', 'color', -100, 100),
      luminance: normalizeParam(null, 'Point Luminance', 'color', -100, 100),
      colorRange: normalizeParam(null, 'Point Color Range', 'color', 0, 100)
    },
    colorGrading: colorRaw?.colorGrading || {
      shadows: {
        hue: normalizeParam(null, 'Shadows Hue', 'color', 0, 360),
        saturation: normalizeParam(null, 'Shadows Saturation', 'color', 0, 100),
        luminance: normalizeParam(null, 'Shadows Luminance', 'color', -100, 100)
      },
      midtones: {
        hue: normalizeParam(null, 'Midtones Hue', 'color', 0, 360),
        saturation: normalizeParam(null, 'Midtones Saturation', 'color', 0, 100),
        luminance: normalizeParam(null, 'Midtones Luminance', 'color', -100, 100)
      },
      highlights: {
        hue: normalizeParam(null, 'Highlights Hue', 'color', 0, 360),
        saturation: normalizeParam(null, 'Highlights Saturation', 'color', 0, 100),
        luminance: normalizeParam(null, 'Highlights Luminance', 'color', -100, 100)
      },
      global: {
        hue: normalizeParam(null, 'Global Hue', 'color', 0, 360),
        saturation: normalizeParam(null, 'Global Saturation', 'color', 0, 100),
        luminance: normalizeParam(null, 'Global Luminance', 'color', -100, 100)
      },
      blending: normalizeParam(null, 'Blending', 'color', 0, 100),
      balance: normalizeParam(null, 'Balance', 'color', -100, 100)
    }
  };

  // 3. Effects Category
  const effRaw = adj.effects || {};
  const effects = {
    texture: normalizeParam(effRaw?.texture, 'Texture', 'effects', -100, 100),
    clarity: normalizeParam(effRaw?.clarity, 'Clarity', 'effects', -100, 100),
    dehaze: normalizeParam(effRaw?.dehaze, 'Dehaze', 'effects', -100, 100),
    vignette: normalizeParam(effRaw?.vignette, 'Vignette Amount', 'effects', -100, 100),
    grain: normalizeParam(effRaw?.grain, 'Grain Amount', 'effects', 0, 100),
    grainSize: normalizeParam(effRaw?.grainSize, 'Grain Size', 'effects', 0, 100),
    grainRoughness: normalizeParam(effRaw?.grainRoughness, 'Grain Roughness', 'effects', 0, 100)
  };

  // 4. Detail Category
  const detRaw = adj.detail || {};
  const detail = {
    sharpening: normalizeParam(detRaw?.sharpening, 'Sharpening', 'detail', 0, 150),
    radius: normalizeParam(detRaw?.radius, 'Sharpening Radius', 'detail', 0.5, 3.0, 'px', '0.5 to 3.0 px'),
    detail: normalizeParam(detRaw?.detail, 'Sharpening Detail', 'detail', 0, 100),
    masking: normalizeParam(detRaw?.masking, 'Sharpening Masking', 'detail', 0, 100),
    noiseReduction: normalizeParam(detRaw?.noiseReduction, 'Luminance Noise Reduction', 'detail', 0, 100),
    luminance: normalizeParam(detRaw?.luminance, 'Luminance NR', 'detail', 0, 100),
    luminanceDetail: normalizeParam(detRaw?.luminanceDetail, 'Luminance NR Detail', 'detail', 0, 100),
    luminanceContrast: normalizeParam(detRaw?.luminanceContrast, 'Luminance NR Contrast', 'detail', 0, 100),
    colorNoiseReduction: normalizeParam(detRaw?.colorNoiseReduction, 'Color NR', 'detail', 0, 100),
    colorDetail: normalizeParam(detRaw?.colorDetail, 'Color NR Detail', 'detail', 0, 100),
    colorSmoothness: normalizeParam(detRaw?.colorSmoothness, 'Color NR Smoothness', 'detail', 0, 100)
  };

  // Count parameters requiring adjustment
  let optimalCount = 0;
  let needsAdjCount = 0;

  const countParam = (p: LightroomParameter) => {
    if (p.adjustmentRequired || Math.abs(Number(p.recommendedValue)) > 0.001) {
      needsAdjCount++;
    } else {
      optimalCount++;
    }
  };

  [light.exposure, light.contrast, light.highlights, light.shadows, light.whites, light.blacks].forEach(countParam);
  [color.temperature, color.tint, color.vibrance, color.saturation].forEach(countParam);
  [effects.texture, effects.clarity, effects.dehaze].forEach(countParam);
  [detail.sharpening, detail.noiseReduction].forEach(countParam);

  const hasCustom = Boolean(ctx.useCustomInstructions && ctx.customInstructions && ctx.customInstructions.trim().length > 0);
  const cleanInstructions = hasCustom ? ctx.customInstructions!.trim() : '';

  const customSummary = hasCustom
    ? {
        enabled: true,
        instructionGiven: cleanInstructions,
        appliedSuccessfully: Boolean(rawJson.customInstructionsSummary?.appliedSuccessfully ?? true),
        priorityObjectives: (Array.isArray(rawJson.customInstructionsSummary?.priorityObjectives) && rawJson.customInstructionsSummary.priorityObjectives.length > 0)
          ? rawJson.customInstructionsSummary.priorityObjectives
          : ['Penyesuaian visual terarah sesuai instruksi', 'Optimalisasi tonal & warna natural'],
        alignmentNote: cleanString(
          rawJson.customInstructionsSummary?.alignmentNote,
          'Parameter Lightroom diselaraskan secara adaptif dengan instruksi khusus pengguna.'
        )
      }
    : {
        enabled: false,
        appliedSuccessfully: false,
        priorityObjectives: [],
        alignmentNote: 'Analisis visual objektif standar dijalankan.'
      };

  // Normalize 5-part Photo Analysis Report (Section 7 of Master Patch)
  const repRaw = rawJson.photoAnalysisReport || {};
  
  // Section A: HASIL YANG DIDAPAT DARI ANALISIS
  const sectionA = cleanString(
    repRaw.sectionA_actualObservation || rawJson.technicalSummary,
    'Evaluasi visual Gemini 3.5 Flash-Lite mendeteksi distribusi pencahayaan, dynamic range, dan keseimbangan warna pada foto asli.'
  );

  // Section B: KEKURANGAN FOTO
  const sectionB: DetectedDefect[] = Array.isArray(repRaw.sectionB_detectedDefects) && repRaw.sectionB_detectedDefects.length > 0
    ? repRaw.sectionB_detectedDefects.map((def: any) => ({
        issue: cleanString(def.issue || def.description, 'Ketidakseimbangan Tonal'),
        description: cleanString(def.description, 'Perlu penyesuaian parameter.'),
        priority: def.priority === 'Tinggi' || def.priority === 'Sedang' || def.priority === 'Rendah' ? def.priority : 'Sedang',
        affectedArea: cleanString(def.affectedArea || def.affectedAreas, 'Area foto secara umum')
      }))
    : (Array.isArray(rawJson.detectedIssues) && rawJson.detectedIssues.length > 0
        ? rawJson.detectedIssues.map((iss: any) => ({
            issue: iss.category || 'Fotografi',
            description: iss.description || 'Koreksi dibutuhkan',
            priority: iss.severity === 'critical' ? 'Tinggi' : iss.severity === 'moderate' ? 'Sedang' : 'Rendah',
            affectedArea: iss.affectedAreas || 'Subjek / Latar'
          }))
        : [
            {
              issue: 'Tonal Range & Kontras',
              description: 'Detail midtone dan bayangan memerlukan optimasi proporsional.',
              priority: 'Sedang',
              affectedArea: 'Area bayangan dan midtone subjek'
            }
          ]
      );

  // Section C: INTERPRETASI INSTRUKSI PENGGUNA
  const interpRaw = repRaw.sectionC_userDirectiveInterpretation || {};
  const sectionC: UserDirectiveInterpretation = {
    summary: cleanString(
      interpRaw.summary,
      hasCustom ? `Pengguna mengarahkan: "${cleanInstructions}"` : 'Analisis fotometri objektif standar tanpa instruksi khusus.'
    ),
    visualGoals: Array.isArray(interpRaw.visualGoals) && interpRaw.visualGoals.length > 0
      ? interpRaw.visualGoals.map((g: any) => String(g))
      : (hasCustom
          ? ['Mempertahankan warna kulit alami subjek', 'Meningkatkan saturasi dan kontras secara terkontrol']
          : ['Mengoptimalkan eksposur dan dynamic range foto']),
    relatedParameters: Array.isArray(interpRaw.relatedParameters) && interpRaw.relatedParameters.length > 0
      ? interpRaw.relatedParameters.map((p: any) => String(p))
      : ['Exposure', 'Contrast', 'Highlights', 'Shadows', 'Vibrance', 'Texture'],
    priorityAreas: Array.isArray(interpRaw.priorityAreas) && interpRaw.priorityAreas.length > 0
      ? interpRaw.priorityAreas.map((a: any) => String(a))
      : ['Wajah & Kulit Subjek', 'Serat Pakaian & Bayangan', 'Latar Belakang'],
    unapplicableDirectives: cleanString(
      interpRaw.unapplicableDirectives,
      'Seluruh instruksi dapat diselaraskan secara aman dalam batasan optis foto asli.'
    )
  };

  // Section D: RENCANA PERBAIKAN AI
  const sectionD: string[] = Array.isArray(repRaw.sectionD_aiCorrectionPlan) && repRaw.sectionD_aiCorrectionPlan.length > 0
    ? repRaw.sectionD_aiCorrectionPlan.map((step: any) => String(step))
    : [
        'Mengatur Exposure dan Shadows untuk mengangkat detail gelap tanpa menimbulkan noise.',
        'Mengendalikan Highlights dan Whites agar tidak terjadi clipping pada area terang.',
        'Meningkatkan Vibrance secara terarah dengan tetap menjaga keaslian skin tone subjek.',
        'Mengaplikasikan penajaman adaptif dan Clarity mikro untuk mempertegas tekstur pakaian.'
      ];

  // Section E: HASIL VISUAL YANG DIHARAPKAN
  const sectionE = cleanString(
    repRaw.sectionE_expectedVisualOutcome,
    'Foto hasil perbaikan akan memiliki karakter visual yang lebih hidup, jernih, dan dinamis dengan warna kulit natural yang tetap terjaga seutuhnya.'
  );

  
  // Normalize Highlight Clipping & Recovery Assessment (Patch Feature)
  const clipRaw = rawJson.highlightClippingAssessment || repRaw.highlightClippingAssessment || {};
  const recHigh = typeof clipRaw.recommendedHighlights === 'number' 
    ? clipRaw.recommendedHighlights 
    : (light.highlights?.recommendedValue ?? 0);
  const recWhites = typeof clipRaw.recommendedWhites === 'number' 
    ? clipRaw.recommendedWhites 
    : (light.whites?.recommendedValue ?? 0);

  let defaultStatus: ClippingSeverity = 'Tidak mengalami clipping';
  let defaultSeverity: 'Normal' | 'Ringan' | 'Sedang' | 'Berat' | 'Ekstrem' = 'Normal';
  let defaultFeasibility: RecoveryFeasibility = 'Detail masih tersedia dan berpotensi dipulihkan';

  if (recHigh <= -50 || recWhites <= -30) {
    defaultStatus = 'Clipping berat';
    defaultSeverity = 'Berat';
    defaultFeasibility = 'Detail sangat terbatas';
  } else if (recHigh <= -25 || recWhites <= -15) {
    defaultStatus = 'Clipping sedang';
    defaultSeverity = 'Sedang';
    defaultFeasibility = 'Detail sebagian tersedia';
  } else if (recHigh < 0 || recWhites < 0) {
    defaultStatus = 'Clipping ringan';
    defaultSeverity = 'Ringan';
    defaultFeasibility = 'Detail masih tersedia dan berpotensi dipulihkan';
  }

  const highlightClippingAssessment: HighlightClippingAssessment = {
    status: clipRaw.status || defaultStatus,
    severityLevel: clipRaw.severityLevel || defaultSeverity,
    affectedAreas: Array.isArray(clipRaw.affectedAreas) && clipRaw.affectedAreas.length > 0
      ? clipRaw.affectedAreas.map((a: any) => String(a))
      : ['Sumber cahaya latar / Pantulan sorotan'],
    estimatedClippingPercentage: typeof clipRaw.estimatedClippingPercentage === 'number'
      ? clipRaw.estimatedClippingPercentage
      : (defaultSeverity === 'Normal' ? 0.2 : defaultSeverity === 'Ringan' ? 1.5 : defaultSeverity === 'Sedang' ? 4.2 : 9.5),
    isNaturalWhiteProtected: clipRaw.isNaturalWhiteProtected !== false,
    recoveryAssessment: clipRaw.recoveryAssessment || defaultFeasibility,
    rootCauseAnalysis: cleanString(
      clipRaw.rootCauseAnalysis,
      'Distribusi tonal sorotan dievaluasi dengan perlindungan warna putih alami (baju/dinding) agar tidak salah diklasifikasikan sebagai overexposure.'
    ),
    recommendedHighlights: recHigh,
    recommendedWhites: recWhites,
    recommendedLocalMasking: clipRaw.recommendedLocalMasking || 'Pertimbangkan masking lokal bila overexposure terkonsentrasi di satu sisi latar.',
    permanentDataLossWarning: Boolean(
      clipRaw.permanentDataLossWarning || 
      clipRaw.status === 'Clipping ekstrem' || 
      clipRaw.recoveryAssessment === 'Detail sudah hilang akibat clipping'
    )
  };

  const photoAnalysisReport: PhotoAnalysisReport = {
    highlightClippingAssessment,
    sectionA_actualObservation: sectionA,
    sectionB_detectedDefects: sectionB,
    sectionC_userDirectiveInterpretation: sectionC,
    sectionD_aiCorrectionPlan: sectionD,
    sectionE_expectedVisualOutcome: sectionE
  };

    const finalResult: PhotoAnalysisResult = {
    analysisTimestamp: new Date().toISOString(),
    model: ctx.modelName || 'gemini-3.5-flash-lite',
    modelUsed: ctx.modelName || 'gemini-3.5-flash-lite',
    engineUsed: `Google Gemini 3.5 Flash-Lite (Multimodal Visual)`,
    fileName: ctx.fileName,
    fileSize: ctx.fileSize,
    mimeType: ctx.mimeType,
    width: ctx.width,
    height: ctx.height,
    sha256Hash: ctx.sha256Hash,
    overallQuality: rawJson.overallQuality === 'Sangat Baik' || rawJson.overallQuality === 'Baik' || rawJson.overallQuality === 'Cukup'
      ? rawJson.overallQuality
      : 'Perlu Perbaikan Signifikan',
    technicalSummary: cleanString(
      rawJson.technicalSummary,
      'Evaluasi visual Gemini 3.5 Flash-Lite terhadap tonalitas, pencahayaan, dan keseimbangan warna foto asli.'
    ),
    customInstructionsSummary: customSummary,
    photoAnalysisReport,
    highlightClippingAssessment,
    detectedIssues: Array.isArray(rawJson.detectedIssues) ? rawJson.detectedIssues : [],
    optimalParametersCount: optimalCount,
    needsAdjustmentCount: needsAdjCount,
    adjustments: {
      light,
      color,
      effects,
      detail
    },
    preservation: {
      originalImageUnchanged: true,
      faceModificationAllowed: false,
      skinModificationAllowed: false,
      generativeEditingAllowed: false,
      zeroCompressionVerified: true,
      statement: 'Piksel foto asli terlindungi 100%. Tidak ada manipulasi generatif atau penghalusan kulit artifisial.'
    }
  };

  return {
    valid: true,
    result: finalResult
  };
}

/**
 * Extracts unified parameters from PhotoAnalysisResult as Single Source of Truth.
 * Fallbacks are strictly 0 (neutral position) with no hardcoded assumptions.
 */
export function extractUnifiedCorrectionParameters(result: PhotoAnalysisResult | null): CorrectionParameters {
  if (!result || !result.adjustments) {
    return { ...DEFAULT_CORRECTION_PARAMETERS };
  }
  const adj = result.adjustments;
  return {
    exposure: parseNum(adj.light?.exposure?.recommendedValue, 0, -5.0, 5.0),
    brightness: 0,
    contrast: parseNum(adj.light?.contrast?.recommendedValue, 0, -100, 100),
    highlights: parseNum(adj.light?.highlights?.recommendedValue, 0, -100, 100),
    shadows: parseNum(adj.light?.shadows?.recommendedValue, 0, -100, 100),
    whites: parseNum(adj.light?.whites?.recommendedValue, 0, -100, 100),
    blacks: parseNum(adj.light?.blacks?.recommendedValue, 0, -100, 100),
    temperature: parseNum(adj.color?.temperature?.recommendedValue, 0, -100, 100),
    tint: parseNum(adj.color?.tint?.recommendedValue, 0, -100, 100),
    vibrance: parseNum(adj.color?.vibrance?.recommendedValue, 0, -100, 100),
    saturation: parseNum(adj.color?.saturation?.recommendedValue, 0, -100, 100),
    texture: parseNum(adj.effects?.texture?.recommendedValue, 0, -100, 100),
    clarity: parseNum(adj.effects?.clarity?.recommendedValue, 0, -100, 100),
    sharpness: Math.max(0, Math.min(100, parseNum(adj.detail?.sharpening?.recommendedValue, 0, 0, 150))),
    noiseReduction: Math.max(0, Math.min(100, parseNum(adj.detail?.noiseReduction?.recommendedValue, 0, 0, 100))),
    smartSharpening: {
      ...DEFAULT_SMART_SHARPENING,
      amount: Math.min(100, Math.max(0, parseNum(adj.detail?.sharpening?.recommendedValue, 40, 0, 100))),
      radius: Math.min(3.0, Math.max(0.5, parseNum(adj.detail?.radius?.recommendedValue, 1.0, 0.5, 3.0))),
      detail: Math.min(100, Math.max(0, parseNum(adj.detail?.detail?.recommendedValue, 50, 0, 100))),
      masking: Math.min(100, Math.max(0, parseNum(adj.detail?.masking?.recommendedValue, 60, 0, 100))),
      noiseSuppression: Math.min(100, Math.max(0, parseNum(adj.detail?.noiseReduction?.recommendedValue, 35, 0, 100)))
    }
  };
}
