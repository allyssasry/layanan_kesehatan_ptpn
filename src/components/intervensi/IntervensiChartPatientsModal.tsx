'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  X,
  Search,
  User,
  Calendar,
  Building2,
  ExternalLink,
  ShieldCheck,
  Pill,
  HeartPulse,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

export interface ChartPatientItem {
  id: number;
  record_type: 'mcu' | 'mini';
  nama_lengkap: string;
  nik: string;
  divisi: string;
  foto?: string | null;
  intervensi: string[];
  tanggal: string;
  catatan?: string | null;
  tindak_lanjut_selesai?: boolean;
}

interface IntervensiChartPatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  programName: string;
  kategori: 'promotif' | 'kuratif' | 'rehabilitatif';
  patients: ChartPatientItem[];
  role?: 'klinik' | 'admin';
}

export function IntervensiChartPatientsModal({
  isOpen,
  onClose,
  programName,
  kategori,
  patients = [],
  role = 'klinik',
}: IntervensiChartPatientsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Filtered patients based on search
  const filteredPatients = patients.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      p.nama_lengkap.toLowerCase().includes(term) ||
      p.nik.toLowerCase().includes(term) ||
      p.divisi.toLowerCase().includes(term)
    );
  });

  // Config styling based on category
  const categoryConfig = {
    promotif: {
      label: 'Promotif & Preventif',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-700',
      borderAccent: 'border-emerald-300',
      icon: ShieldCheck,
      primaryColor: '#10b981',
    },
    kuratif: {
      label: 'Intervensi Kuratif',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      iconBg: 'bg-amber-100 text-amber-700',
      borderAccent: 'border-amber-300',
      icon: Pill,
      primaryColor: '#f59e0b',
    },
    rehabilitatif: {
      label: 'Intervensi Rehabilitatif',
      badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
      iconBg: 'bg-purple-100 text-purple-700',
      borderAccent: 'border-purple-300',
      icon: HeartPulse,
      primaryColor: '#8b5cf6',
    },
  }[kategori] || {
    label: 'Intervensi',
    badgeBg: 'bg-slate-100 text-slate-800 border-slate-200',
    iconBg: 'bg-slate-100 text-slate-700',
    borderAccent: 'border-slate-300',
    icon: ShieldCheck,
    primaryColor: '#10b981',
  };

  const IconComponent = categoryConfig.icon;

  const getDetailUrl = (p: ChartPatientItem) => {
    if (role === 'admin') {
      return `/admin/mcu/${p.id}?type=${p.record_type}&session=${p.record_type === 'mini' ? 'klinik' : 'admin'}-${p.id}`;
    }
    return `/klinik/detail-mini-mcu?id=${p.id}&type=${p.record_type}&session=${p.record_type === 'mini' ? 'klinik' : 'admin'}-${p.id}`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${categoryConfig.iconBg} shrink-0`}>
              <IconComponent className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {programName}
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${categoryConfig.badgeBg}`}>
                  {categoryConfig.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Total {patients.length} pasien terdaftar pada program intervensi ini
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        {patients.length > 3 && (
          <div className="relative shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama pasien, NIK, atau divisi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
            />
          </div>
        )}

        {/* Patient List Content */}
        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
          {filteredPatients.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">
                {searchTerm ? 'Tidak ada pasien yang sesuai dengan kata kunci pencarian.' : 'Belum ada data pasien pada program ini.'}
              </p>
            </div>
          ) : (
            filteredPatients.map((p, idx) => {
              const detailUrl = getDetailUrl(p);

              return (
                <div
                  key={`${p.record_type}-${p.id}-${idx}`}
                  className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    {p.foto ? (
                      <img
                        src={p.foto}
                        alt={p.nama_lengkap}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-800 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {p.nama_lengkap.substring(0, 2).toUpperCase()}
                      </div>
                    )}

                    {/* Patient Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={detailUrl}
                          className="font-extrabold text-sm text-slate-900 hover:text-emerald-700 transition truncate"
                          title={p.nama_lengkap}
                        >
                          {p.nama_lengkap}
                        </Link>
                        {p.tindak_lanjut_selesai ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px] font-extrabold shrink-0">
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            Tuntas
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium flex-wrap mt-0.5">
                        <span>{p.nik}</span>
                        <span>&bull;</span>
                        <span className="truncate max-w-[150px]">{p.divisi}</span>
                        <span>&bull;</span>
                        <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {p.tanggal}
                        </span>
                      </div>

                      {/* Notes / Intervention snippet if exists */}
                      {p.catatan && (
                        <p className="text-[10px] text-slate-600 italic mt-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          Catatan: {p.catatan}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="flex items-center justify-end sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Link
                      href={detailUrl}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-emerald-700 hover:text-white text-slate-700 font-bold text-xs rounded-xl transition shadow-2xs group-hover:bg-emerald-600 group-hover:text-white"
                    >
                      <span>Detail Pasien</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            Menampilkan {filteredPatients.length} dari {patients.length} pasien
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
