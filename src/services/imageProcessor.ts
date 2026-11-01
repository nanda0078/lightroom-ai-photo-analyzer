/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CorrectionParameters } from '../types/analyzer';

export interface ImageValidationResult {
  valid: boolean;
  width: number;
  height: number;
  aspectRatio: number;
  mimeType: string;
  sizeBytes: number;
  error?: string;
}

/**
 * Pure non-generative photographic pixel processing engine.
 * Applies color science, tone curves, and spatial detail filters directly on pixel buffers.
 * Preserves 100% facial geometry, pore details, and anatomical identity.
 */
export class ImageProcessor {
  /**
   * Applies all correction parameters onto an ImageData buffer in-place.
   * Can accept an optional reusable scratch buffer to eliminate per-frame garbage collection.
   */
  public static applyParametersToImageData(
    imageData: ImageData,
    params: CorrectionParameters,
    reusableScratch?: Uint8ClampedArray | null
  ): ImageData {
    const data = imageData.data;
    const len = data.length;

    // Precalculate tone and color lookup coefficients
    const expFactor = Math.pow(2, params.exposure);
    const brightnessOffset = (params.brightness / 100) * 45;
    const contrastFactor = Math.tan(((params.contrast / 100) * 0.45 + 1) * (Math.PI / 4));

    // Highlights & Shadows factors (-1.0 to +1.0)
    const hlFactor = (params.highlights / 100) * 0.5;
    const shFactor = (params.shadows / 100) * 0.55;
    const whitesOffset = (params.whites / 100) * 35;
    const blacksOffset = (params.blacks / 100) * 25;

    // Color Temperature & Tint offsets
    const rTempOffset = (params.temperature / 100) * 30;
    const bTempOffset = -(params.temperature / 100) * 30;
    const gTintOffset = -(params.tint / 100) * 20;
    const rTintOffset = (params.tint / 100) * 12;
    const bTintOffset = (params.tint / 100) * 12;

    const satFactor = 1 + (params.saturation / 100) * 0.8;
    const vibFactor = (params.vibrance / 100) * 0.8;

    // Primary pixel color & tone pass
    for (let i = 0; i < len; i += 4) {
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // 1. Exposure & Brightness
      r = r * expFactor + brightnessOffset;
      g = g * expFactor + brightnessOffset;
      b = b * expFactor + brightnessOffset;

      // Calculate initial luminance (Rec. 709)
      let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

      // 2. Highlights & Shadows recovery
      if (shFactor !== 0 && luma < 140) {
        const shWeight = Math.pow((140 - luma) / 140, 1.5);
        const shBoost = shFactor * shWeight * 50;
        r += shBoost;
        g += shBoost;
        b += shBoost;
      }
      if (hlFactor !== 0 && luma > 115) {
        const hlWeight = Math.pow((luma - 115) / 140, 1.5);
        const hlBoost = hlFactor * hlWeight * 45;
        r += hlBoost;
        g += hlBoost;
        b += hlBoost;
      }

      // 3. Whites & Blacks dynamic range stretch
      if (whitesOffset !== 0 && luma > 150) {
        const wWeight = (luma - 150) / 105;
        r += whitesOffset * wWeight;
        g += whitesOffset * wWeight;
        b += whitesOffset * wWeight;
      }
      if (blacksOffset !== 0 && luma < 90) {
        const bWeight = (90 - luma) / 90;
        r += blacksOffset * bWeight;
        g += blacksOffset * bWeight;
        b += blacksOffset * bWeight;
      }

      // 4. Contrast around midtone 128
      r = (r - 128) * contrastFactor + 128;
      g = (g - 128) * contrastFactor + 128;
      b = (b - 128) * contrastFactor + 128;

      // 5. White Balance (Temperature & Tint)
      r += rTempOffset + rTintOffset;
      g += gTintOffset;
      b += bTempOffset + bTintOffset;

      // Clamp intermediate values
      r = Math.max(0, Math.min(255, r));
      g = Math.max(0, Math.min(255, g));
      b = Math.max(0, Math.min(255, b));

      // 6. Saturation & Vibrance (with skin tone protection)
      luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const currentSat = maxC === 0 ? 0 : (maxC - minC) / maxC;

      // Skin tone detection: Red dominant, Green mid, Blue lower
      const isSkinTone = r > g && g > b && r - b > 20 && r - b < 140;

      let effectiveVib = vibFactor * (1 - currentSat);
      if (isSkinTone && effectiveVib > 0) {
        effectiveVib *= 0.35; // Protect skin tones from hyper-saturation
      }

      const totalSatFactor = Math.max(0, satFactor + effectiveVib);

      r = luma + (r - luma) * totalSatFactor;
      g = luma + (g - luma) * totalSatFactor;
      b = luma + (b - luma) * totalSatFactor;

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
      // Ensure alpha channel is strictly opaque (never 0)
      if (data[i + 3] === 0) {
        data[i + 3] = 255;
      }
    }

    // 7. Clarity & Texture (Midtone Local Contrast Enhancement)
    if (params.clarity !== 0 || params.texture !== 0) {
      this.applyClarityAndTexture(imageData, params.clarity, params.texture);
    }

    // 8. AI Smart Adaptive Sharpening (Full Image Intelligent Detail Enhancement)
    // Coordinated with Lightroom parameters without double-stacking effects
    if (params.smartSharpening && params.smartSharpening.enabled && params.smartSharpening.amount > 0) {
      this.applySmartAdaptiveSharpening(imageData, params.smartSharpening, reusableScratch);
    } else if (params.sharpness > 0) {
      this.applySharpness(imageData, params.sharpness, reusableScratch);
    }

    // 9. Noise Reduction (Edge-preserving flat smoothing)
    if (params.noiseReduction > 0) {
      this.applyNoiseReduction(imageData, params.noiseReduction, reusableScratch);
    }

    return imageData;
  }

  /**
   * AI Smart Adaptive Sharpening (Full Image Intelligent Detail Enhancement).
   * Non-generative, edge-aware, multi-scale detail enhancement with skin-tone protection,
   * flat-area masking, noise suppression, and anti-halo clipping.
   * Runs directly on raw pixel buffer with zero garbage collection per-frame.
   */
  public static applySmartAdaptiveSharpening(
    imageData: ImageData,
    config: import('../types/analyzer').SmartSharpeningConfig,
    reusableScratch?: Uint8ClampedArray | null
  ): void {
    if (!config.enabled || config.amount <= 0) return;

    const data = imageData.data;
    const len = data.length;
    const w = imageData.width;
    const h = imageData.height;

    // Buffer copy for convolution source
    let src: Uint8ClampedArray;
    if (reusableScratch && reusableScratch.length === len) {
      reusableScratch.set(data);
      src = reusableScratch;
    } else {
      src = new Uint8ClampedArray(data);
    }

    const dst = data;

    // Precalculate algorithmic parameters
    const baseAmount = (config.amount / 100) * 0.95; // 0 to 0.95
    const radiusStep = Math.max(1, Math.min(3, Math.round(config.radius)));
    const detailBoost = 1.0 + (config.detail / 100) * 0.75;
    const maskThreshold = (config.masking / 100) * 28; // edge threshold
    const noiseThreshold = (config.noiseSuppression / 100) * 16;
    const texturePreserveFactor = config.texturePreservation / 100;
    const edgePreserveFactor = config.edgePreservation / 100;
    const haloLimit = Math.max(3, (1.0 - config.haloSuppression / 100) * 45);

    const r = radiusStep;

    for (let y = r; y < h - r; y++) {
      const yOffset = y * w;
      const yPrevOffset = (y - r) * w;
      const yNextOffset = (y + r) * w;

      for (let x = r; x < w - r; x++) {
        const idx = (yOffset + x) * 4;

        const rC = src[idx];
        const gC = src[idx + 1];
        const bC = src[idx + 2];

        // Rec. 709 Luminance
        const lumaC = 0.2126 * rC + 0.7152 * gC + 0.0722 * bC;

        // Neighbor indices
        const idxN = (yPrevOffset + x) * 4;
        const idxS = (yNextOffset + x) * 4;
        const idxW = (yOffset + (x - r)) * 4;
        const idxE = (yOffset + (x + r)) * 4;

        const lumaN = 0.2126 * src[idxN] + 0.7152 * src[idxN + 1] + 0.0722 * src[idxN + 2];
        const lumaS = 0.2126 * src[idxS] + 0.7152 * src[idxS + 1] + 0.0722 * src[idxS + 2];
        const lumaW = 0.2126 * src[idxW] + 0.7152 * src[idxW + 1] + 0.0722 * src[idxW + 2];
        const lumaE = 0.2126 * src[idxE] + 0.7152 * src[idxE + 1] + 0.0722 * src[idxE + 2];

        // Local statistics
        const lumaMean = (lumaN + lumaS + lumaW + lumaE) * 0.25;
        const lumaMin = Math.min(lumaC, lumaN, lumaS, lumaW, lumaE);
        const lumaMax = Math.max(lumaC, lumaN, lumaS, lumaW, lumaE);

        // Edge gradient magnitude
        const gradY = Math.abs(lumaS - lumaN);
        const gradX = Math.abs(lumaE - lumaW);
        const edgeMag = (gradX + gradY) * 0.5;

        // 1. Masking: Suppress sharpening in smooth/flat regions (sky, smooth walls, soft skin)
        let maskWeight = 1.0;
        if (maskThreshold > 0) {
          if (edgeMag < maskThreshold * 0.4) {
            maskWeight = 0.0;
          } else if (edgeMag < maskThreshold) {
            maskWeight = (edgeMag - maskThreshold * 0.4) / (maskThreshold * 0.6);
          }
        }
        if (maskWeight <= 0.001) continue;

        // 2. Noise suppression: attenuate sharpening on low-contrast micro-fluctuations
        let noiseWeight = 1.0;
        if (noiseThreshold > 0 && edgeMag < noiseThreshold) {
          const ratio = edgeMag / noiseThreshold;
          noiseWeight = ratio * ratio;
        }

        // 3. Human skin protection: Preserve fine natural skin tone without harsh sharpening
        let skinWeight = 1.0;
        const isSkin = rC > gC && gC > bC && (rC - bC) > 18 && (rC - bC) < 145 && (gC - bC) > 5;
        if (isSkin) {
          skinWeight = 0.35 + 0.35 * (1.0 - texturePreserveFactor * 0.5);
        }

        // 4. Fabric / Texture preservation boost for mid-gradient areas (clothing, hair, ornaments)
        let textureWeight = 1.0;
        if (!isSkin && edgeMag >= 10 && edgeMag <= 55) {
          textureWeight = 1.0 + texturePreserveFactor * 0.4;
        }

        // 5. High-contrast edge preservation
        let edgeWeight = 1.0;
        if (edgeMag > 55) {
          edgeWeight = 1.0 + edgePreserveFactor * 0.3;
        }

        // Combined adaptive multiplier
        const effectiveGain = baseAmount * detailBoost * maskWeight * noiseWeight * skinWeight * textureWeight * edgeWeight;
        if (effectiveGain <= 0.005) continue;

        // High frequency delta
        const lumaDelta = (lumaC - lumaMean) * effectiveGain;

        // 6. Anti-Halo Clipping: Constrain sharpened luminance within local neighborhood bounds
        let newLuma = lumaC + lumaDelta;
        const lowerBound = lumaMin - haloLimit;
        const upperBound = lumaMax + haloLimit;
        if (newLuma < lowerBound) newLuma = lowerBound;
        if (newLuma > upperBound) newLuma = upperBound;

        const finalDelta = newLuma - lumaC;

        // Apply luma delta to RGB channels proportionally without color casting
        dst[idx] = Math.max(0, Math.min(255, rC + finalDelta));
        dst[idx + 1] = Math.max(0, Math.min(255, gC + finalDelta));
        dst[idx + 2] = Math.max(0, Math.min(255, bC + finalDelta));
      }
    }
  }

  /**
   * Clarity & Texture enhances midtone edge contrast without touching global curves.
   */
  private static applyClarityAndTexture(
    imageData: ImageData,
    clarity: number,
    texture: number
  ): void {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;
    const strength = (clarity * 0.35 + texture * 0.45) / 100;
    if (Math.abs(strength) < 0.02) return;

    for (let y = 1; y < h - 1; y += 2) {
      for (let x = 1; x < w - 1; x += 2) {
        const idx = (y * w + x) * 4;
        const luma = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];

        if (luma > 40 && luma < 215) {
          const rightIdx = (y * w + (x + 1)) * 4;
          const downIdx = ((y + 1) * w + x) * 4;
          const rightLuma = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
          const downLuma = 0.299 * data[downIdx] + 0.587 * data[downIdx + 1] + 0.114 * data[downIdx + 2];

          const diff = (luma - rightLuma + (luma - downLuma)) * 0.5;
          const boost = diff * strength;

          data[idx] = Math.max(0, Math.min(255, data[idx] + boost));
          data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + boost));
          data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + boost));
        }
      }
    }
  }

  /**
   * Applies spatial unsharp masking with zero-allocation memory reuse via scratch buffer.
   */
  private static applySharpness(
    imageData: ImageData,
    sharpness: number,
    reusableScratch?: Uint8ClampedArray | null
  ): void {
    const amount = (sharpness / 100) * 0.6;
    if (amount <= 0.01) return;

    const data = imageData.data;
    const len = data.length;
    const w = imageData.width;
    const h = imageData.height;

    // Use reusable scratch buffer to eliminate per-frame heap allocation
    let src: Uint8ClampedArray;
    if (reusableScratch && reusableScratch.length === len) {
      reusableScratch.set(data);
      src = reusableScratch;
    } else {
      src = new Uint8ClampedArray(data);
    }

    const dst = data;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = (y * w + x) * 4;

        for (let c = 0; c < 3; c++) {
          const center = src[idx + c];
          const neighbors =
            src[((y - 1) * w + x) * 4 + c] +
            src[((y + 1) * w + x) * 4 + c] +
            src[(y * w + (x - 1)) * 4 + c] +
            src[(y * w + (x + 1)) * 4 + c];

          const edge = center * 4 - neighbors;
          dst[idx + c] = Math.max(0, Math.min(255, center + edge * amount));
        }
      }
    }
  }

  /**
   * Smooths noise in uniform regions while preserving distinct edges.
   */
  private static applyNoiseReduction(
    imageData: ImageData,
    noiseReduction: number,
    reusableScratch?: Uint8ClampedArray | null
  ): void {
    const threshold = 18;
    const blend = (noiseReduction / 100) * 0.45;
    if (blend <= 0.01) return;

    const data = imageData.data;
    const len = data.length;
    const w = imageData.width;
    const h = imageData.height;

    let src: Uint8ClampedArray;
    if (reusableScratch && reusableScratch.length === len) {
      reusableScratch.set(data);
      src = reusableScratch;
    } else {
      src = new Uint8ClampedArray(data);
    }

    const dst = data;

    for (let y = 1; y < h - 1; y += 2) {
      for (let x = 1; x < w - 1; x += 2) {
        const idx = (y * w + x) * 4;

        for (let c = 0; c < 3; c++) {
          const center = src[idx + c];
          const top = src[((y - 1) * w + x) * 4 + c];
          const bottom = src[((y + 1) * w + x) * 4 + c];
          const left = src[(y * w + (x - 1)) * 4 + c];
          const right = src[(y * w + (x + 1)) * 4 + c];

          if (
            Math.abs(center - top) < threshold &&
            Math.abs(center - bottom) < threshold &&
            Math.abs(center - left) < threshold &&
            Math.abs(center - right) < threshold
          ) {
            const avg = (center + top + bottom + left + right) / 5;
            dst[idx + c] = center * (1 - blend) + avg * blend;
          }
        }
      }
    }
  }

  /**
   * Validates an uploaded image file before any processing occurs.
   * Checks file size, dimensions, decoding capability, and memory limits.
   */
  public static async validateImageFile(file: File): Promise<ImageValidationResult> {
    if (!file || file.size === 0) {
      return {
        valid: false,
        width: 0,
        height: 0,
        aspectRatio: 0,
        mimeType: file?.type || 'unknown',
        sizeBytes: 0,
        error: 'Berkas kosong (0 bytes) atau tidak terbaca.'
      };
    }

    // Common file size limit check: warn/reject above 100MB
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        width: 0,
        height: 0,
        aspectRatio: 0,
        mimeType: file.type,
        sizeBytes: file.size,
        error: `Ukuran berkas (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas aman (100 MB).`
      };
    }

    return new Promise<ImageValidationResult>((resolve) => {
      const tempUrl = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(tempUrl);
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        if (!w || !h || w <= 0 || h <= 0) {
          resolve({
            valid: false,
            width: 0,
            height: 0,
            aspectRatio: 0,
            mimeType: file.type,
            sizeBytes: file.size,
            error: 'Dimensi gambar tidak valid (lebar atau tinggi bernilai 0).'
          });
          return;
        }

        // Check if dimension exceeds maximum canvas limit (16384px)
        const MAX_CANVAS_DIM = 16384;
        if (w > MAX_CANVAS_DIM || h > MAX_CANVAS_DIM) {
          resolve({
            valid: false,
            width: w,
            height: h,
            aspectRatio: w / h,
            mimeType: file.type,
            sizeBytes: file.size,
            error: `Resolusi gambar (${w}×${h} px) melebihi batas kanvas maksimum browser (${MAX_CANVAS_DIM} px).`
          });
          return;
        }

        resolve({
          valid: true,
          width: w,
          height: h,
          aspectRatio: Number((w / h).toFixed(4)),
          mimeType: file.type,
          sizeBytes: file.size
        });
      };

      img.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        resolve({
          valid: false,
          width: 0,
          height: 0,
          aspectRatio: 0,
          mimeType: file.type,
          sizeBytes: file.size,
          error: 'Format berkas tidak didukung atau header gambar rusak (Decoding failure).'
        });
      };

      img.src = tempUrl;
    });
  }

  /**
   * Diagnostic helper to verify whether HTML5 Canvas 2D is supported and active.
   */
  public static checkCanvasSupport(): { supported: boolean; maxDimension: number; error?: string } {
    try {
      const testCanvas = document.createElement('canvas');
      testCanvas.width = 16;
      testCanvas.height = 16;
      const ctx = testCanvas.getContext('2d');
      if (!ctx) {
        return {
          supported: false,
          maxDimension: 0,
          error: 'Browser tidak dapat membuat konteks Kanvas 2D (Akselerasi grafis dinonaktifkan).'
        };
      }
      testCanvas.width = 0;
      testCanvas.height = 0;
      return { supported: true, maxDimension: 16384 };
    } catch (e: any) {
      return { supported: false, maxDimension: 0, error: e?.message || 'Error pemeriksaan kanvas' };
    }
  }

  /**
   * Backwards-compatible render function delegating to PreviewEngine.
   */
  public static renderToCanvas(
    sourceImage: HTMLImageElement,
    params: CorrectionParameters,
    targetCanvas: HTMLCanvasElement,
    maxDimension = 1920
  ): void {
    if (!PreviewEngine.isInitialized()) {
      PreviewEngine.init(sourceImage, maxDimension);
    }
    PreviewEngine.render(targetCanvas, params);
  }

  /**
   * Backwards-compatible export function delegating to ExportEngine.
   */
  public static async exportFullResolutionBlob(
    sourceImage: HTMLImageElement,
    params: CorrectionParameters,
    mimeType = 'image/jpeg',
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    return ExportEngine.export(sourceImage, params, mimeType, onProgress);
  }
}

/**
 * =====================================================================
 * PREVIEW ENGINE
 * =====================================================================
 * Optimized exclusively for real-time responsiveness and zero memory leak.
 * Caches downscaled baseline pixels once upon image load.
 * Decouples slider interactions from 24MP+ decoding.
 * Uses requestAnimationFrame scheduling to prevent frame stacking.
 */
export class PreviewEngine {
  private static cachedBaselineImageData: ImageData | null = null;
  private static cachedSourceImage: HTMLImageElement | null = null;
  private static workingImageData: ImageData | null = null;
  private static scratchBuffer: Uint8ClampedArray | null = null;
  private static cachedWidth = 0;
  private static cachedHeight = 0;
  private static rafId: number | null = null;
  private static pendingParams: CorrectionParameters | null = null;
  private static isInitializedState = false;

  public static isInitialized(): boolean {
    return this.isInitializedState && this.cachedBaselineImageData !== null;
  }

  /**
   * Initializes the preview baseline cache.
   * Performs proportional downscaling once and stores raw baseline ImageData.
   */
  public static init(sourceImage: HTMLImageElement, maxDimension = 1920): { width: number; height: number } {
    this.destroy();

    const naturalW = sourceImage.naturalWidth || sourceImage.width;
    const naturalH = sourceImage.naturalHeight || sourceImage.height;

    if (!naturalW || !naturalH || naturalW <= 0 || naturalH <= 0) {
      throw new Error('Dimensi gambar sumber tidak valid.');
    }

    let w = naturalW;
    let h = naturalH;

    if (w > maxDimension || h > maxDimension) {
      if (w > h) {
        h = Math.round((h * maxDimension) / w);
        w = maxDimension;
      } else {
        w = Math.round((w * maxDimension) / h);
        h = maxDimension;
      }
    }

    this.cachedWidth = w;
    this.cachedHeight = h;
    this.cachedSourceImage = sourceImage;

    // Temporary offscreen canvas for baseline extraction
    let offscreen: HTMLCanvasElement | null = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;

    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      offscreen.width = 0;
      offscreen.height = 0;
      offscreen = null;
      throw new Error('Gagal mengalokasikan konteks Kanvas Pratinjau.');
    }

    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(sourceImage, 0, 0, w, h);
    const baseline = ctx.getImageData(0, 0, w, h);

    // Sanity sample: check if sourceImage produced non-zero pixels
    const bData = baseline.data;
    let hasSampleContent = false;
    const sampleStep = Math.max(4, Math.floor(bData.length / 400) * 4);
    for (let i = 0; i < bData.length; i += sampleStep) {
      if (bData[i] > 0 || bData[i + 1] > 0 || bData[i + 2] > 0 || bData[i + 3] > 0) {
        hasSampleContent = true;
        break;
      }
    }

    if (!hasSampleContent) {
      console.warn('[PreviewEngine] Baseline extract yielded blank frame, will re-extract on first draw.');
      this.cachedBaselineImageData = null;
    } else {
      // Ensure alpha channel is strictly 255 for solid photos
      for (let i = 3; i < bData.length; i += 4) {
        if (bData[i] === 0) bData[i] = 255;
      }
      this.cachedBaselineImageData = baseline;
    }

    // Allocate single reusable working buffer and scratch buffer for zero-GC slider drags
    this.workingImageData = ctx.createImageData(w, h);
    this.scratchBuffer = new Uint8ClampedArray(w * h * 4);

    // Immediately release offscreen canvas backing store
    offscreen.width = 0;
    offscreen.height = 0;
    offscreen = null;

    this.isInitializedState = true;
    return { width: w, height: h };
  }

  /**
   * Renders the current parameters to the target canvas.
   * Coalesces rapid slider movements via requestAnimationFrame.
   * Avoids destructive canvas resizing when dimensions match.
   */
  public static render(
    targetCanvas: HTMLCanvasElement,
    params: CorrectionParameters,
    onRenderDone?: () => void
  ): void {
    if (!targetCanvas) return;

    if (!this.cachedBaselineImageData && this.cachedSourceImage) {
      try {
        this.init(this.cachedSourceImage, 1920);
      } catch (e) {
        console.warn('Auto-init fallback failed:', e);
      }
    }

    this.pendingParams = params;

    // If an animation frame is already scheduled, update pendingParams and return
    if (this.rafId !== null) {
      return;
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const currentParams = this.pendingParams;
      if (!currentParams) return;

      const w = this.cachedWidth;
      const h = this.cachedHeight;

      if (!w || !h) return;

      // CRITICAL MEMORY CHECK: Only resize canvas if dimensions actually changed
      if (targetCanvas.width !== w || targetCanvas.height !== h) {
        targetCanvas.width = w;
        targetCanvas.height = h;
      }

      const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        console.error('[PreviewEngine] Kanvas 2D Context hilang.');
        return;
      }

      if (this.cachedBaselineImageData && this.workingImageData) {
        // Fast native memory transfer from cached baseline to working buffer
        this.workingImageData.data.set(this.cachedBaselineImageData.data);

        // Apply Lightroom tone and color science in-place with reusable scratch buffer
        ImageProcessor.applyParametersToImageData(
          this.workingImageData,
          currentParams,
          this.scratchBuffer
        );

        // Blit to screen
        ctx.putImageData(this.workingImageData, 0, 0);
      } else if (this.cachedSourceImage) {
        // Direct fallback: draw source and process
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(this.cachedSourceImage, 0, 0, w, h);
        const baseline = ctx.getImageData(0, 0, w, h);
        for (let i = 3; i < baseline.data.length; i += 4) {
          if (baseline.data[i] === 0) baseline.data[i] = 255;
        }
        this.cachedBaselineImageData = baseline;

        if (!this.workingImageData || this.workingImageData.width !== w || this.workingImageData.height !== h) {
          this.workingImageData = ctx.createImageData(w, h);
        }
        this.workingImageData.data.set(baseline.data);

        ImageProcessor.applyParametersToImageData(
          this.workingImageData,
          currentParams,
          this.scratchBuffer || undefined
        );
        ctx.putImageData(this.workingImageData, 0, 0);
      }

      if (onRenderDone) {
        onRenderDone();
      }
    });
  }

  public static getDimensions(): { width: number; height: number } {
    return { width: this.cachedWidth, height: this.cachedHeight };
  }

  /**
   * Releases all cached buffers, typed arrays, and pending frames from memory.
   */
  public static destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingParams = null;
    this.cachedBaselineImageData = null;
    this.cachedSourceImage = null;
    this.workingImageData = null;
    this.scratchBuffer = null;
    this.cachedWidth = 0;
    this.cachedHeight = 0;
    this.isInitializedState = false;
  }
}

/**
 * =====================================================================
 * EXPORT ENGINE
 * =====================================================================
 * Operates on the full original source image at maximum natural resolution.
 * Never downscales, never captures from screen or preview buffer.
 * Provides granular progress reporting and guaranteed memory cleanup.
 */
export class ExportEngine {
  public static async export(
    sourceImage: HTMLImageElement,
    params: CorrectionParameters,
    mimeType = 'image/jpeg',
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const width = sourceImage.naturalWidth || sourceImage.width;
    const height = sourceImage.naturalHeight || sourceImage.height;

    if (!width || !height || width <= 0 || height <= 0) {
      throw new Error('Dimensi foto asli tidak valid atau belum siap untuk diekspor.');
    }

    const MAX_CANVAS_DIM = 16384;
    if (width > MAX_CANVAS_DIM || height > MAX_CANVAS_DIM) {
      throw new Error(`Resolusi foto (${width}×${height}) melebihi batas kanvas maksimum browser (${MAX_CANVAS_DIM}px).`);
    }

    if (onProgress) onProgress(10);

    let canvas: HTMLCanvasElement | null = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    let ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      canvas.width = 0;
      canvas.height = 0;
      canvas = null;
      throw new Error('Gagal menginisialisasi kanvas ekspor resolusi penuh (Memori RAM browser tidak mencukupi).');
    }

    try {
      if (onProgress) onProgress(25);
      ctx.drawImage(sourceImage, 0, 0, width, height);

      if (onProgress) onProgress(45);
      const imageData = ctx.getImageData(0, 0, width, height);

      if (onProgress) onProgress(65);
      // Process full original resolution pixels
      ImageProcessor.applyParametersToImageData(imageData, params);

      if (onProgress) onProgress(85);
      ctx.putImageData(imageData, 0, 0);

      if (onProgress) onProgress(92);

      const isPng = mimeType.toLowerCase().includes('png');
      const exportType = isPng ? 'image/png' : 'image/jpeg';
      const exportQuality = isPng ? undefined : 0.98;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas!.toBlob(
          (b) => {
            if (b) {
              resolve(b);
            } else {
              reject(new Error('Browser gagal mengekspor blob (Memori tidak mencukupi untuk resolusi penuh ini).'));
            }
          },
          exportType,
          exportQuality
        );
      });

      if (onProgress) onProgress(100);
      return blob;
    } finally {
      // GUARANTEED MEMORY RELEASE: Destroy canvas allocation immediately
      if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        ctx = null;
        canvas = null;
      }
    }
  }
}
