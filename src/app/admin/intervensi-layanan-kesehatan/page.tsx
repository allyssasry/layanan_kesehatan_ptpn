'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminIntervensiRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/intervensi');
  }, [router]);

  return (
    <div className="min-h-[100dvh] bg-[#f4f8f5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-8 h-8 text-emerald-800 animate-spin" />
        <p className="text-xs font-bold text-slate-600">Mengalihkan ke dashboard intervensi...</p>
      </div>
    </div>
  );
}
