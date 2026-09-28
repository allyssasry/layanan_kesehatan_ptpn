'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types/mcu';
import {
  User,
  Mail,
  Shield,
  CreditCard,
  Building2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  UserPlus,
  ChevronDown,
} from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole | ''>('karyawan');
  const [nik, setNik] = useState('');
  const [divisi, setDivisi] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    document.title = 'Pendaftaran Akun - Layanan Kesehatan PTPN';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: string[] = [];

    if (!name.trim()) {
      newErrors.push('Nama Lengkap wajib diisi.');
    }
    if (!email.trim()) {
      newErrors.push('Alamat Email wajib diisi.');
    }
    if (!role) {
      newErrors.push('Silakan pilih Peran Akun terlebih dahulu.');
    }
    if (!password) {
      newErrors.push('Kata Sandi wajib diisi.');
    } else if (password.length < 6) {
      newErrors.push('Kata Sandi minimal 6 karakter.');
    }

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    setLoading(true);

    try {
      const result = await register(
        name,
        email,
        password,
        role as UserRole,
        nik || undefined,
        role === 'karyawan' ? divisi : undefined
      );

      if (!result.success || !result.user) {
        setErrors([result.error || 'Gagal mendaftarkan akun. Silakan coba kembali.']);
        setLoading(false);
        return;
      }

      // Berhasil pendaftaran akun -> Buka halaman dashboard sesuai role
      const userRole = result.user.role;
      if (userRole === 'admin') {
        router.push('/admin/dashboard');
      } else if (userRole === 'klinik') {
        router.push('/klinik/dashboard');
      } else {
        router.push('/employee/dashboard');
      }
    } catch (err: any) {
      setErrors([err.message || 'Terjadi kesalahan sistem saat mendaftarkan akun.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-[#eaf4ee]">
      {/* PTPN Brand Emblem / Logo Header */}
      <div className="mb-6 text-center">
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
          Pendaftaran Akun Baru
        </h1>
        <p className="mt-1 text-center text-xs font-medium leading-relaxed text-slate-700 px-2">
          Daftarkan akun Layanan Kesehatan &amp; MCU PTPN.
        </p>

        {/* Error Notification */}
        {errors.length > 0 && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/95 p-3.5 text-xs font-medium text-rose-800 animate-in fade-in">
            <div className="flex items-center gap-2 font-bold text-rose-900">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Gagal Mendaftar</span>
            </div>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-rose-700">
              {errors.map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {/* Input 1: Nama Lengkap */}
          <div className="space-y-1">
            <label htmlFor="name" className="block text-xs font-bold text-slate-800">
              Nama Lengkap
            </label>
            <div className="relative flex items-center rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 shadow-xs transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-600/20">
              <User className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                name="name"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Nama Lengkap Pegawai"
                className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Input 2: Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-bold text-slate-800">
              Alamat Email
            </label>
            <div className="relative flex items-center rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 shadow-xs transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-600/20">
              <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="email"
                name="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="nama@ptpn.co.id"
                className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Input 3: Role Dropdown */}
          <div className="space-y-1">
            <label htmlFor="role" className="block text-xs font-bold text-slate-800">
              Peran Akun
            </label>
            <div className="relative flex items-center rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 shadow-xs transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-600/20">
              <Shield className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <select
                name="role"
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole | '')}
                required
                className="w-full cursor-pointer appearance-none bg-transparent text-sm font-semibold text-slate-900 outline-none pr-8"
              >
                <option value="" disabled>Pilih Peran Akun...</option>
                <option value="karyawan">Karyawan</option>
                <option value="admin">Admin</option>
                <option value="klinik">Klinik</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-500 absolute right-4 pointer-events-none" />
            </div>
          </div>

          {/* Input 4: NIK */}
          <div className="space-y-1">
            <label htmlFor="nik" className="block text-xs font-bold text-slate-800">
              Nomor Induk Karyawan (NIK)
            </label>
            <div className="relative flex items-center rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 shadow-xs transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-600/20">
              <CreditCard className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                name="nik"
                id="nik"
                value={nik}
                onChange={(e) => setNik(e.target.value)}
                placeholder="Contoh: EMP-2023-0142"
                className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none font-mono"
              />
            </div>
          </div>

          {/* Input 5: Divisi (Khusus Karyawan) */}
          {role === 'karyawan' && (
            <div id="divisi-wrapper" className="space-y-1 animate-in fade-in">
              <label htmlFor="divisi" className="block text-xs font-bold text-slate-800">
                Divisi / Bagian
              </label>
              <div className="relative flex items-center rounded-2xl border border-emerald-900/15 bg-white px-4 py-3 shadow-xs transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-600/20">
                <Building2 className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                <select
                  name="divisi"
                  id="divisi"
                  value={divisi}
                  onChange={(e) => setDivisi(e.target.value)}
                  className="w-full cursor-pointer appearance-none bg-transparent text-sm font-semibold text-slate-900 outline-none pr-8"
                >
                  <option value="" disabled>Pilih Divisi Karyawan...</option>
                  <option value="Pengembangan SDM & TI">Pengembangan SDM &amp; TI</option>
                  <option value="Pengadaan & Umum">Pengadaan &amp; Umum</option>
                  <option value="Operasional Kebun">Operasional Kebun</option>
                  <option value="Keuangan & Akuntansi">Keuangan &amp; Akuntansi</option>
                  <option value="Sekretariat Perusahaan">Sekretariat Perusahaan</option>
                  <option value="Manajemen Risiko & PMO">Manajemen Risiko &amp; PMO</option>
                  <option value="Perencanaan & Strategi">Perencanaan &amp; Strategi</option>
                  <option value="Klinik & Kesehatan Worksite">Klinik &amp; Kesehatan Worksite</option>
                  <option value="Hukum & Pertanahan">Hukum &amp; Pertanahan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-4 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Input 6: Password */}
          <div className="space-y-1">
            <label htmlFor="password" className="block text-xs font-bold text-slate-800">
              Kata Sandi (Minimal 6 Karakter)
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
                placeholder="Buat kata sandi akun..."
                autoComplete="new-password"
                className="w-full bg-transparent text-sm font-semibold text-slate-900 placeholder-slate-400 outline-none"
              />
              <button
                type="button"
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
                  <span>Mendaftarkan Akun...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Simpan &amp; Daftar Akun</span>
                </>
              )}
            </button>
          </div>

          {/* Link to Login */}
          <div className="pt-2 text-center">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-700 hover:text-emerald-950 hover:underline"
            >
              Sudah memiliki akun? Masuk
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
