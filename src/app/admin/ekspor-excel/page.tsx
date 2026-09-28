'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { McuRecord, MiniMcuRecord } from '@/types/mcu';
import { normalizeDivisiName, isSameDivisi } from '@/lib/divisiMaster';
import ExcelJS from 'exceljs';
import {
  renderClusteredBarChartPng,
  renderDonutChartPng,
  renderDualDonutChartPng,
  renderHorizontalBarChartPng,
  renderExcelStylePieDonutChartPng,
  renderDivisiColumnChartPng,
} from '@/lib/chartCanvasRenderer';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  Users,
  CheckCircle2,
  ChevronDown,
  Eye,
  BarChart3,
  Activity,
  HeartPulse,
  Sparkles,
  AlertTriangle,
  Scale,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from 'recharts';

// ==========================================
// MASTER CONSTANTS
// ==========================================
const INDO_MONTHS: Record<string, string> = {
  '01': 'Januari',
  '02': 'Februari',
  '03': 'Maret',
  '04': 'April',
  '05': 'Mei',
  '06': 'Juni',
  '07': 'Juli',
  '08': 'Agustus',
  '09': 'September',
  '10': 'Oktober',
  '11': 'November',
  '12': 'Desember',
};

const SHORT_MONTHS: Record<string, string> = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'Mei',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Agu',
  '09': 'Sep',
  '10': 'Okt',
  '11': 'Nov',
  '12': 'Des',
};

const ENTITAS_LIST = [
  { value: 'all', label: 'Semua Entitas Perusahaan' },
  { value: 'PTPN 1', label: 'PTPN 1 / SuppCo' },
  { value: 'PTPN 3', label: 'PTPN 3 / Holding' },
  { value: 'PTPN 4', label: 'PTPN 4 / PalmCo' },
];

function formatMonthYearLabel(ym: string): string {
  if (!ym || ym === 'all') return 'Semua Periode';
  const parts = ym.split('-');
  if (parts.length === 2) {
    const m = INDO_MONTHS[parts[1]] || parts[1];
    return `${m} ${parts[0]}`;
  }
  return ym;
}

function formatShortMonthYear(ym: string): string {
  if (!ym || ym === 'all') return 'Semua';
  const parts = ym.split('-');
  if (parts.length === 2) {
    const m = SHORT_MONTHS[parts[1]] || parts[1];
    return `${m} ${parts[0].slice(-2)}`;
  }
  return ym;
}

function matchEntity(departemen?: string | null, targetEntity: string = 'all'): boolean {
  if (!targetEntity || targetEntity === 'all') return true;
  if (!departemen) return false;
  const d = departemen.toLowerCase().trim();
  const t = targetEntity.toLowerCase().trim();
  if (t === 'ptpn 1' || t === 'ptpn1' || t === 'suppco') return d.includes('ptpn 1') || d.includes('ptpn1') || d.includes('suppco') || d === '1' || d === 'i';
  if (t === 'ptpn 3' || t === 'ptpn3' || t === 'holding') return d.includes('ptpn 3') || d.includes('ptpn3') || d.includes('holding') || d === '3' || d === 'iii';
  if (t === 'ptpn 4' || t === 'ptpn4' || t === 'palmco') return d.includes('ptpn 4') || d.includes('ptpn4') || d.includes('palmco') || d === '4' || d === 'iv';
  return d === t || d.includes(t);
}

function isCleanDisease(p: string | null | undefined): boolean {
  if (!p) return false;
  const s = p.trim().toLowerCase();
  if (
    !s ||
    s === '-' ||
    s === '0' ||
    s === 'sehat' ||
    s === 'normal' ||
    s === 'kondisi fisik baik' ||
    s === 'tidak memiliki penyakit' ||
    s === 'tidak ada penyakit' ||
    s === 'tidak ada' ||
    s.includes('tidak memiliki') ||
    s.includes('kondisi fisik baik') ||
    s.includes('tidak ada penyakit')
  ) {
    return false;
  }
  return true;
}

export default function AdminEksporExcelPage() {
  const { mcuRecords, miniMcuRecords, isLoading } = useMcu();
  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const previewPageSize = 8;

  // Available Month List from Database
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    mcuRecords.forEach((r) => {
      const tgl = r.tanggal_pemeriksaan || '';
      if (tgl && tgl.length >= 7) {
        set.add(tgl.substring(0, 7));
      }
    });

    if (set.size === 0) {
      set.add('2026-08');
      set.add('2026-07');
      set.add('2026-06');
    }

    return Array.from(set).sort();
  }, [mcuRecords]);

  // State Filters
  const [bulanDari, setBulanDari] = useState<string>('');
  const [bulanSampai, setBulanSampai] = useState<string>('');
  const [filterEntitas, setFilterEntitas] = useState<string>('all');
  const [filterStatusKebugaran, setFilterStatusKebugaran] = useState<string>('all');
  const [includeKop, setIncludeKop] = useState<boolean>(true);
  const [includeAnalytics, setIncludeAnalytics] = useState<boolean>(true);

  // Initialize on mount
  useEffect(() => {
    setMounted(true);
    if (availableMonths.length > 0) {
      setBulanDari(availableMonths[0]);
      setBulanSampai(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths]);

  // Months in current selected range
  const selectedRangeMonths = useMemo(() => {
    if (!bulanDari || !bulanSampai) return availableMonths;
    let start = bulanDari;
    let end = bulanSampai;
    if (start > end) {
      const t = start;
      start = end;
      end = t;
    }
    return availableMonths.filter((m) => m >= start && m <= end);
  }, [availableMonths, bulanDari, bulanSampai]);

  // Filtered MCU Records
  const filteredMcuRecords = useMemo(() => {
    return mcuRecords.filter((r) => {
      const tgl = r.tanggal_pemeriksaan || '';
      const ym = tgl.length >= 7 ? tgl.substring(0, 7) : '';

      if (bulanDari && bulanSampai) {
        let start = bulanDari;
        let end = bulanSampai;
        if (start > end) {
          const t = start;
          start = end;
          end = t;
        }
        if (ym < start || ym > end) return false;
      }

      if (filterEntitas !== 'all' && !matchEntity(r.departemen || (r as any).entitas, filterEntitas)) {
        return false;
      }

      if (filterStatusKebugaran !== 'all') {
        const rawStatus = (r.status_kebugaran || r.kesimpulan || '').toLowerCase();
        if (filterStatusKebugaran === 'fit' && (!rawStatus.includes('fit') || rawStatus.includes('tidak') || rawStatus.includes('catatan'))) return false;
        if (filterStatusKebugaran === 'catatan' && !rawStatus.includes('catatan')) return false;
        if (filterStatusKebugaran === 'tidak_fit' && (!rawStatus.includes('tidak') && !rawStatus.includes('evaluasi') && !rawStatus.includes('unfit'))) return false;
      }

      return true;
    }).sort((a, b) => {
      const tglA = a.tanggal_pemeriksaan || '';
      const tglB = b.tanggal_pemeriksaan || '';
      return tglA.localeCompare(tglB);
    });
  }, [mcuRecords, bulanDari, bulanSampai, filterEntitas, filterStatusKebugaran]);

  // Filtered Mini-MCU Records in same range
  const filteredMiniMcuRecords = useMemo(() => {
    return miniMcuRecords.filter((r) => {
      const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
      const ym = tgl.length >= 7 ? tgl.substring(0, 7) : '';

      if (bulanDari && bulanSampai) {
        let start = bulanDari;
        let end = bulanSampai;
        if (start > end) {
          const t = start;
          start = end;
          end = t;
        }
        if (ym < start || ym > end) return false;
      }

      if (filterEntitas !== 'all' && !matchEntity(r.departemen || (r as any).entitas, filterEntitas)) {
        return false;
      }

      return true;
    });
  }, [miniMcuRecords, bulanDari, bulanSampai, filterEntitas]);

  // KPI Statistics
  const kpiStats = useMemo(() => {
    const total = filteredMcuRecords.length;
    const fitDuty = filteredMcuRecords.filter((r) => {
      const st = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
      return st.includes('fit') && !st.includes('catatan') && !st.includes('tidak') && !st.includes('unfit');
    }).length;

    const fitCatatan = filteredMcuRecords.filter((r) => {
      const st = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
      return st.includes('catatan');
    }).length;

    const tidakFit = filteredMcuRecords.filter((r) => {
      const st = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
      return st.includes('tidak') || st.includes('evaluasi') || st.includes('unfit');
    }).length;

    return { total, fitDuty, fitCatatan, tidakFit };
  }, [filteredMcuRecords]);

  // Chart 1 Preview: Entitas Karyawan (Batang Berkelompok / Clustered Column: Jumlah Karyawan & Sudah MCU)
  const entitasChartData = useMemo(() => {
    const entities = [
      { name: 'PTPN 1', defaultTarget: 300 },
      { name: 'PTPN 3', defaultTarget: 283 },
      { name: 'PTPN 4', defaultTarget: 300 },
    ];
    return entities.map((ent) => {
      const recs = filteredMcuRecords.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent.name));
      const sudahMcu = recs.length;
      const target = Math.max(sudahMcu, ent.defaultTarget);
      return {
        name: ent.name,
        'Jumlah Karyawan': target,
        'Sudah Melaksanakan MCU': sudahMcu,
      };
    });
  }, [filteredMcuRecords]);

  // Preset Handlers
  const handleSetPreset = (preset: 'current' | 'last3' | 'year2026' | 'all') => {
    if (availableMonths.length === 0) return;
    if (preset === 'current') {
      const latest = availableMonths[availableMonths.length - 1];
      setBulanDari(latest);
      setBulanSampai(latest);
    } else if (preset === 'last3') {
      const end = availableMonths[availableMonths.length - 1];
      const startIdx = Math.max(0, availableMonths.length - 3);
      setBulanDari(availableMonths[startIdx]);
      setBulanSampai(end);
    } else if (preset === 'year2026') {
      const m2026 = availableMonths.filter((m) => m.startsWith('2026'));
      if (m2026.length > 0) {
        setBulanDari(m2026[0]);
        setBulanSampai(m2026[m2026.length - 1]);
      }
    } else if (preset === 'all') {
      setBulanDari(availableMonths[0]);
      setBulanSampai(availableMonths[availableMonths.length - 1]);
    }
  };

  const periodeText = useMemo(() => {
    if (!bulanDari || !bulanSampai) return 'Semua Periode';
    if (bulanDari === bulanSampai) {
      return `Bulan ${formatMonthYearLabel(bulanDari)}`;
    }
    return `Bulan ${formatMonthYearLabel(bulanDari)} - ${formatMonthYearLabel(bulanSampai)}`;
  }, [bulanDari, bulanSampai]);

  // Main Export Generator (.xlsx with High-Definition Clustered Bar & Donut Charts)
  const handleExportExcel = async () => {
    setIsExporting(true);

    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const filename = `Laporan_Rekap_MCU_Admin_PTPN_${timestamp}.xlsx`;

      const totalAdminMcu = filteredMcuRecords.length;
      const totalMiniMcu = filteredMiniMcuRecords.length;
      const totalCombined = totalAdminMcu + totalMiniMcu;

      // KPI Status Kebugaran MCU Admin
      const fitDutyAdmin = filteredMcuRecords.filter((r) => {
        const st = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
        return st.includes('fit') && !st.includes('catatan') && !st.includes('tidak') && !st.includes('unfit');
      }).length;

      const fitCatatanAdmin = filteredMcuRecords.filter((r) => {
        const st = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
        return st.includes('catatan');
      }).length;

      const tidakFitAdmin = filteredMcuRecords.filter((r) => {
        const st = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
        return st.includes('tidak') || st.includes('evaluasi') || st.includes('unfit');
      }).length;

      const pctFitDuty = totalAdminMcu > 0 ? Math.round((fitDutyAdmin / totalAdminMcu) * 100) : 0;
      const pctFitCatatan = totalAdminMcu > 0 ? Math.round((fitCatatanAdmin / totalAdminMcu) * 100) : 0;
      const pctTidakFit = totalAdminMcu > 0 ? Math.round((tidakFitAdmin / totalAdminMcu) * 100) : 0;

      // KPI Status Kebugaran Inhouse Clinic
      const fitDutyKlinik = filteredMiniMcuRecords.filter((r) => {
        const st = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
        return st.includes('fit') && !st.includes('catatan') && !st.includes('tidak') && !st.includes('unfit');
      }).length;

      const fitCatatanKlinik = filteredMiniMcuRecords.filter((r) => {
        const st = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
        return st.includes('catatan');
      }).length;

      const tidakFitKlinik = filteredMiniMcuRecords.filter((r) => {
        const st = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
        return st.includes('tidak') || st.includes('evaluasi') || st.includes('unfit');
      }).length;

      // 1. DATA GRAFIK 1: ENTITAS (BATANG BERKELOMPOK / CLUSTERED BAR)
      const entities = [
        { code: 'PTPN 1', label: 'PTPN 1', targetDefault: 300 },
        { code: 'PTPN 3', label: 'PTPN 3', targetDefault: 283 },
        { code: 'PTPN 4', label: 'PTPN 4', targetDefault: 300 },
      ];

      const entitasRowsData = entities.map((ent) => {
        const mcuInEnt = filteredMcuRecords.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent.code));
        const sudahMcu = mcuInEnt.length;
        const target = Math.max(sudahMcu, ent.targetDefault);
        const belumMcu = Math.max(0, target - sudahMcu);
        const fit = mcuInEnt.filter((r) => {
          const s = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
          return s.includes('fit') && !s.includes('catatan') && !s.includes('tidak') && !s.includes('unfit');
        }).length;
        const catatan = mcuInEnt.filter((r) => String(r.status_kebugaran || r.kesimpulan || '').toLowerCase().includes('catatan')).length;
        const tidakFit = mcuInEnt.filter((r) => {
          const s = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
          return s.includes('tidak') || s.includes('evaluasi') || s.includes('unfit');
        }).length;
        const pctPartisipasi = target > 0 ? Math.round((sudahMcu / target) * 1000) / 10 : 0;

        return {
          code: ent.code,
          name: ent.label,
          target,
          sudahMcu,
          belumMcu,
          fit,
          catatan,
          tidakFit,
          pctPartisipasi,
        };
      });

      const clusteredBarItems = entitasRowsData.map((e) => ({
        category: e.name,
        series1Val: e.target,
        series2Val: e.sudahMcu,
      }));

      // 2. DATA GRAFIK 2: DIVISI (LEADERBOARD)
      const divisiMap: Record<string, McuRecord[]> = {};
      filteredMcuRecords.forEach((r) => {
        let rawDiv = (r.divisi || '').trim();
        if (!rawDiv || rawDiv === '-' || rawDiv === '0') rawDiv = 'Belum Ditentukan';
        const divName = normalizeDivisiName(rawDiv);
        if (!divisiMap[divName]) divisiMap[divName] = [];
        divisiMap[divName].push(r);
      });

      const allDivisiEntries = Object.entries(divisiMap).map(([fullDivisi, recs]) => {
        const sudahMcu = recs.length;
        const target = Math.max(sudahMcu, Math.round(sudahMcu * 1.15));
        const belumMcu = Math.max(0, target - sudahMcu);
        const fit = recs.filter((r) => {
          const s = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
          return s.includes('fit') && !s.includes('catatan') && !s.includes('tidak') && !s.includes('unfit');
        }).length;
        const catatan = recs.filter((r) => String(r.status_kebugaran || r.kesimpulan || '').toLowerCase().includes('catatan')).length;
        const tidakFit = recs.filter((r) => {
          const s = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
          return s.includes('tidak') || s.includes('evaluasi') || s.includes('unfit');
        }).length;
        const pctSudah = target > 0 ? Math.round((sudahMcu / target) * 100) : 0;

        return {
          fullDivisi,
          target,
          sudahMcu,
          belumMcu,
          fit,
          catatan,
          tidakFit,
          pctSudah,
        };
      }).sort((a, b) => b.sudahMcu - a.sudahMcu);

      const topDivisiList = allDivisiEntries.slice(0, 15);
      const divisiBarItems = topDivisiList.map((d) => ({
        label: d.fullDivisi,
        value: d.sudahMcu,
      }));

      // 3. DATA GRAFIK 3: MCU VS INHOUSE (DONAT)
      const mcuVsKlinikSlices = [
        { name: 'MCU Admin', value: totalAdminMcu, color: '#0284c7' },
        { name: 'Inhouse Clinic', value: totalMiniMcu, color: '#0d9488' },
      ];

      // 4. DATA GRAFIK 4: STATUS KEBUGARAN (DUAL DONAT)
      const fitAdminSlices = [
        { name: 'Fit for Duty', value: fitDutyAdmin, color: '#16a34a' },
        { name: 'Fit Catatan', value: fitCatatanAdmin, color: '#d97706' },
        { name: 'Tidak Fit', value: tidakFitAdmin, color: '#e11d48' },
      ];
      const fitKlinikSlices = [
        { name: 'Fit for Duty', value: fitDutyKlinik, color: '#059669' },
        { name: 'Fit Catatan', value: fitCatatanKlinik, color: '#f59e0b' },
        { name: 'Tidak Fit', value: tidakFitKlinik, color: '#f43f5e' },
      ];

      // 5. DATA GRAFIK 5: TEKANAN DARAH (DUAL DONAT)
      let tensiNormalAdmin = 0, tensiPraAdmin = 0, tensiHiperAdmin = 0;
      filteredMcuRecords.forEach((r) => {
        const sysRaw = r.vitals?.tensi_sistolik || Number(String(r.tensi || '').split('/')[0]);
        const diaRaw = r.vitals?.tensi_diastolik || Number(String(r.tensi || '').split('/')[1]);
        if (!sysRaw && !diaRaw) return;
        const sys = sysRaw || 120, dia = diaRaw || 80;
        if (sys >= 140 || dia >= 90) tensiHiperAdmin++;
        else if (sys >= 120 || dia >= 80) tensiPraAdmin++;
        else tensiNormalAdmin++;
      });

      let tensiNormalKlinik = 0, tensiPraKlinik = 0, tensiHiperKlinik = 0;
      filteredMiniMcuRecords.forEach((r) => {
        const sysRaw = r.vitals?.tensi_sistolik || Number(String(r.tensi || '').split('/')[0]);
        const diaRaw = r.vitals?.tensi_diastolik || Number(String(r.tensi || '').split('/')[1]);
        if (!sysRaw && !diaRaw) return;
        const sys = sysRaw || 120, dia = diaRaw || 80;
        if (sys >= 140 || dia >= 90) tensiHiperKlinik++;
        else if (sys >= 120 || dia >= 80) tensiPraKlinik++;
        else tensiNormalKlinik++;
      });

      const tensiAdminSlices = [
        { name: 'Normal (<120/80)', value: tensiNormalAdmin, color: '#10b981' },
        { name: 'Pra-Hipertensi', value: tensiPraAdmin, color: '#f59e0b' },
        { name: 'Hipertensi (≥140/90)', value: tensiHiperAdmin, color: '#f43f5e' },
      ];
      const tensiKlinikSlices = [
        { name: 'Normal (<120/80)', value: tensiNormalKlinik, color: '#059669' },
        { name: 'Pra-Hipertensi', value: tensiPraKlinik, color: '#d97706' },
        { name: 'Hipertensi (≥140/90)', value: tensiHiperKlinik, color: '#e11d48' },
      ];

      // 6. DATA GRAFIK 6: KOLESTEROL (DUAL DONAT)
      let kolRendahAdmin = 0, kolSedangAdmin = 0, kolTinggiAdmin = 0;
      filteredMcuRecords.forEach((r) => {
        const k = Number(r.vitals?.kolesterol || r.kolesterol || 0);
        if (isNaN(k) || k <= 0) return;
        if (k >= 240) kolTinggiAdmin++;
        else if (k >= 200) kolSedangAdmin++;
        else kolRendahAdmin++;
      });

      let kolRendahKlinik = 0, kolSedangKlinik = 0, kolTinggiKlinik = 0;
      filteredMiniMcuRecords.forEach((r) => {
        const k = Number(r.vitals?.kolesterol || r.kolesterol || 0);
        if (isNaN(k) || k <= 0) return;
        if (k >= 240) kolTinggiKlinik++;
        else if (k >= 200) kolSedangKlinik++;
        else kolRendahKlinik++;
      });

      const kolAdminSlices = [
        { name: 'Risiko Rendah (<200)', value: kolRendahAdmin, color: '#10b981' },
        { name: 'Risiko Sedang (200-239)', value: kolSedangAdmin, color: '#f59e0b' },
        { name: 'Risiko Tinggi (≥240)', value: kolTinggiAdmin, color: '#f43f5e' },
      ];
      const kolKlinikSlices = [
        { name: 'Risiko Rendah (<200)', value: kolRendahKlinik, color: '#059669' },
        { name: 'Risiko Sedang (200-239)', value: kolSedangKlinik, color: '#d97706' },
        { name: 'Risiko Tinggi (≥240)', value: kolTinggiKlinik, color: '#e11d48' },
      ];

      // 7. DATA GRAFIK 7: GULA DARAH (DUAL DONAT)
      let gulaNormalAdmin = 0, gulaPreAdmin = 0, gulaDmAdmin = 0;
      filteredMcuRecords.forEach((r) => {
        const g = Number(r.vitals?.gula_darah || r.gula_darah || 0);
        if (isNaN(g) || g <= 0) return;
        if (g >= 126) gulaDmAdmin++;
        else if (g >= 100) gulaPreAdmin++;
        else gulaNormalAdmin++;
      });

      let gulaNormalKlinik = 0, gulaPreKlinik = 0, gulaDmKlinik = 0;
      filteredMiniMcuRecords.forEach((r) => {
        const g = Number(r.vitals?.gula_darah || r.gula_darah || 0);
        if (isNaN(g) || g <= 0) return;
        if (g >= 126) gulaDmKlinik++;
        else if (g >= 100) gulaPreKlinik++;
        else gulaNormalKlinik++;
      });

      const gulaAdminSlices = [
        { name: 'Normal (<100)', value: gulaNormalAdmin, color: '#10b981' },
        { name: 'Prediabetes (100-125)', value: gulaPreAdmin, color: '#f59e0b' },
        { name: 'Diabetes (≥126)', value: gulaDmAdmin, color: '#f43f5e' },
      ];
      const gulaKlinikSlices = [
        { name: 'Normal (<100)', value: gulaNormalKlinik, color: '#059669' },
        { name: 'Prediabetes (100-125)', value: gulaPreKlinik, color: '#d97706' },
        { name: 'Diabetes (≥126)', value: gulaDmKlinik, color: '#e11d48' },
      ];

      // 8. DATA GRAFIK 8: BMI (DUAL DONAT)
      let bmiUnderAdmin = 0, bmiNormalAdmin = 0, bmiOverAdmin = 0, bmiObeseAdmin = 0;
      filteredMcuRecords.forEach((r) => {
        let b = Number(r.vitals?.bmi || r.bmi || 0);
        if (!b || b <= 0) {
          const tb = Number(r.tinggi_badan || 0), bb = Number(r.berat_badan || 0);
          if (tb > 0 && bb > 0) b = Number((bb / Math.pow(tb / 100, 2)).toFixed(1));
        }
        if (isNaN(b) || b <= 0) return;
        if (b < 18.5) bmiUnderAdmin++;
        else if (b <= 24.9) bmiNormalAdmin++;
        else if (b <= 26.9) bmiOverAdmin++;
        else bmiObeseAdmin++;
      });

      let bmiUnderKlinik = 0, bmiNormalKlinik = 0, bmiOverKlinik = 0, bmiObeseKlinik = 0;
      filteredMiniMcuRecords.forEach((r) => {
        let b = Number(r.vitals?.bmi || r.bmi || 0);
        if (!b || b <= 0) {
          const tb = Number(r.tinggi_badan || 0), bb = Number(r.berat_badan || 0);
          if (tb > 0 && bb > 0) b = Number((bb / Math.pow(tb / 100, 2)).toFixed(1));
        }
        if (isNaN(b) || b <= 0) return;
        if (b < 18.5) bmiUnderKlinik++;
        else if (b <= 24.9) bmiNormalKlinik++;
        else if (b <= 26.9) bmiOverKlinik++;
        else bmiObeseKlinik++;
      });

      const bmiAdminSlices = [
        { name: 'Underweight', value: bmiUnderAdmin, color: '#3b82f6' },
        { name: 'Normal', value: bmiNormalAdmin, color: '#10b981' },
        { name: 'Overweight', value: bmiOverAdmin, color: '#f59e0b' },
        { name: 'Obesitas', value: bmiObeseAdmin, color: '#f43f5e' },
      ];
      const bmiKlinikSlices = [
        { name: 'Underweight', value: bmiUnderKlinik, color: '#2563eb' },
        { name: 'Normal', value: bmiNormalKlinik, color: '#059669' },
        { name: 'Overweight', value: bmiOverKlinik, color: '#d97706' },
        { name: 'Obesitas', value: bmiObeseKlinik, color: '#e11d48' },
      ];

      // 9. DATA GRAFIK 9: DEMOGRAFI KELOMPOK USIA
      const ageBrackets: Record<string, number> = {
        '< 25 thn': 0, '25 - 30 thn': 0, '31 - 35 thn': 0, '36 - 40 thn': 0, '41 - 45 thn': 0, '46 - 50 thn': 0, '> 50 thn': 0,
      };
      filteredMcuRecords.forEach((r) => {
        const u = Number(r.umur);
        if (isNaN(u) || u <= 0) return;
        if (u < 25) ageBrackets['< 25 thn']++;
        else if (u <= 30) ageBrackets['25 - 30 thn']++;
        else if (u <= 35) ageBrackets['31 - 35 thn']++;
        else if (u <= 40) ageBrackets['36 - 40 thn']++;
        else if (u <= 45) ageBrackets['41 - 45 thn']++;
        else if (u <= 50) ageBrackets['46 - 50 thn']++;
        else ageBrackets['> 50 thn']++;
      });
      const ageBarItems = Object.entries(ageBrackets).map(([label, value]) => ({ label, value }));

      // 10. DATA GRAFIK 10: TINDAK LANJUT PENGOBATAN (PERSIS FOTO PENGGUNA)
      let countKonsulObat = 0;
      let countKonsulRujukan = 0;
      let countKonsulRujukanObat = 0;
      let countKonsul = 0;
      let countPeriksaKlinik = 0;

      const allCombinedRecords = [...filteredMcuRecords, ...filteredMiniMcuRecords];
      allCombinedRecords.forEach((r: any) => {
        const rawTl = String(r.tindak_lanjut || r.tindakan_terapi || r.anjuran || r.intervensi || r.catatan || '').toLowerCase();
        const hasObat = rawTl.includes('obat') || rawTl.includes('terapi') || rawTl.includes('resep') || rawTl.includes('farmasi');
        const hasRujukan = rawTl.includes('rujuk') || rawTl.includes('spesialis') || rawTl.includes('rs ') || rawTl.includes('rumah sakit');
        const hasKonsul = rawTl.includes('konsul') || rawTl.includes('edukasi') || rawTl.includes('nasihat') || rawTl.includes('anjuran');

        if (hasKonsul && hasRujukan && hasObat) countKonsulRujukanObat++;
        else if (hasRujukan && hasObat) countKonsulRujukanObat++;
        else if (hasKonsul && hasRujukan) countKonsulRujukan++;
        else if (hasRujukan) countKonsulRujukan++;
        else if (hasKonsul && hasObat) countKonsulObat++;
        else if (hasObat) countKonsulObat++;
        else if (hasKonsul) countKonsul++;
        else countPeriksaKlinik++;
      });

      const tindakLanjutSlices = [
        { name: 'KONSULTASI + OBAT', value: countKonsulObat, color: '#3b82f6' },
        { name: 'KONSULTASI + RUJUKAN', value: countKonsulRujukan, color: '#ef4444' },
        { name: 'KONSULTASI + RUJUKAN + OBAT', value: countKonsulRujukanObat, color: '#84cc16' },
        { name: 'KONSULTASI', value: countKonsul, color: '#8b5cf6' },
        { name: 'PEMERIKSAAN KESEHATAN KLINIK', value: countPeriksaKlinik, color: '#06b6d4' },
      ];

      // ==========================================
      // RENDER SELURUH GAMBAR GRAFIK ASLI (HD PNG)
      // ==========================================
      // 1. Grafik Batang Berkelompok Entitas
      const clusteredBarPng = renderClusteredBarChartPng(
        clusteredBarItems,
        'Jumlah Karyawan',
        'Sudah Melaksanakan MCU',
        '1. Jumlah Karyawan Atas Hasil MCU'
      );

      // 2. Grafik Donut Perbandingan Volume (MCU vs Klinik)
      const mcuVsKlinikExcelChartPng = renderExcelStylePieDonutChartPng(
        '2. Perbandingan MCU Berkala vs Inhouse Clinic',
        mcuVsKlinikSlices,
        530,
        250,
        true,
        `${totalCombined}`
      );

      // 3. Grafik Donut / Pie Tindak Lanjut Pengobatan (PERSIS SEPERTI FOTO PENGGUNA)
      const tindakLanjutChartPng = renderExcelStylePieDonutChartPng(
        '3. Tindak Lanjut Pengobatan',
        tindakLanjutSlices,
        530,
        250,
        true,
        `${allCombinedRecords.length}`
      );

      // 4. Grafik Donut Status Kebugaran
      const fitnessExcelChartPng = renderExcelStylePieDonutChartPng(
        '4. Status Kebugaran Kerja (Fitness Status)',
        fitAdminSlices,
        530,
        250,
        true,
        `${totalAdminMcu}`
      );

      // 5. Grafik Donut Tekanan Darah (JNC VII)
      const tensiExcelChartPng = renderExcelStylePieDonutChartPng(
        '5. Profil Tekanan Darah (JNC VII)',
        tensiAdminSlices,
        530,
        250,
        true,
        `${tensiNormalAdmin + tensiPraAdmin + tensiHiperAdmin}`
      );

      // 6. Grafik Donut Kolesterol (NCEP ATP III)
      const kolExcelChartPng = renderExcelStylePieDonutChartPng(
        '6. Profil Kolesterol Total (NCEP ATP III)',
        kolAdminSlices,
        530,
        250,
        true,
        `${kolRendahAdmin + kolSedangAdmin + kolTinggiAdmin}`
      );

      // 7. Grafik Donut Gula Darah (ADA)
      const gulaExcelChartPng = renderExcelStylePieDonutChartPng(
        '7. Skrining Kadar Gula Darah (ADA)',
        gulaAdminSlices,
        530,
        250,
        true,
        `${gulaNormalAdmin + gulaPreAdmin + gulaDmAdmin}`
      );

      // 8. Grafik Donut BMI (WHO)
      const bmiExcelChartPng = renderExcelStylePieDonutChartPng(
        '8. Distribusi Indeks Massa Tubuh (BMI WHO)',
        bmiAdminSlices,
        530,
        250,
        true,
        `${bmiUnderAdmin + bmiNormalAdmin + bmiOverAdmin + bmiObeseAdmin}`
      );

      // 9. Grafik Batang Demografi Usia
      const ageBarPng = renderHorizontalBarChartPng(
        '9. Distribusi Kelompok Usia Karyawan',
        ageBarItems,
        '#7c3aed',
        '#6d28d9',
        530,
        270
      );

      // 10. Grafik Batang Vertikal Divisi (Persis Foto Dashboard Admin Pengguna)
      const totalDivisiCount = allDivisiEntries.length;
      const totalKaryawanDivisi = filteredMcuRecords.length;
      const divisiTerbanyakName = allDivisiEntries[0]?.fullDivisi || '-';
      const rataRataPerDivisi = totalDivisiCount > 0 ? Math.round(totalKaryawanDivisi / totalDivisiCount) : 0;

      const topDivisiForChart = allDivisiEntries.slice(0, 15).map((d) => ({
        divisi: d.fullDivisi,
        sudahMcu: d.sudahMcu,
        belumMcu: d.belumMcu,
      }));

      const divisiColumnChartPng = renderDivisiColumnChartPng(
        topDivisiForChart,
        totalDivisiCount,
        totalKaryawanDivisi,
        divisiTerbanyakName,
        rataRataPerDivisi,
        860,
        440
      );

      // ==========================================
      // MEMBANGUN WORKBOOK EXCEL DENGAN EXCELJS
      // ==========================================
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Admin MCU PTPN';
      workbook.created = new Date();

      // ----------------------------------------------------
      // SHEET 1: DATA PASIEN MCU
      // ----------------------------------------------------
      const wsData = workbook.addWorksheet('Data Pasien', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      wsData.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Tanggal MCU', key: 'tgl', width: 14 },
        { header: 'Waktu', key: 'jam', width: 10 },
        { header: 'Nama Karyawan', key: 'nama', width: 26 },
        { header: 'Divisi', key: 'divisi', width: 24 },
        { header: 'No Pegawai', key: 'noPeg', width: 14 },
        { header: 'NIK', key: 'nik', width: 14 },
        { header: 'Departemen', key: 'dept', width: 16 },
        { header: 'Tensi', key: 'tensi', width: 13 },
        { header: 'BMI', key: 'bmi', width: 10 },
        { header: 'Gula Darah', key: 'gula', width: 12 },
        { header: 'Kolesterol', key: 'kol', width: 12 },
        { header: 'Diagnosa Medis', key: 'diag', width: 26 },
        { header: 'Status Kebugaran', key: 'status', width: 18 },
      ];

      // Header Styling Sheet 1
      const headerRow1 = wsData.getRow(1);
      headerRow1.height = 28;
      headerRow1.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF005930' },
        };
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF004022' } },
          bottom: { style: 'thin', color: { argb: 'FF004022' } },
          left: { style: 'thin', color: { argb: 'FF004022' } },
          right: { style: 'thin', color: { argb: 'FF004022' } },
        };
      });

      // Rows Sheet 1
      filteredMcuRecords.forEach((r, idx) => {
        const row = wsData.addRow({
          no: idx + 1,
          tgl: r.tanggal_pemeriksaan || '-',
          jam: r.jam_pemeriksaan || '08:30',
          nama: r.nama_lengkap || r.nama_karyawan || '-',
          divisi: r.divisi || '-',
          noPeg: (r as any).nomor_pegawai || (r as any).no_pegawai || (r.nik ? `EMP-${r.nik.slice(-4)}` : '-'),
          nik: r.nik || '-',
          dept: r.departemen || (r as any).entitas || 'PTPN 3',
          tensi: r.vitals?.tensi || r.tensi || '-',
          bmi: r.vitals?.bmi || r.bmi || '-',
          gula: r.vitals?.gula_darah || r.gula_darah || '-',
          kol: r.vitals?.kolesterol || r.kolesterol || '-',
          diag: r.diagnosa || r.keluhan || '-',
          status: r.status_kebugaran || r.kesimpulan || 'Fit for Duty',
        });

        row.height = 20;
        const isZebra = idx % 2 === 1;

        row.eachCell((cell, colNumber) => {
          cell.font = { name: 'Calibri', size: 10 };
          if (isZebra) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };

          if (colNumber === 4 || colNumber === 5 || colNumber === 13) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      });

      // ----------------------------------------------------
      // SHEET 2: GRAFIK & DASHBOARD ADMIN DENGAN TABEL INFORMASI DI KIRI & CHART DI KANAN
      // ----------------------------------------------------
      const wsCharts = workbook.addWorksheet('Grafik & Dashboard Admin');

      // Setup Kolom: Sisi Kiri (A-D untuk Tabel Informasi), E (Spacer), F-L (Chart)
      wsCharts.columns = [
        { key: 'c1', width: 34 }, // Kolom A: Kategori / Parameter
        { key: 'c2', width: 16 }, // Kolom B: Jumlah Pasien / Karyawan
        { key: 'c3', width: 15 }, // Kolom C: Persentase (%) / Keterangan
        { key: 'c4', width: 15 }, // Kolom D: Kolom opsional (Kepatuhan / Belum MCU)
        { key: 'c5', width: 4 },  // Kolom E: Spacer pemisah antara tabel dan chart
        { key: 'c6', width: 14 }, // Kolom F: Chart area
        { key: 'c7', width: 14 }, // Kolom G: Chart area
        { key: 'c8', width: 14 }, // Kolom H: Chart area
        { key: 'c9', width: 14 }, // Kolom I: Chart area
        { key: 'c10', width: 14 },// Kolom J: Chart area
        { key: 'c11', width: 14 },// Kolom K: Chart area
        { key: 'c12', width: 14 },// Kolom L: Chart area
      ];

      // Kop Surat Resmi
      wsCharts.mergeCells('A1:L1');
      const r1 = wsCharts.getCell('A1');
      r1.value = 'REKAPITULASI MCU & ANALITIK DASHBOARD ADMIN';
      r1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF005930' } };
      r1.alignment = { horizontal: 'center', vertical: 'middle' };
      wsCharts.getRow(1).height = 25;

      wsCharts.mergeCells('A2:L2');
      const r2 = wsCharts.getCell('A2');
      r2.value = 'PT PERKEBUNAN NUSANTARA • Gedung Graha PTPN Lantai 15, Jl. Hr. Rasuna Said Kav B2/1, Jakarta Selatan';
      r2.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF475569' } };
      r2.alignment = { horizontal: 'center', vertical: 'middle' };
      wsCharts.getRow(2).height = 18;

      wsCharts.mergeCells('A3:L3');
      const r3 = wsCharts.getCell('A3');
      r3.value = `Laporan Hasil Pemeriksaan Kesehatan Berkala • ${periodeText}`;
      r3.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
      r3.alignment = { horizontal: 'center', vertical: 'middle' };
      wsCharts.getRow(3).height = 20;

      // 5 KARTU KPI EKSEKUTIF (Baris 5 - 7)
      wsCharts.mergeCells('A5:C5');
      wsCharts.getCell('A5').value = 'MCU BERKALA';
      wsCharts.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      wsCharts.getCell('A5').font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsCharts.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('D5:E5');
      wsCharts.getCell('D5').value = 'INHOUSE CLINIC';
      wsCharts.getCell('D5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      wsCharts.getCell('D5').font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsCharts.getCell('D5').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('F5:G5');
      wsCharts.getCell('F5').value = 'FIT SEHAT';
      wsCharts.getCell('F5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF16A34A' } };
      wsCharts.getCell('F5').font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsCharts.getCell('F5').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('H5:I5');
      wsCharts.getCell('H5').value = 'FIT CATATAN';
      wsCharts.getCell('H5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
      wsCharts.getCell('H5').font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsCharts.getCell('H5').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('J5:L5');
      wsCharts.getCell('J5').value = 'SEMENTARA TIDAK FIT';
      wsCharts.getCell('J5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } };
      wsCharts.getCell('J5').font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsCharts.getCell('J5').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.getRow(5).height = 22;

      // Nilai KPI (Baris 6)
      wsCharts.mergeCells('A6:C6');
      wsCharts.getCell('A6').value = totalAdminMcu;
      wsCharts.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
      wsCharts.getCell('A6').font = { bold: true, size: 16, color: { argb: 'FF1E3A8A' } };
      wsCharts.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('D6:E6');
      wsCharts.getCell('D6').value = totalMiniMcu;
      wsCharts.getCell('D6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDFA' } };
      wsCharts.getCell('D6').font = { bold: true, size: 16, color: { argb: 'FF115E59' } };
      wsCharts.getCell('D6').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('F6:G6');
      wsCharts.getCell('F6').value = fitDutyAdmin;
      wsCharts.getCell('F6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      wsCharts.getCell('F6').font = { bold: true, size: 16, color: { argb: 'FF14532D' } };
      wsCharts.getCell('F6').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('H6:I6');
      wsCharts.getCell('H6').value = fitCatatanAdmin;
      wsCharts.getCell('H6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
      wsCharts.getCell('H6').font = { bold: true, size: 16, color: { argb: 'FF78350F' } };
      wsCharts.getCell('H6').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('J6:L6');
      wsCharts.getCell('J6').value = tidakFitAdmin;
      wsCharts.getCell('J6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF1F2' } };
      wsCharts.getCell('J6').font = { bold: true, size: 16, color: { argb: 'FF881337' } };
      wsCharts.getCell('J6').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.getRow(6).height = 28;

      // Subtext KPI (Baris 7)
      wsCharts.mergeCells('A7:C7');
      wsCharts.getCell('A7').value = 'Pemeriksaan Tahunan RS';
      wsCharts.getCell('A7').font = { size: 9, bold: true, color: { argb: 'FF3B82F6' } };
      wsCharts.getCell('A7').alignment = { horizontal: 'center' };

      wsCharts.mergeCells('D7:E7');
      wsCharts.getCell('D7').value = 'Kunjungan Mandiri Klinik';
      wsCharts.getCell('D7').font = { size: 9, bold: true, color: { argb: 'FF0D9488' } };
      wsCharts.getCell('D7').alignment = { horizontal: 'center' };

      wsCharts.mergeCells('F7:G7');
      wsCharts.getCell('F7').value = `${pctFitDuty}% Karyawan`;
      wsCharts.getCell('F7').font = { size: 9, bold: true, color: { argb: 'FF16A34A' } };
      wsCharts.getCell('F7').alignment = { horizontal: 'center' };

      wsCharts.mergeCells('H7:I7');
      wsCharts.getCell('H7').value = `${pctFitCatatan}% Karyawan`;
      wsCharts.getCell('H7').font = { size: 9, bold: true, color: { argb: 'FFD97706' } };
      wsCharts.getCell('H7').alignment = { horizontal: 'center' };

      wsCharts.mergeCells('J7:L7');
      wsCharts.getCell('J7').value = `${pctTidakFit}% Karyawan`;
      wsCharts.getCell('J7').font = { size: 9, bold: true, color: { argb: 'FFE11D48' } };
      wsCharts.getCell('J7').alignment = { horizontal: 'center' };

      let curRow = 9;

      // =========================================================================
      // HELPER: MEMBUAT SECTION SIDE-BY-SIDE (TABEL INFORMASI DI KIRI, CHART DI KANAN)
      // Persis seperti contoh foto Excel yang diunggah pengguna!
      // =========================================================================
      const addSideBySideSection = ({
        sectionNumber,
        sectionTitle,
        headers,
        rows,
        totalRow,
        base64Png,
        imgW = 530,
        imgH = 250,
        chartCol = 5, // Kolom F (0-indexed = 5)
      }: {
        sectionNumber: string;
        sectionTitle: string;
        headers: string[];
        rows: Array<{ label: string; val1: number | string; val2?: number | string; val3?: number | string }>;
        totalRow?: { label: string; val1: number | string; val2?: number | string; val3?: number | string } | null;
        base64Png: string;
        imgW?: number;
        imgH?: number;
        chartCol?: number;
      }) => {
        const startRow = curRow;

        // 1. Judul Section di Kolom A (Merge sesuai jumlah kolom tabel)
        const numColsTable = headers.length;
        const endColLetter = String.fromCharCode(65 + numColsTable - 1);
        wsCharts.mergeCells(`A${startRow}:${endColLetter}${startRow}`);
        const titleCell = wsCharts.getCell(`A${startRow}`);
        titleCell.value = `${sectionNumber}. ${sectionTitle.toUpperCase()}`;
        titleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF166534' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
        wsCharts.getRow(startRow).height = 24;

        curRow += 1;

        // 2. Header Tabel Informasi (Hijau Lembut #A9D08E seperti foto pengguna)
        const headerRow = wsCharts.getRow(curRow);
        headerRow.height = 22;
        headers.forEach((h, idx) => {
          const colLetter = String.fromCharCode(65 + idx);
          const cell = wsCharts.getCell(`${colLetter}${curRow}`);
          cell.value = h;
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFA9D08E' }, // Soft sage green khas Excel PTPN
          };
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
          cell.alignment = {
            vertical: 'middle',
            horizontal: idx === 0 ? 'left' : 'center',
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF548235' } },
            bottom: { style: 'thin', color: { argb: 'FF548235' } },
            left: { style: 'thin', color: { argb: 'FF548235' } },
            right: { style: 'thin', color: { argb: 'FF548235' } },
          };
        });

        curRow += 1;

        // 3. Baris-baris Data Tabel
        rows.forEach((r) => {
          const dRow = wsCharts.getRow(curRow);
          dRow.height = 20;

          const rowVals = [r.label, r.val1, r.val2, r.val3].filter((v) => v !== undefined);
          rowVals.forEach((val, cIdx) => {
            const colLetter = String.fromCharCode(65 + cIdx);
            const cell = wsCharts.getCell(`${colLetter}${curRow}`);
            cell.value = val;
            cell.font = { name: 'Calibri', size: 10, bold: false };
            cell.alignment = {
              vertical: 'middle',
              horizontal: cIdx === 0 ? 'left' : 'center',
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            };
          });

          curRow += 1;
        });

        // 4. Baris Total (jika ada)
        if (totalRow) {
          const tRow = wsCharts.getRow(curRow);
          tRow.height = 21;
          const totVals = [totalRow.label, totalRow.val1, totalRow.val2, totalRow.val3].filter((v) => v !== undefined);
          totVals.forEach((val, cIdx) => {
            const colLetter = String.fromCharCode(65 + cIdx);
            const cell = wsCharts.getCell(`${colLetter}${curRow}`);
            cell.value = val;
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' },
            };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
            cell.alignment = {
              vertical: 'middle',
              horizontal: cIdx === 0 ? 'left' : 'center',
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FF8C8C8C' } },
              bottom: { style: 'double', color: { argb: 'FF8C8C8C' } },
              left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
              right: { style: 'thin', color: { argb: 'FFD9D9D9' } },
            };
          });
          curRow += 1;
        }

        // 5. Sematkan Gambar Grafik Berdampingan di Sisi Kanan (Mulai Kolom F)
        if (base64Png) {
          const imgId = workbook.addImage({
            base64: base64Png,
            extension: 'png',
          });
          wsCharts.addImage(imgId, {
            tl: { col: chartCol, row: startRow - 1 },
            ext: { width: imgW, height: imgH },
          });
        }

        // Hitung baris maksimum agar section berikutnya tidak tumpang tindih
        const tableRowsCount = curRow - startRow;
        const chartRowsCount = Math.ceil(imgH / 20) + 1;
        const maxUsedRows = Math.max(tableRowsCount, chartRowsCount);
        curRow = startRow + maxUsedRows + 2; // Beri spasi 2 baris
      };

      // ----------------------------------------------------
      // 1. SECTION 1: JUMLAH KARYAWAN ATAS HASIL MCU (ENTITAS)
      // ----------------------------------------------------
      const totalTargetEnt = entitasRowsData.reduce((acc, e) => acc + e.target, 0);
      const totalSudahEnt = entitasRowsData.reduce((acc, e) => acc + e.sudahMcu, 0);
      const pctTotalEnt = totalTargetEnt > 0 ? Math.round((totalSudahEnt / totalTargetEnt) * 1000) / 10 : 0;

      addSideBySideSection({
        sectionNumber: '1',
        sectionTitle: 'Jumlah Karyawan Atas Hasil MCU (Entitas)',
        headers: ['Entitas Perusahaan', 'Target Karyawan', 'Sudah MCU', 'Kepatuhan (%)'],
        rows: entitasRowsData.map((e) => ({
          label: e.name,
          val1: e.target,
          val2: e.sudahMcu,
          val3: `${e.pctPartisipasi}%`,
        })),
        totalRow: {
          label: 'TOTAL KARYAWAN',
          val1: totalTargetEnt,
          val2: totalSudahEnt,
          val3: `${pctTotalEnt}%`,
        },
        base64Png: clusteredBarPng,
        imgW: 540,
        imgH: 260,
      });

      // ----------------------------------------------------
      // 2. SECTION 2: PERBANDINGAN PELAKSANAAN MCU BERKALA VS KLINIK
      // ----------------------------------------------------
      const pctMcuAdmin = totalCombined > 0 ? Math.round((totalAdminMcu / totalCombined) * 100) : 0;
      const pctMcuKlinik = totalCombined > 0 ? Math.round((totalMiniMcu / totalCombined) * 100) : 0;

      addSideBySideSection({
        sectionNumber: '2',
        sectionTitle: 'Perbandingan Pelaksanaan MCU Berkala vs Klinik',
        headers: ['Jenis Pelaksanaan', 'Jumlah Pasien', 'Persentase (%)'],
        rows: [
          { label: 'MCU Berkala (Tahunan RS)', val1: totalAdminMcu, val2: `${pctMcuAdmin}%` },
          { label: 'Inhouse Clinic (Mandiri)', val1: totalMiniMcu, val2: `${pctMcuKlinik}%` },
        ],
        totalRow: {
          label: 'TOTAL PELAKSANAAN',
          val1: totalCombined,
          val2: '100%',
        },
        base64Png: mcuVsKlinikExcelChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 3. SECTION 3: TINDAK LANJUT PENGOBATAN (PERSIS SEPERTI FOTO PENGGUNA!)
      // ----------------------------------------------------
      const totalTindakLanjut = countKonsulObat + countKonsulRujukan + countKonsulRujukanObat + countKonsul + countPeriksaKlinik;

      addSideBySideSection({
        sectionNumber: '3',
        sectionTitle: 'Tindak Lanjut Pengobatan',
        headers: ['Kategori Tindak Lanjut', 'Jumlah Pasien', 'Persentase (%)'],
        rows: tindakLanjutSlices.map((s) => ({
          label: s.name,
          val1: s.value,
          val2: totalTindakLanjut > 0 ? `${Math.round((s.value / totalTindakLanjut) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN',
          val1: totalTindakLanjut,
          val2: '100%',
        },
        base64Png: tindakLanjutChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 4. SECTION 4: STATUS KEBUGARAN KERJA (FITNESS STATUS)
      // ----------------------------------------------------
      addSideBySideSection({
        sectionNumber: '4',
        sectionTitle: 'Status Kebugaran Kerja (Fitness Status)',
        headers: ['Kategori Status Kebugaran', 'Jumlah Pasien', 'Persentase (%)'],
        rows: [
          { label: 'Fit for Duty (Sehat Bekerja)', val1: fitDutyAdmin, val2: `${pctFitDuty}%` },
          { label: 'Fit dengan Catatan (Pemantauan)', val1: fitCatatanAdmin, val2: `${pctFitCatatan}%` },
          { label: 'Sementara Tidak Fit (Evaluasi)', val1: tidakFitAdmin, val2: `${pctTidakFit}%` },
        ],
        totalRow: {
          label: 'TOTAL PASIEN MCU',
          val1: totalAdminMcu,
          val2: '100%',
        },
        base64Png: fitnessExcelChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 5. SECTION 5: PROFIL TEKANAN DARAH (JNC VII)
      // ----------------------------------------------------
      const totalTensi = tensiNormalAdmin + tensiPraAdmin + tensiHiperAdmin;
      addSideBySideSection({
        sectionNumber: '5',
        sectionTitle: 'Profil Tekanan Darah (JNC VII)',
        headers: ['Kategori Tekanan Darah', 'Jumlah Pasien', 'Persentase (%)'],
        rows: tensiAdminSlices.map((s) => ({
          label: s.name,
          val1: s.value,
          val2: totalTensi > 0 ? `${Math.round((s.value / totalTensi) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN',
          val1: totalTensi,
          val2: '100%',
        },
        base64Png: tensiExcelChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 6. SECTION 6: PROFIL KOLESTEROL TOTAL (NCEP ATP III)
      // ----------------------------------------------------
      const totalKol = kolRendahAdmin + kolSedangAdmin + kolTinggiAdmin;
      addSideBySideSection({
        sectionNumber: '6',
        sectionTitle: 'Profil Kolesterol Total (NCEP ATP III)',
        headers: ['Kategori Kolesterol Total', 'Jumlah Pasien', 'Persentase (%)'],
        rows: kolAdminSlices.map((s) => ({
          label: s.name,
          val1: s.value,
          val2: totalKol > 0 ? `${Math.round((s.value / totalKol) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN',
          val1: totalKol,
          val2: '100%',
        },
        base64Png: kolExcelChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 7. SECTION 7: SKRINING KADAR GULA DARAH (ADA)
      // ----------------------------------------------------
      const totalGula = gulaNormalAdmin + gulaPreAdmin + gulaDmAdmin;
      addSideBySideSection({
        sectionNumber: '7',
        sectionTitle: 'Skrining Kadar Gula Darah (ADA)',
        headers: ['Kategori Gula Darah Puasa', 'Jumlah Pasien', 'Persentase (%)'],
        rows: gulaAdminSlices.map((s) => ({
          label: s.name,
          val1: s.value,
          val2: totalGula > 0 ? `${Math.round((s.value / totalGula) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN',
          val1: totalGula,
          val2: '100%',
        },
        base64Png: gulaExcelChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 8. SECTION 8: DISTRIBUSI INDEKS MASSA TUBUH (BMI WHO)
      // ----------------------------------------------------
      const totalBmi = bmiUnderAdmin + bmiNormalAdmin + bmiOverAdmin + bmiObeseAdmin;
      addSideBySideSection({
        sectionNumber: '8',
        sectionTitle: 'Distribusi Indeks Massa Tubuh (BMI WHO)',
        headers: ['Kategori Indeks Massa Tubuh', 'Jumlah Pasien', 'Persentase (%)'],
        rows: bmiAdminSlices.map((s) => ({
          label: s.name,
          val1: s.value,
          val2: totalBmi > 0 ? `${Math.round((s.value / totalBmi) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN',
          val1: totalBmi,
          val2: '100%',
        },
        base64Png: bmiExcelChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 9. SECTION 9: DEMOGRAFI KELOMPOK USIA (UMUR)
      // ----------------------------------------------------
      const totalAge = ageBarItems.reduce((acc, a) => acc + a.value, 0);
      addSideBySideSection({
        sectionNumber: '9',
        sectionTitle: 'Demografi Kelompok Usia Karyawan',
        headers: ['Rentang Kelompok Usia', 'Jumlah Karyawan', 'Persentase (%)'],
        rows: ageBarItems.map((a) => ({
          label: a.label,
          val1: a.value,
          val2: totalAge > 0 ? `${Math.round((a.value / totalAge) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL KARYAWAN',
          val1: totalAge,
          val2: '100%',
        },
        base64Png: ageBarPng,
        imgW: 530,
        imgH: 270,
      });

      // ----------------------------------------------------
      // 10. SECTION 10: JUMLAH KARYAWAN PER DIVISI ATAS HASIL MCU (PERSIS FOTO PENGGUNA)
      // ----------------------------------------------------
      addSideBySideSection({
        sectionNumber: '10',
        sectionTitle: `Jumlah Karyawan Per Divisi Atas Hasil MCU (${totalDivisiCount} Divisi Terdata)`,
        headers: ['Divisi / Unit Kerja', 'Target Karyawan', 'Sudah MCU (Orang)', 'Kepatuhan (%)'],
        rows: allDivisiEntries.slice(0, 15).map((d, idx) => ({
          label: `${idx + 1}. ${d.fullDivisi}`,
          val1: d.target,
          val2: `${d.sudahMcu} Orang`,
          val3: `${d.pctSudah}%`,
        })),
        totalRow: {
          label: 'TOTAL SELURUH KARYAWAN',
          val1: allDivisiEntries.reduce((acc, d) => acc + d.target, 0),
          val2: `${totalKaryawanDivisi} Orang`,
          val3: '100%',
        },
        base64Png: divisiColumnChartPng,
        imgW: 860,
        imgH: 440,
        chartCol: 5,
      });

      // Tulis file .xlsx dan trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting Admin Excel (.xlsx):', err);
      alert('Gagal mengunduh Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  const previewRecords = useMemo(() => {
    const start = (previewPage - 1) * previewPageSize;
    return filteredMcuRecords.slice(start, start + previewPageSize);
  }, [filteredMcuRecords, previewPage]);

  const totalPreviewPages = Math.ceil(filteredMcuRecords.length / previewPageSize) || 1;

  return (
    <AppLayout role="admin" active="ekspor">
      <div className="w-full space-y-6 max-w-7xl mx-auto pb-12">
        {/* HEADER HERO BANNER */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-60" />
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-900/10">
                <FileSpreadsheet className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    Ekspor Excel Rekapitulasi MCU Admin
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Format Resmi PTPN
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Unduh berkas spreadsheet (.xlsx) rekam medis MCU lengkap dengan Sheet Data Pasien &amp; Sheet Grafik Dashboard Admin (Grafik Batang Berkelompok &amp; Grafik Donat Visual Lengkap)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || filteredMcuRecords.length === 0}
              className="inline-flex items-center gap-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>{isExporting ? 'Memproses Berkas...' : `Unduh Berkas Excel (${filteredMcuRecords.length} Data)`}</span>
            </button>
          </div>
        </div>

        {/* RANGE SELECTION & FILTER CONTROL PANEL */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Pengaturan Rentang Bulan &amp; Filter MCU
              </h2>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400 mr-1 hidden sm:inline">Pilihan Cepat:</span>
              <button
                type="button"
                onClick={() => handleSetPreset('current')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 border border-slate-200 transition cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('last3')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 border border-slate-200 transition cursor-pointer"
              >
                3 Bulan Terakhir
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('year2026')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 border border-slate-200 transition cursor-pointer"
              >
                Tahun 2026
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('all')}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-200 hover:bg-emerald-200 transition cursor-pointer font-extrabold"
              >
                Semua Periode
              </button>
            </div>
          </div>

          {/* Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="admin-select-dari" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Dari Bulan (Awal)</span>
              </label>
              <div className="relative">
                <select
                  id="admin-select-dari"
                  value={bulanDari}
                  onChange={(e) => setBulanDari(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-white text-xs font-bold text-slate-900 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer shadow-2xs"
                >
                  {availableMonths.map((ym) => (
                    <option key={ym} value={ym}>{formatMonthYearLabel(ym)}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="admin-select-sampai" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Sampai Bulan (Akhir)</span>
              </label>
              <div className="relative">
                <select
                  id="admin-select-sampai"
                  value={bulanSampai}
                  onChange={(e) => setBulanSampai(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-white text-xs font-bold text-slate-900 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer shadow-2xs"
                >
                  {availableMonths.map((ym) => (
                    <option key={ym} value={ym}>{formatMonthYearLabel(ym)}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="admin-select-entitas" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Entitas Perusahaan</span>
              </label>
              <div className="relative">
                <select
                  id="admin-select-entitas"
                  value={filterEntitas}
                  onChange={(e) => setFilterEntitas(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-white text-xs font-bold text-slate-900 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer shadow-2xs"
                >
                  {ENTITAS_LIST.map((ent) => (
                    <option key={ent.value} value={ent.value}>{ent.label}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label htmlFor="admin-select-status" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                <span>Status Kebugaran Kerja</span>
              </label>
              <div className="relative">
                <select
                  id="admin-select-status"
                  value={filterStatusKebugaran}
                  onChange={(e) => setFilterStatusKebugaran(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-white text-xs font-bold text-slate-900 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer shadow-2xs"
                >
                  <option value="all">Semua Status Kebugaran</option>
                  <option value="fit">Fit for Duty</option>
                  <option value="catatan">Fit dengan Catatan</option>
                  <option value="tidak_fit">Sementara Tidak Fit</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4 text-xs font-bold text-slate-700">
            <div className="flex items-center gap-5 flex-wrap">
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeKop}
                  onChange={(e) => setIncludeKop(e.target.checked)}
                  className="w-4 h-4 text-emerald-700 rounded-md border-slate-300 focus:ring-emerald-500"
                />
                <span>Sertakan Kop Surat Resmi PTPN (Header)</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeAnalytics}
                  onChange={(e) => setIncludeAnalytics(e.target.checked)}
                  className="w-4 h-4 text-emerald-700 rounded-md border-slate-300 focus:ring-emerald-500"
                />
                <span>Sertakan Sheet 2 (Grafik &amp; Dashboard 10 Chart)</span>
              </label>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Periode Terpilih: <span className="font-extrabold text-emerald-800">{periodeText}</span>
            </div>
          </div>
        </div>

        {/* KPI SUMMARY CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Karyawan MCU</span>
              <span className="text-2xl font-black text-slate-900">{kpiStats.total.toLocaleString()} Orang</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-800 flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Fit for Duty</span>
              <span className="text-2xl font-black text-slate-900">{kpiStats.fitDuty.toLocaleString()} Orang</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 shadow-2xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Fit dengan Catatan</span>
              <span className="text-2xl font-black text-slate-900">{kpiStats.fitCatatan.toLocaleString()} Orang</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0 shadow-2xs">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sementara Tidak Fit</span>
              <span className="text-2xl font-black text-slate-900">{kpiStats.tidakFit.toLocaleString()} Orang</span>
            </div>
          </div>
        </div>

        {/* VISUAL ANALYTICS CHART PREVIEW */}
        {includeAnalytics && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800 shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Pratinjau Grafik Batang Berkelompok (Clustered Column Chart)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Grafik batang berkelompok dan grafik donat visual ini disematkan langsung sebagai gambar beresolusi tinggi di Sheet 2 Excel
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-800 rounded-full border border-indigo-200">
                PTPN 1, PTPN 3 &amp; PTPN 4
              </span>
            </div>

            <div className="h-64 sm:h-72 w-full pt-2">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={entitasChartData} margin={{ top: 25, right: 15, left: -15, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} stroke="#64748b" allowDecimals={false} />
                    <Tooltip />
                    <Legend verticalAlign="top" align="center" iconType="rect" wrapperStyle={{ paddingBottom: '14px', fontSize: '11px', fontWeight: 'bold' }} />
                    <Bar dataKey="Jumlah Karyawan" fill="#0284c7" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="Jumlah Karyawan" position="top" fill="#0369a1" fontSize={11} fontWeight="bold" offset={6} />
                    </Bar>
                    <Bar dataKey="Sudah Melaksanakan MCU" fill="#059669" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="Sudah Melaksanakan MCU" position="top" fill="#047857" fontSize={11} fontWeight="bold" offset={6} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* SPREADSHEET TABLE PREVIEW */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pratinjau Format Spreadsheet Excel MCU (Sheet 1)
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Tampilan tabel lengkap dengan header hijau (#70ad47) sesuai standar rekapitulasi PTPN
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500">
              Menampilkan {Math.min(filteredMcuRecords.length, (previewPage - 1) * previewPageSize + 1)} - {Math.min(filteredMcuRecords.length, previewPage * previewPageSize)} dari {filteredMcuRecords.length} data
            </span>
          </div>

          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="min-w-[1200px] p-6 space-y-5">
              {includeKop && (
                <div className="text-center space-y-1 pb-4 border-b-2 border-emerald-800">
                  <h3 className="text-xl font-black text-emerald-950 tracking-wider">
                    REKAPITULASI MCU &amp; KESEHATAN KERJA PTPN
                  </h3>
                  <p className="text-xs text-slate-600 font-medium max-w-4xl mx-auto">
                    Gedung Graha PTPN Lantai 15, Jl. Hr. Rasuna Said Kav B2/1, Kuningan Timur, Setiabudi, Jakarta Selatan
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Laporan Hasil Pemeriksaan Kesehatan Berkala &amp; Status Kebugaran
                  </p>
                  <p className="text-sm font-extrabold text-slate-900 pt-1">
                    {periodeText}
                  </p>
                  <p className="text-xs font-black text-emerald-800 tracking-widest uppercase">
                    PERKEBUNAN NUSANTARA
                  </p>
                </div>
              )}

              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#70ad47] text-white font-extrabold text-center border border-[#548235]">
                    <th className="px-3 py-2.5 border border-[#548235] w-10">No</th>
                    <th className="px-3 py-2.5 border border-[#548235] whitespace-nowrap">Tanggal MCU</th>
                    <th className="px-2.5 py-2.5 border border-[#548235] whitespace-nowrap">Waktu</th>
                    <th className="px-4 py-2.5 border border-[#548235] text-left min-w-[160px]">Nama Karyawan</th>
                    <th className="px-3 py-2.5 border border-[#548235] text-left min-w-[130px]">Divisi</th>
                    <th className="px-3 py-2.5 border border-[#548235] whitespace-nowrap">No Pegawai</th>
                    <th className="px-3 py-2.5 border border-[#548235] whitespace-nowrap">NIK</th>
                    <th className="px-3 py-2.5 border border-[#548235] whitespace-nowrap">Departemen</th>
                    <th className="px-3 py-2.5 border border-[#548235] whitespace-nowrap">Tensi</th>
                    <th className="px-2.5 py-2.5 border border-[#548235] whitespace-nowrap">BMI</th>
                    <th className="px-2.5 py-2.5 border border-[#548235] whitespace-nowrap">Gula</th>
                    <th className="px-2.5 py-2.5 border border-[#548235] whitespace-nowrap">Kolesterol</th>
                    <th className="px-4 py-2.5 border border-[#548235] text-left min-w-[160px]">Diagnosa Medis</th>
                    <th className="px-3 py-2.5 border border-[#548235] whitespace-nowrap">Status Kebugaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredMcuRecords.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400 font-medium">
                        Tidak ada data MCU yang sesuai dengan rentang bulan dan filter terpilih.
                      </td>
                    </tr>
                  ) : (
                    previewRecords.map((r, idx) => {
                      const absoluteIdx = (previewPage - 1) * previewPageSize + idx + 1;
                      const tgl = r.tanggal_pemeriksaan || '-';
                      const jam = r.jam_pemeriksaan || '08:30';
                      const nama = r.nama_lengkap || r.nama_karyawan || '-';
                      const div = r.divisi || '-';
                      const noPeg = (r as any).nomor_pegawai || (r as any).no_pegawai || (r.nik ? `EMP-${r.nik.slice(-4)}` : '-');
                      const nik = r.nik || '-';
                      const dept = r.departemen || (r as any).entitas || 'PTPN 3';
                      const tensi = r.vitals?.tensi || r.tensi || '-';
                      const bmi = r.vitals?.bmi || r.bmi || '-';
                      const gula = r.vitals?.gula_darah || r.gula_darah || '-';
                      const kol = r.vitals?.kolesterol || r.kolesterol || '-';
                      const diag = r.diagnosa || r.keluhan || '-';
                      const status = r.status_kebugaran || r.kesimpulan || 'Fit for Duty';

                      const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-[#f4fbf6]';

                      return (
                        <tr key={r.id || idx} className={`${rowBg} hover:bg-emerald-50/60 transition`}>
                          <td className="px-3 py-2 border border-slate-200 text-center font-semibold text-slate-600">
                            {absoluteIdx}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 text-center font-bold text-slate-900 whitespace-nowrap">
                            {tgl}
                          </td>
                          <td className="px-2.5 py-2 border border-slate-200 text-center text-slate-600 whitespace-nowrap">
                            {jam}
                          </td>
                          <td className="px-4 py-2 border border-slate-200 font-extrabold text-slate-900">
                            {nama}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-700 font-medium">
                            {div}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 text-center font-mono text-slate-600">
                            {noPeg}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 text-center font-mono font-bold text-emerald-800">
                            {nik}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 text-center font-semibold text-slate-800">
                            {dept}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 text-center font-mono text-slate-800">
                            {tensi}
                          </td>
                          <td className="px-2.5 py-2 border border-slate-200 text-center font-mono text-slate-800">
                            {bmi}
                          </td>
                          <td className="px-2.5 py-2 border border-slate-200 text-center font-mono text-slate-800">
                            {gula}
                          </td>
                          <td className="px-2.5 py-2 border border-slate-200 text-center font-mono text-slate-800">
                            {kol}
                          </td>
                          <td className="px-4 py-2 border border-slate-200 font-semibold text-slate-800">
                            {diag}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 text-center font-bold text-emerald-800">
                            {status}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {filteredMcuRecords.length > previewPageSize && (
                <div className="flex items-center justify-between pt-3 text-xs">
                  <span className="text-slate-500 font-medium">
                    Halaman {previewPage} dari {totalPreviewPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      disabled={previewPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                      disabled={previewPage === totalPreviewPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                    >
                      Selanjutnya
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between flex-wrap gap-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Format Berkas: <strong className="text-slate-800">Microsoft Excel Spreadsheet (.xls)</strong> • 2 Halaman Sheet (Data Pasien &amp; Grafik Dashboard)
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || filteredMcuRecords.length === 0}
              className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-black text-xs px-6 py-3 rounded-xl shadow-xs transition cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>{isExporting ? 'Sedang Mengunduh...' : `Unduh File Excel Resmi (${filteredMcuRecords.length} Data)`}</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

