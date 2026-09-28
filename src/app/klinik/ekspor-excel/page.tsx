'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { MiniMcuRecord } from '@/types/mcu';
import ExcelJS from 'exceljs';
import {
  renderKlinikEntitasMonthlyChartPng,
  KlinikEntityBarItem,
  renderExcelStylePieDonutChartPng,
  renderPoliRujukanColumnChartPng,
  renderHorizontalBarChartPng,
} from '@/lib/chartCanvasRenderer';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  Building2,
  HeartPulse,
  Stethoscope,
  Pill,
  Users,
  CheckCircle2,
  ChevronDown,
  ArrowRight,
  Eye,
  BarChart3,
  Activity,
  Layers,
  Sparkles,
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
  { value: 'Kapitasi', label: 'Kapitasi' },
  { value: 'BPJS', label: 'BPJS' },
  { value: 'Magang', label: 'Magang / Intern' },
  { value: 'FFS', label: 'FFS' },
  { value: 'Keluarga', label: 'Keluarga' },
  { value: 'OB', label: 'OB / Outsourcing' },
  { value: 'Penugasan', label: 'Penugasan' },
];

const STANDARD_ENTITIES = [
  { key: 'PTPN 3', name: 'PTPN 3', label: 'PTPN 3 (Holding)', color: '#059669', border: '#047857' },
  { key: 'PTPN 4', name: 'PTPN 4', label: 'PTPN 4 (PalmCo)', color: '#2563eb', border: '#1d4ed8' },
  { key: 'Kapitasi', name: 'Kapitasi', label: 'Kapitasi', color: '#0d9488', border: '#0f766e' },
  { key: 'PTPN 1', name: 'PTPN 1', label: 'PTPN 1 (SuppCo)', color: '#0891b2', border: '#0e7490' },
  { key: 'BPJS', name: 'BPJS', label: 'BPJS', color: '#0284c7', border: '#0369a1' },
  { key: 'Magang', name: 'Magang', label: 'Magang / Intern', color: '#f59e0b', border: '#d97706' },
  { key: 'FFS', name: 'FFS', label: 'FFS', color: '#ea580c', border: '#c2410c' },
  { key: 'Keluarga', name: 'Keluarga', label: 'Keluarga', color: '#e11d48', border: '#be123c' },
  { key: 'OB', name: 'OB', label: 'OB / Outsourcing', color: '#64748b', border: '#475569' },
  { key: 'Penugasan', name: 'Penugasan', label: 'Penugasan', color: '#8b5cf6', border: '#7c3aed' },
];

const KLINIK_8_ENTITIES = [
  { key: 'PTPN 3', name: 'Holding', label: 'Holding', color: '#059669' },
  { key: 'PTPN 4', name: 'PalmCo', label: 'PalmCo', color: '#2563eb' },
  { key: 'PTPN 1', name: 'SuppCo', label: 'SuppCo', color: '#0891b2' },
  { key: 'Magang', name: 'Magang', label: 'Magang', color: '#f59e0b' },
  { key: 'Penugasan', name: 'Penugasan', label: 'Penugasan', color: '#8b5cf6' },
  { key: 'Non-karyawan', name: 'Non - karyawan', label: 'Non - karyawan', color: '#0d9488' },
  { key: 'LPP', name: 'LPP', label: 'LPP', color: '#6366f1' },
  { key: 'Kapitasi', name: 'Kapitasi', label: 'Kapitasi', color: '#0284c7' },
];

const TINDAK_LANJUT_LIST = [
  { value: 'all', label: 'Semua Tindak Lanjut' },
  { value: 'rawat_jalan', label: 'Rawat Jalan & Obat' },
  { value: 'rujukan', label: 'Rujukan Sp. Penyakit Dalam / RS' },
  { value: 'surat_sakit', label: 'Istirahat Sakit (Surat Sakit)' },
  { value: 'konsultasi', label: 'Konsultasi & Edukasi Medis' },
  { value: 'p3k', label: 'Tindakan Darurat / P3K' },
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

function normalizeDiagnosa(raw: string): string {
  if (!raw || raw === '-' || raw === '0') return 'Pemeriksaan Umum & TTV';
  const clean = raw.trim().replace(/^["']|["']$/g, '');
  if (!clean || clean === '-') return 'Pemeriksaan Umum & TTV';
  const u = clean.toUpperCase();
  if (u.includes('FARINGITIS') || u.includes('PHARYNGITIS')) return 'Faringitis Akut / ISPA';
  if (u.includes('ISPA') || u.includes('BATUK') || u.includes('FLU') || u.includes('SALURAN NAPAS')) return 'ISPA / Batuk Pilek';
  if (u.includes('DISPEPSIA') || u.includes('DYSPEPSIA') || u.includes('MAAG') || u.includes('LAMBUNG')) return 'Dispepsia / Gastritis';
  if (u.includes('GASTRITIS')) return 'Gastritis Akut';
  if (u.includes('HIPERTENSI') || u.includes('HYPERTENSION') || u.includes('DARAH TINGGI')) return 'Hipertensi Primer';
  if (u.includes('MYALGIA') || u.includes('MIALGIA') || u.includes('PEGAL') || u.includes('OTOT')) return 'Myalgia / Nyeri Otot';
  if (u.includes('CEPHALGIA') || u.includes('PUSING') || u.includes('SAKIT KEPALA') || u.includes('HEADACHE')) return 'Cephalgia / Sakit Kepala';
  if (u.includes('DIABETES') || u.includes('DM') || u.includes('GULA')) return 'Diabetes Melitus Tipe 2';
  if (u.includes('GANGGUAN REFRAKSI') || u.includes('MATA') || u.includes('RABUN')) return 'Gangguan Refraksi Mata';
  if (u.includes('DERMATITIS') || u.includes('ALERGI') || u.includes('GATAL')) return 'Dermatitis / Alergi Kulit';
  return clean;
}

function matchEntity(recordDept?: string | null, targetEntity: string = 'all', recordDiv?: string | null): boolean {
  if (!targetEntity || targetEntity === 'all') return true;
  const rawD = (recordDept || '').toLowerCase().trim();
  const rawV = (recordDiv || '').toLowerCase().trim();
  const combined = `${rawD} ${rawV}`;
  const target = targetEntity.toLowerCase().trim();

  if (target === 'ptpn 1' || target === 'ptpn1' || target === 'suppco') {
    return combined.includes('ptpn 1') || combined.includes('ptpn1') || combined.includes('suppco');
  }
  if (target === 'ptpn 3' || target === 'ptpn3' || target === 'holding') {
    return combined.includes('ptpn 3') || combined.includes('ptpn3') || combined.includes('holding') || (!combined.includes('ptpn 1') && !combined.includes('ptpn 4') && !combined.includes('kapitasi') && !combined.includes('bpjs') && !combined.includes('magang') && !combined.includes('ffs') && !combined.includes('keluarga') && !combined.includes('ob') && !combined.includes('penugasan') && !combined.includes('lpp') && !combined.includes('non'));
  }
  if (target === 'ptpn 4' || target === 'ptpn4' || target === 'palmco') {
    return combined.includes('ptpn 4') || combined.includes('ptpn4') || combined.includes('palmco');
  }
  if (target === 'kapitasi') return combined.includes('kapitasi');
  if (target === 'bpjs') return combined.includes('bpjs');
  if (target === 'magang') return combined.includes('magang') || combined.includes('intern');
  if (target === 'ffs') return combined.includes('ffs');
  if (target === 'keluarga') return combined.includes('keluarga') || combined.includes('family');
  if (target === 'ob') return combined.includes('ob') || combined.includes('outsourcing') || combined.includes('cleaning');
  if (target === 'penugasan') return combined.includes('penugasan') || combined.includes('tugas');
  if (target === 'lpp') return combined.includes('lpp');
  if (target === 'non-karyawan' || target === 'non - karyawan') return combined.includes('non') || combined.includes('kapitasi') || combined.includes('tamu') || combined.includes('umum');

  return combined.includes(target);
}

function formatObatString(record: MiniMcuRecord): string {
  let list: string[] = [];
  if (Array.isArray(record.obat)) {
    list = record.obat.map((o) => String(o).trim()).filter(Boolean);
  } else if (Array.isArray(record.obat_list)) {
    list = record.obat_list.map((o) => String(o).trim()).filter(Boolean);
  } else if (typeof (record as any).obat === 'string' && (record as any).obat.trim()) {
    list = (record as any).obat.split(/[,|;]/).map((o: string) => o.trim()).filter(Boolean);
  }

  if (list.length === 0) return '-';
  return list.map((item) => {
    // If it already has quantity like (10), keep it
    if (/\(\d+\)/.test(item)) return item;
    return `${item} (10)`;
  }).join('; ');
}

export default function KlinikEksporExcelPage() {
  const { miniMcuRecords, isLoading } = useMcu();
  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const previewPageSize = 8;

  // Available Month List from Database
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    miniMcuRecords.forEach((r) => {
      const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
      if (tgl && tgl.length >= 7) {
        set.add(tgl.substring(0, 7));
      }
    });

    // Fallback if empty
    if (set.size === 0) {
      set.add('2026-08');
      set.add('2026-07');
      set.add('2026-06');
    }

    return Array.from(set).sort();
  }, [miniMcuRecords]);

  // State Rentang Bulan
  const [bulanDari, setBulanDari] = useState<string>('');
  const [bulanSampai, setBulanSampai] = useState<string>('');
  const [filterEntitas, setFilterEntitas] = useState<string>('all');
  const [filterTindakLanjut, setFilterTindakLanjut] = useState<string>('all');
  const [includeKop, setIncludeKop] = useState<boolean>(true);
  const [includeAnalytics, setIncludeAnalytics] = useState<boolean>(true);

  // Initialize defaults on mount
  useEffect(() => {
    setMounted(true);
    if (availableMonths.length > 0) {
      setBulanDari(availableMonths[0]);
      setBulanSampai(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths]);

  // Months in current selected range (Inclusive)
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

  // Filtered Records based on Range and Options
  const filteredRecords = useMemo(() => {
    return miniMcuRecords.filter((r) => {
      const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
      const ym = tgl.length >= 7 ? tgl.substring(0, 7) : '';

      // Month range check
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

      // Entity check
      if (filterEntitas !== 'all' && !matchEntity(r.departemen || (r as any).entitas, filterEntitas, r.divisi)) {
        return false;
      }

      // Tindak Lanjut check
      if (filterTindakLanjut !== 'all') {
        const tl = String(r.tindak_lanjut || r.tindakan_terapi || '').toLowerCase();
        const hasPoli = Boolean(r.nama_poli || r.file_rujukan);
        const hasSurat = Boolean(r.file_surat_sakit || tl.includes('surat sakit') || tl.includes('istirahat'));
        const hasKonsul = Boolean(tl.includes('konsultasi') || tl.includes('edukasi') || r.konsultasi);
        const hasP3k = Boolean(tl.includes('p3k') || tl.includes('darurat') || tl.includes('tindakan'));

        if (filterTindakLanjut === 'rujukan' && !hasPoli && !tl.includes('rujuk')) return false;
        if (filterTindakLanjut === 'surat_sakit' && !hasSurat) return false;
        if (filterTindakLanjut === 'konsultasi' && !hasKonsul) return false;
        if (filterTindakLanjut === 'p3k' && !hasP3k) return false;
        if (filterTindakLanjut === 'rawat_jalan' && (hasPoli || tl.includes('rujuk') || hasSurat || hasKonsul || hasP3k)) return false;
      }

      return true;
    }).sort((a, b) => {
      const tglA = a.tanggal_pemeriksaan || a.tanggal_kunjungan || '';
      const tglB = b.tanggal_pemeriksaan || b.tanggal_kunjungan || '';
      return tglA.localeCompare(tglB);
    });
  }, [miniMcuRecords, bulanDari, bulanSampai, filterEntitas, filterTindakLanjut]);

  // KPI Statistics
  const kpiStats = useMemo(() => {
    const total = filteredRecords.length;
    const rujukanCount = filteredRecords.filter((r) => {
      const tl = String(r.tindak_lanjut || r.tindakan_terapi || '').toLowerCase();
      return r.nama_poli || r.file_rujukan || tl.includes('rujuk');
    }).length;

    const obatCount = filteredRecords.filter((r) => {
      const o = formatObatString(r);
      return o && o !== '-';
    }).length;

    const entitiesSet = new Set<string>();
    filteredRecords.forEach((r) => {
      const d = (r.departemen || (r as any).entitas || 'Holding').trim();
      if (d) entitiesSet.add(d);
    });

    return {
      total,
      rujukanCount,
      obatCount,
      entityCount: entitiesSet.size,
    };
  }, [filteredRecords]);

  // Monthly Analytics Chart Data
  const monthlyChartData = useMemo(() => {
    return selectedRangeMonths.map((ym) => {
      const recs = filteredRecords.filter((r) => {
        const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
        return tgl.startsWith(ym);
      });

      const rowObj: Record<string, any> = {
        ym,
        shortLabel: formatShortMonthYear(ym),
        monthLabel: formatMonthYearLabel(ym),
        total: recs.length,
      };

      STANDARD_ENTITIES.forEach((ent) => {
        const count = recs.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent.key, r.divisi)).length;
        rowObj[ent.key] = count;
      });

      return rowObj;
    });
  }, [selectedRangeMonths, filteredRecords]);

  // Tindak Lanjut Distribution
  const tindakLanjutStats = useMemo(() => {
    const buckets: Record<string, number> = {
      'Rawat Jalan & Obat': 0,
      'Rujukan Sp. Penyakit Dalam / RS': 0,
      'Istirahat Sakit (Surat Sakit)': 0,
      'Konsultasi & Edukasi Medis': 0,
      'Tindakan Darurat / P3K': 0,
    };

    filteredRecords.forEach((r) => {
      const tl = String(r.tindak_lanjut || r.tindakan_terapi || '').toLowerCase();
      if (tl.includes('rujuk') || r.file_rujukan || r.nama_poli) {
        buckets['Rujukan Sp. Penyakit Dalam / RS']++;
      } else if (tl.includes('surat sakit') || tl.includes('istirahat') || r.file_surat_sakit) {
        buckets['Istirahat Sakit (Surat Sakit)']++;
      } else if (tl.includes('konsultasi') || tl.includes('edukasi') || r.konsultasi) {
        buckets['Konsultasi & Edukasi Medis']++;
      } else if (tl.includes('p3k') || tl.includes('darurat') || tl.includes('tindakan')) {
        buckets['Tindakan Darurat / P3K']++;
      } else {
        buckets['Rawat Jalan & Obat']++;
      }
    });

    return Object.entries(buckets).map(([name, count]) => ({
      name,
      count,
      pct: filteredRecords.length > 0 ? Math.round((count / filteredRecords.length) * 100) : 0,
    }));
  }, [filteredRecords]);

  // Top 5 Diagnosa
  const topDiagnosaList = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      const raw = r.diagnosa || r.diagnosa_klinik || r.keluhan || '';
      const diag = normalizeDiagnosa(raw);
      map[diag] = (map[diag] || 0) + 1;
    });

    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredRecords]);

  // Top 5 Obat
  const topObatList = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      let list: string[] = [];
      if (Array.isArray(r.obat)) list = r.obat;
      else if (Array.isArray(r.obat_list)) list = r.obat_list;
      else if (typeof (r as any).obat === 'string' && (r as any).obat.trim()) list = (r as any).obat.split(/[,|;]/);

      list.forEach((item) => {
        const clean = String(item).replace(/\(\d+\)/g, '').trim().toUpperCase();
        if (clean && clean !== '-' && clean !== '0') {
          map[clean] = (map[clean] || 0) + 1;
        }
      });
    });

    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredRecords]);

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

  // Periode Title for Header / Kop Surat
  const periodeText = useMemo(() => {
    if (!bulanDari || !bulanSampai) return 'Semua Periode';
    if (bulanDari === bulanSampai) {
      return `Bulan ${formatMonthYearLabel(bulanDari)}`;
    }
    return `Bulan ${formatMonthYearLabel(bulanDari)} - ${formatMonthYearLabel(bulanSampai)}`;
  }, [bulanDari, bulanSampai]);

  const getGenderStats = (recs: MiniMcuRecord[]) => {
    let laki = 0;
    let perempuan = 0;
    recs.forEach((r: any) => {
      const g = String(r.jenis_kelamin || r.gender || '').toLowerCase();
      if (g.startsWith('l') || g === 'pria' || g === 'laki-laki' || g === 'laki') {
        laki++;
      } else if (g.startsWith('p') || g === 'wanita' || g === 'perempuan') {
        perempuan++;
      } else {
        // Asumsi proporsional
        laki++;
      }
    });
    return { laki, perempuan };
  };

  // Main Export Generator (.xlsx with High-Definition Clustered Bar, Donut, & Poli Rujukan Charts)
  const handleExportExcel = async () => {
    setIsExporting(true);

    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const filename = `Laporan_Rekap_Klinik_PTPN_${timestamp}.xlsx`;

      const totalCount = filteredRecords.length;

      // 1. DATA RUJUKAN POLI SPESIALIS (PERSIS FOTO KLINIK PENGGUNA)
      const STANDARD_POLI_LIST = [
        'Orthopedi & Bedah',
        'Poli Penyakit Dalam',
        'Poli Kulit & Kelamin',
        'Poli Jantung & Kardiovaskular',
        'Poli RUJUKAN POLI FISIOTERAPI & REHAB MEDIK',
        'Poli Saraf / Neurologi',
        'Poli POLI FISIOTERAPI & REHAB MEDIK',
        'Poli Paru & Respirasi',
        'Poli RUJUKAN POLI FISIOTRAFI & REHAB MEDIK',
        'Poli RUJUKAN POLI ENDOKRIN',
        'Poli POLI GIZI',
        'Poli RUJUKAN POLI FISIOTRAPI & REHB MEDIK',
        'Poli POLI HEMATOLOGI',
        'Poli RUJUKAN POLI HEMATOLOGI',
        'Poli Mata',
        'Poli Gigi & Mulut',
        'Poli THT',
        'Poli Kebidanan & Kandungan',
        'Poli Spesialis Lainnya',
      ];

      const poliMap: Record<string, MiniMcuRecord[]> = {};
      STANDARD_POLI_LIST.forEach((p) => { poliMap[p] = []; });

      const rujukanRecs = filteredRecords.filter((r) => {
        const tl = String(r.tindak_lanjut || r.tindakan_terapi || '').toLowerCase();
        return r.file_rujukan || r.nama_poli || (r as any).nama_poli_rujukan || tl.includes('rujuk');
      });

      rujukanRecs.forEach((r) => {
        const raw = ((r as any).nama_poli_rujukan || r.nama_poli || '').trim();
        const rawLower = raw.toLowerCase();
        const tl = (r.tindak_lanjut || '').toLowerCase();
        const terapi = (r.tindakan_terapi || '').toLowerCase();
        const diag = (r.diagnosa || r.diagnosa_klinik || '').toLowerCase();
        const combined = `${rawLower} ${tl} ${terapi} ${diag}`;

        let targetPoli = 'Poli Penyakit Dalam';
        if (combined.includes('ortho') || combined.includes('bedah') || combined.includes('tulang')) targetPoli = 'Orthopedi & Bedah';
        else if (combined.includes('kulit') || combined.includes('kelamin') || combined.includes('derma')) targetPoli = 'Poli Kulit & Kelamin';
        else if (combined.includes('jantung') || combined.includes('kardio')) targetPoli = 'Poli Jantung & Kardiovaskular';
        else if (combined.includes('rujukan poli fisioterapi') || combined.includes('fisioterapi & rehab')) targetPoli = 'Poli RUJUKAN POLI FISIOTERAPI & REHAB MEDIK';
        else if (combined.includes('saraf') || combined.includes('neuro')) targetPoli = 'Poli Saraf / Neurologi';
        else if (combined.includes('poli fisioterapi') || combined.includes('fisioterapi')) targetPoli = 'Poli POLI FISIOTERAPI & REHAB MEDIK';
        else if (combined.includes('paru') || combined.includes('respirasi') || combined.includes('pulmo') || combined.includes('ispa')) targetPoli = 'Poli Paru & Respirasi';
        else if (combined.includes('fisiotrafi') || combined.includes('rehb medik')) targetPoli = 'Poli RUJUKAN POLI FISIOTRAFI & REHAB MEDIK';
        else if (combined.includes('endokrin') || combined.includes('tiroid')) targetPoli = 'Poli RUJUKAN POLI ENDOKRIN';
        else if (combined.includes('gizi') || combined.includes('nutrisi')) targetPoli = 'Poli POLI GIZI';
        else if (combined.includes('hematologi') || combined.includes('darah')) targetPoli = 'Poli POLI HEMATOLOGI';
        else if (combined.includes('mata') || combined.includes('oftalm')) targetPoli = 'Poli Mata';
        else if (combined.includes('gigi') || combined.includes('mulut') || combined.includes('dental')) targetPoli = 'Poli Gigi & Mulut';
        else if (combined.includes('tht') || combined.includes('telinga') || combined.includes('tenggorokan')) targetPoli = 'Poli THT';
        else if (combined.includes('obgyn') || combined.includes('kandungan') || combined.includes('kebidanan') || combined.includes('hamil')) targetPoli = 'Poli Kebidanan & Kandungan';
        else if (combined.includes('dalam') || combined.includes('internis') || combined.includes('gastritis') || combined.includes('diabetes') || combined.includes('hipertensi')) targetPoli = 'Poli Penyakit Dalam';
        else if (raw && !['inhouse clinic', 'rujukan: inhouse clinic', '-', 'null'].includes(rawLower)) {
          targetPoli = raw.startsWith('Poli') ? raw : `Poli ${raw}`;
        }

        if (!poliMap[targetPoli]) poliMap[targetPoli] = [];
        poliMap[targetPoli].push(r);
      });

      const totalRujukanPasien = rujukanRecs.length;
      const poliItemsData = Object.entries(poliMap)
        .map(([name, recs]) => ({
          poli: name,
          count: recs.length,
          pct: totalRujukanPasien > 0 ? Math.round((recs.length / totalRujukanPasien) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // 2. DATA ENTITAS KLINIK (PERSIS FOTO 1 SEBELAH KIRI)
      const activeMonthsList = availableMonths.filter((m) => {
        if (!bulanDari || !bulanSampai) return true;
        return m >= bulanDari && m <= bulanSampai;
      });
      const activeMonths = activeMonthsList.length > 0 ? activeMonthsList : (availableMonths.length > 0 ? availableMonths.slice(-2) : ['2028-06']);

      const MONTH_PALETTE = ['#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#6366f1'];

      const klinikEntityItems: KlinikEntityBarItem[] = KLINIK_8_ENTITIES.map((ent) => {
        const recs = filteredRecords.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent.key, r.divisi));
        const total = recs.length;

        const monthlyCounts = activeMonths.map((ym, idx) => {
          const mRecs = recs.filter((r) => {
            const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
            return tgl.startsWith(ym);
          });
          return {
            monthLabel: formatShortMonthYear(ym),
            count: mRecs.length,
            color: MONTH_PALETTE[idx % MONTH_PALETTE.length],
          };
        });

        return {
          entity: ent.label,
          total,
          monthlyCounts,
        };
      });

      // 4 Mini KPI Kunjungan Entitas
      const totalKunjunganText = `${totalCount} Pasien`;

      const monthTotalsMap: Record<string, number> = {};
      filteredRecords.forEach((r) => {
        const ym = (r.tanggal_pemeriksaan || r.tanggal_kunjungan || '').slice(0, 7);
        if (ym) monthTotalsMap[ym] = (monthTotalsMap[ym] || 0) + 1;
      });
      const sortedMonthsEntries = Object.entries(monthTotalsMap).sort((a, b) => b[1] - a[1]);
      const bulanTertinggiText = sortedMonthsEntries.length > 0
        ? `${formatShortMonthYear(sortedMonthsEntries[0][0])} (${sortedMonthsEntries[0][1]} Pasien)`
        : '-';

      const sortedKlinikEnts = [...klinikEntityItems].sort((a, b) => b.total - a.total);
      const topKlinikEnt = sortedKlinikEnts[0]?.total > 0
        ? `${sortedKlinikEnts[0].entity} (${sortedKlinikEnts[0].total} Pasien)`
        : '-';

      const numMonthsDiv = Math.max(1, activeMonths.length);
      const avgKunjunganBulan = `${Math.round(totalCount / numMonthsDiv)} Pasien`;

      const entityDonutSlices = KLINIK_8_ENTITIES.map((ent) => {
        const count = filteredRecords.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent.key, r.divisi)).length;
        return {
          name: ent.label,
          value: count,
          color: ent.color,
        };
      });

      // 3. DATA TINDAK LANJUT PENGOBATAN (DONUT)
      let countKonsulObat = 0;
      let countKonsulRujukan = 0;
      let countKonsulRujukanObat = 0;
      let countKonsul = 0;
      let countPeriksaKlinik = 0;

      filteredRecords.forEach((r: any) => {
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

      // 4. STATUS KEBUGARAN (DONUT)
      const fitDuty = filteredRecords.filter((r) => {
        const s = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
        return s.includes('fit') && !s.includes('catatan') && !s.includes('tidak') && !s.includes('unfit');
      }).length;
      const fitCatatan = filteredRecords.filter((r) => String(r.status_kebugaran || r.kesimpulan || '').toLowerCase().includes('catatan')).length;
      const tidakFit = filteredRecords.filter((r) => {
        const s = String(r.status_kebugaran || r.kesimpulan || '').toLowerCase();
        return s.includes('tidak') || s.includes('evaluasi') || s.includes('unfit');
      }).length;

      const fitSlices = [
        { name: 'Fit for Duty', value: fitDuty, color: '#16a34a' },
        { name: 'Fit Catatan', value: fitCatatan, color: '#d97706' },
        { name: 'Tidak Fit', value: tidakFit, color: '#e11d48' },
      ];

      // 5. TEKANAN DARAH (DONUT)
      let tensiNormal = 0, tensiPra = 0, tensiHiper = 0;
      filteredRecords.forEach((r) => {
        const sysRaw = r.vitals?.tensi_sistolik || Number(String(r.tensi || '').split('/')[0]);
        const diaRaw = r.vitals?.tensi_diastolik || Number(String(r.tensi || '').split('/')[1]);
        if (!sysRaw && !diaRaw) return;
        const sys = sysRaw || 120, dia = diaRaw || 80;
        if (sys >= 140 || dia >= 90) tensiHiper++;
        else if (sys >= 120 || dia >= 80) tensiPra++;
        else tensiNormal++;
      });
      const tensiSlices = [
        { name: 'Normal (<120/80)', value: tensiNormal, color: '#10b981' },
        { name: 'Pra-Hipertensi', value: tensiPra, color: '#f59e0b' },
        { name: 'Hipertensi (≥140/90)', value: tensiHiper, color: '#f43f5e' },
      ];

      // 6. KOLESTEROL TOTAL (DONUT)
      let kolRendah = 0, kolSedang = 0, kolTinggi = 0;
      filteredRecords.forEach((r) => {
        const k = Number(r.vitals?.kolesterol || r.kolesterol || 0);
        if (isNaN(k) || k <= 0) return;
        if (k >= 240) kolTinggi++;
        else if (k >= 200) kolSedang++;
        else kolRendah++;
      });
      const kolSlices = [
        { name: 'Risiko Rendah (<200)', value: kolRendah, color: '#10b981' },
        { name: 'Risiko Sedang (200-239)', value: kolSedang, color: '#f59e0b' },
        { name: 'Risiko Tinggi (≥240)', value: kolTinggi, color: '#f43f5e' },
      ];

      // 7. GULA DARAH (DONUT)
      let gulaNormal = 0, gulaPre = 0, gulaDm = 0;
      filteredRecords.forEach((r) => {
        const g = Number(r.vitals?.gula_darah || r.gula_darah || 0);
        if (isNaN(g) || g <= 0) return;
        if (g >= 126) gulaDm++;
        else if (g >= 100) gulaPre++;
        else gulaNormal++;
      });
      const gulaSlices = [
        { name: 'Normal (<100)', value: gulaNormal, color: '#10b981' },
        { name: 'Prediabetes (100-125)', value: gulaPre, color: '#f59e0b' },
        { name: 'Diabetes (≥126)', value: gulaDm, color: '#f43f5e' },
      ];

      // 8. BMI (DONUT)
      let bmiUnder = 0, bmiNormal = 0, bmiOver = 0, bmiObese = 0;
      filteredRecords.forEach((r) => {
        let b = Number(r.vitals?.bmi || r.bmi || 0);
        if (!b || b <= 0) {
          const tb = Number(r.tinggi_badan || 0), bb = Number(r.berat_badan || 0);
          if (tb > 0 && bb > 0) b = Number((bb / Math.pow(tb / 100, 2)).toFixed(1));
        }
        if (isNaN(b) || b <= 0) return;
        if (b < 18.5) bmiUnder++;
        else if (b <= 24.9) bmiNormal++;
        else if (b <= 26.9) bmiOver++;
        else bmiObese++;
      });
      const bmiSlices = [
        { name: 'Underweight (<18.5)', value: bmiUnder, color: '#3b82f6' },
        { name: 'Normal (18.5-24.9)', value: bmiNormal, color: '#10b981' },
        { name: 'Overweight (25-26.9)', value: bmiOver, color: '#f59e0b' },
        { name: 'Obesitas (≥27)', value: bmiObese, color: '#f43f5e' },
      ];

      // 9. DIVISI KLINIK
      const divisiMap: Record<string, number> = {};
      filteredRecords.forEach((r) => {
        let d = (r.divisi || '').trim();
        if (!d || d === '-' || d === '0') d = 'Belum Ditentukan';
        divisiMap[d] = (divisiMap[d] || 0) + 1;
      });
      const topDivisiItems = Object.entries(divisiMap)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // 10. TOP DIAGNOSA KLINIK
      const diagnosaMap: Record<string, number> = {};
      filteredRecords.forEach((r) => {
        const raw = r.diagnosa || r.diagnosa_klinik || r.keluhan || '';
        const diag = normalizeDiagnosa(raw);
        diagnosaMap[diag] = (diagnosaMap[diag] || 0) + 1;
      });
      const topDiagnosaItems = Object.entries(diagnosaMap)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // 11. TOP TERAPI OBAT KLINIK
      const obatMap: Record<string, number> = {};
      filteredRecords.forEach((r) => {
        let list: string[] = [];
        if (Array.isArray(r.obat)) list = r.obat;
        else if (Array.isArray(r.obat_list)) list = r.obat_list;
        else if (typeof (r as any).obat === 'string' && (r as any).obat.trim()) list = (r as any).obat.split(/[,|;]/);

        list.forEach((item) => {
          const clean = String(item).replace(/\(\d+\)/g, '').trim().toUpperCase();
          if (clean && clean !== '-' && clean !== '0') {
            obatMap[clean] = (obatMap[clean] || 0) + 1;
          }
        });
      });
      const topObatItems = Object.entries(obatMap)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      // ==========================================
      // RENDER SELURUH GAMBAR GRAFIK ASLI (HD PNG)
      // ==========================================
      // 1. Grafik Batang Distribusi Rujukan Berdasarkan Poli Tujuan (PERSIS FOTO PENGGUNA)
      const poliRujukanChartPng = renderPoliRujukanColumnChartPng(
        poliItemsData,
        '1. Distribusi Rujukan Berdasarkan Poli Tujuan Medis',
        860,
        340
      );

      // 2. Grafik Donut Tindak Lanjut Pengobatan Medis (PERSIS FOTO PENGGUNA)
      const tindakLanjutChartPng = renderExcelStylePieDonutChartPng(
        '2. Tindak Lanjut Pengobatan Pasien',
        tindakLanjutSlices,
        530,
        250,
        true,
        `${totalCount}`
      );

      // 3. Grafik Batang Entitas & Tren Bulanan (PERSIS FOTO 1 SEBELAH KIRI)
      const klinikEntitasChartPng = renderKlinikEntitasMonthlyChartPng(
        klinikEntityItems,
        {
          totalKunjungan: totalKunjunganText,
          bulanTertinggi: bulanTertinggiText,
          entitasTerbanyak: topKlinikEnt,
          rataRataBulan: avgKunjunganBulan,
          periodeBulanText: `${activeMonths.length} Bulan Terpilih`,
        },
        860,
        440
      );

      // 4. Grafik Donut Proporsi Entitas Perusahaan
      const entityDonutChartPng = renderExcelStylePieDonutChartPng(
        '4. Proporsi Pasien Berdasarkan Entitas',
        entityDonutSlices,
        530,
        250,
        true,
        `${totalCount}`
      );

      // 5. Grafik Batang Kunjungan per Divisi / Unit Kerja
      const divisiBarChartPng = renderHorizontalBarChartPng(
        '5. Kunjungan Pasien Berdasarkan Divisi Terbanyak',
        topDivisiItems,
        '#0284c7',
        '#0369a1',
        530,
        270
      );

      // 6. Grafik Donut Status Kebugaran Pasien
      const fitnessChartPng = renderExcelStylePieDonutChartPng(
        '6. Status Kebugaran Pasien (Fitness Status)',
        fitSlices,
        530,
        250,
        true,
        `${totalCount}`
      );

      // 7. Grafik Donut Profil Tekanan Darah (JNC VII)
      const tensiChartPng = renderExcelStylePieDonutChartPng(
        '7. Profil Tekanan Darah Pasien (JNC VII)',
        tensiSlices,
        530,
        250,
        true,
        `${tensiNormal + tensiPra + tensiHiper}`
      );

      // 8. Grafik Donut Profil Kolesterol Total (NCEP ATP III)
      const kolChartPng = renderExcelStylePieDonutChartPng(
        '8. Profil Kolesterol Total Pasien (NCEP ATP III)',
        kolSlices,
        530,
        250,
        true,
        `${kolRendah + kolSedang + kolTinggi}`
      );

      // 9. Grafik Donut Skrining Gula Darah Pasien (ADA)
      const gulaChartPng = renderExcelStylePieDonutChartPng(
        '9. Skrining Kadar Gula Darah Pasien (ADA)',
        gulaSlices,
        530,
        250,
        true,
        `${gulaNormal + gulaPre + gulaDm}`
      );

      // 10. Grafik Donut Indeks Massa Tubuh (BMI WHO)
      const bmiChartPng = renderExcelStylePieDonutChartPng(
        '10. Distribusi Indeks Massa Tubuh (BMI WHO)',
        bmiSlices,
        530,
        250,
        true,
        `${bmiUnder + bmiNormal + bmiOver + bmiObese}`
      );

      // 11. Grafik Batang Top 10 Diagnosa Penyakit Terbanyak
      const diagnosaBarChartPng = renderHorizontalBarChartPng(
        '11. Top 10 Diagnosa Penyakit & Keluhan Klinik',
        topDiagnosaItems,
        '#d97706',
        '#b45309',
        530,
        270
      );

      // 12. Grafik Batang Top 10 Terapi Obat Diresepkan
      const obatBarChartPng = renderHorizontalBarChartPng(
        '12. Top 10 Obat & Terapi Farmasi Paling Sering Diresepkan',
        topObatItems,
        '#4f46e5',
        '#4338ca',
        530,
        270
      );

      // ==========================================
      // MEMBANGUN WORKBOOK EXCEL DENGAN EXCELJS
      // ==========================================
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Inhouse Clinic PTPN';
      workbook.created = new Date();

      // ----------------------------------------------------
      // SHEET 1: DATA PASIEN KLINIK
      // ----------------------------------------------------
      const wsData = workbook.addWorksheet('Data Pasien Klinik', {
        views: [{ state: 'frozen', ySplit: 1 }],
      });

      wsData.columns = [
        { header: 'No', key: 'no', width: 6 },
        { header: 'Tanggal Periksa', key: 'tgl', width: 14 },
        { header: 'Waktu', key: 'jam', width: 10 },
        { header: 'Nama Pasien', key: 'nama', width: 26 },
        { header: 'No Pegawai / NIK', key: 'noPeg', width: 16 },
        { header: 'Divisi / Unit Kerja', key: 'divisi', width: 24 },
        { header: 'Entitas Perusahaan', key: 'dept', width: 18 },
        { header: 'Tekanan Darah', key: 'tensi', width: 14 },
        { header: 'BMI', key: 'bmi', width: 10 },
        { header: 'Gula Darah', key: 'gula', width: 12 },
        { header: 'Kolesterol', key: 'kol', width: 12 },
        { header: 'Keluhan Pasien', key: 'keluhan', width: 26 },
        { header: 'Diagnosa Medis', key: 'diag', width: 26 },
        { header: 'Tindak Lanjut / Terapi', key: 'tindakLanjut', width: 26 },
        { header: 'Obat Diberikan', key: 'obat', width: 24 },
        { header: 'Poli Spesialis Rujukan', key: 'poli', width: 28 },
        { header: 'Status Rujukan', key: 'statusRujukan', width: 16 },
        { header: 'Status Kebugaran', key: 'statusFit', width: 18 },
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
      filteredRecords.forEach((r, idx) => {
        const rawObat = Array.isArray(r.obat) ? r.obat.join(', ') : Array.isArray(r.obat_list) ? r.obat_list.join(', ') : (r as any).obat || '-';
        const rawPoli = (r as any).nama_poli_rujukan || r.nama_poli || '-';
        const hasSurat = r.file_rujukan ? 'Ada Surat' : (rawPoli !== '-' && rawPoli !== 'Inhouse Clinic' ? 'Rujukan Poli' : 'Klinik Mandiri');

        const row = wsData.addRow({
          no: idx + 1,
          tgl: r.tanggal_pemeriksaan || '-',
          jam: r.jam_pemeriksaan || '08:30',
          nama: r.nama_lengkap || r.nama_karyawan || '-',
          noPeg: (r as any).nomor_pegawai || (r as any).no_pegawai || r.nik || '-',
          divisi: r.divisi || '-',
          dept: r.departemen || (r as any).entitas || 'PTPN 3',
          tensi: r.vitals?.tensi || r.tensi || '-',
          bmi: r.vitals?.bmi || r.bmi || '-',
          gula: r.vitals?.gula_darah || r.gula_darah || '-',
          kol: r.vitals?.kolesterol || r.kolesterol || '-',
          keluhan: r.keluhan || '-',
          diag: r.diagnosa || r.diagnosa_klinik || '-',
          tindakLanjut: r.tindak_lanjut || r.tindakan_terapi || 'Pemeriksaan Kesehatan',
          obat: rawObat,
          poli: rawPoli,
          statusRujukan: hasSurat,
          statusFit: r.status_kebugaran || r.kesimpulan || 'Fit for Duty',
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

          if ([4, 6, 12, 13, 14, 15, 16].includes(colNumber)) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
        });
      });

      // ----------------------------------------------------
      // SHEET 2: GRAFIK & DASHBOARD KLINIK
      // ----------------------------------------------------
      const wsCharts = workbook.addWorksheet('Grafik & Dashboard Klinik');

      // Setup Kolom: Sisi Kiri (A-D untuk Tabel Informasi), E (Spacer), F-L (Chart)
      wsCharts.columns = [
        { key: 'c1', width: 34 }, // Kolom A: Kategori / Parameter
        { key: 'c2', width: 16 }, // Kolom B: Jumlah Pasien (Orang)
        { key: 'c3', width: 16 }, // Kolom C: Persentase (%)
        { key: 'c4', width: 16 }, // Kolom D: Target / Keterangan Opsional
        { key: 'c5', width: 4 },  // Kolom E: Spacer pemisah
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
      r1.value = 'REKAPITULASI ANALITIK DASHBOARD INHOUSE CLINIC';
      r1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF005930' } };
      r1.alignment = { horizontal: 'center', vertical: 'middle' };
      wsCharts.getRow(1).height = 25;

      wsCharts.mergeCells('A2:L2');
      const r2 = wsCharts.getCell('A2');
      r2.value = 'PT PERKEBUNAN NUSANTARA • Inhouse Clinic Graha PTPN Lantai 15, Jl. Hr. Rasuna Said Kav B2/1, Jakarta Selatan';
      r2.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF475569' } };
      r2.alignment = { horizontal: 'center', vertical: 'middle' };
      wsCharts.getRow(2).height = 18;

      wsCharts.mergeCells('A3:L3');
      const r3 = wsCharts.getCell('A3');
      r3.value = `Laporan Kunjungan & Pelayanan Kesehatan Inhouse Clinic • ${periodeText}`;
      r3.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F172A' } };
      r3.alignment = { horizontal: 'center', vertical: 'middle' };
      wsCharts.getRow(3).height = 20;

      // 4 KARTU KPI EKSEKUTIF KLINIK (Baris 5 - 7)
      wsCharts.mergeCells('A5:C5');
      wsCharts.getCell('A5').value = 'TOTAL KUNJUNGAN PASIEN';
      wsCharts.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005930' } };
      wsCharts.getCell('A5').font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsCharts.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('D5:F5');
      wsCharts.getCell('D5').value = 'PASIEN LAKI-LAKI';
      wsCharts.getCell('D5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284C7' } };
      wsCharts.getCell('D5').font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsCharts.getCell('D5').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('G5:I5');
      wsCharts.getCell('G5').value = 'PASIEN PEREMPUAN';
      wsCharts.getCell('G5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
      wsCharts.getCell('G5').font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsCharts.getCell('G5').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('J5:L5');
      wsCharts.getCell('J5').value = 'TOTAL RUJUKAN SPESIALIS';
      wsCharts.getCell('J5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
      wsCharts.getCell('J5').font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsCharts.getCell('J5').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.getRow(5).height = 22;

      // Nilai KPI (Baris 6)
      const genderStats = getGenderStats(filteredRecords);

      wsCharts.mergeCells('A6:C6');
      wsCharts.getCell('A6').value = totalCount;
      wsCharts.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      wsCharts.getCell('A6').font = { bold: true, size: 16, color: { argb: 'FF14532D' } };
      wsCharts.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('D6:F6');
      wsCharts.getCell('D6').value = genderStats.laki;
      wsCharts.getCell('D6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
      wsCharts.getCell('D6').font = { bold: true, size: 16, color: { argb: 'FF0369A1' } };
      wsCharts.getCell('D6').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('G6:I6');
      wsCharts.getCell('G6').value = genderStats.perempuan;
      wsCharts.getCell('G6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
      wsCharts.getCell('G6').font = { bold: true, size: 16, color: { argb: 'FFB45309' } };
      wsCharts.getCell('G6').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.mergeCells('J6:L6');
      wsCharts.getCell('J6').value = totalRujukanPasien;
      wsCharts.getCell('J6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
      wsCharts.getCell('J6').font = { bold: true, size: 16, color: { argb: 'FF5B21B6' } };
      wsCharts.getCell('J6').alignment = { horizontal: 'center', vertical: 'middle' };

      wsCharts.getRow(6).height = 28;

      // Subtext KPI (Baris 7)
      wsCharts.mergeCells('A7:C7');
      wsCharts.getCell('A7').value = '100% Pasien Terlayani';
      wsCharts.getCell('A7').font = { size: 9, bold: true, color: { argb: 'FF16A34A' } };
      wsCharts.getCell('A7').alignment = { horizontal: 'center' };

      wsCharts.mergeCells('D7:F7');
      wsCharts.getCell('D7').value = `${totalCount > 0 ? Math.round((genderStats.laki / totalCount) * 100) : 0}% Total Pasien`;
      wsCharts.getCell('D7').font = { size: 9, bold: true, color: { argb: 'FF0284C7' } };
      wsCharts.getCell('D7').alignment = { horizontal: 'center' };

      wsCharts.mergeCells('G7:I7');
      wsCharts.getCell('G7').value = `${totalCount > 0 ? Math.round((genderStats.perempuan / totalCount) * 100) : 0}% Total Pasien`;
      wsCharts.getCell('G7').font = { size: 9, bold: true, color: { argb: 'FFD97706' } };
      wsCharts.getCell('G7').alignment = { horizontal: 'center' };

      wsCharts.mergeCells('J7:L7');
      wsCharts.getCell('J7').value = `${totalCount > 0 ? Math.round((totalRujukanPasien / totalCount) * 100) : 0}% Memerlukan Rujukan`;
      wsCharts.getCell('J7').font = { size: 9, bold: true, color: { argb: 'FF7C3AED' } };
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
        chartCol = 5,
      }: {
        sectionNumber: string;
        sectionTitle: string;
        headers: string[];
        rows: Array<{ label: string; val1: number | string; val2?: number | string; val3?: number | string; val4?: number | string }>;
        totalRow?: { label: string; val1: number | string; val2?: number | string; val3?: number | string; val4?: number | string } | null;
        base64Png: string;
        imgW?: number;
        imgH?: number;
        chartCol?: number;
      }) => {
        const startRow = curRow;

        // 1. Judul Section di Kolom A
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
            fgColor: { argb: 'FFA9D08E' },
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

          const rowVals = [r.label, r.val1, r.val2, r.val3, r.val4].filter((v) => v !== undefined);
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
          const totVals = [totalRow.label, totalRow.val1, totalRow.val2, totalRow.val3, totalRow.val4].filter((v) => v !== undefined);
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
      // 1. SECTION 1: DISTRIBUSI RUJUKAN BERDASARKAN POLI TUJUAN (PERSIS FOTO PENGGUNA)
      // ----------------------------------------------------
      addSideBySideSection({
        sectionNumber: '1',
        sectionTitle: 'Distribusi Rujukan Berdasarkan Poli Tujuan Medis',
        headers: ['Poli Spesialis Rujukan', 'Jumlah Rujukan (Orang)', 'Persentase (%)'],
        rows: poliItemsData.map((p) => ({
          label: p.poli,
          val1: `${p.count} Orang`,
          val2: `${p.pct}%`,
        })),
        totalRow: {
          label: 'TOTAL PASIEN DIRUJUK',
          val1: `${totalRujukanPasien} Orang`,
          val2: '100%',
        },
        base64Png: poliRujukanChartPng,
        imgW: 860,
        imgH: 340,
        chartCol: 5,
      });

      // ----------------------------------------------------
      // 2. SECTION 2: TINDAK LANJUT PENGOBATAN MEDIS (DONAT)
      // ----------------------------------------------------
      const totalTindakLanjut = countKonsulObat + countKonsulRujukan + countKonsulRujukanObat + countKonsul + countPeriksaKlinik;
      addSideBySideSection({
        sectionNumber: '2',
        sectionTitle: 'Tindak Lanjut Pengobatan Pasien',
        headers: ['Kategori Tindak Lanjut', 'Jumlah Pasien (Orang)', 'Persentase (%)'],
        rows: tindakLanjutSlices.map((s) => ({
          label: s.name,
          val1: `${s.value} Orang`,
          val2: totalTindakLanjut > 0 ? `${Math.round((s.value / totalTindakLanjut) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN',
          val1: `${totalTindakLanjut} Orang`,
          val2: '100%',
        },
        base64Png: tindakLanjutChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 3. SECTION 3: JUMLAH KUNJUNGAN BERDASARKAN ENTITAS & TREN BULANAN (PERSIS FOTO 1 SEBELAH KIRI)
      // ----------------------------------------------------
      const klinikEntityTableRows = KLINIK_8_ENTITIES.map((ent) => {
        const recs = filteredRecords.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent.key, r.divisi));
        const gender = getGenderStats(recs);
        const count = recs.length;
        const pct = totalCount > 0 ? `${Math.round((count / totalCount) * 100)}%` : '0%';
        return {
          label: ent.label,
          val1: `${count} Orang`,
          val2: `${gender.laki} Orang`,
          val3: `${gender.perempuan} Orang`,
          val4: pct,
        };
      });

      addSideBySideSection({
        sectionNumber: '3',
        sectionTitle: 'Jumlah Kunjungan Berdasarkan Entitas & Tren Bulanan',
        headers: ['Entitas Perusahaan', 'Jumlah Pasien', 'Laki-laki', 'Perempuan', 'Persentase (%)'],
        rows: klinikEntityTableRows.map((e) => ({
          label: e.label,
          val1: e.val1,
          val2: e.val2,
          val3: e.val3,
          val4: e.val4,
        })),
        totalRow: {
          label: 'TOTAL KUNJUNGAN PASIEN',
          val1: `${totalCount} Orang`,
          val2: `${genderStats.laki} Orang`,
          val3: `${genderStats.perempuan} Orang`,
          val4: '100%',
        },
        base64Png: klinikEntitasChartPng,
        imgW: 860,
        imgH: 440,
        chartCol: 5,
      });

      // ----------------------------------------------------
      // 4. SECTION 4: PROPORSI KUNJUNGAN ENTITAS KLINIK (DONAT)
      // ----------------------------------------------------
      addSideBySideSection({
        sectionNumber: '4',
        sectionTitle: 'Proporsi Kunjungan Pasien Berdasarkan Entitas',
        headers: ['Entitas Perusahaan', 'Jumlah Pasien (Orang)', 'Persentase (%)'],
        rows: entityDonutSlices.map((s) => ({
          label: s.name,
          val1: `${s.value} Orang`,
          val2: totalCount > 0 ? `${Math.round((s.value / totalCount) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN',
          val1: `${totalCount} Orang`,
          val2: '100%',
        },
        base64Png: entityDonutChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 5. SECTION 5: KUNJUNGAN PASIEN BERDASARKAN DIVISI (BATANG)
      // ----------------------------------------------------
      const totalTopDivisiCount = topDivisiItems.reduce((acc, d) => acc + d.value, 0);
      addSideBySideSection({
        sectionNumber: '5',
        sectionTitle: 'Kunjungan Pasien Berdasarkan Divisi Terbanyak',
        headers: ['Divisi / Unit Kerja', 'Jumlah Pasien (Orang)', 'Persentase (%)'],
        rows: topDivisiItems.map((d, idx) => ({
          label: `${idx + 1}. ${d.label}`,
          val1: `${d.value} Orang`,
          val2: totalCount > 0 ? `${Math.round((d.value / totalCount) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN DIVISI TERATAS',
          val1: `${totalTopDivisiCount} Orang`,
          val2: totalCount > 0 ? `${Math.round((totalTopDivisiCount / totalCount) * 100)}%` : '0%',
        },
        base64Png: divisiBarChartPng,
        imgW: 530,
        imgH: 270,
      });

      // ----------------------------------------------------
      // 6. SECTION 6: STATUS KEBUGARAN PASIEN (DONAT)
      // ----------------------------------------------------
      addSideBySideSection({
        sectionNumber: '6',
        sectionTitle: 'Status Kebugaran Pasien (Fitness Status)',
        headers: ['Klasifikasi Kebugaran', 'Jumlah Pasien (Orang)', 'Persentase (%)'],
        rows: fitSlices.map((s) => ({
          label: s.name,
          val1: `${s.value} Orang`,
          val2: totalCount > 0 ? `${Math.round((s.value / totalCount) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN TERDATA',
          val1: `${totalCount} Orang`,
          val2: '100%',
        },
        base64Png: fitnessChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 7. SECTION 7: PROFIL TEKANAN DARAH / TENSI (DONAT)
      // ----------------------------------------------------
      const totalTensi = tensiNormal + tensiPra + tensiHiper;
      addSideBySideSection({
        sectionNumber: '7',
        sectionTitle: 'Profil Tekanan Darah Pasien (JNC VII)',
        headers: ['Kategori Tekanan Darah', 'Jumlah Pasien (Orang)', 'Persentase (%)'],
        rows: tensiSlices.map((s) => ({
          label: s.name,
          val1: `${s.value} Orang`,
          val2: totalTensi > 0 ? `${Math.round((s.value / totalTensi) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN TERUKUR',
          val1: `${totalTensi} Orang`,
          val2: '100%',
        },
        base64Png: tensiChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 8. SECTION 8: PROFIL KOLESTEROL TOTAL (DONAT)
      // ----------------------------------------------------
      const totalKol = kolRendah + kolSedang + kolTinggi;
      addSideBySideSection({
        sectionNumber: '8',
        sectionTitle: 'Profil Kolesterol Total Pasien (NCEP ATP III)',
        headers: ['Kategori Kolesterol Total', 'Jumlah Pasien (Orang)', 'Persentase (%)'],
        rows: kolSlices.map((s) => ({
          label: s.name,
          val1: `${s.value} Orang`,
          val2: totalKol > 0 ? `${Math.round((s.value / totalKol) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN DIPERIKSA',
          val1: `${totalKol} Orang`,
          val2: '100%',
        },
        base64Png: kolChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 9. SECTION 9: SKRINING KADAR GULA DARAH (DONAT)
      // ----------------------------------------------------
      const totalGula = gulaNormal + gulaPre + gulaDm;
      addSideBySideSection({
        sectionNumber: '9',
        sectionTitle: 'Skrining Kadar Gula Darah Pasien (ADA)',
        headers: ['Kategori Kadar Gula Darah', 'Jumlah Pasien (Orang)', 'Persentase (%)'],
        rows: gulaSlices.map((s) => ({
          label: s.name,
          val1: `${s.value} Orang`,
          val2: totalGula > 0 ? `${Math.round((s.value / totalGula) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN DIPERIKSA',
          val1: `${totalGula} Orang`,
          val2: '100%',
        },
        base64Png: gulaChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 10. SECTION 10: INDEKS MASSA TUBUH / BMI (DONAT)
      // ----------------------------------------------------
      const totalBmi = bmiUnder + bmiNormal + bmiOver + bmiObese;
      addSideBySideSection({
        sectionNumber: '10',
        sectionTitle: 'Distribusi Indeks Massa Tubuh (BMI WHO)',
        headers: ['Kategori Indeks Massa Tubuh', 'Jumlah Pasien (Orang)', 'Persentase (%)'],
        rows: bmiSlices.map((s) => ({
          label: s.name,
          val1: `${s.value} Orang`,
          val2: totalBmi > 0 ? `${Math.round((s.value / totalBmi) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL PASIEN TERUKUR',
          val1: `${totalBmi} Orang`,
          val2: '100%',
        },
        base64Png: bmiChartPng,
        imgW: 530,
        imgH: 250,
      });

      // ----------------------------------------------------
      // 11. SECTION 11: TOP 10 DIAGNOSA PENYAKIT (BATANG)
      // ----------------------------------------------------
      const totalDiagCount = topDiagnosaItems.reduce((acc, d) => acc + d.value, 0);
      addSideBySideSection({
        sectionNumber: '11',
        sectionTitle: 'Top 10 Diagnosa Penyakit & Keluhan Klinik',
        headers: ['Diagnosa Medis / Keluhan', 'Jumlah Kasus (Orang)', 'Persentase (%)'],
        rows: topDiagnosaItems.map((d, idx) => ({
          label: `${idx + 1}. ${d.label}`,
          val1: `${d.value} Orang`,
          val2: totalDiagCount > 0 ? `${Math.round((d.value / totalDiagCount) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL KASUS TERATAS',
          val1: `${totalDiagCount} Orang`,
          val2: '100%',
        },
        base64Png: diagnosaBarChartPng,
        imgW: 530,
        imgH: 270,
      });

      // ----------------------------------------------------
      // 12. SECTION 12: TOP 10 TERAPI OBAT FARMASI (BATANG)
      // ----------------------------------------------------
      const totalObatCount = topObatItems.reduce((acc, o) => acc + o.value, 0);
      addSideBySideSection({
        sectionNumber: '12',
        sectionTitle: 'Top 10 Terapi Obat Farmasi Diresepkan',
        headers: ['Nama Obat / Terapi Farmasi', 'Jumlah Resep (Orang)', 'Persentase (%)'],
        rows: topObatItems.map((o, idx) => ({
          label: `${idx + 1}. ${o.label}`,
          val1: `${o.value} Orang`,
          val2: totalObatCount > 0 ? `${Math.round((o.value / totalObatCount) * 100)}%` : '0%',
        })),
        totalRow: {
          label: 'TOTAL RESEP OBAT TERATAS',
          val1: `${totalObatCount} Orang`,
          val2: '100%',
        },
        base64Png: obatBarChartPng,
        imgW: 530,
        imgH: 270,
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
      console.error('Error generating Excel file:', err);
      alert('Terjadi kesalahan saat membuat berkas Excel.');
    } finally {
      setIsExporting(false);
    }
  };

  // Preview Paginated Records
  const previewRecords = useMemo(() => {
    const start = (previewPage - 1) * previewPageSize;
    return filteredRecords.slice(start, start + previewPageSize);
  }, [filteredRecords, previewPage]);

  const totalPreviewPages = Math.ceil(filteredRecords.length / previewPageSize) || 1;

  return (
    <AppLayout role="klinik" active="ekspor">
      <div className="w-full space-y-6 max-w-7xl mx-auto pb-12">
        {/* ==================================================== */}
        {/* HEADER HERO BANNER                                   */}
        {/* ==================================================== */}
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
                    Ekspor Excel Mini-MCU Inhouse Clinic
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Format Resmi PTPN
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  Pilih rentang periode bulan (Dari - Sampai) untuk mengunduh laporan spreadsheet (.xlsx) resmi lengkap dengan kop surat, visualisasi grafik batang rujukan poli, grafik donat analitik, dan tabel rincian data pasien berdampingan.
                </p>
              </div>
            </div>

            {/* Quick Export Button in Header */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || filteredRecords.length === 0}
              className="inline-flex items-center gap-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-extrabold text-sm px-6 py-3.5 rounded-2xl shadow-md hover:shadow-lg transition cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>{isExporting ? 'Memproses Berkas...' : `Unduh Berkas Excel (${filteredRecords.length} Data)`}</span>
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* RANGE SELECTION & FILTER CONTROL PANEL              */}
        {/* ==================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Pengaturan Rentang Bulan &amp; Filter
              </h2>
            </div>
            {/* Quick Preset Buttons */}
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

          {/* Primary Selectors Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Dari Bulan */}
            <div>
              <label htmlFor="select-bulan-dari" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Dari Bulan (Awal)</span>
              </label>
              <div className="relative">
                <select
                  id="select-bulan-dari"
                  value={bulanDari}
                  onChange={(e) => setBulanDari(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-white text-xs font-bold text-slate-900 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer shadow-2xs"
                >
                  {availableMonths.map((ym) => (
                    <option key={ym} value={ym}>
                      {formatMonthYearLabel(ym)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 2. Sampai Bulan */}
            <div>
              <label htmlFor="select-bulan-sampai" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Sampai Bulan (Akhir)</span>
              </label>
              <div className="relative">
                <select
                  id="select-bulan-sampai"
                  value={bulanSampai}
                  onChange={(e) => setBulanSampai(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-white text-xs font-bold text-slate-900 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer shadow-2xs"
                >
                  {availableMonths.map((ym) => (
                    <option key={ym} value={ym}>
                      {formatMonthYearLabel(ym)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 3. Filter Entitas */}
            <div>
              <label htmlFor="select-filter-entitas" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Entitas Perusahaan</span>
              </label>
              <div className="relative">
                <select
                  id="select-filter-entitas"
                  value={filterEntitas}
                  onChange={(e) => setFilterEntitas(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-white text-xs font-bold text-slate-900 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer shadow-2xs"
                >
                  {ENTITAS_LIST.map((ent) => (
                    <option key={ent.value} value={ent.value}>
                      {ent.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 4. Filter Tindak Lanjut */}
            <div>
              <label htmlFor="select-filter-tl" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <HeartPulse className="w-3.5 h-3.5 text-slate-500" />
                <span>Kategori Tindak Lanjut</span>
              </label>
              <div className="relative">
                <select
                  id="select-filter-tl"
                  value={filterTindakLanjut}
                  onChange={(e) => setFilterTindakLanjut(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-white text-xs font-bold text-slate-900 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2.5 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer shadow-2xs"
                >
                  {TINDAK_LANJUT_LIST.map((tl) => (
                    <option key={tl.value} value={tl.value}>
                      {tl.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Export Toggles & Options */}
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
                <span>Sertakan Bagian Matriks &amp; Grafik Ringkasan</span>
              </label>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Periode Terpilih: <span className="font-extrabold text-emerald-800">{periodeText}</span>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* KPI SUMMARY CARDS (LIVE DATA)                        */}
        {/* ==================================================== */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Pasien</span>
              <span className="text-2xl font-black text-slate-900">{kpiStats.total.toLocaleString()} Pasien</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0 shadow-2xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Entitas Terdata</span>
              <span className="text-2xl font-black text-slate-900">{kpiStats.entityCount} Entitas</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center shrink-0 shadow-2xs">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Rujukan RS / Poli</span>
              <span className="text-2xl font-black text-slate-900">{kpiStats.rujukanCount.toLocaleString()} Rujukan</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0 shadow-2xs">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Resep Obat</span>
              <span className="text-2xl font-black text-slate-900">{kpiStats.obatCount.toLocaleString()} Pasien</span>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* VISUAL ANALYTICS CHART PREVIEW (INCLUDED IN EXCEL)   */}
        {/* ==================================================== */}
        {includeAnalytics && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800 shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Pratinjau Matriks &amp; Grafik Kunjungan Bulanan
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    Grafik dan tabel matriks ini akan disertakan pada lembar laporan Excel yang diunduh
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-indigo-50 text-indigo-800 rounded-full border border-indigo-200">
                {selectedRangeMonths.length} Bulan Terpilih
              </span>
            </div>

            {/* Stacked Bar Chart */}
            <div className="h-64 sm:h-72 w-full pt-2">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ top: 20, right: 15, left: -15, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="shortLabel" tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} stroke="#64748b" />
                    <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} stroke="#64748b" allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700">
                              <p className="font-bold text-emerald-300 border-b border-slate-800 pb-1">{data.monthLabel}</p>
                              <p className="font-extrabold text-sm text-white">Total: {data.total} Pasien</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" align="center" iconType="rect" wrapperStyle={{ paddingBottom: '10px', fontSize: '11px', fontWeight: 'bold' }} />
                    {STANDARD_ENTITIES.map((ent, idx) => (
                      <Bar
                        key={ent.name}
                        dataKey={ent.name}
                        name={ent.label}
                        stackId="entitasStack"
                        fill={ent.color}
                        stroke={ent.border}
                        radius={idx === STANDARD_ENTITIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      >
                        {idx === STANDARD_ENTITIES.length - 1 && (
                          <LabelList
                            dataKey="total"
                            position="top"
                            fill="#1e293b"
                            fontSize={11}
                            fontWeight="bold"
                            offset={6}
                            formatter={(val: any) => (val && Number(val) > 0 ? val : '')}
                          />
                        )}
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* LIVE SPREADSHEET TABLE PREVIEW (MATCHING IMAGE)     */}
        {/* ==================================================== */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pratinjau Format Spreadsheet Excel (14 Kolom)
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Tampilan persis tata letak kop surat dan header hijau (#70ad47) sesuai standar rekapitulasi PTPN
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                Menampilkan {Math.min(filteredRecords.length, (previewPage - 1) * previewPageSize + 1)} - {Math.min(filteredRecords.length, previewPage * previewPageSize)} dari {filteredRecords.length} data
              </span>
            </div>
          </div>

          {/* SPREADSHEET CONTAINER WITH OFFICIAL KOP LETTERHEAD */}
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <div className="min-w-[1280px] p-6 space-y-5">
              {/* Kop Surat Header Preview */}
              {includeKop && (
                <div className="text-center space-y-1 pb-4 border-b-2 border-emerald-800">
                  <h3 className="text-xl font-black text-emerald-950 tracking-wider">
                    KLINIK INHOUSE PTPN
                  </h3>
                  <p className="text-xs text-slate-600 font-medium max-w-4xl mx-auto">
                    Gedung Graha PTPN Lantai 15, Jl. Hr. Rasuna Said Kav B2/1, Kuningan Timur, Setiabudi, RT.7/RW.4, Kuningan Tim., Kecamatan Setiabudi, Kota Jakarta Selatan, Daerah Khusus Ibukota Jakarta
                  </p>
                  <p className="text-[11px] text-slate-500 font-semibold">
                    Telp: (021) 522-8888 | Layanan Kesehatan &amp; Mini-MCU Inhouse Clinic
                  </p>
                  <p className="text-sm font-extrabold text-slate-900 pt-1">
                    {periodeText}
                  </p>
                  <p className="text-xs font-black text-emerald-800 tracking-widest uppercase">
                    PERKEBUNAN NUSANTARA
                  </p>
                </div>
              )}

              {/* Styled 14-Column Table */}
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#70ad47] text-white font-extrabold text-center border border-[#548235]">
                    <th className="px-3 py-2.5 border border-[#548235] w-10">No</th>
                    <th className="px-3 py-2.5 border border-[#548235] whitespace-nowrap">Tanggal Kunjungan</th>
                    <th className="px-2.5 py-2.5 border border-[#548235] whitespace-nowrap">Waktu Kunjungan</th>
                    <th className="px-4 py-2.5 border border-[#548235] text-left min-w-[160px]">Nama Pasien</th>
                    <th className="px-3 py-2.5 border border-[#548235] text-left min-w-[130px]">Divisi</th>
                    <th className="px-3 py-2.5 border border-[#548235] whitespace-nowrap">Nomor Pegawai</th>
                    <th className="px-3 py-2.5 border border-[#548235] whitespace-nowrap">NIK</th>
                    <th className="px-3 py-2.5 border border-[#548235] whitespace-nowrap">Departemen</th>
                    <th className="px-4 py-2.5 border border-[#548235] text-left min-w-[160px]">Diagnosa</th>
                    <th className="px-3 py-2.5 border border-[#548235] text-left min-w-[140px]">Tindakan</th>
                    <th className="px-3 py-2.5 border border-[#548235] text-left min-w-[130px]">Poli Rujukan</th>
                    <th className="px-3 py-2.5 border border-[#548235] text-left min-w-[120px]">Lokasi Rujukan</th>
                    <th className="px-4 py-2.5 border border-[#548235] text-left min-w-[180px]">Nama Obat</th>
                    <th className="px-3 py-2.5 border border-[#548235] whitespace-nowrap">Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={14} className="py-12 text-center text-slate-400 font-medium">
                        Tidak ada data pasien yang sesuai dengan rentang bulan dan filter terpilih.
                      </td>
                    </tr>
                  ) : (
                    previewRecords.map((r, idx) => {
                      const absoluteIdx = (previewPage - 1) * previewPageSize + idx + 1;
                      const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '-';
                      const jam = r.jam_pemeriksaan || (r as any).waktu_kunjungan || (r as any).jam || '08:30';
                      const nama = r.nama_lengkap || r.nama_karyawan || '-';
                      const div = r.divisi || '-';
                      const noPeg = (r as any).nomor_pegawai || (r as any).no_pegawai || (r.nik ? `EMP-${r.nik.slice(-4)}` : '-');
                      const nik = r.nik || '-';
                      const dept = r.departemen || (r as any).entitas || 'Holding';
                      const diag = r.diagnosa || r.diagnosa_klinik || r.keluhan || '-';
                      const tindakan = r.tindak_lanjut || r.tindakan_terapi || 'KONSULTASI + OBAT';
                      const poli = r.nama_poli || (r as any).nama_poli_rujukan || (tindakan.toLowerCase().includes('rujuk') ? 'Poli Penyakit Dalam' : '-');
                      const rs = r.nama_rs || (r as any).lokasi_rujukan || (poli !== '-' ? 'Rumah Sakit Rekanan' : '-');
                      const obat = formatObatString(r);
                      const status = r.status_kebugaran || r.kesimpulan || 'Fit';

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
                          <td className="px-4 py-2 border border-slate-200 font-semibold text-slate-800">
                            {diag}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 font-extrabold text-emerald-800">
                            {tindakan}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 font-semibold text-sky-700">
                            {poli}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 text-slate-600">
                            {rs}
                          </td>
                          <td className="px-4 py-2 border border-slate-200 text-cyan-800 font-medium text-[11px]">
                            {obat}
                          </td>
                          <td className="px-3 py-2 border border-slate-200 text-center font-semibold text-slate-700">
                            {status}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {filteredRecords.length > previewPageSize && (
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

          {/* Bottom Primary Download Action Bar */}
          <div className="pt-4 flex items-center justify-between flex-wrap gap-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Format Berkas: <strong className="text-slate-800">Microsoft Excel Spreadsheet Modern (.xlsx)</strong> • Grafik Batang, Donat, &amp; Tabel Rincian Berdampingan
            </div>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={isExporting || filteredRecords.length === 0}
              className="inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 disabled:bg-slate-300 text-white font-black text-xs px-6 py-3 rounded-xl shadow-xs transition cursor-pointer active:scale-98"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>{isExporting ? 'Sedang Mengunduh...' : `Unduh File Excel Resmi (${filteredRecords.length} Data)`}</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
