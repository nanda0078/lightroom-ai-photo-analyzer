/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  CorrectionParameters,
  DEFAULT_CORRECTION_PARAMETERS
} from '../types/analyzer';
import {
  Sun,
  Palette,
  ZoomIn,
  RotateCcw,
  Sparkles,
  Plus,
  Minus,
  Undo2,
  Redo2
} from 'lucide-react';

interface ManualAdjustmentPanelProps {
  parameters: CorrectionParameters;
  aiParameters: CorrectionParameters;
  onChange: (updated: CorrectionParameters) => void;
  onResetToAi: () => void;
  onResetAll: () => void;
  hasAiRecommendations?: boolean;
}

type NumericParamKey = Exclude<keyof CorrectionParameters, 'smartSharpening'>;

interface SliderConfig {
  key: NumericParamKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  category: 'light' | 'color' | 'detail';
  description: string;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  // BASIC LIGHT
  { key: 'exposure', label: 'Exposure', min: -4.0, max: 4.0, step: 0.05, unit: 'EV', category: 'light', description: 'Pencahayaan global sensor foto' },
  { key: 'brightness', label: 'Brightness', min: -100, max: 100, step: 1, unit: '', category: 'light', description: 'Tingkat kecerahan tonal linear' },
  { key: 'contrast', label: 'Contrast', min: -100, max: 100, step: 1, unit: '', category: 'light', description: 'Pemisahan area terang dan gelap' },
  { key: 'highlights', label: 'Highlights', min: -100, max: 100, step: 1, unit: '', category: 'light', description: 'Pemulihan detail area sorotan sangat terang' },
  { key: 'shadows', label: 'Shadows', min: -100, max: 100, step: 1, unit: '', category: 'light', description: 'Pengangkatan detail area bayangan gelap' },
  { key: 'whites', label: 'Whites', min: -100, max: 100, step: 1, unit: '', category: 'light', description: 'Batas titik putih (white point)' },
  { key: 'blacks', label: 'Blacks', min: -100, max: 100, step: 1, unit: '', category: 'light', description: 'Batas kedalaman titik hitam (black point)' },

  // COLOR
  { key: 'temperature', label: 'Temperature', min: -100, max: 100, step: 1, unit: '', category: 'color', description: 'Keseimbangan dingin (biru) vs hangat (kuning)' },
  { key: 'tint', label: 'Tint', min: -100, max: 100, step: 1, unit: '', category: 'color', description: 'Koreksi hijau vs magenta' },
  { key: 'vibrance', label: 'Vibrance', min: -100, max: 100, step: 1, unit: '', category: 'color', description: 'Saturasi cerdas melindungi warna kulit' },
  { key: 'saturation', label: 'Saturation', min: -100, max: 100, step: 1, unit: '', category: 'color', description: 'Kepekatan warna keseluruhan' },

  // DETAIL
  { key: 'texture', label: 'Texture', min: -100, max: 100, step: 1, unit: '', category: 'detail', description: 'Ketegasan serat pakaian, kain, dan detail mikro' },
  { key: 'clarity', label: 'Clarity', min: -100, max: 100, step: 1, unit: '', category: 'detail', description: 'Kontras midtone untuk kedalaman subjek' },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 100, step: 1, unit: '', category: 'detail', description: 'Penajaman optik tepi garis dan mata' },
  { key: 'noiseReduction', label: 'Noise Reduction', min: 0, max: 100, step: 1, unit: '', category: 'detail', description: 'Peredaman bintik noise sensor' },
];

export const ManualAdjustmentPanel: React.FC<ManualAdjustmentPanelProps> = ({
  parameters,
  aiParameters,
  onChange,
  onResetToAi,
  onResetAll,
  hasAiRecommendations = false,
}) => {
  const [activeTab, setActiveTab] = useState<'light' | 'color' | 'detail'>('light');
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
  };

  const handleSliderChange = (key: NumericParamKey, value: number) => {
    onChange({
      ...parameters,
      [key]: value,
    });
  };

  const handleStep = (key: NumericParamKey, step: number, min: number, max: number) => {
    const current = (parameters[key] as number) ?? 0;
    const updated = Math.min(max, Math.max(min, Number((current + step).toFixed(2))));
    handleSliderChange(key, updated);
  };

  const handleResetSingle = (key: NumericParamKey) => {
    handleSliderChange(key, (DEFAULT_CORRECTION_PARAMETERS[key] as number) ?? 0);
  };

  const tabs = [
    { id: 'light' as const, label: 'Basic Light', icon: Sun },
    { id: 'color' as const, label: 'Color', icon: Palette },
    { id: 'detail' as const, label: 'Detail', icon: ZoomIn },
  ];

  const currentConfigs = SLIDER_CONFIGS.filter((cfg) => cfg.category === activeTab);

  return (
    <div className="bg-[#13161f] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Panel Header */}
      <div className="px-4 py-3 bg-[#181c26] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <h2 className="text-xs font-semibold tracking-wider uppercase text-slate-200">
            Manual Adjustment &amp; Fine-Tuning Slider
          </h2>
        </div>

        {/* Undo, Redo, and Reset Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              historyIndex <= 0
                ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
            }`}
            title="Batalkan perubahan slider terakhir (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              historyIndex >= history.length - 1
                ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
            }`}
            title="Ulangi perubahan slider (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Redo</span>
          </button>
        </div>

        {/* Global Reset Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onResetToAi}
            disabled={!hasAiRecommendations}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
              !hasAiRecommendations
                ? 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
            }`}
            title={hasAiRecommendations ? 'Kembalikan semua slider ke rekomendasi kalkulasi AI' : 'Rekomendasi AI belum dihitung (tekan Analisis Berdasarkan Instruksi)'}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Reset ke Rekomendasi AI</span>
          </button>

          <button
            onClick={onResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
            title="Kembalikan semua slider ke nilai 0 (netral mentah)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Semua (Netral)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3 pb-2 bg-[#181c26]/60 border-b border-slate-800 flex items-center gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-sm font-bold'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-amber-400'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sliders Grid */}
      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentConfigs.map((cfg) => {
            const val = (parameters[cfg.key] as number) ?? 0;
            const aiVal = (aiParameters[cfg.key] as number) ?? 0;
            const defaultVal = (DEFAULT_CORRECTION_PARAMETERS[cfg.key] as number) ?? 0;
            const isModified = val !== defaultVal;
            const isMatchingAi = val === aiVal;

            return (
              <div
                key={cfg.key}
                className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800/90 hover:border-slate-700 transition-colors space-y-2.5"
              >
                {/* Header of slider card: Label, Values & Reset */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">
                        {cfg.label}
                      </span>
                      {isMatchingAi && aiVal !== 0 && (
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          AI Match
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      {cfg.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Numeric indicator */}
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-950 border border-slate-800 ${
                      val !== 0 ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      {val > 0 && cfg.key !== 'exposure' ? `+${val}` : val}
                      {cfg.unit ? ` ${cfg.unit}` : ''}
                    </span>

                    {/* Single reset button */}
                    {isModified && (
                      <button
                        onClick={() => handleResetSingle(cfg.key)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                        title="Reset ke 0 (netral)"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Slider Controls with Decrement / Increment buttons */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => handleStep(cfg.key, -cfg.step, cfg.min, cfg.max)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
                    title={`Kurangi (${-cfg.step})`}
                  >
                    <Minus className="w-3 h-3" />
                  </button>

                  <div className="relative flex-1 flex items-center">
                    <input
                      type="range"
                      min={cfg.min}
                      max={cfg.max}
                      step={cfg.step}
                      value={val}
                      onChange={(e) =>
                        handleSliderChange(cfg.key, parseFloat(e.target.value))
                      }
                      className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-950 rounded-lg"
                    />
                  </div>

                  <button
                    onClick={() => handleStep(cfg.key, cfg.step, cfg.min, cfg.max)}
                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
                    title={`Tambah (+${cfg.step})`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
