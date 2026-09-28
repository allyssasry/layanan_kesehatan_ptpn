'use client';

import React, { useState, useMemo, useRef } from 'react';
import { TrendingUp, ChevronDown } from 'lucide-react';
import { getRecordTimestamp } from '@/services/mcuService';

export interface HealthTrendChartProps {
  patientHistory: any[];
  defaultMetric?: string;
  className?: string;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const isoDateMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      const day = parseInt(isoDateMatch[3]);
      const monthIdx = parseInt(isoDateMatch[2]) - 1;
      const year = parseInt(isoDateMatch[1]);
      return `${day} ${months[monthIdx] || 'Januari'} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const isoDateMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      const day = parseInt(isoDateMatch[3]);
      const monthIdx = parseInt(isoDateMatch[2]) - 1;
      const year = parseInt(isoDateMatch[1]);
      return `${day} ${months[monthIdx] || 'Jan'} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function parseMetricValue(val: any): number | null {
  if (val === null || val === undefined || val === '' || val === '-') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/,/g, '.').replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function HealthTrendChart({
  patientHistory,
  defaultMetric = 'tensi',
  className = '',
}: HealthTrendChartProps) {
  const [chartMetric, setChartMetric] = useState<string>(defaultMetric);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Format chart data sorted ascending (oldest -> newest), limited to the 5 most recent records
  const chartData = useMemo(() => {
    if (!patientHistory || patientHistory.length === 0) return [];

    // Sort ascending by examination timestamp
    const sorted = [...patientHistory].sort((a, b) => {
      const timeA = getRecordTimestamp(a);
      const timeB = getRecordTimestamp(b);
      if (timeA !== timeB) return timeA - timeB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });

    // Batasi maksimal 5 data sesi pemeriksaan terbaru (5 titik)
    const latestFive = sorted.length > 5 ? sorted.slice(-5) : sorted;

    return latestFive.map((r) => {
      const fullDateLabel = formatDate(r.tanggal_pemeriksaan);
      const dateLabel = formatDateShort(r.tanggal_pemeriksaan);

      const isMandiri =
        r.created_by_role === 'karyawan' ||
        Boolean((r as any).is_mandiri) ||
        (r as any).vitals_updated_by_role === 'karyawan' ||
        (typeof r.nama_dokter === 'string' && r.nama_dokter.toLowerCase().includes('mandiri')) ||
        (typeof r.diagnosa === 'string' && r.diagnosa.toLowerCase().includes('mandiri'));

      const isKlinik = r.created_by_role === 'klinik' || (r as any).record_type === 'mini';

      const roleTag = isMandiri
        ? 'Pemeriksaan Mandiri'
        : isKlinik
        ? 'Inhouse Clinic'
        : 'MCU RS';

      const tensiStr = String((r as any).tensi || (r as any).vitals?.tensi || '');
      const tensiMatch = tensiStr.match(/(\d+)\s*[/]\s*(\d+)/);
      const sis = tensiMatch ? parseFloat(tensiMatch[1]) : parseMetricValue((r as any).vitals?.tensi_sistolik) ?? 120;
      const dia = tensiMatch ? parseFloat(tensiMatch[2]) : parseMetricValue((r as any).vitals?.tensi_diastolik) ?? 80;

      const gula = parseMetricValue((r as any).gula_darah ?? (r as any).vitals?.gula_darah) ?? 110;
      const koles = parseMetricValue((r as any).kolesterol ?? (r as any).vitals?.kolesterol) ?? 190;
      const asam = parseMetricValue((r as any).asam_urat ?? (r as any).vitals?.asam_urat) ?? 6.0;

      const tb = parseMetricValue((r as any).tinggi_badan ?? (r as any).vitals?.tinggi_badan) ?? 156;
      const bb = parseMetricValue((r as any).berat_badan ?? (r as any).vitals?.berat_badan) ?? 40;
      const bmi = parseMetricValue((r as any).bmi ?? (r as any).vitals?.bmi) ?? (tb > 0 ? Number((bb / ((tb / 100) * (tb / 100))).toFixed(1)) : 16.4);

      return {
        label: `${dateLabel} (${roleTag})`,
        dateLabel,
        fullDate: fullDateLabel,
        roleTag,
        roleTagColor: isMandiri ? '#059669' : isKlinik ? '#0284c7' : '#64748b',
        shortRoleTag: isMandiri ? '(Mandiri)' : isKlinik ? '(Inhouse Clinic)' : '(MCU RS)',
        sistolik: sis,
        diastolik: dia,
        gula_darah: gula,
        kolesterol: koles,
        asam_urat: asam,
        berat_badan: bb,
        tinggi_badan: tb,
        bmi: bmi,
      };
    });
  }, [patientHistory]);

  // Dimensions for SVG plotting (generous horizontal and vertical spacing)
  const svgWidth = 760;
  const svgHeight = 270;
  const padLeft = 60;
  const padRight = 60;
  const padTop = 20;
  const padBottom = 48;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Compute metric scale and references
  const metricConfig = useMemo(() => {
    if (chartMetric === 'tensi') {
      const sisValues = chartData.map((d) => d.sistolik).filter((v) => typeof v === 'number' && !isNaN(v));
      const diaValues = chartData.map((d) => d.diastolik).filter((v) => typeof v === 'number' && !isNaN(v));
      const maxVal = Math.max(...sisValues, 120);
      const minVal = Math.min(...diaValues, 80);

      const min = Math.max(50, Math.floor((minVal - 5) / 5) * 5);
      const max = Math.ceil((maxVal + 5) / 5) * 5;
      const range = max - min;
      const step = range <= 50 ? 5 : range <= 90 ? 10 : 20;

      const ticks: number[] = [];
      for (let i = min; i <= max; i += step) {
        ticks.push(i);
      }
      return {
        minY: min,
        maxY: max,
        ticks,
        unit: 'mmHg',
        refLines: [
          { value: 120, color: '#ef4444', dash: '6 6', label: 'Batas Normal Sistolik (120 mmHg)' },
          { value: 80, color: '#f59e0b', dash: '6 6', label: 'Batas Normal Diastolik (80 mmHg)' },
        ],
        lines: [
          { key: 'sistolik', name: 'Sistolik (Tekanan Atas)', color: '#059669' },
          { key: 'diastolik', name: 'Diastolik (Tekanan Bawah)', color: '#0d9488' },
        ],
      };
    }

    if (chartMetric === 'gula_darah') {
      const values = chartData.map((d) => d.gula_darah).filter((v) => typeof v === 'number' && !isNaN(v));
      const maxVal = Math.max(...values, 140);
      const minVal = Math.min(...values, 70);
      const min = Math.max(40, Math.floor((minVal - 20) / 20) * 20);
      const max = Math.ceil((maxVal + 20) / 20) * 20;
      const ticks: number[] = [];
      for (let i = min; i <= max; i += 20) {
        ticks.push(i);
      }
      return {
        minY: min,
        maxY: max,
        ticks,
        unit: 'mg/dL',
        refLines: [
          { value: 140, color: '#ef4444', dash: '6 6', label: 'Batas Normal (<140 mg/dL)' },
          { value: 70, color: '#3b82f6', dash: '6 6', label: 'Batas Bawah Normal (70 mg/dL)' },
        ],
        lines: [{ key: 'gula_darah', name: 'Gula Darah (mg/dL)', color: '#d97706' }],
      };
    }

    if (chartMetric === 'kolesterol') {
      const values = chartData.map((d) => d.kolesterol).filter((v) => typeof v === 'number' && !isNaN(v));
      const maxVal = Math.max(...values, 200);
      const minVal = Math.min(...values, 140);
      const min = Math.max(80, Math.floor((minVal - 20) / 20) * 20);
      const max = Math.ceil((maxVal + 20) / 20) * 20;
      const ticks: number[] = [];
      for (let i = min; i <= max; i += 20) {
        ticks.push(i);
      }
      return {
        minY: min,
        maxY: max,
        ticks,
        unit: 'mg/dL',
        refLines: [
          { value: 200, color: '#ef4444', dash: '6 6', label: 'Batas Normal (<200 mg/dL)' },
        ],
        lines: [{ key: 'kolesterol', name: 'Kolesterol Total (mg/dL)', color: '#dc2626' }],
      };
    }

    if (chartMetric === 'asam_urat') {
      const values = chartData.map((d) => d.asam_urat).filter((v) => typeof v === 'number' && !isNaN(v));
      const maxVal = Math.max(...values, 7.0);
      const minVal = Math.min(...values, 3.0);
      const min = Math.max(0, Math.floor(minVal - 1));
      const max = Math.ceil(maxVal + 1);
      const ticks: number[] = [];
      for (let i = min; i <= max; i += 1) {
        ticks.push(i);
      }
      return {
        minY: min,
        maxY: max,
        ticks,
        unit: 'mg/dL',
        refLines: [
          { value: 7.0, color: '#ef4444', dash: '6 6', label: 'Batas Normal (<7.0 mg/dL)' },
          { value: 3.0, color: '#3b82f6', dash: '6 6', label: 'Batas Bawah Normal (3.0 mg/dL)' },
        ],
        lines: [{ key: 'asam_urat', name: 'Asam Urat (mg/dL)', color: '#7c3aed' }],
      };
    }

    // Default BMI, BB, TB
    return {
      minY: 10,
      maxY: 200,
      ticks: [20, 40, 60, 80, 100, 140, 180],
      unit: '',
      refLines: [
        { value: 24.9, color: '#ef4444', dash: '6 6', label: 'Batas Atas Normal BMI (24.9)' },
        { value: 18.5, color: '#059669', dash: '6 6', label: 'Batas Bawah Normal BMI (18.5)' },
      ],
      lines: [
        { key: 'berat_badan', name: 'Berat Badan (kg)', color: '#059669' },
        { key: 'tinggi_badan', name: 'Tinggi Badan (cm)', color: '#0284c7' },
        { key: 'bmi', name: 'Indeks BMI', color: '#7c3aed' },
      ],
    };
  }, [chartMetric, chartData]);

  // Helper coordinate functions
  const getY = (val: number) => {
    const { minY, maxY } = metricConfig;
    if (maxY === minY) return padTop + plotHeight / 2;
    const ratio = (val - minY) / (maxY - minY);
    return padTop + (1 - ratio) * plotHeight;
  };

  const getX = (index: number) => {
    if (chartData.length <= 1) {
      return padLeft + plotWidth / 2;
    }
    return padLeft + (index / (chartData.length - 1)) * plotWidth;
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current || chartData.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Find nearest data point
    const relativeX = (clientX / rect.width) * svgWidth;
    let closestIdx = 0;
    let minDiff = Infinity;
    chartData.forEach((_, idx) => {
      const px = getX(idx);
      const diff = Math.abs(px - relativeX);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoveredIndex(closestIdx);
    setMousePos({ x: clientX, y: clientY });
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setMousePos(null);
  };

  const activeHoverData = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  return (
    <div
      ref={containerRef}
      className={`relative bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4 ${className}`}
    >
      {/* ==================================================== */}
      {/* HEADER WITH TITLE & DARK PILL DROPDOWN               */}
      {/* ==================================================== */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2 flex-wrap">
              <TrendingUp className="w-5 h-5 text-[#005930]" />
              <span>Grafik Tren Hasil Pemeriksaan</span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                5 Sesi Terbaru
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Menampilkan 5 sesi pemeriksaan fisik terbaru. Arahkan kursor pada titik grafik untuk detail nilai normal.
            </p>
          </div>

          {/* Metric Selector Dropdown Pill */}
          <div className="relative">
            <select
              value={chartMetric}
              onChange={(e) => setChartMetric(e.target.value)}
              className="appearance-none bg-[#0a0f1d] hover:bg-[#151c2e] text-white font-bold text-xs border border-slate-800 px-4 py-2 rounded-xl outline-none cursor-pointer pr-9 focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
            >
              <option value="tensi">Tensi Darah (Sistolik &amp; Diastolik)</option>
              <option value="gula_darah">Gula Darah (mg/dL)</option>
              <option value="kolesterol">Kolesterol (mg/dL)</option>
              <option value="asam_urat">Asam Urat (mg/dL)</option>
              <option value="bmi_bb_tb">BMI, Berat &amp; Tinggi Badan</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
              <ChevronDown className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* TOP LEGEND EXACTLY MATCHING DESIGN                   */}
        {/* ==================================================== */}
        <div className="flex flex-col items-center justify-center gap-1.5 pb-4 text-xs font-semibold text-slate-700">
          {chartMetric === 'tensi' && (
            <>
              <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#059669] inline-block shrink-0 shadow-2xs"></span>
                  <span>Sistolik (Tekanan Atas)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#0d9488] inline-block shrink-0 shadow-2xs"></span>
                  <span>Diastolik (Tekanan Bawah)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[#ef4444] bg-white inline-block shrink-0"></span>
                  <span>Batas Normal Sistolik (120 mmHg)</span>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-[#f59e0b] bg-white inline-block shrink-0"></span>
                  <span>Batas Normal Diastolik (80 mmHg)</span>
                </div>
              </div>
            </>
          )}

          {chartMetric === 'gula_darah' && (
            <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#d97706] inline-block shrink-0 shadow-2xs"></span>
                <span>Gula Darah (mg/dL)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[#ef4444] bg-white inline-block shrink-0"></span>
                <span>Batas Normal (&lt;140 mg/dL)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[#3b82f6] bg-white inline-block shrink-0"></span>
                <span>Batas Bawah Normal (70 mg/dL)</span>
              </div>
            </div>
          )}

          {chartMetric === 'kolesterol' && (
            <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#dc2626] inline-block shrink-0 shadow-2xs"></span>
                <span>Kolesterol Total (mg/dL)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[#ef4444] bg-white inline-block shrink-0"></span>
                <span>Batas Normal (&lt;200 mg/dL)</span>
              </div>
            </div>
          )}

          {chartMetric === 'asam_urat' && (
            <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#7c3aed] inline-block shrink-0 shadow-2xs"></span>
                <span>Asam Urat (mg/dL)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[#ef4444] bg-white inline-block shrink-0"></span>
                <span>Batas Normal (&lt;7.0 mg/dL)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[#3b82f6] bg-white inline-block shrink-0"></span>
                <span>Batas Bawah Normal (3.0 mg/dL)</span>
              </div>
            </div>
          )}

          {chartMetric === 'bmi_bb_tb' && (
            <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#059669] inline-block shrink-0 shadow-2xs"></span>
                <span>Berat Badan (kg)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#0284c7] inline-block shrink-0 shadow-2xs"></span>
                <span>Tinggi Badan (cm)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-[#7c3aed] inline-block shrink-0 shadow-2xs"></span>
                <span>Indeks BMI</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[#059669] bg-white inline-block shrink-0"></span>
                <span>Batas Normal BMI (18.5 - 24.9)</span>
              </div>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* PURE SVG CHART RENDERER (100% BULLETPROOF)          */}
        {/* ==================================================== */}
        <div className="w-full relative select-none">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-72 overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Horizontal Gridlines */}
            {metricConfig.ticks.map((tickVal) => {
              const y = getY(tickVal);
              return (
                <g key={`grid-${tickVal}`}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize={11}
                    fontWeight={700}
                  >
                    {tickVal}
                  </text>
                </g>
              );
            })}

            {/* X-Axis Baseline */}
            <line
              x1={padLeft}
              y1={svgHeight - padBottom}
              x2={svgWidth - padRight}
              y2={svgHeight - padBottom}
              stroke="#cbd5e1"
              strokeWidth={1.5}
            />

            {/* Reference Lines (Batas Normal) */}
            {metricConfig.refLines.map((ref, idx) => {
              const y = getY(ref.value);
              if (y < padTop - 5 || y > svgHeight - padBottom + 5) return null;
              return (
                <line
                  key={`ref-${idx}`}
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke={ref.color}
                  strokeWidth={2}
                  strokeDasharray={ref.dash}
                />
              );
            })}

            {/* Connecting Lines for Multi-Session Records */}
            {metricConfig.lines.map((lineMeta) => {
              if (chartData.length < 2) return null;
              const pathD = chartData
                .map((d: any, i) => {
                  const val = d[lineMeta.key];
                  if (typeof val !== 'number' || isNaN(val)) return '';
                  const x = getX(i);
                  const y = getY(val);
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                })
                .filter(Boolean)
                .join(' ');

              return (
                <path
                  key={`line-${lineMeta.key}`}
                  d={pathD}
                  fill="none"
                  stroke={lineMeta.color}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Hover Highlight Vertical Bar */}
            {hoveredIndex !== null && (
              <line
                x1={getX(hoveredIndex)}
                y1={padTop}
                x2={getX(hoveredIndex)}
                y2={svgHeight - padBottom}
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                opacity={0.6}
              />
            )}

            {/* Prominent Data Points (Dots) for Every Session */}
            {chartData.map((d: any, idx) => {
              const x = getX(idx);
              const isHovered = hoveredIndex === idx;

              return (
                <g key={`point-group-${idx}`}>
                  {/* Render dots for each line in this session */}
                  {metricConfig.lines.map((lineMeta) => {
                    const val = d[lineMeta.key];
                    if (typeof val !== 'number' || isNaN(val)) return null;
                    const y = getY(val);
                    const radius = isHovered ? 9 : 7;

                    return (
                      <g key={`dot-${lineMeta.key}-${idx}`}>
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 8 : 6.5}
                          fill={lineMeta.color}
                          className="transition-all duration-150 cursor-pointer"
                        />
                      </g>
                    );
                  })}

                  {/* X-Axis Date & Source Tag Label (Two-line format: 100% clean and never overlapping) */}
                  <text
                    x={x}
                    y={svgHeight - padBottom + 16}
                    textAnchor="middle"
                    fill="#0f172a"
                    fontSize={11}
                    fontWeight={800}
                  >
                    {d.dateLabel}
                  </text>
                  <text
                    x={x}
                    y={svgHeight - padBottom + 30}
                    textAnchor="middle"
                    fill={d.roleTagColor || '#475569'}
                    fontSize={9.5}
                    fontWeight={700}
                  >
                    {d.shortRoleTag}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Floating Tooltip Card */}
          {activeHoverData && mousePos && (
            <div
              className="absolute pointer-events-none z-50 bg-slate-900/95 backdrop-blur-sm text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs min-w-[210px] space-y-2 -translate-x-1/2 -translate-y-full"
              style={{
                left: `${mousePos.x}px`,
                top: `${Math.max(10, mousePos.y - 15)}px`,
              }}
            >
              <div className="border-b border-slate-800 pb-1.5">
                <p className="font-extrabold text-emerald-400">📅 {activeHoverData.fullDate}</p>
                <p className="text-[10px] text-slate-400 font-medium">{activeHoverData.roleTag || 'Hasil Sesi Pemeriksaan'}</p>
              </div>
              <div className="space-y-1.5">
                {metricConfig.lines.map((lineMeta, i) => {
                  const val = (activeHoverData as any)[lineMeta.key];
                  if (val === null || val === undefined) return null;
                  return (
                    <div key={`tip-${i}`} className="flex items-center justify-between gap-3 font-semibold">
                      <span className="flex items-center gap-1.5" style={{ color: lineMeta.color }}>
                        <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: lineMeta.color }} />
                        <span>{lineMeta.name}:</span>
                      </span>
                      <span className="font-black text-white text-sm">
                        {val} {metricConfig.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
