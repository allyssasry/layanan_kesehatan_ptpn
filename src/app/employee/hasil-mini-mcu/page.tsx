'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { useMcu } from '@/context/McuContext';
import { HealthTrendChart } from '@/components/mcu/HealthTrendChart';
import { getRecordTimestamp } from '@/services/mcuService';
import {
  Calendar,
  Stethoscope,
  FileText,
  CheckCircle2,
  Clock,
  User as UserIcon,
  Activity,
  Heart,
  AlertTriangle,
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

export default function EmployeeHasilMiniMcuPage() {
  const { user } = useAuth();
  const { miniMcuRecords, isLoading } = useMcu();

  const displayName = user?.name || 'allyssa';
  const displayNik = user?.nik || '678976';

  // Filter records strictly belonging to the logged-in employee
  const userMiniMcuRecords = useMemo(() => {
    if (!user) return [];
    const uName = (user.name || '').trim().toLowerCase();
    const uNik = (user.nik || '').trim().toLowerCase();

    const filtered = miniMcuRecords
      .filter((r) => {
        const rNik = (r.nik || '').trim().toLowerCase();
        const rName = (r.nama_lengkap || r.nama_karyawan || '').trim().toLowerCase();
        if (uNik && rNik && rNik === uNik) return true;
        if (uName && rName && (rName === uName || rName.includes(uName) || uName.includes(rName))) return true;
        return false;
      })
      .map((r) => ({ ...r, created_by_role: 'klinik' as const }));

    return filtered.sort((a, b) => {
      const timeA = getRecordTimestamp(a);
      const timeB = getRecordTimestamp(b);
      if (timeA !== timeB) return timeB - timeA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [user, miniMcuRecords]);

  return (
    <AppLayout>
      <div className="w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 lg:p-8 space-y-6 shadow-xs">
        
        {/* Header */}
        <div className="pb-4 border-b border-slate-100">
          <span className="text-[11px] font-extrabold text-[#005930] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Layanan Inhouse Clinic PTPN 3
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2 mt-2 tracking-tight">
            <Stethoscope className="w-7 h-7 text-[#005930]" />
            <span>Hasil Pemeriksaan Inhouse Clinic</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Riwayat catatan kunjungan medis berkala, pemantauan tensi darah, dan konsultasi dokter klinik kebun.
          </p>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <div className="inline-block animate-spin w-7 h-7 border-4 border-emerald-700 border-t-transparent rounded-full mb-2" />
            <p className="text-xs font-bold text-slate-500">Memuat riwayat kunjungan klinik...</p>
          </div>
        )}

        {/* EMPTY STATE */}
        {!isLoading && userMiniMcuRecords.length === 0 && (
          <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-800">
              <Stethoscope className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-extrabold text-slate-900">Belum Ada Kunjungan Inhouse Clinic</h3>
            <p className="text-xs font-medium text-slate-500 max-w-md mx-auto">
              Belum ada riwayat kunjungan ke Inhouse Clinic untuk akun <strong>{displayName}</strong> (NIK: {displayNik}). Setiap pemeriksaan baru dari klinik akan otomatis tampil di sini.
            </p>
          </div>
        )}

        {/* DATA DISPLAY */}
        {!isLoading && userMiniMcuRecords.length > 0 && (
          <>
            {/* Dynamic Trend Chart Component */}
            <div className="w-full">
              <HealthTrendChart patientHistory={userMiniMcuRecords} defaultMetric="tensi" />
            </div>

            {/* History List */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-base font-extrabold text-slate-900">Riwayat Kunjungan Medis Klinik</h3>
              <div className="space-y-3">
                {userMiniMcuRecords.map((item: any) => (
                  <div key={`klinik-${item.id}`} className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                      <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#005930]" /> {formatDate(item.tanggal_pemeriksaan)}
                      </span>
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-[#005930] px-2.5 py-0.5 rounded-full">
                        Inhouse Clinic
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Tensi Darah:</span>
                        {item.tensi || '120/80'} mmHg
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Gula Darah:</span>
                        {item.gula_darah ? `${item.gula_darah} mg/dL` : '-'}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Keluhan:</span>
                        {item.keluhan || 'Pemeriksaan Rutin'}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 font-medium bg-white p-3 rounded-xl border border-slate-100">
                      <strong>Saran Medis:</strong>{' '}
                      {item.catatan_medis || item.intervensi || item.anjuran || item.saran || 'Kondisi kesehatan stabil, jaga pola makan dan istirahat yang cukup.'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </AppLayout>
  );
}
