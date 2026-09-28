'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useMcu } from '@/context/McuContext';
import { searchEmployees, EmployeeProfile } from '@/services/mcuService';
import { ChevronRight } from 'lucide-react';

interface ParticipantSearchInputProps {
  type?: 'name' | 'nik';
  value: string;
  onChange: (val: string) => void;
  onSelectEmployee: (profile: EmployeeProfile) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  onBlur?: () => void;
}

export const ParticipantSearchInput: React.FC<ParticipantSearchInputProps> = ({
  type = 'name',
  value,
  onChange,
  onSelectEmployee,
  placeholder,
  className = '',
  required = false,
  disabled = false,
  name,
  onBlur,
}) => {
  const { mcuRecords, miniMcuRecords, karyawanRecords } = useMcu();
  const [isOpen, setIsOpen] = useState(false);
  const [remoteResults, setRemoteResults] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract profiles from local Context records
  const localProfiles = useMemo(() => {
    const map = new Map<string, EmployeeProfile>();

    const add = (p: any) => {
      const name = (p.nama_lengkap || p.nama_karyawan || '').trim();
      const nik = (p.nik || '').trim();
      if (!name && !nik) return;
      const key = nik && nik !== '0000000000' ? `nik:${nik}` : `name:${name.toLowerCase()}`;
      
      const existing = map.get(key);
      if (existing) {
        if (!existing.foto && p.foto) existing.foto = p.foto;
        if (!existing.divisi && p.divisi && p.divisi !== '-') existing.divisi = p.divisi;
        if (!existing.departemen && (p.departemen || p.entitas)) existing.departemen = p.departemen || p.entitas;
        return;
      }

      map.set(key, {
        nama_lengkap: name,
        nama_karyawan: name,
        nik: nik,
        divisi: p.divisi && p.divisi !== '-' ? p.divisi : '',
        jabatan: p.jabatan || '',
        departemen: p.departemen || p.entitas || 'PTPN 3',
        entitas: p.departemen || p.entitas || 'PTPN 3',
        nomor_inhealth: p.nomor_inhealth || p.nomor_pegawai || '',
        nomor_pegawai: p.nomor_inhealth || p.nomor_pegawai || '',
        nomor_bpjs: p.nomor_bpjs || p.bpjs || '',
        bpjs: p.nomor_bpjs || p.bpjs || '',
        jenis_kelamin: p.jenis_kelamin || p.gender || 'Laki-laki',
        gender: p.jenis_kelamin || p.gender || 'Laki-laki',
        umur: p.umur || '',
        golongan_darah: p.golongan_darah || '',
        foto: p.foto || null,
        kategori_peserta: p.kategori_peserta || 'Tetap',
      });
    };

    // Prioritize miniMcuRecords & karyawanRecords first as they often have the latest profile/photo
    (miniMcuRecords || []).forEach(add);
    (karyawanRecords || []).forEach(add);
    (mcuRecords || []).forEach(add);
    return Array.from(map.values());
  }, [mcuRecords, miniMcuRecords, karyawanRecords]);

  // Combined suggestions
  const suggestions = useMemo(() => {
    const q = (value || '').trim().toLowerCase();
    const map = new Map<string, EmployeeProfile>();

    // 1. Filter local profiles
    localProfiles.forEach((p) => {
      const matchName = p.nama_lengkap.toLowerCase().includes(q);
      const matchNik = p.nik.toLowerCase().includes(q);
      if (!q || matchName || matchNik) {
        const key = p.nik && p.nik !== '0000000000' ? `nik:${p.nik}` : `name:${p.nama_lengkap.toLowerCase()}`;
        map.set(key, p);
      }
    });

    // 2. Add remote results
    remoteResults.forEach((p) => {
      const key = p.nik && p.nik !== '0000000000' ? `nik:${p.nik}` : `name:${p.nama_lengkap.toLowerCase()}`;
      if (!map.has(key)) {
        map.set(key, p);
      } else {
        const existing = map.get(key)!;
        if (!existing.foto && p.foto) existing.foto = p.foto;
        if (!existing.divisi && p.divisi && p.divisi !== '-') existing.divisi = p.divisi;
      }
    });

    return Array.from(map.values()).slice(0, 10);
  }, [value, localProfiles, remoteResults]);

  // Query Supabase for broader database search
  useEffect(() => {
    const q = (value || '').trim();
    if (!q || q.length < 2) {
      setRemoteResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchEmployees(q, 10);
        setRemoteResults(res);
      } catch (err) {
        console.warn('Error searchEmployees:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (item: EmployeeProfile) => {
    onSelectEmployee(item);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        name={name}
        autoComplete="off"
        spellCheck="false"
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
        onBlur={() => {
          if (onBlur) onBlur();
        }}
        className={className}
      />

      {isOpen && suggestions.length > 0 && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150 max-h-72 overflow-y-auto">
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>Daftar Peserta di Database ({suggestions.length})</span>
            {loading && <span className="text-emerald-700 animate-pulse">Mencari...</span>}
          </div>
          {suggestions.map((item, idx) => (
            <button
              key={`${item.nik}-${item.nama_lengkap}-${idx}`}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before click
                handleSelect(item);
              }}
              className="w-full px-3.5 py-2.5 flex items-center gap-3 text-left hover:bg-emerald-50/70 transition cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200 group-hover:bg-[#0a5c36] group-hover:text-white transition-colors overflow-hidden">
                {item.foto ? (
                  <img src={item.foto} alt={item.nama_lengkap} className="w-full h-full object-cover" />
                ) : (
                  item.nama_lengkap.charAt(0).toUpperCase() || 'P'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-950 truncate">
                    {item.nama_lengkap}
                  </span>
                  {item.nik && (
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold shrink-0">
                      {item.nik}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                  <span>{item.divisi || 'Divisi -'}</span>
                  {item.jabatan && (
                    <>
                      <span>•</span>
                      <span>{item.jabatan}</span>
                    </>
                  )}
                  {item.departemen && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 font-medium">{item.departemen}</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-700 shrink-0 transition" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
