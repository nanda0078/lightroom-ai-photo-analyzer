const fs = require('fs');
const path = require('path');

const zonePath = path.resolve('D:/09. Antigravity/02. Lightroom AI Photo Analyzer V1.0/src/components/PhotoUploadZone.tsx');
let code = fs.readFileSync(zonePath, 'utf8');

// 1. Add state & useEffect after `const [copiedHash, setCopiedHash] = useState(false);`
const targetState = 'const [copiedHash, setCopiedHash] = useState(false);';
const stateAndHook = `const [copiedHash, setCopiedHash] = useState(false);
  const [showClippingHeatmap, setShowClippingHeatmap] = useState(false);
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

      // Pure Clipping: All RGB >= 250
      if (r >= 250 && g >= 250 && b >= 250) {
        out[idx] = 239;     // Red
        out[idx + 1] = 68;
        out[idx + 2] = 68;
        out[idx + 3] = 210; // High opacity
      } else if (r >= 240 && g >= 240 && b >= 240) {
        // Near clipping: RGB >= 240
        out[idx] = 234;     // Yellow/Amber
        out[idx + 1] = 179;
        out[idx + 2] = 8;
        out[idx + 3] = 170; // Medium opacity
      } else {
        out[idx + 3] = 0;   // Transparent
      }
    }

    ctx.putImageData(outImgData, 0, 0);
  }, [showClippingHeatmap, isApplied, previewMode, correctionParams]);`;

if (!code.includes('const [showClippingHeatmap, setShowClippingHeatmap] = useState(false);')) {
  code = code.replace(targetState, stateAndHook);
}

// 2. Add canvas element for heatmap overlay inside photoWrapperRef
if (!code.includes('ref={clippingHeatmapCanvasRef}')) {
  const canvasTarget = `                  <canvas
                    ref={correctedCanvasRef}
                    className={\`absolute inset-0 w-full h-full object-contain rounded transition-opacity duration-150 \${
                      isApplied && previewMode !== 'original' ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
                    }\`}
                  />`;

  const canvasReplacement = `${canvasTarget}

                  {/* 2.5 CLIPPING HEATMAP OVERLAY CANVAS: Non-destructive visual inspection */}
                  <canvas
                    ref={clippingHeatmapCanvasRef}
                    className={\`absolute inset-0 w-full h-full object-contain rounded pointer-events-none transition-opacity duration-150 \${
                      showClippingHeatmap ? 'opacity-100 z-20' : 'opacity-0 z-0'
                    }\`}
                  />`;

  code = code.replace(canvasTarget, canvasReplacement);
}

fs.writeFileSync(zonePath, code, 'utf8');
console.log('SUCCESS: PhotoUploadZone.tsx fixed with showClippingHeatmap state & canvas overlay!');
