'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useMcu } from '@/context/McuContext';
import { DonorDarahRecord } from '@/types/mcu';
import { DonorDetailModal } from './DonorDetailModal';
import {
  Droplets,
  Heart,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Eye,
  Plus,
  Award,
  Image as ImageIcon,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlignLeft,
  Table2,
  Search,
  X,
  Building2,
  FileText,
  User,
  ShieldCheck,
  ZoomIn,
  Download,
} from 'lucide-react';

interface PatientDonorHistorySectionProps {
  nik?: string | null;
  nama?: string | null;
  role?: 'admin' | 'klinik' | 'karyawan';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const day = parseInt(match[3], 10);
      const mIdx = parseInt(match[2], 10) - 1;
      const year = parseInt(match[1], 10);
      return `${day} ${months[mIdx] || 'Januari'} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatMonthYear(dateStr?: string | null): string {
  if (!dateStr) return '2026';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const match = String(dateStr).match(/^(\d{4})-(\d{2})/);
    if (match) {
      const mIdx = parseInt(match[2], 10) - 1;
      return `${months[mIdx] || 'September'} ${match[1]}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

export const PatientDonorHistorySection: React.FC<PatientDonorHistorySectionProps> = ({
  nik,
  nama,
  role = 'admin',
}) => {
  const { donorRecords } = useMcu();
  const [activeRecordId, setActiveRecordId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [modalRecord, setModalRecord] = useState<DonorDarahRecord | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Match records by NIK or Nama
  const matchedRecords = useMemo(() => {
    const pNik = (nik || '').trim().toLowerCase();
    const pName = (nama || '').trim().toLowerCase();
    if (!pNik && !pName) return [];

    return (donorRecords || [])
      .filter((r) => {
        // Luar entitas hanya boleh masuk ke role admin dan klinik
        if (role !== 'admin' && r.entitas === 'Bukan Entitas') {
          return false;
        }

        const rNik = (r.nik || '').trim().toLowerCase();
        const rName = (r.nama_lengkap || '').trim().toLowerCase();
        if (pNik && rNik && pNik === rNik) return true;
        if (pName && rName && (pName === rName || pName.includes(rName) || rName.includes(pName))) {
          return true;
        }
        return false;
      })
      .sort((a, b) => new Date(b.tanggal_donor).getTime() - new Date(a.tanggal_donor).getTime());
  }, [donorRecords, nik, nama, role]);

  // Set active record default to latest
  useEffect(() => {
    if (matchedRecords.length > 0) {
      if (!activeRecordId || !matchedRecords.some((r) => r.id === activeRecordId)) {
        setActiveRecordId(matchedRecords[0].id);
      }
    } else {
      setActiveRecordId(null);
    }
  }, [matchedRecords, activeRecordId]);

  const activeRecord = useMemo(() => {
    if (!matchedRecords.length) return null;
    return matchedRecords.find((r) => r.id === activeRecordId) || matchedRecords[0];
  }, [matchedRecords, activeRecordId]);

  // Scroll function for cards
  const scrollCards = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Filtered records for table view
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return matchedRecords;
    const q = searchQuery.toLowerCase().trim();
    return matchedRecords.filter((r) => {
      const dateStr = formatDate(r.tanggal_donor).toLowerCase();
      const monthYearStr = formatMonthYear(r.tanggal_donor).toLowerCase();
      const lok = (r.lokasi_donor || '').toLowerCase();
      const gol = (r.golongan_darah || '').toLowerCase();
      const entitas = (r.entitas || '').toLowerCase();
      return (
        dateStr.includes(q) ||
        monthYearStr.includes(q) ||
        lok.includes(q) ||
        gol.includes(q) ||
        entitas.includes(q)
      );
    });
  }, [matchedRecords, searchQuery]);

  // Statistik personal
  const totalCount = matchedRecords.length;
  const latestDonation = matchedRecords[0];

  // Hitung kelayakan donor berikutnya (jeda minimal 60 hari)
  const eligibility = useMemo(() => {
    if (!latestDonation || !latestDonation.tanggal_donor) {
      return { eligible: true, daysLeft: 0, nextDateStr: 'Siap Kapan Saja' };
    }
    const lastDate = new Date(latestDonation.tanggal_donor);
    const nextDate = new Date(lastDate.getTime() + 60 * 86400000);
    const now = new Date();
    const diffMs = nextDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const nextDateStr = nextDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (diffDays <= 0) {
      return { eligible: true, daysLeft: 0, nextDateStr };
    }
    return { eligible: false, daysLeft: diffDays, nextDateStr };
  }, [latestDonation]);

  const verifiedBlood = latestDonation
    ? latestDonation.golongan_darah
    : '-';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 lg:p-7 shadow-xs space-y-6">
      
      {/* SECTION HEADER & VIEW MODE TOGGLE (PERSIS SEPERTI GAMBAR) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#005930] shrink-0" />
              <span>Riwayat Hasil Sesi Donor Darah Karyawan</span>
            </h2>
            {totalCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-[#005930] border border-emerald-200">
                {totalCount} Sesi Tercatat
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-3xl">
            Klik atau pilih kartu atau baris tabel sesi donor di bawah ini untuk menampilkan rincian volume darah, instansi PMI, lokasi donor, golongan darah, serta dokumen lampiran bukti donor.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle Button Kartu / Tabel Data */}
          {matchedRecords.length > 0 && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Tampilan Kartu Sesi"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer text-xs font-bold ${
                  viewMode === 'cards'
                    ? 'bg-white text-emerald-800 shadow-2xs ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <AlignLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kartu</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Tampilan Tabel Data Sesi"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer text-xs font-bold ${
                  viewMode === 'table'
                    ? 'bg-white text-emerald-800 shadow-2xs ring-1 ring-black/5'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabel Data</span>
              </button>
            </div>
          )}

          {/* Action Link for Admin / Klinik */}
          {(role === 'admin' || role === 'klinik') && (
            <Link
              href="/klinik/donor-darah/tambah"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#005930] hover:bg-[#004726] text-white transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Catat Donor Baru</span>
            </Link>
          )}
        </div>
      </div>

      {/* JIKA BELUM ADA DATA */}
      {matchedRecords.length === 0 ? (
        <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
            <Heart className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-black text-slate-800">
            Belum Ada Riwayat Donor Darah
          </h4>
          <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
            Belum ditemukan data sesi donor darah yang tercatat untuk peserta{' '}
            <strong className="text-slate-700">{nama || 'ini'}</strong>
            {nik ? ` (NIK: ${nik})` : ''}.
          </p>
          {(role === 'admin' || role === 'klinik') && (
            <Link
              href="/klinik/donor-darah/tambah"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#005930] hover:bg-[#004726] text-white transition shadow-xs mt-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Data Donor Sekarang</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* MODE 1: CAROUSEL KARTU (PERSIS SEPERTI GAMBAR USER)       */}
          {/* ========================================================= */}
          {viewMode === 'cards' && (
            <div className="flex items-center gap-3">
              {matchedRecords.length > 3 && (
                <button
                  type="button"
                  onClick={() => scrollCards('left')}
                  className="shrink-0 w-9 h-9 rounded-full bg-white border border-slate-300 text-slate-700 shadow-xs hover:bg-[#005930] hover:text-white flex items-center justify-center transition cursor-pointer hover:scale-105 active:scale-95"
                  title="Geser ke Kiri"
                  aria-label="Geser ke Kiri"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}

              <div
                ref={scrollContainerRef}
                className="flex-1 min-w-0 flex overflow-x-auto gap-4 pb-2 pt-1 scroll-smooth snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              >
                {matchedRecords.map((item, idx) => {
                  const isActive = item.id === activeRecordId;
                  const monthYear = formatMonthYear(item.tanggal_donor);
                  const cardTitle = `Hasil Donor Darah ${monthYear}`;
                  const penyelenggaraLabel = 'Donor Darah';
                  const statusLabel = item.status || 'Fit for Duty';

                  return (
                    <button
                      key={`donor-card-${item.id}`}
                      type="button"
                      onClick={() => setActiveRecordId(item.id)}
                      className={`shrink-0 w-full sm:w-[calc(33.3333%-0.67rem)] snap-start text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-[#005930] border-[#005930] text-white ring-2 ring-emerald-600 shadow-md'
                          : 'bg-white border-slate-200 text-slate-900 hover:border-emerald-500 hover:bg-emerald-50/40 shadow-xs'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <p
                          className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`}
                          title={cardTitle}
                        >
                          {cardTitle}
                        </p>
                        <span
                          className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-800 text-emerald-100'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {penyelenggaraLabel}
                        </span>
                        <p
                          className={`text-[11px] flex items-center gap-1 ${
                            isActive ? 'text-emerald-100' : 'text-slate-500'
                          }`}
                        >
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span className="truncate">Tgl: {formatDate(item.tanggal_donor)}</span>
                        </p>
                      </div>

                      <span
                        className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full ${
                          isActive
                            ? 'bg-white text-[#005930]'
                            : 'bg-emerald-700 text-white'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {matchedRecords.length > 3 && (
                <button
                  type="button"
                  onClick={() => scrollCards('right')}
                  className="shrink-0 w-9 h-9 rounded-full bg-white border border-slate-300 text-slate-700 shadow-xs hover:bg-[#005930] hover:text-white flex items-center justify-center transition cursor-pointer hover:scale-105 active:scale-95"
                  title="Geser ke Kanan"
                  aria-label="Geser ke Kanan"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* MODE 2: TABEL DATA DENGAN SEARCH BAR                      */}
          {/* ========================================================= */}
          {viewMode === 'table' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari sesi donor berdasarkan tanggal, PMI, lokasi, golongan darah..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-[11px] font-bold text-slate-500 px-2 shrink-0">
                  Menampilkan {filteredRecords.length} dari {matchedRecords.length} sesi
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[10px] tracking-wider">
                      <th className="py-3 px-4">No</th>
                      <th className="py-3 px-4">Sesi Donor</th>
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Lokasi Pelaksanaan</th>
                      <th className="py-3 px-4">Gol. Darah</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-bold">
                          Tidak ditemukan sesi donor yang sesuai dengan pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((item, idx) => {
                        const isRowActive = item.id === activeRecordId;
                        return (
                          <tr
                            key={`table-donor-${item.id}`}
                            className={`transition hover:bg-emerald-50/50 cursor-pointer ${
                              isRowActive ? 'bg-emerald-50/80 font-bold text-slate-900' : ''
                            }`}
                            onClick={() => setActiveRecordId(item.id)}
                          >
                            <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              Hasil Donor {formatMonthYear(item.tanggal_donor)}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {formatDate(item.tanggal_donor)}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-800">
                                {item.lokasi_donor || 'Klinik Pratama PTPN'}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-black text-rose-700">
                              {item.golongan_darah}
                            </td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-[#005930]">
                                {item.status || 'Fit for Duty'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveRecordId(item.id);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                                  isRowActive
                                    ? 'bg-[#005930] text-white'
                                    : 'bg-slate-100 hover:bg-[#005930] hover:text-white text-slate-700'
                                }`}
                              >
                                {isRowActive ? 'Terpilih' : 'Pilih Sesi'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PANEL RINCIAN SESI DONOR YANG AKTIF DIPILIH               */}
          {/* ========================================================= */}
          {activeRecord && (
            <div className="space-y-4 pt-1">
              {/* Banner Instansi & Status Sesi Aktif */}
              <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#005930] text-white shrink-0 shadow-2xs">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-slate-900 block sm:inline">
                      Lokasi Kegiatan Donor Darah:
                    </span>{' '}
                    <span className="text-[#005930] font-black text-sm">
                      {activeRecord.lokasi_donor || 'Klinik Pratama PTPN'}
                    </span>
                    <span className="text-slate-500 font-medium block text-[11px] mt-0.5">
                      Tanggal Pelaksanaan: <strong>{formatDate(activeRecord.tanggal_donor)}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-[#005930] text-white shadow-2xs">
                    {activeRecord.status || 'Fit for Duty'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalRecord(activeRecord)}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#005930]" />
                    <span>Detail Lengkap</span>
                  </button>
                </div>
              </div>

              {/* Grid Rincian Sesi */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
                {/* 7 Kolom Kiri: Metrik & Parameter Donor */}
                <div className="md:col-span-7 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-3">
                      <Heart className="w-4 h-4 text-rose-600" />
                      <span>Parameter Transfusi & Kelayakan Donor</span>
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                      <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-slate-400 block text-[10px] font-bold">Golongan Darah</span>
                        <span className="text-base font-black text-rose-700">
                          {activeRecord.golongan_darah}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-slate-400 block text-[10px] font-bold">Entitas Unit</span>
                        <span className="text-xs font-extrabold text-slate-800 line-clamp-1 mt-1">
                          {activeRecord.entitas || 'PTPN'}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-slate-400 block text-[10px] font-bold">Divisi / Bagian</span>
                        <span className="text-xs font-extrabold text-slate-800 line-clamp-1 mt-1">
                          {activeRecord.divisi || '-'}
                        </span>
                      </div>

                      <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                        <span className="text-slate-400 block text-[10px] font-bold">Waktu Donor</span>
                        <span className="text-xs font-extrabold text-slate-800 line-clamp-1 mt-1">
                          {formatDate(activeRecord.tanggal_donor)}
                        </span>
                      </div>
                    </div>

                    {/* Keterangan / Catatan Petugas */}
                    <div className="mt-3 p-3 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 block">
                        Catatan & Keterangan Petugas PMI:
                      </span>
                      <p className="text-xs text-slate-700 font-medium">
                        {activeRecord.keterangan ||
                          'Proses donor darah berjalan lancar, tensi dan hemoglobin memenuhi syarat kelayakan pendonor.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span>
                      Peserta: <strong>{activeRecord.nama_lengkap}</strong> (NIK: {activeRecord.nik})
                    </span>
                    <span className="font-mono text-emerald-800 font-bold">
                      ID Sesi #{activeRecord.id}
                    </span>
                  </div>
                </div>

                {/* 5 Kolom Kanan: Bukti Foto / Berkas Sertifikat */}
                <div className="md:col-span-5 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-700" />
                        <span>Bukti / Kartu Donor Darah</span>
                      </h4>
                      {activeRecord.bukti_donor && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#005930]">
                          Ada Berkas
                        </span>
                      )}
                    </div>

                    {activeRecord.bukti_donor ? (
                      <div className="space-y-3">
                        <div
                          onClick={() => setLightboxImage(activeRecord.bukti_donor!)}
                          className="group relative w-full h-44 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-inner"
                        >
                          <img
                            src={activeRecord.bukti_donor}
                            alt="Bukti Donor Darah"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1.5">
                            <ZoomIn className="w-6 h-6" />
                            <span className="text-xs font-bold">Klik untuk Perbesar Foto</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-slate-500 font-medium truncate flex-1" title={activeRecord.nama_bukti_donor || 'Bukti_Donor_Darah.jpg'}>
                            {activeRecord.nama_bukti_donor || 'Bukti_Donor_Darah.jpg'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setLightboxImage(activeRecord.bukti_donor!)}
                            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition"
                          >
                            <ZoomIn className="w-3.5 h-3.5 text-[#005930]" />
                            <span>Perbesar</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="h-44 rounded-xl border border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-center p-4 space-y-2">
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                        <p className="text-xs font-bold text-slate-600">
                          Tidak Ada Lampiran Foto
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-xs">
                          Sesi donor ini dicatat secara manual dari buku register klinik atau laporan PMI.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Profil Ringkas Darah */}
                  <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Golongan Darah Terverifikasi:</span>
                    <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
                      {verifiedBlood}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* LIGHTBOX ZOOM MODAL (UNTUK BUKTI DONOR) */}
      {lightboxImage && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col items-center justify-center p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between px-3 py-2 text-white border-b border-white/10">
              <span className="text-xs font-bold flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span>Bukti / Sertifikat Donor Darah</span>
              </span>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2 overflow-auto max-h-[75vh] flex items-center justify-center">
              <img
                src={lightboxImage}
                alt="Zoom Bukti Donor"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETAIL DONOR LENGKAP */}
      {modalRecord && (
        <DonorDetailModal
          isOpen={!!modalRecord}
          onClose={() => setModalRecord(null)}
          record={modalRecord}
        />
      )}

    </div>
  );
};

export default PatientDonorHistorySection;
