'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { FitnessStatus } from '@/types/mcu';
import { getWIBTime, getWIBDate } from '@/lib/dateUtils';
import { uploadMedicalFile } from '@/lib/upload';
import {
  ArrowLeft,
  Save,
  User,
  Activity,
  ShieldCheck,
  CheckCircle,
  Building2,
  Paperclip,
  Upload,
  Calendar,
  Stethoscope,
  FileText,
  Eye,
  Download,
  Trash2,
  FileSpreadsheet,
  Image as ImageIcon,
} from 'lucide-react';
import { DivisiSelectInput } from '@/components/common/DivisiSelectInput';
import { normalizeDivisiName } from '@/lib/divisiMaster';
import { DocumentPreviewModal } from '@/components/common/DocumentPreviewModal';

const parseDateToInput = (dateVal: any): string => {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return str;
};

const extractDateFromIntervensi = (intervensiVal: any, type?: 'kuratif' | 'rehabilitatif'): string => {
  if (!intervensiVal) return '';
  const text = Array.isArray(intervensiVal) ? intervensiVal.join(' ') : String(intervensiVal);
  if (type === 'kuratif') {
    const km = text.match(/Kuratif\s*\([^\)]*?(?:Tgl|Tanggal)?[:\s]*(\d{4}-\d{2}-\d{2})[^\)]*?\)/i);
    if (km && km[1]) return km[1];
  }
  if (type === 'rehabilitatif') {
    const rm = text.match(/Rehabilitatif\s*\([^\)]*?(?:Tgl|Tanggal)?[:\s]*(\d{4}-\d{2}-\d{2})[^\)]*?\)/i);
    if (rm && rm[1]) return rm[1];
  }
  const tm = text.match(/(?:Tgl|Tanggal)[:\s]+(\d{4}-\d{2}-\d{2})/i);
  if (tm && tm[1]) return tm[1];

  const dm = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (dm && dm[1]) return dm[1];

  return '';
};

export default function AdminEditDataPage() {
  const params = useParams();
  const router = useRouter();
  const { mcuRecords, miniMcuRecords, updateMcuRecord, updateMiniMcuRecord, isLoading } = useMcu();

  const targetId = Number(params?.id) || 1;
  const existingRecord =
    mcuRecords.find((r) => r.id === targetId) ||
    miniMcuRecords.find((r) => r.id === targetId) ||
    null;

  const loadedRecordIdRef = useRef<number | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPhotoPreview(dataUrl);
    };
    reader.readAsDataURL(file);

    uploadMedicalFile(file, 'fotos').then((res) => {
      if (res && res.publicUrl) {
        setPhotoPreview(res.publicUrl);
      }
    }).catch((err) => {
      console.warn('Storage upload note:', err);
    });
  };

  // Form State
  const [formData, setFormData] = useState({
    kategori_peserta: 'Tetap' as 'Tetap' | 'Kontrak' | 'Outsourcing',
    entitas: 'PTPN 3',
    nama_karyawan: '',
    nik: '',
    divisi: 'Operasional Kebun',
    jabatan: 'Staf Operasional',
    nomor_inhealth: '',
    bpjs: '',
    gender: 'L' as 'L' | 'P',
    umur: '35',
    tanggal_pemeriksaan: getWIBDate(),
    jam_periksa: getWIBTime(),

    // Instansi Pemeriksa MCU
    nama_instansi: 'Klinik Pratama PTPN 3',

    // Vitals
    golongan_darah: 'O+',
    tinggi_badan: '170',
    berat_badan: '68',
    tensi: '120/80',
    gula_darah: '98',
    suhu: '36.5',
    kolesterol: '185',
    asam_urat: '5.4',

    // Kesimpulan Akhir
    status_kebugaran: 'Fit for Duty' as FitnessStatus,

    // Catatan Medis Textareas
    faktor_risiko: '',
    penyakit_text: '',
    diagnosa: '',
    tindak_lanjut: '',

    // KONDISIONAL INTERVENSI KURATIF & REHABILITATIF
    tanggal_kuratif: new Date().toISOString().split('T')[0],
    catatan_kuratif: '',
    tanggal_rehabilitatif: new Date().toISOString().split('T')[0],
    catatan_rehabilitatif: '',

    // Documents
    file_dokumen_name: '',
    file_rujukan_name: '',
    file_surat_sakit_name: '',
  });

  const [selectedPenyakit, setSelectedPenyakit] = useState<string[]>([]);
  const [selectedPromotif, setSelectedPromotif] = useState<string[]>([]);
  const [selectedKuratif, setSelectedKuratif] = useState<string[]>([]);
  const [selectedRehabilitatif, setSelectedRehabilitatif] = useState<string[]>([]);

  // File URL States (Base64 / Data URL / Supabase URL)
  const [fileDokumenUrl, setFileDokumenUrl] = useState<string | null>(null);
  const [fileRujukanUrl, setFileRujukanUrl] = useState<string | null>(null);
  const [fileSuratSakitUrl, setFileSuratSakitUrl] = useState<string | null>(null);

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

  const handleRemoveDokumen = () => {
    setFormData((prev) => ({ ...prev, file_dokumen_name: '' }));
    setFileDokumenUrl(null);
  };

  const handleRemoveRujukan = () => {
    setFormData((prev) => ({ ...prev, file_rujukan_name: '' }));
    setFileRujukanUrl(null);
  };

  const handleRemoveSuratSakit = () => {
    setFormData((prev) => ({ ...prev, file_surat_sakit_name: '' }));
    setFileSuratSakitUrl(null);
  };

  const handleDokumenUpload = (file: File) => {
    if (!file) return;
    setFormData((prev) => ({ ...prev, file_dokumen_name: file.name }));
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileDokumenUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRujukanUpload = (file: File) => {
    if (!file) return;
    setFormData((prev) => ({ ...prev, file_rujukan_name: file.name }));
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileRujukanUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSuratSakitUpload = (file: File) => {
    if (!file) return;
    setFormData((prev) => ({ ...prev, file_surat_sakit_name: file.name }));
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileSuratSakitUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Load existing record data into form
  useEffect(() => {
    if (existingRecord && loadedRecordIdRef.current !== existingRecord.id) {
      loadedRecordIdRef.current = existingRecord.id;
      const rec: any = existingRecord;

      const intervensiStr = typeof rec.intervensi === 'string'
        ? rec.intervensi
        : Array.isArray(rec.intervensi)
          ? rec.intervensi.join(', ')
          : '';

      const isRealDoc = (val: unknown): boolean =>
        typeof val === 'string' &&
        val.trim() !== '' &&
        val !== '-' &&
        val !== 'null' &&
        (val.startsWith('data:') ||
          val.startsWith('http://') ||
          val.startsWith('https://') ||
          val.startsWith('blob:') ||
          val.startsWith('/'));

      const hasValidDoc = isRealDoc(rec.file_dokumen);
      const hasValidRujukan = isRealDoc(rec.file_rujukan) || isRealDoc(rec.file_surat_rujukan_intervensi);
      const hasValidSuratSakit = isRealDoc(rec.file_surat_sakit);

      const existingExamDate =
        parseDateToInput(rec.tanggal_pemeriksaan || rec.tanggal_kunjungan) || getWIBDate();
      const existingExamTime =
        rec.jam_pemeriksaan || rec.jam_periksa || getWIBTime();

      const extractedKuratifDate =
        parseDateToInput(rec.tanggal_kuratif) ||
        extractDateFromIntervensi(rec.intervensi, 'kuratif') ||
        parseDateToInput(rec.tanggal_pemeriksaan_lanjutan) ||
        existingExamDate;

      const extractedRehabilitatifDate =
        parseDateToInput(rec.tanggal_rehabilitatif) ||
        extractDateFromIntervensi(rec.intervensi, 'rehabilitatif') ||
        parseDateToInput(rec.tanggal_pemeriksaan_lanjutan) ||
        existingExamDate;

      setFormData({
        kategori_peserta: (rec.kategori_peserta as any) || 'Tetap',
        entitas: rec.departemen || rec.entitas || 'PTPN 3',
        nama_karyawan: rec.nama_lengkap || rec.nama_karyawan || '',
        nik: rec.nik || '',
        divisi: rec.divisi || 'Operasional Kebun',
        jabatan: rec.jabatan || 'Staf Operasional',
        nomor_inhealth: rec.nomor_inhealth || (rec as any).nomor_pegawai || (rec as any).inhealth || '',
        bpjs: rec.nomor_bpjs || rec.bpjs || '',
        gender: (rec.gender === 'P' || rec.jenis_kelamin === 'Perempuan' ? 'P' : 'L') as 'L' | 'P',
        umur: String(rec.umur || '35'),
        tanggal_pemeriksaan: existingExamDate,
        jam_periksa: existingExamTime,
        nama_instansi: rec.nama_rs || rec.nama_instansi || 'Klinik Pratama PTPN',
        golongan_darah: rec.golongan_darah || 'O+',
        tinggi_badan: String(rec.tinggi_badan || rec.vitals?.tinggi_badan || '170'),
        berat_badan: String(rec.berat_badan || rec.vitals?.berat_badan || '68'),
        tensi: rec.tensi || rec.vitals?.tensi || '120/80',
        gula_darah: String(rec.gula_darah || rec.vitals?.gula_darah || '98'),
        suhu: String(rec.suhu || rec.vitals?.suhu || '36.5'),
        kolesterol: String(rec.kolesterol || rec.vitals?.kolesterol || '180'),
        asam_urat: String(rec.asam_urat || rec.vitals?.asam_urat || '5.5'),
        status_kebugaran: (rec.status_kebugaran || (rec.kesimpulan === 'fit' ? 'Fit for Duty' : rec.kesimpulan === 'sementara_tidak_fit' ? 'Sementara Tidak Fit' : 'Fit dengan Catatan')) as any,
        faktor_risiko: rec.faktor_risiko || '',
        penyakit_text: Array.isArray(rec.penyakit) ? rec.penyakit.join(', ') : (rec.penyakit_list || []).join(', '),
        diagnosa: rec.diagnosa || rec.catatan_medis || '',
        tindak_lanjut: rec.tindak_lanjut || rec.anjuran || rec.saran || '',
        tanggal_kuratif: extractedKuratifDate,
        catatan_kuratif: rec.catatan_intervensi_kuratif || '',
        tanggal_rehabilitatif: extractedRehabilitatifDate,
        catatan_rehabilitatif: rec.catatan_intervensi_rehabilitatif || '',
        file_dokumen_name: hasValidDoc ? (rec.nama_dokumen || 'Laporan_MCU_Karyawan.pdf') : '',
        file_rujukan_name: hasValidRujukan ? (rec.nama_rujukan_file || rec.nama_surat_rujukan_intervensi || 'Surat_Rujukan.pdf') : '',
        file_surat_sakit_name: hasValidSuratSakit ? (rec.nama_surat_sakit || 'Surat_Sakit.pdf') : '',
      });

      if (rec.foto) {
        setPhotoPreview(rec.foto);
      }

      setFileDokumenUrl(hasValidDoc ? (rec.file_dokumen || null) : null);
      setFileRujukanUrl(hasValidRujukan ? (rec.file_rujukan || rec.file_surat_rujukan_intervensi || null) : null);
      setFileSuratSakitUrl(hasValidSuratSakit ? (rec.file_surat_sakit || null) : null);

      const pList = rec.penyakit || rec.penyakit_list;
      if (Array.isArray(pList)) {
        setSelectedPenyakit(pList);
      }

      // Intervensi
      const iList: string[] = Array.isArray(rec.intervensi)
        ? rec.intervensi
        : typeof rec.intervensi === 'string'
          ? rec.intervensi.split(/[,|]/).map((s: string) => s.trim()).filter(Boolean)
          : [];

      const pKeys = ['health talk', 'sekantor', 'gym', 'mcu', 'medical check up', 'healthy food', 'konsultasi kesehatan', 'weight loss', 'vaksin'];
      const kKeys = ['konsultasi lanjutan', 'employee health counseling program', 'counseling', 'ehcp', 'kesegaran'];
      const rKeys = ['monitoring hasil tindak lanjut oleh dokter ahli', 'dokter ahli'];

      setSelectedPromotif(iList.filter((i) => pKeys.some((k) => i.toLowerCase().includes(k))));
      setSelectedKuratif(iList.filter((i) => kKeys.some((k) => i.toLowerCase().includes(k))));
      setSelectedRehabilitatif(iList.filter((i) => rKeys.some((k) => i.toLowerCase().includes(k))));
    }
  }, [existingRecord]);

  // Disease Master Lists
  const penyakitColumn1 = [
    'Fatty Liver',
    'Mild Fatty Liver',
    'Obesitas I',
    'Obesitas II',
    'Overweight',
    'Hipertensi',
    'Dislipidemia',
    'Hiperkolesterolemia',
    'LDL Tinggi',
    'HDL Rendah',
  ];

  const penyakitColumn2 = [
    'Trigliserida Tinggi',
    'Gula Darah Tinggi',
    'LFT (SGOT/SGPT)',
    'Abnormal EKG',
    'Treadmill (+)',
    'Suspect CAD',
    'Gangguan Refraksi Mata',
    'Gangguan Pendengaran',
    'Buta Warna',
    'Gigi',
  ];

  const penyakitColumn3 = [
    'Polip Empedu',
    'Kista Ginjal',
    'Kista Ovarium',
    'Paru',
    'Anemia',
    'Gangguan Ginjal',
    'Kelainan Urin',
    'Hepatitis B (Non Imun)',
  ];

  // Interventions Options
  const promotifOptions = [
    'Health Talk',
    'Sekantor',
    'Gym',
    'Medical Check Up',
    'Healthy Food',
    'Konsultasi Kesehatan',
    'Weight Loss Challenge',
    'Vaksin Hepatitis B',
  ];

  const kuratifOptions = [
    'Konsultasi Lanjutan',
    'Employee Health Counseling Program',
    'Kesegaran',
  ];

  const rehabilitatifOptions = [
    'Monitoring hasil tindak lanjut oleh dokter ahli',
  ];

  // BMI Calculator
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

  const togglePenyakit = (item: string) => {
    let next: string[];
    if (selectedPenyakit.includes(item)) {
      next = selectedPenyakit.filter((p) => p !== item);
    } else {
      next = [...selectedPenyakit, item];
    }
    setSelectedPenyakit(next);
    setFormData((prev) => ({
      ...prev,
      penyakit_text: next.length > 0 ? next.join(', ') : '',
    }));
  };

  const togglePromotif = (item: string) => {
    setSelectedPromotif((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleKuratif = (item: string) => {
    setSelectedKuratif((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleRehabilitatif = (item: string) => {
    setSelectedRehabilitatif((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const isKuratifActive = selectedKuratif.length > 0;
  const isRehabilitatifActive = selectedRehabilitatif.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const tensiParts = (formData.tensi || '120/80').split('/');

    const intervensiParts: string[] = [];
    if (selectedPromotif.length > 0) {
      intervensiParts.push(`Promotif: ${selectedPromotif.join(', ')}`);
    }
    if (selectedKuratif.length > 0) {
      intervensiParts.push(
        `Kuratif (Tgl: ${formData.tanggal_kuratif}): ${selectedKuratif.join(', ')}${formData.catatan_kuratif ? ` - ${formData.catatan_kuratif}` : ''
        }`
      );
    }
    if (selectedRehabilitatif.length > 0) {
      intervensiParts.push(
        `Rehabilitatif (Tgl: ${formData.tanggal_rehabilitatif}): ${selectedRehabilitatif.join(', ')}${formData.file_rujukan_name ? ` [Rujukan: ${formData.file_rujukan_name}]` : ''
        }`
      );
    }

    const combinedIntervensi: string[] = [
      ...selectedPromotif,
      ...selectedKuratif,
      ...selectedRehabilitatif,
    ];

    const tanggalLanjutan =
      (isKuratifActive && formData.tanggal_kuratif) ||
      (isRehabilitatifActive && formData.tanggal_rehabilitatif) ||
      null;

    const activeExamDate = formData.tanggal_pemeriksaan || getWIBDate();

    const updatedPayload = {
      nama_karyawan: formData.nama_karyawan.trim() || 'Karyawan',
      nama_lengkap: formData.nama_karyawan.trim() || 'Karyawan',
      nik: formData.nik.trim(),
      jabatan: formData.jabatan,
      departemen: formData.entitas,
      divisi: normalizeDivisiName(formData.divisi) || formData.divisi,
      kategori_peserta: formData.kategori_peserta,
      nomor_inhealth: formData.nomor_inhealth || null,
      nomor_bpjs: formData.bpjs || null,
      bpjs: formData.bpjs || null,
      gender: formData.gender,
      jenis_kelamin: formData.gender === 'P' ? 'Perempuan' : 'Laki-laki',
      umur: Number(formData.umur) || 35,
      golongan_darah: formData.golongan_darah,
      tanggal_pemeriksaan: activeExamDate,
      tanggal_kunjungan: activeExamDate,
      jam_pemeriksaan: formData.jam_periksa,
      dokter: null,
      nama_dokter: null,
      perawat: null,
      nama_perawat: null,
      nama_instansi: formData.nama_instansi,
      nama_rs: formData.nama_instansi || null,
      nama_poli: null,
      status_kebugaran: formData.status_kebugaran,
      vitals: {
        tensi_sistolik: Number(tensiParts[0]) || 120,
        tensi_diastolik: Number(tensiParts[1]) || 80,
        tensi: formData.tensi || '120/80',
        suhu: Number(formData.suhu) || 36.5,
        nadi: 78,
        spo2: 98,
        gula_darah: Number(formData.gula_darah) || 98,
        kolesterol: Number(formData.kolesterol) || 185,
        asam_urat: Number(formData.asam_urat) || 5.4,
        tinggi_badan: Number(formData.tinggi_badan) || 170,
        berat_badan: Number(formData.berat_badan) || 68,
        bmi: bmiVal,
        bmi_label: bmiDetails.label,
      },
      keluhan: null,
      faktor_risiko: formData.faktor_risiko.trim() || null,
      penyakit_text: formData.penyakit_text.trim() || (selectedPenyakit.length > 0 ? selectedPenyakit.join(', ') : null),
      penyakit: selectedPenyakit.length > 0 ? selectedPenyakit : ['Kondisi Fisik Baik'],
      penyakit_list: selectedPenyakit.length > 0 ? selectedPenyakit : ['Kondisi Fisik Baik'],
      obat: [],
      obat_list: [],
      diagnosa: formData.diagnosa.trim() || 'Hasil pemeriksaan fisik & laboratorium terverifikasi.',
      catatan_medis: formData.diagnosa.trim() || 'Hasil pemeriksaan fisik & laboratorium terverifikasi.',
      tindak_lanjut: formData.tindak_lanjut.trim() || null,
      tindakan_terapi: formData.tindak_lanjut.trim() || null,
      anjuran: formData.tindak_lanjut.trim() || null,
      saran: formData.tindak_lanjut.trim() || null,
      intervensi: intervensiParts.length > 0 ? intervensiParts : combinedIntervensi,
      tanggal_pemeriksaan_lanjutan: tanggalLanjutan,
      tanggal_kuratif: isKuratifActive ? formData.tanggal_kuratif : null,
      tanggal_rehabilitatif: isRehabilitatifActive ? formData.tanggal_rehabilitatif : null,
      foto: photoPreview || existingRecord?.foto || null,
      file_dokumen: fileDokumenUrl || null,
      nama_dokumen: fileDokumenUrl ? (formData.file_dokumen_name || 'Laporan_MCU_Karyawan.pdf') : null,
      file_rujukan: fileRujukanUrl || null,
      nama_rujukan_file: fileRujukanUrl ? (formData.file_rujukan_name || 'Surat_Rujukan.pdf') : null,
      file_surat_rujukan_intervensi: fileRujukanUrl || null,
      nama_surat_rujukan_intervensi: fileRujukanUrl ? (formData.file_rujukan_name || 'Surat_Rujukan.pdf') : null,
      catatan_intervensi_kuratif: isKuratifActive ? formData.catatan_kuratif : null,
      catatan_intervensi_rehabilitatif: isRehabilitatifActive ? formData.catatan_rehabilitatif : null,
      butuh_tindak_lanjut: isKuratifActive || isRehabilitatifActive,
      file_surat_sakit: fileSuratSakitUrl || null,
      nama_surat_sakit: fileSuratSakitUrl ? (formData.file_surat_sakit_name || 'Surat_Sakit.pdf') : null,
    };

    try {
      const isInMini = miniMcuRecords.some((r) => r.id === targetId);
      const isInMcu = mcuRecords.some((r) => r.id === targetId);

      if (isInMini) {
        await updateMiniMcuRecord(targetId, updatedPayload as any);
      }
      if (isInMcu || !isInMini) {
        await updateMcuRecord(targetId, updatedPayload as any);
      }
      setSuccessMessage('Data rekam medis MCU berhasil diperbarui di database! Mengalihkan...');

      setTimeout(() => {
        router.push(`/admin/mcu/${targetId}`);
      }, 900);
    } catch (err: any) {
      alert('Gagal mengupdate data: ' + (err.message || 'Error server'));
    } finally {
      setLoading(false);
    }
  };

  if (!existingRecord) {
    return (
      <AppLayout>
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-600 font-bold text-sm">Memuat data rekam medis...</p>
            </div>
          ) : (
            <div>
              <p className="text-slate-600 font-bold">Data rekam medis #{targetId} tidak ditemukan.</p>
              <button onClick={() => router.push('/admin/rekapan-mcu')} className="mt-4 text-emerald-800 underline text-xs font-bold cursor-pointer">
                Kembali ke Rekapan
              </button>
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div>
            <div className="mb-2">
              <Link
                href={`/admin/mcu/${targetId}`}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-emerald-950 hover:text-emerald-700 transition"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                <span>Kembali ke Detail MCU</span>
              </Link>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Edit Data MCU: {existingRecord.nama_karyawan}
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Perbarui hasil pemeriksaan Medical Check-Up berkala karyawan
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-950 font-bold text-xs shadow-xs">
            <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ROW 1: Peserta & Vitals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left: Info Karyawan */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Informasi Peserta &amp; Karyawan</h3>
                  <p className="text-xs text-slate-500 font-medium">Data identitas &amp; unit kerja</p>
                </div>
              </div>

              {/* Avatar Box + 2-Column Inputs */}
              <div className="flex flex-col sm:flex-row gap-4 items-start pt-1">
                {/* Avatar Placeholder */}
                <div className="flex flex-col items-center gap-2 shrink-0 sm:w-28 w-full pt-1">
                  <input
                    type="file"
                    ref={photoInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handlePhotoUpload(file);
                      }
                    }}
                  />
                  <div
                    onClick={() => photoInputRef.current?.click()}
                    className="w-24 h-28 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 cursor-pointer overflow-hidden group shadow-2xs"
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Foto Pasien" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 stroke-[1.5] group-hover:text-slate-500 transition" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>{photoPreview ? 'Ganti Foto' : 'Upload Foto'}</span>
                    </button>
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhotoPreview(null);
                          if (photoInputRef.current) photoInputRef.current.value = '';
                        }}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 w-full space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Kategori Peserta</label>
                      <select
                        value={formData.kategori_peserta}
                        onChange={(e) => setFormData({ ...formData, kategori_peserta: e.target.value as any })}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none"
                      >
                        <option value="Tetap">Karyawan Tetap</option>
                        <option value="Kontrak">Karyawan Kontrak</option>
                        <option value="Outsourcing">Outsourcing / Vendor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Entitas / Perusahaan</label>
                      <select
                        value={formData.entitas}
                        onChange={(e) => setFormData({ ...formData, entitas: e.target.value })}
                        className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none"
                      >
                        <option value="PTPN 3">PTPN 3 (Holding)</option>
                        <option value="PTPN 1">PTPN 1 (SuppCo)</option>
                        <option value="PTPN 4">PTPN 4 (PalmCo)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap Karyawan *</label>
                      <input
                        type="text"
                        required
                        value={formData.nama_karyawan}
                        onChange={(e) => setFormData({ ...formData, nama_karyawan: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">NIK Karyawan *</label>
                      <input
                        type="text"
                        required
                        value={formData.nik}
                        onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Divisi Unit Kerja</label>
                    <DivisiSelectInput
                      value={formData.divisi}
                      onChange={(val) => setFormData((prev) => ({ ...prev, divisi: val }))}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-[#0a5c36] focus:bg-white transition"
                      placeholder="Pilih atau Ketik Kode / Nama Divisi..."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan</label>
                    <input
                      type="text"
                      value={formData.jabatan}
                      onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">No. Asuransi Inhealth (Hanya Angka)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Contoh: 12345678"
                      value={formData.nomor_inhealth}
                      onChange={(e) => setFormData({ ...formData, nomor_inhealth: e.target.value.replace(/\D/g, '') })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">No. BPJS Kesehatan (Hanya Angka)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Contoh: 00012345678"
                      value={formData.bpjs}
                      onChange={(e) => setFormData({ ...formData, bpjs: e.target.value.replace(/\D/g, '') })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'L' | 'P' })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none"
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Usia (Tahun)</label>
                    <input
                      type="number"
                      value={formData.umur}
                      onChange={(e) => setFormData({ ...formData, umur: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tgl. Periksa</label>
                    <input
                      type="date"
                      value={formData.tanggal_pemeriksaan}
                      onChange={(e) => setFormData({ ...formData, tanggal_pemeriksaan: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Jam (WIB)</label>
                    <input
                      type="time"
                      value={formData.jam_periksa}
                      onChange={(e) => setFormData({ ...formData, jam_periksa: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Vitals */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-800">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Pengukuran Fisik &amp; Tanda Vital</h3>
                  <p className="text-xs text-slate-500 font-medium">Tinggi/berat badan (BMI), tensi, kolesterol &amp; gula darah</p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tinggi (cm)</label>
                    <input
                      type="number"
                      value={formData.tinggi_badan}
                      onChange={(e) => setFormData({ ...formData, tinggi_badan: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Berat (kg)</label>
                    <input
                      type="number"
                      value={formData.berat_badan}
                      onChange={(e) => setFormData({ ...formData, berat_badan: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Indeks BMI</label>
                    <div className={`w-full text-xs font-black rounded-xl px-3 py-2.5 text-center truncate border shadow-2xs ${bmiDetails.color}`}>
                      {bmiVal > 0 ? `${bmiVal} (${bmiDetails.label})` : 'Belum Terhitung'}
                    </div>
                  </div>
                </div>

                {tinggiM > 0 && beratKg > 0 && (
                  <p className="text-[10px] text-slate-500 font-medium bg-slate-50 p-2 rounded-lg border border-slate-200">
                    Rumus BMI: {beratKg} kg / ({tinggiM.toFixed(2)} m)² = <strong className="text-slate-800">{bmiVal} kg/m²</strong> ({bmiDetails.label})
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tekanan Darah (mmHg)</label>
                    <input
                      type="text"
                      value={formData.tensi}
                      onChange={(e) => setFormData({ ...formData, tensi: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Gula Darah Puasa (mg/dL)</label>
                    <input
                      type="number"
                      value={formData.gula_darah}
                      onChange={(e) => setFormData({ ...formData, gula_darah: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Kolesterol (mg/dL)</label>
                    <input
                      type="number"
                      value={formData.kolesterol}
                      onChange={(e) => setFormData({ ...formData, kolesterol: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Asam Urat (mg/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.asam_urat}
                      onChange={(e) => setFormData({ ...formData, asam_urat: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Suhu (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.suhu}
                      onChange={(e) => setFormData({ ...formData, suhu: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Instansi / Rumah Sakit Pemeriksa MCU</label>
                    <input
                      type="text"
                      placeholder="Contoh: RS Siloam / RS Murni Teguh / Lab Prodia"
                      value={formData.nama_instansi}
                      onChange={(e) => setFormData({ ...formData, nama_instansi: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#0a5c36] focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Temuan Penyakit & Kesimpulan */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-emerald-800" />
                  <h3 className="font-extrabold text-slate-900 text-base">Hasil Temuan Pemeriksaan Medis</h3>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {selectedPenyakit.length} dipilih
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="space-y-2">
                  {penyakitColumn1.map((item) => {
                    const isChecked = selectedPenyakit.includes(item);
                    return (
                      <label
                        key={item}
                        onClick={() => togglePenyakit(item)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition ${isChecked ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => { }} className="rounded text-emerald-800" />
                        <span className="truncate">{item}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {penyakitColumn2.map((item) => {
                    const isChecked = selectedPenyakit.includes(item);
                    return (
                      <label
                        key={item}
                        onClick={() => togglePenyakit(item)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition ${isChecked ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => { }} className="rounded text-emerald-800" />
                        <span className="truncate">{item}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {penyakitColumn3.map((item) => {
                    const isChecked = selectedPenyakit.includes(item);
                    return (
                      <label
                        key={item}
                        onClick={() => togglePenyakit(item)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition ${isChecked ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => { }} className="rounded text-emerald-800" />
                        <span className="truncate">{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base pb-3 border-b border-slate-100">
                Kesimpulan Status Kebugaran
              </h3>

              <div className="space-y-2.5">
                <label
                  onClick={() => setFormData({ ...formData, status_kebugaran: 'Fit for Duty' })}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition ${formData.status_kebugaran === 'Fit for Duty' ? 'bg-emerald-50 border-emerald-400 text-emerald-950' : 'bg-white border-slate-200'
                    }`}
                >
                  <input type="radio" name="status_kebugaran" checked={formData.status_kebugaran === 'Fit for Duty'} onChange={() => { }} className="text-emerald-700" />
                  <span>Fit for Duty</span>
                </label>

                <label
                  onClick={() => setFormData({ ...formData, status_kebugaran: 'Fit dengan Catatan' })}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition ${formData.status_kebugaran === 'Fit dengan Catatan' ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-white border-slate-200'
                    }`}
                >
                  <input type="radio" name="status_kebugaran" checked={formData.status_kebugaran === 'Fit dengan Catatan'} onChange={() => { }} className="text-amber-600" />
                  <span>Fit Dengan Catatan</span>
                </label>

                <label
                  onClick={() => setFormData({ ...formData, status_kebugaran: 'Sementara Tidak Fit' })}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition ${formData.status_kebugaran === 'Sementara Tidak Fit' ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-white border-slate-200'
                    }`}
                >
                  <input type="radio" name="status_kebugaran" checked={formData.status_kebugaran === 'Sementara Tidak Fit'} onChange={() => { }} className="text-rose-600" />
                  <span>Sementara Tidak Fit</span>
                </label>
              </div>
            </div>
          </div>

          {/* ROW 3: Catatan Medis */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base pb-2 border-b border-slate-100">Catatan Medis &amp; Diagnosa</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Faktor Risiko</label>
                <textarea
                  rows={3}
                  value={formData.faktor_risiko}
                  onChange={(e) => setFormData({ ...formData, faktor_risiko: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Penyakit</label>
                <textarea
                  rows={3}
                  value={formData.penyakit_text}
                  onChange={(e) => setFormData({ ...formData, penyakit_text: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Diagnosa Dokter</label>
                <textarea
                  rows={3}
                  value={formData.diagnosa}
                  onChange={(e) => setFormData({ ...formData, diagnosa: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tindak Lanjut / Anjuran</label>
                <textarea
                  rows={3}
                  value={formData.tindak_lanjut}
                  onChange={(e) => setFormData({ ...formData, tindak_lanjut: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none"
                />
              </div>
            </div>
          </div>

          {/* ROW 4: Intervensi Layanan Kesehatan (KONDISIONAL KURATIF & REHABILITATIF) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-emerald-800" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Intervensi Layanan Kesehatan</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Program intervensi (Kuratif &amp; Rehabilitatif memunculkan kontrol tanggal &amp; upload berkas rujukan secara otomatis)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Promotif */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl space-y-3">
                <span className="text-xs font-extrabold text-emerald-950 uppercase block tracking-wider">
                  🍏 PROMOTIF &amp; PREVENTIF
                </span>
                <div className="space-y-2">
                  {promotifOptions.map((opt) => {
                    const isChecked = selectedPromotif.includes(opt);
                    return (
                      <label
                        key={opt}
                        onClick={() => togglePromotif(opt)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${isChecked ? 'bg-white border-emerald-400 text-emerald-950 font-bold' : 'bg-white/80 border-slate-200 text-slate-700'
                          }`}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => { }} className="rounded text-emerald-800" />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Kuratif */}
              <div className="p-4 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-950 uppercase block tracking-wider">
                    💊 KURATIF
                  </span>
                  {isKuratifActive && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-md">
                      Aktif
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {kuratifOptions.map((opt) => {
                    const isChecked = selectedKuratif.includes(opt);
                    return (
                      <label
                        key={opt}
                        onClick={() => toggleKuratif(opt)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${isChecked ? 'bg-white border-amber-400 text-amber-950 font-bold' : 'bg-white/80 border-slate-200 text-slate-700'
                          }`}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => { }} className="rounded text-amber-700" />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>

                {isKuratifActive && (
                  <div className="pt-3 mt-3 border-t border-amber-200/70 space-y-2.5 animate-in fade-in">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                      <Calendar className="w-4 h-4 text-amber-700" />
                      <span>Tanggal Pemeriksaan / Kontrol Kuratif *</span>
                    </div>
                    <input
                      type="date"
                      required
                      value={formData.tanggal_kuratif}
                      onChange={(e) => setFormData({ ...formData, tanggal_kuratif: e.target.value })}
                      className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-xl px-3 py-2 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Rehabilitatif */}
              <div className="p-4 bg-purple-50/60 border border-purple-200/80 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-purple-950 uppercase block tracking-wider">
                    🏥 REHABILITATIF
                  </span>
                  {isRehabilitatifActive && (
                    <span className="text-[10px] font-bold text-purple-800 bg-purple-200/60 px-2 py-0.5 rounded-md">
                      Aktif
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {rehabilitatifOptions.map((opt) => {
                    const isChecked = selectedRehabilitatif.includes(opt);
                    return (
                      <label
                        key={opt}
                        onClick={() => toggleRehabilitatif(opt)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${isChecked ? 'bg-white border-purple-400 text-purple-950 font-bold' : 'bg-white/80 border-slate-200 text-slate-700'
                          }`}
                      >
                        <input type="checkbox" checked={isChecked} onChange={() => { }} className="rounded text-purple-700" />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>

                {isRehabilitatifActive && (
                  <div className="pt-3 mt-3 border-t border-purple-200/70 space-y-3 animate-in fade-in">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 mb-1">
                        <Calendar className="w-4 h-4 text-purple-700" />
                        <span>Tanggal Kontrol Rehabilitatif *</span>
                      </div>
                      <input
                        type="date"
                        required
                        value={formData.tanggal_rehabilitatif}
                        onChange={(e) => setFormData({ ...formData, tanggal_rehabilitatif: e.target.value })}
                        className="w-full text-xs font-semibold bg-white border border-purple-300 rounded-xl px-3 py-2 outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 mb-1">
                        <Paperclip className="w-4 h-4 text-purple-700" />
                        <span>Upload Berkas Surat Rujukan *</span>
                      </div>
                      {formData.file_rujukan_name || fileRujukanUrl ? (
                        <div className="p-3 bg-white border-2 border-purple-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-purple-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                              RUJ
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-purple-950 truncate">
                                {formData.file_rujukan_name || 'Surat_Rujukan.pdf'}
                              </p>
                              <p className="text-[10px] font-bold text-purple-700">Surat Rujukan Terlampir</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewDocModal({
                                  open: true,
                                  title: 'Surat Rujukan Pasien',
                                  url: fileRujukanUrl,
                                  fileName: formData.file_rujukan_name || 'Surat_Rujukan.pdf',
                                })
                              }
                              className="px-2.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-lg shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Buka</span>
                            </button>
                            {fileRujukanUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = fileRujukanUrl;
                                  link.download = formData.file_rujukan_name || 'Surat_Rujukan';
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                }}
                                className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg transition cursor-pointer"
                                title="Unduh Berkas"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleRemoveRujukan}
                              className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                              title="Hapus Berkas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative border-2 border-dashed border-purple-300 hover:border-purple-500 bg-white p-3 rounded-xl text-center cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleRujukanUpload(file);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="w-5 h-5 text-purple-600" />
                            <p className="text-[11px] font-bold text-purple-950">
                              Pilih atau Tarik Berkas Surat Rujukan (.pdf / .jpg / .png)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ROW 5: Dokumen Lampiran MCU */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Paperclip className="w-5 h-5 text-emerald-800" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Dokumen Lampiran MCU</h3>
                <p className="text-xs text-slate-500 font-medium">Unggah berkas rekam medis lengkap atau surat dokter</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Laporan Hasil MCU (PDF, Excel, Gambar)</span>
                {formData.file_dokumen_name || fileDokumenUrl ? (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {formData.file_dokumen_name.toLowerCase().endsWith('.xlsx') || formData.file_dokumen_name.toLowerCase().endsWith('.xls') || formData.file_dokumen_name.toLowerCase().endsWith('.csv') ? (
                          <FileSpreadsheet className="w-4 h-4" />
                        ) : formData.file_dokumen_name.toLowerCase().endsWith('.pdf') ? (
                          <FileText className="w-4 h-4" />
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {formData.file_dokumen_name || 'Hasil_MCU'}
                        </p>
                        <p className="text-[10px] text-slate-500">Berkas Terlampir</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDocModal({
                            open: true,
                            title: 'Laporan Hasil MCU',
                            url: fileDokumenUrl,
                            fileName: formData.file_dokumen_name || 'Hasil_MCU',
                          })
                        }
                        className="px-2.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-lg shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka</span>
                      </button>
                      {fileDokumenUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = fileDokumenUrl;
                            link.download = formData.file_dokumen_name || 'Hasil_MCU';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Unduh Berkas"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveDokumen}
                        className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                        title="Hapus Berkas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-600 bg-white p-3 rounded-xl text-center cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDokumenUpload(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <FileText className="w-5 h-5 text-emerald-800" />
                      <span className="text-[11px] font-bold text-slate-700">
                        Upload Hasil MCU (PDF, Excel, Scan)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Surat Keterangan Sakit (Opsional)</span>
                {formData.file_surat_sakit_name || fileSuratSakitUrl ? (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-rose-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                        SKT
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {formData.file_surat_sakit_name || 'Surat_Sakit.pdf'}
                        </p>
                        <p className="text-[10px] text-slate-500">Surat Sakit Terlampir</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewDocModal({
                            open: true,
                            title: 'Surat Keterangan Sakit',
                            url: fileSuratSakitUrl,
                            fileName: formData.file_surat_sakit_name || 'Surat_Sakit.pdf',
                          })
                        }
                        className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Buka</span>
                      </button>
                      {fileSuratSakitUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = fileSuratSakitUrl;
                            link.download = formData.file_surat_sakit_name || 'Surat_Sakit';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="Unduh Berkas"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveSuratSakit}
                        className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                        title="Hapus Berkas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-600 bg-white p-3 rounded-xl text-center cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSuratSakitUpload(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-1">
                      <FileText className="w-5 h-5 text-rose-700" />
                      <span className="text-[11px] font-bold text-slate-700">
                        Upload Surat Sakit (.pdf / .jpg)
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Menyimpan Perubahan...</span>
              ) : (
                <>
                  <Save className="w-5 h-5 text-emerald-200" />
                  <span>Simpan Perubahan Data MCU (Admin)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* DOCUMENT PREVIEW MODAL */}
      <DocumentPreviewModal
        open={previewDocModal.open}
        onClose={() =>
          setPreviewDocModal({
            open: false,
            title: '',
            url: null,
            fileName: '',
          })
        }
        title={previewDocModal.title}
        url={previewDocModal.url}
        fileName={previewDocModal.fileName}
      />
    </AppLayout>
  );
}
