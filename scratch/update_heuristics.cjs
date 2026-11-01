const fs = require('fs');
let code = fs.readFileSync('src/services/photoHeuristics.ts', 'utf8');
code = code.replace(
  "High-precision photographic analysis engine that inspects image characteristics",
  "Offline technical fallback helper for non-AI local diagnostics.\r\n * NOTE: Per Section 4 of Master Patch, this is NEVER used as a fake Gemini AI replacement."
);
fs.writeFileSync('src/services/photoHeuristics.ts', code, 'utf8');
console.log('photoHeuristics.ts doc updated');
