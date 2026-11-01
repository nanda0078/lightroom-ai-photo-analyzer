/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { generatePhotographicAnalysis } from './src/services/photoHeuristics';
import { validateAndNormalizeGeminiResult } from './src/services/geminiValidator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Centralized AI Model for all Photo Analyzer capabilities
export const ACTIVE_MODEL = 'gemini-3.5-flash-lite';

// Server-side telemetry and connection state cache
let cachedStatus: 'connected' | 'not_configured' | 'invalid_key' | 'connection_error' | 'quota_exceeded' | 'server_unavailable' = 'not_configured';
let cachedStatusMessage = 'API Belum Dikonfigurasi';
let lastTestedTimestamp: string | null = null;
let lastErrorDetails: string | null = null;

// Masking helper: Never leak the complete API key to the browser
function getMaskedKey(key?: string): string {
  if (!key || key.trim().length === 0) return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 6)}••••${trimmed.slice(-4)}`;
}

// Persist API Key securely to .env file on the server
const envFilePath = path.resolve(__dirname, '.env');
function persistKeyToEnv(newKey: string): void {
  try {
    let content = '';
    if (fs.existsSync(envFilePath)) {
      content = fs.readFileSync(envFilePath, 'utf-8');
    }
    const keyPattern = /^GEMINI_API_KEY=.*$/m;
    if (keyPattern.test(content)) {
      content = content.replace(keyPattern, `GEMINI_API_KEY="${newKey}"`);
    } else {
      content += (content.endsWith('\n') || content.length === 0 ? '' : '\n') + `GEMINI_API_KEY="${newKey}"\n`;
    }
    fs.writeFileSync(envFilePath, content, 'utf-8');
  } catch (err) {
    console.error('[Security/Config] Gagal menyimpan GEMINI_API_KEY ke file .env');
  }
}

// Support large image payloads (e.g. 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health / API status check
app.get('/api/status', (_req: Request, res: Response) => {
  const currentKey = process.env.GEMINI_API_KEY?.trim() || '';
  const hasKey = currentKey.length > 0;

  let currentStatus = cachedStatus;
  let currentMsg = cachedStatusMessage;

  if (!hasKey) {
    currentStatus = 'not_configured';
    currentMsg = 'API Belum Dikonfigurasi';
  } else if (currentStatus === 'not_configured') {
    currentStatus = 'connected';
    currentMsg = 'API Terkonfigurasi (Klik Uji Koneksi untuk verifikasi)';
  }

  res.json({
    status: currentStatus,
    statusMessage: currentMsg,
    hasApiKey: hasKey,
    maskedKey: getMaskedKey(currentKey),
    provider: 'Google Gemini',
    model: ACTIVE_MODEL,
    mode: 'BYOK (Server-side proxy)',
    lastChecked: lastTestedTimestamp,
    errorDetails: lastErrorDetails,
    version: '1.1.0'
  });
});

// Test Gemini API connection using gemini-3.5-flash-lite
app.post('/api/settings/test', async (_req: Request, res: Response) => {
  const currentKey = process.env.GEMINI_API_KEY?.trim() || '';
  if (!currentKey) {
    cachedStatus = 'not_configured';
    cachedStatusMessage = 'API Belum Dikonfigurasi. Masukkan API Key terlebih dahulu.';
    lastTestedTimestamp = new Date().toISOString();
    lastErrorDetails = 'GEMINI_API_KEY belum diatur';

    return res.status(200).json({
      success: false,
      status: cachedStatus,
      statusMessage: cachedStatusMessage,
      provider: 'Google Gemini',
      model: ACTIVE_MODEL,
      lastChecked: lastTestedTimestamp
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: currentKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const testRes = await ai.models.generateContent({
      model: ACTIVE_MODEL,
      contents: 'Ping',
      config: {
        maxOutputTokens: 5
      }
    });

    if (testRes) {
      cachedStatus = 'connected';
      cachedStatusMessage = 'API Terhubung. Model Gemini 3.5 Flash-Lite siap digunakan.';
      lastTestedTimestamp = new Date().toISOString();
      lastErrorDetails = null;

      return res.json({
        success: true,
        status: cachedStatus,
        statusMessage: cachedStatusMessage,
        provider: 'Google Gemini',
        model: ACTIVE_MODEL,
        lastChecked: lastTestedTimestamp
      });
    } else {
      throw new Error('Tidak ada respon dari server Gemini.');
    }
  } catch (testErr: any) {
    const errMsg = String(testErr?.message || '');
    lastTestedTimestamp = new Date().toISOString();
    lastErrorDetails = errMsg;

    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('400') || errMsg.includes('API key not valid') || errMsg.includes('invalid api key')) {
      cachedStatus = 'invalid_key';
      cachedStatusMessage = 'API Key Tidak Valid';
    } else if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
      cachedStatus = 'quota_exceeded';
      cachedStatusMessage = 'Kuota API Habis';
    } else if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) {
      cachedStatus = 'server_unavailable';
      cachedStatusMessage = 'Server Tidak Tersedia';
    } else {
      cachedStatus = 'connection_error';
      cachedStatusMessage = 'Koneksi Bermasalah';
    }

    return res.json({
      success: false,
      status: cachedStatus,
      statusMessage: cachedStatusMessage,
      errorDetails: errMsg,
      provider: 'Google Gemini',
      model: ACTIVE_MODEL,
      lastChecked: lastTestedTimestamp
    });
  }
});

// Save API key securely and persist to server environment
app.post('/api/settings/save', async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'API Key tidak boleh kosong.'
    });
  }

  const cleanKey = apiKey.trim();
  process.env.GEMINI_API_KEY = cleanKey;
  persistKeyToEnv(cleanKey);

  // Automatically verify the new API key against Gemini 3.5 Flash-Lite
  try {
    const ai = new GoogleGenAI({
      apiKey: cleanKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    await ai.models.generateContent({
      model: ACTIVE_MODEL,
      contents: 'Ping',
      config: {
        maxOutputTokens: 5
      }
    });

    cachedStatus = 'connected';
    cachedStatusMessage = 'API Terhubung. Model Gemini 3.5 Flash-Lite siap digunakan.';
    lastTestedTimestamp = new Date().toISOString();
    lastErrorDetails = null;

    return res.json({
      success: true,
      message: 'API Key berhasil disimpan dan diverifikasi.',
      status: cachedStatus,
      statusMessage: cachedStatusMessage,
      hasApiKey: true,
      maskedKey: getMaskedKey(cleanKey),
      provider: 'Google Gemini',
      model: ACTIVE_MODEL,
      lastChecked: lastTestedTimestamp
    });
  } catch (testErr: any) {
    const errMsg = String(testErr?.message || '');
    lastTestedTimestamp = new Date().toISOString();
    lastErrorDetails = errMsg;

    if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('400') || errMsg.includes('API key not valid')) {
      cachedStatus = 'invalid_key';
      cachedStatusMessage = 'API Key Tidak Valid';
    } else if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
      cachedStatus = 'quota_exceeded';
      cachedStatusMessage = 'Kuota API Habis';
    } else if (errMsg.includes('503') || errMsg.includes('UNAVAILABLE')) {
      cachedStatus = 'server_unavailable';
      cachedStatusMessage = 'Server Tidak Tersedia';
    } else {
      cachedStatus = 'connection_error';
      cachedStatusMessage = 'Koneksi Bermasalah';
    }

    return res.json({
      success: true,
      message: 'API Key disimpan ke server, namun uji koneksi mendeteksi kendala.',
      status: cachedStatus,
      statusMessage: cachedStatusMessage,
      hasApiKey: true,
      maskedKey: getMaskedKey(cleanKey),
      errorDetails: errMsg,
      provider: 'Google Gemini',
      model: ACTIVE_MODEL,
      lastChecked: lastTestedTimestamp
    });
  }
});

// Delete API key from server environment and .env
app.post('/api/settings/delete', (_req: Request, res: Response) => {
  process.env.GEMINI_API_KEY = '';
  persistKeyToEnv('');
  cachedStatus = 'not_configured';
  cachedStatusMessage = 'API Belum Dikonfigurasi';
  lastTestedTimestamp = new Date().toISOString();
  lastErrorDetails = null;

  return res.json({
    success: true,
    message: 'API Key berhasil dihapus dari server.',
    status: cachedStatus,
    statusMessage: cachedStatusMessage,
    hasApiKey: false,
    provider: 'Google Gemini',
    model: ACTIVE_MODEL,
    lastChecked: lastTestedTimestamp
  });
});

// Photo analysis endpoint
app.post('/api/analyze-photo', async (req: Request, res: Response) => {
  try {
    const {
      imageBase64,
      mimeType,
      fileName,
      fileSize,
      width,
      height,
      sha256Hash,
      customInstructions,
      useCustomInstructions
    } = req.body;

  if (!imageBase64 || !mimeType) {
    return res.status(400).json({
      error: 'Data gambar tidak valid atau tidak ditemukan.'
    });
  }

  // Robust base64 cleanup
  const cleanBase64 = imageBase64.includes(';base64,')
    ? imageBase64.split(';base64,').pop()!
    : imageBase64.replace(/^data:[^;]+;base64,/, '');

  const hasCustomInstructions = Boolean(
    useCustomInstructions &&
    typeof customInstructions === 'string' &&
    customInstructions.trim().length > 0
  );
  const cleanInstructions = hasCustomInstructions ? (customInstructions as string).trim() : '';

  const customInstructionsPromptSection = hasCustomInstructions
    ? `
=======================================================================
CUSTOM PHOTO CORRECTION INSTRUCTIONS (INSTRUKSI KHUSUS DARI PENGGUNA):
=======================================================================
Pengguna memberikan panduan khusus berikut mengenai bagaimana foto ini harus dioptimalkan:
"""
${cleanInstructions}
"""

PRIORITAS ANALISIS & PANDUAN PENGAMBILAN KEPUTUSAN:
1. Original Image Analysis — Kondisi aktual foto menjadi dasar evaluasi utama.
2. User Custom Instructions — Menentukan target tujuan, prioritas koreksi, dan karakter visual yang diinginkan.
3. Photographic Optimization — AI menyesuaikan dan menentukan parameter Adobe Lightroom yang secara khusus merealisasikan instruksi pengguna tersebut dengan presisi dan dinamis.
4. Image Processing — Koreksi diterapkan berbasis parameter fotografi, bukan proses generatif.

ATURAN PENERAPAN INSTRUKSI PENGGUNA:
- Analisis bagian foto yang menjadi fokus instruksi (misalnya: area bayangan pakaian, sorotan terang pada dinding latar, warna kulit/skin tone, kontras mikro).
- Identifikasi jenis kekurangan yang ingin diperbaiki dan karakter visual yang ingin dipertahankan.
- Jika instruksi pengguna berlawanan dengan batasan sensor/kondisi foto (misal: meminta menaikkan exposure pada foto yang sudah overexposed/clipping), berikan rekomendasi parameter yang aman dan jelaskan alasannya secara edukatif pada "alignmentNote".
- Parameter rekomendasi harus secara nyata dipengaruhi oleh instruksi pengguna (bukan angka statis biasa).

PEDOMAN INTERPRETASI PANDUAN PENGGUNA (TERMASUK TEMPLATE DEFAULT):
- KULIT NATURAL: Mempertahankan warna kulit asli (authentic skin tone), menjaga keseimbangan kanal HSL Orange & Red, serta TIDAK MENGUBAH identitas atau struktur anatomi wajah.
- KULIT LEBIH BERSIH: Mengurangi gangguan visual, cacat chromatic aberration, atau noise yang mengganggu pada area kulit subjek secara optis/tonal TANPA menghaluskan tekstur kulit secara artifisial (non-generatif, pori-pori dan tekstur alami wajib terlindungi).
- ANGKAT SATURASI: Meningkatkan intensitas warna secara proporsional tanpa menghasilkan warna berlebihan (utamakan Vibrance dan kontrol saturasi kanal yang seimbang tanpa efek kulit terbakar).
- ANGKAT KONTRAS: Meningkatkan kontras secara natural tanpa menghilangkan detail highlight dan shadow (jaga agar highlight tidak blown-out dan shadows tidak crushed).
- TENTUKAN NILAI PARAMETER SECARA DINAMIS: AI wajib mengevaluasi kondisi aktual setiap foto dan menentukan nilai parameter Lightroom secara dinamis proporsional, BUKAN menggunakan angka koreksi tetap untuk semua foto.
`
    : `
CUSTOM PHOTO CORRECTION INSTRUCTIONS:
Tidak ada instruksi khusus yang aktif. Jalankan analisis fotometri objektif standar.
`;

    const promptText = `
Anda adalah FOTOGRAFER PROFESIONAL & COLORIST SENIOR ADOBE LIGHTROOM CLASSIC.
Tugas Anda adalah bertindak sebagai AI PHOTO ANALYST & LIGHTROOM PARAMETER RECOMMENDER murni.


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

ATURAN MUTLAK & TIDAK DAPAT DITAWAR:
1. Anda HANYA menganalisis kondisi teknis foto dan memberikan rekomendasi nilai parameter Lightroom.
2. DILARANG mengubah piksel, mengkompresi, atau merekonstruksi gambar.
3. PELIHARA WAJAH & KULIT 100%: Dilarang merekomendasikan penghalusan kulit artifisial, perubahan bentuk wajah, mata, hidung, atau manipulasi identitas subjek.
4. JANGAN merekomendasikan perubahan pada parameter yang sudah optimal. Jika sudah seimbang, tetapkan status: "NORMAL", adjustmentRequired: false, recommendedValue: 0 (atau nilai netral default).
5. Gunakan format angka standar Adobe Lightroom:
   - Exposure: skala EV (-5.00 hingga +5.00 EV, step 0.05 / 0.10)
   - Contrast, Highlights, Shadows, Whites, Blacks: -100 hingga +100
   - Temperature: Kelvin atau scale -100 hingga +100
   - Tint: -100 hingga +100
   - Vibrance, Saturation: -100 hingga +100
   - HSL (Hue -100..+100, Saturation -100..+100, Luminance -100..+100 untuk 8 kanal: Red, Orange, Yellow, Green, Aqua, Blue, Purple, Magenta)
   - Clarity, Texture, Dehaze: -100 hingga +100
   - Vignette: -100 hingga +100
   - Grain: 0 hingga 100 (Size 0..100, Roughness 0..100)
   - Sharpening: 0 hingga 150 (Radius 0.5..3.0, Detail 0..100, Masking 0..100)
   - Noise Reduction (Luminance 0..100, Detail 0..100, Contrast 0..100, Color 0..100, Smoothness 0..100)

${customInstructionsPromptSection}

Berikan analisis menyeluruh dalam BAHASA INDONESIA dalam format JSON valid dan terstruktur persis sesuai skema ini:

{
  "overallQuality": "Sangat Baik" | "Baik" | "Cukup" | "Perlu Perbaikan Signifikan",
  "technicalSummary": "Ringkasan kondisi pencahayaan, tonal range, white balance, dan noise dalam 2-3 kalimat objektif.",
  
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
    "enabled": ${hasCustomInstructions ? 'true' : 'false'},
    "instructionGiven": ${JSON.stringify(cleanInstructions)},
    "appliedSuccessfully": true,
    "priorityObjectives": [
      "Prioritas utama yang berhasil dipenuhi sesuai instruksi",
      "Prioritas kedua yang dipenuhi"
    ],
    "alignmentNote": "Penjelasan detail bagaimana instruksi pengguna berhasil diselaraskan ke dalam parameter Lightroom atau catatan adaptasi jika diperlukan kompromi aman."
  },
  "detectedIssues": [
    {
      "category": "Pencahayaan" | "Warna" | "Efek" | "Detail",
      "severity": "critical" | "moderate" | "minor",
      "description": "Deskripsi masalah fotografi yang ditemukan",
      "affectedAreas": "Bagian foto yang terpengaruh (misal: area bayangan, langit, kulit subjek)"
    }
  ],
  "adjustments": {
    "light": {
      "exposure": { "parameterName": "Exposure", "category": "light", "status": "TOO_LOW"|"TOO_HIGH"|"NORMAL"|"NOT_DETECTABLE", "currentCondition": "...", "currentValue": null, "recommendedValue": 0.40, "unit": "EV", "adjustmentDirection": "INCREASE"|"DECREASE"|"HOLD", "adjustmentRequired": true|false, "reason": "...", "confidence": 0.95, "typicalRange": "-5.00 to +5.00 EV" },
      "contrast": { "parameterName": "Contrast", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "-100 to +100" },
      "highlights": { "parameterName": "Highlights", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": -20, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": true, "reason": "...", "confidence": 0.9, "typicalRange": "-100 to +100" },
      "shadows": { "parameterName": "Shadows", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 25, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": true, "reason": "...", "confidence": 0.9, "typicalRange": "-100 to +100" },
      "whites": { "parameterName": "Whites", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "-100 to +100" },
      "blacks": { "parameterName": "Blacks", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": -5, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "-100 to +100" },
      "autoTone": { "parameterName": "Auto Tone Calculation", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": "Manual Correction", "unit": "", "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "On/Off" },
      "toneCurve": { "parameterName": "Tone Curve", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": "Medium Contrast S-Curve", "unit": "", "adjustmentDirection": "HOLD", "adjustmentRequired": true|false, "reason": "...", "confidence": 0.85, "typicalRange": "Linear / Custom" },
      "parametricCurve": { "parameterName": "Parametric Curve", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": "Highlights: -10, Darks: +15", "unit": "", "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "-100 to +100 per zone" },
      "pointCurve": { "parameterName": "Point Curve", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": "Angkat black point ke 5% untuk film look halus", "unit": "", "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8, "typicalRange": "Control Points" },
      "rgbCurveRed": { "parameterName": "RGB Curve (Red)", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "-100 to +100" },
      "rgbCurveGreen": { "parameterName": "RGB Curve (Green)", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "-100 to +100" },
      "rgbCurveBlue": { "parameterName": "RGB Curve (Blue)", "category": "light", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "-100 to +100" }
    },
    "color": {
      "temperature": { "parameterName": "Temperature (White Balance)", "category": "color", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": -4, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": true|false, "reason": "...", "confidence": 0.9, "typicalRange": "-100 to +100 (atau 2000K-50000K)" },
      "tint": { "parameterName": "Tint", "category": "color", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": +2, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "-100 to +100" },
      "vibrance": { "parameterName": "Vibrance", "category": "color", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": +12, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": true, "reason": "...", "confidence": 0.9, "typicalRange": "-100 to +100" },
      "saturation": { "parameterName": "Saturation", "category": "color", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "-100 to +100" },
      "hslMixer": [
        { "channel": "Red", "hue": { "parameterName": "Red Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "saturation": { "parameterName": "Red Saturation", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "luminance": { "parameterName": "Red Luminance", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 } },
        { "channel": "Orange", "hue": { "parameterName": "Orange Hue (Skin tone)", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "saturation": { "parameterName": "Orange Saturation", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "luminance": { "parameterName": "Orange Luminance", "category": "color", "status": "NORMAL", "recommendedValue": +5, "adjustmentDirection": "INCREASE", "adjustmentRequired": true, "reason": "...", "confidence": 0.9 } },
        { "channel": "Yellow", "hue": { "parameterName": "Yellow Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "saturation": { "parameterName": "Yellow Saturation", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "luminance": { "parameterName": "Yellow Luminance", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 } },
        { "channel": "Green", "hue": { "parameterName": "Green Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "saturation": { "parameterName": "Green Saturation", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "luminance": { "parameterName": "Green Luminance", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 } },
        { "channel": "Aqua", "hue": { "parameterName": "Aqua Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "saturation": { "parameterName": "Aqua Saturation", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "luminance": { "parameterName": "Aqua Luminance", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 } },
        { "channel": "Blue", "hue": { "parameterName": "Blue Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "saturation": { "parameterName": "Blue Saturation", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "luminance": { "parameterName": "Blue Luminance", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 } },
        { "channel": "Purple", "hue": { "parameterName": "Purple Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "saturation": { "parameterName": "Purple Saturation", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "luminance": { "parameterName": "Purple Luminance", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 } },
        { "channel": "Magenta", "hue": { "parameterName": "Magenta Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "saturation": { "parameterName": "Magenta Saturation", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 }, "luminance": { "parameterName": "Magenta Luminance", "category": "color", "status": "NORMAL", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.9 } }
      ],
      "pointColor": {
        "colorSelection": "Dominant Target",
        "hue": { "parameterName": "Point Color Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.85 },
        "saturation": { "parameterName": "Point Color Saturation", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.85 },
        "luminance": { "parameterName": "Point Color Luminance", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.85 },
        "colorRange": { "parameterName": "Point Color Range", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 50, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.85 }
      },
      "colorGrading": {
        "shadows": { "hue": { "parameterName": "Shadows Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 215, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 }, "saturation": { "parameterName": "Shadows Saturation", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 }, "luminance": { "parameterName": "Shadows Luminance", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 } },
        "midtones": { "hue": { "parameterName": "Midtones Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 45, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 }, "saturation": { "parameterName": "Midtones Saturation", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 }, "luminance": { "parameterName": "Midtones Luminance", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 } },
        "highlights": { "hue": { "parameterName": "Highlights Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 40, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 }, "saturation": { "parameterName": "Highlights Saturation", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 }, "luminance": { "parameterName": "Highlights Luminance", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 } },
        "global": { "hue": { "parameterName": "Global Hue", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 }, "saturation": { "parameterName": "Global Saturation", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 }, "luminance": { "parameterName": "Global Luminance", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.8 } },
        "blending": { "parameterName": "Color Grading Blending", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 50, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.85 },
        "balance": { "parameterName": "Color Grading Balance", "category": "color", "status": "NORMAL", "currentCondition": "...", "recommendedValue": 0, "adjustmentDirection": "HOLD", "adjustmentRequired": false, "reason": "...", "confidence": 0.85 }
      }
    },
    "effects": {
      "texture": { "parameterName": "Texture", "category": "effects", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "-100 to +100" },
      "clarity": { "parameterName": "Clarity", "category": "effects", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "-100 to +100" },
      "dehaze": { "parameterName": "Dehaze", "category": "effects", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "-100 to +100" },
      "vignette": { "parameterName": "Vignette Amount", "category": "effects", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "-100 to +100" },
      "grain": { "parameterName": "Grain Amount", "category": "effects", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "0 to 100" },
      "grainSize": { "parameterName": "Grain Size", "category": "effects", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 25, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "0 to 100" },
      "grainRoughness": { "parameterName": "Grain Roughness", "category": "effects", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 50, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "0 to 100" }
    },
    "detail": {
      "sharpening": { "parameterName": "Sharpening Amount", "category": "detail", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 40, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "0 to 150" },
      "radius": { "parameterName": "Sharpening Radius", "category": "detail", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 1.0, "unit": "px", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "0.5 to 3.0" },
      "detail": { "parameterName": "Sharpening Detail", "category": "detail", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 25, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "0 to 100" },
      "masking": { "parameterName": "Sharpening Masking", "category": "detail", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "0 to 100" },
      "noiseReduction": { "parameterName": "Noise Reduction Overall", "category": "detail", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "0 to 100" },
      "luminance": { "parameterName": "Luminance Noise Reduction", "category": "detail", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "0 to 100" },
      "luminanceDetail": { "parameterName": "Luminance Detail", "category": "detail", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 50, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "0 to 100" },
      "luminanceContrast": { "parameterName": "Luminance Contrast", "category": "detail", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 0, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "0 to 100" },
      "colorNoiseReduction": { "parameterName": "Color Noise Reduction", "category": "detail", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 25, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.9, "typicalRange": "0 to 100" },
      "colorDetail": { "parameterName": "Color Detail", "category": "detail", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 50, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "0 to 100" },
      "colorSmoothness": { "parameterName": "Color Smoothness", "category": "detail", "status": "...", "currentCondition": "...", "currentValue": null, "recommendedValue": 50, "unit": "", "adjustmentDirection": "...", "adjustmentRequired": false, "reason": "...", "confidence": 0.85, "typicalRange": "0 to 100" }
    }
  },
  "preservation": {
    "originalImageUnchanged": true,
    "faceModificationAllowed": false,
    "skinModificationAllowed": false,
    "generativeEditingAllowed": false,
    "zeroCompressionVerified": true,
    "statement": "Foto asli dipertahankan secara utuh tanpa modifikasi piksel, kompresi ulang, atau pemrosesan generatif."
  }
}

Hanya kembalikan JSON murni, tanpa teks pembuka atau penutup markdown lain.
`;

    const apiKey = process.env.GEMINI_API_KEY?.trim() || req.headers['x-gemini-api-key']?.toString()?.trim();
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        errorType: 'unauthenticated',
        error: 'API Key Google Gemini belum dikonfigurasi pada server.',
        message: 'Kunci API belum diatur. Masukkan Google Gemini API Key Anda pada menu API & Pengaturan.'
      });
    }

    const startTime = Date.now();
    let response: any = null;
    let lastError: any = null;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      response = await ai.models.generateContent({
        model: ACTIVE_MODEL,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64
              }
            },
            {
              text: promptText
            }
          ]
        },
        config: {
          responseMimeType: 'application/json'
        }
      });
    } catch (modelErr: any) {
      lastError = modelErr;
      console.error('[Gemini 3.5 Flash-Lite Analysis Error]:', modelErr?.message);
    }

    // If Gemini failed or threw an error, report the REAL error. NO SILENT FALLBACK.
    if (!response || !response.text) {
      const errMsg = String(lastError?.message || 'Tidak ada respon konten visual dari Gemini 3.5 Flash-Lite.');
      const isQuota = errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota');
      const isInvalidKey = errMsg.includes('API_KEY_INVALID') || errMsg.includes('400') || errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('API key not valid');
      const isDemandSpike = errMsg.includes('503') || errMsg.includes('UNAVAILABLE');

      const statusCode = isQuota ? 429 : isInvalidKey ? 401 : isDemandSpike ? 503 : 502;
      return res.status(statusCode).json({
        success: false,
        errorType: isQuota ? 'quota_exceeded' : isInvalidKey ? 'invalid_key' : 'gemini_error',
        error: isQuota
          ? 'Batas kuota penggunaan Gemini API (429 RESOURCE_EXHAUSTED) tercapai pada akun ini.'
          : isInvalidKey
          ? 'Autentikasi gagal: API Key Google Gemini tidak valid atau tidak memiliki izin akses.'
          : `Analisis visual Gemini 3.5 Flash-Lite mengalami kendala: ${errMsg}`,
        details: errMsg,
        model: ACTIVE_MODEL
      });
    }

    const durationMs = Date.now() - startTime;
    const responseText = response.text.trim();
    let parsedData: any;

    try {
      const cleaned = responseText.replace(/\`\`\`json\s*/gi, '').replace(/\`\`\`\s*$/gi, '').trim();
      parsedData = JSON.parse(cleaned);
    } catch (parseErr: any) {
      return res.status(422).json({
        success: false,
        errorType: 'invalid_json',
        error: 'Respon dari Gemini 3.5 Flash-Lite bukan format JSON analisis fotografi yang valid.',
        details: parseErr.message
      });
    }

    // Validate and normalize all Lightroom parameters strictly
    const validation = validateAndNormalizeGeminiResult(parsedData, {
      fileName: fileName || 'photo_source.jpg',
      fileSize: fileSize || 0,
      mimeType: mimeType || 'image/jpeg',
      width,
      height,
      sha256Hash: sha256Hash || 'uncalculated',
      durationMs,
      customInstructions: cleanInstructions,
      useCustomInstructions: hasCustomInstructions,
      modelName: ACTIVE_MODEL
    });

    if (!validation.valid || !validation.result) {
      return res.status(422).json({
        success: false,
        errorType: 'validation_error',
        error: validation.error || 'Validasi skema parameter Lightroom gagal.'
      });
    }

    return res.json(validation.result);
  } catch (fatalErr: any) {
    console.error('Fatal error in photo analysis:', fatalErr);
    return res.status(500).json({
      success: false,
      errorType: 'server_fatal_error',
      error: 'Terjadi kesalahan sistem internal saat memproses foto.',
      details: fatalErr?.message
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      root: path.resolve(__dirname),
      server: {
        middlewareMode: true,
        fs: {
          strict: false,
          allow: [path.resolve(__dirname), '..']
        }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Lightroom AI Server] Running on http://localhost:${PORT} (mode: ${isDev ? 'development' : 'production'})`);
  });
}

startServer();
