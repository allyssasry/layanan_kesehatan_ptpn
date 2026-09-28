'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function KlinikMcuRedirect() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  useEffect(() => {
    if (id) {
      router.replace(`/klinik/detail-mini-mcu?id=${id}`);
    } else {
      router.replace('/klinik/rekapan-mini-mcu');
    }
  }, [id, router]);

  return (
    <div className="min-h-[100dvh] bg-[#f4f8f5] flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="w-8 h-8 text-emerald-800 animate-spin" />
        <p className="text-xs font-bold text-slate-600">Memuat data pemeriksaan klinik...</p>
      </div>
    </div>
  );
}

export default function KlinikMcuDynamicFallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-[#f4f8f5] flex items-center justify-center">
          <p className="text-xs font-bold text-slate-600">Memuat...</p>
        </div>
      }
    >
      <KlinikMcuRedirect />
    </Suspense>
  );
}
