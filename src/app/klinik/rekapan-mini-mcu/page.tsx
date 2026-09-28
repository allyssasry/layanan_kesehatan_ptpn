'use client';

import React, { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { MiniMcuRecord } from '@/types/mcu';
import {
  Search,
  Download,
  Eye,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  PlusCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { isSameDivisi } from '@/lib/divisiMaster';

const INDO_MONTHS: Record<string, string> = {
  '01': 'Januari',
  '02': 'Februari',
  '03': 'Maret',
  '04': 'April',
  '05': 'Mei',
  '06': 'Juni',
  '07': 'Juli',
  '08': 'Agustus',
  '09': 'September',
  '10': 'Oktober',
  '11': 'November',
  '12': 'Desember',
};

function formatMonthYearLabel(ym: string): string {
  if (!ym || ym === 'all') return 'Semua Periode';
  const parts = ym.split('-');
  if (parts.length === 2) {
    const m = INDO_MONTHS[parts[1]] || parts[1];
    return `${m} ${parts[0]}`;
  }
  return ym;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}

function RekapanMiniMcuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { miniMcuRecords, deleteMiniMcuRecord } = useMcu();

  // URL Query Parameters
  const urlSearch =
    searchParams.get('search') ||
    searchParams.get('poli') ||
    searchParams.get('divisi') ||
    searchParams.get('entitas') ||
    searchParams.get('diagnosa') ||
    searchParams.get('obat') ||
    '';
  const urlBulan = searchParams.get('bulan') || 'all';
  const urlStatus = searchParams.get('status') || 'all';

  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [selectedBulan, setSelectedBulan] = useState(urlBulan);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; nama: string } | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Sync state if URL query changes
  useEffect(() => {
    if (urlSearch !== null && urlSearch !== undefined) {
      setSearchTerm(urlSearch);
    }
    if (urlBulan) {
      setSelectedBulan(urlBulan);
    }
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
  }, [urlSearch, urlBulan, urlStatus]);

  // Available Months calculated from records
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthSet.add(currentYM);
    monthSet.add('2026-09');
    monthSet.add('2026-08');
    monthSet.add('2026-07');
    monthSet.add('2026-06');
    monthSet.add('2026-05');

    miniMcuRecords.forEach((rec) => {
      const tgl = rec.tanggal_pemeriksaan || rec.tanggal_kunjungan || '';
      if (tgl && tgl.length >= 7) {
        monthSet.add(tgl.substring(0, 7));
      }
    });

    return Array.from(monthSet).sort().reverse();
  }, [miniMcuRecords]);

  // Photo map fallback per peserta
  const photoMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of miniMcuRecords) {
      if (r.foto && typeof r.foto === 'string' && r.foto.trim()) {
        const nik = (r.nik || '').trim();
        const name = (r.nama_lengkap || r.nama_karyawan || '').trim().toLowerCase();
        if (nik && nik !== '0000000000') map.set(`nik:${nik}`, r.foto);
        if (name) map.set(`name:${name}`, r.foto);
      }
    }
    return map;
  }, [miniMcuRecords]);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    const list = miniMcuRecords.filter((item) => {
      const nama = (item.nama_lengkap || item.nama_karyawan || '').toLowerCase();
      const nik = (item.nik || '').toLowerCase();
      const divisi = (item.divisi || '').toLowerCase();
      const diagnosa = (item.diagnosa || item.diagnosa_klinik || '').toLowerCase();
      const tindak = (item.tindak_lanjut || item.tindakan_terapi || '').toLowerCase();
      const obatList = Array.isArray(item.obat) ? item.obat.join(' ') : Array.isArray(item.obat_list) ? item.obat_list.join(' ') : '';
      const status = (item.status_kebugaran || item.kesimpulan || '').toLowerCase();
      const dept = (item.departemen || 'PTPN 3').toLowerCase();
      const poli = (item.nama_poli || '').toLowerCase();
      const tgl = item.tanggal_pemeriksaan || item.tanggal_kunjungan || '';

      // 1. Search filter
      const q = searchTerm.toLowerCase().trim();
      let matchesSearch = true;
      if (q) {
        if (q === 'fit_dengan_catatan') {
          matchesSearch = status.includes('catatan') || status === 'fit_dengan_catatan';
        } else if (q === 'sementara_tidak_fit') {
          matchesSearch = status.includes('sementara') || status.includes('evaluasi') || status === 'sementara_tidak_fit';
        } else if (q === 'rujukan') {
          matchesSearch = Boolean(item.file_rujukan || item.nama_poli || tindak.includes('rujuk'));
        } else if (q === 'resep_obat') {
          matchesSearch = Boolean(obatList.length > 0 || tindak.includes('obat') || item.tindakan_terapi);
        } else if (q === 'total_kunjungan') {
          matchesSearch = true;
        } else {
          matchesSearch =
            nama.includes(q) ||
            nik.includes(q) ||
            divisi.includes(q) ||
            isSameDivisi(item.divisi, q) ||
            diagnosa.includes(q) ||
            dept.includes(q) ||
            poli.includes(q) ||
            tindak.includes(q) ||
            obatList.toLowerCase().includes(q) ||
            status.includes(q);
        }
      }

      // 2. Month filter
      let matchesMonth = true;
      if (selectedBulan === 'current') {
        const cur = new Date().toISOString().substring(0, 7);
        matchesMonth = tgl.startsWith(cur);
      } else if (selectedBulan !== 'all' && selectedBulan) {
        matchesMonth = tgl.startsWith(selectedBulan);
      }

      // 3. Status filter
      let matchesStatus = true;
      if (statusFilter === 'fit') {
        matchesStatus = status === 'fit' || status === 'fit for duty';
      } else if (statusFilter === 'fit_dengan_catatan') {
        matchesStatus = status.includes('catatan') || status === 'fit_dengan_catatan';
      } else if (statusFilter === 'sementara_tidak_fit') {
        matchesStatus = status.includes('sementara') || status.includes('evaluasi') || status === 'sementara_tidak_fit';
      }

      return matchesSearch && matchesMonth && matchesStatus;
    });

    // Urutkan list berdasarkan tanggal pemeriksaan terbaru (descending)
    const sortedList = [...list].sort((a, b) => {
      const timeA = a.tanggal_pemeriksaan || a.tanggal_kunjungan || '';
      const timeB = b.tanggal_pemeriksaan || b.tanggal_kunjungan || '';
      return timeB.localeCompare(timeA);
    });

    const cleanQuery = (searchTerm || '').trim().toLowerCase();
    const isSpecialKeyword = ['total_kunjungan', 'fit_dengan_catatan', 'sementara_tidak_fit', 'rujukan', 'resep_obat'].includes(cleanQuery);
    const isSearchingNameOrText = Boolean(cleanQuery && !isSpecialKeyword);

    // KONDISI 1: JIKA PENGGUNA SEDANG MENCARI NAMA / KATA KUNCI (misal cari nama "ally"):
    // Tampilkan SEMUA riwayat kunjungan beserta seluruh tanggal pemeriksaannya tanpa deduplikasi
    if (isSearchingNameOrText) {
      return sortedList;
    }

    // KONDISI 2: JIKA BIASA SAJA (TIDAK SEDANG MENCARI NAMA):
    // Tampilkan HANYA 1 nama per karyawan dengan tanggal pemeriksaan terbaru
    const seen = new Set<string>();
    const deduplicated: MiniMcuRecord[] = [];
    for (const rec of sortedList) {
      const nik = (rec.nik || '').trim();
      const nama = (rec.nama_lengkap || rec.nama_karyawan || '').trim().toLowerCase();
      const key = nik && nik !== '0000000000' ? `nik:${nik}` : `name:${nama}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(rec);
      }
    }
    return deduplicated;
  }, [miniMcuRecords, searchTerm, selectedBulan, statusFilter]);

  // Summary Metrics Values (based on month period)
  // Menghitung seluruh jumlah kunjungan klinik (700-an data) tanpa deduplikasi
  const monthPeriodRecords = useMemo(() => {
    return miniMcuRecords.filter((item) => {
      const tgl = item.tanggal_pemeriksaan || item.tanggal_kunjungan || '';
      if (selectedBulan === 'current') {
        const cur = new Date().toISOString().substring(0, 7);
        return tgl.startsWith(cur);
      } else if (selectedBulan !== 'all' && selectedBulan) {
        return tgl.startsWith(selectedBulan);
      }
      return true;
    });
  }, [miniMcuRecords, selectedBulan]);

  const totalMcu = monthPeriodRecords.length;

  const fitCatatan = monthPeriodRecords.filter((r) => {
    const st = (r.status_kebugaran || r.kesimpulan || '').toLowerCase();
    return st.includes('catatan') || st === 'fit_dengan_catatan';
  }).length;

  const followUp = monthPeriodRecords.filter((r) => {
    const st = (r.status_kebugaran || r.kesimpulan || '').toLowerCase();
    return st.includes('sementara') || st.includes('evaluasi') || st === 'sementara_tidak_fit';
  }).length;

  // Pagination calculation
  const totalPages = Math.ceil(filteredRecords.length / perPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * perPage;
    return filteredRecords.slice(start, start + perPage);
  }, [filteredRecords, currentPage, perPage]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedBulan, statusFilter, perPage]);

  // Delete Action
  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteMiniMcuRecord(deleteTarget.id);
      setAlertMessage(`Data pemeriksaan untuk "${deleteTarget.nama}" berhasil dihapus.`);
      setDeleteTarget(null);
      setTimeout(() => setAlertMessage(null), 4000);
    }
  };

  // Export to Multi-Column Excel Spreadsheet (.xls)
  const handleExportCSV = () => {
    const timestamp = new Date().toISOString().substring(0, 10);
    const filename = `Hasil_Inhouse_Clinic_PTPN3_${timestamp}.xls`;

    const headers = [
      'No',
      'Tanggal Pemeriksaan',
      'NIK',
      'Nama Karyawan',
      'Jenis Kelamin',
      'Entitas',
      'Divisi',
      'Jabatan',
      'Keluhan & Diagnosa',
      'Tindak Lanjut / Poli Rujukan',
      'Terapi Obat',
      'Status Kebugaran',
    ];

    const rows = filteredRecords.map((r, idx) => {
      const nama = r.nama_lengkap || r.nama_karyawan || '-';
      const nik = r.nik || '-';
      const jk = r.jenis_kelamin || r.gender || '-';
      const isEntity = ['ptpn 1', 'ptpn 3', 'ptpn 4', 'ptpn1', 'ptpn3', 'ptpn4', 'holding', 'suppco', 'palmco'].includes((r.divisi || '').toLowerCase().trim());
      const div = r.divisi && !isEntity && r.divisi !== '-' ? r.divisi : '-';
      const dept = r.departemen || (r as any).entitas || 'PTPN 3';
      const jab = r.jabatan || '-';
      const tgl = r.tanggal_pemeriksaan || r.tanggal_kunjungan || '-';
      const diag = r.diagnosa || r.diagnosa_klinik || r.keluhan || '-';
      const poli = r.nama_poli || (r as any).nama_poli_rujukan || '';
      const tl = r.tindak_lanjut || r.tindakan_terapi || '-';
      const tlCombined = poli ? `${tl} (Poli: ${poli})` : tl;
      const obat = Array.isArray(r.obat) ? r.obat.join('; ') : Array.isArray(r.obat_list) ? r.obat_list.join('; ') : '-';
      const rawStatus = (r.status_kebugaran || r.kesimpulan || '').toLowerCase();
      let status = 'Fit';
      if (rawStatus.includes('catatan') || rawStatus === 'fit_dengan_catatan') {
        status = 'Fit dengan Catatan';
      } else if (rawStatus.includes('sementara') || rawStatus.includes('evaluasi') || rawStatus === 'sementara_tidak_fit') {
        status = 'Sementara Tidak Fit';
      }

      return [
        idx + 1,
        tgl,
        nik,
        nama,
        jk,
        dept,
        div,
        jab,
        diag,
        tlCombined,
        obat,
        status,
      ];
    });

    const tableHeaders = headers
      .map(
        (h) =>
          `<th style="background-color: #055E38; color: #ffffff; font-weight: bold; border: 1px solid #04482b; padding: 10px 14px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 11pt; text-align: center; vertical-align: middle;">${h}</th>`
      )
      .join('');

    const tableRows = rows
      .map(
        (row, rIdx) =>
          `<tr style="background-color: ${rIdx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            ${row
            .map((cell, cIdx) => {
              const cellStr = cell !== null && cell !== undefined ? String(cell) : '-';
              const hName = (headers[cIdx] || '').toLowerCase();
              const isCenter = cIdx === 0 || hName.includes('tanggal') || hName.includes('status') || hName.includes('jenis kelamin');
              const isNikOrId = hName.includes('nik') || hName === 'no';
              return `<td style="border: 1px solid #cbd5e1; padding: 8px 12px; font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 10.5pt; color: #1e293b; ${isCenter ? 'text-align: center;' : 'text-align: left;'
                } ${isNikOrId ? "mso-number-format:'\\@';" : ''}">${cellStr
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;')}</td>`;
            })
            .join('')}
          </tr>`
      )
      .join('\n');

    const excelContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Rekap Inhouse Clinic</x:Name>
                  <x:WorksheetOptions>
                    <x:DisplayGridlines/>
                  </x:WorksheetOptions>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        </head>
        <body>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
            <tr>
              <td colspan="${headers.length}" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 14pt; font-weight: bold; color: #055E38; padding: 10px 0;">
                Rekap Data Pemeriksaan Inhouse Clinic PTPN 3
              </td>
            </tr>
            <tr>
              <td colspan="${headers.length}" style="font-family: Calibri, 'Segoe UI', Arial, sans-serif; font-size: 9.5pt; color: #64748b; padding-bottom: 12px;">
                Tanggal Unduh: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} • Total: ${rows.length} Baris Data
              </td>
            </tr>
          </table>
          <table style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Badge Status Helper
  const renderStatusBadge = (mcu: any) => {
    const rawStatus = (mcu.status_kebugaran || mcu.kesimpulan || '').toLowerCase();
    const isCatatan = rawStatus.includes('catatan') || rawStatus === 'fit_dengan_catatan';
    const isTidakFit = rawStatus.includes('sementara') || rawStatus.includes('evaluasi') || rawStatus === 'sementara_tidak_fit';

    let badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
    let label = mcu.status_kebugaran || (mcu.kesimpulan === 'fit' ? 'Fit' : 'Fit');

    if (isTidakFit) {
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-200';
      label = mcu.status_kebugaran || 'Sementara Tidak Fit';
    } else if (isCatatan) {
      badgeClass = 'bg-amber-100 text-amber-800 border-amber-200';
      label = mcu.status_kebugaran || 'Fit dengan Catatan';
    }

    const diagnosa = mcu.diagnosa || mcu.diagnosa_klinik;

    return (
      <div className="space-y-1">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border shadow-2xs ${badgeClass}`}>
          {label}
        </span>
        {diagnosa && (
          <p className="text-[11px] text-slate-600 font-medium truncate max-w-[200px]" title={diagnosa}>
            {diagnosa}
          </p>
        )}
      </div>
    );
  };

  return (
    <AppLayout role="klinik" active="rekapan">
      <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-xs">
        {/* ==================================================== */}
        {/* MAIN HEADER TITLE & CONTROLS                        */}
        {/* ==================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Hasil Inhouse Clinic Karyawan
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Daftar rekapitulasi pemeriksaan Inhouse Clinic oleh Tim Medis
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Filter Bulan Select */}
              <div className="relative">
                <select
                  name="bulan"
                  value={selectedBulan}
                  onChange={(e) => setSelectedBulan(e.target.value)}
                  className="bg-slate-50 text-xs font-bold text-slate-800 border border-slate-200 rounded-xl px-3.5 py-2 outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 cursor-pointer transition shadow-2xs"
                >
                  <option value="all">Semua Periode (Riwayat)</option>
                  <option value="current">Bulan Ini / Terbaru</option>
                  {availableMonths.map((mVal) => (
                    <option key={mVal} value={mVal}>
                      {formatMonthYearLabel(mVal)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Input */}
              <div className="relative flex items-center">
                <input
                  type="text"
                  name="search"
                  id="global-search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pencarian nama, NIK, divisi..."
                  className="w-44 sm:w-60 bg-slate-50 text-xs font-medium text-slate-800 placeholder-slate-400 pl-3.5 pr-9 py-2 rounded-xl border border-slate-200 outline-none focus:border-emerald-700 focus:bg-white focus:ring-2 focus:ring-emerald-600/20 transition shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => { }}
                  className="absolute right-3 text-slate-400 hover:text-slate-700"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Input Pemeriksaan Baru Button */}
            {/* <Link
              href="/klinik/tambah-pemeriksaan"
              className="flex items-center gap-1.5 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer active:scale-98"
            >
              <PlusCircle className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>+ Input Baru</span>
            </Link> */}

            {/* Ekspor Excel Button */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer active:scale-98"
              title="Unduh Laporan Excel Rekapitulasi Mini MCU"
            >
              <Download className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>

        {/* Reusable Flash Message Alert Component */}
        {alertMessage && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-2xs">
            <span>{alertMessage}</span>
            <button
              onClick={() => setAlertMessage(null)}
              className="text-emerald-700 hover:text-emerald-950 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ==================================================== */}
        {/* 3 SUMMARY METRIC CARDS                              */}
        {/* ==================================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-6">
          {/* Card 1: Total Mini MCU */}
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group ${statusFilter === 'all'
                ? 'bg-emerald-100/90 border-emerald-300 ring-2 ring-emerald-600/30'
                : 'bg-emerald-50/80 hover:bg-emerald-100/90 border-emerald-200/80'
              }`}
            title="Klik untuk melihat seluruh data kunjungan"
          >
            <div>
              <span className="text-[11px] font-bold text-emerald-900 block uppercase tracking-wider group-hover:underline">
                Total Kunjungan Mini MCU
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1 block">
                {totalMcu.toLocaleString()}
              </span>
              <p className="text-[11px] font-semibold text-emerald-700/80 mt-0.5">Jumlah seluruh kunjungan</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 group-hover:bg-emerald-900 text-white flex items-center justify-center shrink-0 shadow-2xs transition">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Fit dengan Catatan */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'fit_dengan_catatan' ? 'all' : 'fit_dengan_catatan')}
            className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group ${statusFilter === 'fit_dengan_catatan'
                ? 'bg-amber-100/90 border-amber-300 ring-2 ring-amber-600/30'
                : 'bg-amber-50/80 hover:bg-amber-100/90 border-amber-200/80'
              }`}
            title="Klik untuk memfilter Fit dengan Catatan"
          >
            <div>
              <span className="text-[11px] font-bold text-amber-900 block uppercase tracking-wider group-hover:underline">
                Fit dengan Catatan
              </span>
              <span className="text-2xl sm:text-3xl font-black text-amber-950 mt-1 block">
                {fitCatatan.toLocaleString()}
              </span>
              <p className="text-[11px] font-semibold text-amber-700/80 mt-0.5">Karyawan perlu evaluasi berkala</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-600 group-hover:bg-amber-700 text-white flex items-center justify-center shrink-0 shadow-2xs transition">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Sementara Tidak Fit */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'sementara_tidak_fit' ? 'all' : 'sementara_tidak_fit')}
            className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 group ${statusFilter === 'sementara_tidak_fit'
                ? 'bg-rose-100/90 border-rose-300 ring-2 ring-rose-600/30'
                : 'bg-rose-50/80 hover:bg-rose-100/90 border-rose-200/80'
              }`}
            title="Klik untuk memfilter Sementara Tidak Fit"
          >
            <div>
              <span className="text-[11px] font-bold text-rose-900 block uppercase tracking-wider group-hover:underline">
                Sementara Tidak Fit
              </span>
              <span className="text-2xl sm:text-3xl font-black text-rose-950 mt-1 block">
                {followUp.toLocaleString()}
              </span>
              <p className="text-[11px] font-semibold text-rose-700/80 mt-0.5">Memerlukan penanganan medis</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-600 group-hover:bg-rose-700 text-white flex items-center justify-center shrink-0 shadow-2xs transition">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Active Filter Badge Bar */}
        {(searchTerm || statusFilter !== 'all' || selectedBulan !== 'all') && (
          <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700">Filter Aktif:</span>
              {searchTerm && (
                <span className="px-2.5 py-0.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold">
                  Pencarian: &quot;{searchTerm}&quot;
                </span>
              )}
              {selectedBulan !== 'all' && (
                <span className="px-2.5 py-0.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold">
                  Periode: {formatMonthYearLabel(selectedBulan)}
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-2.5 py-0.5 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold">
                  Status: {statusFilter === 'fit_dengan_catatan' ? 'Fit dengan Catatan' : 'Sementara Tidak Fit'}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedBulan('all');
                setStatusFilter('all');
                router.push('/klinik/rekapan-mini-mcu');
              }}
              className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filter
            </button>
          </div>
        )}

        {/* ==================================================== */}
        {/* MAIN DATA TABLE CONTAINER                           */}
        {/* ==================================================== */}
        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white mt-6 shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3.5 pl-5 pr-2 w-14 text-center">No.</th>
                  <th className="py-3.5 px-4">Nama Karyawan</th>
                  <th className="py-3.5 px-4">NIK</th>
                  <th className="py-3.5 px-4">Divisi</th>
                  <th className="py-3.5 px-4">Tanggal Pemeriksaan</th>
                  <th className="py-3.5 px-4">Hasil</th>
                  <th className="py-3.5 px-5 text-right">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 text-xs font-medium text-slate-800">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-500 font-medium">
                      Tidak ada data rekam medis klinik yang ditemukan di database.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((mcu, idx) => {
                    const rowNumber = (currentPage - 1) * perPage + idx + 1;
                    const nama = mcu.nama_lengkap || mcu.nama_karyawan || 'Karyawan';
                    const initials = nama.substring(0, 2).toUpperCase();
                    const detailHref = `/klinik/detail-mini-mcu?id=${mcu.id}`;
                    const editHref = `/klinik/edit-data?id=${mcu.id}`;
                    const rowPhoto = mcu.foto || (mcu.nik && mcu.nik !== '0000000000' ? photoMap.get(`nik:${mcu.nik.trim()}`) : undefined) || photoMap.get(`name:${nama.toLowerCase()}`) || null;

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
                            <Link
                              href={detailHref}
                              className="font-bold text-slate-900 hover:text-emerald-800 hover:underline transition"
                            >
                              {nama}
                            </Link>
                          </div>
                        </td>

                        {/* 3. NIK */}
                        <td className="py-3.5 px-4 font-mono text-slate-700 font-semibold">{mcu.nik}</td>

                        {/* 4. Divisi */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {mcu.divisi &&
                            !['PTPN 1', 'PTPN 3', 'PTPN 4', 'ptpn 1', 'ptpn 3', 'ptpn 4', 'PTPN1', 'PTPN3', 'PTPN4', 'Holding', 'SuppCo', 'PalmCo'].includes(
                              mcu.divisi.trim()
                            ) &&
                            mcu.divisi.trim() !== '-'
                            ? mcu.divisi
                            : '-'}
                        </td>

                        {/* 5. Tanggal Pemeriksaan */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {formatDate(mcu.tanggal_pemeriksaan || mcu.tanggal_kunjungan)}
                        </td>

                        {/* 6. Hasil */}
                        <td className="py-3.5 px-4 text-slate-700 font-medium">
                          {renderStatusBadge(mcu)}
                        </td>

                        {/* 7. Aksi */}
                        <td className="py-3.5 px-5 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Edit Button */}
                            <Link
                              href={editHref}
                              className="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition inline-flex items-center justify-center shadow-xs cursor-pointer"
                              title="Edit Data Mini MCU"
                            >
                              <Edit2 className="w-4 h-4" />
                            </Link>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ id: mcu.id, nama })}
                              className="p-2 rounded-lg bg-slate-200 hover:bg-rose-600 text-slate-700 hover:text-white transition cursor-pointer"
                              title="Hapus Data Mini MCU"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Detail Eye Button */}
                            <Link
                              href={detailHref}
                              className="p-2 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white transition inline-flex items-center justify-center shadow-xs cursor-pointer"
                              title="Lihat Detail Pemeriksaan Mini MCU"
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

          {/* ==================================================== */}
          {/* PAGINATION BAR                                      */}
          {/* ==================================================== */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <span>
                Menampilkan{' '}
                <strong className="text-slate-900">
                  {filteredRecords.length === 0 ? 0 : (currentPage - 1) * perPage + 1}
                </strong>{' '}
                -{' '}
                <strong className="text-slate-900">
                  {Math.min(currentPage * perPage, filteredRecords.length)}
                </strong>{' '}
                dari <strong className="text-slate-900">{filteredRecords.length}</strong> data Mini MCU
              </span>

              <select
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
                className="ml-2 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none text-xs font-bold text-slate-700 shadow-2xs"
              >
                <option value={10}>10 / halaman</option>
                <option value={25}>25 / halaman</option>
                <option value={50}>50 / halaman</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition shadow-2xs flex items-center gap-1 text-slate-700 font-bold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 5) return true;
                  return Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages;
                })
                .map((page, idx, arr) => {
                  const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                      <button
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition shadow-2xs ${currentPage === page
                            ? 'bg-emerald-800 text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition shadow-2xs flex items-center gap-1 text-slate-700 font-bold"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Delete Modal */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Konfirmasi Hapus Data</h3>
                  <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin menghapus data rekam medis Mini MCU untuk{' '}
                <strong className="text-slate-900">{deleteTarget.nama}</strong>?
              </p>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function KlinikRekapanMiniMcuPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">Memuat data pemeriksaan klinik...</div>}>
      <RekapanMiniMcuContent />
    </Suspense>
  );
}
