'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import {
  Search,
  FileSpreadsheet,
  Eye,
  Edit,
  Trash2,
  FileText,
  User,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  Activity,
} from 'lucide-react';
import { isSameDivisi } from '@/lib/divisiMaster';
import {
  getKaryawanUniqueKey,
  getUniqueEmployeeRecords,
  getRecordFitnessStatus,
  cleanDivisiName,
  matchDivisi,
  matchAgeBracket,
  getTensiStatus,
  getKolesterolStatus,
  getGulaDarahStatus,
  getBmiStatus,
} from '@/lib/mcuHelpers';

function RekapanMcuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mcuRecords, miniMcuRecords, deleteMcuRecord, deleteMiniMcuRecord } = useMcu();

  // URL param initializers
  const initialTab = (searchParams?.get('tab') as 'mcu' | 'mini_mcu') || 'mcu';
  const initialSearch = searchParams?.get('search') || '';
  const initialDept = searchParams?.get('departemen') || 'all';
  const initialDivisi = searchParams?.get('divisi') || 'all';
  const initialBulan = searchParams?.get('bulan') || 'all';
  const initialStatus = searchParams?.get('status') || searchParams?.get('kesimpulan') || 'all';
  const initialUmur = searchParams?.get('umur') || 'all';
  const initialTensi = searchParams?.get('tensi') || 'all';
  const initialKolesterol = searchParams?.get('kolesterol') || 'all';
  const initialGula = searchParams?.get('gula_darah') || 'all';
  const initialBmi = searchParams?.get('bmi') || 'all';

  const [activeTab, setActiveTab] = useState<'mcu' | 'mini_mcu'>(initialTab);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [departemenFilter, setDepartemenFilter] = useState(initialDept);
  const [divisiFilter, setDivisiFilter] = useState(initialDivisi);
  const [bulanFilter, setBulanFilter] = useState(initialBulan);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [umurFilter, setUmurFilter] = useState(initialUmur);
  const [tensiFilter, setTensiFilter] = useState(initialTensi);
  const [kolesterolFilter, setKolesterolFilter] = useState(initialKolesterol);
  const [gulaFilter, setGulaFilter] = useState(initialGula);
  const [bmiFilter, setBmiFilter] = useState(initialBmi);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; nama: string; type: 'mcu' | 'mini' } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sync state if URL query changes
  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'mcu' || tab === 'mini_mcu') setActiveTab(tab);
    const s = searchParams?.get('search');
    if (s !== null && s !== undefined) setSearchTerm(s);
    const d = searchParams?.get('departemen');
    if (d) setDepartemenFilter(d);
    const div = searchParams?.get('divisi');
    if (div) setDivisiFilter(div);
    const b = searchParams?.get('bulan');
    if (b) setBulanFilter(b);
    const st = searchParams?.get('status') || searchParams?.get('kesimpulan');
    if (st) setStatusFilter(st);
    const um = searchParams?.get('umur');
    if (um) setUmurFilter(um);
    const ts = searchParams?.get('tensi');
    if (ts) setTensiFilter(ts);
    const ch = searchParams?.get('kolesterol');
    if (ch) setKolesterolFilter(ch);
    const gl = searchParams?.get('gula_darah');
    if (gl) setGulaFilter(gl);
    const bm = searchParams?.get('bmi');
    if (bm) setBmiFilter(bm);
  }, [searchParams]);

  const resetAllFilters = () => {
    setSearchTerm('');
    setDepartemenFilter('all');
    setDivisiFilter('all');
    setBulanFilter('all');
    setStatusFilter('all');
    setUmurFilter('all');
    setTensiFilter('all');
    setKolesterolFilter('all');
    setGulaFilter('all');
    setBmiFilter('all');
    setCurrentPage(1);
    router.push(`/admin/rekapan-mcu?tab=${activeTab}`);
  };

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    departemenFilter !== 'all' ||
    divisiFilter !== 'all' ||
    bulanFilter !== 'all' ||
    statusFilter !== 'all' ||
    umurFilter !== 'all' ||
    tensiFilter !== 'all' ||
    kolesterolFilter !== 'all' ||
    gulaFilter !== 'all' ||
    bmiFilter !== 'all';

  const targetDataset = activeTab === 'mcu' ? mcuRecords : miniMcuRecords;

  // Total counts for tabs
  const totalAdminMcuCount = mcuRecords.length;
  const totalMiniMcuCount = miniMcuRecords.length;

  // Helper matcher
  const matchEntity = (dep?: string | null, target?: string) => {
    if (!target || target === 'all') return true;
    if (!dep) return false;
    const normDep = dep.toLowerCase();
    const normTarget = target.toLowerCase();
    if (normTarget.includes('ptpn 1') || normTarget.includes('suppco')) return normDep.includes('ptpn 1') || normDep.includes('suppco');
    if (normTarget.includes('ptpn 3') || normTarget.includes('holding')) return normDep.includes('ptpn 3') || normDep.includes('holding');
    if (normTarget.includes('ptpn 4') || normTarget.includes('palmco')) return normDep.includes('ptpn 4') || normDep.includes('palmco');
    return normDep.includes(normTarget);
  };

  // Photo map fallback per peserta
  const photoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of [...mcuRecords, ...miniMcuRecords]) {
      if (r.foto && typeof r.foto === 'string' && r.foto.trim()) {
        const key = getKaryawanUniqueKey(r);
        map.set(key, r.foto);
        const nik = (r.nik || '').trim();
        const name = (r.nama_lengkap || (r as any).nama_karyawan || '').trim().toLowerCase();
        if (nik && nik !== '0000000000') map.set(`nik:${nik}`, r.foto);
        if (name) map.set(`name:${name}`, r.foto);
      }
    }
    return map;
  }, [mcuRecords, miniMcuRecords]);

  // Filtered dataset (100% konsisten dengan permintaan pengguna & sistem)
  const filteredRecords = useMemo(() => {
    const matchedList = targetDataset.filter((rec: any) => {
      const nameStr = (rec.nama_karyawan || rec.nama_lengkap || '').toLowerCase();
      const nikStr = (rec.nik || '').toLowerCase();
      const divStr = (rec.divisi || '').toLowerCase();
      const statusStr = (rec.status_kebugaran || '').toLowerCase();
      const penyakitList = Array.isArray(rec.penyakit_list) ? rec.penyakit_list.join(' ').toLowerCase() : Array.isArray(rec.penyakit) ? rec.penyakit.join(' ').toLowerCase() : (rec.penyakit_text || '').toLowerCase();
      const keluhanStr = (rec.keluhan || rec.faktor_risiko || '').toLowerCase();
      const diagStr = (rec.diagnosa || rec.diagnosa_klinik || '').toLowerCase();
      const inhealthStr = (rec.nomor_inhealth || rec.nomor_pegawai || '').toLowerCase();
      const bpjsStr = (rec.nomor_bpjs || rec.bpjs || '').toLowerCase();

      // 1. Search filter
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !query ||
        nameStr.includes(query) ||
        nikStr.includes(query) ||
        inhealthStr.includes(query) ||
        bpjsStr.includes(query) ||
        divStr.includes(query) ||
        matchDivisi(rec.divisi, query) ||
        statusStr.includes(query) ||
        penyakitList.includes(query) ||
        keluhanStr.includes(query) ||
        diagStr.includes(query);

      // 2. Departemen / Entitas Filter
      const matchesDept = matchEntity(rec.departemen, departemenFilter);

      // 3. Divisi Filter (menggunakan matchDivisi yang sama persis dengan Dashboard)
      const matchesDivisi = matchDivisi(rec.divisi, divisiFilter);

      // 4. Month filter
      const tglStr = rec.tanggal_pemeriksaan || rec.tanggal_kunjungan || '';
      let matchesBulan = true;
      if (bulanFilter !== 'all' && tglStr) {
        matchesBulan = tglStr.toLowerCase().includes(bulanFilter.toLowerCase());
      }

      // 5. Status Kebugaran Filter
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const recFitStatus = getRecordFitnessStatus(rec);
        const normStatus = statusFilter.toLowerCase();
        if (normStatus.includes('catatan') || normStatus === 'fit_dengan_catatan') {
          matchesStatus = recFitStatus === 'fit_dengan_catatan';
        } else if (normStatus.includes('tidak fit') || normStatus.includes('evaluasi') || normStatus.includes('sementara') || normStatus === 'sementara_tidak_fit') {
          matchesStatus = recFitStatus === 'sementara_tidak_fit';
        } else if (normStatus.includes('fit') || normStatus.includes('sehat') || normStatus === 'fit_sehat') {
          matchesStatus = recFitStatus === 'fit_sehat';
        }
      }

      // 6. Umur Filter
      const u = Number(rec.umur || (rec.vitals as any)?.umur || 0);
      const matchesUmur = matchAgeBracket(u, umurFilter);

      // 7. Tensi Filter
      let matchesTensi = true;
      if (tensiFilter !== 'all') {
        const tStatus = getTensiStatus(rec);
        const normT = tensiFilter.toLowerCase();
        if (normT.includes('hipertensi') && !normT.includes('pra')) {
          matchesTensi = tStatus === 'hipertensi';
        } else if (normT.includes('pra')) {
          matchesTensi = tStatus === 'pra_hipertensi';
        } else if (normT.includes('normal')) {
          matchesTensi = tStatus === 'normal';
        }
      }

      // 8. Kolesterol Filter
      let matchesChol = true;
      if (kolesterolFilter !== 'all') {
        const cStatus = getKolesterolStatus(rec);
        const normC = kolesterolFilter.toLowerCase();
        if (normC.includes('tinggi') || normC.includes('≥200') || normC.includes('≥240') || normC.includes('borderline')) {
          matchesChol = cStatus === 'tinggi';
        } else if (normC.includes('normal') || normC.includes('<200')) {
          matchesChol = cStatus === 'normal';
        }
      }

      // 9. Gula Darah Filter
      let matchesGula = true;
      if (gulaFilter !== 'all') {
        const gStatus = getGulaDarahStatus(rec);
        const normG = gulaFilter.toLowerCase();
        if (normG.includes('diabetes') && !normG.includes('pre')) {
          matchesGula = gStatus === 'diabetes';
        } else if (normG.includes('pre')) {
          matchesGula = gStatus === 'pre_diabetes';
        } else if (normG.includes('normal') || normG.includes('<100')) {
          matchesGula = gStatus === 'normal';
        }
      }

      // 10. BMI Filter
      let matchesBmi = true;
      if (bmiFilter !== 'all') {
        const bStatus = getBmiStatus(rec);
        const normB = bmiFilter.toLowerCase();
        if (normB.includes('obesitas') || normB.includes('≥27')) {
          matchesBmi = bStatus === 'obesitas';
        } else if (normB.includes('overweight') || normB.includes('25-26.9')) {
          matchesBmi = bStatus === 'overweight';
        } else if (normB.includes('normal') || normB.includes('18.5-24.9')) {
          matchesBmi = bStatus === 'normal';
        } else if (normB.includes('underweight') || normB.includes('<18.5')) {
          matchesBmi = bStatus === 'underweight';
        }
      }

      return (
        matchesSearch &&
        matchesDept &&
        matchesDivisi &&
        matchesBulan &&
        matchesStatus &&
        matchesUmur &&
        matchesTensi &&
        matchesChol &&
        matchesGula &&
        matchesBmi
      );
    });

    // Urutkan data descending berdasarkan tanggal pemeriksaan terbaru
    const sortedList = [...matchedList].sort((a: any, b: any) => {
      const timeA = a.tanggal_pemeriksaan || a.tanggal_kunjungan || a.created_at || '';
      const timeB = b.tanggal_pemeriksaan || b.tanggal_kunjungan || b.created_at || '';
      return timeB.localeCompare(timeA);
    });

    const cleanQuery = (searchTerm || '').trim();

    // KONDISI 1: JIKA PENGGUNA SEDANG MENCARI NAMA / KATA KUNCI (misal cari "ally"):
    // Tampilkan SEMUA riwayat kunjungan & seluruh tanggal pemeriksaannya tanpa deduplikasi
    if (cleanQuery) {
      return sortedList;
    }

    // KONDISI 2: JIKA BIASA SAJA (TIDAK SEDANG MENCARI NAMA):
    // Tampilkan HANYA 1 nama per karyawan dengan tanggal pemeriksaan terbaru
    return getUniqueEmployeeRecords(sortedList);
  }, [
    targetDataset,
    searchTerm,
    departemenFilter,
    divisiFilter,
    bulanFilter,
    statusFilter,
    umurFilter,
    tensiFilter,
    kolesterolFilter,
    gulaFilter,
    bmiFilter,
  ]);

  // Stat metrics based on filtered records
  const totalMcu = filteredRecords.length;
  const fitCatatan = filteredRecords.filter(
    (r: any) => getRecordFitnessStatus(r) === 'fit_dengan_catatan'
  ).length;
  const followUp = filteredRecords.filter(
    (r: any) => getRecordFitnessStatus(r) === 'sementara_tidak_fit'
  ).length;

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / perPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredRecords.slice(start, start + perPage);
  }, [filteredRecords, currentPage, perPage]);

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      try {
        if (deleteTarget.type === 'mcu') {
          await deleteMcuRecord(deleteTarget.id);
        } else {
          await deleteMiniMcuRecord(deleteTarget.id);
        }
        setSuccessMessage(`Data rekam medis atas nama "${deleteTarget.nama}" berhasil dihapus.`);
        setDeleteTarget(null);
        setTimeout(() => setSuccessMessage(null), 4000);
      } catch (err: any) {
        alert('Gagal menghapus data: ' + (err.message || 'Error server'));
      }
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AppLayout>
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-xs space-y-6">

        {/* Main Header Title & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hasil Rekapitulasi MCU
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Daftar rekapitulasi data pemeriksaan MCU berkala karyawan PTPN 3
            </p>
          </div>

          {/* Search Bar & Filter Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            {/* Search Bar */}
            <div className="relative flex items-center">
              <input
                type="text"
                id="global-search"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Pencarian nama, NIK, atau divisi..."
                className="w-52 sm:w-64 bg-slate-50 text-sm font-medium text-slate-800 placeholder-slate-400 pl-4 pr-10 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition"
              />
              <button
                type="button"
                className="absolute right-3 text-slate-400 hover:text-slate-700"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Entitas Filter Select */}
            <div className="relative">
              <select
                value={departemenFilter}
                onChange={(e) => {
                  setDepartemenFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 text-sm font-semibold text-slate-800 border border-slate-200 rounded-xl px-3.5 py-2 pr-9 outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer appearance-none"
              >
                <option value="all">Semua Entitas</option>
                <option value="PTPN 1">PTPN 1</option>
                <option value="PTPN 3">PTPN 3</option>
                <option value="PTPN 4">PTPN 4</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Month Filter Select */}
            <div className="relative">
              <select
                value={bulanFilter}
                onChange={(e) => {
                  setBulanFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-slate-50 text-sm font-semibold text-slate-800 border border-slate-200 rounded-xl px-3.5 py-2 pr-9 outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition cursor-pointer appearance-none"
              >
                <option value="all">Semua Bulan</option>
                <option value="2026-08">Agustus 2026</option>
                <option value="2026-07">Juli 2026</option>
                <option value="2026-06">Juni 2026</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Ekspor Excel Button */}
            <Link
              href={`/admin/ekspor-excel?search=${encodeURIComponent(searchTerm)}&departemen=${encodeURIComponent(departemenFilter)}&bulan=${encodeURIComponent(bulanFilter)}`}
              className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-2 rounded-xl text-sm font-bold shadow-xs transition cursor-pointer"
              title="Unduh Laporan Excel Rekapitulasi MCU"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Ekspor Excel</span>
            </Link>
          </div>
        </div>

        {/* Reusable Flash Message Alert Component */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-emerald-950 font-bold text-xs shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-800 hover:text-emerald-950"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sub-Tab Toggle Buttons for Admin Rekapan */}
        <div className="flex items-center gap-3 my-5 border-b border-slate-200 pb-3 flex-wrap">
          {/* Tab 1: MCU Admin */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('mcu');
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${activeTab === 'mcu'
                ? 'bg-emerald-800 text-white shadow-md ring-2 ring-emerald-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            <FileText className="w-4 h-4" />
            <span>Data MCU Admin</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'mcu' ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-200 text-slate-800'
                }`}
            >
              {totalAdminMcuCount}
            </span>
          </button>

          {/* Tab 2: Inhouse Clinic Klinik */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('mini_mcu');
              setCurrentPage(1);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition cursor-pointer ${activeTab === 'mini_mcu'
                ? 'bg-emerald-800 text-white shadow-md ring-2 ring-emerald-600'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
          >
            <User className="w-4 h-4" />
            <span>Data Inhouse Clinic Klinik</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'mini_mcu' ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-200 text-slate-800'
                }`}
            >
              {totalMiniMcuCount}
            </span>
          </button>
        </div>

        {/* 3 Summary Metric Cards Components */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
          {/* Card 1: Total Data MCU */}
          <div className="p-5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Total Data {activeTab === 'mcu' ? 'MCU' : 'Inhouse Clinic'}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-blue-950 mt-1">{totalMcu}</h3>
              <p className="text-[11px] font-semibold text-blue-700/80 mt-0.5">Seluruh rekapitulasi data</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Fit dengan Catatan */}
          <div className="p-5 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">Fit dengan Catatan</p>
              <h3 className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">{fitCatatan}</h3>
              <p className="text-[11px] font-semibold text-amber-700/80 mt-0.5">Karyawan perlu evaluasi berkala</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Sementara Tidak Fit */}
          <div className="p-5 bg-rose-50/70 border border-rose-200/80 rounded-2xl flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-xs font-bold text-rose-900 uppercase tracking-wider">Sementara Tidak Fit</p>
              <h3 className="text-2xl sm:text-3xl font-black text-rose-950 mt-1">{followUp}</h3>
              <p className="text-[11px] font-semibold text-rose-700/80 mt-0.5">Memerlukan penanganan medis</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Active Filter Indicators Banner */}
        {hasActiveFilters && (
          <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl flex items-center justify-between flex-wrap gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                Filter Aktif:
              </span>
              {searchTerm && (
                <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-bold">
                  Pencarian: &quot;{searchTerm}&quot;
                </span>
              )}
              {departemenFilter !== 'all' && (
                <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-bold">
                  Entitas: {departemenFilter}
                </span>
              )}
              {divisiFilter !== 'all' && (
                <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-bold">
                  Divisi: {divisiFilter}
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-bold">
                  Status: {statusFilter}
                </span>
              )}
              {umurFilter !== 'all' && (
                <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-bold">
                  Umur: {umurFilter}
                </span>
              )}
              {tensiFilter !== 'all' && (
                <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-bold">
                  Tensi: {tensiFilter}
                </span>
              )}
              {kolesterolFilter !== 'all' && (
                <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-bold">
                  Kolesterol: {kolesterolFilter}
                </span>
              )}
              {gulaFilter !== 'all' && (
                <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-bold">
                  Gula Darah: {gulaFilter}
                </span>
              )}
              {bmiFilter !== 'all' && (
                <span className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-900 font-bold">
                  BMI: {bmiFilter}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={resetAllFilters}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset Filter</span>
            </button>
          </div>
        )}

        {/* Main Data Table Container */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white mt-4 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              {/* Table Header */}
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 pl-5 pr-2 w-14 text-center">No.</th>
                  <th className="py-3.5 px-4">Nama Karyawan</th>
                  <th className="py-3.5 px-4">NIK</th>
                  <th className="py-3.5 px-4">Entitas</th>
                  <th className="py-3.5 px-4">Divisi</th>
                  <th className="py-3.5 px-4">Tanggal Pemeriksaan</th>
                  <th className="py-3.5 px-4">Hasil</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-500 font-medium">
                      Tidak ada data rekam medis yang ditemukan di database.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((mcu: any, idx: number) => {
                    const rowNumber = (currentPage - 1) * perPage + idx + 1;
                    const nama = mcu.nama_karyawan || mcu.nama_lengkap || 'Karyawan';
                    const initials = nama.substring(0, 2).toUpperCase();
                    const tglPemeriksaan = mcu.tanggal_pemeriksaan || mcu.tanggal_kunjungan;
                    const detailHref = activeTab === 'mcu' ? `/admin/mcu/${mcu.id}` : `/klinik/detail-mini-mcu?id=${mcu.id}`;
                    const editHref = activeTab === 'mcu' ? `/admin/edit-data/${mcu.id}` : `/klinik/edit-data/${mcu.id}`;
                    const rowPhoto = mcu.foto || (mcu.nik && mcu.nik !== '0000000000' ? photoMap.get(`nik:${mcu.nik.trim()}`) : undefined) || photoMap.get(`name:${nama.toLowerCase()}`) || null;

                    // Keluhan / Penyakit summary string
                    const penyakitList = mcu.penyakit_list || [];
                    const hasPenyakit = Array.isArray(penyakitList) && penyakitList.length > 0 && penyakitList[0] !== 'Kondisi Fisik Baik';
                    const keluhanCount = hasPenyakit ? penyakitList.length : 0;

                    return (
                      <tr key={mcu.id} className="hover:bg-emerald-50/40 transition">
                        {/* 1. No */}
                        <td className="py-3.5 pl-5 pr-2 text-center font-semibold text-slate-500">
                          {rowNumber}
                        </td>

                        {/* 2. Nama Karyawan */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {rowPhoto ? (
                              <img
                                src={rowPhoto}
                                className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200"
                                alt="Foto"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-emerald-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-2xs">
                                {initials}
                              </div>
                            )}
                            <div className="space-y-0.5">
                              <Link
                                href={detailHref}
                                className="font-bold text-slate-900 hover:text-emerald-800 hover:underline transition block"
                              >
                                {nama}
                              </Link>
                              {(mcu.created_by_role === 'karyawan' || (mcu.diagnosa && mcu.diagnosa.toLowerCase().includes('mandiri')) || (mcu.nama_dokter && mcu.nama_dokter.toLowerCase().includes('mandiri')) || (mcu.nama_rs && mcu.nama_rs.toLowerCase().includes('mandiri'))) && (
                                <span className="inline-block text-[9px] font-extrabold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Pemeriksaan Mandiri
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. NIK */}
                        <td className="py-3.5 px-4 font-mono text-slate-700 font-semibold">
                          <div>{mcu.nik || 'EMP-2026'}</div>
                          {(mcu.nomor_inhealth || (mcu as any).nomor_pegawai) && (
                            <div className="text-[10px] text-slate-500 font-sans font-normal">
                              Inhealth: {mcu.nomor_inhealth || (mcu as any).nomor_pegawai}
                            </div>
                          )}
                        </td>

                        {/* 4. Entitas */}
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-[11px] font-extrabold text-emerald-800 inline-block shadow-2xs">
                            {mcu.departemen || mcu.entitas || 'PTPN 3'}
                          </span>
                        </td>

                        {/* 5. Divisi */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {mcu.divisi &&
                            !['PTPN 1', 'PTPN 3', 'PTPN 4', 'ptpn 1', 'ptpn 3', 'ptpn 4', 'PTPN1', 'PTPN3', 'PTPN4', 'Holding', 'SuppCo', 'PalmCo'].includes(
                              mcu.divisi.trim()
                            ) &&
                            mcu.divisi.trim() !== '-'
                            ? mcu.divisi
                            : '-'}
                        </td>

                        {/* 6. Tanggal Pemeriksaan */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {formatDate(tglPemeriksaan)}
                        </td>

                        {/* 7. Hasil */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          <div className="space-y-1">
                            {(() => {
                              const fitStatus = getRecordFitnessStatus(mcu);
                              if (fitStatus === 'sementara_tidak_fit') {
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-[11px] border border-rose-200">
                                    <XCircle className="w-3 h-3 text-rose-600" />
                                    <span>Sementara Tidak Fit</span>
                                  </span>
                                );
                              }
                              if (fitStatus === 'fit_dengan_catatan') {
                                return (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-[11px] border border-amber-200">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>Fit Catatan</span>
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                                  <span>Fit Sehat</span>
                                </span>
                              );
                            })()}
                            {hasPenyakit && (
                              <div className="text-[10px] text-rose-700 font-medium line-clamp-1 max-w-[220px]" title={penyakitList.join(', ')}>
                                {penyakitList.slice(0, 2).join(', ')}{penyakitList.length > 2 ? ` (+${penyakitList.length - 2})` : ''}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 8. Aksi */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {/* Edit Button */}
                            <Link
                              href={editHref}
                              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition inline-flex items-center justify-center shadow-xs"
                              title="Edit Data MCU"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>

                            {/* Delete Button with Modal Trigger */}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ id: mcu.id, nama, type: activeTab === 'mcu' ? 'mcu' : 'mini' })}
                              className="p-2 rounded-lg bg-slate-200 hover:bg-rose-600 text-slate-700 hover:text-white transition cursor-pointer"
                              title="Hapus Data MCU"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Detail Eye Button */}
                            <Link
                              href={detailHref}
                              className="p-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white transition inline-flex items-center justify-center shadow-xs"
                              title="Lihat Detail Hasil Rekapan MCU"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Clean & Responsive Pagination Bar */}
          <div className="p-4 bg-slate-50/90 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-3">
              <span>
                Menampilkan {filteredRecords.length > 0 ? (currentPage - 1) * perPage + 1 : 0} -{' '}
                {Math.min(currentPage * perPage, filteredRecords.length)} dari {filteredRecords.length} data MCU
              </span>

              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value={10}>10 per hal</option>
                <option value={25}>25 per hal</option>
                <option value={50}>50 per hal</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                .map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded-lg border text-xs font-bold transition cursor-pointer ${currentPage === page
                        ? 'bg-emerald-800 border-emerald-800 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    {page}
                  </button>
                ))}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2.5 bg-rose-100 rounded-xl">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Konfirmasi Hapus Data</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Apakah Anda yakin ingin menghapus data rekam medis atas nama{' '}
                <strong className="text-slate-900 font-bold">{deleteTarget.nama}</strong> dari database Supabase?
              </p>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Ya, Hapus Data
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}

export default function AdminRekapanMcuPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">Memuat Rekapan MCU...</div>}>
      <RekapanMcuContent />
    </Suspense>
  );
}
