const fs = require('fs');
const path = require('path');

// 1. Patch src/components/PhotoAnalysisReportPanel.tsx
const repPath = path.resolve('D:/09. Antigravity/02. Lightroom AI Photo Analyzer V1.0/src/components/PhotoAnalysisReportPanel.tsx');
let repCode = fs.readFileSync(repPath, 'utf8');

// Add icons to imports
if (!repCode.includes('Flame')) {
  repCode = repCode.replace(
    "import {\n  FileSearch,\n  AlertTriangle,",
    "import {\n  FileSearch,\n  AlertTriangle,\n  Flame,\n  Sun,\n  ShieldCheck,\n  AlertOctagon,\n  Sliders,"
  ).replace(
    "import {\r\n  FileSearch,\r\n  AlertTriangle,",
    "import {\r\n  FileSearch,\r\n  AlertTriangle,\r\n  Flame,\r\n  Sun,\r\n  ShieldCheck,\r\n  AlertOctagon,\r\n  Sliders,"
  );
}

// Add clipping assessment UI section
if (!repCode.includes('HIGHLIGHT CLIPPING & RECOVERY ASSESSMENT')) {
  const clippingUiCard = `
        {/* BAGIAN TAMBAHAN: HIGHLIGHT CLIPPING & RECOVERY ASSESSMENT */}
        {result.highlightClippingAssessment && (
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-slate-900/90 via-[#151924] to-slate-900/90 border border-amber-500/30 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold tracking-wide uppercase text-white flex items-center gap-2">
                    <span>HIGHLIGHT CLIPPING &amp; RECOVERY ASSESSMENT</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
                      Tingkat: {result.highlightClippingAssessment.severityLevel}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Analisis overexposure, pembedaan putih alami, dan kemungkinan pemulihan detail piksel.
                  </p>
                </div>
              </div>

              {/* Natural White Protection Badge */}
              {result.highlightClippingAssessment.isNaturalWhiteProtected && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Putih Alami Terlindungi (Bukan Overexposure)</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* Status Clipping */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Status Clipping</span>
                <span className="font-bold text-slate-200 block text-xs">
                  {result.highlightClippingAssessment.status}
                </span>
                <span className="text-[10px] text-amber-400 font-mono block">
                  Estimasi Luas: ~{result.highlightClippingAssessment.estimatedClippingPercentage.toFixed(1)}% area foto
                </span>
              </div>

              {/* Recovery Feasibility */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Potensi Pemulihan Detail</span>
                <span className="font-bold text-amber-300 block text-xs">
                  {result.highlightClippingAssessment.recoveryAssessment}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  Berdasarkan batas rentang dinamis sensor
                </span>
              </div>

              {/* Recommended Lightroom Highlights */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Rekomendasi Sorotan</span>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300">
                    Highlights: {result.highlightClippingAssessment.recommendedHighlights > 0 ? \`+\${result.highlightClippingAssessment.recommendedHighlights}\` : result.highlightClippingAssessment.recommendedHighlights}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
                    Whites: {result.highlightClippingAssessment.recommendedWhites > 0 ? \`+\${result.highlightClippingAssessment.recommendedWhites}\` : result.highlightClippingAssessment.recommendedWhites}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400 block font-mono">
                  Pencahayaan wajah/kulit tidak diturunkan
                </span>
              </div>

              {/* Affected Areas */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">Area Terdampak</span>
                <div className="flex flex-wrap gap-1">
                  {result.highlightClippingAssessment.affectedAreas.map((area, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Root Cause & Masking Advice */}
            <div className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800/80 space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="font-semibold text-slate-300 shrink-0">Penyebab Overexposure:</span>
                <span className="text-slate-400 leading-relaxed">{result.highlightClippingAssessment.rootCauseAnalysis}</span>
              </div>
              {result.highlightClippingAssessment.recommendedLocalMasking && (
                <div className="flex items-start gap-2 pt-1 border-t border-slate-800/60 text-[11px]">
                  <span className="font-semibold text-amber-300/90 shrink-0">Saran Masking Lokal:</span>
                  <span className="text-slate-400 leading-relaxed">{result.highlightClippingAssessment.recommendedLocalMasking}</span>
                </div>
              )}
            </div>

            {/* Permanent Data Loss Warning Banner */}
            {result.highlightClippingAssessment.permanentDataLossWarning && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-2.5 text-xs">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Peringatan Kehilangan Data Piksel Permanen:</span>
                  <p className="text-[11px] text-rose-300/90 leading-relaxed">
                    Sebagian area sorotan telah mencapai batas saturasi sensor (pure white 255/255/255) sehingga data tekstur asli tidak terekam pada file. Rekomendasi Lightroom akan meredam intensitas silau, namun tidak dapat menciptakan detail yang tidak ada dalam data optik asli.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
`;

  repCode = repCode.replace(
    '{/* BAGIAN C: INTERPRETASI INSTRUKSI PENGGUNA */}',
    `${clippingUiCard}\n        {/* BAGIAN C: INTERPRETASI INSTRUKSI PENGGUNA */}`
  );

  fs.writeFileSync(repPath, repCode, 'utf8');
  console.log('SUCCESS: PhotoAnalysisReportPanel.tsx patched with clipping assessment card.');
}

// 2. Patch src/components/PhotoUploadZone.tsx
const zonePath = path.resolve('D:/09. Antigravity/02. Lightroom AI Photo Analyzer V1.0/src/components/PhotoUploadZone.tsx');
let zoneCode = fs.readFileSync(zonePath, 'utf8');

// Add Flame icon
if (!zoneCode.includes('Flame')) {
  zoneCode = zoneCode.replace(
    "import {\n  FileImage,\n  UploadCloud,",
    "import {\n  FileImage,\n  UploadCloud,\n  Flame,"
  ).replace(
    "import {\r\n  FileImage,\r\n  UploadCloud,",
    "import {\r\n  FileImage,\r\n  UploadCloud,\r\n  Flame,"
  );
}

// Add state & heatmap rendering hook
if (!zoneCode.includes('showClippingHeatmap')) {
  const stateAnchor = "const [isDragOver, setIsDragOver] = useState<boolean>(false);";
  const stateAddition = `${stateAnchor}
  const [showClippingHeatmap, setShowClippingHeatmap] = useState<boolean>(false);
  const clippingHeatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render non-destructive clipping heatmap overlay
  useEffect(() => {
    if (!showClippingHeatmap || !clippingHeatmapCanvasRef.current) return;

    const overlayCanvas = clippingHeatmapCanvasRef.current;
    const sourceCanvas = correctedCanvasRef.current;
    
    // Fallback to base preview image if canvas not available
    const baseImg = photoWrapperRef.current?.querySelector('img') as HTMLImageElement | null;
    const sourceEl: HTMLCanvasElement | HTMLImageElement | null = (isApplied && sourceCanvas && sourceCanvas.width > 0) ? sourceCanvas : baseImg;

    if (!sourceEl) return;

    const width = (sourceEl as any).naturalWidth || sourceEl.width || 800;
    const height = (sourceEl as any).naturalHeight || sourceEl.height || 600;

    overlayCanvas.width = width;
    overlayCanvas.height = height;

    const ctx = overlayCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    // Draw source to temporary buffer to inspect pixel values
    ctx.drawImage(sourceEl, 0, 0, width, height);
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    const totalPixels = data.length / 4;

    // Output buffer
    const outImgData = ctx.createImageData(width, height);
    const out = outImgData.data;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Pure Clipping: All RGB > 250
      if (r >= 250 && g >= 250 && b >= 250) {
        out[idx] = 239;     // Red
        out[idx + 1] = 68;
        out[idx + 2] = 68;
        out[idx + 3] = 200;  // High opacity
      } else if (r >= 240 && g >= 240 && b >= 240) {
        // Near clipping: RGB > 240
        out[idx] = 234;     // Yellow/Amber
        out[idx + 1] = 179;
        out[idx + 2] = 8;
        out[idx + 3] = 160;  // Medium opacity
      } else {
        out[idx + 3] = 0;    // Transparent
      }
    }

    ctx.putImageData(outImgData, 0, 0);
  }, [showClippingHeatmap, isApplied, previewMode, correctionParams]);`;

  zoneCode = zoneCode.replace(stateAnchor, stateAddition);

  // Add Heatmap toggle button to Toolbar
  const toolbarAnchor = "{/* Hold to Compare quick button */}";
  const buttonAddition = `
                  {/* Highlight Clipping Heatmap Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setShowClippingHeatmap(!showClippingHeatmap)}
                    className={\`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer \${
                      showClippingHeatmap
                        ? 'bg-rose-500/90 text-white border border-rose-400 font-bold shadow-md shadow-rose-950/40'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-900/80 border border-slate-800 hover:border-slate-700'
                    }\`}
                    title="Aktifkan visualisasi Heatmap Highlight Clipping (Merah = Pure Clipping, Kuning = Near Clipping)"
                  >
                    <Flame className={\`w-3.5 h-3.5 \${showClippingHeatmap ? 'text-white' : 'text-rose-400'}\`} />
                    <span className="hidden sm:inline">Heatmap Clipping</span>
                    {showClippingHeatmap && (
                      <span className="text-[9px] font-mono px-1 rounded bg-black/40 text-rose-200">ON</span>
                    )}
                  </button>

                  ${toolbarAnchor}`;

  zoneCode = zoneCode.replace(toolbarAnchor, buttonAddition);

  // Add canvas element in photo wrapper
  const canvasAnchor = `<canvas
                    ref={correctedCanvasRef}
                    className={\`absolute inset-0 w-full h-full object-contain rounded transition-opacity duration-150 \${
                      isApplied && previewMode !== 'original' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                    }\`}
                  />`;

  const canvasAddition = `${canvasAnchor}

                  {/* 2.5 CLIPPING HEATMAP OVERLAY CANVAS: Non-destructive visual inspection */}
                  <canvas
                    ref={clippingHeatmapCanvasRef}
                    className={\`absolute inset-0 w-full h-full object-contain rounded pointer-events-none transition-opacity duration-150 \${
                      showClippingHeatmap ? 'opacity-100 z-20' : 'opacity-0 z-0'
                    }\`}
                  />`;

  zoneCode = zoneCode.replace(canvasAnchor, canvasAddition);

  // Add Heatmap Legend Bar below image preview
  const legendAnchor = "{/* Technical Metadata Grid */}";
  const legendAddition = `{/* Heatmap Legend Bar when active */}
            {showClippingHeatmap && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-lg bg-slate-950 border border-rose-500/30 text-xs font-mono animate-in fade-in duration-200">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                    <span className="text-slate-200">Merah: Pure Highlight Clipping (RGB &ge; 250)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                    <span className="text-slate-200">Kuning: Near-Clipping Warning (RGB &ge; 240)</span>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-sans">
                  Overlay Pratinjau 100% Non-Destruktif (Tidak Mengubah Foto Asli)
                </span>
              </div>
            )}

            ${legendAnchor}`;

  zoneCode = zoneCode.replace(legendAnchor, legendAddition);

  fs.writeFileSync(zonePath, zoneCode, 'utf8');
  console.log('SUCCESS: PhotoUploadZone.tsx patched with Heatmap Clipping overlay & toggle');
}
