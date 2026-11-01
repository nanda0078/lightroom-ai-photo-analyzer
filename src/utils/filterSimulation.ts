/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PhotoAnalysisResult } from '../types/analyzer';

export interface SimulationStyles {
  filter: string;
  overlayStyle?: React.CSSProperties;
  vignetteStyle?: React.CSSProperties;
  activeAdjustments: string[];
  summaryText: string;
}

/**
 * Calculates real-time non-destructive CSS visual filter properties
 * corresponding directly to the Adobe Lightroom parameter recommendations.
 * Preserves the original image file 100% without modifying any binary pixels.
 */
export function calculateLightroomSimulation(
  result: PhotoAnalysisResult | null,
  intensity = 1.0 // 0.0 to 1.0
): SimulationStyles {
  // If result is not yet available, use professional default studio profile
  const adj = result?.adjustments;

  // Extract recommended parameters with professional photography fallbacks
  let expVal = 0.40;
  let contrastVal = 14;
  let highlightsVal = -28;
  let shadowsVal = 32;
  let satVal = 4;
  let vibVal = 18;
  let tempVal = -5;
  let tintVal = 3;
  let vignetteVal = -18;
  let clarityVal = 8;
  let textureVal = 14;

  if (adj) {
    if (typeof adj.light?.exposure?.recommendedValue === 'number') {
      expVal = adj.light.exposure.recommendedValue;
    }
    if (typeof adj.light?.contrast?.recommendedValue === 'number') {
      contrastVal = adj.light.contrast.recommendedValue;
    }
    if (typeof adj.light?.highlights?.recommendedValue === 'number') {
      highlightsVal = adj.light.highlights.recommendedValue;
    }
    if (typeof adj.light?.shadows?.recommendedValue === 'number') {
      shadowsVal = adj.light.shadows.recommendedValue;
    }
    if (typeof adj.color?.saturation?.recommendedValue === 'number') {
      satVal = adj.color.saturation.recommendedValue;
    }
    if (typeof adj.color?.vibrance?.recommendedValue === 'number') {
      vibVal = adj.color.vibrance.recommendedValue;
    }
    if (typeof adj.color?.temperature?.recommendedValue === 'number') {
      tempVal = adj.color.temperature.recommendedValue;
    }
    if (typeof adj.color?.tint?.recommendedValue === 'number') {
      tintVal = adj.color.tint.recommendedValue;
    }
    if (typeof adj.effects?.vignette?.recommendedValue === 'number') {
      vignetteVal = adj.effects.vignette.recommendedValue;
    }
    if (typeof adj.effects?.clarity?.recommendedValue === 'number') {
      clarityVal = adj.effects.clarity.recommendedValue;
    }
    if (typeof adj.effects?.texture?.recommendedValue === 'number') {
      textureVal = adj.effects.texture.recommendedValue;
    }
  }

  const activeAdjustments: string[] = [];

  // 1. Exposure & Shadow Lift (Simulates Lightroom Exposure + Shadows recovery)
  // Standard Lightroom exposure +0.40 EV lifts brightness by ~15-20%
  const shadowLiftFactor = shadowsVal > 0 ? (shadowsVal / 100) * 0.08 : 0;
  const highlightPullFactor = highlightsVal < 0 ? (highlightsVal / 100) * 0.04 : 0;
  const targetBrightness = 1 + (expVal * 0.32 + shadowLiftFactor + highlightPullFactor) * intensity;
  activeAdjustments.push(`Exposure: ${expVal > 0 ? '+' : ''}${expVal.toFixed(2)} EV`);

  // 2. Contrast & Tonal S-Curve
  const targetContrast = 1 + ((contrastVal * 0.009) + (clarityVal * 0.004)) * intensity;
  if (Math.abs(contrastVal) > 1) {
    activeAdjustments.push(`Contrast: ${contrastVal > 0 ? '+' : ''}${contrastVal}`);
  }

  // 3. Vibrance & Saturation: Colors (clothes, background, skin warmth) pop vividly
  const targetSaturation = 1 + ((satVal * 0.01) + (vibVal * 0.012)) * intensity;
  if (Math.abs(vibVal) > 1 || Math.abs(satVal) > 1) {
    activeAdjustments.push(`Vibrance & Sat: +${vibVal} / +${satVal}`);
  }

  // 4. White Balance (Temperature & Tint)
  // Cooler temp (< 0): removes yellowish/tungsten indoor cast, shifting white walls to crisp clean white
  let hueRotate = 0;
  let sepia = 0;
  if (tempVal < 0) {
    hueRotate = tempVal * 0.6 * intensity; // e.g. -3deg to -5deg
    activeAdjustments.push(`Temp: ${tempVal} (Menetralkan Cast Kuning)`);
  } else if (tempVal > 0) {
    sepia = Math.min(20, tempVal * 0.6 * intensity);
    activeAdjustments.push(`Temp: +${tempVal} (Warm Golden)`);
  }

  // Tint (+ = magenta, - = green)
  if (tintVal !== 0) {
    hueRotate += tintVal * 0.25 * intensity;
  }

  // Build composite CSS filter string
  const filterParts = [
    `brightness(${Math.max(0.7, Math.min(1.8, targetBrightness)).toFixed(3)})`,
    `contrast(${Math.max(0.7, Math.min(1.8, targetContrast)).toFixed(3)})`,
    `saturate(${Math.max(0.5, Math.min(2.5, targetSaturation)).toFixed(3)})`
  ];

  if (sepia > 0) {
    filterParts.push(`sepia(${sepia.toFixed(1)}%)`);
  }
  if (Math.abs(hueRotate) > 0.2) {
    filterParts.push(`hue-rotate(${hueRotate.toFixed(1)}deg)`);
  }

  // 5. Vignette (Darkening outer corners to frame subjects in center)
  let vignetteStyle: React.CSSProperties | undefined;
  if (vignetteVal < -2) {
    const opacity = Math.min(0.55, (Math.abs(vignetteVal) / 100) * 0.85 * intensity);
    vignetteStyle = {
      background: `radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(0,0,0,${opacity.toFixed(2)}) 100%)`,
      pointerEvents: 'none'
    };
    activeAdjustments.push(`Vignette: ${vignetteVal}`);
  }

  // 6. Subtle White Balance Tint Overlay for clean studio whites
  let overlayStyle: React.CSSProperties | undefined;
  if (tempVal < -2) {
    // Subtle cool filter that neutralizes indoor yellow lighting
    const coolOpacity = Math.min(0.08, (Math.abs(tempVal) / 100) * 0.15 * intensity);
    overlayStyle = {
      backgroundColor: `rgba(70, 150, 255, ${coolOpacity.toFixed(3)})`,
      mixBlendMode: 'color',
      pointerEvents: 'none'
    };
  }

  const summaryText = [
    `Exposure ${expVal > 0 ? '+' : ''}${expVal.toFixed(2)} EV`,
    `Contrast ${contrastVal > 0 ? '+' : ''}${contrastVal}`,
    `Shadows ${shadowsVal > 0 ? '+' : ''}${shadowsVal}`,
    `Highlights ${highlightsVal}`,
    `Vibrance +${vibVal}`,
    `Temp ${tempVal}`
  ].join(' · ');

  return {
    filter: filterParts.join(' '),
    overlayStyle,
    vignetteStyle,
    activeAdjustments,
    summaryText
  };
}
