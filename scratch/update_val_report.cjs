const fs = require('fs');

let valCode = fs.readFileSync('src/services/geminiValidator.ts', 'utf8');

// Update imports
if (!valCode.includes('PhotoAnalysisReport')) {
  valCode = valCode.replace(
    "import {\r\n  PhotoAnalysisResult,",
    "import {\r\n  PhotoAnalysisResult,\r\n  PhotoAnalysisReport,\r\n  DetectedDefect,\r\n  UserDirectiveInterpretation,"
  );
  valCode = valCode.replace(
    "import {\n  PhotoAnalysisResult,",
    "import {\n  PhotoAnalysisResult,\n  PhotoAnalysisReport,\n  DetectedDefect,\n  UserDirectiveInterpretation,"
  );
}

// Add report normalization inside validateAndNormalizeGeminiResult
const reportInsertMarker = "  const finalResult: PhotoAnalysisResult = {";
const reportNormalizationLogic = `  // Normalize 5-part Photo Analysis Report (Section 7 of Master Patch)
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
      hasCustom ? \`Pengguna mengarahkan: "\${cleanInstructions}"\` : 'Analisis fotometri objektif standar tanpa instruksi khusus.'
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

  const photoAnalysisReport: PhotoAnalysisReport = {
    sectionA_actualObservation: sectionA,
    sectionB_detectedDefects: sectionB,
    sectionC_userDirectiveInterpretation: sectionC,
    sectionD_aiCorrectionPlan: sectionD,
    sectionE_expectedVisualOutcome: sectionE
  };

  `;

valCode = valCode.replace(reportInsertMarker, reportNormalizationLogic + reportInsertMarker);

valCode = valCode.replace(
  "customInstructionsSummary: customSummary,",
  "customInstructionsSummary: customSummary,\r\n    photoAnalysisReport,"
);

fs.writeFileSync('src/services/geminiValidator.ts', valCode, 'utf8');
console.log('geminiValidator.ts updated with PhotoAnalysisReport normalization!');
