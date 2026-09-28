'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { McuProvider } from '@/context/McuContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <McuProvider>
        {children}
      </McuProvider>
    </AuthProvider>
  );
}
