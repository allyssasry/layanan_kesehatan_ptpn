'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { McuRecord, MiniMcuRecord, AppNotification, Obat, DonorDarahRecord } from '../types/mcu';
import { getSupabaseClient } from '@/lib/supabase';
import {
  fallbackMcuRecords,
  fallbackMiniRecords,
  fallbackNotifications,
  fetchMcuRecordsFromSupabase,
  insertMcuRecordToSupabase,
  updateMcuRecordInSupabase,
  deleteMcuRecordFromSupabase,
  fetchMiniMcuRecordsFromSupabase,
  insertMiniMcuRecordToSupabase,
  updateMiniMcuRecordInSupabase,
  deleteMiniMcuRecordFromSupabase,
  fetchNotificationsFromSupabase,
  markNotificationReadInSupabase,
  markAllNotificationsReadInSupabase,
  fetchMasterObats,
  fetchKaryawanRecordsFromSupabase,
  buildContextualNotifications,
} from '@/services/mcuService';
import {
  initialDonorRecords,
  fetchDonorRecordsFromSupabase,
  insertDonorRecordToSupabase,
  updateDonorRecordInSupabase,
  deleteDonorRecordFromSupabase,
} from '@/services/donorService';
import { useAuth } from './AuthContext';

interface McuContextType {
  mcuRecords: McuRecord[];
  miniMcuRecords: MiniMcuRecord[];
  karyawanRecords: any[];
  donorRecords: DonorDarahRecord[];
  notifications: AppNotification[];
  obats: Obat[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  refreshDonorData: () => Promise<void>;
  addMcuRecord: (record: Omit<McuRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<number>;
  updateMcuRecord: (id: number, data: Partial<McuRecord>) => Promise<void>;
  deleteMcuRecord: (id: number) => Promise<void>;
  addMiniMcuRecord: (record: Omit<MiniMcuRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<number>;
  updateMiniMcuRecord: (id: number, data: Partial<MiniMcuRecord>) => Promise<void>;
  deleteMiniMcuRecord: (id: number) => Promise<void>;
  addDonorRecord: (record: Omit<DonorDarahRecord, 'id' | 'created_at' | 'updated_at'>) => Promise<DonorDarahRecord>;
  updateDonorRecord: (id: number, data: Partial<DonorDarahRecord>) => Promise<DonorDarahRecord | null>;
  deleteDonorRecord: (id: number) => Promise<boolean>;
  markNotificationRead: (id: number) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  unreadCount: number;
}

const McuContext = createContext<McuContextType | undefined>(undefined);

export const McuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [mcuRecords, setMcuRecords] = useState<McuRecord[]>(fallbackMcuRecords);
  const [miniMcuRecords, setMiniMcuRecords] = useState<MiniMcuRecord[]>(fallbackMiniRecords);
  const [karyawanRecords, setKaryawanRecords] = useState<any[]>([]);
  const [donorRecords, setDonorRecords] = useState<DonorDarahRecord[]>(initialDonorRecords);
  const [notifications, setNotifications] = useState<AppNotification[]>(fallbackNotifications);
  const [obats, setObats] = useState<Obat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mengambil data dari Supabase & menyusun notifikasi kontekstual untuk user
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [mcus, minis, karys, dbNotifs, obatList, donors] = await Promise.all([
        fetchMcuRecordsFromSupabase(),
        fetchMiniMcuRecordsFromSupabase(),
        fetchKaryawanRecordsFromSupabase(),
        fetchNotificationsFromSupabase(user ? { id: user.id, role: user.role } : undefined),
        fetchMasterObats(),
        fetchDonorRecordsFromSupabase(),
      ]);
      setMcuRecords(mcus);
      setMiniMcuRecords(minis);
      setKaryawanRecords(karys);
      setDonorRecords(donors);
      const contextualNotifs = buildContextualNotifications(user, mcus, minis, dbNotifs);
      setNotifications(contextualNotifs);
      setObats(obatList);
    } catch (err) {
      console.warn('Gagal memuat data dari Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Supabase Realtime Subscription untuk Notifikasi
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;

    const channel = client
      .channel('app_notifs_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mcu_app_notifications' },
        () => {
          fetchNotificationsFromSupabase(user ? { id: user.id, role: user.role } : undefined)
            .then((notifs) => setNotifications(notifs))
            .catch(() => {});
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_notifications' },
        () => {
          fetchNotificationsFromSupabase(user ? { id: user.id, role: user.role } : undefined)
            .then((notifs) => setNotifications(notifs))
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user]);

  // Tambah Data MCU (Admin / Karyawan)
  const addMcuRecord = async (recordData: Omit<McuRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
    const newId = await insertMcuRecordToSupabase(recordData);
    const newRecord: McuRecord = {
      ...recordData,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if ((recordData as any).created_by_role === 'karyawan') {
      setKaryawanRecords((prev) => [newRecord, ...prev]);
    }
    setMcuRecords((prev) => [newRecord, ...prev]);
    await refreshData();
    return newId;
  };

  // Update Data MCU (dengan cascade sinkronisasi profil)
  const updateMcuRecord = async (id: number, data: Partial<McuRecord>) => {
    const existing = mcuRecords.find((r) => r.id === id);
    const targetNik = (data.nik || existing?.nik || '').trim();
    const targetName = (data.nama_lengkap || existing?.nama_lengkap || '').trim().toLowerCase();
    const newDept = data.departemen || (data as any).entitas;

    setMcuRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === id) return { ...rec, ...data };
        const isMatch =
          (targetNik && rec.nik === targetNik) ||
          (targetName && (rec.nama_lengkap || '').trim().toLowerCase() === targetName);
        if (isMatch) {
          return {
            ...rec,
            ...(newDept ? { departemen: newDept, entitas: newDept } : {}),
            ...(data.divisi !== undefined ? { divisi: data.divisi } : {}),
            ...(data.jabatan !== undefined ? { jabatan: data.jabatan } : {}),
            ...(data.foto !== undefined ? { foto: data.foto } : {}),
          };
        }
        return rec;
      })
    );

    if (newDept || data.divisi !== undefined || data.jabatan !== undefined || data.foto !== undefined) {
      setDonorRecords((prev) =>
        prev.map((r) => {
          const isMatch =
            (targetNik && r.nik === targetNik) ||
            (targetName && (r.nama_lengkap || '').trim().toLowerCase() === targetName);
          if (isMatch) {
            return {
              ...r,
              ...(newDept ? { entitas: newDept } : {}),
              ...(data.divisi !== undefined ? { divisi: data.divisi } : {}),
              ...(data.jabatan !== undefined ? { jabatan: data.jabatan } : {}),
              ...(data.foto !== undefined ? { foto: data.foto } : {}),
            };
          }
          return r;
        })
      );
    }

    await updateMcuRecordInSupabase(id, data);
  };

  // Hapus Data MCU
  const deleteMcuRecord = async (id: number) => {
    setMcuRecords((prev) => prev.filter((rec) => rec.id !== id));
    await deleteMcuRecordFromSupabase(id);
  };

  // Tambah Data Mini-MCU (Klinik)
  const addMiniMcuRecord = async (recordData: Omit<MiniMcuRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number> => {
    const newId = await insertMiniMcuRecordToSupabase(recordData);
    const newRecord: MiniMcuRecord = {
      ...recordData,
      id: newId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMiniMcuRecords((prev) => [newRecord, ...prev]);
    return newId;
  };

  // Update Data Mini-MCU (dengan cascade sinkronisasi profil)
  const updateMiniMcuRecord = async (id: number, data: Partial<MiniMcuRecord>) => {
    const existing = miniMcuRecords.find((r) => r.id === id);
    const targetNik = (data.nik || existing?.nik || '').trim();
    const targetName = (data.nama_lengkap || existing?.nama_lengkap || '').trim().toLowerCase();
    const newDept = data.departemen || (data as any).entitas;

    setMiniMcuRecords((prev) =>
      prev.map((rec) => {
        if (rec.id === id) return { ...rec, ...data };
        const isMatch =
          (targetNik && rec.nik === targetNik) ||
          (targetName && (rec.nama_lengkap || '').trim().toLowerCase() === targetName);
        if (isMatch) {
          return {
            ...rec,
            ...(newDept ? { departemen: newDept, entitas: newDept } : {}),
            ...(data.divisi !== undefined ? { divisi: data.divisi } : {}),
            ...(data.jabatan !== undefined ? { jabatan: data.jabatan } : {}),
            ...(data.foto !== undefined ? { foto: data.foto } : {}),
          };
        }
        return rec;
      })
    );

    if (newDept || data.divisi !== undefined || data.jabatan !== undefined || data.foto !== undefined) {
      setDonorRecords((prev) =>
        prev.map((r) => {
          const isMatch =
            (targetNik && r.nik === targetNik) ||
            (targetName && (r.nama_lengkap || '').trim().toLowerCase() === targetName);
          if (isMatch) {
            return {
              ...r,
              ...(newDept ? { entitas: newDept } : {}),
              ...(data.divisi !== undefined ? { divisi: data.divisi } : {}),
              ...(data.jabatan !== undefined ? { jabatan: data.jabatan } : {}),
              ...(data.foto !== undefined ? { foto: data.foto } : {}),
            };
          }
          return r;
        })
      );
    }

    await updateMiniMcuRecordInSupabase(id, data);
  };

  // Hapus Data Mini-MCU
  const deleteMiniMcuRecord = async (id: number) => {
    setMiniMcuRecords((prev) => prev.filter((rec) => rec.id !== id));
    await deleteMiniMcuRecordFromSupabase(id);
  };

  // Tandai 1 Notifikasi Dibaca
  const markNotificationRead = async (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true, read: true } : n))
    );
    if (typeof window !== 'undefined' && user) {
      try {
        const key = `ptpn_read_notifs_${user.nik || user.id || user.role || 'user'}`;
        const stored = localStorage.getItem(key);
        const list: number[] = stored ? JSON.parse(stored) : [];
        if (!list.includes(id)) {
          list.push(id);
          localStorage.setItem(key, JSON.stringify(list));
        }
      } catch {}
    }
    await markNotificationReadInSupabase(id);
  };

  // Tandai Semua Notifikasi Dibaca
  const markAllNotificationsRead = async () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read: true }))
    );
    if (typeof window !== 'undefined' && user) {
      try {
        const key = `ptpn_read_notifs_${user.nik || user.id || user.role || 'user'}`;
        const allIds = notifications.map((n) => n.id);
        localStorage.setItem(key, JSON.stringify(allIds));
      } catch {}
    }
    await markAllNotificationsReadInSupabase(user ? { id: user.id, role: user.role } : undefined);
  };

  // Donor Darah CRUD Handlers
  const refreshDonorData = useCallback(async () => {
    try {
      const records = await fetchDonorRecordsFromSupabase();
      setDonorRecords(records);
    } catch (err) {
      console.warn('Gagal refreshDonorData:', err);
    }
  }, []);

  const addDonorRecord = async (record: Omit<DonorDarahRecord, 'id' | 'created_at' | 'updated_at'>) => {
    const created = await insertDonorRecordToSupabase(record);
    setDonorRecords((prev) => [created, ...prev.filter((r) => r.id !== created.id)]);
    return created;
  };

  const updateDonorRecord = async (id: number, data: Partial<DonorDarahRecord>) => {
    const updated = await updateDonorRecordInSupabase(id, data);
    if (updated) {
      const targetNik = (updated.nik || data.nik || '').trim();
      const targetName = (updated.nama_lengkap || data.nama_lengkap || '').trim().toLowerCase();
      const newEntitas = updated.entitas;

      // 1. Update donorRecords untuk seluruh record yang bersangkutan (ID, NIK, atau Nama)
      setDonorRecords((prev) =>
        prev.map((r) => {
          const isTarget =
            r.id === id ||
            (targetNik && r.nik === targetNik) ||
            (targetName && (r.nama_lengkap || '').trim().toLowerCase() === targetName);
          if (isTarget) {
            return {
              ...r,
              ...(r.id === id ? updated : {}),
              ...(newEntitas ? { entitas: newEntitas } : {}),
              ...(updated.divisi !== undefined ? { divisi: updated.divisi } : {}),
              ...(updated.jabatan !== undefined ? { jabatan: updated.jabatan } : {}),
              ...(updated.foto !== undefined ? { foto: updated.foto } : {}),
            };
          }
          return r;
        })
      );

      // 2. Cascade update ke miniMcuRecords
      setMiniMcuRecords((prev) =>
        prev.map((r) => {
          const isTarget =
            (targetNik && r.nik === targetNik) ||
            (targetName && (r.nama_lengkap || '').trim().toLowerCase() === targetName);
          if (isTarget) {
            return {
              ...r,
              ...(newEntitas ? { departemen: newEntitas, entitas: newEntitas } : {}),
              ...(updated.divisi !== undefined ? { divisi: updated.divisi } : {}),
              ...(updated.jabatan !== undefined ? { jabatan: updated.jabatan } : {}),
              ...(updated.foto !== undefined ? { foto: updated.foto } : {}),
            };
          }
          return r;
        })
      );

      // 3. Cascade update ke mcuRecords
      setMcuRecords((prev) =>
        prev.map((r) => {
          const isTarget =
            (targetNik && r.nik === targetNik) ||
            (targetName && (r.nama_lengkap || '').trim().toLowerCase() === targetName);
          if (isTarget) {
            return {
              ...r,
              ...(newEntitas ? { departemen: newEntitas, entitas: newEntitas } : {}),
              ...(updated.divisi !== undefined ? { divisi: updated.divisi } : {}),
              ...(updated.jabatan !== undefined ? { jabatan: updated.jabatan } : {}),
              ...(updated.foto !== undefined ? { foto: updated.foto } : {}),
            };
          }
          return r;
        })
      );

      // 4. Cascade update ke karyawanRecords
      setKaryawanRecords((prev) =>
        prev.map((r) => {
          const isTarget =
            (targetNik && r.nik === targetNik) ||
            (targetName && (r.nama_lengkap || '').trim().toLowerCase() === targetName);
          if (isTarget) {
            return {
              ...r,
              ...(newEntitas ? { departemen: newEntitas, entitas: newEntitas } : {}),
              ...(updated.divisi !== undefined ? { divisi: updated.divisi } : {}),
              ...(updated.jabatan !== undefined ? { jabatan: updated.jabatan } : {}),
              ...(updated.foto !== undefined ? { foto: updated.foto } : {}),
            };
          }
          return r;
        })
      );
    }
    return updated;
  };

  const deleteDonorRecord = async (id: number) => {
    const success = await deleteDonorRecordFromSupabase(id);
    if (success) {
      setDonorRecords((prev) => prev.filter((r) => r.id !== id));
    }
    return success;
  };

  const unreadCount = notifications.filter((n) => !n.is_read && !n.read).length;

  return (
    <McuContext.Provider
      value={{
        mcuRecords,
        miniMcuRecords,
        karyawanRecords,
        donorRecords,
        notifications,
        obats,
        isLoading,
        refreshData,
        refreshDonorData,
        addMcuRecord,
        updateMcuRecord,
        deleteMcuRecord,
        addMiniMcuRecord,
        updateMiniMcuRecord,
        deleteMiniMcuRecord,
        addDonorRecord,
        updateDonorRecord,
        deleteDonorRecord,
        markNotificationRead,
        markAllNotificationsRead,
        unreadCount,
      }}
    >
      {children}
    </McuContext.Provider>
  );
};

export const useMcu = () => {
  const context = useContext(McuContext);
  if (!context) {
    throw new Error('useMcu must be used within McuProvider');
  }
  return context;
};
