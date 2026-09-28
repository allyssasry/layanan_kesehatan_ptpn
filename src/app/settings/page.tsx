'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Lock,
  Mail,
  Building2,
  CheckCircle,
  AlertCircle,
  Save,
  Shield,
  KeyRound,
  Camera,
  Upload,
  Trash2,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();

  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    nik: user?.nik || '',
    divisi: user?.divisi || '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar || (user as any)?.foto || null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        nik: user.nik || '',
        divisi: user.divisi || '',
      });
      setAvatarPreview(user.avatar || (user as any)?.foto || null);
    }
  }, [user]);

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setProfileError('Berkas yang diunggah harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setProfileError('Ukuran foto profil maksimal 2.5 MB.');
      return;
    }

    setProfileError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatarPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    setProfileError(null);
    setIsProfileSaving(true);

    try {
      const res = await updateUser({
        name: profileData.name,
        email: profileData.email,
        nik: profileData.nik,
        divisi: profileData.divisi,
        avatar: avatarPreview,
      });

      if (res.success) {
        setProfileSuccess('Data profil dan foto Anda berhasil diperbarui!');
        setTimeout(() => setProfileSuccess(null), 4000);
      } else {
        setProfileError(res.error || 'Gagal memperbarui profil.');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Kata sandi baru minimal 6 karakter.');
      return;
    }

    setIsPasswordSaving(true);

    try {
      const res = await updateUser({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (res.success) {
        setPasswordSuccess('Kata sandi berhasil diubah! Silakan gunakan kata sandi baru pada login berikutnya.');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordSuccess(null), 5000);
      } else {
        setPasswordError(res.error || 'Kata sandi saat ini salah.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Gagal mengubah kata sandi.');
    } finally {
      setIsPasswordSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12 max-w-5xl mx-auto">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Pengaturan Akun &amp; Keamanan
            </h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Kelola informasi profil, data identitas kepegawaian, dan perbarui kata sandi akun Anda
            </p>
          </div>

          <div className="px-3.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-extrabold text-xs flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-700" />
            <span className="capitalize">Peran: {user?.role || 'Karyawan'}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Card 1: Form Profil Pengguna */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Informasi Profil</h2>
                <p className="text-xs text-slate-500 font-medium">Perbarui nama lengkap, email, NIK, dan unit kerja</p>
              </div>
            </div>

            {profileSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-950 font-bold text-xs animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2 text-rose-950 font-bold text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            {/* Bagian Unggah Foto Profil */}
            <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/90 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-full overflow-hidden border-2 border-emerald-600/70 shadow-md bg-[#0a5c36] text-white flex items-center justify-center text-2xl font-black">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Foto Profil" className="w-full h-full object-cover" />
                  ) : (
                    profileData.name?.trim().charAt(0).toUpperCase() || (user?.role === 'klinik' ? 'K' : 'U')
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-800 text-white shadow-md hover:bg-emerald-900 transition cursor-pointer border-2 border-white"
                  title="Unggah Foto Profil Baru"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                <h3 className="text-xs font-bold text-slate-900">Foto Profil Akun</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Foto ini akan tampil di navbar atas, menu profil, dan identitas akun Anda. Format: JPG, PNG, atau WebP (Maks. 2.5 MB).
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:border-emerald-600 hover:text-emerald-700 text-slate-700 text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{avatarPreview ? 'Ganti Foto' : 'Unggah Foto'}</span>
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="px-3 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-bold rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Nama Lengkap
                  <span className="text-[10px] font-normal text-slate-400 ml-1.5">
                    (Nama ini yang akan ditampilkan di header dan profil akun)
                  </span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan nama lengkap..."
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-700 focus:bg-white transition font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Alamat Email</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 outline-none focus:border-emerald-700 focus:bg-white transition font-semibold text-slate-800"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Nomor Induk Karyawan (NIK)</label>
                <input
                  type="text"
                  placeholder="Contoh: EMP-2023-0142"
                  value={profileData.nik}
                  onChange={(e) => setProfileData({ ...profileData, nik: e.target.value })}
                  className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 outline-none focus:border-emerald-700 focus:bg-white transition font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Divisi / Bagian</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Contoh: Operasional Kebun"
                    value={profileData.divisi}
                    onChange={(e) => setProfileData({ ...profileData, divisi: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 outline-none focus:border-emerald-700 focus:bg-white transition font-semibold text-slate-800"
                  />
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isProfileSaving}
                  className="w-full py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isProfileSaving ? 'Menyimpan...' : 'Simpan Perubahan Profil'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Form Ubah Password */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Ubah Kata Sandi</h2>
                <p className="text-xs text-slate-500 font-medium">Perbarui kata sandi untuk mengamankan akun Anda</p>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-emerald-950 font-bold text-xs animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center gap-2 text-rose-950 font-bold text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Kata Sandi Saat Ini</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Masukkan kata sandi lama..."
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 outline-none focus:border-amber-600 focus:bg-white transition"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Kata Sandi Baru (Min. 6 Karakter)</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Masukkan kata sandi baru..."
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 outline-none focus:border-amber-600 focus:bg-white transition"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Konfirmasi Kata Sandi Baru</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="Ulangi kata sandi baru..."
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2.5 outline-none focus:border-amber-600 focus:bg-white transition"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPasswordSaving}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>{isPasswordSaving ? 'Memproses...' : 'Ubah Kata Sandi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
