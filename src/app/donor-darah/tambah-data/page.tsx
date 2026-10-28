'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { ParticipantSearchInput } from '@/components/common/ParticipantSearchInput';
import { DivisiSelectInput } from '@/components/common/DivisiSelectInput';
import { EmployeeProfile } from '@/services/mcuService';
import { uploadMedicalFile } from '@/lib/upload';
import { getWIBDate } from '@/lib/dateUtils';
import { normalizeEntitasDonor } from '@/services/donorService';
import {
  ENTITAS_DONOR_OPTIONS,
  GOLONGAN_DARAH_OPTIONS,
  EntitasDonor,
} from '@/types/mcu';
import {
  Droplets,
  User,
  Building2,
  Calendar,
  MapPin,
  Heart,
  CreditCard,
  ShieldCheck,
  FileText,
  Upload,
  ArrowLeft,
  CheckCircle2,
  X,
  Camera,
  Image as ImageIcon,
  Loader2,
  Award,
  AlertCircle,
} from 'lucide-react';

export default function TambahDataDonorPage() {
  const router = useRouter();
  const { addDonorRecord } = useMcu();

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Foto Pendonor state
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Bukti Donor upload state
  const [buktiPreview, setBuktiPreview] = useState<string | null>(null);
  const [buktiFileName, setBuktiFileName] = useState<string>('');
  const buktiInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBukti, setUploadingBukti] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    // 1. Data Identitas Peserta Existing
    nama_lengkap: '',
    nik: '',
    entitas: 'PTPN III / Holding' as EntitasDonor,
    divisi: '',
    jabatan: '',
    nomor_inhealth: '',
    nomor_bpjs: '',
    jenis_kelamin: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    umur: '30',

    // 2. Data Khusus Donor Darah
    tanggal_donor: getWIBDate(),
    golongan_darah: 'O',
    lokasi_donor: 'Klinik Pratama PTPN',
    keterangan: '',
    bukti_donor: '',
    nama_bukti_donor: '',
  });

  const isNonEntity = formData.entitas === 'Bukan Entitas';

  // Handle Autocomplete selection from existing participants
  const handleSelectEmployee = (profile: EmployeeProfile) => {
    // Normalisasi Entitas ke 3 opsi resmi
    const resolvedEntitas: EntitasDonor = normalizeEntitasDonor(profile.departemen || profile.entitas) as EntitasDonor;

    // Normalisasi jenis kelamin
    let resolvedGender: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
    const g = String(profile.jenis_kelamin || profile.gender || '').toLowerCase();
    if (g.startsWith('p') || g.includes('perempuan')) {
      resolvedGender = 'Perempuan';
    }

    // Normalisasi golongan darah jika ada di rekam medis MCU
    let resolvedGol = formData.golongan_darah;
    if (profile.golongan_darah) {
      const cleanG = profile.golongan_darah.toUpperCase();
      if (cleanG.includes('AB')) resolvedGol = 'AB';
      else if (cleanG.includes('A')) resolvedGol = 'A';
      else if (cleanG.includes('B')) resolvedGol = 'B';
      else if (cleanG.includes('O')) resolvedGol = 'O';
    }

    setFormData((prev) => ({
      ...prev,
      nama_lengkap: profile.nama_lengkap || profile.nama_karyawan || prev.nama_lengkap,
      nik: profile.nik || prev.nik,
      entitas: resolvedEntitas,
      divisi: profile.divisi && profile.divisi !== '-' ? profile.divisi : prev.divisi,
      jabatan: profile.jabatan || prev.jabatan,
      nomor_inhealth: profile.nomor_inhealth || profile.nomor_pegawai || prev.nomor_inhealth,
      nomor_bpjs: profile.nomor_bpjs || profile.bpjs || prev.nomor_bpjs,
      jenis_kelamin: resolvedGender,
      umur: profile.umur ? String(profile.umur) : prev.umur,
      golongan_darah: resolvedGol,
    }));

    if (profile.foto) {
      setPhotoPreview(profile.foto);
    }
  };

  // Upload Foto Pendonor
  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const res = await uploadMedicalFile(file, 'fotos');
      if (res && res.publicUrl) {
        setPhotoPreview(res.publicUrl);
      }
    } catch (err) {
      console.warn('Upload foto note:', err);
    }
  };

  // Upload Bukti Donor
  const handleBuktiUpload = async (file: File) => {
    if (!file) return;
    setBuktiFileName(file.name);
    setUploadingBukti(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      setBuktiPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    try {
      const res = await uploadMedicalFile(file, 'donor');
      if (res && res.publicUrl) {
        setFormData((prev) => ({
          ...prev,
          bukti_donor: res.publicUrl,
          nama_bukti_donor: file.name,
        }));
      }
    } catch (err) {
      console.warn('Upload bukti note:', err);
    } finally {
      setUploadingBukti(false);
    }
  };

  const handleRemoveBukti = () => {
    setBuktiPreview(null);
    setBuktiFileName('');
    setFormData((prev) => ({ ...prev, bukti_donor: '', nama_bukti_donor: '' }));
    if (buktiInputRef.current) buktiInputRef.current.value = '';
  };

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const isNonEntity = formData.entitas === 'Bukan Entitas';

    if (!formData.nama_lengkap.trim()) {
      setErrorMessage(
        isNonEntity
          ? 'Nama lengkap pendonor wajib diisi.'
          : 'Silakan cari dan pilih nama karyawan terlebih dahulu.'
      );
      return;
    }

    if (!formData.nik.trim()) {
      setErrorMessage(
        isNonEntity
          ? 'Nomor NIK / No. KTP pendonor wajib diisi.'
          : 'Nomor Induk Karyawan (NIK) wajib diisi.'
      );
      return;
    }

    if (!formData.tanggal_donor) {
      setErrorMessage('Tanggal kegiatan donor darah wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      await addDonorRecord({
        nama_lengkap: formData.nama_lengkap.trim(),
        nik: formData.nik.trim(),
        entitas: formData.entitas,
        divisi: isNonEntity ? null : (formData.divisi.trim() || null),
        jabatan: formData.jabatan.trim() || null,
        nomor_inhealth: formData.nomor_inhealth.trim() || null,
        nomor_bpjs: formData.nomor_bpjs.trim() || null,
        jenis_kelamin: formData.jenis_kelamin,
        umur: parseInt(formData.umur, 10) || null,
        foto: photoPreview || null,

        // Data Khusus Donor
        tanggal_donor: formData.tanggal_donor,
        golongan_darah: formData.golongan_darah,
        lokasi_donor: formData.lokasi_donor.trim(),
        keterangan: formData.keterangan.trim() || null,
        bukti_donor: formData.bukti_donor || buktiPreview || null,
        nama_bukti_donor: formData.nama_bukti_donor || buktiFileName || null,
        status: 'Selesai',
        created_by_role: 'klinik',
      });

      setSuccessMessage('Data kegiatan donor darah berhasil disimpan ke sistem!');
      setTimeout(() => {
        router.push('/donor-darah/data-donor');
      }, 1200);
    } catch (err: any) {
      console.error('Error simpan donor darah:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan data donor darah.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout role="klinik" active="/donor-darah/tambah-data">
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/donor-darah/data-donor"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Data Donor Darah</span>
          </Link>
          <span className="text-xs font-semibold text-slate-400">
            Formulir Registrasi Donor Darah
          </span>
        </div>

        {/* Header Title Card */}
        <div className="rounded-3xl bg-gradient-to-r from-rose-700 to-red-800 p-6 sm:p-7 text-white shadow-xl shadow-rose-950/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Tambah Data Donor Darah
              </h1>
              <p className="text-xs sm:text-sm text-rose-100 font-medium mt-0.5">
                Pilih nama karyawan yang sudah terdaftar untuk mengisi otomatis data identitas dari sistem existing.
              </p>
            </div>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">{successMessage}</span>
          </div>
        )}

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs font-bold">{errorMessage}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: IDENTITAS PENDONOR (DATA PESERTA EXISTING / NON-ENTITAS) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className={`w-5 h-5 ${isNonEntity ? 'text-blue-600' : 'text-emerald-700'}`} />
                    <div>
                      <h2 className="text-sm sm:text-base font-black text-slate-900">
                        {isNonEntity
                          ? '1. Identitas Pendonor (Peserta Umum / Non-PTPN)'
                          : '1. Identitas Pendonor (Data Peserta Existing)'}
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {isNonEntity
                          ? 'Masukkan identitas pendonor umum secara manual. Tidak terikat data karyawan internal.'
                          : 'Ketik nama atau NIK di kolom pencarian. Semua identitas peserta akan terisi otomatis.'}
                      </p>
                    </div>
                  </div>
                  {isNonEntity ? (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      <User className="w-3.5 h-3.5" />
                      Peserta Luar / Umum
                    </span>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Auto-fill Sistem
                    </span>
                  )}
                </div>

                {/* Dropdown Entitas Perusahaan */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Entitas Perusahaan <span className="text-rose-500">*</span>
                    </label>
                    {isNonEntity && (
                      <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        Pilihan divisi &amp; karyawan dinonaktifkan untuk pendonor luar
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <select
                      value={formData.entitas}
                      onChange={(e) => {
                        const val = e.target.value as EntitasDonor;
                        setFormData((prev) => ({
                          ...prev,
                          entitas: val,
                          divisi: val === 'Bukan Entitas' ? '' : prev.divisi,
                        }));
                      }}
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-rose-600 focus:bg-white transition cursor-pointer"
                    >
                      {ENTITAS_DONOR_OPTIONS.map((ent) => (
                        <option key={ent} value={ent}>
                          {ent === 'Bukan Entitas' ? '🌐 Bukan Entitas (Umum / Non-PTPN)' : `🏢 ${ent}`}
                        </option>
                      ))}
                    </select>
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Layout: Foto Pendonor + Fields Grid */}
                <div className="flex flex-col sm:flex-row gap-5 items-start pt-1">
                  {/* Box Foto Pendonor */}
                  <div className="flex flex-col items-center gap-2 shrink-0 sm:w-28 w-full pt-1">
                    <input
                      type="file"
                      ref={photoInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(file);
                      }}
                    />
                    <div
                      onClick={() => photoInputRef.current?.click()}
                      className="w-24 h-28 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer overflow-hidden group shadow-2xs hover:border-rose-500 transition"
                      title="Klik untuk upload foto baru"
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Foto Pendonor" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 stroke-[1.5] group-hover:text-slate-600 transition" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-center">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="text-[11px] font-bold text-slate-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{photoPreview ? 'Ganti Foto' : 'Pilih Foto'}</span>
                      </button>
                      {photoPreview && (
                        <button
                          type="button"
                          onClick={() => setPhotoPreview(null)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                        >
                          Hapus
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Grid Kolom Identitas */}
                  <div className="flex-1 w-full space-y-3.5">
                    {/* Baris 1: Nama Lengkap & NIK */}
                    {isNonEntity ? (
                      /* Kalo Bukan Entitas: Input manual tanpa pilihan karyawan / autocomplete */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nama Lengkap Pendonor <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ketik nama lengkap pendonor..."
                            value={formData.nama_lengkap}
                            onChange={(e) => setFormData((prev) => ({ ...prev, nama_lengkap: e.target.value }))}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition placeholder-slate-400 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            NIK / No. Identitas KTP <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Masukkan NIK atau nomor KTP..."
                            value={formData.nik}
                            onChange={(e) => setFormData((prev) => ({ ...prev, nik: e.target.value }))}
                            className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition placeholder-slate-400 font-semibold"
                          />
                        </div>
                      </div>
                    ) : (
                      /* Kalo Entitas PTPN (1, 3, 4): Pencarian Karyawan Terintegrasi */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nama Lengkap Pendonor <span className="text-rose-500">*</span>
                          </label>
                          <ParticipantSearchInput
                            type="name"
                            name="nama_lengkap"
                            required
                            placeholder="Ketik untuk mencari nama karyawan..."
                            value={formData.nama_lengkap}
                            onChange={(val) => setFormData((prev) => ({ ...prev, nama_lengkap: val }))}
                            onSelectEmployee={handleSelectEmployee}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition placeholder-slate-400 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            NIK Karyawan <span className="text-rose-500">*</span>
                          </label>
                          <ParticipantSearchInput
                            type="nik"
                            name="nik"
                            required
                            placeholder="Masukkan NIK atau cari..."
                            value={formData.nik}
                            onChange={(val) => setFormData((prev) => ({ ...prev, nik: val }))}
                            onSelectEmployee={handleSelectEmployee}
                            className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition placeholder-slate-400 font-semibold"
                          />
                        </div>
                      </div>
                    )}

                    {/* Baris 2: Divisi & Jabatan */}
                    {isNonEntity ? (
                      /* Kalo Bukan Entitas: TIDAK ADA pilihan divisi, hanya Jabatan/Pekerjaan opsional */
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Pekerjaan / Jabatan <span className="text-slate-400 font-normal">(Opsional)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Contoh: Wiraswasta, PNS, Mahasiswa, Guru..."
                          value={formData.jabatan}
                          onChange={(e) => setFormData((prev) => ({ ...prev, jabatan: e.target.value }))}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition font-medium"
                        />
                      </div>
                    ) : (
                      /* Kalo Entitas PTPN: Ada pilihan divisi dan jabatan */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Divisi / Unit Kerja
                          </label>
                          <DivisiSelectInput
                            value={formData.divisi}
                            onChange={(val) => setFormData((prev) => ({ ...prev, divisi: val }))}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition"
                            placeholder="Pilih atau ketik divisi..."
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Jabatan
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Staf Karyawan, Manager..."
                            value={formData.jabatan}
                            onChange={(e) => setFormData((prev) => ({ ...prev, jabatan: e.target.value }))}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition font-medium"
                          />
                        </div>
                      </div>
                    )}

                    {/* Baris 3: Nomor Inhealth & BPJS */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Nomor Inhealth {isNonEntity && <span className="text-slate-400 font-normal">(Opsional)</span>}
                          </label>
                          {!isNonEntity && (
                            <span className="text-[10px] text-slate-400 font-medium">Terisi dari data peserta</span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder={isNonEntity ? 'Nomor Inhealth (opsional)...' : 'Nomor Inhealth...'}
                          value={formData.nomor_inhealth}
                          onChange={(e) => setFormData((prev) => ({ ...prev, nomor_inhealth: e.target.value }))}
                          className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Nomor BPJS {isNonEntity && <span className="text-slate-400 font-normal">(Opsional)</span>}
                          </label>
                          {!isNonEntity && (
                            <span className="text-[10px] text-slate-400 font-medium">Terisi dari data peserta</span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder={isNonEntity ? 'Nomor BPJS (opsional)...' : 'Nomor BPJS...'}
                          value={formData.nomor_bpjs}
                          onChange={(e) => setFormData((prev) => ({ ...prev, nomor_bpjs: e.target.value }))}
                          className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition"
                        />
                      </div>
                    </div>

                    {/* Baris 4: Jenis Kelamin & Umur */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Jenis Kelamin
                        </label>
                        <select
                          value={formData.jenis_kelamin}
                          onChange={(e) => setFormData((prev) => ({ ...prev, jenis_kelamin: e.target.value as any }))}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition font-semibold"
                        >
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Umur (Tahun)
                        </label>
                        <input
                          type="number"
                          placeholder="Contoh: 35"
                          value={formData.umur}
                          onChange={(e) => setFormData((prev) => ({ ...prev, umur: e.target.value }))}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

          {/* SECTION 2: DATA KHUSUS KEGIATAN DONOR DARAH */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
              <Droplets className="w-5 h-5 text-rose-600" />
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  2. Data Khusus Kegiatan Donor Darah
                </h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Rincian tanggal, golongan darah, lokasi, dan catatan kondisi pendonor.
                </p>
              </div>
            </div>

            {/* Baris 1: Tanggal Donor & Golongan Darah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Tanggal Donor <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.tanggal_donor}
                    onChange={(e) => setFormData({ ...formData, tanggal_donor: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition font-semibold text-slate-800"
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Golongan Darah <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.golongan_darah}
                  onChange={(e) => setFormData({ ...formData, golongan_darah: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition font-black text-slate-800"
                >
                  {GOLONGAN_DARAH_OPTIONS.map((g) => (
                    <option key={g} value={g}>
                      Golongan {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Baris 2: Lokasi Donor */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Lokasi Pelaksanaan Donor <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Contoh: Gedung Holding PTPN - Lt. 2, Klinik Pratama..."
                  value={formData.lokasi_donor}
                  onChange={(e) => setFormData({ ...formData, lokasi_donor: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition font-semibold text-slate-800"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Baris 4: Keterangan / Catatan Tambahan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Keterangan / Catatan Kondisi Pendonor
              </label>
              <textarea
                rows={3}
                placeholder="Catatan tambahan, contoh: Pendonor ke-5, tensi 120/80 mmHg, hemoglobin 14.0 g/dL, kondisi fit..."
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition font-medium text-slate-800"
              />
            </div>

            {/* Baris 5: Upload Bukti Donor (Jika Diperlukan) */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bukti Donor / Sertifikat PMI (Jika Diperlukan)
              </label>
              <input
                type="file"
                ref={buktiInputRef}
                className="hidden"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleBuktiUpload(file);
                }}
              />

              {buktiPreview ? (
                <div className="flex items-center justify-between p-3 rounded-2xl border border-rose-200 bg-rose-50/50">
                  <div className="flex items-center gap-3">
                    <img
                      src={buktiPreview}
                      alt="Bukti Preview"
                      className="w-12 h-12 object-cover rounded-xl border border-rose-200"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block truncate max-w-xs">
                        {buktiFileName || 'Sertifikat Donor Darah'}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Berkas Siap Diunggah
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveBukti}
                    className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => buktiInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-rose-400 bg-slate-50/70 hover:bg-rose-50/30 rounded-2xl p-4 sm:p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">
                    Klik untuk Unggah Foto Bukti / Kartu Donor PMI
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Mendukung JPG, PNG, atau PDF (Maksimal 5MB)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/donor-darah/data-donor"
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold shadow-md shadow-rose-900/20 transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Menyimpan...' : 'Simpan Data Donor Darah'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
