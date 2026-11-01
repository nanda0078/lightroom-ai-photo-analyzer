/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Zap,
  Server,
  Clock,
  Cpu
} from 'lucide-react';
import { ApiStatusInfo, ApiConnectionStatus } from '../types/analyzer';
import {
  getStoredApiKey,
  setStoredApiKey,
  removeStoredApiKey,
  getMaskedKey,
  testGeminiApiKey,
  CONFIGURED_GEMINI_MODEL
} from '../services/geminiClient';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (status: ApiStatusInfo) => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  onStatusUpdated
}) => {
  const [statusData, setStatusData] = useState<ApiStatusInfo | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Fetch current status from backend or fallback to local client storage
  const fetchStatus = async () => {
    setLoading(true);
    setActionFeedback(null);

    const clientKey = getStoredApiKey();

    try {
      const res = await fetch('/api/status', {
        headers: { Accept: 'application/json' }
      });
      const contentType = res.headers.get('content-type') || '';

      if (res.ok && contentType.includes('application/json')) {
        const data: ApiStatusInfo = await res.json();
        // If server has key, prioritize server status
        if (data.hasApiKey) {
          setStatusData(data);
          if (onStatusUpdated) onStatusUpdated(data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Backend not running or static host (GitHub Pages / APK)
    }

    // Fallback to client-side storage (GitHub Pages / Android APK)
    const hasClientKey = clientKey.length > 0;
    const fallbackStatus: ApiStatusInfo = {
      status: hasClientKey ? 'connected' : 'not_configured',
      statusMessage: hasClientKey
        ? 'API Terkonfigurasi di Aplikasi / Browser (Mode Standalone/BYOK)'
        : 'API Belum Dikonfigurasi. Masukkan Google Gemini API Key Anda.',
      hasApiKey: hasClientKey,
      maskedKey: getMaskedKey(clientKey),
      provider: 'Google Gemini',
      model: CONFIGURED_GEMINI_MODEL,
      mode: 'BYOK (Client Standalone)',
      lastChecked: hasClientKey ? new Date().toISOString() : null
    };

    setStatusData(fallbackStatus);
    if (onStatusUpdated) onStatusUpdated(fallbackStatus);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setApiKeyInput('');
      setActionFeedback(null);
    }
  }, [isOpen]);

  // Handle Test Connection
  const handleTestConnection = async () => {
    const targetKey = apiKeyInput.trim() || getStoredApiKey();

    if (!targetKey) {
      setActionFeedback({
        type: 'error',
        message: 'Masukkan atau simpan API Key terlebih dahulu sebelum menguji koneksi.'
      });
      return;
    }

    setIsTesting(true);
    setActionFeedback(null);

    try {
      // Direct client-side test to Google Gemini API
      const result = await testGeminiApiKey(targetKey);

      const updatedStatus: ApiStatusInfo = {
        status: result.status,
        statusMessage: result.message,
        hasApiKey: Boolean(targetKey),
        maskedKey: getMaskedKey(targetKey),
        provider: 'Google Gemini',
        model: CONFIGURED_GEMINI_MODEL,
        mode: statusData?.mode?.includes('Server-side')
          ? 'BYOK (Server-side proxy)'
          : 'BYOK (Client Standalone)',
        lastChecked: new Date().toISOString(),
        errorDetails: result.errorDetails
      };

      setStatusData(updatedStatus);
      if (onStatusUpdated) onStatusUpdated(updatedStatus);

      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: result.message
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: result.message + (result.errorDetails ? `: ${result.errorDetails}` : '')
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Pengujian koneksi gagal: ' + (err?.message || 'Gangguan koneksi internet.')
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Handle Save Key
  const handleSaveKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = apiKeyInput.trim();

    if (!cleanKey) {
      setActionFeedback({
        type: 'error',
        message: 'Masukkan API Key sebelum menyimpan konfigurasi.'
      });
      return;
    }

    setIsSaving(true);
    setActionFeedback(null);

    try {
      // 1. Always save in client storage for GitHub Pages & Android APK
      setStoredApiKey(cleanKey);

      // 2. Also attempt to save to backend server if reachable
      try {
        const res = await fetch('/api/settings/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ apiKey: cleanKey })
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.status) {
            // server saved successfully
          }
        }
      } catch {
        // Backend not available (expected on GitHub Pages / APK)
      }

      // 3. Verify key against Google Gemini API
      const result = await testGeminiApiKey(cleanKey);

      const updatedStatus: ApiStatusInfo = {
        status: result.status,
        statusMessage: result.message,
        hasApiKey: true,
        maskedKey: getMaskedKey(cleanKey),
        provider: 'Google Gemini',
        model: CONFIGURED_GEMINI_MODEL,
        mode: statusData?.mode?.includes('Server-side')
          ? 'BYOK (Server-side proxy)'
          : 'BYOK (Client Standalone)',
        lastChecked: new Date().toISOString(),
        errorDetails: result.errorDetails
      };

      setStatusData(updatedStatus);
      if (onStatusUpdated) onStatusUpdated(updatedStatus);
      setApiKeyInput('');

      if (result.success) {
        setActionFeedback({
          type: 'success',
          message: 'API Key berhasil disimpan dan diverifikasi dengan Google Gemini API!'
        });
      } else {
        setActionFeedback({
          type: 'error',
          message: `API Key tersimpan, namun verifikasi mendeteksi kendala: ${result.message}`
        });
      }
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: err?.message || 'Gagal menyimpan API Key.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete Key
  const handleDeleteKey = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus API Key ini?')) {
      return;
    }

    setIsDeleting(true);
    setActionFeedback(null);

    try {
      // 1. Remove from client storage
      removeStoredApiKey();

      // 2. Try removing from backend if available
      try {
        await fetch('/api/settings/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' }
        });
      } catch {
        // Backend not available
      }

      const updatedStatus: ApiStatusInfo = {
        status: 'not_configured',
        statusMessage: 'API Belum Dikonfigurasi',
        hasApiKey: false,
        maskedKey: '',
        provider: 'Google Gemini',
        model: CONFIGURED_GEMINI_MODEL,
        mode: 'BYOK (Client Standalone)',
        lastChecked: new Date().toISOString()
      };

      setStatusData(updatedStatus);
      if (onStatusUpdated) onStatusUpdated(updatedStatus);
      setApiKeyInput('');

      setActionFeedback({
        type: 'info',
        message: 'API Key telah berhasil dihapus dari penyimpanan.'
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Gagal menghapus API Key: ' + (err?.message || 'Terjadi kesalahan.')
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  // Render Status Badge & Indicator Color
  const renderStatusBadge = () => {
    const status: ApiConnectionStatus = statusData?.status || 'not_configured';

    switch (status) {
      case 'connected':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold text-xs">API Terhubung</span>
          </div>
        );
      case 'not_configured':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-xs">API Belum Dikonfigurasi</span>
          </div>
        );
      case 'invalid_key':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold text-xs">API Key Tidak Valid</span>
          </div>
        );
      case 'quota_exceeded':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold text-xs">Kuota API Habis</span>
          </div>
        );
      case 'server_unavailable':
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
            <Server className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold text-xs">Server Tidak Tersedia</span>
          </div>
        );
      case 'connection_error':
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold text-xs">Koneksi Bermasalah</span>
          </div>
        );
    }
  };

  const formatLastChecked = (dateStr?: string | null) => {
    if (!dateStr) return 'Belum pernah diuji';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#12151d] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* 1. Header Modal */}
        <div className="px-6 py-4 bg-[#171b26] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
              <KeyRound className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  API & PENGATURAN
                </h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  BYOK
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Integrasi Google Gemini API & Mesin Kalibrasi Fotografi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            title="Tutup Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 space-y-5 text-xs overflow-y-auto custom-scrollbar">
          {/* 2. Status Koneksi */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-slate-400 font-medium">Status Koneksi API:</span>
              <div className="flex items-center gap-2">
                {loading ? (
                  <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Memeriksa status...</span>
                  </div>
                ) : (
                  renderStatusBadge()
                )}
              </div>
            </div>

            {/* Status Message Description */}
            <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 leading-relaxed">
              <span className="text-slate-400 block mb-0.5">Keterangan:</span>
              {statusData?.statusMessage || 'Memeriksa konfigurasi...'}
              {statusData?.errorDetails && (
                <p className="mt-1 text-rose-400 font-mono text-[10px] break-all">
                  Detail: {statusData.errorDetails}
                </p>
              )}
            </div>

            {/* 3. Informasi Model Aktif Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Provider</span>
                <span className="text-slate-200 font-semibold">{statusData?.provider || 'Google Gemini'}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Model</span>
                <span className="text-amber-400 font-semibold">{statusData?.model || CONFIGURED_GEMINI_MODEL}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Mode</span>
                <span className="text-cyan-400 font-semibold truncate block" title={statusData?.mode || 'BYOK'}>
                  {statusData?.mode || 'BYOK (Client)'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider">Uji Terakhir</span>
                <span className="text-slate-300 font-semibold text-[10px]">
                  {formatLastChecked(statusData?.lastChecked)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Feedback Banner */}
          {actionFeedback && (
            <div
              className={`p-3 rounded-xl text-[11px] leading-relaxed border flex items-start gap-2.5 ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : actionFeedback.type === 'error'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
              }`}
            >
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : actionFeedback.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{actionFeedback.message}</div>
            </div>
          )}

          {/* 4. Form Konfigurasi API */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Konfigurasi Kunci API (BYOK)
                </h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Google Gemini API
              </span>
            </div>

            {/* Stored Key Preview if exists */}
            {statusData?.hasApiKey && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Kunci API Tersimpan:</span>
                  <code className="text-emerald-400 font-mono font-semibold">
                    {statusData.maskedKey || '••••••••••••••••'}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteKey}
                  disabled={isDeleting}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-medium transition-colors"
                  title="Hapus API Key dari penyimpanan"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{isDeleting ? 'Menghapus...' : 'Hapus Key'}</span>
                </button>
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handleSaveKey} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                  {statusData?.hasApiKey ? 'Ganti dengan API Key Baru:' : 'Masukkan Google Gemini API Key:'}
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="Tempelkan API Key di sini (contoh: AIzaSy...)"
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 focus:outline-none text-slate-100 font-mono text-xs placeholder:text-slate-600 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    title={showApiKey ? 'Sembunyikan Key' : 'Tampilkan Key'}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons in Form */}
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="submit"
                  disabled={isSaving || !apiKeyInput.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Konfigurasi'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || (!statusData?.hasApiKey && !apiKeyInput.trim())}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 disabled:opacity-50 font-semibold text-xs transition-colors"
                >
                  <Zap className={`w-3.5 h-3.5 text-cyan-400 ${isTesting ? 'animate-bounce' : ''}`} />
                  <span>{isTesting ? 'Menguji Koneksi...' : 'UJI KONEKSI GEMINI'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* 5. Informasi Keamanan BYOK */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 text-slate-300 text-[11px] leading-relaxed">
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Standar Keamanan API Key & Privasi Foto</span>
            </div>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              <li>Kunci API Anda tersimpan secara lokal dan aman di browser/perangkat Anda.</li>
              <li>Komunikasi dilakukan langsung ke server resmi Google API menggunakan enkripsi SSL/TLS HTTPS.</li>
              <li>Foto tidak pernah diunggah ke cloud pihak ketiga atau disimpan di server publik.</li>
              <li>Jika API Key belum dipasang atau kuota habis, aplikasi otomatis beralih ke Mesin Kalibrasi Fotografi Camera Raw bawaan.</li>
            </ul>
          </div>
        </div>

        {/* 6. Footer Modal */}
        <div className="px-6 py-3.5 bg-[#171b26] border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Periksa Ulang</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors"
            >
              {isTesting ? 'Menguji...' : 'Uji Koneksi'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
