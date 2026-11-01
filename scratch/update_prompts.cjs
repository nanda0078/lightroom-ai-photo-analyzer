const fs = require('fs');

const decisionEngineInstructions = `
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
`;

const reportJsonSchema = `
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
`;

// 1. Update geminiClient.ts
let clientCode = fs.readFileSync('src/services/geminiClient.ts', 'utf8');
if (!clientCode.includes('SISTEM PENGAMBILAN KEPUTUSAN 7 TAHAP')) {
  clientCode = clientCode.replace(
    'ATURAN MUTLAK & PRINSIP TEKNIS:',
    decisionEngineInstructions + '\nATURAN MUTLAK & PRINSIP TEKNIS:'
  );
  clientCode = clientCode.replace(
    '"customInstructionsSummary": {',
    reportJsonSchema + '  "customInstructionsSummary": {'
  );
  fs.writeFileSync('src/services/geminiClient.ts', clientCode, 'utf8');
  console.log('geminiClient.ts prompt updated!');
}

// 2. Update server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');
if (!serverCode.includes('SISTEM PENGAMBILAN KEPUTUSAN 7 TAHAP')) {
  serverCode = serverCode.replace(
    'ATURAN MUTLAK & TIDAK DAPAT DITAWAR:',
    decisionEngineInstructions + '\nATURAN MUTLAK & TIDAK DAPAT DITAWAR:'
  );
  serverCode = serverCode.replace(
    '"customInstructionsSummary": {',
    reportJsonSchema + '  "customInstructionsSummary": {'
  );
  fs.writeFileSync('server.ts', serverCode, 'utf8');
  console.log('server.ts prompt updated!');
}
