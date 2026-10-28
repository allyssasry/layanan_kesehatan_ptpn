// src/services/profileSyncService.ts - Sinkronisasi Terpusat Profil Karyawan / Peserta
import { getSupabaseClient } from '@/lib/supabase';

/**
 * Normalisasi variasi string entitas ke 3 opsi standar dropdown 3 Entitas PTPN
 */
export function normalizeEntitasDonor(entitas?: string | null): string {
  if (!entitas) return 'PTPN III / Holding';
  const s = String(entitas).trim().toLowerCase();

  if (s.includes('bukan') || s.includes('non') || s.includes('eksternal') || s.includes('umum') || s.includes('luar')) {
    return 'Bukan Entitas';
  }

  // 1. Cek PTPN IV / PalmCo terlebih dahulu
  if (s.includes('palmco') || s.includes('ptpn iv') || s.includes('ptpn 4') || s.includes('ptpn4')) {
    return 'PTPN IV / PalmCo';
  }

  // 2. Cek PTPN III / Holding
  if (s.includes('holding') || s.includes('ptpn iii') || s.includes('ptpn 3') || s.includes('ptpn3')) {
    return 'PTPN III / Holding';
  }

  // Default fallback
  return 'PTPN III / Holding';
}

/**
 * Sinkronisasi data profil karyawan/peserta (entitas, departemen, divisi, jabatan, foto, dll)
 * ke SELURUH tabel rekam medis di Supabase (mcu_donor_darah, mcu_mini_mcu_records, mcu_records, mcu_karyawan_records).
 * Dicocokkan berdasarkan NIK atau Nama Lengkap, sehingga perubahan di salah satu modul
 * langsung ter-update di modul lainnya dan tersimpan untuk autocomplete masa depan.
 */
export async function syncParticipantProfileEverywhere(
  client: any,
  params: {
    nik?: string | null;
    nama_lengkap?: string | null;
    entitas?: string | null;
    departemen?: string | null;
    divisi?: string | null;
    jabatan?: string | null;
    nomor_inhealth?: string | null;
    nomor_bpjs?: string | null;
    jenis_kelamin?: string | null;
    umur?: number | null;
    foto?: string | null;
  }
): Promise<void> {
  if (!client) return;

  const targetNik = params.nik?.trim();
  const targetName = params.nama_lengkap?.trim();
  if (!targetNik && !targetName) return;

  const rawEntity = params.entitas || params.departemen;
  const normalizedEntity = rawEntity ? normalizeEntitasDonor(rawEntity) : undefined;

  const donorSync: Record<string, any> = { updated_at: new Date().toISOString() };
  if (normalizedEntity) donorSync.entitas = normalizedEntity;
  if (params.divisi !== undefined) donorSync.divisi = params.divisi;
  if (params.jabatan !== undefined) donorSync.jabatan = params.jabatan;
  if (params.nomor_inhealth !== undefined) donorSync.nomor_inhealth = params.nomor_inhealth;
  if (params.nomor_bpjs !== undefined) donorSync.nomor_bpjs = params.nomor_bpjs;
  if (params.jenis_kelamin !== undefined) donorSync.jenis_kelamin = params.jenis_kelamin;
  if (params.umur !== undefined) donorSync.umur = params.umur;
  if (params.foto !== undefined) donorSync.foto = params.foto;

  const mcuSync: Record<string, any> = { updated_at: new Date().toISOString() };
  if (normalizedEntity) {
    mcuSync.departemen = normalizedEntity;
    mcuSync.entitas = normalizedEntity;
  }
  if (params.divisi !== undefined) mcuSync.divisi = params.divisi;
  if (params.jabatan !== undefined) mcuSync.jabatan = params.jabatan;
  if (params.nomor_inhealth !== undefined) mcuSync.nomor_inhealth = params.nomor_inhealth;
  if (params.nomor_bpjs !== undefined) mcuSync.nomor_bpjs = params.nomor_bpjs;
  if (params.jenis_kelamin !== undefined) mcuSync.jenis_kelamin = params.jenis_kelamin;
  if (params.umur !== undefined) mcuSync.umur = params.umur;
  if (params.foto !== undefined) mcuSync.foto = params.foto;

  // 1. Sync mcu_donor_darah
  try {
    if (targetNik && targetNik !== '0000000000') {
      await client.from('mcu_donor_darah').update(donorSync).eq('nik', targetNik);
    }
    if (targetName) {
      await client.from('mcu_donor_darah').update(donorSync).ilike('nama_lengkap', targetName);
    }
  } catch (err) {
    console.warn('Sync donor table error:', err);
  }

  // 2. Sync mcu_mini_mcu_records, mcu_records, mcu_karyawan_records
  const mcuTables = ['mcu_mini_mcu_records', 'mcu_records', 'mcu_karyawan_records'];
  for (const tbl of mcuTables) {
    try {
      if (targetNik && targetNik !== '0000000000') {
        await client.from(tbl).update(mcuSync).eq('nik', targetNik);
      }
      if (targetName) {
        await client.from(tbl).update(mcuSync).ilike('nama_lengkap', targetName);
      }
    } catch (err) {
      console.warn('Sync ' + tbl + ' error:', err);
    }
  }
}
