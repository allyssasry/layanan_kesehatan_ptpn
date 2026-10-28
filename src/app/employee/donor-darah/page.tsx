'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useMcu } from '@/context/McuContext';
import { DonorDarahRecord } from '@/types/mcu';
import { DonorDetailModal } from '@/components/donor/DonorDetailModal';
import {
  Heart,
  Droplets,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  Eye,
  MapPin,
  Award,
  AlertCircle,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';

export default function EmployeeDonorHistoryPage() {
  const { user } = useAuth();
  const { donorRecords, isLoading } = useMcu();

  const [selectedDetail, setSelectedDetail] = useState<DonorDarahRecord | null>(null);

  // Filter STRICTLY belonging to the logged in employee
  const employeeRecords = useMemo(() => {
    if (!user) return [];
    const uNik = (user.nik || '').trim().toLowerCase();
    const uName = (user.name || '').trim().toLowerCase();

    return donorRecords.filter((r) => {
      const rNik = (r.nik || '').trim().toLowerCase();
      const rName = (r.nama_lengkap || '').trim().toLowerCase();

      if (uNik && rNik && rNik === uNik) return true;
      if (uName && rName && (rName === uName || rName.includes(uName) || uName.includes(rName))) return true;
      return false;
    }).sort((a, b) => new Date(b.tanggal_donor).getTime() - new Date(a.tanggal_donor).getTime());
  }, [donorRecords, user]);

  // Statistik Pribadi
  const totalDonorCount = employeeRecords.length;
  const latestDonation = employeeRecords[0];

  // Hitung kelayakan donor darah berikutnya (minimal 60 hari dari donor terakhir)
  const eligibilityInfo = useMemo(() => {
    if (!latestDonation || !latestDonation.tanggal_donor) {
      return { eligible: true, daysLeft: 0, nextDateStr: 'Siap Kapan Saja' };
    }
    const lastDate = new Date(latestDonation.tanggal_donor);
    const nextEligibleDate = new Date(lastDate.getTime() + 60 * 86400000);
    const now = new Date();
    const diffMs = nextEligibleDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const nextDateStr = nextEligibleDate.toLocaleDateString('id-ID', {
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
    : 'O';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        return `${parseInt(match[3], 10)} ${months[parseInt(match[2], 10) - 1]} ${match[1]}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  return (
    <AppLayout role="karyawan" active="/employee/donor-darah">
      <div className="space-y-6 pb-14 max-w-5xl mx-auto">
        {/* Hero Header */}
        <div className="rounded-3xl bg-gradient-to-r from-rose-800 via-rose-700 to-red-800 p-6 sm:p-7 text-white shadow-xl shadow-rose-950/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold text-rose-100">
                <Heart className="w-3.5 h-3.5 text-rose-200 fill-rose-200" />
                <span>Portal Kesehatan Karyawan PTPN</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Riwayat Donor Darah Pribadi
              </h1>
              <p className="text-xs sm:text-sm text-rose-100 font-medium">
                Catatan partisipasi transfusi dan bakti donor darah atas nama{' '}
                <strong className="text-white underline">{user?.name || 'Karyawan'}</strong> (NIK: {user?.nik || '-'}).
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-2 bg-white/10 p-3 rounded-2xl border border-white/20">
              <ShieldCheck className="w-7 h-7 text-emerald-300" />
              <div className="text-right sm:text-left">
                <span className="text-[10px] uppercase font-bold text-rose-200 block">Status Akses</span>
                <span className="text-xs font-black text-white">Riwayat Terverifikasi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Read-Only Notice Badge */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="font-bold">Akses Karyawan (Read-Only):</strong> Data riwayat donor darah ini dicatat
            dan diverifikasi oleh <strong>Petugas Donor Darah PTPN</strong> bekerja sama dengan <strong>Palang Merah Indonesia (PMI)</strong>.
            Sebagai karyawan, Anda dapat melihat riwayat dan berkas sertifikat donor darah miliknya sendiri.
          </div>
        </div>

        {/* 4 PERSONAL SUMMARY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Donor */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                <Heart className="w-5 h-5 fill-rose-600 text-rose-600" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                Total
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {totalDonorCount}
              </span>
              <span className="text-xs font-medium text-slate-500 ml-1.5">Kali</span>
              <p className="text-xs font-bold text-slate-600 mt-1">Total Donor Dilakukan</p>
            </div>
          </div>

          {/* Card 2: Golongan Darah */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Droplets className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-50 text-blue-700 border border-blue-200">
                Golongan
              </span>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {verifiedBlood}
              </span>
              <p className="text-xs font-bold text-slate-600 mt-1">Golongan Darah</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Terverifikasi di Rekam Medis</p>
            </div>
          </div>

          {/* Card 3: Tanggal Donor Terakhir */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Calendar className="w-5 h-5" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                Terakhir
              </span>
            </div>
            <div className="mt-3">
              <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight block">
                {latestDonation ? formatDate(latestDonation.tanggal_donor) : 'Belum Ada'}
              </span>
              <p className="text-xs font-bold text-slate-600 mt-1">Tanggal Donor Terakhir</p>
              {latestDonation && (
                <p className="text-[10px] text-slate-400 mt-0.5">{latestDonation.lokasi_donor}</p>
              )}
            </div>
          </div>

          {/* Card 4: Status Kelayakan Donor Berikutnya */}
          <div className="rounded-3xl bg-white border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
                eligibilityInfo.eligible ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                <Clock className="w-5 h-5" />
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                eligibilityInfo.eligible ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {eligibilityInfo.eligible ? 'Siap' : 'Pemulihan'}
              </span>
            </div>
            <div className="mt-3">
              <span className={`text-sm sm:text-base font-black block tracking-tight ${
                eligibilityInfo.eligible ? 'text-emerald-700' : 'text-amber-700'
              }`}>
                {eligibilityInfo.eligible ? 'Siap Donor Kembali' : `${eligibilityInfo.daysLeft} Hari Lagi`}
              </span>
              <p className="text-xs font-bold text-slate-600 mt-1">Kelayakan Donor Berikutnya</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Estimasi: {eligibilityInfo.nextDateStr}</p>
            </div>
          </div>
        </div>

        {/* TABEL RIWAYAT DONOR MILIK SENDIRI */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3.5">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-rose-600" />
              Daftar Riwayat Transfusi &amp; Donor Darah Anda
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik tombol &ldquo;Lihat Detail&rdquo; untuk memeriksa rincian lengkap atau melihat berkas sertifikat bukti donor.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-3 w-12 text-center">No</th>
                  <th className="py-3 px-3">Tanggal Donor</th>
                  <th className="py-3 px-3">Golongan Darah</th>
                  <th className="py-3 px-3">Lokasi Kegiatan</th>
                  <th className="py-3 px-3">Keterangan</th>
                  <th className="py-3 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {employeeRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                      Belum ada catatan riwayat donor darah untuk akun Anda.
                    </td>
                  </tr>
                ) : (
                  employeeRecords.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-slate-900">
                        {formatDate(r.tanggal_donor)}
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
                          {r.golongan_darah}
                        </span>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{r.lokasi_donor}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-600 max-w-xs truncate">
                        {r.keterangan || '-'}
                      </td>

                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDetail(r)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition cursor-pointer inline-flex items-center gap-1 shadow-2xs"
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
        isOpen={Boolean(selectedDetail)}
        onClose={() => setSelectedDetail(null)}
        record={selectedDetail}
      />
    </AppLayout>
  );
}
