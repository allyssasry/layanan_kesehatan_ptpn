# 🔧 DOKUMENTASI PENYESUAIAN PROJECT NEXT.JS (ptpn-nextjs)
## Sinkronisasi dengan Project Laravel PTPN-LK3 — Gap Analysis & Fix Guide

> **Tujuan Dokumen:** Mengidentifikasi SEMUA perbedaan (gap) antara project Laravel asli (`PTPN-LK3`) dan project Next.js yang sudah ada (`ptpn-nextjs`), lalu memberikan instruksi perbaikan yang tepat agar kedua project selaras.
>
> **Cara Pakai:** Tempelkan dokumen ini di workspace Next.js (`ptpn-nextjs`), lalu berikan ke AI Assistant sebagai konteks saat meminta perbaikan.

---

## DAFTAR ISI

1. [Status Project Next.js Saat Ini](#1-status-project-nextjs-saat-ini)
2. [Daftar Gap Kritis (Harus Diperbaiki)](#2-daftar-gap-kritis-harus-diperbaiki)
3. [FIX #1: Database Schema — SQL Baru untuk Supabase](#3-fix-1-database-schema--sql-baru-untuk-supabase)
4. [FIX #2: TypeScript Types — Sesuaikan dengan Laravel](#4-fix-2-typescript-types--sesuaikan-dengan-laravel)
5. [FIX #3: Auth System — Perbaiki Keamanan & Flow](#5-fix-3-auth-system--perbaiki-keamanan--flow)
6. [FIX #4: Middleware Route Protection (RBAC)](#6-fix-4-middleware-route-protection-rbac)
7. [FIX #5: Halaman & Route yang Hilang](#7-fix-5-halaman--route-yang-hilang)
8. [FIX #6: Service Layer — Tambahkan Logic yang Missing](#8-fix-6-service-layer--tambahkan-logic-yang-missing)
9. [FIX #7: Notifikasi Real-Time (Supabase Realtime)](#9-fix-7-notifikasi-real-time-supabase-realtime)
10. [FIX #8: Sidebar Navigation — Sesuaikan dengan Laravel](#10-fix-8-sidebar-navigation--sesuaikan-dengan-laravel)
11. [FIX #9: Fitur Intervensi Layanan Kesehatan](#11-fix-9-fitur-intervensi-layanan-kesehatan)
12. [FIX #10: File Upload ke Supabase Storage](#12-fix-10-file-upload-ke-supabase-storage)
13. [Referensi: Routing Lengkap Laravel vs Next.js](#13-referensi-routing-lengkap-laravel-vs-nextjs)
14. [Referensi: CRUD Rules per Role](#14-referensi-crud-rules-per-role)
15. [Referensi: Alur Sistem (System Flow) dari Laravel](#15-referensi-alur-sistem-system-flow-dari-laravel)
16. [Referensi: Desain & Color Palette](#16-referensi-desain--color-palette)
17. [Referensi: Konstanta & Data Master](#17-referensi-konstanta--data-master)
18. [Checklist Perbaikan (Prioritas)](#18-checklist-perbaikan-prioritas)

---

## 1. STATUS PROJECT NEXT.JS SAAT INI

### Yang Sudah Ada ✅
```
src/
├── app/
│   ├── admin/dashboard, detail-mcu, edit-data, ekspor-excel,
│   │        intervensi, mcu/[id], record-detail, rekapan-mcu, tambah-data
│   ├── employee/dashboard, hasil-mcu, hasil-mini-mcu
│   ├── klinik/dashboard, detail-mini-mcu, edit-data, ekspor-excel,
│   │         rekapan-mini-mcu, tambah-data, tambah-pemeriksaan
│   ├── login, register
│   ├── globals.css, layout.tsx, page.tsx, providers.tsx
├── components/layout/ (AppLayout.tsx, Sidebar.tsx)
├── context/ (AuthContext.tsx, McuContext.tsx)
├── lib/ (supabase.ts)
├── services/ (authService.ts, mcuService.ts)
├── types/ (mcu.ts)
└── supabase/ (schema.sql)
```

### Dependencies Terpasang
```json
{
  "@supabase/supabase-js": "^2.112.4",
  "lucide-react": "^1.34.0",
  "next": "^15.1.7",
  "react": "^19.0.0",
  "recharts": "^2.15.1",
  "tailwindcss": "^4.0.9"
}
```

### Supabase Config
- URL: `https://eovwyimktvffmhadarjl.supabase.co`
- Menggunakan `anon key` saja (tidak ada `service_role key`)
- Auth: **CUSTOM** (bukan Supabase Auth — password disimpan plain text di tabel `profiles`)

---

## 2. DAFTAR GAP KRITIS (Harus Diperbaiki)

### 🔴 GAP KRITIS — Database Schema

| Masalah | Detail |
|:---|:---|
| **Tabel `profiles` vs `users`** | Laravel pakai `users`, Next.js pakai `profiles`. Nama tabel HARUS sama: `users` |
| **Tabel `notifications` vs `app_notifications`** | Laravel pakai `app_notifications` dengan kolom `is_read`, `read_at`, `icon_type`, `url`, `data (JSONB)`. Next.js pakai `notifications` dengan kolom `read`, `link`, `category` — BERBEDA! |
| **`mcu_records` — 23+ kolom HILANG** | Next.js TIDAK punya: `departemen`, `kategori_peserta`, `jabatan`, `nomor_inhealth`, `nomor_bpjs`, `jenis_kelamin`, `nama_dokter`, `nama_perawat`, `foto`, `file_dokumen`, `nama_dokumen`, `file_rujukan`, `nama_rujukan_file`, `file_surat_sakit`, `nama_surat_sakit`, `nama_poli`, `nama_rs`, `keluhan`, `faktor_risiko`, `diagnosa`, `konsultasi`, `saran`, `anjuran`, `intervensi (JSONB)`, `tanggal_pemeriksaan_lanjutan`, semua `tindak_lanjut_*` fields, `vitals_updated_at/by_role`, `created_by_role` |
| **`mini_mcu_records` — Struktur BERBEDA** | Laravel: struktur identik dengan `mcu_records`. Next.js: punya `keluhan_harian`, `diagnosa_klinik`, `tindakan_terapi`, `tanggal_kunjungan` — TIDAK ADA di Laravel |
| **Vitals sebagai JSONB vs kolom terpisah** | Next.js menyimpan vitals dalam 1 kolom JSONB `vitals`. Laravel menyimpan sebagai kolom terpisah: `tensi`, `gula_darah`, `suhu`, `kolesterol`, `asam_urat`, `tinggi_badan`, `berat_badan`, `bmi` |
| **Tabel `obats` HILANG** | Master data obat (27 item) tidak ada |
| **Tabel `medical_suggestions` HILANG** | Master saran medis tidak ada |
| **`kesimpulan` enum BERBEDA** | Laravel: `'fit' \| 'fit_dengan_catatan' \| 'sementara_tidak_fit'`. Next.js: `'Fit for Duty' \| 'Fit dengan Catatan' \| 'Sementara Tidak Fit' \| 'Perlu Evaluasi'` — Format berbeda! |

### 🔴 GAP KRITIS — Auth & Security

| Masalah | Detail |
|:---|:---|
| **Password PLAIN TEXT** | Next.js menyimpan password sebagai plain text di tabel `profiles`. Laravel pakai bcrypt hash. **WAJIB diperbaiki!** |
| **Tidak pakai Supabase Auth** | Login/register langsung query tabel `profiles`, tidak memanfaatkan Supabase Auth (JWT, session management) |
| **Session via localStorage** | Rentan XSS attack. Laravel pakai server-side session. Harus pakai Supabase Auth session |
| **TIDAK ADA middleware route protection** | Siapa saja bisa akses `/admin/*` tanpa login! Tidak ada RBAC guard |
| **Karyawan login by NIK** | Laravel: Karyawan bisa login pakai Email ATAU NIK. Next.js: Sama (OK), tapi validasi role saat login HARUS ketat |

### 🔴 GAP KRITIS — Halaman & Fitur

| Halaman/Fitur | Laravel ✅ | Next.js ❌ |
|:---|:---|:---|
| `/settings` (Pengaturan profil & password) | Ada | **TIDAK ADA** |
| `/notifications` (Pusat notifikasi) | Ada | **TIDAK ADA** |
| `/karyawan/unggah-data` (Upload MCU mandiri) | Ada | **TIDAK ADA** |
| `/klinik/intervensi-layanan-kesehatan` | Ada | **TIDAK ADA** (Klinik tidak punya menu intervensi di sidebar) |
| Dashboard Intervensi badge count (sidebar) | Ada | **TIDAK ADA** |
| Notifikasi bell icon + popup di header | Ada | **TIDAK ADA / Partial** |
| Form MCU: Card 4 (Intervensi checkbox) | Ada | **TIDAK ADA** |
| Intervensi tindak lanjut per kategori (Kuratif/Rehabilitatif) | Ada | **TIDAK ADA** |
| Auto-fill karyawan dari database saat input NIK | Ada | **TIDAK ADA** |
| Auto-kalkulasi BMI di form | Ada | **Partial** |
| Ekspor Excel (real file download) | Ada | **TIDAK ADA (UI saja)** |
| Impor Excel/CSV | Ada | **TIDAK ADA** |
| Upload foto, dokumen, rujukan, surat sakit | Ada | **TIDAK ADA** |
| Grafik tren riwayat kesehatan (patient history) | Ada | **Partial** |
| Tambah Pemeriksaan Lanjutan (pre-filled) | Ada | **Partial** |

### 🟡 GAP MINOR

| Masalah | Detail |
|:---|:---|
| Sidebar Klinik: Menu "Intervensi" TIDAK ADA | Laravel Klinik punya "Dashboard Intervensi" di sidebar |
| Sidebar Karyawan: Menu "Unggah Data MCU" TIDAK ADA | Laravel punya |
| Settings button di sidebar → `alert()` | Harus link ke `/settings` |
| Pagination | Tidak ada server-side pagination |
| Root page `/` | Hardcoded redirect ke `/login`, seharusnya cek auth dulu |

---

## 3. FIX #1: Database Schema — SQL Baru untuk Supabase

**GANTI SELURUH** `supabase/schema.sql` dengan SQL di bawah ini. Jalankan di **Supabase SQL Editor**:

> [!CAUTION]
> SQL ini akan DROP semua tabel lama. Backup data dulu jika ada data penting!

```sql
-- =====================================================================
-- SCHEMA DATABASE SUPABASE — PTPN-LK3 (SELARAS DENGAN LARAVEL)
-- Versi: 2 September 2026
-- =====================================================================

-- 1. BERSIHKAN
DROP TABLE IF EXISTS public.app_notifications CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.mini_mcu_records CASCADE;
DROP TABLE IF EXISTS public.mcu_records CASCADE;
DROP TABLE IF EXISTS public.medical_suggestions CASCADE;
DROP TABLE IF EXISTS public.obats CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS kesimpulan_status CASCADE;
DROP TYPE IF EXISTS fitness_status CASCADE;

-- 2. ENUM TYPES (SESUAI LARAVEL)
CREATE TYPE user_role AS ENUM ('admin', 'klinik', 'karyawan');
CREATE TYPE kesimpulan_status AS ENUM ('fit', 'fit_dengan_catatan', 'sementara_tidak_fit');

-- 3. TABEL USERS (menggantikan "profiles")
CREATE TABLE public.users (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    nik             TEXT UNIQUE,
    divisi          TEXT,
    role            user_role NOT NULL DEFAULT 'karyawan',
    email_verified_at TIMESTAMPTZ,
    password        TEXT NOT NULL,    -- Harus di-hash! (bcrypt)
    remember_token  TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL MCU_RECORDS (SESUAI LARAVEL — semua 60+ kolom)
CREATE TABLE public.mcu_records (
    id                BIGSERIAL PRIMARY KEY,

    -- Identitas
    nama_lengkap      TEXT NOT NULL,
    nik               TEXT NOT NULL,
    departemen        TEXT DEFAULT 'PTPN 3',
    kategori_peserta  TEXT DEFAULT 'karyawan',
    divisi            TEXT,
    jabatan           TEXT,
    nomor_inhealth    TEXT,
    nomor_bpjs        TEXT,
    jenis_kelamin     TEXT CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    nama_dokter       TEXT,
    nama_perawat      TEXT,
    umur              INTEGER,
    tanggal_pemeriksaan DATE NOT NULL,
    jam_pemeriksaan   TIME,
    foto              TEXT,

    -- Dokumen
    file_dokumen      TEXT,
    nama_dokumen      TEXT,
    file_rujukan      TEXT,
    nama_rujukan_file TEXT,
    file_surat_sakit  TEXT,
    nama_surat_sakit  TEXT,
    nama_poli         TEXT,
    nama_rs           TEXT,

    -- Vitals (KOLOM TERPISAH, bukan JSONB!)
    golongan_darah    TEXT,
    tinggi_badan      NUMERIC(5,1),
    berat_badan       NUMERIC(5,1),
    bmi               NUMERIC(4,1),
    tensi             TEXT,           -- "120/80"
    gula_darah        TEXT,
    suhu              TEXT,
    vitals_updated_at TIMESTAMPTZ,
    vitals_updated_by_role TEXT,
    kolesterol        TEXT,
    asam_urat         TEXT,

    -- Hasil Pemeriksaan
    penyakit          JSONB,          -- ["Anemia", "Hipertensi", ...]
    obat              JSONB,          -- ["PCT", "Amoxicilin", ...]
    keluhan           TEXT,
    faktor_risiko     TEXT,
    penyakit_text     TEXT,

    -- Catatan Medis 4 Kuadran
    diagnosa          TEXT,
    konsultasi        TEXT,
    saran             TEXT,
    anjuran           TEXT,

    -- Kesimpulan
    kesimpulan        kesimpulan_status DEFAULT 'fit',

    -- Intervensi
    intervensi                  JSONB,    -- ["Health Talk", "Konsultasi Lanjutan", ...]
    tanggal_pemeriksaan_lanjutan DATE,
    file_surat_rujukan_intervensi TEXT,
    nama_surat_rujukan_intervensi TEXT,
    catatan_intervensi          TEXT,

    -- Tindak Lanjut (generic)
    butuh_tindak_lanjut         BOOLEAN DEFAULT FALSE,
    file_hasil_tindak_lanjut    TEXT,
    nama_hasil_tindak_lanjut    TEXT,
    tindak_lanjut_selesai       BOOLEAN DEFAULT FALSE,

    -- Tindak Lanjut Kuratif
    tindak_lanjut_selesai_kuratif       BOOLEAN DEFAULT FALSE,
    catatan_intervensi_kuratif          TEXT,
    file_hasil_tindak_lanjut_kuratif    TEXT,
    nama_hasil_tindak_lanjut_kuratif    TEXT,

    -- Tindak Lanjut Rehabilitatif
    tindak_lanjut_selesai_rehabilitatif       BOOLEAN DEFAULT FALSE,
    catatan_intervensi_rehabilitatif          TEXT,
    file_hasil_tindak_lanjut_rehabilitatif    TEXT,
    nama_hasil_tindak_lanjut_rehabilitatif    TEXT,

    -- Metadata
    created_by_role   TEXT DEFAULT 'admin',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABEL MINI_MCU_RECORDS (IDENTIK dengan mcu_records, default klinik)
CREATE TABLE public.mini_mcu_records (
    id                BIGSERIAL PRIMARY KEY,
    nama_lengkap      TEXT NOT NULL,
    nik               TEXT NOT NULL,
    departemen        TEXT DEFAULT 'PTPN 3',
    kategori_peserta  TEXT DEFAULT 'karyawan',
    divisi            TEXT,
    jabatan           TEXT,
    nomor_inhealth    TEXT,
    nomor_bpjs        TEXT,
    jenis_kelamin     TEXT CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    nama_dokter       TEXT,
    nama_perawat      TEXT,
    umur              INTEGER,
    tanggal_pemeriksaan DATE NOT NULL,
    jam_pemeriksaan   TIME,
    foto              TEXT,
    file_dokumen      TEXT,
    nama_dokumen      TEXT,
    file_rujukan      TEXT,
    nama_rujukan_file TEXT,
    file_surat_sakit  TEXT,
    nama_surat_sakit  TEXT,
    nama_poli         TEXT,
    nama_rs           TEXT,
    golongan_darah    TEXT,
    tinggi_badan      NUMERIC(5,1),
    berat_badan       NUMERIC(5,1),
    bmi               NUMERIC(4,1),
    tensi             TEXT,
    gula_darah        TEXT,
    suhu              TEXT,
    vitals_updated_at TIMESTAMPTZ,
    vitals_updated_by_role TEXT,
    kolesterol        TEXT,
    asam_urat         TEXT,
    penyakit          JSONB,
    obat              JSONB,
    keluhan           TEXT,
    faktor_risiko     TEXT,
    penyakit_text     TEXT,
    diagnosa          TEXT,
    konsultasi        TEXT,
    saran             TEXT,
    anjuran           TEXT,
    kesimpulan        kesimpulan_status DEFAULT 'fit',
    intervensi                  JSONB,
    tanggal_pemeriksaan_lanjutan DATE,
    file_surat_rujukan_intervensi TEXT,
    nama_surat_rujukan_intervensi TEXT,
    catatan_intervensi          TEXT,
    butuh_tindak_lanjut         BOOLEAN DEFAULT FALSE,
    file_hasil_tindak_lanjut    TEXT,
    nama_hasil_tindak_lanjut    TEXT,
    tindak_lanjut_selesai       BOOLEAN DEFAULT FALSE,
    tindak_lanjut_selesai_kuratif       BOOLEAN DEFAULT FALSE,
    catatan_intervensi_kuratif          TEXT,
    file_hasil_tindak_lanjut_kuratif    TEXT,
    nama_hasil_tindak_lanjut_kuratif    TEXT,
    tindak_lanjut_selesai_rehabilitatif       BOOLEAN DEFAULT FALSE,
    catatan_intervensi_rehabilitatif          TEXT,
    file_hasil_tindak_lanjut_rehabilitatif    TEXT,
    nama_hasil_tindak_lanjut_rehabilitatif    TEXT,
    created_by_role   TEXT DEFAULT 'klinik',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABEL APP_NOTIFICATIONS (SESUAI LARAVEL)
CREATE TABLE public.app_notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES public.users(id) ON DELETE CASCADE,
    target_role TEXT,       -- 'admin' | 'klinik' | 'karyawan' | 'all'
    type        TEXT DEFAULT 'general',
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    url         TEXT,
    icon_type   TEXT DEFAULT 'bell',
    is_read     BOOLEAN DEFAULT FALSE,
    read_at     TIMESTAMPTZ,
    data        JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL OBATS (Master Data Obat)
CREATE TABLE public.obats (
    id         BIGSERIAL PRIMARY KEY,
    nama_obat  TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL MEDICAL_SUGGESTIONS
CREATE TABLE public.medical_suggestions (
    id         BIGSERIAL PRIMARY KEY,
    type       VARCHAR(50) NOT NULL,
    text       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type, text)
);

-- 9. INDEXES
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_nik ON public.users(nik);
CREATE INDEX idx_mcu_nik ON public.mcu_records(nik);
CREATE INDEX idx_mini_mcu_nik ON public.mini_mcu_records(nik);
CREATE INDEX idx_notif_user ON public.app_notifications(user_id);
CREATE INDEX idx_notif_role ON public.app_notifications(target_role);
CREATE INDEX idx_notif_read ON public.app_notifications(is_read);
CREATE INDEX idx_suggestions_type ON public.medical_suggestions(type);

-- 10. RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcu_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_mcu_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.mcu_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.mini_mcu_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.app_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.obats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All" ON public.medical_suggestions FOR ALL USING (true) WITH CHECK (true);

-- 11. AUTO-UPDATE TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_mcu BEFORE UPDATE ON public.mcu_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_mini_mcu BEFORE UPDATE ON public.mini_mcu_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notif BEFORE UPDATE ON public.app_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 12. ENABLE REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;

-- 13. SEED: Master Obat (27 item)
INSERT INTO public.obats (nama_obat) VALUES
  ('Allopurinol 100 mg'),('Alpara'),('Ambroxol'),('Amlodipin 5 mg'),
  ('Amoxicilin'),('Asam Mefenamat'),('Becomzet'),('Betahistine'),
  ('Cetirizine'),('Degirol'),('Dexamethasone (Dex/Dexa)'),('Donperidon'),
  ('Lansoprazole'),('Methylprednisolone 4 mg'),('Methylprednisolone 8 mg'),
  ('Mucofek'),('Neurodex'),('New Diatab'),('Omeprazole'),('Omz'),
  ('PCT'),('Polysilane'),('Ranitidine'),('Sanmol'),('Scopma'),
  ('Tremenza'),('Salep Hydrocortisone')
ON CONFLICT (nama_obat) DO NOTHING;

-- 14. SEED: Demo Users (password = 'password' — HASH ini di aplikasi!)
INSERT INTO public.users (name, email, nik, role, password) VALUES
  ('Admin Layanan Kesehatan', 'admin@ptpn.co.id', NULL, 'admin', 'password'),
  ('Tim Medis Klinik', 'klinik@ptpn.co.id', NULL, 'klinik', 'password'),
  ('Ahmad Santoso', 'karyawan@ptpn.co.id', 'EMP-2023-0142', 'karyawan', 'password')
ON CONFLICT (email) DO NOTHING;
```

---

## 4. FIX #2: TypeScript Types — Sesuaikan dengan Laravel

**GANTI** `src/types/mcu.ts` dengan:

```typescript
// src/types/mcu.ts — SELARAS dengan database Laravel PTPN-LK3

export type UserRole = 'admin' | 'klinik' | 'karyawan';

export interface User {
  id: number;
  name: string;
  email: string;
  nik: string | null;
  divisi: string | null;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

// Kesimpulan HARUS sama persis dengan Laravel enum
export type KesimpulanStatus = 'fit' | 'fit_dengan_catatan' | 'sementara_tidak_fit';

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
  // Identitas
  nama_lengkap: string;
  nik: string;
  departemen: string | null;
  kategori_peserta: string | null;
  divisi: string | null;
  jabatan: string | null;
  nomor_inhealth: string | null;
  nomor_bpjs: string | null;
  jenis_kelamin: 'Laki-laki' | 'Perempuan' | null;
  nama_dokter: string | null;
  nama_perawat: string | null;
  umur: number | null;
  tanggal_pemeriksaan: string;  // DATE
  jam_pemeriksaan: string | null; // TIME
  foto: string | null;

  // Dokumen
  file_dokumen: string | null;
  nama_dokumen: string | null;
  file_rujukan: string | null;
  nama_rujukan_file: string | null;
  file_surat_sakit: string | null;
  nama_surat_sakit: string | null;
  nama_poli: string | null;
  nama_rs: string | null;

  // Vitals (KOLOM TERPISAH)
  golongan_darah: string | null;
  tinggi_badan: number | null;
  berat_badan: number | null;
  bmi: number | null;
  tensi: string | null;
  gula_darah: string | null;
  suhu: string | null;
  vitals_updated_at: string | null;
  vitals_updated_by_role: string | null;
  kolesterol: string | null;
  asam_urat: string | null;

  // Hasil Pemeriksaan
  penyakit: string[] | null;     // JSONB array
  obat: string[] | null;         // JSONB array
  keluhan: string | null;
  faktor_risiko: string | null;
  penyakit_text: string | null;

  // Catatan Medis 4 Kuadran
  diagnosa: string | null;
  konsultasi: string | null;
  saran: string | null;
  anjuran: string | null;

  // Kesimpulan
  kesimpulan: KesimpulanStatus;

  // Intervensi
  intervensi: string[] | null;    // JSONB array
  tanggal_pemeriksaan_lanjutan: string | null;
  file_surat_rujukan_intervensi: string | null;
  nama_surat_rujukan_intervensi: string | null;
  catatan_intervensi: string | null;

  // Tindak Lanjut
  butuh_tindak_lanjut: boolean;
  file_hasil_tindak_lanjut: string | null;
  nama_hasil_tindak_lanjut: string | null;
  tindak_lanjut_selesai: boolean;

  // Tindak Lanjut per Kategori
  tindak_lanjut_selesai_kuratif: boolean;
  catatan_intervensi_kuratif: string | null;
  file_hasil_tindak_lanjut_kuratif: string | null;
  nama_hasil_tindak_lanjut_kuratif: string | null;
  tindak_lanjut_selesai_rehabilitatif: boolean;
  catatan_intervensi_rehabilitatif: string | null;
  file_hasil_tindak_lanjut_rehabilitatif: string | null;
  nama_hasil_tindak_lanjut_rehabilitatif: string | null;

  // Metadata
  created_by_role: string;
  created_at: string;
  updated_at: string;
}

// MiniMcuRecord IDENTIK dengan McuRecord (sesuai Laravel)
export interface MiniMcuRecord extends McuRecord {}

export interface AppNotification {
  id: number;
  user_id: number | null;
  target_role: string | null;
  type: string;
  title: string;
  message: string;
  url: string | null;
  icon_type: string;
  is_read: boolean;
  read_at: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Obat {
  id: number;
  nama_obat: string;
}
```

> [!IMPORTANT]
> **Perubahan besar:**
> - `nama_karyawan` → `nama_lengkap` (sesuai Laravel)
> - `status_kebugaran` → `kesimpulan` (sesuai Laravel enum)
> - `vitals` JSONB → kolom terpisah (`tensi`, `gula_darah`, `suhu`, dll)
> - `dokter` → `nama_dokter`
> - `perawat` → `nama_perawat`
> - `tanggal_pemeriksaan` tipe `string` → bisa tetap string tapi formatnya `DATE` (YYYY-MM-DD)
> - `MiniMcuRecord` sekarang **IDENTIK** dengan `McuRecord` (extend)
> - Semua field intervensi & tindak lanjut ditambahkan

---

## 5. FIX #3: Auth System — Perbaiki Keamanan & Flow

### Masalah Saat Ini:
1. Password disimpan **plain text** → ❌ Sangat tidak aman!
2. Tidak pakai Supabase Auth → Session via localStorage → Rentan XSS
3. Tabel `profiles` → Harus `users`

### Solusi — 2 Opsi:

#### Opsi A: Tetap Pakai Custom Auth (Paling Cepat)
Tetap pakai tabel `users` dengan login manual, tapi **HASH password** pakai bcrypt:

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

Update `authService.ts`:
- Saat register: `bcrypt.hashSync(password, 10)`
- Saat login: `bcrypt.compareSync(inputPassword, hashedPassword)`
- Ganti semua `from('profiles')` → `from('users')`

#### Opsi B: Migrasi ke Supabase Auth (Direkomendasikan)
Pakai `@supabase/ssr` untuk server-side auth. Install:

```bash
npm install @supabase/ssr
```

Buat Supabase server client + middleware (lihat dokumen migrasi sebelumnya).

### Flow Login (Sesuai Laravel):

```
1. User pilih tab role (Admin | Klinik | Karyawan)
2. Input:
   - Admin/Klinik: Email + Password
   - Karyawan: Email ATAU NIK + Password
3. Query tabel users WHERE email ILIKE :input OR nik ILIKE :input
4. VALIDASI:
   a. User ditemukan? Jika TIDAK → Error "Akun tidak ditemukan"
   b. Role match? user.role HARUS === role yang dipilih di tab
      Jika TIDAK → Error "Peran tidak sesuai"
   c. Password match? (bcrypt compare)
      Jika TIDAK → Error "Kata sandi tidak sesuai"
5. Set session
6. Redirect ke dashboard sesuai role
```

---

## 6. FIX #4: Middleware Route Protection (RBAC)

**BUAT FILE BARU:** `src/middleware.ts`

Ini WAJIB ada agar user tidak bisa akses halaman role lain:

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Baca session dari cookie/localStorage
  // (Sesuaikan dengan metode auth yang dipilih)
  // Contoh sederhana: cek cookie 'ptpn_user_role'
  const userRole = request.cookies.get('ptpn_user_role')?.value;

  // Public routes
  const publicPaths = ['/login', '/register'];
  if (publicPaths.some(p => pathname.startsWith(p))) {
    if (userRole) {
      // Sudah login → redirect ke dashboard
      const dashMap: Record<string, string> = {
        admin: '/admin/dashboard',
        klinik: '/klinik/dashboard',
        karyawan: '/employee/dashboard',
      };
      return NextResponse.redirect(new URL(dashMap[userRole] || '/login', request.url));
    }
    return NextResponse.next();
  }

  // Protected routes — harus login
  if (!userRole) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // RBAC Guard
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    const dash = userRole === 'klinik' ? '/klinik/dashboard' : '/employee/dashboard';
    return NextResponse.redirect(new URL(dash, request.url));
  }
  if (pathname.startsWith('/klinik') && userRole !== 'klinik') {
    const dash = userRole === 'admin' ? '/admin/dashboard' : '/employee/dashboard';
    return NextResponse.redirect(new URL(dash, request.url));
  }
  if (pathname.startsWith('/employee') && userRole !== 'karyawan') {
    const dash = userRole === 'admin' ? '/admin/dashboard' : '/klinik/dashboard';
    return NextResponse.redirect(new URL(dash, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|images|api).*)'],
};
```

> [!WARNING]
> Di AuthContext login handler, kamu juga perlu SET cookie:
> ```typescript
> document.cookie = `ptpn_user_role=${user.role}; path=/; max-age=${60*60*24*7}`;
> ```
> Dan saat logout:
> ```typescript
> document.cookie = 'ptpn_user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
> ```

---

## 7. FIX #5: Halaman & Route yang Hilang

### Halaman yang HARUS dibuat:

| Halaman | Path | Deskripsi |
|:---|:---|:---|
| **Settings** | `src/app/settings/page.tsx` | Form ubah profil (nama, email, NIK, divisi) + form ubah password |
| **Notifications** | `src/app/notifications/page.tsx` | Pusat notifikasi lengkap, filter Semua/Belum Dibaca |
| **Karyawan Unggah Data** | `src/app/employee/unggah-data/page.tsx` | Upload dokumen MCU mandiri, upload hasil tindak lanjut |
| **Klinik Intervensi** | `src/app/klinik/intervensi/page.tsx` | Dashboard intervensi klinik (mirror dari admin) |

### Route yang PERLU diperbaiki:

| Current Next.js | Seharusnya (Sesuai Laravel) | Action |
|:---|:---|:---|
| `/admin/intervensi` | `/admin/intervensi-layanan-kesehatan` | Rename folder |
| `/admin/detail-mcu` | `/admin/mcu/[id]` | Sudah ada, hapus `detail-mcu` |
| `/admin/edit-data/[id]` | `/admin/mcu/[id]/edit` | Pindahkan ke nested route |
| `/klinik/detail-mini-mcu` | `/klinik/mcu/[id]` | Buat route baru |
| `/klinik/edit-data/[id]` | `/klinik/mcu/[id]/edit` | Pindahkan |
| `/klinik/tambah-pemeriksaan` | `/klinik/tambah-pemeriksaan/[id]` | Tambah dynamic param |
| `—` (TIDAK ADA) | `/klinik/intervensi-layanan-kesehatan` | BUAT BARU |
| `—` (TIDAK ADA) | `/employee/unggah-data` | BUAT BARU |
| `—` (TIDAK ADA) | `/settings` | BUAT BARU |
| `—` (TIDAK ADA) | `/notifications` | BUAT BARU |

### Root Page (`/`) Fix:

```typescript
// src/app/page.tsx — Seharusnya cek auth dulu
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else {
      const dashMap: Record<string, string> = {
        admin: '/admin/dashboard',
        klinik: '/klinik/dashboard',
        karyawan: '/employee/dashboard',
      };
      router.replace(dashMap[user.role] || '/login');
    }
  }, [user, router]);

  return null;
}
```

---

## 8. FIX #6: Service Layer — Tambahkan Logic yang Missing

### mcuService.ts — Perubahan yang Diperlukan:

1. **Ganti semua** `from('profiles')` → `from('users')`
2. **Ganti semua** `from('notifications')` → `from('app_notifications')`
3. **Ganti field mapping:** `nama_karyawan` → `nama_lengkap`, `dokter` → `nama_dokter`, dll
4. **Tambahkan fungsi baru:**

```typescript
// Fungsi yang HARUS ditambahkan ke mcuService.ts:

// Auto-fill karyawan dari DB saat input NIK di form
export async function autoFillKaryawan(nik: string) {
  const client = getSupabaseClient();
  if (!client || !nik) return null;

  // Cari dari mcu_records terakhir
  const { data } = await client
    .from('mcu_records')
    .select('nama_lengkap, nik, divisi, jabatan, departemen, nomor_inhealth, nomor_bpjs, jenis_kelamin, umur, golongan_darah, foto')
    .ilike('nik', nik.trim())
    .order('tanggal_pemeriksaan', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

// Fetch patient history (gabungkan MCU + Mini MCU berdasarkan NIK)
export async function fetchPatientHistory(nik: string, namaLengkap: string) {
  const client = getSupabaseClient();
  if (!client) return [];

  const [mcuRes, miniRes] = await Promise.all([
    client.from('mcu_records').select('*')
      .or(`nik.ilike.${nik},nama_lengkap.ilike.${namaLengkap}`)
      .order('tanggal_pemeriksaan', { ascending: true }),
    client.from('mini_mcu_records').select('*')
      .or(`nik.ilike.${nik},nama_lengkap.ilike.${namaLengkap}`)
      .order('tanggal_pemeriksaan', { ascending: true }),
  ]);

  const allRecords = [
    ...(mcuRes.data || []).map(r => ({ ...r, source: 'mcu' as const })),
    ...(miniRes.data || []).map(r => ({ ...r, source: 'mini_mcu' as const })),
  ].sort((a, b) => new Date(a.tanggal_pemeriksaan).getTime() - new Date(b.tanggal_pemeriksaan).getTime());

  return allRecords;
}

// Kalkulasi BMI
export function calculateBMI(tinggiCm: number, beratKg: number): number {
  if (!tinggiCm || !beratKg || tinggiCm <= 0) return 0;
  const tinggiM = tinggiCm / 100;
  return Math.round((beratKg / (tinggiM * tinggiM)) * 10) / 10;
}

export function getBMIKlasifikasi(bmi: number): string {
  if (!bmi) return '-';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25.0) return 'Normal';
  if (bmi < 30.0) return 'Overweight';
  return 'Obesitas';
}

// Dispatch notifikasi (SESUAI LARAVEL NotificationService)
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

  await client.from('app_notifications').insert({
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
}

// Notifikasi helpers (mirror Laravel NotificationService)
export async function notifyMcuAdminCreated(record: McuRecord) {
  // Cari karyawan di tabel users berdasarkan NIK
  const client = getSupabaseClient();
  if (!client) return;

  const { data: employee } = await client
    .from('users')
    .select('id')
    .eq('role', 'karyawan')
    .ilike('nik', record.nik)
    .maybeSingle();

  if (employee) {
    await sendNotification({
      userId: employee.id,
      type: 'mcu',
      title: 'Hasil MCU Berkala Tersedia',
      message: `Hasil pemeriksaan MCU berkala Anda (${record.tanggal_pemeriksaan}) telah dicatat oleh Admin.`,
      url: '/employee/hasil-mcu',
      iconType: 'mcu',
      data: { record_id: record.id, nik: record.nik },
    });
  }
}
```

---

## 9. FIX #7: Notifikasi Real-Time (Supabase Realtime)

Ganti AJAX polling → Supabase Realtime subscription. Buat hook:

```typescript
// src/hooks/useNotifications.ts
'use client';
import { useEffect, useState, useCallback } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import { AppNotification, User } from '@/types/mcu';

export function useNotifications(user: User | null) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const client = getSupabaseClient();

  const fetchLatest = useCallback(async () => {
    if (!client || !user) return;
    const { data } = await client
      .from('app_notifications')
      .select('*')
      .or(`user_id.eq.${user.id},target_role.eq.${user.role},target_role.eq.all`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) setNotifications(data as AppNotification[]);

    const { count } = await client
      .from('app_notifications')
      .select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${user.id},target_role.eq.${user.role},target_role.eq.all`)
      .eq('is_read', false);

    setUnreadCount(count || 0);
  }, [client, user]);

  useEffect(() => {
    fetchLatest();

    if (!client || !user) return;

    // Supabase Realtime subscription
    const channel = client
      .channel('notif-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'app_notifications',
      }, () => {
        fetchLatest(); // Re-fetch on new notification
      })
      .subscribe();

    return () => { client.removeChannel(channel); };
  }, [client, user, fetchLatest]);

  return { unreadCount, notifications, refetch: fetchLatest };
}
```

---

## 10. FIX #8: Sidebar Navigation — Sesuaikan dengan Laravel

### Klinik sidebar MISSING: "Dashboard Intervensi"

Tambahkan di Sidebar.tsx (blok klinik menu), setelah "Inhouse Clinic Overview":

```tsx
<Link href="/klinik/intervensi-layanan-kesehatan" ...>
  <Heart className="w-5 h-5" />
  <span>Dashboard Intervensi</span>
</Link>
```

### Karyawan sidebar MISSING: "Unggah Data MCU"

Tambahkan di Sidebar.tsx (blok employee menu), setelah "Inhouse Clinic":

```tsx
<Link href="/employee/unggah-data" ...>
  <Upload className="w-5 h-5" />
  <span>Unggah Data MCU</span>
</Link>
```

### Settings button → Link to page

Ganti `alert('Pengaturan Akun')` dengan:

```tsx
<Link href="/settings" className="...">
  <Settings className="w-4 h-4" />
  <span>Pengaturan Akun</span>
</Link>
```

---

## 11. FIX #9: Fitur Intervensi Layanan Kesehatan

### Checklist Items (SESUAI LARAVEL)

```typescript
// src/lib/constants.ts

export const INTERVENSI_PROMOTIF = [
  'Health Talk', 'Sekantor', 'Gym', 'Medical Check Up',
  'Healthy Food', 'Konsultasi Kesehatan', 'Weight Loss Challenge', 'Vaksin Hepatitis B',
];

export const INTERVENSI_KURATIF = [
  'Konsultasi Lanjutan', 'Employee Health Counseling Program', 'Kesegaran',
];

export const INTERVENSI_REHABILITATIF = [
  'Monitoring hasil tindak lanjut oleh dokter ahli',
];

export const PENYAKIT_LIST = [
  'Anemia', 'Diabetes Mellitus', 'Hipertensi', 'Hipertensi Tingkat 1',
  'Hipertensi Tingkat 2', 'Kolesterol', 'Asam Urat Tinggi',
  'SGOT & SGPT Meningkat', 'Gangguan Fungsi Hati',
  'Hepatitis B (Non Imun)', 'Hepatitis C', 'Gangguan Refraksi Mata',
  'Gangguan Pendengaran', 'Gangguan Ginjal', 'Infeksi Saluran Kemih',
  'Gangguan Tiroid', 'Obesitas', 'Overweight',
  'TBC / TB Paru', 'ISPA', 'Bronkitis', 'Asma', 'Jantung Koroner',
  'Gangguan Lambung / GERD', 'Dermatitis / Eksim', 'Osteoarthritis',
  'Hernia', 'Vertigo',
];
```

### Form MCU Card 4 (Intervensi) — HARUS DIBUAT

Di form tambah/edit data admin, tambahkan card ke-4 dengan:
- 3 grup checkbox (Promotif, Kuratif, Rehabilitatif)
- Jika Kuratif dipilih → tampilkan input `tanggal_pemeriksaan_lanjutan`
- Jika Rehabilitatif dipilih → tampilkan upload `file_surat_rujukan_intervensi`

---

## 12. FIX #10: File Upload ke Supabase Storage

### Install dependency:
```bash
# Tidak perlu install tambahan, @supabase/supabase-js sudah support storage
```

### Buat Bucket di Supabase Dashboard:
1. Storage → New Bucket → Name: `medical-files` → Public: true
2. Folder structure: `fotos/`, `dokumen/`, `rujukan/`, `surat-sakit/`, `intervensi/`

### Upload helper:
```typescript
// src/lib/upload.ts
import { getSupabaseClient } from './supabase';

export async function uploadMedicalFile(file: File, folder: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const fileName = `${folder}/${Date.now()}_${file.name}`;
  const { data, error } = await client.storage
    .from('medical-files')
    .upload(fileName, file);

  if (error) { console.error('Upload error:', error); return null; }
  return data.path;
}

export function getMedicalFileUrl(path: string): string {
  const client = getSupabaseClient();
  if (!client || !path) return '';
  const { data } = client.storage.from('medical-files').getPublicUrl(path);
  return data.publicUrl;
}
```

---

## 13. REFERENSI: Routing Lengkap Laravel vs Next.js

| Laravel URL | Next.js Path | Status |
|:---|:---|:---|
| `GET /` | `app/page.tsx` | ✅ Ada (fix redirect logic) |
| `GET /login` | `app/login/page.tsx` | ✅ Ada |
| `GET /register` | `app/register/page.tsx` | ✅ Ada |
| `GET /admin/dashboard` | `app/admin/dashboard/page.tsx` | ✅ Ada |
| `GET /admin/intervensi-layanan-kesehatan` | `app/admin/intervensi/page.tsx` | ⚠️ Path berbeda, rename |
| `GET /admin/rekapan-mcu` | `app/admin/rekapan-mcu/page.tsx` | ✅ Ada |
| `GET /admin/tambah-data` | `app/admin/tambah-data/page.tsx` | ✅ Ada |
| `GET /admin/ekspor-excel` | `app/admin/ekspor-excel/page.tsx` | ✅ Ada |
| `GET /admin/mcu/{id}` | `app/admin/mcu/[id]/page.tsx` | ✅ Ada |
| `GET /admin/mcu/{id}/edit` | `app/admin/edit-data/[id]/page.tsx` | ⚠️ Path berbeda |
| `GET /klinik/dashboard` | `app/klinik/dashboard/page.tsx` | ✅ Ada |
| `GET /klinik/intervensi-layanan-kesehatan` | — | ❌ TIDAK ADA |
| `GET /klinik/rekapan-mini-mcu` | `app/klinik/rekapan-mini-mcu/page.tsx` | ✅ Ada |
| `GET /klinik/tambah-data` | `app/klinik/tambah-data/page.tsx` | ✅ Ada |
| `GET /klinik/ekspor-excel` | `app/klinik/ekspor-excel/page.tsx` | ✅ Ada |
| `GET /klinik/mcu/{id}` | `app/klinik/detail-mini-mcu/page.tsx` | ⚠️ Bukan dynamic route |
| `GET /klinik/mcu/{id}/edit` | `app/klinik/edit-data/[id]/page.tsx` | ⚠️ Path berbeda |
| `GET /klinik/tambah-pemeriksaan/{id}` | `app/klinik/tambah-pemeriksaan/page.tsx` | ⚠️ Missing `[id]` param |
| `GET /karyawan/dashboard` | `app/employee/dashboard/page.tsx` | ✅ Ada |
| `GET /karyawan/hasil-mcu` | `app/employee/hasil-mcu/page.tsx` | ✅ Ada |
| `GET /karyawan/hasil-mini-mcu` | `app/employee/hasil-mini-mcu/page.tsx` | ✅ Ada |
| `GET /karyawan/unggah-data` | — | ❌ TIDAK ADA |
| `GET /settings` | — | ❌ TIDAK ADA |
| `GET /notifications` | — | ❌ TIDAK ADA |

---

## 14. REFERENSI: CRUD Rules per Role

| Role | CREATE | READ | UPDATE | DELETE |
|:---|:---|:---|:---|:---|
| **Admin** | ✅ `mcu_records` | ✅ `mcu_records` + `mini_mcu_records` | ✅ `mcu_records` | ✅ `mcu_records` |
| **Klinik** | ✅ `mini_mcu_records` | ✅ `mini_mcu_records` | ✅ `mini_mcu_records` + tindak lanjut `mcu_records` | ❌ TIDAK BISA |
| **Karyawan** | ❌ | ✅ Read-only (filtered by NIK) | ✅ Upload dokumen + update vitals | ❌ |

> [!CAUTION]
> **Karyawan query data berdasarkan NIK/nama_lengkap, BUKAN user_id!**
> ```sql
> WHERE LOWER(nik) = LOWER(:user_nik) OR LOWER(nama_lengkap) = LOWER(:user_name)
> ```

---

## 15. REFERENSI: Alur Sistem (System Flow) dari Laravel

### Input MCU oleh Admin
```
Admin → /admin/tambah-data → Form 5 Card:
  Card 1: Biodata (nama, NIK, departemen, jabatan, dokter, perawat, foto)
  Card 2: Vitals (TB, BB, auto-BMI, tensi, gula darah, suhu, kolesterol, asam urat)
  Card 3: Checklist 28 penyakit + kesimpulan (fit/catatan/tidak fit) + catatan 4 kuadran
  Card 4: Intervensi (Promotif, Kuratif, Rehabilitatif) — CHECKBOX
  Card 5: Obat + upload dokumen/rujukan/surat sakit
→ INSERT ke mcu_records
→ Kirim notifikasi ke Karyawan (jika NIK match di users)
→ Redirect ke /admin/dashboard
```

### Input Mini MCU oleh Klinik
```
Klinik → /klinik/tambah-data → Form (tanpa Card 4 Intervensi)
→ INSERT ke mini_mcu_records
→ Kirim notifikasi ke Karyawan + Admin
→ Redirect ke /klinik/dashboard
```

### Tambah Pemeriksaan Lanjutan (Klinik)
```
Klinik → Klik "Tambah Pemeriksaan" di rekapan → /klinik/tambah-pemeriksaan/[id]
→ Form PRE-FILLED biodata dari record sebelumnya (query by id)
→ INSERT sebagai record BARU di mini_mcu_records
```

### Notifikasi
```
Semua halaman → Navbar bell icon → badge unread count (Supabase Realtime)
Klik bell → popup dropdown ringkasan
Klik notif → tandai dibaca → redirect ke halaman terkait
"Tandai Semua Dibaca" → bulk update
"Lihat Semua" → /notifications
```

---

## 16. REFERENSI: Desain & Color Palette

| Elemen | Warna |
|:---|:---|
| Primary (header, sidebar, button) | `#064E3B` (Forest Green) |
| Secondary | `#065F46`, `#047857` |
| Sidebar background | `#eaf4ee` |
| Fit badge | `bg-emerald-100 text-emerald-700` |
| Fit dengan Catatan badge | `bg-amber-100 text-amber-700` |
| Sementara Tidak Fit badge | `bg-red-100 text-red-700` |
| Intervensi Promotif | Hijau |
| Intervensi Kuratif | Oranye/Kuning |
| Intervensi Rehabilitatif | Ungu |

---

## 17. REFERENSI: Konstanta & Data Master

### Master Obat (27 item — dari tabel `obats`)
```
Allopurinol 100 mg, Alpara, Ambroxol, Amlodipin 5 mg, Amoxicilin,
Asam Mefenamat, Becomzet, Betahistine, Cetirizine, Degirol,
Dexamethasone (Dex/Dexa), Donperidon, Lansoprazole,
Methylprednisolone 4 mg, Methylprednisolone 8 mg, Mucofek, Neurodex,
New Diatab, Omeprazole, Omz, PCT, Polysilane, Ranitidine, Sanmol,
Scopma, Tremenza, Salep Hydrocortisone
```

### Demo Accounts
| Role | Email | NIK | Password |
|:---|:---|:---|:---|
| Admin | `admin@ptpn.co.id` | — | `password` |
| Klinik | `klinik@ptpn.co.id` | — | `password` |
| Karyawan | `karyawan@ptpn.co.id` | `EMP-2023-0142` | `password` |

---

## 18. CHECKLIST PERBAIKAN (Prioritas)

### 🔴 Prioritas TINGGI (Harus dikerjakan pertama)
- [ ] **Jalankan SQL schema baru** di Supabase SQL Editor (hapus schema lama)
- [ ] **Ganti `src/types/mcu.ts`** dengan types baru yang selaras
- [ ] **Update `authService.ts`**: Ganti `profiles` → `users`, hash password
- [ ] **Update `mcuService.ts`**: Ganti nama field, ganti `notifications` → `app_notifications`
- [ ] **Buat `src/middleware.ts`** untuk RBAC route protection
- [ ] **Update root `page.tsx`**: Cek auth sebelum redirect
- [ ] **Update McuContext.tsx**: Sesuaikan dengan types baru

### 🟡 Prioritas SEDANG
- [ ] Tambahkan halaman `/settings`
- [ ] Tambahkan halaman `/notifications`
- [ ] Tambahkan halaman `/employee/unggah-data`
- [ ] Tambahkan halaman `/klinik/intervensi-layanan-kesehatan`
- [ ] Update sidebar: tambahkan menu Intervensi (klinik), Unggah Data (karyawan)
- [ ] Fix sidebar settings button → Link to `/settings`
- [ ] Update form tambah data: tambahkan Card 4 (Intervensi)
- [ ] Implementasi auto-fill karyawan dari DB saat input NIK
- [ ] Implementasi auto-BMI di form
- [ ] Fix naming route paths agar match Laravel

### 🟢 Prioritas RENDAH
- [ ] Implementasi notifikasi real-time (Supabase Realtime)
- [ ] Implementasi file upload (Supabase Storage)
- [ ] Implementasi ekspor Excel nyata (bukan hanya UI)
- [ ] Implementasi impor Excel/CSV
- [ ] Tambahkan badge count intervensi di sidebar
- [ ] Server-side pagination
- [ ] Grafik tren patient history yang real

---

*Dokumen dibuat 2 September 2026 berdasarkan analisis detail perbandingan:*
*- Project Laravel: `PTPN-LK3` (sumber kebenaran)*
*- Project Next.js: `ptpn-nextjs` (target perbaikan)*
