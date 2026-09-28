'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { FitnessStatus } from '@/types/mcu';
import { autoFillKaryawan, EmployeeProfile } from '@/services/mcuService';
import { ParticipantSearchInput } from '@/components/common/ParticipantSearchInput';
import { getWIBTime, getWIBDate } from '@/lib/dateUtils';
import {
  Upload,
  User,
  Activity,
  ShieldCheck,
  Building2,
  X,
  FileSpreadsheet,
  CheckCircle,
  Paperclip,
  Calendar,
  Clock,
  TrendingUp,
  FileText,
  Camera,
  Download,
  AlertCircle,
  Sparkles,
  Pill,
  HeartPulse,
  FileCheck,
  Loader2,
  Eye,
  Trash2,
  Image as ImageIcon,
} from 'lucide-react';
import { parseMcuExcelFile, downloadMcuExcelTemplate, ParsedMcuRow } from '@/services/excelImportService';
import { uploadMedicalFile } from '@/lib/upload';
import { DivisiSelectInput } from '@/components/common/DivisiSelectInput';
import { normalizeDivisiName } from '@/lib/divisiMaster';
import { DocumentPreviewModal } from '@/components/common/DocumentPreviewModal';

export default function AdminTambahDataPage() {
  const router = useRouter();
  const { addMcuRecord } = useMcu();

  const [showImportModal, setShowImportModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileRujukanRef = useRef<HTMLInputElement>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // File URL & Details for Dokumen MCU and Surat Rujukan
  const [fileDokumenUrl, setFileDokumenUrl] = useState<string | null>(null);
  const [fileDokumenSize, setFileDokumenSize] = useState<string>('');
  const [fileRujukanUrl, setFileRujukanUrl] = useState<string | null>(null);
  const [fileRujukanSize, setFileRujukanSize] = useState<string>('');

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

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDokumenUpload = (file: File) => {
    if (!file) return;
    setFormData((prev) => ({ ...prev, file_dokumen_name: file.name }));
    setFileDokumenSize(formatFileSize(file.size));
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFileDokumenUrl(dataUrl);
    };
    reader.readAsDataURL(file);

    uploadMedicalFile(file, 'dokumen').then((res) => {
      if (res && res.publicUrl) {
        setFileDokumenUrl(res.publicUrl);
      }
    }).catch((err) => {
      console.warn('Storage upload note:', err);
    });
  };

  const handleRemoveDokumen = () => {
    setFormData((prev) => ({ ...prev, file_dokumen_name: '' }));
    setFileDokumenUrl(null);
    setFileDokumenSize('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRujukanUpload = (file: File) => {
    if (!file) return;
    setFormData((prev) => ({ ...prev, file_rujukan_name: file.name }));
    setFileRujukanSize(formatFileSize(file.size));
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFileRujukanUrl(dataUrl);
    };
    reader.readAsDataURL(file);

    uploadMedicalFile(file, 'rujukan').then((res) => {
      if (res && res.publicUrl) {
        setFileRujukanUrl(res.publicUrl);
      }
    }).catch((err) => {
      console.warn('Storage upload note:', err);
    });
  };

  const handleRemoveRujukan = () => {
    setFormData((prev) => ({ ...prev, file_rujukan_name: '' }));
    setFileRujukanUrl(null);
    setFileRujukanSize('');
    if (fileRujukanRef.current) fileRujukanRef.current.value = '';
  };

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

  // Excel Import States
  const [importLoading, setImportLoading] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedMcuRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Auto/Live WIB Time State
  const [isTimeAuto, setIsTimeAuto] = useState(true);

  // Form State
  const [pesertaType, setPesertaType] = useState<'Karyawan' | 'Anak Magang'>('Karyawan');
  const [formData, setFormData] = useState({
    entitas: 'PTPN 3',
    nama_karyawan: '',
    nik: '',
    divisi: '',
    jabatan: '',
    nomor_inhealth: '',
    bpjs: '',
    gender: 'Laki-laki',
    umur: '35',
    tanggal_pemeriksaan: getWIBDate(),
    jam_periksa: getWIBTime(),

    // Instansi Pemeriksa
    nama_instansi: '',

    // Vitals & Lab
    golongan_darah: '',
    tinggi_badan: '170',
    berat_badan: '65',
    tensi: '120/80',
    gula_darah: '110',
    suhu: '36.5',
    kolesterol: '190',
    asam_urat: '6.0',

    // Kesimpulan Akhir
    status_kebugaran: 'Fit for Duty' as FitnessStatus,

    // Catatan Medis
    faktor_risiko: '',
    penyakit_text: '',
    diagnosa: '',
    tindak_lanjut: '',

    // Kondisional Intervensi
    tanggal_kuratif: new Date().toISOString().split('T')[0],
    catatan_kuratif: '',
    tanggal_rehabilitatif: new Date().toISOString().split('T')[0],
    catatan_rehabilitatif: '',
    file_rujukan_name: '',

    // Dokumen Lampiran MCU
    file_dokumen_name: '',
  });

  // Checkbox Lists
  const [selectedPenyakit, setSelectedPenyakit] = useState<string[]>([]);
  const [selectedPromotif, setSelectedPromotif] = useState<string[]>([]);
  const [selectedKuratif, setSelectedKuratif] = useState<string[]>([]);
  const [selectedRehabilitatif, setSelectedRehabilitatif] = useState<string[]>([]);

  // Disease Master Lists (Exact 3 Columns from design)
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

  // Interventions Options (Exact from design)
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

  // BMI Real-time calculation
  const tinggiM = (parseFloat(formData.tinggi_badan) || 170) / 100;
  const beratKg = parseFloat(formData.berat_badan) || 65;
  const bmiVal = tinggiM > 0 ? Number((beratKg / (tinggiM * tinggiM)).toFixed(1)) : 22.5;

  const getBmiDetails = (bmi: number) => {
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

  // Live WIB Time Sync (Berjalan otomatis jika belum diubah manual oleh pengguna)
  useEffect(() => {
    if (!isTimeAuto) return;
    const updateTimer = () => {
      setFormData((prev) => ({
        ...prev,
        jam_periksa: getWIBTime(),
      }));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isTimeAuto]);

  // Handle Participant Type Switching (Karyawan vs Anak Magang)
  const handleSelectPesertaType = (type: 'Karyawan' | 'Anak Magang') => {
    setPesertaType(type);
    if (type === 'Anak Magang') {
      setFormData((prev) => ({
        ...prev,
        nik: '0000000000',
        jabatan: prev.jabatan && prev.jabatan !== 'Staf' && prev.jabatan !== 'Staf Operasional' ? prev.jabatan : 'Anak Magang',
      }));
    } else {
      // Switching back to Karyawan
      setFormData((prev) => ({
        ...prev,
        nik: prev.nik === '0000000000' ? '' : prev.nik,
        jabatan: prev.jabatan === 'Anak Magang' ? 'Staf Operasional' : prev.jabatan,
      }));
    }
  };

  // Handle Employee selection from database autocomplete
  const handleSelectEmployee = (profile: EmployeeProfile) => {
    setFormData((prev) => ({
      ...prev,
      nama_karyawan: profile.nama_lengkap || profile.nama_karyawan || prev.nama_karyawan,
      nik: profile.nik || prev.nik,
      divisi: profile.divisi && profile.divisi !== '-' ? profile.divisi : prev.divisi,
      jabatan: profile.jabatan || prev.jabatan,
      entitas: profile.departemen || profile.entitas || prev.entitas,
      nomor_inhealth: profile.nomor_inhealth || profile.nomor_pegawai || prev.nomor_inhealth,
      bpjs: profile.nomor_bpjs || profile.bpjs || prev.bpjs,
      gender: profile.jenis_kelamin === 'P' || profile.jenis_kelamin === 'Perempuan' || profile.gender === 'P' || profile.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
      umur: profile.umur ? String(profile.umur) : prev.umur,
      golongan_darah: profile.golongan_darah || prev.golongan_darah,
    }));
    if (profile.foto) {
      setPhotoPreview(profile.foto);
    }
    if (profile.nik === '0000000000' || profile.kategori_peserta === 'Magang') {
      setPesertaType('Anak Magang');
    } else {
      setPesertaType('Karyawan');
    }
  };

  const handleNikLookup = async (nikValue: string) => {
    if (!nikValue || nikValue.trim().length < 2) return;
    try {
      const found: any = await autoFillKaryawan(nikValue);
      if (found) {
        handleSelectEmployee(found);
      }
    } catch (err) {
      console.warn('Lookup error:', err);
    }
  };

  // Handle Excel File Selection & Parsing
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedImportFile(file);
    setImportError(null);
    setImportLoading(true);

    try {
      const rows = await parseMcuExcelFile(file);
      setParsedRows(rows);
    } catch (err: any) {
      setImportError(err.message || 'Gagal memproses file Excel.');
      setParsedRows([]);
    } finally {
      setImportLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      setSelectedImportFile(file);
      setImportError(null);
      setImportLoading(true);

      try {
        const rows = await parseMcuExcelFile(file);
        setParsedRows(rows);
      } catch (err: any) {
        setImportError(err.message || 'Gagal memproses file Excel.');
        setParsedRows([]);
      } finally {
        setImportLoading(false);
      }
    }
  };

  // Handle Execute Bulk Import
  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessingImport(true);

    try {
      let importedCount = 0;
      for (const row of parsedRows) {
        const tensiParts = (row.tensi || '120/80').split('/');
        const diseaseList = row.penyakit && row.penyakit.length > 0
          ? row.penyakit
          : (row.penyakit_list && row.penyakit_list.length > 0 ? row.penyakit_list : []);
        const diseaseText = row.penyakit_text || (diseaseList.length > 0 ? diseaseList.join(', ') : 'Tidak memiliki penyakit');
        const diagnosaText = row.diagnosa && row.diagnosa !== 'Tidak memiliki diagnosa'
          ? row.diagnosa
          : (diseaseList.length > 0 ? diseaseList.join(', ') : 'Tidak memiliki diagnosa');
        const tindakLanjutText = row.tindak_lanjut || row.tindakan_terapi || 'Tidak memiliki anjuran';
        const finalInhealth = row.nomor_inhealth || 'Tidak memiliki nomor inhealth';
        const finalBpjs = row.nomor_bpjs || row.bpjs || 'Tidak memiliki BPJS';
        const finalEntitas = row.entitas || row.departemen || formData.entitas || 'PTPN 3';

        const payload = {
          nama_karyawan: row.nama_karyawan,
          nama_lengkap: row.nama_karyawan,
          nik: row.nik,
          jabatan: row.jabatan || 'Staf Operasional',
          departemen: finalEntitas,
          entitas: finalEntitas,
          divisi: row.divisi || 'Tidak memiliki divisi',
          kategori_peserta: (row.kategori_peserta || 'Tetap') as any,
          nomor_inhealth: finalInhealth,
          nomor_pegawai: finalInhealth !== 'Tidak memiliki nomor inhealth' ? finalInhealth : (row.nomor_pegawai || finalInhealth),
          bpjs: finalBpjs,
          nomor_bpjs: finalBpjs,
          gender: row.gender === 'Perempuan' ? ('P' as const) : ('L' as const),
          jenis_kelamin: row.gender || 'Laki-laki',
          umur: row.umur || 35,
          golongan_darah: row.golongan_darah || 'O+',
          tanggal_pemeriksaan: row.tanggal_pemeriksaan || new Date().toISOString().split('T')[0],
          dokter: 'dr. H. Ahmad Fauzi, Sp.OK',
          perawat: 'Ns. Siti Rahma, S.Kep',
          nama_instansi: 'Klinik Pratama PTPN',
          nama_rs: 'Klinik Pratama PTPN',
          status_kebugaran: row.status_kebugaran || (diseaseList.length > 0 ? 'Fit dengan Catatan' : 'Fit for Duty'),
          kesimpulan: row.kesimpulan || (diseaseList.length > 0 ? 'fit_dengan_catatan' : 'fit'),
          vitals: {
            tensi_sistolik: Number(tensiParts[0]) || 120,
            tensi_diastolik: Number(tensiParts[1]) || 80,
            tensi: row.tensi || '120/80',
            suhu: 36.5,
            nadi: 78,
            spo2: 98,
            gula_darah: Number(row.vitals?.gula_darah || row.gula_darah) || 110,
            kolesterol: Number(row.vitals?.kolesterol || row.kolesterol) || 190,
            asam_urat: 6.0,
            tinggi_badan: row.tinggi_badan || 170,
            berat_badan: row.berat_badan || 65,
            bmi: row.bmi || 22.5,
            bmi_label: row.bmi && row.bmi > 25 ? 'Overweight' : 'Normal',
          },
          keluhan: diagnosaText !== 'Tidak memiliki diagnosa' ? diagnosaText : (diseaseText !== 'Tidak memiliki penyakit' ? diseaseText : 'Tidak memiliki keluhan'),
          penyakit: diseaseList,
          penyakit_list: diseaseList,
          penyakit_text: diseaseText,
          diagnosa: diagnosaText,
          catatan_medis: diagnosaText,
          tindak_lanjut: tindakLanjutText,
          tindakan_terapi: tindakLanjutText,
          anjuran: tindakLanjutText,
          obat_list: ['Multivitamin & Mineral'],
          intervensi: '',
          catatan_intervensi_kuratif: null,
          file_dokumen: null,
          nama_dokumen: null,
          butuh_tindak_lanjut: false,
          tindak_lanjut_selesai: false,
        };

        await addMcuRecord(payload as any);
        importedCount++;
      }

      setSuccessMessage(`Berhasil mengimpor ${importedCount} data MCU karyawan dari file Excel!`);
      setShowImportModal(false);
      setSelectedImportFile(null);
      setParsedRows([]);
      setTimeout(() => {
        router.push('/admin/rekapan-mcu');
      }, 1000);
    } catch (err: any) {
      alert('Gagal mengimpor data: ' + (err.message || 'Terjadi kesalahan sistem'));
    } finally {
      setIsProcessingImport(false);
    }
  };

  const isKuratifActive = selectedKuratif.length > 0;
  const isRehabilitatifActive = selectedRehabilitatif.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const tensiParts = (formData.tensi || '120/80').split('/');

    // Compile comprehensive intervensi description
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

    const tanggalLanjutan =
      (isKuratifActive && formData.tanggal_kuratif) ||
      (isRehabilitatifActive && formData.tanggal_rehabilitatif) ||
      null;

    const tindakLanjutVal = formData.tindak_lanjut.trim() || null;
    const finalIntervensi = intervensiParts.length > 0 ? intervensiParts : [];

    const recordPayload = {
      nama_karyawan: formData.nama_karyawan.trim() || 'Karyawan PTPN',
      nama_lengkap: formData.nama_karyawan.trim() || 'Karyawan PTPN',
      nik: formData.nik.trim() || `EMP-${Math.floor(100000 + Math.random() * 900000)}`,
      jabatan: formData.jabatan || 'Staf Operasional',
      departemen: formData.entitas || 'PTPN 3',
      divisi: normalizeDivisiName(formData.divisi) || formData.divisi || 'Divisi Pengadaan dan Umum',
      kategori_peserta: (pesertaType === 'Anak Magang' ? 'Magang' : 'Tetap') as any,
      nomor_inhealth: formData.nomor_inhealth || null,
      nomor_bpjs: formData.bpjs || null,
      bpjs: formData.bpjs || null,
      gender: formData.gender === 'Perempuan' ? ('P' as const) : ('L' as const),
      jenis_kelamin: (formData.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki') as 'Perempuan' | 'Laki-laki',
      umur: Number(formData.umur) || 35,
      golongan_darah: formData.golongan_darah || 'O+',
      tanggal_pemeriksaan: formData.tanggal_pemeriksaan,
      jam_pemeriksaan: formData.jam_periksa,
      dokter: null,
      nama_dokter: null,
      perawat: null,
      nama_perawat: null,
      nama_instansi: formData.nama_instansi || 'Klinik Pratama PTPN',
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
        gula_darah: Number(formData.gula_darah) || 110,
        kolesterol: Number(formData.kolesterol) || 190,
        asam_urat: Number(formData.asam_urat) || 6.0,
        tinggi_badan: Number(formData.tinggi_badan) || 170,
        berat_badan: Number(formData.berat_badan) || 65,
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
      tindak_lanjut: tindakLanjutVal,
      tindakan_terapi: tindakLanjutVal,
      anjuran: tindakLanjutVal,
      saran: tindakLanjutVal,
      intervensi: finalIntervensi,
      tanggal_pemeriksaan_lanjutan: tanggalLanjutan,
      foto: photoPreview || null,
      file_dokumen: fileDokumenUrl || null,
      nama_dokumen: fileDokumenUrl ? (formData.file_dokumen_name || 'Laporan_MCU_Karyawan.pdf') : null,
      file_rujukan: isRehabilitatifActive ? (fileRujukanUrl || (formData.file_rujukan_name ? formData.file_rujukan_name : null)) : undefined,
      nama_rujukan_file: isRehabilitatifActive ? (formData.file_rujukan_name || (fileRujukanUrl ? 'Surat_Rujukan.pdf' : null)) : undefined,
      file_surat_rujukan_intervensi: isRehabilitatifActive ? (fileRujukanUrl || (formData.file_rujukan_name ? formData.file_rujukan_name : null)) : undefined,
      nama_surat_rujukan_intervensi: isRehabilitatifActive ? (formData.file_rujukan_name || (fileRujukanUrl ? 'Surat_Rujukan.pdf' : null)) : undefined,
      catatan_intervensi_kuratif: isKuratifActive && formData.catatan_kuratif ? formData.catatan_kuratif : undefined,
      catatan_intervensi_rehabilitatif: isRehabilitatifActive && formData.catatan_rehabilitatif ? formData.catatan_rehabilitatif : undefined,
      butuh_tindak_lanjut: isKuratifActive || isRehabilitatifActive,
      tindak_lanjut_selesai: false,
    };

    try {
      const newId = await addMcuRecord(recordPayload);
      setSuccessMessage('Data MCU Karyawan berhasil disimpan ke Database! Mengalihkan...');

      setTimeout(() => {
        router.push(`/admin/mcu/${newId}`);
      }, 900);
    } catch (err: any) {
      alert('Gagal menyimpan data: ' + (err.message || 'Error server'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Page Title & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Tambah Data MCU Karyawan (Admin)
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Formulir resmi pencatatan hasil Medical Check-Up (MCU) berkala karyawan PTPN 3 oleh Admin
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2.5 bg-[#0a5c36] hover:bg-[#08482a] text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Impor Data MCU dari Excel</span>
            </button>
          </div>
        </div>

        {/* Flash Message Alert */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-950 font-bold text-xs shadow-xs animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ROW 1: Informasi Karyawan & Pengukuran Fisik */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

            {/* CARD 1: Informasi Peserta MCU */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0a5c36]" />
                  <h3 className="font-extrabold text-slate-900 text-base">Informasi Peserta MCU</h3>
                </div>

                {/* Pill Toggle Karyawan / Anak Magang */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full">
                  <button
                    type="button"
                    onClick={() => handleSelectPesertaType('Karyawan')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${pesertaType === 'Karyawan'
                      ? 'bg-[#0a5c36] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Karyawan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectPesertaType('Anak Magang')}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${pesertaType === 'Anak Magang'
                      ? 'bg-[#0a5c36] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                      }`}
                  >
                    <span>🎓 Anak Magang</span>
                  </button>
                </div>
              </div>

              {/* Entitas Perusahaan Dropdown */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Entitas Perusahaan</label>
                <div className="relative">
                  <select
                    value={formData.entitas}
                    onChange={(e) => setFormData({ ...formData, entitas: e.target.value })}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0a5c36] focus:bg-white transition cursor-pointer"
                  >
                    <option value="PTPN 3">🏢 PTPN 3</option>
                    <option value="PTPN 1">🏢 PTPN 1</option>
                    <option value="PTPN 4">🏢 PTPN 4</option>
                  </select>
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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

                {/* Form Fields Grid */}
                <div className="flex-1 w-full space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap</label>
                      <ParticipantSearchInput
                        type="name"
                        name="nama_karyawan"
                        required
                        placeholder="Pilih atau Ketik Nama Karyawan..."
                        value={formData.nama_karyawan}
                        onChange={(val) => setFormData((prev) => ({ ...prev, nama_karyawan: val }))}
                        onSelectEmployee={handleSelectEmployee}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition placeholder-slate-400 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">NIK</label>
                      <ParticipantSearchInput
                        type="nik"
                        name="nik"
                        required
                        placeholder="Masukkan NIK..."
                        value={formData.nik}
                        onChange={(val) => setFormData((prev) => ({ ...prev, nik: val }))}
                        onSelectEmployee={handleSelectEmployee}
                        onBlur={() => handleNikLookup(formData.nik)}
                        className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition placeholder-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Divisi Unit Kerja</label>
                      <DivisiSelectInput
                        value={formData.divisi}
                        onChange={(val) => setFormData((prev) => ({ ...prev, divisi: val }))}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition"
                        placeholder="Pilih atau Ketik Kode / Nama Divisi..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan</label>
                      <input
                        type="text"
                        placeholder="Pilih atau Ketik Jabatan..."
                        value={formData.jabatan}
                        onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Inhealth (Hanya Angka)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Contoh: 12345678 (Hanya angka)..."
                        value={formData.nomor_inhealth}
                        onChange={(e) => setFormData({ ...formData, nomor_inhealth: e.target.value.replace(/\D/g, '') })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor BPJS (Hanya Angka)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Contoh: 000123456789 (Hanya angka)..."
                        value={formData.bpjs}
                        onChange={(e) => setFormData({ ...formData, bpjs: e.target.value.replace(/\D/g, '') })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                      >
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Umur (Tahun)</label>
                      <input
                        type="number"
                        placeholder="35"
                        value={formData.umur}
                        onChange={(e) => setFormData({ ...formData, umur: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tanggal Pemeriksaan</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={formData.tanggal_pemeriksaan}
                          onChange={(e) => setFormData({ ...formData, tanggal_pemeriksaan: e.target.value })}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-slate-700">Jam Periksa</label>
                        {isTimeAuto ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Live WIB
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setIsTimeAuto(true);
                              setFormData((prev) => ({ ...prev, jam_periksa: getWIBTime() }));
                            }}
                            className="text-[10px] font-bold text-[#0a5c36] hover:underline cursor-pointer flex items-center gap-0.5"
                            title="Kembalikan ke jam sekarang yang sedang berjalan (WIB)"
                          >
                            <Clock className="w-3 h-3" />
                            Set Sekarang
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="time"
                          value={formData.jam_periksa}
                          onChange={(e) => {
                            setIsTimeAuto(false);
                            setFormData({ ...formData, jam_periksa: e.target.value });
                          }}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition font-medium cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Auto-Fill Alert Banner */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-900">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Ketik nama karyawan untuk memuat NIK, Divisi, dan Biodata secara otomatis dari sistem.</span>
              </div>
            </div>

            {/* CARD 2: Pengukuran Fisik & Tanda Vital */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <TrendingUp className="w-5 h-5 text-[#0a5c36]" />
                <h3 className="font-extrabold text-slate-900 text-base">Pengukuran Fisik &amp; Tanda Vital</h3>
              </div>

              {/* Golongan Darah */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Golongan Darah</label>
                <select
                  value={formData.golongan_darah}
                  onChange={(e) => setFormData({ ...formData, golongan_darah: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
                >
                  <option value="">Pilih Golongan Darah</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                  <option value="A+">A+</option>
                  <option value="B+">B+</option>
                  <option value="AB+">AB+</option>
                  <option value="O+">O+</option>
                  <option value="A-">A-</option>
                  <option value="B-">B-</option>
                  <option value="AB-">AB-</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              {/* Tinggi Badan & Berat Badan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Tinggi Badan (cm)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 170"
                    value={formData.tinggi_badan}
                    onChange={(e) => setFormData({ ...formData, tinggi_badan: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Berat Badan (kg)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 65"
                    value={formData.berat_badan}
                    onChange={(e) => setFormData({ ...formData, berat_badan: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                  />
                </div>
              </div>

              {/* Analisis BMI Result */}
              <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    Analisis BMI (Body Mass Index) :
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-extrabold shadow-2xs ${bmiDetails.color}`}>
                    {bmiVal > 0 ? `${bmiVal} kg/m² (${bmiDetails.label})` : 'Belum Terhitung'}
                  </span>
                </div>
                {tinggiM > 0 && beratKg > 0 && (
                  <p className="text-[10px] text-slate-500 font-medium">
                    Rumus: {beratKg} kg / ({tinggiM.toFixed(2)} m × {tinggiM.toFixed(2)} m) = <strong className="text-slate-800">{bmiVal} kg/m²</strong>
                  </p>
                )}
              </div>

              {/* Section Header: HASIL TANDA VITAL & LAB */}
              <div className="pt-2">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-2">
                  HASIL TANDA VITAL &amp; LAB
                </span>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Tensi (mmHg)</label>
                      <input
                        type="text"
                        placeholder="120/80"
                        value={formData.tensi}
                        onChange={(e) => setFormData({ ...formData, tensi: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Gula Darah (mg/dL)</label>
                      <input
                        type="number"
                        placeholder="110"
                        value={formData.gula_darah}
                        onChange={(e) => setFormData({ ...formData, gula_darah: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Suhu Tubuh (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      placeholder="36.5"
                      value={formData.suhu}
                      onChange={(e) => setFormData({ ...formData, suhu: e.target.value })}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Kolesterol (mg/dL)</label>
                      <input
                        type="number"
                        placeholder="190"
                        value={formData.kolesterol}
                        onChange={(e) => setFormData({ ...formData, kolesterol: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Asam Urat (mg/dL)</label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="6.0"
                        value={formData.asam_urat}
                        onChange={(e) => setFormData({ ...formData, asam_urat: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Instansi Pemeriksa MCU */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#0a5c36]" />
              <h3 className="font-extrabold text-slate-900 text-base">Instansi Pemeriksa MCU</h3>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Isikan nama rumah sakit, laboratorium, atau tempat pelaksanaan MCU karyawan ini
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Instansi / Rumah Sakit Pemeriksa</label>
              <input
                type="text"
                placeholder="Contoh: RS Siloam / RS Murni Teguh / Lab Prodia"
                value={formData.nama_instansi}
                onChange={(e) => setFormData({ ...formData, nama_instansi: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none"
              />
            </div>
          </div>

          {/* ROW 3: Hasil Pemeriksaan & Kesimpulan Akhir */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Left 2 Columns: Hasil Pemeriksaan Checkbox */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-base">Hasil Pemeriksaan</h3>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {selectedPenyakit.length} dipilih
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* Column 1 */}
                <div className="space-y-2">
                  {penyakitColumn1.map((item) => {
                    const isChecked = selectedPenyakit.includes(item);
                    return (
                      <label
                        key={item}
                        onClick={() => togglePenyakit(item)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition ${isChecked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => { }}
                          className="rounded text-[#0a5c36]"
                        />
                        <span className="truncate">{item}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Column 2 */}
                <div className="space-y-2">
                  {penyakitColumn2.map((item) => {
                    const isChecked = selectedPenyakit.includes(item);
                    return (
                      <label
                        key={item}
                        onClick={() => togglePenyakit(item)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition ${isChecked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => { }}
                          className="rounded text-[#0a5c36]"
                        />
                        <span className="truncate">{item}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Column 3 */}
                <div className="space-y-2">
                  {penyakitColumn3.map((item) => {
                    const isChecked = selectedPenyakit.includes(item);
                    return (
                      <label
                        key={item}
                        onClick={() => togglePenyakit(item)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition ${isChecked
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => { }}
                          className="rounded text-[#0a5c36]"
                        />
                        <span className="truncate">{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 1 Column: Kesimpulan Akhir */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-base pb-3 border-b border-slate-100">
                Kesimpulan Akhir
              </h3>

              <div className="space-y-2.5">
                <label
                  onClick={() => setFormData({ ...formData, status_kebugaran: 'Sementara Tidak Fit' })}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition ${formData.status_kebugaran === 'Sementara Tidak Fit'
                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  <input
                    type="radio"
                    name="status_kebugaran"
                    checked={formData.status_kebugaran === 'Sementara Tidak Fit'}
                    onChange={() => { }}
                    className="text-rose-600 focus:ring-rose-500"
                  />
                  <span>Sementara Tidak Fit</span>
                </label>

                <label
                  onClick={() => setFormData({ ...formData, status_kebugaran: 'Fit dengan Catatan' })}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition ${formData.status_kebugaran === 'Fit dengan Catatan'
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  <input
                    type="radio"
                    name="status_kebugaran"
                    checked={formData.status_kebugaran === 'Fit dengan Catatan'}
                    onChange={() => { }}
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span>Fit Dengan Catatan</span>
                </label>

                <label
                  onClick={() => setFormData({ ...formData, status_kebugaran: 'Fit for Duty' })}
                  className={`flex items-center gap-3 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition ${formData.status_kebugaran === 'Fit for Duty'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-2xs'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                >
                  <input
                    type="radio"
                    name="status_kebugaran"
                    checked={formData.status_kebugaran === 'Fit for Duty'}
                    onChange={() => { }}
                    className="text-[#0a5c36] focus:ring-emerald-600"
                  />
                  <span>Fit for Duty</span>
                </label>
              </div>
            </div>
          </div>

          {/* ROW 4: Catatan Medis */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base pb-2 border-b border-slate-100">Catatan Medis</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Faktor Resiko</label>
                <textarea
                  rows={3}
                  placeholder="Masukkan faktor resiko kesehatan karyawan..."
                  value={formData.faktor_risiko}
                  onChange={(e) => setFormData({ ...formData, faktor_risiko: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#0a5c36] focus:bg-white transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-700">Penyakit</label>
                  <span className="text-[10px] font-bold text-emerald-800">Otomatis dari Hasil Pemeriksaan</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Hasil pemeriksaan diatas akan masuk ke dalam penyakit"
                  value={formData.penyakit_text}
                  onChange={(e) => setFormData({ ...formData, penyakit_text: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#0a5c36] focus:bg-white transition"
                />
                <span className="text-[10px] text-slate-400 font-medium mt-1 block">
                  *Hasil pemeriksaan diatas akan masuk ke dalam penyakit
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Diagnosa</label>
                <textarea
                  rows={3}
                  placeholder="Masukkan diagnosa dokter..."
                  value={formData.diagnosa}
                  onChange={(e) => setFormData({ ...formData, diagnosa: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#0a5c36] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tindak Lanjut</label>
                <textarea
                  rows={3}
                  placeholder="Masukkan tindak lanjut pengobatan..."
                  value={formData.tindak_lanjut}
                  onChange={(e) => setFormData({ ...formData, tindak_lanjut: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#0a5c36] focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          {/* ROW 5: Intervensi Layanan Kesehatan */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <ShieldCheck className="w-5 h-5 text-[#0a5c36]" />
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Intervensi Layanan Kesehatan</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Pilih program intervensi kesehatan yang diberikan kepada karyawan. Data terpilih akan mempengaruhi statistik Chart Intervensi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* 1. PROMOTIF & PREVENTIF */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200/70 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-[#0a5c36] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    <span>PROMOTIF &amp; PREVENTIF</span>
                  </span>
                </div>

                <div className="space-y-2">
                  {promotifOptions.map((opt) => {
                    const isChecked = selectedPromotif.includes(opt);
                    return (
                      <label
                        key={opt}
                        onClick={() => togglePromotif(opt)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${isChecked
                          ? 'bg-white border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                          : 'bg-white/80 border-slate-200/80 text-slate-700 hover:bg-white'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => { }}
                          className="rounded text-[#0a5c36]"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 2. KURATIF (DENGAN KONDISIONAL TANGGAL PEMERIKSAAN) */}
              <div className="p-4 bg-amber-50/50 border border-amber-200/70 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <Pill className="w-3.5 h-3.5 text-amber-200" />
                    <span>KURATIF</span>
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
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${isChecked
                          ? 'bg-white border-amber-400 text-amber-950 font-bold shadow-2xs'
                          : 'bg-white/80 border-slate-200/80 text-slate-700 hover:bg-white'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => { }}
                          className="rounded text-amber-700"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>

                {/* KONDISIONAL: Muncul saat Kuratif dipilih */}
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
                      className="w-full text-xs font-semibold bg-white border border-amber-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                    <input
                      type="text"
                      placeholder="Catatan konsultasi kuratif..."
                      value={formData.catatan_kuratif}
                      onChange={(e) => setFormData({ ...formData, catatan_kuratif: e.target.value })}
                      className="w-full text-xs bg-white border border-amber-300 rounded-xl px-3 py-1.5 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 3. REHABILITATIF (DENGAN KONDISIONAL TANGGAL & UPLOAD SURAT RUJUKAN) */}
              <div className="p-4 bg-purple-50/50 border border-purple-200/70 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                    <HeartPulse className="w-3.5 h-3.5 text-purple-200" />
                    <span>REHABILITATIF</span>
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
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${isChecked
                          ? 'bg-white border-purple-400 text-purple-950 font-bold shadow-2xs'
                          : 'bg-white/80 border-slate-200/80 text-slate-700 hover:bg-white'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => { }}
                          className="rounded text-purple-700"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>

                {/* KONDISIONAL: Muncul saat Rehabilitatif dipilih */}
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
                        className="w-full text-xs font-semibold bg-white border border-purple-300 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500/20"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-purple-900 mb-1">
                        <div className="flex items-center gap-1.5">
                          <Paperclip className="w-4 h-4 text-purple-700" />
                          <span>Upload Berkas Surat Rujukan *</span>
                        </div>
                        {fileRujukanSize && (
                          <span className="text-[10px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                            {fileRujukanSize}
                          </span>
                        )}
                      </div>

                      {formData.file_rujukan_name || fileRujukanUrl ? (
                        <div className="p-3 bg-purple-50/90 border-2 border-purple-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-purple-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs">
                              RUJ
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-purple-950 truncate">
                                {formData.file_rujukan_name || 'Surat_Rujukan.pdf'}
                              </p>
                              <p className="text-[10px] font-bold text-purple-700">
                                {fileRujukanSize ? `${fileRujukanSize} • ` : ''}Surat Rujukan Terlampir
                              </p>
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
                              title="Buka / Pratinjau Berkas"
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
                              title="Hapus / Ganti Berkas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative border-2 border-dashed border-purple-300 hover:border-purple-500 bg-white p-3 rounded-xl text-center cursor-pointer transition">
                          <input
                            ref={fileRujukanRef}
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
                            <span className="text-[10px] text-purple-400">Maksimal 20MB</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ROW 6: Upload Dokumen Lampiran MCU (Exact Big Dropzone from Design) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-[#0a5c36]" />
                <h3 className="font-extrabold text-slate-900 text-base">Upload Dokumen Lampiran MCU</h3>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                Opsional (Format: PDF, Word, Excel, Foto Scan)
              </span>
            </div>

            {formData.file_dokumen_name || fileDokumenUrl ? (
              <div className="p-4 bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs ${formData.file_dokumen_name.toLowerCase().endsWith('.xlsx') ||
                      formData.file_dokumen_name.toLowerCase().endsWith('.xls') ||
                      formData.file_dokumen_name.toLowerCase().endsWith('.csv')
                      ? 'bg-emerald-600'
                      : formData.file_dokumen_name.toLowerCase().endsWith('.pdf')
                        ? 'bg-rose-600'
                        : formData.file_dokumen_name.toLowerCase().endsWith('.png') ||
                          formData.file_dokumen_name.toLowerCase().endsWith('.jpg') ||
                          formData.file_dokumen_name.toLowerCase().endsWith('.jpeg') ||
                          formData.file_dokumen_name.toLowerCase().endsWith('.webp')
                          ? 'bg-sky-600'
                          : 'bg-[#0a5c36]'
                      }`}
                  >
                    {formData.file_dokumen_name.toLowerCase().endsWith('.xlsx') ||
                      formData.file_dokumen_name.toLowerCase().endsWith('.xls') ||
                      formData.file_dokumen_name.toLowerCase().endsWith('.csv') ? (
                      <FileSpreadsheet className="w-5 h-5" />
                    ) : formData.file_dokumen_name.toLowerCase().endsWith('.pdf') ? (
                      <FileText className="w-5 h-5" />
                    ) : formData.file_dokumen_name.toLowerCase().endsWith('.png') ||
                      formData.file_dokumen_name.toLowerCase().endsWith('.jpg') ||
                      formData.file_dokumen_name.toLowerCase().endsWith('.jpeg') ||
                      formData.file_dokumen_name.toLowerCase().endsWith('.webp') ? (
                      <ImageIcon className="w-5 h-5" />
                    ) : (
                      <Paperclip className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-slate-900 truncate">
                      {formData.file_dokumen_name || 'Laporan_Hasil_MCU.pdf'}
                    </p>
                    <p className="text-xs font-medium text-slate-500">
                      {fileDokumenSize ? `${fileDokumenSize} • ` : ''}Dokumen Berkas MCU Siap Disimpan
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setPreviewDocModal({
                        open: true,
                        title: 'Dokumen Lampiran Hasil MCU',
                        url: fileDokumenUrl,
                        fileName: formData.file_dokumen_name || 'Laporan_MCU.pdf',
                      })
                    }
                    className="px-3 py-2 bg-[#0a5c36] hover:bg-[#08482a] text-white font-bold text-xs rounded-xl shadow-2xs transition inline-flex items-center gap-1.5 cursor-pointer"
                    title="Buka / Pratinjau Berkas"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Buka Berkas</span>
                  </button>
                  {fileDokumenUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = fileDokumenUrl;
                        link.download = formData.file_dokumen_name || 'Dokumen_MCU';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="p-2 text-slate-600 hover:bg-emerald-100 rounded-xl transition cursor-pointer"
                      title="Unduh Berkas"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRemoveDokumen}
                    className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                    title="Hapus / Ganti Berkas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              /* Big Dropzone */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-[#0a5c36] bg-slate-50/70 hover:bg-emerald-50/20 p-8 rounded-2xl text-center space-y-2 cursor-pointer transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleDokumenUpload(file);
                  }}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#0a5c36] flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">
                  Klik di sini untuk memilih berkas dokumen MCU
                </p>
                <p className="text-xs text-slate-400 font-medium">
                  Dapat berupa berkas PDF hasil laboratorium, dokumen Excel/Word, atau foto/gambar scan (Maksimal 20MB)
                </p>
              </div>
            )}
          </div>

          {/* Bottom Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-[#0a5c36] hover:bg-[#08482a] text-white font-extrabold text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                  <span>Menyimpan ke Database Supabase...</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 text-emerald-200 rotate-180" />
                  <span>Simpan Data MCU (Admin)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Import Excel */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col my-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#0a5c36] flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">Impor Data MCU dari Excel (Admin)</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Otomatis memetakan kolom: <strong>Anjuran ➔ Tindak Lanjut</strong>, <strong>Diagnosa ➔ Diagnosa</strong>, dan <strong>Centang Checkbox ➔ Penyakit</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setSelectedImportFile(null);
                  setParsedRows([]);
                  setImportError(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <input
                id="admin-excel-file-input"
                type="file"
                ref={fileInputRef}
                onClick={(e) => {
                  (e.target as HTMLInputElement).value = '';
                }}
                onChange={handleFileSelect}
                className="hidden"
                accept=".xlsx,.xls,.csv"
              />

              {/* Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-6 sm:p-8 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center text-center cursor-pointer transition select-none ${isDragOver
                  ? 'border-emerald-600 bg-emerald-100/70 scale-[1.01]'
                  : selectedImportFile
                    ? 'border-emerald-500 bg-emerald-50/60'
                    : 'border-slate-300 hover:border-emerald-700 bg-slate-50 hover:bg-emerald-50/40'
                  }`}
              >
                {importLoading ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Loader2 className="w-9 h-9 text-emerald-800 animate-spin" />
                    <span className="text-xs font-bold text-slate-700">Membaca & memetakan kolom Excel...</span>
                  </div>
                ) : selectedImportFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
                      <FileCheck className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-900">{selectedImportFile.name}</span>
                    <span className="text-xs font-bold text-emerald-900 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
                      ✓ {parsedRows.length} data MCU karyawan siap diimpor
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                    >
                      Pilih file Excel lain
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-extrabold text-slate-800">Tarik berkas .xlsx ke sini atau klik untuk memilih</span>
                    <span className="text-xs text-slate-500 mt-1">Format: .xlsx / .xls / .csv (Maks. 20MB)</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-3 px-4 py-2 bg-[#0a5c36] hover:bg-[#08482a] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Pilih Berkas Spreadsheet</span>
                    </button>
                  </>
                )}
              </div>

              {/* Error Alert */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-xs text-rose-900 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Parsed Rows Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-800">
                      Pratinjau Data Terdeteksi ({parsedRows.length} Baris):
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      Semua penyakit centang, diagnosa, &amp; anjuran telah terpetakan
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                    <table className="w-full text-[11px] text-left border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5 border-b border-slate-200">Nama &amp; NIK</th>
                          <th className="p-2.5 border-b border-slate-200">No. Inhealth &amp; BPJS</th>
                          <th className="p-2.5 border-b border-slate-200">Entitas &amp; Divisi</th>
                          <th className="p-2.5 border-b border-slate-200">Tgl Periksa</th>
                          <th className="p-2.5 border-b border-slate-200">Penyakit (Centang)</th>
                          <th className="p-2.5 border-b border-slate-200">Diagnosa</th>
                          <th className="p-2.5 border-b border-slate-200">Tindak Lanjut (Anjuran)</th>
                          <th className="p-2.5 border-b border-slate-200">Kesimpulan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {parsedRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/80">
                            <td className="p-2.5 font-bold text-slate-900">
                              <div>{row.nama_karyawan}</div>
                              <div className="text-[10px] font-mono text-slate-400">{row.nik}</div>
                            </td>
                            <td className="p-2.5">
                              <div className="space-y-0.5">
                                <div className="text-[11px] font-mono font-bold text-slate-800">
                                  {row.nomor_inhealth && row.nomor_inhealth !== 'Tidak memiliki nomor inhealth' ? (
                                    <span className="text-emerald-800">IH: {row.nomor_inhealth}</span>
                                  ) : (
                                    <span className="text-slate-400 italic">Tidak memiliki nomor inhealth</span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                  {row.nomor_bpjs && row.nomor_bpjs !== 'Tidak memiliki BPJS' ? (
                                    <span>BPJS: {row.nomor_bpjs}</span>
                                  ) : (
                                    <span className="text-slate-400 italic">Tidak memiliki BPJS</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-2.5">
                              <div>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-block mb-0.5">
                                  {row.entitas || row.departemen || 'PTPN 3'}
                                </span>
                              </div>
                              <div className="text-slate-700 font-medium">{row.divisi}</div>
                            </td>
                            <td className="p-2.5 font-mono text-xs font-bold text-emerald-900 bg-emerald-50/50">
                              {row.tanggal_pemeriksaan}
                            </td>
                            <td className="p-2.5">
                              {row.penyakit.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {row.penyakit.map((p, pIdx) => (
                                    <span
                                      key={pIdx}
                                      className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-semibold"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Tidak memiliki penyakit</span>
                              )}
                            </td>
                            <td className="p-2.5 font-medium text-slate-800 max-w-[130px] truncate" title={row.diagnosa}>
                              {row.diagnosa || 'Tidak memiliki diagnosa'}
                            </td>
                            <td className="p-2.5 font-medium text-slate-800 max-w-[150px] truncate" title={row.tindak_lanjut}>
                              {row.tindak_lanjut || 'Tidak memiliki anjuran'}
                            </td>
                            <td className="p-2.5 font-bold">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] ${row.status_kebugaran === 'Fit for Duty'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : row.status_kebugaran === 'Sementara Tidak Fit'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                  }`}
                              >
                                {row.status_kebugaran}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => downloadMcuExcelTemplate()}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Format Template Excel (.xlsx)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setSelectedImportFile(null);
                    setParsedRows([]);
                    setImportError(null);
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={parsedRows.length === 0 || isProcessingImport}
                  onClick={handleExecuteImport}
                  className="px-4 py-2.5 bg-[#0a5c36] hover:bg-[#08482a] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-2 active:scale-98"
                >
                  {isProcessingImport ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Mengimpor {parsedRows.length} Data...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Mulai Impor ({parsedRows.length} Data)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
