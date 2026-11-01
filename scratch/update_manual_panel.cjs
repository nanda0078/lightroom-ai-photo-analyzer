const fs = require('fs');
const path = require('path');

const targetFile = path.resolve('D:/09. Antigravity/02. Lightroom AI Photo Analyzer V1.0/src/components/ManualAdjustmentPanel.tsx');
let code = fs.readFileSync(targetFile, 'utf8');

// 1. Update lucide-react imports
if (!code.includes('Undo2')) {
  code = code.replace(
    /import\s*\{\s*Sun,\s*Palette,\s*ZoomIn,\s*RotateCcw,\s*Sparkles,\s*Plus,\s*Minus\s*\}\s*from\s*'lucide-react';/,
    `import {
  Sun,
  Palette,
  ZoomIn,
  RotateCcw,
  Sparkles,
  Plus,
  Minus,
  Undo2,
  Redo2
} from 'lucide-react';`
  );
}

// 2. Add history state & Undo/Redo logic
if (!code.includes('handleUndo')) {
  const hookAnchor = "const [activeTab, setActiveTab] = useState<'light' | 'color' | 'detail'>('light');";
  const hookReplacement = `${hookAnchor}
  const [history, setHistory] = useState<CorrectionParameters[]>([parameters]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const isInternalChangeRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    setHistory((prev) => {
      const slice = prev.slice(0, historyIndex + 1);
      const last = slice[slice.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(parameters)) {
        return prev;
      }
      const updated = [...slice, parameters];
      return updated.length > 30 ? updated.slice(updated.length - 30) : updated;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 29));
  }, [parameters]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const target = history[historyIndex - 1];
      isInternalChangeRef.current = true;
      setHistoryIndex(historyIndex - 1);
      onChange(target);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const target = history[historyIndex + 1];
      isInternalChangeRef.current = true;
      setHistoryIndex(historyIndex + 1);
      onChange(target);
    }
  };`;

  code = code.replace(hookAnchor, hookReplacement);
}

// 3. Add Undo & Redo buttons to header
if (!code.includes('title="Batalkan perubahan slider')) {
  const resetAnchor = '{/* Global Reset Buttons */}';
  const buttonsReplacement = `{/* Undo, Redo, and Reset Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className={\`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors \${
              historyIndex <= 0
                ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
            }\`}
            title="Batalkan perubahan slider terakhir (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className={\`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors \${
              historyIndex >= history.length - 1
                ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
            }\`}
            title="Ulangi perubahan slider (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Redo</span>
          </button>
        </div>

        {/* Global Reset Buttons */}`;

  code = code.replace(resetAnchor, buttonsReplacement);
}

fs.writeFileSync(targetFile, code, 'utf8');
console.log('SUCCESS: ManualAdjustmentPanel.tsx updated with Undo & Redo.');
