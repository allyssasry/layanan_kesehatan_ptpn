// src/types/mcu.ts - SELARAS dengan database Laravel PTPN-LK3

export type UserRole = 'admin' | 'klinik' | 'karyawan';

export interface User {
  id: number;
  name: string;
  email: string;
  nik: string | null;
  divisi: string | null;
  role: UserRole;
  avatar?: string | null;
  foto?: string | null;
  created_at?: string;
  updated_at?: string;
}

// Kesimpulan HARUS sama persis dengan Laravel enum
export type KesimpulanStatus = 'fit' | 'fit_dengan_catatan' | 'sementara_tidak_fit';

// Backward compatibility alias if needed
export type FitnessStatus = KesimpulanStatus | 'Fit for Duty' | 'Fit dengan Catatan' | 'Sementara Tidak Fit' | 'Perlu Evaluasi';

export const KESIMPULAN_LABELS: Record<KesimpulanStatus, string> = {
  fit: 'Fit',
  fit_dengan_catatan: 'Fit dengan Catatan',
  sementara_tidak_fit: 'Sementara Tidak Fit',
};

export const KESIMPULAN_COLORS: Record<KesimpulanStatus, { bg: string; text: string }> = {
  fit: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  fit_dengan_catatan: { bg: 'bg-amber-100', text: 'text-amber-700' },
  sementara_tidak_fit: { bg: 'bg-red-100', text: 'text-red-700' },
};

export interface McuRecord {
  id: number;
  user_id?: number | string | null;

  // Identitas
  nama_lengkap?: string;
  nama_karyawan?: string; // alias for compatibility
  nik: string;
  departemen?: string | null;
  kategori_peserta?: string | null;
  divisi?: string | null;
  jabatan?: string | null;
  nomor_inhealth?: string | null;
  nomor_bpjs?: string | null;
  bpjs?: string | null;
  jenis_kelamin?: 'Laki-laki' | 'Perempuan' | 'L' | 'P' | null;
  gender?: 'L' | 'P' | 'Laki-laki' | 'Perempuan' | null;
  nama_dokter?: string | null;
  dokter?: string | null;
  nama_perawat?: string | null;
  perawat?: string | null;
  umur?: number | null;
  tanggal_pemeriksaan?: string;  // DATE
  tanggal_kunjungan?: string;
  jam_pemeriksaan?: string | null; // TIME
  foto?: string | null;

  // Dokumen
  file_dokumen?: string | null;
  nama_dokumen?: string | null;
  file_rujukan?: string | null;
  nama_rujukan_file?: string | null;
  file_surat_sakit?: string | null;
  nama_surat_sakit?: string | null;
  nama_poli?: string | null;
  nama_rs?: string | null;
  nama_klinik?: string | null;
  nama_instansi?: string | null;

  // Vitals (KOLOM TERPISAH)
  golongan_darah?: string | null;
  tinggi_badan?: number | null;
  berat_badan?: number | null;
  bmi?: number | null;
  tensi?: string | null;
  gula_darah?: string | null;
  suhu?: string | null;
  vitals_updated_at?: string | null;
  vitals_updated_by_role?: string | null;
  kolesterol?: string | null;
  asam_urat?: string | null;
  vitals?: {
    tensi_sistolik?: number;
    tensi_diastolik?: number;
    tensi?: string;
    suhu?: number;
    nadi?: number;
    spo2?: number;
    gula_darah?: number;
    kolesterol?: number;
    asam_urat?: number;
    tinggi_badan?: number;
    berat_badan?: number;
    bmi?: number;
    bmi_label?: string;
  };

  // Hasil Pemeriksaan
  penyakit?: string[] | null;     // JSONB array
  penyakit_list?: string[] | null;
  obat?: string[] | null;         // JSONB array
  obat_list?: string[] | null;
  keluhan?: string | null;
  faktor_risiko?: string | null;
  penyakit_text?: string | null;

  // Catatan Medis 4 Kuadran
  diagnosa?: string | null;
  catatan_medis?: string | null;
  konsultasi?: string | null;
  saran?: string | null;
  anjuran?: string | null;

  // Kesimpulan
  kesimpulan?: KesimpulanStatus | string;
  status_kebugaran?: string;

  // Intervensi
  intervensi?: string[] | string | null;    // JSONB array or string
  tanggal_pemeriksaan_lanjutan?: string | null;
  file_surat_rujukan_intervensi?: string | null;
  nama_surat_rujukan_intervensi?: string | null;
  catatan_intervensi?: string | null;

  // Tindak Lanjut
  tindak_lanjut?: string | null;
  butuh_tindak_lanjut?: boolean;
  file_hasil_tindak_lanjut?: string | null;
  nama_hasil_tindak_lanjut?: string | null;
  tindak_lanjut_selesai?: boolean;

  // Tindak Lanjut per Kategori
  tindak_lanjut_selesai_kuratif?: boolean;
  catatan_intervensi_kuratif?: string | null;
  file_hasil_tindak_lanjut_kuratif?: string | null;
  nama_hasil_tindak_lanjut_kuratif?: string | null;
  tindak_lanjut_selesai_rehabilitatif?: boolean;
  catatan_intervensi_rehabilitatif?: string | null;
  file_hasil_tindak_lanjut_rehabilitatif?: string | null;
  nama_hasil_tindak_lanjut_rehabilitatif?: string | null;

  // Metadata
  created_by_role?: string;
  created_at?: string;
  updated_at?: string;
}

// MiniMcuRecord IDENTIK dengan McuRecord (sesuai Laravel)
export interface MiniMcuRecord extends McuRecord {
  diagnosa_klinik?: string;
  tindakan_terapi?: string;
  keluhan_harian?: string;
}

export interface AppNotification {
  id: number;
  user_id: number | null;
  target_role: string | null;
  type: string;
  title: string;
  message: string;
  url: string | null;
  link?: string | null;
  icon_type: string;
  category?: string;
  is_read: boolean;
  read?: boolean;
  read_at: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Obat {
  id: number;
  nama_obat: string;
}
