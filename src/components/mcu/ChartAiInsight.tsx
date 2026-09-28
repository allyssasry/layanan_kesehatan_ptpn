// src/components/mcu/ChartAiInsight.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles,
  Bot,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ChartInsightType,
  AiAnalysisResult,
  generateChartSpecificAiAnalysis,
} from '@/services/aiService';

interface ChartAiInsightProps {
  chartType: ChartInsightType;
  chartTitle: string;
  data: any;
  defaultExpanded?: boolean;
  className?: string;
}

export function ChartAiInsight({
  chartType,
  chartTitle,
  data,
  defaultExpanded = true,
  className = '',
}: ChartAiInsightProps) {
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Fetch analysis for this specific chart
  const fetchInsight = useCallback(async () => {
    setLoading(true);
    try {
      const res = await generateChartSpecificAiAnalysis({
        chartType,
        chartTitle,
        data,
      });
      setAnalysis(res);
    } catch (err) {
      console.warn(`Gagal memuat analisis AI untuk ${chartType}:`, err);
    } finally {
      setLoading(false);
    }
  }, [chartType, chartTitle, data]);

  // Serialisasi data untuk memicu pembaruan saat data chart berubah
  const dataKey = useMemo(() => {
    try {
      return JSON.stringify(data);
    } catch {
      return String(data);
    }
  }, [data]);

  // Muat ulang ketika data berubah
  useEffect(() => {
    fetchInsight();
  }, [chartType, chartTitle, dataKey, fetchInsight]);

  // Handler Salin
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!analysis?.text) return;
    const cleanText = analysis.text.replace(/\*\*/g, '');
    navigator.clipboard.writeText(cleanText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handler Refresh
  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchInsight();
  };

  // Markdown Formatter
  const renderFormattedMarkdown = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return (
      <p className="text-slate-700 text-xs sm:text-[12.5px] leading-relaxed tracking-normal font-normal">
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
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-50/90 hover:bg-slate-50 border border-slate-200/90 p-3.5 sm:p-4 text-slate-800 shadow-2xs transition-colors ${className}`}
    >
      {/* Header bar */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-100 border border-emerald-300/60 flex items-center justify-center text-emerald-700 shrink-0">
            <Bot className="w-3.5 h-3.5 text-emerald-700" />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
              <span>Analisis AI</span>
              <Sparkles className="w-3 h-3 text-emerald-600 fill-emerald-600" />
            </span>
            <span className="text-[10px] font-medium text-slate-500">
              • {chartTitle}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Tombol Salin */}
          <button
            type="button"
            onClick={handleCopy}
            disabled={loading || !analysis?.text}
            className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-[10px] font-semibold border border-slate-200 transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Salin analisis ini"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-500" />
                <span className="hidden sm:inline">Salin</span>
              </>
            )}
          </button>

          {/* Tombol Refresh */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="p-1 sm:px-2 sm:py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 hover:text-emerald-950 text-[10px] font-semibold border border-emerald-200 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Analisis Ulang Grafik Ini"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
            <span className="hidden sm:inline">{loading ? 'Memproses...' : 'Ulang'}</span>
          </button>

          {/* Toggle Expand/Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
            title={isExpanded ? 'Ciutkan Analisis' : 'Buka Analisis'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Content body */}
      {isExpanded && (
        <div className="relative z-10 pt-2.5 mt-2 border-t border-slate-200/80">
          {loading ? (
            <div className="space-y-1.5 py-1 animate-pulse">
              <div className="h-3 bg-slate-200/80 rounded-full w-11/12" />
              <div className="h-3 bg-slate-200/80 rounded-full w-full" />
              <div className="h-3 bg-slate-200/80 rounded-full w-4/5" />
            </div>
          ) : analysis?.text ? (
            <div>{renderFormattedMarkdown(analysis.text)}</div>
          ) : (
            <p className="text-[11px] text-slate-500 italic">
              Klik &quot;Ulang&quot; untuk menghasilkan analisis khusus untuk grafik ini.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
