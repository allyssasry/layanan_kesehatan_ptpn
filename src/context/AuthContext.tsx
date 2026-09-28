'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '../types/mcu';
import {
  AuthResult,
  loginWithSupabase,
  registerWithSupabase,
  updateUserProfile,
} from '@/services/authService';
import { LogoutModal } from '@/components/layout/LogoutModal';

interface AuthContextType {
  user: User | null;
  login: (identifier: string, passwordInput: string, role?: UserRole) => Promise<AuthResult>;
  logout: () => void;
  requestLogout: () => void;
  confirmLogout: () => void;
  cancelLogout: () => void;
  isLogoutModalOpen: boolean;
  register: (
    name: string,
    email: string,
    passwordInput: string,
    role: UserRole,
    nik?: string,
    divisi?: string
  ) => Promise<AuthResult>;
  updateUser: (data: {
    name?: string;
    email?: string;
    nik?: string;
    divisi?: string;
    avatar?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const router = useRouter();

  // Helper untuk set cookie
  const setAuthCookies = (loggedInUser: User) => {
    if (typeof document !== 'undefined') {
      document.cookie = `ptpn_user_role=${loggedInUser.role}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      document.cookie = `ptpn_user_id=${loggedInUser.id}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    }
  };

  // Helper untuk clear cookie
  const clearAuthCookies = () => {
    if (typeof document !== 'undefined') {
      document.cookie = 'ptpn_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'ptpn_user_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  };

  // Cek sesi user tersimpan di localStorage saat pertama kali dimuat
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('ptpn_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setAuthCookies(parsed);
      }
    } catch (e) {
      console.warn('Gagal membaca sesi lokal:', e);
    }
  }, []);

  const login = async (
    identifier: string,
    passwordInput: string,
    role?: UserRole
  ): Promise<AuthResult> => {
    const result = await loginWithSupabase(identifier, passwordInput, role);
    if (result.success && result.user) {
      setUser(result.user);
      setAuthCookies(result.user);
      try {
        localStorage.setItem('ptpn_auth_user', JSON.stringify(result.user));
      } catch (e) {}
    }
    return result;
  };

  const requestLogout = () => {
    setIsLogoutModalOpen(true);
  };

  const cancelLogout = () => {
    setIsLogoutModalOpen(false);
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    setUser(null);
    clearAuthCookies();
    try {
      localStorage.removeItem('ptpn_auth_user');
    } catch (e) {}
    router.push('/login');
  };

  // Calling logout() opens the confirmation modal to guarantee no accidental immediate sign-outs
  const logout = () => {
    requestLogout();
  };

  const register = async (
    name: string,
    email: string,
    passwordInput: string,
    role: UserRole,
    nik?: string,
    divisi?: string
  ): Promise<AuthResult> => {
    const result = await registerWithSupabase({ name, email, password: passwordInput, role, nik, divisi });
    if (result.success && result.user) {
      setUser(result.user);
      setAuthCookies(result.user);
      try {
        localStorage.setItem('ptpn_auth_user', JSON.stringify(result.user));
      } catch (e) {}
    }
    return result;
  };

  const updateUser = async (data: {
    name?: string;
    email?: string;
    nik?: string;
    divisi?: string;
    avatar?: string | null;
    currentPassword?: string;
    newPassword?: string;
  }) => {
    if (!user) return { success: false, error: 'Sesi tidak ditemukan.' };

    const res = await updateUserProfile(user.id, data);
    if (res.success) {
      const updatedUser: User = {
        ...user,
        name: data.name ? data.name.trim() : user.name,
        email: data.email ? data.email.trim().toLowerCase() : user.email,
        nik: data.nik !== undefined ? (data.nik ? data.nik.trim() : null) : user.nik,
        divisi: data.divisi !== undefined ? (data.divisi ? data.divisi.trim() : null) : user.divisi,
        avatar: data.avatar !== undefined ? data.avatar : (user.avatar || null),
        foto: data.avatar !== undefined ? data.avatar : (user.foto || user.avatar || null),
      };
      setUser(updatedUser);
      setAuthCookies(updatedUser);
      try {
        localStorage.setItem('ptpn_auth_user', JSON.stringify(updatedUser));
      } catch (e) {}
    }
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        requestLogout,
        confirmLogout,
        cancelLogout,
        isLogoutModalOpen,
        register,
        updateUser,
      }}
    >
      {children}
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={cancelLogout}
        onConfirm={confirmLogout}
        user={user}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
