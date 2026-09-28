'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { McuRecord, MiniMcuRecord } from '@/types/mcu';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LabelList,
} from 'recharts';
import {
  Search,
  FileSpreadsheet,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BarChart3,
  HeartPulse,
  Activity,
  FileText,
  Building2,
  Info,
  Calendar,
  Layers,
  ChevronDown,
  TrendingUp,
  AlignLeft,
  X,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { exportDashboardToExcel, exportSingleChartExcel, ExportSingleChartParams } from '@/lib/exportDashboardExcel';
import { AiAnalysisCard } from '@/components/mcu/AiAnalysisCard';
import { ChartAiInsight } from '@/components/mcu/ChartAiInsight';
import { ChartAnalysisParams } from '@/services/aiService';
import { normalizeDivisiName, isSameDivisi, MASTER_DIVISI_LIST } from '@/lib/divisiMaster';
import {
  getKaryawanUniqueKey,
  getUniqueEmployeeRecords,
  getRecordFitnessStatus,
  hasMcuExamination,
  cleanDivisiName,
  matchDivisi,
  matchAgeBracket,
  getTensiStatus,
  getKolesterolStatus,
  getGulaDarahStatus,
  getBmiStatus,
  AGE_BRACKETS,
} from '@/lib/mcuHelpers';

const defaultEntitiesMap: Record<string, string> = {
  'PTPN 1': 'PTPN 1 / SuppCo',
  'PTPN 3': 'PTPN 3 / Holding',
  'PTPN 4': 'PTPN 4 / PalmCo',
};

// Custom Pie Label Renderer with number only (no percentage)
const renderCustomizedPieLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  value,
}: any) => {
  if (!value || value === 0) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-[10px] sm:text-xs font-black drop-shadow-md"
    >
      {value}
    </text>
  );
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { mcuRecords, miniMcuRecords } = useMcu();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.title = 'Dashboard Analitik & Overview Admin - Layanan Kesehatan PTPN';
    setMounted(true);
  }, []);

  // Global Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBulan, setSelectedBulan] = useState('all');
  const [isExportingDashboard, setIsExportingDashboard] = useState(false);

  // Handler Download Excel Langsung dari Dashboard (Data Pasien + Grafik Batang & Donat HD)
  const handleQuickExportExcel = async () => {
    if (isExportingDashboard) return;
    setIsExportingDashboard(true);
    try {
      await exportDashboardToExcel({
        mcuRecords,
        miniMcuRecords,
        selectedBulan,
        searchTerm,
      });
    } catch (err) {
      console.error('Gagal mengekspor data dashboard ke Excel:', err);
      alert('Terjadi kesalahan saat mengunduh data dan grafik dashboard ke Excel.');
    } finally {
      setIsExportingDashboard(false);
    }
  };

  // State & Handler Ekspor Masing-Masing Grafik dalam 1 Sheet Excel
  const [exportingChartId, setExportingChartId] = useState<string | null>(null);

  const handleExportSingleChart = async (chartType: ExportSingleChartParams['chartType']) => {
    if (exportingChartId !== null) return;
    setExportingChartId(chartType);
    try {
      await exportSingleChartExcel({
        chartType,
        mcuRecords,
        miniMcuRecords,
        selectedBulan,
        searchTerm,
        filterKategoriEntitas,
        filterEntitasDivisi,
        filterLimitDivisi,
        filterEntitasMcuType,
        filterDivisiMcuType,
        filterEntitasStatusFit,
        filterDivisiStatusFit,
        filterEntitasDiag,
        filterLimitDiag,
        searchNamaDiag,
        filterEntitasUmur,
        filterDivisiUmur,
        filterEntitasTensi,
        filterEntitasKolesterol,
        filterEntitasGula,
        filterEntitasBmi,
      });
    } catch (err) {
      console.error('Gagal mengekspor grafik:', err);
      alert('Terjadi kesalahan saat mengekspor grafik ke Excel.');
    } finally {
      setExportingChartId(null);
    }
  };

  // Individual Chart Filter States
  const [filterKategoriEntitas, setFilterKategoriEntitas] = useState('mcu');
  const [filterEntitasDivisi, setFilterEntitasDivisi] = useState('all');
  const [filterLimitDivisi, setFilterLimitDivisi] = useState<'top10' | 'top15' | 'top25' | 'all'>('top15');
  const [searchDivisiQuery, setSearchDivisiQuery] = useState('');
  const [sortDivisiOrder, setSortDivisiOrder] = useState<'kunjungan' | 'karyawan' | 'rasio' | 'desc' | 'asc' | 'alpha'>('karyawan');
  const [viewModeDivisi, setViewModeDivisi] = useState<'horizontal' | 'vertical'>('horizontal');
  const [filterEntitasMcuType, setFilterEntitasMcuType] = useState('all');
  const [filterDivisiMcuType, setFilterDivisiMcuType] = useState('all');
  const [filterEntitasStatusFit, setFilterEntitasStatusFit] = useState('all');
  const [filterDivisiStatusFit, setFilterDivisiStatusFit] = useState('all');

  // Disease Filters
  const [searchNamaDiag, setSearchNamaDiag] = useState('');
  const [filterLimitDiag, setFilterLimitDiag] = useState('top5');
  const [filterEntitasDiag, setFilterEntitasDiag] = useState('all');
  const [filterDivisiDiag, setFilterDivisiDiag] = useState('all');

  // Demographics Filters
  const [filterEntitasUmur, setFilterEntitasUmur] = useState('all');
  const [filterDivisiUmur, setFilterDivisiUmur] = useState('all');
  const [filterEntitasTensi, setFilterEntitasTensi] = useState('all');
  const [filterDivisiTensi, setFilterDivisiTensi] = useState('all');
  const [filterEntitasKolesterol, setFilterEntitasKolesterol] = useState('all');
  const [filterDivisiKolesterol, setFilterDivisiKolesterol] = useState('all');
  const [filterEntitasGula, setFilterEntitasGula] = useState('all');
  const [filterDivisiGula, setFilterDivisiGula] = useState('all');
  const [filterEntitasBmi, setFilterEntitasBmi] = useState('all');
  const [filterDivisiBmi, setFilterDivisiBmi] = useState('all');

  // Helper untuk mencocokkan Entitas secara fleksibel (misal 'PTPN 3' cocok dengan 'PTPN 3 / Holding', 'PTPN 3', dll)
  const matchEntity = (departemen: string | undefined | null, targetEntity: string) => {
    if (targetEntity === 'all') return true;
    if (!departemen) return false;
    const d = departemen.toLowerCase().trim();
    const t = targetEntity.toLowerCase().trim();
    if (t === 'ptpn 1') return d.includes('ptpn 1') || d.includes('ptpn1') || d.includes('suppco') || d === '1' || d === 'i';
    if (t === 'ptpn 3') return d.includes('ptpn 3') || d.includes('ptpn3') || d.includes('holding') || d === '3' || d === 'iii';
    if (t === 'ptpn 4') return d.includes('ptpn 4') || d.includes('ptpn4') || d.includes('palmco') || d === '4' || d === 'iv';
    return d === t || d.includes(t);
  };

  // Filtered records by Global Period / Month and Search
  const filteredMcuRecords = useMemo(() => {
    return mcuRecords.filter((rec) => {
      const nama = rec.nama_lengkap || rec.nama_karyawan || '';
      const nik = rec.nik || '';
      const matchSearch =
        !searchTerm.trim() ||
        nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nik.toLowerCase().includes(searchTerm.toLowerCase());

      const tgl = rec.tanggal_pemeriksaan || '';
      let matchMonth = true;
      if (selectedBulan === 'current') {
        const cur = new Date().toISOString().substring(0, 7);
        matchMonth = tgl.startsWith(cur);
      } else if (selectedBulan !== 'all' && tgl) {
        matchMonth = tgl.includes(selectedBulan);
      }

      return matchSearch && matchMonth;
    });
  }, [mcuRecords, searchTerm, selectedBulan]);

  const filteredMiniMcuRecords = useMemo(() => {
    return miniMcuRecords.filter((rec) => {
      const nama = rec.nama_lengkap || rec.nama_karyawan || '';
      const nik = rec.nik || '';
      const matchSearch =
        !searchTerm.trim() ||
        nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        nik.toLowerCase().includes(searchTerm.toLowerCase());

      const tgl = rec.tanggal_pemeriksaan || (rec as any).tanggal_kunjungan || '';
      let matchMonth = true;
      if (selectedBulan === 'current') {
        const cur = new Date().toISOString().substring(0, 7);
        matchMonth = tgl.startsWith(cur);
      } else if (selectedBulan !== 'all' && tgl) {
        matchMonth = tgl.includes(selectedBulan);
      }

      return matchSearch && matchMonth;
    });
  }, [miniMcuRecords, searchTerm, selectedBulan]);

  // List of all unique divisions from actual data
  const availableDivisiList = useMemo(() => {
    const list = new Set<string>();
    filteredMcuRecords.forEach((r) => {
      const norm = normalizeDivisiName(r.divisi);
      if (norm) list.add(norm);
      else if (r.divisi && r.divisi !== '-' && r.divisi !== '0') list.add(r.divisi);
    });
    filteredMiniMcuRecords.forEach((r) => {
      const norm = normalizeDivisiName(r.divisi);
      if (norm) list.add(norm);
      else if (r.divisi && r.divisi !== '-' && r.divisi !== '0') list.add(r.divisi);
    });
    if (list.size === 0) {
      return MASTER_DIVISI_LIST.map((m) => m.nama);
    }
    return Array.from(list).sort((a, b) => a.localeCompare(b));
  }, [filteredMcuRecords, filteredMiniMcuRecords]);

  // 1. TOP 5 SUMMARY METRICS (100% konsisten dengan Rekapan MCU)
  const distinctAdminRecords = useMemo(() => {
    return selectedBulan === 'all' ? getUniqueEmployeeRecords(filteredMcuRecords) : filteredMcuRecords;
  }, [filteredMcuRecords, selectedBulan]);

  // Inhouse Clinic selalu berdasarkan JUMLAH KUNJUNGAN (seluruh baris rekaman, 700-an data)
  const distinctMiniRecords = useMemo(() => {
    return filteredMiniMcuRecords;
  }, [filteredMiniMcuRecords]);

  const totalAdminMcu = distinctAdminRecords.length;
  const totalMiniMcu = filteredMiniMcuRecords.length;
  const allCurrentRecords = [...distinctAdminRecords, ...filteredMiniMcuRecords];
  const totalKaryawanCount = allCurrentRecords.length;

  const fitSehatCount = useMemo(() => {
    return distinctAdminRecords.filter((r) => getRecordFitnessStatus(r) === 'fit_sehat').length;
  }, [distinctAdminRecords]);

  const fitCatatanCount = useMemo(() => {
    return distinctAdminRecords.filter((r) => getRecordFitnessStatus(r) === 'fit_dengan_catatan').length;
  }, [distinctAdminRecords]);

  const followUpCount = useMemo(() => {
    return distinctAdminRecords.filter((r) => getRecordFitnessStatus(r) === 'sementara_tidak_fit').length;
  }, [distinctAdminRecords]);

  // 2. CHART 1: JUMLAH KARYAWAN PER ENTITAS (Jumlah Karyawan vs Sudah Melaksanakan MCU)
  const chartEntitasData = useMemo(() => {
    const entities = ['PTPN 1', 'PTPN 3', 'PTPN 4'];
    return entities.map((ent) => {
      const recsMcu = filteredMcuRecords.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent));
      const recsMini = filteredMiniMcuRecords.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent));

      // Dataset yang dievaluasi berdasarkan filter kategori yang dipilih
      const allEntRecords =
        filterKategoriEntitas === 'klinik'
          ? recsMini
          : filterKategoriEntitas === 'mcu'
          ? recsMcu
          : [...recsMcu, ...recsMini];

      const distinctEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(allEntRecords) : allEntRecords;
      const totalKaryawan = distinctEmployees.length;

      return {
        entitas: ent,
        total_karyawan: totalKaryawan,
        sudah_mcu: totalKaryawan,
      };
    });
  }, [filteredMcuRecords, filteredMiniMcuRecords, filterKategoriEntitas, selectedBulan]);

  // 3. CHART 2: JUMLAH KARYAWAN PER DIVISI (Data MCU Hasil Pemeriksaan)
  const rawDivisiList = useMemo(() => {
    let records = filteredMcuRecords;
    if (filterEntitasDivisi !== 'all') {
      records = records.filter((r) => matchEntity(r.departemen || (r as any).entitas, filterEntitasDivisi));
    }

    const uniqueRecords = selectedBulan === 'all' ? getUniqueEmployeeRecords(records) : records;

    const divEmployees: Record<string, typeof uniqueRecords> = {};

    uniqueRecords.forEach((r) => {
      const div = cleanDivisiName(r.divisi);
      if (!div || div === 'Belum Ditentukan') return;
      if (!divEmployees[div]) divEmployees[div] = [];
      divEmployees[div].push(r);
    });

    return Object.entries(divEmployees)
      .map(([divisi, emps]) => {
        const total_karyawan = emps.length;
        const sudah_mcu = total_karyawan;
        const belum_mcu = 0;
        const rasioKunjungan = 100;

        return {
          divisi: divisi.length > 24 ? `${divisi.substring(0, 22)}...` : divisi,
          fullDivisi: divisi,
          name: divisi,
          count: total_karyawan,
          total_karyawan,
          kunjungan: sudah_mcu,
          sudah_mcu,
          belum_mcu,
          belum_kunjungan: belum_mcu,
          rasioKunjungan,
          records: emps,
        };
      })
      .filter((item) => item.total_karyawan > 0);
  }, [filteredMcuRecords, filterEntitasDivisi, selectedBulan]);

  const divisiStats = useMemo(() => {
    const totalDivisi = rawDivisiList.length;
    const totalKaryawanInDivisi = rawDivisiList.reduce((acc, curr) => acc + curr.total_karyawan, 0);
    const totalSudahMcu = rawDivisiList.reduce((acc, curr) => acc + curr.sudah_mcu, 0);
    const totalBelumMcu = rawDivisiList.reduce((acc, curr) => acc + curr.belum_mcu, 0);

    const sortedByKaryawan = [...rawDivisiList].sort((a, b) => b.total_karyawan - a.total_karyawan);
    const topDivisi = sortedByKaryawan[0] || null;
    const avgPerDivisi = totalDivisi > 0 ? Math.round(totalKaryawanInDivisi / totalDivisi).toString() : '0';

    return { totalDivisi, totalKaryawanInDivisi, totalSudahMcu, totalBelumMcu, topDivisi, avgPerDivisi };
  }, [rawDivisiList]);

  const chartDivisiData = useMemo(() => {
    if (rawDivisiList.length === 0) {
      return [
        {
          divisi: 'Belum Ada Data Divisi',
          fullDivisi: 'Belum Ada Data Divisi',
          name: 'Belum Ada Data Divisi',
          count: 0,
          total_karyawan: 0,
          kunjungan: 0,
          sudah_mcu: 0,
          belum_mcu: 0,
          belum_kunjungan: 0,
          rasioKunjungan: 0,
          records: [],
        },
      ];
    }

    let filtered = rawDivisiList;
    if (searchDivisiQuery.trim()) {
      const q = searchDivisiQuery.toLowerCase().trim();
      filtered = filtered.filter((d) => d.fullDivisi.toLowerCase().includes(q));
    }

    let sorted = [...filtered];
    if (sortDivisiOrder === 'karyawan' || sortDivisiOrder === 'desc') {
      sorted.sort((a, b) => b.total_karyawan - a.total_karyawan);
    } else if (sortDivisiOrder === 'kunjungan') {
      sorted.sort((a, b) => b.sudah_mcu - a.sudah_mcu);
    } else if (sortDivisiOrder === 'rasio') {
      sorted.sort((a, b) => b.rasioKunjungan - a.rasioKunjungan);
    } else if (sortDivisiOrder === 'asc') {
      sorted.sort((a, b) => a.total_karyawan - b.total_karyawan);
    } else if (sortDivisiOrder === 'alpha') {
      sorted.sort((a, b) => a.fullDivisi.localeCompare(b.fullDivisi));
    }

    if (filterLimitDivisi === 'top10') {
      sorted = sorted.slice(0, 10);
    } else if (filterLimitDivisi === 'top15') {
      sorted = sorted.slice(0, 15);
    } else if (filterLimitDivisi === 'top25') {
      sorted = sorted.slice(0, 25);
    }

    return sorted;
  }, [rawDivisiList, searchDivisiQuery, sortDivisiOrder, filterLimitDivisi]);

  // Label renderers untuk Chart Divisi (Horizontal & Vertikal) agar angka jumlah orang muncul jelas di ujung batang
  const renderDivisiSudahMcuHLabel = (props: any) => {
    const { x, y, width, height, value, index } = props;
    const item = typeof index === 'number' ? chartDivisiData[index] : null;
    const numSudah = Number(value !== undefined ? value : (item ? item.sudah_mcu : 0));
    if (!numSudah || numSudah <= 0) return null;

    const belumMcu = item ? Number(item.belum_mcu || 0) : 0;

    // Jika tidak ada belum_mcu (semua sudah MCU), tampilkan angka di sebelah kanan ujung batang hijau
    if (belumMcu === 0) {
      return (
        <text
          x={x + width + 8}
          y={y + height / 2}
          fill="#047857"
          textAnchor="start"
          dominantBaseline="central"
          fontSize={11}
          fontWeight="bold"
          className="font-bold fill-emerald-700"
        >
          {numSudah}
        </text>
      );
    }

    // Jika ada belum_mcu dan batang hijau cukup lebar, tampilkan angka sudah_mcu di dalam batang hijau
    if (width >= 24) {
      return (
        <text
          x={x + width / 2}
          y={y + height / 2}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontWeight="bold"
          className="font-bold fill-white"
        >
          {numSudah}
        </text>
      );
    }

    return null;
  };

  const renderDivisiBelumMcuHLabel = (props: any) => {
    const { x, y, width, height, value, index } = props;
    const item = typeof index === 'number' ? chartDivisiData[index] : null;
    const belumMcu = Number(value !== undefined ? value : (item ? item.belum_mcu : 0));
    if (!belumMcu || belumMcu <= 0) return null;

    const total = item ? Number(item.total_karyawan || (item.sudah_mcu + belumMcu)) : belumMcu;
    if (total <= 0) return null;

    // Batang belum_mcu berada di ujung terluar, tampilkan total karyawan di sebelah kanan
    return (
      <text
        x={x + width + 8}
        y={y + height / 2}
        fill="#047857"
        textAnchor="start"
        dominantBaseline="central"
        fontSize={11}
        fontWeight="bold"
        className="font-bold fill-emerald-700"
      >
        {total}
      </text>
    );
  };

  const renderDivisiSudahMcuVLabel = (props: any) => {
    const { x, y, width, height, value, index } = props;
    const item = typeof index === 'number' ? chartDivisiData[index] : null;
    const numSudah = Number(value !== undefined ? value : (item ? item.sudah_mcu : 0));
    if (!numSudah || numSudah <= 0) return null;

    const belumMcu = item ? Number(item.belum_mcu || 0) : 0;

    // Jika tidak ada belum_mcu, tampilkan di atas batang hijau
    if (belumMcu === 0) {
      return (
        <text
          x={x + width / 2}
          y={y - 6}
          fill="#047857"
          textAnchor="middle"
          dominantBaseline="auto"
          fontSize={11}
          fontWeight="bold"
          className="font-bold fill-emerald-700"
        >
          {numSudah}
        </text>
      );
    }

    if (height >= 20) {
      return (
        <text
          x={x + width / 2}
          y={y + height / 2}
          fill="#ffffff"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={10}
          fontWeight="bold"
          className="font-bold fill-white"
        >
          {numSudah}
        </text>
      );
    }

    return null;
  };

  const renderDivisiBelumMcuVLabel = (props: any) => {
    const { x, y, width, height, value, index } = props;
    const item = typeof index === 'number' ? chartDivisiData[index] : null;
    const belumMcu = Number(value !== undefined ? value : (item ? item.belum_mcu : 0));
    if (!belumMcu || belumMcu <= 0) return null;

    const total = item ? Number(item.total_karyawan || (item.sudah_mcu + belumMcu)) : belumMcu;
    if (total <= 0) return null;

    return (
      <text
        x={x + width / 2}
        y={y - 6}
        fill="#047857"
        textAnchor="middle"
        dominantBaseline="auto"
        fontSize={11}
        fontWeight="bold"
        className="font-bold fill-emerald-700"
      >
        {total}
      </text>
    );
  };

  // 4. CHART 3: PERBANDINGAN MCU ADMIN VS INHOUSE CLINIC (Doughnut - Peserta MCU Unik vs Total Kunjungan Klinik)
  const chartMcuTypeData = useMemo(() => {
    let filteredAdmin = filteredMcuRecords;
    let filteredKlinik = filteredMiniMcuRecords;

    if (filterEntitasMcuType !== 'all') {
      filteredAdmin = filteredAdmin.filter((r) => matchEntity(r.departemen, filterEntitasMcuType));
      filteredKlinik = filteredKlinik.filter((r) => matchEntity(r.departemen, filterEntitasMcuType));
    }
    if (filterDivisiMcuType !== 'all') {
      filteredAdmin = filteredAdmin.filter((r) => isSameDivisi(r.divisi, filterDivisiMcuType));
      filteredKlinik = filteredKlinik.filter((r) => isSameDivisi(r.divisi, filterDivisiMcuType));
    }

    // MCU Admin dihitung per karyawan unik (jika pemeriksaan 2x tetap dihitung 1 sesuai nama/NIK -> 282)
    const uniqueAdmin = getUniqueEmployeeRecords(filteredAdmin);
    // Inhouse Clinic tetap jumlah seluruh kunjungan pelayanan
    const totalKlinik = filteredKlinik.length;

    return [
      { name: 'MCU Admin (Berkala)', value: uniqueAdmin.length, color: '#2563eb' },
      { name: 'Inhouse Clinic (Mandiri)', value: totalKlinik, color: '#0d9488' },
    ];
  }, [filteredMcuRecords, filteredMiniMcuRecords, filterEntitasMcuType, filterDivisiMcuType]);

  // 5. CHART 4: STATUS KEBUGARAN (MCU Admin vs Inhouse Clinic - Per Orang / Karyawan Unik)
  const statusFitAdminData = useMemo(() => {
    let recs = filteredMcuRecords;
    if (filterEntitasStatusFit !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasStatusFit));
    if (filterDivisiStatusFit !== 'all') recs = recs.filter((r) => matchDivisi(r.divisi, filterDivisiStatusFit));

    const uniqueEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(recs) : recs;

    return [
      { name: 'Fit for Duty', value: uniqueEmployees.filter((r) => getRecordFitnessStatus(r) === 'fit_sehat').length, color: '#16a34a' },
      { name: 'Fit dengan Catatan', value: uniqueEmployees.filter((r) => getRecordFitnessStatus(r) === 'fit_dengan_catatan').length, color: '#d97706' },
      { name: 'Sementara Tidak Fit', value: uniqueEmployees.filter((r) => getRecordFitnessStatus(r) === 'sementara_tidak_fit').length, color: '#e11d48' },
    ];
  }, [filteredMcuRecords, filterEntitasStatusFit, filterDivisiStatusFit, selectedBulan]);

  const statusFitKlinikData = useMemo(() => {
    let recs = filteredMiniMcuRecords;
    if (filterEntitasStatusFit !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasStatusFit));
    if (filterDivisiStatusFit !== 'all') recs = recs.filter((r) => matchDivisi(r.divisi, filterDivisiStatusFit));

    const uniqueEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(recs) : recs;

    return [
      { name: 'Fit for Duty', value: uniqueEmployees.filter((r) => getRecordFitnessStatus(r) === 'fit_sehat').length, color: '#059669' },
      { name: 'Fit dengan Catatan', value: uniqueEmployees.filter((r) => getRecordFitnessStatus(r) === 'fit_dengan_catatan').length, color: '#f59e0b' },
      { name: 'Sementara Tidak Fit', value: uniqueEmployees.filter((r) => getRecordFitnessStatus(r) === 'sementara_tidak_fit').length, color: '#f43f5e' },
    ];
  }, [filteredMiniMcuRecords, filterEntitasStatusFit, filterDivisiStatusFit, selectedBulan]);

  // 6. CHART 5: PENYAKIT PER ENTITAS (Horizontal Bar Charts - Per Orang / Karyawan Unik)
  const isCleanDisease = (p: string | null | undefined): boolean => {
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
      s === 'chekup' ||
      s === 'checkup' ||
      s === 'cc' ||
      s.includes('tidak memiliki') ||
      s.includes('kondisi fisik baik') ||
      s.includes('tidak ada penyakit')
    ) {
      return false;
    }
    return true;
  };

  const chartDiagnosaAdminData = useMemo(() => {
    let recs = filteredMcuRecords;
    if (filterEntitasDiag !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasDiag));
    if (filterDivisiDiag !== 'all') recs = recs.filter((r) => isSameDivisi(r.divisi, filterDivisiDiag));

    const uniqueEmployees = getUniqueEmployeeRecords(recs);
    const counts: Record<string, number> = {};

    uniqueEmployees.forEach((r) => {
      const seenDiseasesForEmp = new Set<string>();
      const list = r.penyakit_list || r.penyakit || [];
      if (Array.isArray(list)) {
        list.forEach((p: string) => {
          if (isCleanDisease(p)) {
            seenDiseasesForEmp.add(p.trim());
          }
        });
      } else if (typeof list === 'string' && isCleanDisease(list)) {
        try {
          const parsed = JSON.parse(list);
          if (Array.isArray(parsed)) {
            parsed.forEach((p: string) => {
              if (isCleanDisease(p)) seenDiseasesForEmp.add(p.trim());
            });
          }
        } catch {
          const strVal = String(list);
          seenDiseasesForEmp.add(strVal.trim());
        }
      }
      if (r.penyakit_text && isCleanDisease(r.penyakit_text)) {
        seenDiseasesForEmp.add(r.penyakit_text.trim());
      }

      seenDiseasesForEmp.forEach((diseaseName) => {
        counts[diseaseName] = (counts[diseaseName] || 0) + 1;
      });
    });

    let entries = Object.entries(counts).map(([name, count]) => ({ name, count }));
    if (searchNamaDiag.trim()) {
      entries = entries.filter((e) => e.name.toLowerCase().includes(searchNamaDiag.toLowerCase()));
    }
    entries.sort((a, b) => b.count - a.count);

    if (entries.length === 0) {
      entries = [{ name: 'Belum Ada Penyakit Tercatat', count: 0 }];
    }

    if (filterLimitDiag === 'top1') entries = entries.slice(0, 1);
    else if (filterLimitDiag === 'top3') entries = entries.slice(0, 3);
    else if (filterLimitDiag === 'top5') entries = entries.slice(0, 5);
    else if (filterLimitDiag === 'top10') entries = entries.slice(0, 10);
    else if (filterLimitDiag === 'top20') entries = entries.slice(0, 20);

    return entries;
  }, [filteredMcuRecords, filterEntitasDiag, filterDivisiDiag, searchNamaDiag, filterLimitDiag]);

  const chartDiagnosaKlinikData = useMemo(() => {
    let recs = filteredMiniMcuRecords;
    if (filterEntitasDiag !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasDiag));
    if (filterDivisiDiag !== 'all') recs = recs.filter((r) => isSameDivisi(r.divisi, filterDivisiDiag));

    const uniqueEmployees = getUniqueEmployeeRecords(recs);
    const counts: Record<string, number> = {};

    uniqueEmployees.forEach((r) => {
      const seenDiseasesForEmp = new Set<string>();
      const list = r.penyakit || r.penyakit_list || [];
      if (Array.isArray(list)) {
        list.forEach((p: string) => {
          if (isCleanDisease(p)) {
            seenDiseasesForEmp.add(p.trim());
          }
        });
      } else if (typeof list === 'string' && isCleanDisease(list)) {
        try {
          const parsed = JSON.parse(list);
          if (Array.isArray(parsed)) {
            parsed.forEach((p: string) => {
              if (isCleanDisease(p)) seenDiseasesForEmp.add(p.trim());
            });
          }
        } catch {
          const strVal = String(list);
          seenDiseasesForEmp.add(strVal.trim());
        }
      }
      if (r.penyakit_text && isCleanDisease(r.penyakit_text)) {
        seenDiseasesForEmp.add(r.penyakit_text.trim());
      }

      seenDiseasesForEmp.forEach((diseaseName) => {
        counts[diseaseName] = (counts[diseaseName] || 0) + 1;
      });
    });

    let entries = Object.entries(counts).map(([name, count]) => ({ name, count }));
    if (searchNamaDiag.trim()) {
      entries = entries.filter((e) => e.name.toLowerCase().includes(searchNamaDiag.toLowerCase()));
    }
    entries.sort((a, b) => b.count - a.count);

    if (entries.length === 0) {
      entries = [{ name: 'Belum Ada Penyakit Tercatat', count: 0 }];
    }

    if (filterLimitDiag === 'top1') entries = entries.slice(0, 1);
    else if (filterLimitDiag === 'top3') entries = entries.slice(0, 3);
    else if (filterLimitDiag === 'top5') entries = entries.slice(0, 5);
    else if (filterLimitDiag === 'top10') entries = entries.slice(0, 10);
    else if (filterLimitDiag === 'top20') entries = entries.slice(0, 20);

    return entries;
  }, [filteredMiniMcuRecords, filterEntitasDiag, filterDivisiDiag, searchNamaDiag, filterLimitDiag]);

  // 7. CHART 6: KELOMPOK USIA (UMUR - Per Orang / Karyawan Unik)
  const chartUmurData = useMemo(() => {
    let recs = filteredMcuRecords;
    if (filterEntitasUmur !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasUmur));
    if (filterDivisiUmur !== 'all') recs = recs.filter((r) => matchDivisi(r.divisi, filterDivisiUmur));

    const uniqueEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(recs) : recs;

    return AGE_BRACKETS.map((bracket) => {
      const count = uniqueEmployees.filter((r) => {
        const u = Number(r.umur || (r.vitals as any)?.umur || 0);
        return matchAgeBracket(u, bracket);
      }).length;
      return { range: bracket, count };
    });
  }, [filteredMcuRecords, filterEntitasUmur, filterDivisiUmur, selectedBulan]);

  // 8. CHART 7 & 8: BLOOD PRESSURE (TEKANAN DARAH - Per Orang / Karyawan Unik)
  const chartTensiAdminData = useMemo(() => {
    let recs = filteredMcuRecords;
    if (filterEntitasTensi !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasTensi));
    if (filterDivisiTensi !== 'all') recs = recs.filter((r) => matchDivisi(r.divisi, filterDivisiTensi));

    const uniqueEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(recs) : recs;

    return [
      { name: 'Hipertensi (≥140/90)', value: uniqueEmployees.filter((r) => getTensiStatus(r) === 'hipertensi').length, color: '#f43f5e' },
      { name: 'Pra-Hipertensi (120-139)', value: uniqueEmployees.filter((r) => getTensiStatus(r) === 'pra_hipertensi').length, color: '#f59e0b' },
      { name: 'Normal (<120/80)', value: uniqueEmployees.filter((r) => getTensiStatus(r) === 'normal').length, color: '#10b981' },
    ];
  }, [filteredMcuRecords, filterEntitasTensi, filterDivisiTensi, selectedBulan]);

  const chartTensiKlinikData = useMemo(() => {
    let recs = filteredMiniMcuRecords;
    if (filterEntitasTensi !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasTensi));
    if (filterDivisiTensi !== 'all') recs = recs.filter((r) => matchDivisi(r.divisi, filterDivisiTensi));

    const uniqueEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(recs) : recs;

    return [
      { name: 'Hipertensi (≥140/90)', value: uniqueEmployees.filter((r) => getTensiStatus(r) === 'hipertensi').length, color: '#e11d48' },
      { name: 'Pra-Hipertensi (120-139)', value: uniqueEmployees.filter((r) => getTensiStatus(r) === 'pra_hipertensi').length, color: '#d97706' },
      { name: 'Normal (<120/80)', value: uniqueEmployees.filter((r) => getTensiStatus(r) === 'normal').length, color: '#059669' },
    ];
  }, [filteredMiniMcuRecords, filterEntitasTensi, filterDivisiTensi, selectedBulan]);

  // 9. CHART 9: HIGH CHOLESTEROL (KOLESTEROL - Per Orang / Karyawan Unik)
  const chartKolesterolAdminData = useMemo(() => {
    let recs = filteredMcuRecords;
    if (filterEntitasKolesterol !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasKolesterol));
    if (filterDivisiKolesterol !== 'all') recs = recs.filter((r) => matchDivisi(r.divisi, filterDivisiKolesterol));

    const uniqueEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(recs) : recs;

    return [
      { name: 'Risiko Tinggi (≥200)', value: uniqueEmployees.filter((r) => getKolesterolStatus(r) === 'tinggi').length, color: '#f43f5e' },
      { name: 'Normal (<200)', value: uniqueEmployees.filter((r) => getKolesterolStatus(r) === 'normal').length, color: '#10b981' },
    ];
  }, [filteredMcuRecords, filterEntitasKolesterol, filterDivisiKolesterol, selectedBulan]);

  const chartKolesterolKlinikData = useMemo(() => {
    let recs = filteredMiniMcuRecords;
    if (filterEntitasKolesterol !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasKolesterol));
    if (filterDivisiKolesterol !== 'all') recs = recs.filter((r) => matchDivisi(r.divisi, filterDivisiKolesterol));

    const uniqueEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(recs) : recs;

    return [
      { name: 'Risiko Tinggi (≥200)', value: uniqueEmployees.filter((r) => getKolesterolStatus(r) === 'tinggi').length, color: '#e11d48' },
      { name: 'Normal (<200)', value: uniqueEmployees.filter((r) => getKolesterolStatus(r) === 'normal').length, color: '#059669' },
    ];
  }, [filteredMiniMcuRecords, filterEntitasKolesterol, filterDivisiKolesterol, selectedBulan]);

  // 10. CHART 10: GULA DARAH (Per Orang / Karyawan Unik)
  const chartGulaAdminData = useMemo(() => {
    let recs = filteredMcuRecords;
    if (filterEntitasGula !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasGula));
    if (filterDivisiGula !== 'all') recs = recs.filter((r) => matchDivisi(r.divisi, filterDivisiGula));

    const uniqueEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(recs) : recs;

    return [
      { name: 'Diabetes (≥126)', value: uniqueEmployees.filter((r) => getGulaDarahStatus(r) === 'diabetes').length, color: '#f43f5e' },
      { name: 'Prediabetes (100-125)', value: uniqueEmployees.filter((r) => getGulaDarahStatus(r) === 'pre_diabetes').length, color: '#f59e0b' },
      { name: 'Normal (<100)', value: uniqueEmployees.filter((r) => getGulaDarahStatus(r) === 'normal').length, color: '#10b981' },
    ];
  }, [filteredMcuRecords, filterEntitasGula, filterDivisiGula, selectedBulan]);

  const chartGulaKlinikData = useMemo(() => {
    let recs = filteredMiniMcuRecords;
    if (filterEntitasGula !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasGula));
    if (filterDivisiGula !== 'all') recs = recs.filter((r) => matchDivisi(r.divisi, filterDivisiGula));

    const uniqueEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(recs) : recs;

    return [
      { name: 'Diabetes (≥126)', value: uniqueEmployees.filter((r) => getGulaDarahStatus(r) === 'diabetes').length, color: '#e11d48' },
      { name: 'Prediabetes (100-125)', value: uniqueEmployees.filter((r) => getGulaDarahStatus(r) === 'pre_diabetes').length, color: '#d97706' },
      { name: 'Normal (<100)', value: uniqueEmployees.filter((r) => getGulaDarahStatus(r) === 'normal').length, color: '#059669' },
    ];
  }, [filteredMiniMcuRecords, filterEntitasGula, filterDivisiGula, selectedBulan]);

  // 11. CHART 11: STATUS BMI (Per Orang / Karyawan Unik)
  const chartBmiAdminData = useMemo(() => {
    let recs = filteredMcuRecords;
    if (filterEntitasBmi !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasBmi));
    if (filterDivisiBmi !== 'all') recs = recs.filter((r) => matchDivisi(r.divisi, filterDivisiBmi));

    const uniqueEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(recs) : recs;

    return [
      { name: 'Obesitas (≥27)', value: uniqueEmployees.filter((r) => getBmiStatus(r) === 'obesitas').length, color: '#f43f5e' },
      { name: 'Overweight (25-26.9)', value: uniqueEmployees.filter((r) => getBmiStatus(r) === 'overweight').length, color: '#f59e0b' },
      { name: 'Normal (18.5-24.9)', value: uniqueEmployees.filter((r) => getBmiStatus(r) === 'normal').length, color: '#10b981' },
      { name: 'Underweight (<18.5)', value: uniqueEmployees.filter((r) => getBmiStatus(r) === 'underweight').length, color: '#3b82f6' },
    ];
  }, [filteredMcuRecords, filterEntitasBmi, filterDivisiBmi, selectedBulan]);

  const chartBmiKlinikData = useMemo(() => {
    let recs = filteredMiniMcuRecords;
    if (filterEntitasBmi !== 'all') recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasBmi));
    if (filterDivisiBmi !== 'all') recs = recs.filter((r) => matchDivisi(r.divisi, filterDivisiBmi));

    const uniqueEmployees = selectedBulan === 'all' ? getUniqueEmployeeRecords(recs) : recs;

    return [
      { name: 'Obesitas (≥27)', value: uniqueEmployees.filter((r) => getBmiStatus(r) === 'obesitas').length, color: '#e11d48' },
      { name: 'Overweight (25-26.9)', value: uniqueEmployees.filter((r) => getBmiStatus(r) === 'overweight').length, color: '#d97706' },
      { name: 'Normal (18.5-24.9)', value: uniqueEmployees.filter((r) => getBmiStatus(r) === 'normal').length, color: '#059669' },
      { name: 'Underweight (<18.5)', value: uniqueEmployees.filter((r) => getBmiStatus(r) === 'underweight').length, color: '#2563eb' },
    ];
  }, [filteredMiniMcuRecords, filterEntitasBmi, filterDivisiBmi]);

  // Statistik untuk Analisis Eksekutif Google Gemini AI
  const aiAnalysisStats = useMemo<ChartAnalysisParams>(() => {
    let periodeLabel = '1–30 September 2026';
    if (selectedBulan === 'current') {
      periodeLabel = 'Bulan Ini (September 2026)';
    } else if (selectedBulan === '2026-08') {
      periodeLabel = '1–31 Agustus 2026';
    } else if (selectedBulan === '2026-07') {
      periodeLabel = '1–31 Juli 2026';
    } else if (selectedBulan === 'all') {
      periodeLabel = '1–30 September 2026';
    }

    const entities = ['PTPN 1', 'PTPN 3', 'PTPN 4'];
    const entitasBreakdown = entities.map((ent) => {
      // Gunakan distinctAdminRecords agar jumlah karyawan MCU per entitas konsisten (maksimal totalAdminMcu 282)
      const recsMcu = distinctAdminRecords.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent));
      const recsMini = distinctMiniRecords.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent));
      const fit = recsMcu.filter((r) => getRecordFitnessStatus(r) === 'fit_sehat').length;
      const catatan = recsMcu.filter((r) => getRecordFitnessStatus(r) === 'fit_dengan_catatan').length;
      const tidakFit = recsMcu.filter((r) => getRecordFitnessStatus(r) === 'sementara_tidak_fit').length;
      return {
        name: ent,
        total: recsMcu.length,
        mcuCount: recsMcu.length,
        klinikCount: recsMini.length,
        fit,
        catatan,
        tidakFit,
      };
    });

    // Total karyawan adalah total karyawan MCU (282 orang karyawan, bukan 757!)
    const totalKaryawanUnik = totalAdminMcu;
    const totalKunjunganSemua = totalAdminMcu + totalMiniMcu;

    const topPenyakit = (chartDiagnosaAdminData || []).slice(0, 5).map((d: any) => ({
      name: d.name,
      count: Number(d.count || 0),
    }));

    const tensiHipertensi = chartTensiAdminData.find((t) => t.name.startsWith('Hipertensi'))?.value || 0;
    const tensiPraHipertensi = chartTensiAdminData.find((t) => t.name.includes('Pra-Hipertensi'))?.value || 0;
    const tensiNormal = chartTensiAdminData.find((t) => t.name.includes('Normal'))?.value || 0;

    const kolTinggi = chartKolesterolAdminData.find((k) => k.name.includes('Tinggi'))?.value || 0;
    const kolSedang = chartKolesterolAdminData.find((k) => k.name.includes('Sedang') || k.name.includes('Ambang'))?.value || 0;
    const kolRendah = chartKolesterolAdminData.find((k) => k.name.includes('Rendah') || k.name.includes('Normal'))?.value || 0;

    const gulaDiabetes = chartGulaAdminData.find((g) => g.name.startsWith('Diabetes'))?.value || 0;
    const gulaPrediabetes = chartGulaAdminData.find((g) => g.name.includes('Prediabetes'))?.value || 0;
    const gulaNormal = chartGulaAdminData.find((g) => g.name.includes('Normal'))?.value || 0;

    const bmiObese = chartBmiAdminData.find((b) => b.name.includes('Obesitas'))?.value || 0;
    const bmiOverweight = chartBmiAdminData.find((b) => b.name.includes('Overweight'))?.value || 0;
    const bmiNormal = chartBmiAdminData.find((b) => b.name.includes('Normal'))?.value || 0;
    const bmiUnderweight = chartBmiAdminData.find((b) => b.name.includes('Underweight'))?.value || 0;

    return {
      periode: periodeLabel,
      totalPemeriksaan: totalAdminMcu,
      totalKlinik: totalMiniMcu,
      totalKunjunganSemua,
      totalKaryawanUnik,
      fitCount: fitSehatCount,
      fitCatatanCount: fitCatatanCount,
      tidakFitCount: followUpCount,
      entitasBreakdown,
      topPenyakit,
      tensiStats: {
        hipertensi: tensiHipertensi,
        praHipertensi: tensiPraHipertensi,
        normal: tensiNormal,
      },
      kolesterolStats: {
        tinggi: kolTinggi,
        sedang: kolSedang,
        rendah: kolRendah,
      },
      gulaStats: {
        diabetes: gulaDiabetes,
        prediabetes: gulaPrediabetes,
        normal: gulaNormal,
      },
      bmiStats: {
        obese: bmiObese,
        overweight: bmiOverweight,
        normal: bmiNormal,
        underweight: bmiUnderweight,
      },
    };
  }, [
    selectedBulan,
    totalAdminMcu,
    totalMiniMcu,
    fitSehatCount,
    fitCatatanCount,
    followUpCount,
    distinctAdminRecords,
    distinctMiniRecords,
    filteredMcuRecords,
    filteredMiniMcuRecords,
    chartDiagnosaAdminData,
    chartTensiAdminData,
    chartKolesterolAdminData,
    chartGulaAdminData,
    chartBmiAdminData,
  ]);

  return (
    <AppLayout>
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-xs space-y-6">

        {/* Main Header Title & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Dashboard Analitik Grafik Overview Admin
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Visualisasi statistik kesehatan karyawan, perbandingan MCU Admin &amp; Inhouse Clinic, status kebugaran, dan diagnosa per entitas/divisi
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Search Bar */}
            <div className="relative flex items-center">
              <input
                type="text"
                id="admin-dashboard-search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama atau NIK..."
                className="w-48 sm:w-60 bg-slate-50 text-xs font-semibold text-slate-800 placeholder-slate-400 pl-8 pr-3.5 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition"
              />
              <button
                type="button"
                onClick={() => {
                  const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                  router.push(`/admin/rekapan-mcu?tab=mcu&search=${encodeURIComponent(searchTerm)}${bulanParam}`);
                }}
                className="absolute left-2.5 text-slate-400 hover:text-slate-700"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Filter Bulan */}
            <div className="relative">
              <select
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="appearance-none bg-slate-50 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2 outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 cursor-pointer transition"
              >
                <option value="all">Semua Periode (Riwayat)</option>
                <option value="current">Bulan Ini / Terbaru</option>
                <option value="2026-08">Agustus 2026</option>
                <option value="2026-07">Juli 2026</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Ekspor Excel Button - Langsung Unduh Data + Grafik Batang & Donat */}
            <button
              type="button"
              onClick={handleQuickExportExcel}
              disabled={isExportingDashboard}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer ${
                isExportingDashboard
                  ? 'bg-emerald-700/80 text-white cursor-wait opacity-90'
                  : 'bg-emerald-800 hover:bg-emerald-900 text-white hover:shadow-md active:scale-95'
              }`}
              title="Unduh Berkas Excel: Seluruh Data Pasien beserta Grafik Batang & Donat HD"
            >
              {isExportingDashboard ? (
                <RefreshCw className="w-4 h-4 text-emerald-200 shrink-0 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4 text-emerald-200 shrink-0" />
              )}
              <span>{isExportingDashboard ? 'Mengekspor Excel...' : 'Ekspor Excel'}</span>
            </button>
          </div>
        </div>

        {/* Summary Metric Cards (5 Key Metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. MCU Admin */}
          <div
            onClick={() => {
              const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
              router.push(`/admin/rekapan-mcu?tab=mcu${bulanParam}`);
            }}
            className="p-4 rounded-2xl bg-blue-50/80 hover:bg-blue-100/90 border border-blue-200/80 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            title="Klik untuk melihat data MCU Admin"
          >
            <div className="p-3 rounded-xl bg-blue-700 group-hover:bg-blue-800 text-white shrink-0 shadow-2xs transition">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-blue-900 block group-hover:underline">MCU</span>
              <span className="text-xl font-extrabold text-blue-950">{totalAdminMcu}</span>
            </div>
          </div>

          {/* 2. Inhouse Clinic */}
          <div
            onClick={() => {
              const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
              router.push(`/admin/rekapan-mcu?tab=mini_mcu${bulanParam}`);
            }}
            className="p-4 rounded-2xl bg-teal-50/80 hover:bg-teal-100/90 border border-teal-200/80 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            title="Klik untuk melihat data Inhouse Clinic"
          >
            <div className="p-3 rounded-xl bg-teal-700 group-hover:bg-teal-800 text-white shrink-0 shadow-2xs transition">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-teal-900 block group-hover:underline">Inhouse Clinic</span>
              <span className="text-xl font-extrabold text-teal-950">{totalMiniMcu}</span>
            </div>
          </div>

          {/* 3. Fit Sehat */}
          <div
            onClick={() => {
              const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
              router.push(`/admin/rekapan-mcu?tab=mcu&status=Fit%20for%20Duty${bulanParam}`);
            }}
            className="p-4 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-200/80 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            title="Klik untuk melihat karyawan Fit Sehat"
          >
            <div className="p-3 rounded-xl bg-emerald-700 group-hover:bg-emerald-800 text-white shrink-0 shadow-2xs transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-emerald-900 block group-hover:underline">Fit Sehat</span>
              <span className="text-xl font-extrabold text-emerald-950">{fitSehatCount}</span>
            </div>
          </div>

          {/* 4. Fit Catatan */}
          <div
            onClick={() => {
              const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
              router.push(`/admin/rekapan-mcu?tab=mcu&status=Fit%20dengan%20Catatan${bulanParam}`);
            }}
            className="p-4 rounded-2xl bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200/80 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            title="Klik untuk melihat karyawan Fit dengan Catatan"
          >
            <div className="p-3 rounded-xl bg-amber-600 group-hover:bg-amber-700 text-white shrink-0 shadow-2xs transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-amber-900 block group-hover:underline">Fit Catatan</span>
              <span className="text-xl font-extrabold text-amber-950">{fitCatatanCount}</span>
            </div>
          </div>

          {/* 5. Sementara Tidak Fit */}
          <div
            onClick={() => {
              const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
              router.push(`/admin/rekapan-mcu?tab=mcu&status=Sementara%20Tidak%20Fit${bulanParam}`);
            }}
            className="p-4 rounded-2xl bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/80 flex items-center gap-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            title="Klik untuk melihat karyawan Sementara Tidak Fit"
          >
            <div className="p-3 rounded-xl bg-rose-600 group-hover:bg-rose-700 text-white shrink-0 shadow-2xs transition">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-rose-900 block group-hover:underline">Sementara Tidak Fit</span>
              <span className="text-xl font-extrabold text-rose-950">{followUpCount}</span>
            </div>
          </div>
        </div>

        {/* AI EXECUTIVE ANALYSIS CARD (Powered by Google Gemini AI) */}
        <AiAnalysisCard stats={aiAnalysisStats} />

        {/* CHART 1: Feature Bar Chart - Jumlah Karyawan Berdasarkan Entitas/Departemen */}
        <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800 shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Jumlah Karyawan Atas Hasil MCU</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Distribusi data karyawan per entitas holding &amp; anak perusahaan (PTPN 3, PTPN 1, PTPN 4)
                </p>
              </div>
            </div>

            {/* Card Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select
                  id="filter-kategori-entitas"
                  value={filterKategoriEntitas}
                  onChange={(e) => setFilterKategoriEntitas(e.target.value)}
                  className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                >
                  <option value="mcu">MCU Berkala (283 Karyawan)</option>
                  <option value="all">Semua Data (MCU &amp; Inhouse)</option>
                  <option value="klinik">Inhouse Clinic (756 Kunjungan)</option>
                </select>
                <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-500">
                  <ChevronDown className="w-3 h-3" />
                </div>
              </div>

              {/* Ekspor Excel Chart 1 (Entitas) */}
              <button
                type="button"
                onClick={() => handleExportSingleChart('entitas')}
                disabled={exportingChartId !== null}
                className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                title="Ekspor Grafik & Data Entitas dalam 1 Sheet Excel"
              >
                {exportingChartId === 'entitas' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-200 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                )}
                <span>{exportingChartId === 'entitas' ? 'Mengekspor...' : 'Ekspor Excel'}</span>
              </button>
            </div>
          </div>

          <div className="h-80 sm:h-96 w-full relative">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartEntitasData}
                  margin={{ top: 25, right: 15, left: -10, bottom: 5 }}
                  onClick={(e) => {
                    if (e && e.activeLabel) {
                      const targetTab = filterKategoriEntitas === 'klinik' ? 'mini_mcu' : 'mcu';
                      const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                      router.push(`/admin/rekapan-mcu?tab=${targetTab}&departemen=${encodeURIComponent(e.activeLabel)}${bulanParam}`);
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="entitas" tick={{ fontSize: 11, fill: '#334155', fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />

                  {/* Bar 1: Jumlah Karyawan with Data Label */}
                  <Bar dataKey="total_karyawan" name="Jumlah Karyawan" fill="#0284c7" radius={[6, 6, 0, 0]} maxBarSize={45}>
                    <LabelList dataKey="total_karyawan" position="top" fill="#0369a1" fontSize={11} fontWeight="bold" formatter={(val: any) => (val && Number(val) > 0 ? val : '')} offset={4} />
                  </Bar>

                  {/* Bar 2: Sudah MCU with Data Label */}
                  <Bar dataKey="sudah_mcu" name="Sudah Melaksanakan MCU" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={45}>
                    <LabelList dataKey="sudah_mcu" position="top" fill="#047857" fontSize={11} fontWeight="bold" formatter={(val: any) => (val && Number(val) > 0 ? val : '')} offset={4} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* AI Insight Khusus Chart 1 (Entitas) */}
          <ChartAiInsight
            chartType="entitas"
            chartTitle="Hasil MCU & Kunjungan per Entitas PTPN"
            data={{
              list: chartEntitasData,
              kategori: filterKategoriEntitas,
              totalMcu: totalAdminMcu,
              totalKlinik: totalMiniMcu,
            }}
            className="mt-4"
          />
        </div>

        {/* CHART 2: Feature Bar Chart - Jumlah Karyawan Per Divisi (Filterable by Entitas, Limit, Search & Sort) */}
        <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 max-w-full overflow-hidden">
          {/* Header Section */}
          <div className="flex items-center justify-between flex-wrap gap-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 shadow-2xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-bold text-slate-900">Jumlah Karyawan Per Divisi Atas Hasil MCU</h2>
                  <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {divisiStats.totalDivisi} Divisi Terdata
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Distribusi dan peringkat partisipasi karyawan per unit divisi kerja berdasarkan hasil MCU
                </p>
              </div>
            </div>

            {/* Primary Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Entitas Filter */}
              <div className="relative">
                <select
                  id="filter-entitas-divisi"
                  value={filterEntitasDivisi}
                  onChange={(e) => setFilterEntitasDivisi(e.target.value)}
                  className="appearance-none bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-700 rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
                >
                  <option value="all">Semua Entitas Perusahaan</option>
                  <option value="PTPN 1">PTPN 1 / SuppCo</option>
                  <option value="PTPN 3">PTPN 3 / Holding</option>
                  <option value="PTPN 4">PTPN 4 / PalmCo</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-200 w-3.5 h-3.5" />
              </div>

              {/* Ekspor Excel Chart 2 (Divisi) */}
              <button
                type="button"
                onClick={() => handleExportSingleChart('divisi')}
                disabled={exportingChartId !== null}
                className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                title="Ekspor Grafik & Data Divisi dalam 1 Sheet Excel"
              >
                {exportingChartId === 'divisi' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-200 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                )}
                <span>{exportingChartId === 'divisi' ? 'Mengekspor...' : 'Ekspor Excel'}</span>
              </button>
            </div>
          </div>

          {/* Quick KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/90 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Divisi</span>
                <span className="text-sm font-extrabold text-slate-800">{divisiStats.totalDivisi} Divisi</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Karyawan</span>
                <span className="text-sm font-extrabold text-slate-800">{divisiStats.totalKaryawanInDivisi} Orang</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0 truncate">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Divisi Terbanyak</span>
                <span className="text-sm font-extrabold text-slate-800 truncate block" title={divisiStats.topDivisi?.fullDivisi}>
                  {divisiStats.topDivisi ? `${divisiStats.topDivisi.fullDivisi}` : '-'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Rata-rata / Divisi</span>
                <span className="text-sm font-extrabold text-slate-800">{divisiStats.avgPerDivisi} Karyawan</span>
              </div>
            </div>
          </div>

          {/* Filter & View Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {/* Left: Search input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama divisi..."
                value={searchDivisiQuery}
                onChange={(e) => setSearchDivisiQuery(e.target.value)}
                className="w-full bg-white text-xs font-medium text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition shadow-2xs"
              />
              {searchDivisiQuery && (
                <button
                  type="button"
                  onClick={() => setSearchDivisiQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Right: Limit, Sort, View Toggle */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Limit pills */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                {(['top10', 'top15', 'top25', 'all'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFilterLimitDivisi(opt)}
                    className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${filterLimitDivisi === opt
                      ? 'bg-emerald-800 text-white shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                  >
                    {opt === 'top10' ? 'Top 10' : opt === 'top15' ? 'Top 15' : opt === 'top25' ? 'Top 25' : 'Semua Divisi'}
                  </button>
                ))}
              </div>

              {/* Sort Select */}
              <div className="relative">
                <select
                  value={sortDivisiOrder}
                  onChange={(e) => setSortDivisiOrder(e.target.value as any)}
                  className="appearance-none bg-white text-slate-700 font-bold text-[11px] border border-slate-200 rounded-xl pl-2.5 pr-7 py-1.5 outline-none cursor-pointer hover:border-slate-300 transition shadow-2xs"
                >
                  <option value="karyawan">Terbanyak ↓</option>
                  <option value="kunjungan">Kunjungan Terbanyak ↓</option>
                  <option value="rasio">Rasio Partisipasi ↓</option>
                  <option value="asc">Terkecil ↑</option>
                  <option value="alpha">Abjad A-Z</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewModeDivisi('horizontal')}
                  title="Tampilan Horizontal Leaderboard (Rapi & Sangat Jelas)"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${viewModeDivisi === 'horizontal'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewModeDivisi('vertical')}
                  title="Tampilan Kolom Vertikal"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${viewModeDivisi === 'vertical'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Legend Indicator */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 px-1 text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 font-bold text-slate-700">
                <span className="w-3 h-3 rounded-xs bg-[#059669] shrink-0" />
                <span>Sudah Melakukan MCU</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-slate-500">
                <span className="w-3 h-3 rounded-xs bg-[#cbd5e1] border border-slate-300 shrink-0" />
                <span>Belum Melakukan MCU</span>
              </div>
            </div>
            <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <span>👉 Klik batang untuk melihat daftar di Rekapan MCU</span>
            </div>
          </div>

          {/* Chart Container */}
          <div className="w-full max-w-full overflow-hidden">
            {mounted && (
              <>
                {viewModeDivisi === 'horizontal' ? (
                  <div
                    className={`w-full transition-all duration-300 ${chartDivisiData.length > 12 ? 'max-h-[520px] overflow-y-auto pr-2' : ''
                      }`}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: `${Math.max(360, chartDivisiData.length * 36)}px`,
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={chartDivisiData}
                          margin={{ top: 10, right: 48, left: 10, bottom: 10 }}
                          onClick={(e) => {
                            if (e && e.activePayload && e.activePayload[0]) {
                              const item = e.activePayload[0].payload;
                              if (item.fullDivisi && item.fullDivisi !== 'Belum Ada Data Divisi') {
                                const deptParam = filterEntitasDivisi !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasDivisi)}` : '';
                                const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                                router.push(`/admin/rekapan-mcu?tab=mcu&divisi=${encodeURIComponent(item.fullDivisi)}${deptParam}${bulanParam}`);
                              }
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="fullDivisi"
                            width={210}
                            tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                            tickFormatter={(val) => (val && val.length > 27 ? `${val.substring(0, 25)}...` : val)}
                          />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const totalKaryawan = data.total_karyawan || 0;
                                const sudahMcu = data.sudah_mcu || 0;
                                const belumMcu = data.belum_mcu || 0;
                                const pctSudah = totalKaryawan > 0 ? ((sudahMcu / totalKaryawan) * 100).toFixed(1) : '0';
                                const pctBelum = totalKaryawan > 0 ? ((belumMcu / totalKaryawan) * 100).toFixed(1) : '0';
                                const totalAll = divisiStats.totalKaryawanInDivisi || 1;
                                const pctOfAll = ((totalKaryawan / totalAll) * 100).toFixed(1);

                                return (
                                  <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700/60 backdrop-blur-md max-w-xs text-xs space-y-2">
                                    <div className="font-bold text-sm text-emerald-300 border-b border-slate-700/80 pb-1.5 flex items-center justify-between gap-2">
                                      <span>{data.fullDivisi}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                                        {pctOfAll}% dari total
                                      </span>
                                    </div>
                                    <div className="space-y-1 pt-0.5">
                                      <div className="flex items-center justify-between gap-4 font-bold text-slate-100">
                                        <span>Total Karyawan:</span>
                                        <span className="text-white text-sm">{totalKaryawan} Orang</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4 text-emerald-400">
                                        <span className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                          Sudah Melakukan MCU:
                                        </span>
                                        <span className="font-extrabold">{sudahMcu} Orang ({pctSudah}%)</span>
                                      </div>
                                      {belumMcu > 0 && (
                                        <div className="flex items-center justify-between gap-4 text-slate-300">
                                          <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                                            Belum Melakukan MCU:
                                          </span>
                                          <span className="font-bold">{belumMcu} Orang ({pctBelum}%)</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-emerald-200/80 pt-1.5 border-t border-slate-800 flex items-center gap-1">
                                      <span>👉 Klik bar untuk melihat daftar di Rekapan MCU</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="sudah_mcu"
                            name="Sudah Melakukan MCU"
                            stackId="divisiStackH"
                            fill="#059669"
                            radius={[0, 4, 4, 0]}
                            barSize={20}
                            className="cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            <LabelList
                              dataKey="sudah_mcu"
                              content={renderDivisiSudahMcuHLabel}
                            />
                          </Bar>
                          <Bar
                            dataKey="belum_mcu"
                            name="Belum Melakukan MCU"
                            stackId="divisiStackH"
                            fill="#cbd5e1"
                            radius={[0, 6, 6, 0]}
                            barSize={20}
                            className="cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            <LabelList
                              dataKey="belum_mcu"
                              content={renderDivisiBelumMcuHLabel}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-full overflow-x-auto pb-3">
                    {chartDivisiData.length > 15 && (
                      <div className="text-[11px] text-slate-400 font-medium mb-1.5 flex items-center gap-1">
                        <span>↔ Geser horizontal untuk melihat seluruh {chartDivisiData.length} divisi</span>
                      </div>
                    )}
                    <div
                      style={{
                        width: `${Math.max(100, chartDivisiData.length * (chartDivisiData.length > 20 ? 46 : 56))}px`,
                        minWidth: '100%',
                        height: '430px',
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartDivisiData}
                          margin={{ top: 25, right: 20, left: -10, bottom: 95 }}
                          onClick={(e) => {
                            if (e && e.activePayload && e.activePayload[0]) {
                              const item = e.activePayload[0].payload;
                              if (item.fullDivisi && item.fullDivisi !== 'Belum Ada Data Divisi') {
                                const deptParam = filterEntitasDivisi !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasDivisi)}` : '';
                                const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                                router.push(`/admin/rekapan-mcu?tab=mcu&divisi=${encodeURIComponent(item.fullDivisi)}${deptParam}${bulanParam}`);
                              }
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="fullDivisi"
                            angle={-40}
                            textAnchor="end"
                            interval={0}
                            tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }}
                            tickFormatter={(val) => (val && val.length > 18 ? `${val.substring(0, 16)}..` : val)}
                          />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                const totalKaryawan = data.total_karyawan || 0;
                                const sudahMcu = data.sudah_mcu || 0;
                                const belumMcu = data.belum_mcu || 0;
                                const pctSudah = totalKaryawan > 0 ? ((sudahMcu / totalKaryawan) * 100).toFixed(1) : '0';
                                const pctBelum = totalKaryawan > 0 ? ((belumMcu / totalKaryawan) * 100).toFixed(1) : '0';
                                const totalAll = divisiStats.totalKaryawanInDivisi || 1;
                                const pctOfAll = ((totalKaryawan / totalAll) * 100).toFixed(1);

                                return (
                                  <div className="bg-slate-900/95 text-white p-3.5 rounded-xl shadow-xl border border-slate-700/60 backdrop-blur-md max-w-xs text-xs space-y-2">
                                    <div className="font-bold text-sm text-emerald-300 border-b border-slate-700/80 pb-1.5 flex items-center justify-between gap-2">
                                      <span>{data.fullDivisi}</span>
                                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                                        {pctOfAll}% dari total
                                      </span>
                                    </div>
                                    <div className="space-y-1 pt-0.5">
                                      <div className="flex items-center justify-between gap-4 font-bold text-slate-100">
                                        <span>Total Karyawan:</span>
                                        <span className="text-white text-sm">{totalKaryawan} Orang</span>
                                      </div>
                                      <div className="flex items-center justify-between gap-4 text-emerald-400">
                                        <span className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                                          Sudah Melakukan MCU:
                                        </span>
                                        <span className="font-extrabold">{sudahMcu} Orang ({pctSudah}%)</span>
                                      </div>
                                      {belumMcu > 0 && (
                                        <div className="flex items-center justify-between gap-4 text-slate-300">
                                          <span className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                                            Belum Melakukan MCU:
                                          </span>
                                          <span className="font-bold">{belumMcu} Orang ({pctBelum}%)</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-emerald-200/80 pt-1.5 border-t border-slate-800 flex items-center gap-1">
                                      <span>👉 Klik bar untuk melihat daftar di Rekapan MCU</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="sudah_mcu"
                            name="Sudah Melakukan MCU"
                            stackId="divisiStackV"
                            fill="#059669"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={36}
                            className="cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            <LabelList
                              dataKey="sudah_mcu"
                              content={renderDivisiSudahMcuVLabel}
                            />
                          </Bar>
                          <Bar
                            dataKey="belum_mcu"
                            name="Belum Melakukan MCU"
                            stackId="divisiStackV"
                            fill="#cbd5e1"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={36}
                            className="cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            <LabelList
                              dataKey="belum_mcu"
                              content={renderDivisiBelumMcuVLabel}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* AI Insight Khusus Chart 2 (Divisi) */}
          <ChartAiInsight
            chartType="divisi"
            chartTitle="Partisipasi & Distribusi per Divisi"
            data={{ stats: divisiStats, list: chartDivisiData }}
            className="mt-4"
          />
        </div>

        {/* CHART GRID ROW 2: Perbandingan MCU Admin vs Mini MCU & Status Fit Kebugaran */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CHART 3: Perbandingan MCU Admin vs Mini MCU */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-800 shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">MCU dan Inhouse Clinic</h2>
                  <p className="text-xs text-slate-500 font-medium">Perbandingan peserta MCU (karyawan unik) vs jumlah kunjungan Inhouse Clinic</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <select
                    value={filterEntitasMcuType}
                    onChange={(e) => setFilterEntitasMcuType(e.target.value)}
                    className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Entitas</option>
                    {Object.entries(defaultEntitiesMap).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={filterDivisiMcuType}
                    onChange={(e) => setFilterDivisiMcuType(e.target.value)}
                    className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Divisi</option>
                    {availableDivisiList.map((div) => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Ekspor Excel Chart 3 (MCU vs Klinik) */}
                <button
                  type="button"
                  onClick={() => handleExportSingleChart('mcu_vs_klinik')}
                  disabled={exportingChartId !== null}
                  className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                  title="Ekspor Grafik & Data MCU vs Klinik dalam 1 Sheet Excel"
                >
                  {exportingChartId === 'mcu_vs_klinik' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-200 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  )}
                  <span>{exportingChartId === 'mcu_vs_klinik' ? 'Mengekspor...' : 'Ekspor Excel'}</span>
                </button>
              </div>
            </div>

            <div className="h-72 w-full relative flex items-center justify-center">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartMcuTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      label={renderCustomizedPieLabel}
                      labelLine={false}
                      cursor="pointer"
                      onClick={(entry) => {
                        if (entry && entry.name) {
                          const targetTab = entry.name.toLowerCase().includes('inhouse') ? 'mini_mcu' : 'mcu';
                          const deptParam = filterEntitasMcuType !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasMcuType)}` : '';
                          const divParam = filterDivisiMcuType !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiMcuType)}` : '';
                          const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                          router.push(`/admin/rekapan-mcu?tab=${targetTab}${deptParam}${divParam}${bulanParam}`);
                        }
                      }}
                    >
                      {chartMcuTypeData.map((e, idx) => (
                        <Cell key={`cell-mcutype-${idx}`} fill={e.color} cursor="pointer" />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const d = payload[0];
                          const total = ((chartMcuTypeData[0]?.value || 0) + (chartMcuTypeData[1]?.value || 0)) || 1;
                          const val = Number(d.value || 0);
                          const pctVal = ((val / total) * 100).toFixed(1).replace('.', ',');
                          const isMcu = String(d.name || '').toLowerCase().includes('mcu');
                          const unit = isMcu ? 'Karyawan' : 'Kunjungan';
                          const note = isMcu ? '1 orang dihitung 1 kali sesuai NIK / Nama' : 'Total seluruh kunjungan klinik';
                          return (
                            <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
                              <div className="font-bold text-slate-200">{d.name}</div>
                              <div className="text-emerald-400 font-extrabold text-sm">
                                {val} {unit} ({pctVal}%)
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {note}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* AI Insight Khusus Chart 3 (MCU vs Klinik) */}
            <ChartAiInsight
              chartType="mcu_vs_klinik"
              chartTitle="MCU Admin vs Inhouse Clinic"
              data={chartMcuTypeData}
              className="mt-3"
            />
          </div>

          {/* CHART 4: Status Kebugaran (2 Donut Charts: MCU Admin vs Inhouse Clinic) */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Distribusi Status Kebugaran (Fitness Status)</h2>
                  <p className="text-xs text-slate-500 font-medium">Status kelayakan kerja karyawan</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <select
                    value={filterEntitasStatusFit}
                    onChange={(e) => setFilterEntitasStatusFit(e.target.value)}
                    className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Entitas</option>
                    {Object.entries(defaultEntitiesMap).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={filterDivisiStatusFit}
                    onChange={(e) => setFilterDivisiStatusFit(e.target.value)}
                    className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                  >
                    <option value="all">Semua Divisi</option>
                    {availableDivisiList.map((div) => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Ekspor Excel Chart 4 (Status Kebugaran) */}
                <button
                  type="button"
                  onClick={() => handleExportSingleChart('status_kebugaran')}
                  disabled={exportingChartId !== null}
                  className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                  title="Ekspor Grafik & Data Status Kebugaran dalam 1 Sheet Excel"
                >
                  {exportingChartId === 'status_kebugaran' ? (
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-200 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  )}
                  <span>{exportingChartId === 'status_kebugaran' ? 'Mengekspor...' : 'Ekspor Excel'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center justify-center pt-2">
              {/* Donut Chart 1: MCU Admin */}
              <div className="flex flex-col items-center justify-center bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">Status Fit MCU Admin</h3>
                </div>
                <div className="h-56 w-full relative">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusFitAdminData}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={65}
                          dataKey="value"
                          label={renderCustomizedPieLabel}
                          labelLine={false}
                          cursor="pointer"
                          onClick={(entry) => {
                            if (entry && entry.name) {
                              const deptParam = filterEntitasStatusFit !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasStatusFit)}` : '';
                              const divParam = filterDivisiStatusFit !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiStatusFit)}` : '';
                              const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                              router.push(`/admin/rekapan-mcu?tab=mcu&status=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                            }
                          }}
                        >
                          {statusFitAdminData.map((e, idx) => (
                            <Cell key={`cell-sfa-${idx}`} fill={e.color} cursor="pointer" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                        <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Donut Chart 2: Inhouse Clinic */}
              <div className="flex flex-col items-center justify-center bg-teal-50/50 p-3.5 rounded-2xl border border-teal-200/80 shadow-2xs">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <h3 className="text-xs font-extrabold text-teal-950 uppercase tracking-wider">Status Fit Inhouse Clinic</h3>
                </div>
                <div className="h-56 w-full relative">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusFitKlinikData}
                          cx="50%"
                          cy="50%"
                          innerRadius={38}
                          outerRadius={65}
                          dataKey="value"
                          label={renderCustomizedPieLabel}
                          labelLine={false}
                          cursor="pointer"
                          onClick={(entry) => {
                            if (entry && entry.name) {
                              const deptParam = filterEntitasStatusFit !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasStatusFit)}` : '';
                              const divParam = filterDivisiStatusFit !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiStatusFit)}` : '';
                              const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                              router.push(`/admin/rekapan-mcu?tab=mini_mcu&status=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                            }
                          }}
                        >
                          {statusFitKlinikData.map((e, idx) => (
                            <Cell key={`cell-sfk-${idx}`} fill={e.color} cursor="pointer" />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                        <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* AI Insight Khusus Chart 4 (Status Kebugaran - MCU & Inhouse Clinic) */}
            <ChartAiInsight
              chartType="status_kebugaran"
              chartTitle="Status Kebugaran (MCU & Inhouse Clinic)"
              data={{
                admin: statusFitAdminData,
                klinik: statusFitKlinikData,
                fit: fitSehatCount,
                catatan: fitCatatanCount,
                tidakFit: followUpCount,
              }}
              className="mt-3"
            />
          </div>
        </div>

        {/* CHART GRID ROW 3: Penyakit Per Entitas (Horizontal Bar Charts) */}
        <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Penyakit Per Entitas</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Visualisasi distribusi penyakit hasil temuan hasil pemeriksaan kesehatan per entitas perusahaan
                </p>
              </div>
            </div>

            {/* Disease Filter Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Search */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder="Cari nama penyakit..."
                  value={searchNamaDiag}
                  onChange={(e) => setSearchNamaDiag(e.target.value)}
                  className="w-40 sm:w-48 bg-slate-100 text-[11px] font-semibold text-slate-800 placeholder-slate-400 pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 outline-none focus:border-amber-600 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              </div>

              {/* Limit */}
              <div className="relative">
                <select
                  value={filterLimitDiag}
                  onChange={(e) => setFilterLimitDiag(e.target.value)}
                  className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                >
                  <option value="all">Semua Penyakit</option>
                  <option value="top1">Top 1 Penyakit</option>
                  <option value="top3">Top 3 Penyakit</option>
                  <option value="top5">Top 5 Penyakit</option>
                  <option value="top10">Top 10 Penyakit</option>
                  <option value="top20">Top 20 Penyakit</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Entitas */}
              <div className="relative">
                <select
                  value={filterEntitasDiag}
                  onChange={(e) => setFilterEntitasDiag(e.target.value)}
                  className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                >
                  <option value="all">Semua Entitas</option>
                  {Object.entries(defaultEntitiesMap).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Divisi */}
              <div className="relative">
                <select
                  value={filterDivisiDiag}
                  onChange={(e) => setFilterDivisiDiag(e.target.value)}
                  className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                >
                  <option value="all">Semua Divisi</option>
                  {availableDivisiList.map((div) => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Ekspor Excel Chart 5 (Penyakit) */}
              <button
                type="button"
                onClick={() => handleExportSingleChart('penyakit')}
                disabled={exportingChartId !== null}
                className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                title="Ekspor Grafik & Data Penyakit dalam 1 Sheet Excel"
              >
                {exportingChartId === 'penyakit' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-200 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                )}
                <span>{exportingChartId === 'penyakit' ? 'Mengekspor...' : 'Ekspor Excel'}</span>
              </button>
            </div>
          </div>

          {/* 2 Side-by-Side Horizontal Bar Charts with Scrollable Containers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Sub-Card 1: Penyakit MCU Admin */}
            <div className="flex flex-col bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h3 className="text-xs font-extrabold text-blue-950 uppercase tracking-wider">Distribusi Penyakit MCU</h3>
                </div>
                {chartDiagnosaAdminData.length > 6 && (
                  <span className="text-[10px] font-semibold text-slate-400">
                    ↕ Scroll ke bawah ({chartDiagnosaAdminData.length} penyakit)
                  </span>
                )}
              </div>
              <div className={`w-full transition-all duration-300 ${chartDiagnosaAdminData.length > 7 ? 'max-h-[460px] overflow-y-auto pr-2' : ''}`}>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(288, chartDiagnosaAdminData.length * 36)}px`,
                  }}
                >
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartDiagnosaAdminData}
                        layout="vertical"
                        margin={{ top: 10, right: 45, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 10, fill: '#1e293b', fontWeight: 600 }}
                          width={140}
                          tickFormatter={(val) => (val && val.length > 22 ? `${val.substring(0, 20)}..` : val)}
                        />
                        <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                        <Bar
                          dataKey="count"
                          name="Jumlah Kasus"
                          fill="#2563eb"
                          radius={[0, 6, 6, 0]}
                          maxBarSize={22}
                          cursor="pointer"
                          onClick={(entry) => {
                            if (entry && entry.name && !entry.name.includes('Belum Ada')) {
                              const deptParam = filterEntitasDiag !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasDiag)}` : '';
                              const divParam = filterDivisiDiag !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiDiag)}` : '';
                              const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                              router.push(`/admin/rekapan-mcu?tab=mcu&search=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                            }
                          }}
                        >
                          <LabelList
                            dataKey="count"
                            position="right"
                            fill="#1e40af"
                            fontSize={11}
                            fontWeight="bold"
                            offset={6}
                            formatter={(val: any) => (val && Number(val) > 0 ? val : '')}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Sub-Card 2: Penyakit Inhouse Clinic */}
            <div className="flex flex-col bg-teal-50/50 p-4 rounded-2xl border border-teal-200/80 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-teal-200/60 flex-wrap gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <h3 className="text-xs font-extrabold text-teal-950 uppercase tracking-wider">Distribusi Penyakit Inhouse Clinic</h3>
                </div>
                {chartDiagnosaKlinikData.length > 6 && (
                  <span className="text-[10px] font-semibold text-slate-400">
                    ↕ Scroll ke bawah ({chartDiagnosaKlinikData.length} penyakit)
                  </span>
                )}
              </div>
              <div className={`w-full transition-all duration-300 ${chartDiagnosaKlinikData.length > 7 ? 'max-h-[460px] overflow-y-auto pr-2' : ''}`}>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max(288, chartDiagnosaKlinikData.length * 36)}px`,
                  }}
                >
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartDiagnosaKlinikData}
                        layout="vertical"
                        margin={{ top: 10, right: 45, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ccfbf1" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 10, fill: '#0f766e', fontWeight: 600 }}
                          width={140}
                          tickFormatter={(val) => (val && val.length > 22 ? `${val.substring(0, 20)}..` : val)}
                        />
                        <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                        <Bar
                          dataKey="count"
                          name="Jumlah Kasus"
                          fill="#0d9488"
                          radius={[0, 6, 6, 0]}
                          maxBarSize={22}
                          cursor="pointer"
                          onClick={(entry) => {
                            if (entry && entry.name && !entry.name.includes('Belum Ada')) {
                              const deptParam = filterEntitasDiag !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasDiag)}` : '';
                              const divParam = filterDivisiDiag !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiDiag)}` : '';
                              const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                              router.push(`/admin/rekapan-mcu?tab=mini_mcu&search=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                            }
                          }}
                        >
                          <LabelList
                            dataKey="count"
                            position="right"
                            fill="#0f766e"
                            fontSize={11}
                            fontWeight="bold"
                            offset={6}
                            formatter={(val: any) => (val && Number(val) > 0 ? val : '')}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* AI Insight Khusus Chart 5 (Penyakit - MCU & Inhouse Clinic) */}
          <ChartAiInsight
            chartType="penyakit"
            chartTitle="Pola Diagnosa & Temuan Penyakit (MCU & Inhouse Clinic)"
            data={{
              mcuList: chartDiagnosaAdminData,
              klinikList: chartDiagnosaKlinikData,
            }}
            className="mt-4"
          />
        </div>

        {/* CHART GRID ROW 4: Kelompok Usia Karyawan (Umur) */}
        <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-800 shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Distribusi Kelompok Usia Karyawan (Umur)</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Demografi kelompok usia (&lt; 25 thn, 25-35 thn, 36-45 thn, 46-55 thn, &gt; 55 thn) per entitas perusahaan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select
                  value={filterEntitasUmur}
                  onChange={(e) => setFilterEntitasUmur(e.target.value)}
                  className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                >
                  <option value="all">Semua Entitas</option>
                  {Object.entries(defaultEntitiesMap).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={filterDivisiUmur}
                  onChange={(e) => setFilterDivisiUmur(e.target.value)}
                  className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                >
                  <option value="all">Semua Divisi</option>
                  {availableDivisiList.map((div) => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Ekspor Excel Chart 6 (Usia) */}
              <button
                type="button"
                onClick={() => handleExportSingleChart('usia')}
                disabled={exportingChartId !== null}
                className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                title="Ekspor Grafik & Data Usia dalam 1 Sheet Excel"
              >
                {exportingChartId === 'usia' ? (
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-200 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                )}
                <span>{exportingChartId === 'usia' ? 'Mengekspor...' : 'Ekspor Excel'}</span>
              </button>
            </div>
          </div>

          <div className="h-80 sm:h-96 w-full relative">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartUmurData} margin={{ top: 28, right: 15, left: -10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Bar
                    dataKey="count"
                    name="Jumlah Karyawan"
                    fill="#8b5cf6"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={48}
                    cursor="pointer"
                    onClick={(entry) => {
                      if (entry && (entry.range || entry.name)) {
                        const deptParam = filterEntitasUmur !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasUmur)}` : '';
                        const divParam = filterDivisiUmur !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiUmur)}` : '';
                        const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                        router.push(`/admin/rekapan-mcu?tab=mcu&umur=${encodeURIComponent(entry.range || entry.name)}${deptParam}${divParam}${bulanParam}`);
                      }
                    }}
                  >
                    <LabelList
                      dataKey="count"
                      position="top"
                      fill="#6d28d9"
                      fontSize={11}
                      fontWeight="bold"
                      offset={4}
                      formatter={(val: any) => (val && Number(val) > 0 ? val : '')}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* AI Insight Khusus Chart 6 (Umur) */}
          <ChartAiInsight
            chartType="umur"
            chartTitle="Distribusi Kelompok Usia Karyawan"
            data={chartUmurData}
            className="mt-4"
          />
        </div>

        {/* CHART GRID ROW 5 & 6: Blood Pressure & High Cholesterol (Side by Side Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Blood Pressure (Tekanan Darah) Card */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-100 text-rose-800 shrink-0">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Blood Pressure (Tekanan Darah)</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Demografi klasifikasi tekanan darah per individu/karyawan (JNC VII Criteria)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <select
                      value={filterEntitasTensi}
                      onChange={(e) => setFilterEntitasTensi(e.target.value)}
                      className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                    >
                      <option value="all">Semua Entitas</option>
                      {Object.entries(defaultEntitiesMap).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Ekspor Excel Chart 7 (Tensi) */}
                  <button
                    type="button"
                    onClick={() => handleExportSingleChart('tensi')}
                    disabled={exportingChartId !== null}
                    className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                    title="Ekspor Grafik & Data Tekanan Darah dalam 1 Sheet Excel"
                  >
                    {exportingChartId === 'tensi' ? (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-200 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                    )}
                    <span>{exportingChartId === 'tensi' ? 'Mengekspor...' : 'Ekspor Excel'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center justify-center pt-1">
                {/* Donut Chart 1: MCU Admin */}
                <div className="flex flex-col items-center justify-center bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <h3 className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider">Tekanan Darah MCU RS</h3>
                  </div>
                  <div className="h-56 w-full relative">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartTensiAdminData}
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={60}
                            dataKey="value"
                            label={renderCustomizedPieLabel}
                            labelLine={false}
                            cursor="pointer"
                            onClick={(entry) => {
                              if (entry && entry.name) {
                                const deptParam = filterEntitasTensi !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasTensi)}` : '';
                                const divParam = filterDivisiTensi !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiTensi)}` : '';
                                const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                                router.push(`/admin/rekapan-mcu?tab=mcu&tensi=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                              }
                            }}
                          >
                            {chartTensiAdminData.map((e, idx) => (
                              <Cell key={`cell-tpa-${idx}`} fill={e.color} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                          <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Donut Chart 2: Inhouse Clinic */}
                <div className="flex flex-col items-center justify-center bg-teal-50/50 p-3 rounded-2xl border border-teal-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-teal-600" />
                    <h3 className="text-[11px] font-extrabold text-teal-950 uppercase tracking-wider">Tekanan Darah Inhouse Clinic</h3>
                  </div>
                  <div className="h-56 w-full relative">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartTensiKlinikData}
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={60}
                            dataKey="value"
                            label={renderCustomizedPieLabel}
                            labelLine={false}
                            cursor="pointer"
                            onClick={(entry) => {
                              if (entry && entry.name) {
                                const deptParam = filterEntitasTensi !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasTensi)}` : '';
                                const divParam = filterDivisiTensi !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiTensi)}` : '';
                                const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                                router.push(`/admin/rekapan-mcu?tab=mini_mcu&tensi=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                              }
                            }}
                          >
                            {chartTensiKlinikData.map((e, idx) => (
                              <Cell key={`cell-tpk-${idx}`} fill={e.color} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                          <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* JNC VII Medical Explanation Box (Bahasa Indonesia) */}
            <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-2.5 mt-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Info className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Klasifikasi Tekanan Darah JNC VII &amp; Catatan Risiko Medis:</span>
              </div>
              <ul className="space-y-1.5 font-medium text-slate-700">
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <span><strong className="text-emerald-700">Normal</strong>: Sistolik &lt; 120 mmHg dan Diastolik &lt; 80 mmHg</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                  <span><strong className="text-amber-700">Pra-Hipertensi</strong>: Sistolik 120 - 139 mmHg atau Diastolik 80 - 89 mmHg</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <span><strong className="text-rose-700">Hipertensi Derajat 1 &amp; 2</strong>: Sistolik &ge; 140 mmHg atau Diastolik &ge; 90 mmHg</span>
                </li>
              </ul>
            </div>

            {/* AI Insight Khusus Chart 7 (Tensi - MCU & Inhouse Clinic) */}
            <ChartAiInsight
              chartType="tensi"
              chartTitle="Profil Tekanan Darah (MCU & Inhouse Clinic)"
              data={{
                admin: chartTensiAdminData,
                klinik: chartTensiKlinikData,
                hipertensi: chartTensiAdminData.find((t) => t.name.startsWith('Hipertensi'))?.value || 0,
                praHipertensi: chartTensiAdminData.find((t) => t.name.includes('Pra-Hipertensi'))?.value || 0,
                normal: chartTensiAdminData.find((t) => t.name.includes('Normal'))?.value || 0,
              }}
              className="mt-3"
            />
          </div>

          {/* High Cholesterol (Profil Kolesterol) Card */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                    <HeartPulse className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Profil Kolesterol (High Cholesterol)</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Demografi klasifikasi risiko kolesterol (Risiko Tinggi, Risiko Sedang, Risiko Rendah) per individu/karyawan
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <select
                      value={filterEntitasKolesterol}
                      onChange={(e) => setFilterEntitasKolesterol(e.target.value)}
                      className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                    >
                      <option value="all">Semua Entitas</option>
                      {Object.entries(defaultEntitiesMap).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Ekspor Excel Chart 8 (Kolesterol) */}
                  <button
                    type="button"
                    onClick={() => handleExportSingleChart('kolesterol')}
                    disabled={exportingChartId !== null}
                    className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                    title="Ekspor Grafik & Data Kolesterol dalam 1 Sheet Excel"
                  >
                    {exportingChartId === 'kolesterol' ? (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-200 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                    )}
                    <span>{exportingChartId === 'kolesterol' ? 'Mengekspor...' : 'Ekspor Excel'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center justify-center pt-1">
                {/* Donut Chart 1: MCU Admin */}
                <div className="flex flex-col items-center justify-center bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <h3 className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider">Kolesterol MCU RS</h3>
                  </div>
                  <div className="h-56 w-full relative">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartKolesterolAdminData}
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={60}
                            dataKey="value"
                            label={renderCustomizedPieLabel}
                            labelLine={false}
                            cursor="pointer"
                            onClick={(entry) => {
                              if (entry && entry.name) {
                                const deptParam = filterEntitasKolesterol !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasKolesterol)}` : '';
                                const divParam = filterDivisiKolesterol !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiKolesterol)}` : '';
                                const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                                router.push(`/admin/rekapan-mcu?tab=mcu&kolesterol=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                              }
                            }}
                          >
                            {chartKolesterolAdminData.map((e, idx) => (
                              <Cell key={`cell-chola-${idx}`} fill={e.color} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                          <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Donut Chart 2: Inhouse Clinic */}
                <div className="flex flex-col items-center justify-center bg-teal-50/50 p-3 rounded-2xl border border-teal-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-teal-600" />
                    <h3 className="text-[11px] font-extrabold text-teal-950 uppercase tracking-wider">Kolesterol Inhouse Clinic</h3>
                  </div>
                  <div className="h-56 w-full relative">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartKolesterolKlinikData}
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={60}
                            dataKey="value"
                            label={renderCustomizedPieLabel}
                            labelLine={false}
                            cursor="pointer"
                            onClick={(entry) => {
                              if (entry && entry.name) {
                                const deptParam = filterEntitasKolesterol !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasKolesterol)}` : '';
                                const divParam = filterDivisiKolesterol !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiKolesterol)}` : '';
                                const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                                router.push(`/admin/rekapan-mcu?tab=mini_mcu&kolesterol=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                              }
                            }}
                          >
                            {chartKolesterolKlinikData.map((e, idx) => (
                              <Cell key={`cell-cholk-${idx}`} fill={e.color} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                          <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* High Cholesterol Risk Explanation Box (Bahasa Indonesia) */}
            <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-2.5 mt-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Penilaian Risiko Profil Kolesterol:</span>
              </div>
              <ul className="space-y-1.5 font-medium text-slate-700">
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <span><strong className="text-rose-700">Risiko Tinggi (&ge; 240)</strong>: Kolesterol Total &ge; 240 mg/dL atau indikasi Hiperkolesterolemia</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                  <span><strong className="text-amber-700">Risiko Sedang (200 - 239)</strong>: Kolesterol Total 200 - 239 mg/dL</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <span><strong className="text-emerald-700">Risiko Rendah (&lt; 200)</strong>: Kolesterol Total &lt; 200 mg/dL (Normal)</span>
                </li>
              </ul>
            </div>

            {/* AI Insight Khusus Chart 8 (Kolesterol - MCU & Inhouse Clinic) */}
            <ChartAiInsight
              chartType="kolesterol"
              chartTitle="Profil Kadar Kolesterol (MCU & Inhouse Clinic)"
              data={{
                admin: chartKolesterolAdminData,
                klinik: chartKolesterolKlinikData,
                tinggi: chartKolesterolAdminData.find((k) => k.name.includes('Tinggi'))?.value || 0,
                ambangBatas: chartKolesterolAdminData.find((k) => k.name.includes('Sedang') || k.name.includes('Ambang'))?.value || 0,
                normal: chartKolesterolAdminData.find((k) => k.name.includes('Rendah') || k.name.includes('Normal'))?.value || 0,
              }}
              className="mt-3"
            />
          </div>
        </div>

        {/* CHART GRID ROW 7 & 8: Kadar Gula Darah & Status BMI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Kadar Gula Darah (Blood Glucose) Card */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-100 text-purple-800 shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Kadar Gula Darah (Blood Glucose)</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Demografi klasifikasi kadar gula darah (Diabetes, Prediabetes, Normal) per individu/karyawan (ADA Criteria)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <select
                      value={filterEntitasGula}
                      onChange={(e) => setFilterEntitasGula(e.target.value)}
                      className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                    >
                      <option value="all">Semua Entitas</option>
                      {Object.entries(defaultEntitiesMap).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Ekspor Excel Chart 9 (Gula Darah) */}
                  <button
                    type="button"
                    onClick={() => handleExportSingleChart('gula_darah')}
                    disabled={exportingChartId !== null}
                    className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                    title="Ekspor Grafik & Data Gula Darah dalam 1 Sheet Excel"
                  >
                    {exportingChartId === 'gula_darah' ? (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-200 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                    )}
                    <span>{exportingChartId === 'gula_darah' ? 'Mengekspor...' : 'Ekspor Excel'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center justify-center pt-1">
                {/* Donut Chart 1: MCU Admin */}
                <div className="flex flex-col items-center justify-center bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <h3 className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider">Gula Darah MCU RS</h3>
                  </div>
                  <div className="h-56 w-full relative">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartGulaAdminData}
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={60}
                            dataKey="value"
                            label={renderCustomizedPieLabel}
                            labelLine={false}
                            cursor="pointer"
                            onClick={(entry) => {
                              if (entry && entry.name) {
                                const deptParam = filterEntitasGula !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasGula)}` : '';
                                const divParam = filterDivisiGula !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiGula)}` : '';
                                const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                                router.push(`/admin/rekapan-mcu?tab=mcu&gula_darah=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                              }
                            }}
                          >
                            {chartGulaAdminData.map((e, idx) => (
                              <Cell key={`cell-gla-${idx}`} fill={e.color} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                          <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Donut Chart 2: Inhouse Clinic */}
                <div className="flex flex-col items-center justify-center bg-teal-50/50 p-3 rounded-2xl border border-teal-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-teal-600" />
                    <h3 className="text-[11px] font-extrabold text-teal-950 uppercase tracking-wider">Gula Darah Inhouse Clinic</h3>
                  </div>
                  <div className="h-56 w-full relative">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartGulaKlinikData}
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={60}
                            dataKey="value"
                            label={renderCustomizedPieLabel}
                            labelLine={false}
                            cursor="pointer"
                            onClick={(entry) => {
                              if (entry && entry.name) {
                                const deptParam = filterEntitasGula !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasGula)}` : '';
                                const divParam = filterDivisiGula !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiGula)}` : '';
                                const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                                router.push(`/admin/rekapan-mcu?tab=mini_mcu&gula_darah=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                              }
                            }}
                          >
                            {chartGulaKlinikData.map((e, idx) => (
                              <Cell key={`cell-glk-${idx}`} fill={e.color} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                          <Legend verticalAlign="bottom" height={28} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Blood Glucose Explanation Box (Bahasa Indonesia) */}
            <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-2.5 mt-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Info className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Kadar Gula Darah &amp; Catatan Risiko Medis (ADA Criteria):</span>
              </div>
              <ul className="space-y-1.5 font-medium text-slate-700">
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <span><strong className="text-rose-700">Diabetes</strong>: Gula darah puasa &ge; 126 mg/dL</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                  <span><strong className="text-amber-700">Prediabetes</strong>: Gula darah puasa 100 - 125 mg/dL</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <span><strong className="text-emerald-700">Normal</strong>: Gula darah puasa &lt; 100 mg/dL</span>
                </li>
              </ul>
            </div>

            {/* AI Insight Khusus Chart 9 (Gula Darah - MCU & Inhouse Clinic) */}
            <ChartAiInsight
              chartType="gula_darah"
              chartTitle="Skrining Glukosa Darah (MCU & Inhouse Clinic)"
              data={{
                admin: chartGulaAdminData,
                klinik: chartGulaKlinikData,
                diabetes: chartGulaAdminData.find((g) => g.name.startsWith('Diabetes'))?.value || 0,
                prediabetes: chartGulaAdminData.find((g) => g.name.includes('Prediabetes'))?.value || 0,
                normal: chartGulaAdminData.find((g) => g.name.includes('Normal'))?.value || 0,
              }}
              className="mt-3"
            />
          </div>

          {/* Distribusi Status BMI (Indeks Massa Tubuh) Card */}
          <div className="p-5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-100 text-teal-800 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Distribusi Status BMI (Indeks Massa Tubuh)</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      Demografi klasifikasi BMI (Obese, Overweight, Normal, Underweight) per individu/karyawan (WHO Asia-Pacific Criteria)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <select
                      value={filterEntitasBmi}
                      onChange={(e) => setFilterEntitasBmi(e.target.value)}
                      className="appearance-none bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 outline-none cursor-pointer"
                    >
                      <option value="all">Semua Entitas</option>
                      {Object.entries(defaultEntitiesMap).map(([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Ekspor Excel Chart 10 (BMI) */}
                  <button
                    type="button"
                    onClick={() => handleExportSingleChart('bmi')}
                    disabled={exportingChartId !== null}
                    className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-[11px] px-2.5 py-1.5 rounded-lg transition shadow-xs cursor-pointer active:scale-95 disabled:opacity-75 disabled:cursor-wait"
                    title="Ekspor Grafik & Data BMI dalam 1 Sheet Excel"
                  >
                    {exportingChartId === 'bmi' ? (
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-200 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                    )}
                    <span>{exportingChartId === 'bmi' ? 'Mengekspor...' : 'Ekspor Excel'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center justify-center pt-1">
                {/* Donut Chart 1: MCU Admin */}
                <div className="flex flex-col items-center justify-center bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <h3 className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider">BMI MCU Admin</h3>
                  </div>
                  <div className="h-64 w-full relative">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartBmiAdminData}
                            cx="50%"
                            cy="40%"
                            innerRadius={36}
                            outerRadius={60}
                            dataKey="value"
                            label={renderCustomizedPieLabel}
                            labelLine={false}
                            cursor="pointer"
                            onClick={(entry) => {
                              if (entry && entry.name) {
                                const deptParam = filterEntitasBmi !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasBmi)}` : '';
                                const divParam = filterDivisiBmi !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiBmi)}` : '';
                                const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                                router.push(`/admin/rekapan-mcu?tab=mcu&bmi=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                              }
                            }}
                          >
                            {chartBmiAdminData.map((e, idx) => (
                              <Cell key={`cell-bmia-${idx}`} fill={e.color} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                          <Legend verticalAlign="bottom" height={64} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Donut Chart 2: Inhouse Clinic */}
                <div className="flex flex-col items-center justify-center bg-teal-50/50 p-3 rounded-2xl border border-teal-200/80 shadow-2xs">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-teal-600" />
                    <h3 className="text-[11px] font-extrabold text-teal-950 uppercase tracking-wider">BMI Inhouse Clinic</h3>
                  </div>
                  <div className="h-64 w-full relative">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartBmiKlinikData}
                            cx="50%"
                            cy="40%"
                            innerRadius={36}
                            outerRadius={60}
                            dataKey="value"
                            label={renderCustomizedPieLabel}
                            labelLine={false}
                            cursor="pointer"
                            onClick={(entry) => {
                              if (entry && entry.name) {
                                const deptParam = filterEntitasBmi !== 'all' ? `&departemen=${encodeURIComponent(filterEntitasBmi)}` : '';
                                const divParam = filterDivisiBmi !== 'all' ? `&divisi=${encodeURIComponent(filterDivisiBmi)}` : '';
                                const bulanParam = selectedBulan !== 'all' ? `&bulan=${encodeURIComponent(selectedBulan)}` : '';
                                router.push(`/admin/rekapan-mcu?tab=mini_mcu&bmi=${encodeURIComponent(entry.name)}${deptParam}${divParam}${bulanParam}`);
                              }
                            }}
                          >
                            {chartBmiKlinikData.map((e, idx) => (
                              <Cell key={`cell-bmik-${idx}`} fill={e.color} cursor="pointer" />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px' }} />
                          <Legend verticalAlign="bottom" height={64} wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BMI Explanation Box (Bahasa Indonesia) */}
            <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed space-y-2.5 mt-2">
              <div className="flex items-center gap-2 font-bold text-slate-900">
                <Info className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Klasifikasi Indeks Massa Tubuh (Kriteria WHO):</span>
              </div>
              <ul className="space-y-1.5 font-medium text-slate-700">
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                  <span><strong className="text-rose-700">Obesitas (Obese)</strong>: BMI &ge; 27.0 kg/m&sup2;</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                  <span><strong className="text-amber-700">Overweight</strong>: BMI 25.0 - 26.9 kg/m&sup2;</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                  <span><strong className="text-emerald-700">Normal</strong>: BMI 18.5 - 24.9 kg/m&sup2;</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500 mt-1 shrink-0" />
                  <span><strong className="text-sky-700">Underweight</strong>: BMI &lt; 18.5 kg/m&sup2;</span>
                </li>
              </ul>
            </div>

            {/* AI Insight Khusus Chart 10 (BMI - MCU & Inhouse Clinic) */}
            <ChartAiInsight
              chartType="bmi"
              chartTitle="Evaluasi Status BMI (MCU & Inhouse Clinic)"
              data={{
                admin: chartBmiAdminData,
                klinik: chartBmiKlinikData,
                obese: chartBmiAdminData.find((b) => b.name.includes('Obesitas'))?.value || 0,
                overweight: chartBmiAdminData.find((b) => b.name.includes('Overweight'))?.value || 0,
                normal: chartBmiAdminData.find((b) => b.name.includes('Normal'))?.value || 0,
                underweight: chartBmiAdminData.find((b) => b.name.includes('Underweight'))?.value || 0,
              }}
              className="mt-3"
            />
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
