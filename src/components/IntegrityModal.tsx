/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, X, Check, Copy, FileCheck } from 'lucide-react';
import { formatBytes } from '../utils/crypto';

interface IntegrityModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalFile: File | null;
  sha256Hash: string;
}

export const IntegrityModal: React.FC<IntegrityModalProps> = ({
  isOpen,
  onClose,
  originalFile,
  sha256Hash
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(sha256Hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#141822] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-[#181d2a] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Verifikasi Integritas File Asli (SHA-256)
              </h3>
              <p className="text-[11px] text-slate-400">
                Jaminan Zero Compression & 100% Unaltered Pixel Guarantee
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex items-start gap-3">
            <FileCheck className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-xs block">
                Integritas Biner Terverifikasi
              </span>
              <p className="text-[11px] leading-relaxed text-emerald-200/90">
                Foto yang Anda unggah tidak pernah melalui kompresi ulang, penataan resolusi, konversi format, atau modifikasi generatif AI. File yang diunduh adalah salinan biner asli dari file yang Anda unggah.
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2.5">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between text-slate-400">
                <span>Nama Berkas Asli:</span>
                <span className="text-slate-200 font-sans">{originalFile?.name || '-'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Ukuran Biner:</span>
                <span className="text-slate-200">{originalFile ? `${originalFile.size} Bytes (${formatBytes(originalFile.size)})` : '-'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tipe MIME:</span>
                <span className="text-slate-200">{originalFile?.type || 'image/jpeg'}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  SHA-256 Cryptographic Checksum:
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Tersalin' : 'Salin Hash'}</span>
                </button>
              </div>
              <div className="p-2 rounded bg-slate-950 font-mono text-[11px] text-amber-400/90 break-all select-all border border-slate-800">
                {sha256Hash || 'Menghitung hash...'}
              </div>
            </div>
          </div>

          {/* Checksum Matching Logic Explanation */}
          <div className="text-[11px] text-slate-400 leading-relaxed space-y-1 bg-slate-900/50 p-3 rounded-lg border border-slate-800/80">
            <span className="text-slate-300 font-semibold block">Cara memverifikasi secara independen:</span>
            <p>1. Unduh foto asli melalui tombol <strong>Unduh Foto Asli</strong>.</p>
            <p>2. Jalankan perintah di terminal komputer Anda:</p>
            <code className="block p-1.5 rounded bg-slate-950 text-slate-300 font-mono text-[10px] my-1">
              sha256sum &quot;{originalFile?.name || 'foto.jpg'}&quot;
            </code>
            <p>3. Bandingkan nilainya dengan hash di atas. Hasilnya dijamin 100% identik.</p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-[#181d2a] border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
