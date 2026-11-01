const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('D:/09. Antigravity/02. Lightroom AI Photo Analyzer V1.0/src/types/analyzer.ts');
let code = fs.readFileSync(targetPath, 'utf8');

const clippingTypeDef = `
export type ClippingSeverity = 
  | 'Tidak mengalami clipping'
  | 'Clipping ringan'
  | 'Clipping sedang'
  | 'Clipping berat'
  | 'Clipping ekstrem';

export type RecoveryFeasibility = 
  | 'Detail masih tersedia dan berpotensi dipulihkan'
  | 'Detail sebagian tersedia'
  | 'Detail sangat terbatas'
  | 'Detail sudah hilang akibat clipping';

export interface HighlightClippingAssessment {
  status: ClippingSeverity;
  severityLevel: 'Normal' | 'Ringan' | 'Sedang' | 'Berat' | 'Ekstrem';
  affectedAreas: string[];
  estimatedClippingPercentage: number;
  isNaturalWhiteProtected: boolean;
  recoveryAssessment: RecoveryFeasibility;
  rootCauseAnalysis: string;
  recommendedHighlights: number;
  recommendedWhites: number;
  recommendedLocalMasking?: string;
  permanentDataLossWarning: boolean;
}
`;

if (!code.includes('HighlightClippingAssessment')) {
  code = code.replace(
    'export interface DetectedDefect {',
    `${clippingTypeDef}\nexport interface DetectedDefect {`
  );

  code = code.replace(
    'photoAnalysisReport?: PhotoAnalysisReport;',
    'photoAnalysisReport?: PhotoAnalysisReport;\n  highlightClippingAssessment?: HighlightClippingAssessment;'
  );

  code = code.replace(
    '// E. HASIL VISUAL YANG DIHARAPKAN\n  sectionE_expectedVisualOutcome: string;',
    '// E. HASIL VISUAL YANG DIHARAPKAN\n  sectionE_expectedVisualOutcome: string;\n  // HIGHLIGHT CLIPPING ASSESSMENT\n  highlightClippingAssessment?: HighlightClippingAssessment;'
  );

  fs.writeFileSync(targetPath, code, 'utf8');
  console.log('SUCCESS: analyzer.ts patched with HighlightClippingAssessment');
} else {
  console.log('ALREADY PATCHED: analyzer.ts');
}
