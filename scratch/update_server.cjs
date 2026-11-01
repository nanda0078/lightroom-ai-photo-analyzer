const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

// 1. Add validator import
if (!serverCode.includes('geminiValidator')) {
  serverCode = serverCode.replace(
    "import { generatePhotographicAnalysis } from './src/services/photoHeuristics';",
    "import { generatePhotographicAnalysis } from './src/services/photoHeuristics';\r\nimport { validateAndNormalizeGeminiResult } from './src/services/geminiValidator';"
  );
}

// 2. Replace photo analysis logic with strict Gemini execution
const startMarker = "    const apiKey = process.env.GEMINI_API_KEY;";
const endMarker = "// Setup Vite middleware in dev or static files in production";

const startIndex = serverCode.indexOf(startMarker);
const endIndex = serverCode.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const newPhotoAnalysisCode = `    const apiKey = process.env.GEMINI_API_KEY?.trim() || req.headers['x-gemini-api-key']?.toString()?.trim();
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
          : \`Analisis visual Gemini 3.5 Flash-Lite mengalami kendala: \${errMsg}\`,
        details: errMsg,
        model: ACTIVE_MODEL
      });
    }

    const durationMs = Date.now() - startTime;
    const responseText = response.text.trim();
    let parsedData: any;

    try {
      const cleaned = responseText.replace(/\\\`\\\`\\\`json\\s*/gi, '').replace(/\\\`\\\`\\\`\\s*$/gi, '').trim();
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

`;

serverCode = serverCode.slice(0, startIndex) + newPhotoAnalysisCode + serverCode.slice(endIndex);

fs.writeFileSync('server.ts', serverCode, 'utf8');
console.log('server.ts updated successfully!');
