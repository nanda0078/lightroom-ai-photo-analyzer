const fs = require('fs');

let typesCode = fs.readFileSync('src/types/analyzer.ts', 'utf8');

const target = "export interface CustomInstructionsSummary {";
const replacement = `export interface DetectedDefect {
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

export interface CustomInstructionsSummary {`;

typesCode = typesCode.replace(target, replacement);

const resultTarget = "  customInstructionsSummary?: CustomInstructionsSummary;";
const resultReplacement = `  customInstructionsSummary?: CustomInstructionsSummary;
  photoAnalysisReport?: PhotoAnalysisReport;`;

typesCode = typesCode.replace(resultTarget, resultReplacement);

fs.writeFileSync('src/types/analyzer.ts', typesCode, 'utf8');
console.log('src/types/analyzer.ts updated with PhotoAnalysisReport!');
