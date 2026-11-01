/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ApiConnectionStatus, PhotoAnalysisResult } from '../types/analyzer';
import { validateAndNormalizeGeminiResult } from './geminiValidator';

export const GEMINI_STORAGE_KEY = 'LIGHTROOM_AI_GEMINI_KEY';
export const CONFIGURED_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(GEMINI_STORAGE_KEY)?.trim() || '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    localStorage.setItem(GEMINI_STORAGE_KEY, key.trim());
  } catch (err) {
    console.warn('Gagal menyimpan API Key ke localStorage:', err);
  }
}

export function removeStoredApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_STORAGE_KEY);
  } catch (err) {
    console.warn('Gagal menghapus API Key dari localStorage:', err);
  }
}

export function getMaskedKey(key?: string): string {
  if (!key || key.trim().length === 0) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 6)}••••${trimmed.slice(-4)}`;
}

/**
 * Direct client-side verification of Google Gemini API key and model availability
 */
export async function testGeminiApiKey(apiKey: string): Promise<{
  success: boolean;
  status: ApiConnectionStatus;
  message: string;
  errorDetails?: string;
}> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return {
      success: false,
      status: 'not_configured',
      message: 'API Key belum diisi.'
    };
  }

  try {
    // 1. Check models listing to verify authentication
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && Array.isArray(data.models)) {
      return {
        success: true,
        status: 'connected',
        message: `Koneksi Google Gemini API berhasil diverifikasi! Model ${CONFIGURED_GEMINI_MODEL} siap digunakan.`
      };
    }

    const errorMsg = data?.error?.message || `HTTP ${res.status}: Gagal memverifikasi API Key.`;
    if (res.status === 400 || res.status === 401 || res.status === 403 || errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API key not valid')) {
      return {
        success: false,
        status: 'invalid_key',
        message: 'API Key Tidak Valid',
        errorDetails: errorMsg
      };
    } else if (res.status === 429 || errorMsg.includes('RESOURCE_EXHAUSTED')) {
      return {
        success: false,
        status: 'quota_exceeded',
        message: 'Batas Kuota Gemini API Tercapai (429)',
        errorDetails: errorMsg
      };
    }

    return {
      success: false,
      status: 'connection_error',
      message: 'Pengujian koneksi gagal: ' + errorMsg,
      errorDetails: errorMsg
    };
  } catch (netErr: any) {
    return {
      success: false,
      status: 'connection_error',
      message: 'Koneksi ke Google API gagal: ' + (netErr?.message || 'Periksa koneksi internet Anda.'),
      errorDetails: netErr?.message
    };
  }
}

/**
 * Builds the comprehensive photographic analysis prompt for Gemini 3.5 Flash-Lite.
 */
function buildPhotographicPrompt(customInstructions?: string, hasCustom?: boolean): string {
  const customSection = hasCustom && customInstructions && customInstructions.trim().length > 0
    ? `
=======================================================================
CUSTOM PHOTO CORRECTION INSTRUCTIONS (INSTRUKSI KHUSUS DARI PENGGUNA):
=======================================================================
Pengguna memberikan preferensi pengeditan berikut untuk foto ini:
"""
${customInstructions.trim()}
"""
ATURAN ADAPTASI INSTRUKSI PENGGUNA:
1. Evaluasi kondisi visual aktual foto terlebih dahulu (apakah sudah over/under exposed, bagaimana skin tone, saturasi, dan kontras).
2. Tentukan parameter Adobe Lightroom secara adaptif untuk memenuhi instruksi pengguna TANPA merusak kualitas teknis foto.
3. KULIT NATURAL: Pertahankan warna kulit otentik subjek, jaga kanal HSL Orange & Red seimbang, DILARANG mengubah struktur wajah atau memburamkan pori-pori kulit.
4. JANGAN over-correct: Jika foto sudah cukup terang, jangan naikkan exposure secara membabi buta. Jika foto sudah tajam, batasi penambahan sharpening.
`
    : `
=======================================================================
ANALISIS FOTOMETRI STANDAR (TANPA INSTRUKSI KHUSUS):
=======================================================================
Lakukan evaluasi teknis objektif menyeluruh terhadap pencahayaan, dynamic range, white balance, tonalitas warna, dan detail foto.
`;

  return `
Anda adalah FOTOGRAFER PROFESIONAL & COLORIST SENIOR ADOBE LIGHTROOM CLASSIC.
Tugas Anda adalah melakukan ANALISIS VISUAL MULTIMODAL NYATA terhadap foto yang dilampirkan, lalu memberikan rekomendasi nilai parameter koreksi Adobe Lightroom yang presisi, adaptif, dan proporsional.


=======================================================================
SISTEM PENGAMBILAN KEPUTUSAN 7 TAHAP (ANALYSIS DECISION ENGINE):
=======================================================================
TAHAP 1 — OBJECTIVE PHOTO ANALYSIS: Identifikasi kondisi teknis aktual foto (pencahayaan, dynamic range, white balance, noise, tekstur) secara murni sebelum menerapkan preferensi.
TAHAP 2 — USER INSTRUCTION INTERPRETATION: Pahami esensi instruksi pengguna:
  * "Kulit natural dan lebih bersih": Pertahankan warna dan tekstur kulit asli 100%, hindari smoothing berlebihan, kurangi cacat optis/noise hanya jika mengganggu tanpa tekstur sintetis.
  * "Angkat saturasi": Tingkatkan vibrance terlebih dahulu secara proporsional agar tidak membakar skin tone atau menghasilkan warna neon palsu.
  * "Angkat kontras": Evaluasi highlights, shadows, whites, dan blacks secara harmonis agar tidak timbul blown-out highlights atau crushed shadows.
TAHAP 3 — GAP ANALYSIS: Bandingkan kondisi aktual foto dengan target hasil yang diinginkan pengguna.
TAHAP 4 — CORRECTION PLANNING: Rencanakan langkah-langkah perbaikan fotografis yang paling tepat dan aman.
TAHAP 5 — PARAMETER OPTIMIZATION: Hitung nilai numerik parameter Lightroom yang saling mendukung secara proporsional.
TAHAP 6 — VALIDATION: Pastikan tidak terjadi overcorrection, pemusnahan detail, atau artefak digital.
TAHAP 7 — FINAL RECOMMENDATION: Tuangkan seluruh temuan ke dalam skema JSON laporan.

ATURAN MUTLAK & PRINSIP TEKNIS:
1. ANALISIS FOTO AKTUAL: Evaluasi kondisi visual piksel gambar secara nyata (bukan simulasi atau tebakan).
2. PARAMETER HARUS PROPORSIONAL & ADAPTIF:
   - Jika suatu parameter sudah seimbang / optimal pada foto asli, TETAPKAN nilainya pada 0 (atau netral), dengan adjustmentRequired: false dan status: "NORMAL".
   - JANGAN mengubah semua parameter sekaligus jika tidak diperlukan.
   - JANGAN menaikkan exposure jika area terang sudah mendekati batas clipping highlight.
   - JANGAN mengangkat shadow secara berlebihan hingga menghasilkan noise digital atau efek washed-out.
   - JANGAN menaikkan saturasi dan vibrance secara bersamaan jika warna foto sudah cerah.
   - JANGAN mempertajam foto secara berlebihan jika ketajaman alami sudah sangat baik.
3. INTEGRITAS WAJAH & SUBJEK: Dilarang merekomendasikan penghalusan kulit artifisial, perubahan anatomi wajah, mata, hidung, atau manipulasi identitas subjek.
4. RENTANG NILAI STANDAR ADOBE LIGHTROOM:
   - Exposure: skala EV (-5.00 hingga +5.00 EV, step 0.05 / 0.10)
   - Contrast, Highlights, Shadows, Whites, Blacks: -100 hingga +100
   - Temperature, Tint, Vibrance, Saturation: -100 hingga +100
   - Texture, Clarity, Dehaze: -100 hingga +100
   - Sharpening: 0 hingga 150 (Radius 0.5..3.0, Detail 0..100, Masking 0..100)
   - Noise Reduction: 0 hingga 100

${customSection}

Berikan respon HANYA dalam format JSON valid dan terstruktur persis sesuai skema ini:
{
  "overallQuality": "Sangat Baik" | "Baik" | "Cukup" | "Perlu Perbaikan Signifikan",
  "technicalSummary": "Ringkasan kondisi pencahayaan, dynamic range, white balance, dan noise dalam 2-3 kalimat objektif berdasarkan visual foto aktual.",
  
  "photoAnalysisReport": {
    "sectionA_actualObservation": "Penjelasan kondisi aktual foto berdasarkan pengamatan visual Gemini 3.5 Flash-Lite (pencahayaan, tonal range, skin tone, dan detail)...",
    "sectionB_detectedDefects": [
      {
        "issue": "Masalah fotografi yang ditemukan (misal: Underexposed Midtones, Shadow Clipping)",
        "description": "Uraian teknis mengapa hal ini perlu diperbaiki",
        "priority": "Tinggi" | "Sedang" | "Rendah",
        "affectedArea": "Area foto yang terpengaruh"
      }
    ],
    "sectionC_userDirectiveInterpretation": {
      "summary": "Ringkasan instruksi khusus yang diminta pengguna",
      "visualGoals": ["Tujuan visual 1 yang dipahami AI", "Tujuan visual 2"],
      "relatedParameters": ["Exposure", "Contrast", "Shadows", "Vibrance"],
      "priorityAreas": ["Wajah / Kulit Subjek", "Bayangan Pakaian"],
      "unapplicableDirectives": "Catatan jika ada instruksi yang tidak dapat diterapkan secara harfiah (atau 'Seluruh instruksi dapat diterapkan secara aman')"
    },
    "sectionD_aiCorrectionPlan": [
      "Tindakan 1 yang akan dieksekusi",
      "Tindakan 2 untuk memenuhi instruksi pengguna"
    ],
    "sectionE_expectedVisualOutcome": "Deskripsi realistis karakter hasil visual akhir foto (tanpa janji palsu pemulihan detail hilang)"
  },
  "customInstructionsSummary": {
    "enabled": ${hasCustom ? 'true' : 'false'},
    "instructionGiven": ${JSON.stringify(customInstructions || '')},
    "appliedSuccessfully": true,
    "priorityObjectives": [
      "Prioritas utama yang diselaraskan ke dalam parameter",
      "Prioritas kedua yang diselaraskan"
    ],
    "alignmentNote": "Penjelasan bagaimana parameter Lightroom secara khusus merealisasikan instruksi pengguna secara visual."
  },
  "detectedIssues": [
    {
      "category": "Pencahayaan" | "Warna" | "Efek" | "Detail",
      "severity": "critical" | "moderate" | "minor",
      "description": "Deskripsi masalah visual fotografi spesifik yang ditemukan pada foto",
      "affectedAreas": "Bagian foto yang terpengaruh (misal: area bayangan pakaian, sorotan latar belakang)"
    }
  ],
  "adjustments": {
    "light": {
      "exposure": { "parameterName": "Exposure", "category": "light", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 0.35, "unit": "EV", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan fotografis spesifik...", "confidence": 0.95, "typicalRange": "-5.00 to +5.00 EV" },
      "contrast": { "parameterName": "Contrast", "category": "light", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 0, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.92, "typicalRange": "-100 to +100" },
      "highlights": { "parameterName": "Highlights", "category": "light", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": -20, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.92, "typicalRange": "-100 to +100" },
      "shadows": { "parameterName": "Shadows", "category": "light", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 25, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.92, "typicalRange": "-100 to +100" },
      "whites": { "parameterName": "Whites", "category": "light", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 10, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.90, "typicalRange": "-100 to +100" },
      "blacks": { "parameterName": "Blacks", "category": "light", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": -5, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.90, "typicalRange": "-100 to +100" }
    },
    "color": {
      "temperature": { "parameterName": "Temperature", "category": "color", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 0, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.92, "typicalRange": "-100 to +100" },
      "tint": { "parameterName": "Tint", "category": "color", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 0, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.92, "typicalRange": "-100 to +100" },
      "vibrance": { "parameterName": "Vibrance", "category": "color", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 10, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.90, "typicalRange": "-100 to +100" },
      "saturation": { "parameterName": "Saturation", "category": "color", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 0, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.90, "typicalRange": "-100 to +100" }
    },
    "effects": {
      "texture": { "parameterName": "Texture", "category": "effects", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 8, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.90, "typicalRange": "-100 to +100" },
      "clarity": { "parameterName": "Clarity", "category": "effects", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 4, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.90, "typicalRange": "-100 to +100" },
      "dehaze": { "parameterName": "Dehaze", "category": "effects", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 0, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.90, "typicalRange": "-100 to +100" }
    },
    "detail": {
      "sharpening": { "parameterName": "Sharpening", "category": "detail", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 35, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.92, "typicalRange": "0 to 150" },
      "radius": { "parameterName": "Radius", "category": "detail", "status": "NORMAL", "recommendedValue": 1.0, "unit": "px", "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "Radius standar 1.0px aman...", "confidence": 0.95, "typicalRange": "0.5 to 3.0" },
      "detail": { "parameterName": "Detail", "category": "detail", "status": "NORMAL", "recommendedValue": 50, "unit": "", "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "Detail mikro seimbang...", "confidence": 0.95, "typicalRange": "0 to 100" },
      "masking": { "parameterName": "Masking", "category": "detail", "status": "NORMAL", "recommendedValue": 60, "unit": "", "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "Melindungi area rata dari noise...", "confidence": 0.95, "typicalRange": "0 to 100" },
      "noiseReduction": { "parameterName": "Noise Reduction", "category": "detail", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL", "recommendedValue": 15, "unit": "", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "Alasan...", "confidence": 0.90, "typicalRange": "0 to 100" }
    }
  }
}
`;
}

/**
 * Direct client-side photo analysis via Google Gemini 3.5 Flash-Lite multimodal API.
 * Guaranteed to send actual image data and never perform silent fake fallback.
 */
export async function analyzePhotoWithGeminiClient(params: {
  imageBase64: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  width?: number;
  height?: number;
  sha256Hash: string;
  customInstructions: string;
  useCustomInstructions: boolean;
  apiKey: string;
  signal?: AbortSignal;
  onProgress?: (step: 'SENDING_IMAGE' | 'ANALYZING' | 'VALIDATING') => void;
}): Promise<PhotoAnalysisResult> {
  const {
    imageBase64,
    mimeType,
    fileName,
    fileSize,
    width,
    height,
    sha256Hash,
    customInstructions,
    useCustomInstructions,
    apiKey,
    signal,
    onProgress
  } = params;

  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('Kunci API Google Gemini belum diatur. Masukkan API Key pada menu API & Pengaturan.');
  }

  // 1. Prepare and validate visual image data
  onProgress?.('SENDING_IMAGE');

  const cleanBase64 = imageBase64.includes(';base64,')
    ? imageBase64.split(';base64,').pop()!
    : imageBase64.replace(/^data:[^;]+;base64,/, '');

  if (!cleanBase64 || cleanBase64.length < 100) {
    throw new Error('Data gambar visual rusak atau kosong. Harap muat ulang file foto.');
  }

  const hasCustom = Boolean(useCustomInstructions && customInstructions.trim().length > 0);
  const promptText = buildPhotographicPrompt(customInstructions, hasCustom);

  // 2. Transmit multimodal request to Gemini 3.5 Flash-Lite
  onProgress?.('ANALYZING');
  const startTime = performance.now();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIGURED_GEMINI_MODEL}:generateContent?key=${encodeURIComponent(cleanKey)}`;

  const requestPayload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: promptText
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json'
    }
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestPayload),
      signal
    });
  } catch (netErr: any) {
    if (netErr.name === 'AbortError') throw netErr;
    throw new Error(`Koneksi ke endpoint Google Gemini API gagal: ${netErr?.message || 'Periksa jaringan Anda.'}`);
  }

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const errMsg = errJson?.error?.message || `HTTP ${res.status}`;

    if (res.status === 400 || res.status === 401 || res.status === 403 || errMsg.includes('API_KEY_INVALID')) {
      throw new Error(`Autentikasi Gagal (${res.status}): API Key Google Gemini tidak valid atau tidak memiliki izin akses.`);
    }
    if (res.status === 429 || errMsg.includes('RESOURCE_EXHAUSTED')) {
      throw new Error(`Batas Kuota Tercapai (429): Kuota penggunaan akun Google AI Studio Anda telah habis. Periksa kuota di Google AI Studio.`);
    }
    if (res.status === 503 || errMsg.includes('UNAVAILABLE')) {
      throw new Error(`Layanan Gemini Sibuk (503): Server Google Gemini sedang mengalami beban tinggi. Silakan coba beberapa saat lagi.`);
    }

    throw new Error(`Gagal memproses visual foto pada Gemini 3.5 Flash-Lite: ${errMsg}`);
  }

  const resData = await res.json().catch(() => null);
  if (!resData) {
    throw new Error('Respon dari Google Gemini API kosong atau tidak dapat di-parse.');
  }

  const textOutput = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!textOutput) {
    const finishReason = resData?.candidates?.[0]?.finishReason;
    throw new Error(`Gemini 3.5 Flash-Lite tidak mengembalikan konten visual. Alasan selesai: ${finishReason || 'Unknown'}`);
  }

  // 3. Validate and parse response
  onProgress?.('VALIDATING');
  const durationMs = Math.round(performance.now() - startTime);

  let rawJson: any;
  try {
    const cleanedText = textOutput.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    rawJson = JSON.parse(cleanedText);
  } catch (parseErr: any) {
    throw new Error('Respon dari Gemini 3.5 Flash-Lite bukan format JSON analisis fotografi yang valid: ' + parseErr.message);
  }

  const validation = validateAndNormalizeGeminiResult(rawJson, {
    fileName,
    fileSize,
    mimeType,
    width,
    height,
    sha256Hash,
    durationMs,
    customInstructions,
    useCustomInstructions,
    modelName: CONFIGURED_GEMINI_MODEL
  });

  if (!validation.valid || !validation.result) {
    throw new Error(validation.error || 'Validasi skema parameter rekomendasi Lightroom gagal.');
  }

  return validation.result;
}
