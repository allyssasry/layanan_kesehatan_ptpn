'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { useAuth } from '@/context/AuthContext';
import { calculateDonorStats } from '@/services/donorService';
import { DonorDetailModal } from '@/components/donor/DonorDetailModal';
import { DonorDarahRecord } from '@/types/mcu';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  Droplets,
  Users,
  Calendar,
  Heart,
  Plus,
  FileSpreadsheet,
  ArrowRight,
  Building2,
  Activity,
  Award,
  Filter,
  Eye,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function DonorDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { donorRecords, isLoading } = useMcu();

  const [selectedEntityFilter, setSelectedEntityFilter] = useState<string>('Semua');
  const [selectedDonorDetail, setSelectedDonorDetail] = useState<DonorDarahRecord | null>(null);

  // Role check: data luar entitas (Bukan Entitas) hanya boleh untuk admin dan klinik
  const canViewNonEntity = user?.role === 'admin' || user?.role === 'klinik';

  // Base records: luar entitas hanya boleh untuk role admin dan klinik
  const baseRecords = useMemo(() => {
    if (canViewNonEntity) return donorRecords;
    return donorRecords.filter((r) => r.entitas !== 'Bukan Entitas');
  }, [donorRecords, canViewNonEntity]);

  // Filter records by entity if selected
  const filteredRecords = useMemo(() => {
    if (selectedEntityFilter === 'Semua') return baseRecords;
    return baseRecords.filter((r) => r.entitas === selectedEntityFilter);
  }, [baseRecords, selectedEntityFilter]);

  // Hitung statistik dashboard
  const stats = useMemo(() => {
    return calculateDonorStats(filteredRecords);
  }, [filteredRecords]);

  // Golongan Darah Mayoritas
  const topBlood = useMemo(() => {
    if (!stats.golonganDarahStats || stats.golonganDarahStats.length === 0) return null;
    const sorted = [...stats.golonganDarahStats].sort((a, b) => b.count - a.count);
    return sorted[0]?.count > 0 ? sorted[0] : null;
  }, [stats.golonganDarahStats]);

  // 5 Riwayat donor terkini
  const recentDonations = useMemo(() => {
    return [...filteredRecords]
      .sort((a, b) => new Date(b.tanggal_donor).getTime() - new Date(a.tanggal_donor).getTime())
      .slice(0, 6);
  }, [filteredRecords]);

  // Export to Excel function
  const handleExportExcel = () => {
    try {
      const dataToExport = donorRecords.map((r, idx) => ({
        No: idx + 1,
        'Nama Lengkap': r.nama_lengkap,
        NIK: r.nik,
        Entitas: r.entitas,
        Divisi: r.divisi || '-',
        Jabatan: r.jabatan || '-',
        'Golongan Darah': r.golongan_darah,
        'Tanggal Donor': r.tanggal_donor,
        'Lokasi Donor': r.lokasi_donor,
        Keterangan: r.keterangan || '-',
      }));

      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Donor Darah');
      XLSX.writeFile(wb, `Rekap_Donor_Darah_PTPN_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.warn('Gagal ekspor excel:', err);
    }
  };

  const formatDateShort = (dStr?: string) => {
    if (!dStr) return '-';
    try {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const match = dStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${parseInt(match[3], 10)} ${months[parseInt(match[2], 10) - 1]} ${match[1]}`;
      }
      return dStr;
    } catch {
      return dStr;
    }
  };

  const getBloodBadgeColor = (gol?: string) => {
    const clean = (gol || 'O').toUpperCase();
    if (clean.includes('A') && clean.includes('B')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (clean.includes('A')) return 'bg-rose-100 text-rose-800 border-rose-200';
    if (clean.includes('B')) return 'bg-blue-100 text-blue-800 border-blue-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  const getEntityBadgeStyle = (entitas?: string) => {
    const s = String(entitas || '').toLowerCase();
    if (s.includes('1') || s.includes('suppco')) return 'bg-amber-50 text-amber-800 border-amber-300';
    if (s.includes('4') || s.includes('palmco')) return 'bg-teal-50 text-teal-800 border-teal-300';
    return 'bg-emerald-50 text-emerald-800 border-emerald-300';
  };

  return (
    <AppLayout role="klinik" active="/donor-darah/dashboard">
      <div className="space-y-6 pb-12">
        {/* HERO BANNER SECTION */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-800 via-red-700 to-rose-900 p-6 sm:p-8 text-white shadow-xl shadow-rose-950/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-bold text-rose-100">
                <Droplets className="w-3.5 h-3.5 text-rose-200" />
                <span>Portal Resmi Donor Darah PTPN</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Dashboard Manajemen Donor Darah
              </h1>
              <p className="text-xs sm:text-sm text-rose-100 font-medium leading-relaxed">
                Pemantauan real-time partisipasi donor darah seluruh karyawan PTPN Holding, SuppCo, dan PalmCo.
                Identitas pendonor terintegrasi otomatis dengan data peserta MCU terpusat.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/donor-darah/tambah-data"
                className="px-5 py-2.5 rounded-2xl bg-white text-rose-700 hover:bg-rose-50 text-xs font-black shadow-lg shadow-black/10 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Tambah Donor Baru</span>
              </Link>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white text-xs font-bold backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                <span>Ekspor Excel</span>
              </button>
            </div>
          </div>

          {/* Decorative Background Blob */}
          <div className="absolute -right-10 -bottom-10 w-72 h-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        </div>

        {/* ENTITY FILTER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-rose-600" />
            <span>Filter Berdasarkan Entitas:</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(canViewNonEntity
              ? ['Semua', 'PTPN III / Holding', 'PTPN I / SuppCo', 'PTPN IV / PalmCo', 'Bukan Entitas']
              : ['Semua', 'PTPN III / Holding', 'PTPN I / SuppCo', 'PTPN IV / PalmCo']
            ).map((ent) => (
              <button
                key={ent}
                type="button"
                onClick={() => setSelectedEntityFilter(ent)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedEntityFilter === ent
                    ? 'bg-rose-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {ent}
              </button>
            ))}
          </div>
        </div>

        {/* 4 SUMMARY STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Pendonor */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Users className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                Unik
              </span>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {stats.totalPendonor}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">Orang</span>
              <p className="text-xs font-bold text-slate-600 mt-1">Total Pendonor Terdaftar</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Karyawan yang pernah mendonor</p>
            </div>
          </div>

          {/* Card 2: Total Donor */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <Droplets className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                Total
              </span>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {stats.totalDonor}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">Sesi</span>
              <p className="text-xs font-bold text-slate-600 mt-1">Total Kegiatan Donor</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Akumulasi kantong darah terkumpul</p>
            </div>
          </div>

          {/* Card 3: Donor Bulan Ini */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Calendar className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                Bulan Ini
              </span>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {stats.donorBulanIni}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">Karyawan</span>
              <p className="text-xs font-bold text-slate-600 mt-1">Donor Darah Bulan Ini</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Partisipasi aktif periode berjalan</p>
            </div>
          </div>

          {/* Card 4: Golongan Darah Mayoritas */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                <Heart className="w-6 h-6" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-50 text-purple-700 border border-purple-200">
                Mayoritas
              </span>
            </div>
            <div className="mt-4">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {topBlood ? topBlood.name : '-'}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">
                {topBlood ? `(${topBlood.percentage}%)` : ''}
              </span>
              <p className="text-xs font-bold text-slate-600 mt-1">Golongan Darah Mayoritas</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Proporsi terbanyak pendonor</p>
            </div>
          </div>
        </div>

        {/* 2 CHARTS ROW: STATISTIK ENTITAS & STATISTIK GOLONGAN DARAH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CHART 1: STATISTIK PER ENTITAS (7 COLS) */}
          <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-rose-600" />
                  Statistik Donor Darah per Entitas Perusahaan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribusi jumlah pendonor di PTPN III, PTPN I, PTPN IV, dan Bukan Entitas
                </p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.entitasStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                    formatter={(val: any) => [`${val} Orang`, 'Jumlah Pendonor']}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#e11d48">
                    {stats.entitasStats.map((entry, index) => {
                      const colors = ['#059669', '#d97706', '#0d9488', '#64748b'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Entity Summary Mini Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
              {stats.entitasStats.map((ent) => (
                <div key={ent.name} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-500 block truncate" title={ent.name}>
                    {ent.name.replace(' / ', '\n')}
                  </span>
                  <span className="text-base font-black text-slate-900 block mt-0.5">
                    {ent.count} <span className="text-[10px] font-semibold text-slate-400">({ent.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CHART 2: STATISTIK GOLONGAN DARAH (5 COLS) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-rose-600" />
                  Statistik Golongan Darah
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Proporsi golongan darah (A, B, AB, O) para pendonor
                </p>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.golonganDarahStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {stats.golonganDarahStats.map((entry, idx) => (
                      <Cell key={`gol-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                    formatter={(val: any, name: any) => [`${val} Pendonor`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Blood Type Legend Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100">
              {stats.golonganDarahStats.map((g) => (
                <div
                  key={g.name}
                  className="p-2 rounded-xl border border-slate-100 bg-slate-50 flex flex-col items-center justify-center text-center"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                    <span className="text-[11px] font-black text-slate-800">{g.name.replace('Golongan ', '')}</span>
                  </div>
                  <span className="text-xs font-black text-slate-900">{g.count} Orang</span>
                  <span className="text-[10px] text-slate-400 font-semibold">{g.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RECENT DONATIONS TABLE & ACTIONS */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-600" />
                Riwayat Donor Darah Terkini
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar transaksi donor darah terbaru yang tercatat di sistem
              </p>
            </div>
            <Link
              href="/donor-darah/data-donor"
              className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>Lihat Seluruh Data</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3">Pendonor</th>
                  <th className="py-3 px-3">Entitas &amp; Divisi</th>
                  <th className="py-3 px-3">Golongan Darah</th>
                  <th className="py-3 px-3">Tanggal Donor</th>
                  <th className="py-3 px-3">Lokasi Pelaksanaan</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDonations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      Belum ada data donor darah yang tercatat.
                    </td>
                  </tr>
                ) : (
                  recentDonations.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Pendonor */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {r.foto ? (
                              <img src={r.foto} alt={r.nama_lengkap} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{r.nama_lengkap}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{r.nik}</span>
                          </div>
                        </div>
                      </td>

                      {/* Entitas & Divisi */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border block w-fit mb-0.5 ${getEntityBadgeStyle(r.entitas)}`}>
                          {r.entitas}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate block max-w-[180px]">
                          {r.divisi || '-'}
                        </span>
                      </td>

                      {/* Golongan Darah */}
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getBloodBadgeColor(r.golongan_darah)}`}>
                          {r.golongan_darah}
                        </span>
                      </td>

                      {/* Tanggal Donor */}
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {formatDateShort(r.tanggal_donor)}
                      </td>

                      {/* Lokasi Pelaksanaan */}
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800 block truncate max-w-[200px]">{r.lokasi_donor}</span>
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDonorDetail(r)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      <DonorDetailModal
        isOpen={Boolean(selectedDonorDetail)}
        onClose={() => setSelectedDonorDetail(null)}
        record={selectedDonorDetail}
      />
    </AppLayout>
  );
}
