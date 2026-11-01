/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PhotoAnalysisResult } from '../types/analyzer';
import { ParameterCard } from './ParameterCard';
import { Sun, Palette, Wand2, ZoomIn, Copy, Check } from 'lucide-react';
import { generateCategoryRecommendationsText } from '../utils/exporter';

interface CategoryTabsProps {
  result: PhotoAnalysisResult;
}

export const CategoryTabs: React.FC<CategoryTabsProps> = ({ result }) => {
  const [activeTab, setActiveTab] = useState<'light' | 'color' | 'effects' | 'detail'>('light');
  const [colorSubTab, setColorSubTab] = useState<'basic' | 'hsl' | 'grading'>('basic');
  const [copiedCat, setCopiedCat] = useState(false);

  const handleCopyCategory = () => {
    const text = generateCategoryRecommendationsText(result, activeTab);
    navigator.clipboard.writeText(text);
    setCopiedCat(true);
    setTimeout(() => setCopiedCat(false), 2000);
  };

  const tabs = [
    { id: 'light' as const, label: '1. Pencahayaan', icon: Sun },
    { id: 'color' as const, label: '2. Warna', icon: Palette },
    { id: 'effects' as const, label: '3. Efek', icon: Wand2 },
    { id: 'detail' as const, label: '4. Detail', icon: ZoomIn },
  ];

  const light = result.adjustments.light;
  const color = result.adjustments.color;
  const fx = result.adjustments.effects;
  const detail = result.adjustments.detail;

  return (
    <div className="bg-[#13161f] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Category Navigation Bar */}
      <div className="px-3 py-2.5 bg-[#181c26] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={handleCopyCategory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
        >
          {copiedCat ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
          <span>{copiedCat ? 'Kategori Disalin!' : 'Salin Kategori Ini'}</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-4 sm:p-5">
        {/* TAB 1: LIGHT */}
        {activeTab === 'light' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Basic Tone Adjustments
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Exposure, Contrast, Highlights, Shadows, Whites, Blacks
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <ParameterCard param={light.exposure} />
                <ParameterCard param={light.contrast} />
                <ParameterCard param={light.highlights} />
                <ParameterCard param={light.shadows} />
                <ParameterCard param={light.whites} />
                <ParameterCard param={light.blacks} />
                <ParameterCard param={light.autoTone} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Curves & Dynamic Range
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Tone Curve, Parametric, Point, and RGB Channels
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <ParameterCard param={light.toneCurve} />
                <ParameterCard param={light.parametricCurve} />
                <ParameterCard param={light.pointCurve} />
                <ParameterCard param={light.rgbCurveRed} />
                <ParameterCard param={light.rgbCurveGreen} />
                <ParameterCard param={light.rgbCurveBlue} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: COLOR */}
        {activeTab === 'color' && (
          <div className="space-y-5">
            {/* Sub-nav for Color tools */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <button
                onClick={() => setColorSubTab('basic')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  colorSubTab === 'basic'
                    ? 'bg-slate-800 text-amber-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                White Balance & Global
              </button>
              <button
                onClick={() => setColorSubTab('hsl')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  colorSubTab === 'hsl'
                    ? 'bg-slate-800 text-amber-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                HSL Color Mixer (8 Kanal)
              </button>
              <button
                onClick={() => setColorSubTab('grading')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  colorSubTab === 'grading'
                    ? 'bg-slate-800 text-amber-400 border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Color Grading & Split Toning
              </button>
            </div>

            {colorSubTab === 'basic' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <ParameterCard param={color.temperature} />
                  <ParameterCard param={color.tint} />
                  <ParameterCard param={color.vibrance} />
                  <ParameterCard param={color.saturation} />
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                    Point Color Precision
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <ParameterCard param={color.pointColor.hue} />
                    <ParameterCard param={color.pointColor.saturation} />
                    <ParameterCard param={color.pointColor.luminance} />
                    <ParameterCard param={color.pointColor.colorRange} />
                  </div>
                </div>
              </div>
            )}

            {colorSubTab === 'hsl' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-400">
                  Analisis per kanal HSL (Hue, Saturation, Luminance) untuk 8 warna standar Adobe Lightroom.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {color.hslMixer.map((channelItem) => (
                    <div key={channelItem.channel} className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                        <span className="font-bold text-xs text-slate-200">Kanal {channelItem.channel}</span>
                        <div className="flex items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                channelItem.channel === 'Red' ? '#ef4444' :
                                channelItem.channel === 'Orange' ? '#f97316' :
                                channelItem.channel === 'Yellow' ? '#eab308' :
                                channelItem.channel === 'Green' ? '#22c55e' :
                                channelItem.channel === 'Aqua' ? '#06b6d4' :
                                channelItem.channel === 'Blue' ? '#3b82f6' :
                                channelItem.channel === 'Purple' ? '#a855f7' : '#ec4899'
                            }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 text-[11px] font-mono">
                        <div className="flex justify-between items-center p-1 rounded bg-slate-950/60">
                          <span className="text-slate-400">Hue:</span>
                          <span className={channelItem.hue.adjustmentRequired ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                            {channelItem.hue.recommendedValue}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-1 rounded bg-slate-950/60">
                          <span className="text-slate-400">Saturation:</span>
                          <span className={channelItem.saturation.adjustmentRequired ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                            {channelItem.saturation.recommendedValue}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-1 rounded bg-slate-950/60">
                          <span className="text-slate-400">Luminance:</span>
                          <span className={channelItem.luminance.adjustmentRequired ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                            {channelItem.luminance.recommendedValue}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-tight pt-1">
                        {channelItem.hue.reason || channelItem.luminance.reason || 'Kondisi kanal seimbang.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {colorSubTab === 'grading' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Shadows Color Wheel
                    </h4>
                    <ParameterCard param={color.colorGrading.shadows.hue} />
                    <ParameterCard param={color.colorGrading.shadows.saturation} />
                    <ParameterCard param={color.colorGrading.shadows.luminance} />
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Midtones Color Wheel
                    </h4>
                    <ParameterCard param={color.colorGrading.midtones.hue} />
                    <ParameterCard param={color.colorGrading.midtones.saturation} />
                    <ParameterCard param={color.colorGrading.midtones.luminance} />
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-2">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Highlights Color Wheel
                    </h4>
                    <ParameterCard param={color.colorGrading.highlights.hue} />
                    <ParameterCard param={color.colorGrading.highlights.saturation} />
                    <ParameterCard param={color.colorGrading.highlights.luminance} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <ParameterCard param={color.colorGrading.blending} />
                  <ParameterCard param={color.colorGrading.balance} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EFFECTS */}
        {activeTab === 'effects' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <ParameterCard param={fx.texture} />
              <ParameterCard param={fx.clarity} />
              <ParameterCard param={fx.dehaze} />
              <ParameterCard param={fx.vignette} />
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2">
                Film Grain Simulation
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ParameterCard param={fx.grain} />
                <ParameterCard param={fx.grainSize} />
                <ParameterCard param={fx.grainRoughness} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DETAIL */}
        {activeTab === 'detail' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Sharpening (Ketajaman Optis)
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Amount, Radius, Detail, Masking
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <ParameterCard param={detail.sharpening} />
                <ParameterCard param={detail.radius} />
                <ParameterCard param={detail.detail} />
                <ParameterCard param={detail.masking} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Noise Reduction (Peredaman Noise Sensor)
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">
                  Luminance & Color Noise Controls
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <ParameterCard param={detail.noiseReduction} />
                <ParameterCard param={detail.luminance} />
                <ParameterCard param={detail.luminanceDetail} />
                <ParameterCard param={detail.luminanceContrast} />
                <ParameterCard param={detail.colorNoiseReduction} />
                <ParameterCard param={detail.colorDetail} />
                <ParameterCard param={detail.colorSmoothness} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
