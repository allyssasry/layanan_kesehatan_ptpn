'use client';

import React, { useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useMcu } from '@/context/McuContext';
import {
  LayoutGrid,
  Heart,
  FileText,
  Plus,
  Download,
  Settings,
  LogOut,
  Stethoscope,
  Upload,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onRequestLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
  onRequestLogout,
}) => {
  const { user, requestLogout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const role = user?.role || 'admin';
  const isAdmin = role === 'admin';
  const isKlinik = role === 'klinik';
  const isKaryawan = role === 'karyawan';

  let portalTitle = 'MCU Portal';
  let roleTitle = 'Admin Mode';

  if (isKlinik) {
    portalTitle = 'Inhouse Clinic Portal';
    roleTitle = 'Inhouse Clinic Mode';
  } else if (isKaryawan) {
    portalTitle = 'MCU Portal';
    roleTitle = 'Karyawan';
  }

  const { mcuRecords, miniMcuRecords } = useMcu();
  const todayStr = new Date().toISOString().split('T')[0];
  const todayIntervensiCount = useMemo(() => {
    const kuratifKeys = ['konsultasi lanjutan', 'employee health counseling program', 'ehcp', 'kesegaran'];
    const rehabKeys = ['monitoring hasil tindak lanjut oleh dokter ahli', 'dokter ahli'];

    return [...mcuRecords, ...miniMcuRecords].filter((r) => {
      const arr: string[] = Array.isArray(r.intervensi)
        ? r.intervensi.map((s: any) => String(s).trim().toLowerCase())
        : typeof r.intervensi === 'string'
        ? r.intervensi.toLowerCase().split(/[,|;\n]/).map((s: string) => s.trim())
        : [];

      const has_kuratif = arr.some((i) => kuratifKeys.some((k) => i.includes(k))) || Boolean(r.catatan_intervensi_kuratif && String(r.catatan_intervensi_kuratif).trim());
      const has_rehabilitatif = arr.some((i) => rehabKeys.some((k) => i.includes(k))) || Boolean(r.catatan_intervensi_rehabilitatif && String(r.catatan_intervensi_rehabilitatif).trim());

      if (!has_kuratif && !has_rehabilitatif) return false;

      let tgl = r.tanggal_pemeriksaan_lanjutan || (r as any).tanggal_kuratif || (r as any).tanggal_rehabilitatif || null;
      if (!tgl && r.intervensi) {
        const rawStr = Array.isArray(r.intervensi) ? r.intervensi.join(' ') : String(r.intervensi || '');
        const m = rawStr.match(/(?:Tgl|Tanggal)[:\s]+(\d{4}-\d{2}-\d{2})/i) || rawStr.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
        if (m && m[1]) {
          tgl = m[1];
        }
      }
      return tgl === todayStr && !r.tindak_lanjut_selesai;
    }).length;
  }, [mcuRecords, miniMcuRecords, todayStr]);

  const handleLogout = () => {
    onClose();
    if (onRequestLogout) {
      onRequestLogout();
    } else {
      requestLogout();
    }
  };

  const isActive = (path: string) => {
    if (path === '/admin/dashboard' || path === '/klinik/dashboard' || path === '/employee/dashboard') {
      return pathname === path;
    }
    return pathname.startsWith(path);
  };

  // Nav item list based on role
  const navItems = useMemo(() => {
    if (isKaryawan) {
      return [
        { href: '/employee/dashboard', label: 'Dashboard', icon: LayoutGrid },
        { href: '/employee/unggah-data', label: 'Unggah Data MCU', icon: Upload },
      ];
    }
    if (isAdmin) {
      return [
        { href: '/admin/dashboard', label: 'Admin Overview', icon: LayoutGrid },
        { href: '/admin/intervensi', label: 'Intervensi Layanan', icon: Heart, badge: todayIntervensiCount },
        { href: '/admin/rekapan-mcu', label: 'Hasil MCU', icon: FileText },
        { href: '/admin/tambah-data', label: 'Tambah Data', icon: Plus },
        { href: '/admin/ekspor-excel', label: 'Ekspor Excel', icon: Download },
      ];
    }
    // Default Klinik
    return [
      { href: '/klinik/dashboard', label: 'Inhouse Clinic Overview', icon: LayoutGrid },
      { href: '/klinik/intervensi', label: 'Intervensi Layanan', icon: Heart, badge: todayIntervensiCount },
      { href: '/klinik/rekapan-mini-mcu', label: 'Hasil Inhouse Clinic', icon: FileText },
      { href: '/klinik/tambah-pemeriksaan', label: 'Tambah Data', icon: Plus, matchAlt: '/klinik/tambah-data' },
      { href: '/klinik/ekspor-excel', label: 'Ekspor Excel', icon: Download },
    ];
  }, [isAdmin, isKaryawan, todayIntervensiCount]);

  // Lock body scroll when mobile/tablet sidebar drawer is open
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen) {
      const originalBodyOverflow = document.body.style.overflow;
      const originalHtmlOverflow = document.documentElement.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      const applyLock = () => {
        if (window.innerWidth < 1024) {
          document.body.style.overflow = 'hidden';
          document.documentElement.style.overflow = 'hidden';
          document.body.style.touchAction = 'none';
        } else {
          document.body.style.overflow = originalBodyOverflow;
          document.documentElement.style.overflow = originalHtmlOverflow;
          document.body.style.touchAction = originalTouchAction;
        }
      };

      applyLock();

      const handleResize = () => {
        applyLock();
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.style.touchAction = originalTouchAction;
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          onTouchMove={(e) => e.preventDefault()}
          onWheel={(e) => e.preventDefault()}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity overscroll-none touch-none"
        />
      )}

      {/* Sidebar Container */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-50 bg-[#eaf4ee] border-r border-slate-200/90 flex flex-col justify-between shrink-0 h-[100dvh] max-h-[100dvh] lg:min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)] lg:sticky lg:top-16 lg:z-30 transition-all duration-300 ease-in-out overflow-y-auto overscroll-contain overflow-x-hidden ${
          isOpen ? 'translate-x-0 w-64 p-4 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20 lg:p-2.5' : 'lg:w-64 lg:p-4'}`}
      >
        <div>
          {/* Mobile Close Button */}
          <div className="flex items-center justify-between pb-3 lg:hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Menu Navigasi</span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 text-sm font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Logo / Portal Brand Card */}
          {isCollapsed ? (
            /* Collapsed Compact Brand Card */
            <div
              onClick={onToggleCollapse}
              className={`bg-white rounded-2xl p-2.5 text-center border border-slate-200/80 shadow-xs mb-4 flex items-center justify-center transition-all ${
                onToggleCollapse ? 'cursor-pointer hover:border-emerald-300 hover:shadow-sm' : ''
              }`}
              title={portalTitle}
            >
              <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                <img
                  src="/images/one-health.png"
                  alt="One Health"
                  className="h-8 w-auto max-w-none object-contain mix-blend-multiply"
                />
              </div>
            </div>
          ) : (
            /* Expanded Full Brand Card */
            <div
              onClick={onToggleCollapse}
              className={`bg-white rounded-2xl p-3.5 text-center border border-slate-200/80 shadow-xs mb-6 transition-all ${
                onToggleCollapse ? 'cursor-pointer hover:border-emerald-300 hover:shadow-sm' : ''
              }`}
              title={portalTitle}
            >
              <div className="w-full flex items-center justify-center mb-2 px-1">
                <img
                  src="/images/one-health.png"
                  alt="One Health"
                  className="h-11 w-auto max-w-full object-contain mix-blend-multiply"
                />
              </div>
              <h3 className="font-bold text-sm text-emerald-950 truncate">{portalTitle}</h3>
              <p className="text-xs text-slate-500 font-medium truncate">{roleTitle}</p>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const active = isActive(item.href) || (item.matchAlt ? isActive(item.matchAlt) : false);
              const Icon = item.icon;
              const hasBadge = Boolean(item.badge && item.badge > 0);

              if (isCollapsed) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={item.label}
                    className={`relative w-full flex items-center justify-center p-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                      active
                        ? 'text-white bg-emerald-800 shadow-xs'
                        : 'text-slate-700 hover:bg-emerald-100/70 hover:text-emerald-950'
                    }`}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-emerald-900'}`} />
                    {hasBadge && (
                      <span
                        className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-600 rounded-full ring-2 ring-white"
                        title={`${item.badge} tindakan intervensi`}
                      />
                    )}
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    active
                      ? 'text-white bg-emerald-800 shadow-xs'
                      : 'text-slate-700 hover:bg-emerald-100/70 hover:text-emerald-950'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-emerald-900'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {hasBadge && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-black shrink-0 ${
                        active ? 'bg-emerald-950 text-white' : 'bg-emerald-800 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-slate-200/80 space-y-2">
          {isCollapsed ? (
            /* Collapsed Bottom Buttons */
            <>
              <Link
                href="/settings"
                onClick={onClose}
                title="Pengaturan Akun"
                className={`w-full flex items-center justify-center p-2.5 rounded-xl font-bold text-xs border shadow-xs transition-all cursor-pointer group ${
                  isActive('/settings')
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white hover:bg-slate-100/90 text-slate-700 hover:text-emerald-950 border-slate-200'
                }`}
              >
                <Settings
                  className={`w-4 h-4 ${
                    isActive('/settings') ? 'text-white' : 'text-slate-500 group-hover:text-emerald-800'
                  } transition-transform group-hover:rotate-45`}
                />
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                title="Logout dari Akun"
                className="w-full flex items-center justify-center p-2.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs border border-slate-200 hover:border-rose-200 shadow-xs transition-all cursor-pointer group"
              >
                <LogOut className="w-4 h-4 text-rose-600 transition-transform group-hover:-translate-x-0.5" />
              </button>
            </>
          ) : (
            /* Expanded Full Bottom Buttons */
            <>
              <Link
                href="/settings"
                onClick={onClose}
                className={`w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl font-bold text-xs border shadow-xs transition-all cursor-pointer group ${
                  isActive('/settings')
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white hover:bg-slate-100/90 text-slate-700 hover:text-emerald-950 border-slate-200'
                }`}
              >
                <Settings
                  className={`w-4 h-4 ${
                    isActive('/settings') ? 'text-white' : 'text-slate-500 group-hover:text-emerald-800'
                  } transition-transform group-hover:rotate-45`}
                />
                <span>Pengaturan Akun</span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold text-xs border border-slate-200 hover:border-rose-200 shadow-xs transition-all cursor-pointer group"
              >
                <LogOut className="w-4 h-4 text-rose-600 transition-transform group-hover:-translate-x-0.5" />
                <span>Logout dari Akun</span>
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
