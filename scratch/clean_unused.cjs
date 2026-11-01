const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/import\s*\{\s*generatePhotographicAnalysis\s*\}\s*from\s*'\.\/services\/photoHeuristics';\r?\n/, '');
fs.writeFileSync('src/App.tsx', code, 'utf8');
console.log('Cleaned unused import!');
