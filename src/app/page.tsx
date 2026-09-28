'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else {
      const dashMap: Record<string, string> = {
        admin: '/admin/dashboard',
        klinik: '/klinik/dashboard',
        karyawan: '/employee/dashboard',
      };
      router.replace(dashMap[user.role] || '/login');
    }
  }, [user, router]);

  return (
    <div className="min-h-[100dvh] bg-slate-900 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3 text-white font-bold text-sm">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        <span>Mengarahkan ke dashboard...</span>
      </div>
    </div>
  );
}
