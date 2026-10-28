'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import { DonorDarahRecord } from '@/types/mcu';
import { DonorDetailModal } from '@/components/donor/DonorDetailModal';
import {
  Clock,
  Droplets,
  Calendar,
  Building2,
  Users,
  Search,
  Filter,
  Eye,
  MapPin,
  Award,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

import { useAuth } from '@/context/AuthContext';

export default function RiwayatDonorPage() {
  const { user } = useAuth();
  const { donorRecords } = useMcu();

  const canViewNonEntity = user?.role === 'admin' || user?.role === 'klinik';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('Semua');
  const [selectedDetail, setSelectedDetail] = useState<DonorDarahRecord | null>(null);

  // Filtered and sorted chronologically
  const sortedRecords = useMemo(() => {
    return [...donorRecords]
      .filter((r) => {
        // Luar entitas hanya boleh masuk ke role klinik dan admin
        if (!canViewNonEntity && r.entitas === 'Bukan Entitas') {
          return false;
        }

        const q = searchTerm.trim().toLowerCase();
        const matchSearch =
          !q ||
          r.nama_lengkap.toLowerCase().includes(q) ||
          r.nik.toLowerCase().includes(q) ||
          r.lokasi_donor.toLowerCase().includes(q);

        const matchEntity = selectedEntity === 'Semua' || r.entitas === selectedEntity;
        return matchSearch && matchEntity;
      })
      .sort((a, b) => new Date(b.tanggal_donor).getTime() - new Date(a.tanggal_donor).getTime());
  }, [donorRecords, searchTerm, selectedEntity, canViewNonEntity]);

  // Group by Month-Year
  const groupedByMonth = useMemo(() => {
    const map = new Map<string, DonorDarahRecord[]>();
    for (const rec of sortedRecords) {
      const monthKey = rec.tanggal_donor ? rec.tanggal_donor.slice(0, 7) : 'Lainnya';
      const list = map.get(monthKey) || [];
      list.push(rec);
      map.set(monthKey, list);
    }
    return Array.from(map.entries());
  }, [sortedRecords]);

  const formatMonthTitle = (ymKey: string) => {
    if (!ymKey || ymKey === 'Lainnya') return 'Periode Lainnya';
    const [y, m] = ymKey.split('-');
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    const mIdx = parseInt(m, 10) - 1;
    return `${months[mIdx] || m} ${y}`;
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

  return (
    <AppLayout role="klinik" active="/donor-darah/riwayat">
      <div className="space-y-6 pb-14">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
              <Clock className="w-4 h-4" />
              <span>Arsip &amp; Log Kronologis</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              Riwayat Donor Darah PTPN
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Linimasa riwayat kegiatan transfusi darah karyawan dikelompokkan berdasarkan bulan pelaksanaan.
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-8 relative">
              <input
                type="text"
                placeholder="Cari pendonor, NIK, lokasi, atau PMI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            <div className="sm:col-span-4">
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-rose-600 focus:bg-white transition font-semibold"
              >
                <option value="Semua">Semua Entitas</option>
                <option value="PTPN III / Holding">PTPN III / Holding</option>
                <option value="PTPN I / SuppCo">PTPN I / SuppCo</option>
                <option value="PTPN IV / PalmCo">PTPN IV / PalmCo</option>
                {canViewNonEntity && <option value="Bukan Entitas">Bukan Entitas</option>}
              </select>
            </div>
          </div>
        </div>

        {/* Timeline / Grouped View */}
        <div className="space-y-6">
          {groupedByMonth.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 italic">
              Tidak ada riwayat donor darah yang ditemukan.
            </div>
          ) : (
            groupedByMonth.map(([monthKey, records]) => (
              <div key={monthKey} className="space-y-3">
                {/* Month Group Header */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    {formatMonthTitle(monthKey)}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    {records.length} Transaksi
                  </span>
                  <div className="flex-1 h-px bg-slate-200/80" />
                </div>

                {/* Timeline Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {records.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => setSelectedDetail(r)}
                      className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md hover:border-rose-300 transition-all cursor-pointer space-y-3 group"
                    >
                      {/* Top Row: Pendonor info + Blood type badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                            {r.foto ? (
                              <img src={r.foto} alt={r.nama_lengkap} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 text-xs block group-hover:text-rose-700 transition">
                              {r.nama_lengkap}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{r.nik}</span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border shrink-0 ${getBloodBadgeColor(r.golongan_darah)}`}>
                          {r.golongan_darah}
                        </span>
                      </div>

                      {/* Middle Row: Meta details */}
                      <div className="space-y-1.5 text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-800">{r.entitas}</span>
                          {r.divisi && <span className="text-slate-400 truncate">&bull; {r.divisi}</span>}
                        </div>

                        <div className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{r.lokasi_donor}</span>
                        </div>
                      </div>

                      {/* Bottom Row: Date & Action */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="font-bold text-slate-900 text-[11px]">
                          {formatDateShort(r.tanggal_donor)}
                        </span>
                        <span className="text-rose-600 font-bold text-[11px] flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                          Detail <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* DETAIL MODAL */}
      <DonorDetailModal
        isOpen={Boolean(selectedDetail)}
        onClose={() => setSelectedDetail(null)}
        record={selectedDetail}
      />
    </AppLayout>
  );
}
