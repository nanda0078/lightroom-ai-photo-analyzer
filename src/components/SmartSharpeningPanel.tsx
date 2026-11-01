/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  ShieldCheck,
  Check,
  Focus,
  Layers,
  Wand2
} from 'lucide-react';
import { SmartSharpeningConfig, DEFAULT_SMART_SHARPENING } from '../types/analyzer';

interface SmartSharpeningPanelProps {
  config: SmartSharpeningConfig;
  onChange: (config: SmartSharpeningConfig) => void;
  disabled?: boolean;
}

const PRESET_OPTIONS: Array<{
  value: 25 | 40 | 60 | 80;
  label: string;
  desc: string;
  radius: number;
  detail: number;
  masking: number;
  noiseSuppression: number;
  texturePreservation: number;
  edgePreservation: number;
  haloSuppression: number;
}> = [
  {
    value: 25,
    label: '25% · Lembut',
    desc: 'Sentuhan natural untuk potret santai & studio lembut',
    radius: 0.8,
    detail: 35,
    masking: 70,
    noiseSuppression: 45,
    texturePreservation: 85,
    edgePreservation: 65,
    haloSuppression: 90
  },
  {
    value: 40,
    label: '40% · Standar',
    desc: 'Keseimbangan optimal pakaian, ornamen, mata & latar',
    radius: 1.0,
    detail: 50,
    masking: 60,
    noiseSuppression: 35,
    texturePreservation: 75,
    edgePreservation: 70,
    haloSuppression: 80
  },
  {
    value: 60,
    label: '60% · Tegas',
    desc: 'Ketajaman tajam berkarakter untuk busana & arsitektur',
    radius: 1.2,
    detail: 65,
    masking: 50,
    noiseSuppression: 30,
    texturePreservation: 70,
    edgePreservation: 75,
    haloSuppression: 75
  },
  {
    value: 80,
    label: '80% · Maksimal',
    desc: 'Detail mikro intensif untuk perhiasan, kain rajut & makro',
    radius: 1.5,
    detail: 80,
    masking: 40,
    noiseSuppression: 25,
    texturePreservation: 65,
    edgePreservation: 85,
    haloSuppression: 70
  }
];

export const SmartSharpeningPanel: React.FC<SmartSharpeningPanelProps> = ({
  config,
  onChange,
  disabled = false
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleToggleEnabled = () => {
    onChange({
      ...config,
      enabled: !config.enabled
    });
  };

  const handleApplyPreset = (presetDef: typeof PRESET_OPTIONS[number]) => {
    onChange({
      ...config,
      enabled: true,
      preset: presetDef.value,
      amount: presetDef.value,
      radius: presetDef.radius,
      detail: presetDef.detail,
      masking: presetDef.masking,
      noiseSuppression: presetDef.noiseSuppression,
      texturePreservation: presetDef.texturePreservation,
      edgePreservation: presetDef.edgePreservation,
      haloSuppression: presetDef.haloSuppression
    });
  };

  const handleAmountChange = (newAmount: number) => {
    // Check if newAmount matches any preset exactly
    const matchingPreset = PRESET_OPTIONS.find((p) => p.value === newAmount);
    onChange({
      ...config,
      amount: newAmount,
      preset: matchingPreset ? matchingPreset.value : null
    });
  };

  const handleFieldChange = (field: keyof SmartSharpeningConfig, val: number) => {
    onChange({
      ...config,
      [field]: val,
      preset: null // Custom modification clears preset badge
    });
  };

  const handleReset = () => {
    onChange({ ...DEFAULT_SMART_SHARPENING });
  };

  return (
    <div className="bg-[#121620] border border-amber-500/25 rounded-xl shadow-xl overflow-hidden transition-all duration-200">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
            <Focus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold tracking-wide text-slate-100 flex items-center gap-2">
                AI SMART ADAPTIVE SHARPENING
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                Full Image Detail Enhancement
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Penajaman menyeluruh: Wajah, rambut, mata, busana, ornamen &amp; latar belakang dengan perlindungan natural non-generatif.
            </p>
          </div>
        </div>

        {/* Master Toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-slate-400">
            {config.enabled ? (
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Penajaman Aktif
              </span>
            ) : (
              <span className="text-slate-500">Nonaktif</span>
            )}
          </span>

          <button
            type="button"
            disabled={disabled}
            onClick={handleToggleEnabled}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              config.enabled ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                config.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Controls Section */}
      <div className={`p-4 sm:p-5 space-y-5 ${!config.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Quick Intensity Presets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Wand2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Preset Intensitas Cepat:</span>
            </label>
            <span className="text-[11px] font-mono text-slate-400">
              Pilihan terkalibrasi otomatis
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PRESET_OPTIONS.map((p) => {
              const isSelected = config.enabled && config.preset === p.value && config.amount === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  disabled={disabled || !config.enabled}
                  onClick={() => handleApplyPreset(p)}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-[0_0_15px_rgba(245,158,11,0.2)] font-bold'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{p.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                    {p.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Master Intensity Slider */}
        <div className="p-3.5 rounded-lg bg-slate-900/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              <label htmlFor="master-amount-slider" className="text-xs font-bold text-slate-200">
                Kekuatan Penajaman Keseluruhan (Sharpening Amount)
              </label>
            </div>
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                {config.amount}%
              </span>
            </div>
          </div>

          <input
            id="master-amount-slider"
            type="range"
            min="0"
            max="100"
            step="1"
            value={config.amount}
            disabled={disabled || !config.enabled}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
            className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
          />

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>0% (Off)</span>
            <span>25% (Lembut)</span>
            <span>40% (Standar)</span>
            <span>60% (Tegas)</span>
            <span>80% (Maksimal)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Protection Summary Strip */}
        <div className="px-3.5 py-2.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[11px]">
              <strong className="text-emerald-300">Edge-Aware &amp; Anti-Halo:</strong> Pori-pori kulit &amp; wajah terlindungi dari oversharpening; pakaian, perhiasan &amp; ornamen ditingkatkan secara detail.
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleReset}
              disabled={disabled || !config.enabled}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-medium transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Standar</span>
            </button>
          </div>
        </div>

        {/* Expandable Advanced Settings (8 Precision Controls) */}
        <div className="pt-2 border-t border-slate-800/80">
          <button
            type="button"
            disabled={disabled || !config.enabled}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full py-2 px-3 rounded-lg bg-slate-900/80 hover:bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Pengaturan Lanjutan (8 Kontrol Presisi)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {showAdvanced ? 'Tutup' : 'Buka'}
              </span>
            </div>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 animate-in fade-in duration-200">
              {/* 1. Sharpening Amount */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">1. Sharpening Amount</span>
                  <span className="font-mono text-amber-400 font-bold">{config.amount}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.amount}
                  onChange={(e) => handleFieldChange('amount', Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">Kekuatan maksimum penajaman piksel.</p>
              </div>

              {/* 2. Radius */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">2. Radius</span>
                  <span className="font-mono text-amber-400 font-bold">{config.radius.toFixed(1)} px</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={config.radius}
                  onChange={(e) => handleFieldChange('radius', Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">Ukuran area di sekitar tepi (0.5 – 3.0 px).</p>
              </div>

              {/* 3. Detail */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">3. Detail (High-Frequency)</span>
                  <span className="font-mono text-amber-400 font-bold">{config.detail}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.detail}
                  onChange={(e) => handleFieldChange('detail', Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">Penekanan detail halus frekuensi tinggi.</p>
              </div>

              {/* 4. Masking */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">4. Masking (Edge Threshold)</span>
                  <span className="font-mono text-amber-400 font-bold">{config.masking}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.masking}
                  onChange={(e) => handleFieldChange('masking', Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">Membatasi penajaman hanya pada kontur tepi nyata.</p>
              </div>

              {/* 5. Noise Suppression */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">5. Noise Suppression</span>
                  <span className="font-mono text-amber-400 font-bold">{config.noiseSuppression}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.noiseSuppression}
                  onChange={(e) => handleFieldChange('noiseSuppression', Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">Meredam peningkatan grain di area gelap &amp; rata.</p>
              </div>

              {/* 6. Texture Preservation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">6. Texture Preservation</span>
                  <span className="font-mono text-amber-400 font-bold">{config.texturePreservation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.texturePreservation}
                  onChange={(e) => handleFieldChange('texturePreservation', Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">Pertahankan kelembutan rajutan kain &amp; serat pakaian.</p>
              </div>

              {/* 7. Edge Preservation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">7. Edge Preservation</span>
                  <span className="font-mono text-amber-400 font-bold">{config.edgePreservation}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.edgePreservation}
                  onChange={(e) => handleFieldChange('edgePreservation', Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">Menjaga ketajaman garis tepi tanpa efek bergerigi.</p>
              </div>

              {/* 8. Halo Suppression */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-200">8. Halo Suppression</span>
                  <span className="font-mono text-amber-400 font-bold">{config.haloSuppression}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={config.haloSuppression}
                  onChange={(e) => handleFieldChange('haloSuppression', Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
                <p className="text-[10px] text-slate-500">Cegah pendaran putih/hitam di perbatasan kontras tinggi.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
