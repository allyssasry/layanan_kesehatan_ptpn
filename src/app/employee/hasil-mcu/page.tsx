'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useMcu } from '@/context/McuContext';
import { HealthTrendChart } from '@/components/mcu/HealthTrendChart';
import { getRecordTimestamp } from '@/services/mcuService';
import {
  Download,
  CheckCircle2,
  AlertTriangle,
  Hospital,
  FileText,
  User as UserIcon,
  Activity,
  Calendar,
  Clock,
  Upload,
} from 'lucide-react';

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
      return `${day} ${months[monthIdx] || 'September'} ${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function getKesimpulanLabel(kesimpulan?: string): string {
  if (!kesimpulan) return 'Fit';
  const clean = kesimpulan.toLowerCase().replace(/[\s-]+/g, '_');
  if (clean.includes('sementara_tidak_fit') || clean.includes('unfit') || clean.includes('tidak_fit')) {
    return 'Sementara Tidak Fit';
  }
  if (clean.includes('catatan') || clean.includes('fit_dengan_catatan')) {
    return 'Fit dengan Catatan';
  }
  return 'Fit';
}

function getBadgeStyle(kesimpulan?: string): string {
  if (!kesimpulan) return 'bg-emerald-700 text-white';
  const clean = kesimpulan.toLowerCase().replace(/[\s-]+/g, '_');
  if (clean.includes('sementara_tidak_fit') || clean.includes('unfit') || clean.includes('tidak_fit')) {
    return 'bg-rose-600 text-white';
  }
  if (clean.includes('catatan') || clean.includes('fit_dengan_catatan')) {
    return 'bg-amber-500 text-slate-900';
  }
  return 'bg-emerald-700 text-white';
}

export default function EmployeeHasilMcuPage() {
  const { user } = useAuth();
  const { mcuRecords, isLoading } = useMcu();

  const displayName = user?.name || 'allyssa';
  const displayNik = user?.nik || '678976';
  const displayDivisi = user?.divisi || 'DPDU';

  // Filter records strictly belonging to the logged-in employee
  const userMcuRecords = useMemo(() => {
    if (!user) return [];
    const uName = (user.name || '').trim().toLowerCase();
    const uNik = (user.nik || '').trim().toLowerCase();

    const filtered = mcuRecords
      .filter((r) => {
        const rNik = (r.nik || '').trim().toLowerCase();
        const rName = (r.nama_lengkap || r.nama_karyawan || '').trim().toLowerCase();
        if (uNik && rNik && rNik === uNik) return true;
        if (uName && rName && (rName === uName || rName.includes(uName) || uName.includes(rName))) return true;
        return false;
      })
      .map((r) => {
        const isMandiri = r.created_by_role === 'karyawan' ||
          r.vitals_updated_by_role === 'karyawan' ||
          (r.nama_dokter && r.nama_dokter.toLowerCase().includes('mandiri')) ||
          (r.diagnosa && r.diagnosa.toLowerCase().includes('mandiri'));
        return {
          ...r,
          created_by_role: isMandiri ? ('karyawan' as const) : ('admin' as const),
          diagnosa: isMandiri ? (r.diagnosa || 'Pemeriksaan Mandiri') : r.diagnosa,
        };
      });

    return filtered.sort((a, b) => {
      const timeA = getRecordTimestamp(a);
      const timeB = getRecordTimestamp(b);
      if (timeA !== timeB) return timeB - timeA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [user, mcuRecords]);

  const latestRecord = userMcuRecords[0] || null;

  const tensi = latestRecord?.tensi || (latestRecord?.vitals as any)?.tensi || '-';
  const tb = latestRecord?.tinggi_badan ?? (latestRecord?.vitals as any)?.tinggi_badan ?? '-';
  const bb = latestRecord?.berat_badan ?? (latestRecord?.vitals as any)?.berat_badan ?? '-';
  const bmi = latestRecord?.bmi ?? (latestRecord?.vitals as any)?.bmi ?? '-';
  const gulaDarah = latestRecord?.gula_darah ?? (latestRecord?.vitals as any)?.gula_darah ?? '-';
  const kolesterol = latestRecord?.kolesterol ?? (latestRecord?.vitals as any)?.kolesterol ?? '-';
  const asamUrat = latestRecord?.asam_urat ?? (latestRecord?.vitals as any)?.asam_urat ?? '-';
  const suhu = latestRecord?.suhu ?? (latestRecord?.vitals as any)?.suhu ?? '36.5';

  return (
    <AppLayout>
      <div className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 lg:p-8 shadow-xs space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-extrabold text-[#005930] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Medical Check-Up Resmi PTPN 3
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              Hasil Rekam Medis MCU Karyawan
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Pantau ringkasan hasil pemeriksaan fisik dan grafik tren kesehatan berkala dari MCU RS.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/employee/unggah-data?tab=mcu"
              className="px-4 py-2.5 bg-[#005930] hover:bg-[#004726] text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 cursor-pointer transition"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Dokumen MCU</span>
            </Link>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <div className="inline-block animate-spin w-7 h-7 border-4 border-emerald-700 border-t-transparent rounded-full mb-2" />
            <p className="text-xs font-bold text-slate-500">Memuat data rekam medis MCU...</p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && userMcuRecords.length === 0 && (
          <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-800">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Belum Ada Riwayat MCU RS</h3>
            <p className="text-xs font-medium text-slate-500 max-w-md mx-auto">
              Belum ditemukan data Medical Check-Up rumah sakit untuk akun <strong>{displayName}</strong> (NIK: {displayNik}).
            </p>
          </div>
        )}

        {/* DATA LOADED */}
        {!isLoading && userMcuRecords.length > 0 && latestRecord && (
          <>
            {/* Status Card */}
            <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-[#005930] shrink-0" />
                <div>
                  <h3 className="font-black text-emerald-950 text-base">
                    Status Kebugaran: {getKesimpulanLabel(latestRecord.kesimpulan)}
                  </h3>
                  <p className="text-xs text-emerald-800 font-medium">
                    Pemeriksaan MCU RS terakhir pada {formatDate(latestRecord.tanggal_pemeriksaan)}.
                  </p>
                </div>
              </div>
              <span className={`px-3.5 py-1 rounded-full text-xs font-bold shadow-xs ${getBadgeStyle(latestRecord.kesimpulan)}`}>
                {getKesimpulanLabel(latestRecord.kesimpulan)}
              </span>
            </div>

            {/* 2-Column Section: Vitals & Trend Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Column (5 Cols): Vitals */}
              <div className="lg:col-span-5 bg-slate-50/90 border border-slate-200/80 rounded-2xl sm:rounded-3xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-[#005930]" />
                      <span>Ringkasan Pengukuran Terakhir</span>
                    </h3>
                  </div>

                  <div className="space-y-2 text-xs font-semibold text-slate-800">
                    <div className="flex justify-between p-2.5 bg-white rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-normal">Tensi (Tekanan Darah)</span>
                      <span className="font-extrabold text-slate-900">{tensi} mmHg</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-normal">Tinggi / Berat Badan</span>
                      <span className="font-extrabold text-slate-900">{tb} cm / {bb} kg</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-normal">Indeks Massa Tubuh (BMI)</span>
                      <span className="font-extrabold text-emerald-700">{bmi}</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-normal">Gula Darah Puasa</span>
                      <span className="font-extrabold text-slate-900">{gulaDarah} mg/dL</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-normal">Kolesterol Total</span>
                      <span className="font-extrabold text-slate-900">{kolesterol} mg/dL</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-normal">Asam Urat</span>
                      <span className="font-extrabold text-slate-900">{asamUrat} mg/dL</span>
                    </div>
                    <div className="flex justify-between p-2.5 bg-white rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-normal">Suhu Tubuh</span>
                      <span className="font-extrabold text-slate-900">{suhu} °C</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Dokumen Rekap:</span>
                  <span className="font-bold text-[#005930]">
                    {latestRecord.nama_dokumen || `Laporan_Hasil_${displayName}.pdf`}
                  </span>
                </div>
              </div>

              {/* Right Column (7 Cols): Trend Chart */}
              <div className="lg:col-span-7 flex flex-col">
                <HealthTrendChart patientHistory={userMcuRecords} defaultMetric="tensi" className="h-full" />
              </div>
            </div>
          </>
        )}

      </div>
    </AppLayout>
  );
}
