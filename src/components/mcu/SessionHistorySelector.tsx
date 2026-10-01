'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlignLeft,
  Table2,
  Search,
  X,
  CheckCircle2,
  Stethoscope,
  Building2,
  Hospital,
  Activity,
} from 'lucide-react';

export interface SessionHistoryItem {
  id: string | number;
  created_by_role?: string;
  tanggal_pemeriksaan?: string | null;
  status_kebugaran?: string | null;
  kesimpulan?: string | null;
  nama_rs?: string | null;
  instansi_pemeriksa?: string | null;
  nama_dokter?: string | null;
  diagnosa?: string | null;
  keluhan?: string | null;
  faktor_risiko?: string | null;
  tensi?: string | null;
  gula_darah?: string | number | null;
  berat_badan?: string | number | null;
  tinggi_badan?: string | number | null;
  vitals?: any;
  vitals_updated_by_role?: string | null;
  [key: string]: any;
}

export interface SessionHistorySelectorProps {
  sessions: SessionHistoryItem[];
  activeSessionKey: string;
  onSelectSession: (sessionKey: string) => void;
  role?: 'admin' | 'klinik' | 'karyawan';
  title?: string;
  subtitle?: string;
  getKey?: (rec: SessionHistoryItem) => string;
}

// Helpers
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const isoDateMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoDateMatch) {
      const day = parseInt(isoDateMatch[3], 10);
      const monthIdx = parseInt(isoDateMatch[2], 10) - 1;
      const year = parseInt(isoDateMatch[1], 10);
      return `${day} ${months[monthIdx] || 'Januari'} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function formatMonthYear(dateStr: string | null | undefined): string {
  if (!dateStr) return '2026';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const match = String(dateStr).match(/^(\d{4})-(\d{2})/);
      if (match) {
        const mIdx = parseInt(match[2], 10) - 1;
        return `${months[mIdx] || 'September'} ${match[1]}`;
      }
      return dateStr;
    }
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function isSessionMandiri(sRec: SessionHistoryItem): boolean {
  return Boolean(
    sRec.created_by_role === 'karyawan' ||
    sRec.vitals_updated_by_role === 'karyawan' ||
    (sRec.nama_dokter && String(sRec.nama_dokter).toLowerCase().includes('mandiri')) ||
    (sRec.diagnosa && String(sRec.diagnosa).toLowerCase().includes('mandiri')) ||
    (sRec.nama_rs && String(sRec.nama_rs).toLowerCase().includes('mandiri'))
  );
}

function getSessionTitle(sRec: SessionHistoryItem, isMandiri: boolean): string {
  const monthYearStr = formatMonthYear(sRec.tanggal_pemeriksaan);
  if (isMandiri) {
    return `Hasil MCU Mandiri ${monthYearStr}`;
  }
  if (sRec.created_by_role === 'klinik') {
    return `Hasil Mini MCU ${monthYearStr}`;
  }
  return `Hasil MCU ${monthYearStr}`;
}

function getRoleLabel(sRec: SessionHistoryItem, isMandiri: boolean): string {
  if (isMandiri) return 'Pemeriksaan Mandiri';
  if (sRec.created_by_role === 'klinik') return 'Klinik';
  return 'Admin';
}

function getStatusBadgeStyle(status?: string | null): string {
  if (!status) return 'bg-emerald-700 text-white';
  const clean = status.toLowerCase();
  if (clean.includes('unfit') || clean.includes('tidak fit') || clean.includes('tidak_fit')) {
    return 'bg-rose-600 text-white';
  }
  if (clean.includes('catatan') || clean.includes('temporary') || clean.includes('fit_dengan_catatan')) {
    return 'bg-amber-500 text-slate-900';
  }
  return 'bg-emerald-700 text-white';
}

function getVitalsSummary(sRec: SessionHistoryItem): string {
  const tensi = sRec.tensi || (sRec.vitals as any)?.tensi || (
    (sRec.vitals as any)?.tensi_sistolik && (sRec.vitals as any)?.tensi_diastolik
      ? `${(sRec.vitals as any).tensi_sistolik}/${(sRec.vitals as any).tensi_diastolik}`
      : null
  );
  const gula = sRec.gula_darah ?? (sRec.vitals as any)?.gula_darah;

  const parts: string[] = [];
  if (tensi) parts.push(`TD: ${tensi} mmHg`);
  if (gula !== undefined && gula !== null && gula !== '' && gula !== '-') parts.push(`Gula: ${gula} mg/dL`);
  return parts.length > 0 ? parts.join(' | ') : '-';
}

export function getSessionInstansi(sRec: SessionHistoryItem): string {
  // Sesi pemeriksaan dari klinik selalu Inhouse Clinic
  if (sRec.created_by_role === 'klinik') {
    return 'Inhouse Clinic';
  }

  const raw = sRec.nama_rs || sRec.nama_instansi || sRec.instansi_pemeriksa || sRec.nama_klinik || sRec.rumah_sakit_rujukan;
  if (!raw || typeof raw !== 'string') return '-';
  const trimmed = raw.trim();
  if (['-', 'null', 'undefined', '', 'klinik pratama ptpn', 'klinik pratama ptpn 3'].includes(trimmed.toLowerCase())) {
    return '-';
  }
  return trimmed;
}

export function SessionHistorySelector({
  sessions,
  activeSessionKey,
  onSelectSession,
  role = 'admin',
  title = 'Riwayat Hasil Sesi Pemeriksaan MCU Karyawan',
  subtitle = 'Pilih atau klik sesi MCU di bawah ini untuk melihat detail keluhan, diagnosa, konsul, anjuran, saran, serta dokumen hasil pemeriksaan.',
  getKey,
}: SessionHistorySelectorProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const resolveKey = (sRec: SessionHistoryItem): string => {
    if (getKey) return getKey(sRec);
    const isMandiri = isSessionMandiri(sRec);
    const roleKey = isMandiri ? 'karyawan' : (sRec.created_by_role || 'admin');
    return `${roleKey}-${sRec.id}`;
  };

  const scrollSessions = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  // Filtered sessions for table view
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase().trim();
    return sessions.filter((sRec) => {
      const isMandiri = isSessionMandiri(sRec);
      const titleStr = getSessionTitle(sRec, isMandiri).toLowerCase();
      const roleStr = getRoleLabel(sRec, isMandiri).toLowerCase();
      const dateStr = formatDate(sRec.tanggal_pemeriksaan).toLowerCase();
      const statusStr = (sRec.status_kebugaran || sRec.kesimpulan || '').toLowerCase();
      const instansiRaw = getSessionInstansi(sRec);
      const instansiStr = instansiRaw !== '-' ? instansiRaw.toLowerCase() : '';
      const diagnosaStr = (sRec.diagnosa || '').toLowerCase();
      const keluhanStr = (sRec.keluhan || '').toLowerCase();
      const tensiStr = String(sRec.tensi || '').toLowerCase();

      return (
        titleStr.includes(q) ||
        roleStr.includes(q) ||
        dateStr.includes(q) ||
        statusStr.includes(q) ||
        instansiStr.includes(q) ||
        diagnosaStr.includes(q) ||
        keluhanStr.includes(q) ||
        tensiStr.includes(q)
      );
    });
  }, [sessions, searchQuery]);

  return (
    <div className="space-y-4 pt-4 border-t border-slate-200">
      {/* SECTION HEADER & VIEW MODE TOGGLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#005930] shrink-0" />
            <span>{title}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5 max-w-3xl">
            {subtitle}
          </p>
        </div>

        {/* View Mode Toggle Pill (Matching image design) */}
        <div className="flex items-center self-start sm:self-auto bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold shrink-0 shadow-2xs">
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
      </div>

      {/* ========================================================= */}
      {/* MODE 1: CARDS / CAROUSEL VIEW                             */}
      {/* ========================================================= */}
      {viewMode === 'cards' && (
        <div className="flex items-center gap-3">
          {sessions.length > 3 && (
            <button
              type="button"
              onClick={() => scrollSessions('left')}
              className="shrink-0 w-9 h-9 rounded-full bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-[#005930] hover:text-white flex items-center justify-center transition cursor-pointer hover:scale-105 active:scale-95"
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
            {sessions.map((sRec) => {
              const sKey = resolveKey(sRec);
              const isActive = sKey === activeSessionKey;
              const isMandiri = isSessionMandiri(sRec);
              const sRoleLabel = getRoleLabel(sRec, isMandiri);
              const sTitle = getSessionTitle(sRec, isMandiri);
              const sDate = formatDate(sRec.tanggal_pemeriksaan);
              const sStatus = sRec.status_kebugaran || sRec.kesimpulan || 'Fit for Duty';

              return (
                <button
                  key={sKey}
                  type="button"
                  onClick={() => onSelectSession(sKey)}
                  className={`shrink-0 w-full sm:w-[calc(33.3333%-0.67rem)] snap-start text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-[#005930] border-[#005930] text-white ring-2 ring-emerald-600 shadow-md'
                      : 'bg-white border-slate-200 text-slate-900 hover:border-emerald-500 hover:bg-emerald-50/40 shadow-xs'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-900'}`} title={sTitle}>
                      {sTitle}
                    </p>
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {sRoleLabel}
                    </span>
                    <p className={`text-[11px] flex items-center gap-1 ${isActive ? 'text-emerald-100' : 'text-slate-500'}`}>
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span className="truncate">Tgl: {sDate}</span>
                    </p>
                  </div>

                  <span
                    className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full ${
                      isActive ? 'bg-white text-[#005930]' : getStatusBadgeStyle(sStatus)
                    }`}
                  >
                    {sStatus}
                  </span>
                </button>
              );
            })}
          </div>

          {sessions.length > 3 && (
            <button
              type="button"
              onClick={() => scrollSessions('right')}
              className="shrink-0 w-9 h-9 rounded-full bg-white border border-slate-300 text-slate-700 shadow-sm hover:bg-[#005930] hover:text-white flex items-center justify-center transition cursor-pointer hover:scale-105 active:scale-95"
              title="Geser ke Kanan"
              aria-label="Geser ke Kanan"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: TABLE VIEW WITH SEARCH BAR                        */}
      {/* ========================================================= */}
      {viewMode === 'table' && (
        <div className="space-y-3">
          {/* Search Bar & Counter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari sesi pemeriksaan (tanggal, jenis MCU, diagnosa, keluhan, status, RS/dokter)..."
                className="w-full pl-10 pr-9 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                  title="Hapus pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-semibold text-slate-600 shrink-0">
              <span className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                Menampilkan <strong>{filteredSessions.length}</strong> dari <strong>{sessions.length}</strong> sesi
              </span>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 text-slate-700 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4">Tanggal Pemeriksaan</th>
                  <th className="py-3 px-4">Sesi &amp; Penyelenggara</th>
                  <th className="py-3 px-4">Instansi Pemeriksa</th>
                  <th className="py-3 px-4">Diagnosa / Keluhan</th>
                  <th className="py-3 px-4">Tensi &amp; Vitals</th>
                  <th className="py-3 px-4">Status Kebugaran</th>
                  <th className="py-3 px-4 text-center w-32">Aksi / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">Tidak ada sesi pemeriksaan yang cocok</p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Coba kata kunci pencarian lain atau klik tombol reset.
                      </p>
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
                      >
                        Reset Pencarian
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((sRec, idx) => {
                    const sKey = resolveKey(sRec);
                    const isActive = sKey === activeSessionKey;
                    const isMandiri = isSessionMandiri(sRec);
                    const sRoleLabel = getRoleLabel(sRec, isMandiri);
                    const sTitle = getSessionTitle(sRec, isMandiri);
                    const sDate = formatDate(sRec.tanggal_pemeriksaan);
                    const sStatus = sRec.status_kebugaran || sRec.kesimpulan || 'Fit for Duty';
                    const instansiName = getSessionInstansi(sRec);
                    const vitalsSummary = getVitalsSummary(sRec);

                    return (
                      <tr
                        key={sKey}
                        onClick={() => onSelectSession(sKey)}
                        className={`transition-colors cursor-pointer group ${
                          isActive
                            ? 'bg-emerald-50/90 font-medium'
                            : 'hover:bg-slate-50/80 text-slate-700'
                        }`}
                      >
                        {/* No */}
                        <td className="py-3.5 px-3 text-center font-bold text-slate-500">
                          {isActive ? (
                            <span className="w-6 h-6 rounded-full bg-[#005930] text-white text-[11px] font-black inline-flex items-center justify-center mx-auto shadow-2xs">
                              {idx + 1}
                            </span>
                          ) : (
                            idx + 1
                          )}
                        </td>

                        {/* Tanggal */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#005930] shrink-0" />
                            <span>{sDate}</span>
                          </div>
                        </td>

                        {/* Sesi & Role */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 block truncate max-w-[200px]" title={sTitle}>
                              {sTitle}
                            </span>
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isMandiri
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : sRec.created_by_role === 'klinik'
                                  ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {sRoleLabel}
                            </span>
                          </div>
                        </td>

                        {/* Instansi Pemeriksa */}
                        <td className="py-3.5 px-4">
                          {instansiName !== '-' ? (
                            <div className="flex items-center gap-1.5 text-slate-800 font-semibold max-w-[180px] truncate" title={instansiName}>
                              <Hospital className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{instansiName}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-bold">-</span>
                          )}
                        </td>

                        {/* Diagnosa / Keluhan */}
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 truncate" title={sRec.diagnosa || '-'}>
                              {sRec.diagnosa || '-'}
                            </p>
                            {sRec.keluhan && sRec.keluhan !== '-' && (
                              <p className="text-[11px] text-slate-500 truncate" title={sRec.keluhan}>
                                Keluhan: {sRec.keluhan}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Tensi & Vitals */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                            <Activity className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span>{vitalsSummary}</span>
                          </div>
                        </td>

                        {/* Status Kebugaran */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block text-[10px] font-black px-2.5 py-1 rounded-full shadow-2xs ${getStatusBadgeStyle(
                              sStatus
                            )}`}
                          >
                            {sStatus}
                          </span>
                        </td>

                        {/* Aksi / Status */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-[#005930] text-white shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Terpilih</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectSession(sKey);
                              }}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-emerald-50 text-slate-700 hover:text-[#005930] border border-slate-200 hover:border-emerald-500 transition shadow-2xs cursor-pointer group-hover:border-emerald-400"
                            >
                              Pilih Sesi
                            </button>
                          )}
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
    </div>
  );
}
