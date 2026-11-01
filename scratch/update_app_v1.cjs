const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('D:/09. Antigravity/02. Lightroom AI Photo Analyzer V1.0/src/App.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Add import
if (!code.includes("import { PhotoAnalysisReportPanel }")) {
  code = code.replace(
    "import { CustomInstructionsPanel } from './components/CustomInstructionsPanel';",
    "import { CustomInstructionsPanel } from './components/CustomInstructionsPanel';\nimport { PhotoAnalysisReportPanel } from './components/PhotoAnalysisReportPanel';"
  );
}

// 2. Add PhotoAnalysisReportPanel in JSX below CustomInstructionsPanel
if (!code.includes("<PhotoAnalysisReportPanel")) {
  const targetLocation = '{/* Section 4: AI SMART ADAPTIVE SHARPENING (Full Image Detail Enhancement) */}';
  const newSection = `{/* Section 3.5: LAPORAN ANALISIS FOTO & RENCANA PERBAIKAN AI (5-Section Report & Instant Apply) */}
          {analysisResult && (
            <div className="animate-in fade-in duration-300">
              <PhotoAnalysisReportPanel
                result={analysisResult}
                onApplyPlan={handleApplyCorrection}
                isApplied={isApplied}
                isProcessingCorrection={isProcessingCorrection}
              />
            </div>
          )}

          ${targetLocation}`;

  code = code.replace(targetLocation, newSection);
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('SUCCESS: App.tsx updated with PhotoAnalysisReportPanel.');
