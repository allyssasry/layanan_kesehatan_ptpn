'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useMcu } from '@/context/McuContext';
import { McuRecord, MiniMcuRecord } from '@/types/mcu';
import { HealthTrendChart } from '@/components/mcu/HealthTrendChart';
import { getRecordTimestamp } from '@/services/mcuService';
import { DocumentPreviewModal } from '@/components/common/DocumentPreviewModal';
import * as XLSX from 'xlsx';
import {
  Upload,
  FileText,
  Heart,
  Activity,
  User as UserIcon,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  X,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  Building2,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ChevronDown,
  Paperclip,
  Check,
  BellRing,
  HeartPulse,
  Pill,
  Hospital,
  AlertCircle,
} from 'lucide-react';

// ==========================================
// HELPER FUNCTIONS & FORMATTERS
// ==========================================

function formatDate(dateStr: string | null | undefined, includeTime?: boolean, timeStr?: string): string {
  if (!dateStr) return '-';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    let formattedDate = dateStr;
    const isoDateMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      const day = parseInt(isoDateMatch[3], 10);
      const monthIdx = parseInt(isoDateMatch[2], 10) - 1;
      const year = parseInt(isoDateMatch[1], 10);
      formattedDate = `${day} ${months[monthIdx] || 'September'} ${year}`;
    } else {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = d.getDate();
        formattedDate = `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
      }
    }

    if (includeTime) {
      let timePart = timeStr;
      if (!timePart) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          timePart = `${hh}:${mm} WIB`;
        }
      }
      if (timePart) {
        const cleanTime = timePart.toLowerCase().includes('wib') ? timePart : `${timePart} WIB`;
        return `${formattedDate}, ${cleanTime}`;
      }
    }

    return formattedDate;
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
      const day = parseInt(isoDateMatch[3], 10);
      const monthIdx = parseInt(isoDateMatch[2], 10) - 1;
      const year = parseInt(isoDateMatch[1], 10);
      return `${day} ${months[monthIdx] || 'Sep'} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) {
    const now = new Date();
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const isoDateMatch = String(dateStr).match(/^(\d{4})-(\d{2})/);
    if (isoDateMatch) {
      const monthIdx = parseInt(isoDateMatch[2], 10) - 1;
      const year = parseInt(isoDateMatch[1], 10);
      return `${months[monthIdx] || 'September'} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function getKesimpulanLabel(kesimpulan?: string): string {
  if (!kesimpulan) return 'Fit for Duty';
  const clean = kesimpulan.toLowerCase().replace(/[\s-]+/g, '_');
  if (clean.includes('sementara_tidak_fit') || clean.includes('temporary_unfit')) {
    return 'Sementara Tidak Fit';
  }
  if (clean.includes('unfit') || clean.includes('tidak_fit')) {
    return 'Unfit';
  }
  if (clean.includes('catatan') || clean.includes('fit_dengan_catatan')) {
    return 'Fit dengan Catatan';
  }
  return 'Fit for Duty';
}

function getBadgeStyle(kesimpulan?: string): string {
  if (!kesimpulan) return 'bg-[#005930] text-white';
  const clean = kesimpulan.toLowerCase().replace(/[\s-]+/g, '_');
  if (clean.includes('sementara_tidak_fit') || clean.includes('unfit') || clean.includes('tidak_fit')) {
    return 'bg-rose-600 text-white';
  }
  if (clean.includes('catatan') || clean.includes('fit_dengan_catatan')) {
    return 'bg-amber-500 text-white';
  }
  return 'bg-[#005930] text-white';
}

function calculateBmiVal(tb?: number | null, bb?: number | null): number | null {
  if (!tb || !bb || tb <= 0 || bb <= 0) return null;
  const hm = tb / 100;
  return Number((bb / (hm * hm)).toFixed(1));
}

function getBmiKlasifikasi(bmi: number | null | undefined): string {
  if (!bmi || bmi <= 0) return '-';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25.0) return 'Normal';
  if (bmi < 27.0) return 'Overweight';
  return 'Obesitas';
}

// Render Bullet list helper matching Blade `renderBulletListEmp`
function BulletList({ text }: { text?: string | string[] | null }) {
  if (!text) {
    return <p className="text-xs font-semibold text-slate-400 italic">- Tidak Ada Catatan -</p>;
  }

  if (Array.isArray(text)) {
    const items = text.map((t) => String(t).trim()).filter(Boolean);
    if (items.length === 0) {
      return <p className="text-xs font-semibold text-slate-400 italic">- Tidak Ada Catatan -</p>;
    }
    return (
      <ul className="m-0 pl-4 list-disc text-slate-800 text-xs font-semibold space-y-1">
        {items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
    );
  }

  const lines = String(text)
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return <p className="text-xs font-semibold text-slate-400 italic">- Tidak Ada Catatan -</p>;
  }

  return (
    <ul className="m-0 pl-4 list-disc text-slate-800 text-xs font-semibold space-y-1">
      {lines.map((line, idx) => (
        <li key={idx}>{line}</li>
      ))}
    </ul>
  );
}

// Normal Value Thresholds
const NORMAL_SYSTOLIC = 120;
const NORMAL_DIASTOLIC = 80;
const NORMAL_GULA = 140;
const NORMAL_KOLESTEROL = 200;
const NORMAL_ASAM_URAT = 7.0;

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const { mcuRecords, miniMcuRecords, karyawanRecords, isLoading } = useMcu();
  const router = useRouter();

  const [activeKey, setActiveKey] = useState<string>('');
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<(McuRecord & { created_by_role: string }) | null>(null);
  const [previewDocModal, setPreviewDocModal] = useState<{ open: boolean; title: string; url?: string | null }>({
    open: false,
    title: '',
    url: null,
  });

  // Display user info
  const displayName = user?.name || 'allyssa';
  const displayNik = user?.nik || '678976';
  const displayDivisi = user?.divisi || 'DPDU';

  // 1. Filter records strictly belonging to the logged-in employee (matching database)
  const allUserRecords = useMemo(() => {
    if (!user) return [];
    const uName = (user.name || '').trim().toLowerCase();
    const uNik = (user.nik || '').trim().toLowerCase();

    const combined: Array<McuRecord & { created_by_role: string }> = [
      ...mcuRecords.map((r) => {
        const isKlinik = r.created_by_role === 'klinik';
        const role = isKlinik ? 'klinik' : 'admin';
        return {
          ...r,
          created_by_role: role,
        };
      }),
      ...miniMcuRecords.map((r) => {
        return {
          ...r,
          created_by_role: 'klinik',
        };
      }),
      ...(karyawanRecords || []).map((r) => {
        return {
          ...r,
          created_by_role: 'karyawan',
          diagnosa: r.diagnosa || 'Pemeriksaan Mandiri',
          faktor_risiko: r.faktor_risiko || 'Tidak memiliki faktor risiko',
          penyakit: Array.isArray(r.penyakit) ? r.penyakit : [],
          anjuran: r.anjuran || r.saran || 'Pemeriksaan Mandiri',
          intervensi: [],
          obat: [],
        };
      }),
    ];

    // Filter strictly by user's NIK or Name
    return combined.filter((r) => {
      const rNik = (r.nik || '').trim().toLowerCase();
      const rName = (r.nama_lengkap || (r as any).nama_karyawan || '').trim().toLowerCase();

      if (uNik && rNik && rNik === uNik) return true;
      if (uName && rName && (rName === uName || rName.includes(uName) || uName.includes(rName))) return true;
      return false;
    });
  }, [user, mcuRecords, miniMcuRecords, karyawanRecords]);

  // 2. Sort records for history tabs (Desc) and chart (Asc) using getRecordTimestamp
  const historyRecordsDesc = useMemo(() => {
    return [...allUserRecords].sort((a, b) => {
      const timeA = getRecordTimestamp(a);
      const timeB = getRecordTimestamp(b);
      if (timeA !== timeB) return timeB - timeA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [allUserRecords]);

  const historyRecordsAsc = useMemo(() => {
    return [...allUserRecords].sort((a, b) => {
      const timeA = getRecordTimestamp(a);
      const timeB = getRecordTimestamp(b);
      if (timeA !== timeB) return timeA - timeB;
      return (Number(a.id) || 0) - (Number(b.id) || 0);
    });
  }, [allUserRecords]);

  // Initialize activeKey when records load or change
  useEffect(() => {
    if (historyRecordsDesc.length > 0 && !activeKey) {
      const first = historyRecordsDesc[0];
      setActiveKey(`${first.created_by_role}-${first.id}`);
    }
  }, [historyRecordsDesc, activeKey]);

  // Current active record being viewed in detail panel
  const activeRecord = useMemo(() => {
    if (historyRecordsDesc.length === 0) return null;
    if (!activeKey) return historyRecordsDesc[0];
    const found = historyRecordsDesc.find((r) => `${r.created_by_role}-${r.id}` === activeKey);
    return found || historyRecordsDesc[0];
  }, [historyRecordsDesc, activeKey]);

  // Latest record for overall summary badge & Left Column (Always newest across ALL sources)
  const latestRecord = historyRecordsDesc[0] || activeRecord;

  // Employee Photo fallback across all their records
  const employeePhoto = useMemo(() => {
    for (const r of allUserRecords) {
      if (r.foto && typeof r.foto === 'string' && r.foto.trim()) {
        return r.foto;
      }
    }
    return latestRecord?.foto || null;
  }, [allUserRecords, latestRecord]);

  // Check if employee has active / unresolved Kuratif or Rehabilitatif follow-up
  const activeFollowUps = useMemo(() => {
    if (!allUserRecords || allUserRecords.length === 0) return [];

    const todayStr = new Date().toISOString().split('T')[0];
    const todayTime = new Date(todayStr).getTime();

    const results: Array<{
      id: number;
      created_by_role: string;
      record: McuRecord & { created_by_role: string };
      hasKuratif: boolean;
      hasRehabilitatif: boolean;
      kuratifPrograms: string[];
      rehabilitatifPrograms: string[];
      tanggalLanjutan: string | null;
      catatan: string | null;
      isOverdue: boolean;
      isToday: boolean;
      rsRujukan: string | null;
      poliRujukan: string | null;
      fileRujukan: string | null;
      sourceLabel: string;
      sessionDate: string | null;
    }> = [];

    allUserRecords.forEach((rec) => {
      // If already finished/handled globally, skip completely (notification disappears)
      if (rec.tindak_lanjut_selesai) return;

      const rawIntervensi = rec.intervensi;
      const arr: string[] = Array.isArray(rawIntervensi)
        ? rawIntervensi.map(String)
        : typeof rawIntervensi === 'string' && rawIntervensi.trim().length > 0
        ? (rawIntervensi.includes('|') ? rawIntervensi.split(/\s*\|\s*/) : rawIntervensi.includes('\n') ? rawIntervensi.split(/\n+/) : [rawIntervensi]).map((s) => s.trim()).filter(Boolean)
        : [];

      // Detect Kuratif
      const kuratifKeys = ['konsultasi lanjutan', 'employee health counseling program', 'ehcp', 'kesegaran', 'kuratif'];
      const kuratifPrograms = arr.filter((i) => kuratifKeys.some((k) => i.toLowerCase().includes(k)));
      const hasKuratif = (kuratifPrograms.length > 0 || Boolean(rec.catatan_intervensi_kuratif && String(rec.catatan_intervensi_kuratif).trim()) || Boolean((rec as any).tanggal_kuratif)) && !rec.tindak_lanjut_selesai_kuratif;

      // Detect Rehabilitatif
      const rehabKeys = ['monitoring hasil tindak lanjut oleh dokter ahli', 'dokter ahli', 'rehabilitatif', 'rujukan'];
      const rehabilitatifPrograms = arr.filter((i) => rehabKeys.some((k) => i.toLowerCase().includes(k)));
      const hasRehabilitatif = (rehabilitatifPrograms.length > 0 || Boolean(rec.catatan_intervensi_rehabilitatif && String(rec.catatan_intervensi_rehabilitatif).trim()) || Boolean((rec as any).tanggal_rehabilitatif)) && !rec.tindak_lanjut_selesai_rehabilitatif;

      // Also check if flagged with butuh_tindak_lanjut from clinic
      const isKuratifOrRehab = (hasKuratif || hasRehabilitatif || (Boolean(rec.butuh_tindak_lanjut) && rec.created_by_role !== 'karyawan'));

      if (isKuratifOrRehab) {
        let tglLanjutan = rec.tanggal_pemeriksaan_lanjutan || (rec as any).tanggal_kuratif || (rec as any).tanggal_rehabilitatif || null;
        if (!tglLanjutan && rec.intervensi) {
          const rawStr = Array.isArray(rec.intervensi) ? rec.intervensi.join(' ') : String(rec.intervensi || '');
          const m = rawStr.match(/(?:Tgl|Tanggal)[:\s]+(\d{4}-\d{2}-\d{2})/i) || rawStr.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
          if (m && m[1]) tglLanjutan = m[1];
        }

        let isToday = false;
        let isOverdue = false;
        if (tglLanjutan) {
          const tTime = new Date(tglLanjutan).getTime();
          if (tglLanjutan === todayStr) isToday = true;
          else if (tTime < todayTime) isOverdue = true;
        }

        const combinedCatatan = [
          rec.catatan_intervensi_kuratif,
          rec.catatan_intervensi_rehabilitatif,
          rec.catatan_intervensi,
        ].filter((c) => c && String(c).trim() && String(c).trim() !== 'Pemeriksaan Mandiri').join(' • ');

        const finalHasKuratif = hasKuratif || (!hasRehabilitatif);
        const finalHasRehab = hasRehabilitatif;

        results.push({
          id: rec.id,
          created_by_role: rec.created_by_role,
          record: rec,
          hasKuratif: finalHasKuratif,
          hasRehabilitatif: finalHasRehab,
          kuratifPrograms,
          rehabilitatifPrograms,
          tanggalLanjutan: tglLanjutan,
          catatan: combinedCatatan || null,
          isOverdue,
          isToday,
          rsRujukan: rec.nama_rs && rec.nama_rs !== '-' ? rec.nama_rs : null,
          poliRujukan: rec.nama_poli && rec.nama_poli !== '-' ? rec.nama_poli : null,
          fileRujukan: rec.file_rujukan || rec.file_surat_rujukan_intervensi || null,
          sourceLabel: rec.created_by_role === 'klinik' ? 'Mini MCU Klinik' : 'MCU RS',
          sessionDate: rec.tanggal_pemeriksaan || null,
        });
      }
    });

    return results;
  }, [allUserRecords]);

  // Horizontal scroll buttons handler
  const scrollSessions = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = scrollContainerRef.current.clientWidth * 0.75;
    if (direction === 'left') {
      scrollContainerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Export Single Record to Excel
  const handleExportSingleExcel = (rec: McuRecord & { created_by_role: string }) => {
    const isMini = rec.created_by_role === 'klinik';
    const filename = `Data_Rekap_${(rec.nama_lengkap || rec.nama_karyawan || displayName).replace(/[^A-Za-z0-9]/g, '_')}.xlsx`;

    const data = [
      {
        'Tipe Pemeriksaan': isMini ? 'Inhouse Clinic (Mini MCU)' : 'Medical Check Up (MCU RS)',
        'Nama Lengkap': rec.nama_lengkap || rec.nama_karyawan || displayName,
        'NIK': rec.nik || displayNik,
        'Divisi': rec.divisi || displayDivisi,
        'Jabatan': rec.jabatan || rec.kategori_peserta || 'Karyawan',
        'Departemen / Entitas': rec.departemen || 'PTPN 3',
        'Tanggal Pemeriksaan': rec.tanggal_pemeriksaan || '-',
        'Tensi Darah': rec.tensi || '-',
        'Tinggi Badan (cm)': rec.tinggi_badan || '-',
        'Berat Badan (kg)': rec.berat_badan || '-',
        'BMI': rec.bmi || '-',
        'Gula Darah (mg/dL)': rec.gula_darah || '-',
        'Kolesterol (mg/dL)': rec.kolesterol || '-',
        'Asam Urat (mg/dL)': rec.asam_urat || '-',
        'Suhu (°C)': rec.suhu || '-',
        'Kesimpulan': getKesimpulanLabel(rec.kesimpulan),
        'Keluhan': rec.keluhan || '-',
        'Faktor Resiko': rec.faktor_risiko || rec.penyakit_text || '-',
        'Diagnosa': rec.diagnosa || '-',
        'Tindak Lanjut / Saran': rec.anjuran || rec.saran || '-',
        'Obat': Array.isArray(rec.obat) ? rec.obat.join(', ') : (rec.obat || '-'),
        'Intervensi': Array.isArray(rec.intervensi) ? rec.intervensi.join(', ') : (rec.intervensi || '-'),
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Rekap Medis');
    XLSX.writeFile(workbook, filename);
  };

  const safeName = (latestRecord?.nama_lengkap || displayName).replace(/[^A-Za-z0-9]/g, '_');

  // Dynamically resolve all physical vitals for latest record (from Karyawan, Klinik, or Admin)
  const latestTbVal = latestRecord?.tinggi_badan ?? (latestRecord?.vitals as any)?.tinggi_badan ?? (user as any)?.tinggi_badan ?? null;
  const latestBbVal = latestRecord?.berat_badan ?? (latestRecord?.vitals as any)?.berat_badan ?? (user as any)?.berat_badan ?? null;

  const parsedTb = parseFloat(String(latestTbVal || '').replace(/[^\d.]/g, '')) || 0;
  const parsedBb = parseFloat(String(latestBbVal || '').replace(/[^\d.]/g, '')) || 0;
  const currentBmi = parsedTb > 0 && parsedBb > 0
    ? Number((parsedBb / ((parsedTb / 100) * (parsedTb / 100))).toFixed(1))
    : (Number(latestRecord?.bmi || (latestRecord?.vitals as any)?.bmi) || (parsedTb && parsedBb ? calculateBmiVal(parsedTb, parsedBb) : 22.5));
  const currentBmiKlasifikasi = getBmiKlasifikasi(currentBmi);

  const latestTensiVal = latestRecord?.tensi ||
    (latestRecord?.vitals as any)?.tensi ||
    (latestRecord?.vitals?.tensi_sistolik && latestRecord?.vitals?.tensi_diastolik
      ? `${latestRecord.vitals.tensi_sistolik}/${latestRecord.vitals.tensi_diastolik}`
      : '-');

  const latestGulaVal = latestRecord?.gula_darah ?? (latestRecord?.vitals as any)?.gula_darah ?? '-';
  const latestKolesterolVal = latestRecord?.kolesterol ?? (latestRecord?.vitals as any)?.kolesterol ?? '-';
  const latestAsamUratVal = latestRecord?.asam_urat ?? (latestRecord?.vitals as any)?.asam_urat ?? '-';
  const latestSuhuVal = latestRecord?.suhu ?? (latestRecord?.vitals as any)?.suhu ?? '36.5';

  const isLatestMandiri = latestRecord?.created_by_role === 'karyawan' ||
    latestRecord?.vitals_updated_by_role === 'karyawan' ||
    (latestRecord?.nama_dokter && latestRecord.nama_dokter.toLowerCase().includes('mandiri')) ||
    (latestRecord?.diagnosa && latestRecord.diagnosa.toLowerCase().includes('mandiri')) ||
    (latestRecord?.nama_rs && latestRecord.nama_rs.toLowerCase().includes('mandiri'));

  const latestSourceTag = isLatestMandiri
    ? 'Pemeriksaan Mandiri Karyawan'
    : latestRecord?.created_by_role === 'klinik'
    ? 'Layanan Inhouse Clinic'
    : 'Medical Check Up (MCU RS)';

  const lastUpdatedFormatted = useMemo(() => {
    if (!latestRecord) return '-';
    return formatDate(
      latestRecord.tanggal_pemeriksaan,
      true,
      (latestRecord as any).jam_pemeriksaan || (latestRecord as any).jam_periksa || (latestRecord as any).vitals_updated_at || (latestRecord as any).created_at
    );
  }, [latestRecord]);

  return (
    <AppLayout>
      <div className="w-full space-y-6">

        {/* LOADING STATE */}
        {isLoading && (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-emerald-700 border-t-transparent rounded-full mb-3" />
            <p className="text-xs font-bold text-slate-500">Memuat data rekam medis karyawan...</p>
          </div>
        )}

        {/* ==================================================== */}
        {/* CASE 1: EMPTY STATE CARD (No records found for user) */}
        {/* ==================================================== */}
        {!isLoading && !activeRecord && (
          <div className="bg-white rounded-2xl p-10 sm:p-14 text-center border border-slate-200 shadow-xs">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <FileText className="w-8 h-8 text-emerald-900" />
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mb-2">
              Belum Ada Data Rekam Medis Karyawan
            </h3>
            <p className="text-sm font-medium text-slate-600 max-w-lg mx-auto mb-4 leading-relaxed">
              Anda dapat memulai dengan mengunggah berkas MCU mandiri atau memperbarui pengukuran fisik dan tanda vital Anda di bawah ini.
            </p>
            <div className="text-xs font-semibold text-slate-600 mb-6">
              Nama: <strong>{displayName}</strong> &bull; NIK: <strong>{displayNik}</strong> &bull; Divisi: <strong>{displayDivisi}</strong>
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/employee/unggah-data?tab=mcu"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#055E38] hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Dokumen MCU</span>
              </Link>
              <Link
                href="/employee/unggah-data?tab=vitals"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 rounded-xl shadow-xs transition cursor-pointer"
              >
                <Activity className="w-4 h-4 text-emerald-700" />
                <span>Isi Pengukuran Fisik &amp; Vitals</span>
              </Link>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* CASE 2: MAIN DETAIL CANVAS MATCHING REAL DATABASE    */}
        {/* ==================================================== */}
        {!isLoading && activeRecord && (
          <div className="w-full bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-6 lg:p-8 shadow-xs space-y-6 sm:space-y-8 max-w-full overflow-hidden">

            {/* TOP HEADER INFO */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-slate-100">
              <div className="min-w-0">
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <UserIcon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Portal Dashboard Utama Karyawan - Ringkasan Pengukuran Vitals &amp; Grafik Tren</span>
                  </span>
                </div>
                <div className="flex items-center gap-3.5 sm:gap-4 flex-wrap">
                  {employeePhoto ? (
                    <img
                      src={employeePhoto}
                      alt={latestRecord.nama_lengkap || displayName}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border-2 border-[#0a5c36] shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#0a5c36] text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
                      {(latestRecord.nama_lengkap || displayName).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                      <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {latestRecord.nama_lengkap || displayName}
                      </h1>
                      <span className={`inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs font-bold shadow-xs ${getBadgeStyle(latestRecord.kesimpulan)}`}>
                        Status Pemeriksaan Terakhir: {getKesimpulanLabel(latestRecord.kesimpulan)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      NIK: <span className="font-mono font-bold text-slate-700">{latestRecord.nik || displayNik}</span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs sm:text-sm font-medium text-slate-600">
                  <span>
                    <strong className="font-bold text-slate-900">Entitas:</strong>{' '}
                    <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-md text-xs">
                      {latestRecord.departemen || 'PTPN 3'}
                    </span>
                  </span>
                  <span>
                    <strong className="font-bold text-slate-900">Divisi:</strong>{' '}
                    {latestRecord.divisi &&
                    !['PTPN 1', 'PTPN 3', 'PTPN 4', 'ptpn 1', 'ptpn 3', 'ptpn 4', 'PTPN1', 'PTPN3', 'PTPN4', 'Holding', 'SuppCo', 'PalmCo'].includes(
                      latestRecord.divisi.trim()
                    ) &&
                    latestRecord.divisi.trim() !== '-'
                      ? latestRecord.divisi
                      : user?.divisi || '-'}
                  </span>
                  <span><strong className="font-bold text-slate-900">Jabatan:</strong> {latestRecord.jabatan || latestRecord.kategori_peserta || 'Magang'}</span>
                  <span><strong className="font-bold text-slate-900">No. Inhealth:</strong> {latestRecord.nomor_inhealth || '-'}</span>
                  <span>
                    <strong className="font-bold text-slate-900">Total Riwayat:</strong>{' '}
                    <span className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-md text-xs">
                      {historyRecordsDesc.length} Sesi Pemeriksaan
                    </span>
                  </span>
                </div>
              </div>

              {/* Action Buttons: Upload MCU, Update Vitals */}
              <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto shrink-0">
                <Link
                  href="/employee/unggah-data?tab=mcu"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#055E38] hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload MCU</span>
                </Link>
                <Link
                  href="/employee/unggah-data?tab=vitals"
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 rounded-xl shadow-xs transition cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-emerald-700" />
                  <span>Perbarui Vitals</span>
                </Link>
              </div>
            </div>

            {/* ==================================================== */}
            {/* NOTIFIKASI PEMERIKSAAN LANJUTAN (KURATIF / REHABILITATIF) */}
            {/* ==================================================== */}
            {/* ==================================================== */}
            {/* NOTIFIKASI PEMERIKSAAN LANJUTAN (KURATIF / REHABILITATIF) */}
            {/* ==================================================== */}
            {activeFollowUps.length > 0 && (
              <div className="p-3.5 sm:p-4 bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-amber-50/90 border border-amber-300/80 rounded-2xl shadow-xs space-y-3 animate-in fade-in">
                {/* Hub Header */}
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-amber-200/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <BellRing className="w-4 h-4 animate-bounce" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-black text-slate-900">
                          Pemberitahuan Jadwal Kontrol Medis
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                          {activeFollowUps.length} Jadwal Perlu Tindak Lanjut
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                        Lakukan pemeriksaan atau konsultasi lanjutan sesuai dengan jadwal rekomendasi medis yang telah ditentukan.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Schedules List (Compact Items) */}
                <div className="space-y-2">
                  {activeFollowUps.map((fu, idx) => {
                    const progs = fu.kuratifPrograms.concat(fu.rehabilitatifPrograms);
                    const programLabel = progs.length > 0
                      ? progs.map((p) => {
                          let c = p.replace(/^(?:Kuratif|Rehabilitatif|Promotif)(?:\s*\([^)]*\))?:\s*/i, '');
                          c = c.replace(/\s*\[Rujukan:[^\]]*\]/i, '');
                          return c.trim() || p;
                        }).join(', ')
                      : (fu.hasKuratif ? 'Konsultasi & Pemeriksaan Kuratif' : 'Monitoring Dokter Ahli');

                    return (
                      <div
                        key={`${fu.created_by_role}-${fu.id}-${idx}`}
                        className="p-3 bg-white/95 border border-amber-200/80 hover:border-amber-300 rounded-xl shadow-2xs transition flex flex-col md:flex-row md:items-center justify-between gap-3"
                      >
                        {/* Details */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          {/* Badges & Source */}
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                            {fu.hasKuratif && (
                              <span className="px-2 py-0.5 rounded-md font-black uppercase bg-amber-500 text-white shadow-2xs">
                                KURATIF
                              </span>
                            )}
                            {fu.hasRehabilitatif && (
                              <span className="px-2 py-0.5 rounded-md font-black uppercase bg-purple-600 text-white shadow-2xs">
                                REHABILITATIF
                              </span>
                            )}
                            {fu.isToday && (
                              <span className="px-2 py-0.5 rounded-md font-black bg-rose-500 text-white animate-pulse">
                                Hari Ini
                              </span>
                            )}
                            {fu.isOverdue && (
                              <span className="px-2 py-0.5 rounded-md font-black bg-rose-600 text-white animate-pulse">
                                Terlewat
                              </span>
                            )}
                            <span className="text-slate-400 font-medium">
                              • Sesi: <strong className="font-semibold text-slate-700">{fu.sourceLabel}</strong> ({formatDateShort(fu.sessionDate)})
                            </span>
                          </div>

                          {/* Date & Program */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="text-slate-500 font-medium">Jadwal:</span>
                              <strong className="font-extrabold text-slate-900">
                                {fu.tanggalLanjutan ? formatDate(fu.tanggalLanjutan) : 'Segera Hubungi Tim Medis'}
                              </strong>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <HeartPulse className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span className="text-slate-500 font-medium">Program:</span>
                              <strong className="font-bold text-slate-800 truncate max-w-[260px] sm:max-w-[360px]">
                                {programLabel}
                              </strong>
                            </div>

                            {(fu.rsRujukan || fu.poliRujukan) && (
                              <div className="text-[11px] text-slate-500">
                                (Rujukan: <span className="font-semibold text-slate-700">{fu.rsRujukan || ''}{fu.poliRujukan ? ` - ${fu.poliRujukan}` : ''}</span>)
                              </div>
                            )}
                          </div>

                          {/* Doctor's note */}
                          {fu.catatan && (
                            <p className="text-[11px] text-slate-600 italic bg-amber-50/60 px-2.5 py-1 rounded-lg border border-amber-100 line-clamp-1">
                              <strong className="not-italic text-amber-900 font-bold">Catatan:</strong> {fu.catatan}
                            </p>
                          )}
                        </div>

                        {/* Actions / Information Status */}
                        <div className="flex items-center gap-2 shrink-0 self-start md:self-center pt-1 md:pt-0">
                          {fu.fileRujukan && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewDocModal({
                                  open: true,
                                  title: 'Surat Rujukan Medis',
                                  url: fu.fileRujukan,
                                })
                              }
                              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              title="Buka Surat Rujukan"
                            >
                              <FileText className="w-3.5 h-3.5 text-sky-700" />
                              <span>Surat Rujukan</span>
                            </button>
                          )}
                          <span className="px-2.5 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Jadwal Kontrol</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==================================================== */}
            {/* SECTION 1: 2-COLUMN SIDE-BY-SIDE LAYOUT              */}
            {/* ==================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

              {/* LEFT COLUMN (5 Cols): Patient Profile & Physical Measurement Details */}
              <div className="lg:col-span-5 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <UserIcon className="w-5 h-5 text-emerald-800" />
                      <span>Profil &amp; Pengukuran Fisik Karyawan</span>
                    </h2>
                    <Link
                      href="/employee/unggah-data?tab=vitals"
                      className="px-2.5 py-1 bg-[#055E38] hover:bg-emerald-900 text-white font-bold text-xs rounded-lg transition flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Perbarui Nilai Fisik & Tanda Vital"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Perbarui</span>
                    </Link>
                  </div>

                  {/* Profile Header */}
                  <div className="flex items-start gap-4 mb-4">
                    {latestRecord.foto ? (
                      <img
                        src={latestRecord.foto}
                        alt="Foto Pasien"
                        className="w-20 h-20 rounded-2xl object-cover shrink-0 border border-slate-200 shadow-xs"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-[#055E38] text-white text-2xl font-black flex items-center justify-center shrink-0 shadow-xs">
                        {(latestRecord.nama_lengkap || displayName).substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-base font-extrabold text-slate-900 truncate">
                        {latestRecord.nama_lengkap || displayName}
                      </h3>
                      <p className="text-xs text-slate-600 font-medium">
                        Entitas: <span className="font-bold text-emerald-900">{latestRecord.departemen || 'PTPN 3'}</span>
                      </p>
                      <p className="text-xs text-slate-600 font-medium">NIK: {latestRecord.nik || displayNik}</p>
                      <p className="text-xs text-slate-600 font-medium">
                        Divisi:{' '}
                        {latestRecord.divisi &&
                        !['PTPN 1', 'PTPN 3', 'PTPN 4', 'ptpn 1', 'ptpn 3', 'ptpn 4', 'PTPN1', 'PTPN3', 'PTPN4', 'Holding', 'SuppCo', 'PalmCo'].includes(
                          latestRecord.divisi.trim()
                        ) &&
                        latestRecord.divisi.trim() !== '-'
                          ? latestRecord.divisi
                          : user?.divisi || '-'}
                      </p>
                      <p className="text-xs text-slate-600 font-medium">
                        Jabatan: <span className="font-bold text-slate-800">{latestRecord.jabatan || latestRecord.kategori_peserta || 'Magang'}</span>
                      </p>
                      <p className="text-xs text-slate-600 font-medium">
                        No. Inhealth: <span className="font-bold text-slate-800">{latestRecord.nomor_inhealth || '-'}</span>
                      </p>
                      <p className="text-xs text-slate-600 font-medium">
                        No. BPJS: <span className="font-bold text-slate-800">{latestRecord.bpjs || latestRecord.nomor_bpjs || '-'}</span>
                      </p>
                      <p className="text-xs text-slate-600 font-medium">
                        Jenis Kelamin: <span className="font-bold text-slate-800">{latestRecord.jenis_kelamin || latestRecord.gender || 'Laki-laki'}</span>
                      </p>
                      <p className="text-xs text-slate-600 font-medium">
                        Sumber Data Terkini: <span className="font-bold text-emerald-900">{latestSourceTag}</span>
                      </p>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="text-xs font-bold text-slate-700">Gol. Darah:</span>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          {latestRecord.golongan_darah || 'O+'}
                        </span>
                        <span className="text-xs font-bold text-slate-700 ml-2">Umur:</span>
                        <span className="text-xs font-bold text-slate-900">
                          {latestRecord.umur ? `${latestRecord.umur} Thn` : '20 Thn'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/80 my-4" />

                  {/* Vitals Last Updated Date Badge */}
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs mb-3">
                    <span className="flex items-center gap-1.5 text-emerald-800">
                      <Clock className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Terakhir Diperbarui:</span>
                    </span>
                    <span className="text-slate-900 font-extrabold">
                      {lastUpdatedFormatted}
                    </span>
                  </div>

                  {/* Physical Vitals Grid (Real Database Record Values) */}
                  <div className="space-y-2 text-xs sm:text-sm font-semibold text-slate-800">
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-600 font-medium">Tinggi Badan</span>
                      <span className="font-extrabold text-slate-900">
                        {latestTbVal ? (String(latestTbVal).includes('cm') ? latestTbVal : `${latestTbVal} cm`) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-600 font-medium">Berat Badan</span>
                      <span className="font-extrabold text-slate-900">
                        {latestBbVal ? (String(latestBbVal).includes('kg') ? latestBbVal : `${latestBbVal} kg`) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-600 font-medium">Indeks BMI</span>
                      <div className="flex items-center gap-1.5 font-extrabold">
                        <span>{currentBmi}</span>
                        <span className="text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded text-xs">
                          ({currentBmiKlasifikasi})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-600 font-medium">Tensi Darah</span>
                      <span className="font-extrabold text-slate-900">
                        {latestTensiVal !== '-' ? (String(latestTensiVal).includes('mmHg') ? latestTensiVal : `${latestTensiVal} mmHg`) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-600 font-medium">Gula Darah</span>
                      <span className="font-extrabold text-slate-900">
                        {latestGulaVal !== '-' ? (String(latestGulaVal).includes('mg') ? latestGulaVal : `${latestGulaVal} mg/dL`) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-600 font-medium">Kolesterol</span>
                      <span className="font-extrabold text-slate-900">
                        {latestKolesterolVal !== '-' ? (String(latestKolesterolVal).includes('mg') ? latestKolesterolVal : `${latestKolesterolVal} mg/dL`) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-600 font-medium">Asam Urat</span>
                      <span className="font-extrabold text-slate-900">
                        {latestAsamUratVal !== '-' ? (String(latestAsamUratVal).includes('mg') ? latestAsamUratVal : `${latestAsamUratVal} mg/dL`) : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100">
                      <span className="text-slate-600 font-medium">Suhu Tubuh</span>
                      <span className="font-extrabold text-slate-900">
                        {latestSuhuVal ? (String(latestSuhuVal).includes('°') ? latestSuhuVal : `${latestSuhuVal} °C`) : '36.5 °C'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Vitals & Chart PDF Banner */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                      PDF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-emerald-950 truncate">
                        Ringkasan_Vitals_&amp;_Grafik_{safeName}.pdf
                      </p>
                      <p className="text-[10px] font-bold text-emerald-700 truncate">Informasi Karyawan, Tensi, Vitals &amp; Grafik Angka</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewRecord(latestRecord);
                        setPreviewModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-[#055E38] hover:bg-emerald-900 text-white font-bold text-[11px] rounded-lg transition cursor-pointer"
                      title="Buka Ringkasan Vitals & Grafik"
                    >
                      Buka
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewRecord(latestRecord);
                        setPreviewModalOpen(true);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-lg transition cursor-pointer"
                      title="Unduh Ringkasan Vitals & Grafik"
                    >
                      Unduh
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (7 Cols): Dynamic Trend Charts with Normal Threshold Lines */}
              <div className="lg:col-span-7 flex flex-col">
                <HealthTrendChart patientHistory={historyRecordsDesc} defaultMetric="tensi" className="h-full" />
              </div>

            </div>

            {/* ==================================================== */}
            {/* SECTION 2: BOTTOM HORIZONTAL SESSION ACCORDION CARDS */}
            {/* ==================================================== */}
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-800 shrink-0" />
                  <span>Riwayat Sesi Pemeriksaan Kesehatan &amp; MCU Karyawan</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Klik atau pilih kartu sesi pemeriksaan di bawah ini untuk menampilkan rincian keluhan, diagnosa, konsul, anjuran, saran, serta dokumen lampiran Surat Sakit.
                </p>
              </div>

              {/* Carousel Row with Left Arrow - Cards List - Right Arrow */}
              <div className="flex items-center gap-2 sm:gap-3.5 w-full">
                {/* Left Arrow Button */}
                {historyRecordsDesc.length > 1 && (
                  <button
                    type="button"
                    onClick={() => scrollSessions('left')}
                    className="shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white border border-slate-200/90 text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title="Geser ke Kiri"
                    aria-label="Geser ke Kiri"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600" />
                  </button>
                )}

                {/* Cards Scroll Container */}
                <div
                  ref={scrollContainerRef}
                  className="flex-1 min-w-0 flex overflow-x-auto gap-3.5 pb-2 pt-1 scroll-smooth snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                >
                  {historyRecordsDesc.map((sessionRec) => {
                    const isMandiri = sessionRec.created_by_role === 'karyawan' ||
                      sessionRec.vitals_updated_by_role === 'karyawan' ||
                      (sessionRec.nama_dokter && sessionRec.nama_dokter.toLowerCase().includes('mandiri')) ||
                      (sessionRec.diagnosa && sessionRec.diagnosa.toLowerCase().includes('mandiri'));
                    const roleKey = isMandiri ? 'karyawan' : (sessionRec.created_by_role || 'admin');
                    const recKey = `${roleKey}-${sessionRec.id}`;
                    const monthYearStr = formatMonthYear(sessionRec.tanggal_pemeriksaan);
                    const dateFormatted = formatDate(sessionRec.tanggal_pemeriksaan);
                    const roleLabel = isMandiri ? 'Pemeriksaan Mandiri' : (roleKey === 'klinik' ? 'Klinik' : 'Admin');
                    const mcuTitle = isMandiri
                      ? `Hasil MCU Mandiri ${monthYearStr}`
                      : roleKey === 'klinik'
                      ? `Hasil Mini MCU ${monthYearStr}`
                      : `Hasil MCU ${monthYearStr}`;
                    const isActive = recKey === activeKey;
                    const kesimpulanLabel = getKesimpulanLabel(sessionRec.kesimpulan);

                    return (
                      <button
                        key={recKey}
                        type="button"
                        onClick={() => setActiveKey(recKey)}
                        className={`shrink-0 w-[270px] sm:w-[310px] md:w-[330px] snap-start text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-2.5 shadow-2xs ${
                          isActive
                            ? 'bg-[#005930] border-[#005930] text-white shadow-md'
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-800'
                        }`}
                      >
                        {/* Row 1: Title */}
                        <div className="w-full">
                          <h3
                            className={`text-xs sm:text-sm font-bold tracking-tight truncate ${
                              isActive ? 'text-white' : 'text-slate-900'
                            }`}
                            title={mcuTitle}
                          >
                            {mcuTitle}
                          </h3>
                        </div>

                        {/* Row 2: Role Badge & Kesimpulan Status Badge */}
                        <div className="flex items-center justify-between gap-2 w-full">
                          {/* Role Badge */}
                          <span
                            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                              isActive
                                ? 'bg-[#004726] text-emerald-100'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {roleLabel}
                          </span>

                          {/* Kesimpulan Status Badge */}
                          <span
                            className={`text-[11px] font-bold px-3 py-1 rounded-full shadow-2xs whitespace-nowrap ${
                              isActive
                                ? 'bg-white text-[#005930]'
                                : kesimpulanLabel.includes('Catatan')
                                ? 'bg-amber-500 text-white'
                                : kesimpulanLabel.includes('Fit for Duty') || kesimpulanLabel === 'Fit'
                                ? 'bg-[#005930] text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {kesimpulanLabel}
                          </span>
                        </div>

                        {/* Row 3: Date */}
                        <div
                          className={`text-xs font-medium flex items-center gap-1.5 ${
                            isActive ? 'text-emerald-100/90' : 'text-slate-500'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5 shrink-0 opacity-80" />
                          <span>Tgl: {dateFormatted}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Arrow Button */}
                {historyRecordsDesc.length > 1 && (
                  <button
                    type="button"
                    onClick={() => scrollSessions('right')}
                    className="shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white border border-slate-200/90 text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title="Geser ke Kanan"
                    aria-label="Geser ke Kanan"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600" />
                  </button>
                )}
              </div>

              {/* ==================================================== */}
              {/* SESSION DETAILED FINDINGS DISPLAY PANEL              */}
              {/* ==================================================== */}
              {activeRecord && (
                <div className="space-y-6 pt-2">
                  {activeRecord.created_by_role === 'klinik' ? (
                    // KLINIK RECORD PANEL (MATCHING SCREENSHOT LAYOUT & FALLBACKS)
                    <div className="space-y-4">
                      {/* Top Petugas Medis Pemeriksa Klinik Banner */}
                      <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-[#005930] text-white shrink-0 shadow-2xs">
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <span className="font-black text-slate-900">
                            Petugas Medis Pemeriksa Klinik:
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-800 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Dokter Pemeriksa:</span>
                            <span className="font-black text-[#005930] bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                              {activeRecord.nama_dokter && activeRecord.nama_dokter !== '-' ? activeRecord.nama_dokter : '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Perawat / Asisten:</span>
                            <span className="font-black text-[#005930] bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                              {activeRecord.nama_perawat && activeRecord.nama_perawat !== '-' ? activeRecord.nama_perawat : '-'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Jam:</span>
                            <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs font-mono">
                              {activeRecord.jam_pemeriksaan || '12:50:00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card 1: Keluhan / Anamnesa (Full width) */}
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                            Keluhan / Anamnesa
                          </h3>
                        </div>
                        <div>
                          <BulletList
                            text={
                              activeRecord.keluhan && activeRecord.keluhan.trim() && activeRecord.keluhan !== '-'
                                ? activeRecord.keluhan
                                : 'Tidak memiliki keluhan'
                            }
                          />
                        </div>
                      </div>

                      {/* 4 Core Cards in 2-Column Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Card 1: Faktor Resiko */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-full bg-[#fbe7e6] text-[#d31d1d] flex items-center justify-center font-bold text-xs shrink-0">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                              Faktor Resiko
                            </h3>
                          </div>
                          <div>
                            <BulletList
                              text={
                                activeRecord.faktor_risiko && activeRecord.faktor_risiko.trim() && activeRecord.faktor_risiko !== '-'
                                  ? activeRecord.faktor_risiko
                                  : 'Tidak memiliki faktor risiko'
                              }
                            />
                          </div>
                        </div>

                        {/* Card 2: Penyakit */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-full bg-[#e6f0fa] text-[#0d5d98] flex items-center justify-center font-bold text-xs shrink-0">
                              <Activity className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                              Penyakit
                            </h3>
                          </div>
                          <div>
                            {(() => {
                              const rawP: any = (activeRecord as any)?.penyakit;
                              const pList: any[] = Array.isArray(rawP)
                                ? rawP
                                : typeof rawP === 'string' && rawP.trim().length > 0
                                ? (rawP.includes('|') ? rawP.split(/\s*\|\s*/) : rawP.includes('\n') ? rawP.split(/\n+/) : [rawP])
                                : [];
                              const validP = pList
                                .map((s: any) => String(s || '').trim())
                                .filter((s: string) => s && s !== '-' && s !== 'Tidak memiliki penyakit' && s !== 'Pemeriksaan Mandiri');

                              if (validP.length > 0) {
                                return (
                                  <div className="flex flex-wrap gap-2">
                                    {validP.map((p: string, pIdx: number) => (
                                      <span
                                        key={pIdx}
                                        className="bg-[#005930] text-white font-bold px-3 py-1 rounded-lg text-xs shadow-2xs"
                                      >
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                );
                              }
                              return <BulletList text="Tidak memiliki penyakit" />;
                            })()}
                          </div>
                        </div>

                        {/* Card 3: Diagnosa */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-full bg-[#f3e8ff] text-[#7c3aed] flex items-center justify-center font-bold text-xs shrink-0">
                              <Stethoscope className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                              Diagnosa
                            </h3>
                          </div>
                          <div>
                            <BulletList
                              text={
                                activeRecord.diagnosa && activeRecord.diagnosa.trim() && activeRecord.diagnosa !== 'Pemeriksaan Mandiri' && activeRecord.diagnosa !== '-'
                                  ? activeRecord.diagnosa
                                  : '- Tidak Ada Catatan Diagnosa -'
                              }
                            />
                          </div>
                        </div>

                        {/* Card 4: Tindak Lanjut */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-full bg-[#e6f7ed] text-[#005930] flex items-center justify-center font-bold text-xs shrink-0">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                              Tindak Lanjut
                            </h3>
                          </div>
                          <div>
                            <BulletList
                              text={
                                activeRecord.anjuran && activeRecord.anjuran.trim() && activeRecord.anjuran !== 'Pemeriksaan Mandiri' && activeRecord.anjuran !== '-'
                                  ? activeRecord.anjuran
                                  : activeRecord.saran && activeRecord.saran.trim() && activeRecord.saran !== 'Pemeriksaan Mandiri' && activeRecord.saran !== '-'
                                  ? activeRecord.saran
                                  : (activeRecord as any).tindak_lanjut && String((activeRecord as any).tindak_lanjut).trim() && String((activeRecord as any).tindak_lanjut) !== '-'
                                  ? (activeRecord as any).tindak_lanjut
                                  : activeRecord.file_surat_sakit
                                  ? 'Istirahat sesuai anjuran surat sakit'
                                  : activeRecord.file_rujukan
                                  ? 'Pemeriksaan kontrol lanjutan ke faskes rujukan'
                                  : 'Tidak memiliki tindak lanjut'
                              }
                            />
                          </div>
                        </div>

                      </div>

                      {/* Card: Obat Pasien (Full width) */}
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#005930] flex items-center justify-center font-bold text-xs shrink-0">
                            <Pill className="w-4 h-4" />
                          </div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                            Obat Pasien
                          </h3>
                        </div>
                        {(() => {
                          const rawObat: any = (activeRecord as any)?.obat;
                          const obatList: any[] = Array.isArray(rawObat)
                            ? rawObat
                            : typeof rawObat === 'string' && rawObat.trim().length > 0
                            ? (rawObat.includes('|') ? rawObat.split(/\s*\|\s*/) : rawObat.includes('\n') ? rawObat.split(/\n+/) : [rawObat])
                            : [];
                          const validObat = obatList
                            .map((o: any) => String(o || '').trim())
                            .filter((o: string) => o && o !== '-' && o !== 'Tidak memiliki obat');

                          if (validObat.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-2">
                                {validObat.map((med: string, mIdx: number) => (
                                  <span
                                    key={mIdx}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs shadow-2xs"
                                  >
                                    <span>{med}</span>
                                  </span>
                                ))}
                              </div>
                            );
                          }
                          return (
                            <p className="text-xs font-semibold text-slate-400 italic">
                              - Tidak Ada Resep Obat Pasien Pada Sesi Ini -
                            </p>
                          );
                        })()}
                      </div>

                      {/* Card: Rujukan Rumah Sakit / Spesialis (Full width) */}
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs shrink-0">
                            <Hospital className="w-4 h-4" />
                          </div>
                          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                            Rujukan Rumah Sakit / Spesialis
                          </h3>
                        </div>
                        {Boolean(
                          (activeRecord.nama_poli && activeRecord.nama_poli !== '-' && activeRecord.nama_poli.toLowerCase() !== 'inhouse clinic') ||
                          (activeRecord.nama_rs && activeRecord.nama_rs !== '-') ||
                          activeRecord.file_rujukan
                        ) ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-800">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-slate-500 font-medium block text-[11px]">Nama Poli Rujukan</span>
                              <span className="text-slate-900 font-black text-sm">{activeRecord.nama_poli || '-'}</span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <span className="text-slate-500 font-medium block text-[11px]">Rumah Sakit / Faskes Tujuan</span>
                              <span className="text-slate-900 font-black text-sm">{activeRecord.nama_rs || '-'}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs font-semibold text-slate-400 italic">
                            - Tidak Ada Rujukan Rumah Sakit / Spesialis -
                          </p>
                        )}
                      </div>

                      {/* Card: Intervensi Layanan Kesehatan (Full width) */}
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#f3e8ff] text-[#7c3aed] flex items-center justify-center shrink-0">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">Intervensi Layanan Kesehatan</h3>
                              <p className="text-[11px] text-slate-500 font-medium">Program intervensi kesehatan yang direkomendasikan pada sesi ini</p>
                            </div>
                          </div>

                          {(() => {
                            const raw = activeRecord.intervensi;
                            const arr = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
                            const validIntervensi = arr
                              .map((item: any) => String(item || '').trim())
                              .filter((item: string) => item && item !== '-' && item.toLowerCase() !== 'null' && item.toLowerCase() !== 'none' && item !== 'Pemeriksaan Mandiri');
                            const hasValidIntervensi = validIntervensi.length > 0;
                            const isNeedFollowup = Boolean(activeRecord.butuh_tindak_lanjut) && (hasValidIntervensi || activeRecord.status_kebugaran === 'Sementara Tidak Fit');

                            if (activeRecord.tindak_lanjut_selesai) {
                              return (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                                  <Check className="w-3.5 h-3.5" />
                                  Tuntas Ditindaklanjuti
                                </span>
                              );
                            }

                            if (isNeedFollowup) {
                              return (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Masih Butuh Tindak Lanjut
                                </span>
                              );
                            }

                            return null;
                          })()}
                        </div>

                        {(() => {
                          const raw = activeRecord.intervensi;
                          const arr = Array.isArray(raw)
                            ? raw
                            : typeof raw === 'string' && raw.trim().length > 0
                            ? (raw.includes('|') ? raw.split(/\s*\|\s*/) : raw.includes('\n') ? raw.split(/\n+/) : [raw])
                            : [];
                          const validIntervensi = arr
                            .map((item: any) => String(item || '').trim())
                            .filter((item: string) => item && item !== '-' && item.toLowerCase() !== 'null' && item.toLowerCase() !== 'none' && item !== 'Pemeriksaan Mandiri');

                          if (validIntervensi.length === 0) {
                            return <p className="text-xs font-semibold text-slate-400 italic">Tidak memiliki intervensi</p>;
                          }

                          return (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {validIntervensi.map((item: string, iIdx: number) => (
                                <span key={iIdx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-900 text-xs font-bold rounded-full border border-purple-200 shadow-2xs">
                                  <Check className="w-3.5 h-3.5 text-purple-600" />
                                  <span>{item}</span>
                                </span>
                              ))}
                            </div>
                          );
                        })()}

                        {activeRecord.tanggal_pemeriksaan_lanjutan && (
                          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs">
                            <span className="text-[11px] font-bold text-amber-800 block">Jadwal Pemeriksaan Lanjutan:</span>
                            <span className="font-extrabold text-amber-950">
                              {formatDate(activeRecord.tanggal_pemeriksaan_lanjutan)}
                            </span>
                          </div>
                        )}

                        {activeRecord.catatan_intervensi && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
                              Catatan Intervensi / Hasil Tindak Lanjut:
                            </span>
                            <p className="font-semibold text-slate-800 leading-relaxed">
                              {activeRecord.catatan_intervensi}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Card: Dokumen & Berkas Lampiran Hasil Mini MCU (Full width) */}
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                          <div className="p-2.5 rounded-xl bg-[#005930] text-white shrink-0 shadow-2xs">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">
                              Dokumen &amp; Berkas Lampiran Hasil Mini MCU {formatMonthYear(activeRecord.tanggal_pemeriksaan)}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              Berkas lampiran resmi yang diunggah (Laporan Hasil MCU, Surat Rujukan, dan Surat Sakit)
                            </p>
                          </div>
                        </div>

                        {/* Berkas yang Diunggah atau Placeholder Box Kosong */}
                        {(activeRecord.file_dokumen || activeRecord.file_rujukan || activeRecord.file_surat_sakit) ? (
                          <div className="flex flex-wrap gap-2.5 pt-1">
                            {activeRecord.file_dokumen && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewDocModal({
                                    open: true,
                                    title: activeRecord.nama_dokumen || 'Laporan Hasil Mini MCU',
                                    url: activeRecord.file_dokumen,
                                  })
                                }
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#005930] font-bold text-xs rounded-xl border border-emerald-200 transition cursor-pointer shadow-2xs"
                              >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                                <span>{activeRecord.nama_dokumen || 'Berkas Hasil Mini MCU'}</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                              </button>
                            )}
                            {activeRecord.file_rujukan && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewDocModal({
                                    open: true,
                                    title: activeRecord.nama_rujukan_file || 'Surat Rujukan Dokter / RS',
                                    url: activeRecord.file_rujukan,
                                  })
                                }
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs rounded-xl border border-sky-200 transition cursor-pointer shadow-2xs"
                              >
                                <FileText className="w-4 h-4 text-sky-700" />
                                <span>{activeRecord.nama_rujukan_file || 'Surat Rujukan Dokter / RS'}</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                              </button>
                            )}
                            {activeRecord.file_surat_sakit && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewDocModal({
                                    open: true,
                                    title: activeRecord.nama_surat_sakit || 'Surat Keterangan Sakit',
                                    url: activeRecord.file_surat_sakit,
                                  })
                                }
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer shadow-2xs"
                              >
                                <FileText className="w-4 h-4 text-rose-700" />
                                <span>{activeRecord.nama_surat_sakit || 'Surat Keterangan Sakit'}</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center">
                            <p className="text-xs text-slate-400 font-medium italic">
                              - Tidak ada berkas atau dokumen yang diunggah untuk sesi pemeriksaan ini -
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // ADMIN / MANDIRI RECORD PANEL (MCU RS MATCHING EXACT USER DATABASE)
                    <div className="space-y-4">
                      {/* Top Info Banner Sesuai Format Rekap Medis */}
                      <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-[#005930] text-white shrink-0 shadow-2xs">
                            <Stethoscope className="w-4 h-4" />
                          </div>
                          <span className="font-black text-slate-900">
                            {activeRecord.created_by_role === 'karyawan'
                              ? 'Pemeriksaan Mandiri Karyawan:'
                              : 'Instansi / Penyelenggara Pemeriksaan MCU:'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-800 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">
                              {activeRecord.created_by_role === 'karyawan' ? 'Tempat / Klinik:' : 'Instansi Pemeriksa:'}
                            </span>
                            <span className="font-black text-[#005930] bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                              {activeRecord.nama_rs || 'Klinik Pratama PTPN'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 font-medium">Jam:</span>
                            <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs font-mono">
                              {activeRecord.jam_pemeriksaan || '10:24:00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 4 Core Cards in 2-Column Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Card 1: Faktor Resiko */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-full bg-[#fbe7e6] text-[#d31d1d] flex items-center justify-center font-bold text-xs shrink-0">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                              Faktor Resiko
                            </h3>
                          </div>
                          <div>
                            <BulletList
                              text={
                                activeRecord.faktor_risiko && activeRecord.faktor_risiko.trim() && activeRecord.faktor_risiko !== '-'
                                  ? activeRecord.faktor_risiko
                                  : 'Tidak memiliki faktor risiko'
                              }
                            />
                          </div>
                        </div>

                        {/* Card 2: Penyakit */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-full bg-[#e6f0fa] text-[#0d5d98] flex items-center justify-center font-bold text-xs shrink-0">
                              <Activity className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                              Penyakit
                            </h3>
                          </div>
                          <div>
                            {(() => {
                              const rawP: any = (activeRecord as any)?.penyakit;
                              const pList: any[] = Array.isArray(rawP)
                                ? rawP
                                : typeof rawP === 'string' && rawP.trim().length > 0
                                ? (rawP.includes('|') ? rawP.split(/\s*\|\s*/) : rawP.includes('\n') ? rawP.split(/\n+/) : [rawP])
                                : [];
                              const validP = pList
                                .map((s: any) => String(s || '').trim())
                                .filter((s: string) => s && s !== '-' && s !== 'Tidak memiliki penyakit' && s !== 'Pemeriksaan Mandiri');

                              if (validP.length > 0) {
                                return (
                                  <div className="flex flex-wrap gap-2">
                                    {validP.map((p: string, pIdx: number) => (
                                      <span
                                        key={pIdx}
                                        className="bg-[#005930] text-white font-bold px-3 py-1 rounded-lg text-xs shadow-2xs"
                                      >
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                );
                              }
                              return <BulletList text="Tidak memiliki penyakit" />;
                            })()}
                          </div>
                        </div>

                        {/* Card 3: Diagnosa */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-full bg-[#f3e8ff] text-[#7c3aed] flex items-center justify-center font-bold text-xs shrink-0">
                              <Stethoscope className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                              Diagnosa
                            </h3>
                          </div>
                          <div>
                            <BulletList
                              text={
                                activeRecord.diagnosa && activeRecord.diagnosa.trim() && activeRecord.diagnosa !== 'Pemeriksaan Mandiri' && activeRecord.diagnosa !== '-'
                                  ? activeRecord.diagnosa
                                  : activeRecord.created_by_role === 'karyawan'
                                  ? 'Pemeriksaan Mandiri Karyawan'
                                  : '- Tidak Ada Catatan Diagnosa -'
                              }
                            />
                          </div>
                        </div>

                        {/* Card 4: Tindak Lanjut */}
                        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-full bg-[#e6f7ed] text-[#005930] flex items-center justify-center font-bold text-xs shrink-0">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                              Tindak Lanjut
                            </h3>
                          </div>
                          <div>
                            <BulletList
                              text={
                                activeRecord.anjuran && activeRecord.anjuran.trim() && activeRecord.anjuran !== 'Pemeriksaan Mandiri' && activeRecord.anjuran !== '-'
                                  ? activeRecord.anjuran
                                  : activeRecord.saran && activeRecord.saran.trim() && activeRecord.saran !== 'Pemeriksaan Mandiri' && activeRecord.saran !== '-'
                                  ? activeRecord.saran
                                  : (activeRecord as any).tindak_lanjut && String((activeRecord as any).tindak_lanjut).trim() && String((activeRecord as any).tindak_lanjut) !== '-'
                                  ? (activeRecord as any).tindak_lanjut
                                  : activeRecord.file_surat_sakit
                                  ? 'Istirahat sesuai anjuran surat sakit'
                                  : activeRecord.file_rujukan
                                  ? 'Pemeriksaan kontrol lanjutan ke faskes rujukan'
                                  : 'Tidak memiliki tindak lanjut'
                              }
                            />
                          </div>
                        </div>

                      </div>

                      {/* Full-width Card: Intervensi Layanan Kesehatan */}
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#f3e8ff] text-[#7c3aed] flex items-center justify-center shrink-0">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div>
                              <h3 className="text-sm font-extrabold text-slate-900">Intervensi Layanan Kesehatan</h3>
                              <p className="text-[11px] text-slate-500 font-medium">Program intervensi kesehatan yang direkomendasikan pada sesi ini</p>
                            </div>
                          </div>

                          {(() => {
                            const raw = activeRecord.intervensi;
                            const arr = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
                            const validIntervensi = arr
                              .map((item: any) => String(item || '').trim())
                              .filter((item: string) => item && item !== '-' && item.toLowerCase() !== 'null' && item.toLowerCase() !== 'none' && item !== 'Pemeriksaan Mandiri');
                            const hasValidIntervensi = validIntervensi.length > 0;
                            const isNeedFollowup = Boolean(activeRecord.butuh_tindak_lanjut) && (hasValidIntervensi || activeRecord.status_kebugaran === 'Sementara Tidak Fit');

                            if (activeRecord.tindak_lanjut_selesai) {
                              return (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                                  <Check className="w-3.5 h-3.5" />
                                  Tuntas Ditindaklanjuti
                                </span>
                              );
                            }

                            if (isNeedFollowup) {
                              return (
                                <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full">
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                  Masih Butuh Tindak Lanjut
                                </span>
                              );
                            }

                            return null;
                          })()}
                        </div>

                        {(() => {
                          const raw = activeRecord.intervensi;
                          const arr = Array.isArray(raw)
                            ? raw
                            : typeof raw === 'string' && raw.trim().length > 0
                            ? (raw.includes('|') ? raw.split(/\s*\|\s*/) : raw.includes('\n') ? raw.split(/\n+/) : [raw])
                            : [];
                          const validIntervensi = arr
                            .map((item: any) => String(item || '').trim())
                            .filter((item: string) => item && item !== '-' && item.toLowerCase() !== 'null' && item.toLowerCase() !== 'none' && item !== 'Pemeriksaan Mandiri');

                          if (validIntervensi.length === 0) {
                            return <p className="text-xs font-semibold text-slate-400 italic">Tidak memiliki intervensi</p>;
                          }

                          return (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {validIntervensi.map((item: string, iIdx: number) => (
                                <span key={iIdx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-900 text-xs font-bold rounded-full border border-purple-200 shadow-2xs">
                                  <Check className="w-3.5 h-3.5 text-purple-600" />
                                  <span>{item}</span>
                                </span>
                              ))}
                            </div>
                          );
                        })()}

                        {activeRecord.tanggal_pemeriksaan_lanjutan && (
                          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg text-xs">
                            <span className="text-[11px] font-bold text-amber-800 block">Jadwal Pemeriksaan Lanjutan:</span>
                            <span className="font-extrabold text-amber-950">
                              {formatDate(activeRecord.tanggal_pemeriksaan_lanjutan)}
                            </span>
                          </div>
                        )}

                        {activeRecord.catatan_intervensi && (
                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">
                              Catatan Intervensi / Hasil Tindak Lanjut:
                            </span>
                            <p className="font-semibold text-slate-800 leading-relaxed">
                              {activeRecord.catatan_intervensi}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Full-width Card: Dokumen & Berkas Lampiran Sesuai Screenshot */}
                      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-[#005930] text-white shrink-0 shadow-2xs">
                            <Paperclip className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">
                              Dokumen &amp; Berkas Lampiran {activeRecord.created_by_role === 'karyawan' ? `Hasil Pemeriksaan Mandiri ${formatMonthYear(activeRecord.tanggal_pemeriksaan)}` : `Hasil MCU ${formatMonthYear(activeRecord.tanggal_pemeriksaan)}`}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              Berkas lampiran resmi yang diunggah (Laporan Hasil MCU, Surat Rujukan, dan Surat Sakit)
                            </p>
                          </div>
                        </div>

                        {/* Berkas yang Diunggah atau Placeholder Box Kosong */}
                        {(activeRecord.file_dokumen || activeRecord.file_rujukan || activeRecord.file_surat_sakit) ? (
                          <div className="flex flex-wrap gap-2.5 pt-1">
                            {activeRecord.file_dokumen && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewDocModal({
                                    open: true,
                                    title: activeRecord.nama_dokumen || 'Laporan Hasil MCU / Lab',
                                    url: activeRecord.file_dokumen,
                                  })
                                }
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#005930] font-bold text-xs rounded-xl border border-emerald-200 transition cursor-pointer shadow-2xs"
                              >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                                <span>{activeRecord.nama_dokumen || 'Berkas Hasil MCU / Lab'}</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                              </button>
                            )}
                            {activeRecord.file_rujukan && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewDocModal({
                                    open: true,
                                    title: activeRecord.nama_rujukan_file || 'Surat Rujukan Dokter / RS',
                                    url: activeRecord.file_rujukan,
                                  })
                                }
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs rounded-xl border border-sky-200 transition cursor-pointer shadow-2xs"
                              >
                                <FileText className="w-4 h-4 text-sky-700" />
                                <span>{activeRecord.nama_rujukan_file || 'Surat Rujukan Dokter / RS'}</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                              </button>
                            )}
                            {activeRecord.file_surat_sakit && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewDocModal({
                                    open: true,
                                    title: activeRecord.nama_surat_sakit || 'Surat Keterangan Sakit',
                                    url: activeRecord.file_surat_sakit,
                                  })
                                }
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl border border-rose-200 transition cursor-pointer shadow-2xs"
                              >
                                <FileText className="w-4 h-4 text-rose-700" />
                                <span>{activeRecord.nama_surat_sakit || 'Surat Keterangan Sakit'}</span>
                                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center">
                            <p className="text-xs text-slate-400 font-medium italic">
                              - Tidak ada berkas atau dokumen yang diunggah untuk sesi pemeriksaan ini -
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* ==================================================== */}
      {/* MODAL 1: OFFICIAL MEDICAL REPORT PDF PREVIEW         */}
      {/* ==================================================== */}
      {previewModalOpen && previewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-black text-xs">
                  PDF
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Laporan Hasil Rekam Medis {previewRecord.created_by_role === 'karyawan' ? 'Pemeriksaan Mandiri' : previewRecord.created_by_role === 'klinik' ? 'Inhouse Clinic' : 'Medical Check Up'}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">Pratinjau Cetak Lembar Hasil Pemeriksaan Resmi</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-[#055E38] hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Unduh PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div id="printable-medical-doc" className="p-8 overflow-y-auto space-y-6 text-slate-900 bg-white">
              {/* Header Letterhead */}
              <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-800 text-white font-black text-lg flex items-center justify-center">
                    PTPN
                  </div>
                  <div>
                    <h2 className="text-base font-black tracking-tight text-slate-900">PT PERKEBUNAN NUSANTARA III (PERSERO)</h2>
                    <p className="text-xs font-bold text-emerald-800">DIVISI LAYANAN KESEHATAN &amp; KESELAMATAN KERJA (LK3)</p>
                    <p className="text-[10px] text-slate-500">Jl. Sei Batanghari No. 2, Medan - Sumatera Utara</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-black ${getBadgeStyle(previewRecord.kesimpulan)}`}>
                    {getKesimpulanLabel(previewRecord.kesimpulan)}
                  </span>
                  <p className="text-[10px] font-mono text-slate-400 mt-1">REF: MCU-{previewRecord.id}-{new Date().getFullYear()}</p>
                </div>
              </div>

              {/* Patient Profile Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-slate-500 font-medium">Nama Karyawan:</span> <strong className="font-extrabold">{previewRecord.nama_lengkap || displayName}</strong></div>
                <div><span className="text-slate-500 font-medium">NIK:</span> <strong className="font-mono">{previewRecord.nik || displayNik}</strong></div>
                <div>
                  <span className="text-slate-500 font-medium">Divisi / Unit:</span>{' '}
                  <strong>
                    {previewRecord.divisi &&
                    !['PTPN 1', 'PTPN 3', 'PTPN 4', 'ptpn 1', 'ptpn 3', 'ptpn 4', 'PTPN1', 'PTPN3', 'PTPN4', 'Holding', 'SuppCo', 'PalmCo'].includes(
                      previewRecord.divisi.trim()
                    ) &&
                    previewRecord.divisi.trim() !== '-'
                      ? previewRecord.divisi
                      : user?.divisi || '-'}
                  </strong>
                </div>
                <div><span className="text-slate-500 font-medium">Jabatan:</span> <strong>{previewRecord.jabatan || previewRecord.kategori_peserta || 'Magang'}</strong></div>
                <div><span className="text-slate-500 font-medium">Tanggal Pemeriksaan:</span> <strong>{formatDate(previewRecord.tanggal_pemeriksaan)}</strong></div>
                <div><span className="text-slate-500 font-medium">Pelaksana:</span> <strong>{previewRecord.created_by_role === 'karyawan' ? 'Pemeriksaan Mandiri Karyawan' : (previewRecord.nama_rs || 'Klinik Pratama PTPN 3')}</strong></div>
              </div>

              {/* Physical Vitals Summary */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-900 mb-2 border-b border-slate-200 pb-1">
                  1. Pengukuran Fisik &amp; Tanda Vital
                </h4>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Tinggi Badan</span>
                    <strong className="text-slate-900">{previewRecord.tinggi_badan ? `${previewRecord.tinggi_badan} cm` : '156 cm'}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Berat Badan</span>
                    <strong className="text-slate-900">{previewRecord.berat_badan ? `${previewRecord.berat_badan} kg` : '40 kg'}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Indeks BMI</span>
                    <strong className="text-slate-900">{previewRecord.bmi || currentBmi}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Tensi Darah</span>
                    <strong className="text-slate-900">{previewRecord.tensi || '120/80'}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Gula Darah</span>
                    <strong className="text-slate-900">{previewRecord.gula_darah ? `${previewRecord.gula_darah} mg/dL` : '110 mg/dL'}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Kolesterol</span>
                    <strong className="text-slate-900">{previewRecord.kolesterol ? `${previewRecord.kolesterol} mg/dL` : '190 mg/dL'}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Asam Urat</span>
                    <strong className="text-slate-900">{previewRecord.asam_urat ? (String(previewRecord.asam_urat).includes('mg') ? previewRecord.asam_urat : `${previewRecord.asam_urat} mg/dL`) : '6 mg/dL'}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Suhu Tubuh</span>
                    <strong className="text-slate-900">{previewRecord.suhu ? (String(previewRecord.suhu).includes('°') ? previewRecord.suhu : `${previewRecord.suhu} °C`) : '36.5 °C'}</strong>
                  </div>
                </div>
              </div>

              {/* Medical Diagnosis & Findings */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-900 mb-2 border-b border-slate-200 pb-1">
                  2. Hasil Diagnosis Medis &amp; Rekomendasi
                </h4>
                <div className="text-xs space-y-2">
                  <div>
                    <span className="font-bold text-slate-700 block">Keluhan / Anamnesa:</span>
                    <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                      {previewRecord.keluhan || '-'}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block">Diagnosa:</span>
                    <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                      {previewRecord.diagnosa || 'Pemeriksaan Mandiri'}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 block">Anjuran &amp; Saran Tindak Lanjut:</span>
                    <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                      {previewRecord.anjuran || previewRecord.saran || 'Pemeriksaan kesehatan berkala'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Signature Footer */}
              <div className="pt-6 border-t border-slate-200 flex justify-between items-end text-xs">
                <div>
                  <p className="text-[11px] text-slate-500">Dokumen Rekam Medis Terverifikasi</p>
                  <p className="text-[10px] text-slate-400">Dicetak melalui Portal Kesehatan Karyawan PTPN 3</p>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-[11px] font-bold text-slate-700">
                    {previewRecord.created_by_role === 'karyawan' ? 'Pemeriksa Mandiri,' : 'Dokter Pemeriksa,'}
                  </p>
                  <div className="w-28 h-12 border-b border-dashed border-slate-400 mx-auto" />
                  <p className="font-black text-slate-900">
                    {previewRecord.created_by_role === 'karyawan' ? (previewRecord.nama_lengkap || displayName) : (previewRecord.nama_dokter || 'dr. Ahmad')}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {previewRecord.created_by_role === 'karyawan' ? `NIK: ${previewRecord.nik || displayNik}` : 'SIP: 446/SIP-D/2026'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* MODAL 2: DOCUMENT PREVIEW MODAL (Universal)         */}
      {/* ==================================================== */}
      <DocumentPreviewModal
        open={previewDocModal.open}
        onClose={() => setPreviewDocModal({ open: false, title: '', url: null })}
        url={previewDocModal.url || null}
        title={previewDocModal.title || 'Dokumen Medis'}
        fileName={previewDocModal.title || 'Dokumen Medis'}
      />

    </AppLayout>
  );
}
