'use client';

import React, { useState, useMemo, useRef, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  ArrowLeft,
  User,
  Activity,
  FileText,
  Calendar,
  Clock,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Download,
  Paperclip,
  CheckCircle,
  Check,
  Hospital,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ChevronDown,
  X,
  Image as ImageIcon,
  ExternalLink,
  FileSpreadsheet,
  Stethoscope,
  Pill,
  AlertCircle,
} from 'lucide-react';
import { HealthTrendChart } from '@/components/mcu/HealthTrendChart';
import { getRecordTimestamp } from '@/services/mcuService';
import { DocumentPreviewModal } from '@/components/common/DocumentPreviewModal';
import { generateSuratRujukanDataUrl } from '@/utils/rujukanGenerator';

function formatDate(dateStr: string | null | undefined, includeTime = false, customTime?: string | null): string {
  if (!dateStr) return '-';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const isoDateMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    let day = 1;
    let month = months[0];
    let year = 2026;
    let hours = '08';
    let mins = '30';

    if (isoDateMatch) {
      year = parseInt(isoDateMatch[1]);
      const monthIdx = parseInt(isoDateMatch[2]) - 1;
      month = months[monthIdx] || 'Januari';
      day = parseInt(isoDateMatch[3]);

      const timeInStr = String(dateStr).match(/[T ](\d{1,2}):(\d{1,2})/);
      if (timeInStr) {
        hours = timeInStr[1].padStart(2, '0');
        mins = timeInStr[2].padStart(2, '0');
      }
    } else {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        day = d.getDate();
        month = months[d.getMonth()];
        year = d.getFullYear();
        hours = String(d.getHours()).padStart(2, '0');
        mins = String(d.getMinutes()).padStart(2, '0');
      }
    }

    if (customTime && typeof customTime === 'string') {
      const timeMatch = customTime.match(/(\d{1,2})[:.](\d{1,2})/);
      if (timeMatch) {
        hours = timeMatch[1].padStart(2, '0');
        mins = timeMatch[2].padStart(2, '0');
      }
    }

    if (includeTime) {
      return `${day} ${month} ${year}, ${hours}:${mins} WIB`;
    }
    return `${day} ${month} ${year}`;
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

function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return '2026';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function renderBulletList(
  textOrArray: string | string[] | null | undefined,
  emptyMessage = '- Tidak Ada Catatan -'
) {
  if (!textOrArray) {
    return <p className="text-xs font-normal text-slate-400 italic">{emptyMessage}</p>;
  }

  let items: string[] = [];
  if (Array.isArray(textOrArray)) {
    items = textOrArray.map((s) => String(s).trim()).filter(Boolean);
  } else {
    const normalized = String(textOrArray).replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
    items = normalized
      .split('\n')
      .map((line) => line.trim().replace(/^[•*\-\s]+/, ''))
      .filter((line) => line.length > 0 && line !== '-');
  }

  if (items.length === 0) {
    return <p className="text-xs font-normal text-slate-400 italic">{emptyMessage}</p>;
  }

  return (
    <ul className="m-0 pl-5 list-disc text-slate-800 text-xs sm:text-sm font-medium leading-relaxed space-y-1.5">
      {items.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  );
}

function parseMetricValue(val: any): number | null {
  if (val === null || val === undefined || val === '' || val === '-') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const cleaned = String(val).replace(/,/g, '.').replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function getChartConfig(metric: string, data: any[]) {
  if (metric === 'tensi') {
    const sisValues = data.map((d) => d.sistolik).filter((v) => typeof v === 'number' && !isNaN(v));
    const diaValues = data.map((d) => d.diastolik).filter((v) => typeof v === 'number' && !isNaN(v));
    const maxVal = Math.max(...sisValues, 140);
    const minVal = Math.min(...diaValues, 60);
    const min = Math.max(40, Math.floor((minVal - 20) / 20) * 20);
    const max = Math.ceil((maxVal + 20) / 20) * 20;
    const ticks: number[] = [];
    for (let i = min; i <= max; i += 20) {
      ticks.push(i);
    }
    return { domain: [min, max], ticks, unit: 'mmHg' };
  }

  if (metric === 'gula_darah') {
    const values = data.map((d) => d.gula_darah).filter((v) => typeof v === 'number' && !isNaN(v));
    const maxVal = Math.max(...values, 160);
    const minVal = Math.min(...values, 70);
    const min = Math.max(40, Math.floor((minVal - 30) / 20) * 20);
    const max = Math.ceil((maxVal + 40) / 20) * 20;
    const ticks: number[] = [];
    for (let i = min; i <= max; i += 20) {
      ticks.push(i);
    }
    return { domain: [min, max], ticks, unit: 'mg/dL' };
  }

  if (metric === 'kolesterol') {
    const values = data.map((d) => d.kolesterol).filter((v) => typeof v === 'number' && !isNaN(v));
    const maxVal = Math.max(...values, 220);
    const minVal = Math.min(...values, 140);
    const min = Math.max(80, Math.floor((minVal - 40) / 20) * 20);
    const max = Math.ceil((maxVal + 40) / 20) * 20;
    const ticks: number[] = [];
    for (let i = min; i <= max; i += 20) {
      ticks.push(i);
    }
    return { domain: [min, max], ticks, unit: 'mg/dL' };
  }

  if (metric === 'asam_urat') {
    const values = data.map((d) => d.asam_urat).filter((v) => typeof v === 'number' && !isNaN(v));
    const maxVal = Math.max(...values, 8.0);
    const minVal = Math.min(...values, 3.0);
    const min = Math.max(0, Math.floor(minVal - 1));
    const max = Math.ceil(maxVal + 2);
    const ticks: number[] = [];
    for (let i = min; i <= max; i += 1) {
      ticks.push(i);
    }
    return { domain: [min, max], ticks, unit: 'mg/dL' };
  }

  if (metric === 'bmi_bb_tb') {
    return { domain: [10, 200], ticks: [20, 40, 60, 80, 100, 140, 180], unit: '' };
  }

  return { domain: [0, 100], ticks: [0, 25, 50, 75, 100], unit: '' };
}


function CustomChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const dataPoint = payload[0]?.payload;
  const fullDate = dataPoint?.fullDate || label;

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm text-white p-3.5 rounded-xl shadow-2xl border border-slate-700 text-xs min-w-[220px] space-y-2 z-50">
      <div className="border-b border-slate-800 pb-1.5">
        <p className="font-extrabold text-emerald-400">📅 {fullDate}</p>
        <p className="text-[10px] text-slate-400 font-medium">Data Pengukuran Pemeriksaan Fisik</p>
      </div>
      <div className="space-y-1.5">
        {payload.map((entry: any, index: number) => {
          if (entry.value === null || entry.value === undefined) return null;
          let unit = '';
          let normalRef = '';
          if (entry.dataKey === 'sistolik') {
            unit = 'mmHg';
            normalRef = 'Batas Normal: ≤ 120 mmHg';
          } else if (entry.dataKey === 'diastolik') {
            unit = 'mmHg';
            normalRef = 'Batas Normal: ≤ 80 mmHg';
          } else if (entry.dataKey === 'gula_darah') {
            unit = 'mg/dL';
            normalRef = 'Batas Atas Normal: < 140 mg/dL';
          } else if (entry.dataKey === 'kolesterol') {
            unit = 'mg/dL';
            normalRef = 'Batas Atas Normal: < 200 mg/dL';
          } else if (entry.dataKey === 'asam_urat') {
            unit = 'mg/dL';
            normalRef = 'Batas Atas Normal: < 7.0 mg/dL';
          } else if (entry.dataKey === 'berat_badan') {
            unit = 'kg';
          } else if (entry.dataKey === 'tinggi_badan') {
            unit = 'cm';
          } else if (entry.dataKey === 'bmi') {
            unit = '';
            normalRef = 'Indeks Normal: 18.5 - 24.9';
          }

          return (
            <div key={`item-${index}`} className="flex items-start justify-between gap-3 font-semibold">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 mt-0.5" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <div className="text-right">
                <span className="font-black text-white text-sm">
                  {entry.value} {unit}
                </span>
                {normalRef && (
                  <span className="text-[10px] text-slate-400 font-normal block">{normalRef}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdminDetailMcuContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { mcuRecords, miniMcuRecords, karyawanRecords, updateMcuRecord } = useMcu();
  const [mounted, setMounted] = useState(false);

  // Form states for "Perbarui Status Tindak Lanjut Pasien"
  const [tindakLanjutStatus, setTindakLanjutStatus] = useState<'butuh' | 'tuntas'>('tuntas');
  const [catatanTindakLanjut, setCatatanTindakLanjut] = useState('');
  const [fileTindakLanjut, setFileTindakLanjut] = useState<File | null>(null);

  // Document Preview Modal State
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

  const openDocPreview = (title: string, url: string | null | undefined, fileName: string, patientData?: any) => {
    let finalUrl = url || null;
    if (!finalUrl || (!finalUrl.startsWith('data:') && !finalUrl.startsWith('http:') && !finalUrl.startsWith('https:') && !finalUrl.startsWith('blob:') && !finalUrl.startsWith('/'))) {
      if (title.toLowerCase().includes('rujukan') || fileName.toLowerCase().includes('rujukan')) {
        finalUrl = generateSuratRujukanDataUrl(patientData || activeRecord || initialRecord || {});
      }
    }
    setPreviewDocModal({
      open: true,
      title,
      url: finalUrl,
      fileName,
    });
  };

  const downloadDocFile = (url: string | null, fileName: string) => {
    if (!url || (!url.startsWith('data:') && !url.startsWith('http:') && !url.startsWith('https:') && !url.startsWith('blob:'))) {
      alert(`Berkas "${fileName}" belum memiliki data fisik yang tersimpan di sistem untuk diunduh.`);
      return;
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'Dokumen_MCU';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSingleExcel = (record: any) => {
    const patientName = record.nama_karyawan || record.nama_lengkap || 'Karyawan';
    const cleanName = patientName.replace(/[^A-Za-z0-9]/g, '_');
    const headers = [
      'No',
      'Tanggal Pemeriksaan',
      'Nama Pasien',
      'NIK',
      'Departemen/Entitas',
      'Divisi',
      'Jabatan',
      'Diagnosa',
      'Tindak Lanjut',
      'Intervensi',
      'Status Kebugaran',
    ];

    const intervensiStr = Array.isArray(record.intervensi)
      ? record.intervensi.join('; ')
      : record.intervensi || '-';

    const row = [
      '1',
      record.tanggal_pemeriksaan || '-',
      `"${patientName}"`,
      `"'${record.nik || '-'}"`,
      `"${record.departemen || '-'}"`,
      `"${record.divisi || '-'}"`,
      `"${record.jabatan || '-'}"`,
      `"${(record.diagnosa || record.catatan_medis || '-').replace(/"/g, '""')}"`,
      `"${(record.tindak_lanjut || record.tindakan_terapi || '-').replace(/"/g, '""')}"`,
      `"${String(intervensiStr).replace(/"/g, '""')}"`,
      `"${record.status_kebugaran || record.kesimpulan || '-'}"`,
    ];

    const csvContent = `${headers.join(',')}\n${row.join(',')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Data_Rekap_MCU_${cleanName}_${new Date().toISOString().substring(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  const idParam = searchParams.get('id') || (params?.id as string);
  const typeParam = searchParams.get('type');
  const sessionParam = searchParams.get('session');
  const recordId = idParam ? Number(idParam) : 1;

  // Find initial target record
  const initialRecord = useMemo(() => {
    if (sessionParam) {
      const [sRole, sIdStr] = sessionParam.split('-');
      const sId = Number(sIdStr);
      if (sRole === 'admin') {
        const foundMcu = mcuRecords.find((r) => r.id === sId);
        if (foundMcu) return { ...foundMcu, created_by_role: 'admin' as const };
      } else if (sRole === 'klinik') {
        const foundMini = miniMcuRecords.find((r) => r.id === sId);
        if (foundMini) return { ...foundMini, created_by_role: 'klinik' as const };
      } else if (sRole === 'karyawan') {
        const foundKary = (karyawanRecords || []).find((r: any) => r.id === sId);
        if (foundKary) return { ...foundKary, created_by_role: 'karyawan' as const };
      }
    }

    if (recordId) {
      if (typeParam === 'mini' || typeParam === 'klinik') {
        const foundMini = miniMcuRecords.find((r) => r.id === recordId);
        if (foundMini) return { ...foundMini, created_by_role: 'klinik' as const };
        const foundMcu = mcuRecords.find((r) => r.id === recordId);
        if (foundMcu) return { ...foundMcu, created_by_role: 'admin' as const };
      } else {
        const foundMcu = mcuRecords.find((r) => r.id === recordId);
        if (foundMcu) return { ...foundMcu, created_by_role: 'admin' as const };
        const foundMini = miniMcuRecords.find((r) => r.id === recordId);
        if (foundMini) return { ...foundMini, created_by_role: 'klinik' as const };
      }
      const foundKary = (karyawanRecords || []).find((r: any) => r.id === recordId);
      if (foundKary) return { ...foundKary, created_by_role: 'karyawan' as const };
    }
    if (mcuRecords.length > 0) {
      return { ...mcuRecords[0], created_by_role: 'admin' as const };
    }
    if (miniMcuRecords.length > 0) {
      return { ...miniMcuRecords[0], created_by_role: 'klinik' as const };
    }
    if ((karyawanRecords || []).length > 0) {
      return { ...karyawanRecords[0], created_by_role: 'karyawan' as const };
    }
    return null;
  }, [sessionParam, recordId, typeParam, mcuRecords, miniMcuRecords, karyawanRecords]);

  // Find all history records for this patient
  const patientHistory = useMemo(() => {
    if (!initialRecord) return [];
    const pNik = (initialRecord.nik || '').trim().toLowerCase();
    const pName = (initialRecord.nama_karyawan || (initialRecord as any).nama_lengkap || '').trim().toLowerCase();

    const matchesPatient = (r: any) => {
      const rNik = (r.nik || '').trim().toLowerCase();
      const rName = (r.nama_lengkap || (r as any).nama_karyawan || '').trim().toLowerCase();
      if (pNik && rNik && pNik === rNik) return true;
      if (pName && rName && (pName === rName || pName.includes(rName) || rName.includes(pName))) return true;
      return false;
    };

    const matchedMcu = mcuRecords
      .filter(matchesPatient)
      .map((r) => ({ ...r, created_by_role: 'admin' as const }));

    const matchedMini = miniMcuRecords
      .filter(matchesPatient)
      .map((r) => ({ ...r, created_by_role: 'klinik' as const }));

    const matchedKaryawan = (karyawanRecords || [])
      .filter(matchesPatient)
      .map((r) => ({
        ...r,
        created_by_role: 'karyawan' as const,
        diagnosa: r.diagnosa || 'Pemeriksaan Mandiri',
        faktor_risiko: r.faktor_risiko || 'Tidak memiliki faktor risiko',
        penyakit: Array.isArray(r.penyakit) ? r.penyakit : ['Pemeriksaan Mandiri'],
        anjuran: r.anjuran || r.saran || 'Pemeriksaan kesehatan berkala',
        intervensi: Array.isArray(r.intervensi) ? r.intervensi : [],
      }));

    const combined = [...matchedMcu, ...matchedMini, ...matchedKaryawan];
    if (combined.length === 0 && initialRecord) {
      combined.push(initialRecord);
    }

    // Sort descending for session tabs (newest first based on getRecordTimestamp)
    return combined.sort((a, b) => {
      const timeA = getRecordTimestamp(a);
      const timeB = getRecordTimestamp(b);
      if (timeA !== timeB) return timeB - timeA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [initialRecord, mcuRecords, miniMcuRecords, karyawanRecords]);

  // The latest overall examination record across ALL sources (Mandiri, Klinik, or Admin)
  const latestPatientRecord = useMemo(() => {
    return patientHistory[0] || initialRecord;
  }, [patientHistory, initialRecord]);

  // Active Session Key (e.g. 'admin-1' or 'klinik-5')
  const [activeSessionKey, setActiveSessionKey] = useState<string>(
    sessionParam || (initialRecord ? `${initialRecord.created_by_role}-${initialRecord.id}` : '')
  );

  // Sync active session key
  useEffect(() => {
    if (sessionParam) {
      setActiveSessionKey(sessionParam);
    } else if (initialRecord) {
      setActiveSessionKey(`${initialRecord.created_by_role}-${initialRecord.id}`);
    } else if (patientHistory.length > 0 && !activeSessionKey) {
      const first = patientHistory[0];
      setActiveSessionKey(`${first.created_by_role}-${first.id}`);
    }
  }, [sessionParam, initialRecord]);

  // Currently Active Session Record
  const activeRecord = useMemo(() => {
    if (!activeSessionKey) return patientHistory[0] || initialRecord;
    const [role, idStr] = activeSessionKey.split('-');
    const targetId = Number(idStr);
    const found = patientHistory.find((r) => r.created_by_role === role && Number(r.id) === targetId);
    return found || patientHistory[0] || initialRecord;
  }, [activeSessionKey, patientHistory, initialRecord]);

  // Chart Metric Selection
  const [chartMetric, setChartMetric] = useState<string>('tensi');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reupload / attach file callback for documents without physical binary data
  const handleModalReupload = async (file: File) => {
    const targetRecord = activeRecord || initialRecord;
    if (!targetRecord) return;
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

    const isLaporan = previewDocModal.title.toLowerCase().includes('laporan');
    const isRujukan = previewDocModal.title.toLowerCase().includes('rujukan');
    const isSakit = previewDocModal.title.toLowerCase().includes('sakit');
    const isTindakLanjut = previewDocModal.title.toLowerCase().includes('tindak lanjut');

    let updatePayload: any = {};
    if (isLaporan) {
      updatePayload = { file_dokumen: dataUrl, nama_dokumen: file.name };
    } else if (isRujukan) {
      updatePayload = {
        file_rujukan: dataUrl,
        nama_rujukan_file: file.name,
        file_surat_rujukan_intervensi: dataUrl,
        nama_surat_rujukan_intervensi: file.name,
      };
    } else if (isSakit) {
      updatePayload = { file_surat_sakit: dataUrl, nama_surat_sakit: file.name };
    } else if (isTindakLanjut) {
      updatePayload = { file_hasil_tindak_lanjut: dataUrl, nama_hasil_tindak_lanjut: file.name };
    }

    await updateMcuRecord(targetRecord.id, updatePayload);
    setPreviewDocModal((prev) => ({ ...prev, url: dataUrl, fileName: file.name }));
  };

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

  const getStatusBadgeStyle = (status?: string) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('sementara') || s.includes('unfit') || s.includes('tidak fit')) {
      return 'bg-rose-600 text-white';
    }
    if (s.includes('catatan') || s.includes('note') || s.includes('dengan catatan')) {
      return 'bg-amber-500 text-slate-900';
    }
    return 'bg-[#005930] text-white';
  };

  const handleUpdateTindakLanjut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;

    try {
      let fileUrl = activeRecord.file_hasil_tindak_lanjut || null;
      let fileName = activeRecord.nama_hasil_tindak_lanjut || null;

      if (fileTindakLanjut) {
        fileName = fileTindakLanjut.name;
        fileUrl = `https://storage.ptpn3.co.id/tindak-lanjut/${Date.now()}_${fileTindakLanjut.name}`;
      }

      await updateMcuRecord(activeRecord.id, {
        butuh_tindak_lanjut: tindakLanjutStatus === 'butuh',
        tindak_lanjut_selesai: tindakLanjutStatus === 'tuntas',
        catatan_intervensi: catatanTindakLanjut || activeRecord.catatan_intervensi,
        file_hasil_tindak_lanjut: fileUrl,
        nama_hasil_tindak_lanjut: fileName,
      });

      alert('Status & berkas tindak lanjut pasien berhasil disimpan!');
    } catch (err: any) {
      alert('Gagal menyimpan tindak lanjut: ' + (err.message || 'Error server'));
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!initialRecord || !activeRecord) {
    return (
      <AppLayout role="admin" active="rekapan">
        <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 p-8 shadow-xs text-center space-y-4 my-8">
          <p className="text-slate-500 font-bold text-sm">Data rekam medis MCU tidak ditemukan.</p>
          <Link
            href="/admin/rekapan-mcu"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#0a5c36] text-white text-xs font-bold rounded-2xl transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Rekapan MCU
          </Link>
        </div>
      </AppLayout>
    );
  }

  // Active session record for the bottom detailed cards
  const rec: any = activeRecord;
  const sessionNama = rec.nama_karyawan || rec.nama_lengkap || 'Karyawan';
  const rawStatus = rec.status_kebugaran || rec.kesimpulan || 'Fit for Duty';

  // LATEST OVERALL PATIENT RECORD (For the Left Column: Profil & Pengukuran Mutakhir)
  const latestRec: any = latestPatientRecord || rec;
  const nama = latestRec.nama_karyawan || latestRec.nama_lengkap || sessionNama;
  const latestStatus = latestRec.status_kebugaran || latestRec.kesimpulan || rawStatus;

  // Resolve Latest Physical Vitals
  const latestVitals = latestRec.vitals || {};
  const tb = latestRec.tinggi_badan ?? latestVitals.tinggi_badan ?? '-';
  const bb = latestRec.berat_badan ?? latestVitals.berat_badan ?? '-';
  const numTb = parseFloat(String(tb).replace(/[^\d.]/g, '')) || 0;
  const numBb = parseFloat(String(bb).replace(/[^\d.]/g, '')) || 0;
  const bmiVal = latestRec.bmi || latestVitals.bmi || (numTb > 0 && numBb > 0 ? Number((numBb / ((numTb / 100) * (numTb / 100))).toFixed(1)) : 22.5);
  const tensi = latestRec.tensi || latestVitals.tensi || (latestVitals.tensi_sistolik && latestVitals.tensi_diastolik ? `${latestVitals.tensi_sistolik}/${latestVitals.tensi_diastolik}` : '-');
  const gulaDarah = latestRec.gula_darah || latestVitals.gula_darah || '-';
  const kolesterol = latestRec.kolesterol || latestVitals.kolesterol || '-';
  const asamUrat = latestRec.asam_urat || latestVitals.asam_urat || '-';
  const suhu = latestRec.suhu || latestVitals.suhu || '36.5';

  const bmiLabel = typeof bmiVal === 'number'
    ? bmiVal < 18.5 ? 'Underweight' : bmiVal <= 24.9 ? 'Normal' : bmiVal <= 29.9 ? 'Overweight' : 'Obesitas'
    : 'Normal';

  const isLatestMandiri = latestRec.created_by_role === 'karyawan' ||
    latestRec.vitals_updated_by_role === 'karyawan' ||
    (latestRec.nama_dokter && latestRec.nama_dokter.toLowerCase().includes('mandiri')) ||
    (latestRec.diagnosa && latestRec.diagnosa.toLowerCase().includes('mandiri')) ||
    (latestRec.nama_rs && latestRec.nama_rs.toLowerCase().includes('mandiri'));

  const latestSourceTag = isLatestMandiri
    ? 'Pemeriksaan Mandiri Karyawan'
    : latestRec.created_by_role === 'klinik'
      ? 'Layanan Inhouse Clinic'
      : 'Medical Check Up (MCU RS)';

  const isMandiri = rec.created_by_role === 'karyawan' ||
    rec.vitals_updated_by_role === 'karyawan' ||
    (rec.nama_dokter && rec.nama_dokter.toLowerCase().includes('mandiri')) ||
    (rec.diagnosa && rec.diagnosa.toLowerCase().includes('mandiri')) ||
    (rec.nama_rs && rec.nama_rs.toLowerCase().includes('mandiri'));

  // Medical Card Items (for Active Session)
  const keluhan = rec.keluhan || rec.keluhan_harian || rec.keluhan_utama || (isMandiri ? 'Pemeriksaan Mandiri' : null);
  const faktorResiko = isMandiri ? 'Pemeriksaan Mandiri' : (rec.faktor_risiko || (rec.penyakit_text && rec.penyakit_text.length > 0 ? rec.penyakit_text : 'Tidak memiliki faktor risiko'));
  const penyakitArray = isMandiri
    ? ['Pemeriksaan Mandiri']
    : Array.isArray(rec.penyakit) && rec.penyakit.length > 0 && rec.penyakit.filter((p: string) => p && p !== 'Tidak memiliki penyakit' && p !== 'Pemeriksaan Mandiri').length > 0
      ? rec.penyakit.filter((p: string) => p && p !== 'Tidak memiliki penyakit' && p !== 'Pemeriksaan Mandiri')
      : Array.isArray(rec.penyakit_list) && rec.penyakit_list.length > 0 && rec.penyakit_list.filter((p: string) => p && p !== 'Tidak memiliki penyakit' && p !== 'Pemeriksaan Mandiri').length > 0
        ? rec.penyakit_list.filter((p: string) => p && p !== 'Tidak memiliki penyakit' && p !== 'Pemeriksaan Mandiri')
        : rec.penyakit_text && rec.penyakit_text !== 'Tidak memiliki penyakit' && rec.penyakit_text !== 'Pemeriksaan Mandiri'
          ? rec.penyakit_text.split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];

  const diagnosa = isMandiri ? 'Pemeriksaan Mandiri' : (rec.diagnosa || rec.diagnosa_klinik || rec.catatan_medis || 'Pemeriksaan Mandiri');
  const tindakLanjut = isMandiri ? 'Pemeriksaan Mandiri' : (rec.tindak_lanjut || rec.tindakan_terapi || rec.anjuran || rec.saran || 'Pemeriksaan kesehatan berkala');

  const dokter = rec.dokter_pemeriksa || rec.dokter || rec.nama_dokter || null;
  const perawat = rec.perawat || rec.nama_perawat || null;

  const rawPoli = rec.nama_poli_rujukan || rec.nama_poli || null;
  const rawRs = rec.rumah_sakit_rujukan || rec.nama_rs || rec.nama_instansi || rec.instansi || null;
  const isPoliInhouse = !rawPoli || ['inhouse clinic', 'rujukan: inhouse clinic', '-', 'null', 'undefined'].includes(rawPoli.toLowerCase().trim());
  const isRsEmpty = !rawRs || ['-', 'null', 'undefined', 'klinik pratama ptpn'].includes(rawRs.toLowerCase().trim());
  const poli = isPoliInhouse ? null : rawPoli;
  const rs = isRsEmpty ? null : rawRs;
  const hasRujukan = Boolean(poli || rs || rec.file_rujukan || rec.file_surat_rujukan_intervensi);

  const jamPemeriksaan = rec.jam_pemeriksaan || rec.jam || (rec.created_at && rec.created_at.length >= 19 ? rec.created_at.slice(11, 19) : '12:50:00');

  const obatArray = Array.isArray(rec.obat)
    ? rec.obat
    : Array.isArray(rec.obat_list)
    ? rec.obat_list
    : rec.obat
    ? [String(rec.obat)]
    : [];

  const intervensiArray = Array.isArray(rec.intervensi)
    ? rec.intervensi
    : typeof rec.intervensi === 'string' && rec.intervensi.length > 0
      ? (rec.intervensi.includes('|') ? rec.intervensi.split(/\s*\|\s*/) : rec.intervensi.includes('\n') ? rec.intervensi.split(/\n+/) : [rec.intervensi]).map((s: string) => s.trim()).filter((s: string) => s && s !== '-' && s.toLowerCase() !== 'null')
      : [];

  const sessionYear = formatMonthYear(rec.tanggal_pemeriksaan);

  return (
    <AppLayout role="admin" active="rekapan">
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-xs space-y-6">
        {/* ==================================================== */}
        {/* TOP HEADER & NAVIGATION                              */}
        {/* ==================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="mb-2">
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                <span>←</span>
                <span>Kembali ke Dashboard Admin</span>
              </Link>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">{nama}</h1>
              <span className={`inline-block px-3.5 py-1 rounded-full text-xs font-bold shadow-xs ${getStatusBadgeStyle(latestStatus)}`}>
                Status Terkini: {latestStatus}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 mt-2 text-xs font-medium text-slate-600">
              <span>
                <strong className="font-bold text-slate-900">Entitas:</strong>{' '}
                <span className="bg-emerald-100 text-[#005930] font-bold px-2 py-0.5 rounded-md text-xs">
                  {latestRec.departemen || latestRec.entitas || 'PTPN 3'}
                </span>
              </span>
              <span>
                <strong className="font-bold text-slate-900">NIK:</strong> {latestRec.nik || '-'}
              </span>
              <span>
                <strong className="font-bold text-slate-900">Divisi:</strong>{' '}
                {latestRec.divisi &&
                  !['PTPN 1', 'PTPN 3', 'PTPN 4', 'ptpn 1', 'ptpn 3', 'ptpn 4', 'PTPN1', 'PTPN3', 'PTPN4', 'Holding', 'SuppCo', 'PalmCo'].includes(
                    latestRec.divisi.trim()
                  ) &&
                  latestRec.divisi.trim() !== '-'
                  ? latestRec.divisi
                  : '-'}
              </span>
              <span>
                <strong className="font-bold text-slate-900">Jabatan:</strong> {latestRec.jabatan || 'Karyawan'}
              </span>
              <span>
                <strong className="font-bold text-slate-900">No. Inhealth:</strong>{' '}
                {latestRec.nomor_inhealth || latestRec.nomor_pegawai || rec.nomor_inhealth || rec.nomor_pegawai || '-'}
              </span>
              <span>
                <strong className="font-bold text-slate-900">No. BPJS:</strong>{' '}
                {latestRec.bpjs || latestRec.nomor_bpjs || rec.bpjs || rec.nomor_bpjs || '-'}
              </span>
              <span>
                <strong className="font-bold text-slate-900">Total Riwayat:</strong>{' '}
                <span className="bg-emerald-100 text-[#005930] font-bold px-2 py-0.5 rounded-md text-xs">
                  {patientHistory.length} Sesi Pemeriksaan
                </span>
              </span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2.5">
            <Link
              href={`/admin/edit-data/${rec.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-lg border border-slate-300 shadow-2xs transition"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Data MCU</span>
            </Link>
          </div>
        </div>

        {/* ==================================================== */}
        {/* SECTION 1: 2-COLUMN SIDE-BY-SIDE (PROFILE & CHARTS) */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT COLUMN (5 Cols): Patient Profile & Physical Measurements (LATEST OVERALL DATA) */}
          <div className="lg:col-span-5 bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#005930]" />
                  <span>Profil &amp; Pengukuran Mutakhir</span>
                </h2>
                <span className="text-[11px] font-bold text-[#005930] bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  {formatDateShort(latestRec.tanggal_pemeriksaan)}
                </span>
              </div>

              {/* Profile Card */}
              <div className="flex items-start gap-4 mb-4">
                {latestRec.foto ? (
                  <img
                    src={latestRec.foto}
                    alt={nama}
                    className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-xs border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#005930] text-white text-lg font-black flex items-center justify-center shrink-0 shadow-xs tracking-wider">
                    {nama.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="space-y-0.5 min-w-0 text-xs text-slate-600 font-medium">
                  <h3 className="text-sm font-extrabold text-slate-950 truncate">{nama}</h3>
                  <p>
                    Entitas: <span className="font-bold text-[#005930]">{latestRec.departemen || latestRec.entitas || 'PTPN 3'}</span>
                  </p>
                  <p>NIK: {latestRec.nik || '-'}</p>
                  <p>
                    Divisi:{' '}
                    {latestRec.divisi &&
                      !['PTPN 1', 'PTPN 3', 'PTPN 4', 'ptpn 1', 'ptpn 3', 'ptpn 4', 'PTPN1', 'PTPN3', 'PTPN4', 'Holding', 'SuppCo', 'PalmCo'].includes(
                        latestRec.divisi.trim()
                      ) &&
                      latestRec.divisi.trim() !== '-'
                      ? latestRec.divisi
                      : '-'}
                  </p>
                  <p>
                    Jabatan: <span className="font-bold text-slate-800">{latestRec.jabatan || 'Karyawan'}</span>
                  </p>
                  <p>No. Inhealth: {latestRec.nomor_inhealth || latestRec.nomor_pegawai || rec.nomor_inhealth || rec.nomor_pegawai || '-'}</p>
                  <p>No. BPJS: {latestRec.bpjs || latestRec.nomor_bpjs || rec.bpjs || rec.nomor_bpjs || '-'}</p>
                  <p>
                    Jenis Kelamin: <span className="font-bold text-slate-800">{latestRec.gender === 'P' || latestRec.jenis_kelamin === 'Perempuan' ? 'Perempuan' : 'Laki-laki'}</span>
                  </p>
                  <p>
                    Sumber Data Terkini: <span className="font-bold text-[#005930]">{latestSourceTag}</span>
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span>Gol. Darah:</span>
                    <span className="font-bold text-[#005930] bg-emerald-100 px-1.5 py-0.2 rounded text-[11px]">
                      {latestRec.golongan_darah || '-'}
                    </span>
                    <span className="ml-2">Umur:</span>
                    <span className="font-extrabold text-slate-900">{latestRec.umur ? `${latestRec.umur} Thn` : '20 Thn'}</span>
                  </div>
                </div>
              </div>

              {/* Last Updated Box */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/70 shadow-2xs mb-3">
                <span className="flex items-center gap-1.5 text-[#005930]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Terakhir Diperbarui:</span>
                </span>
                <span className="text-slate-900 font-extrabold">
                  {formatDate(
                    latestRec.tanggal_pemeriksaan,
                    true,
                    (latestRec as any).jam_pemeriksaan || (latestRec as any).jam_periksa || (latestRec as any).vitals_updated_at || (latestRec as any).created_at
                  )}
                </span>
              </div>

              {/* Physical Measurements Grid */}
              <div className="space-y-1.5 text-xs font-semibold text-slate-800">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-500 font-normal">Tinggi Badan</span>
                  <span className="font-extrabold text-slate-900">{tb !== '-' ? `${tb} cm` : '-'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-500 font-normal">Berat Badan</span>
                  <span className="font-extrabold text-slate-900">{bb !== '-' ? `${bb} kg` : '-'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-500 font-normal">Indeks BMI</span>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span>{bmiVal}</span>
                    <span className="text-[#005930] font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                      ({bmiLabel})
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-500 font-normal">Tensi Darah</span>
                  <span className="font-extrabold text-slate-900">{tensi} mmHg</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-500 font-normal">Gula Darah</span>
                  <span className="font-extrabold text-slate-900">{gulaDarah !== '-' ? (String(gulaDarah).includes('mg') ? gulaDarah : `${gulaDarah} mg/dL`) : '-'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-500 font-normal">Kolesterol</span>
                  <span className="font-extrabold text-slate-900">{kolesterol !== '-' ? (String(kolesterol).includes('mg') ? kolesterol : `${kolesterol} mg/dL`) : '-'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-500 font-normal">Asam Urat</span>
                  <span className="font-extrabold text-slate-900">{asamUrat !== '-' ? (String(asamUrat).includes('mg') ? asamUrat : `${asamUrat} mg/dL`) : '-'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-slate-500 font-normal">Suhu Tubuh</span>
                  <span className="font-extrabold text-slate-900">{suhu ? (String(suhu).includes('°') ? suhu : `${suhu} °C`) : '36.5 °C'}</span>
                </div>
              </div>
            </div>

            {/* Profile PDF Summary Card */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs mt-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#005930] text-white font-black text-[10px] flex items-center justify-center shrink-0">
                  PDF
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#005930] truncate">
                    Ringkasan_Vitals_&amp;Grafik_{nama.replace(/[^A-Za-z0-9]/g, '_')}.pdf
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-700">Informasi Karyawan, Tensi, Vitals &amp; Grafik Angka</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => alert(`Membuka Ringkasan Vitals PDF untuk ${nama}`)}
                  className="px-2.5 py-1 bg-[#005930] hover:bg-[#004726] text-white font-bold text-[11px] rounded-md transition cursor-pointer"
                >
                  Buka
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Mengunduh Ringkasan Vitals PDF untuk ${nama}`)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200 rounded-md transition cursor-pointer"
                >
                  Unduh
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (7 Cols): Dynamic Trend Charts */}
          <div className="lg:col-span-7 flex flex-col">
            <HealthTrendChart patientHistory={patientHistory} defaultMetric="tensi" className="h-full" />
          </div>
        </div>

        {/* ==================================================== */}
        {/* SECTION 2: BOTTOM LONG HORIZONTAL SESSION ACCORDION */}
        {/* ==================================================== */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#005930]" />
              <span>Riwayat Hasil Sesi Pemeriksaan MCU Karyawan</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pilih atau klik sesi MCU di bawah ini untuk melihat detail keluhan, diagnosa, konsul, anjuran, saran, serta dokumen hasil pemeriksaan.
            </p>
          </div>

          {/* Session Selector Scroll Container */}
          <div className="flex items-center gap-3">
            {patientHistory.length > 3 && (
              <button
                type="button"
                onClick={() => scrollSessions('left')}
                className="shrink-0 w-9 h-9 rounded-full bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-[#005930] hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Geser ke Kiri"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}

            <div
              ref={scrollContainerRef}
              className="flex-1 min-w-0 flex overflow-x-auto gap-4 pb-1 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar"
              style={{ scrollbarWidth: 'none' }}
            >
              {patientHistory.map((sRec) => {
                const sKey = `${sRec.created_by_role}-${sRec.id}`;
                const isActive = sKey === activeSessionKey;
                const isMandiri = sRec.created_by_role === 'karyawan' || (sRec.nama_dokter && sRec.nama_dokter.toLowerCase().includes('mandiri')) || (sRec.diagnosa && sRec.diagnosa.toLowerCase().includes('mandiri'));
                const sRoleLabel = isMandiri ? 'Pemeriksaan Mandiri' : (sRec.created_by_role === 'admin' ? 'Admin' : 'Klinik');
                const sTitle = isMandiri
                  ? `Hasil MCU Mandiri ${formatMonthYear(sRec.tanggal_pemeriksaan)}`
                  : `Hasil ${sRec.created_by_role === 'admin' ? 'MCU' : 'Mini MCU'} ${formatMonthYear(sRec.tanggal_pemeriksaan)}`;
                const sDate = formatDate(sRec.tanggal_pemeriksaan);
                const sStatus = sRec.status_kebugaran || sRec.kesimpulan || 'Fit for Duty';

                return (
                  <button
                    key={sKey}
                    type="button"
                    onClick={() => setActiveSessionKey(sKey)}
                    className={`shrink-0 w-full sm:w-[calc(33.3333%-0.67rem)] snap-start text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${isActive
                        ? 'bg-[#005930] border-[#005930] text-white ring-2 ring-emerald-600 shadow-md'
                        : 'bg-white border-slate-200 text-slate-900 hover:border-emerald-500 hover:bg-emerald-50/40 shadow-xs'
                      }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}>{sTitle}</p>
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive
                            ? 'bg-emerald-800 text-emerald-100'
                            : 'bg-slate-100 text-slate-700'
                          }`}
                      >
                        {sRoleLabel}
                      </span>
                      <p className={`text-[11px] flex items-center gap-1 ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                        <Calendar className="w-3 h-3" />
                        <span>Tgl: {sDate}</span>
                      </p>
                    </div>

                    <span
                      className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full ${isActive ? 'bg-white text-[#005930]' : getStatusBadgeStyle(sStatus)
                        }`}
                    >
                      {sStatus}
                    </span>
                  </button>
                );
              })}
            </div>

            {patientHistory.length > 3 && (
              <button
                type="button"
                onClick={() => scrollSessions('right')}
                className="shrink-0 w-9 h-9 rounded-full bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-[#005930] hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Geser ke Kanan"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Detailed Session Display Panel */}
        <div className="space-y-4 pt-1">
          {/* Info Tim Medis Pemeriksa / Instansi Sesuai Jenis Sesi */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#005930] text-white shrink-0 shadow-2xs">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span className="font-black text-slate-900">
                {isMandiri || rec.created_by_role === 'karyawan'
                  ? 'Pemeriksaan Mandiri Karyawan:'
                  : rec.created_by_role === 'admin'
                  ? 'Instansi / Penyelenggara Pemeriksaan MCU:'
                  : 'Petugas Medis Pemeriksa Klinik:'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-800 font-semibold">
              {/* Sesi MCU Admin: Nama Instansi Pemeriksa dan Jam */}
              {rec.created_by_role === 'admin' && !isMandiri && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Instansi Pemeriksa:</span>
                    <span className="font-black text-[#005930] bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      {rec.nama_rs || rs || 'RS Siloam'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Jam:</span>
                    <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs font-mono">
                      {jamPemeriksaan}
                    </span>
                  </div>
                </>
              )}

              {/* Sesi Pemeriksaan Karyawan: Tempat atau Klinik dan Jam */}
              {(isMandiri || rec.created_by_role === 'karyawan') && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Tempat / Klinik:</span>
                    <span className="font-black text-[#005930] bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      {rec.nama_rs || rs || 'Klinik Pratama PTPN'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Jam:</span>
                    <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs font-mono">
                      {jamPemeriksaan}
                    </span>
                  </div>
                </>
              )}

              {/* Sesi Klinik: Dokter Pemeriksa, Perawat / Asisten, dan Jam */}
              {rec.created_by_role === 'klinik' && !isMandiri && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Dokter Pemeriksa:</span>
                    <span className="font-black text-[#005930] bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      {dokter && dokter !== '-' ? dokter : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Perawat / Asisten:</span>
                    <span className="font-black text-[#005930] bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
                      {perawat && perawat !== '-' ? perawat : '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Jam:</span>
                    <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs font-mono">
                      {jamPemeriksaan}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Medical Cards Grid: 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Keluhan / Anamnesa (HANYA UNTUK KLINIK & MANDIRI, ATAU JIKA ADA DATA KELUHAN) */}
            {(rec.created_by_role !== 'admin' || Boolean(keluhan && keluhan !== '-' && keluhan !== 'Tidak memiliki keluhan')) && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs col-span-1 md:col-span-2">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Keluhan / Anamnesa</h3>
                </div>
                <div>{renderBulletList(keluhan, 'Tidak memiliki keluhan')}</div>
              </div>
            )}

            {/* Card 1: Faktor Resiko */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-full bg-[#fbe7e6] text-[#d31d1d] flex items-center justify-center font-bold text-xs shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Faktor Resiko</h3>
              </div>
              <div>{renderBulletList(faktorResiko, 'Tidak memiliki faktor risiko')}</div>
            </div>

            {/* Card 2: Penyakit */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-full bg-[#e6f0fa] text-[#0d5d98] flex items-center justify-center font-bold text-xs shrink-0">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Penyakit</h3>
              </div>
              <div>
                {isMandiri ? (
                  renderBulletList('Pemeriksaan Mandiri', 'Pemeriksaan Mandiri')
                ) : penyakitArray.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {penyakitArray.map((p: string, idx: number) => (
                      <span
                        key={idx}
                        className="bg-[#005930] text-white font-bold px-3 py-1 rounded-lg text-xs shadow-2xs"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                ) : (
                  renderBulletList('Tidak memiliki penyakit', 'Tidak memiliki penyakit')
                )}
              </div>
            </div>

            {/* Card 3: Diagnosa */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-full bg-[#f3e8ff] text-[#7c3aed] flex items-center justify-center font-bold text-xs shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Diagnosa</h3>
              </div>
              <div>{renderBulletList(diagnosa, '- Tidak Ada Catatan Diagnosa -')}</div>
            </div>

            {/* Card 4: Tindak Lanjut */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-7 h-7 rounded-full bg-[#e6f7ed] text-[#005930] flex items-center justify-center font-bold text-xs shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Tindak Lanjut</h3>
              </div>
              <div>{renderBulletList(tindakLanjut, 'Tidak memiliki tindak lanjut')}</div>
            </div>

            {/* Card: Obat Pasien (Jika sesi klinik atau memiliki data obat) */}
            {(rec.created_by_role === 'klinik' || obatArray.length > 0) && !isMandiri && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs col-span-1 md:col-span-2">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#005930] flex items-center justify-center font-bold text-xs shrink-0">
                    <Pill className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Obat Pasien</h3>
                </div>
                {obatArray.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {obatArray.map((med: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold rounded-xl text-xs shadow-2xs"
                      >
                        <span>{med}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 italic">- Tidak Ada Resep Obat Pasien Pada Sesi Ini -</p>
                )}
              </div>
            )}

            {/* Card: Rujukan Rumah Sakit / Spesialis (Sesi klinik atau jika ada rujukan) */}
            {(rec.created_by_role === 'klinik' || hasRujukan) && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs col-span-1 md:col-span-2">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 flex items-center justify-center font-bold text-xs shrink-0">
                    <Hospital className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Rujukan Rumah Sakit / Spesialis</h3>
                </div>
                {hasRujukan ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-800">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-medium block text-[11px]">Nama Poli Rujukan</span>
                      <span className="text-slate-900 font-black text-sm">{poli || '-'}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-medium block text-[11px]">Rumah Sakit / Faskes Tujuan</span>
                      <span className="text-slate-900 font-black text-sm">{rs || '-'}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 italic">- Tidak Ada Rujukan Rumah Sakit / Spesialis -</p>
                )}
              </div>
            )}
          </div>

          {/* Card: Intervensi Layanan Kesehatan */}
          {(() => {
            const kuratifKeys = ['konsultasi lanjutan', 'employee health counseling program', 'ehcp', 'kesegaran'];
            const rehabKeys = ['monitoring hasil tindak lanjut oleh dokter ahli', 'dokter ahli'];
            const hasKuratif = intervensiArray.some((i: string) => kuratifKeys.some((k) => i.toLowerCase().includes(k))) || Boolean(rec.catatan_intervensi_kuratif && String(rec.catatan_intervensi_kuratif).trim());
            const hasRehabilitatif = intervensiArray.some((i: string) => rehabKeys.some((k) => i.toLowerCase().includes(k))) || Boolean(rec.catatan_intervensi_rehabilitatif && String(rec.catatan_intervensi_rehabilitatif).trim());
            const hasIntervensiLanjutan = hasKuratif || hasRehabilitatif || Boolean(rec.butuh_tindak_lanjut && intervensiArray.length > 0);

            return (
              <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-4">
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

                  {hasIntervensiLanjutan && (
                    <div>
                      {rec.tindak_lanjut_selesai ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Tuntas Ditindaklanjuti
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 text-rose-800 font-bold text-xs rounded-full">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Masih Butuh Tindak Lanjut
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Tags Intervensi */}
                {intervensiArray.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {intervensiArray.map((item: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-900 border border-purple-200 font-bold text-xs shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>{item}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-slate-400 italic">Tidak memiliki intervensi</p>
                )}

                {/* Jadwal Pemeriksaan Lanjutan Box - Hanya jika ada jadwal & intervensi kuratif/rehabilitatif */}
                {hasIntervensiLanjutan && rec.tanggal_pemeriksaan_lanjutan && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-lg">
                    <span className="text-[11px] font-bold text-amber-800 block">
                      Jadwal Pemeriksaan Lanjutan ({hasKuratif ? 'Kuratif' : 'Rehabilitatif'})
                    </span>
                    <span className="text-sm font-black text-amber-950 block mt-0.5">
                      {formatDate(rec.tanggal_pemeriksaan_lanjutan)}
                    </span>
                  </div>
                )}

                {rec.catatan_intervensi_kuratif && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Catatan Intervensi Kuratif:
                    </span>
                    <span className="font-semibold text-slate-800 leading-relaxed">
                      {rec.catatan_intervensi_kuratif}
                    </span>
                  </div>
                )}

                {rec.catatan_intervensi_rehabilitatif && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                      Catatan Intervensi Rehabilitatif:
                    </span>
                    <span className="font-semibold text-slate-800 leading-relaxed">
                      {rec.catatan_intervensi_rehabilitatif}
                    </span>
                  </div>
                )}

                {/* Attached Hasil Tindak Lanjut File in Intervensi Box */}
                {(rec.file_hasil_tindak_lanjut || rec.nama_hasil_tindak_lanjut || rec.file_hasil_tindak_lanjut_kuratif) && (
                  <div className="p-3.5 bg-emerald-50/90 border border-emerald-300 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#005930] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        <Paperclip className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[#005930] truncate">
                          {rec.nama_hasil_tindak_lanjut || rec.nama_hasil_tindak_lanjut_kuratif || 'Hasil_Tindak_Lanjut_Pasien.pdf'}
                        </p>
                        <p className="text-[10px] font-bold text-emerald-700">Berkas Lampiran Hasil Tindak Lanjut Medis</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          openDocPreview(
                            'Hasil Tindak Lanjut Pasien',
                            rec.file_hasil_tindak_lanjut || rec.file_hasil_tindak_lanjut_kuratif,
                            rec.nama_hasil_tindak_lanjut || rec.nama_hasil_tindak_lanjut_kuratif || 'Hasil_Tindak_Lanjut.pdf'
                          )
                        }
                        className="px-2.5 py-1 bg-[#005930] hover:bg-[#004726] text-white font-bold text-xs rounded-lg transition shadow-2xs cursor-pointer"
                      >
                        Buka
                      </button>
                      {(rec.file_hasil_tindak_lanjut || rec.file_hasil_tindak_lanjut_kuratif) && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadDocFile(
                              rec.file_hasil_tindak_lanjut || rec.file_hasil_tindak_lanjut_kuratif,
                              rec.nama_hasil_tindak_lanjut || rec.nama_hasil_tindak_lanjut_kuratif || 'Hasil_Tindak_Lanjut.pdf'
                            )
                          }
                          className="p-1.5 text-[#005930] hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                          title="Unduh Berkas"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-Card: Status Tindak Lanjut Pasien */}
                {hasIntervensiLanjutan && rec.tindak_lanjut_selesai ? (
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#005930] flex items-center justify-center font-bold shrink-0">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-900">Program Intervensi Telah Tuntas Ditindaklanjuti</p>
                        <p className="text-[11px] font-medium text-slate-600">
                          Evaluasi dan tindak lanjut medis pasien pada sesi ini telah selesai dan diverifikasi tuntas.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : hasIntervensiLanjutan ? (
                  <form onSubmit={handleUpdateTindakLanjut} className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                      <CheckCircle className="w-4 h-4 text-[#005930]" />
                      <span>Perbarui Status Tindak Lanjut Pasien</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Radio status */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                          Status Kebutuhan Tindak Lanjut
                        </span>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 cursor-pointer font-semibold text-slate-700">
                            <input
                              type="radio"
                              name="status_kebutuhan"
                              value="butuh"
                              checked={tindakLanjutStatus === 'butuh'}
                              onChange={() => setTindakLanjutStatus('butuh')}
                              className="accent-[#005930]"
                            />
                            <span>Ya (Butuh)</span>
                          </label>
                          <label className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-slate-200 cursor-pointer font-semibold text-slate-700">
                            <input
                              type="radio"
                              name="status_kebutuhan"
                              value="tuntas"
                              checked={tindakLanjutStatus === 'tuntas'}
                              onChange={() => setTindakLanjutStatus('tuntas')}
                              className="accent-[#005930]"
                            />
                            <span>Tidak (Tuntas)</span>
                          </label>
                        </div>
                      </div>

                      {/* File Upload */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                          Unggah Hasil Tindak Lanjut Baru (.pdf / .jpg / .png)
                        </span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setFileTindakLanjut(e.target.files?.[0] || null)}
                          className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Catatan Tambahan */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">
                        Catatan Tambahan
                      </span>
                      <textarea
                        rows={2}
                        value={catatanTindakLanjut}
                        onChange={(e) => setCatatanTindakLanjut(e.target.value)}
                        placeholder="Catatan hasil tindak lanjut..."
                        className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-600"
                      ></textarea>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        className="px-4 py-2 bg-[#005930] hover:bg-[#004726] text-white font-bold text-xs rounded-xl transition shadow-xs cursor-pointer"
                      >
                        Simpan Status &amp; Unggahan
                      </button>
                    </div>
                  </form>
                ) : null}
              </div>
            );
          })()}

          {/* Card: Dokumen & Berkas Hasil MCU */}
          {(() => {
            const isRealDoc = (val: unknown): boolean =>
              typeof val === 'string' &&
              val.trim() !== '' &&
              val !== '-' &&
              val !== 'null' &&
              val !== 'undefined' &&
              (val.startsWith('data:') ||
               val.startsWith('http://') ||
               val.startsWith('https://') ||
               val.startsWith('blob:') ||
               val.startsWith('/'));

            const hasDocLaporan = isRealDoc(rec.file_dokumen);
            const hasDocTindakLanjut = isRealDoc(rec.file_hasil_tindak_lanjut) || isRealDoc(rec.file_hasil_tindak_lanjut_kuratif);
            const hasDocRujukan = isRealDoc(rec.file_rujukan) || isRealDoc(rec.file_surat_rujukan_intervensi);
            const hasDocSuratSakit = isRealDoc(rec.file_surat_sakit);
            const hasAnyUploadedDoc = hasDocLaporan || hasDocTindakLanjut || hasDocRujukan || hasDocSuratSakit;

            return (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                  <div className="p-2.5 rounded-xl bg-[#005930] text-white shrink-0 shadow-2xs">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Dokumen &amp; Berkas Lampiran Hasil {rec.created_by_role === 'klinik' ? `Mini MCU ${formatMonthYear(rec.tanggal_pemeriksaan)}` : isMandiri || rec.created_by_role === 'karyawan' ? `Pemeriksaan Mandiri ${formatMonthYear(rec.tanggal_pemeriksaan)}` : `MCU ${formatMonthYear(rec.tanggal_pemeriksaan)}`}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Berkas lampiran resmi yang diunggah (Laporan Hasil MCU, Surat Rujukan, Surat Sakit, dan Bukti Tindak Lanjut)
                    </p>
                  </div>
                </div>

                {hasAnyUploadedDoc ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {/* 1. Laporan Hasil MCU */}
                    {hasDocLaporan && (() => {
                      const docName = rec.nama_dokumen || (typeof rec.file_dokumen === 'string' && !rec.file_dokumen.startsWith('data:') ? rec.file_dokumen : `Laporan_MCU_${nama.replace(/[^A-Za-z0-9]/g, '_')}.pdf`);
                      const lower = docName.toLowerCase();
                      const isXls = lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.csv') || (typeof rec.file_dokumen === 'string' && rec.file_dokumen.startsWith('data:application/vnd'));
                      const isImg = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || (typeof rec.file_dokumen === 'string' && rec.file_dokumen.startsWith('data:image/'));
                      const isDoc = lower.endsWith('.docx') || lower.endsWith('.doc');
                      const badgeText = isXls ? 'XLS' : isImg ? 'IMG' : isDoc ? 'DOC' : 'PDF';
                      const badgeStyle = isXls
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : isImg
                          ? 'bg-sky-50 border-sky-200 text-sky-700'
                          : isDoc
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-rose-50 border-rose-200 text-rose-600';
                      const btnStyle = isXls
                        ? 'bg-emerald-700 hover:bg-emerald-800'
                        : isImg
                          ? 'bg-sky-700 hover:bg-sky-800'
                          : isDoc
                            ? 'bg-blue-700 hover:bg-blue-800'
                            : 'bg-[#c0392b] hover:bg-[#b02a2b]';

                      return (
                        <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-9 h-9 rounded-lg border font-black text-xs flex items-center justify-center shrink-0 ${badgeStyle}`}>
                              {badgeText}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {docName}
                              </p>
                              <p className="text-[10px] font-medium text-slate-500">
                                {isXls ? 'Spreadsheet Rekapan MCU' : isImg ? 'Gambar Hasil Scan MCU' : 'Laporan Rekapan MCU'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                openDocPreview(
                                  'Laporan Hasil MCU',
                                  rec.file_dokumen,
                                  docName
                                )
                              }
                              className={`px-2.5 py-1.5 ${btnStyle} text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer`}
                            >
                              Buka
                            </button>
                            {rec.file_dokumen && (
                              <button
                                type="button"
                                onClick={() =>
                                  downloadDocFile(
                                    rec.file_dokumen,
                                    docName
                                  )
                                }
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Unduh Berkas"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Berkas Hasil Tindak Lanjut Pasien */}
                    {hasDocTindakLanjut && (
                      <div className="p-3.5 bg-emerald-50/90 border-2 border-emerald-300 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-[#005930] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            TDL
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-emerald-950 truncate">
                              {rec.nama_hasil_tindak_lanjut || rec.nama_hasil_tindak_lanjut_kuratif || `Hasil_Tindak_Lanjut_${nama}.pdf`}
                            </p>
                            <p className="text-[10px] font-bold text-emerald-700">Hasil Tindak Lanjut Medis</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              openDocPreview(
                                'Hasil Tindak Lanjut Pasien',
                                rec.file_hasil_tindak_lanjut || rec.file_hasil_tindak_lanjut_kuratif,
                                rec.nama_hasil_tindak_lanjut || rec.nama_hasil_tindak_lanjut_kuratif || `Hasil_Tindak_Lanjut_${nama}.pdf`
                              )
                            }
                            className="px-2.5 py-1.5 bg-[#005930] hover:bg-[#004726] text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                          >
                            Buka
                          </button>
                          {(rec.file_hasil_tindak_lanjut || rec.file_hasil_tindak_lanjut_kuratif) && (
                            <button
                              type="button"
                              onClick={() =>
                                downloadDocFile(
                                  rec.file_hasil_tindak_lanjut || rec.file_hasil_tindak_lanjut_kuratif,
                                  rec.nama_hasil_tindak_lanjut || rec.nama_hasil_tindak_lanjut_kuratif || `Hasil_Tindak_Lanjut_${nama}.pdf`
                                )
                              }
                              className="p-1.5 text-emerald-800 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
                              title="Unduh Berkas"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 3. Surat Rujukan */}
                    {hasDocRujukan && (() => {
                      const docName = rec.nama_rujukan_file || rec.nama_surat_rujukan_intervensi || (typeof rec.file_rujukan === 'string' && !rec.file_rujukan.startsWith('data:') ? rec.file_rujukan : `Surat_Rujukan_${nama}.pdf`);
                      const lower = docName.toLowerCase();
                      const isImg = lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp') || (typeof rec.file_rujukan === 'string' && rec.file_rujukan.startsWith('data:image/'));

                      return (
                        <div className="p-3.5 bg-sky-50/90 border-2 border-sky-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-sky-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                              RUJ
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-sky-950 truncate">
                                {docName}
                              </p>
                              <p className="text-[10px] font-bold text-sky-700">
                                {isImg ? 'Surat Rujukan (Foto / Scan)' : 'Surat Rujukan Medis RS'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                openDocPreview(
                                  'Surat Rujukan Pasien',
                                  rec.file_rujukan || rec.file_surat_rujukan_intervensi,
                                  docName
                                )
                              }
                              className="px-2.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                            >
                              Buka
                            </button>
                            {(rec.file_rujukan || rec.file_surat_rujukan_intervensi) && (
                              <button
                                type="button"
                                onClick={() =>
                                  downloadDocFile(
                                    rec.file_rujukan || rec.file_surat_rujukan_intervensi,
                                    docName
                                  )
                                }
                                className="p-1.5 text-sky-800 hover:bg-sky-100 rounded-lg transition cursor-pointer"
                                title="Unduh Berkas"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 4. Surat Sakit */}
                    {hasDocSuratSakit && (
                      <div className="p-3.5 bg-rose-50/90 border-2 border-rose-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-rose-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                            SKT
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-rose-950 truncate">
                              {rec.nama_surat_sakit || `Surat_Sakit_${nama}.pdf`}
                            </p>
                            <p className="text-[10px] font-bold text-rose-700">Surat Keterangan Sakit</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              openDocPreview(
                                'Surat Keterangan Sakit',
                                rec.file_surat_sakit,
                                rec.nama_surat_sakit || `Surat_Sakit_${nama}.pdf`
                              )
                            }
                            className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg transition shadow-xs cursor-pointer"
                          >
                            Buka
                          </button>
                          {rec.file_surat_sakit && (
                            <button
                              type="button"
                              onClick={() =>
                                downloadDocFile(
                                  rec.file_surat_sakit,
                                  rec.nama_surat_sakit || `Surat_Sakit_${nama}.pdf`
                                )
                              }
                              className="p-1.5 text-rose-800 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                              title="Unduh Berkas"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 bg-white border border-dashed border-slate-200 rounded-xl text-center">
                    <p className="text-xs font-semibold text-slate-400 italic">
                      - Tidak ada berkas atau dokumen yang diunggah untuk sesi pemeriksaan ini -
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* ==================================================== */}
        {/* DOCUMENT PREVIEW MODAL (UNIVERSAL PDF, IMAGE, EXCEL) */}
        {/* ==================================================== */}
        <DocumentPreviewModal
          open={previewDocModal.open}
          onClose={() => setPreviewDocModal({ open: false, title: '', url: null, fileName: '' })}
          title={previewDocModal.title}
          url={previewDocModal.url}
          fileName={previewDocModal.fileName}
          onReupload={handleModalReupload}
        />
      </div>
    </AppLayout>
  );
}

export default function AdminDetailMcuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#f4f8f5] flex items-center justify-center">
          <p className="text-sm font-bold text-slate-600">Memuat detail rekam medis MCU...</p>
        </div>
      }
    >
      <AdminDetailMcuContent />
    </Suspense>
  );
}
