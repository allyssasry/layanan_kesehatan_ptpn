'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { MiniMcuRecord } from '@/types/mcu';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Pill,
  Download,
  BarChart3,
  Stethoscope,
  Activity,
  HeartPulse,
  FileSpreadsheet,
  X,
  ChevronDown,
  AlignLeft,
  Search,
  TrendingUp,
  Eye,
  ExternalLink,
  Calendar,
  FileText,
  Filter,
  Check,
  ArrowRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from 'recharts';
import { MASTER_DIVISI_LIST, normalizeDivisiName, isSameDivisi } from '@/lib/divisiMaster';

// ==========================================
// KONSTANTA & MASTER LIST
// ==========================================
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

const DIVISI_LIST = [
  'Semua Divisi',
  ...MASTER_DIVISI_LIST.map((m) => m.nama),
];

const MONTH_COLOR_PALETTE = [
  { bg: '#7e57c2', border: '#5e35b1' }, // Ungu (Purple)
  { bg: '#06b6d4', border: '#0891b2' }, // Cyan
  { bg: '#1d4ed8', border: '#1e40af' }, // Biru Tua (Blue)
  { bg: '#10b981', border: '#059669' }, // Emerald
  { bg: '#f59e0b', border: '#d97706' }, // Amber
  { bg: '#f43f5e', border: '#e11d48' }, // Rose
  { bg: '#8b5cf6', border: '#7c3aed' }, // Violet
  { bg: '#0284c7', border: '#0369a1' }, // Sky Blue
  { bg: '#14b8a6', border: '#0f766e' }, // Teal
  { bg: '#ec4899', border: '#be185d' }, // Pink
  { bg: '#6366f1', border: '#4338ca' }, // Indigo
  { bg: '#84cc16', border: '#4d7c0f' }, // Lime
];

const TL_COLORS = ['#065f46', '#0284c7', '#7c3aed', '#d97706', '#64748b', '#dc2626', '#059669'];

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

const STANDARD_ENTITIES = [
  { key: 'PTPN 3', name: 'Holding', label: 'Holding', color: '#059669', border: '#047857', bgLight: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { key: 'PTPN 4', name: 'PalmCo', label: 'PalmCo', color: '#2563eb', border: '#1d4ed8', bgLight: 'bg-blue-50 text-blue-800 border-blue-200' },
  { key: 'PTPN 1', name: 'SuppCo', label: 'SuppCo', color: '#0891b2', border: '#0e7490', bgLight: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  { key: 'Magang', name: 'Magang', label: 'Magang', color: '#f59e0b', border: '#d97706', bgLight: 'bg-amber-50 text-amber-800 border-amber-200' },
  { key: 'Penugasan', name: 'Penugasan', label: 'Penugasan', color: '#8b5cf6', border: '#7c3aed', bgLight: 'bg-purple-50 text-purple-800 border-purple-200' },
  { key: 'Non-karyawan', name: 'Non - karyawan', label: 'Non - karyawan', color: '#0d9488', border: '#0f766e', bgLight: 'bg-teal-50 text-teal-800 border-teal-200' },
  { key: 'LPP', name: 'LPP', label: 'LPP', color: '#6366f1', border: '#4338ca', bgLight: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { key: 'Kapitasi', name: 'Kapitasi', label: 'Kapitasi', color: '#0284c7', border: '#0369a1', bgLight: 'bg-sky-50 text-sky-800 border-sky-200' },
  { key: 'BPJS', name: 'BPJS', label: 'BPJS', color: '#0284c7', border: '#0369a1', bgLight: 'bg-sky-50 text-sky-800 border-sky-200' },
  { key: 'FFS', name: 'FFS', label: 'FFS', color: '#ea580c', border: '#c2410c', bgLight: 'bg-orange-50 text-orange-800 border-orange-200' },
  { key: 'Keluarga', name: 'Keluarga', label: 'Keluarga', color: '#e11d48', border: '#be123c', bgLight: 'bg-rose-50 text-rose-800 border-rose-200' },
  { key: 'OB', name: 'OB', label: 'OB', color: '#64748b', border: '#475569', bgLight: 'bg-slate-50 text-slate-800 border-slate-200' },
  { key: 'Lainnya', name: 'Lainnya', label: 'Lainnya', color: '#94a3b8', border: '#64748b', bgLight: 'bg-zinc-50 text-zinc-800 border-zinc-200' },
];

function formatShortMonthName(ym: string): string {
  if (!ym || ym === 'all') return 'Semua';
  const parts = ym.split('-');
  if (parts.length === 2) {
    return INDO_MONTHS[parts[1]] || parts[1];
  }
  return ym;
}

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
    const shortNames: Record<string, string> = {
      '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
      '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Agu',
      '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des',
    };
    const m = shortNames[parts[1]] || parts[1];
    return `${m} ${parts[0]}`;
  }
  return ym;
}

function formatDateIndo(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

function normalizeDiagnosaName(rawDiag?: string | null): string {
  if (!rawDiag) return '';
  const clean = rawDiag.trim();
  const lower = clean.toLowerCase();

  // Map CC to Common Cold
  if (
    lower === 'cc' ||
    lower === 'c.c' ||
    lower === 'c.c.' ||
    lower === 'common cold' ||
    lower.startsWith('cc ') ||
    lower.endsWith(' cc') ||
    lower.includes('(cc)') ||
    lower.includes('common cold')
  ) {
    return 'Common Cold';
  }

  // HT to Hipertensi Primer
  if (lower === 'ht' || lower.startsWith('ht ') || lower.endsWith(' ht') || lower.includes('hipertensi')) {
    return 'Hipertensi Primer (Esensial)';
  }

  // ISPA
  if (lower === 'ispa' || lower.includes('ispa') || lower.includes('saluran pernapasan')) {
    return 'ISPA (Infeksi Saluran Pernapasan)';
  }

  // Dispepsia / Gastritis / Maag
  if (lower.includes('dispepsia') || lower.includes('gastritis') || lower.includes('maag')) {
    return 'Dispepsia / Gastritis';
  }

  // Myalgia / Nyeri Otot
  if (lower.includes('myalgia') || lower.includes('nyeri otot')) {
    return 'Myalgia (Nyeri Otot)';
  }

  // Diabetes
  if (lower === 'dm' || lower.startsWith('dm ') || lower.endsWith(' dm') || lower.includes('diabetes')) {
    return 'Diabetes Melitus Tipe 2';
  }

  // Cephalgia / Sakit Kepala
  if (lower.includes('cephalgia') || lower.includes('sefalgi') || lower.includes('sakit kepala')) {
    return 'Cephalgia (Sakit Kepala Tension)';
  }

  // Faringitis
  if (lower.includes('faringitis') || lower.includes('pharyngitis') || lower.includes('radang tenggorokan')) {
    return 'Faringitis Akut';
  }

  // Dermatitis
  if (lower.includes('dermatitis') || lower.includes('eksim')) {
    return 'Dermatitis Kontak';
  }

  return clean;
}

// Fallback Master Medicines if table is empty
const DEFAULT_MASTER_OBAT_LIST = [
  'Paracetamol 500 mg',
  'Amoxicillin 500 mg',
  'Antasida Doen',
  'Cetirizine 10 mg',
  'Ibuprofen 400 mg',
  'Ciprofloxacin 500 mg',
  'Omeprazole 20 mg',
  'Asam Mefenamat 500 mg',
  'Dexamethasone 0.5 mg',
  'Vitamin C 500 mg',
  'Vitamin B Kompleks',
  'Ambroxol 30 mg',
  'CTM (Chlorpheniramine Maleate) 4 mg',
  'Amlodipine 5 mg',
  'Amlodipine 10 mg',
  'Metformin 500 mg',
  'Glimepiride 2 mg',
  'Ranitidine 150 mg',
  'Salbutamol 2 mg',
  'Domperidone 10 mg',
  'Oralit',
  'Betadine Salep / Antiseptik',
  'Paracetamol Sirup',
  'Antasida Suspensi',
  'Loratadine 10 mg',
  'Lansoprazole 30 mg',
  'Allopurinol 100 mg',
];

export default function KlinikDashboardPage() {
  const router = useRouter();
  const { miniMcuRecords, obats } = useMcu();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    document.title = 'Inhouse Clinic Analytics Overview - Layanan Kesehatan PTPN 3';
    setMounted(true);
  }, []);

  // ----------------------------------------------------
  // FILTER STATES
  // ----------------------------------------------------
  const [selectedBulan, setSelectedBulan] = useState('all');

  // Chart 1: Month Range (Dari - Sampai), Year Filter, View Mode
  const [filterEntitasDari, setFilterEntitasDari] = useState('all');
  const [filterEntitasSampai, setFilterEntitasSampai] = useState('all');
  const [filterYearChart1, setFilterYearChart1] = useState<string>('all');
  const [viewModeChart1, setViewModeChart1] = useState<'entity' | 'monthly' | 'table'>('entity');

  // Chart 2: Divisi Filter, Search, Limit, Sort, ViewMode
  const [filterEntitasDivisi, setFilterEntitasDivisi] = useState('all');
  const [searchDivisiQuery, setSearchDivisiQuery] = useState('');
  const [filterLimitDivisi, setFilterLimitDivisi] = useState<'top10' | 'top15' | 'top25' | 'all'>('top15');
  const [sortDivisiOrder, setSortDivisiOrder] = useState<'desc' | 'asc' | 'alpha'>('desc');
  const [viewModeDivisi, setViewModeDivisi] = useState<'horizontal' | 'vertical'>('horizontal');

  // Chart 3: Tindak Lanjut Filter
  const [filterEntitasTL, setFilterEntitasTL] = useState('all');

  // Chart 4: Rujukan Poli Filters
  const [filterEntitasPoli, setFilterEntitasPoli] = useState('all');
  const [filterDivisiPoli, setFilterDivisiPoli] = useState('Semua Divisi');
  const [filterPoliLimit, setFilterPoliLimit] = useState<'all' | 'active'>('all');
  const [viewModePoli, setViewModePoli] = useState<'horizontal' | 'vertical'>('horizontal');

  // Chart 5: Rujukan Dept Filters
  const [filterEntitasRujDept, setFilterEntitasRujDept] = useState('all');
  const [filterDivisiRujDept, setFilterDivisiRujDept] = useState('Semua Divisi');

  // Chart 6: Diagnosa Filter
  const [filterEntitasDiag, setFilterEntitasDiag] = useState('all');

  // Chart 7: Obat Filter
  const [filterEntitasObat, setFilterEntitasObat] = useState('all');

  // ----------------------------------------------------
  // PATIENT DETAILS MODAL STATE
  // ----------------------------------------------------
  const [patientModal, setPatientModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    categoryName: string;
    iconType: 'kunjungan' | 'fit_catatan' | 'tidak_fit' | 'rujukan' | 'obat' | 'entitas' | 'divisi' | 'tindak_lanjut' | 'poli' | 'diagnosa';
    records: MiniMcuRecord[];
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    categoryName: '',
    iconType: 'kunjungan',
    records: [],
  });

  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState<'all' | 'fit' | 'catatan' | 'tidak_fit'>('all');

  const openPatientModal = (params: {
    title: string;
    subtitle?: string;
    categoryName: string;
    iconType: 'kunjungan' | 'fit_catatan' | 'tidak_fit' | 'rujukan' | 'obat' | 'entitas' | 'divisi' | 'tindak_lanjut' | 'poli' | 'diagnosa';
    records: MiniMcuRecord[];
  }) => {
    setModalSearchQuery('');
    setModalStatusFilter('all');
    setPatientModal({
      isOpen: true,
      title: params.title,
      subtitle: params.subtitle || `Menampilkan ${params.records.length} data pasien terdata`,
      categoryName: params.categoryName,
      iconType: params.iconType,
      records: params.records,
    });
  };

  const closePatientModal = () => {
    setPatientModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Filtered records inside modal based on modal search and modal status
  const modalFilteredRecords = useMemo(() => {
    if (!patientModal.isOpen) return [];
    let list = patientModal.records;

    if (modalStatusFilter !== 'all') {
      list = list.filter((r) => {
        const st = (r.status_kebugaran || r.kesimpulan || '').toLowerCase();
        if (modalStatusFilter === 'fit') return st === 'fit' || st === 'fit for duty';
        if (modalStatusFilter === 'catatan') return st.includes('catatan') || st === 'fit_dengan_catatan';
        if (modalStatusFilter === 'tidak_fit') return st.includes('sementara') || st.includes('evaluasi') || st === 'sementara_tidak_fit';
        return true;
      });
    }

    if (modalSearchQuery.trim()) {
      const q = modalSearchQuery.toLowerCase().trim();
      list = list.filter((r) => {
        const nama = (r.nama_lengkap || r.nama_karyawan || '').toLowerCase();
        const nik = (r.nik || '').toLowerCase();
        const div = (r.divisi || '').toLowerCase();
        const dept = (r.departemen || '').toLowerCase();
        const diag = (r.diagnosa || r.diagnosa_klinik || r.keluhan || '').toLowerCase();
        const poli = (r.nama_poli || (r as any).nama_poli_rujukan || '').toLowerCase();
        const tindak = (r.tindak_lanjut || r.tindakan_terapi || '').toLowerCase();
        const obatStr = Array.isArray(r.obat) ? r.obat.join(' ').toLowerCase() : Array.isArray(r.obat_list) ? r.obat_list.join(' ').toLowerCase() : '';
        return (
          nama.includes(q) ||
          nik.includes(q) ||
          div.includes(q) ||
          dept.includes(q) ||
          diag.includes(q) ||
          poli.includes(q) ||
          tindak.includes(q) ||
          obatStr.includes(q)
        );
      });
    }

    return list;
  }, [patientModal.isOpen, patientModal.records, modalSearchQuery, modalStatusFilter]);

  // ----------------------------------------------------
  // ROBUST MULTI-COLUMN EXCEL SPREADSHEET EXPORTER (.XLS)
  // ----------------------------------------------------
  const downloadExcelSpreadsheet = (filename: string, title: string, headers: string[], rows: (string | number)[][]) => {
    const safeFilename = filename.endsWith('.xls') ? filename : `${filename}.xls`;

    const tableHeaders = headers
      .map(
        (h) =>
          `<th style="background-color: #055E38; color: #ffffff; font-weight: bold; border: 1px solid #04482b; padding: 10px 14px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; text-align: center; vertical-align: middle;">${h}</th>`
      )
      .join('');

    const tableRows = rows
      .map(
        (row, rIdx) =>
          `<tr style="background-color: ${rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            ${row
            .map((cell, cIdx) => {
              const cellStr = cell !== null && cell !== undefined ? String(cell) : '-';
              const hName = (headers[cIdx] || '').toLowerCase();
              const isCenter = cIdx === 0 || hName.includes('tanggal') || hName.includes('status') || hName.includes('jenis kelamin') || hName.includes('laki') || hName.includes('perempuan') || hName.includes('persentase');
              const isNikOrId = hName.includes('nik') || hName === 'no';
              return `<td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #1e293b; ${isCenter ? 'text-align: center;' : 'text-align: left;'
                } ${isNikOrId ? "mso-number-format:'\\@';" : ''}">${cellStr
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')}</td>`;
            })
            .join('')}
          </tr>`
      )
      .join('\n');

    const excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>${title.substring(0, 31).replace(/[/\\?*:[\]]/g, '_')}</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        </head>
        <body>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
            <tr>
              <td colspan="${headers.length}" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14pt; font-weight: bold; color: #055E38; padding: 10px 0;">
                ${title} - Layanan Kesehatan PTPN
              </td>
            </tr>
            <tr>
              <td colspan="${headers.length}" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; color: #64748b; padding-bottom: 12px;">
                Tanggal Unduh: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} • Total: ${rows.length} Baris Data
              </td>
            </tr>
          </table>
          <table style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export specifically for records currently in modal
  const handleExportModalExcel = () => {
    if (!patientModal.records || patientModal.records.length === 0) return;
    const timestamp = new Date().toISOString().substring(0, 10);
    const safeTitle = patientModal.title.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `Daftar_Pasien_${safeTitle}_${timestamp}.xls`;

    const headers = [
      'No',
      'Tanggal Pemeriksaan',
      'NIK',
      'Nama Karyawan',
      'Jenis Kelamin',
      'Entitas',
      'Divisi',
      'Jabatan',
      'Keluhan & Diagnosa',
      'Tindak Lanjut / Poli Rujukan',
      'Terapi Obat',
      'Status Kebugaran',
    ];

    const recordsToExport = modalFilteredRecords.length > 0 ? modalFilteredRecords : patientModal.records;

    const rows = recordsToExport.map((r, idx) => {
      const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '-';
      const nama = r.nama_lengkap || r.nama_karyawan || '-';
      const jk = r.jenis_kelamin || r.gender || '-';
      const entitas = r.departemen || (r as any).entitas || 'PTPN 3';
      const div = r.divisi || '-';
      const jab = r.jabatan || '-';
      const diag = r.diagnosa || r.diagnosa_klinik || r.keluhan || '-';
      const poli = r.nama_poli || (r as any).nama_poli_rujukan || '';
      const tl = r.tindak_lanjut || r.tindakan_terapi || '-';
      const tlCombined = poli ? `${tl} (Poli: ${poli})` : tl;
      const obat = Array.isArray(r.obat) ? r.obat.join('; ') : Array.isArray(r.obat_list) ? r.obat_list.join('; ') : '-';
      const rawStatus = (r.status_kebugaran || r.kesimpulan || '').toLowerCase();
      let status = 'Fit';
      if (rawStatus.includes('catatan') || rawStatus === 'fit_dengan_catatan') {
        status = 'Fit dengan Catatan';
      } else if (rawStatus.includes('sementara') || rawStatus.includes('evaluasi') || rawStatus === 'sementara_tidak_fit') {
        status = 'Sementara Tidak Fit';
      }

      return [
        idx + 1,
        tgl,
        r.nik || '-',
        nama,
        jk,
        entitas,
        div,
        jab,
        diag,
        tlCombined,
        obat,
        status,
      ];
    });

    downloadExcelSpreadsheet(filename, patientModal.title, headers, rows);
  };

  // ----------------------------------------------------
  // HELPER MATCHER
  // ----------------------------------------------------
  const getEntityCategory = (departemen: string | undefined | null, divisi?: string | null): string => {
    const d = (departemen || '').toLowerCase().trim();
    const div = (divisi || '').toLowerCase().trim();

    if (d.includes('ptpn 3') || d.includes('ptpn3') || d.includes('holding') || d === '3' || d === 'iii') return 'PTPN 3';
    if (d.includes('ptpn 4') || d.includes('ptpn4') || d.includes('palmco') || d === '4' || d === 'iv') return 'PTPN 4';
    if (d.includes('ptpn 1') || d.includes('ptpn1') || d.includes('suppco') || d === '1' || d === 'i') return 'PTPN 1';
    if (d.includes('lpp')) return 'LPP';
    if (d.includes('non') || d.includes('non-karyawan') || d.includes('non karyawan')) return 'Non-karyawan';
    if (d.includes('kapitasi')) return 'Kapitasi';
    if (d.includes('bpjs')) return 'BPJS';
    if (d.includes('magang') || d.includes('intern')) return 'Magang';
    if (d.includes('ffs')) return 'FFS';
    if (d.includes('keluarga')) return 'Keluarga';
    if (d.includes('ob') || d.includes('office boy') || d.includes('outsourcing')) return 'OB';
    if (d.includes('tugas') || d.includes('penugasan')) return 'Penugasan';

    if (div.includes('ptpn 3') || div.includes('ptpn3') || div.includes('holding')) return 'PTPN 3';
    if (div.includes('ptpn 4') || div.includes('ptpn4') || div.includes('palmco')) return 'PTPN 4';
    if (div.includes('ptpn 1') || div.includes('ptpn1') || div.includes('suppco')) return 'PTPN 1';
    if (div.includes('lpp')) return 'LPP';

    return 'Lainnya';
  };

  const matchEntity = (departemen: string | undefined | null, targetEntity: string, divisi?: string | null) => {
    if (!targetEntity || targetEntity === 'all') return true;
    const category = getEntityCategory(departemen, divisi);
    if (targetEntity.toLowerCase() === category.toLowerCase()) return true;

    const d = (departemen || '').toLowerCase().trim();
    const t = targetEntity.toLowerCase().trim();
    if (t === 'ptpn 1' || t === 'suppco') return category === 'PTPN 1' || d.includes('ptpn 1') || d.includes('ptpn1') || d.includes('suppco');
    if (t === 'ptpn 3' || t === 'holding') return category === 'PTPN 3' || d.includes('ptpn 3') || d.includes('ptpn3') || d.includes('holding');
    if (t === 'ptpn 4' || t === 'palmco') return category === 'PTPN 4' || d.includes('ptpn 4') || d.includes('palmco');
    if (t === 'lpp') return category === 'LPP' || d.includes('lpp');
    if (t === 'non-karyawan' || t === 'non - karyawan') return category === 'Non-karyawan' || d.includes('non') || d.includes('kapitasi');
    if (t === 'kapitasi') return category === 'Kapitasi' || d.includes('kapitasi');
    if (t === 'bpjs') return category === 'BPJS' || d.includes('bpjs');
    if (t === 'magang') return category === 'Magang' || d.includes('magang');
    if (t === 'penugasan') return category === 'Penugasan' || d.includes('penugasan');
    if (t === 'ob') return category === 'OB' || d.includes('ob');
    if (t === 'keluarga') return category === 'Keluarga' || d.includes('keluarga');
    if (t === 'ffs') return category === 'FFS' || d.includes('ffs');
    return category === targetEntity || d === t || d.includes(t);
  };

  // ----------------------------------------------------
  // AVAILABLE MONTHS & YEARS CALCULATION
  // ----------------------------------------------------
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();

    miniMcuRecords.forEach((rec) => {
      const tgl = rec.tanggal_pemeriksaan || rec.tanggal_kunjungan || '';
      if (tgl && tgl.length >= 7) {
        monthSet.add(tgl.substring(0, 7));
      }
    });

    if (monthSet.size === 0) {
      const now = new Date();
      const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(currentYM);
    }

    return Array.from(monthSet).sort().reverse();
  }, [miniMcuRecords]);

  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    availableMonths.forEach((ym) => {
      const yr = ym.substring(0, 4);
      if (yr) yearSet.add(yr);
    });
    if (yearSet.size === 0) yearSet.add(String(new Date().getFullYear()));
    return Array.from(yearSet).sort().reverse();
  }, [availableMonths]);

  // Filtered records by Global Period Selector
  const filteredRecords = useMemo(() => {
    return miniMcuRecords.filter((rec) => {
      const tgl = rec.tanggal_pemeriksaan || rec.tanggal_kunjungan || '';
      if (selectedBulan === 'current') {
        const cur = new Date().toISOString().substring(0, 7);
        return tgl.startsWith(cur);
      } else if (selectedBulan !== 'all' && tgl) {
        return tgl.startsWith(selectedBulan);
      }
      return true;
    });
  }, [miniMcuRecords, selectedBulan]);

  // ----------------------------------------------------
  // NAVIGATION HANDLER TO REKAPAN
  // ----------------------------------------------------
  const handleNavigateRekapan = (categoryOrSearch?: string) => {
    let url = '/klinik/rekapan-mini-mcu';
    const params = new URLSearchParams();

    if (categoryOrSearch && categoryOrSearch.trim()) {
      let term = categoryOrSearch.trim();
      // Remove prefixes so search matches database columns accurately
      if (term.toLowerCase().startsWith('diagnosa ')) term = term.substring(9).trim();
      if (term.toLowerCase().startsWith('divisi ')) term = term.substring(7).trim();
      if (term.toLowerCase().startsWith('rujukan ')) term = term.substring(8).trim();
      if (term.toLowerCase().startsWith('terapi obat ')) term = term.substring(12).trim();
      if (term.toLowerCase().startsWith('penggunaan obat ')) term = term.substring(16).trim();
      if (term.toLowerCase().startsWith('semua ')) term = '';

      if (term.includes(' - ')) {
        const parts = term.split(' - ');
        term = parts[0].trim();
      }

      if (term) {
        params.set('search', term);
      }
    }

    if (modalSearchQuery && modalSearchQuery.trim()) {
      params.set('search', modalSearchQuery.trim());
    }

    if (modalStatusFilter && modalStatusFilter !== 'all') {
      if (modalStatusFilter === 'catatan') params.set('status', 'fit_dengan_catatan');
      else if (modalStatusFilter === 'tidak_fit') params.set('status', 'sementara_tidak_fit');
      else if (modalStatusFilter === 'fit') params.set('status', 'fit');
    }

    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;

    closePatientModal();
    router.push(url);
  };

  // ----------------------------------------------------
  // SUMMARY METRICS (5 Key Cards)
  // ----------------------------------------------------
  const totalKunjungan = filteredRecords.length;

  const fitCatatanRecords = useMemo(() => {
    return filteredRecords.filter(
      (r) =>
        r.kesimpulan === 'fit_dengan_catatan' ||
        r.status_kebugaran === 'Fit dengan Catatan' ||
        (r.kesimpulan && String(r.kesimpulan).toLowerCase().includes('catatan'))
    );
  }, [filteredRecords]);

  const fitCatatan = fitCatatanRecords.length;

  const followUpRecords = useMemo(() => {
    return filteredRecords.filter(
      (r) =>
        r.kesimpulan === 'sementara_tidak_fit' ||
        r.status_kebugaran === 'Sementara Tidak Fit' ||
        r.status_kebugaran === 'Perlu Evaluasi' ||
        (r.kesimpulan && String(r.kesimpulan).toLowerCase().includes('sementara'))
    );
  }, [filteredRecords]);

  const followUp = followUpRecords.length;

  const totalRujukanRecords = useMemo(() => {
    return filteredRecords.filter(
      (r) =>
        r.file_rujukan ||
        (r.tindak_lanjut && r.tindak_lanjut.toLowerCase().includes('rujuk')) ||
        (r.tindakan_terapi && r.tindakan_terapi.toLowerCase().includes('rujuk')) ||
        r.nama_poli
    );
  }, [filteredRecords]);

  const totalRujukan = totalRujukanRecords.length;

  const totalObatRecords = useMemo(() => {
    const list = filteredRecords.filter(
      (r) =>
        (r.obat && r.obat.length > 0) ||
        (r.obat_list && r.obat_list.length > 0) ||
        (r.tindakan_terapi && (r.tindakan_terapi.toLowerCase().includes('obat') || r.tindakan_terapi.toLowerCase().includes('resep'))) ||
        (r.tindak_lanjut && (r.tindak_lanjut.toLowerCase().includes('obat') || r.tindak_lanjut.toLowerCase().includes('resep') || r.tindak_lanjut.toLowerCase().includes('rawat jalan')))
    );
    return list.length > 0 ? list : filteredRecords;
  }, [filteredRecords]);

  const totalObat = totalObatRecords.length;

  const totalMasterObat = obats.length > 0 ? obats.length : DEFAULT_MASTER_OBAT_LIST.length;

  // ----------------------------------------------------
  // GENDER STATS HELPER
  // ----------------------------------------------------
  const getGenderStats = (recs: typeof miniMcuRecords) => {
    const laki = recs.filter(
      (r) =>
        r.jenis_kelamin?.toLowerCase() === 'laki-laki' ||
        r.jenis_kelamin?.toLowerCase() === 'l' ||
        r.gender?.toLowerCase() === 'laki-laki' ||
        r.gender?.toLowerCase() === 'l'
    ).length;
    const perempuan = recs.length - laki;
    const total = recs.length;
    const pctL = total > 0 ? ((laki / total) * 100).toFixed(1) : '0.0';
    const pctP = total > 0 ? ((perempuan / total) * 100).toFixed(1) : '0.0';
    return { total, laki, perempuan, pctL, pctP };
  };

  // ----------------------------------------------------
  // 1. DATA CHART 1: Kunjungan Berdasarkan Entitas & Tren Bulanan
  // ----------------------------------------------------
  const chart1Months = useMemo(() => {
    let start = filterEntitasDari;
    let end = filterEntitasSampai;
    if (start !== 'all' && end !== 'all' && start > end) {
      const temp = start;
      start = end;
      end = temp;
    }

    let allM = [...availableMonths].sort(); // Earliest to latest (Jan -> Des)

    if (filterYearChart1 !== 'all') {
      allM = allM.filter((ym) => ym.startsWith(filterYearChart1));
    }

    if (start !== 'all' || end !== 'all') {
      allM = allM.filter((ym) => {
        const matchStart = start === 'all' || ym >= start;
        const matchEnd = end === 'all' || ym <= end;
        return matchStart && matchEnd;
      });
    }

    return allM.length > 0 ? allM : [...availableMonths].sort();
  }, [availableMonths, filterYearChart1, filterEntitasDari, filterEntitasSampai]);

  const chart1HasMultipleYears = useMemo(() => {
    const years = new Set(chart1Months.map((m) => m.substring(0, 4)));
    return years.size > 1;
  }, [chart1Months]);

  // Monthly trend data (Jan, Feb, Mar...) with breakdown per entity
  const chart1MonthlyData = useMemo(() => {
    return chart1Months.map((ym) => {
      const monthRecs = miniMcuRecords.filter((r) => {
        const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
        return tgl.startsWith(ym);
      });

      const rowObj: Record<string, any> = {
        ym,
        monthLabel: formatMonthYearLabel(ym),
        shortLabel: formatShortMonthYear(ym),
        total: monthRecs.length,
        records: monthRecs,
      };

      STANDARD_ENTITIES.forEach((ent) => {
        const entRecs = monthRecs.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent.key, r.divisi));
        rowObj[ent.key] = entRecs.length;
        rowObj[`${ent.key}_records`] = entRecs;
      });

      return rowObj;
    });
  }, [miniMcuRecords, chart1Months]);

  // Entity total breakdown and grouped months data in the filtered period
  const chart1EntityData = useMemo(() => {
    const filteredInPeriod = miniMcuRecords.filter((r) => {
      const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
      if (!tgl || tgl.length < 7) return false;
      return chart1Months.includes(tgl.substring(0, 7));
    });

    const entries = STANDARD_ENTITIES.map((ent) => {
      const entRecs = filteredInPeriod.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent.key, r.divisi));
      const stats = getGenderStats(entRecs);

      const rowObj: Record<string, any> = {
        entity: ent.key,
        name: ent.name,
        label: ent.label,
        color: ent.color,
        border: ent.border,
        total: stats.total,
        count: stats.total,
        laki: stats.laki,
        perempuan: stats.perempuan,
        pctL: stats.pctL,
        pctP: stats.pctP,
        records: entRecs,
      };

      // Breakdown count and records per month
      chart1Months.forEach((ym) => {
        const mRecs = entRecs.filter((r) => {
          const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
          return tgl.startsWith(ym);
        });
        rowObj[ym] = mRecs.length;
        rowObj[`${ym}_records`] = mRecs;
      });

      return rowObj;
    });

    const mainVisibleLabels = ['Holding', 'PalmCo', 'SuppCo', 'Magang', 'Penugasan', 'Non - karyawan', 'LPP'];
    return entries.filter((item) => item.total > 0 || mainVisibleLabels.includes(item.label));
  }, [miniMcuRecords, chart1Months]);

  // Matrix table data (Rows: Entities, Cols: Months)
  const chart1MatrixData = useMemo(() => {
    const rows = STANDARD_ENTITIES.map((ent) => {
      let totalEnt = 0;
      const monthCounts: Record<string, { count: number; records: typeof miniMcuRecords }> = {};

      chart1Months.forEach((ym) => {
        const mRecs = miniMcuRecords.filter((r) => {
          const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
          return tgl.startsWith(ym) && matchEntity(r.departemen || (r as any).entitas, ent.key, r.divisi);
        });
        monthCounts[ym] = { count: mRecs.length, records: mRecs };
        totalEnt += mRecs.length;
      });

      const allEntRecs = miniMcuRecords.filter((r) => {
        const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
        return tgl && chart1Months.includes(tgl.substring(0, 7)) && matchEntity(r.departemen || (r as any).entitas, ent.key, r.divisi);
      });

      return {
        entity: ent.key,
        label: ent.label,
        color: ent.color,
        monthCounts,
        total: totalEnt,
        records: allEntRecs,
      };
    }).filter((r) => r.total > 0);

    const monthlyTotals: Record<string, { total: number; records: typeof miniMcuRecords }> = {};
    let grandTotal = 0;
    chart1Months.forEach((ym) => {
      const mRecs = miniMcuRecords.filter((r) => {
        const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
        return tgl.startsWith(ym);
      });
      monthlyTotals[ym] = { total: mRecs.length, records: mRecs };
      grandTotal += mRecs.length;
    });

    return { rows, monthlyTotals, grandTotal };
  }, [miniMcuRecords, chart1Months]);

  // Chart 1 KPI Summary
  const chart1KPI = useMemo(() => {
    const allRecsInPeriod = miniMcuRecords.filter((r) => {
      const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
      return tgl && chart1Months.includes(tgl.substring(0, 7));
    });
    const totalVisits = allRecsInPeriod.length;

    const sortedMonths = [...chart1MonthlyData].sort((a, b) => b.total - a.total);
    const peakMonth = sortedMonths[0] || null;

    const sortedEntities = [...chart1EntityData].sort((a, b) => b.total - a.total);
    const topEntity = sortedEntities[0] || null;

    const avgPerMonth = chart1MonthlyData.length > 0 ? Math.round(totalVisits / chart1MonthlyData.length).toString() : '0';

    return { totalVisits, peakMonth, topEntity, avgPerMonth };
  }, [miniMcuRecords, chart1Months, chart1MonthlyData, chart1EntityData]);

  // ----------------------------------------------------
  // 2. DATA CHART 2: Kunjungan Per Divisi
  // ----------------------------------------------------
  const rawDivisiList = useMemo(() => {
    let recs = filteredRecords;
    if (filterEntitasDivisi !== 'all') {
      recs = recs.filter((r) => matchEntity(r.departemen || (r as any).entitas, filterEntitasDivisi));
    }

    const map: Record<string, typeof miniMcuRecords> = {};

    recs.forEach((r) => {
      const isEntity = ['ptpn 1', 'ptpn 3', 'ptpn 4', 'ptpn1', 'ptpn3', 'ptpn4', 'holding', 'suppco', 'palmco'].includes((r.divisi || '').toLowerCase().trim());
      let div = (r.divisi || '').trim();
      if (!div || div === '-' || div === '0') {
        div = 'Belum Ditentukan';
      } else {
        const norm = normalizeDivisiName(div);
        if (norm) div = norm;
      }
      if (!isEntity) {
        if (!map[div]) map[div] = [];
        map[div].push(r);
      }
    });

    const entries = Object.entries(map)
      .map(([name, rList]) => {
        const stats = getGenderStats(rList);
        return {
          name,
          fullDivisi: name,
          total: stats.total,
          count: stats.total,
          laki: stats.laki,
          perempuan: stats.perempuan,
          pctL: stats.pctL,
          pctP: stats.pctP,
          records: rList,
        };
      })
      .filter((item) => item.total > 0);

    return entries;
  }, [filteredRecords, filterEntitasDivisi]);

  const divisiStats = useMemo(() => {
    const totalDivisi = rawDivisiList.length;
    const totalKunjunganInDivisi = rawDivisiList.reduce((acc, curr) => acc + curr.total, 0);

    const sorted = [...rawDivisiList].sort((a, b) => b.total - a.total);
    const topDivisi = sorted[0] || null;
    const avgPerDivisi = totalDivisi > 0 ? Math.round(totalKunjunganInDivisi / totalDivisi).toString() : '0';
    return { totalDivisi, totalKunjunganInDivisi, topDivisi, avgPerDivisi };
  }, [rawDivisiList]);

  const chartDivisiData = useMemo(() => {
    if (rawDivisiList.length === 0) {
      return [{ name: 'Belum Ada Data Divisi', fullDivisi: 'Belum Ada Data Divisi', total: 0, count: 0, laki: 0, perempuan: 0, pctL: '0', pctP: '0', records: [] }];
    }

    let filtered = rawDivisiList;
    if (searchDivisiQuery.trim()) {
      const q = searchDivisiQuery.toLowerCase().trim();
      filtered = filtered.filter((d) => d.name.toLowerCase().includes(q));
    }

    const sorted = [...filtered].sort((a, b) => {
      if (sortDivisiOrder === 'desc') return b.total - a.total;
      if (sortDivisiOrder === 'asc') return a.total - b.total;
      return a.name.localeCompare(b.name, 'id');
    });

    if (filterLimitDivisi === 'top10') return sorted.slice(0, 10);
    if (filterLimitDivisi === 'top15') return sorted.slice(0, 15);
    if (filterLimitDivisi === 'top25') return sorted.slice(0, 25);
    return sorted;
  }, [rawDivisiList, searchDivisiQuery, sortDivisiOrder, filterLimitDivisi]);

  // ----------------------------------------------------
  // 3. DATA CHART 3: Tindak Lanjut Pengobatan
  // ----------------------------------------------------
  const chartTLData = useMemo(() => {
    let recs = filteredRecords;
    if (filterEntitasTL !== 'all') {
      recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasTL));
    }

    const buckets: Record<string, typeof miniMcuRecords> = {
      'Rawat Jalan & Obat': [],
      'Rujukan Sp. Penyakit Dalam / RS': [],
      'Istirahat Sakit (Surat Sakit)': [],
      'Konsultasi & Edukasi Medis': [],
      'Tindakan Darurat / P3K': [],
    };

    recs.forEach((r) => {
      const tl = String(r.tindak_lanjut || r.tindakan_terapi || '').toLowerCase();
      if (tl.includes('rujuk') || r.file_rujukan || r.nama_poli) {
        buckets['Rujukan Sp. Penyakit Dalam / RS'].push(r);
      } else if (tl.includes('surat sakit') || tl.includes('istirahat') || r.file_surat_sakit) {
        buckets['Istirahat Sakit (Surat Sakit)'].push(r);
      } else if (tl.includes('konsultasi') || tl.includes('edukasi') || r.konsultasi) {
        buckets['Konsultasi & Edukasi Medis'].push(r);
      } else if (tl.includes('p3k') || tl.includes('darurat') || tl.includes('tindakan')) {
        buckets['Tindakan Darurat / P3K'].push(r);
      } else {
        buckets['Rawat Jalan & Obat'].push(r);
      }
    });

    return Object.entries(buckets).map(([name, rList]) => {
      const stats = getGenderStats(rList);
      return {
        name,
        value: stats.total,
        laki: stats.laki,
        perempuan: stats.perempuan,
        pctL: stats.pctL,
        pctP: stats.pctP,
        records: rList,
      };
    });
  }, [filteredRecords, filterEntitasTL]);

  const totalTLItems = chartTLData.reduce((acc, curr) => acc + curr.value, 0);

  // ----------------------------------------------------
  // 4. DATA CHART 4: Rujukan Berdasarkan Poli Tujuan
  // ----------------------------------------------------
  const rawPoliList = useMemo(() => {
    let recs = filteredRecords.filter((r) => {
      const isRujuk =
        r.file_rujukan ||
        r.nama_poli ||
        (r as any).nama_poli_rujukan ||
        (r.tindak_lanjut && r.tindak_lanjut.toLowerCase().includes('rujuk')) ||
        (r.tindakan_terapi && r.tindakan_terapi.toLowerCase().includes('rujuk'));
      return Boolean(isRujuk);
    });

    if (filterEntitasPoli !== 'all') {
      recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasPoli));
    }
    if (filterDivisiPoli !== 'Semua Divisi') {
      recs = recs.filter((r) => isSameDivisi(r.divisi, filterDivisiPoli));
    }

    const STANDARD_POLI_LIST = [
      'Poli Penyakit Dalam',
      'Poli Jantung & Kardiovaskular',
      'Poli Mata',
      'Poli Gigi & Mulut',
      'Poli Saraf / Neurologi',
      'Poli THT',
      'Poli Orthopedi & Bedah',
      'Poli Paru & Respirasi',
      'Poli Kulit & Kelamin',
      'Poli Kebidanan & Kandungan',
      'Poli Spesialis Lainnya',
    ];

    const poliMap: Record<string, typeof miniMcuRecords> = {};
    STANDARD_POLI_LIST.forEach((p) => {
      poliMap[p] = [];
    });

    recs.forEach((r) => {
      const raw = ((r as any).nama_poli_rujukan || r.nama_poli || '').trim();
      const rawLower = raw.toLowerCase();
      const tl = (r.tindak_lanjut || '').toLowerCase();
      const terapi = (r.tindakan_terapi || '').toLowerCase();
      const diag = (r.diagnosa || r.diagnosa_klinik || '').toLowerCase();
      const combined = `${rawLower} ${tl} ${terapi} ${diag}`;

      let targetPoli = '';
      if (combined.includes('jantung') || combined.includes('kardio')) {
        targetPoli = 'Poli Jantung & Kardiovaskular';
      } else if (combined.includes('mata') || combined.includes('oftalm')) {
        targetPoli = 'Poli Mata';
      } else if (combined.includes('gigi') || combined.includes('mulut') || combined.includes('dental')) {
        targetPoli = 'Poli Gigi & Mulut';
      } else if (combined.includes('saraf') || combined.includes('neuro')) {
        targetPoli = 'Poli Saraf / Neurologi';
      } else if (combined.includes('tht') || combined.includes('telinga') || combined.includes('tenggorokan')) {
        targetPoli = 'Poli THT';
      } else if (combined.includes('ortho') || combined.includes('bedah') || combined.includes('tulang')) {
        targetPoli = 'Poli Orthopedi & Bedah';
      } else if (combined.includes('paru') || combined.includes('respirasi') || combined.includes('pulmo') || combined.includes('ispa')) {
        targetPoli = 'Poli Paru & Respirasi';
      } else if (combined.includes('kulit') || combined.includes('kelamin') || combined.includes('derma')) {
        targetPoli = 'Poli Kulit & Kelamin';
      } else if (combined.includes('obgyn') || combined.includes('kandungan') || combined.includes('kebidanan') || combined.includes('hamil')) {
        targetPoli = 'Poli Kebidanan & Kandungan';
      } else if (combined.includes('dalam') || combined.includes('internis') || combined.includes('gastritis') || combined.includes('diabetes') || combined.includes('hipertensi')) {
        targetPoli = 'Poli Penyakit Dalam';
      } else if (raw && !['inhouse clinic', 'rujukan: inhouse clinic', '-', 'null', 'undefined'].includes(rawLower)) {
        targetPoli = raw.startsWith('Poli') ? raw : `Poli ${raw}`;
      } else {
        targetPoli = 'Poli Penyakit Dalam';
      }

      if (!poliMap[targetPoli]) {
        poliMap[targetPoli] = [];
      }
      poliMap[targetPoli].push(r);
    });

    const entries = Object.entries(poliMap).map(([name, rList]) => {
      const stats = getGenderStats(rList);
      return {
        name,
        fullPoli: name,
        count: stats.total,
        total: stats.total,
        laki: stats.laki,
        perempuan: stats.perempuan,
        pctL: stats.pctL,
        pctP: stats.pctP,
        records: rList,
      };
    });

    return entries;
  }, [filteredRecords, filterEntitasPoli, filterDivisiPoli]);

  const poliStats = useMemo(() => {
    const totalPoli = rawPoliList.length;
    const totalRujukan = rawPoliList.reduce((acc, curr) => acc + curr.count, 0);
    const sorted = [...rawPoliList].sort((a, b) => b.count - a.count);
    const topPoli = sorted.find((p) => p.count > 0) || null;
    return { totalPoli, totalRujukan, topPoli };
  }, [rawPoliList]);

  const chartPoliData = useMemo(() => {
    let list = [...rawPoliList];
    if (filterPoliLimit === 'active') {
      const activeOnly = list.filter((p) => p.count > 0);
      list = activeOnly.length > 0 ? activeOnly : list;
    }
    return list.sort((a, b) => b.count - a.count);
  }, [rawPoliList, filterPoliLimit]);

  // ----------------------------------------------------
  // 5. DATA CHART 5: Rujukan Berdasarkan Entitas
  // ----------------------------------------------------
  const chartRujDeptData = useMemo(() => {
    let recs = filteredRecords.filter(
      (r) =>
        r.file_rujukan ||
        r.nama_poli ||
        (r.tindak_lanjut && r.tindak_lanjut.toLowerCase().includes('rujuk')) ||
        (r.tindakan_terapi && r.tindakan_terapi.toLowerCase().includes('rujuk'))
    );

    if (filterEntitasRujDept !== 'all') {
      recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasRujDept));
    }
    if (filterDivisiRujDept !== 'Semua Divisi') {
      recs = recs.filter((r) => isSameDivisi(r.divisi, filterDivisiRujDept));
    }

    const standardEntities = ['PTPN 3', 'PTPN 4', 'PTPN 1', 'Magang', 'Penugasan', 'OB'];
    return standardEntities.map((ent) => {
      const entRecs = recs.filter((r) => matchEntity(r.departemen, ent));
      const stats = getGenderStats(entRecs);
      return {
        name: ent,
        count: stats.total,
        laki: stats.laki,
        perempuan: stats.perempuan,
        pctL: stats.pctL,
        pctP: stats.pctP,
        records: entRecs,
      };
    });
  }, [filteredRecords, filterEntitasRujDept, filterDivisiRujDept]);

  // ----------------------------------------------------
  // 6. DATA CHART 6: Diagnosa Penyakit Terbanyak
  // ----------------------------------------------------
  const chartDiagData = useMemo(() => {
    let recs = filteredRecords;
    if (filterEntitasDiag !== 'all') {
      recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasDiag));
    }

    const defaultDiag = [
      'Common Cold',
      'ISPA (Infeksi Saluran Pernapasan)',
      'Hipertensi Primer (Esensial)',
      'Dispepsia / Gastritis',
      'Myalgia (Nyeri Otot)',
      'Diabetes Melitus Tipe 2',
      'Cephalgia (Sakit Kepala Tension)',
      'Faringitis Akut',
      'Dermatitis Kontak',
    ];

    const map: Record<string, typeof miniMcuRecords> = {};
    defaultDiag.forEach((d) => {
      map[d] = [];
    });

    recs.forEach((r) => {
      const rawDiag = r.diagnosa || r.diagnosa_klinik || r.keluhan || '';
      if (
        !rawDiag ||
        rawDiag.trim() === '' ||
        rawDiag.trim() === '-' ||
        rawDiag.trim().toLowerCase() === 'tidak memiliki diagnosa' ||
        rawDiag.trim().toLowerCase() === 'tidak memiliki keluhan'
      ) {
        return;
      }

      const diag = normalizeDiagnosaName(rawDiag);
      if (diag) {
        if (!map[diag]) map[diag] = [];
        map[diag].push(r);
      }
    });

    const entries = Object.entries(map).map(([name, rList]) => {
      const stats = getGenderStats(rList);
      return {
        name,
        kasus: stats.total,
        laki: stats.laki,
        perempuan: stats.perempuan,
        pctL: stats.pctL,
        pctP: stats.pctP,
        records: rList,
      };
    });

    entries.sort((a, b) => b.kasus - a.kasus);
    return entries.slice(0, 8);
  }, [filteredRecords, filterEntitasDiag]);

  // ----------------------------------------------------
  // 7. DATA CHART 7: Penggunaan Obat di Klinik
  // ----------------------------------------------------
  const chartObatData = useMemo(() => {
    let recs = filteredRecords;
    if (filterEntitasObat !== 'all') {
      recs = recs.filter((r) => matchEntity(r.departemen, filterEntitasObat));
    }

    const popularMeds = [
      'Paracetamol 500 mg',
      'Amoxicillin 500 mg',
      'Antasida Doen',
      'Cetirizine 10 mg',
      'Ibuprofen 400 mg',
      'Vitamin B Kompleks',
      'Omeprazole 20 mg',
      'Asam Mefenamat 500 mg',
    ];

    const map: Record<string, typeof miniMcuRecords> = {};
    popularMeds.forEach((med) => {
      map[med] = [];
    });

    recs.forEach((r) => {
      const obatList = Array.isArray(r.obat) ? r.obat : Array.isArray(r.obat_list) ? r.obat_list : [];
      const obatStr = (r.tindakan_terapi || '') + ' ' + (r.tindak_lanjut || '') + ' ' + obatList.join(' ');

      popularMeds.forEach((med) => {
        const medKey = med.split(' ')[0].toLowerCase();
        if (obatStr.toLowerCase().includes(medKey)) {
          map[med].push(r);
        }
      });
    });

    const entries = Object.entries(map).map(([name, rList]) => {
      const stats = getGenderStats(rList);
      return {
        name,
        diberikan: stats.total,
        laki: stats.laki,
        perempuan: stats.perempuan,
        pctL: stats.pctL,
        pctP: stats.pctP,
        records: rList,
      };
    });

    entries.sort((a, b) => b.diberikan - a.diberikan);
    return entries.slice(0, 8);
  }, [filteredRecords, filterEntitasObat]);

  // ----------------------------------------------------
  // EXPORT TO EXCEL HANDLER (SEPARATE COLUMNS)
  // ----------------------------------------------------
  const handleExportCSV = (reportType: string) => {
    const timestamp = new Date().toISOString().substring(0, 10);

    if (reportType === 'Global' || reportType === 'Semua Rekap') {
      const headers = [
        'No',
        'Tanggal Pemeriksaan',
        'NIK',
        'Nama Karyawan',
        'Jenis Kelamin',
        'Entitas',
        'Divisi',
        'Jabatan',
        'Keluhan & Diagnosa',
        'Tindak Lanjut / Poli Rujukan',
        'Terapi Obat',
        'Status Kebugaran',
      ];
      const rows = filteredRecords.map((r, idx) => {
        const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '-';
        const nama = r.nama_lengkap || r.nama_karyawan || '-';
        const jk = r.jenis_kelamin || r.gender || '-';
        const entitas = r.departemen || (r as any).entitas || 'PTPN 3';
        const div = r.divisi || '-';
        const jab = r.jabatan || '-';
        const rawDiag = r.diagnosa || r.diagnosa_klinik || r.keluhan || '-';
        const diag = rawDiag !== '-' ? normalizeDiagnosaName(rawDiag) : '-';
        const poli = r.nama_poli || (r as any).nama_poli_rujukan || '';
        const tl = r.tindak_lanjut || r.tindakan_terapi || '-';
        const tlCombined = poli ? `${tl} (Poli: ${poli})` : tl;
        const obat = Array.isArray(r.obat) ? r.obat.join('; ') : Array.isArray(r.obat_list) ? r.obat_list.join('; ') : '-';
        const rawStatus = (r.status_kebugaran || r.kesimpulan || '').toLowerCase();
        let status = 'Fit';
        if (rawStatus.includes('catatan') || rawStatus === 'fit_dengan_catatan') {
          status = 'Fit dengan Catatan';
        } else if (rawStatus.includes('sementara') || rawStatus.includes('evaluasi') || rawStatus === 'sementara_tidak_fit') {
          status = 'Sementara Tidak Fit';
        }
        return [idx + 1, tgl, r.nik || '-', nama, jk, entitas, div, jab, diag, tlCombined, obat, status];
      });
      downloadExcelSpreadsheet(`Laporan_Klinik_PTPN_${timestamp}.xls`, 'Laporan Rekap Kunjungan Inhouse Clinic', headers, rows);
    } else if (reportType === 'departemen') {
      const headers = ['No', 'Entitas Perusahaan', ...chart1Months.map((m) => formatMonthYearLabel(m)), 'Total Kunjungan'];
      const rows = chart1MatrixData.rows.map((row, idx) => [
        idx + 1,
        row.label,
        ...chart1Months.map((m) => row.monthCounts[m]?.count || 0),
        row.total,
      ]);
      rows.push([
        'TOTAL',
        'Semua Entitas Terdata',
        ...chart1Months.map((m) => chart1MatrixData.monthlyTotals[m]?.total || 0),
        chart1MatrixData.grandTotal,
      ]);
      downloadExcelSpreadsheet(`Rekap_Kunjungan_Entitas_${timestamp}.xls`, 'Rekap Kunjungan Berdasarkan Entitas dan Bulan', headers, rows);
    } else if (reportType === 'divisi') {
      const headers = ['No', 'Nama Divisi', 'Total Kunjungan', 'Laki-laki', 'Perempuan'];
      const rows = chartDivisiData.map((row, idx) => [idx + 1, row.name, row.total, row.laki, row.perempuan]);
      downloadExcelSpreadsheet(`Rekap_Kunjungan_Divisi_${timestamp}.xls`, 'Rekap Kunjungan Berdasarkan Divisi', headers, rows);
    } else if (reportType === 'tindak_lanjut') {
      const headers = ['No', 'Kategori Tindak Lanjut', 'Total Pasien', 'Laki-laki', 'Perempuan', 'Persentase'];
      const rows = chartTLData.map((row, idx) => {
        const pct = totalTLItems > 0 ? Math.round((row.value / totalTLItems) * 100) : 0;
        return [idx + 1, row.name, row.value, row.laki, row.perempuan, `${pct}%`];
      });
      downloadExcelSpreadsheet(`Rekap_Tindak_Lanjut_${timestamp}.xls`, 'Rekap Tindak Lanjut Pengobatan', headers, rows);
    } else if (reportType === 'poli') {
      const headers = ['No', 'Poli Tujuan Rujukan', 'Jumlah Rujukan', 'Laki-laki', 'Perempuan'];
      const rows = chartPoliData.map((row, idx) => [idx + 1, row.name, row.count, row.laki, row.perempuan]);
      downloadExcelSpreadsheet(`Rekap_Rujukan_Poli_${timestamp}.xls`, 'Rekap Rujukan Berdasarkan Poli Tujuan', headers, rows);
    } else if (reportType === 'rujukan_dept') {
      const headers = ['No', 'Entitas Perusahaan', 'Jumlah Rujukan', 'Laki-laki', 'Perempuan'];
      const rows = chartRujDeptData.map((row, idx) => [idx + 1, row.name, row.count, row.laki, row.perempuan]);
      downloadExcelSpreadsheet(`Rekap_Rujukan_Entitas_${timestamp}.xls`, 'Rekap Rujukan Berdasarkan Entitas', headers, rows);
    } else if (reportType === 'diagnosa') {
      const headers = ['No', 'Diagnosa Penyakit', 'Jumlah Kasus', 'Laki-laki', 'Perempuan'];
      const rows = chartDiagData.map((row, idx) => [idx + 1, row.name, row.kasus, row.laki, row.perempuan]);
      downloadExcelSpreadsheet(`Rekap_Diagnosa_Penyakit_${timestamp}.xls`, 'Rekap Diagnosa Penyakit Terbanyak', headers, rows);
    } else if (reportType === 'obat') {
      const headers = ['No', 'Nama Obat', 'Jumlah Diberikan', 'Laki-laki', 'Perempuan'];
      const rows = chartObatData.map((row, idx) => [idx + 1, row.name, row.diberikan, row.laki, row.perempuan]);
      downloadExcelSpreadsheet(`Rekap_Penggunaan_Obat_${timestamp}.xls`, 'Rekap Penggunaan Obat Inhouse Clinic', headers, rows);
    }
  };

  // ----------------------------------------------------
  // CUSTOM GENDER TOOLTIP COMPONENT
  // ----------------------------------------------------
  const CustomGenderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const count =
        data.total !== undefined
          ? data.total
          : data.count !== undefined
            ? data.count
            : data.value !== undefined
              ? data.value
              : data.kasus !== undefined
                ? data.kasus
                : data.diberikan !== undefined
                  ? data.diberikan
                  : payload[0].value;

      const title = data.name || label || data.entity;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 z-50 border border-slate-700 min-w-[210px] max-w-xs">
          <p className="font-extrabold text-sm text-emerald-300 border-b border-slate-800 pb-1.5 leading-snug">{title}</p>
          <div className="flex items-center justify-between gap-4 pt-0.5">
            <span className="text-slate-300">Total Kunjungan:</span>
            <span className="font-black text-sm text-white">{count} Orang</span>
          </div>
          {data.laki !== undefined && (
            <div className="pt-1.5 border-t border-slate-800 text-[11px] text-slate-300 space-y-1 font-medium">
              <p className="flex items-center justify-between">
                <span className="flex items-center gap-1"><span className="text-sky-400 font-bold">♂</span> Laki-laki:</span>
                <span className="font-bold text-sky-300">
                  {data.laki} ({data.pctL || 0}%)
                </span>
              </p>
              <p className="flex items-center justify-between">
                <span className="flex items-center gap-1"><span className="text-pink-400 font-bold">♀</span> Perempuan:</span>
                <span className="font-bold text-pink-300">
                  {data.perempuan} ({data.pctP || 0}%)
                </span>
              </p>
            </div>
          )}
          <div className="text-[10px] text-emerald-300/90 pt-1.5 border-t border-slate-800 flex items-center gap-1 font-bold">
            <span>👉 Klik grafik untuk melihat daftar nama pasien</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Tooltip for Monthly Trend Chart 1
  const MonthlyTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const monthTitle = data.monthLabel || label || formatMonthYearLabel(data.ym);
      const total = data.total || 0;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-2 z-50 border border-slate-700 min-w-[230px]">
          <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between gap-3">
            <p className="font-extrabold text-sm text-indigo-300">{monthTitle}</p>
            <span className="font-extrabold text-xs px-2 py-0.5 rounded-md bg-indigo-900/80 text-indigo-200 border border-indigo-700/50">
              Total: {total} Pasien
            </span>
          </div>
          <div className="space-y-1 pt-0.5">
            {STANDARD_ENTITIES.map((ent) => {
              const count = data[ent.name] || 0;
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
              return (
                <div key={ent.name} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: ent.color }} />
                    <span>{ent.label}:</span>
                  </span>
                  <span className="font-bold text-white">
                    {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-emerald-300/90 pt-1.5 border-t border-slate-800 flex items-center gap-1 font-bold">
            <span>👉 Klik batang / segmen untuk buka daftar nama pasien</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Tooltip for Entity Stacked by Month Chart 1
  const EntityStackedTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const entityLabel = data.label || data.name || label;
      const total = data.total || 0;

      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-xl shadow-2xl text-xs space-y-2 z-50 border border-slate-700 min-w-[240px] max-w-sm">
          <div className="border-b border-slate-800 pb-1.5 flex items-center justify-between gap-3">
            <p className="font-extrabold text-sm text-emerald-300">{entityLabel}</p>
            <span className="font-extrabold text-xs px-2 py-0.5 rounded-md bg-emerald-900/80 text-emerald-200 border border-emerald-700/50">
              Total: {total} Pasien
            </span>
          </div>
          <div className="space-y-1 pt-0.5 max-h-56 overflow-y-auto pr-1">
            {chart1Months.map((ym, idx) => {
              const count = data[ym] || 0;
              if (count === 0 && chart1Months.length > 6) return null;
              const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
              const palette = MONTH_COLOR_PALETTE[idx % MONTH_COLOR_PALETTE.length];
              return (
                <div key={ym} className="flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: palette.bg }} />
                    <span>{formatMonthYearLabel(ym)}:</span>
                  </span>
                  <span className="font-bold text-white">
                    {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-emerald-300/90 pt-1.5 border-t border-slate-800 flex items-center gap-1 font-bold">
            <span>👉 Klik batang / segmen untuk buka daftar nama pasien</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Label Renderer for Doughnut / Pie Chart Slices
  const renderCustomizedPieLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
    percent,
  }: any) => {
    if (!value || value === 0 || (percent !== undefined && percent < 0.04)) return null;
    const RADIAN = Math.PI / 180;
    // Position text nicely centered in the slice arc
    const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        className="select-none pointer-events-none"
        style={{
          fontWeight: 800,
          fontSize: '13px',
          textShadow: '0 1px 3px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.7)',
        }}
      >
        {value}
      </text>
    );
  };

  // Helper to get modal header style & icon
  const getModalHeaderTheme = () => {
    switch (patientModal.iconType) {
      case 'kunjungan':
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <Users className="w-6 h-6" /> };
      case 'fit_catatan':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-200', badge: 'bg-amber-50 text-amber-800 border-amber-200', icon: <AlertTriangle className="w-6 h-6" /> };
      case 'tidak_fit':
        return { bg: 'bg-rose-100 text-rose-800 border-rose-200', badge: 'bg-rose-50 text-rose-800 border-rose-200', icon: <Activity className="w-6 h-6" /> };
      case 'rujukan':
        return { bg: 'bg-sky-100 text-sky-800 border-sky-200', badge: 'bg-sky-50 text-sky-800 border-sky-200', icon: <Building2 className="w-6 h-6" /> };
      case 'obat':
        return { bg: 'bg-cyan-100 text-cyan-800 border-cyan-200', badge: 'bg-cyan-50 text-cyan-800 border-cyan-200', icon: <Pill className="w-6 h-6" /> };
      case 'poli':
        return { bg: 'bg-sky-100 text-sky-800 border-sky-200', badge: 'bg-sky-50 text-sky-800 border-sky-200', icon: <Stethoscope className="w-6 h-6" /> };
      case 'diagnosa':
        return { bg: 'bg-amber-100 text-amber-800 border-amber-200', badge: 'bg-amber-50 text-amber-800 border-amber-200', icon: <HeartPulse className="w-6 h-6" /> };
      case 'divisi':
      case 'entitas':
      case 'tindak_lanjut':
      default:
        return { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: <Building2 className="w-6 h-6" /> };
    }
  };

  return (
    <AppLayout role="klinik" active="dashboard">
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-6 lg:p-8 shadow-xs space-y-5 sm:space-y-6">
        {/* ==================================================== */}
        {/* MAIN HEADER TITLE & CONTROLS                        */}
        {/* ==================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              Dashboard Analitik Grafik Inhouse Clinic
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Visualisasi statistik data kunjungan, tindak lanjut pengobatan, rujukan poli, dan penyakit Inhouse Clinic
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
            {/* Filter Bulan Select */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                name="bulan"
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="w-full sm:w-auto bg-slate-50 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 cursor-pointer transition shadow-2xs"
              >
                <option value="all">Semua Periode (Riwayat)</option>
                <option value="current">Bulan Ini / Terbaru</option>
                {availableMonths.map((mVal) => (
                  <option key={mVal} value={mVal}>
                    {formatMonthYearLabel(mVal)}
                  </option>
                ))}
              </select>
            </div>

            {/* Ekspor Excel Button */}
            <button
              type="button"
              onClick={() => handleExportCSV('Global')}
              className="flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer active:scale-98 shrink-0"
              title="Unduh Berkas Excel Laporan & Grafik Analitik Klinik"
            >
              <Download className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Ekspor Excel (.xls)</span>
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* SUMMARY METRICS: 5 Interactive Cards                 */}
        {/* ==================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
          {/* 1. Total Kunjungan */}
          <div
            onClick={() =>
              openPatientModal({
                title: 'Semua Kunjungan Pasien Inhouse Clinic',
                subtitle: `Menampilkan seluruh data pasien kunjungan klinik pada periode ${formatMonthYearLabel(selectedBulan)}`,
                categoryName: 'Total Kunjungan',
                iconType: 'kunjungan',
                records: filteredRecords,
              })
            }
            className="p-3 sm:p-4 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/90 border border-emerald-200/80 flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            title="Klik untuk melihat seluruh daftar nama pasien"
          >
            <div className="p-2 sm:p-3 rounded-xl bg-emerald-800 group-hover:bg-emerald-900 text-white shrink-0 shadow-2xs transition">
              <Users className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-900 block group-hover:underline truncate">Total Kunjungan</span>
              <span className="text-base sm:text-xl font-extrabold text-emerald-950">{totalKunjungan.toLocaleString()}</span>
            </div>
          </div>

          {/* 2. Fit dg Catatan */}
          <div
            onClick={() =>
              openPatientModal({
                title: 'Daftar Pasien: Fit dengan Catatan',
                subtitle: `Pasien yang layak bekerja dengan catatan/rekomendasi medis khusus`,
                categoryName: 'Fit dengan Catatan',
                iconType: 'fit_catatan',
                records: fitCatatanRecords,
              })
            }
            className="p-3 sm:p-4 rounded-2xl bg-amber-50/80 hover:bg-amber-100/90 border border-amber-200/80 flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            title="Klik untuk melihat karyawan Fit dengan Catatan"
          >
            <div className="p-2 sm:p-3 rounded-xl bg-amber-600 group-hover:bg-amber-700 text-white shrink-0 shadow-2xs transition">
              <AlertTriangle className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 block group-hover:underline truncate">Fit dg Catatan</span>
              <span className="text-base sm:text-xl font-extrabold text-amber-950">{fitCatatan.toLocaleString()}</span>
            </div>
          </div>

          {/* 3. Sementara Tidak Fit */}
          <div
            onClick={() =>
              openPatientModal({
                title: 'Daftar Pasien: Sementara Tidak Fit / Evaluasi',
                subtitle: `Pasien yang membutuhkan istirahat sakit, rawat inap, atau evaluasi medis lanjutan`,
                categoryName: 'Sementara Tidak Fit',
                iconType: 'tidak_fit',
                records: followUpRecords,
              })
            }
            className="p-3 sm:p-4 rounded-2xl bg-rose-50/80 hover:bg-rose-100/90 border border-rose-200/80 flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            title="Klik untuk melihat karyawan Sementara Tidak Fit"
          >
            <div className="p-2 sm:p-3 rounded-xl bg-rose-600 group-hover:bg-rose-700 text-white shrink-0 shadow-2xs transition">
              <Activity className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-rose-900 block group-hover:underline truncate">Sementara Tdk Fit</span>
              <span className="text-base sm:text-xl font-extrabold text-rose-950">{followUp.toLocaleString()}</span>
            </div>
          </div>

          {/* 4. Total Rujukan */}
          <div
            onClick={() =>
              openPatientModal({
                title: 'Daftar Pasien: Rujukan Faskes Luar / Rumah Sakit',
                subtitle: `Pasien yang dirujuk ke Rumah Sakit rekanan atau dokter spesialis poli`,
                categoryName: 'Rujukan Medis',
                iconType: 'rujukan',
                records: totalRujukanRecords,
              })
            }
            className="p-3 sm:p-4 rounded-2xl bg-sky-50/80 hover:bg-sky-100/90 border border-sky-200/80 flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            title="Klik untuk melihat karyawan yang Dirujuk"
          >
            <div className="p-2 sm:p-3 rounded-xl bg-sky-700 group-hover:bg-sky-800 text-white shrink-0 shadow-2xs transition">
              <Building2 className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-sky-900 block group-hover:underline truncate">Total Rujukan</span>
              <span className="text-base sm:text-xl font-extrabold text-sky-950">{totalRujukan.toLocaleString()}</span>
            </div>
          </div>

          {/* 5. Resep Obat */}
          <div
            onClick={() =>
              openPatientModal({
                title: 'Daftar Pasien: Penerima Terapi & Resep Obat',
                subtitle: `Pasien yang diberikan resep obat rawat jalan di Inhouse Clinic`,
                categoryName: 'Resep Obat',
                iconType: 'obat',
                records: totalObatRecords,
              })
            }
            className="col-span-2 sm:col-span-1 p-3 sm:p-4 rounded-2xl bg-teal-50/80 hover:bg-teal-100/90 border border-teal-200/80 flex items-center gap-2.5 sm:gap-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group"
            title="Klik untuk melihat karyawan penerima Resep Obat"
          >
            <div className="p-2 sm:p-3 rounded-xl bg-teal-700 group-hover:bg-teal-800 text-white shrink-0 shadow-2xs transition">
              <Pill className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-teal-900 block group-hover:underline truncate">Resep Obat</span>
              <span className="text-base sm:text-xl font-extrabold text-teal-950">{totalObat.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CHART 1: Jumlah Kunjungan Berdasarkan Entitas & Tren Bulanan */}
        {/* ==================================================== */}
        <div className="p-3.5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 max-w-full overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-100 text-indigo-800 shrink-0 shadow-2xs">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Jumlah Kunjungan Berdasarkan Entitas & Tren Bulanan</h2>
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {chart1Months.length} Bulan Terpilih
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Distribusi pasien per bulan (Januari - Desember) dan entitas perusahaan • Klik batang / angka untuk buka daftar pasien
                </p>
              </div>
            </div>

            {/* Controls Bar: View Mode, Filter Tahun, Rentang Bulan, Export */}
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              {/* Tampilan View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewModeChart1('entity')}
                  className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition cursor-pointer ${viewModeChart1 === 'entity'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  title="Tampilan grafik per entitas perusahaan"
                >
                  Per Entitas
                </button>
                <button
                  type="button"
                  onClick={() => setViewModeChart1('monthly')}
                  className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition cursor-pointer ${viewModeChart1 === 'monthly'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  title="Tampilan grafik tren per bulan (Januari - Desember)"
                >
                  Tren Per Bulan
                </button>
                <button
                  type="button"
                  onClick={() => setViewModeChart1('table')}
                  className={`px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold rounded-lg transition cursor-pointer ${viewModeChart1 === 'table'
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  title="Tampilan tabel matriks rincian bulan x entitas"
                >
                  Tabel Matriks
                </button>
              </div>

              {/* Filter Tahun */}
              <div className="relative">
                <select
                  id="filter-entitas-tahun"
                  value={filterYearChart1}
                  onChange={(e) => setFilterYearChart1(e.target.value)}
                  className="bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer focus:ring-1 focus:ring-emerald-600 shadow-2xs transition"
                  title="Pilih Tahun"
                >
                  <option value="all">Semua Tahun</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Tahun {yr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Container Rentang Bulan (Dari - Sampai) */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/90 rounded-xl p-1 shadow-2xs">
                {/* Dari Bulan */}
                <div className="flex items-center gap-1.5 pl-2 pr-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dari</span>
                  <select
                    id="filter-entitas-dari"
                    value={filterEntitasDari}
                    onChange={(e) => setFilterEntitasDari(e.target.value)}
                    className="bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-600 cursor-pointer shadow-2xs transition"
                  >
                    <option value="all">Awal</option>
                    {availableMonths.map((mVal) => (
                      <option key={mVal} value={mVal}>
                        {formatShortMonthYear(mVal)}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-slate-300 font-bold text-xs">-</span>

                {/* Sampai Bulan */}
                <div className="flex items-center gap-1.5 pr-2 pl-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sampai</span>
                  <select
                    id="filter-entitas-sampai"
                    value={filterEntitasSampai}
                    onChange={(e) => setFilterEntitasSampai(e.target.value)}
                    className="bg-white text-xs font-bold text-slate-800 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-600 cursor-pointer shadow-2xs transition"
                  >
                    <option value="all">Akhir</option>
                    {availableMonths.map((mVal) => (
                      <option key={mVal} value={mVal}>
                        {formatShortMonthYear(mVal)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tombol Reset Filter Rentang */}
                {(filterEntitasDari !== 'all' || filterEntitasSampai !== 'all' || filterYearChart1 !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterEntitasDari('all');
                      setFilterEntitasSampai('all');
                      setFilterYearChart1('all');
                    }}
                    className="inline-flex items-center justify-center p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Reset Filter Periode"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Ekspor Excel Button */}
              <button
                type="button"
                onClick={() => handleExportCSV('departemen')}
                className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-98 shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-200" />
                <span>Ekspor Excel (.xls)</span>
              </button>
            </div>
          </div>

          {/* Quick Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50/90 p-2.5 sm:p-3 rounded-xl border border-slate-100">
            <div
              onClick={() => {
                const allRecsInPeriod = miniMcuRecords.filter((r) => {
                  const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '';
                  return tgl && chart1Months.includes(tgl.substring(0, 7));
                });
                openPatientModal({
                  title: 'Seluruh Kunjungan Pasien Periode Terpilih',
                  subtitle: `Menampilkan seluruh ${chart1KPI.totalVisits} kunjungan dari ${chart1Months.length} bulan terpilih`,
                  categoryName: 'Kunjungan Periode Terpilih',
                  iconType: 'kunjungan',
                  records: allRecsInPeriod,
                });
              }}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-indigo-50/60 p-1.5 rounded-lg transition"
              title="Klik untuk melihat seluruh pasien dalam periode ini"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Kunjungan</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">{chart1KPI.totalVisits} Pasien</span>
              </div>
            </div>

            <div
              onClick={() => {
                if (chart1KPI.peakMonth && chart1KPI.peakMonth.records) {
                  openPatientModal({
                    title: `Kunjungan Tertinggi: ${chart1KPI.peakMonth.monthLabel}`,
                    subtitle: `Bulan dengan kunjungan terbanyak (${chart1KPI.peakMonth.total} pasien)`,
                    categoryName: chart1KPI.peakMonth.monthLabel,
                    iconType: 'kunjungan',
                    records: chart1KPI.peakMonth.records,
                  });
                }
              }}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-emerald-50/60 p-1.5 rounded-lg transition"
              title="Klik untuk melihat pasien di bulan kunjungan tertinggi"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Bulan Tertinggi</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block truncate" title={chart1KPI.peakMonth?.monthLabel}>
                  {chart1KPI.peakMonth ? chart1KPI.peakMonth.shortLabel : '-'}
                </span>
                {chart1KPI.peakMonth && (
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 block">
                    {chart1KPI.peakMonth.total} Pasien
                  </span>
                )}
              </div>
            </div>

            <div
              onClick={() => {
                if (chart1KPI.topEntity && chart1KPI.topEntity.records) {
                  openPatientModal({
                    title: `Kunjungan Entitas Terbanyak: ${chart1KPI.topEntity.label}`,
                    subtitle: `Entitas dengan total kunjungan terbanyak (${chart1KPI.topEntity.total} pasien)`,
                    categoryName: chart1KPI.topEntity.name,
                    iconType: 'entitas',
                    records: chart1KPI.topEntity.records,
                  });
                }
              }}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-blue-50/60 p-1.5 rounded-lg transition"
              title="Klik untuk melihat pasien entitas terbanyak"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold">
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Entitas Terbanyak</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block truncate" title={chart1KPI.topEntity?.name}>
                  {chart1KPI.topEntity ? chart1KPI.topEntity.name : '-'}
                </span>
                {chart1KPI.topEntity && (
                  <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 block">
                    {chart1KPI.topEntity.total} Pasien
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5 p-1.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Rata-rata / Bulan</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">{chart1KPI.avgPerMonth} Pasien</span>
              </div>
            </div>
          </div>

          {/* MAIN VISUALIZATION (Monthly Trend / Entity / Matrix Table) */}
          {viewModeChart1 === 'monthly' && (
            <div className="w-full">
              {chart1MonthlyData.length > 6 && (
                <div className="flex items-center justify-end pb-1.5 text-[11px] text-slate-500 font-medium sm:hidden">
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                    ⇄ Geser horizontal untuk melihat bulan lainnya
                  </span>
                </div>
              )}
              <div className="w-full overflow-x-auto pb-2">
                <div
                  style={{
                    minWidth: `${Math.max(500, chart1MonthlyData.length * 48)}px`,
                    height: '380px',
                  }}
                >
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chart1MonthlyData}
                        margin={{ top: 20, right: 15, left: -15, bottom: 25 }}
                        onClick={(e) => {
                          if (e && e.activePayload && e.activePayload.length > 0) {
                            const payload = e.activePayload[0];
                            const monthKey = payload.payload?.ym;
                            const entityKey = payload.dataKey;
                            if (entityKey && entityKey !== 'total' && payload.payload?.[`${entityKey}_records`]) {
                              openPatientModal({
                                title: `Kunjungan Pasien: ${entityKey} (${formatMonthYearLabel(monthKey)})`,
                                subtitle: `Daftar pasien ${entityKey} pada periode ${formatMonthYearLabel(monthKey)}`,
                                categoryName: `${entityKey} - ${formatMonthYearLabel(monthKey)}`,
                                iconType: 'entitas',
                                records: payload.payload[`${entityKey}_records`],
                              });
                            } else if (monthKey && payload.payload?.records) {
                              openPatientModal({
                                title: `Kunjungan Pasien Periode: ${formatMonthYearLabel(monthKey)}`,
                                subtitle: `Menampilkan seluruh ${payload.payload.records.length} pasien pada ${formatMonthYearLabel(monthKey)}`,
                                categoryName: formatMonthYearLabel(monthKey),
                                iconType: 'kunjungan',
                                records: payload.payload.records,
                              });
                            }
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="shortLabel"
                          tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
                          stroke="#64748b"
                          interval={0}
                          angle={chart1MonthlyData.length > 7 ? -25 : 0}
                          textAnchor={chart1MonthlyData.length > 7 ? 'end' : 'middle'}
                          height={chart1MonthlyData.length > 7 ? 40 : 25}
                        />
                        <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} stroke="#64748b" allowDecimals={false} />
                        <Tooltip content={<MonthlyTrendTooltip />} />
                        <Legend
                          verticalAlign="top"
                          align="center"
                          iconType="rect"
                          wrapperStyle={{ paddingBottom: '14px', fontSize: '11px', fontWeight: 'bold' }}
                        />
                        {STANDARD_ENTITIES.map((ent, idx) => (
                          <Bar
                            key={ent.name}
                            dataKey={ent.name}
                            name={ent.label}
                            stackId="entitasStack"
                            fill={ent.color}
                            stroke={ent.border}
                            radius={idx === STANDARD_ENTITIES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                            className="cursor-pointer hover:opacity-85 transition-opacity"
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
            </div>
          )}

          {viewModeChart1 === 'entity' && (
            <div className="w-full">
              {/* Mobile horizontal swipe hint */}
              <div className="flex items-center justify-between pb-1.5 text-[11px] text-slate-500 font-medium sm:hidden">
                <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                  ⇄ Geser horizontal untuk melihat semua entitas
                </span>
              </div>
              <div className="w-full overflow-x-auto pb-2">
                <div
                  style={{
                    minWidth: `${Math.max(680, chart1EntityData.length * Math.max(54, chart1Months.length * 13))}px`,
                    height: '380px',
                  }}
                >
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chart1EntityData}
                        margin={{ top: 25, right: 20, left: -15, bottom: 35 }}
                        onClick={(e) => {
                          if (e && e.activePayload && e.activePayload.length > 0) {
                            const payload = e.activePayload[0];
                            const monthKey = payload.dataKey; // e.g. '2026-07'
                            const entLabel = payload.payload?.label || payload.payload?.name;
                            const entKey = payload.payload?.entity;
                            if (monthKey && monthKey !== 'total' && payload.payload?.[`${monthKey}_records`]) {
                              openPatientModal({
                                title: `Kunjungan Pasien: ${entLabel} (${formatMonthYearLabel(String(monthKey))})`,
                                subtitle: `Daftar seluruh ${payload.payload[`${monthKey}_records`].length} pasien ${entLabel} pada bulan ${formatMonthYearLabel(String(monthKey))}`,
                                categoryName: `${entLabel} - ${formatMonthYearLabel(String(monthKey))}`,
                                iconType: 'entitas',
                                records: payload.payload[`${monthKey}_records`],
                              });
                            } else if (payload.payload?.records) {
                              openPatientModal({
                                title: `Kunjungan Pasien: Entitas ${entLabel}`,
                                subtitle: `Menampilkan seluruh ${payload.payload.records.length} pasien dari ${entLabel} pada rentang periode terpilih`,
                                categoryName: entKey || entLabel,
                                iconType: 'entitas',
                                records: payload.payload.records,
                              });
                            }
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }}
                          stroke="#64748b"
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={45}
                        />
                        <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} stroke="#64748b" allowDecimals={false} />
                        <Tooltip content={<EntityStackedTooltip />} />
                        <Legend
                          verticalAlign="top"
                          align="center"
                          iconType="rect"
                          wrapperStyle={{ paddingBottom: '14px', fontSize: '11px', fontWeight: 'bold' }}
                        />
                        {chart1Months.map((ym, idx) => {
                          const palette = MONTH_COLOR_PALETTE[idx % MONTH_COLOR_PALETTE.length];
                          return (
                            <Bar
                              key={ym}
                              dataKey={ym}
                              name={chart1HasMultipleYears ? formatShortMonthYear(ym) : formatShortMonthName(ym)}
                              fill={palette.bg}
                              stroke={palette.border}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={32}
                              className="cursor-pointer hover:opacity-85 transition-opacity"
                            >
                              <LabelList
                                dataKey={ym}
                                position="top"
                                fill="#1e293b"
                                fontSize={10}
                                fontWeight="bold"
                                offset={4}
                                formatter={(val: any) => (val && Number(val) > 0 ? val : '')}
                              />
                            </Bar>
                          );
                        })}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}

          {viewModeChart1 === 'table' && (
            <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-extrabold border-b border-slate-200">
                    <th className="px-4 py-3 sticky left-0 bg-slate-100 z-10 min-w-[180px]">Entitas Perusahaan</th>
                    {chart1Months.map((ym) => (
                      <th key={ym} className="px-3 py-3 text-center min-w-[85px] whitespace-nowrap">
                        {formatShortMonthYear(ym)}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center bg-indigo-50 text-indigo-900 font-black min-w-[95px] sticky right-0 z-10">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {chart1MatrixData.rows.map((row) => (
                    <tr key={row.entity} className="hover:bg-slate-50/80 transition font-medium">
                      <td className="px-4 py-2.5 font-bold text-slate-800 sticky left-0 bg-white z-10 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                        <span>{row.label}</span>
                      </td>
                      {chart1Months.map((ym) => {
                        const cellData = row.monthCounts[ym] || { count: 0, records: [] };
                        return (
                          <td key={ym} className="px-3 py-2 text-center">
                            {cellData.count > 0 ? (
                              <button
                                type="button"
                                onClick={() =>
                                  openPatientModal({
                                    title: `Kunjungan: ${row.label} (${formatMonthYearLabel(ym)})`,
                                    subtitle: `Menampilkan ${cellData.count} data kunjungan pasien`,
                                    categoryName: `${row.entity} - ${formatMonthYearLabel(ym)}`,
                                    iconType: 'entitas',
                                    records: cellData.records,
                                  })
                                }
                                className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-bold text-xs bg-slate-100 hover:bg-emerald-700 hover:text-white text-slate-800 transition cursor-pointer"
                                title={`Klik untuk melihat ${cellData.count} pasien`}
                              >
                                {cellData.count}
                              </button>
                            ) : (
                              <span className="text-slate-300 font-normal">0</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-4 py-2.5 text-center bg-indigo-50/50 sticky right-0 z-10">
                        <button
                          type="button"
                          onClick={() =>
                            openPatientModal({
                              title: `Total Kunjungan: ${row.label}`,
                              subtitle: `Menampilkan seluruh ${row.total} kunjungan dari ${row.label} pada rentang periode terpilih`,
                              categoryName: row.entity,
                              iconType: 'entitas',
                              records: row.records,
                            })
                          }
                          className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg font-black text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs transition cursor-pointer"
                        >
                          {row.total}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                    <td className="px-4 py-3 sticky left-0 bg-slate-100 z-10 uppercase text-[11px] tracking-wider">
                      TOTAL BULANAN
                    </td>
                    {chart1Months.map((ym) => {
                      const mData = chart1MatrixData.monthlyTotals[ym] || { total: 0, records: [] };
                      return (
                        <td key={ym} className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              openPatientModal({
                                title: `Total Seluruh Kunjungan Bulan ${formatMonthYearLabel(ym)}`,
                                subtitle: `Menampilkan seluruh ${mData.total} kunjungan pasien di bulan ${formatMonthYearLabel(ym)}`,
                                categoryName: formatMonthYearLabel(ym),
                                iconType: 'kunjungan',
                                records: mData.records,
                              })
                            }
                            className="inline-flex items-center justify-center px-2 py-0.5 rounded-md font-black text-xs bg-emerald-100 text-emerald-900 hover:bg-emerald-800 hover:text-white transition cursor-pointer"
                          >
                            {mData.total}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center bg-indigo-100 text-indigo-950 font-black text-sm sticky right-0 z-10">
                      {chart1MatrixData.grandTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ==================================================== */}
        {/* CHART 2: Jumlah Kunjungan Karyawan Per Divisi       */}
        {/* ==================================================== */}
        <div className="p-3.5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 max-w-full overflow-hidden">
          {/* Header Section */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 shadow-2xs">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Jumlah Kunjungan Karyawan Per Divisi</h2>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {divisiStats.totalDivisi} Divisi Terdata
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Visualisasi jumlah kunjungan per divisi kerja • Klik grafik untuk melihat daftar nama pasien
                </p>
              </div>
            </div>

            {/* Primary Controls */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
              {/* Entitas Filter */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  id="filter-entitas-divisi"
                  value={filterEntitasDivisi}
                  onChange={(e) => setFilterEntitasDivisi(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-700 rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
                >
                  {ENTITAS_LIST.map((ent) => (
                    <option key={ent.value} value={ent.value} className="bg-white text-slate-900 font-medium">
                      {ent.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleExportCSV('divisi')}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition border border-slate-200 shadow-2xs cursor-pointer active:scale-98 shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ekspor Excel (.xls)</span>
              </button>
            </div>
          </div>

          {/* Quick KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50/90 p-2.5 sm:p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Divisi</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">{divisiStats.totalDivisi} Divisi</span>
              </div>
            </div>
            <div
              onClick={() =>
                openPatientModal({
                  title: 'Kunjungan Pasien Berdasarkan Divisi',
                  subtitle: `Menampilkan seluruh ${divisiStats.totalKunjunganInDivisi} kunjungan pasien terdata divisi`,
                  categoryName: 'Semua Divisi',
                  iconType: 'divisi',
                  records: rawDivisiList.flatMap((d) => d.records || []),
                })
              }
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-blue-50/50 p-1 rounded-lg transition"
              title="Klik untuk melihat seluruh kunjungan divisi"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Kunjungan</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">{divisiStats.totalKunjunganInDivisi} Pasien</span>
              </div>
            </div>
            <div
              onClick={() => {
                if (divisiStats.topDivisi) {
                  openPatientModal({
                    title: `Daftar Pasien: Divisi ${divisiStats.topDivisi.fullDivisi}`,
                    subtitle: `Divisi dengan jumlah kunjungan terbanyak (${divisiStats.topDivisi.total} kunjungan)`,
                    categoryName: `Divisi ${divisiStats.topDivisi.fullDivisi}`,
                    iconType: 'divisi',
                    records: divisiStats.topDivisi.records || [],
                  });
                }
              }}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-amber-50/50 p-1 rounded-lg transition"
              title="Klik untuk melihat pasien dari divisi terbanyak"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Divisi Terbanyak</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block truncate" title={divisiStats.topDivisi?.fullDivisi}>
                  {divisiStats.topDivisi ? divisiStats.topDivisi.fullDivisi : '-'}
                </span>
                {divisiStats.topDivisi && (
                  <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 block">
                    {divisiStats.topDivisi.total} Kunjungan
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Rata-rata / Divisi</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">{divisiStats.avgPerDivisi} Kunjungan</span>
              </div>
            </div>
          </div>

          {/* Filter & View Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            {/* Left: Search input */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
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
                    className={`px-2 sm:px-2.5 py-1 rounded-lg transition text-[10px] sm:text-[11px] cursor-pointer ${filterLimitDivisi === opt
                      ? 'bg-emerald-800 text-white shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                      }`}
                  >
                    {opt === 'top10' ? 'Top 10' : opt === 'top15' ? 'Top 15' : opt === 'top25' ? 'Top 25' : 'Semua'}
                  </button>
                ))}
              </div>

              {/* Sort Select */}
              <div className="relative">
                <select
                  value={sortDivisiOrder}
                  onChange={(e) => setSortDivisiOrder(e.target.value as any)}
                  className="appearance-none bg-white text-slate-700 font-bold text-[10px] sm:text-[11px] border border-slate-200 rounded-xl pl-2 pr-6 py-1.5 outline-none cursor-pointer hover:border-slate-300 transition shadow-2xs"
                >
                  <option value="desc">Terbanyak ↓</option>
                  <option value="asc">Terkecil ↑</option>
                  <option value="alpha">Abjad A-Z</option>
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewModeDivisi('horizontal')}
                  title="Tampilan Horizontal Leaderboard"
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

          {/* Chart Container */}
          <div className="w-full max-w-full overflow-hidden">
            {mounted && (
              <>
                {viewModeDivisi === 'horizontal' ? (
                  <div className="w-full">
                    <div className="flex items-center justify-end pb-1.5 text-[11px] text-slate-500 font-medium sm:hidden">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                        ⇄ Geser horizontal untuk melihat grafik lengkap
                      </span>
                    </div>
                    <div
                      className={`w-full overflow-x-auto transition-all duration-300 pb-2 ${chartDivisiData.length > 12 ? 'max-h-[520px] overflow-y-auto pr-2' : ''
                        }`}
                    >
                      <div
                        style={{
                          minWidth: '480px',
                          width: '100%',
                          height: `${Math.max(360, chartDivisiData.length * 36)}px`,
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={chartDivisiData}
                            margin={{ top: 10, right: 35, left: 10, bottom: 10 }}
                            onClick={(e) => {
                              if (e && e.activePayload && e.activePayload[0]) {
                                const item = e.activePayload[0].payload;
                                if (item.name && item.name !== 'Belum Ada Data Divisi') {
                                  openPatientModal({
                                    title: `Daftar Pasien: Divisi ${item.name}`,
                                    subtitle: `Menampilkan seluruh ${item.total} pasien dari Divisi ${item.name}`,
                                    categoryName: `Divisi ${item.name}`,
                                    iconType: 'divisi',
                                    records: item.records || [],
                                  });
                                }
                              }
                            }}
                          >
                            <defs>
                              <linearGradient id="emeraldBarGradKlinikH" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#047857" />
                                <stop offset="100%" stopColor="#10b981" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={180}
                              tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                              tickFormatter={(val) => (val && val.length > 24 ? `${val.substring(0, 22)}...` : val)}
                            />
                            <Tooltip content={<CustomGenderTooltip />} />
                            <Bar
                              dataKey="total"
                              name="Jumlah Kunjungan"
                              fill="url(#emeraldBarGradKlinikH)"
                              radius={[0, 6, 6, 0]}
                              barSize={20}
                              className="cursor-pointer hover:opacity-90 transition-opacity"
                            >
                              <LabelList dataKey="total" position="right" fill="#047857" fontSize={11} fontWeight="bold" offset={6} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-end pb-1.5 text-[11px] text-slate-500 font-medium sm:hidden">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                        ⇄ Geser horizontal untuk melihat semua divisi
                      </span>
                    </div>
                    <div className="w-full overflow-x-auto pb-2">
                      <div
                        style={{
                          minWidth: `${Math.max(650, chartDivisiData.length * 48)}px`,
                          height: '380px',
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={chartDivisiData}
                            margin={{ top: 20, right: 20, left: -10, bottom: 65 }}
                          onClick={(e) => {
                            if (e && e.activePayload && e.activePayload[0]) {
                              const item = e.activePayload[0].payload;
                              if (item.name && item.name !== 'Belum Ada Data Divisi') {
                                openPatientModal({
                                  title: `Daftar Pasien: Divisi ${item.name}`,
                                  subtitle: `Menampilkan seluruh ${item.total} pasien dari Divisi ${item.name}`,
                                  categoryName: `Divisi ${item.name}`,
                                  iconType: 'divisi',
                                  records: item.records || [],
                                });
                              }
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }}
                            interval={0}
                            angle={-35}
                            textAnchor="end"
                            height={75}
                          />
                          <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} allowDecimals={false} />
                          <Tooltip content={<CustomGenderTooltip />} />
                          <Bar
                            dataKey="total"
                            fill="#059669"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={36}
                            className="cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            <LabelList
                              dataKey="total"
                              position="top"
                              formatter={(val: any) => (val && Number(val) > 0 ? val : '')}
                              fill="#047857"
                              fontSize={11}
                              fontWeight="bold"
                              offset={4}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* CHART 3: Tindak Lanjut Pengobatan (Doughnut + Legend)*/}
        {/* ==================================================== */}
        <div className="p-3.5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 sm:space-y-5 max-w-full overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 shadow-2xs">
                <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">Tindak Lanjut Pengobatan</h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Persentase &amp; rincian tindakan pengobatan • Klik grafik atau kartu untuk buka daftar nama pasien
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
              <div className="relative flex-1 sm:flex-initial">
                <select
                  id="filter-entitas-tl"
                  value={filterEntitasTL}
                  onChange={(e) => setFilterEntitasTL(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-700 rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
                >
                  {ENTITAS_LIST.map((ent) => (
                    <option key={ent.value} value={ent.value} className="bg-white text-slate-900 font-medium">
                      {ent.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleExportCSV('tindak_lanjut')}
                className="inline-flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-xs cursor-pointer active:scale-98 shrink-0"
              >
                <Download className="w-3.5 h-3.5 text-emerald-200" />
                <span>Ekspor Excel (.xls)</span>
              </button>
            </div>
          </div>

          {/* Doughnut Chart */}
          <div className="h-64 sm:h-80 w-full relative flex items-center justify-center py-2">
            {mounted && (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartTLData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={92}
                      paddingAngle={3}
                      dataKey="value"
                      label={renderCustomizedPieLabel}
                      labelLine={false}
                      onClick={(entry) => {
                        if (entry && entry.name) {
                          const item = chartTLData.find((t) => t.name === entry.name);
                          openPatientModal({
                            title: `Daftar Pasien: ${entry.name}`,
                            subtitle: `Menampilkan pasien dengan kategori tindak lanjut '${entry.name}'`,
                            categoryName: entry.name,
                            iconType: 'tindak_lanjut',
                            records: item?.records || [],
                          });
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {chartTLData.map((_, index) => (
                        <Cell key={`tl-cell-${index}`} fill={TL_COLORS[index % TL_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomGenderTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Centered Total Counter */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
                    {totalTLItems.toLocaleString()}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                    Total Pasien
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Dynamic Custom Legend Grid */}
          <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {chartTLData.map((item, idx) => {
              const pct = totalTLItems > 0 ? Math.round((item.value / totalTLItems) * 100) : 0;
              const color = TL_COLORS[idx % TL_COLORS.length];
              return (
                <div
                  key={idx}
                  onClick={() =>
                    openPatientModal({
                      title: `Daftar Pasien: ${item.name}`,
                      subtitle: `Menampilkan seluruh ${item.value} pasien dengan kategori tindak lanjut '${item.name}'`,
                      categoryName: item.name,
                      iconType: 'tindak_lanjut',
                      records: item.records || [],
                    })
                  }
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 transition cursor-pointer group shadow-2xs"
                  title="Klik untuk membuka daftar pasien"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-3 h-3 rounded-md shrink-0 shadow-2xs" style={{ backgroundColor: color }} />
                    <span className="font-extrabold text-slate-800 group-hover:text-emerald-900 truncate text-[11px]">
                      {item.name}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="font-black text-slate-900 group-hover:text-emerald-800 text-xs">
                      = {item.value} Orang
                    </span>
                    <span className="text-[10px] text-slate-500 font-bold ml-1">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ==================================================== */}
        {/* CHART 4: Rujukan Berdasarkan Poli Tujuan (Full Width)*/}
        {/* ==================================================== */}
        <div className="p-3.5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 max-w-full overflow-hidden">
          {/* Header Section */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-sky-100 text-sky-800 shrink-0 shadow-2xs">
                <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Jumlah Rujukan Berdasarkan Poli Tujuan</h2>
                  <span className="bg-sky-100 text-sky-800 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {poliStats.totalRujukan} Pasien Terdata
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Visualisasi lengkap seluruh poli rujukan faskes luar • Klik batang untuk melihat daftar nama pasien
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
              {/* Entitas */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  id="filter-entitas-poli"
                  value={filterEntitasPoli}
                  onChange={(e) => setFilterEntitasPoli(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-700 rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
                >
                  {ENTITAS_LIST.map((ent) => (
                    <option key={ent.value} value={ent.value} className="bg-white text-slate-900 font-medium">
                      {ent.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Divisi */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  id="filter-divisi-poli"
                  value={filterDivisiPoli}
                  onChange={(e) => setFilterDivisiPoli(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-700 rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
                >
                  {DIVISI_LIST.map((div) => (
                    <option key={div} value={div} className="bg-white text-slate-900 font-medium">
                      {div}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Limit / Active Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFilterPoliLimit('all')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg transition text-[10px] sm:text-[11px] cursor-pointer ${filterPoliLimit === 'all'
                    ? 'bg-sky-700 text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Semua Poli
                </button>
                <button
                  type="button"
                  onClick={() => setFilterPoliLimit('active')}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg transition text-[10px] sm:text-[11px] cursor-pointer ${filterPoliLimit === 'active'
                    ? 'bg-sky-700 text-white shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                  Hanya Aktif
                </button>
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setViewModePoli('horizontal')}
                  title="Tampilan Horizontal"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${viewModePoli === 'horizontal'
                    ? 'bg-white text-sky-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewModePoli('vertical')}
                  title="Tampilan Kolom Vertikal"
                  className={`p-1.5 rounded-lg transition cursor-pointer ${viewModePoli === 'vertical'
                    ? 'bg-white text-sky-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleExportCSV('poli')}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition border border-slate-200 shadow-2xs cursor-pointer active:scale-98 shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-sky-700" />
                <span>Ekspor Excel (.xls)</span>
              </button>
            </div>
          </div>

          {/* Quick KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-50/90 p-2.5 sm:p-3 rounded-xl border border-slate-100">
            <div
              onClick={() =>
                openPatientModal({
                  title: 'Daftar Seluruh Pasien Rujukan Poli',
                  subtitle: `Menampilkan ${poliStats.totalRujukan} pasien rujukan spesialis faskes luar`,
                  categoryName: 'Semua Poli',
                  iconType: 'poli',
                  records: rawPoliList.flatMap((p) => p.records || []),
                })
              }
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-sky-50/50 p-1.5 rounded-lg transition"
              title="Klik untuk melihat seluruh pasien rujukan poli"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Rujukan</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">{poliStats.totalRujukan} Pasien</span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Stethoscope className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Kategori Poli</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">{poliStats.totalPoli} Poli</span>
              </div>
            </div>
            <div
              onClick={() => {
                if (poliStats.topPoli) {
                  openPatientModal({
                    title: `Daftar Pasien Rujukan: ${poliStats.topPoli.name}`,
                    subtitle: `Poli rujukan terbanyak (${poliStats.topPoli.count} pasien)`,
                    categoryName: poliStats.topPoli.name,
                    iconType: 'poli',
                    records: poliStats.topPoli.records || [],
                  });
                }
              }}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-emerald-50/50 p-1.5 rounded-lg transition"
              title="Klik untuk melihat pasien poli terbanyak"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Poli Terbanyak</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 truncate block" title={poliStats.topPoli?.name}>
                  {poliStats.topPoli ? poliStats.topPoli.name : '-'}
                </span>
                {poliStats.topPoli && (
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 block">
                    {poliStats.topPoli.count} Pasien
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Rata-rata / Poli</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">
                  {poliStats.totalPoli > 0 ? Math.round(poliStats.totalRujukan / poliStats.totalPoli) : '0'} Pasien
                </span>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="w-full max-w-full overflow-hidden pt-1">
            {mounted && (
              <>
                {viewModePoli === 'horizontal' ? (
                  <div className="w-full">
                    <div className="flex items-center justify-end pb-1.5 text-[11px] text-slate-500 font-medium sm:hidden">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                        ⇄ Geser horizontal untuk melihat grafik lengkap
                      </span>
                    </div>
                    <div
                      className={`w-full overflow-x-auto transition-all duration-300 pb-2 ${chartPoliData.length > 8 ? 'max-h-[500px] overflow-y-auto pr-2' : ''
                        }`}
                    >
                      <div
                        style={{
                          minWidth: '480px',
                          width: '100%',
                          height: `${Math.max(340, chartPoliData.length * 36)}px`,
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            layout="vertical"
                            data={chartPoliData}
                            margin={{ top: 10, right: 35, left: 10, bottom: 10 }}
                            onClick={(e) => {
                              if (e && e.activePayload && e.activePayload[0]) {
                                const item = e.activePayload[0].payload;
                                if (item.name) {
                                  openPatientModal({
                                    title: `Daftar Pasien Rujukan: ${item.name}`,
                                    subtitle: `Menampilkan ${item.count} pasien yang dirujuk ke ${item.name}`,
                                    categoryName: item.name,
                                    iconType: 'poli',
                                    records: item.records || [],
                                  });
                                }
                              }
                            }}
                          >
                            <defs>
                              <linearGradient id="skyBarGradPoliH" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#0284c7" />
                                <stop offset="100%" stopColor="#38bdf8" />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                            <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={180}
                              tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                              tickFormatter={(val) => (val && val.length > 24 ? `${val.substring(0, 22)}...` : val)}
                            />
                            <Tooltip content={<CustomGenderTooltip />} />
                            <Bar
                              dataKey="count"
                              name="Jumlah Pasien"
                              fill="url(#skyBarGradPoliH)"
                              radius={[0, 6, 6, 0]}
                              barSize={20}
                              className="cursor-pointer hover:opacity-90 transition-opacity"
                            >
                              <LabelList dataKey="count" position="right" fill="#0284c7" fontSize={11} fontWeight="bold" offset={6} />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    <div className="flex items-center justify-end pb-1.5 text-[11px] text-slate-500 font-medium sm:hidden">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                        ⇄ Geser horizontal untuk melihat semua poli
                      </span>
                    </div>
                    <div className="w-full overflow-x-auto pb-2">
                    <div
                      style={{
                        minWidth: `${Math.max(650, chartPoliData.length * 52)}px`,
                        height: '360px',
                      }}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={chartPoliData}
                          margin={{ top: 20, right: 20, left: -10, bottom: 65 }}
                          onClick={(e) => {
                            if (e && e.activePayload && e.activePayload[0]) {
                              const item = e.activePayload[0].payload;
                              if (item.name) {
                                openPatientModal({
                                  title: `Daftar Pasien Rujukan: ${item.name}`,
                                  subtitle: `Menampilkan ${item.count} pasien yang dirujuk ke ${item.name}`,
                                  categoryName: item.name,
                                  iconType: 'poli',
                                  records: item.records || [],
                                });
                              }
                            }
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fontWeight: 700, fill: '#475569' }}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={75}
                          />
                          <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} allowDecimals={false} />
                          <Tooltip content={<CustomGenderTooltip />} />
                          <Bar
                            dataKey="count"
                            fill="#0284c7"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={36}
                            className="cursor-pointer hover:opacity-90 transition-opacity"
                          >
                            <LabelList
                              dataKey="count"
                              position="top"
                              formatter={(val: any) => (val && Number(val) > 0 ? val : '')}
                              fill="#0284c7"
                              fontSize={11}
                              fontWeight="bold"
                              offset={4}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* CHART 5: Jumlah Rujukan Berdasarkan Entitas (Full Width) */}
        {/* ==================================================== */}
        <div className="p-3.5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 max-w-full overflow-hidden">
          {/* Header Section */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-teal-100 text-teal-800 shrink-0 shadow-2xs">
                <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Jumlah Rujukan Berdasarkan Entitas Perusahaan</h2>
                  <span className="bg-teal-100 text-teal-800 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {chartRujDeptData.reduce((acc, c) => acc + c.count, 0)} Pasien Terdata
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Distribusi total rujukan pasien per entitas (PTPN 1, PTPN 3, PTPN 4, dll.) • Klik batang untuk buka daftar nama pasien
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
              {/* Entitas */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  id="filter-entitas-rujdept"
                  value={filterEntitasRujDept}
                  onChange={(e) => setFilterEntitasRujDept(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-700 rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
                >
                  {ENTITAS_LIST.map((ent) => (
                    <option key={ent.value} value={ent.value} className="bg-white text-slate-900 font-medium">
                      {ent.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Divisi */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  id="filter-divisi-rujdept"
                  value={filterDivisiRujDept}
                  onChange={(e) => setFilterDivisiRujDept(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-700 rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
                >
                  {DIVISI_LIST.map((div) => (
                    <option key={div} value={div} className="bg-white text-slate-900 font-medium">
                      {div}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleExportCSV('rujukan_dept')}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition border border-slate-200 shadow-2xs cursor-pointer active:scale-98 shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600" />
                <span>Ekspor Excel (.xls)</span>
              </button>
            </div>
          </div>

          {/* Quick KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50/90 p-2.5 sm:p-3 rounded-xl border border-slate-100">
            <div
              onClick={() =>
                openPatientModal({
                  title: 'Seluruh Rujukan Pasien Berdasarkan Entitas',
                  subtitle: `Menampilkan seluruh ${chartRujDeptData.reduce((acc, c) => acc + c.count, 0)} rujukan pasien`,
                  categoryName: 'Semua Entitas',
                  iconType: 'entitas',
                  records: chartRujDeptData.flatMap((r) => r.records || []),
                })
              }
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-teal-50/50 p-1.5 rounded-lg transition"
              title="Klik untuk melihat seluruh pasien rujukan"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Rujukan</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">
                  {chartRujDeptData.reduce((acc, c) => acc + c.count, 0)} Pasien
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Entitas Aktif</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">
                  {chartRujDeptData.filter((c) => c.count > 0).length} Entitas
                </span>
              </div>
            </div>
            <div
              onClick={() => {
                const topEnt = chartRujDeptData.slice().sort((a, b) => b.count - a.count)[0];
                if (topEnt && topEnt.count > 0) {
                  openPatientModal({
                    title: `Daftar Pasien Rujukan: ${topEnt.name}`,
                    subtitle: `Entitas dengan jumlah rujukan terbanyak (${topEnt.count} pasien)`,
                    categoryName: topEnt.name,
                    iconType: 'entitas',
                    records: topEnt.records || [],
                  });
                }
              }}
              className="col-span-2 sm:col-span-1 flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-blue-50/50 p-1.5 rounded-lg transition"
              title="Klik untuk melihat rujukan terbanyak"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Rujukan Terbanyak</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block truncate" title={chartRujDeptData.slice().sort((a, b) => b.count - a.count)[0]?.name}>
                  {chartRujDeptData.slice().sort((a, b) => b.count - a.count)[0]?.name || '-'}
                </span>
                {chartRujDeptData.slice().sort((a, b) => b.count - a.count)[0]?.count > 0 && (
                  <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 block">
                    {chartRujDeptData.slice().sort((a, b) => b.count - a.count)[0]?.count} Pasien
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="w-full">
            <div className="flex items-center justify-end pb-1.5 text-[11px] text-slate-500 font-medium sm:hidden">
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                ⇄ Geser horizontal untuk melihat semua entitas
              </span>
            </div>
            <div className="w-full overflow-x-auto pb-2">
              <div
                style={{
                  minWidth: `${Math.max(480, chartRujDeptData.length * 48)}px`,
                  height: '360px',
                }}
              >
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartRujDeptData}
                      margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
                      onClick={(e) => {
                        if (e && e.activePayload && e.activePayload[0]) {
                          const item = e.activePayload[0].payload;
                          if (item.name) {
                            openPatientModal({
                              title: `Daftar Pasien Rujukan: Entitas ${item.name}`,
                              subtitle: `Menampilkan seluruh ${item.count} pasien rujukan dari ${item.name}`,
                              categoryName: item.name,
                              iconType: 'entitas',
                              records: item.records || [],
                            });
                          }
                        }
                      }}
                    >
                      <defs>
                        <linearGradient id="tealBarGradRujEntH" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0d9488" />
                          <stop offset="100%" stopColor="#14b8a6" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#334155' }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} stroke="#64748b" allowDecimals={false} />
                      <Tooltip content={<CustomGenderTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Jumlah Pasien"
                        fill="url(#tealBarGradRujEntH)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                        className="cursor-pointer hover:opacity-90 transition-opacity"
                      >
                        <LabelList
                          dataKey="count"
                          position="top"
                          formatter={(val: any) => (val && Number(val) > 0 ? val : '')}
                          fill="#0f766e"
                          fontSize={11}
                          fontWeight="bold"
                          offset={4}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* CHART 6: Diagnosa Penyakit Terbanyak (Full Width)    */}
        {/* ==================================================== */}
        <div className="p-3.5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 max-w-full overflow-hidden">
          {/* Header Section */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 shadow-2xs">
                <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Diagnosa Penyakit Terbanyak di Inhouse Clinic</h2>
                  <span className="bg-amber-100 text-amber-800 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {chartDiagData.reduce((acc, c) => acc + c.kasus, 0)} Total Kasus Terdata
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Peringkat diagnosa dan keluhan penyakit yang paling sering ditangani • Klik batang untuk buka daftar nama pasien
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
              <div className="relative flex-1 sm:flex-initial">
                <select
                  id="filter-entitas-diag"
                  value={filterEntitasDiag}
                  onChange={(e) => setFilterEntitasDiag(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-700 rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
                >
                  {ENTITAS_LIST.map((ent) => (
                    <option key={ent.value} value={ent.value} className="bg-white text-slate-900 font-medium">
                      {ent.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleExportCSV('diagnosa')}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition border border-slate-200 shadow-2xs cursor-pointer active:scale-98 shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                <span>Ekspor Excel (.xls)</span>
              </button>
            </div>
          </div>

          {/* Quick KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50/90 p-2.5 sm:p-3 rounded-xl border border-slate-100">
            <div
              onClick={() =>
                openPatientModal({
                  title: 'Seluruh Kasus Diagnosa Penyakit Pasien',
                  subtitle: `Menampilkan seluruh ${chartDiagData.reduce((acc, c) => acc + c.kasus, 0)} kasus diagnosa pasien`,
                  categoryName: 'Semua Diagnosa',
                  iconType: 'diagnosa',
                  records: chartDiagData.flatMap((d) => d.records || []),
                })
              }
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-amber-50/50 p-1.5 rounded-lg transition"
              title="Klik untuk melihat seluruh kasus diagnosa"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Kasus</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">
                  {chartDiagData.reduce((acc, c) => acc + c.kasus, 0)} Kasus
                </span>
              </div>
            </div>
            <div
              onClick={() => {
                const topDiag = chartDiagData[0];
                if (topDiag) {
                  openPatientModal({
                    title: `Daftar Pasien: Diagnosa ${topDiag.name}`,
                    subtitle: `Diagnosa terbanyak (${topDiag.kasus} kasus)`,
                    categoryName: topDiag.name,
                    iconType: 'diagnosa',
                    records: topDiag.records || [],
                  });
                }
              }}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-rose-50/50 p-1.5 rounded-lg transition"
              title="Klik untuk melihat pasien diagnosa terbanyak"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <HeartPulse className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Diagnosa Terbanyak</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block truncate" title={chartDiagData[0]?.name}>
                  {chartDiagData[0] ? chartDiagData[0].name : '-'}
                </span>
                {chartDiagData[0] && (
                  <span className="text-[10px] sm:text-[11px] font-bold text-rose-700 block">
                    {chartDiagData[0].kasus} Kasus
                  </span>
                )}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Kategori Penyakit</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">{chartDiagData.length} Diagnosa Utama</span>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="w-full max-w-full overflow-hidden pt-1">
            {mounted && (
              <div className="w-full">
                <div className="flex items-center justify-end pb-1.5 text-[11px] text-slate-500 font-medium sm:hidden">
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                    ⇄ Geser horizontal untuk melihat grafik lengkap
                  </span>
                </div>
                <div className="w-full overflow-x-auto pb-2">
                  <div
                    style={{
                      minWidth: '480px',
                      width: '100%',
                      height: `${Math.max(340, chartDiagData.length * 40)}px`,
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={chartDiagData}
                        margin={{ top: 10, right: 35, left: 10, bottom: 10 }}
                        onClick={(e) => {
                          if (e && e.activePayload && e.activePayload[0]) {
                            const item = e.activePayload[0].payload;
                            if (item.name) {
                              openPatientModal({
                                title: `Daftar Pasien: Diagnosa ${item.name}`,
                                subtitle: `Menampilkan seluruh ${item.kasus} pasien yang terdiagnosa ${item.name}`,
                                categoryName: item.name,
                                iconType: 'diagnosa',
                                records: item.records || [],
                              });
                            }
                          }
                        }}
                      >
                        <defs>
                          <linearGradient id="amberBarGradDiagH" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#d97706" />
                            <stop offset="100%" stopColor="#f59e0b" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#64748b" allowDecimals={false} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }}
                          stroke="#64748b"
                          width={190}
                          tickFormatter={(val) => (val && val.length > 26 ? `${val.substring(0, 24)}...` : val)}
                        />
                        <Tooltip content={<CustomGenderTooltip />} />
                        <Bar
                          dataKey="kasus"
                          name="Jumlah Kasus"
                          fill="url(#amberBarGradDiagH)"
                          radius={[0, 6, 6, 0]}
                          barSize={20}
                          className="cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <LabelList dataKey="kasus" position="right" fill="#b45309" fontSize={11} fontWeight="bold" offset={6} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ==================================================== */}
        {/* CHART 7: Penggunaan Obat di Klinik (Full Width)      */}
        {/* ==================================================== */}
        <div className="p-3.5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 max-w-full overflow-hidden">
          {/* Header Section */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-cyan-100 text-cyan-800 shrink-0 shadow-2xs">
                <Pill className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Penggunaan Obat di Inhouse Clinic</h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-cyan-50 text-cyan-700 border border-cyan-200">
                    DB Master: {totalMasterObat} Jenis Obat
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
                  Distribusi jenis obat yang paling sering diresepkan • Klik batang untuk buka daftar nama pasien
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-between sm:justify-end">
              <div className="relative flex-1 sm:flex-initial">
                <select
                  id="filter-entitas-obat"
                  value={filterEntitasObat}
                  onChange={(e) => setFilterEntitasObat(e.target.value)}
                  className="w-full sm:w-auto appearance-none bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs border border-emerald-700 rounded-xl pl-3 pr-8 py-2 outline-none cursor-pointer focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
                >
                  {ENTITAS_LIST.map((ent) => (
                    <option key={ent.value} value={ent.value} className="bg-white text-slate-900 font-medium">
                      {ent.label}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-white">
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleExportCSV('obat')}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition border border-slate-200 shadow-2xs cursor-pointer active:scale-98 shrink-0"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
                <span>Ekspor Excel (.xls)</span>
              </button>
            </div>
          </div>

          {/* Quick KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50/90 p-2.5 sm:p-3 rounded-xl border border-slate-100">
            <div
              onClick={() =>
                openPatientModal({
                  title: 'Seluruh Pasien Penerima Terapi Obat',
                  subtitle: `Menampilkan seluruh ${chartObatData.reduce((acc, c) => acc + c.diberikan, 0)} pemberian obat`,
                  categoryName: 'Semua Obat',
                  iconType: 'obat',
                  records: chartObatData.flatMap((o) => o.records || []),
                })
              }
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-cyan-50/50 p-1.5 rounded-lg transition"
              title="Klik untuk melihat seluruh pasien penerima obat"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
                <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Pemberian</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">
                  {chartObatData.reduce((acc, c) => acc + c.diberikan, 0)} Kali Diberikan
                </span>
              </div>
            </div>
            <div
              onClick={() => {
                const topObat = chartObatData[0];
                if (topObat) {
                  openPatientModal({
                    title: `Daftar Pasien: Terapi Obat ${topObat.name}`,
                    subtitle: `Obat paling sering diresepkan (${topObat.diberikan} kali)`,
                    categoryName: topObat.name,
                    iconType: 'obat',
                    records: topObat.records || [],
                  });
                }
              }}
              className="flex items-center gap-2 sm:gap-2.5 cursor-pointer hover:bg-emerald-50/50 p-1.5 rounded-lg transition"
              title="Klik untuk melihat pasien penerima obat terbanyak"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Obat Terbanyak</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block truncate" title={chartObatData[0]?.name}>
                  {chartObatData[0] ? chartObatData[0].name : '-'}
                </span>
                {chartObatData[0] && (
                  <span className="text-[10px] sm:text-[11px] font-bold text-emerald-700 block">
                    {chartObatData[0].diberikan}x Diberikan
                  </span>
                )}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 flex items-center gap-2 sm:gap-2.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Master Terdaftar</span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 block">{totalMasterObat} Jenis Obat</span>
              </div>
            </div>
          </div>

          {/* Chart Area */}
          <div className="w-full max-w-full overflow-hidden pt-1">
            {mounted && (
              <div className="w-full">
                <div className="flex items-center justify-end pb-1.5 text-[11px] text-slate-500 font-medium sm:hidden">
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                    ⇄ Geser horizontal untuk melihat grafik lengkap
                  </span>
                </div>
                <div className="w-full overflow-x-auto pb-2">
                  <div
                    style={{
                      minWidth: '480px',
                      width: '100%',
                      height: `${Math.max(340, chartObatData.length * 40)}px`,
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={chartObatData}
                        margin={{ top: 10, right: 35, left: 10, bottom: 10 }}
                        onClick={(e) => {
                          if (e && e.activePayload && e.activePayload[0]) {
                            const item = e.activePayload[0].payload;
                            if (item.name) {
                              openPatientModal({
                                title: `Daftar Pasien: Terapi Obat ${item.name}`,
                                subtitle: `Menampilkan seluruh ${item.diberikan} pasien yang diberikan obat ${item.name}`,
                                categoryName: item.name,
                                iconType: 'obat',
                                records: item.records || [],
                              });
                            }
                          }
                        }}
                      >
                        <defs>
                          <linearGradient id="cyanBarGradObatH" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#0891b2" />
                            <stop offset="100%" stopColor="#06b6d4" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                        <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#64748b" allowDecimals={false} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          tick={{ fontSize: 11, fontWeight: 600, fill: '#334155' }}
                          stroke="#64748b"
                          width={180}
                          tickFormatter={(val) => (val && val.length > 26 ? `${val.substring(0, 24)}...` : val)}
                        />
                        <Tooltip content={<CustomGenderTooltip />} />
                        <Bar
                          dataKey="diberikan"
                          name="Jumlah Diberikan"
                          fill="url(#cyanBarGradObatH)"
                          radius={[0, 6, 6, 0]}
                          barSize={20}
                          className="cursor-pointer hover:opacity-90 transition-opacity"
                        >
                          <LabelList dataKey="diberikan" position="right" fill="#0891b2" fontSize={11} fontWeight="bold" offset={6} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* INTERACTIVE PATIENT LIST MODAL DIALOG               */}
      {/* ==================================================== */}
      {patientModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-2xl shrink-0 shadow-2xs ${getModalHeaderTheme().bg}`}>
                  {getModalHeaderTheme().icon}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {patientModal.title}
                    </h3>
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${getModalHeaderTheme().badge}`}>
                      {patientModal.records.length} Pasien
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                    {patientModal.subtitle}
                  </p>
                </div>
              </div>

              {/* Top Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleExportModalExcel}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition cursor-pointer active:scale-98"
                  title="Unduh data pasien dalam format Excel terpisah kolom (.xls)"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Unduh Excel</span>
                </button>
                <button
                  type="button"
                  onClick={closePatientModal}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
                  title="Tutup Jendela"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter & Live Search Bar inside Modal */}
            <div className="px-5 sm:px-6 py-3 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama pasien, NIK, divisi, diagnosa, obat..."
                  value={modalSearchQuery}
                  onChange={(e) => setModalSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 text-xs font-medium text-slate-800 placeholder-slate-400 border border-slate-200 rounded-xl pl-9 pr-7 py-2 outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition shadow-2xs"
                />
                {modalSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setModalSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status pill filter */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setModalStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${modalStatusFilter === 'all'
                      ? 'bg-emerald-800 text-white shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Semua ({patientModal.records.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStatusFilter('fit')}
                    className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${modalStatusFilter === 'fit'
                      ? 'bg-emerald-800 text-white shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Fit
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStatusFilter('catatan')}
                    className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${modalStatusFilter === 'catatan'
                      ? 'bg-amber-600 text-white shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Fit dg Catatan
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalStatusFilter('tidak_fit')}
                    className={`px-2.5 py-1 rounded-lg transition text-[11px] cursor-pointer ${modalStatusFilter === 'tidak_fit'
                      ? 'bg-rose-600 text-white shadow-2xs font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    Tidak Fit
                  </button>
                </div>

                <span className="text-[11px] font-bold text-slate-500 ml-1">
                  Menampilkan <strong>{modalFilteredRecords.length}</strong> Pasien
                </span>
              </div>
            </div>

            {/* Modal Table Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
              {modalFilteredRecords.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Tidak ada data pasien yang cocok</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {modalSearchQuery
                      ? `Tidak ditemukan pasien dengan kata kunci "${modalSearchQuery}". Coba kata kunci lain.`
                      : 'Belum ada data pasien yang tersimpan untuk kategori ini.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-100/80 text-[11px] font-black uppercase text-slate-500 border-b border-slate-200 tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                      <tr>
                        <th className="py-3 px-3.5 text-center w-10">No</th>
                        <th className="py-3 px-4">Nama Pasien &amp; NIK</th>
                        <th className="py-3 px-4">Entitas &amp; Divisi</th>
                        <th className="py-3 px-4">Tanggal Kunjungan</th>
                        <th className="py-3 px-4">Keluhan &amp; Diagnosa</th>
                        <th className="py-3 px-4">Tindakan / Terapi / Poli</th>
                        <th className="py-3 px-4 text-center">Status Kebugaran</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {modalFilteredRecords.map((rec, index) => {
                        const isMale =
                          rec.jenis_kelamin?.toLowerCase() === 'laki-laki' ||
                          rec.jenis_kelamin?.toLowerCase() === 'l' ||
                          rec.gender?.toLowerCase() === 'laki-laki' ||
                          rec.gender?.toLowerCase() === 'l';

                        const rawStatus = (rec.status_kebugaran || rec.kesimpulan || '').toLowerCase();
                        let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        let labelStatus = 'Fit';

                        if (rawStatus.includes('catatan') || rawStatus === 'fit_dengan_catatan') {
                          badgeStyle = 'bg-amber-50 text-amber-700 border-amber-200';
                          labelStatus = 'Fit dg Catatan';
                        } else if (rawStatus.includes('sementara') || rawStatus.includes('evaluasi') || rawStatus === 'sementara_tidak_fit') {
                          badgeStyle = 'bg-rose-50 text-rose-700 border-rose-200';
                          labelStatus = 'Sementara Tidak Fit';
                        }

                        const obatList = Array.isArray(rec.obat) ? rec.obat : Array.isArray(rec.obat_list) ? rec.obat_list : [];
                        const poliName = rec.nama_poli || (rec as any).nama_poli_rujukan;

                        return (
                          <tr key={rec.id || index} className="hover:bg-slate-50/80 transition group">
                            <td className="py-3 px-3.5 text-center font-bold text-slate-400 text-[11px]">
                              {index + 1}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${isMale ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'
                                    }`}
                                  title={isMale ? 'Laki-laki' : 'Perempuan'}
                                >
                                  {isMale ? '♂' : '♀'}
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-900 block truncate group-hover:text-emerald-800 transition">
                                    {rec.nama_lengkap || rec.nama_karyawan || 'Nama Tidak Terdata'}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono block">
                                    NIK: {rec.nik || '-'}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-0.5">
                                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {rec.departemen || (rec as any).entitas || 'PTPN 3'}
                                </span>
                                <span className="text-[11px] text-slate-600 block truncate font-semibold" title={rec.divisi || '-'}>
                                  {rec.divisi || '-'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-slate-700 font-bold text-[11px]">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{formatDateIndo(rec.tanggal_pemeriksaan || rec.tanggal_kunjungan)}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-0.5 max-w-[200px]">
                                <span className="font-bold text-slate-800 block text-xs">
                                  {normalizeDiagnosaName(rec.diagnosa || rec.diagnosa_klinik) || 'Pemeriksaan Rutin'}
                                </span>
                                {rec.keluhan && (
                                  <span className="text-[10px] text-slate-400 block truncate" title={rec.keluhan}>
                                    Keluhan: {rec.keluhan}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1 max-w-[220px]">
                                {poliName && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 truncate">
                                    <Stethoscope className="w-3 h-3 shrink-0" />
                                    <span>Rujuk: {poliName}</span>
                                  </span>
                                )}
                                {obatList.length > 0 && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-cyan-50 text-cyan-800 border border-cyan-200 truncate block" title={obatList.join(', ')}>
                                    <Pill className="w-3 h-3 shrink-0" />
                                    <span>{obatList.join(', ')}</span>
                                  </span>
                                )}
                                {!poliName && obatList.length === 0 && (
                                  <span className="text-[11px] text-slate-500">
                                    {rec.tindak_lanjut || rec.tindakan_terapi || 'Rawat Jalan & Obat'}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border ${badgeStyle}`}>
                                {labelStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  if (rec.id) {
                                    router.push(`/klinik/detail-mini-mcu?id=${rec.id}`);
                                  } else {
                                    router.push(`/klinik/rekapan-mini-mcu?search=${encodeURIComponent(rec.nama_lengkap || rec.nama_karyawan || '')}`);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold border border-emerald-200 transition shadow-2xs cursor-pointer active:scale-95"
                                title="Lihat Rekam Medis Pasien"
                              >
                                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                                <span>Detail</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 flex-wrap text-xs">
              <div className="text-slate-500 font-medium">
                Total Pasien Terpilih: <strong className="text-slate-900">{patientModal.records.length} Pasien</strong> (Laki-laki: {getGenderStats(patientModal.records).laki}, Perempuan: {getGenderStats(patientModal.records).perempuan})
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closePatientModal}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
