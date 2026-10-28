'use client';

import React, { useState } from 'react';
import {
  Droplets,
  Heart,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  Eye,
  Award,
  Image as ImageIcon,
  ZoomIn,
  X,
  Building2,
  User,
  ShieldCheck,
} from 'lucide-react';
import { DonorDetailModal } from './DonorDetailModal';

interface DonorSessionDetailCardProps {
  record: any;
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

export const DonorSessionDetailCard: React.FC<DonorSessionDetailCardProps> = ({ record }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  if (!record) return null;

  const nama = record.nama_lengkap || record.nama_karyawan || 'Peserta Donor';
  const nik = record.nik || '-';
  const tglDonor = record.tanggal_donor || record.tanggal_pemeriksaan;
  const golDarah = record.golongan_darah || '-';
  const lokasi = record.lokasi_donor || record.nama_rs || 'Klinik Pratama PTPN';
  const entitas = record.entitas || 'PTPN';
  const divisi = record.divisi || '-';
  const status = record.status || record.status_kebugaran || 'Fit for Duty';
  const keterangan =
    record.keterangan ||
    record.keluhan ||
    'Proses donor darah berjalan dengan lancar, kondisi tekanan darah dan hemoglobin memenuhi syarat kelayakan pendonor.';

  return (
    <div className="space-y-4 pt-1">
      {/* Banner Penyelenggara & Lokasi Sesi Donor */}
      <div className="p-4 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#005930] text-white shrink-0 shadow-2xs">
            <Droplets className="w-5 h-5 text-rose-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-black text-slate-900">
                Lokasi Donor Darah:
              </span>
              <span className="text-[#005930] font-black text-sm">
                {lokasi}
              </span>
            </div>
            <p className="text-slate-500 font-medium text-[11px] mt-0.5">
              Tanggal Pelaksanaan: <strong className="text-slate-800">{formatDate(tglDonor)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1 rounded-full text-xs font-black bg-[#005930] text-white shadow-2xs">
            {status}
          </span>
          {/* <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition"
          >
            <Eye className="w-3.5 h-3.5 text-[#005930]" />
            <span>Detail Lengkap</span>
          </button> */}
        </div>
      </div>

      {/* Grid Rincian Sesi Donor Darah */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        {/* 7 Kolom Kiri: Parameter Transfusi */}
        <div className="md:col-span-7 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-200 pb-2 mb-3">
              <Heart className="w-4 h-4 text-rose-600" />
              <span>Parameter Transfusi &amp; Pemeriksaan Fisik Donor</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-bold">Golongan Darah</span>
                <span className="text-base font-black text-rose-700">
                  {golDarah}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-bold">Entitas Unit</span>
                <span className="text-xs font-extrabold text-slate-800 line-clamp-1 mt-1">
                  {entitas}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-bold">Divisi / Bagian</span>
                <span className="text-xs font-extrabold text-slate-800 line-clamp-1 mt-1">
                  {divisi}
                </span>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-2xs">
                <span className="text-slate-400 block text-[10px] font-bold">Waktu Donor</span>
                <span className="text-xs font-extrabold text-slate-800 line-clamp-1 mt-1">
                  {formatDate(tglDonor)}
                </span>
              </div>
            </div>

            {/* Keterangan / Catatan Petugas */}
            <div className="mt-3 p-3.5 bg-white rounded-xl border border-slate-100 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                Catatan / Anjuran Pasca Donor:
              </span>
              <p className="text-xs text-slate-700 font-medium">
                {keterangan}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span>
              Peserta: <strong>{nama}</strong> (NIK: {nik})
            </span>
            <span className="font-mono text-emerald-800 font-bold">
              ID Sesi #{record.id}
            </span>
          </div>
        </div>

        {/* 5 Kolom Kanan: Bukti Foto / Berkas Sertifikat */}
        <div className="md:col-span-5 bg-slate-50/90 border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-emerald-700" />
                <span>Bukti / Sertifikat Donor Darah</span>
              </h4>
              {record.bukti_donor && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#005930]">
                  Ada Berkas
                </span>
              )}
            </div>

            {record.bukti_donor ? (
              <div className="space-y-3">
                <div
                  onClick={() => setLightboxImage(record.bukti_donor)}
                  className="group relative w-full h-44 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer shadow-inner"
                >
                  <img
                    src={record.bukti_donor}
                    alt="Bukti Donor Darah"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1.5">
                    <ZoomIn className="w-6 h-6" />
                    <span className="text-xs font-bold">Klik untuk Perbesar Foto</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p
                    className="text-[11px] text-slate-500 font-medium truncate flex-1"
                    title={record.nama_bukti_donor || 'Bukti_Donor_Darah.jpg'}
                  >
                    {record.nama_bukti_donor || 'Bukti_Donor_Darah.jpg'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setLightboxImage(record.bukti_donor)}
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
                  Sesi donor ini dicatat secara administratif dari register PMI / klinik.
                </p>
              </div>
            )}
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">Golongan Darah Terverifikasi:</span>
            <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100 font-mono">
              {golDarah}
            </span>
          </div>
        </div>
      </div>

      {/* Lightbox Zoom Modal */}
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

      {/* Modal Detail Lengkap */}
      {modalOpen && (
        <DonorDetailModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          record={record}
        />
      )}
    </div>
  );
};

export default DonorSessionDetailCard;
