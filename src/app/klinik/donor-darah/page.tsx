'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { useAuth } from '@/context/AuthContext';
import { DonorDarahRecord } from '@/types/mcu';
import { DonorDetailModal } from '@/components/donor/DonorDetailModal';
import * as XLSX from 'xlsx';
import {
  Droplets,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Eye,
  Edit,
  Trash2,
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  X,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';

export default function DataDonorDarahPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { donorRecords, deleteDonorRecord, isLoading } = useMcu();

  // Role check: data luar entitas (Bukan Entitas) hanya boleh untuk admin dan klinik
  const canViewNonEntity = user?.role === 'admin' || user?.role === 'klinik';

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('Semua');
  const [selectedBlood, setSelectedBlood] = useState<string>('Semua');

  // Modal States
  const [selectedDetail, setSelectedDetail] = useState<DonorDarahRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<DonorDarahRecord | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return donorRecords.filter((r) => {
      // 0. Luar entitas hanya boleh masuk ke role donor_darah dan admin
      if (!canViewNonEntity && r.entitas === 'Bukan Entitas') {
        return false;
      }

      // 1. Text search
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.nama_lengkap.toLowerCase().includes(q) ||
        r.nik.toLowerCase().includes(q) ||
        (r.divisi && r.divisi.toLowerCase().includes(q)) ||
        r.lokasi_donor.toLowerCase().includes(q);

      // 2. Entity filter
      const matchEntity = selectedEntity === 'Semua' || r.entitas === selectedEntity;

      // 3. Blood type filter
      let golClean = (r.golongan_darah || '').toUpperCase().replace(/[^ABO]/g, '');
      const matchBlood = selectedBlood === 'Semua' || golClean === selectedBlood;

      return matchSearch && matchEntity && matchBlood;
    });
  }, [donorRecords, searchTerm, selectedEntity, selectedBlood, canViewNonEntity]);

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteDonorRecord(recordToDelete.id);
      setSuccessToast(`Data donor atas nama "${recordToDelete.nama_lengkap}" berhasil dihapus.`);
      setRecordToDelete(null);
      setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
      console.warn('Gagal menghapus donor record:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    try {
      const exportData = filteredRecords.map((r, i) => ({
        No: i + 1,
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

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data Donor Darah');
      XLSX.writeFile(wb, `Data_Donor_Darah_PTPN_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
    if (s.includes('bukan') || s.includes('non') || s.includes('eksternal') || s.includes('umum') || s.includes('luar')) {
      return 'bg-slate-100 text-slate-700 border-slate-300';
    }
    if (s.includes('1') || s.includes('suppco')) return 'bg-amber-50 text-amber-800 border-amber-300';
    if (s.includes('4') || s.includes('palmco')) return 'bg-teal-50 text-teal-800 border-teal-300';
    return 'bg-emerald-50 text-emerald-800 border-emerald-300';
  };

  return (
    <AppLayout role="klinik" active="/klinik/donor-darah">
      <div className="space-y-6 pb-12">
        {/* Header Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
              <Droplets className="w-4 h-4" />
              <span>Database Terpadu Transfusi &amp; Donor Darah</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Data Donor Darah Karyawan
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Kelola riwayat donor, pencarian identitas, detail donor, filter entitas, dan ekspor data.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Ekspor Excel</span>
            </button>
            <Link
              href="/klinik/donor-darah/tambah"
              className="px-4 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-rose-900/15"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Data</span>
            </Link>
          </div>
        </div>

        {/* Success Toast Notification */}
        {successToast && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold">{successToast}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessToast(null)}
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
            {/* Search Input (6 Cols) */}
            <div className="md:col-span-6 relative">
              <input
                type="text"
                placeholder="Cari nama karyawan, NIK, atau lokasi kegiatan donor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition placeholder-slate-400 font-medium"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Entitas (3 Cols) */}
            <div className="md:col-span-3">
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition font-semibold text-slate-800 cursor-pointer"
              >
                <option value="Semua">Semua Entitas</option>
                <option value="PTPN III / Holding">PTPN III / Holding</option>
                <option value="PTPN I / SuppCo">PTPN I / SuppCo</option>
                <option value="PTPN IV / PalmCo">PTPN IV / PalmCo</option>
                {canViewNonEntity && <option value="Bukan Entitas">Bukan Entitas</option>}
              </select>
            </div>

            {/* Filter Golongan Darah (3 Cols) */}
            <div className="md:col-span-3">
              <select
                value={selectedBlood}
                onChange={(e) => setSelectedBlood(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition font-semibold text-slate-800 cursor-pointer"
              >
                <option value="Semua">Semua Golongan Darah</option>
                <option value="A">Golongan A</option>
                <option value="B">Golongan B</option>
                <option value="AB">Golongan AB</option>
                <option value="O">Golongan O</option>
              </select>
            </div>
          </div>

          {/* Quick Info Bar */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>
              Menampilkan <strong className="text-slate-900">{filteredRecords.length}</strong> data donor darah
            </span>
            {(searchTerm || selectedEntity !== 'Semua' || selectedBlood !== 'Semua') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedEntity('Semua');
                  setSelectedBlood('Semua');
                }}
                className="text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
              >
                Reset Semua Filter
              </button>
            )}
          </div>
        </div>

        {/* TABLE DATA DONOR DARAH */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-4">Pendonor</th>
                  <th className="py-3.5 px-4">Entitas &amp; Divisi</th>
                  <th className="py-3.5 px-4">Gol. Darah</th>
                  <th className="py-3.5 px-4">Tanggal Donor</th>
                  <th className="py-3.5 px-4">Lokasi Pelaksanaan</th>
                  <th className="py-3.5 px-4 text-center">Bukti</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 italic">
                      Tidak ditemukan data donor darah yang sesuai dengan filter atau kata kunci.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Pendonor (Foto, Nama, NIK) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                            {r.foto ? (
                              <img src={r.foto} alt={r.nama_lengkap} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-black text-slate-900 block">{r.nama_lengkap}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{r.nik}</span>
                          </div>
                        </div>
                      </td>

                      {/* Entitas & Divisi */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border block w-fit mb-1 ${getEntityBadgeStyle(r.entitas)}`}>
                          {r.entitas}
                        </span>
                        <span className="text-[11px] text-slate-500 truncate block max-w-[190px]">
                          {r.divisi || '-'}
                        </span>
                      </td>

                      {/* Golongan Darah */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${getBloodBadgeColor(r.golongan_darah)}`}>
                          {r.golongan_darah}
                        </span>
                      </td>

                      {/* Tanggal Donor */}
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {formatDateShort(r.tanggal_donor)}
                      </td>

                      {/* Lokasi Pelaksanaan */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block truncate max-w-[220px]">{r.lokasi_donor}</span>
                      </td>

                      {/* Bukti Donor */}
                      <td className="py-3.5 px-4 text-center">
                        {r.bukti_donor ? (
                          <button
                            type="button"
                            onClick={() => setSelectedDetail(r)}
                            className="p-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                            title="Ada berkas bukti donor"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Aksi (Detail, Edit, Hapus) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Detail Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedDetail(r)}
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                            title="Lihat Detail Lengkap"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Edit Link */}
                          <Link
                            href={`/klinik/donor-darah/edit/${r.id}`}
                            className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition cursor-pointer"
                            title="Edit Data Donor"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(r)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 transition cursor-pointer"
                            title="Hapus Data Donor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
        isOpen={Boolean(selectedDetail)}
        onClose={() => setSelectedDetail(null)}
        record={selectedDetail}
      />

      {/* DELETE CONFIRMATION MODAL */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-black text-slate-900 text-lg">Konfirmasi Hapus Data</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Apakah Anda yakin ingin menghapus data donor darah atas nama{' '}
                <strong className="text-slate-900">{recordToDelete.nama_lengkap}</strong> (NIK: {recordToDelete.nik})?
                Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => setRecordToDelete(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-rose-900/20 disabled:opacity-50"
              >
                {deleteLoading ? 'Menghapus...' : 'Ya, Hapus Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
