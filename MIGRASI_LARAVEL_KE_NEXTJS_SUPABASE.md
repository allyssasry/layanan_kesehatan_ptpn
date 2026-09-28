# 📋 PANDUAN MIGRASI LENGKAP — Laravel PTPN-LK3 → Next.js (TypeScript) + Supabase (PostgreSQL)

> **Dokumen ini adalah blueprint lengkap untuk memigrasikan project Sistem Informasi Layanan Kesehatan PTPN 3 dari Laravel 12 (PHP + MySQL + Blade) ke Next.js (TypeScript) + Supabase (PostgreSQL).**
> Sisipkan dokumen ini setiap kali memberikan instruksi ke AI Assistant di workspace Next.js baru kamu agar semua fitur, alur, routing, role, CRUD, dan desain halaman selaras dengan project Laravel aslinya.

---

## DAFTAR ISI

1. [Ringkasan Project](#1-ringkasan-project)
2. [Tech Stack Lama vs Baru](#2-tech-stack-lama-vs-baru)
3. [Panduan Setup Project Next.js Baru](#3-panduan-setup-project-nextjs-baru)
4. [Integrasi Database Supabase (PostgreSQL)](#4-integrasi-database-supabase-postgresql)
5. [Database Schema — Definisi SQL PostgreSQL](#5-database-schema--definisi-sql-postgresql)
6. [Seed Data (Data Awal)](#6-seed-data-data-awal)
7. [Sistem Autentikasi & Role-Based Access](#7-sistem-autentikasi--role-based-access)
8. [Routing Lengkap — Mapping Laravel → Next.js](#8-routing-lengkap--mapping-laravel--nextjs)
9. [Middleware & Route Protection](#9-middleware--route-protection)
10. [CRUD Operations — Per Role](#10-crud-operations--per-role)
11. [Arsitektur Service Layer — Next.js](#11-arsitektur-service-layer--nextjs)
12. [Sistem Notifikasi Real-Time](#12-sistem-notifikasi-real-time)
13. [Sistem Intervensi Layanan Kesehatan](#13-sistem-intervensi-layanan-kesehatan)
14. [Ekspor Excel & Impor Data](#14-ekspor-excel--impor-data)
15. [File Upload & Storage (Supabase Storage)](#15-file-upload--storage-supabase-storage)
16. [Desain UI & Komponen per Halaman](#16-desain-ui--komponen-per-halaman)
17. [Sidebar Navigation per Role](#17-sidebar-navigation-per-role)
18. [Validation Rules (Zod Schema)](#18-validation-rules-zod-schema)
19. [Alur Sistem (System Flow)](#19-alur-sistem-system-flow)
20. [Catatan Teknis Penting](#20-catatan-teknis-penting)

---

## 1. RINGKASAN PROJECT

**Nama:** Layanan Kesehatan PTPN 3 (PTPN-LK3)
**Tujuan:** Aplikasi web portal untuk mengelola Rekam Medis / Pemeriksaan Kesehatan Berkala karyawan di PT Perkebunan Nusantara III (Persero).
**Domain:** Healthcare / Occupational Health — Medical Check-Up perusahaan.

### Modul Utama:
1. **MCU Berkala (Admin)** — Pemeriksaan kesehatan tahunan lengkap dengan 28+ parameter klinis.
2. **Mini MCU / Rawat Jalan (Klinik Inhouse)** — Pemeriksaan harian di klinik perusahaan.
3. **Portal Karyawan** — Karyawan melihat hasil MCU & Mini MCU, grafik tren kesehatan, upload dokumen MCU mandiri, update vital signs.
4. **Sistem Intervensi** — Kategorisasi tindak lanjut: Promotif & Preventif, Kuratif, Rehabilitatif.
5. **Ekspor Excel (.xlsx)** — Laporan berformat rapi dengan kop PTPN 3.
6. **Impor Data Excel/CSV** — Upload massal data pemeriksaan.
7. **Notifikasi Real-Time** — Pemberitahuan berbasis role.

---

## 2. TECH STACK LAMA vs BARU

| Layer | Laravel (Lama) | Next.js (Baru) |
|:---|:---|:---|
| **Framework** | Laravel 12.x (PHP >= 8.2) | Next.js 15 (App Router) + TypeScript |
| **Database** | MySQL (`db_ptpn`) | PostgreSQL via **Supabase** |
| **ORM** | Eloquent | Prisma ORM / Supabase Client (`@supabase/supabase-js`) |
| **Auth** | Laravel Session Auth (manual) | **Supabase Auth** (email/password, session-based) |
| **Frontend** | Blade Templates + Tailwind 4 + Chart.js | React Components + Tailwind CSS + Recharts/Chart.js |
| **File Storage** | `storage/app/public` (local disk) | **Supabase Storage** (buckets) |
| **Excel Engine** | PhpSpreadsheet | `exceljs` atau `xlsx` (npm package) |
| **API** | Server-side rendered (Blade) | Next.js API Routes + Server Actions |
| **Realtime** | AJAX polling (10 detik) | **Supabase Realtime** (WebSocket subscriptions) |
| **Session/Cache** | Database-driven | Supabase Auth + Next.js middleware |
| **Timezone** | Asia/Jakarta (WIB) | Tetap Asia/Jakarta (WIB) |

---

## 3. PANDUAN SETUP PROJECT NEXT.JS BARU

### 3.1 Inisialisasi Project

```bash
# Di folder workspace baru
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm

# Install dependencies utama
npm install @supabase/supabase-js @supabase/ssr prisma @prisma/client
npm install zod react-hook-form @hookform/resolvers
npm install recharts                    # untuk chart (pengganti Chart.js)
npm install exceljs file-saver          # untuk ekspor Excel
npm install date-fns                    # untuk format tanggal Indonesia
npm install lucide-react                # untuk icon (pengganti inline SVG)
npm install sonner                      # untuk toast notification
npm install @tanstack/react-table       # untuk tabel data (opsional)

# Dev dependencies
npm install -D prisma @types/file-saver
```

### 3.2 Struktur Folder Next.js (App Router)

```
src/
├── app/
│   ├── (auth)/                         # Halaman publik (guest)
│   │   ├── login/page.tsx              # Halaman login
│   │   └── register/page.tsx           # Halaman registrasi
│   ├── (protected)/                    # Halaman yang butuh auth
│   │   ├── admin/
│   │   │   ├── dashboard/page.tsx      # Dashboard admin
│   │   │   ├── intervensi-layanan-kesehatan/page.tsx
│   │   │   ├── rekapan-mcu/page.tsx    # Rekapan MCU (tab MCU + Inhouse Clinic)
│   │   │   ├── tambah-data/page.tsx    # Form tambah data MCU
│   │   │   ├── ekspor-excel/page.tsx   # Halaman ekspor Excel
│   │   │   └── mcu/
│   │   │       ├── [id]/
│   │   │       │   ├── page.tsx        # Detail rekam medis
│   │   │       │   └── edit/page.tsx   # Edit data MCU
│   │   ├── klinik/
│   │   │   ├── dashboard/page.tsx      # Dashboard klinik
│   │   │   ├── intervensi-layanan-kesehatan/page.tsx
│   │   │   ├── rekapan-mini-mcu/page.tsx
│   │   │   ├── tambah-data/page.tsx
│   │   │   ├── ekspor-excel/page.tsx
│   │   │   └── mcu/
│   │   │       ├── [id]/
│   │   │       │   ├── page.tsx        # Detail rekam medis klinik
│   │   │       │   └── edit/page.tsx
│   │   │       └── tambah-pemeriksaan/
│   │   │           └── [id]/page.tsx   # Tambah pemeriksaan lanjutan
│   │   ├── karyawan/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── hasil-mcu/page.tsx      # Read-only
│   │   │   ├── hasil-mini-mcu/page.tsx # Read-only
│   │   │   └── unggah-data/page.tsx    # Upload dokumen MCU mandiri
│   │   ├── settings/page.tsx           # Pengaturan profil & password
│   │   └── notifications/page.tsx      # Pusat notifikasi
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── logout/route.ts
│   │   ├── notifications/
│   │   │   ├── latest/route.ts
│   │   │   ├── unread-count/route.ts
│   │   │   ├── read-all/route.ts
│   │   │   └── [id]/read/route.ts
│   │   ├── admin/
│   │   │   ├── chart-details/route.ts
│   │   │   ├── mcu/route.ts            # CRUD MCU records
│   │   │   ├── mcu/[id]/route.ts       # GET/PUT/DELETE single
│   │   │   ├── export/route.ts
│   │   │   └── import/route.ts
│   │   ├── klinik/
│   │   │   ├── mcu/route.ts
│   │   │   ├── mcu/[id]/route.ts
│   │   │   ├── mcu/[id]/tindak-lanjut/route.ts
│   │   │   └── export/route.ts
│   │   ├── karyawan/
│   │   │   ├── upload-mcu/route.ts
│   │   │   ├── upload-mcu-lanjutan/route.ts
│   │   │   └── update-vitals/route.ts
│   │   └── mcu/
│   │       └── [id]/
│   │           ├── export-excel/route.ts
│   │           ├── export-pdf/route.ts
│   │           └── view-document/route.ts
│   ├── layout.tsx                      # Root layout
│   └── page.tsx                        # Landing → redirect
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx               # Master layout (sidebar + header)
│   │   ├── AppHeader.tsx               # Navbar (notifikasi bell, profil)
│   │   └── AppSidebar.tsx              # Sidebar menu (dynamic per role)
│   ├── ui/                             # Reusable UI components
│   │   ├── StatCard.tsx
│   │   ├── BadgeStatus.tsx
│   │   ├── BadgeKeluhan.tsx
│   │   ├── Alert.tsx
│   │   ├── Pagination.tsx
│   │   └── modals/
│   │       ├── ModalLogout.tsx
│   │       ├── ModalDelete.tsx
│   │       └── ModalImportExcel.tsx
│   └── mcu-form/                       # Sub-komponen form MCU
│       ├── PesertaInfo.tsx
│       ├── VitalsInput.tsx
│       ├── DiagnosisSection.tsx
│       ├── IntervensiInput.tsx
│       ├── MedicationInput.tsx
│       └── DocumentUploads.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Supabase browser client
│   │   ├── server.ts                   # Supabase server client
│   │   └── middleware.ts               # Supabase auth middleware helper
│   ├── services/
│   │   ├── mcu-service.ts              # Business logic utama
│   │   ├── mcu-export-service.ts       # Engine ekspor Excel
│   │   ├── mcu-import-service.ts       # Parser impor Excel/CSV
│   │   └── notification-service.ts     # Notifikasi dispatch & query
│   ├── validations/
│   │   ├── mcu-schema.ts              # Zod schema (pengganti McuRecordRequest)
│   │   └── auth-schema.ts            # Zod schema auth
│   ├── types/
│   │   ├── database.ts                # TypeScript interfaces (auto-generated dari Supabase)
│   │   └── index.ts                   # Shared types
│   └── utils/
│       ├── bmi.ts                     # Kalkulasi BMI
│       ├── format.ts                  # Format tanggal Indonesia, dll
│       └── constants.ts               # Konstanta (penyakit list, obat, dll)
├── hooks/
│   ├── useAuth.ts                     # Auth hook
│   ├── useNotifications.ts            # Notifications hook (Supabase Realtime)
│   └── useRole.ts                     # Role checking hook
└── middleware.ts                       # Next.js middleware (auth + role guard)
```

---

## 4. INTEGRASI DATABASE SUPABASE (PostgreSQL)

### 4.1 Membuat Project Supabase

1. **Buka [supabase.com](https://supabase.com)** → Login/Register
2. **New Project** → Pilih region terdekat (Singapore)
3. **Catat credentials:**
   - `Project URL` (e.g. `https://xxxxx.supabase.co`)
   - `anon (public) key`
   - `service_role key` (RAHASIA — hanya untuk server-side)
   - `Database password`
   - `Connection string` (PostgreSQL)

### 4.2 Environment Variables (.env.local)

Buat file `.env.local` di root project Next.js:

```env
# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# === Database Direct (untuk Prisma, opsional) ===
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres

# === App Config ===
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_TIMEZONE=Asia/Jakarta
```

### 4.3 Setup Supabase Client (Next.js)

#### `src/lib/supabase/client.ts` — Browser Client
```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### `src/lib/supabase/server.ts` — Server Client (Server Components / API Routes)
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/types/database'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore — this is called from a Server Component
          }
        },
      },
    }
  )
}
```

#### `src/lib/supabase/admin.ts` — Admin/Service Role Client (untuk backend operations)
```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

### 4.4 Migrasi Data MySQL → PostgreSQL

#### Langkah-langkah:

1. **Export MySQL ke SQL dump:**
   ```bash
   # Di project Laravel lama
   mysqldump -u root ptpn_coba2 --no-create-info --complete-insert > data_dump.sql
   ```

2. **Jalankan SQL schema** (lihat bagian 5) di Supabase SQL Editor.

3. **Convert & Import data:**
   - Buka Supabase Dashboard → SQL Editor
   - Jalankan schema SQL dari bagian 5 terlebih dahulu
   - Untuk data, convert MySQL dump ke PostgreSQL format (ganti backticks, AUTO_INCREMENT, dll)
   - Atau gunakan tool: [pgloader](https://pgloader.io/) atau [mysql-to-postgres](https://github.com/maxlapshin/mysql2postgres)

4. **Alternative: Gunakan Supabase CLI:**
   ```bash
   npm install -g supabase
   supabase init
   supabase link --project-ref your-project-ref
   # Buat migration files di supabase/migrations/
   supabase db push
   ```

> [!IMPORTANT]
> **Perbedaan MySQL → PostgreSQL yang harus diperhatikan:**
> - `AUTO_INCREMENT` → `SERIAL` atau `GENERATED ALWAYS AS IDENTITY`
> - `ENUM` → Gunakan `TEXT` dengan `CHECK` constraint, atau buat custom `TYPE`
> - `JSON` column → PostgreSQL native `JSONB` (lebih powerful)
> - `DATE_FORMAT()` → `TO_CHAR()`
> - `LOWER()` → PostgreSQL case-insensitive bisa pakai `ILIKE`
> - `LIKE` → `ILIKE` (case-insensitive)
> - `TINYINT(1)` / boolean → `BOOLEAN`
> - `DECIMAL(5,1)` → `NUMERIC(5,1)` atau `REAL`

---

## 5. DATABASE SCHEMA — Definisi SQL PostgreSQL

Jalankan SQL berikut di **Supabase SQL Editor** (urut):

```sql
-- ============================================
-- 1. TABEL USERS (dengan role enum)
-- ============================================
CREATE TYPE user_role AS ENUM ('admin', 'klinik', 'karyawan');

CREATE TABLE IF NOT EXISTS users (
    id             BIGSERIAL PRIMARY KEY,
    name           TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE,
    nik            TEXT UNIQUE,
    divisi         TEXT,
    role           user_role NOT NULL DEFAULT 'karyawan',
    email_verified_at TIMESTAMPTZ,
    password       TEXT NOT NULL,
    remember_token TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. TABEL MCU_RECORDS (Data MCU Berkala — Admin)
-- ============================================
CREATE TYPE kesimpulan_status AS ENUM ('fit', 'fit_dengan_catatan', 'sementara_tidak_fit');

CREATE TABLE IF NOT EXISTS mcu_records (
    id                BIGSERIAL PRIMARY KEY,

    -- Identitas Karyawan
    nama_lengkap      TEXT NOT NULL,
    nik               TEXT NOT NULL,
    departemen        TEXT DEFAULT 'PTPN 3',
    kategori_peserta  TEXT DEFAULT 'karyawan',
    divisi            TEXT,
    jabatan           TEXT,
    nomor_inhealth    TEXT,
    nomor_bpjs        TEXT,
    jenis_kelamin     TEXT,  -- 'Laki-laki' | 'Perempuan'
    nama_dokter       TEXT,
    nama_perawat      TEXT,
    umur              INTEGER,
    tanggal_pemeriksaan DATE NOT NULL,
    jam_pemeriksaan   TIME,
    foto              TEXT,  -- path file foto

    -- File Dokumen
    file_dokumen      TEXT,
    nama_dokumen      TEXT,
    file_rujukan      TEXT,
    nama_rujukan_file TEXT,
    file_surat_sakit  TEXT,
    nama_surat_sakit  TEXT,
    nama_poli         TEXT,
    nama_rs           TEXT,

    -- Pengukuran Fisik & Vitals
    golongan_darah    TEXT,
    tinggi_badan      NUMERIC(5,1),   -- cm
    berat_badan       NUMERIC(5,1),   -- kg
    bmi               NUMERIC(4,1),   -- auto-calculated
    tensi             TEXT,            -- e.g. "120/80"
    gula_darah        TEXT,
    suhu              TEXT,
    vitals_updated_at TIMESTAMPTZ,
    vitals_updated_by_role TEXT,
    kolesterol        TEXT,
    asam_urat         TEXT,

    -- Hasil Pemeriksaan
    penyakit          JSONB,          -- array nama penyakit
    obat              JSONB,          -- array nama obat
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
    intervensi        JSONB,          -- array kategori intervensi
    tanggal_pemeriksaan_lanjutan DATE,
    file_surat_rujukan_intervensi TEXT,
    nama_surat_rujukan_intervensi TEXT,
    catatan_intervensi TEXT,

    -- Tindak Lanjut (generic)
    butuh_tindak_lanjut     BOOLEAN DEFAULT FALSE,
    file_hasil_tindak_lanjut TEXT,
    nama_hasil_tindak_lanjut TEXT,
    tindak_lanjut_selesai   BOOLEAN DEFAULT FALSE,

    -- Tindak Lanjut per Kategori (Kuratif)
    tindak_lanjut_selesai_kuratif       BOOLEAN DEFAULT FALSE,
    catatan_intervensi_kuratif          TEXT,
    file_hasil_tindak_lanjut_kuratif    TEXT,
    nama_hasil_tindak_lanjut_kuratif    TEXT,

    -- Tindak Lanjut per Kategori (Rehabilitatif)
    tindak_lanjut_selesai_rehabilitatif       BOOLEAN DEFAULT FALSE,
    catatan_intervensi_rehabilitatif          TEXT,
    file_hasil_tindak_lanjut_rehabilitatif    TEXT,
    nama_hasil_tindak_lanjut_rehabilitatif    TEXT,

    -- Metadata
    created_by_role   TEXT DEFAULT 'admin',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. TABEL MINI_MCU_RECORDS (Data Mini MCU — Klinik)
-- ============================================
-- Struktur IDENTIK dengan mcu_records, hanya default created_by_role = 'klinik'
CREATE TABLE IF NOT EXISTS mini_mcu_records (
    id                BIGSERIAL PRIMARY KEY,

    nama_lengkap      TEXT NOT NULL,
    nik               TEXT NOT NULL,
    departemen        TEXT DEFAULT 'PTPN 3',
    kategori_peserta  TEXT DEFAULT 'karyawan',
    divisi            TEXT,
    jabatan           TEXT,
    nomor_inhealth    TEXT,
    nomor_bpjs        TEXT,
    jenis_kelamin     TEXT,
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

    intervensi        JSONB,
    tanggal_pemeriksaan_lanjutan DATE,
    file_surat_rujukan_intervensi TEXT,
    nama_surat_rujukan_intervensi TEXT,
    catatan_intervensi TEXT,

    butuh_tindak_lanjut     BOOLEAN DEFAULT FALSE,
    file_hasil_tindak_lanjut TEXT,
    nama_hasil_tindak_lanjut TEXT,
    tindak_lanjut_selesai   BOOLEAN DEFAULT FALSE,

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

-- ============================================
-- 4. TABEL APP_NOTIFICATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS app_notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
    target_role TEXT,    -- 'admin' | 'klinik' | 'karyawan' | 'all'
    type        TEXT DEFAULT 'general',  -- 'mcu' | 'mini_mcu' | 'rujukan' | 'dokumen' | 'export' | 'intervensi' | 'vitals' | 'general'
    title       TEXT NOT NULL,
    message     TEXT NOT NULL,
    url         TEXT,
    icon_type   TEXT DEFAULT 'bell',  -- 'rujukan' | 'mcu' | 'klinik' | 'dokumen' | 'export' | 'intervensi' | 'vitals' | 'bell'
    is_read     BOOLEAN DEFAULT FALSE,
    read_at     TIMESTAMPTZ,
    data        JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON app_notifications(user_id);
CREATE INDEX idx_notifications_target_role ON app_notifications(target_role);
CREATE INDEX idx_notifications_is_read ON app_notifications(is_read);
CREATE INDEX idx_notifications_type ON app_notifications(type);

-- ============================================
-- 5. TABEL OBATS (Master Data Obat)
-- ============================================
CREATE TABLE IF NOT EXISTS obats (
    id        BIGSERIAL PRIMARY KEY,
    nama_obat TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. TABEL MEDICAL_SUGGESTIONS (Master Saran Medis)
-- ============================================
CREATE TABLE IF NOT EXISTS medical_suggestions (
    id         BIGSERIAL PRIMARY KEY,
    type       VARCHAR(50) NOT NULL,
    text       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type, text)
);

CREATE INDEX idx_medical_suggestions_type ON medical_suggestions(type);

-- ============================================
-- 7. TABEL SESSIONS (untuk Supabase Auth — biasanya sudah di-handle oleh Supabase)
-- ============================================
-- NOTE: Supabase Auth mengelola sessions secara internal.
-- Tabel ini tidak perlu dibuat manual jika menggunakan Supabase Auth.

-- ============================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Aktifkan RLS pada semua tabel
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcu_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mini_mcu_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE obats ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role bisa akses semua (untuk server-side operations)
CREATE POLICY "Service role full access" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON mcu_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON mini_mcu_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON app_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON obats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON medical_suggestions FOR ALL USING (true) WITH CHECK (true);

-- NOTE: Karena kita pakai service_role key di server-side API routes,
-- RLS policies di atas mengizinkan semua operasi.
-- Role-based access control dihandle di level MIDDLEWARE Next.js, bukan RLS.
-- Jika ingin RLS ketat, buat policies per role sesuai kebutuhan.

-- ============================================
-- 9. FUNCTION: AUTO-UPDATE updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_mcu BEFORE UPDATE ON mcu_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_mini_mcu BEFORE UPDATE ON mini_mcu_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at_notifications BEFORE UPDATE ON app_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 10. ENABLE REALTIME untuk Notifikasi
-- ============================================
-- Di Supabase Dashboard → Database → Replication
-- Atau via SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE app_notifications;
```

---

## 6. SEED DATA (Data Awal)

```sql
-- ============================================
-- SEED: Users (3 akun demo)
-- ============================================
-- NOTE: Password di Supabase Auth di-hash secara berbeda.
-- Gunakan Supabase Auth API untuk create user, bukan INSERT langsung.
-- Ini hanya referensi data:

-- Akun 1: Admin
-- Email: admin@ptpn.co.id | Password: password | Role: admin

-- Akun 2: Klinik
-- Email: klinik@ptpn.co.id | Password: password | Role: klinik

-- Akun 3: Karyawan
-- Email: karyawan@ptpn.co.id | NIK: EMP-2023-0142 | Password: password | Role: karyawan

-- ============================================
-- SEED: Master Obat (27 item)
-- ============================================
INSERT INTO obats (nama_obat) VALUES
  ('Allopurinol 100 mg'), ('Alpara'), ('Ambroxol'), ('Amlodipin 5 mg'),
  ('Amoxicilin'), ('Asam Mefenamat'), ('Becomzet'), ('Betahistine'),
  ('Cetirizine'), ('Degirol'), ('Dexamethasone (Dex/Dexa)'), ('Donperidon'),
  ('Lansoprazole'), ('Methylprednisolone 4 mg'), ('Methylprednisolone 8 mg'),
  ('Mucofek'), ('Neurodex'), ('New Diatab'), ('Omeprazole'), ('Omz'),
  ('PCT'), ('Polysilane'), ('Ranitidine'), ('Sanmol'), ('Scopma'),
  ('Tremenza'), ('Salep Hydrocortisone')
ON CONFLICT (nama_obat) DO NOTHING;

-- ============================================
-- SEED: Sample MCU Records
-- ============================================
INSERT INTO mcu_records (nama_lengkap, nik, divisi, umur, tanggal_pemeriksaan, golongan_darah, tinggi_badan, berat_badan, bmi, penyakit, diagnosa, konsultasi, saran, anjuran, kesimpulan, created_by_role) VALUES
('DEDE SAEPULROHMAN', '32021411048', 'Pengadaan & Umum', 40, '2026-06-17', 'B', 168.0, 70.0, 24.8,
  '["SGOT & SGPT Meningkat", "Gangguan Refraksi Mata", "Kolesterol"]',
  '• SGOT dan SGPT meningkat\n• Gangguan refraksi mata',
  '• Konsultasi dokter Spesialis Penyakit Dalam',
  '• Dianjurkan evaluasi lebih lanjut ke Dokter Spesialis Penyakit Dalam',
  '• Evaluasi fungsi hati berkala\n• Olahraga teratur 30 menit sehari',
  'fit_dengan_catatan', 'admin'),

('CLARA MUHARAR IFFATA', '330607540', 'Sekretariat Perusahaan', 32, '2026-06-17', 'A', 160.0, 55.0, 21.5,
  '["Anemia"]', '• Anemia Ringan', '• Konsultasi dengan Tim Gizi Klinik',
  '• Istirahat cukup dan konsumsi suplemen zat besi',
  '• Pola makan seimbang kaya zat besi',
  'fit_dengan_catatan', 'admin'),

('Aris Agung Purmono, SE. AK', '330121261', 'Keuangan & Akuntansi', 35, '2026-06-07', 'O', 171.0, 64.6, 22.1,
  '["Hepatitis B (Non Imun)"]', '• Hepatitis B (Non Imun)\n• Perlu vaksinasi ulang',
  '• Konsultasi dokter Spesialis Penyakit Dalam',
  '• Dianjurkan vaksinasi Hepatitis B lengkap',
  '• Evaluasi fungsi hati berkala',
  'sementara_tidak_fit', 'admin');

-- SEED: Sample Mini MCU Record
INSERT INTO mini_mcu_records (nama_lengkap, nik, divisi, umur, tanggal_pemeriksaan, jam_pemeriksaan, golongan_darah, tinggi_badan, berat_badan, bmi, tensi, gula_darah, suhu, kolesterol, asam_urat, penyakit, diagnosa, konsultasi, saran, anjuran, kesimpulan, created_by_role) VALUES
('Ahmad Santoso', 'EMP-2023-0142', 'Operasional Kebun', 35, '2026-07-01', '08:30:00', 'A', 170.0, 65.0, 22.5,
  '120/80', '110', '36.5', '190', '6.0',
  '["Hipertensi Ringan"]', 'Tekanan darah normal tinggi',
  'Konsultasi Tim Medis Klinik Kebun', 'Kurangi konsumsi garam berlebih',
  'Kontrol tekanan darah rutin tiap bulan',
  'fit', 'klinik');
```

### Cara Buat User di Supabase Auth

Karena Supabase Auth mengelola user secara terpisah, kamu perlu **sinkronisasi** antara tabel `auth.users` (Supabase internal) dan tabel `public.users` (custom):

```typescript
// src/lib/utils/create-seed-users.ts — Jalankan sekali saja
import { createAdminClient } from '@/lib/supabase/admin'

async function seedUsers() {
  const supabase = createAdminClient()

  const users = [
    { email: 'admin@ptpn.co.id', password: 'password', name: 'Admin Layanan Kesehatan', role: 'admin' as const, nik: null },
    { email: 'klinik@ptpn.co.id', password: 'password', name: 'Tim Medis Klinik', role: 'klinik' as const, nik: null },
    { email: 'karyawan@ptpn.co.id', password: 'password', name: 'Ahmad Santoso', role: 'karyawan' as const, nik: 'EMP-2023-0142' },
  ]

  for (const u of users) {
    // 1. Buat di Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    })

    if (authError) { console.error(`Auth error for ${u.email}:`, authError); continue }

    // 2. Sinkronisasi ke tabel public.users
    const { error: dbError } = await supabase.from('users').upsert({
      id: parseInt(authData.user.id) || undefined, // atau gunakan UUID
      name: u.name,
      email: u.email,
      nik: u.nik,
      role: u.role,
      password: 'managed-by-supabase-auth', // placeholder
    }, { onConflict: 'email' })

    if (dbError) console.error(`DB error for ${u.email}:`, dbError)
    else console.log(`✅ Created: ${u.email} (${u.role})`)
  }
}
```

> [!WARNING]
> **PENTING: Sinkronisasi auth.users ↔ public.users**
> Supabase Auth punya tabel internal `auth.users` (UUID-based). Tabel `public.users` kamu adalah custom table. Kamu perlu:
> 1. **Saat register**: Buat user di Supabase Auth → Insert ke `public.users` juga.
> 2. **Saat login**: Autentikasi via Supabase Auth → Query `public.users` untuk ambil role.
> 3. **Opsional**: Buat trigger PostgreSQL yang auto-insert ke `public.users` saat ada user baru di `auth.users`.

#### Trigger Auto-Sync (Opsional tapi Direkomendasikan):

```sql
-- Trigger: Auto-create public.users saat Supabase Auth user baru dibuat
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role, created_at, updated_at, password)
    VALUES (
        NEW.id::bigint,   -- konversi UUID ke bigint jika perlu, atau ubah tabel users pakai UUID
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'karyawan')::user_role,
        NOW(),
        NOW(),
        'managed-by-supabase-auth'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NOTE: Jika tabel users pakai BIGSERIAL, lebih baik ubah ke UUID agar sinkron
-- dengan Supabase Auth. Ubah: id BIGSERIAL → id UUID DEFAULT gen_random_uuid()
-- dan hapus referensi ke auth user id.
```

> [!TIP]
> **Rekomendasi: Ubah `users.id` ke UUID** agar match dengan Supabase Auth `auth.users.id` (yang bertipe UUID). Ini mempermudah sinkronisasi.

---

## 7. SISTEM AUTENTIKASI & ROLE-BASED ACCESS

### 7.1 Tiga Role

| Role | Deskripsi | Dashboard Redirect |
|:---|:---|:---|
| `admin` | Admin Layanan Kesehatan Pusat | `/admin/dashboard` |
| `klinik` | Tim Medis Inhouse Clinic / Klinik Kebun | `/klinik/dashboard` |
| `karyawan` | Karyawan / Employee | `/karyawan/dashboard` |

### 7.2 Flow Login

```
User buka /login
  → Pilih role tab (Admin | Klinik | Karyawan)
  → Input credentials:
      - Admin/Klinik: Email + Password
      - Karyawan: Email ATAU NIK + Password
  → Supabase Auth: signInWithPassword({ email, password })
  → Query public.users untuk ambil role
  → Validasi: role user di DB harus match dengan role yang dipilih
      - Jika TIDAK match → Error: "Akun tidak ditemukan atau peran tidak sesuai"
  → Redirect ke dashboard sesuai role
```

### 7.3 Flow Register

```
User buka /register
  → Isi: Nama, Email, Password, Role, NIK (opsional), Divisi (opsional)
  → Supabase Auth: signUp({ email, password, options: { data: { name, role, nik } } })
  → Insert ke public.users (name, email, nik, divisi, role)
  → Auto-login
  → Redirect ke dashboard sesuai role
```

### 7.4 Middleware Route Protection (Next.js)

```typescript
// src/middleware.ts
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Buat Supabase client untuk middleware
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // ===== PUBLIC ROUTES =====
  const publicPaths = ['/login', '/register']
  if (publicPaths.includes(pathname)) {
    if (user) {
      // Sudah login → redirect ke dashboard
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('email', user.email!)
        .single()

      const role = userData?.role || 'karyawan'
      const dashboardMap = {
        admin: '/admin/dashboard',
        klinik: '/klinik/dashboard',
        karyawan: '/karyawan/dashboard',
      }
      return NextResponse.redirect(new URL(dashboardMap[role], request.url))
    }
    return response
  }

  // ===== PROTECTED ROUTES =====
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Ambil role dari public.users
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('email', user.email!)
    .single()

  const userRole = userData?.role || 'karyawan'

  // ===== ROLE-BASED ROUTE GUARD =====
  if (pathname.startsWith('/admin') && userRole !== 'admin') {
    const dash = userRole === 'klinik' ? '/klinik/dashboard' : '/karyawan/dashboard'
    return NextResponse.redirect(new URL(dash, request.url))
  }
  if (pathname.startsWith('/klinik') && userRole !== 'klinik') {
    const dash = userRole === 'admin' ? '/admin/dashboard' : '/karyawan/dashboard'
    return NextResponse.redirect(new URL(dash, request.url))
  }
  if (pathname.startsWith('/karyawan') && userRole !== 'karyawan') {
    const dash = userRole === 'admin' ? '/admin/dashboard' : '/klinik/dashboard'
    return NextResponse.redirect(new URL(dash, request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images|api/auth).*)',
  ],
}
```

> [!CAUTION]
> **Route Guard Kritis!** Pastikan middleware memblokir akses cross-role:
> - Admin TIDAK BOLEH akses `/klinik/*` atau `/karyawan/*`
> - Klinik TIDAK BOLEH akses `/admin/*` atau `/karyawan/*`
> - Karyawan TIDAK BOLEH akses `/admin/*` atau `/klinik/*`
> - Shared routes (`/settings`, `/notifications`, `/mcu/{id}/export-*`) bisa diakses SEMUA role yang sudah login

---

## 8. ROUTING LENGKAP — Mapping Laravel → Next.js

### 8.1 Public Routes

| Laravel Route | Next.js Route | Tipe |
|:---|:---|:---|
| `GET /` | `app/page.tsx` → redirect logic | Page |
| `GET /login` | `app/(auth)/login/page.tsx` | Page |
| `POST /login` | `app/api/auth/login/route.ts` | API |
| `GET /register` | `app/(auth)/register/page.tsx` | Page |
| `POST /register` | `app/api/auth/register/route.ts` | API |

### 8.2 Admin Routes

| Laravel Route | Next.js Route | Fungsi |
|:---|:---|:---|
| `GET /admin/dashboard` | `app/(protected)/admin/dashboard/page.tsx` | Dashboard analitik |
| `GET /admin/chart-details` | `app/api/admin/chart-details/route.ts` | AJAX chart drill-down |
| `GET /admin/intervensi-layanan-kesehatan` | `app/(protected)/admin/intervensi-layanan-kesehatan/page.tsx` | Dashboard intervensi |
| `GET /admin/rekapan-mcu` | `app/(protected)/admin/rekapan-mcu/page.tsx` | Rekapan MCU (tab MCU + Inhouse Clinic) |
| `GET /admin/tambah-data` | `app/(protected)/admin/tambah-data/page.tsx` | Form tambah data MCU |
| `POST /admin/tambah-data` | `app/api/admin/mcu/route.ts` (POST) | Simpan data MCU |
| `GET /admin/ekspor-excel` | `app/(protected)/admin/ekspor-excel/page.tsx` | Halaman ekspor |
| `GET /admin/ekspor-excel/download` | `app/api/admin/export/route.ts` | Download 2-sheet Excel |
| `GET /admin/mcu/{id}/edit` | `app/(protected)/admin/mcu/[id]/edit/page.tsx` | Form edit |
| `PUT /admin/mcu/{id}` | `app/api/admin/mcu/[id]/route.ts` (PUT) | Update data |
| `GET /admin/mcu/{id}` | `app/(protected)/admin/mcu/[id]/page.tsx` | Detail rekam medis |
| `DELETE /admin/mcu/{id}` | `app/api/admin/mcu/[id]/route.ts` (DELETE) | Hapus data |
| `POST /admin/mcu/import` | `app/api/admin/import/route.ts` | Impor Excel |
| `GET /admin/mcu/export` | `app/api/admin/export/route.ts` (query: type) | Quick export |
| `GET /admin/ekspor-card/download` | `app/api/admin/export/route.ts` (query: type=card) | Card export |

### 8.3 Klinik Routes

| Laravel Route | Next.js Route | Fungsi |
|:---|:---|:---|
| `GET /klinik/dashboard` | `app/(protected)/klinik/dashboard/page.tsx` | Dashboard klinik |
| `GET /klinik/intervensi-layanan-kesehatan` | `app/(protected)/klinik/intervensi-layanan-kesehatan/page.tsx` | Dashboard intervensi klinik |
| `GET /klinik/rekapan-mini-mcu` | `app/(protected)/klinik/rekapan-mini-mcu/page.tsx` | Rekapan Mini MCU |
| `GET /klinik/tambah-data` | `app/(protected)/klinik/tambah-data/page.tsx` | Form tambah |
| `POST /klinik/tambah-data` | `app/api/klinik/mcu/route.ts` (POST) | Simpan data |
| `GET /klinik/ekspor-excel` | `app/(protected)/klinik/ekspor-excel/page.tsx` | Halaman ekspor |
| `GET /klinik/ekspor-excel/download` | `app/api/klinik/export/route.ts` | Download Inhealth |
| `GET /klinik/ekspor-card/download` | `app/api/klinik/export/route.ts` (query: type=card) | Card export |
| `GET /klinik/mcu/{id}/edit` | `app/(protected)/klinik/mcu/[id]/edit/page.tsx` | Form edit |
| `PUT /klinik/mcu/{id}` | `app/api/klinik/mcu/[id]/route.ts` (PUT) | Update data |
| `POST /klinik/mcu/{id}/tindak-lanjut` | `app/api/klinik/mcu/[id]/tindak-lanjut/route.ts` (POST) | Update tindak lanjut |
| `GET /klinik/mcu/{id}` | `app/(protected)/klinik/mcu/[id]/page.tsx` | Detail rekam medis |
| `GET /klinik/tambah-pemeriksaan/{id}` | `app/(protected)/klinik/mcu/tambah-pemeriksaan/[id]/page.tsx` | Tambah pemeriksaan lanjutan |

### 8.4 Karyawan Routes

| Laravel Route | Next.js Route | Fungsi |
|:---|:---|:---|
| `GET /karyawan/dashboard` | `app/(protected)/karyawan/dashboard/page.tsx` | Dashboard karyawan |
| `GET /karyawan/hasil-mcu` | `app/(protected)/karyawan/hasil-mcu/page.tsx` | Hasil MCU (read-only) |
| `GET /karyawan/hasil-mini-mcu` | `app/(protected)/karyawan/hasil-mini-mcu/page.tsx` | Hasil Mini MCU (read-only) |
| `GET /karyawan/unggah-data` | `app/(protected)/karyawan/unggah-data/page.tsx` | Upload dokumen MCU mandiri |
| `POST /karyawan/upload-mcu` | `app/api/karyawan/upload-mcu/route.ts` | Upload MCU |
| `POST /karyawan/upload-mcu-lanjutan` | `app/api/karyawan/upload-mcu-lanjutan/route.ts` | Upload hasil tindak lanjut |
| `POST /karyawan/update-vitals` | `app/api/karyawan/update-vitals/route.ts` | Update vital signs mandiri |

### 8.5 Shared Routes (Semua Role)

| Laravel Route | Next.js Route | Fungsi |
|:---|:---|:---|
| `GET /settings` | `app/(protected)/settings/page.tsx` | Pengaturan profil & password |
| `PUT /settings/profile` | `app/api/settings/profile/route.ts` | Update profil |
| `PUT /settings/password` | `app/api/settings/password/route.ts` | Update password |
| `POST /logout` | `app/api/auth/logout/route.ts` | Logout |
| `GET /notifications` | `app/(protected)/notifications/page.tsx` | Pusat notifikasi |
| `GET /notifications/latest` | `app/api/notifications/latest/route.ts` | Popup notifikasi |
| `GET /notifications/unread-count` | `app/api/notifications/unread-count/route.ts` | Badge counter |
| `POST /notifications/read-all` | `app/api/notifications/read-all/route.ts` | Tandai semua dibaca |
| `POST /notifications/{id}/read` | `app/api/notifications/[id]/read/route.ts` | Tandai satu dibaca |
| `GET /mcu/{id}/export-excel` | `app/api/mcu/[id]/export-excel/route.ts` | Export single Excel |
| `GET /mcu/{id}/export-pdf` | `app/api/mcu/[id]/export-pdf/route.ts` | Export single PDF |
| `GET /mcu/{id}/view-dokumen` | `app/api/mcu/[id]/view-document/route.ts` (query: type=dokumen) | View dokumen |
| `GET /mcu/{id}/view-rujukan` | `app/api/mcu/[id]/view-document/route.ts` (query: type=rujukan) | View rujukan |
| `GET /mcu/{id}/view-surat-sakit` | `app/api/mcu/[id]/view-document/route.ts` (query: type=surat_sakit) | View surat sakit |

---

## 9. MIDDLEWARE & ROUTE PROTECTION

### 9.1 Matriks Akses

| Path Pattern | Admin | Klinik | Karyawan | Guest |
|:---|:---:|:---:|:---:|:---:|
| `/login`, `/register` | Redirect | Redirect | Redirect | ✅ |
| `/admin/*` | ✅ | ❌ Redirect | ❌ Redirect | ❌ Login |
| `/klinik/*` | ❌ Redirect | ✅ | ❌ Redirect | ❌ Login |
| `/karyawan/*` | ❌ Redirect | ❌ Redirect | ✅ | ❌ Login |
| `/settings` | ✅ | ✅ | ✅ | ❌ Login |
| `/notifications/*` | ✅ | ✅ | ✅ | ❌ Login |
| `/mcu/{id}/*` (shared) | ✅ | ✅ | ✅ | ❌ Login |
| `/api/admin/*` | ✅ | ❌ 403 | ❌ 403 | ❌ 401 |
| `/api/klinik/*` | ❌ 403 | ✅ | ❌ 403 | ❌ 401 |
| `/api/karyawan/*` | ❌ 403 | ❌ 403 | ✅ | ❌ 401 |

---

## 10. CRUD OPERATIONS — Per Role

### 10.1 Admin (role = 'admin')

| Operasi | Tabel | Endpoint API | Deskripsi |
|:---|:---|:---|:---|
| **CREATE** | `mcu_records` | `POST /api/admin/mcu` | Tambah data MCU berkala baru |
| **READ (list)** | `mcu_records` + `mini_mcu_records` | `GET /api/admin/mcu` | Rekapan MCU (tab MCU & tab Inhouse Clinic) |
| **READ (detail)** | `mcu_records` / `mini_mcu_records` | `GET /api/admin/mcu/[id]` | Detail rekam medis + grafik tren riwayat |
| **UPDATE** | `mcu_records` | `PUT /api/admin/mcu/[id]` | Edit data MCU |
| **DELETE** | `mcu_records` | `DELETE /api/admin/mcu/[id]` | Hapus data MCU |
| **IMPORT** | `mcu_records` | `POST /api/admin/import` | Impor massal Excel/CSV |
| **EXPORT** | `mcu_records` + `mini_mcu_records` | `GET /api/admin/export` | 2-sheet Excel, card export, single export |

### 10.2 Klinik (role = 'klinik')

| Operasi | Tabel | Endpoint API | Deskripsi |
|:---|:---|:---|:---|
| **CREATE** | `mini_mcu_records` | `POST /api/klinik/mcu` | Tambah data pemeriksaan Mini MCU |
| **CREATE** (lanjutan) | `mini_mcu_records` | `POST /api/klinik/mcu` + pre-fill | Tambah pemeriksaan lanjutan (pre-filled) |
| **READ (list)** | `mini_mcu_records` | `GET /api/klinik/mcu` | Rekapan Mini MCU |
| **READ (detail)** | `mini_mcu_records` | `GET /api/klinik/mcu/[id]` | Detail + grafik tren |
| **UPDATE** | `mini_mcu_records` | `PUT /api/klinik/mcu/[id]` | Edit data Mini MCU |
| **UPDATE** (tindak lanjut) | `mcu_records` / `mini_mcu_records` | `POST /api/klinik/mcu/[id]/tindak-lanjut` | Update status tindak lanjut intervensi |
| **EXPORT** | `mini_mcu_records` | `GET /api/klinik/export` | Inhealth format, card export |
| **NO DELETE** | — | — | Klinik TIDAK bisa hapus data |

### 10.3 Karyawan (role = 'karyawan')

| Operasi | Tabel | Endpoint API | Deskripsi |
|:---|:---|:---|:---|
| **READ** | `mcu_records` | Via page | Lihat hasil MCU berkala (read-only, filtered by NIK/nama) |
| **READ** | `mini_mcu_records` | Via page | Lihat hasil Mini MCU (read-only, filtered by NIK/nama) |
| **UPLOAD** (MCU Mandiri) | `mcu_records` / `mini_mcu_records` | `POST /api/karyawan/upload-mcu` | Upload dokumen MCU mandiri |
| **UPLOAD** (Hasil Lanjutan) | `mcu_records` / `mini_mcu_records` | `POST /api/karyawan/upload-mcu-lanjutan` | Upload hasil tindak lanjut |
| **UPDATE** (Vitals) | `mcu_records` / `mini_mcu_records` | `POST /api/karyawan/update-vitals` | Update pengukuran fisik & vital signs mandiri |
| **NO CREATE** | — | — | Karyawan TIDAK bisa input data pemeriksaan baru |
| **NO EDIT** | — | — | Karyawan TIDAK bisa edit data pemeriksaan |
| **NO DELETE** | — | — | Karyawan TIDAK bisa hapus data |

> [!IMPORTANT]
> **Pencocokan data karyawan:** Data MCU **TIDAK** menggunakan foreign key ke tabel `users`. Pencocokan dilakukan berdasarkan **NIK** dan/atau **nama_lengkap** (case-insensitive `ILIKE`). Query untuk karyawan:
> ```sql
> SELECT * FROM mcu_records
> WHERE LOWER(nik) = LOWER(:user_nik)
>    OR LOWER(nama_lengkap) = LOWER(:user_name)
> ORDER BY tanggal_pemeriksaan DESC;
> ```

---

## 11. ARSITEKTUR SERVICE LAYER — Next.js

Pola arsitektur sama dengan Laravel: **Controller → Service → Database**. Di Next.js:

```
API Route / Server Action → Service → Supabase Client → PostgreSQL
```

### Services yang perlu dibuat:

#### `src/lib/services/mcu-service.ts`
```typescript
// Fungsi-fungsi utama (mirror dari McuService.php):
export const mcuService = {
  // Dashboard & Analytics
  getDashboardData(role: string, search?: string, perPage?: number, bulan?: string, tab?: string, divisi?: string, departemen?: string),
  getChartDetailEmployees(chartType: string, label: string, dataset: string, kategori?: string, entitas?: string, bulan?: string),
  getIntervensiAnalytics(selectedBulan?: string),

  // CRUD
  createRecord(data: McuRecordInput, role: 'admin' | 'klinik'),
  updateRecord(id: number, data: McuRecordInput, role: 'admin' | 'klinik'),
  deleteRecord(id: number),
  getRecordById(id: number, type?: 'mcu' | 'mini'),

  // Patient History (gabungkan mcu_records + mini_mcu_records berdasarkan NIK)
  fetchPatientHistory(nik: string, namaLengkap: string),

  // Auto-fill karyawan dari database (saat input NIK → auto-populate biodata)
  autoFillKaryawan(nik: string),

  // BMI Calculation
  calculateBMI(tinggi: number, berat: number): number,

  // File Upload
  uploadFile(file: File, folder: string): Promise<string>,
}
```

#### `src/lib/services/notification-service.ts`
```typescript
export const notificationService = {
  // Core
  sendToUser(userId: number, title: string, message: string, url?: string, type?: string, iconType?: string, data?: object),
  sendToRole(role: string, title: string, message: string, url?: string, type?: string, iconType?: string, data?: object),
  findEmployeeUser(nik?: string, name?: string): Promise<User | null>,

  // Dispatchers
  notifyMcuAdminCreatedOrUpdated(record: McuRecord, isUpdate?: boolean),
  notifyMiniMcuKlinikCreatedOrUpdated(record: MiniMcuRecord, isUpdate?: boolean, hasNewRujukan?: boolean, hasNewDokumen?: boolean),
  notifyMonthlyExportReady(monthLabel: string),
  notifyDailyFollowUpReminders(targetDate?: string),
  notifyEmployeeUploadedMcu(record: McuRecord | MiniMcuRecord),
  notifyEmployeeUploadedLanjutan(record: McuRecord | MiniMcuRecord),
  notifyEmployeeUpdatedVitals(record: McuRecord | MiniMcuRecord),

  // Queries
  getLatestForUser(userId: number, limit?: number),
  getAllForUser(userId: number, filter?: string, perPage?: number),
  getUnreadCountForUser(userId: number),

  // Actions
  markAsRead(id: number, userId: number),
  markAllAsReadForUser(userId: number),
}
```

---

## 12. SISTEM NOTIFIKASI REAL-TIME

### 12.1 Cara Kerja (Supabase Realtime)

**Ganti AJAX polling 10 detik** → **Supabase Realtime WebSocket**:

```typescript
// src/hooks/useNotifications.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useNotifications(userId: number, userRole: string) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    fetchUnreadCount()
    fetchLatest()

    // Subscribe ke tabel app_notifications untuk real-time updates
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'app_notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        // Notifikasi baru untuk user ini
        setUnreadCount(prev => prev + 1)
        setNotifications(prev => [payload.new, ...prev])
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'app_notifications',
        filter: `target_role=eq.${userRole}`,
      }, (payload) => {
        // Notifikasi broadcast untuk role ini
        if (!payload.new.user_id) {
          setUnreadCount(prev => prev + 1)
          setNotifications(prev => [payload.new, ...prev])
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, userRole])

  return { unreadCount, notifications, refetch: fetchLatest }
}
```

### 12.2 Trigger Notifikasi

| Event | Pengirim | Penerima | Icon Type |
|:---|:---|:---|:---|
| Admin input/update MCU | Admin | Karyawan (by NIK) | `mcu` |
| Klinik input Mini MCU | Klinik | Karyawan + Admin (broadcast) | `klinik` |
| Klinik upload rujukan | Klinik | Karyawan + Admin | `rujukan` |
| Klinik upload dokumen/surat sakit | Klinik | Karyawan + Admin | `dokumen` |
| Laporan bulanan siap | System | Klinik (broadcast) | `export` |
| Jadwal pemeriksaan lanjutan hari ini | System | Klinik + Admin + Karyawan | `klinik` / `mcu` |
| Karyawan upload MCU mandiri | Karyawan | Admin + Klinik (broadcast) | `mcu` |
| Karyawan upload hasil lanjutan | Karyawan | Admin + Klinik (broadcast) | `intervensi` |
| Karyawan update vital signs | Karyawan | Admin + Klinik (broadcast) | `vitals` |

---

## 13. SISTEM INTERVENSI LAYANAN KESEHATAN

### 13.1 Tiga Kategori Intervensi

Disimpan sebagai `JSONB` array di kolom `intervensi` pada `mcu_records` dan `mini_mcu_records`.

#### PROMOTIF & PREVENTIF (Warna Hijau)
- Health Talk
- Sekantor
- Gym
- Medical Check Up
- Healthy Food
- Konsultasi Kesehatan
- Weight Loss Challenge
- Vaksin Hepatitis B

#### KURATIF (Warna Oranye/Kuning)
- Konsultasi Lanjutan
- Employee Health Counseling Program
- Kesegaran
> *Catatan: Jika dipilih → input `tanggal_pemeriksaan_lanjutan` (date)*

#### REHABILITATIF (Warna Ungu)
- Monitoring hasil tindak lanjut oleh dokter ahli
> *Catatan: Jika dipilih → upload `file_surat_rujukan_intervensi`*

### 13.2 Dashboard Intervensi

- Menampilkan 3 stat card: jumlah pasien per kategori
- Detail karyawan per kategori intervensi
- **Admin**: Bisa lihat + kelola semua intervensi
- **Klinik**: Bisa lihat + tindak lanjut pasien (upload hasil, set selesai)
- **URL**: `/admin/intervensi-layanan-kesehatan` dan `/klinik/intervensi-layanan-kesehatan`

### 13.3 Tindak Lanjut per Kategori

| Field | Tipe | Deskripsi |
|:---|:---|:---|
| `tindak_lanjut_selesai_kuratif` | BOOLEAN | Status selesai kuratif |
| `catatan_intervensi_kuratif` | TEXT | Catatan kuratif |
| `file_hasil_tindak_lanjut_kuratif` | TEXT | File hasil kuratif |
| `tindak_lanjut_selesai_rehabilitatif` | BOOLEAN | Status selesai rehabilitatif |
| `catatan_intervensi_rehabilitatif` | TEXT | Catatan rehabilitatif |
| `file_hasil_tindak_lanjut_rehabilitatif` | TEXT | File hasil rehabilitatif |

---

## 14. EKSPOR EXCEL & IMPOR DATA

### 14.1 Ekspor Excel (menggunakan `exceljs`)

| Jenis Export | Role | Deskripsi |
|:---|:---|:---|
| **Admin 2-Sheet** | Admin | Sheet 1: Admin MCU, Sheet 2: Klinik Mini MCU |
| **Admin Card** | Admin | Per chart (departemen, divisi, dll) |
| **Klinik Inhealth** | Klinik | Format klaim asuransi Inhealth |
| **Klinik Card** | Klinik | Per chart klinik |
| **Single Record** | Semua | Export 1 karyawan |

### 14.2 Styling Excel

- **Kop header**: Logo PTPN 3, warna hijau tua `#064E3B`
- **Header row**: Background `#064E3B`, teks putih, bold
- **Data rows**: Zebra striping, border tegas
- **Auto-width columns**

### 14.3 Impor Excel/CSV

- Format template bisa didownload via `/api/mcu/download-template`
- Kolom minimum: `nama_lengkap`, `nik`, `tanggal_pemeriksaan`
- Parser mendukung `.xlsx` dan `.csv`

---

## 15. FILE UPLOAD & STORAGE (Supabase Storage)

### 15.1 Setup Bucket

Di Supabase Dashboard → Storage → Create Bucket:

```
Bucket: "medical-files"
  ├── fotos/           → Foto karyawan (max 2MB, image)
  ├── dokumen/         → Dokumen MCU (max 20MB, pdf/jpg/png/doc/xlsx)
  ├── rujukan/         → Surat rujukan (max 20MB)
  ├── surat-sakit/     → Surat sakit (max 20MB)
  ├── intervensi/      → Surat rujukan intervensi (max 20MB)
  └── hasil-tindak-lanjut/ → Hasil tindak lanjut (max 20MB)
```

### 15.2 Upload Logic

```typescript
async function uploadFile(file: File, folder: string): Promise<string> {
  const supabase = createAdminClient()
  const fileName = `${folder}/${Date.now()}_${file.name}`

  const { data, error } = await supabase.storage
    .from('medical-files')
    .upload(fileName, file, { upsert: false })

  if (error) throw error

  return data.path // Simpan path ini di database
}

// Untuk generate URL publik:
function getPublicUrl(path: string): string {
  const supabase = createClient()
  const { data } = supabase.storage.from('medical-files').getPublicUrl(path)
  return data.publicUrl
}
```

---

## 16. DESAIN UI & KOMPONEN PER HALAMAN

### 16.1 Color Palette PTPN 3

| Warna | Hex | Penggunaan |
|:---|:---|:---|
| Primary Forest Green | `#064E3B` | Header, sidebar, button primary, kop Excel |
| Primary Emerald | `#065F46` | Hover states, active menu |
| Secondary Emerald | `#047857` | Badge, accent |
| Light Green BG | `#eaf4ee` | Background sidebar |
| Fit Badge | `bg-emerald-100 text-emerald-700` | Status "Fit" |
| Catatan Badge | `bg-amber-100 text-amber-700` | Status "Fit dengan Catatan" |
| Tidak Fit Badge | `bg-red-100 text-red-700` | Status "Sementara Tidak Fit" |

### 16.2 Komponen per Halaman

| Halaman | Komponen Utama |
|:---|:---|
| **Login** | Role tab selector, input email/NIK, password, remember me |
| **Register** | Form: nama, email, NIK (opsional), divisi (opsional), role selector, password |
| **Admin Dashboard** | StatCards (Total MCU, Fit, Catatan, Tidak Fit), Charts (Departemen, Divisi, Kategori, Status), Tabel recent records |
| **Admin Rekapan MCU** | Tabs (MCU / Inhouse Clinic), search filter, bulan filter, divisi filter, departemen filter, tabel paginated, tombol export/import |
| **Admin Tambah/Edit Data** | Form 5-card: (1) Biodata, (2) Vitals, (3) Diagnosis, (4) Intervensi, (5) Obat & Dokumen |
| **Admin Detail MCU** | Card biodata, vitals, penyakit, catatan medis, kesimpulan, grafik tren riwayat, dokumen lampiran |
| **Admin Intervensi** | 3 stat cards (Promotif, Kuratif, Rehabilitatif), tabel karyawan per kategori |
| **Admin Ekspor Excel** | Preview tabel, filter bulan, tabs (Admin/Klinik), tombol download |
| **Klinik Dashboard** | StatCards, Charts kunjungan, tabel recent |
| **Klinik Rekapan Mini MCU** | Search, filter, tabel paginated |
| **Klinik Tambah/Edit Data** | Form mirip admin tanpa intervensi input (tapi bisa lihat intervensi di detail) |
| **Klinik Tambah Pemeriksaan** | Form pre-filled biodata dari record sebelumnya |
| **Klinik Detail** | Card biodata, vitals, penyakit, catatan, grafik tren |
| **Karyawan Dashboard** | Overview profil kesehatan, grafik tren vital signs interaktif (tensi, BMI, gula darah) |
| **Karyawan Hasil MCU** | Tabel read-only, detail per record |
| **Karyawan Hasil Mini MCU** | Tabel read-only, detail per record |
| **Karyawan Unggah Data** | Upload dokumen MCU mandiri, upload hasil tindak lanjut |
| **Settings** | Form ubah profil (nama, email, NIK, divisi) + form ubah password |
| **Notifications** | Pusat notifikasi lengkap, filter (Semua / Belum Dibaca) |

### 16.3 Layout Components

| Komponen | Props | Deskripsi |
|:---|:---|:---|
| `AppLayout` | `children`, `role` | Wrapper: sidebar + header + content area |
| `AppHeader` | `role` | Navbar sticky: logo, notifikasi bell (live count), dropdown profil |
| `AppSidebar` | `role`, `active` | Sidebar sticky: menu dinamis per role |
| `StatCard` | `title`, `value`, `icon`, `color`, `trend` | Kartu metrik ringkasan |
| `BadgeStatus` | `status` | Badge: Fit (hijau), Catatan (kuning), Tidak Fit (merah) |
| `BadgeKeluhan` | `count` | Badge: jumlah keluhan |

---

## 17. SIDEBAR NAVIGATION PER ROLE

### Admin
1. 📊 **Admin Overview** → `/admin/dashboard`
2. ❤️ **Intervensi Layanan Kesehatan** → `/admin/intervensi-layanan-kesehatan` *(+ badge count tindak lanjut)*
3. 📄 **Hasil MCU** → `/admin/rekapan-mcu`
4. ➕ **Tambah Data** → `/admin/tambah-data`
5. ⬇️ **Ekspor Excel** → `/admin/ekspor-excel`
6. ⚙️ Pengaturan Akun → `/settings`
7. 🚪 Logout

### Klinik
1. 📊 **Inhouse Clinic Overview** → `/klinik/dashboard`
2. ❤️ **Dashboard Intervensi** → `/klinik/intervensi-layanan-kesehatan` *(+ badge count)*
3. 📄 **Hasil Inhouse Clinic** → `/klinik/rekapan-mini-mcu`
4. ➕ **Tambah Data** → `/klinik/tambah-data`
5. ⬇️ **Ekspor Excel** → `/klinik/ekspor-excel`
6. ⚙️ Pengaturan Akun → `/settings`
7. 🚪 Logout

### Karyawan
1. 📊 **Dashboard** → `/karyawan/dashboard`
2. 📄 **Hasil MCU** → `/karyawan/hasil-mcu`
3. 🧪 **Inhouse Clinic** → `/karyawan/hasil-mini-mcu`
4. ⬆️ **Unggah Data MCU** → `/karyawan/unggah-data`
5. ⚙️ Pengaturan Akun → `/settings`
6. 🚪 Logout

---

## 18. VALIDATION RULES (Zod Schema)

```typescript
// src/lib/validations/mcu-schema.ts
import { z } from 'zod'

export const mcuRecordSchema = z.object({
  nama_lengkap:        z.string().min(1, 'Nama lengkap wajib diisi').max(255),
  nik:                 z.string().min(1, 'NIK wajib diisi').max(50),
  departemen:          z.string().max(255).optional().nullable(),
  kategori_peserta:    z.string().max(50).optional().nullable(),
  divisi:              z.string().max(255).optional().nullable(),
  jabatan:             z.string().max(255).optional().nullable(),
  nomor_inhealth:      z.string().max(100).optional().nullable(),
  nomor_bpjs:          z.string().max(100).optional().nullable(),
  jenis_kelamin:       z.enum(['Laki-laki', 'Perempuan']).optional().nullable(),
  nama_dokter:         z.string().max(255).optional().nullable(),
  nama_perawat:        z.string().max(255).optional().nullable(),
  umur:                z.number().int().min(17).max(100).optional().nullable(),
  tanggal_pemeriksaan: z.string().min(1, 'Tanggal pemeriksaan wajib diisi'), // date string
  jam_pemeriksaan:     z.string().optional().nullable(),
  golongan_darah:      z.string().max(5).optional().nullable(),
  tinggi_badan:        z.number().min(50).max(250).optional().nullable(),
  berat_badan:         z.number().min(10).max(300).optional().nullable(),
  tensi:               z.string().max(50).optional().nullable(),
  gula_darah:          z.string().max(50).optional().nullable(),
  suhu:                z.string().max(50).optional().nullable(),
  kolesterol:          z.string().max(50).optional().nullable(),
  asam_urat:           z.string().max(50).optional().nullable(),
  penyakit:            z.array(z.string()).optional().nullable(),
  obat:                z.array(z.string()).optional().nullable(),
  keluhan:             z.string().optional().nullable(),
  faktor_risiko:       z.string().optional().nullable(),
  diagnosa:            z.string().optional().nullable(),
  konsultasi:          z.string().optional().nullable(),
  saran:               z.string().optional().nullable(),
  anjuran:             z.string().optional().nullable(),
  kesimpulan:          z.enum(['fit', 'fit_dengan_catatan', 'sementara_tidak_fit']).optional().nullable(),
  intervensi:          z.array(z.string()).optional().nullable(),
  tanggal_pemeriksaan_lanjutan: z.string().optional().nullable(),
  catatan_intervensi:  z.string().max(5000).optional().nullable(),
  nama_poli:           z.string().max(255).optional().nullable(),
  nama_rs:             z.string().max(255).optional().nullable(),
})

export const loginSchema = z.object({
  role:     z.enum(['admin', 'klinik', 'karyawan']),
  email:    z.string().min(1, 'Email atau NIK wajib diisi'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
})

export const registerSchema = z.object({
  name:     z.string().min(1, 'Nama lengkap wajib diisi').max(255),
  email:    z.string().email('Format email tidak valid').max(255),
  role:     z.enum(['admin', 'klinik', 'karyawan']),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
  nik:      z.string().optional().nullable(),
  divisi:   z.string().max(255).optional().nullable(),
})

export const settingsProfileSchema = z.object({
  name:   z.string().min(1, 'Nama lengkap wajib diisi').max(255),
  email:  z.string().email().max(255),
  nik:    z.string().max(100).optional().nullable(),
  divisi: z.string().max(255).optional().nullable(),
})

export const settingsPasswordSchema = z.object({
  current_password: z.string().min(1, 'Password saat ini wajib diisi'),
  password:         z.string().min(6, 'Password baru minimal 6 karakter'),
  password_confirmation: z.string(),
}).refine(data => data.password === data.password_confirmation, {
  message: 'Konfirmasi password tidak cocok',
  path: ['password_confirmation'],
})
```

---

## 19. ALUR SISTEM (System Flow)

### 19.1 Autentikasi & Redirect Multi-Role

```
User akses "/" atau "/dashboard"
  └─ Belum login? → Redirect ke /login
  └─ Sudah login?
       ├─ role=admin     → /admin/dashboard
       ├─ role=klinik    → /klinik/dashboard
       └─ role=karyawan  → /karyawan/dashboard
```

### 19.2 Input MCU oleh Admin

```
1. Admin buka /admin/tambah-data
2. Isi form 5-card:
   ├─ Card 1: Biodata (nama, NIK, departemen, jabatan, dokter, perawat, foto)
   ├─ Card 2: Pengukuran fisik (TB, BB, BMI auto, tensi, gula darah, suhu, kolesterol, asam urat)
   ├─ Card 3: Checklist 28 penyakit, kesimpulan (fit/catatan/tidak fit), catatan 4 kuadran
   ├─ Card 4: Intervensi (Promotif & Preventif, Kuratif, Rehabilitatif) — checkbox items
   ├─ Card 5: Obat & upload dokumen/rujukan/surat sakit
3. Submit → POST /api/admin/mcu → mcuService.createRecord()
   ├─ Insert ke tabel mcu_records
   ├─ Upload file ke Supabase Storage
   ├─ notificationService → kirim notifikasi ke Karyawan (jika NIK match)
4. Redirect ke /admin/dashboard dengan toast success
```

### 19.3 Input Mini MCU oleh Klinik

```
1. Klinik buka /klinik/tambah-data
2. Isi form serupa (tanpa intervensi checkbox input)
3. Submit → POST /api/klinik/mcu → mcuService.createRecord()
   ├─ Insert ke tabel mini_mcu_records
   ├─ Upload file (dokumen, rujukan, surat sakit)
   ├─ notificationService → kirim notifikasi ke:
   │   ├─ Karyawan (hasil pemeriksaan / rujukan / dokumen)
   │   └─ Admin (data baru dari klinik / rujukan / dokumen)
4. Redirect ke /klinik/dashboard
```

### 19.4 "Tambah Pemeriksaan" Lanjutan (Klinik)

```
1. Klinik melihat daftar karyawan di dashboard/rekapan
2. Klik "Tambah Pemeriksaan" pada karyawan tertentu
3. Buka /klinik/mcu/tambah-pemeriksaan/[id]
4. Form sudah pre-filled biodata karyawan dari record sebelumnya
5. Input data pemeriksaan baru → simpan sebagai record BARU di mini_mcu_records
6. Karyawan bisa melihat multiple records (histori pemeriksaan)
```

### 19.5 Notifikasi Real-Time (Supabase Realtime)

```
1. Semua halaman punya navbar dengan ikon lonceng (bell icon)
2. Supabase Realtime subscribe ke tabel app_notifications (WebSocket)
3. Jika ada INSERT baru (user_id match ATAU target_role match) → badge counter update
4. Klik lonceng → pop-up dropdown ringkasan notifikasi
5. Klik notifikasi → POST /api/notifications/[id]/read → redirect ke halaman terkait
6. "Tandai Semua Dibaca" → POST /api/notifications/read-all
7. "Lihat Semua" → /notifications
```

### 19.6 Upload MCU Mandiri oleh Karyawan

```
1. Karyawan buka /karyawan/unggah-data
2. Upload file dokumen MCU (PDF/foto hasil lab)
3. Submit → POST /api/karyawan/upload-mcu
   ├─ Upload file ke Supabase Storage
   ├─ Update record terkait (jika ada, berdasarkan NIK) atau buat baru
   ├─ notificationService → kirim ke Admin + Klinik
4. Success toast notification
```

### 19.7 Update Vital Signs Mandiri oleh Karyawan

```
1. Karyawan buka halaman detail MCU atau dashboard
2. Klik "Perbarui Data Vital" → modal/form update
3. Input: tensi, gula_darah, suhu, berat_badan, tinggi_badan
4. Submit → POST /api/karyawan/update-vitals
   ├─ Update record terkait (set vitals_updated_at, vitals_updated_by_role = 'karyawan')
   ├─ Auto recalculate BMI
   ├─ notificationService → kirim ke Admin + Klinik
5. Success toast notification
```

---

## 20. CATATAN TEKNIS PENTING

### 20.1 Bagaimana Data Karyawan Terhubung
- Data MCU/Mini MCU **TIDAK** pakai foreign key ke `users`.
- Pencocokan berdasarkan **NIK** dan/atau **nama_lengkap** (case-insensitive).
- Di Next.js, gunakan query:
  ```typescript
  const { data } = await supabase
    .from('mcu_records')
    .select('*')
    .or(`nik.ilike.${userNik},nama_lengkap.ilike.${userName}`)
    .order('tanggal_pemeriksaan', { ascending: false })
  ```

### 20.2 Auto-BMI Calculation
```typescript
// src/lib/utils/bmi.ts
export function calculateBMI(tinggiCm: number, beratKg: number): number {
  if (!tinggiCm || !beratKg || tinggiCm <= 0) return 0
  const tinggiM = tinggiCm / 100
  return Math.round((beratKg / (tinggiM * tinggiM)) * 10) / 10
}

export function getBMIKlasifikasi(bmi: number): string {
  if (!bmi) return '-'
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25.0) return 'Normal'
  if (bmi < 30.0) return 'Overweight'
  return 'Obesitas'
}
```

### 20.3 Checklist 28 Parameter Klinis MCU
```typescript
// src/lib/utils/constants.ts
export const PENYAKIT_LIST = [
  // Kolom 1
  'Anemia', 'Diabetes Mellitus', 'Hipertensi', 'Hipertensi Tingkat 1',
  'Hipertensi Tingkat 2', 'Kolesterol', 'Asam Urat Tinggi',
  'SGOT & SGPT Meningkat', 'Gangguan Fungsi Hati',
  // Kolom 2
  'Hepatitis B (Non Imun)', 'Hepatitis C', 'Gangguan Refraksi Mata',
  'Gangguan Pendengaran', 'Gangguan Ginjal', 'Infeksi Saluran Kemih',
  'Gangguan Tiroid', 'Obesitas', 'Overweight',
  // Kolom 3
  'TBC / TB Paru', 'ISPA', 'Bronkitis', 'Asma', 'Jantung Koroner',
  'Gangguan Lambung / GERD', 'Dermatitis / Eksim', 'Osteoarthritis',
  'Hernia', 'Vertigo',
]

export const INTERVENSI_PROMOTIF = [
  'Health Talk', 'Sekantor', 'Gym', 'Medical Check Up',
  'Healthy Food', 'Konsultasi Kesehatan', 'Weight Loss Challenge', 'Vaksin Hepatitis B',
]

export const INTERVENSI_KURATIF = [
  'Konsultasi Lanjutan', 'Employee Health Counseling Program', 'Kesegaran',
]

export const INTERVENSI_REHABILITATIF = [
  'Monitoring hasil tindak lanjut oleh dokter ahli',
]

export const KESIMPULAN_OPTIONS = [
  { value: 'fit', label: 'Fit', color: 'emerald' },
  { value: 'fit_dengan_catatan', label: 'Fit dengan Catatan', color: 'amber' },
  { value: 'sementara_tidak_fit', label: 'Sementara Tidak Fit', color: 'red' },
] as const
```

### 20.4 Perbedaan Query MySQL → PostgreSQL

| MySQL (Laravel) | PostgreSQL (Supabase) |
|:---|:---|
| `LIKE "%term%"` | `ILIKE '%term%'` (case-insensitive) |
| `DATE_FORMAT(col, "%Y-%m")` | `TO_CHAR(col, 'YYYY-MM')` |
| `LOWER(col)` | `LOWER(col)` atau pakai `ILIKE` |
| `whereRaw('LOWER(email) = ?', [$email])` | `.ilike('email', email)` |
| `JSON_CONTAINS()` | `@>` operator atau `jsonb_array_elements()` |
| `DISTINCT` | `DISTINCT` (sama) |
| `paginate($perPage)` | Supabase: `.range(from, to)` |

### 20.5 Timestamp Format Indonesia
```typescript
// src/lib/utils/format.ts
import { format, formatDistanceToNow } from 'date-fns'
import { id as localeID } from 'date-fns/locale'

export function formatTanggalIndo(date: string | Date): string {
  return format(new Date(date), 'd MMMM yyyy', { locale: localeID })
}

export function formatTimeAgo(date: string | Date): string {
  const d = new Date(date)
  const diffMs = Date.now() - d.getTime()
  if (diffMs < 60000) return 'Baru saja'
  return formatDistanceToNow(d, { addSuffix: true, locale: localeID })
}
```

---

## CHECKLIST INTEGRASI

- [ ] Setup project Next.js + TypeScript + Tailwind
- [ ] Buat project Supabase + konfigurasi `.env.local`
- [ ] Jalankan schema SQL di Supabase SQL Editor
- [ ] Setup Supabase Auth (client + server + admin)
- [ ] Buat tabel users + sinkronisasi dengan Supabase Auth
- [ ] Seed data awal (users + obats + sample records)
- [ ] Implementasi middleware route protection
- [ ] Buat semua page routes sesuai mapping
- [ ] Implementasi service layer (mcu-service, notification-service)
- [ ] Buat komponen form MCU modular (5 card)
- [ ] Implementasi notifikasi real-time (Supabase Realtime)
- [ ] Implementasi CRUD per role
- [ ] Setup Supabase Storage untuk file upload
- [ ] Implementasi ekspor Excel (exceljs)
- [ ] Implementasi impor Excel/CSV
- [ ] Buat semua halaman UI sesuai desain
- [ ] Test semua flow per role
- [ ] Migrasi data MySQL → PostgreSQL (jika ada data produksi)

---

*Dokumen ini dibuat per 2 September 2026 berdasarkan analisis lengkap project PTPN-LK3 Laravel.*
*Gunakan dokumen ini sebagai referensi utama saat membangun project Next.js + Supabase baru.*
