'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  User,
  Calendar,
  Clock,
  Activity,
  FileText,
  Building2,
  Stethoscope,
  Heart,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Pill,
  ShieldCheck,
  Eye,
} from 'lucide-react';

interface IntervensiDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: any | null;
  mcuRecords: any[];
  miniMcuRecords: any[];
  karyawanRecords?: any[];
  role?: 'klinik' | 'admin';
  onOpenSuratRujukan?: (patientOrRecord: any) => void;
}

export function IntervensiDetailModal({
  isOpen,
  onClose,
  patient,
  mcuRecords = [],
  miniMcuRecords = [],
  karyawanRecords = [],
  role = 'klinik',
  onOpenSuratRujukan,
}: IntervensiDetailModalProps) {
  // Collect ALL examinations across sources matching this patient
  const allPatientSessions = useMemo(() => {
    if (!patient) return [];

    const pNik = String(patient.nik || '').trim().toLowerCase();
    const pName = String(patient.nama_lengkap || patient.nama_karyawan || '').trim().toLowerCase();

    const matches = (r: any) => {
      const rNik = String(r.nik || '').trim().toLowerCase();
      const rName = String(r.nama_lengkap || r.nama_karyawan || '').trim().toLowerCase();
      if (pNik && rNik && pNik === rNik) return true;
      if (pName && rName && (pName === rName || pName.includes(rName) || rName.includes(pName))) return true;
      return false;
    };

    const miniList = miniMcuRecords.filter(matches).map((r) => ({
      ...r,
      record_type: 'mini',
      created_by_role: 'klinik',
      source_label: 'Mini MCU (Inhouse Clinic)',
    }));

    const mcuList = mcuRecords.filter(matches).map((r) => ({
      ...r,
      record_type: 'mcu',
      created_by_role: 'admin',
      source_label: 'MCU Berkala (RS / Vendor)',
    }));

    const mandiriList = (karyawanRecords || []).filter(matches).map((r) => ({
      ...r,
      record_type: 'karyawan',
      created_by_role: 'karyawan',
      source_label: 'MCU Mandiri Karyawan',
    }));

    const combined = [...miniList, ...mcuList, ...mandiriList];

    // Sort descending by examination date / timestamp
    return combined.sort((a, b) => {
      const tA = new Date(a.tanggal_pemeriksaan || a.tanggal_pemeriksaan_lanjutan || a.created_at || 0).getTime();
      const tB = new Date(b.tanggal_pemeriksaan || b.tanggal_pemeriksaan_lanjutan || b.created_at || 0).getTime();
      return tB - tA;
    });
  }, [patient, miniMcuRecords, mcuRecords, karyawanRecords]);

  // Determine which session was targeted by the clicked row
  const targetSessionKey = useMemo(() => {
    if (!patient) return '';
    const targetRole = patient.record_type === 'mini' ? 'klinik' : patient.record_type === 'mcu' ? 'admin' : 'klinik';
    return `${targetRole}-${patient.id}`;
  }, [patient]);

  const [activeSessionKey, setActiveSessionKey] = useState<string>('');

  // Whenever modal opens or targeted patient changes, auto-select the targeted session
  useEffect(() => {
    if (isOpen && patient) {
      // Check if target session exists in allPatientSessions
      const found = allPatientSessions.find((s) => `${s.created_by_role}-${s.id}` === targetSessionKey);
      if (found) {
        setActiveSessionKey(`${found.created_by_role}-${found.id}`);
      } else if (allPatientSessions.length > 0) {
        setActiveSessionKey(`${allPatientSessions[0].created_by_role}-${allPatientSessions[0].id}`);
      } else {
        setActiveSessionKey(targetSessionKey);
      }
    }
  }, [isOpen, patient, targetSessionKey, allPatientSessions]);

  if (!isOpen || !patient) return null;

  // Currently Active Session Record
  const activeRecord = allPatientSessions.find(
    (s) => `${s.created_by_role}-${s.id}` === activeSessionKey
  ) || patient;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('unfit') || s.includes('tidak fit')) {
      return 'bg-rose-100 text-rose-800 border-rose-300';
    }
    if (s.includes('catatan') || s.includes('note')) {
      return 'bg-amber-100 text-amber-900 border-amber-300';
    }
    return 'bg-emerald-100 text-emerald-900 border-emerald-300';
  };

  // Vitals resolution for active session
  const vitals = activeRecord.vitals || {};
  const tensi = activeRecord.tensi || vitals.tensi || (vitals.tensi_sistolik ? `${vitals.tensi_sistolik}/${vitals.tensi_diastolik}` : '120/80');
  const gulaDarah = activeRecord.gula_darah || vitals.gula_darah || '-';
  const kolesterol = activeRecord.kolesterol || vitals.kolesterol || '-';
  const asamUrat = activeRecord.asam_urat || vitals.asam_urat || '-';
  const bb = activeRecord.berat_badan || vitals.berat_badan || 65;
  const tb = activeRecord.tinggi_badan || vitals.tinggi_badan || 170;
  const bmiVal = activeRecord.bmi || vitals.bmi || (tb > 0 ? Number((bb / ((tb / 100) * (tb / 100))).toFixed(1)) : 22.5);

  const fullDetailUrl =
    role === 'klinik'
      ? `/klinik/detail-mini-mcu?id=${activeRecord.id}&type=${activeRecord.record_type}&session=${activeRecord.created_by_role}-${activeRecord.id}`
      : `/admin/mcu/${activeRecord.id}?type=${activeRecord.record_type}&session=${activeRecord.created_by_role}-${activeRecord.id}`;

  const hasRujukan = Boolean(
    activeRecord.file_surat_rujukan_intervensi ||
      activeRecord.file_rujukan ||
      activeRecord.nama_rujukan_file ||
      activeRecord.nama_poli_rujukan ||
      activeRecord.rumah_sakit_rujukan ||
      patient.file_surat_rujukan_intervensi
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-[#064e3b] to-[#0f766e] text-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            {patient.foto ? (
              <img
                src={patient.foto}
                alt={patient.nama_lengkap}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white/40 shadow-sm shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-white/20 text-white font-black text-xl flex items-center justify-center border-2 border-white/30 shrink-0">
                {(patient.nama_lengkap || 'P').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">
                  {patient.nama_lengkap}
                </h3>
                <span className="bg-emerald-300/20 text-emerald-100 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-400/40">
                  NIK: {patient.nik}
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium mt-0.5 truncate">
                {patient.divisi || 'Operasional'} &bull; {patient.jabatan || 'Karyawan'} &bull; {patient.departemen || patient.entitas || 'PTPN'}
              </p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  Total {allPatientSessions.length || 1} Sesi Pemeriksaan
                </span>
                {patient.tanggal_pemeriksaan_lanjutan && (
                  <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-md shadow-2xs">
                    📅 Jadwal Intervensi: {formatDate(patient.tanggal_pemeriksaan_lanjutan)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
            title="Tutup Modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* HORIZONTAL SESSION SELECTOR TABS ("KELUAR SEMUA PEMERIKSAAN") */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
              Pilih Sesi:
            </span>
            {allPatientSessions.length > 0 ? (
              allPatientSessions.map((session, idx) => {
                const sKey = `${session.created_by_role}-${session.id}`;
                const isActive = sKey === activeSessionKey;
                const isScheduledMatch = sKey === targetSessionKey;
                const tgl = formatDate(session.tanggal_pemeriksaan || session.tanggal_pemeriksaan_lanjutan);

                return (
                  <button
                    key={sKey}
                    type="button"
                    onClick={() => setActiveSessionKey(sKey)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      isActive
                        ? 'bg-[#005930] text-white ring-2 ring-emerald-600 font-black'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <span>#{idx + 1}</span>
                    <span>{session.record_type === 'mini' ? 'Mini MCU' : 'MCU RS'}</span>
                    <span className="opacity-80">({tgl})</span>
                    {isScheduledMatch && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Sesi Terjadwal Intervensi" />
                    )}
                  </button>
                );
              })
            ) : (
              <span className="text-xs text-slate-500 font-bold">1 Sesi Terjadwal (Intervensi)</span>
            )}
          </div>
        </div>

        {/* MODAL CONTENT BODY ("PEMERIKSAAN SAAT ITU DIJADWALNYA") */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Sesi Active Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-900 text-sm">
                  {activeRecord.source_label || (activeRecord.record_type === 'mini' ? 'Mini MCU (Klinik)' : 'MCU RS')}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${getStatusBadge(activeRecord.status_kebugaran || activeRecord.kesimpulan)}`}>
                  {activeRecord.status_kebugaran || activeRecord.kesimpulan || 'Fit for Duty'}
                </span>
                {`${activeRecord.created_by_role}-${activeRecord.id}` === targetSessionKey && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                    ⭐ Sesi Jadwal Intervensi Terpilih
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Tanggal Periksa: <strong>{formatDate(activeRecord.tanggal_pemeriksaan || patient.tanggal_pemeriksaan_lanjutan)}</strong>
                {activeRecord.jam_pemeriksaan ? ` • Jam: ${activeRecord.jam_pemeriksaan}` : ''}
                {activeRecord.dokter_pemeriksa ? ` • Dokter: ${activeRecord.dokter_pemeriksa}` : ''}
              </p>
            </div>

            {hasRujukan && onOpenSuratRujukan && (
              <button
                type="button"
                onClick={() => onOpenSuratRujukan(activeRecord)}
                className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Buka Surat Rujukan</span>
              </button>
            )}
          </div>

          {/* 1. Pengukuran Fisik (Vitals) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-700" />
              <span>Pengukuran Fisik &amp; Tanda Vital Sesi Ini</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Tekanan Darah</span>
                <span className="text-sm sm:text-base font-black text-slate-900">{tensi}</span>
                <span className="text-[10px] text-slate-500 block">mmHg</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Gula Darah</span>
                <span className="text-sm sm:text-base font-black text-slate-900">{gulaDarah}</span>
                <span className="text-[10px] text-slate-500 block">mg/dL</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Kolesterol</span>
                <span className="text-sm sm:text-base font-black text-slate-900">{kolesterol}</span>
                <span className="text-[10px] text-slate-500 block">mg/dL</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Asam Urat</span>
                <span className="text-sm sm:text-base font-black text-slate-900">{asamUrat}</span>
                <span className="text-[10px] text-slate-500 block">mg/dL</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Berat / Tinggi</span>
                <span className="text-sm sm:text-base font-black text-slate-900">{bb} kg / {tb} cm</span>
                <span className="text-[10px] text-slate-500 block">BB / TB</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Indeks Massa Tubuh</span>
                <span className="text-sm sm:text-base font-black text-slate-900">{bmiVal}</span>
                <span className="text-[10px] text-emerald-700 font-bold block">BMI</span>
              </div>
            </div>
          </div>

          {/* 2. Diagnosa, Temuan Medis, & Program Intervensi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Diagnosa Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-emerald-700" />
                <span>Diagnosa &amp; Keluhan Klinis</span>
              </h5>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-800 leading-relaxed">
                {activeRecord.diagnosa || activeRecord.catatan_medis || patient.diagnosa || 'Pemeriksaan Kesehatan Berkala / Evaluasi Rutin'}
              </div>
              {activeRecord.faktor_risiko && (
                <p className="text-[11px] text-slate-500 font-medium">
                  <strong>Faktor Risiko:</strong> {activeRecord.faktor_risiko}
                </p>
              )}
            </div>

            {/* Intervensi & Jadwal Lanjutan */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Program Intervensi &amp; Tindak Lanjut</span>
              </h5>
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs font-semibold text-amber-950 leading-relaxed space-y-1">
                <div>
                  <strong>Jadwal Lanjutan:</strong>{' '}
                  <span className="font-extrabold text-slate-900">
                    {formatDate(activeRecord.tanggal_pemeriksaan_lanjutan || patient.tanggal_pemeriksaan_lanjutan)}
                  </span>
                </div>
                <div>
                  <strong>Program:</strong>{' '}
                  <span>
                    {Array.isArray(activeRecord.intervensi)
                      ? activeRecord.intervensi.join(', ')
                      : String(activeRecord.intervensi || patient.intervensi || 'Monitoring hasil tindak lanjut dokter ahli')}
                  </span>
                </div>
              </div>
              {(activeRecord.catatan_intervensi || patient.catatan_intervensi) && (
                <p className="text-[11px] text-slate-600 font-medium">
                  <strong>Catatan:</strong> {activeRecord.catatan_intervensi || patient.catatan_intervensi}
                </p>
              )}
            </div>
          </div>

          {/* 3. Detail Rujukan Rumah Sakit & Terapi Obat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rujukan RS */}
            <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 shadow-2xs space-y-2">
              <h5 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-purple-700" />
                <span>Rujukan Rumah Sakit / Faskes Lanjutan</span>
              </h5>
              <div className="text-xs text-slate-800 space-y-1">
                <p>
                  <strong>Poli Tujuan:</strong>{' '}
                  {activeRecord.nama_poli_rujukan || 'Poli Spesialis Penyakit Dalam / Dokter Ahli'}
                </p>
                <p>
                  <strong>Rumah Sakit:</strong>{' '}
                  {activeRecord.rumah_sakit_rujukan || 'RS Rujukan PTPN / RS Mitra Terdekat'}
                </p>
                {activeRecord.file_surat_rujukan_intervensi && (
                  <p className="text-[11px] text-purple-900 font-medium pt-1">
                    📎 Berkas Rujukan: <span className="font-bold underline">{activeRecord.file_surat_rujukan_intervensi}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Terapi Obat */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-2">
              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-emerald-700" />
                <span>Terapi Obat &amp; Anjuran Terapi</span>
              </h5>
              <div className="text-xs text-slate-800 space-y-1">
                <p>
                  {Array.isArray(activeRecord.obat) && activeRecord.obat.length > 0
                    ? activeRecord.obat.join(', ')
                    : activeRecord.obat || activeRecord.tindakan_terapi || activeRecord.tindak_lanjut || 'Konsultasi dan evaluasi berkala'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-bold text-slate-500">
            Sesi Terpilih: <span className="text-slate-900 font-black">{activeRecord.source_label || 'Pemeriksaan Medis'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={fullDetailUrl}
              className="px-4 py-2.5 bg-[#005930] hover:bg-[#004726] text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Buka Halaman Detail Lengkap</span>
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
