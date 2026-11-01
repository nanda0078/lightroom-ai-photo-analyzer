/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sliders, Sun, Palette, Wand2, ZoomIn, CheckCircle2 } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#141822] border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-[#181d2a] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Panduan Penerapan Parameter Adobe Lightroom
              </h3>
              <p className="text-[11px] text-slate-400">
                Langkah memasukkan rekomendasi AI ke Lightroom Classic atau Camera Raw
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

        {/* Scrollable Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto leading-relaxed text-slate-300">
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
            <span className="font-bold text-amber-400 block text-xs">
              Filosofi Analisis Lightroom:
            </span>
            <p className="text-slate-300 text-[11px]">
              Rekomendasi yang diberikan oleh Gemini adalah panduan teknis objektif untuk mengoreksi ketidakseimbangan tonal dan warna. Setiap parameter dirancang untuk mempertahankan karakteristik natural foto tanpa distorsi piksel atau penghalusan buatan.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>1. Panel Pencahayaan (Basic Tone & Curves)</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                - Masukkan nilai <strong>Exposure</strong> terlebih dahulu untuk menentukan batas pencahayaan utama.
                <br />
                - Gunakan <strong>Highlights & Shadows</strong> untuk memulihkan detail awan terang dan area bayangan gelap tanpa clipping.
                <br />
                - Pada panel <strong>Tone Curve</strong>, terapkan kurva S halus jika disarankan untuk menambah kedalaman kontras mikro.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs">
                <Palette className="w-4 h-4 text-cyan-400" />
                <span>2. Panel Warna & HSL Mixer (Color Grading)</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                - Atur <strong>Temperature & Tint</strong> untuk mencapai netralitas white balance.
                <br />
                - Pada <strong>HSL Mixer</strong>: kanal Orange mempengaruhi tone kulit (skin tone). Naikkan Luminance kanal Orange sedikit (+5 hingga +10) jika wajah terlihat kusam di bawah cahaya keras.
                <br />
                - Gunakan <strong>Color Grading</strong> (Shadows & Highlights) untuk memberi nuansa sinematik yang harmonis.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs">
                <Wand2 className="w-4 h-4 text-purple-400" />
                <span>3. Panel Efek (Texture & Clarity)</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                - Berhati-hatilah dengan slider <strong>Clarity</strong> pada foto potret. Lebih disarankan menggunakan <strong>Texture</strong> untuk menjaga kelembutan kulit alami.
                <br />
                - <strong>Dehaze</strong> berguna untuk menghilangkan kabut atmosfer pada lanskap luar ruangan.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-100 font-semibold text-xs">
                <ZoomIn className="w-4 h-4 text-emerald-400" />
                <span>4. Panel Detail (Sharpening & Noise Reduction)</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                - <strong>Tips Pro Masking</strong>: Tahan tombol <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-slate-200">Alt</kbd> (Windows) atau <kbd className="px-1 py-0.5 rounded bg-slate-800 font-mono text-slate-200">Option</kbd> (Mac) sambil menggeser slider <strong>Masking</strong>. Layar hitam putih akan muncul: hanya garis putih yang akan dipertajam, melindungi area kulit rata dari noise!
                <br />
                - Naikkan <strong>Luminance Noise Reduction</strong> hanya secukupnya agar detail halus rambut dan kain tidak pudar.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#181d2a] border-t border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors"
          >
            Mengerti, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
};
