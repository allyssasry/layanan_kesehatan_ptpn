'use client';

import React, { useState, useEffect, useMemo, use, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { DocumentPreviewModal } from '@/components/common/DocumentPreviewModal';
import { generateSuratRujukanDataUrl } from '@/utils/rujukanGenerator';
import { useMcu } from '@/context/McuContext';
import { FitnessStatus } from '@/types/mcu';
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
  ChevronDown,
  Sparkles,
  HeartPulse,
  Paperclip,
  Eye,
  Image as ImageIcon,
  ArrowLeft,
  Lock,
  ShieldCheck,
  Search,
  Info,
} from 'lucide-react';

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

export default function ClinicTambahPemeriksaanFollowUpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mcuRecords, miniMcuRecords, addMiniMcuRecord, updateMiniMcuRecord, updateMcuRecord, refreshData } = useMcu();

  const recordId = Number(resolvedParams.id);
  const typeParam = searchParams?.get('type')?.toLowerCase() || '';
  const nikParam = searchParams?.get('nik')?.trim() || '';

  const existingRecord = useMemo(() => {
    // 1. If type is specifically 'mcu', look in mcuRecords first
    if (typeParam === 'mcu') {
      const byId = mcuRecords.find((r) => r.id === recordId);
      if (byId) return byId;
      if (nikParam) {
        const byNik = mcuRecords.find((r) => String(r.nik).trim() === nikParam);
        if (byNik) return byNik;
      }
    }

    // 2. If type is specifically 'mini', look in miniMcuRecords first
    if (typeParam === 'mini') {
      const byId = miniMcuRecords.find((r) => r.id === recordId);
      if (byId) return byId;
      if (nikParam) {
        const byNik = miniMcuRecords.find((r) => String(r.nik).trim() === nikParam);
        if (byNik) return byNik;
      }
    }

    // 3. Match by NIK if provided
    if (nikParam) {
      const byNikMcu = mcuRecords.find((r) => String(r.nik).trim() === nikParam);
      if (byNikMcu) return byNikMcu;
      const byNikMini = miniMcuRecords.find((r) => String(r.nik).trim() === nikParam);
      if (byNikMini) return byNikMini;
    }

    // 4. Default fallback: search by id in mini first, then mcu
    return (
      miniMcuRecords.find((r) => r.id === recordId) ||
      mcuRecords.find((r) => r.id === recordId)
    );
  }, [recordId, typeParam, nikParam, mcuRecords, miniMcuRecords]);

  // Form State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRujukanRef = useRef<HTMLInputElement>(null);
  const fileSuratSakitRef = useRef<HTMLInputElement>(null);

  const [fileSuratSakitUrl, setFileSuratSakitUrl] = useState<string | null>(null);
  const [fileSuratSakitSize, setFileSuratSakitSize] = useState<string>('');
  const [fileRujukanUrl, setFileRujukanUrl] = useState<string | null>(null);
  const [fileRujukanSize, setFileRujukanSize] = useState<string>('');

  const [isTimeAuto, setIsTimeAuto] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    entitas: 'PTPN 3',
    nama_karyawan: '',
    nik: '',
    divisi: '',
    jabatan: '',
    nomor_inhealth: '',
    bpjs: '',
    gender: 'Laki-laki',
    umur: '30',
    tanggal_pemeriksaan: getWIBDate(),
    jam_periksa: getWIBTime(),

    // Vitals & Lab
    golongan_darah: 'A',
    tinggi_badan: '170',
    berat_badan: '65',
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
    catatan_intervensi: '',

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

  // Preview Doc Modal
  const [previewDocModal, setPreviewDocModal] = useState<{
    open: boolean;
    title: string;
    url: string | null;
    fileName: string;
    isImage?: boolean;
  }>({
    open: false,
    title: '',
    url: null,
    fileName: '',
    isImage: false,
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
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

    // If it's a Surat Rujukan and doesn't have a physical data URL yet, generate the official digital Surat Rujukan SVG!
    if (!isRealBinary && title.toLowerCase().includes('rujukan')) {
      finalUrl = generateSuratRujukanDataUrl({
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
        tanggal_pemeriksaan_lanjutan: formData.tanggal_rehabilitatif || formData.tanggal_kuratif || formData.tanggal_pemeriksaan,
        rumah_sakit_rujukan: formData.rumah_sakit_rujukan || 'Rumah Sakit Rujukan PTPN',
        nama_poli_rujukan: formData.nama_poli_rujukan || 'Poli Spesialis Rujukan Medis',
        dokter_pemeriksa: formData.dokter || 'dr. Maya Andriana, Sp.Ok',
        diagnosa: formData.diagnosa || formData.penyakit_text || 'Pemeriksaan Lanjutan & Evaluasi Medis',
        catatan_intervensi: formData.catatan_intervensi || formData.catatan_rehabilitatif || formData.tindak_lanjut,
        intervensi: selectedRehabilitatif.length > 0 ? selectedRehabilitatif : ['Monitoring Hasil Tindak Lanjut oleh Dokter Ahli'],
        tensi: formData.tensi,
        gula_darah: formData.gula_darah,
        kolesterol: formData.kolesterol,
        file_surat_rujukan_intervensi: fileName || formData.file_rujukan_name || 'Surat_Rujukan_Klinik.pdf',
      });
      // Keep fileRujukanUrl updated so it can be saved and downloaded immediately
      setFileRujukanUrl(finalUrl);
    }

    setPreviewDocModal({
      open: true,
      title,
      url: finalUrl,
      fileName: fileName || (title.toLowerCase().includes('rujukan') ? `Surat_Rujukan_${formData.nama_karyawan ? formData.nama_karyawan.replace(/\s+/g, '_') : 'Pasien'}.svg` : 'Dokumen_Medis'),
    });
  };

  const downloadDocFile = (url: string | null, fileName: string) => {
    let targetUrl = url;
    if (!targetUrl || (!targetUrl.startsWith('data:') && !targetUrl.startsWith('http://') && !targetUrl.startsWith('https:') && !targetUrl.startsWith('blob:') && !targetUrl.startsWith('/'))) {
      if (fileName.toLowerCase().includes('rujukan') || fileName.toLowerCase().includes('surat')) {
        targetUrl = generateSuratRujukanDataUrl({
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
          tanggal_pemeriksaan_lanjutan: formData.tanggal_rehabilitatif || formData.tanggal_kuratif || formData.tanggal_pemeriksaan,
          rumah_sakit_rujukan: formData.rumah_sakit_rujukan || 'Rumah Sakit Rujukan PTPN',
          nama_poli_rujukan: formData.nama_poli_rujukan || 'Poli Spesialis Rujukan Medis',
          dokter_pemeriksa: formData.dokter || 'dr. Maya Andriana, Sp.Ok',
          diagnosa: formData.diagnosa || formData.penyakit_text || 'Pemeriksaan Lanjutan & Evaluasi Medis',
          catatan_intervensi: formData.catatan_intervensi || formData.catatan_rehabilitatif || formData.tindak_lanjut,
          intervensi: selectedRehabilitatif.length > 0 ? selectedRehabilitatif : ['Monitoring Hasil Tindak Lanjut oleh Dokter Ahli'],
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

  // Populate data from existingRecord (Locked Employee Information)
  useEffect(() => {
    if (existingRecord) {
      const rec = existingRecord as any;
      const nama = rec.nama_lengkap || rec.nama_karyawan || '';
      const nik = rec.nik || '';
      const divisi = rec.divisi || 'Operasional Kebun';
      const jabatan = rec.jabatan || 'Staf Operasional';
      const entitas = rec.departemen || rec.entitas || 'PTPN 3';
      const inhealth = rec.nomor_inhealth || '';
      const bpjs = rec.nomor_bpjs || rec.bpjs || '';
      const gender = rec.jenis_kelamin || 'Laki-laki';
      const umur = String(rec.umur || 30);
      const goldar = rec.golongan_darah || 'A';
      const tb = rec.tinggi_badan ? String(rec.tinggi_badan) : '170';
      const bb = rec.berat_badan ? String(rec.berat_badan) : '65';
      const tensi = rec.tensi || '120/80';
      const gd = rec.gula_darah ? String(rec.gula_darah) : '110';
      const suhu = rec.suhu ? String(rec.suhu) : '36.5';
      const kol = rec.kolesterol ? String(rec.kolesterol) : '190';
      const au = rec.asam_urat ? String(rec.asam_urat) : '6.0';
      const dokter = rec.nama_dokter || rec.dokter || '';
      const perawat = rec.nama_perawat || rec.perawat || '';
      const kesimpulan = (rec.kesimpulan || rec.status_kebugaran || 'Fit for Duty') as FitnessStatus;

      setFormData((prev) => ({
        ...prev,
        entitas,
        nama_karyawan: nama,
        nik,
        divisi,
        jabatan,
        nomor_inhealth: inhealth,
        bpjs,
        gender,
        umur,
        golongan_darah: goldar,
        tinggi_badan: tb,
        berat_badan: bb,
        tensi,
        gula_darah: gd,
        suhu,
        kolesterol: kol,
        asam_urat: au,
        dokter,
        perawat,
        status_kebugaran: kesimpulan,
        keluhan_anamnesa: rec.keluhan || '',
        faktor_risiko: rec.faktor_risiko || '',
        diagnosa: rec.diagnosa || rec.diagnosa_klinik || '',
        tindak_lanjut: rec.tindak_lanjut || rec.tindakan_terapi || '',
        tanggal_kuratif: rec.tanggal_pemeriksaan_lanjutan || getWIBDate(),
        tanggal_rehabilitatif: rec.tanggal_pemeriksaan_lanjutan || getWIBDate(),
        catatan_kuratif: rec.catatan_intervensi_kuratif || '',
        catatan_rehabilitatif: rec.catatan_intervensi_rehabilitatif || '',
        catatan_intervensi: rec.catatan_intervensi || '',
        nama_poli_rujukan: rec.nama_poli || '',
        rumah_sakit_rujukan: rec.nama_rs || '',
        file_rujukan_name: rec.nama_surat_rujukan_intervensi || rec.nama_rujukan_file || '',
        file_surat_sakit_name: rec.nama_surat_sakit || '',
      }));

      if (rec.foto) {
        setPhotoPreview(rec.foto);
      }
      if (rec.file_surat_rujukan_intervensi || rec.file_rujukan) {
        setFileRujukanUrl(rec.file_surat_rujukan_intervensi || rec.file_rujukan || null);
      }
      if (rec.file_surat_sakit) {
        setFileSuratSakitUrl(rec.file_surat_sakit || null);
      }

      // Disease sync
      if (rec.penyakit && Array.isArray(rec.penyakit) && rec.penyakit.length > 0) {
        setSelectedPenyakit(rec.penyakit);
        setFormData((prev) => ({ ...prev, penyakit_text: rec.penyakit.join(', ') }));
      } else if (rec.penyakit_text) {
        setFormData((prev) => ({ ...prev, penyakit_text: String(rec.penyakit_text) }));
      }

      // Drugs sync
      if (rec.obat && Array.isArray(rec.obat) && rec.obat.length > 0) {
        setSelectedObat(rec.obat);
      }

      // Intervensi sync
      if (rec.intervensi && Array.isArray(rec.intervensi) && rec.intervensi.length > 0) {
        const p: string[] = [];
        const k: string[] = [];
        const r: string[] = [];
        rec.intervensi.forEach((item: string) => {
          const itemStr = String(item);
          if (promotifOptions.some((opt) => itemStr.toLowerCase().includes(opt.toLowerCase()))) {
            const match = promotifOptions.find((opt) => itemStr.toLowerCase().includes(opt.toLowerCase()));
            if (match && !p.includes(match)) p.push(match);
          } else if (kuratifOptions.some((opt) => itemStr.toLowerCase().includes(opt.toLowerCase()))) {
            const match = kuratifOptions.find((opt) => itemStr.toLowerCase().includes(opt.toLowerCase()));
            if (match && !k.includes(match)) k.push(match);
          } else if (rehabilitatifOptions.some((opt) => itemStr.toLowerCase().includes(opt.toLowerCase()))) {
            const match = rehabilitatifOptions.find((opt) => itemStr.toLowerCase().includes(opt.toLowerCase()));
            if (match && !r.includes(match)) r.push(match);
          } else if (itemStr.toLowerCase().includes('rehab') || itemStr.toLowerCase().includes('dokter ahli')) {
            if (!r.includes(rehabilitatifOptions[0])) r.push(rehabilitatifOptions[0]);
          }
        });
        setSelectedPromotif(p);
        setSelectedKuratif(k);
        setSelectedRehabilitatif(r);
      }
    }
  }, [existingRecord]);

  // Live WIB Time Sync
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

  // BMI Real-time calculation
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

  // Field change helper
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'jam_periksa') {
      setIsTimeAuto(false);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Disease Toggle
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

  // Medication Handlers
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

  const filteredObatSuggestions = useMemo(() => {
    if (!obatSearch.trim()) return masterObatList.filter((o) => !selectedObat.includes(o));
    return masterObatList.filter(
      (o) => o.toLowerCase().includes(obatSearch.toLowerCase().trim()) && !selectedObat.includes(o)
    );
  }, [obatSearch, selectedObat]);

  // Intervention Checkbox Toggles
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    const tanggalLanjutan =
      (isKuratifActive && formData.tanggal_kuratif) ||
      (isRehabilitatifActive && formData.tanggal_rehabilitatif) ||
      null;

    let finalFileRujukan = fileRujukanUrl;
    let finalNamaRujukan = formData.file_rujukan_name;

    // If user specified referral details or has rehabilitatif active, but no binary file uploaded manually:
    if (!finalFileRujukan && (formData.nama_poli_rujukan || formData.rumah_sakit_rujukan || isRehabilitatifActive || formData.file_rujukan_name)) {
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
        tanggal_pemeriksaan_lanjutan: formData.tanggal_rehabilitatif || formData.tanggal_kuratif || formData.tanggal_pemeriksaan,
        rumah_sakit_rujukan: formData.rumah_sakit_rujukan || 'Rumah Sakit Rujukan PTPN',
        nama_poli_rujukan: formData.nama_poli_rujukan || 'Poli Spesialis Rujukan Medis',
        dokter_pemeriksa: formData.dokter || 'dr. Maya Andriana, Sp.Ok',
        diagnosa: formData.diagnosa || formData.penyakit_text || 'Pemeriksaan Lanjutan & Evaluasi Medis',
        catatan_intervensi: formData.catatan_intervensi || formData.catatan_rehabilitatif || formData.tindak_lanjut,
        intervensi: selectedRehabilitatif.length > 0 ? selectedRehabilitatif : ['Monitoring Hasil Tindak Lanjut oleh Dokter Ahli'],
        tensi: formData.tensi,
        gula_darah: formData.gula_darah,
        kolesterol: formData.kolesterol,
        file_surat_rujukan_intervensi: formData.file_rujukan_name || 'Surat_Rujukan_Klinik.pdf',
      });
      if (!finalNamaRujukan) {
        finalNamaRujukan = `Surat_Rujukan_${formData.nama_karyawan ? formData.nama_karyawan.replace(/\s+/g, '_') : 'Pasien'}.svg`;
      }
    }

    const payload = {
      nama_karyawan: formData.nama_karyawan.trim() || 'Karyawan PTPN',
      nama_lengkap: formData.nama_karyawan.trim() || 'Karyawan PTPN',
      nik: formData.nik.trim(),
      jabatan: formData.jabatan || 'Staf Operasional',
      divisi: formData.divisi || 'Operasional Kebun',
      departemen: formData.entitas || 'PTPN 3',
      kategori_peserta: 'karyawan',
      nomor_inhealth: formData.nomor_inhealth || null,
      nomor_bpjs: formData.bpjs || null,
      jenis_kelamin: (formData.gender as 'Laki-laki' | 'Perempuan') || 'Laki-laki',
      umur: Number(formData.umur) || 30,
      tanggal_pemeriksaan: formData.tanggal_pemeriksaan,
      jam_pemeriksaan: formData.jam_periksa,
      golongan_darah: formData.golongan_darah || 'A',
      tinggi_badan: Number(formData.tinggi_badan) || 170,
      berat_badan: Number(formData.berat_badan) || 65,
      bmi: bmiVal,
      tensi: formData.tensi || '120/80',
      gula_darah: formData.gula_darah || '110',
      suhu: formData.suhu || '36.5',
      kolesterol: formData.kolesterol || '190',
      asam_urat: formData.asam_urat || '6.0',
      nama_dokter: formData.dokter || '',
      nama_perawat: formData.perawat || '',
      keluhan: formData.keluhan_anamnesa.trim() || 'Tidak memiliki keluhan',
      faktor_risiko: formData.faktor_risiko.trim() || 'Tidak memiliki faktor risiko',
      penyakit: selectedPenyakit.length > 0 ? selectedPenyakit : [],
      penyakit_text: formData.penyakit_text.trim() || (selectedPenyakit.length > 0 ? selectedPenyakit.join(', ') : 'Tidak memiliki penyakit'),
      diagnosa: formData.diagnosa.trim() || 'Tidak memiliki diagnosa',
      diagnosa_klinik: formData.diagnosa.trim() || 'Tidak memiliki diagnosa',
      tindakan_terapi: formData.tindak_lanjut.trim() || 'Tidak memiliki tindak lanjut',
      tindak_lanjut: formData.tindak_lanjut.trim() || 'Tidak memiliki tindak lanjut',
      kesimpulan: formData.status_kebugaran as any,
      status_kebugaran: formData.status_kebugaran,
      obat: selectedObat.length > 0 ? selectedObat : ['Paracetamol 500mg'],
      intervensi: intervensiParts.length > 0 ? intervensiParts : combinedIntervensi,
      tanggal_pemeriksaan_lanjutan: tanggalLanjutan,
      catatan_intervensi_kuratif: isKuratifActive ? (formData.catatan_kuratif || null) : null,
      catatan_intervensi_rehabilitatif: isRehabilitatifActive ? (formData.catatan_rehabilitatif || null) : null,
      catatan_intervensi: formData.catatan_intervensi || null,
      butuh_tindak_lanjut: isKuratifActive || isRehabilitatifActive,
      tindak_lanjut_selesai: !(isKuratifActive || isRehabilitatifActive),
      foto: photoPreview || existingRecord?.foto || null,
      file_surat_sakit: formData.status_kebugaran === 'Sementara Tidak Fit' ? (fileSuratSakitUrl || formData.file_surat_sakit_name || null) : null,
      nama_surat_sakit: formData.status_kebugaran === 'Sementara Tidak Fit' ? (formData.file_surat_sakit_name || null) : null,
      file_rujukan: finalFileRujukan || null,
      nama_rujukan_file: finalNamaRujukan || null,
      file_surat_rujukan_intervensi: finalFileRujukan || null,
      nama_surat_rujukan_intervensi: finalNamaRujukan || null,
      nama_poli: formData.nama_poli_rujukan || null,
      nama_rs: formData.rumah_sakit_rujukan || null,
      created_by_role: 'klinik',
    };

    try {
      const newId = await addMiniMcuRecord(payload as any);

      // Tandai rekam medis sebelumnya sebagai TUNTAS karena pemeriksaan baru telah dilakukan
      if (existingRecord && existingRecord.id) {
        const updatePrevPayload: any = {
          butuh_tindak_lanjut: false,
          tindak_lanjut_selesai: true,
          tindak_lanjut_selesai_kuratif: true,
          tindak_lanjut_selesai_rehabilitatif: true,
        };
        try {
          if (typeParam === 'mcu') {
            await updateMcuRecord(existingRecord.id, updatePrevPayload);
          } else {
            await updateMiniMcuRecord(existingRecord.id, updatePrevPayload);
          }
        } catch (updateErr) {
          console.warn('Gagal memperbarui status pemeriksaan sebelumnya:', updateErr);
        }
      }

      await refreshData();
      setSuccessMessage('Data pemeriksaan baru karyawan berhasil disimpan ke Database! Mengalihkan...');
      setTimeout(() => {
        router.push('/klinik/intervensi');
      }, 900);
    } catch (err: any) {
      alert('Gagal menyimpan pemeriksaan baru: ' + (err.message || 'Error server'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout role="klinik" active="intervensi">
      <div className="space-y-6 pb-12">
        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/klinik/intervensi"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-950 mb-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Intervensi Layanan</span>
            </Link>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Tambah Data Inhouse Clinic (Pemeriksaan Baru)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Formulir pemeriksaan fisik harian, keluhan, resep obat, &amp; rujukan medis oleh Tim Medis Klinik.
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-950 font-bold text-sm shadow-xs animate-in fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ==================================================== */}
          {/* ROW 1: INFORMASI PESERTA (TERKUNCI) & FISIK / VITAL  */}
          {/* ==================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* CARD 1: Informasi Peserta MCU (TERKUNCI) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-800" />
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Informasi Peserta MCU
                  </h3>
                </div>

                {/* Badge Karyawan & Locked Badge */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-[#0a5c36] text-white text-xs font-bold rounded-lg shadow-2xs">
                    Karyawan
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-300">
                    <Lock className="w-3 h-3 text-amber-700" />
                    <span>Terkunci</span>
                  </span>
                </div>
              </div>

              {/* Entitas Perusahaan (Locked) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entitas Perusahaan</label>
                <div className="relative">
                  <div className="w-full text-xs font-bold text-slate-800 bg-slate-100/90 border border-slate-200 rounded-xl py-2.5 pl-9 pr-4 flex items-center gap-2 cursor-not-allowed">
                    <span>{formData.entitas}</span>
                  </div>
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
              </div>

              {/* Photo and Form Fields Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Photo Locked Box */}
                <div className="flex flex-col items-center gap-1.5 shrink-0 mx-auto sm:mx-0">
                  <div className="w-24 h-28 rounded-2xl bg-slate-100 border-2 border-slate-200 flex flex-col items-center justify-center text-slate-400 overflow-hidden shadow-2xs relative">
                    {photoPreview ? (
                      <img src={photoPreview} alt="Foto Pasien" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 stroke-[1.5] text-slate-400" />
                    )}
                    <div className="absolute inset-0 bg-slate-900/15 pointer-events-none flex items-end justify-center pb-1">
                      <span className="text-[9px] font-bold text-slate-800 bg-white/95 px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5 text-slate-700" />
                        Terkunci
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Foto Profil Terkunci
                  </span>
                </div>

                {/* Form Fields Grid */}
                <div className="flex-1 w-full space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Nama Lengkap</span>
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Terkunci
                        </span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={formData.nama_karyawan}
                        className="w-full text-xs font-bold bg-slate-100/90 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>NIK</span>
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Terkunci
                        </span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={formData.nik}
                        className="w-full text-xs font-mono font-bold bg-slate-100/90 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Divisi / Unit Kerja</span>
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Terkunci
                        </span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={formData.divisi}
                        className="w-full text-xs font-bold bg-slate-100/90 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Jabatan</span>
                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-0.5">
                          <Lock className="w-2.5 h-2.5" /> Terkunci
                        </span>
                      </label>
                      <input
                        type="text"
                        disabled
                        value={formData.jabatan}
                        className="w-full text-xs font-bold bg-slate-100/90 text-slate-800 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Inhealth</label>
                      <input
                        type="text"
                        disabled
                        value={formData.nomor_inhealth || '-'}
                        className="w-full text-xs font-mono bg-slate-100/90 text-slate-700 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor BPJS</label>
                      <input
                        type="text"
                        disabled
                        value={formData.bpjs || '-'}
                        className="w-full text-xs font-mono bg-slate-100/90 text-slate-700 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                      <input
                        type="text"
                        disabled
                        value={formData.gender}
                        className="w-full text-xs bg-slate-100/90 text-slate-700 border border-slate-200 rounded-xl px-3 py-2 cursor-not-allowed font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Umur (Tahun)</label>
                      <input
                        type="number"
                        name="umur"
                        value={formData.umur}
                        onChange={handleChange}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-[#0a5c36] focus:bg-white transition font-medium"
                      />
                    </div>
                  </div>

                  {/* Tanggal Pemeriksaan Baru & Jam Periksa */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-emerald-950 mb-1">
                        Tanggal Pemeriksaan Baru *
                      </label>
                      <input
                        type="date"
                        name="tanggal_pemeriksaan"
                        required
                        value={formData.tanggal_pemeriksaan}
                        onChange={handleChange}
                        className="w-full text-xs bg-white border border-emerald-700 text-emerald-950 font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-700 transition cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] font-bold text-emerald-950">Jam Periksa *</label>
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
                      <input
                        type="time"
                        name="jam_periksa"
                        required
                        value={formData.jam_periksa}
                        onChange={handleChange}
                        className="w-full text-xs bg-white border border-emerald-700 text-emerald-950 font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-700 transition cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Auto-Locked Alert Banner */}
              <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-900">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>
                  Data profil karyawan (Nama, NIK, Divisi, Foto) dikunci secara otomatis dari database sistem agar pemeriksaan baru tersimpan ke karyawan yang dipilih.
                </span>
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

                  <div className="col-span-2">
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
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Diagnosa</label>
                <textarea
                  rows={2}
                  name="diagnosa"
                  value={formData.diagnosa}
                  onChange={handleChange}
                  placeholder="Masukkan diagnosa dokter / klinik..."
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
                  placeholder="Masukkan tindakan lanjut pengobatan / anjuran..."
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* OBAT UNTUK PASIEN (OPSIONAL)                         */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Obat untuk Pasien (Opsional)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Pilih satu atau beberapa obat dari list di bawah ini, jika ada resep. Ketik nama obat untuk menyaring.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-full">
                Multi-Select &amp; Auto-Store DB
              </span>
            </div>

            {/* Selected Drugs Container */}
            <div className="min-h-[50px] p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center gap-2">
              {selectedObat.length === 0 ? (
                <span className="text-xs text-slate-400 italic font-medium">Belum ada obat dipilih...</span>
              ) : (
                selectedObat.map((obat) => (
                  <span
                    key={obat}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/90 text-emerald-950 font-bold text-xs rounded-lg border border-emerald-300 shadow-2xs animate-in zoom-in-95"
                  >
                    <span>{obat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveObat(obat)}
                      className="text-emerald-700 hover:text-emerald-950 p-0.5 rounded transition cursor-pointer"
                      title="Hapus Obat"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Input & Search / Add New Drug */}
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
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
                        if (obatSearch.trim()) handleAddObat(obatSearch);
                      }
                    }}
                    placeholder="Ketik nama kemasan obat (misal: N. Asam, Paraset, dst), lalu pilih atau tekan Enter..."
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-emerald-700 focus:bg-white placeholder-slate-400 transition"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (obatSearch.trim()) handleAddObat(obatSearch);
                  }}
                  className="px-4 py-2.5 bg-[#005930] hover:bg-[#004726] text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-xs cursor-pointer shrink-0 active:scale-98"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tambah</span>
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {showObatSuggestions && filteredObatSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto p-1 text-xs">
                  {filteredObatSuggestions.slice(0, 10).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleAddObat(opt)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-slate-700 font-semibold hover:text-emerald-950 transition flex items-center justify-between cursor-pointer"
                    >
                      <span>{opt}</span>
                      <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Tip Banner */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-900">
              <Info className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Tips: Jika obat belum ada di daftar, ketik nama obat baru dan tekan Enter atau tombol + Tambah. Obat baru akan otomatis didaftarkan ke sistem!</span>
            </div>
          </div>

          {/* ==================================================== */}
          {/* INTERVENSI LAYANAN KESEHATAN                         */}
          {/* ==================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    Intervensi Layanan Kesehatan
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Pilih program intervensi kesehatan yang diberikan kepada karyawan. Data terpilih akan mempengaruhi statistik Chart Intervensi.
                  </p>
                </div>
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

              {/* 2. KURATIF */}
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

              {/* 3. REHABILITATIF */}
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
                    <input
                      type="text"
                      placeholder="Catatan rekomendasi dokter ahli..."
                      value={formData.catatan_rehabilitatif}
                      onChange={(e) => setFormData({ ...formData, catatan_rehabilitatif: e.target.value })}
                      className="w-full text-xs bg-white border border-purple-300 rounded-xl px-3 py-1.5 outline-none"
                    />

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
                            {fileRujukanUrl && (
                              <button
                                type="button"
                                onClick={() => downloadDocFile(fileRujukanUrl, formData.file_rujukan_name || 'Surat_Rujukan')}
                                className="p-1.5 text-purple-700 hover:bg-purple-100 rounded-lg transition cursor-pointer"
                                title="Unduh Berkas"
                              >
                                <Download className="w-4 h-4" />
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

            {/* Shared: Catatan Intervensi Tambahan */}
            {(isKuratifActive || isRehabilitatifActive) && (
              <div className="pt-4 border-t border-slate-200/80 space-y-1.5 animate-in fade-in">
                <label className="block text-xs font-bold text-slate-800">
                  Catatan Intervensi (Kuratif / Rehabilitatif)
                </label>
                <textarea
                  rows={3}
                  value={formData.catatan_intervensi}
                  onChange={(e) => setFormData({ ...formData, catatan_intervensi: e.target.value })}
                  placeholder="Tulis catatan tambahan terkait intervensi kuratif atau rehabilitatif..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-500 focus:bg-white transition resize-y"
                />
              </div>
            )}
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Upload Berkas Surat Rujukan (PDF / Foto / Gambar)</span>
                <span className="text-[10px] text-slate-400 font-normal">Opsional</span>
              </label>

              <input
                type="file"
                ref={fileRujukanRef}
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSuratRujukanUpload(file);
                }}
              />

              {formData.file_rujukan_name || fileRujukanUrl ? (
                <div className="p-3 bg-sky-50/80 border border-sky-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
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

            {/* Form Nama RS Rujukan & Poli Rujukan */}
            <div className="pt-3 border-t border-sky-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Poli Rujukan
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
                  Rumah Sakit / Faskes Tujuan
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
          </div>

          {/* ==================================================== */}
          {/* BOTTOM SUBMIT BUTTON                                */}
          {/* ==================================================== */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Link
              href="/klinik/intervensi"
              className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-sm transition text-center"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 w-full py-4 px-6 bg-[#005930] hover:bg-[#004726] disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl transition shadow-xs flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>{submitting ? 'Menyimpan Data Pemeriksaan...' : 'Simpan Data Mini MCU (Klinik)'}</span>
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
