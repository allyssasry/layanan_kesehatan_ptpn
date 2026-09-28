'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { DocumentPreviewModal } from '@/components/common/DocumentPreviewModal';
import { generateSuratRujukanDataUrl } from '@/utils/rujukanGenerator';
import { useMcu } from '@/context/McuContext';
import { FitnessStatus } from '@/types/mcu';
import { autoFillKaryawan, EmployeeProfile } from '@/services/mcuService';
import { ParticipantSearchInput } from '@/components/common/ParticipantSearchInput';
import { getWIBTime, getWIBDate } from '@/lib/dateUtils';
import {
  Upload,
  User,
  Activity,
  X,
  CheckCircle,
  Calendar,
  Clock,
  Pill,
  Heart,
  Stethoscope,
  Building2,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Download,
  Briefcase,
  GraduationCap,
  ChevronDown,
  Info,
  Search,
  ShieldCheck,
  Sparkles,
  HeartPulse,
  Paperclip,
  Loader2,
  Eye,
  Image as ImageIcon,
  ArrowLeft,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { uploadMedicalFile } from '@/lib/upload';
import { DivisiSelectInput } from '@/components/common/DivisiSelectInput';
import { normalizeDivisiName } from '@/lib/divisiMaster';

/**
 * Helper function to safely parse any date string/format into standard YYYY-MM-DD
 * required by HTML5 date inputs (<input type="date" />).
 */
const parseDateToInput = (dateVal: any): string => {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  // If already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // If starts with YYYY-MM-DD (ISO format)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  // Try parsing date instance
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return str;
};

/**
 * Extracts intervention date from intervensi string/array (e.g. "Kuratif (Tgl: 2026-09-16)...")
 */
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

function EditMiniMcuContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { miniMcuRecords, mcuRecords, updateMiniMcuRecord, updateMcuRecord, isLoading } = useMcu();

  const idParam = params?.id || searchParams?.get('id');
  const recordId = idParam ? Number(idParam) : null;

  const targetRecord = useMemo(() => {
    if (!recordId) return null;
    return (
      miniMcuRecords.find((r) => r.id === recordId) ||
      mcuRecords.find((r) => r.id === recordId) ||
      null
    );
  }, [miniMcuRecords, mcuRecords, recordId]);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileRujukanRef = useRef<HTMLInputElement>(null);
  const fileSuratSakitRef = useRef<HTMLInputElement>(null);

  // File URL & details for Surat Sakit and Surat Rujukan
  const [fileSuratSakitUrl, setFileSuratSakitUrl] = useState<string | null>(null);
  const [fileSuratSakitSize, setFileSuratSakitSize] = useState<string>('');
  const [fileRujukanUrl, setFileRujukanUrl] = useState<string | null>(null);
  const [fileRujukanSize, setFileRujukanSize] = useState<string>('');

  // Auto/Live WIB Time State (Default false in Edit Mode to preserve historical time)
  const [isTimeAuto, setIsTimeAuto] = useState(false);

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

    // Vitals & Lab
    golongan_darah: '',
    tinggi_badan: '',
    berat_badan: '',
    tensi: '120/80',
    gula_darah: '110',
    suhu: '36.5',
    kolesterol: '190',
    asam_urat: '6.0',

    // Tim Medis
    dokter: '',
    perawat: '',

    // Kesimpulan Akhir
    status_kebugaran: 'Fit for Duty' as FitnessStatus,
    file_surat_sakit_name: '',

    // Catatan Medis
    keluhan_anamnesa: '',
    faktor_risiko: '',
    penyakit_text: '',
    diagnosa: '',
    tindak_lanjut: '',

    // Intervensi Kondisional
    tanggal_kuratif: getWIBDate(),
    catatan_kuratif: '',
    tanggal_rehabilitatif: getWIBDate(),
    catatan_rehabilitatif: '',

    // Rujukan
    nama_poli_rujukan: '',
    rumah_sakit_rujukan: '',
    file_rujukan_name: '',
  });

  // Selected Diagnosa/Penyakit Checklist
  const [selectedPenyakit, setSelectedPenyakit] = useState<string[]>([]);

  // Selected Drugs / Resep Obat (Multi-select)
  const [selectedObat, setSelectedObat] = useState<string[]>([]);
  const [obatSearch, setObatSearch] = useState('');
  const [showObatSuggestions, setShowObatSuggestions] = useState(false);

  // Selected Interventions
  const [selectedPromotif, setSelectedPromotif] = useState<string[]>([]);
  const [selectedKuratif, setSelectedKuratif] = useState<string[]>([]);
  const [selectedRehabilitatif, setSelectedRehabilitatif] = useState<string[]>([]);

  // Preview Modal
  const [previewDocModal, setPreviewDocModal] = useState<{
    open: boolean;
    title: string;
    url: string | null;
    fileName: string;
    isImage: boolean;
  }>({
    open: false,
    title: '',
    url: null,
    fileName: '',
    isImage: false,
  });

  // Master Lists - Exact 3 Columns from design
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

  const masterObatList = [
    'Paracetamol 500mg',
    'Amoxicillin 500mg',
    'Antasida Doen Tab',
    'Captopril 25mg',
    'Amlodipine 5mg',
    'Amlodipine 10mg',
    'Metformin 500mg',
    'Simvastatin 20mg',
    'Allopurinol 100mg',
    'Omeprazole 20mg',
    'Ibuprofen 400mg',
    'Vitamin C 500mg',
    'Vitamin B Complex',
    'Cetirizine 10mg',
    'Dexamethasone 0.5mg',
    'Ranitidine 150mg',
    'Oralit Sachet',
    'Neurobion Forte',
  ];

  // Ref to track which record has been prefilled so user edits (like changing dates back/forth) won't get overridden by re-render
  const loadedRecordIdRef = useRef<number | null>(null);

  // Populate from record
  useEffect(() => {
    if (targetRecord && loadedRecordIdRef.current !== targetRecord.id) {
      loadedRecordIdRef.current = targetRecord.id;
      const rec: any = targetRecord;
      const vit = rec.vitals || {};

      const isMagang =
        rec.kategori_peserta === 'Magang' ||
        rec.nik === '0000000000' ||
        (rec.jabatan && String(rec.jabatan).toLowerCase().includes('magang'));
      setPesertaType(isMagang ? 'Anak Magang' : 'Karyawan');

      const existingDate =
        parseDateToInput(rec.tanggal_pemeriksaan || rec.tanggal_kunjungan) || getWIBDate();
      const existingTime = rec.jam_pemeriksaan || rec.jam_periksa || getWIBTime();

      const kuratifDate =
        parseDateToInput(rec.tanggal_kuratif) ||
        extractDateFromIntervensi(rec.intervensi, 'kuratif') ||
        parseDateToInput(rec.tanggal_pemeriksaan_lanjutan) ||
        existingDate;

      const rehabilitatifDate =
        parseDateToInput(rec.tanggal_rehabilitatif) ||
        extractDateFromIntervensi(rec.intervensi, 'rehabilitatif') ||
        parseDateToInput(rec.tanggal_pemeriksaan_lanjutan) ||
        existingDate;

      // Status Kebugaran
      let fitStatus: FitnessStatus = 'Fit for Duty';
      if (rec.status_kebugaran) {
        fitStatus = rec.status_kebugaran;
      } else if (rec.kesimpulan === 'sementara_tidak_fit') {
        fitStatus = 'Sementara Tidak Fit';
      } else if (rec.kesimpulan === 'fit_dengan_catatan') {
        fitStatus = 'Fit dengan Catatan';
      }

      setFormData({
        entitas: rec.departemen || rec.entitas || 'PTPN 3',
        nama_karyawan: rec.nama_lengkap || rec.nama_karyawan || '',
        nik: rec.nik || '',
        divisi: rec.divisi || '',
        jabatan: rec.jabatan || '',
        nomor_inhealth: rec.nomor_inhealth || (rec as any).nomor_pegawai || (rec as any).inhealth || '',
        bpjs: rec.nomor_bpjs || rec.bpjs || '',
        gender: rec.jenis_kelamin || rec.gender || 'Laki-laki',
        umur: String(rec.umur || 35),
        tanggal_pemeriksaan: existingDate,
        jam_periksa: existingTime,

        golongan_darah: rec.golongan_darah || '',
        tinggi_badan: String(rec.tinggi_badan || vit.tinggi_badan || ''),
        berat_badan: String(rec.berat_badan || vit.berat_badan || ''),
        tensi: rec.tensi || vit.tensi || '120/80',
        gula_darah: String(rec.gula_darah || vit.gula_darah || '110'),
        suhu: String(rec.suhu || vit.suhu || '36.5'),
        kolesterol: String(rec.kolesterol || vit.kolesterol || '190'),
        asam_urat: String(rec.asam_urat || vit.asam_urat || '6.0'),

        dokter: rec.dokter_pemeriksa || rec.dokter || rec.nama_dokter || '',
        perawat: rec.perawat || rec.nama_perawat || '',

        status_kebugaran: fitStatus,
        file_surat_sakit_name: rec.nama_surat_sakit || (rec.file_surat_sakit ? 'Surat_Sakit.pdf' : ''),

        keluhan_anamnesa: rec.keluhan_anamnesa || rec.keluhan || rec.keluhan_harian || '',
        faktor_risiko: rec.faktor_risiko || '',
        penyakit_text: rec.penyakit_text || '',
        diagnosa: rec.diagnosa || rec.diagnosa_klinik || '',
        tindak_lanjut: rec.tindak_lanjut || rec.tindakan_terapi || '',

        tanggal_kuratif: kuratifDate,
        catatan_kuratif: rec.catatan_intervensi_kuratif || rec.catatan_kuratif || '',
        tanggal_rehabilitatif: rehabilitatifDate,
        catatan_rehabilitatif: rec.catatan_intervensi_rehabilitatif || rec.catatan_rehabilitatif || '',

        nama_poli_rujukan: rec.nama_poli_rujukan || rec.nama_poli || '',
        rumah_sakit_rujukan: rec.rumah_sakit_rujukan || rec.nama_rs || '',
        file_rujukan_name:
          rec.nama_rujukan_file ||
          rec.nama_surat_rujukan_intervensi ||
          (rec.file_rujukan || rec.file_surat_rujukan_intervensi ? 'Surat_Rujukan.pdf' : ''),
      });

      if (rec.foto) {
        setPhotoPreview(rec.foto);
      }
      if (rec.file_surat_sakit) {
        setFileSuratSakitUrl(rec.file_surat_sakit);
      }
      if (rec.file_rujukan || rec.file_surat_rujukan_intervensi) {
        setFileRujukanUrl(rec.file_rujukan || rec.file_surat_rujukan_intervensi);
      }

      // Penyakit List
      const pList = Array.isArray(rec.penyakit_list)
        ? rec.penyakit_list
        : Array.isArray(rec.penyakit)
          ? rec.penyakit
          : [];
      setSelectedPenyakit(pList.filter((p: string) => p !== 'Kondisi Fisik Baik'));

      // Obat List
      const oList = Array.isArray(rec.obat)
        ? rec.obat
        : Array.isArray(rec.obat_list)
          ? rec.obat_list
          : [];
      setSelectedObat(oList);

      // Intervensi parsing
      const iList: string[] = Array.isArray(rec.intervensi)
        ? rec.intervensi
        : typeof rec.intervensi === 'string'
          ? rec.intervensi.split(/[,|]/).map((s: string) => s.trim()).filter(Boolean)
          : [];

      const matchedPromotif: string[] = [];
      const matchedKuratif: string[] = [];
      const matchedRehabilitatif: string[] = [];

      iList.forEach((item) => {
        const lower = item.toLowerCase();
        promotifOptions.forEach((opt) => {
          if (lower.includes(opt.toLowerCase()) && !matchedPromotif.includes(opt)) {
            matchedPromotif.push(opt);
          }
        });
        kuratifOptions.forEach((opt) => {
          if (lower.includes(opt.toLowerCase()) && !matchedKuratif.includes(opt)) {
            matchedKuratif.push(opt);
          }
        });
        rehabilitatifOptions.forEach((opt) => {
          if (
            (lower.includes(opt.toLowerCase()) || lower.includes('dokter ahli') || lower.includes('rehabilitatif')) &&
            !matchedRehabilitatif.includes(opt)
          ) {
            matchedRehabilitatif.push(opt);
          }
        });
      });

      setSelectedPromotif(matchedPromotif);
      setSelectedKuratif(matchedKuratif);
      setSelectedRehabilitatif(matchedRehabilitatif);
    }
  }, [targetRecord]);

  // Optional live clock updates if isTimeAuto is toggled on by user
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

  const handlePhotoUpload = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPhotoPreview(dataUrl);
    };
    reader.readAsDataURL(file);

    uploadMedicalFile(file, 'fotos')
      .then((res) => {
        if (res && res.publicUrl) {
          setPhotoPreview(res.publicUrl);
        }
      })
      .catch((err) => {
        console.warn('Storage upload note:', err);
      });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSuratSakitUpload = (file: File) => {
    if (!file) return;
    setFormData((prev) => ({ ...prev, file_surat_sakit_name: file.name }));
    setFileSuratSakitSize(formatFileSize(file.size));
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileSuratSakitUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSuratSakit = () => {
    setFormData((prev) => ({ ...prev, file_surat_sakit_name: '' }));
    setFileSuratSakitUrl(null);
    setFileSuratSakitSize('');
    if (fileSuratSakitRef.current) fileSuratSakitRef.current.value = '';
  };

  const handleSuratRujukanUpload = (file: File) => {
    if (!file) return;
    setFormData((prev) => ({ ...prev, file_rujukan_name: file.name }));
    setFileRujukanSize(formatFileSize(file.size));
    const reader = new FileReader();
    reader.onload = (e) => {
      setFileRujukanUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSuratRujukan = () => {
    setFormData((prev) => ({
      ...prev,
      file_rujukan_name: '',
      nama_poli_rujukan: '',
      rumah_sakit_rujukan: '',
    }));
    setFileRujukanUrl(null);
    setFileRujukanSize('');
    if (fileRujukanRef.current) fileRujukanRef.current.value = '';
  };

  const openDocPreview = (title: string, url: string | null, fileName: string) => {
    let finalUrl = url;
    const isRealBinary = Boolean(
      finalUrl &&
        (finalUrl.startsWith('data:') ||
          finalUrl.startsWith('http://') ||
          finalUrl.startsWith('https://') ||
          finalUrl.startsWith('blob:') ||
          finalUrl.startsWith('/'))
    );

    if (!isRealBinary && title.toLowerCase().includes('rujukan')) {
      finalUrl = generateSuratRujukanDataUrl({
        id: recordId || 'EDIT',
        nama_lengkap: formData.nama_karyawan,
        nik: formData.nik,
        divisi: formData.divisi,
        entitas: formData.entitas,
        jabatan: formData.jabatan,
        nomor_inhealth: formData.nomor_inhealth,
        nomor_bpjs: formData.bpjs,
        umur: formData.umur,
        tanggal_pemeriksaan: formData.tanggal_pemeriksaan,
        tanggal_pemeriksaan_lanjutan:
          formData.tanggal_rehabilitatif || formData.tanggal_kuratif || formData.tanggal_pemeriksaan,
        rumah_sakit_rujukan: formData.rumah_sakit_rujukan || 'Rumah Sakit Rujukan PTPN',
        nama_poli_rujukan: formData.nama_poli_rujukan || 'Poli Spesialis Rujukan Medis',
        dokter_pemeriksa: formData.dokter || 'dr. Maya Andriana, Sp.Ok',
        diagnosa: formData.diagnosa || formData.penyakit_text || 'Pemeriksaan Lanjutan & Evaluasi Medis',
        catatan_intervensi: formData.catatan_rehabilitatif || formData.catatan_kuratif || formData.tindak_lanjut,
        intervensi:
          selectedRehabilitatif.length > 0
            ? selectedRehabilitatif
            : ['Monitoring Hasil Tindak Lanjut oleh Dokter Ahli'],
        tensi: formData.tensi,
        gula_darah: formData.gula_darah,
        kolesterol: formData.kolesterol,
        file_surat_rujukan_intervensi: fileName || formData.file_rujukan_name || 'Surat_Rujukan_Klinik.pdf',
      });
      setFileRujukanUrl(finalUrl);
    }

    setPreviewDocModal({
      open: true,
      title,
      url: finalUrl,
      fileName:
        fileName ||
        (title.toLowerCase().includes('rujukan')
          ? `Surat_Rujukan_${formData.nama_karyawan ? formData.nama_karyawan.replace(/\s+/g, '_') : 'Pasien'}.svg`
          : 'Dokumen_Medis'),
      isImage: false,
    });
  };

  const downloadDocFile = (url: string | null, fileName: string) => {
    let targetUrl = url;
    if (
      !targetUrl ||
      (!targetUrl.startsWith('data:') &&
        !targetUrl.startsWith('http://') &&
        !targetUrl.startsWith('https://') &&
        !targetUrl.startsWith('blob:') &&
        !targetUrl.startsWith('/'))
    ) {
      if (fileName.toLowerCase().includes('rujukan') || fileName.toLowerCase().includes('surat')) {
        targetUrl = generateSuratRujukanDataUrl({
          id: recordId || 'EDIT',
          nama_lengkap: formData.nama_karyawan,
          nik: formData.nik,
          divisi: formData.divisi,
          entitas: formData.entitas,
          jabatan: formData.jabatan,
          nomor_inhealth: formData.nomor_inhealth,
          nomor_bpjs: formData.bpjs,
          umur: formData.umur,
          tanggal_pemeriksaan: formData.tanggal_pemeriksaan,
          tanggal_pemeriksaan_lanjutan:
            formData.tanggal_rehabilitatif || formData.tanggal_kuratif || formData.tanggal_pemeriksaan,
          rumah_sakit_rujukan: formData.rumah_sakit_rujukan || 'Rumah Sakit Rujukan PTPN',
          nama_poli_rujukan: formData.nama_poli_rujukan || 'Poli Spesialis Rujukan Medis',
          dokter_pemeriksa: formData.dokter || 'dr. Maya Andriana, Sp.Ok',
          diagnosa: formData.diagnosa || formData.penyakit_text || 'Pemeriksaan Lanjutan & Evaluasi Medis',
          catatan_intervensi: formData.catatan_rehabilitatif || formData.catatan_kuratif || formData.tindak_lanjut,
          intervensi:
            selectedRehabilitatif.length > 0
              ? selectedRehabilitatif
              : ['Monitoring Hasil Tindak Lanjut oleh Dokter Ahli'],
          tensi: formData.tensi,
          gula_darah: formData.gula_darah,
          kolesterol: formData.kolesterol,
          file_surat_rujukan_intervensi: fileName || formData.file_rujukan_name || 'Surat_Rujukan_Klinik.pdf',
        });
        setFileRujukanUrl(targetUrl);
      } else {
        alert('Berkas belum memiliki data biner fisik untuk diunduh.');
        return;
      }
    }
    const link = document.createElement('a');
    link.href = targetUrl;
    link.download = fileName || 'Dokumen_Medis';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredObatSuggestions = useMemo(() => {
    if (!obatSearch.trim()) return masterObatList.filter((o) => !selectedObat.includes(o));
    return masterObatList.filter(
      (o) => o.toLowerCase().includes(obatSearch.toLowerCase().trim()) && !selectedObat.includes(o)
    );
  }, [obatSearch, selectedObat]);

  const tinggiM = (parseFloat(formData.tinggi_badan) || 0) / 100;
  const beratKg = parseFloat(formData.berat_badan) || 0;
  const bmiVal = tinggiM > 0 && beratKg > 0 ? Number((beratKg / (tinggiM * tinggiM)).toFixed(1)) : 0;

  const getBmiDetails = (bmi: number) => {
    if (bmi <= 0) return { label: 'Belum Terhitung', color: 'bg-slate-100 text-slate-700 border-slate-300' };
    if (bmi < 18.5) return { label: 'Underweight', color: 'bg-sky-100 text-sky-800 border-sky-300' };
    if (bmi <= 24.9) return { label: 'Normal', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (bmi <= 26.9) return { label: 'Overweight', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    if (bmi <= 29.9) return { label: 'Obesitas I', color: 'bg-rose-100 text-rose-800 border-rose-300' };
    return { label: 'Obesitas II', color: 'bg-rose-200 text-rose-900 border-rose-400' };
  };
  const bmiDetails = getBmiDetails(bmiVal);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'jam_periksa') {
      setIsTimeAuto(false);
    }
    if (name === 'bpjs' || name === 'nomor_bpjs' || name === 'nomor_inhealth' || name === 'inhealth') {
      const cleanVal = value.replace(/\D/g, '');
      setFormData((prev) => ({ ...prev, [name]: cleanVal }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectPesertaType = (type: 'Karyawan' | 'Anak Magang') => {
    setPesertaType(type);
    if (type === 'Anak Magang') {
      setFormData((prev) => ({
        ...prev,
        nik: '0000000000',
        jabatan: prev.jabatan && prev.jabatan !== 'Staf' ? prev.jabatan : 'Anak Magang',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        nik: prev.nik === '0000000000' ? '' : prev.nik,
        jabatan: prev.jabatan === 'Anak Magang' ? '' : prev.jabatan,
      }));
    }
  };

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
      gender:
        profile.jenis_kelamin === 'P' ||
        profile.jenis_kelamin === 'Perempuan' ||
        profile.gender === 'P' ||
        profile.gender === 'Perempuan'
          ? 'Perempuan'
          : 'Laki-laki',
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

  const handleNikBlur = async () => {
    if (!formData.nik.trim()) return;
    try {
      const data: any = await autoFillKaryawan(formData.nik.trim());
      if (data) {
        handleSelectEmployee(data);
      }
    } catch (err) {
      console.error('Error autofill karyawan:', err);
    }
  };

  const togglePenyakit = (item: string) => {
    setSelectedPenyakit((prev) => {
      const updated = prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item];
      setFormData((f) => ({ ...f, penyakit_text: updated.join(', ') }));
      return updated;
    });
  };

  const handleSapuBersihPenyakit = () => {
    setSelectedPenyakit([]);
    setFormData((prev) => ({ ...prev, penyakit_text: '' }));
  };

  const handleAddObat = (obatName: string) => {
    const trimmed = obatName.trim();
    if (!trimmed) return;
    if (!selectedObat.includes(trimmed)) {
      setSelectedObat((prev) => [...prev, trimmed]);
    }
    setObatSearch('');
    setShowObatSuggestions(false);
  };

  const handleRemoveObat = (obatName: string) => {
    setSelectedObat((prev) => prev.filter((o) => o !== obatName));
  };

  const togglePromotif = (item: string) => {
    setSelectedPromotif((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]
    );
  };

  const toggleKuratif = (item: string) => {
    setSelectedKuratif((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]
    );
  };

  const toggleRehabilitatif = (item: string) => {
    setSelectedRehabilitatif((prev) =>
      prev.includes(item) ? prev.filter((p) => p !== item) : [...prev, item]
    );
  };

  const isKuratifActive = selectedKuratif.length > 0;
  const isRehabilitatifActive = selectedRehabilitatif.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordId) return;
    setSubmitting(true);

    const intervensiParts: string[] = [];
    if (selectedPromotif.length > 0) {
      intervensiParts.push(`Promotif: ${selectedPromotif.join(', ')}`);
    }
    if (selectedKuratif.length > 0) {
      intervensiParts.push(
        `Kuratif (Tgl: ${formData.tanggal_kuratif}): ${selectedKuratif.join(', ')}${
          formData.catatan_kuratif ? ` - ${formData.catatan_kuratif}` : ''
        }`
      );
    }
    if (selectedRehabilitatif.length > 0) {
      intervensiParts.push(
        `Rehabilitatif (Tgl: ${formData.tanggal_rehabilitatif}): ${selectedRehabilitatif.join(', ')}${
          formData.file_rujukan_name ? ` [Rujukan: ${formData.file_rujukan_name}]` : ''
        }`
      );
    }

    const combinedIntervensi: string[] = [
      ...selectedPromotif,
      ...selectedKuratif,
      ...selectedRehabilitatif,
    ];

    const tensiParts = String(formData.tensi || '120/80').split('/');
    const sis = parseInt(tensiParts[0], 10) || 120;
    const dia = parseInt(tensiParts[1], 10) || 80;

    const tanggalLanjutan =
      (isKuratifActive && formData.tanggal_kuratif) ||
      (isRehabilitatifActive && formData.tanggal_rehabilitatif) ||
      null;

    let finalFileRujukan = fileRujukanUrl;
    let finalNamaRujukan = formData.file_rujukan_name;

    if (
      !finalFileRujukan &&
      (formData.nama_poli_rujukan ||
        formData.rumah_sakit_rujukan ||
        isRehabilitatifActive ||
        formData.file_rujukan_name)
    ) {
      finalFileRujukan = generateSuratRujukanDataUrl({
        id: recordId,
        nama_lengkap: formData.nama_karyawan,
        nik: formData.nik,
        divisi: formData.divisi,
        entitas: formData.entitas,
        jabatan: formData.jabatan,
        nomor_inhealth: formData.nomor_inhealth,
        nomor_bpjs: formData.bpjs,
        umur: formData.umur,
        tanggal_pemeriksaan: formData.tanggal_pemeriksaan,
        tanggal_pemeriksaan_lanjutan:
          formData.tanggal_rehabilitatif || formData.tanggal_kuratif || formData.tanggal_pemeriksaan,
        rumah_sakit_rujukan: formData.rumah_sakit_rujukan || 'Rumah Sakit Rujukan PTPN',
        nama_poli_rujukan: formData.nama_poli_rujukan || 'Poli Spesialis Rujukan Medis',
        dokter_pemeriksa: formData.dokter || 'dr. Maya Andriana, Sp.Ok',
        diagnosa: formData.diagnosa || formData.penyakit_text || 'Pemeriksaan Lanjutan & Evaluasi Medis',
        catatan_intervensi: formData.catatan_rehabilitatif || formData.catatan_kuratif || formData.tindak_lanjut,
        intervensi:
          selectedRehabilitatif.length > 0
            ? selectedRehabilitatif
            : ['Monitoring Hasil Tindak Lanjut oleh Dokter Ahli'],
        tensi: formData.tensi,
        gula_darah: formData.gula_darah,
        kolesterol: formData.kolesterol,
        file_surat_rujukan_intervensi: formData.file_rujukan_name || 'Surat_Rujukan_Klinik.pdf',
      });
      if (!finalNamaRujukan) {
        finalNamaRujukan = `Surat_Rujukan_${
          formData.nama_karyawan ? formData.nama_karyawan.replace(/\s+/g, '_') : 'Pasien'
        }.svg`;
      }
    }

    // Explicitly preserve and record whatever date user specifies (whether advanced forward or moved back)
    const activeExamDate = formData.tanggal_pemeriksaan || getWIBDate();

    const updatedPayload = {
      nama_karyawan: formData.nama_karyawan.trim() || 'Karyawan PTPN',
      nama_lengkap: formData.nama_karyawan.trim() || 'Karyawan PTPN',
      nik: formData.nik.trim(),
      jabatan: formData.jabatan || 'Staf Operasional',
      departemen: formData.entitas || 'PTPN 3',
      divisi:
        normalizeDivisiName(formData.divisi) ||
        (formData.divisi?.trim() ? formData.divisi.trim() : '-'),
      kategori_peserta: (pesertaType === 'Anak Magang' ? 'Magang' : 'Tetap') as any,
      nomor_inhealth: formData.nomor_inhealth || null,
      nomor_bpjs: formData.bpjs || null,
      bpjs: formData.bpjs || null,
      jenis_kelamin: formData.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
      umur: Number(formData.umur) || 35,
      golongan_darah: formData.golongan_darah || null,
      tanggal_kunjungan: activeExamDate,
      tanggal_pemeriksaan: activeExamDate,
      jam_pemeriksaan: formData.jam_periksa,
      nama_poli: formData.nama_poli_rujukan.trim() ? formData.nama_poli_rujukan.trim() : null,
      dokter_pemeriksa: formData.dokter.trim() || null,
      dokter: formData.dokter.trim() || null,
      perawat: formData.perawat.trim() || null,
      nama_dokter: formData.dokter.trim() || null,
      nama_perawat: formData.perawat.trim() || null,
      nama_rs: formData.rumah_sakit_rujukan.trim() ? formData.rumah_sakit_rujukan.trim() : null,
      status_kebugaran: formData.status_kebugaran,
      kesimpulan:
        formData.status_kebugaran === 'Fit for Duty'
          ? 'fit'
          : formData.status_kebugaran === 'Sementara Tidak Fit'
            ? 'sementara_tidak_fit'
            : 'fit_dengan_catatan',
      tinggi_badan: parseFloat(formData.tinggi_badan) || undefined,
      berat_badan: parseFloat(formData.berat_badan) || undefined,
      bmi: bmiVal > 0 ? bmiVal : undefined,
      tensi: formData.tensi || `${sis}/${dia}`,
      gula_darah: String(formData.gula_darah || '110'),
      suhu: String(formData.suhu || '36.5'),
      kolesterol: String(formData.kolesterol || '190'),
      asam_urat: String(formData.asam_urat || '6.0'),
      vitals: {
        tensi_sistolik: sis,
        tensi_diastolik: dia,
        tensi: `${sis}/${dia}`,
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
      keluhan_harian:
        formData.keluhan_anamnesa.trim() ||
        (formData.diagnosa.trim() && formData.diagnosa.trim() !== 'Tidak memiliki diagnosa'
          ? formData.diagnosa.trim()
          : 'Tidak memiliki keluhan'),
      keluhan:
        formData.keluhan_anamnesa.trim() ||
        (formData.diagnosa.trim() && formData.diagnosa.trim() !== 'Tidak memiliki diagnosa'
          ? formData.diagnosa.trim()
          : 'Tidak memiliki keluhan'),
      faktor_risiko: formData.faktor_risiko.trim() || 'Tidak memiliki faktor risiko',
      penyakit_text:
        formData.penyakit_text.trim() ||
        (selectedPenyakit.length > 0 ? selectedPenyakit.join(', ') : 'Tidak memiliki penyakit'),
      penyakit: selectedPenyakit.length > 0 ? selectedPenyakit : [],
      penyakit_list: selectedPenyakit.length > 0 ? selectedPenyakit : [],
      diagnosa_klinik: formData.diagnosa.trim() || 'Tidak memiliki diagnosa',
      diagnosa: formData.diagnosa.trim() || 'Tidak memiliki diagnosa',
      tindakan_terapi: formData.tindak_lanjut.trim() || 'Tidak memiliki tindak lanjut',
      tindak_lanjut: formData.tindak_lanjut.trim() || 'Tidak memiliki tindak lanjut',
      obat: selectedObat.length > 0 ? selectedObat : ['Paracetamol 500mg'],
      obat_list: selectedObat.length > 0 ? selectedObat : ['Paracetamol 500mg'],
      intervensi: intervensiParts.length > 0 ? intervensiParts : combinedIntervensi,
      tanggal_pemeriksaan_lanjutan: tanggalLanjutan,
      foto: photoPreview || (targetRecord as any)?.foto || null,
      file_dokumen: (targetRecord as any)?.file_dokumen || null,
      nama_dokumen: (targetRecord as any)?.nama_dokumen || null,
      file_surat_sakit:
        formData.status_kebugaran === 'Sementara Tidak Fit'
          ? fileSuratSakitUrl || formData.file_surat_sakit_name || (targetRecord as any)?.file_surat_sakit || null
          : null,
      nama_surat_sakit:
        formData.status_kebugaran === 'Sementara Tidak Fit'
          ? formData.file_surat_sakit_name || (targetRecord as any)?.nama_surat_sakit || null
          : null,
      file_rujukan: finalFileRujukan || (targetRecord as any)?.file_rujukan || null,
      nama_rujukan_file: finalNamaRujukan || (targetRecord as any)?.nama_rujukan_file || null,
      file_surat_rujukan_intervensi:
        finalFileRujukan || (targetRecord as any)?.file_surat_rujukan_intervensi || null,
      nama_surat_rujukan_intervensi:
        finalNamaRujukan || (targetRecord as any)?.nama_surat_rujukan_intervensi || null,
      catatan_intervensi_kuratif: isKuratifActive ? formData.catatan_kuratif : null,
      catatan_intervensi_rehabilitatif: isRehabilitatifActive ? formData.catatan_rehabilitatif : null,
      tanggal_kuratif: isKuratifActive ? formData.tanggal_kuratif : null,
      tanggal_rehabilitatif: isRehabilitatifActive ? formData.tanggal_rehabilitatif : null,
      butuh_tindak_lanjut: isKuratifActive || isRehabilitatifActive,
    };

    try {
      await updateMiniMcuRecord(recordId, updatedPayload as any);
      if (mcuRecords.some((r) => r.id === recordId)) {
        await updateMcuRecord(recordId, updatedPayload as any);
      }
      setSuccessMessage('Data pemeriksaan Mini MCU (Klinik) berhasil diperbarui! Mengalihkan...');
      setTimeout(() => {
        router.push(`/klinik/detail-mini-mcu?id=${recordId}`);
      }, 900);
    } catch (err: any) {
      alert('Gagal memperbarui data: ' + (err.message || 'Error server'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading && !targetRecord) {
    return (
      <AppLayout role="klinik" active="create">
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-emerald-800 animate-spin mx-auto mb-3" />
          <p className="text-slate-600 font-bold text-xs">Memuat data pemeriksaan...</p>
        </div>
      </AppLayout>
    );
  }

  if (!targetRecord && !isLoading) {
    return (
      <AppLayout role="klinik" active="create">
        <div className="p-8 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <p className="text-slate-700 font-extrabold text-base">Data pemeriksaan tidak ditemukan.</p>
          <p className="text-slate-500 text-xs font-medium">
            Data dengan ID #{recordId} tidak ditemukan di database.
          </p>
          <Link
            href="/klinik/rekapan-mini-mcu"
            className="inline-block px-4 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 transition"
          >
            Kembali ke Rekapan Mini MCU
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout role="klinik" active="create">
      <div className="space-y-6 pb-12">
        {/* ==================================================== */}
        {/* PAGE TITLE & HEADER                                 */}
        {/* ==================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
          <div>
            <Link
              href="/klinik/rekapan-mini-mcu"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#005930] hover:underline mb-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Hasil Inhouse Clinic</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Edit Data Inhouse Clinic (Klinik)
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Perbarui hasil pemeriksaan fisik harian, keluhan, resep obat, tanggal kunjungan, &amp; rujukan medis
            </p>
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
          {/* ==================================================== */}
          {/* ROW 1: INFORMASI KARYAWAN & PENGUKURAN FISIK        */}
          {/* ==================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* CARD 1: Informasi Peserta MCU */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-800" />
                  <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                    Informasi Peserta<br className="hidden sm:inline" /> MCU
                  </h3>
                </div>

                {/* Pill Toggle Karyawan / Anak Magang */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-full">
                  <button
                    type="button"
                    onClick={() => handleSelectPesertaType('Karyawan')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      pesertaType === 'Karyawan'
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
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      pesertaType === 'Anak Magang'
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
                    name="entitas"
                    value={formData.entitas}
                    onChange={handleChange}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-[#0a5c36] focus:bg-white transition cursor-pointer"
                  >
                    <option value="PTPN 3">🏢  PTPN 3</option>
                    <option value="PTPN 1">🏢  PTPN 1</option>
                    <option value="PTPN 4">🏢  PTPN 4</option>
                  </select>
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                        value={formData.nama_karyawan}
                        onChange={(val) => setFormData((prev) => ({ ...prev, nama_karyawan: val }))}
                        onSelectEmployee={handleSelectEmployee}
                        placeholder="Pilih atau Ketik Nama Karyawan..."
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition placeholder-slate-400 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">NIK</label>
                      <ParticipantSearchInput
                        type="nik"
                        name="nik"
                        required
                        value={formData.nik}
                        onChange={(val) => setFormData((prev) => ({ ...prev, nik: val }))}
                        onSelectEmployee={handleSelectEmployee}
                        onBlur={handleNikBlur}
                        placeholder="Masukkan NIK..."
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
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition placeholder-slate-400 font-medium"
                        placeholder="Pilih atau Ketik Kode / Nama Divisi..."
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Jabatan</label>
                      <input
                        type="text"
                        name="jabatan"
                        value={formData.jabatan}
                        onChange={handleChange}
                        placeholder="Pilih atau Ketik Jabatan"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition placeholder-slate-400 font-medium"
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
                        name="nomor_inhealth"
                        value={formData.nomor_inhealth}
                        onChange={handleChange}
                        placeholder="Contoh: 12345678"
                        className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition placeholder-slate-400 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor BPJS (Hanya Angka)</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        name="bpjs"
                        value={formData.bpjs}
                        onChange={handleChange}
                        placeholder="Contoh: 00012345678"
                        className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition placeholder-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                      <div className="relative">
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-[#0a5c36] focus:bg-white transition cursor-pointer"
                        >
                          <option value="Laki-laki">Laki-laki</option>
                          <option value="Perempuan">Perempuan</option>
                        </select>
                        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Umur (Tahun)</label>
                      <input
                        type="number"
                        name="umur"
                        value={formData.umur}
                        onChange={handleChange}
                        placeholder="35"
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Tanggal Pemeriksaan (Terekam Otomatis)
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          name="tanggal_pemeriksaan"
                          value={formData.tanggal_pemeriksaan}
                          onChange={handleChange}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition font-medium cursor-pointer"
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
                          name="jam_periksa"
                          value={formData.jam_periksa}
                          onChange={handleChange}
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
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Activity className="w-5 h-5 text-emerald-800" />
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Pengukuran Fisik &amp; Tanda Vital
                </h3>
              </div>

              {/* Golongan Darah */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Golongan Darah</label>
                <div className="relative">
                  <select
                    name="golongan_darah"
                    value={formData.golongan_darah}
                    onChange={handleChange}
                    className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-3 pr-9 outline-none focus:border-emerald-700 focus:bg-white cursor-pointer appearance-none"
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
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Tinggi & Berat Badan */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tinggi Badan (cm)</label>
                  <input
                    type="number"
                    name="tinggi_badan"
                    value={formData.tinggi_badan}
                    onChange={handleChange}
                    placeholder="Contoh: 170"
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Berat Badan (kg)</label>
                  <input
                    type="number"
                    name="berat_badan"
                    value={formData.berat_badan}
                    onChange={handleChange}
                    placeholder="Contoh: 65"
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400"
                  />
                </div>
              </div>

              {/* Analisis BMI Box */}
              <div className="py-1 flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  Analisis BMI :
                </span>
                {bmiVal > 0 ? (
                  <span className={`px-2.5 py-0.5 rounded-lg border text-xs font-extrabold shadow-2xs ${bmiDetails.color}`}>
                    {bmiVal} kg/m² ({bmiDetails.label})
                  </span>
                ) : (
                  <span className="text-slate-400 font-medium italic text-xs">Belum terhitung</span>
                )}
              </div>

              {/* Sub-header: HASIL TANDA VITAL & LAB */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider block mb-3">
                  HASIL TANDA VITAL &amp; LAB
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tensi (mmHg)</label>
                    <input
                      type="text"
                      name="tensi"
                      value={formData.tensi}
                      onChange={handleChange}
                      placeholder="120/80"
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Gula Darah (mg/dL)</label>
                    <input
                      type="number"
                      name="gula_darah"
                      value={formData.gula_darah}
                      onChange={handleChange}
                      placeholder="110"
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Suhu Tubuh (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="suhu"
                      value={formData.suhu}
                      onChange={handleChange}
                      placeholder="36.5"
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Kolesterol (mg/dL)</label>
                    <input
                      type="number"
                      name="kolesterol"
                      value={formData.kolesterol}
                      onChange={handleChange}
                      placeholder="190"
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Asam Urat (mg/dL)</label>
                    <input
                      type="number"
                      step="0.1"
                      name="asam_urat"
                      value={formData.asam_urat}
                      onChange={handleChange}
                      placeholder="6.0"
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* TIM MEDIS PEMERIKSA KLINIK                           */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">Tim Medis Pemeriksa Klinik</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Isikan nama dokter dan perawat yang bertugas pada pemeriksaan kesehatan ini (tersimpan ke memori DB)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Nama Dokter Pemeriksa</span>
                </label>
                <input
                  type="text"
                  name="dokter"
                  value={formData.dokter}
                  onChange={handleChange}
                  placeholder="Pilih atau ketik nama dokter..."
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Nama Perawat / Asisten Medis</span>
                </label>
                <input
                  type="text"
                  name="perawat"
                  value={formData.perawat}
                  onChange={handleChange}
                  placeholder="Pilih atau ketik nama perawat..."
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* ROW 2: HASIL PEMERIKSAAN & KESIMPULAN AKHIR          */}
          {/* ==================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Left 2 Cols: Hasil Pemeriksaan (3-Column Checklist) */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-base">Hasil Pemeriksaan</h3>
                <div className="flex items-center gap-2">
                  {selectedPenyakit.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSapuBersihPenyakit}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      Sapu Bersih
                    </button>
                  )}
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                    {selectedPenyakit.length} dipilih
                  </span>
                </div>
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
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-[#0a5c36] focus:ring-emerald-700 w-4 h-4 cursor-pointer"
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
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-[#0a5c36] focus:ring-emerald-700 w-4 h-4 cursor-pointer"
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
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] font-semibold cursor-pointer transition select-none ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                            : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-[#0a5c36] focus:ring-emerald-700 w-4 h-4 cursor-pointer"
                        />
                        <span className="truncate">{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Col: Kesimpulan Akhir & Upload Surat Sakit */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-3">
                Kesimpulan Akhir
              </h3>

              <div className="space-y-2.5">
                {[
                  { value: 'Sementara Tidak Fit', label: 'Sementara Tidak Fit' },
                  { value: 'Fit dengan Catatan', label: 'Fit Dengan Catatan' },
                  { value: 'Fit for Duty', label: 'Fit for Duty' },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition select-none ${
                      formData.status_kebugaran === opt.value
                        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-extrabold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-700 font-semibold hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status_kebugaran"
                      value={opt.value}
                      checked={formData.status_kebugaran === opt.value}
                      onChange={handleChange}
                      className="w-4 h-4 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
                    />
                    <span className="text-xs">{opt.label}</span>
                  </label>
                ))}
              </div>

              {/* Upload Surat Sakit: Muncul bila opsi 'Sementara Tidak Fit' dipilih */}
              {formData.status_kebugaran === 'Sementara Tidak Fit' ? (
                <div className="pt-3 border-t border-slate-100 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-extrabold text-rose-900 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-rose-600" />
                      <span>Form Surat Sakit (PDF / JPG / PNG)</span>
                    </label>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      Wajib untuk Tidak Fit
                    </span>
                  </div>

                  <input
                    type="file"
                    ref={fileSuratSakitRef}
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSuratSakitUpload(file);
                    }}
                  />

                  {formData.file_surat_sakit_name ? (
                    <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          {formData.file_surat_sakit_name.toLowerCase().endsWith('.pdf') ? (
                            'PDF'
                          ) : (
                            <ImageIcon className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate" title={formData.file_surat_sakit_name}>
                            {formData.file_surat_sakit_name}
                          </p>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {fileSuratSakitSize ? `${fileSuratSakitSize} • ` : ''}Surat Sakit Terlampir
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            openDocPreview('Surat Sakit Pasien', fileSuratSakitUrl, formData.file_surat_sakit_name)
                          }
                          className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-lg shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                          title="Lihat Berkas"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Lihat</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadDocFile(fileSuratSakitUrl, formData.file_surat_sakit_name)}
                          className="px-2.5 py-1.5 bg-white hover:bg-rose-100 text-rose-900 font-bold text-xs rounded-lg border border-rose-300 shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                          title="Unduh Berkas"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Unduh</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveSuratSakit}
                          className="p-1.5 text-rose-600 hover:bg-rose-200/70 rounded-lg transition cursor-pointer"
                          title="Hapus Berkas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileSuratSakitRef.current?.click()}
                      className="p-4 border-2 border-dashed border-rose-300 hover:border-rose-500 rounded-xl bg-rose-50/40 hover:bg-rose-50/70 flex flex-col items-center justify-center text-center cursor-pointer transition"
                    >
                      <FileText className="w-6 h-6 text-rose-400 mb-1" />
                      <span className="text-xs font-bold text-rose-900">
                        Klik di sini untuk upload Surat Sakit
                      </span>
                      <span className="text-[10px] text-rose-600 font-medium mt-0.5">
                        Maksimal 20MB (.pdf, .jpg, .png)
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <p className="text-[11px] text-slate-500 font-medium">
                    Form lampiran surat sakit otomatis terbuka jika memilih <strong>Sementara Tidak Fit</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ==================================================== */}
          {/* CATATAN MEDIS                                       */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-900 text-sm sm:text-base border-b border-slate-100 pb-3">
              Catatan Medis
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keluhan / Anamnesa</label>
                <textarea
                  rows={2}
                  name="keluhan_anamnesa"
                  value={formData.keluhan_anamnesa}
                  onChange={handleChange}
                  placeholder="Masukkan keluhan / anamnesa karyawan..."
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Faktor Resiko</label>
                <textarea
                  rows={2}
                  name="faktor_risiko"
                  value={formData.faktor_risiko}
                  onChange={handleChange}
                  placeholder="Masukkan faktor resiko kesehatan karyawan..."
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Penyakit</label>
                  <span className="text-[10px] font-bold text-emerald-800">Otomatis dari Hasil Pemeriksaan</span>
                </div>
                <textarea
                  rows={2}
                  name="penyakit_text"
                  value={formData.penyakit_text}
                  onChange={handleChange}
                  placeholder="Hasil pemeriksaan diatas akan masuk ke dalam penyakit"
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400"
                />
                <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">
                  *Hasil pemeriksaan diatas akan masuk ke dalam penyakit
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Diagnosa</label>
                <textarea
                  rows={2}
                  name="diagnosa"
                  value={formData.diagnosa}
                  onChange={handleChange}
                  placeholder="Masukkan diagnosa dokter..."
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Tindak Lanjut</label>
                <textarea
                  rows={2}
                  name="tindak_lanjut"
                  value={formData.tindak_lanjut}
                  onChange={handleChange}
                  placeholder="Masukkan tindak lanjut pengobatan..."
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* OBAT UNTUK PASIEN (OPSIONAL)                         */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Obat untuk Pasien (Opsional)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Pilih satu atau beberapa obat (misal 2, 3, 4, 5+ obat). Ketik nama obat untuk menyaring.
                  </p>
                </div>
              </div>

              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-full">
                Multi-Select &amp; Auto-Store DB
              </span>
            </div>

            {/* Selected Drugs Pill Box */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl min-h-[44px] flex flex-wrap gap-2 items-center">
              {selectedObat.length === 0 ? (
                <span className="text-xs text-slate-400 font-medium italic">Belum ada obat dipilih...</span>
              ) : (
                selectedObat.map((ob) => (
                  <span
                    key={ob}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#005930] text-white rounded-xl text-xs font-bold shadow-2xs"
                  >
                    <span>{ob}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveObat(ob)}
                      className="text-emerald-200 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Search and Add Input */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={obatSearch}
                    onChange={(e) => {
                      setObatSearch(e.target.value);
                      setShowObatSuggestions(true);
                    }}
                    onFocus={() => setShowObatSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddObat(obatSearch);
                      }
                    }}
                    placeholder="Ketik nama/kemasan obat (misal: N, Asam, Paraset), lalu pilih atau tekan Enter..."
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleAddObat(obatSearch)}
                  className="px-4 py-2.5 bg-[#005930] hover:bg-[#004726] text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah</span>
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showObatSuggestions && filteredObatSuggestions.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-16 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {filteredObatSuggestions.map((item) => (
                    <div
                      key={item}
                      onMouseDown={() => handleAddObat(item)}
                      className="p-2.5 text-xs font-semibold text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 cursor-pointer flex items-center justify-between"
                    >
                      <span>{item}</span>
                      <span className="text-[10px] text-slate-400">+ Pilih</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-amber-800 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 font-medium">
              💡 <strong>Tips:</strong> Jika obat belum ada di daftar, ketik nama obat baru dan tekan Enter atau klik tombol <strong>+ Tambah</strong>. Obat baru akan otomatis didaftarkan ke sistem!
            </p>
          </div>

          {/* ==================================================== */}
          {/* INTERVENSI LAYANAN KESEHATAN                         */}
          {/* ==================================================== */}
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
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          isChecked
                            ? 'bg-white border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                            : 'bg-white/80 border-slate-200/80 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
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
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          isChecked
                            ? 'bg-white border-amber-400 text-amber-950 font-bold shadow-2xs'
                            : 'bg-white/80 border-slate-200/80 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
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
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          isChecked
                            ? 'bg-white border-purple-400 text-purple-950 font-bold shadow-2xs'
                            : 'bg-white/80 border-slate-200/80 text-slate-700 hover:bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
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
                                openDocPreview(
                                  'Surat Rujukan Pasien',
                                  fileRujukanUrl,
                                  formData.file_rujukan_name || 'Surat_Rujukan.pdf'
                                )
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
                                onClick={() => downloadDocFile(fileRujukanUrl, formData.file_rujukan_name || 'Surat_Rujukan')}
                                className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg transition cursor-pointer"
                                title="Unduh Berkas"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={handleRemoveSuratRujukan}
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
                              if (file) handleSuratRujukanUpload(file);
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

          {/* ==================================================== */}
          {/* RUJUKAN RUMAH SAKIT / SPESIALIS (OPSIONAL)           */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                  Rujukan Rumah Sakit / Spesialis (Opsional)
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Isi jika karyawan memerlukan rujukan ke faskes/rumah sakit lanjutan
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Upload Berkas Surat Rujukan */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-800" />
                    <span>Upload Berkas Surat Rujukan (PDF / Foto / Gambar)</span>
                  </label>
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    Opsional
                  </span>
                </div>

                <input
                  type="file"
                  ref={fileRujukanRef}
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSuratRujukanUpload(file);
                  }}
                />

                {formData.file_rujukan_name ? (
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-sky-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {formData.file_rujukan_name.toLowerCase().endsWith('.pdf') ? (
                          'PDF'
                        ) : (
                          <ImageIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={formData.file_rujukan_name}>
                          {formData.file_rujukan_name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {fileRujukanSize ? `${fileRujukanSize} • ` : ''}Surat Rujukan Terlampir
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          openDocPreview('Surat Rujukan Pasien', fileRujukanUrl, formData.file_rujukan_name)
                        }
                        className="px-2.5 py-1.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                        title="Lihat Berkas"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Lihat</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadDocFile(fileRujukanUrl, formData.file_rujukan_name)}
                        className="px-2.5 py-1.5 bg-white hover:bg-sky-100 text-sky-900 font-bold text-xs rounded-lg border border-sky-300 shadow-2xs transition inline-flex items-center gap-1 cursor-pointer"
                        title="Unduh Berkas"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Unduh</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveSuratRujukan}
                        className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                        title="Hapus Berkas"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileRujukanRef.current?.click()}
                    className="p-4 border-2 border-dashed border-slate-200 hover:border-sky-700 rounded-xl bg-slate-50/70 hover:bg-sky-50/30 flex flex-col items-center justify-center text-center cursor-pointer transition"
                  >
                    <Building2 className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-xs font-bold text-slate-700">
                      Klik untuk upload Surat Rujukan (PDF / Foto / Gambar)
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Maksimal 20MB (.pdf, .jpg, .png)
                    </span>
                  </div>
                )}
              </div>

              {/* Form Nama RS Rujukan & Poli Rujukan (HANYA MUNCUL JIKA ADA SURAT RUJUKAN) */}
              {Boolean(formData.file_rujukan_name || fileRujukanUrl) && (
                <div className="pt-3 border-t border-sky-100 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Poli Rujukan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nama_poli_rujukan"
                      value={formData.nama_poli_rujukan}
                      onChange={handleChange}
                      placeholder="Contoh: Poli Jantung / Penyakit Dalam / Poli Saraf"
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-sky-700 focus:bg-white placeholder-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Rumah Sakit / Faskes Tujuan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="rumah_sakit_rujukan"
                      value={formData.rumah_sakit_rujukan}
                      onChange={handleChange}
                      placeholder="Contoh: RS Murni Teguh / RSUP Adam Malik"
                      className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-sky-700 focus:bg-white placeholder-slate-400"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ==================================================== */}
          {/* BOTTOM SUBMIT BUTTON                                */}
          {/* ==================================================== */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 bg-[#005930] hover:bg-[#004726] disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl transition shadow-xs flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              <Save className="w-5 h-5 text-emerald-200" />
              <span>{submitting ? 'Menyimpan Perubahan...' : 'Simpan Perubahan Data Mini MCU'}</span>
            </button>
          </div>
        </form>

        {/* ==================================================== */}
        {/* UNIVERSAL DOCUMENT PREVIEW MODAL                     */}
        {/* ==================================================== */}
        <DocumentPreviewModal
          open={previewDocModal.open}
          onClose={() => setPreviewDocModal({ open: false, title: '', url: null, fileName: '', isImage: false })}
          url={previewDocModal.url}
          title={previewDocModal.title}
          fileName={previewDocModal.fileName}
        />
      </div>
    </AppLayout>
  );
}

export default function KlinikEditDataPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">Memuat form edit...</div>}>
      <EditMiniMcuContent />
    </Suspense>
  );
}
