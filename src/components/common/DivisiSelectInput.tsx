// src/components/common/DivisiSelectInput.tsx
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Building2, Check, Sparkles } from 'lucide-react';
import { MASTER_DIVISI_LIST, normalizeDivisiName, findMasterDivisi } from '@/lib/divisiMaster';

interface DivisiSelectInputProps {
  value: string;
  onChange: (val: string) => void;
  name?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

export function DivisiSelectInput({
  value,
  onChange,
  name = 'divisi',
  placeholder = 'Pilih atau Ketik Kode / Nama Divisi...',
  className = '',
  required = false,
  disabled = false,
}: DivisiSelectInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal search term with external value
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter master list based on search term
  const filteredList = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return MASTER_DIVISI_LIST;

    return MASTER_DIVISI_LIST.filter((item) => {
      const matchKode = item.kode.toLowerCase().includes(q);
      const matchNama = item.nama.toLowerCase().includes(q);
      const matchCostCenter = item.costCenter.toLowerCase().includes(q);
      const matchAlias = item.aliases.some((a) => a.toLowerCase().includes(q));
      return matchKode || matchNama || matchCostCenter || matchAlias;
    });
  }, [searchTerm]);

  const matchedMaster = useMemo(() => {
    return findMasterDivisi(value);
  }, [value]);

  const handleSelect = (divisiNama: string) => {
    onChange(divisiNama);
    setSearchTerm(divisiNama);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setSearchTerm(newVal);
    onChange(newVal);
    if (!isOpen) setIsOpen(true);
  };

  const handleBlur = () => {
    // Saat pengguna selesai mengetik (misal hanya mengetik "DPDU"), otomatis normalkan ke nama resmi
    const normalized = normalizeDivisiName(searchTerm);
    if (normalized && normalized !== searchTerm) {
      onChange(normalized);
      setSearchTerm(normalized);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          name={name}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={className}
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {matchedMaster && (
            <span
              className="hidden sm:inline-flex items-center text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300/80 pointer-events-none"
              title={`Cost Center: ${matchedMaster.costCenter}`}
            >
              {matchedMaster.kode}
            </span>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 cursor-pointer"
            tabIndex={-1}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 space-y-1 animate-in fade-in zoom-in-95">
          <div className="px-2 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100">
            <span>Daftar Kode &amp; Divisi Holding PTPN</span>
            <span className="text-emerald-700 font-semibold">{filteredList.length} Pilihan</span>
          </div>

          {filteredList.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-500">
              <span>Tidak ditemukan kecocokan kode standar. Nilai kustom tetap tersimpan.</span>
            </div>
          ) : (
            filteredList.map((item) => {
              const isSelected = value.toLowerCase() === item.nama.toLowerCase() || value.toUpperCase() === item.kode;

              return (
                <button
                  key={item.kode}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // cegah blur sebelum klik terdaftar
                    handleSelect(item.nama);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition flex items-center justify-between gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 shrink-0">
                      {item.kode}
                    </span>
                    <span className="truncate">{item.nama}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono text-slate-400">{item.costCenter}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
