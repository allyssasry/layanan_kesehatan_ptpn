'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function KlinikEditDataRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = searchParams.get('id');

  useEffect(() => {
    if (id) {
      router.replace(`/klinik/edit-data/${id}`);
    } else {
      router.replace('/klinik/rekapan-mini-mcu');
    }
  }, [id, router]);

  return (
    <div className="min-h-[100dvh] bg-[#f4f8f5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-8 h-8 text-emerald-800 animate-spin" />
        <p className="text-xs font-bold text-slate-600">Mengalihkan ke form edit...</p>
      </div>
    </div>
  );
}

export default function KlinikEditDataFallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#f4f8f5] flex items-center justify-center">
          <p className="text-xs font-bold text-slate-600">Memuat...</p>
        </div>
      }
    >
      <KlinikEditDataRedirect />
    </Suspense>
  );
}
