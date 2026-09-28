'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  LogIn,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    document.title = 'Masuk Portal Layanan Kesehatan - PTPN';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!email.trim()) {
      newErrors.push('Alamat Email atau NIK wajib diisi.');
    }
    if (!password) {
      newErrors.push('Kata Sandi wajib diisi.');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success || !result.user) {
        setErrors([result.error || 'Email, NIK, atau Kata Sandi salah.']);
        setLoading(false);
        return;
      }

      // Berhasil login -> Arahkan otomatis sesuai peran akun dari database
      const userRole = result.user.role;
      if (userRole === 'admin') {
        router.push('/admin/dashboard');
      } else if (userRole === 'klinik') {
        router.push('/klinik/dashboard');
      } else if (userRole === 'karyawan') {
        router.push('/employee/dashboard');
      } else {
        router.push('/employee/dashboard');
      }
    } catch (err: any) {
      setErrors([err.message || 'Terjadi kesalahan sistem saat mencoba masuk.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-[#eaf4ee]">
      {/* PTPN Brand Emblem / Logo Header */}
      <div className="mb-6 text-center">
        {/* Brand Logo */}
        <Link href="/login" className="inline-block transition-transform hover:scale-105">
          <img
            src="/images/one-health.png"
            alt="Logo One Health"
            className="h-20 sm:h-24 w-auto max-w-xs object-contain mix-blend-multiply drop-shadow-xs"
          />
        </Link>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-md rounded-3xl border border-emerald-800/15 bg-[#d8ebe1]/95 p-6 sm:p-8 shadow-[0_20px_50px_rgba(6,78,59,0.08)] backdrop-blur-md">
        {/* Header Title Text */}
        <h1 className="text-center text-xl font-black text-slate-900 tracking-tight">
          Masuk Portal Layanan
        </h1>
        <p className="mt-1 text-center text-xs font-medium leading-relaxed text-slate-700 px-2">
          Masukkan akun Anda untuk mengakses portal MCU &amp; Klinik Kesehatan.
        </p>

        {/* Error Notification */}
        {errors.length > 0 && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/95 p-3.5 text-xs font-medium text-rose-800 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Gagal Masuk</span>
            </div>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-rose-700">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Input 1: Email / NIK */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-bold text-slate-800">
              Alamat Email / NIK Pegawai
            </label>
            <div className="relative flex items-center rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 shadow-xs transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-600/20">
              <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                name="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="email@ptpn.co.id atau NIK"
                autoComplete="username"
                className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Input 2: Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-bold text-slate-800">
              Kata Sandi
            </label>
            <div className="relative flex items-center rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 shadow-xs transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-600/20">
              <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Masukkan kata sandi..."
                autoComplete="current-password"
                className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none"
              />
              <button
                type="button"
                id="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Tampilkan / sembunyikan kata sandi"
                className="ml-2 text-slate-400 hover:text-emerald-900 transition cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-slate-600" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-600" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#0a5c36] hover:bg-[#08482a] text-white py-3.5 text-sm font-extrabold shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span>Memeriksa Akun...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Masuk ke Portal</span>
                </>
              )}
            </button>
          </div>

          {/* Secondary Sign Up Link */}
          <div className="pt-2 text-center">
            <Link
              href="/register"
              className="text-xs font-bold text-slate-700 hover:text-emerald-950 hover:underline"
            >
              Belum memiliki akun? Daftar Akun Baru
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
