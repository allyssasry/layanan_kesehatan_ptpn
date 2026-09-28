// src/components/mcu/AiAnalysisCard.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Bot,
  RefreshCw,
  Copy,
  Check,
  Key,
  X,
  ExternalLink,
  Zap,
} from 'lucide-react';
import {
  ChartAnalysisParams,
  AiAnalysisResult,
  generateMcuAiAnalysis,
  getGeminiApiKey,
  setGeminiApiKey,
} from '@/services/aiService';

interface AiAnalysisCardProps {
  stats: ChartAnalysisParams;
  className?: string;
}

export function AiAnalysisCard({ stats, className = '' }: AiAnalysisCardProps) {
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [activeKey, setActiveKey] = useState('');

  // Muat API key yang sedang aktif
  useEffect(() => {
    const key = getGeminiApiKey();
    setActiveKey(key);
    setTempApiKey(key);
  }, []);

  // Fungsi memuat analisis
  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const res = await generateMcuAiAnalysis(stats);
      setAnalysis(res);
    } catch (err) {
      console.warn('Gagal memuat analisis AI:', err);
    } finally {
      setLoading(false);
    }
  }, [stats]);

  // Muat ulang ketika data filter statistik berubah
  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Handler Salin Teks
  const handleCopy = () => {
    if (!analysis?.text) return;
    const cleanText = analysis.text.replace(/\*\*/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Handler Simpan API Key
  const handleSaveApiKey = () => {
    setGeminiApiKey(tempApiKey);
    setActiveKey(tempApiKey);
    setIsKeyModalOpen(false);
    // Muat ulang dengan key baru
    setTimeout(() => {
      fetchAnalysis();
    }, 100);
  };

  // Helper untuk merender format markdown bold (**kata**) dan italic (*kata*) menjadi tag HTML yang bersih
  const renderFormattedMarkdown = (text: string) => {
    const paragraphs = text.split('\n\n').filter((p) => p.trim().length > 0);

    return paragraphs.map((paragraph, pIdx) => {
      // Ganti **teks** dengan <strong>teks</strong> dan *teks* dengan <em>teks</em>
      const parts = paragraph.split(/(\*\*.*?\*\*|\*.*?\*)/g);

      return (
        <p key={pIdx} className="text-slate-700 text-xs sm:text-[13px] leading-relaxed tracking-normal font-normal">
          {parts.map((part, idx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={idx} className="font-bold text-slate-900">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            if (part.startsWith('*') && part.endsWith('*')) {
              return (
                <em key={idx} className="italic text-emerald-800 font-semibold">
                  {part.slice(1, -1)}
                </em>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border border-emerald-200/80 p-5 sm:p-6 shadow-xs text-slate-800 ${className}`}
      >
        {/* Subtle ambient highlight */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Card */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-emerald-100 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/90 border border-emerald-300/70 flex items-center justify-center text-emerald-700 shrink-0 shadow-2xs">
              <Bot className="w-4.5 h-4.5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-wide text-emerald-950 flex items-center gap-1.5">
                  <span>Analisis AI</span>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                </h3>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300/60">
                  {analysis?.source === 'gemini' ? (analysis?.modelUsed || 'Google Gemini AI') : 'Smart Executive AI'}
                </span>
              </div>
              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                Periode {stats.periode}
              </p>
            </div>
          </div>

          {/* Top Actions Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tombol Pengaturan API Key */}
            <button
              type="button"
              onClick={() => setIsKeyModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-[11px] font-bold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Konfigurasi Gemini API Key"
            >
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span className="flex items-center gap-1.5">
                {activeKey && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
                <span>{activeKey ? 'Gemini Key Terhubung' : 'Atur API Key'}</span>
              </span>
            </button>

            {/* Tombol Salin */}
            <button
              type="button"
              onClick={handleCopy}
              disabled={loading || !analysis?.text}
              className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-[11px] font-bold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Salin Teks Analisis"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-extrabold">Tersalin</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Salin</span>
                </>
              )}
            </button>

            {/* Tombol Refresh / Generate Ulang */}
            <button
              type="button"
              onClick={fetchAnalysis}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold border border-emerald-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-2xs"
              title="Analisis Ulang Grafik & Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-white' : ''}`} />
              <span>{loading ? 'Menganalisis...' : 'Analisis Ulang'}</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative z-10 space-y-3">
          {loading ? (
            <div className="space-y-2.5 py-2 animate-pulse">
              <div className="h-3.5 bg-slate-200/80 rounded-full w-11/12" />
              <div className="h-3.5 bg-slate-200/80 rounded-full w-full" />
              <div className="h-3.5 bg-slate-200/80 rounded-full w-4/5" />
              <div className="h-3 bg-transparent" />
              <div className="h-3.5 bg-slate-200/80 rounded-full w-full" />
              <div className="h-3.5 bg-slate-200/80 rounded-full w-10/12" />
            </div>
          ) : analysis?.text ? (
            <div className="space-y-3 font-normal leading-relaxed">
              {renderFormattedMarkdown(analysis.text)}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              Klik &quot;Analisis Ulang&quot; untuk mengenerate ringkasan eksekutif berbasis AI.
            </p>
          )}
        </div>
      </div>

      {/* Modal Pengaturan Gemini API Key */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 max-w-lg w-full text-slate-900 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Konfigurasi Google Gemini API Key</h3>
                  <p className="text-xs text-slate-500 font-medium">Gunakan API Key Anda untuk analisis live Gemini AI</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Gemini API Key (Google AI Studio)</span>
                </label>
                <input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Contoh: AQ.Ab8RN6I..."
                  className="w-full bg-slate-50 text-xs font-mono font-medium text-slate-900 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 transition"
                />
                <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                  API Key tersimpan secara aman di browser lokal atau membaca otomatis dari variabel <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono">NEXT_PUBLIC_GEMINI_API_KEY</code> di <code className="text-slate-600">.env.local</code>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Informasi Kunci:</span>
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                  Kunci API Anda telah dikonfigurasi dan mendukung model terbaru Google Gemini AI (3.6 Flash) untuk membaca rekapitulasi data grafik dan kebugaran seluruh karyawan secara real-time.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-950/10 transition cursor-pointer"
              >
                Simpan &amp; Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
