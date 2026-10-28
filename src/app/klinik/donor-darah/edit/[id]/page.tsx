'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { DivisiSelectInput } from '@/components/common/DivisiSelectInput';
import { uploadMedicalFile } from '@/lib/upload';
import {
  ENTITAS_DONOR_OPTIONS,
  GOLONGAN_DARAH_OPTIONS,
  EntitasDonor,
  DonorDarahRecord,
} from '@/types/mcu';
import {
  Droplets,
  User,
  Building2,
  Calendar,
  MapPin,
  Heart,
  ShieldCheck,
  Upload,
  ArrowLeft,
  CheckCircle2,
  X,
  Loader2,
  Award,
  AlertCircle,
} from 'lucide-react';

interface EditDonorPageProps {
  params: Promise<{ id: string }>;
}

export default function EditDataDonorPage({ params }: EditDonorPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const recordId = Number(resolvedParams.id);

  const { donorRecords, updateDonorRecord } = useMcu();

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Foto preview
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Bukti Donor upload
  const [buktiPreview, setBuktiPreview] = useState<string | null>(null);
  const [buktiFileName, setBuktiFileName] = useState<string>('');
  const buktiInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBukti, setUploadingBukti] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    nik: '',
    entitas: 'PTPN III / Holding' as EntitasDonor,
    divisi: '',
    jabatan: '',
    nomor_inhealth: '',
    nomor_bpjs: '',
    jenis_kelamin: 'Laki-laki' as 'Laki-laki' | 'Perempuan',
    umur: '30',

    // Data Donor
    tanggal_donor: '',
    golongan_darah: 'O',
    lokasi_donor: '',
    keterangan: '',
    bukti_donor: '',
    nama_bukti_donor: '',
  });

  const isNonEntity = formData.entitas === 'Bukan Entitas';

  // Pre-load data from context
  useEffect(() => {
    const existing = donorRecords.find((r) => r.id === recordId);
    if (existing) {
      setFormData({
        nama_lengkap: existing.nama_lengkap || '',
        nik: existing.nik || '',
        entitas: (existing.entitas as EntitasDonor) || 'PTPN III / Holding',
        divisi: existing.divisi || '',
        jabatan: existing.jabatan || '',
        nomor_inhealth: existing.nomor_inhealth || '',
        nomor_bpjs: existing.nomor_bpjs || '',
        jenis_kelamin: existing.jenis_kelamin || 'Laki-laki',
        umur: existing.umur ? String(existing.umur) : '30',
        tanggal_donor: existing.tanggal_donor || '',
        golongan_darah: existing.golongan_darah || 'O',
        lokasi_donor: existing.lokasi_donor || '',
        keterangan: existing.keterangan || '',
        bukti_donor: existing.bukti_donor || '',
        nama_bukti_donor: existing.nama_bukti_donor || '',
      });

      if (existing.foto) setPhotoPreview(existing.foto);
      if (existing.bukti_donor) setBuktiPreview(existing.bukti_donor);
      if (existing.nama_bukti_donor) setBuktiFileName(existing.nama_bukti_donor);
    }
  }, [donorRecords, recordId]);

  // Upload Foto Pendonor
  const handlePhotoUpload = async (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    try {
      const res = await uploadMedicalFile(file, 'fotos');
      if (res && res.publicUrl) setPhotoPreview(res.publicUrl);
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
    reader.onload = (e) => setBuktiPreview(e.target?.result as string);
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

  // Submit Update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.nama_lengkap.trim() || !formData.nik.trim()) {
      setErrorMessage('Nama lengkap dan NIK wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      await updateDonorRecord(recordId, {
        nama_lengkap: formData.nama_lengkap.trim(),
        nik: formData.nik.trim(),
        entitas: formData.entitas,
        divisi: formData.entitas === 'Bukan Entitas' ? null : (formData.divisi.trim() || null),
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
      });

      setSuccessMessage('Perubahan data donor darah berhasil disimpan!');
      setTimeout(() => {
        router.push('/klinik/donor-darah');
      }, 1200);
    } catch (err: any) {
      console.error('Error update donor darah:', err);
      setErrorMessage(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout role="klinik" active="/klinik/donor-darah">
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/klinik/donor-darah"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Data Donor Darah</span>
          </Link>
          <span className="text-xs font-semibold text-slate-400">
            Edit Data Transaksi Donor #{recordId}
          </span>
        </div>

        {/* Header Title Card */}
        <div className="rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-800 p-6 sm:p-7 text-white shadow-xl shadow-blue-950/10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 shadow-inner">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Edit Data Donor Darah
              </h1>
              <p className="text-xs sm:text-sm text-blue-100 font-medium mt-0.5">
                Perbarui rincian kegiatan donor darah dan identitas pendonor.
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs font-bold">{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: IDENTITAS */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className={`w-5 h-5 ${isNonEntity ? 'text-blue-600' : 'text-emerald-700'}`} />
                    <h2 className="text-sm sm:text-base font-black text-slate-900">
                      1. Identitas Pendonor {isNonEntity ? '(Peserta Umum / Non-PTPN)' : 'Terdaftar'}
                    </h2>
                  </div>
                  {isNonEntity ? (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      <User className="w-3.5 h-3.5" />
                      Peserta Luar / Umum
                    </span>
                  ) : (
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Karyawan Internal
                    </span>
                  )}
                </div>

                {/* Entitas */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Entitas Perusahaan <span className="text-rose-500">*</span>
                  </label>
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
                      className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600 focus:bg-white transition cursor-pointer"
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

                {/* Foto + Fields */}
                <div className="flex flex-col sm:flex-row gap-5 items-start pt-1">
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
                      className="w-24 h-28 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer overflow-hidden group shadow-2xs hover:border-blue-500 transition"
                    >
                      {photoPreview ? (
                        <img src={photoPreview} alt="Foto Pendonor" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 stroke-[1.5] group-hover:text-slate-600 transition" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="text-[11px] font-bold text-slate-600 hover:text-blue-700 cursor-pointer"
                    >
                      {photoPreview ? 'Ganti Foto' : 'Pilih Foto'}
                    </button>
                  </div>

                  <div className="flex-1 w-full space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nama Lengkap Pendonor <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.nama_lengkap}
                          onChange={(e) => setFormData({ ...formData, nama_lengkap: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 focus:bg-white transition font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {isNonEntity ? 'NIK / No. Identitas KTP' : 'NIK Karyawan'} <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.nik}
                          onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                          className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 focus:bg-white transition font-bold"
                        />
                      </div>
                    </div>

                    {/* Divisi & Jabatan */}
                    {isNonEntity ? (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Pekerjaan / Jabatan <span className="text-slate-400 font-normal">(Opsional)</span>
                        </label>
                        <input
                          type="text"
                          value={formData.jabatan}
                          placeholder="Contoh: Wiraswasta, PNS, Mahasiswa, Guru..."
                          onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 focus:bg-white transition font-medium"
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Divisi / Unit Kerja</label>
                          <DivisiSelectInput
                            value={formData.divisi}
                            onChange={(val) => setFormData((prev) => ({ ...prev, divisi: val }))}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan</label>
                          <input
                            type="text"
                            value={formData.jabatan}
                            onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 focus:bg-white transition font-medium"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nomor Inhealth {isNonEntity && <span className="text-slate-400 font-normal">(Opsional)</span>}
                        </label>
                        <input
                          type="text"
                          value={formData.nomor_inhealth}
                          placeholder={isNonEntity ? 'Nomor Inhealth (opsional)...' : 'Nomor Inhealth...'}
                          onChange={(e) => setFormData({ ...formData, nomor_inhealth: e.target.value })}
                          className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Nomor BPJS {isNonEntity && <span className="text-slate-400 font-normal">(Opsional)</span>}
                        </label>
                        <input
                          type="text"
                          value={formData.nomor_bpjs}
                          placeholder={isNonEntity ? 'Nomor BPJS (opsional)...' : 'Nomor BPJS...'}
                          onChange={(e) => setFormData({ ...formData, nomor_bpjs: e.target.value })}
                          className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
                        />
                      </div>
                    </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={formData.jenis_kelamin}
                      onChange={(e) => setFormData({ ...formData, jenis_kelamin: e.target.value as any })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Umur (Tahun)</label>
                    <input
                      type="number"
                      value={formData.umur}
                      onChange={(e) => setFormData({ ...formData, umur: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: DATA DONOR */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3.5">
              <Droplets className="w-5 h-5 text-rose-600" />
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                2. Data Khusus Kegiatan Donor Darah
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal Donor</label>
                <input
                  type="date"
                  required
                  value={formData.tanggal_donor}
                  onChange={(e) => setFormData({ ...formData, tanggal_donor: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Golongan Darah</label>
                <select
                  value={formData.golongan_darah}
                  onChange={(e) => setFormData({ ...formData, golongan_darah: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-black"
                >
                  {GOLONGAN_DARAH_OPTIONS.map((g) => (
                    <option key={g} value={g}>Golongan {g}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Lokasi Donor</label>
              <input
                type="text"
                required
                value={formData.lokasi_donor}
                onChange={(e) => setFormData({ ...formData, lokasi_donor: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Keterangan</label>
              <textarea
                rows={3}
                value={formData.keterangan}
                onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
              />
            </div>

            {/* Bukti Upload */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Bukti Donor / Sertifikat</label>
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
                    <img src={buktiPreview} alt="Bukti" className="w-12 h-12 object-cover rounded-xl" />
                    <span className="text-xs font-bold text-slate-800">{buktiFileName || 'Sertifikat Donor'}</span>
                  </div>
                  <button type="button" onClick={handleRemoveBukti} className="text-rose-600 hover:text-rose-800 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => buktiInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/70 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1"
                >
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-700">Upload Berkas Bukti Donor</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/klinik/donor-darah"
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-7 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
