/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PhotoAnalysisResult, LightroomParameter } from '../types/analyzer';

function formatParamLine(param: LightroomParameter): string {
  const dirSymbol = param.adjustmentDirection === 'INCREASE' ? '▲' : param.adjustmentDirection === 'DECREASE' ? '▼' : '■';
  const val = typeof param.recommendedValue === 'number' && param.recommendedValue > 0 && !String(param.recommendedValue).startsWith('+')
    ? `+${param.recommendedValue}`
    : `${param.recommendedValue}`;
  const unit = param.unit ? ` ${param.unit}` : '';
  const req = param.adjustmentRequired ? `[KOREKSI: ${param.status}]` : '[OPTIMAL]';
  return `  • ${param.parameterName.padEnd(28, ' ')} : ${val}${unit} (${dirSymbol} ${param.adjustmentDirection}) ${req} — ${param.reason}`;
}

export function generateAllRecommendationsText(result: PhotoAnalysisResult): string {
  const lines: string[] = [];
  lines.push(`================================================================`);
  lines.push(`REKOMENDASI PARAMETER ADOBE LIGHTROOM — AI PHOTO ANALYZER`);
  lines.push(`Foto: ${result.fileName} (${result.width}x${result.height} px, ${(result.fileSize / 1024 / 1024).toFixed(2)} MB)`);
  lines.push(`Kualitas Teknis: ${result.overallQuality}`);
  lines.push(`Waktu Analisis: ${new Date(result.analysisTimestamp).toLocaleString('id-ID')}`);
  lines.push(`SHA-256 Integritas File: ${result.sha256Hash}`);
  lines.push(`Ringkasan: ${result.technicalSummary}`);
  lines.push(`================================================================\n`);

  lines.push(`[1. PENCAHAYAAN (LIGHT)]`);
  const light = result.adjustments.light;
  lines.push(formatParamLine(light.exposure));
  lines.push(formatParamLine(light.contrast));
  lines.push(formatParamLine(light.highlights));
  lines.push(formatParamLine(light.shadows));
  lines.push(formatParamLine(light.whites));
  lines.push(formatParamLine(light.blacks));
  lines.push(formatParamLine(light.autoTone));
  lines.push(formatParamLine(light.toneCurve));
  lines.push(formatParamLine(light.parametricCurve));
  lines.push(formatParamLine(light.pointCurve));
  lines.push(formatParamLine(light.rgbCurveRed));
  lines.push(formatParamLine(light.rgbCurveGreen));
  lines.push(formatParamLine(light.rgbCurveBlue));
  lines.push('');

  lines.push(`[2. WARNA (COLOR)]`);
  const color = result.adjustments.color;
  lines.push(formatParamLine(color.temperature));
  lines.push(formatParamLine(color.tint));
  lines.push(formatParamLine(color.vibrance));
  lines.push(formatParamLine(color.saturation));
  lines.push('  --- HSL Color Mixer (8 Channels) ---');
  color.hslMixer.forEach((ch) => {
    lines.push(`  [Kanal ${ch.channel}]`);
    lines.push(formatParamLine(ch.hue));
    lines.push(formatParamLine(ch.saturation));
    lines.push(formatParamLine(ch.luminance));
  });
  lines.push('  --- Color Grading (Split Toning) ---');
  lines.push(`  Shadows    : Hue ${color.colorGrading.shadows.hue.recommendedValue}, Sat ${color.colorGrading.shadows.saturation.recommendedValue}, Lum ${color.colorGrading.shadows.luminance.recommendedValue}`);
  lines.push(`  Midtones   : Hue ${color.colorGrading.midtones.hue.recommendedValue}, Sat ${color.colorGrading.midtones.saturation.recommendedValue}, Lum ${color.colorGrading.midtones.luminance.recommendedValue}`);
  lines.push(`  Highlights : Hue ${color.colorGrading.highlights.hue.recommendedValue}, Sat ${color.colorGrading.highlights.saturation.recommendedValue}, Lum ${color.colorGrading.highlights.luminance.recommendedValue}`);
  lines.push(formatParamLine(color.colorGrading.blending));
  lines.push(formatParamLine(color.colorGrading.balance));
  lines.push('');

  lines.push(`[3. EFEK (EFFECTS)]`);
  const effects = result.adjustments.effects;
  lines.push(formatParamLine(effects.texture));
  lines.push(formatParamLine(effects.clarity));
  lines.push(formatParamLine(effects.dehaze));
  lines.push(formatParamLine(effects.vignette));
  lines.push(formatParamLine(effects.grain));
  lines.push(formatParamLine(effects.grainSize));
  lines.push(formatParamLine(effects.grainRoughness));
  lines.push('');

  lines.push(`[4. DETAIL (SHARPENING & NOISE REDUCTION)]`);
  const detail = result.adjustments.detail;
  lines.push(formatParamLine(detail.sharpening));
  lines.push(formatParamLine(detail.radius));
  lines.push(formatParamLine(detail.detail));
  lines.push(formatParamLine(detail.masking));
  lines.push(formatParamLine(detail.noiseReduction));
  lines.push(formatParamLine(detail.luminance));
  lines.push(formatParamLine(detail.luminanceDetail));
  lines.push(formatParamLine(detail.luminanceContrast));
  lines.push(formatParamLine(detail.colorNoiseReduction));
  lines.push(formatParamLine(detail.colorDetail));
  lines.push(formatParamLine(detail.colorSmoothness));
  lines.push('');

  lines.push(`----------------------------------------------------------------`);
  lines.push(`PERNYATAAN KEASLIAN FOTO:`);
  lines.push(`- Modifikasi Piksel: TIDAK DILAKUKAN`);
  lines.push(`- Manipulasi Wajah & Kulit: TIDAK DILAKUKAN`);
  lines.push(`- Kompresi Gambar: 0% (Zero-Compression)`);
  lines.push(`================================================================`);
  return lines.join('\n');
}

export function generateCategoryRecommendationsText(
  result: PhotoAnalysisResult,
  category: 'light' | 'color' | 'effects' | 'detail'
): string {
  const lines: string[] = [];
  const catNames = {
    light: 'PENCAHAYAAN (LIGHT)',
    color: 'WARNA (COLOR)',
    effects: 'EFEK (EFFECTS)',
    detail: 'DETAIL (SHARPENING & NOISE REDUCTION)'
  };

  lines.push(`=== REKOMENDASI LIGHTROOM: ${catNames[category]} ===`);
  lines.push(`Foto: ${result.fileName}`);
  lines.push('');

  if (category === 'light') {
    const light = result.adjustments.light;
    Object.values(light).forEach((param) => {
      lines.push(formatParamLine(param));
    });
  } else if (category === 'color') {
    const color = result.adjustments.color;
    lines.push(formatParamLine(color.temperature));
    lines.push(formatParamLine(color.tint));
    lines.push(formatParamLine(color.vibrance));
    lines.push(formatParamLine(color.saturation));
    lines.push('\n--- HSL Mixer ---');
    color.hslMixer.forEach((ch) => {
      lines.push(`[${ch.channel}] Hue: ${ch.hue.recommendedValue}, Sat: ${ch.saturation.recommendedValue}, Lum: ${ch.luminance.recommendedValue}`);
    });
    lines.push('\n--- Color Grading ---');
    lines.push(`Shadows: H:${color.colorGrading.shadows.hue.recommendedValue} S:${color.colorGrading.shadows.saturation.recommendedValue}`);
    lines.push(`Highlights: H:${color.colorGrading.highlights.hue.recommendedValue} S:${color.colorGrading.highlights.saturation.recommendedValue}`);
  } else if (category === 'effects') {
    const fx = result.adjustments.effects;
    Object.values(fx).forEach((param) => {
      lines.push(formatParamLine(param));
    });
  } else if (category === 'detail') {
    const det = result.adjustments.detail;
    Object.values(det).forEach((param) => {
      lines.push(formatParamLine(param));
    });
  }

  return lines.join('\n');
}
