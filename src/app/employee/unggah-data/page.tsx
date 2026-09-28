'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useMcu } from '@/context/McuContext';
import { uploadMedicalFile } from '@/lib/upload';
import { getWIBTime, getWIBDate } from '@/lib/dateUtils';
import { getRecordTimestamp } from '@/services/mcuService';
import { DocumentPreviewModal } from '@/components/common/DocumentPreviewModal';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Activity,
  ShieldCheck,
  CloudUpload,
  Building2,
  FileSpreadsheet,
  X,
  FilePlus,
  Clock,
  Eye,
} from 'lucide-react';

function EmployeeUnggahDataContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { addMcuRecord, mcuRecords, miniMcuRecords } = useMcu();

  // Find latest record for pre-filling vitals if available (from Karyawan, Klinik, or Admin)
  const latestUserRec = useMemo(() => {
    const combined = [...mcuRecords, ...miniMcuRecords].filter((r) => {
      const uNik = (user?.nik || '').trim().toLowerCase();
      const uName = (user?.name || '').trim().toLowerCase();
      const rNik = (r.nik || '').trim().toLowerCase();
      const rName = (r.nama_lengkap || (r as any).nama_karyawan || '').trim().toLowerCase();
      if (uNik && rNik && rNik === uNik) return true;
      if (uName && rName && (rName === uName || rName.includes(uName) || uName.includes(rName))) return true;
      return false;
    });

    return combined.sort((a, b) => {
      const timeA = getRecordTimestamp(a);
      const timeB = getRecordTimestamp(b);
      if (timeA !== timeB) return timeB - timeA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    })[0];
  }, [mcuRecords, miniMcuRecords, user]);

  const [formData, setFormData] = useState({
    nama_lengkap: user?.name || latestUserRec?.nama_lengkap || '',
    nik: user?.nik || latestUserRec?.nik || '',
    divisi: user?.divisi || latestUserRec?.divisi || 'DPDU',
    jabatan: latestUserRec?.jabatan || 'Magang',
    golongan_darah: latestUserRec?.golongan_darah || 'O+',
    umur: String(latestUserRec?.umur || 20),
    jenis_kelamin: latestUserRec?.jenis_kelamin || latestUserRec?.gender || 'Laki-laki',
    nomor_inhealth: latestUserRec?.nomor_inhealth || '',
    nomor_bpjs: latestUserRec?.nomor_bpjs || latestUserRec?.bpjs || '',
    tanggal_pemeriksaan: getWIBDate(),
    jam_pemeriksaan: getWIBTime(),
    nama_rs: latestUserRec?.nama_rs || latestUserRec?.nama_klinik || 'Klinik Pratama PTPN',
    tinggi_badan: String(latestUserRec?.tinggi_badan || (latestUserRec?.vitals as any)?.tinggi_badan || '156'),
    berat_badan: String(latestUserRec?.berat_badan || (latestUserRec?.vitals as any)?.berat_badan || '44'),
    tensi: latestUserRec?.tensi || (latestUserRec?.vitals as any)?.tensi || '110/80',
    gula_darah: String(latestUserRec?.gula_darah || (latestUserRec?.vitals as any)?.gula_darah || '108'),
    kolesterol: String(latestUserRec?.kolesterol || (latestUserRec?.vitals as any)?.kolesterol || '190'),
    asam_urat: String(latestUserRec?.asam_urat || (latestUserRec?.vitals as any)?.asam_urat || '5.5'),
    suhu: String(latestUserRec?.suhu || (latestUserRec?.vitals as any)?.suhu || '36.5'),
    nama_rs_rujukan: '',
    nama_poli_rujukan: '',
    keluhan: '',
  });

  const [isLiveClock, setIsLiveClock] = useState(true);

  // Live Clock effect
  useEffect(() => {
    if (!isLiveClock) return;
    const interval = setInterval(() => {
      setFormData((prev) => ({
        ...prev,
        jam_pemeriksaan: getWIBTime(),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [isLiveClock]);

  // Sync formData when user or latestUserRec is available
  useEffect(() => {
    if (user || latestUserRec) {
      setFormData((prev) => ({
        ...prev,
        nama_lengkap: user?.name || latestUserRec?.nama_lengkap || prev.nama_lengkap,
        nik: user?.nik || latestUserRec?.nik || prev.nik,
        divisi: user?.divisi || latestUserRec?.divisi || prev.divisi,
        jabatan: latestUserRec?.jabatan || prev.jabatan,
        golongan_darah: latestUserRec?.golongan_darah || prev.golongan_darah,
        umur: latestUserRec?.umur ? String(latestUserRec.umur) : prev.umur,
        jenis_kelamin: latestUserRec?.jenis_kelamin || latestUserRec?.gender || prev.jenis_kelamin,
        nomor_inhealth: latestUserRec?.nomor_inhealth || prev.nomor_inhealth,
        nomor_bpjs: latestUserRec?.nomor_bpjs || latestUserRec?.bpjs || prev.nomor_bpjs,
        nama_rs: prev.nama_rs || latestUserRec?.nama_rs || latestUserRec?.nama_klinik || 'Klinik Pratama PTPN',
        tinggi_badan: latestUserRec?.tinggi_badan ? String(latestUserRec.tinggi_badan) : ((latestUserRec?.vitals as any)?.tinggi_badan ? String((latestUserRec?.vitals as any).tinggi_badan) : prev.tinggi_badan),
        berat_badan: latestUserRec?.berat_badan ? String(latestUserRec.berat_badan) : ((latestUserRec?.vitals as any)?.berat_badan ? String((latestUserRec?.vitals as any).berat_badan) : prev.berat_badan),
        tensi: latestUserRec?.tensi || (latestUserRec?.vitals as any)?.tensi || prev.tensi,
        gula_darah: latestUserRec?.gula_darah ? String(latestUserRec.gula_darah) : ((latestUserRec?.vitals as any)?.gula_darah ? String((latestUserRec?.vitals as any).gula_darah) : prev.gula_darah),
        kolesterol: latestUserRec?.kolesterol ? String(latestUserRec.kolesterol) : ((latestUserRec?.vitals as any)?.kolesterol ? String((latestUserRec?.vitals as any).kolesterol) : prev.kolesterol),
        asam_urat: latestUserRec?.asam_urat ? String(latestUserRec.asam_urat) : ((latestUserRec?.vitals as any)?.asam_urat ? String((latestUserRec?.vitals as any).asam_urat) : prev.asam_urat),
        suhu: latestUserRec?.suhu ? String(latestUserRec.suhu) : ((latestUserRec?.vitals as any)?.suhu ? String((latestUserRec?.vitals as any).suhu) : prev.suhu),
      }));
    }
  }, [user, latestUserRec]);

  // BMI Real-time calculation
  const tinggiM = (parseFloat(formData.tinggi_badan) || 0) / 100;
  const beratKg = parseFloat(formData.berat_badan) || 0;
  const bmiVal = tinggiM > 0 && beratKg > 0 ? Number((beratKg / (tinggiM * tinggiM)).toFixed(1)) : 0;

  const getBmiDetails = (bmi: number) => {
    if (bmi <= 0) return { label: 'Belum Terhitung', color: 'bg-slate-100 text-slate-700 border-slate-300' };
    if (bmi < 18.5) return { label: 'Underweight', color: 'bg-sky-100 text-sky-800 border-sky-300' };
    if (bmi <= 24.9) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (bmi <= 26.9) return { label: 'Overweight', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'Obesitas', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  };
  const bmiDetails = getBmiDetails(bmiVal);

  // File Upload states (Optional files)
  const [fileMcu, setFileMcu] = useState<File | null>(null);
  const [fileMcuDataUrl, setFileMcuDataUrl] = useState<string | null>(null);

  const [fileRujukan, setFileRujukan] = useState<File | null>(null);
  const [fileRujukanDataUrl, setFileRujukanDataUrl] = useState<string | null>(null);

  const [fileSuratSakit, setFileSuratSakit] = useState<File | null>(null);
  const [fileSuratSakitDataUrl, setFileSuratSakitDataUrl] = useState<string | null>(null);

  // Preview Modal state
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    fileUrl: string | null;
    fileName: string;
  }>({
    isOpen: false,
    fileUrl: null,
    fileName: '',
  });

  const handleSelectFile = (
    file: File | null,
    setFile: (f: File | null) => void,
    setDataUrl: (u: string | null) => void
  ) => {
    setFile(file);
    if (!file) {
      setDataUrl(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      let urlMcu: string | null = null;
      let nameMcu: string | null = null;
      if (fileMcu) {
        nameMcu = fileMcu.name;
        try {
          const uploadRes = await uploadMedicalFile(fileMcu, 'dokumen');
          urlMcu = uploadRes?.publicUrl || fileMcuDataUrl;
        } catch {
          urlMcu = fileMcuDataUrl;
        }
      }

      let urlRujukan: string | null = null;
      let nameRujukan: string | null = null;
      if (fileRujukan) {
        nameRujukan = fileRujukan.name;
        try {
          const uploadRes = await uploadMedicalFile(fileRujukan, 'rujukan');
          urlRujukan = uploadRes?.publicUrl || fileRujukanDataUrl;
        } catch {
          urlRujukan = fileRujukanDataUrl;
        }
      }

      let urlSuratSakit: string | null = null;
      let nameSuratSakit: string | null = null;
      if (fileSuratSakit) {
        nameSuratSakit = fileSuratSakit.name;
        try {
          const uploadRes = await uploadMedicalFile(fileSuratSakit, 'surat-sakit');
          urlSuratSakit = uploadRes?.publicUrl || fileSuratSakitDataUrl;
        } catch {
          urlSuratSakit = fileSuratSakitDataUrl;
        }
      }

      const hasSuratSakit = Boolean(urlSuratSakit || fileSuratSakit);
      const hasRujukan = Boolean(urlRujukan || fileRujukan);

      // Status kebugaran ditentukan dari surat/tindak lanjut
      const statusKebugaran = hasSuratSakit
        ? 'Sementara Tidak Fit'
        : hasRujukan
        ? 'Fit dengan Catatan'
        : 'Fit for Duty';

      const kesimpulanKey = hasSuratSakit
        ? 'sementara_tidak_fit'
        : hasRujukan
        ? 'fit_dengan_catatan'
        : 'fit';

      const butuhTindakLanjut = hasSuratSakit || hasRujukan;

      const tensiParts = (formData.tensi || '120/80').split('/');
      const sis = parseInt(tensiParts[0], 10) || 120;
      const dia = parseInt(tensiParts[1], 10) || 80;

      await addMcuRecord({
        user_id: user?.id ? Number(user.id) : undefined,
        nama_lengkap: formData.nama_lengkap || user?.name || 'Karyawan',
        nik: formData.nik || user?.nik || 'EMP-2026',
        departemen: 'PTPN 3',
        kategori_peserta: 'karyawan',
        divisi: formData.divisi,
        jabatan: formData.jabatan,
        nomor_inhealth: formData.nomor_inhealth || latestUserRec?.nomor_inhealth || null,
        nomor_bpjs: formData.nomor_bpjs || latestUserRec?.nomor_bpjs || null,
        jenis_kelamin: formData.jenis_kelamin || latestUserRec?.jenis_kelamin || 'Laki-laki',
        nama_dokter: null,
        nama_perawat: null,
        umur: Number(formData.umur) || latestUserRec?.umur || 20,
        tanggal_pemeriksaan: formData.tanggal_pemeriksaan,
        jam_pemeriksaan: formData.jam_pemeriksaan || getWIBTime(),
        foto: latestUserRec?.foto || null,
        file_dokumen: urlMcu || null,
        nama_dokumen: urlMcu ? (nameMcu || 'Laporan_MCU_Karyawan.pdf') : null,
        file_rujukan: urlRujukan || null,
        nama_rujukan_file: nameRujukan || null,
        file_surat_sakit: urlSuratSakit || null,
        nama_surat_sakit: nameSuratSakit || null,
        nama_poli: hasRujukan ? (formData.nama_poli_rujukan.trim() || 'Poli Rujukan / Spesialis') : null,
        nama_rs: (hasRujukan && formData.nama_rs_rujukan.trim()) ? formData.nama_rs_rujukan.trim() : (formData.nama_rs.trim() || 'Klinik Pratama PTPN'),
        nama_klinik: (hasRujukan && formData.nama_rs_rujukan.trim()) ? formData.nama_rs_rujukan.trim() : (formData.nama_rs.trim() || 'Klinik Pratama PTPN'),
        golongan_darah: formData.golongan_darah || latestUserRec?.golongan_darah || 'O+',
        tinggi_badan: parseFloat(formData.tinggi_badan) || 170,
        berat_badan: parseFloat(formData.berat_badan) || 65,
        bmi: bmiVal > 0 ? bmiVal : 22.5,
        vitals: {
          tensi: formData.tensi,
          tensi_sistolik: sis,
          tensi_diastolik: dia,
          gula_darah: parseFloat(formData.gula_darah) || 100,
          kolesterol: parseFloat(formData.kolesterol) || 180,
          asam_urat: parseFloat(formData.asam_urat) || 5.5,
          suhu: parseFloat(formData.suhu) || 36.5,
          tinggi_badan: parseFloat(formData.tinggi_badan) || 170,
          berat_badan: parseFloat(formData.berat_badan) || 65,
          bmi: bmiVal > 0 ? bmiVal : 22.5,
          bmi_label: bmiDetails.label,
        },
        tensi: formData.tensi,
        gula_darah: formData.gula_darah,
        kolesterol: formData.kolesterol,
        asam_urat: formData.asam_urat,
        suhu: formData.suhu,
        vitals_updated_at: new Date().toISOString(),
        vitals_updated_by_role: 'karyawan',
        penyakit: [],
        obat: [],
        keluhan: formData.keluhan || 'Pemeriksaan Mandiri',
        faktor_risiko: 'Pemeriksaan Mandiri',
        penyakit_text: 'Pemeriksaan Mandiri',
        diagnosa: 'Pemeriksaan Mandiri',
        konsultasi: 'Pemeriksaan Mandiri',
        saran: 'Pemeriksaan Mandiri',
        anjuran: hasSuratSakit ? 'Istirahat sesuai anjuran dokter' : 'Pemeriksaan Mandiri',
        kesimpulan: kesimpulanKey,
        status_kebugaran: statusKebugaran,
        intervensi: [],
        tanggal_pemeriksaan_lanjutan: null,
        file_surat_rujukan_intervensi: urlRujukan || null,
        nama_surat_rujukan_intervensi: nameRujukan || null,
        catatan_intervensi: formData.keluhan || null,
        butuh_tindak_lanjut: butuhTindakLanjut,
        tindak_lanjut_selesai: false,
        created_by_role: 'karyawan',
      });

      setSuccess(true);
      setTimeout(() => {
        router.push('/employee/dashboard');
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Portal Entri Data Kesehatan Karyawan
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Formulir pencatatan hasil pemeriksaan fisik, tanda vital mandiri, dan berkas surat kesehatan
          </p>
        </div>
        <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-extrabold text-xs flex items-center gap-2 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Karyawan PTPN 3</span>
        </div>
      </div>

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-950 font-bold text-sm shadow-xs animate-in fade-in">
          <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>Data kesehatan berhasil disimpan! Mengarahkan ke Dashboard Karyawan...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-center gap-3 text-rose-950 font-bold text-sm shadow-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Card 1: Data Identitas Karyawan & Pemeriksaan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">1. Data Peserta &amp; Pemeriksaan</h2>
              <p className="text-xs text-slate-500 font-medium">Informasi identitas dan tanggal pelaksanaan pemeriksaan</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap Karyawan</label>
              <input
                type="text"
                required
                value={formData.nama_lengkap}
                onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Induk Karyawan (NIK)</label>
              <input
                type="text"
                required
                value={formData.nik}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Divisi / Unit Kerja</label>
              <input
                type="text"
                required
                value={formData.divisi}
                onChange={(e) => setFormData({ ...formData, divisi: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan</label>
              <input
                type="text"
                value={formData.jabatan}
                onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Golongan Darah</label>
              <select
                value={formData.golongan_darah}
                onChange={(e) => setFormData({ ...formData, golongan_darah: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white cursor-pointer"
              >
                {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Umur (Tahun)</label>
              <input
                type="number"
                value={formData.umur}
                onChange={(e) => setFormData({ ...formData, umur: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Kelamin</label>
              <select
                value={formData.jenis_kelamin}
                onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value as any })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white cursor-pointer"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor BPJS Kesehatan (Hanya Angka)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Contoh: 000123456789"
                value={formData.nomor_bpjs}
                onChange={(e) => setFormData({ ...formData, nomor_bpjs: e.target.value.replace(/\D/g, '') })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Inhealth (Hanya Angka)</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Contoh: 12345678"
                value={formData.nomor_inhealth}
                onChange={(e) => setFormData({ ...formData, nomor_inhealth: e.target.value.replace(/\D/g, '') })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal Pemeriksaan Medis</label>
              <input
                type="date"
                required
                value={formData.tanggal_pemeriksaan}
                onChange={(e) => setFormData({ ...formData, tanggal_pemeriksaan: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            {/* Jam Pemeriksaan (Live Clock) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Waktu / Jam Pemeriksaan
                </label>
                <div className="flex items-center gap-1.5">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isLiveClock ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isLiveClock ? 'bg-emerald-600' : 'bg-slate-400'}`} />
                    {isLiveClock ? 'LIVE (WIB)' : 'Manual'}
                  </span>
                  {!isLiveClock && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsLiveClock(true);
                        setFormData((prev) => ({ ...prev, jam_pemeriksaan: getWIBTime() }));
                      }}
                      className="text-[10px] text-emerald-700 hover:underline font-bold cursor-pointer"
                    >
                      Aktifkan Live
                    </button>
                  )}
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Contoh: 16:55:00 WIB"
                  value={formData.jam_pemeriksaan}
                  onChange={(e) => {
                    setIsLiveClock(false);
                    setFormData({ ...formData, jam_pemeriksaan: e.target.value });
                  }}
                  className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-800 outline-none focus:border-emerald-700 focus:bg-white pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Nama Rumah Sakit / Klinik / Lab Pelaksana */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Rumah Sakit / Klinik / Laboratorium Pelaksana
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Contoh: Klinik Pratama PTPN / RS Siloam / Lab Prodia"
                  value={formData.nama_rs}
                  onChange={(e) => setFormData({ ...formData, nama_rs: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Pengukuran Fisik & Vitals */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">2. Pengukuran Fisik &amp; Tanda Vital</h2>
              <p className="text-xs text-slate-500 font-medium">Input hasil pengukuran fisik, tekanan darah, dan laboratorium mandiri</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tinggi Badan (cm)</label>
              <input
                type="number"
                placeholder="Contoh: 170"
                value={formData.tinggi_badan}
                onChange={(e) => setFormData({ ...formData, tinggi_badan: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Berat Badan (kg)</label>
              <input
                type="number"
                placeholder="Contoh: 65"
                value={formData.berat_badan}
                onChange={(e) => setFormData({ ...formData, berat_badan: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Tensi Darah (mmHg)</label>
              <input
                type="text"
                placeholder="Contoh: 120/80"
                value={formData.tensi}
                onChange={(e) => setFormData({ ...formData, tensi: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Gula Darah (mg/dL)</label>
              <input
                type="text"
                placeholder="Contoh: 100"
                value={formData.gula_darah}
                onChange={(e) => setFormData({ ...formData, gula_darah: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Kolesterol (mg/dL)</label>
              <input
                type="text"
                placeholder="Contoh: 180"
                value={formData.kolesterol}
                onChange={(e) => setFormData({ ...formData, kolesterol: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Asam Urat (mg/dL)</label>
              <input
                type="text"
                placeholder="Contoh: 5.5"
                value={formData.asam_urat}
                onChange={(e) => setFormData({ ...formData, asam_urat: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Suhu Tubuh (°C)</label>
              <input
                type="text"
                placeholder="Contoh: 36.5"
                value={formData.suhu}
                onChange={(e) => setFormData({ ...formData, suhu: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 outline-none focus:border-emerald-700 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Indeks BMI Otomatis</label>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-xs font-black text-slate-900">{bmiVal > 0 ? `${bmiVal} kg/m²` : '-'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${bmiDetails.color}`}>
                  {bmiDetails.label}
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Keluhan Kesehatan / Catatan Pemeriksaan (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Tuliskan keluhan yang dirasakan atau keterangan tambahan hasil pemeriksaan..."
              value={formData.keluhan}
              onChange={(e) => setFormData({ ...formData, keluhan: e.target.value })}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-emerald-700 focus:bg-white"
            />
          </div>
        </div>

        {/* Card 3: Berkas Dokumen & Surat-Surat (Opsional / Fleksibel) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">3. Berkas Dokumen &amp; Surat Kesehatan (Opsional)</h2>
              <p className="text-xs text-slate-500 font-medium">
                Unggah berkas jika ada. Jika tidak ada surat yang diunggah, data akan tersimpan sebagai pengukuran fisik &amp; tanda vital.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Slot 1: Berkas Hasil MCU / Lab */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-900">Berkas Hasil MCU / Lab</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Laporan resmi hasil tes laboratorium atau medical check-up mandiri
                </p>
              </div>

              {fileMcu ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-emerald-950 truncate">{fileMcu.name}</p>
                    <p className="text-[10px] text-emerald-700 font-medium">{(fileMcu.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {fileMcuDataUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewModal({ isOpen: true, fileUrl: fileMcuDataUrl, fileName: fileMcu.name })}
                        className="px-2.5 py-1 bg-emerald-800 text-white rounded-lg text-[10px] font-bold hover:bg-emerald-900 transition flex items-center gap-1 cursor-pointer"
                        title="Buka Berkas"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Buka</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFileMcu(null);
                        setFileMcuDataUrl(null);
                      }}
                      className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                      title="Hapus berkas"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-emerald-600 rounded-xl p-4 text-center bg-white hover:bg-emerald-50/30 transition cursor-pointer block">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
                    onChange={(e) => handleSelectFile(e.target.files?.[0] || null, setFileMcu, setFileMcuDataUrl)}
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700 block">Pilih Berkas MCU</span>
                  <span className="text-[10px] text-slate-400 block">PDF / Excel / PNG / JPG</span>
                </label>
              )}
            </div>

            {/* Slot 2: Surat Rujukan Medis */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-sky-100 text-sky-800">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-900">Surat Rujukan Dokter / RS</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Surat rujukan ke spesialis atau rumah sakit rujukan lanjutan
                </p>
              </div>

              {fileRujukan ? (
                <div className="space-y-3">
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-sky-950 truncate">{fileRujukan.name}</p>
                      <p className="text-[10px] text-sky-700 font-medium">{(fileRujukan.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {fileRujukanDataUrl && (
                        <button
                          type="button"
                          onClick={() => setPreviewModal({ isOpen: true, fileUrl: fileRujukanDataUrl, fileName: fileRujukan.name })}
                          className="px-2.5 py-1 bg-sky-700 text-white rounded-lg text-[10px] font-bold hover:bg-sky-800 transition flex items-center gap-1 cursor-pointer"
                          title="Buka Berkas"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Buka</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setFileRujukan(null);
                          setFileRujukanDataUrl(null);
                          setFormData((prev) => ({ ...prev, nama_rs_rujukan: '', nama_poli_rujukan: '' }));
                        }}
                        className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                        title="Hapus berkas"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Form Kondisional: Nama RS Rujukan & Poli Rujukan */}
                  <div className="p-3 bg-white border border-sky-200 rounded-xl space-y-2 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Rumah Sakit / Faskes Rujukan Tujuan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: RS Murni Teguh / RSUP Adam Malik"
                        value={formData.nama_rs_rujukan}
                        onChange={(e) => setFormData({ ...formData, nama_rs_rujukan: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 outline-none focus:border-sky-600 focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nama Poli Rujukan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Poli Jantung / Poli Spesialis Dalam"
                        value={formData.nama_poli_rujukan}
                        onChange={(e) => setFormData({ ...formData, nama_poli_rujukan: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 outline-none focus:border-sky-600 focus:bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-sky-600 rounded-xl p-4 text-center bg-white hover:bg-sky-50/30 transition cursor-pointer block">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => handleSelectFile(e.target.files?.[0] || null, setFileRujukan, setFileRujukanDataUrl)}
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700 block">Pilih Surat Rujukan</span>
                  <span className="text-[10px] text-slate-400 block">PDF / PNG / JPG</span>
                </label>
              )}
            </div>

            {/* Slot 3: Surat Sakit Dokter */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
                    <FilePlus className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-extrabold text-slate-900">Surat Sakit / Keterangan</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">
                  Surat keterangan sakit atau istirahat medis dari dokter / klinik
                </p>
              </div>

              {fileSuratSakit ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-rose-950 truncate">{fileSuratSakit.name}</p>
                    <p className="text-[10px] text-rose-700 font-medium">{(fileSuratSakit.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {fileSuratSakitDataUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewModal({ isOpen: true, fileUrl: fileSuratSakitDataUrl, fileName: fileSuratSakit.name })}
                        className="px-2.5 py-1 bg-rose-700 text-white rounded-lg text-[10px] font-bold hover:bg-rose-800 transition flex items-center gap-1 cursor-pointer"
                        title="Buka Berkas"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Buka</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setFileSuratSakit(null);
                        setFileSuratSakitDataUrl(null);
                      }}
                      className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                      title="Hapus berkas"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-300 hover:border-rose-600 rounded-xl p-4 text-center bg-white hover:bg-rose-50/30 transition cursor-pointer block">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => handleSelectFile(e.target.files?.[0] || null, setFileSuratSakit, setFileSuratSakitDataUrl)}
                    className="hidden"
                  />
                  <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700 block">Pilih Surat Sakit</span>
                  <span className="text-[10px] text-slate-400 block">PDF / PNG / JPG</span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
        >
          <CloudUpload className="w-5 h-5" />
          <span>
            {isSubmitting ? 'Menyimpan & Mengunggah Data...' : 'Unggah & Simpan Data Kesehatan Karyawan'}
          </span>
        </button>
      </form>

      {/* Modal Preview Berkas */}
      <DocumentPreviewModal
        open={previewModal.isOpen}
        onClose={() => setPreviewModal({ isOpen: false, fileUrl: null, fileName: '' })}
        url={previewModal.fileUrl}
        title={previewModal.fileName || 'Pratinjau Berkas'}
        fileName={previewModal.fileName}
      />
    </div>
  );
}

export default function EmployeeUnggahDataPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">Memuat formulir...</div>}>
        <EmployeeUnggahDataContent />
      </Suspense>
    </AppLayout>
  );
}
