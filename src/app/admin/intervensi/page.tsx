'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { uploadMedicalFile } from '@/lib/upload';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  Cell,
} from 'recharts';
import {
  ShieldCheck,
  FlaskConical,
  RefreshCw,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react';

import { DocumentPreviewModal } from '@/components/common/DocumentPreviewModal';
import { IntervensiDetailModal } from '@/components/intervensi/IntervensiDetailModal';
import { IntervensiChartPatientsModal, ChartPatientItem } from '@/components/intervensi/IntervensiChartPatientsModal';
import { generateSuratRujukanDataUrl } from '@/utils/rujukanGenerator';

interface PatientFollowUp {
  id: number;
  record_type: 'mcu' | 'mini';
  nama_lengkap: string;
  nik: string;
  divisi: string;
  foto?: string | null;
  intervensi: string[];
  has_kuratif: boolean;
  has_rehabilitatif: boolean;
  kuratif_selesai: boolean;
  rehabilitatif_selesai: boolean;
  kuratif_programs: string[];
  rehabilitatif_programs: string[];
  tanggal_pemeriksaan_lanjutan: string | null;
  is_today: boolean;
  is_overdue: boolean;
  is_upcoming: boolean;
  file_surat_rujukan_intervensi: string | null;
  butuh_tindak_lanjut: boolean;
  tindak_lanjut_selesai: boolean;
  file_hasil_tindak_lanjut: string | null;
  file_hasil_tindak_lanjut_kuratif: string | null;
  file_hasil_tindak_lanjut_rehabilitatif: string | null;
  catatan_intervensi: string | null;
  catatan_intervensi_kuratif: string | null;
  catatan_intervensi_rehabilitatif: string | null;
}

export default function AdminIntervensiPage() {
  const [mounted, setMounted] = useState(false);
  const { mcuRecords, miniMcuRecords, karyawanRecords, updateMcuRecord, updateMiniMcuRecord, refreshData } = useMcu();

  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedBulan, setSelectedBulan] = useState('all');
  const [kategoriFilter, setKategoriFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 15;
  const [showReminderBanner, setShowReminderBanner] = useState(true);

  // Modal States
  const [pilihKategoriPatient, setPilihKategoriPatient] = useState<PatientFollowUp | null>(null);
  const [followUpModalData, setFollowUpModalData] = useState<{
    id: number;
    record_type: 'mcu' | 'mini';
    name: string;
    kategori: 'all' | 'kuratif' | 'rehabilitatif';
    butuhTindakLanjut: boolean;
    tindakLanjutSelesai: boolean;
    catatan: string;
  } | null>(null);

  // Surat Rujukan Preview Modal State
  const [previewDocModal, setPreviewDocModal] = useState<{
    open: boolean;
    title: string;
    url: string | null;
    fileName: string;
  }>({
    open: false,
    title: '',
    url: null,
    fileName: '',
  });

  // Examination Detail Modal State (shows all sessions and scheduled session)
  const [detailPatientModal, setDetailPatientModal] = useState<PatientFollowUp | null>(null);

  // Selected Chart Program for Patient List Modal
  const [selectedChartProgram, setSelectedChartProgram] = useState<{
    program: string;
    kategori: 'promotif' | 'kuratif' | 'rehabilitatif';
    patients: ChartPatientItem[];
  } | null>(null);

  const handleOpenSuratRujukan = (p: any) => {
    let url = p.file_surat_rujukan_intervensi || p.file_rujukan || null;
    const fileName = p.file_surat_rujukan_intervensi || p.file_rujukan || `Surat_Rujukan_${p.nama_lengkap || 'Pasien'}.pdf`;

    if (!url || (!url.startsWith('data:') && !url.startsWith('http:') && !url.startsWith('https:') && !url.startsWith('blob:') && !url.startsWith('/'))) {
      url = generateSuratRujukanDataUrl(p);
    }

    setPreviewDocModal({
      open: true,
      title: `Surat Rujukan Dokter Ahli - ${p.nama_lengkap || 'Pasien'}`,
      url,
      fileName,
    });
  };

  const [modalFile, setModalFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper date string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const todayTime = new Date(todayStr).getTime();

  // Helper untuk mengekstrak array string intervensi
  const getIntervensiArray = (rec: any): string[] => {
    if (!rec || !rec.intervensi) return [];
    if (Array.isArray(rec.intervensi)) {
      return rec.intervensi.map((s: any) => String(s).trim()).filter(Boolean);
    }
    if (typeof rec.intervensi === 'string') {
      const raw = rec.intervensi.trim();
      if (raw.startsWith('[') && raw.endsWith(']')) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return parsed.map((s: any) => String(s).trim()).filter(Boolean);
          }
        } catch { }
      }
      return raw.split(/[,|;\n]/).map((s: string) => s.trim()).filter(Boolean);
    }
    return [];
  };

  // 1. Gabungkan seluruh record MCU & Mini MCU sesuai filter bulan
  const allRecords = useMemo(() => {
    return [
      ...mcuRecords.map((r) => ({ ...r, record_type: 'mcu' as const })),
      ...miniMcuRecords.map((r) => ({ ...r, record_type: 'mini' as const })),
    ].filter((rec) => {
      const tgl = rec.tanggal_pemeriksaan || rec.tanggal_kunjungan || '';
      if (selectedBulan === 'current') {
        const curMonth = todayStr.substring(0, 7);
        return tgl.startsWith(curMonth);
      }
      if (selectedBulan !== 'all' && tgl) {
        return tgl.includes(selectedBulan);
      }
      return true;
    });
  }, [mcuRecords, miniMcuRecords, selectedBulan, todayStr]);

  // 2. Daftar Pasien Butuh Tindak Lanjut (Kuratif & Rehabilitatif)
  const followUpPatients: PatientFollowUp[] = useMemo(() => {
    const list: PatientFollowUp[] = [];

    allRecords.forEach((rec) => {
      const arr = getIntervensiArray(rec);
      const nama = rec.nama_lengkap || rec.nama_karyawan || 'Karyawan';

      // Cek Kuratif - HANYA jika dipilih/dicentang atau diisi catatan kuratif secara eksplisit
      const kuratifKeys = ['konsultasi lanjutan', 'employee health counseling program', 'ehcp', 'kesegaran'];
      const kuratifPrograms = arr.filter((i) => kuratifKeys.some((k) => i.toLowerCase().includes(k)));
      const has_kuratif = kuratifPrograms.length > 0 || Boolean(rec.catatan_intervensi_kuratif && String(rec.catatan_intervensi_kuratif).trim());

      // Cek Rehabilitatif - HANYA jika dipilih/dicentang atau diisi catatan rehabilitatif secara eksplisit
      const rehabKeys = ['monitoring hasil tindak lanjut oleh dokter ahli', 'dokter ahli'];
      const rehabilitatifPrograms = arr.filter((i) => rehabKeys.some((k) => i.toLowerCase().includes(k)));
      const has_rehabilitatif = rehabilitatifPrograms.length > 0 || Boolean(rec.catatan_intervensi_rehabilitatif && String(rec.catatan_intervensi_rehabilitatif).trim());

      if (has_kuratif || has_rehabilitatif) {
        let tglLanjutan = rec.tanggal_pemeriksaan_lanjutan || (rec as any).tanggal_kuratif || (rec as any).tanggal_rehabilitatif || null;
        if (!tglLanjutan && rec.intervensi) {
          const rawStr = Array.isArray(rec.intervensi) ? rec.intervensi.join(' ') : String(rec.intervensi || '');
          const m = rawStr.match(/(?:Tgl|Tanggal)[:\s]+(\d{4}-\d{2}-\d{2})/i) || rawStr.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
          if (m && m[1]) {
            tglLanjutan = m[1];
          }
        }

        let is_today = false;
        let is_overdue = false;
        let is_upcoming = false;

        if (tglLanjutan) {
          const tglTime = new Date(tglLanjutan).getTime();
          if (tglLanjutan === todayStr) {
            is_today = true;
          } else if (tglTime < todayTime && !rec.tindak_lanjut_selesai) {
            is_overdue = true;
          } else if (tglTime > todayTime) {
            is_upcoming = true;
          }
        }

        const kuratif_selesai = Boolean(rec.tindak_lanjut_selesai_kuratif || rec.tindak_lanjut_selesai);
        const rehabilitatif_selesai = Boolean(rec.tindak_lanjut_selesai_rehabilitatif || rec.tindak_lanjut_selesai);
        const tindak_lanjut_selesai = Boolean(
          (has_kuratif && has_rehabilitatif)
            ? (kuratif_selesai && rehabilitatif_selesai)
            : has_kuratif
              ? kuratif_selesai
              : rehabilitatif_selesai
        );

        list.push({
          id: rec.id,
          record_type: rec.record_type,
          nama_lengkap: nama,
          nik: rec.nik || '00000000',
          divisi: rec.divisi || 'Operasional Kebun',
          foto: rec.foto || null,
          intervensi: arr.length > 0 ? arr : (has_kuratif ? kuratifPrograms : rehabilitatifPrograms),
          has_kuratif,
          has_rehabilitatif,
          kuratif_selesai,
          rehabilitatif_selesai,
          kuratif_programs: kuratifPrograms,
          rehabilitatif_programs: rehabilitatifPrograms,
          tanggal_pemeriksaan_lanjutan: tglLanjutan,
          is_today,
          is_overdue,
          is_upcoming,
          file_surat_rujukan_intervensi: rec.file_surat_rujukan_intervensi || rec.file_rujukan || null,
          butuh_tindak_lanjut: !tindak_lanjut_selesai,
          tindak_lanjut_selesai,
          file_hasil_tindak_lanjut: rec.file_hasil_tindak_lanjut || null,
          file_hasil_tindak_lanjut_kuratif: rec.file_hasil_tindak_lanjut_kuratif || null,
          file_hasil_tindak_lanjut_rehabilitatif: rec.file_hasil_tindak_lanjut_rehabilitatif || null,
          catatan_intervensi: rec.catatan_intervensi || null,
          catatan_intervensi_kuratif: rec.catatan_intervensi_kuratif || null,
          catatan_intervensi_rehabilitatif: rec.catatan_intervensi_rehabilitatif || null,
        });
      }
    });

    return list;
  }, [allRecords, todayStr, todayTime]);

  // Filter Pasien Table
  const filteredPatients = useMemo(() => {
    if (kategoriFilter === 'all') return followUpPatients;
    if (kategoriFilter === 'kuratif') return followUpPatients.filter((p) => p.has_kuratif);
    if (kategoriFilter === 'rehabilitatif') return followUpPatients.filter((p) => p.has_rehabilitatif);
    return followUpPatients;
  }, [followUpPatients, kategoriFilter]);

  // Reset halaman saat filter kategori atau bulan berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [kategoriFilter, selectedBulan]);

  const totalPages = Math.ceil(filteredPatients.length / perPage) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedPatients = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredPatients.slice(start, start + perPage);
  }, [filteredPatients, currentPage, perPage]);

  // 3. Metrik Penghitungan Summary Cards
  const patientsDueToday = useMemo(() => {
    return followUpPatients.filter((p) => p.is_today && !p.tindak_lanjut_selesai);
  }, [followUpPatients]);

  const totalTindakLanjutHariIni = patientsDueToday.length;

  const totalPromotifPreventif = useMemo(() => {
    const keys = ['health talk', 'sekantor', 'senam', 'gym', 'fitness', 'medical check up', 'mcu', 'healthy food', 'diet', 'konsultasi kesehatan', 'weight loss', 'vaksin', 'hepatitis'];
    return allRecords.reduce((acc, rec) => {
      const arr = getIntervensiArray(rec).map((s) => s.toLowerCase());
      const hasKey = arr.some((item) => keys.some((k) => item.includes(k)));
      return acc + (hasKey ? 1 : 0);
    }, 0);
  }, [allRecords]);

  const totalKuratif = useMemo(() => {
    return followUpPatients.filter((p) => p.has_kuratif).length;
  }, [followUpPatients]);

  const totalKuratifDueToday = useMemo(() => {
    return followUpPatients.filter((p) => p.has_kuratif && p.is_today && !p.kuratif_selesai).length;
  }, [followUpPatients]);

  const totalKuratifOverdue = useMemo(() => {
    return followUpPatients.filter((p) => p.has_kuratif && p.is_overdue && !p.kuratif_selesai).length;
  }, [followUpPatients]);

  const totalKuratifUpcoming = useMemo(() => {
    return followUpPatients.filter((p) => p.has_kuratif && p.is_upcoming).length;
  }, [followUpPatients]);

  const totalRehabilitatif = useMemo(() => {
    return followUpPatients.filter((p) => p.has_rehabilitatif).length;
  }, [followUpPatients]);

  const totalRehabilitatifDueToday = useMemo(() => {
    return followUpPatients.filter((p) => p.has_rehabilitatif && p.is_today && !p.rehabilitatif_selesai).length;
  }, [followUpPatients]);

  const totalButuhTindakLanjut = useMemo(() => {
    return followUpPatients.filter((p) => !p.tindak_lanjut_selesai).length;
  }, [followUpPatients]);

  const totalLewatJadwal = useMemo(() => {
    return followUpPatients.filter((p) => p.is_overdue && !p.tindak_lanjut_selesai).length;
  }, [followUpPatients]);

  const totalJadwalMendatang = useMemo(() => {
    return followUpPatients.filter((p) => p.is_upcoming).length;
  }, [followUpPatients]);

  // 4. Data untuk 3 Charts (dengan list data pasien untuk interaksi klik)
  const chartPromotifData = useMemo(() => {
    const list = [
      { program: 'Health Talk', keys: ['health talk'] },
      { program: 'Sekantor', keys: ['sekantor', 'senam'] },
      { program: 'Gym', keys: ['gym', 'fitness'] },
      { program: 'Medical Check Up', keys: ['medical check up', 'mcu'] },
      { program: 'Healthy Food', keys: ['healthy food', 'diet'] },
      { program: 'Konsultasi Kesehatan', keys: ['konsultasi kesehatan', 'konsultasi sehat'] },
      { program: 'Weight Loss Challenge', keys: ['weight loss', 'obesitas'] },
      { program: 'Vaksin Hepatitis B', keys: ['vaksin', 'hepatitis'] },
    ];
    return list.map((item) => {
      const patients: ChartPatientItem[] = [];
      allRecords.forEach((rec) => {
        const arr = getIntervensiArray(rec);
        const arrLower = arr.map((s) => s.toLowerCase());
        const found = item.keys.some((k) => arrLower.some((i) => i.includes(k)));
        if (found) {
          patients.push({
            id: rec.id,
            record_type: rec.record_type,
            nama_lengkap: rec.nama_lengkap || rec.nama_karyawan || 'Karyawan',
            nik: rec.nik || '00000000',
            divisi: rec.divisi || '-',
            foto: rec.foto || null,
            intervensi: arr,
            tanggal: rec.tanggal_pemeriksaan || rec.tanggal_kunjungan || '-',
            catatan: rec.catatan_intervensi || null,
            tindak_lanjut_selesai: Boolean(rec.tindak_lanjut_selesai),
          });
        }
      });
      return { program: item.program, keys: item.keys, count: patients.length, patients };
    });
  }, [allRecords]);

  const chartKuratifData = useMemo(() => {
    const list = [
      { program: 'Konsultasi Lanjutan', keys: ['konsultasi lanjutan'] },
      { program: 'Employee Health Conseling Program', keys: ['employee health counseling', 'counseling', 'conseling', 'ehcp'] },
      { program: 'Kesegaran', keys: ['kesegaran'] },
    ];
    return list.map((item) => {
      const patients: ChartPatientItem[] = [];
      allRecords.forEach((rec) => {
        const arr = getIntervensiArray(rec);
        const arrLower = arr.map((s) => s.toLowerCase());
        const found = item.keys.some((k) => arrLower.some((i) => i.includes(k)));
        if (found) {
          patients.push({
            id: rec.id,
            record_type: rec.record_type,
            nama_lengkap: rec.nama_lengkap || rec.nama_karyawan || 'Karyawan',
            nik: rec.nik || '00000000',
            divisi: rec.divisi || '-',
            foto: rec.foto || null,
            intervensi: arr,
            tanggal: rec.tanggal_pemeriksaan || rec.tanggal_kunjungan || '-',
            catatan: rec.catatan_intervensi_kuratif || rec.catatan_intervensi || null,
            tindak_lanjut_selesai: Boolean(rec.tindak_lanjut_selesai_kuratif || rec.tindak_lanjut_selesai),
          });
        }
      });
      return { program: item.program, keys: item.keys, count: patients.length, patients };
    });
  }, [allRecords]);

  const chartRehabilitatifData = useMemo(() => {
    const list = [
      { program: 'Monitoring hasil tindak lanjut oleh dokter ahli', keys: ['monitoring hasil tindak lanjut', 'dokter ahli'] },
    ];
    return list.map((item) => {
      const patients: ChartPatientItem[] = [];
      allRecords.forEach((rec) => {
        const arr = getIntervensiArray(rec);
        const arrLower = arr.map((s) => s.toLowerCase());
        const found = item.keys.some((k) => arrLower.some((i) => i.includes(k)));
        if (found) {
          patients.push({
            id: rec.id,
            record_type: rec.record_type,
            nama_lengkap: rec.nama_lengkap || rec.nama_karyawan || 'Karyawan',
            nik: rec.nik || '00000000',
            divisi: rec.divisi || '-',
            foto: rec.foto || null,
            intervensi: arr,
            tanggal: rec.tanggal_pemeriksaan || rec.tanggal_kunjungan || '-',
            catatan: rec.catatan_intervensi_rehabilitatif || rec.catatan_intervensi || null,
            tindak_lanjut_selesai: Boolean(rec.tindak_lanjut_selesai_rehabilitatif || rec.tindak_lanjut_selesai),
          });
        }
      });
      return { program: item.program, keys: item.keys, count: patients.length, patients };
    });
  }, [allRecords]);

  // 5. Actions & Modals Handlers
  const handleFollowUpAction = (patient: PatientFollowUp) => {
    if (patient.has_kuratif && patient.has_rehabilitatif) {
      setPilihKategoriPatient(patient);
    } else if (patient.has_kuratif) {
      setFollowUpModalData({
        id: patient.id,
        record_type: patient.record_type,
        name: patient.nama_lengkap,
        kategori: 'kuratif',
        butuhTindakLanjut: !patient.kuratif_selesai,
        tindakLanjutSelesai: patient.kuratif_selesai,
        catatan: patient.catatan_intervensi_kuratif || '',
      });
    } else if (patient.has_rehabilitatif) {
      setFollowUpModalData({
        id: patient.id,
        record_type: patient.record_type,
        name: patient.nama_lengkap,
        kategori: 'rehabilitatif',
        butuhTindakLanjut: !patient.rehabilitatif_selesai,
        tindakLanjutSelesai: patient.rehabilitatif_selesai,
        catatan: patient.catatan_intervensi_rehabilitatif || '',
      });
    } else {
      setFollowUpModalData({
        id: patient.id,
        record_type: patient.record_type,
        name: patient.nama_lengkap,
        kategori: 'all',
        butuhTindakLanjut: patient.butuh_tindak_lanjut,
        tindakLanjutSelesai: patient.tindak_lanjut_selesai,
        catatan: patient.catatan_intervensi || '',
      });
    }
  };

  const handleSaveFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpModalData) return;
    setIsSubmitting(true);

    try {
      let uploadedFilePath: string | null = null;
      if (modalFile) {
        const uploadRes = await uploadMedicalFile(modalFile, 'intervensi');
        uploadedFilePath = uploadRes?.publicUrl || null;
      }

      const isSelesai = followUpModalData.tindakLanjutSelesai;
      const isButuh = followUpModalData.butuhTindakLanjut;

      const payload: any = {
        butuh_tindak_lanjut: isButuh,
        tindak_lanjut_selesai: isSelesai,
      };

      if (followUpModalData.kategori === 'kuratif') {
        payload.tindak_lanjut_selesai_kuratif = isSelesai;
        payload.catatan_intervensi_kuratif = followUpModalData.catatan;
        if (uploadedFilePath) payload.file_hasil_tindak_lanjut_kuratif = uploadedFilePath;
      } else if (followUpModalData.kategori === 'rehabilitatif') {
        payload.tindak_lanjut_selesai_rehabilitatif = isSelesai;
        payload.catatan_intervensi_rehabilitatif = followUpModalData.catatan;
        if (uploadedFilePath) payload.file_hasil_tindak_lanjut_rehabilitatif = uploadedFilePath;
      } else {
        payload.catatan_intervensi = followUpModalData.catatan;
        if (uploadedFilePath) payload.file_hasil_tindak_lanjut = uploadedFilePath;
      }

      if (followUpModalData.record_type === 'mcu') {
        await updateMcuRecord(followUpModalData.id, payload);
      } else {
        await updateMiniMcuRecord(followUpModalData.id, payload);
      }

      await refreshData();
      setFollowUpModalData(null);
      setModalFile(null);
      alert('Status tindak lanjut berhasil diperbarui!');
    } catch (err) {
      console.error(err);
      alert('Gagal memperbarui status tindak lanjut.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatLongDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <AppLayout role="admin">
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-6 lg:p-8 shadow-xs space-y-5 sm:space-y-6 max-w-full overflow-hidden">

        {/* Main Header Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 sm:pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              Dashboard Intervensi Layanan Kesehatan
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">
              Pemetaan 3 Tingkat Intervensi Kesehatan Karyawan (Promotif &amp; Preventif, Kuratif, dan Rehabilitatif)
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap w-full sm:w-auto">
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                className="w-full sm:w-auto appearance-none bg-slate-50 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2 outline-none focus:border-emerald-700 focus:bg-white cursor-pointer transition"
              >
                <option value="all">Semua Periode (Riwayat)</option>
                <option value="current">Bulan Ini / Terbaru</option>
                <option value="2026-09">September 2026</option>
                <option value="2026-08">Agustus 2026</option>
                <option value="2026-07">Juli 2026</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Pop-up Banner Pengingat Jadwal Hari Ini */}
        {showReminderBanner && totalTindakLanjutHariIni > 0 && (
          <div className="p-3.5 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 text-white rounded-2xl shadow-lg border border-amber-400/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm md:text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                    <span>🔔 Pengingat Pemeriksaan Lanjutan Hari Ini ({formatLongDate(todayStr)})</span>
                  </h3>
                  <span className="bg-white text-amber-950 font-extrabold text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full shadow-2xs">
                    {totalTindakLanjutHariIni} Pasien
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs font-medium text-amber-100 mt-1 line-clamp-2 sm:line-clamp-1">
                  Ada {totalTindakLanjutHariIni} karyawan yang perlu diperiksa/ditindaklanjuti hari ini:{' '}
                  <strong className="text-white">
                    {patientsDueToday.map((p) => p.nama_lengkap.toLowerCase()).join(', ')}.
                  </strong>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  document.getElementById('daftar-pasien-table')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-white hover:bg-amber-50 text-amber-950 font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Lihat Pasien</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setShowReminderBanner(false)}
                className="p-1.5 text-amber-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
                title="Tutup Notifikasi"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* 4 Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Card 1: Promotif & Preventif */}
          <Link
            href="/admin/rekapan-mcu"
            className="p-3 sm:p-4 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200/80 flex items-center gap-2.5 sm:gap-3.5 shadow-2xs hover:shadow-xs transition cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#065f46] group-hover:bg-emerald-800 text-white flex items-center justify-center shrink-0 shadow-2xs transition">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-emerald-900 truncate block">
                Promotif &amp; Preventif
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{totalPromotifPreventif}</span>
            </div>
          </Link>

          {/* Card 2: Kuratif */}
          <div
            onClick={() => {
              setKategoriFilter('kuratif');
              document.getElementById('daftar-pasien-table')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="relative p-3 sm:p-4 rounded-2xl bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/80 flex items-center gap-2.5 sm:gap-3.5 shadow-2xs hover:shadow-xs transition cursor-pointer group"
          >
            {totalKuratifDueToday > 0 && (
              <span className="absolute -top-2 -right-1.5 sm:-top-2.5 sm:-right-2 bg-rose-600 text-white text-[9px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                {totalKuratifDueToday}
              </span>
            )}
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#d97706] group-hover:bg-amber-700 text-white flex items-center justify-center shrink-0 shadow-2xs transition">
              <FlaskConical className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 truncate block">
                Intervensi Kuratif
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-slate-900">{totalKuratif}</span>
                {totalKuratifDueToday > 0 && (
                  <span className="text-[9px] sm:text-[10px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1 truncate">
                    <span className="w-1 h-1 rounded-full bg-rose-600"></span>
                    {totalKuratifDueToday} Hari Ini
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Card 3: Rehabilitatif */}
          <div
            onClick={() => {
              setKategoriFilter('rehabilitatif');
              document.getElementById('daftar-pasien-table')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-3 sm:p-4 rounded-2xl bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/80 flex items-center gap-2.5 sm:gap-3.5 shadow-2xs hover:shadow-xs transition cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#7c3aed] group-hover:bg-purple-800 text-white flex items-center justify-center shrink-0 shadow-2xs transition">
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-purple-900 truncate block">
                Rehabilitatif
              </span>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{totalRehabilitatif}</span>
            </div>
          </div>

          {/* Card 4: Butuh Tindak Lanjut */}
          <div
            onClick={() => {
              setKategoriFilter('all');
              document.getElementById('daftar-pasien-table')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="p-3 sm:p-4 rounded-2xl bg-rose-50/70 hover:bg-rose-100/80 border border-rose-200/80 flex items-center gap-2.5 sm:gap-3.5 shadow-2xs hover:shadow-xs transition cursor-pointer group"
          >
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-[#e11d48] group-hover:bg-rose-700 text-white flex items-center justify-center shrink-0 shadow-2xs transition">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-rose-900 truncate block">
                Perlu Tindak Lanjut
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xl sm:text-2xl font-black text-slate-900">{totalButuhTindakLanjut}</span>
                {totalTindakLanjutHariIni > 0 ? (
                  <span className="text-[9px] sm:text-[10px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-rose-600"></span>
                    {totalTindakLanjutHariIni} Hari Ini
                  </span>
                ) : totalLewatJadwal > 0 ? (
                  <span className="text-[9px] sm:text-[10px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded-full">
                    {totalLewatJadwal} Lewat
                  </span>
                ) : totalButuhTindakLanjut > 0 ? (
                  <span className="text-[9px] sm:text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">
                    {totalButuhTindakLanjut} Belum
                  </span>
                ) : (
                  <span className="text-[9px] sm:text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                    Tuntas
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DAFTAR PASIEN BUTUH TINDAK LANJUT (KURATIF & REHABILITATIF) */}
        {/* ========================================================================= */}
        <div id="daftar-pasien-table" className="p-3.5 sm:p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4 max-w-full overflow-hidden">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                  Daftar Pasien Butuh Tindak Lanjut (Kuratif &amp; Rehabilitatif)
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                  Pasien yang direkomendasikan konsultasi lanjutan, program konseling, atau rujukan dokter ahli
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full xl:w-auto shrink-0">
              <div className="relative flex-1 sm:w-72 sm:flex-initial min-w-0">
                <select
                  id="kategoriFilterAdmin"
                  value={kategoriFilter}
                  onChange={(e) => setKategoriFilter(e.target.value)}
                  className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl pl-3.5 pr-9 py-2 outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 cursor-pointer transition shadow-2xs truncate"
                >
                  <option value="all">Semua Kategori (Kuratif &amp; Rehabilitatif)</option>
                  <option value="kuratif">Kategori Kuratif</option>
                  <option value="rehabilitatif">Kategori Rehabilitatif</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                  <ChevronDown className="w-4 h-4" />
                </div>
              </div>

              <div className="text-xs font-bold text-slate-600 bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 text-center sm:text-left shrink-0">
                Total: <span className="font-extrabold text-slate-900">{filteredPatients.length}</span> Pasien
              </div>
            </div>
          </div>

          {filteredPatients.length > 0 ? (
            <>
              {/* Mobile Card View (< md) */}
              <div className="block md:hidden space-y-3">
                {paginatedPatients.map((p, idx) => {
                  const detailUrl = `/admin/mcu/${p.id}?type=${p.record_type}&session=${p.record_type === 'mini' ? 'klinik' : 'admin'}-${p.id}`;

                  return (
                    <div
                      key={`mobile-${p.record_type}-${p.id}`}
                      className={`p-3.5 rounded-2xl border transition-all duration-200 space-y-3 ${
                        p.is_today && !p.tindak_lanjut_selesai
                          ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300'
                          : 'bg-white border-slate-200 shadow-2xs'
                      }`}
                    >
                      {/* Card Header: Avatar, Name, NIK, Divisi */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        {p.foto ? (
                          <img
                            src={p.foto}
                            alt={p.nama_lengkap}
                            className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#064e3b] text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {p.nama_lengkap.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={detailUrl}
                            className="font-extrabold text-sm text-slate-900 hover:text-emerald-700 transition truncate block text-left"
                          >
                            {p.nama_lengkap}
                          </Link>
                          <p className="text-[11px] text-slate-500 font-medium truncate">
                            {p.nik} &bull; {p.divisi}
                          </p>
                        </div>
                      </div>

                      {/* Categories & Programs */}
                      <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {p.has_kuratif && (
                            p.kuratif_selesai ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0] font-extrabold text-[10px] rounded-md">
                                <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                                Kuratif (Selesai)
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 bg-[#fef3c7] text-[#92400e] border border-[#fde68a] font-extrabold text-[10px] rounded-md">
                                Kuratif
                              </span>
                            )
                          )}

                          {p.has_rehabilitatif && (
                            p.rehabilitatif_selesai ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0] font-extrabold text-[10px] rounded-md">
                                <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                                Rehabilitatif (Selesai)
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff] font-extrabold text-[10px] rounded-md">
                                Rehabilitatif
                              </span>
                            )
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                          {p.intervensi.map(item => item.replace(/^Kuratif\s*\([^)]*\)\s*:\s*/i, '').replace(/^Rehabilitatif\s*\([^)]*\)\s*:\s*/i, '').replace(/^Promotif\s*:\s*/i, '').trim()).filter(Boolean).join(', ') || p.intervensi.join(', ')}
                        </p>
                      </div>

                      {/* Meta Info: Jadwal & Status */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jadwal Pemeriksaan</span>
                          {p.tanggal_pemeriksaan_lanjutan ? (
                            <div className="mt-0.5 space-y-0.5">
                              <span className="font-bold text-slate-900 block text-xs">
                                {formatDate(p.tanggal_pemeriksaan_lanjutan)}
                              </span>
                              {p.tindak_lanjut_selesai ? (
                                <span className="inline-block bg-[#d1fae5] text-[#065f46] font-extrabold text-[9px] px-2 py-0.5 rounded-full">
                                  Tuntas
                                </span>
                              ) : p.is_today ? (
                                <span className="inline-flex items-center gap-1 bg-[#f59e0b] text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
                                  Hari Ini
                                </span>
                              ) : p.is_overdue ? (
                                <span className="inline-block bg-[#ffe4e6] text-[#9f1239] font-extrabold text-[9px] px-2 py-0.5 rounded-full">
                                  Lewat Jadwal
                                </span>
                              ) : (
                                <span className="text-[9px] text-slate-500 font-medium">Jadwal mendatang</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">- Tidak Ada -</span>
                          )}
                        </div>

                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status Tindak Lanjut</span>
                          <div className="mt-0.5">
                            {p.tindak_lanjut_selesai ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0] font-extrabold text-[10px] rounded-lg">
                                <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                                Tuntas
                              </span>
                            ) : (
                              <span className="inline-block px-2.5 py-0.5 bg-[#fef3c7] text-[#92400e] border border-[#fde68a] font-extrabold text-[10px] rounded-lg">
                                Belum Ditindaklanjuti
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Surat Rujukan (if exists) */}
                      {p.file_surat_rujukan_intervensi && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleOpenSuratRujukan(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition w-full justify-center shadow-2xs cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-700" />
                            <span>Lihat Surat Rujukan</span>
                          </button>
                        </div>
                      )}

                      {/* Actions Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                        <Link
                          href={detailUrl}
                          className="py-2 px-3 bg-[#0f766e] hover:bg-[#115e59] text-white font-bold text-xs rounded-xl transition shadow-2xs flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </Link>

                        {!p.tindak_lanjut_selesai ? (
                          <button
                            type="button"
                            onClick={() => handleFollowUpAction(p)}
                            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition border border-slate-200 cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                            <span>Update Status</span>
                          </button>
                        ) : (
                          <div className="py-2 px-3 bg-[#d1fae5] text-[#065f46] font-extrabold text-xs rounded-xl text-center flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                            <span>Selesai</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop / Tablet Table View (>= md) */}
              <div className="hidden md:block">
                <div className="flex items-center justify-end pb-1.5 text-[11px] text-slate-500 font-medium lg:hidden">
                  <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                    ⇄ Geser tabel horizontal untuk melihat kolom lengkap
                  </span>
                </div>
                <div className="overflow-x-auto pb-2 rounded-xl border border-slate-100">
                  <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-3 w-12 text-center">NO</th>
                        <th className="py-3 px-3">PASIEN / KARYAWAN</th>
                        <th className="py-3 px-3">KATEGORI &amp; PROGRAM</th>
                        <th className="py-3 px-3">JADWAL PEMERIKSAAN LANJUTAN</th>
                        <th className="py-3 px-3">SURAT RUJUKAN</th>
                        <th className="py-3 px-3">STATUS TINDAK LANJUT</th>
                        <th className="py-3 px-3 text-center">AKSI KLINIK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {paginatedPatients.map((p, idx) => {
                        const detailUrl = `/admin/mcu/${p.id}?type=${p.record_type}&session=${p.record_type === 'mini' ? 'klinik' : 'admin'}-${p.id}`;

                        return (
                          <tr
                            key={`${p.record_type}-${p.id}`}
                            className={`hover:bg-amber-50/80 transition-all duration-200 ${p.is_today && !p.tindak_lanjut_selesai ? 'bg-amber-50/70 ring-1 ring-amber-300' : 'bg-white'
                              }`}
                          >
                            {/* 1. NO */}
                            <td className="py-4 px-3 text-center font-bold text-slate-700">{(currentPage - 1) * perPage + idx + 1}</td>

                            {/* 2. PASIEN / KARYAWAN */}
                            <td className="py-4 px-3">
                              <div className="flex items-center gap-2.5">
                                {p.foto ? (
                                  <img src={p.foto} alt={p.nama_lengkap} className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-[#064e3b] text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                                    {p.nama_lengkap.substring(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <Link
                                    href={detailUrl}
                                    className="font-extrabold text-slate-900 hover:text-emerald-700 transition truncate block text-left"
                                  >
                                    {p.nama_lengkap}
                                  </Link>
                                  <p className="text-[11px] text-slate-500 font-medium">{p.nik} &bull; {p.divisi}</p>
                                </div>
                              </div>
                            </td>

                            {/* 3. KATEGORI & PROGRAM */}
                            <td className="py-4 px-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {p.has_kuratif && (
                                    p.kuratif_selesai ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0] font-extrabold text-[10px] rounded-md shadow-2xs">
                                        <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                                        Kuratif (Selesai)
                                      </span>
                                    ) : (
                                      <span className="inline-block px-2.5 py-0.5 bg-[#fef3c7] text-[#92400e] border border-[#fde68a] font-extrabold text-[10px] rounded-md shadow-2xs">
                                        Kuratif
                                      </span>
                                    )
                                  )}

                                  {p.has_rehabilitatif && (
                                    p.rehabilitatif_selesai ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0] font-extrabold text-[10px] rounded-md shadow-2xs">
                                        <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                                        Rehabilitatif (Selesai)
                                      </span>
                                    ) : (
                                      <span className="inline-block px-2.5 py-0.5 bg-[#f3e8ff] text-[#6b21a8] border border-[#e9d5ff] font-extrabold text-[10px] rounded-md shadow-2xs">
                                        Rehabilitatif
                                      </span>
                                    )
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-600 font-medium truncate max-w-xs" title={p.intervensi.join(', ')}>
                                  {p.intervensi.map(item => item.replace(/^Kuratif\s*\([^)]*\)\s*:\s*/i, '').replace(/^Rehabilitatif\s*\([^)]*\)\s*:\s*/i, '').replace(/^Promotif\s*:\s*/i, '').trim()).filter(Boolean).join(', ') || p.intervensi.join(', ')}
                                </p>
                              </div>
                            </td>

                            {/* 4. JADWAL PEMERIKSAAN LANJUTAN */}
                            <td className="py-4 px-3">
                              {p.tanggal_pemeriksaan_lanjutan ? (
                                <div className="space-y-0.5">
                                  <span className="font-extrabold text-slate-900 block text-xs">
                                    {formatDate(p.tanggal_pemeriksaan_lanjutan)}
                                  </span>
                                  {p.tindak_lanjut_selesai ? (
                                    <span className="inline-block bg-[#d1fae5] text-[#065f46] font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                                      Tuntas
                                    </span>
                                  ) : p.is_today ? (
                                    <span className="inline-flex items-center gap-1 bg-[#f59e0b] text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950"></span>
                                      Hari Ini
                                    </span>
                                  ) : p.is_overdue ? (
                                    <span className="inline-block bg-[#ffe4e6] text-[#9f1239] font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                                      Lewat Jadwal
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-medium">Jadwal mendatang</span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">- Tidak Ada Jadwal -</span>
                              )}
                            </td>

                            {/* 5. SURAT RUJUKAN */}
                            <td className="py-4 px-3">
                              {p.file_surat_rujukan_intervensi ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenSuratRujukan(p)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg text-[11px] font-bold transition shadow-2xs cursor-pointer"
                                >
                                  <FileText className="w-3.5 h-3.5 text-purple-700" />
                                  <span>Lihat Rujukan</span>
                                </button>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>

                            {/* 6. STATUS TINDAK LANJUT */}
                            <td className="py-4 px-3">
                              <div className="space-y-1">
                                {p.tindak_lanjut_selesai ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0] font-extrabold text-[11px] rounded-lg">
                                    <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                                    Tuntas Ditindaklanjuti
                                  </span>
                                ) : (
                                  <span className="inline-block px-3 py-1 bg-[#fef3c7] text-[#92400e] border border-[#fde68a] font-extrabold text-[11px] rounded-lg">
                                    Belum Ditindaklanjuti
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* 7. AKSI KLINIK */}
                            <td className="py-4 px-3 text-center">
                              <div className="flex flex-col items-center justify-center gap-1.5">
                                <Link
                                  href={detailUrl}
                                  className="w-20 px-2.5 py-1.5 bg-[#0f766e] hover:bg-[#115e59] text-white font-bold text-[11px] rounded-lg transition shadow-2xs flex items-center justify-center gap-1"
                                  title="Detail Pasien"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Detail</span>
                                </Link>

                                {!p.tindak_lanjut_selesai ? (
                                  <button
                                    type="button"
                                    onClick={() => handleFollowUpAction(p)}
                                    className="w-20 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] rounded-lg transition border border-slate-200 cursor-pointer shadow-2xs"
                                    title="Perbarui status tindak lanjut"
                                  >
                                    Status
                                  </button>
                                ) : (
                                  <span className="w-20 px-2.5 py-1 bg-[#d1fae5] text-[#065f46] font-extrabold text-[11px] rounded-lg text-center">
                                    Selesai
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
                <div className="text-slate-600 text-center sm:text-left">
                  Menampilkan{' '}
                  <strong className="text-slate-900">
                    {filteredPatients.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
                  </strong>{' '}
                  -{' '}
                  <strong className="text-slate-900">
                    {Math.min(currentPage * perPage, filteredPatients.length)}
                  </strong>{' '}
                  dari <strong className="text-slate-900">{filteredPatients.length}</strong> Pasien
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(p - 1, 1));
                      document.getElementById('daftar-pasien-table')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition shadow-2xs flex items-center gap-1 text-slate-700 font-bold cursor-pointer"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      if (totalPages <= 5) return true;
                      return Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages;
                    })
                    .map((page, idx, arr) => {
                      const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={page}>
                          {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPage(page);
                              document.getElementById('daftar-pasien-table')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                              currentPage === page
                                ? 'bg-emerald-800 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {page}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(p + 1, totalPages));
                      document.getElementById('daftar-pasien-table')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition shadow-2xs flex items-center gap-1 text-slate-700 font-bold cursor-pointer"
                    title="Halaman Selanjutnya"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              <p className="text-xs text-slate-500 font-bold">Belum ada pasien yang membutuhkan intervensi atau tindak lanjut pada periode ini.</p>
            </div>
          )}
        </div>

        {/* 3 INTERVENTION CHARTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* 1. Intervensi Promotif & Preventif Chart */}
          <div className="p-3.5 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 max-w-full overflow-hidden flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Intervensi Promotif &amp; Preventif</h3>
              <p className="text-[11px] text-slate-500 font-medium">Health Talk, MCU, Gym, Vaksin, dll.</p>
            </div>
            <div className="h-64 w-full relative pt-2 overflow-x-auto">
              {mounted && (
                <div style={{ minWidth: '280px', height: '100%', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartPromotifData}
                      margin={{ top: 20, right: 15, left: -15, bottom: 45 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          const item = state.activePayload[0].payload;
                          setSelectedChartProgram({
                            program: item.program,
                            kategori: 'promotif',
                            patients: item.patients || [],
                          });
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="program"
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                        tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#475569' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                        cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                        formatter={(val: any) => [`${val} Pasien (Klik untuk lihat daftar nama)`, 'Jumlah']}
                      />
                      <Bar
                        dataKey="count"
                        name="Jumlah"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        barSize={22}
                        cursor="pointer"
                        onClick={(data: any) => {
                          const payload = data?.payload || data;
                          if (payload?.program) {
                            setSelectedChartProgram({
                              program: payload.program,
                              kategori: 'promotif',
                              patients: payload.patients || [],
                            });
                          }
                        }}
                      >
                        {chartPromotifData.map((entry, index) => (
                          <Cell
                            key={`cell-promotif-admin-${index}`}
                            cursor="pointer"
                            fill="#10b981"
                            className="hover:opacity-80 transition cursor-pointer"
                          />
                        ))}
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#065f46' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {/* Quick-Access Badges */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {chartPromotifData.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedChartProgram({
                    program: item.program,
                    kategori: 'promotif',
                    patients: item.patients,
                  })}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    item.count > 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={`Klik untuk melihat ${item.count} pasien ${item.program}`}
                >
                  <span className="truncate max-w-[110px]">{item.program}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    item.count > 0 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Intervensi Kuratif Chart */}
          <div className="p-3.5 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 max-w-full overflow-hidden flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Intervensi Kuratif</h3>
              <p className="text-[11px] text-slate-500 font-medium">Konsultasi Lanjutan, EHCP, Kesegaran</p>
            </div>
            <div className="h-64 w-full relative pt-2 overflow-x-auto">
              {mounted && (
                <div style={{ minWidth: '280px', height: '100%', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartKuratifData}
                      margin={{ top: 20, right: 15, left: -15, bottom: 45 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          const item = state.activePayload[0].payload;
                          setSelectedChartProgram({
                            program: item.program,
                            kategori: 'kuratif',
                            patients: item.patients || [],
                          });
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="program"
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={50}
                        tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#475569' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                        cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }}
                        formatter={(val: any) => [`${val} Pasien (Klik untuk lihat daftar nama)`, 'Jumlah']}
                      />
                      <Bar
                        dataKey="count"
                        name="Jumlah"
                        fill="#d97706"
                        radius={[4, 4, 0, 0]}
                        barSize={26}
                        cursor="pointer"
                        onClick={(data: any) => {
                          const payload = data?.payload || data;
                          if (payload?.program) {
                            setSelectedChartProgram({
                              program: payload.program,
                              kategori: 'kuratif',
                              patients: payload.patients || [],
                            });
                          }
                        }}
                      >
                        {chartKuratifData.map((entry, index) => (
                          <Cell
                            key={`cell-kuratif-admin-${index}`}
                            cursor="pointer"
                            fill="#d97706"
                            className="hover:opacity-80 transition cursor-pointer"
                          />
                        ))}
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#92400e' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {/* Quick-Access Badges */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {chartKuratifData.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedChartProgram({
                    program: item.program,
                    kategori: 'kuratif',
                    patients: item.patients,
                  })}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    item.count > 0
                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={`Klik untuk melihat ${item.count} pasien ${item.program}`}
                >
                  <span className="truncate max-w-[130px]">{item.program}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    item.count > 0 ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Intervensi Rehabilitatif Chart */}
          <div className="p-3.5 sm:p-5 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3 max-w-full overflow-hidden flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Intervensi Rehabilitatif</h3>
              <p className="text-[11px] text-slate-500 font-medium">Monitoring Tindak Lanjut Dokter Ahli</p>
            </div>
            <div className="h-64 w-full relative pt-2 overflow-x-auto">
              {mounted && (
                <div style={{ minWidth: '280px', height: '100%', width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartRehabilitatifData}
                      margin={{ top: 20, right: 15, left: -15, bottom: 45 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          const item = state.activePayload[0].payload;
                          setSelectedChartProgram({
                            program: item.program,
                            kategori: 'rehabilitatif',
                            patients: item.patients || [],
                          });
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="program"
                        interval={0}
                        tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }}
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#475569' }} />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', fontSize: '11px' }}
                        cursor={{ fill: 'rgba(124, 58, 237, 0.08)' }}
                        formatter={(val: any) => [`${val} Pasien (Klik untuk lihat daftar nama)`, 'Jumlah']}
                      />
                      <Bar
                        dataKey="count"
                        name="Jumlah"
                        fill="#7c3aed"
                        radius={[4, 4, 0, 0]}
                        barSize={26}
                        cursor="pointer"
                        onClick={(data: any) => {
                          const payload = data?.payload || data;
                          if (payload?.program) {
                            setSelectedChartProgram({
                              program: payload.program,
                              kategori: 'rehabilitatif',
                              patients: payload.patients || [],
                            });
                          }
                        }}
                      >
                        {chartRehabilitatifData.map((entry, index) => (
                          <Cell
                            key={`cell-rehab-admin-${index}`}
                            cursor="pointer"
                            fill="#7c3aed"
                            className="hover:opacity-80 transition cursor-pointer"
                          />
                        ))}
                        <LabelList dataKey="count" position="top" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#5b21b6' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            {/* Quick-Access Badges */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
              {chartRehabilitatifData.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedChartProgram({
                    program: item.program,
                    kategori: 'rehabilitatif',
                    patients: item.patients,
                  })}
                  className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                    item.count > 0
                      ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                  }`}
                  title={`Klik untuk melihat ${item.count} pasien ${item.program}`}
                >
                  <span className="truncate max-w-[180px]">{item.program}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                    item.count > 0 ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL PILIH KATEGORI TINDAK LANJUT (KURATIF vs REHABILITATIF) */}
      {/* ========================================================================= */}
      {pilihKategoriPatient && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Pilih Kategori Tindak Lanjut</h3>
                  <p className="text-xs text-slate-500 font-medium">Pasien: {pilihKategoriPatient.nama_lengkap} (NIK: {pilihKategoriPatient.nik})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPilihKategoriPatient(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Pasien ini memiliki lebih dari satu kategori intervensi. Silakan pilih kategori yang ingin Anda tindaklanjuti:
            </p>

            <div className="space-y-3 pt-1">
              {/* Option Kuratif */}
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">Intervensi Kuratif</h4>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${pilihKategoriPatient.kuratif_selesai
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}
                  >
                    {pilihKategoriPatient.kuratif_selesai ? '✓ Selesai' : 'Belum Selesai'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  {pilihKategoriPatient.kuratif_programs.length > 0 ? `Program: ${pilihKategoriPatient.kuratif_programs.join(', ')}` : 'Program: Intervensi Kuratif'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const p = pilihKategoriPatient;
                      setPilihKategoriPatient(null);
                      setFollowUpModalData({
                        id: p.id,
                        record_type: p.record_type,
                        name: p.nama_lengkap,
                        kategori: 'kuratif',
                        butuhTindakLanjut: !p.kuratif_selesai,
                        tindakLanjutSelesai: p.kuratif_selesai,
                        catatan: p.catatan_intervensi_kuratif || '',
                      });
                    }}
                    className="flex-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs text-center cursor-pointer"
                  >
                    Perbarui Status Kuratif
                  </button>
                </div>
              </div>

              {/* Option Rehabilitatif */}
              <div className="p-4 rounded-2xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 transition space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-purple-600"></span>
                    <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">Intervensi Rehabilitatif</h4>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${pilihKategoriPatient.rehabilitatif_selesai
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                      }`}
                  >
                    {pilihKategoriPatient.rehabilitatif_selesai ? '✓ Selesai' : 'Belum Selesai'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium">
                  {pilihKategoriPatient.rehabilitatif_programs.length > 0 ? `Program: ${pilihKategoriPatient.rehabilitatif_programs.join(', ')}` : 'Program: Monitoring hasil tindak lanjut oleh dokter ahli'}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const p = pilihKategoriPatient;
                      setPilihKategoriPatient(null);
                      setFollowUpModalData({
                        id: p.id,
                        record_type: p.record_type,
                        name: p.nama_lengkap,
                        kategori: 'rehabilitatif',
                        butuhTindakLanjut: !p.rehabilitatif_selesai,
                        tindakLanjutSelesai: p.rehabilitatif_selesai,
                        catatan: p.catatan_intervensi_rehabilitatif || '',
                      });
                    }}
                    className="flex-1 px-3 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl transition shadow-xs text-center cursor-pointer"
                  >
                    Perbarui Status Rehabilitatif
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setPilihKategoriPatient(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL UPDATE STATUS TINDAK LANJUT (ADMIN) */}
      {/* ========================================================================= */}
      {followUpModalData && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 sm:space-y-5 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Perbarui Status Tindak Lanjut{' '}
                    <span className="text-emerald-800">
                      {followUpModalData.kategori === 'kuratif'
                        ? '(Kuratif)'
                        : followUpModalData.kategori === 'rehabilitatif'
                          ? '(Rehabilitatif)'
                          : ''}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Pasien: {followUpModalData.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFollowUpModalData(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveFollowUp} className="space-y-4">
              {/* Toggle Masih Butuh Tindak Lanjut */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block text-xs font-extrabold text-slate-800">Status Masih Butuh Tindak Lanjut</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border bg-white cursor-pointer hover:bg-slate-50 text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="butuh_tindak_lanjut"
                      checked={followUpModalData.butuhTindakLanjut}
                      onChange={() =>
                        setFollowUpModalData((prev) =>
                          prev ? { ...prev, butuhTindakLanjut: true, tindakLanjutSelesai: false } : null
                        )
                      }
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>Ya (Masih Butuh)</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border bg-white cursor-pointer hover:bg-slate-50 text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="butuh_tindak_lanjut"
                      checked={!followUpModalData.butuhTindakLanjut}
                      onChange={() =>
                        setFollowUpModalData((prev) =>
                          prev ? { ...prev, butuhTindakLanjut: false, tindakLanjutSelesai: true } : null
                        )
                      }
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Tidak (Sudah Selesai)</span>
                  </label>
                </div>
              </div>

              {/* Toggle Tindak Lanjut Selesai */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Tandai Tindak Lanjut Selesai</span>
                  <span className="text-[10px] text-slate-500">Pasien sudah menerima konsultasi / pemeriksaan tindak lanjut</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={followUpModalData.tindakLanjutSelesai}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setFollowUpModalData((prev) =>
                        prev ? { ...prev, tindakLanjutSelesai: checked, butuhTindakLanjut: !checked } : null
                      );
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-800"></div>
                </label>
              </div>

              {/* Upload Hasil Tindak Lanjut */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Upload Berkas Hasil Tindak Lanjut (Opsional)
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={(e) => setModalFile(e.target.files?.[0] || null)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-100 file:text-emerald-800 hover:file:bg-emerald-200 cursor-pointer"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Unggah berkas hasil pemeriksaan lanjutan, surat konsul, atau surat keterangan (PDF/Foto)
                </p>
              </div>

              {/* Catatan Tambahan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Catatan Tambahan</label>
                <textarea
                  rows={2}
                  value={followUpModalData.catatan}
                  onChange={(e) =>
                    setFollowUpModalData((prev) => (prev ? { ...prev, catatan: e.target.value } : null))
                  }
                  placeholder="Catatan hasil tindak lanjut..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white transition resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFollowUpModalData(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Examination Detail Modal (Shows all examinations & scheduled session) */}
      <IntervensiDetailModal
        isOpen={Boolean(detailPatientModal)}
        onClose={() => setDetailPatientModal(null)}
        patient={detailPatientModal}
        mcuRecords={mcuRecords}
        miniMcuRecords={miniMcuRecords}
        karyawanRecords={karyawanRecords}
        role="admin"
        onOpenSuratRujukan={handleOpenSuratRujukan}
      />

      {/* Modal Daftar Pasien per Program Intervensi (saat chart/grafik diklik) */}
      {selectedChartProgram && (
        <IntervensiChartPatientsModal
          isOpen={Boolean(selectedChartProgram)}
          onClose={() => setSelectedChartProgram(null)}
          programName={selectedChartProgram.program}
          kategori={selectedChartProgram.kategori}
          patients={selectedChartProgram.patients}
          role="admin"
        />
      )}

      {/* Surat Rujukan Preview Modal */}
      <DocumentPreviewModal
        open={previewDocModal.open}
        onClose={() => setPreviewDocModal((prev) => ({ ...prev, open: false }))}
        title={previewDocModal.title}
        url={previewDocModal.url}
        fileName={previewDocModal.fileName}
      />
    </AppLayout>
  );
}
