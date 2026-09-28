'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { useMcu } from '@/context/McuContext';
import {
  Bell,
  CheckCheck,
  FileText,
  Activity,
  Heart,
  Calendar,
  ChevronRight,
  Clock,
  Sparkles,
  Inbox,
} from 'lucide-react';

export default function NotificationsPage() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useMcu();
  const [filterType, setFilterType] = useState<'all' | 'unread'>('all');

  const filteredNotifs = notifications.filter((n) => {
    if (filterType === 'unread') return !n.is_read && !n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read).length;

  const getIcon = (iconType?: string, type?: string) => {
    const t = (iconType || type || '').toLowerCase();
    if (t.includes('mcu')) return <FileText className="w-5 h-5 text-emerald-700" />;
    if (t.includes('clinic') || t.includes('mini')) return <Activity className="w-5 h-5 text-teal-700" />;
    if (t.includes('intervensi') || t.includes('heart')) return <Heart className="w-5 h-5 text-rose-700" />;
    return <Bell className="w-5 h-5 text-blue-700" />;
  };

  const getIconBg = (iconType?: string, type?: string) => {
    const t = (iconType || type || '').toLowerCase();
    if (t.includes('mcu')) return 'bg-emerald-100';
    if (t.includes('clinic') || t.includes('mini')) return 'bg-teal-100';
    if (t.includes('intervensi') || t.includes('heart')) return 'bg-rose-100';
    return 'bg-blue-100';
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Baru saja';
    try {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} jam lalu`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} hari lalu`;
    } catch {
      return dateStr;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12 max-w-4xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Pusat Pemberitahuan &amp; Notifikasi
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Riwayat pesan sistem, pemberitahuan hasil MCU, jadwal kontrol kuratif &amp; rujukan medis
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsRead}
              className="px-4 py-2 bg-slate-100 hover:bg-emerald-50 text-emerald-900 font-bold text-xs rounded-xl border border-slate-200 hover:border-emerald-300 transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <CheckCheck className="w-4 h-4 text-emerald-700" />
              <span>Tandai Semua Dibaca ({unreadCount})</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
              filterType === 'all'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Semua Pesan</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${filterType === 'all' ? 'bg-emerald-900 text-emerald-100' : 'bg-slate-200'}`}>
              {notifications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterType('unread')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer flex items-center gap-2 ${
              filterType === 'unread'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Belum Dibaca</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-600 text-white font-black">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifs.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Inbox className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">Tidak ada pemberitahuan.</p>
              <p className="text-xs text-slate-400 font-medium">
                Pemberitahuan hasil pemeriksaan medis dan jadwal kontrol akan muncul di sini.
              </p>
            </div>
          ) : (
            filteredNotifs.map((item) => {
              const isUnread = !item.is_read && !item.read;
              const targetUrl = item.url || item.link || '#';

              return (
                <div
                  key={item.id}
                  onClick={() => isUnread && markNotificationRead(item.id)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
                    isUnread
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${getIconBg(item.icon_type, item.type)}`}>
                      {getIcon(item.icon_type, item.type)}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-sm font-extrabold ${isUnread ? 'text-emerald-950 font-black' : 'text-slate-900'}`}>
                          {item.title}
                        </h3>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        )}
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.category || item.type || 'Pemberitahuan'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {item.message}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 pt-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatTimeAgo(item.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  {targetUrl && targetUrl !== '#' && (
                    <Link
                      href={targetUrl}
                      onClick={() => markNotificationRead(item.id)}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <span>Lihat</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
