/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LightroomParameter } from '../types/analyzer';
import { ArrowUp, ArrowDown, Minus, Copy, Check } from 'lucide-react';

interface ParameterCardProps {
  param: LightroomParameter;
}

export const ParameterCard: React.FC<ParameterCardProps> = ({ param }) => {
  const [copied, setCopied] = useState(false);

  const isCorrectionRequired = param.adjustmentRequired;
  const isOptimal = param.status === 'NORMAL';
  const isNotDetectable = param.status === 'NOT_DETECTABLE';

  const getStatusBadge = () => {
    if (param.status === 'TOO_LOW') {
      return {
        label: 'Terlalu Rendah',
        classes: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      };
    }
    if (param.status === 'TOO_HIGH') {
      return {
        label: 'Terlalu Tinggi',
        classes: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
      };
    }
    if (param.status === 'NORMAL') {
      return {
        label: 'Optimal / Sesuai',
        classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      };
    }
    return {
      label: 'Netral / Tak Terdeteksi',
      classes: 'bg-slate-700/30 text-slate-400 border-slate-700'
    };
  };

  const getDirectionIcon = () => {
    if (param.adjustmentDirection === 'INCREASE') {
      return (
        <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold">
          <ArrowUp className="w-3.5 h-3.5" />
          <span>Naikkan</span>
        </span>
      );
    }
    if (param.adjustmentDirection === 'DECREASE') {
      return (
        <span className="flex items-center gap-1 text-rose-400 text-xs font-semibold">
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Turunkan</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-slate-400 text-xs font-medium">
        <Minus className="w-3.5 h-3.5" />
        <span>Pertahankan</span>
      </span>
    );
  };

  const handleCopySingle = () => {
    const text = `${param.parameterName}: ${param.recommendedValue}${param.unit ? ' ' + param.unit : ''} (${param.adjustmentDirection}) — ${param.reason}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const statusInfo = getStatusBadge();

  return (
    <div className={`p-3.5 rounded-lg border transition-all ${
      isCorrectionRequired
        ? 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600'
        : isOptimal
        ? 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
        : 'bg-slate-900/40 border-slate-800/60'
    }`}>
      {/* Top row: Name & Status Badge */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h4 className="text-xs font-semibold text-slate-200">
            {param.parameterName}
          </h4>
          <span className="text-[10px] text-slate-400 font-mono block">
            {param.typicalRange ? `Rentang: ${param.typicalRange}` : ''}
          </span>
        </div>

        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border font-sans ${statusInfo.classes}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Middle row: Recommended Value & Direction */}
      <div className="flex items-center justify-between py-2 px-2.5 rounded bg-slate-950/70 border border-slate-800/80 mb-2.5">
        <div className="flex items-baseline gap-1.5 font-mono">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Nilai Rekomendasi:</span>
          <span className={`text-sm font-bold ${isCorrectionRequired ? 'text-amber-400' : 'text-slate-200'}`}>
            {typeof param.recommendedValue === 'number' && param.recommendedValue > 0 && !String(param.recommendedValue).startsWith('+')
              ? `+${param.recommendedValue}`
              : param.recommendedValue}
            {param.unit ? ` ${param.unit}` : ''}
          </span>
        </div>

        <div>
          {getDirectionIcon()}
        </div>
      </div>

      {/* Reason and Condition description */}
      <p className="text-[11px] text-slate-300 leading-snug mb-2">
        <span className="text-slate-400 font-medium">Alasan: </span>
        {param.reason || param.currentCondition}
      </p>

      {/* Footer: Confidence and Copy Action */}
      <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-800/70">
        <div className="flex items-center gap-1.5 text-slate-500 font-mono">
          <span>Keyakinan:</span>
          <span className="text-slate-300 font-semibold">{Math.round((param.confidence || 0.9) * 100)}%</span>
        </div>

        <button
          onClick={handleCopySingle}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Salin parameter ini"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Tersalin' : 'Salin'}</span>
        </button>
      </div>
    </div>
  );
};
