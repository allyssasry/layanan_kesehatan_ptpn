'use client';

import React, { useEffect } from 'react';
import { LogOut, X, AlertCircle } from 'lucide-react';
import { User } from '@/types/mcu';

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user?: User | null;
}

export const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const role = user?.role || 'admin';
  let roleLabel = 'Pengguna';
  let roleBadgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

  if (role === 'klinik') {
    roleLabel = 'Klinik';
    roleBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (role === 'admin') {
    roleLabel = 'Administrator';
    roleBadgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
  } else if (role === 'karyawan') {
    roleLabel = 'Karyawan';
    roleBadgeClass = 'bg-amber-50 text-amber-900 border-amber-200';
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0].toUpperCase())
        .join('')
    : 'US';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"
      >
        {/* Main Content Area */}
        <div className="p-5 sm:p-6 pb-4 sm:pb-5 space-y-4">
          {/* Top Row: Icon with glowing halo & Close button */}
          <div className="flex items-start justify-between">
            <div className="relative inline-flex items-center justify-center">
              {/* Glowing halo ring matching reference design */}
              <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-rose-100/80 ring-8 ring-rose-50/80 flex items-center justify-center text-rose-600 shadow-xs">
                <AlertCircle className="w-6 h-6 sm:w-6.5 sm:h-6.5 stroke-[2.2]" />
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup modal konfirmasi"
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl border border-slate-200/80 hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Title and Description */}
          <div className="space-y-1.5 text-left">
            <h3
              id="logout-modal-title"
              className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug"
            >
              Konfirmasi Keluar Akun
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
              Apakah Anda yakin ingin keluar dari akun ini? Sesi kerja Anda akan diakhiri dan Anda harus masuk kembali untuk mengakses layanan kesehatan.
            </p>
          </div>

          {/* User Account Info Card */}
          <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-200/80 flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-emerald-800 to-teal-950 text-white font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-2xs overflow-hidden border border-emerald-700/40">
              {user?.avatar || (user as any)?.foto ? (
                <img src={user?.avatar || (user as any)?.foto} alt={user?.name || 'User'} className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                  {user?.name || 'Pengguna'}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border shrink-0 ${roleBadgeClass}`}
                >
                  {roleLabel}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                {user?.email || 'user@ptpn.co.id'}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar (Light Gray Background with Side-by-Side Buttons matching reference) */}
        <div className="p-4 sm:p-5 bg-slate-50/90 border-t border-slate-100 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl border border-slate-200 shadow-xs hover:shadow transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4 text-slate-500 stroke-[2.5]" />
            <span>Batal</span>
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-white stroke-[2.5]" />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
