'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useMcu } from '@/context/McuContext';
import { Sidebar } from './Sidebar';
import {
  Bell,
  LogOut,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  Settings,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
  role?: string;
  active?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, requestLogout } = useAuth();
  const { notifications, unreadCount, markAllNotificationsRead, markNotificationRead, mcuRecords, miniMcuRecords, karyawanRecords } = useMcu();
  const router = useRouter();
  const pathname = usePathname();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // User avatar photo fallback
  const userPhoto = React.useMemo(() => {
    if (!user) return null;
    if (user.avatar && typeof user.avatar === 'string' && user.avatar.trim()) return user.avatar;
    if (user.foto && typeof user.foto === 'string' && user.foto.trim()) return user.foto;
    const uNik = (user.nik || '').trim().toLowerCase();
    const uName = (user.name || '').trim().toLowerCase();

    for (const rec of [...(miniMcuRecords || []), ...(karyawanRecords || []), ...(mcuRecords || [])]) {
      const rNik = (rec.nik || '').trim().toLowerCase();
      const rName = (rec.nama_lengkap || (rec as any).nama_karyawan || '').trim().toLowerCase();
      if ((uNik && rNik === uNik) || (uName && rName === uName)) {
        if (rec.foto && typeof rec.foto === 'string' && rec.foto.trim()) {
          return rec.foto;
        }
      }
    }
    return null;
  }, [user, miniMcuRecords, karyawanRecords, mcuRecords]);

  // Close mobile sidebar and dropdowns automatically when navigation occurs
  useEffect(() => {
    setMobileSidebarOpen(false);
    setShowNotifications(false);
    setShowUserDropdown(false);
  }, [pathname]);

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    if (!showNotifications && !showUserDropdown) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#notification-wrapper') && !target.closest('#user-dropdown-wrapper')) {
        setShowNotifications(false);
        setShowUserDropdown(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications, showUserDropdown]);

  // Load saved collapse state on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ptpn_sidebar_collapsed');
      if (saved !== null) {
        setSidebarCollapsed(saved === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ptpn_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleOpenLogoutModal = () => {
    setShowUserDropdown(false);
    setMobileSidebarOpen(false);
    requestLogout();
  };

  const getDashboardLink = () => {
    if (user?.role === 'klinik') return '/klinik/dashboard';
    if (user?.role === 'karyawan') return '/employee/dashboard';
    return '/admin/dashboard';
  };

  return (
    <div className="min-h-[100dvh] bg-slate-100/70 flex flex-col font-sans text-slate-900">
      {/* Top Header Navigation Bar (Locked / Fixed Sticky on All Devices) */}
      <header className="sticky top-0 z-40 w-full shrink-0 bg-white/95 backdrop-blur-md text-slate-900 border-b border-slate-200/80 shadow-2xs transition-all">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Menu Toggle Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-[0.96] transition-transform focus:outline-none cursor-pointer"
              title="Menu Navigasi"
            >
              {mobileSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <Link href={getDashboardLink()} className="flex items-center gap-2.5 sm:gap-3 group">
              <img
                src="/images/one-health.png"
                alt="One Health"
                className="h-8 sm:h-9 w-auto max-w-[130px] sm:max-w-[160px] object-contain shrink-0 mix-blend-multiply"
              />
              <div className="h-5 w-px bg-slate-300 hidden sm:block" />
              <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 group-hover:text-emerald-800 transition-colors">
                Layanan Kesehatan
              </span>
            </Link>
          </div>

          {/* Right Controls: Notifications & User Profile Menu */}
          <div className="flex items-center gap-3">
            {/* Notification Drawer Button */}
            <div id="notification-wrapper" className="relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                title="Pemberitahuan & Notifikasi"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 px-1.5 min-w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 text-slate-800 animate-in fade-in zoom-in-95">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-slate-900">Pemberitahuan</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                          {unreadCount} baru
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" />
                        <span>Tandai Semua Dibaca</span>
                      </button>
                    )}
                  </div>
                  
                  <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 p-6 text-center font-medium">Belum ada notifikasi.</p>
                    ) : (
                      notifications.slice(0, 8).map((n) => {
                        const isUnread = !n.is_read && !n.read;
                        const isClinic = (n.category || n.type || '').toLowerCase().includes('clinic') || (n.category || '').toLowerCase().includes('klinik');
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              markNotificationRead(n.id);
                              if (n.url || n.link) router.push(n.url || n.link || '');
                              setShowNotifications(false);
                            }}
                            className={`p-3.5 hover:bg-slate-50 transition text-xs space-y-1 cursor-pointer ${
                              isUnread ? 'bg-emerald-50/70 font-semibold' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${
                                  isClinic
                                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                                    : 'bg-blue-50 text-blue-800 border-blue-200'
                                }`}
                              >
                                {isClinic ? 'Inhouse Clinic' : 'Admin LK3'}
                              </span>
                              {isUnread && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-ping" />}
                            </div>
                            <p className={`font-extrabold ${isUnread ? 'text-slate-900' : 'text-slate-800'}`}>
                              {n.title}
                            </p>
                            <p className="text-slate-600 font-normal text-[11px] leading-snug line-clamp-2">
                              {n.message}
                            </p>
                            <span className="text-[9px] font-medium text-slate-400 block pt-0.5">
                              {n.created_at ? new Date(n.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-2 px-4 border-t border-slate-100 flex items-center justify-center">
                    <Link
                      href="/notifications"
                      onClick={() => setShowNotifications(false)}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 py-1"
                    >
                      <span>Buka Pusat Notifikasi Lengkap</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Dropdown */}
            <div id="user-dropdown-wrapper" className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 transition cursor-pointer text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#0a5c36] text-white font-black text-xs flex items-center justify-center shadow-2xs overflow-hidden border border-emerald-700/50">
                  {userPhoto ? (
                    <img src={userPhoto} alt={user?.name || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.substring(0, 1).toUpperCase() || 'A'
                  )}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <p className="text-xs font-extrabold text-slate-900">{user?.name || (user?.role === 'klinik' ? 'Klinik' : 'Pengguna')}</p>
                  <span className="text-[10px] font-semibold text-slate-500 capitalize block">
                    {user?.role === 'klinik' ? 'Klinik' : user?.role || 'Admin'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-slate-800 animate-in fade-in">
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0a5c36] text-white font-black text-xs flex items-center justify-center shadow-2xs overflow-hidden border border-emerald-700/50 shrink-0">
                      {userPhoto ? (
                        <img src={userPhoto} alt={user?.name || 'User'} className="w-full h-full object-cover" />
                      ) : (
                        user?.name?.substring(0, 1).toUpperCase() || (user?.role === 'klinik' ? 'K' : 'U')
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Pengguna'}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">{user?.email || 'user@ptpn.co.id'}</p>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mt-1 capitalize">
                        Peran: {user?.role === 'klinik' ? 'Klinik' : user?.role || 'Karyawan'}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={getDashboardLink()}
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <LayoutDashboard className="w-4 h-4 text-emerald-700" />
                    <span>Dashboard Utama</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setShowUserDropdown(false)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Settings className="w-4 h-4 text-emerald-700" />
                    <span>Pengaturan Akun</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleOpenLogoutModal}
                    className="w-full text-left flex items-center gap-2 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer border-t border-slate-100 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout dari Akun</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace with Sidebar */}
      <div className="flex-1 flex w-full">
        <Sidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          onRequestLogout={handleOpenLogoutModal}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
