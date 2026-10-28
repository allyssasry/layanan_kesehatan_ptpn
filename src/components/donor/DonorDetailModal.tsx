'use client';

import React, { useState } from 'react';
import { DonorDarahRecord } from '@/types/mcu';
import {
  X,
  User,
  Building2,
  Calendar,
  MapPin,
  Heart,
  Droplets,
  CreditCard,
  ShieldCheck,
  FileText,
  Clock,
  Printer,
  ExternalLink,
  Award,
  ZoomIn,
  Download,
  Image as ImageIcon,
} from 'lucide-react';

interface DonorDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DonorDarahRecord | null;
}

export const DonorDetailModal: React.FC<DonorDetailModalProps> = ({
  isOpen,
  onClose,
  record,
}) => {
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);

  if (!isOpen || !record) return null;

  const formatDate = (dStr?: string) => {
    if (!dStr) return '-';
    try {
      const months = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
      ];
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
    if (clean.includes('A') && clean.includes('B')) return 'bg-purple-600 text-white border-purple-500';
    if (clean.includes('A')) return 'bg-rose-600 text-white border-rose-500';
    if (clean.includes('B')) return 'bg-blue-600 text-white border-blue-500';
    return 'bg-emerald-700 text-white border-emerald-600';
  };

  const getEntityBadgeStyle = (entitas?: string) => {
    const s = String(entitas || '').toLowerCase();
    if (s.includes('bukan') || s.includes('non') || s.includes('eksternal')) return 'bg-slate-100 text-slate-700 border-slate-300';
    if (s.includes('1') || s.includes('suppco')) return 'bg-amber-50 text-amber-800 border-amber-300';
    if (s.includes('4') || s.includes('palmco')) return 'bg-teal-50 text-teal-800 border-teal-300';
    return 'bg-emerald-50 text-emerald-800 border-emerald-300';
  };

  const handlePrint = () => {
    window.print();
  };

  // Safe new-tab opener that converts base64 to Blob URL so browsers don't block it with a blank page
  const handleOpenInNewTab = (src: string, title?: string) => {
    if (!src) return;
    if (src.startsWith('data:')) {
      try {
        const arr = src.split(',');
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
        return;
      } catch (err) {
        console.warn('Blob conversion error:', err);
      }
    }
    window.open(src, '_blank');
  };

  const handleDownloadImage = (src: string, filename: string) => {
    if (!src) return;
    const link = document.createElement('a');
    link.href = src;
    link.download = filename || 'bukti-donor.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-700 via-rose-600 to-red-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
              <Droplets className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base sm:text-lg tracking-tight">Detail Riwayat Donor Darah</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-white/20 text-white border border-white/30">
                  {record.status || 'Selesai'}
                </span>
              </div>
              <p className="text-xs text-rose-100 font-medium">
                PTPN Layanan Kesehatan &bull; Transfusi Darah Karyawan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-slate-800">
          {/* Card 1: Identitas Peserta / Karyawan */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Identitas Peserta Terdaftar
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getEntityBadgeStyle(record.entitas)}`}>
                {record.entitas}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Foto Pendonor */}
              <div
                onClick={() => record.foto && setLightboxImage({ src: record.foto, title: `Foto ${record.nama_lengkap}` })}
                className={`w-20 h-24 rounded-2xl bg-slate-200 border border-slate-300 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 shadow-2xs relative group ${
                  record.foto ? 'cursor-pointer hover:border-rose-500 transition' : ''
                }`}
                title={record.foto ? 'Klik untuk memperbesar foto' : undefined}
              >
                {record.foto ? (
                  <>
                    <img
                      src={record.foto}
                      alt={record.nama_lengkap}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                      <ZoomIn className="w-4 h-4" />
                    </div>
                  </>
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
              </div>

              {/* Data Karyawan Grid */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Nama Lengkap</span>
                  <span className="font-black text-slate-900 text-sm">{record.nama_lengkap}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">NIK</span>
                  <span className="font-bold text-slate-800 font-mono">{record.nik || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Divisi / Unit Kerja</span>
                  <span className="font-semibold text-slate-800">{record.divisi || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Jabatan</span>
                  <span className="font-semibold text-slate-800">{record.jabatan || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">No. Inhealth</span>
                  <span className="font-medium text-slate-700 font-mono">{record.nomor_inhealth || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">No. BPJS</span>
                  <span className="font-medium text-slate-700 font-mono">{record.nomor_bpjs || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Jenis Kelamin / Umur</span>
                  <span className="font-semibold text-slate-800">
                    {record.jenis_kelamin || '-'} {record.umur ? `(${record.umur} Tahun)` : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Informasi Spesifik Donor Darah */}
          <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                <span className="text-xs font-black uppercase tracking-wider text-rose-950">
                  Data Kegiatan Donor Darah
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-600">Golongan Darah:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border shadow-xs ${getBloodBadgeColor(record.golongan_darah)}`}>
                  {record.golongan_darah}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Tanggal Pelaksanaan</span>
                  <span className="font-bold text-slate-900 text-sm">{formatDate(record.tanggal_donor)}</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Lokasi Pelaksanaan</span>
                  <span className="font-semibold text-slate-800 text-sm">{record.lokasi_donor}</span>
                </div>
              </div>
            </div>

            {record.keterangan && (
              <div className="pt-2 border-t border-rose-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Keterangan / Catatan Medis
                </span>
                <p className="text-xs text-slate-700 bg-white/80 p-3 rounded-xl border border-rose-100 leading-relaxed font-medium">
                  {record.keterangan}
                </p>
              </div>
            )}
          </div>

          {/* Card 3: Bukti Donor jika tersedia */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 block mb-3">
              Bukti Sertifikat / Kartu Donor Darah
            </span>
            {record.bukti_donor ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                {/* Thumbnail Gambar yang bisa diklik */}
                <div
                  onClick={() =>
                    setLightboxImage({
                      src: record.bukti_donor!,
                      title: record.nama_bukti_donor || 'Bukti Sertifikat / Kartu Donor PMI',
                    })
                  }
                  className="relative w-36 h-28 rounded-xl overflow-hidden border border-slate-200 cursor-pointer group shrink-0 shadow-2xs hover:border-rose-500 transition bg-slate-100"
                  title="Klik untuk memperbesar gambar"
                >
                  <img
                    src={record.bukti_donor}
                    alt="Bukti Donor"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white gap-1 text-xs font-bold">
                    <ZoomIn className="w-4 h-4" />
                    <span>Perbesar</span>
                  </div>
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="text-xs font-bold text-slate-800 block">
                    {record.nama_bukti_donor || 'Berkas Bukti Donor Darah PMI'}
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Sertifikat resmi tanda terima donor darah terverifikasi.
                  </p>

                  {/* Tombol aksi: Buka Layar Penuh, Tab Baru, Unduh */}
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxImage({
                          src: record.bukti_donor!,
                          title: record.nama_bukti_donor || 'Bukti Sertifikat / Kartu Donor PMI',
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer shadow-2xs"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Buka Lebar (Layar Penuh)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenInNewTab(
                          record.bukti_donor!,
                          record.nama_bukti_donor || 'Bukti Donor Darah'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer border border-slate-200"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Tab Baru</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadImage(
                          record.bukti_donor!,
                          record.nama_bukti_donor || 'bukti-donor-darah.jpg'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition cursor-pointer border border-slate-200"
                      title="Unduh Berkas Gambar"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-slate-500 italic bg-white/60 rounded-xl border border-dashed border-slate-200">
                Tidak ada dokumen bukti donor darah yang dilampirkan.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition flex items-center gap-2 cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            Cetak Detail
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition cursor-pointer shadow-sm"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Fullscreen Lightbox Zoom Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          {/* Top Toolbar */}
          <div
            className="w-full max-w-4xl flex items-center justify-between pb-3 text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-rose-500" />
              <span className="text-xs sm:text-sm font-bold truncate max-w-xs sm:max-w-md">
                {lightboxImage.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  handleDownloadImage(
                    lightboxImage.src,
                    `${lightboxImage.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.jpg`
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Unduh Gambar"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Unduh</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenInNewTab(lightboxImage.src, lightboxImage.title)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Buka di Tab Baru"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tab Baru</span>
              </button>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Container Gambar Ukuran Besar */}
          <div
            className="relative max-w-4xl max-h-[82vh] flex items-center justify-center overflow-hidden rounded-2xl bg-black/60 border border-white/15 shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.title}
              className="max-w-full max-h-[78vh] object-contain select-none rounded-xl"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2.5 font-medium">
            Klik di luar gambar atau tombol silang di kanan atas untuk menutup
          </p>
        </div>
      )}
    </div>
  );
};
