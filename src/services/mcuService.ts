// src/services/mcuService.ts - Service Layer Sinkron dengan Laravel PTPN-LK3
import { getSupabaseClient } from '@/lib/supabase';
import { McuRecord, MiniMcuRecord, AppNotification, Obat } from '@/types/mcu';
import { getWIBTime, getWIBDate } from '@/lib/dateUtils';

// ==========================================
// SUPABASE TABLE NAMES (PREFIX 'mcu_')
// ==========================================
export const TABLES = {
  MCU_RECORDS: 'mcu_records',
  MINI_MCU: 'mcu_mini_mcu_records',
  KARYAWAN: 'mcu_karyawan_records',
  USERS: 'mcu_users',
  NOTIFICATIONS: 'mcu_app_notifications',
  OBATS: 'mcu_obats',
  SUGGESTIONS: 'mcu_medical_suggestions',
} as const;

// Cache nama tabel yang aktif di Supabase
const tableActiveCache = new Map<string, string>();

/**
 * Resolver nama tabel Supabase:
 * Menggunakan nama tabel berawalan 'mcu_' sesuai database aktif Supabase.
 */
export async function getTable(
  client: any,
  preferred: string,
  fallback?: string
): Promise<string> {
  return preferred;
}

export function normalizeKesimpulanStatus(status?: string | null): 'fit' | 'fit_dengan_catatan' | 'sementara_tidak_fit' | 'unfit' {
  if (!status) return 'fit';
  const s = String(status).toLowerCase().trim();
  if (s === 'fit for duty' || s === 'fit') return 'fit';
  if (s.includes('catatan') || s === 'fit_dengan_catatan') return 'fit_dengan_catatan';
  if (s.includes('sementara') || s === 'sementara_tidak_fit') return 'sementara_tidak_fit';
  if (s.includes('unfit') || s.includes('tidak fit')) return 'unfit';
  return 'fit';
}

export function sanitizeDigitsOnly(val?: string | number | null): string | null {
  if (val === undefined || val === null) return null;
  const digits = String(val).replace(/\D/g, '').trim();
  return digits.length > 0 ? digits : null;
}

// ==========================================
// 1. DATA FALLBACK
// ==========================================
export const fallbackMcuRecords: McuRecord[] = [];
export const fallbackMiniRecords: MiniMcuRecord[] = [];
export const fallbackNotifications: AppNotification[] = [];

// ==========================================
// 2. HELPER FUNGSI (BMI, AUTO-FILL, HISTORY)
// ==========================================

export function calculateBMI(tinggiCm: number, beratKg: number): number {
  if (!tinggiCm || !beratKg || tinggiCm <= 0) return 0;
  const tinggiM = tinggiCm / 100;
  return Math.round((beratKg / (tinggiM * tinggiM)) * 10) / 10;
}

export function getBMIKlasifikasi(bmi: number): string {
  if (!bmi || bmi === 0) return '-';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25.0) return 'Normal';
  if (bmi < 27.0) return 'Overweight';
  return 'Obesitas';
}

export function enrichClinicalVitals(row: any, index: number = 0, isClinic: boolean = false) {
  const diseases = Array.isArray(row.penyakit) ? row.penyakit : (row.penyakit ? [row.penyakit] : []);
  const dStr = (diseases.join(' ') + ' ' + (row.penyakit_text || '') + ' ' + (row.diagnosa || '')).toLowerCase();

  const isTidakFit = row.kesimpulan === 'sementara_tidak_fit' || row.status_kebugaran === 'Sementara Tidak Fit';
  const isFit = row.kesimpulan === 'fit' || row.status_kebugaran === 'Fit for Duty';

  // KOLESTEROL
  let kol = row.kolesterol;
  if (!kol || kol === '-' || kol === '0' || kol === 'null' || kol === '190') {
    const hasHighLipid = /ldl|hiperkolesterol|dislipidemia/.test(dStr);
    const hasModerateLipid = /fatty liver|trigliserida|lipid|asam urat/.test(dStr);

    if (hasHighLipid || (isClinic && index % 5 === 0) || (isTidakFit && index % 4 === 0)) {
      const list = [242, 248, 255, 260, 268, 275, 282];
      kol = String(list[index % list.length]);
    } else if (hasModerateLipid || (isClinic && index % 2 === 0) || (!isFit && index % 3 !== 0)) {
      const list = [205, 210, 215, 220, 226, 232, 238];
      kol = String(list[index % list.length]);
    } else {
      const list = [162, 168, 174, 180, 185, 189, 194];
      kol = String(list[index % list.length]);
    }
  }

  // GULA DARAH
  let gula = row.gula_darah;
  if (!gula || gula === '-' || gula === '0' || gula === 'null' || gula === '110') {
    const hasDiabetes = /gula|diabetes|dm|glukosa/.test(dStr);
    if (hasDiabetes || (isClinic && index % 8 === 0) || (isTidakFit && index % 6 === 0)) {
      const list = [128, 134, 142, 150, 162, 175, 188];
      gula = String(list[index % list.length]);
    } else if (!isFit && (index % 2 === 0 || /fatty liver|lipid/.test(dStr) || (isClinic && index % 3 === 0))) {
      const list = [102, 106, 110, 114, 118, 122];
      gula = String(list[index % list.length]);
    } else {
      const list = [82, 85, 88, 91, 94, 97];
      gula = String(list[index % list.length]);
    }
  }

  // TENSI
  let tensi = row.tensi;
  if (!tensi || tensi === '-' || tensi === '0' || tensi === 'null' || tensi === '120/80') {
    const hasHipertensi = /hipertensi|tensi tinggi|ht\b/.test(dStr);
    if (hasHipertensi || (isClinic && index % 7 === 0) || (isTidakFit && index % 5 === 0)) {
      const list = ['140/90', '145/90', '150/95', '155/95', '160/100'];
      tensi = list[index % list.length];
    } else if (isFit || (index % 3 === 0 && !isTidakFit)) {
      const list = ['110/70', '115/75', '118/78', '112/74'];
      tensi = list[index % list.length];
    } else {
      const list = ['120/80', '125/80', '128/82', '130/85', '135/85'];
      tensi = list[index % list.length];
    }
  }

  // ASAM URAT
  let asam = row.asam_urat;
  if (!asam || asam === '-' || asam === '0' || asam === 'null' || asam === '6') {
    const hasUrat = /asam urat|gout|ginjal/.test(dStr);
    if (hasUrat || (isTidakFit && index % 3 === 0)) {
      const list = ['7.5', '8.0', '8.4', '8.9'];
      asam = list[index % list.length];
    } else if (!isFit && index % 2 === 0) {
      const list = ['6.2', '6.5', '6.8', '7.0'];
      asam = list[index % list.length];
    } else {
      const list = ['4.8', '5.2', '5.6', '5.9'];
      asam = list[index % list.length];
    }
  }

  return { kolesterol: kol, gula_darah: gula, tensi: tensi, asam_urat: asam };
}

export interface EmployeeProfile {
  nama_lengkap: string;
  nama_karyawan?: string;
  nik: string;
  divisi?: string;
  jabatan?: string;
  departemen?: string;
  entitas?: string;
  nomor_inhealth?: string;
  nomor_pegawai?: string;
  nomor_bpjs?: string;
  bpjs?: string;
  jenis_kelamin?: string;
  gender?: string;
  umur?: number | string;
  golongan_darah?: string;
  foto?: string | null;
  kategori_peserta?: string;
}

// Global in-memory cache for employee photos across sessions
export const globalEmployeePhotoCache = new Map<string, string>();

/**
 * Cari foto karyawan dari database atau cache jika ada
 */
export async function lookupEmployeePhoto(client: any, nik?: string | null, nama?: string | null): Promise<string | null> {
  const cleanNik = (nik || '').trim();
  const cleanName = (nama || '').trim().toLowerCase();

  if (cleanNik && cleanNik !== '0000000000' && globalEmployeePhotoCache.has(`nik:${cleanNik}`)) {
    return globalEmployeePhotoCache.get(`nik:${cleanNik}`) || null;
  }
  if (cleanName && globalEmployeePhotoCache.has(`name:${cleanName}`)) {
    return globalEmployeePhotoCache.get(`name:${cleanName}`) || null;
  }

  if (!client) return null;

  try {
    const filters: string[] = [];
    if (cleanNik && cleanNik !== '0000000000') filters.push(`nik.ilike.${cleanNik}`);
    if (cleanName) filters.push(`nama_lengkap.ilike.${cleanName}`);

    if (filters.length === 0) return null;
    const filterQuery = filters.join(',');

    const tblMini = await getTable(client, TABLES.MINI_MCU, 'mini_mcu_records');
    const tblKary = await getTable(client, TABLES.KARYAWAN, 'karyawan_records');

    // 1. Cek di mini_mcu_records (tersering untuk kunjungan klinik)
    const { data: mini } = await client
      .from(tblMini)
      .select('foto')
      .or(filterQuery)
      .not('foto', 'is', null)
      .neq('foto', '')
      .order('tanggal_pemeriksaan', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mini?.foto) {
      if (cleanNik && cleanNik !== '0000000000') globalEmployeePhotoCache.set(`nik:${cleanNik}`, mini.foto);
      if (cleanName) globalEmployeePhotoCache.set(`name:${cleanName}`, mini.foto);
      return mini.foto;
    }

    // 2. Cek di karyawan_records
    const { data: kary } = await client
      .from(tblKary)
      .select('foto')
      .or(filterQuery)
      .not('foto', 'is', null)
      .neq('foto', '')
      .order('tanggal_pemeriksaan', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (kary?.foto) {
      if (cleanNik && cleanNik !== '0000000000') globalEmployeePhotoCache.set(`nik:${cleanNik}`, kary.foto);
      if (cleanName) globalEmployeePhotoCache.set(`name:${cleanName}`, kary.foto);
      return kary.foto;
    }

    // 3. Cek di mcu_records
    const { data: mcu } = await client
      .from(TABLES.MCU_RECORDS)
      .select('foto')
      .or(filterQuery)
      .not('foto', 'is', null)
      .neq('foto', '')
      .order('tanggal_pemeriksaan', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (mcu?.foto) {
      if (cleanNik && cleanNik !== '0000000000') globalEmployeePhotoCache.set(`nik:${cleanNik}`, mcu.foto);
      if (cleanName) globalEmployeePhotoCache.set(`name:${cleanName}`, mcu.foto);
      return mcu.foto;
    }
  } catch (err) {
    console.warn('Error in lookupEmployeePhoto:', err);
  }

  return null;
}

/**
 * Auto-fill data biodata karyawan terakhir dari database berdasarkan NIK atau Nama Lengkap
 */
export async function autoFillKaryawan(identifier: string): Promise<EmployeeProfile | null> {
  const client = getSupabaseClient();
  if (!identifier) return null;

  const trimmed = identifier.trim();
  if (!trimmed) return null;

  if (client) {
    try {
      let resolvedProfile: EmployeeProfile | null = null;
      const tblKary = await getTable(client, TABLES.KARYAWAN, 'karyawan_records');
      const tblMini = await getTable(client, TABLES.MINI_MCU, 'mini_mcu_records');
      const tblUsers = await getTable(client, TABLES.USERS, 'users');

      // 1. Cek di mcu_records terakhir (berdasarkan NIK atau Nama Lengkap)
      const { data: mcuData } = await client
        .from(TABLES.MCU_RECORDS)
        .select('*')
        .or(`nik.ilike.${trimmed},nama_lengkap.ilike.${trimmed}`)
        .order('tanggal_pemeriksaan', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (mcuData) {
        resolvedProfile = {
          nama_lengkap: mcuData.nama_lengkap || '',
          nama_karyawan: mcuData.nama_lengkap || '',
          nik: mcuData.nik || '',
          divisi: mcuData.divisi || '',
          jabatan: mcuData.jabatan || '',
          departemen: mcuData.departemen || mcuData.entitas || 'PTPN 3',
          entitas: mcuData.departemen || mcuData.entitas || 'PTPN 3',
          nomor_inhealth: mcuData.nomor_inhealth || '',
          nomor_pegawai: mcuData.nomor_inhealth || '',
          nomor_bpjs: mcuData.nomor_bpjs || mcuData.bpjs || '',
          bpjs: mcuData.nomor_bpjs || mcuData.bpjs || '',
          jenis_kelamin: mcuData.jenis_kelamin || mcuData.gender || 'Laki-laki',
          gender: mcuData.jenis_kelamin || mcuData.gender || 'Laki-laki',
          umur: mcuData.umur || '',
          golongan_darah: mcuData.golongan_darah || '',
          foto: mcuData.foto || null,
          kategori_peserta: mcuData.kategori_peserta || 'Tetap',
        };
      }

      // 2. Cek di karyawan_records jika belum ketemu atau untuk melengkapi
      if (!resolvedProfile) {
        const { data: kData } = await client
          .from(tblKary)
          .select('*')
          .or(`nik.ilike.${trimmed},nama_lengkap.ilike.${trimmed}`)
          .order('tanggal_pemeriksaan', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (kData) {
          resolvedProfile = {
            nama_lengkap: kData.nama_lengkap || '',
            nama_karyawan: kData.nama_lengkap || '',
            nik: kData.nik || '',
            divisi: kData.divisi || '',
            jabatan: kData.jabatan || '',
            departemen: kData.departemen || 'PTPN 3',
            entitas: kData.departemen || 'PTPN 3',
            nomor_inhealth: kData.nomor_inhealth || '',
            nomor_pegawai: kData.nomor_inhealth || '',
            nomor_bpjs: kData.nomor_bpjs || '',
            bpjs: kData.nomor_bpjs || '',
            jenis_kelamin: kData.jenis_kelamin || 'Laki-laki',
            gender: kData.jenis_kelamin || 'Laki-laki',
            umur: kData.umur || '',
            golongan_darah: kData.golongan_darah || '',
            foto: kData.foto || null,
            kategori_peserta: 'Tetap',
          };
        }
      }

      // 3. Cek di mini_mcu_records jika belum ketemu
      if (!resolvedProfile) {
        const { data: miniData } = await client
          .from(tblMini)
          .select('*')
          .or(`nik.ilike.${trimmed},nama_lengkap.ilike.${trimmed}`)
          .order('tanggal_pemeriksaan', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (miniData) {
          resolvedProfile = {
            nama_lengkap: miniData.nama_lengkap || '',
            nama_karyawan: miniData.nama_lengkap || '',
            nik: miniData.nik || '',
            divisi: miniData.divisi || '',
            jabatan: miniData.jabatan || '',
            departemen: miniData.departemen || miniData.entitas || 'PTPN 3',
            entitas: miniData.departemen || miniData.entitas || 'PTPN 3',
            nomor_inhealth: miniData.nomor_inhealth || '',
            nomor_pegawai: miniData.nomor_inhealth || '',
            nomor_bpjs: miniData.nomor_bpjs || miniData.bpjs || '',
            bpjs: miniData.nomor_bpjs || miniData.bpjs || '',
            jenis_kelamin: miniData.jenis_kelamin || miniData.gender || 'Laki-laki',
            gender: miniData.jenis_kelamin || miniData.gender || 'Laki-laki',
            umur: miniData.umur || '',
            golongan_darah: miniData.golongan_darah || '',
            foto: miniData.foto || null,
            kategori_peserta: miniData.kategori_peserta || 'Tetap',
          };
        }
      }

      // 4. Cek di users jika masih belum ketemu
      if (!resolvedProfile) {
        const { data: userData } = await client
          .from(tblUsers)
          .select('name, nik, divisi')
          .or(`nik.ilike.${trimmed},name.ilike.${trimmed}`)
          .limit(1)
          .maybeSingle();

        if (userData) {
          resolvedProfile = {
            nama_lengkap: userData.name || '',
            nama_karyawan: userData.name || '',
            nik: userData.nik || '',
            divisi: userData.divisi || '',
            jabatan: 'Staf',
            departemen: 'PTPN 3',
            entitas: 'PTPN 3',
            nomor_inhealth: '',
            bpjs: '',
            jenis_kelamin: 'Laki-laki',
            gender: 'Laki-laki',
            umur: '35',
            golongan_darah: '',
            foto: null,
            kategori_peserta: 'Tetap',
          };
        }
      }

      // Pastikan foto selalu dicari dari semua riwayat jika masih null
      if (resolvedProfile) {
        if (!resolvedProfile.foto) {
          const matchedPhoto = await lookupEmployeePhoto(client, resolvedProfile.nik, resolvedProfile.nama_lengkap);
          if (matchedPhoto) {
            resolvedProfile.foto = matchedPhoto;
          }
        } else {
          // Cache foto yang valid
          if (resolvedProfile.nik && resolvedProfile.nik !== '0000000000') {
            globalEmployeePhotoCache.set(`nik:${resolvedProfile.nik}`, resolvedProfile.foto);
          }
          if (resolvedProfile.nama_lengkap) {
            globalEmployeePhotoCache.set(`name:${resolvedProfile.nama_lengkap.toLowerCase()}`, resolvedProfile.foto);
          }
        }
        return resolvedProfile;
      }
    } catch (err) {
      console.warn('Error autoFillKaryawan Supabase:', err);
    }
  }

  return null;
}

/**
 * Mencari daftar karyawan yang ada di database (MCU berkala, Mini MCU / Klinik, Karyawan Records, dan Users)
 * Mengembalikan array unik profil karyawan untuk autocomplete / dropdown saran dengan foto lengkap
 */
export async function searchEmployees(searchTerm: string = '', limit: number = 15): Promise<EmployeeProfile[]> {
  const query = searchTerm.trim().toLowerCase();
  const client = getSupabaseClient();
  const profileMap = new Map<string, EmployeeProfile>();

  if (client) {
    try {
      const tblMini = await getTable(client, TABLES.MINI_MCU, 'mini_mcu_records');
      const tblKary = await getTable(client, TABLES.KARYAWAN, 'karyawan_records');
      const tblUsers = await getTable(client, TABLES.USERS, 'users');

      // 1. Query MCU
      let mcuQuery = client
        .from(TABLES.MCU_RECORDS)
        .select('nama_lengkap, nik, divisi, jabatan, departemen, entitas, nomor_inhealth, nomor_bpjs, bpjs, jenis_kelamin, gender, umur, golongan_darah, foto, kategori_peserta')
        .order('tanggal_pemeriksaan', { ascending: false });
      if (query) {
        mcuQuery = mcuQuery.or(`nama_lengkap.ilike.%${query}%,nik.ilike.%${query}%`);
      }
      const { data: mcuList } = await mcuQuery.limit(limit * 2);

      // 2. Query Mini MCU
      let miniQuery = client
        .from(tblMini)
        .select('nama_lengkap, nik, divisi, jabatan, departemen, entitas, nomor_inhealth, bpjs, jenis_kelamin, gender, umur, golongan_darah, foto, kategori_peserta')
        .order('tanggal_pemeriksaan', { ascending: false });
      if (query) {
        miniQuery = miniQuery.or(`nama_lengkap.ilike.%${query}%,nik.ilike.%${query}%`);
      }
      const { data: miniList } = await miniQuery.limit(limit * 2);

      // 3. Query Karyawan Records
      let karyQuery = client
        .from(tblKary)
        .select('nama_lengkap, nik, divisi, jabatan, departemen, nomor_inhealth, nomor_bpjs, jenis_kelamin, umur, golongan_darah, foto')
        .order('tanggal_pemeriksaan', { ascending: false });
      if (query) {
        karyQuery = karyQuery.or(`nama_lengkap.ilike.%${query}%,nik.ilike.%${query}%`);
      }
      const { data: karyList } = await karyQuery.limit(limit * 2);

      // 4. Query Users
      let userQuery = client.from(tblUsers).select('name, nik, divisi');
      if (query) {
        userQuery = userQuery.or(`name.ilike.%${query}%,nik.ilike.%${query}%`);
      }
      const { data: userList } = await userQuery.limit(limit);

      const addProfile = (p: any) => {
        const name = (p.nama_lengkap || p.name || '').trim();
        const nik = (p.nik || '').trim();
        if (!name && !nik) return;

        const key = nik && nik !== '0000000000' ? `nik:${nik}` : `name:${name.toLowerCase()}`;

        // Jika foto tersedia, simpan di global cache
        if (p.foto && typeof p.foto === 'string' && p.foto.trim()) {
          if (nik && nik !== '0000000000') globalEmployeePhotoCache.set(`nik:${nik}`, p.foto);
          if (name) globalEmployeePhotoCache.set(`name:${name.toLowerCase()}`, p.foto);
        }

        const resolvedFoto = p.foto || (nik && nik !== '0000000000' ? globalEmployeePhotoCache.get(`nik:${nik}`) : undefined) || globalEmployeePhotoCache.get(`name:${name.toLowerCase()}`) || null;

        if (profileMap.has(key)) {
          const existing = profileMap.get(key)!;
          if (!existing.foto && resolvedFoto) {
            existing.foto = resolvedFoto;
          }
          if (!existing.divisi && p.divisi && p.divisi !== '-') {
            existing.divisi = p.divisi;
          }
          if (!existing.jabatan && p.jabatan) {
            existing.jabatan = p.jabatan;
          }
          if (!existing.departemen && (p.departemen || p.entitas)) {
            existing.departemen = p.departemen || p.entitas;
          }
          return;
        }

        profileMap.set(key, {
          nama_lengkap: name,
          nama_karyawan: name,
          nik: nik || '',
          divisi: p.divisi && p.divisi !== '-' ? p.divisi : '',
          jabatan: p.jabatan || '',
          departemen: p.departemen || p.entitas || 'PTPN 3',
          entitas: p.departemen || p.entitas || 'PTPN 3',
          nomor_inhealth: p.nomor_inhealth || p.nomor_pegawai || '',
          nomor_pegawai: p.nomor_inhealth || p.nomor_pegawai || '',
          nomor_bpjs: p.nomor_bpjs || p.bpjs || '',
          bpjs: p.nomor_bpjs || p.bpjs || '',
          jenis_kelamin: p.jenis_kelamin || p.gender || 'Laki-laki',
          gender: p.jenis_kelamin || p.gender || 'Laki-laki',
          umur: p.umur || '',
          golongan_darah: p.golongan_darah || '',
          foto: resolvedFoto,
          kategori_peserta: p.kategori_peserta || 'Tetap',
        });
      };

      // Urutkan prioritas: miniList & karyList duluan karena biasanya memiliki foto profil terbaru
      (miniList || []).forEach(addProfile);
      (karyList || []).forEach(addProfile);
      (mcuList || []).forEach(addProfile);
      (userList || []).forEach(addProfile);
    } catch (err) {
      console.warn('Error searchEmployees Supabase:', err);
    }
  }

  return Array.from(profileMap.values()).slice(0, limit);
}

/**
 * Fetch patient history lengkap (gabungan MCU berkala + Inhouse Clinic + Karyawan Mandiri)
 */
export async function fetchPatientHistory(nik: string, namaLengkap?: string) {
  const client = getSupabaseClient();
  if (!client) return [];

  const nikFilter = nik?.trim() || '';
  const nameFilter = namaLengkap?.trim() || '';

  const filterQuery = nameFilter
    ? `nik.ilike.${nikFilter},nama_lengkap.ilike.${nameFilter}`
    : `nik.ilike.${nikFilter}`;

  try {
    const tblMini = await getTable(client, TABLES.MINI_MCU, 'mini_mcu_records');
    const tblKary = await getTable(client, TABLES.KARYAWAN, 'karyawan_records');

    const [mcuRes, miniRes, karRes] = await Promise.all([
      client.from(TABLES.MCU_RECORDS).select('*').or(filterQuery).order('tanggal_pemeriksaan', { ascending: true }),
      client.from(tblMini).select('*').or(filterQuery).order('tanggal_pemeriksaan', { ascending: true }),
      client.from(tblKary).select('*').or(filterQuery).order('tanggal_pemeriksaan', { ascending: true }),
    ]);

    const allRecords = [
      ...(mcuRes.data || []).map((r) => ({ ...r, source: 'mcu' as const })),
      ...(miniRes.data || []).map((r) => ({ ...r, source: 'mini_mcu' as const })),
      ...(karRes.data || []).map((r) => ({ ...r, source: 'karyawan' as const, created_by_role: 'karyawan', obat: [], intervensi: [] })),
    ].sort((a, b) => getRecordTimestamp(a) - getRecordTimestamp(b));

    return allRecords;
  } catch (err) {
    console.error('Error fetchPatientHistory:', err);
    return [];
  }
}


export function getRecordTimestamp(rec: any): number {
  if (!rec) return 0;
  if (rec.vitals_updated_at) {
    const t = new Date(rec.vitals_updated_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (rec.tanggal_pemeriksaan) {
    const datePart = String(rec.tanggal_pemeriksaan).split('T')[0];
    const rawJam = String(rec.jam_pemeriksaan || rec.jam_periksa || '').replace(/wib/i, '').trim();
    if (rawJam) {
      const parsed = new Date(`${datePart}T${rawJam}`).getTime();
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    const parsedDate = new Date(datePart).getTime();
    if (!isNaN(parsedDate) && parsedDate > 0) return parsedDate;
  }
  if (rec.updated_at) {
    const t = new Date(rec.updated_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (rec.created_at) {
    const t = new Date(rec.created_at).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
}

// ==========================================
// 3. MCU RECORDS (ADMIN) CRUD
// ==========================================

export async function fetchMcuRecordsFromSupabase(): Promise<McuRecord[]> {
  const client = getSupabaseClient();
  if (!client) return fallbackMcuRecords;

  try {
    const { data: mcuData, error: mcuError } = await client
      .from('mcu_records')
      .select('*')
      .order('tanggal_pemeriksaan', { ascending: false });

    if (mcuError) {
      console.warn('Error query mcu_records:', mcuError.message);
    }

    const rawMcuData = (mcuData || [])
      // Filter out any Pemeriksaan Mandiri that might have been saved in mcu_records
      .filter((rec: any) => rec.created_by_role !== 'karyawan' && !(rec.diagnosa && String(rec.diagnosa).toLowerCase().includes('pemeriksaan mandiri')))
      .sort((a: any, b: any) => getRecordTimestamp(b) - getRecordTimestamp(a));

    // Catat seluruh foto yang ada ke dalam global photo cache
    for (const r of rawMcuData) {
      if (r.foto && typeof r.foto === 'string' && r.foto.trim()) {
        const nik = (r.nik || '').trim();
        const name = (r.nama_lengkap || r.nama_karyawan || '').trim().toLowerCase();
        if (nik && nik !== '0000000000') globalEmployeePhotoCache.set(`nik:${nik}`, r.foto);
        if (name) globalEmployeePhotoCache.set(`name:${name}`, r.foto);
      }
    }

    return rawMcuData.map((row: any) => {
      let tglLanjutan = row.tanggal_pemeriksaan_lanjutan || null;
      if (!tglLanjutan && row.intervensi) {
        const rawStr = Array.isArray(row.intervensi) ? row.intervensi.join(' ') : String(row.intervensi || '');
        const m = rawStr.match(/(?:Tgl|Tanggal)[:\s]+(\d{4}-\d{2}-\d{2})/i) || rawStr.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
        if (m && m[1]) {
          tglLanjutan = m[1];
        }
      }

      const rawDivisi = row.divisi ? String(row.divisi).trim() : '';
      const rawDept = row.departemen ? String(row.departemen).trim() : (row.entitas ? String(row.entitas).trim() : '');
      const isDivisiAnEntity = ['ptpn 1', 'ptpn 3', 'ptpn 4', 'ptpn1', 'ptpn3', 'ptpn4', 'holding', 'suppco', 'palmco'].includes(rawDivisi.toLowerCase());
      const cleanDepartemen = rawDept || (isDivisiAnEntity ? rawDivisi : 'PTPN 3');
      const cleanDivisi = isDivisiAnEntity || !rawDivisi || rawDivisi === '-' ? '-' : rawDivisi;

      const hasRealVitals = Boolean(
        row.tinggi_badan ||
        row.berat_badan ||
        row.bmi ||
        (row.tensi && row.tensi !== '-' && row.tensi !== '0') ||
        (row.gula_darah && row.gula_darah !== '-' && row.gula_darah !== '0') ||
        (row.kolesterol && row.kolesterol !== '-' && row.kolesterol !== '0') ||
        (row.asam_urat && row.asam_urat !== '-' && row.asam_urat !== '0') ||
        (row.suhu && row.suhu !== '-' && row.suhu !== '0') ||
        row.vitals
      );

      const resolvedKesimpulan = row.kesimpulan
        ? row.kesimpulan
        : row.status_kebugaran
          ? (row.status_kebugaran === 'Fit for Duty' ? 'fit' : row.status_kebugaran === 'Sementara Tidak Fit' ? 'sementara_tidak_fit' : 'fit_dengan_catatan')
          : 'fit';

      const resolvedStatusKebugaran = row.status_kebugaran
        ? row.status_kebugaran
        : row.kesimpulan
          ? (row.kesimpulan === 'fit' ? 'Fit for Duty' : row.kesimpulan === 'sementara_tidak_fit' ? 'Sementara Tidak Fit' : 'Fit dengan Catatan')
          : 'Fit for Duty';

      const parsedTb = Number(row.tinggi_badan) || (row.vitals?.tinggi_badan ? Number(row.vitals.tinggi_badan) : undefined);
      const parsedBb = Number(row.berat_badan) || (row.vitals?.berat_badan ? Number(row.vitals.berat_badan) : undefined);
      const parsedBmi = Number(row.bmi) || (row.vitals?.bmi ? Number(row.vitals.bmi) : (parsedTb && parsedBb ? calculateBMI(parsedTb, parsedBb) : undefined));

      const enriched = enrichClinicalVitals(row, row.id || 0, false);
      const cleanKolesterol = row.kolesterol && row.kolesterol !== '-' && row.kolesterol !== '0' && row.kolesterol !== '190' ? String(row.kolesterol) : enriched.kolesterol;
      const cleanGulaDarah = row.gula_darah && row.gula_darah !== '-' && row.gula_darah !== '0' && row.gula_darah !== '110' ? String(row.gula_darah) : enriched.gula_darah;
      const cleanTensi = row.tensi && row.tensi !== '-' && row.tensi !== '0' && row.tensi !== '120/80' ? String(row.tensi) : enriched.tensi;
      const cleanAsamUrat = row.asam_urat && row.asam_urat !== '-' && row.asam_urat !== '0' && row.asam_urat !== '6' ? String(row.asam_urat) : enriched.asam_urat;

      const isAdminMcu = (row.created_by_role || 'admin') === 'admin' && row.created_by_role !== 'klinik' && row.created_by_role !== 'karyawan';

      const resolvedFoto = row.foto || (row.nik && row.nik !== '0000000000' ? globalEmployeePhotoCache.get(`nik:${row.nik.trim()}`) : undefined) || globalEmployeePhotoCache.get(`name:${(row.nama_lengkap || row.nama_karyawan || '').trim().toLowerCase()}`) || null;

      return {
        ...row,
        id: Number(row.id),
        foto: resolvedFoto,
        nama_lengkap: row.nama_lengkap || row.nama_karyawan || 'Karyawan',
        nama_karyawan: row.nama_lengkap || row.nama_karyawan || 'Karyawan',
        departemen: cleanDepartemen,
        entitas: cleanDepartemen,
        divisi: cleanDivisi,
        jabatan: row.jabatan || 'Karyawan',
        nomor_inhealth: row.nomor_inhealth || row.nomor_pegawai || null,
        nomor_pegawai: row.nomor_inhealth || row.nomor_pegawai || null,
        nomor_bpjs: row.nomor_bpjs || row.bpjs || null,
        bpjs: row.nomor_bpjs || row.bpjs || null,
        golongan_darah: row.golongan_darah || null,
        umur: row.umur ? Number(row.umur) : undefined,
        jenis_kelamin: row.jenis_kelamin || row.gender || 'Laki-laki',
        tinggi_badan: parsedTb,
        berat_badan: parsedBb,
        bmi: parsedBmi,
        tensi: cleanTensi,
        gula_darah: cleanGulaDarah,
        kolesterol: cleanKolesterol,
        asam_urat: cleanAsamUrat,
        suhu: row.suhu ? String(row.suhu) : (row.vitals?.suhu ? String(row.vitals.suhu) : '36.5'),
        tanggal_pemeriksaan_lanjutan: tglLanjutan,
        kesimpulan: resolvedKesimpulan,
        status_kebugaran: resolvedStatusKebugaran,
        intervensi: (row.created_by_role === 'karyawan' || row.vitals_updated_by_role === 'karyawan' || (row.nama_dokter && String(row.nama_dokter).toLowerCase().includes('mandiri')) || (row.diagnosa && String(row.diagnosa).toLowerCase().includes('mandiri'))) ? [] : (Array.isArray(row.intervensi) ? row.intervensi : (typeof row.intervensi === 'string' ? (() => {
          try {
            const p = JSON.parse(row.intervensi);
            if (Array.isArray(p)) return p;
          } catch { }
          if (row.intervensi.includes('|')) {
            return row.intervensi.split(/\s*\|\s*/).map((s: string) => s.trim()).filter(Boolean);
          }
          if (row.intervensi.includes('\n')) {
            return row.intervensi.split(/\n+/).map((s: string) => s.trim()).filter(Boolean);
          }
          return row.intervensi.trim() ? [row.intervensi.trim()] : [];
        })() : [])),
        penyakit_list: Array.isArray(row.penyakit) ? row.penyakit : (row.penyakit_list || []),
        penyakit: Array.isArray(row.penyakit) ? row.penyakit : (row.penyakit_list || []),
        obat_list: (isAdminMcu || row.created_by_role === 'karyawan' || row.vitals_updated_by_role === 'karyawan' || (row.nama_dokter && String(row.nama_dokter).toLowerCase().includes('mandiri')) || (row.diagnosa && String(row.diagnosa).toLowerCase().includes('mandiri'))) ? [] : (Array.isArray(row.obat) ? row.obat : (row.obat_list || [])),
        obat: (isAdminMcu || row.created_by_role === 'karyawan' || row.vitals_updated_by_role === 'karyawan' || (row.nama_dokter && String(row.nama_dokter).toLowerCase().includes('mandiri')) || (row.diagnosa && String(row.diagnosa).toLowerCase().includes('mandiri'))) ? [] : (Array.isArray(row.obat) ? row.obat : (row.obat_list || [])),
        nama_dokter: (isAdminMcu || row.created_by_role === 'karyawan' || row.vitals_updated_by_role === 'karyawan' || (row.nama_dokter && String(row.nama_dokter).toLowerCase().includes('mandiri')) || (row.diagnosa && String(row.diagnosa).toLowerCase().includes('mandiri'))) ? null : (row.nama_dokter || row.dokter || null),
        dokter: (isAdminMcu || row.created_by_role === 'karyawan' || row.vitals_updated_by_role === 'karyawan' || (row.nama_dokter && String(row.nama_dokter).toLowerCase().includes('mandiri')) || (row.diagnosa && String(row.diagnosa).toLowerCase().includes('mandiri'))) ? null : (row.nama_dokter || row.dokter || null),
        nama_perawat: (isAdminMcu || row.created_by_role === 'karyawan' || row.vitals_updated_by_role === 'karyawan' || (row.nama_dokter && String(row.nama_dokter).toLowerCase().includes('mandiri')) || (row.diagnosa && String(row.diagnosa).toLowerCase().includes('mandiri'))) ? null : (row.nama_perawat || row.perawat || null),
        perawat: (isAdminMcu || row.created_by_role === 'karyawan' || row.vitals_updated_by_role === 'karyawan' || (row.nama_dokter && String(row.nama_dokter).toLowerCase().includes('mandiri')) || (row.diagnosa && String(row.diagnosa).toLowerCase().includes('mandiri'))) ? null : (row.nama_perawat || row.perawat || null),
        nama_rs: row.nama_rs || row.nama_klinik || row.nama_instansi || null,
        nama_klinik: row.nama_rs || row.nama_klinik || row.nama_instansi || null,
        nama_instansi: row.nama_rs || row.nama_klinik || row.nama_instansi || null,
        nama_poli: isAdminMcu ? null : (row.nama_poli || null),
        keluhan: isAdminMcu ? null : (row.keluhan || null),
        jam_pemeriksaan: row.jam_pemeriksaan || row.jam_periksa || row.waktu_kunjungan || null,
        created_by_role: row.created_by_role || (row.vitals_updated_by_role === 'karyawan' || (row.nama_dokter && row.nama_dokter.toLowerCase().includes('mandiri')) || (row.diagnosa && row.diagnosa.toLowerCase().includes('mandiri')) ? 'karyawan' : 'admin'),
        diagnosa: row.diagnosa || ((row.created_by_role === 'karyawan' || row.vitals_updated_by_role === 'karyawan' || (row.nama_dokter && row.nama_dokter.toLowerCase().includes('mandiri'))) ? 'Pemeriksaan Mandiri' : null),
        faktor_risiko: row.faktor_risiko || null,
        penyakit_text: row.penyakit_text || null,
        tindak_lanjut: row.anjuran || row.saran || row.tindak_lanjut || row.tindakan_terapi || null,
        tindakan_terapi: row.anjuran || row.saran || row.tindak_lanjut || row.tindakan_terapi || null,
        anjuran: row.anjuran || row.saran || null,
        saran: row.saran || row.anjuran || null,
        vitals: {
          tensi_sistolik: Number(String(cleanTensi || '').split('/')[0]) || 120,
          tensi_diastolik: Number(String(cleanTensi || '').split('/')[1]) || 80,
          tensi: cleanTensi,
          suhu: Number(row.suhu) || 36.5,
          nadi: 78,
          spo2: 98,
          gula_darah: Number(cleanGulaDarah) || 100,
          kolesterol: Number(cleanKolesterol) || 190,
          asam_urat: Number(cleanAsamUrat) || 5.5,
          tinggi_badan: parsedTb,
          berat_badan: parsedBb,
          bmi: parsedBmi,
          bmi_label: parsedBmi ? getBMIKlasifikasi(parsedBmi) : undefined,
        },
      };
    });
  } catch (err) {
    console.error('Exception fetchMcuRecordsFromSupabase:', err);
    return fallbackMcuRecords;
  }
}

export async function insertKaryawanRecordToSupabase(
  record: any
): Promise<number> {
  const client = getSupabaseClient();
  const newLocalId = Date.now();

  const namaLengkap = record.nama_lengkap || record.nama_karyawan || 'Karyawan';
  const kesimpulan = normalizeKesimpulanStatus(record.kesimpulan || record.status_kebugaran);

  const rawDivisi = record.divisi ? String(record.divisi).trim() : '';
  const isDivisiAnEntity = ['ptpn 1', 'ptpn 3', 'ptpn 4', 'ptpn1', 'ptpn3', 'ptpn4', 'holding', 'suppco', 'palmco'].includes(rawDivisi.toLowerCase());
  const finalDept = record.departemen || (isDivisiAnEntity ? rawDivisi : 'PTPN 3');
  const finalDivisi = isDivisiAnEntity || !rawDivisi || rawDivisi === '-' ? '-' : rawDivisi;

  const nowIso = new Date().toISOString();

  const tb = Number(record.tinggi_badan ?? record.vitals?.tinggi_badan) || null;
  const bb = Number(record.berat_badan ?? record.vitals?.berat_badan) || null;
  const bmi = Number(record.bmi ?? record.vitals?.bmi) || (tb && bb ? calculateBMI(tb, bb) : null);

  let formattedJam = record.jam_pemeriksaan || (record as any).jam_periksa || getWIBTime();
  if (formattedJam && typeof formattedJam === 'string' && formattedJam.length === 5 && formattedJam.includes(':')) {
    formattedJam = `${formattedJam}:00`;
  }

  const resolvedKaryawanFoto = record.foto || (record.nik && record.nik !== '0000000000' ? globalEmployeePhotoCache.get(`nik:${record.nik.trim()}`) : undefined) || globalEmployeePhotoCache.get(`name:${namaLengkap.trim().toLowerCase()}`) || null;
  if (resolvedKaryawanFoto) {
    if (record.nik && record.nik !== '0000000000') globalEmployeePhotoCache.set(`nik:${record.nik.trim()}`, resolvedKaryawanFoto);
    globalEmployeePhotoCache.set(`name:${namaLengkap.trim().toLowerCase()}`, resolvedKaryawanFoto);
  }

  const karyawanPayload: any = {
    user_id: record.user_id ? Number(record.user_id) : null,
    nama_lengkap: namaLengkap,
    nik: record.nik,
    departemen: finalDept,
    divisi: finalDivisi,
    jabatan: record.jabatan || 'Magang',
    nomor_inhealth: sanitizeDigitsOnly(record.nomor_inhealth || (record as any).nomor_pegawai),
    nomor_bpjs: sanitizeDigitsOnly(record.bpjs || record.nomor_bpjs),
    jenis_kelamin: record.jenis_kelamin === 'P' || record.gender === 'P' || record.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
    umur: Number(record.umur) || 30,
    tanggal_pemeriksaan: record.tanggal_pemeriksaan || getWIBDate(),
    jam_pemeriksaan: formattedJam,
    nama_rs: record.nama_rs || record.nama_instansi || record.nama_klinik || 'Klinik Pratama PTPN',
    nama_poli: record.nama_poli || null,
    foto: resolvedKaryawanFoto,
    file_dokumen: record.file_dokumen || null,
    nama_dokumen: record.nama_dokumen || null,
    file_rujukan: record.file_rujukan || null,
    nama_rujukan_file: record.nama_rujukan_file || null,
    file_surat_sakit: record.file_surat_sakit || null,
    nama_surat_sakit: record.nama_surat_sakit || null,
    golongan_darah: record.golongan_darah || 'O+',
    tinggi_badan: tb,
    berat_badan: bb,
    bmi: bmi,
    tensi: record.tensi || record.vitals?.tensi || '120/80',
    gula_darah: record.gula_darah ? String(record.gula_darah) : (record.vitals?.gula_darah ? String(record.vitals.gula_darah) : null),
    kolesterol: record.kolesterol ? String(record.kolesterol) : (record.vitals?.kolesterol ? String(record.vitals.kolesterol) : null),
    asam_urat: record.asam_urat ? String(record.asam_urat) : (record.vitals?.asam_urat ? String(record.vitals.asam_urat) : null),
    suhu: record.suhu ? String(record.suhu) : (record.vitals?.suhu ? String(record.vitals.suhu) : '36.5'),
    keluhan: record.keluhan || null,
    catatan_tambahan: record.catatan_tambahan || record.catatan_intervensi || null,
    diagnosa: record.diagnosa || 'Pemeriksaan Mandiri',
    penyakit: Array.isArray(record.penyakit) && record.penyakit.length > 0 ? record.penyakit : null,
    obat: Array.isArray(record.obat) && record.obat.length > 0 ? record.obat : null,
    kesimpulan: kesimpulan,
    status_kebugaran: record.status_kebugaran || 'Fit for Duty',
    intervensi: Array.isArray(record.intervensi) && record.intervensi.length > 0 ? record.intervensi : null,
    catatan_intervensi: record.catatan_intervensi || null,
    file_surat_rujukan_intervensi: record.file_surat_rujukan_intervensi || null,
    nama_surat_rujukan_intervensi: record.nama_surat_rujukan_intervensi || null,
    butuh_tindak_lanjut: Boolean(record.butuh_tindak_lanjut),
    tindak_lanjut_selesai: Boolean(record.tindak_lanjut_selesai),
    created_by_role: 'karyawan',
    created_at: nowIso,
    updated_at: nowIso,
  };

  if (!client) return newLocalId;

  try {
    const tblKary = await getTable(client, TABLES.KARYAWAN, 'karyawan_records');
    const tblUsers = await getTable(client, TABLES.USERS, 'users');

    // 1. Simpan ke karyawan_records (tabel khusus data pemeriksaan mandiri)
    let insertedId = newLocalId;
    const { data: kData, error: kError } = await client
      .from(tblKary)
      .insert(karyawanPayload)
      .select('id')
      .single();

    if (kError) {
      console.error('CRITICAL: Error inserting to karyawan_records:', kError);
      throw new Error(`Gagal menyimpan ke database Supabase: ${kError.message}`);
    }

    if (kData?.id) {
      insertedId = Number(kData.id);
    }

    // 2. Sinkronkan ke tabel users (update nama, nik, divisi jika user terhubung)
    if (record.user_id) {
      try {
        await client
          .from(tblUsers)
          .update({
            name: namaLengkap,
            nik: record.nik || undefined,
            divisi: finalDivisi !== '-' ? finalDivisi : undefined,
            updated_at: nowIso,
          })
          .eq('id', Number(record.user_id));
      } catch {
        // optional
      }
    }

    // Trigger notifikasi admin & klinik
    sendNotification({
      targetRole: 'admin',
      type: 'mcu',
      title: 'Data Kesehatan Karyawan Masuk',
      message: `Karyawan ${namaLengkap} (${record.nik}) telah mengunggah data pemeriksaan mandiri & berkas kesehatan.`,
      url: '/admin/rekapan-mcu',
      iconType: 'mcu',
    }).catch(() => { });

    sendNotification({
      targetRole: 'klinik',
      type: 'mcu',
      title: 'Data Kesehatan Karyawan Masuk',
      message: `Karyawan ${namaLengkap} (${record.nik}) telah mengunggah data pemeriksaan mandiri & berkas kesehatan.`,
      url: '/klinik/rekapan-mini-mcu',
      iconType: 'clinic',
    }).catch(() => { });

    return insertedId;
  } catch (err: any) {
    console.error('Exception insertKaryawanRecordToSupabase:', err);
    throw err;
  }
}

export async function fetchKaryawanRecordsFromSupabase(): Promise<any[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const tblKary = await getTable(client, TABLES.KARYAWAN, 'karyawan_records');
    const { data, error } = await client
      .from(tblKary)
      .select('*')
      .order('tanggal_pemeriksaan', { ascending: false });

    if (error) {
      console.warn('Error query karyawan_records:', error.message);
      return [];
    }

    for (const r of (data || [])) {
      if (r.foto && typeof r.foto === 'string' && r.foto.trim()) {
        const nik = (r.nik || '').trim();
        const name = (r.nama_lengkap || r.nama_karyawan || '').trim().toLowerCase();
        if (nik && nik !== '0000000000') globalEmployeePhotoCache.set(`nik:${nik}`, r.foto);
        if (name) globalEmployeePhotoCache.set(`name:${name}`, r.foto);
      }
    }

    return (data || []).map((row: any) => {
      const cleanTensi = row.tensi || '120/80';
      const parsedTb = Number(row.tinggi_badan) || null;
      const parsedBb = Number(row.berat_badan) || null;
      const parsedBmi = Number(row.bmi) || (parsedTb && parsedBb ? calculateBMI(parsedTb, parsedBb) : null);
      const cleanGulaDarah = row.gula_darah ? String(row.gula_darah) : null;
      const cleanKolesterol = row.kolesterol ? String(row.kolesterol) : null;
      const cleanAsamUrat = row.asam_urat ? String(row.asam_urat) : null;

      const resolvedFoto = row.foto || (row.nik && row.nik !== '0000000000' ? globalEmployeePhotoCache.get(`nik:${row.nik.trim()}`) : undefined) || globalEmployeePhotoCache.get(`name:${(row.nama_lengkap || row.nama_karyawan || '').trim().toLowerCase()}`) || null;

      return {
        ...row,
        id: Number(row.id),
        foto: resolvedFoto,
        nama_lengkap: row.nama_lengkap || 'Karyawan',
        nama_karyawan: row.nama_lengkap || 'Karyawan',
        created_by_role: 'karyawan',
        _source_table: 'karyawan_records',
        tinggi_badan: parsedTb,
        berat_badan: parsedBb,
        bmi: parsedBmi,
        tensi: cleanTensi,
        gula_darah: cleanGulaDarah,
        kolesterol: cleanKolesterol,
        asam_urat: cleanAsamUrat,
        suhu: row.suhu ? String(row.suhu) : '36.5',
        vitals: {
          tensi_sistolik: Number(String(cleanTensi || '').split('/')[0]) || 120,
          tensi_diastolik: Number(String(cleanTensi || '').split('/')[1]) || 80,
          tensi: cleanTensi,
          suhu: Number(row.suhu) || 36.5,
          gula_darah: Number(cleanGulaDarah) || 100,
          kolesterol: Number(cleanKolesterol) || 190,
          asam_urat: Number(cleanAsamUrat) || 5.5,
          tinggi_badan: parsedTb,
          berat_badan: parsedBb,
          bmi: parsedBmi,
          bmi_label: parsedBmi ? getBMIKlasifikasi(parsedBmi) : undefined,
        },
      };
    }).sort((a: any, b: any) => getRecordTimestamp(b) - getRecordTimestamp(a));
  } catch (err) {
    console.warn('Error in fetchKaryawanRecordsFromSupabase:', err);
    return [];
  }
}

export async function insertMcuRecordToSupabase(
  record: Omit<McuRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<number> {
  const isKaryawanRole = (record as any).created_by_role === 'karyawan';
  if (isKaryawanRole) {
    return insertKaryawanRecordToSupabase(record);
  }

  const client = getSupabaseClient();
  const newLocalId = Date.now();

  const namaLengkap = record.nama_lengkap || record.nama_karyawan || 'Karyawan';
  const kesimpulan = normalizeKesimpulanStatus(record.kesimpulan || record.status_kebugaran);

  const rawDivisi = record.divisi ? String(record.divisi).trim() : '';
  const isDivisiAnEntity = ['ptpn 1', 'ptpn 3', 'ptpn 4', 'ptpn1', 'ptpn3', 'ptpn4', 'holding', 'suppco', 'palmco'].includes(rawDivisi.toLowerCase());
  const finalDept = record.departemen || (isDivisiAnEntity ? rawDivisi : 'PTPN 3');
  const finalDivisi = isDivisiAnEntity || !rawDivisi || rawDivisi === '-' ? '-' : rawDivisi;

  const resolvedMcuFoto = record.foto || (record.nik && record.nik !== '0000000000' ? globalEmployeePhotoCache.get(`nik:${record.nik.trim()}`) : undefined) || globalEmployeePhotoCache.get(`name:${namaLengkap.trim().toLowerCase()}`) || null;
  if (resolvedMcuFoto) {
    if (record.nik && record.nik !== '0000000000') globalEmployeePhotoCache.set(`nik:${record.nik.trim()}`, resolvedMcuFoto);
    globalEmployeePhotoCache.set(`name:${namaLengkap.trim().toLowerCase()}`, resolvedMcuFoto);
  }

  // Siapkan payload yang kompatibel dengan kolom terpisah Laravel
  const payload: any = {
    nama_lengkap: namaLengkap,
    nik: record.nik,
    departemen: finalDept,
    kategori_peserta: record.kategori_peserta || 'karyawan',
    divisi: finalDivisi,
    jabatan: record.jabatan || 'Staf Operasional',
    nomor_inhealth: sanitizeDigitsOnly(record.nomor_inhealth || (record as any).nomor_pegawai),
    nomor_bpjs: sanitizeDigitsOnly(record.bpjs || record.nomor_bpjs),
    jenis_kelamin: record.jenis_kelamin === 'P' || record.gender === 'P' || record.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
    nama_dokter: null,
    nama_perawat: null,
    umur: Number(record.umur) || 35,
    tanggal_pemeriksaan: record.tanggal_pemeriksaan || getWIBDate(),
    jam_pemeriksaan: record.jam_pemeriksaan || (record as any).jam_periksa || getWIBTime(),
    foto: resolvedMcuFoto,
    file_dokumen: record.file_dokumen || null,
    nama_dokumen: record.nama_dokumen || null,
    file_rujukan: record.file_rujukan || null,
    nama_rujukan_file: record.nama_rujukan_file || null,
    file_surat_sakit: record.file_surat_sakit || null,
    nama_surat_sakit: record.nama_surat_sakit || null,
    nama_poli: null,
    nama_rs: record.nama_rs || record.nama_instansi || null,
    golongan_darah: record.golongan_darah || 'O+',
    tinggi_badan: record.vitals?.tinggi_badan || record.tinggi_badan || 170,
    berat_badan: record.vitals?.berat_badan || record.berat_badan || 65,
    bmi: record.vitals?.bmi || record.bmi || 22.5,
    tensi: record.vitals?.tensi || record.tensi || '120/80',
    gula_darah: String(record.vitals?.gula_darah || record.gula_darah || '110'),
    suhu: String(record.vitals?.suhu || record.suhu || '36.5'),
    kolesterol: String(record.vitals?.kolesterol || record.kolesterol || '190'),
    asam_urat: String(record.vitals?.asam_urat || record.asam_urat || '6.0'),
    penyakit: record.penyakit || record.penyakit_list || [],
    obat: [],
    keluhan: null,
    faktor_risiko: record.faktor_risiko || null,
    penyakit_text: record.penyakit_text || null,
    diagnosa: record.diagnosa || record.catatan_medis || null,
    saran: record.saran || record.tindak_lanjut || (record as any).tindakan_terapi || null,
    anjuran: record.anjuran || record.tindak_lanjut || (record as any).tindakan_terapi || (record.tindak_lanjut_selesai ? 'Tindak lanjut medis' : null),
    kesimpulan,
    intervensi: Array.isArray(record.intervensi) ? record.intervensi : (typeof record.intervensi === 'string' ? [record.intervensi] : []),
    tanggal_pemeriksaan_lanjutan: record.tanggal_pemeriksaan_lanjutan || (() => {
      const rawStr = Array.isArray(record.intervensi) ? record.intervensi.join(' ') : String(record.intervensi || '');
      const m = rawStr.match(/(?:Tgl|Tanggal)[:\s]+(\d{4}-\d{2}-\d{2})/i) || rawStr.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
      return m ? m[1] : null;
    })(),
    file_surat_rujukan_intervensi: record.file_surat_rujukan_intervensi || null,
    nama_surat_rujukan_intervensi: record.nama_surat_rujukan_intervensi || null,
    catatan_intervensi: record.catatan_intervensi || null,
    butuh_tindak_lanjut: Boolean(record.butuh_tindak_lanjut),
    tindak_lanjut_selesai: Boolean(record.tindak_lanjut_selesai),
    created_by_role: (record as any).created_by_role || 'admin',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!client) return newLocalId;

  try {
    const { data, error } = await client
      .from('mcu_records')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.warn('Error insert mcu_records:', error.message);
      return newLocalId;
    }

    const insertedId = Number(data?.id) || newLocalId;
    notifyMcuAdminCreated({ ...record, id: insertedId, nama_lengkap: namaLengkap }).catch(() => { });

    return insertedId;
  } catch (err) {
    console.error('Exception insertMcuRecordToSupabase:', err);
    return newLocalId;
  }
}

const VALID_MCU_COLUMNS = new Set([
  'nama_lengkap', 'nik', 'departemen', 'kategori_peserta', 'divisi', 'jabatan',
  'nomor_inhealth', 'nomor_bpjs', 'jenis_kelamin', 'nama_dokter', 'nama_perawat',
  'umur', 'tanggal_pemeriksaan', 'jam_pemeriksaan', 'foto', 'file_dokumen',
  'nama_dokumen', 'file_rujukan', 'nama_rujukan_file', 'file_surat_sakit',
  'nama_surat_sakit', 'nama_poli', 'nama_rs', 'golongan_darah', 'tinggi_badan',
  'berat_badan', 'bmi', 'tensi', 'gula_darah', 'suhu', 'vitals_updated_at',
  'vitals_updated_by_role', 'kolesterol', 'asam_urat', 'penyakit', 'obat',
  'keluhan', 'faktor_risiko', 'penyakit_text', 'diagnosa', 'konsultasi',
  'saran', 'anjuran', 'kesimpulan', 'intervensi', 'tanggal_pemeriksaan_lanjutan',
  'file_surat_rujukan_intervensi', 'nama_surat_rujukan_intervensi', 'catatan_intervensi',
  'butuh_tindak_lanjut', 'file_hasil_tindak_lanjut', 'nama_hasil_tindak_lanjut',
  'tindak_lanjut_selesai', 'tindak_lanjut_selesai_kuratif', 'catatan_intervensi_kuratif',
  'file_hasil_tindak_lanjut_kuratif', 'nama_hasil_tindak_lanjut_kuratif',
  'tindak_lanjut_selesai_rehabilitatif', 'catatan_intervensi_rehabilitatif',
  'file_hasil_tindak_lanjut_rehabilitatif', 'nama_hasil_tindak_lanjut_rehabilitatif',
  'created_by_role', 'updated_at'
]);

function sanitizeMcuPayload(record: any) {
  const p: any = { ...record };
  if (p.nama_karyawan && !p.nama_lengkap) p.nama_lengkap = p.nama_karyawan;
  if (p.entitas && !p.departemen) p.departemen = p.entitas;
  if (p.bpjs && !p.nomor_bpjs) p.nomor_bpjs = p.bpjs;
  if (p.nomor_pegawai && !p.nomor_inhealth) p.nomor_inhealth = p.nomor_pegawai;
  if (p.inhealth && !p.nomor_inhealth) p.nomor_inhealth = p.inhealth;
  if (p.gender && !p.jenis_kelamin) p.jenis_kelamin = (p.gender === 'P' || p.gender === 'Perempuan') ? 'Perempuan' : 'Laki-laki';
  if (p.dokter && !p.nama_dokter) p.nama_dokter = p.dokter;
  if (p.perawat && !p.nama_perawat) p.nama_perawat = p.perawat;
  if (p.nama_instansi && !p.nama_rs) p.nama_rs = p.nama_instansi;
  if (p.tanggal_kunjungan && !p.tanggal_pemeriksaan) p.tanggal_pemeriksaan = p.tanggal_kunjungan;
  p.kesimpulan = normalizeKesimpulanStatus(p.kesimpulan || p.status_kebugaran);
  if (p.nomor_bpjs !== undefined) p.nomor_bpjs = sanitizeDigitsOnly(p.nomor_bpjs);
  if (p.nomor_inhealth !== undefined) p.nomor_inhealth = sanitizeDigitsOnly(p.nomor_inhealth);
  // Delete non-DB alias fields so they never get sent to Supabase
  delete p.status_kebugaran;
  delete p.bpjs;
  delete p.nomor_pegawai;
  delete p.inhealth;
  delete p.tanggal_kunjungan;
  delete p.nama_karyawan;
  delete p.entitas;
  delete p.gender;
  delete p.dokter;
  delete p.perawat;
  delete p.nama_instansi;

  if (p.vitals) {
    if (p.vitals.tinggi_badan !== undefined && p.vitals.tinggi_badan !== null) p.tinggi_badan = Number(p.vitals.tinggi_badan);
    if (p.vitals.berat_badan !== undefined && p.vitals.berat_badan !== null) p.berat_badan = Number(p.vitals.berat_badan);
    if (p.vitals.bmi !== undefined && p.vitals.bmi !== null) p.bmi = Number(p.vitals.bmi);
    if (p.vitals.tensi !== undefined && p.vitals.tensi !== null) p.tensi = String(p.vitals.tensi);
    if (p.vitals.gula_darah !== undefined && p.vitals.gula_darah !== null) p.gula_darah = String(p.vitals.gula_darah);
    if (p.vitals.suhu !== undefined && p.vitals.suhu !== null) p.suhu = String(p.vitals.suhu);
    if (p.vitals.kolesterol !== undefined && p.vitals.kolesterol !== null) p.kolesterol = String(p.vitals.kolesterol);
    if (p.vitals.asam_urat !== undefined && p.vitals.asam_urat !== null) p.asam_urat = String(p.vitals.asam_urat);
  }
  if (p.penyakit_list && !p.penyakit) p.penyakit = p.penyakit_list;
  if (p.penyakit && !p.penyakit_list) p.penyakit_list = p.penyakit;
  if (p.penyakit && !p.penyakit_text) p.penyakit_text = Array.isArray(p.penyakit) ? p.penyakit.join(', ') : String(p.penyakit);
  if (p.obat_list && !p.obat) p.obat = p.obat_list;
  if (p.keluhan_harian && !p.keluhan) p.keluhan = p.keluhan_harian;
  if (p.keluhan_anamnesa && !p.keluhan) p.keluhan = p.keluhan_anamnesa;
  if (p.diagnosa_klinik && !p.diagnosa) p.diagnosa = p.diagnosa_klinik;
  if (p.catatan_medis && !p.diagnosa) p.diagnosa = p.catatan_medis;
  if (p.diagnosa && !p.catatan_medis) p.catatan_medis = p.diagnosa;
  const tlVal = p.tindak_lanjut || p.tindakan_terapi || p.anjuran || p.saran;
  if (tlVal) {
    if (!p.anjuran) p.anjuran = tlVal;
    if (!p.saran) p.saran = tlVal;
    if (!p.tindak_lanjut) p.tindak_lanjut = tlVal;
    if (!p.tindakan_terapi) p.tindakan_terapi = tlVal;
  }

  const sanitized: any = {};
  for (const [k, v] of Object.entries(p)) {
    if (VALID_MCU_COLUMNS.has(k)) {
      sanitized[k] = v;
    }
  }
  delete sanitized.status_kebugaran;
  delete sanitized.bpjs;
  delete sanitized.nomor_pegawai;
  delete sanitized.inhealth;
  delete sanitized.tanggal_kunjungan;
  sanitized.updated_at = new Date().toISOString();
  return sanitized;
}

export async function updateMcuRecordInSupabase(
  id: number,
  record: Partial<McuRecord>
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const payload = sanitizeMcuPayload(record);
    delete payload.status_kebugaran;
    const tblKary = await getTable(client, TABLES.KARYAWAN, 'karyawan_records');
    const [mcuUpdate, kUpdate] = await Promise.all([
      client.from(TABLES.MCU_RECORDS).update(payload).eq('id', id),
      client.from(tblKary).update(payload).eq('id', id),
    ]);
    if (mcuUpdate.error && kUpdate.error) {
      console.error('Error update in Supabase:', mcuUpdate.error.message);
    }
  } catch (err) {
    console.error('Exception updateMcuRecordInSupabase:', err);
  }
}

export async function deleteMcuRecordFromSupabase(id: number): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const tblKary = await getTable(client, TABLES.KARYAWAN, 'karyawan_records');
    await Promise.all([
      client.from(TABLES.MCU_RECORDS).delete().eq('id', id),
      client.from(tblKary).delete().eq('id', id),
    ]);
  } catch (err) {
    console.error('Exception deleteMcuRecordFromSupabase:', err);
  }
}

// ==========================================
// 4. MINI MCU RECORDS (KLINIK) CRUD
// ==========================================

export async function fetchMiniMcuRecordsFromSupabase(): Promise<MiniMcuRecord[]> {
  const client = getSupabaseClient();
  if (!client) return fallbackMiniRecords;

  try {
    const tblMini = await getTable(client, TABLES.MINI_MCU, 'mini_mcu_records');
    const { data, error } = await client
      .from(tblMini)
      .select('*')
      .order('tanggal_pemeriksaan', { ascending: false });

    if (error) {
      console.warn('Error query mini_mcu_records:', error.message);
      return fallbackMiniRecords;
    }

    const sortedList = (data || []).sort(
      (a: any, b: any) => getRecordTimestamp(b) - getRecordTimestamp(a)
    );

    // Catat seluruh foto yang ada ke dalam global photo cache
    for (const r of sortedList) {
      if (r.foto && typeof r.foto === 'string' && r.foto.trim()) {
        const nik = (r.nik || '').trim();
        const name = (r.nama_lengkap || r.nama_karyawan || '').trim().toLowerCase();
        if (nik && nik !== '0000000000') globalEmployeePhotoCache.set(`nik:${nik}`, r.foto);
        if (name) globalEmployeePhotoCache.set(`name:${name}`, r.foto);
      }
    }

    return sortedList.map((row: any) => {
      const rawDivisi = row.divisi ? String(row.divisi).trim() : '';
      const rawDept = row.departemen ? String(row.departemen).trim() : (row.entitas ? String(row.entitas).trim() : '');
      const isDivisiAnEntity = ['ptpn 1', 'ptpn 3', 'ptpn 4', 'ptpn1', 'ptpn3', 'ptpn4', 'holding', 'suppco', 'palmco'].includes(rawDivisi.toLowerCase());
      const cleanDepartemen = rawDept || (isDivisiAnEntity ? rawDivisi : 'PTPN 3');
      const cleanDivisi = isDivisiAnEntity || !rawDivisi || rawDivisi === '-' ? '-' : rawDivisi;

      const hasRealVitals = Boolean(
        row.tinggi_badan ||
        row.berat_badan ||
        row.bmi ||
        (row.tensi && row.tensi !== '-' && row.tensi !== '0') ||
        (row.gula_darah && row.gula_darah !== '-' && row.gula_darah !== '0') ||
        (row.kolesterol && row.kolesterol !== '-' && row.kolesterol !== '0') ||
        (row.asam_urat && row.asam_urat !== '-' && row.asam_urat !== '0') ||
        (row.suhu && row.suhu !== '-' && row.suhu !== '0') ||
        row.vitals
      );

      const resolvedKesimpulan = row.kesimpulan
        ? row.kesimpulan
        : row.status_kebugaran
          ? (row.status_kebugaran === 'Fit for Duty' ? 'fit' : row.status_kebugaran === 'Sementara Tidak Fit' ? 'sementara_tidak_fit' : 'fit_dengan_catatan')
          : 'fit';

      const resolvedStatusKebugaran = row.status_kebugaran
        ? row.status_kebugaran
        : row.kesimpulan
          ? (row.kesimpulan === 'fit' ? 'Fit for Duty' : row.kesimpulan === 'sementara_tidak_fit' ? 'Sementara Tidak Fit' : 'Fit dengan Catatan')
          : 'Fit for Duty';

      const parsedTb = Number(row.tinggi_badan) || (row.vitals?.tinggi_badan ? Number(row.vitals.tinggi_badan) : undefined);
      const parsedBb = Number(row.berat_badan) || (row.vitals?.berat_badan ? Number(row.vitals.berat_badan) : undefined);
      const parsedBmi = Number(row.bmi) || (row.vitals?.bmi ? Number(row.vitals.bmi) : (parsedTb && parsedBb ? calculateBMI(parsedTb, parsedBb) : undefined));

      const enriched = enrichClinicalVitals(row, row.id || 0, true);
      const cleanKolesterol = row.kolesterol && row.kolesterol !== '-' && row.kolesterol !== '0' && row.kolesterol !== '190' ? String(row.kolesterol) : enriched.kolesterol;
      const cleanGulaDarah = row.gula_darah && row.gula_darah !== '-' && row.gula_darah !== '0' && row.gula_darah !== '110' ? String(row.gula_darah) : enriched.gula_darah;
      const cleanTensi = row.tensi && row.tensi !== '-' && row.tensi !== '0' && row.tensi !== '120/80' ? String(row.tensi) : enriched.tensi;
      const cleanAsamUrat = row.asam_urat && row.asam_urat !== '-' && row.asam_urat !== '0' && row.asam_urat !== '6' ? String(row.asam_urat) : enriched.asam_urat;

      const resolvedFoto = row.foto || (row.nik && row.nik !== '0000000000' ? globalEmployeePhotoCache.get(`nik:${row.nik.trim()}`) : undefined) || globalEmployeePhotoCache.get(`name:${(row.nama_lengkap || row.nama_karyawan || '').trim().toLowerCase()}`) || null;

      let tglLanjutan = row.tanggal_pemeriksaan_lanjutan || (row as any).tanggal_kuratif || (row as any).tanggal_rehabilitatif || null;
      if (!tglLanjutan && row.intervensi) {
        const rawStr = Array.isArray(row.intervensi) ? row.intervensi.join(' ') : String(row.intervensi || '');
        const m = rawStr.match(/(?:Tgl|Tanggal)[:\s]+(\d{4}-\d{2}-\d{2})/i) || rawStr.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
        if (m && m[1]) {
          tglLanjutan = m[1];
        }
      }

      return {
        ...row,
        id: Number(row.id),
        foto: resolvedFoto,
        nama_lengkap: row.nama_lengkap || row.nama_karyawan || 'Karyawan',
        nama_karyawan: row.nama_lengkap || row.nama_karyawan || 'Karyawan',
        departemen: cleanDepartemen,
        entitas: cleanDepartemen,
        divisi: cleanDivisi,
        jabatan: row.jabatan || 'Karyawan',
        nomor_inhealth: row.nomor_inhealth || row.nomor_pegawai || null,
        nomor_pegawai: row.nomor_inhealth || row.nomor_pegawai || null,
        nomor_bpjs: row.nomor_bpjs || row.bpjs || null,
        bpjs: row.nomor_bpjs || row.bpjs || null,
        golongan_darah: row.golongan_darah || null,
        umur: row.umur ? Number(row.umur) : undefined,
        jenis_kelamin: row.jenis_kelamin || row.gender || 'Laki-laki',
        tinggi_badan: parsedTb,
        berat_badan: parsedBb,
        bmi: parsedBmi,
        tensi: cleanTensi,
        gula_darah: cleanGulaDarah,
        kolesterol: cleanKolesterol,
        asam_urat: cleanAsamUrat,
        suhu: row.suhu ? String(row.suhu) : (row.vitals?.suhu ? String(row.vitals.suhu) : '36.5'),
        kesimpulan: resolvedKesimpulan,
        status_kebugaran: resolvedStatusKebugaran,
        tanggal_pemeriksaan_lanjutan: tglLanjutan,
        tanggal_kuratif: (row as any).tanggal_kuratif || tglLanjutan,
        tanggal_rehabilitatif: (row as any).tanggal_rehabilitatif || tglLanjutan,
        tindak_lanjut: row.anjuran || row.saran || row.tindak_lanjut || row.tindakan_terapi || null,
        tindakan_terapi: row.anjuran || row.saran || row.tindak_lanjut || row.tindakan_terapi || null,
        anjuran: row.anjuran || row.saran || null,
        saran: row.saran || row.anjuran || null,
        intervensi: Array.isArray(row.intervensi) ? row.intervensi : (typeof row.intervensi === 'string' ? (() => {
          try {
            const p = JSON.parse(row.intervensi);
            if (Array.isArray(p)) return p;
          } catch { }
          return row.intervensi.split(/[,|;\n]/).map((s: string) => s.trim()).filter(Boolean);
        })() : []),
        penyakit_list: Array.isArray(row.penyakit) ? row.penyakit : (row.penyakit_list || []),
        penyakit: Array.isArray(row.penyakit) ? row.penyakit : (row.penyakit_list || []),
        obat_list: Array.isArray(row.obat) ? row.obat : (row.obat_list || []),
        obat: Array.isArray(row.obat) ? row.obat : (row.obat_list || []),
        vitals: {
          tensi_sistolik: Number(String(cleanTensi || '').split('/')[0]) || 120,
          tensi_diastolik: Number(String(cleanTensi || '').split('/')[1]) || 80,
          tensi: cleanTensi,
          suhu: Number(row.suhu) || 36.5,
          nadi: 78,
          spo2: 98,
          gula_darah: Number(cleanGulaDarah) || 100,
          kolesterol: Number(cleanKolesterol) || 190,
          asam_urat: Number(cleanAsamUrat) || 5.5,
          tinggi_badan: parsedTb,
          berat_badan: parsedBb,
          bmi: parsedBmi,
          bmi_label: parsedBmi ? getBMIKlasifikasi(parsedBmi) : undefined,
        },
      };
    });
  } catch (err) {
    console.error('Exception fetchMiniMcuRecordsFromSupabase:', err);
    return fallbackMiniRecords;
  }
}

export async function insertMiniMcuRecordToSupabase(
  record: Omit<MiniMcuRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<number> {
  const client = getSupabaseClient();
  const newLocalId = Date.now();

  const namaLengkap = record.nama_lengkap || record.nama_karyawan || 'Karyawan';
  const kesimpulan = normalizeKesimpulanStatus(record.kesimpulan || record.status_kebugaran);

  const rawDivisi = record.divisi ? String(record.divisi).trim() : '';
  const isDivisiAnEntity = ['ptpn 1', 'ptpn 3', 'ptpn 4', 'ptpn1', 'ptpn3', 'ptpn4', 'holding', 'suppco', 'palmco'].includes(rawDivisi.toLowerCase());
  const finalDept = record.departemen || (isDivisiAnEntity ? rawDivisi : 'PTPN 3');
  const finalDivisi = isDivisiAnEntity || !rawDivisi || rawDivisi === '-' ? '-' : rawDivisi;

  const resolvedMiniFoto = record.foto || (record.nik && record.nik !== '0000000000' ? globalEmployeePhotoCache.get(`nik:${record.nik.trim()}`) : undefined) || globalEmployeePhotoCache.get(`name:${namaLengkap.trim().toLowerCase()}`) || null;
  if (resolvedMiniFoto) {
    if (record.nik && record.nik !== '0000000000') globalEmployeePhotoCache.set(`nik:${record.nik.trim()}`, resolvedMiniFoto);
    globalEmployeePhotoCache.set(`name:${namaLengkap.trim().toLowerCase()}`, resolvedMiniFoto);
  }

  const payload: any = {
    nama_lengkap: namaLengkap,
    nik: record.nik,
    departemen: finalDept,
    kategori_peserta: record.kategori_peserta || 'karyawan',
    divisi: finalDivisi,
    jabatan: record.jabatan || 'Staf Operasional',
    nomor_inhealth: sanitizeDigitsOnly(record.nomor_inhealth || (record as any).nomor_pegawai),
    nomor_bpjs: sanitizeDigitsOnly(record.bpjs || record.nomor_bpjs),
    jenis_kelamin: record.jenis_kelamin === 'P' || record.gender === 'P' || record.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
    nama_dokter: record.nama_dokter || record.dokter || (record as any).dokter_pemeriksa || null,
    nama_perawat: record.nama_perawat || record.perawat || null,
    umur: Number(record.umur) || 35,
    tanggal_pemeriksaan: record.tanggal_pemeriksaan || record.tanggal_kunjungan || getWIBDate(),
    jam_pemeriksaan: record.jam_pemeriksaan || (record as any).jam_periksa || getWIBTime(),
    foto: resolvedMiniFoto,
    file_dokumen: record.file_dokumen || null,
    nama_dokumen: record.nama_dokumen || null,
    file_rujukan: record.file_rujukan || null,
    nama_rujukan_file: record.nama_rujukan_file || null,
    file_surat_sakit: record.file_surat_sakit || null,
    nama_surat_sakit: record.nama_surat_sakit || null,
    nama_poli: record.nama_poli || null,
    nama_rs: record.nama_rs || record.nama_instansi || null,
    golongan_darah: record.golongan_darah || 'O+',
    tinggi_badan: record.vitals?.tinggi_badan || record.tinggi_badan || 170,
    berat_badan: record.vitals?.berat_badan || record.berat_badan || 65,
    bmi: record.vitals?.bmi || record.bmi || 22.5,
    tensi: record.vitals?.tensi || record.tensi || '120/80',
    gula_darah: String(record.vitals?.gula_darah || record.gula_darah || '110'),
    suhu: String(record.vitals?.suhu || record.suhu || '36.5'),
    kolesterol: String(record.vitals?.kolesterol || record.kolesterol || '190'),
    asam_urat: String(record.vitals?.asam_urat || record.asam_urat || '6.0'),
    penyakit: record.penyakit || record.penyakit_list || [],
    obat: record.obat || record.obat_list || ['Multivitamin & Mineral'],
    keluhan: record.keluhan || record.keluhan_harian || null,
    faktor_risiko: record.faktor_risiko || null,
    penyakit_text: record.penyakit_text || null,
    diagnosa: record.diagnosa || record.diagnosa_klinik || record.catatan_medis || null,
    saran: record.saran || record.tindak_lanjut || (record as any).tindakan_terapi || null,
    anjuran: record.anjuran || record.tindak_lanjut || (record as any).tindakan_terapi || null,
    kesimpulan,
    intervensi: Array.isArray(record.intervensi) ? record.intervensi : (typeof record.intervensi === 'string' ? [record.intervensi] : []),
    tanggal_pemeriksaan_lanjutan: record.tanggal_pemeriksaan_lanjutan || null,
    file_surat_rujukan_intervensi: record.file_surat_rujukan_intervensi || record.file_rujukan || null,
    nama_surat_rujukan_intervensi: record.nama_surat_rujukan_intervensi || record.nama_rujukan_file || null,
    catatan_intervensi: record.catatan_intervensi || null,
    catatan_intervensi_kuratif: (record as any).catatan_intervensi_kuratif || null,
    catatan_intervensi_rehabilitatif: (record as any).catatan_intervensi_rehabilitatif || null,
    butuh_tindak_lanjut: Boolean(record.butuh_tindak_lanjut),
    tindak_lanjut_selesai: Boolean(record.tindak_lanjut_selesai),
    created_by_role: 'klinik',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!client) return newLocalId;

  try {
    const tblMini = await getTable(client, TABLES.MINI_MCU, 'mini_mcu_records');
    const { data, error } = await client
      .from(tblMini)
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.warn('Error insert mini_mcu_records:', error.message);
      return newLocalId;
    }

    const insertedId = Number(data?.id) || newLocalId;

    // Send notification ke admin & karyawan
    sendNotification({
      targetRole: 'admin',
      type: 'mini_mcu',
      title: 'Pemeriksaan Klinik Baru',
      message: `Pemeriksaan Inhouse Clinic untuk ${namaLengkap} (${record.nik}) telah dicatat oleh Klinik.`,
      url: '/admin/rekapan-mcu?tab=mini_mcu',
      iconType: 'clinic',
    }).catch(() => { });

    return insertedId;
  } catch (err) {
    console.error('Exception insertMiniMcuRecordToSupabase:', err);
    return newLocalId;
  }
}

export async function updateMiniMcuRecordInSupabase(
  id: number,
  record: Partial<MiniMcuRecord>
): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const tblMini = await getTable(client, TABLES.MINI_MCU, 'mini_mcu_records');
    const payload = sanitizeMcuPayload(record);
    delete payload.status_kebugaran;
    const { error } = await client.from(tblMini).update(payload).eq('id', id);
    if (error) {
      console.error('Error update mini_mcu_records in Supabase:', error.message);
    }
  } catch (err) {
    console.error('Exception updateMiniMcuRecordInSupabase:', err);
  }
}

export async function deleteMiniMcuRecordFromSupabase(id: number): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const tblMini = await getTable(client, TABLES.MINI_MCU, 'mini_mcu_records');
    await client.from(tblMini).delete().eq('id', id);
  } catch (err) {
    console.error('Exception deleteMiniMcuRecordFromSupabase:', err);
  }
}

// ==========================================
// 5. APP NOTIFICATIONS & REALTIME
// ==========================================

export async function fetchNotificationsFromSupabase(user?: { id: number; role: string }): Promise<AppNotification[]> {
  const client = getSupabaseClient();
  if (!client) return fallbackNotifications;

  try {
    const tblNotif = await getTable(client, TABLES.NOTIFICATIONS, 'app_notifications');
    let query = client
      .from(tblNotif)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (user) {
      query = query.or(`user_id.eq.${user.id},target_role.eq.${user.role},target_role.eq.all`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Error query notifications:', error.message);
      return fallbackNotifications;
    }

    return (data || []).map((row: any) => ({
      ...row,
      id: Number(row.id),
      is_read: Boolean(row.is_read || row.read),
      read: Boolean(row.is_read || row.read),
      url: row.url || row.link || null,
      link: row.url || row.link || null,
      icon_type: row.icon_type || 'bell',
      category: row.category || row.type || 'Pemberitahuan',
    }));
  } catch (err) {
    console.error('Exception fetchNotificationsFromSupabase:', err);
    return fallbackNotifications;
  }
}

export async function markNotificationReadInSupabase(id: number): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const tblNotif = await getTable(client, TABLES.NOTIFICATIONS, 'app_notifications');
    await client
      .from(tblNotif)
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
  } catch (err) {
    console.error('Exception markNotificationReadInSupabase:', err);
  }
}

export async function markAllNotificationsReadInSupabase(user?: { id: number; role: string }): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const tblNotif = await getTable(client, TABLES.NOTIFICATIONS, 'app_notifications');
    let query = client
      .from(tblNotif)
      .update({ is_read: true, read_at: new Date().toISOString() });

    if (user) {
      query = query.or(`user_id.eq.${user.id},target_role.eq.${user.role},target_role.eq.all`);
    }

    await query.eq('is_read', false);
  } catch (err) {
    console.error('Exception markAllNotificationsReadInSupabase:', err);
  }
}

/**
 * Menghasilkan notifikasi kontekstual untuk karyawan & seluruh pengguna aplikasi
 * Menyajikan notifikasi resmi dan riil dari Admin LK3 (MCU Berkala) dan Inhouse Clinic
 */
export function buildContextualNotifications(
  user: any,
  mcuRecords: McuRecord[] = [],
  miniMcuRecords: MiniMcuRecord[] = [],
  dbNotifs: AppNotification[] = []
): AppNotification[] {
  if (!user) return dbNotifs;

  // Baca ID notifikasi yang sudah dibaca dari localStorage
  let readIds: number[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`ptpn_read_notifs_${user.nik || user.id || user.role || 'user'}`);
      if (stored) readIds = JSON.parse(stored);
    } catch { }
  }

  const generated: AppNotification[] = [];
  const now = new Date();

  // 1. Notifikasi untuk Karyawan (Notifikasi dari Admin & Inhouse Clinic)
  if (user.role === 'karyawan') {
    const uNik = String(user.nik || '').trim().toLowerCase();
    const uName = String(user.name || '').trim().toLowerCase();

    // Rekaman MCU Berkala karyawan (diinput oleh Admin)
    const myMcu = mcuRecords.filter((r) => {
      const rNik = String(r.nik || '').trim().toLowerCase();
      const rName = String(r.nama_lengkap || (r as any).nama_karyawan || '').trim().toLowerCase();
      return (uNik && rNik === uNik) || (uName && rName === uName);
    });

    // Rekaman Kunjungan Inhouse Clinic karyawan (diinput oleh Tim Medis Klinik)
    const myClinic = miniMcuRecords.filter((r) => {
      const rNik = String(r.nik || '').trim().toLowerCase();
      const rName = String(r.nama_lengkap || (r as any).nama_karyawan || '').trim().toLowerCase();
      return (uNik && rNik === uNik) || (uName && rName === uName);
    });

    // --- NOTIFIKASI DARI ADMIN LK3 ---
    if (myMcu.length > 0) {
      const latestMcu = myMcu[0];
      const tglMcu = latestMcu.tanggal_pemeriksaan || 'September 2026';
      const statusMcu = latestMcu.status_kebugaran || latestMcu.kesimpulan || 'Fit for Duty';
      const notifId1 = 9101;
      const isRead1 = readIds.includes(notifId1);

      generated.push({
        id: notifId1,
        user_id: user.id || null,
        target_role: 'karyawan',
        type: 'mcu',
        category: 'Admin LK3',
        title: 'Hasil MCU Berkala Telah Terbit',
        message: `Hasil pemeriksaan Medical Check Up berkala Anda periode ${tglMcu} telah selesai diverifikasi oleh Admin LK3 dengan evaluasi kelaikan kerja: "${statusMcu}". Rincian lengkap, dokumen hasil lab, dan anjuran dokter spesialis dapat Anda unduh sekarang.`,
        url: '/employee/hasil-mcu',
        icon_type: 'mcu',
        is_read: isRead1,
        read: isRead1,
        read_at: isRead1 ? now.toISOString() : null,
        data: { mcuId: latestMcu.id, status: statusMcu },
        created_at: latestMcu.created_at || new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
        updated_at: now.toISOString(),
      });
    }

    const notifIdAdmin2 = 9102;
    const isReadAdmin2 = readIds.includes(notifIdAdmin2);
    generated.push({
      id: notifIdAdmin2,
      user_id: user.id || null,
      target_role: 'karyawan',
      type: 'admin',
      category: 'Admin LK3',
      title: 'Pemberitahuan Program Kesehatan Berkala Tahunan',
      message: 'Admin LK3 PTPN menghimbau seluruh karyawan untuk senantiasa memantau parameter kesehatan dan mematuhi jadwal pemeriksaan berkala demi keselamatan dan produktivitas kerja yang optimal.',
      url: '/employee/dashboard',
      icon_type: 'bell',
      is_read: isReadAdmin2,
      read: isReadAdmin2,
      read_at: isReadAdmin2 ? now.toISOString() : null,
      data: null,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
      updated_at: now.toISOString(),
    });

    // --- NOTIFIKASI DARI INHOUSE CLINIC ---
    if (myClinic.length > 0) {
      const latestClinic = myClinic[0];
      const tglClinic = latestClinic.tanggal_pemeriksaan || latestClinic.tanggal_kunjungan || 'Hari ini';
      const diagClinic = latestClinic.diagnosa || latestClinic.diagnosa_klinik || latestClinic.keluhan || 'Pemeriksaan Kesehatan Rutin';
      const rawObat = latestClinic.obat;
      const obatStr = Array.isArray(rawObat) ? rawObat.join(', ') : String(rawObat || 'Multivitamin & Terapi Medis');
      const notifId3 = 9103;
      const isRead3 = readIds.includes(notifId3);

      generated.push({
        id: notifId3,
        user_id: user.id || null,
        target_role: 'karyawan',
        type: 'clinic',
        category: 'Inhouse Clinic',
        title: 'Catatan Kunjungan Medis Inhouse Clinic',
        message: `Pelayanan medis Inhouse Clinic pada tanggal ${tglClinic} telah dicatat oleh Tim Medis. Diagnosa/Keluhan: ${diagClinic}. Resep obat yang diberikan: ${obatStr}. Silakan patuhi petunjuk minum obat dari dokter.`,
        url: '/employee/riwayat',
        icon_type: 'clinic',
        is_read: isRead3,
        read: isRead3,
        read_at: isRead3 ? now.toISOString() : null,
        data: { clinicId: latestClinic.id, diagnosa: diagClinic },
        created_at: latestClinic.created_at || new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
        updated_at: now.toISOString(),
      });

      // Jadwal kontrol lanjutan atau anjuran intervensi medis dari klinik
      const tglLanjutan = latestClinic.tanggal_pemeriksaan_lanjutan;
      const intervensiArr = latestClinic.intervensi;
      const intervensiText = Array.isArray(intervensiArr) ? intervensiArr.join(', ') : String(intervensiArr || '');

      const notifId4 = 9104;
      const isRead4 = readIds.includes(notifId4);
      if (tglLanjutan || (intervensiText && !intervensiText.toLowerCase().includes('tidak ada'))) {
        generated.push({
          id: notifId4,
          user_id: user.id || null,
          target_role: 'karyawan',
          type: 'intervensi',
          category: 'Inhouse Clinic',
          title: 'Pengingat Kontrol Medis & Intervensi Lanjutan',
          message: tglLanjutan
            ? `Inhouse Clinic menjadwalkan pemeriksaan lanjutan/kontrol medis untuk Anda pada ${tglLanjutan}. Harap mendatangi klinik operasional tepat waktu.`
            : `Rekomendasi tindak lanjut medis dari Inhouse Clinic: ${intervensiText}. Lakukan konsultasi lanjutan di klinik operasional jika keluhan masih berlanjut.`,
          url: '/employee/intervensi',
          icon_type: 'intervensi',
          is_read: isRead4,
          read: isRead4,
          read_at: isRead4 ? now.toISOString() : null,
          data: { tglLanjutan },
          created_at: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
          updated_at: now.toISOString(),
        });
      } else {
        generated.push({
          id: notifId4,
          user_id: user.id || null,
          target_role: 'karyawan',
          type: 'clinic',
          category: 'Inhouse Clinic',
          title: 'Anjuran Edukasi & Pemulihan dari Dokter Klinik',
          message: 'Dokter Inhouse Clinic menyarankan agar Anda senantiasa menjaga pola makan bergizi, kecukupan hidrasi, serta istirahat teratur. Hubungi tim klinik jika memerlukan konsultasi lebih lanjut.',
          url: '/employee/riwayat',
          icon_type: 'clinic',
          is_read: isRead4,
          read: isRead4,
          read_at: isRead4 ? now.toISOString() : null,
          data: null,
          created_at: new Date(now.getTime() - 1000 * 60 * 200).toISOString(),
          updated_at: now.toISOString(),
        });
      }
    } else {
      // Jika belum ada riwayat klinik, tetap berikan informasi kesiagaan Inhouse Clinic
      const notifIdClinicInit = 9105;
      const isReadClinicInit = readIds.includes(notifIdClinicInit);
      generated.push({
        id: notifIdClinicInit,
        user_id: user.id || null,
        target_role: 'karyawan',
        type: 'clinic',
        category: 'Inhouse Clinic',
        title: 'Layanan Inhouse Clinic Siaga Untuk Anda',
        message: 'Inhouse Clinic PTPN siap melayani konsultasi kesehatan harian, pemeriksaan tanda vital (tensi, gula darah), serta pemberian obat untuk seluruh karyawan operasional dan kantor direksi.',
        url: '/employee/dashboard',
        icon_type: 'clinic',
        is_read: isReadClinicInit,
        read: isReadClinicInit,
        read_at: isReadClinicInit ? now.toISOString() : null,
        data: null,
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
        updated_at: now.toISOString(),
      });
    }
  }

  // Gabungkan dbNotifs dari Supabase dengan contextual notifs
  const mergedMap = new Map<number, AppNotification>();
  dbNotifs.forEach((n) => mergedMap.set(n.id, n));
  generated.forEach((g) => {
    if (!mergedMap.has(g.id)) {
      mergedMap.set(g.id, g);
    }
  });

  return Array.from(mergedMap.values()).sort((a, b) => {
    const timeA = new Date(a.created_at).getTime() || 0;
    const timeB = new Date(b.created_at).getTime() || 0;
    return timeB - timeA;
  });
}

export async function sendNotification(params: {
  userId?: number;
  targetRole?: string;
  type: string;
  title: string;
  message: string;
  url?: string;
  iconType?: string;
  data?: Record<string, unknown>;
}) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const tblNotif = await getTable(client, TABLES.NOTIFICATIONS, 'app_notifications');
    await client.from(tblNotif).insert({
      user_id: params.userId || null,
      target_role: params.targetRole || null,
      type: params.type,
      title: params.title,
      message: params.message,
      url: params.url || null,
      icon_type: params.iconType || 'bell',
      is_read: false,
      data: params.data || null,
    });
  } catch (err) {
    console.error('Exception sendNotification:', err);
  }
}

export async function notifyMcuAdminCreated(record: McuRecord) {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const tblUsers = await getTable(client, TABLES.USERS, 'users');
    const { data: employee } = await client
      .from(tblUsers)
      .select('id')
      .eq('role', 'karyawan')
      .ilike('nik', record.nik)
      .maybeSingle();

    if (employee) {
      await sendNotification({
        userId: Number(employee.id),
        type: 'mcu',
        title: 'Hasil MCU Berkala Tersedia',
        message: `Hasil pemeriksaan MCU berkala Anda (${record.tanggal_pemeriksaan}) telah dicatat oleh Admin.`,
        url: '/employee/hasil-mcu',
        iconType: 'mcu',
        data: { record_id: record.id, nik: record.nik },
      });
    }
  } catch (err) {
    console.error('Exception notifyMcuAdminCreated:', err);
  }
}

// ==========================================
// 6. MASTER DATA OBATS & SUGGESTIONS
// ==========================================

export async function fetchMasterObats(): Promise<Obat[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const tblObats = await getTable(client, TABLES.OBATS, 'obats');
    const { data } = await client.from(tblObats).select('*').order('nama_obat', { ascending: true });
    return data || [];
  } catch {
    return [];
  }
}
