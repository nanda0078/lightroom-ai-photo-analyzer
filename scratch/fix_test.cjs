const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('D:/09. Antigravity/02. Lightroom AI Photo Analyzer V1.0/scratch/test_clipping_assessment_qa.cjs');
let code = fs.readFileSync(targetPath, 'utf8');

code = code.replace(
  'const msg = tc.validate(norm);',
  'const res = norm.normalizedResult;\n    const msg = tc.validate(res);'
).replace(
  'norm.highlightClippingAssessment',
  'res.highlightClippingAssessment'
).replace(
  'norm.highlightClippingAssessment',
  'res.highlightClippingAssessment'
).replace(
  'norm.highlightClippingAssessment',
  'res.highlightClippingAssessment'
);

fs.writeFileSync(targetPath, code, 'utf8');
console.log('Fixed test_clipping_assessment_qa.cjs');
