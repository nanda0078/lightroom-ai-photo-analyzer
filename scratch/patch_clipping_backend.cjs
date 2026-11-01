const fs = require('fs');
const path = require('path');

// 1. Patch src/services/geminiValidator.ts
const valPath = path.resolve('D:/09. Antigravity/02. Lightroom AI Photo Analyzer V1.0/src/services/geminiValidator.ts');
let valCode = fs.readFileSync(valPath, 'utf8');

if (!valCode.includes('highlightClippingAssessment')) {
  // Add import types if not present
  valCode = valCode.replace(
    "import {\n  PhotoAnalysisResult,\n  PhotoAnalysisReport,\n  DetectedDefect,\n  UserDirectiveInterpretation,\n  LightroomAdjustments,",
    "import {\n  PhotoAnalysisResult,\n  PhotoAnalysisReport,\n  DetectedDefect,\n  UserDirectiveInterpretation,\n  HighlightClippingAssessment,\n  ClippingSeverity,\n  RecoveryFeasibility,\n  LightroomAdjustments,"
  ).replace(
    "import {\r\n  PhotoAnalysisResult,\r\n  PhotoAnalysisReport,\r\n  DetectedDefect,\r\n  UserDirectiveInterpretation,\r\n  LightroomAdjustments,",
    "import {\r\n  PhotoAnalysisResult,\r\n  PhotoAnalysisReport,\r\n  DetectedDefect,\r\n  UserDirectiveInterpretation,\r\n  HighlightClippingAssessment,\r\n  ClippingSeverity,\r\n  RecoveryFeasibility,\r\n  LightroomAdjustments,"
  );

  const normTarget = 'const photoAnalysisReport: PhotoAnalysisReport = {';
  const normReplacement = `
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
    highlightClippingAssessment,`;

  valCode = valCode.replace(normTarget, normReplacement);
  valCode = valCode.replace(
    'photoAnalysisReport,',
    'photoAnalysisReport,\n    highlightClippingAssessment,'
  );

  fs.writeFileSync(valPath, valCode, 'utf8');
  console.log('SUCCESS: geminiValidator.ts patched');
}

// 2. Patch src/services/geminiClient.ts
const clientPath = path.resolve('D:/09. Antigravity/02. Lightroom AI Photo Analyzer V1.0/src/services/geminiClient.ts');
let clientCode = fs.readFileSync(clientPath, 'utf8');

const clippingPromptSection = `
=======================================================================
PROTOKOL EVALUASI HIGHLIGHT CLIPPING & RECOVERY ASSESSMENT (WAJIB):
=======================================================================
1. PEMBEDAAN WARNA PUTIH ALAMI VS CLIPPING (ATURAN SANGAT PENTING):
   - Objek putih alami (dinding putih, gaun putih, kertas) dengan detail/tekstur yang masih terjaga BUKANLAH highlight clipping / overexposure.
   - Hanya area di mana piksel mencapai batas saturasi sensor digital (RGB rata 255, blown-out, tekstur lenyap) yang dihitung sebagai clipping.
   - JANGAN menurunkan Whites secara agresif hanya karena foto memiliki latar belakang putih!
2. EVALUASI TINGKAT KEPARAHAN:
   - "Tidak mengalami clipping": Dynamic range optimal, tidak ada area terbakar (< 0.5%).
   - "Clipping ringan": Kilau spekular alami pada perhiasan/mata (0.5% - 2%).
   - "Clipping sedang": Area terang pada pakaian/dinding mulai kehilangan sedikit gradasi (2% - 6%).
   - "Clipping berat": Area wajah/latar terbakar cahaya kuat (6% - 15%).
   - "Clipping ekstrem": Area besar (> 15%) putih polos tanpa data piksel tersisa.
3. KEMUNGKINAN PEMULIHAN (RECOVERY ASSESSMENT):
   - "Detail masih tersedia dan berpotensi dipulihkan": Data tonal masih tersimpan di kanal piksel.
   - "Detail sebagian tersedia": Sorotan bisa diredam namun kontras mikro terbatas.
   - "Detail sangat terbatas": Sebagian kanal warna telah terpotong (clipped).
   - "Detail sudah hilang akibat clipping": Piksel mencapai batas sensor. JANGAN berjanji palsu memulihkan data yang telah hilang!
4. PARAMETER LIGHTROOM TERPISAH:
   - Prioritaskan koreksi "highlights" (-15 s/d -60) dan "whites" (-10 s/d -30) untuk meredam sorotan.
   - JANGAN menurunkan Exposure global secara drastis jika overexposure hanya di latar belakang, agar wajah dan pakaian subjek tidak menjadi gelap gulita!
`;

if (!clientCode.includes('PROTOKOL EVALUASI HIGHLIGHT CLIPPING')) {
  clientCode = clientCode.replace(
    '${customSection}',
    `${clippingPromptSection}\n\${customSection}`
  );

  const schemaInsert = `  "highlightClippingAssessment": {
    "status": "Tidak mengalami clipping" | "Clipping ringan" | "Clipping sedang" | "Clipping berat" | "Clipping ekstrem",
    "severityLevel": "Normal" | "Ringan" | "Sedang" | "Berat" | "Ekstrem",
    "affectedAreas": ["Jendela & Sumber Cahaya", "Dinding Latar Belakang"],
    "estimatedClippingPercentage": 3.5,
    "isNaturalWhiteProtected": true,
    "recoveryAssessment": "Detail masih tersedia dan berpotensi dipulihkan" | "Detail sebagian tersedia" | "Detail sangat terbatas" | "Detail sudah hilang akibat clipping",
    "rootCauseAnalysis": "Uraian teknis mengapa overexposure terjadi...",
    "recommendedHighlights": -30,
    "recommendedWhites": -15,
    "recommendedLocalMasking": "Gunakan linear mask pada area jendela agar subjek tidak menggelap",
    "permanentDataLossWarning": false
  },`;

  clientCode = clientCode.replace(
    '"photoAnalysisReport": {',
    `${schemaInsert}\n  "photoAnalysisReport": {`
  );

  fs.writeFileSync(clientPath, clientCode, 'utf8');
  console.log('SUCCESS: geminiClient.ts patched');
}

// 3. Patch server.ts
const serverPath = path.resolve('D:/09. Antigravity/02. Lightroom AI Photo Analyzer V1.0/server.ts');
let serverCode = fs.readFileSync(serverPath, 'utf8');
if (!serverCode.includes('PROTOKOL EVALUASI HIGHLIGHT CLIPPING')) {
  serverCode = serverCode.replace(
    '${customSection}',
    `${clippingPromptSection}\n\${customSection}`
  );
  serverCode = serverCode.replace(
    '"photoAnalysisReport": {',
    `"highlightClippingAssessment": {
    "status": "Tidak mengalami clipping" | "Clipping ringan" | "Clipping sedang" | "Clipping berat" | "Clipping ekstrem",
    "severityLevel": "Normal" | "Ringan" | "Sedang" | "Berat" | "Ekstrem",
    "affectedAreas": ["Jendela & Sumber Cahaya", "Dinding Latar Belakang"],
    "estimatedClippingPercentage": 3.5,
    "isNaturalWhiteProtected": true,
    "recoveryAssessment": "Detail masih tersedia dan berpotensi dipulihkan" | "Detail sebagian tersedia" | "Detail sangat terbatas" | "Detail sudah hilang akibat clipping",
    "rootCauseAnalysis": "Uraian teknis mengapa overexposure terjadi...",
    "recommendedHighlights": -30,
    "recommendedWhites": -15,
    "recommendedLocalMasking": "Gunakan linear mask pada area jendela agar subjek tidak menggelap",
    "permanentDataLossWarning": false
  },
  "photoAnalysisReport": {`
  );
  fs.writeFileSync(serverPath, serverCode, 'utf8');
  console.log('SUCCESS: server.ts patched');
}
