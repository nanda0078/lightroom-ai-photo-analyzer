const fs = require('fs');
const path = require('path');

const zonePath = path.resolve('D:/09. Antigravity/02. Lightroom AI Photo Analyzer V1.0/src/components/PhotoUploadZone.tsx');
let code = fs.readFileSync(zonePath, 'utf8');

// Read the component start
const hookStartTarget = `  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoWrapperRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
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
  }, [showClippingHeatmap, isApplied, previewMode, correctionParams]);

  // Preview Mode: default to 'split' when applied, otherwise 'original'
  const [previewMode, setPreviewMode] = useState<PreviewMode>('split');
  const [splitPosition, setSplitPosition] = useState<number>(50); // percentage 0 to 100
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);`;

const cleanHookStart = `  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoWrapperRef = useRef<HTMLDivElement>(null);
  const clippingHeatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // All state declarations first (Prevents TDZ reference errors)
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedHash, setCopiedHash] = useState(false);
  const [previewMode, setPreviewMode] = useState<PreviewMode>('split');
  const [splitPosition, setSplitPosition] = useState<number>(50); // percentage 0 to 100
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [showClippingHeatmap, setShowClippingHeatmap] = useState(false);

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

// Normalize line endings
const normCode = code.replace(/\r\n/g, '\n');
const normTarget = hookStartTarget.replace(/\r\n/g, '\n');
const normClean = cleanHookStart.replace(/\r\n/g, '\n');

if (normCode.includes(normTarget)) {
  const updated = normCode.replace(normTarget, normClean);
  fs.writeFileSync(zonePath, updated, 'utf8');
  console.log('SUCCESS: PhotoUploadZone.tsx reordered cleanly!');
} else {
  console.error('Target not matched exactly, falling back to regex replace');
  // fallback regex
  const regex = /const fileInputRef[\s\S]*?const \[isDraggingSplit, setIsDraggingSplit\] = useState\(false\);/;
  const updated = normCode.replace(regex, normClean);
  fs.writeFileSync(zonePath, updated, 'utf8');
  console.log('SUCCESS via regex: PhotoUploadZone.tsx reordered cleanly!');
}
