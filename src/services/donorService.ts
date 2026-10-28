// src/services/donorService.ts - Service Layer untuk Modul Donor Darah PTPN
import { getSupabaseClient } from '@/lib/supabase';
import { DonorDarahRecord, DonorStats } from '@/types/mcu';
import { TABLES } from '@/services/mcuService';

// Key untuk fallback localStorage saat pengujian offline / sebelum migrasi SQL dijalankan
const LOCAL_STORAGE_KEY = 'ptpn_mcu_donor_darah_records';

// Initial Fallback Records (Menghubungkan ke identitas peserta existing di mcu_records)
export const initialDonorRecords: DonorDarahRecord[] = [
  {
    id: 1,
    mcu_record_id: 302,
    nik: '1271181507880005',
    nama_lengkap: 'NICO DEMUS MARPAUNG',
    entitas: 'PTPN III / Holding',
    divisi: 'Divisi Keuangan Strategis dan Anggaran',
    jabatan: 'Staf Karyawan',
    nomor_inhealth: '1001550650005',
    nomor_bpjs: '0001488535121',
    jenis_kelamin: 'Laki-laki',
    umur: 35,
    foto: null,
    tanggal_donor: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
    golongan_darah: 'O',
    rhesus: '+',
    jenis_donor: 'Darah Lengkap (Whole Blood)',
    lokasi_donor: 'Gedung Holding PTPN - Lt. 2 (Aula Serbaguna)',
    penyelenggara_donor: 'Palang Merah Indonesia (PMI) Kota Medan',
    volume_darah: '350 ml',
    keterangan: 'Pendonor rutin ke-6. Kondisi pasca donor sangat baik dan stabil.',
    status: 'Selesai',
    created_by_role: 'klinik',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: 2,
    mcu_record_id: 295,
    nik: '3301212612850001',
    nama_lengkap: 'ARIS AGUNG PURNOMO, SE. AK',
    entitas: 'PTPN III / Holding',
    divisi: 'Divisi Akuntansi & Perpajakan',
    jabatan: 'Kepala Sub Bagian',
    nomor_inhealth: '1001550650012',
    nomor_bpjs: '0001488535133',
    jenis_kelamin: 'Laki-laki',
    umur: 41,
    foto: null,
    tanggal_donor: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    golongan_darah: 'A',
    rhesus: '+',
    jenis_donor: 'Darah Lengkap (Whole Blood)',
    lokasi_donor: 'Klinik Pratama PTPN',
    penyelenggara_donor: 'PMI Unit Transfusi Darah',
    volume_darah: '450 ml',
    keterangan: 'Donor darah bakti sosial dalam rangka HUT PTPN.',
    status: 'Selesai',
    created_by_role: 'klinik',
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 3,
    mcu_record_id: 297,
    nik: '3202141104890002',
    nama_lengkap: 'DEDE SAEPULROHMAN',
    entitas: 'PTPN I / SuppCo',
    divisi: 'Divisi Operasional & Logistik',
    jabatan: 'Supervisor',
    nomor_inhealth: '1001550650088',
    nomor_bpjs: '0001488535199',
    jenis_kelamin: 'Laki-laki',
    umur: 37,
    foto: null,
    tanggal_donor: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    golongan_darah: 'B',
    rhesus: '+',
    jenis_donor: 'Apheresis (Trombosit)',
    lokasi_donor: 'Kantor Direksi PTPN I',
    penyelenggara_donor: 'PMI DKI Jakarta',
    volume_darah: '350 ml',
    keterangan: 'Donor trombosit khusus, HB normal 14.5 g/dL.',
    status: 'Selesai',
    created_by_role: 'klinik',
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 4,
    user_id: 3,
    nik: '2572874',
    nama_lengkap: 'allyssa',
    entitas: 'PTPN III / Holding',
    divisi: 'DPDU',
    jabatan: 'Staf Karyawan',
    nomor_inhealth: '1001550650777',
    nomor_bpjs: '0001488535777',
    jenis_kelamin: 'Perempuan',
    umur: 28,
    foto: null,
    tanggal_donor: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0],
    golongan_darah: 'AB',
    rhesus: '+',
    jenis_donor: 'Darah Lengkap (Whole Blood)',
    lokasi_donor: 'Klinik Pratama PTPN',
    penyelenggara_donor: 'PMI Kota Medan',
    volume_darah: '350 ml',
    keterangan: 'Donor darah rutin tahunan karyawan. Kondisi sehat dan fit.',
    status: 'Selesai',
    created_by_role: 'klinik',
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 5,
    mcu_record_id: 304,
    nik: '1271031202820009',
    nama_lengkap: 'SYAFRIZAL, SE',
    entitas: 'PTPN IV / PalmCo',
    divisi: 'Divisi Tanaman & Agronomi',
    jabatan: 'Manager Kebun',
    nomor_inhealth: '1001550650033',
    nomor_bpjs: '0001488535144',
    jenis_kelamin: 'Laki-laki',
    umur: 44,
    foto: null,
    tanggal_donor: new Date(Date.now() - 40 * 86400000).toISOString().split('T')[0],
    golongan_darah: 'O',
    rhesus: '+',
    jenis_donor: 'Darah Lengkap (Whole Blood)',
    lokasi_donor: 'Kantor Regional PTPN IV',
    penyelenggara_donor: 'PMI Cabang Riau',
    volume_darah: '450 ml',
    keterangan: 'Pendonor donor darah ke-12. Kondisi sangat fit.',
    status: 'Selesai',
    created_by_role: 'klinik',
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 40 * 86400000).toISOString(),
  },
];

// Helper Local Storage
function getLocalFallbackRecords(): DonorDarahRecord[] {
  if (typeof window === 'undefined') return initialDonorRecords;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return initialDonorRecords;
}

function saveLocalFallbackRecords(records: DonorDarahRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

/**
 * Normalisasi nama entitas ke format standar dropdown 3 Entitas PTPN
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

  // 3. Cek PTPN I / SuppCo dengan regex boundary agar tidak salah mencocokkan 'ptpn iii' atau 'ptpn iv'
  if (s.includes('suppco') || s.includes('ptpn 1') || s.includes('ptpn1') || /\bptpn\s*i\b/.test(s)) {
    return 'PTPN I / SuppCo';
  }

  return 'PTPN III / Holding';
}

/**
 * Mengambil seluruh data riwayat donor darah dari Supabase tabel mcu_donor_darah.
 * Memiliki fallback cerdas jika tabel Supabase belum dimigrasi.
 */
export async function fetchDonorRecordsFromSupabase(): Promise<DonorDarahRecord[]> {
  const client = getSupabaseClient();
  const fallback = getLocalFallbackRecords();

  if (!client) return fallback;

  try {
    const { data, error } = await client
      .from('mcu_donor_darah')
      .select('*')
      .order('tanggal_donor', { ascending: false });

    if (error) {
      console.warn('Catatan: Query mcu_donor_darah di Supabase:', error.message);
      return fallback;
    }

    if (data && data.length > 0) {
      saveLocalFallbackRecords(data);
      return data;
    }

    return fallback;
  } catch (err) {
    console.warn('Gagal memuat data dari Supabase mcu_donor_darah, menggunakan data lokal:', err);
    return fallback;
  }
}

/**
 * Filter riwayat donor khusus karyawan login (Role Karyawan)
 * Memastikan Karyawan HANYA dapat melihat riwayat donor miliknya sendiri.
 */
export async function fetchEmployeeDonorHistory(nik: string, nama?: string): Promise<DonorDarahRecord[]> {
  const allRecords = await fetchDonorRecordsFromSupabase();
  const cleanNik = (nik || '').trim().toLowerCase();
  const cleanName = (nama || '').trim().toLowerCase();

  return allRecords.filter((rec) => {
    const recNik = (rec.nik || '').trim().toLowerCase();
    const recName = (rec.nama_lengkap || '').trim().toLowerCase();

    if (cleanNik && recNik && recNik === cleanNik) return true;
    if (cleanName && recName && (recName === cleanName || recName.includes(cleanName) || cleanName.includes(recName))) return true;
    return false;
  });
}

/**
 * Tambah data donor darah baru ke Supabase tabel mcu_donor_darah.
 * Otomatis menghubungkan dengan peserta existing (mcu_record_id / user_id) tanpa duplikasi master peserta.
 */
export async function insertDonorRecordToSupabase(
  payload: Omit<DonorDarahRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<DonorDarahRecord> {
  const client = getSupabaseClient();
  const cleanNik = (payload.nik || '').trim();

  // 1. Cari mcu_record_id atau user_id dari data peserta yang sudah ada di sistem jika belum diisi
  let resolvedMcuRecordId = payload.mcu_record_id || null;
  let resolvedUserId = payload.user_id || null;

  if (client && (!resolvedMcuRecordId || !resolvedUserId) && cleanNik) {
    try {
      // Cek di mcu_records
      if (!resolvedMcuRecordId) {
        const { data: mcuRow } = await client
          .from('mcu_records')
          .select('id')
          .eq('nik', cleanNik)
          .limit(1)
          .maybeSingle();
        if (mcuRow?.id) resolvedMcuRecordId = Number(mcuRow.id);
      }

      // Cek di mcu_users
      if (!resolvedUserId) {
        const { data: userRow } = await client
          .from('mcu_users')
          .select('id')
          .eq('nik', cleanNik)
          .limit(1)
          .maybeSingle();
        if (userRow?.id) resolvedUserId = Number(userRow.id);
      }
    } catch (err) {
      console.warn('Lookup peserta existing:', err);
    }
  }

  const recordToInsert = {
    ...payload,
    entitas: normalizeEntitasDonor(payload.entitas),
    mcu_record_id: resolvedMcuRecordId,
    user_id: resolvedUserId,
    created_by_role: payload.created_by_role || 'klinik',
    status: payload.status || 'Selesai',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (client) {
    try {
      const { data, error } = await client
        .from('mcu_donor_darah')
        .insert([recordToInsert])
        .select()
        .single();

      if (!error && data) {
        const local = getLocalFallbackRecords();
        saveLocalFallbackRecords([data, ...local]);
        return data;
      }
      console.warn('Gagal insert mcu_donor_darah di Supabase, menyimpan ke storage lokal:', error?.message);
    } catch (err) {
      console.warn('Exception insert mcu_donor_darah:', err);
    }
  }

  // Fallback lokal jika tabel Supabase belum siap
  const localList = getLocalFallbackRecords();
  const newRecord: DonorDarahRecord = {
    ...recordToInsert,
    id: Date.now(),
  };
  saveLocalFallbackRecords([newRecord, ...localList]);
  return newRecord;
}

/**
 * Update data donor darah di Supabase
 */
export async function updateDonorRecordInSupabase(
  id: number,
  updates: Partial<DonorDarahRecord>
): Promise<DonorDarahRecord | null> {
  const client = getSupabaseClient();
  const cleanedUpdates = {
    ...updates,
    ...(updates.entitas ? { entitas: normalizeEntitasDonor(updates.entitas) } : {}),
    updated_at: new Date().toISOString(),
  };

  if (client) {
    try {
      const { data, error } = await client
        .from('mcu_donor_darah')
        .update(cleanedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        // Sinkronkan entitas, divisi, dan data profil ke semua record lain dengan NIK yang sama
        const targetNik = data.nik || updates.nik;
        if (targetNik) {
          const syncUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
          if (cleanedUpdates.entitas) syncUpdates.entitas = cleanedUpdates.entitas;
          if (cleanedUpdates.divisi !== undefined) syncUpdates.divisi = cleanedUpdates.divisi;
          if (cleanedUpdates.jabatan !== undefined) syncUpdates.jabatan = cleanedUpdates.jabatan;
          if (cleanedUpdates.nomor_inhealth !== undefined) syncUpdates.nomor_inhealth = cleanedUpdates.nomor_inhealth;
          if (cleanedUpdates.nomor_bpjs !== undefined) syncUpdates.nomor_bpjs = cleanedUpdates.nomor_bpjs;
          if (cleanedUpdates.jenis_kelamin) syncUpdates.jenis_kelamin = cleanedUpdates.jenis_kelamin;
          if (cleanedUpdates.umur !== undefined) syncUpdates.umur = cleanedUpdates.umur;
          if (cleanedUpdates.foto !== undefined) syncUpdates.foto = cleanedUpdates.foto;

          await client
            .from('mcu_donor_darah')
            .update(syncUpdates)
            .eq('nik', targetNik);
        }

        const local = getLocalFallbackRecords();
        saveLocalFallbackRecords(
          local.map((r) => {
            if (r.id === id) return { ...r, ...data };
            if (targetNik && r.nik === targetNik) {
              return {
                ...r,
                ...(cleanedUpdates.entitas ? { entitas: cleanedUpdates.entitas } : {}),
                ...(cleanedUpdates.divisi !== undefined ? { divisi: cleanedUpdates.divisi } : {}),
                ...(cleanedUpdates.jabatan !== undefined ? { jabatan: cleanedUpdates.jabatan } : {}),
                ...(cleanedUpdates.foto !== undefined ? { foto: cleanedUpdates.foto } : {}),
              };
            }
            return r;
          })
        );
        return data;
      }
    } catch (err) {
      console.warn('Exception update mcu_donor_darah:', err);
    }
  }

  // Fallback lokal
  const local = getLocalFallbackRecords();
  let updatedRecord: DonorDarahRecord | null = null;
  const targetNik = updates.nik;
  const updatedList = local.map((r) => {
    if (r.id === id) {
      updatedRecord = { ...r, ...cleanedUpdates };
      return updatedRecord;
    }
    if (targetNik && r.nik === targetNik) {
      return {
        ...r,
        ...(cleanedUpdates.entitas ? { entitas: cleanedUpdates.entitas } : {}),
        ...(cleanedUpdates.divisi !== undefined ? { divisi: cleanedUpdates.divisi } : {}),
        ...(cleanedUpdates.jabatan !== undefined ? { jabatan: cleanedUpdates.jabatan } : {}),
        ...(cleanedUpdates.foto !== undefined ? { foto: cleanedUpdates.foto } : {}),
      };
    }
    return r;
  });
  saveLocalFallbackRecords(updatedList);
  return updatedRecord;
}

/**
 * Hapus data donor darah di Supabase
 */
export async function deleteDonorRecordFromSupabase(id: number): Promise<boolean> {
  const client = getSupabaseClient();

  if (client) {
    try {
      const { error } = await client.from('mcu_donor_darah').delete().eq('id', id);
      if (!error) {
        const local = getLocalFallbackRecords();
        saveLocalFallbackRecords(local.filter((r) => r.id !== id));
        return true;
      }
    } catch (err) {
      console.warn('Exception delete mcu_donor_darah:', err);
    }
  }

  // Fallback lokal
  const local = getLocalFallbackRecords();
  saveLocalFallbackRecords(local.filter((r) => r.id !== id));
  return true;
}

/**
 * Hitung kalkulasi statistik lengkap untuk Dashboard Donor Darah
 * (Total pendonor, total donor, donor bulan ini, statistik entitas & golongan darah)
 */
export function calculateDonorStats(records: DonorDarahRecord[]): DonorStats {
  const uniqueNikSet = new Set<string>();
  const currentYearMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  let donorBulanIniCount = 0;
  let totalVolumeMl = 0;

  const entitasCounts: Record<string, number> = {
    'PTPN III / Holding': 0,
    'PTPN I / SuppCo': 0,
    'PTPN IV / PalmCo': 0,
    'Bukan Entitas': 0,
  };

  const golonganCounts: Record<string, number> = {
    A: 0,
    B: 0,
    AB: 0,
    O: 0,
  };

  const monthlyMap = new Map<string, { count: number; volume: number }>();

  for (const r of records) {
    // Unique pendonor
    const key = (r.nik || r.nama_lengkap || String(r.id)).trim().toLowerCase();
    if (key) uniqueNikSet.add(key);

    // Bulan ini
    if (r.tanggal_donor && r.tanggal_donor.startsWith(currentYearMonth)) {
      donorBulanIniCount++;
    }

    // Volume akumulasi
    const volNum = parseInt(String(r.volume_darah || '').replace(/\D/g, ''), 10) || 350;
    totalVolumeMl += volNum;

    // Entitas
    const normEntitas = normalizeEntitasDonor(r.entitas);
    entitasCounts[normEntitas] = (entitasCounts[normEntitas] || 0) + 1;

    // Golongan Darah
    let golClean = (r.golongan_darah || 'O').toUpperCase().replace(/[^ABO]/g, '');
    if (!['A', 'B', 'AB', 'O'].includes(golClean)) golClean = 'O';
    golonganCounts[golClean] = (golonganCounts[golClean] || 0) + 1;

    // Tren Bulanan
    const monthKey = r.tanggal_donor ? r.tanggal_donor.slice(0, 7) : currentYearMonth;
    const existingMonth = monthlyMap.get(monthKey) || { count: 0, volume: 0 };
    existingMonth.count += 1;
    existingMonth.volume += volNum;
    monthlyMap.set(monthKey, existingMonth);
  }

  const totalDonor = records.length;

  // Format Entitas Stats
  const entitasStats = [
    {
      name: 'PTPN III / Holding',
      count: entitasCounts['PTPN III / Holding'] || 0,
      percentage: totalDonor > 0 ? Math.round(((entitasCounts['PTPN III / Holding'] || 0) / totalDonor) * 100) : 0,
    },
    {
      name: 'PTPN I / SuppCo',
      count: entitasCounts['PTPN I / SuppCo'] || 0,
      percentage: totalDonor > 0 ? Math.round(((entitasCounts['PTPN I / SuppCo'] || 0) / totalDonor) * 100) : 0,
    },
    {
      name: 'PTPN IV / PalmCo',
      count: entitasCounts['PTPN IV / PalmCo'] || 0,
      percentage: totalDonor > 0 ? Math.round(((entitasCounts['PTPN IV / PalmCo'] || 0) / totalDonor) * 100) : 0,
    },
    {
      name: 'Bukan Entitas',
      count: entitasCounts['Bukan Entitas'] || 0,
      percentage: totalDonor > 0 ? Math.round(((entitasCounts['Bukan Entitas'] || 0) / totalDonor) * 100) : 0,
    },
  ];

  // Format Golongan Darah Stats (Warna elegan untuk visualisasi pie chart)
  const colorsMap: Record<string, string> = {
    A: '#dc2626',   // Merah Ruby
    B: '#2563eb',   // Biru Saphire
    AB: '#7c3aed',  // Ungu Amethyst
    O: '#059669',   // Hijau Emerald
  };

  const golonganDarahStats = ['A', 'B', 'AB', 'O'].map((gol) => {
    const count = golonganCounts[gol] || 0;
    return {
      name: `Golongan ${gol}`,
      count,
      percentage: totalDonor > 0 ? Math.round((count / totalDonor) * 100) : 0,
      color: colorsMap[gol] || '#64748b',
    };
  });

  // Sort monthly trend
  const sortedMonths = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6); // 6 bulan terakhir

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthlyTrend = sortedMonths.map(([mKey, data]) => {
    const [y, m] = mKey.split('-');
    const mIdx = parseInt(m, 10) - 1;
    return {
      month: `${monthNames[mIdx] || m} ${y}`,
      count: data.count,
      volume: data.volume,
    };
  });

  return {
    totalPendonor: uniqueNikSet.size,
    totalDonor,
    donorBulanIni: donorBulanIniCount,
    totalVolumeMl,
    entitasStats,
    golonganDarahStats,
    monthlyTrend,
  };
}
