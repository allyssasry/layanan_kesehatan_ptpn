-- ==============================================================================
-- MIGRASI SUPABASE: FITUR DONOR DARAH (TABEL DENGAN PREFIX mcu_)
-- Sesuai dengan seluruh nama tabel yang aktif di Supabase Database:
-- - mcu_users
-- - mcu_records
-- - mcu_karyawan_records
-- - mcu_mini_mcu_records
-- - mcu_obats
-- - mcu_medical_suggestions
-- - mcu_app_notifications
-- - mcu_donor_darah (TABEL BARU)
--
-- CARA MENJALANKAN DI SUPABASE:
-- 1. Buka Supabase Dashboard -> Masuk ke Project Anda
-- 2. Klik menu "SQL Editor" di bilah navigasi kiri
-- 3. Salin & Tempel (Paste) seluruh skrip ini, lalu klik tombol "Run" (Ctrl + Enter)
-- ==============================================================================

-- 1. PASTIKAN KOLOM role PADA TABEL mcu_users DAPAT MENERIMA 'donor_darah'
-- Mengubah kolom role menjadi tipe TEXT agar leluasa menerima role baru tanpa hambatan enum.
DO $$
BEGIN
    ALTER TABLE IF EXISTS public.mcu_users ALTER COLUMN role TYPE text;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 2. BUAT TABEL BARU: mcu_donor_darah
CREATE TABLE IF NOT EXISTS public.mcu_donor_darah (
    id                  BIGSERIAL PRIMARY KEY,

    -- Relasi ke data peserta / user / MCU records existing (Tabel berawalan mcu_)
    user_id             BIGINT,
    mcu_record_id       BIGINT,
    nik                 TEXT NOT NULL,

    -- Snapshot Identitas Peserta Existing (Otomatis dari data peserta di mcu_records / mcu_users)
    nama_lengkap        TEXT NOT NULL,
    entitas             TEXT NOT NULL CHECK (entitas IN ('PTPN III / Holding', 'PTPN I / SuppCo', 'PTPN IV / PalmCo', 'Bukan Entitas')),
    divisi              TEXT,
    jabatan             TEXT,
    nomor_inhealth      TEXT,
    nomor_bpjs          TEXT,
    jenis_kelamin       TEXT CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    umur                INTEGER,
    foto                TEXT,

    -- Data Khusus Kegiatan Donor Darah
    tanggal_donor       DATE NOT NULL DEFAULT CURRENT_DATE,
    golongan_darah      TEXT NOT NULL, -- 'A', 'B', 'AB', 'O'
    rhesus              TEXT DEFAULT '+',
    jenis_donor         TEXT NOT NULL DEFAULT 'Darah Lengkap (Whole Blood)',
    lokasi_donor        TEXT NOT NULL,
    penyelenggara_donor TEXT NOT NULL DEFAULT 'Palang Merah Indonesia (PMI)',
    volume_darah        TEXT DEFAULT '350 ml',
    keterangan          TEXT,
    bukti_donor         TEXT,
    nama_bukti_donor    TEXT,

    -- Metadata
    status              TEXT DEFAULT 'Selesai',
    created_by_role     TEXT DEFAULT 'klinik',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2.1 PASTIKAN CHECK CONSTRAINT ENTITAS MENERIMA 'Bukan Entitas' BILA TABEL SUDAH PERNAH DIBUAT
DO $$
BEGIN
    ALTER TABLE public.mcu_donor_darah DROP CONSTRAINT IF EXISTS mcu_donor_darah_entitas_check;
    ALTER TABLE public.mcu_donor_darah ADD CONSTRAINT mcu_donor_darah_entitas_check 
        CHECK (entitas IN ('PTPN III / Holding', 'PTPN I / SuppCo', 'PTPN IV / PalmCo', 'Bukan Entitas'));
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 3. RELASI FOREIGN KEY KE TABEL mcu_users & mcu_records (AMAN & AMAN ERROR)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'mcu_donor_darah_user_id_fkey'
    ) THEN
        ALTER TABLE public.mcu_donor_darah
        ADD CONSTRAINT mcu_donor_darah_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES public.mcu_users(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'mcu_donor_darah_mcu_record_id_fkey'
    ) THEN
        ALTER TABLE public.mcu_donor_darah
        ADD CONSTRAINT mcu_donor_darah_mcu_record_id_fkey
        FOREIGN KEY (mcu_record_id) REFERENCES public.mcu_records(id) ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 4. INDEKS UNTUK PENCARIAN & FILTER CEPAT
CREATE INDEX IF NOT EXISTS idx_mcu_donor_darah_nik ON public.mcu_donor_darah(nik);
CREATE INDEX IF NOT EXISTS idx_mcu_donor_darah_user_id ON public.mcu_donor_darah(user_id);
CREATE INDEX IF NOT EXISTS idx_mcu_donor_darah_mcu_record_id ON public.mcu_donor_darah(mcu_record_id);
CREATE INDEX IF NOT EXISTS idx_mcu_donor_darah_tanggal ON public.mcu_donor_darah(tanggal_donor DESC);
CREATE INDEX IF NOT EXISTS idx_mcu_donor_darah_entitas ON public.mcu_donor_darah(entitas);
CREATE INDEX IF NOT EXISTS idx_mcu_donor_darah_golongan ON public.mcu_donor_darah(golongan_darah);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.mcu_donor_darah ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow All Donor Darah" ON public.mcu_donor_darah;
DROP POLICY IF EXISTS "Karyawan only view own donor records" ON public.mcu_donor_darah;
DROP POLICY IF EXISTS "Petugas Donor and Admin full access" ON public.mcu_donor_darah;

CREATE POLICY "Allow All Donor Darah" ON public.mcu_donor_darah
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 6. INTEGRASI ROLE KLINIK (FITUR DONOR DARAH DIKELOLA ROLE KLINIK)
-- Seluruh pengelolaan donor darah masuk ke petugas klinik (Inhouse Clinic) & admin.
-- Menghapus akun terpisah donor darah serta menstandarisasi created_by_role ke 'klinik'.
UPDATE public.mcu_donor_darah 
SET created_by_role = 'klinik' 
WHERE created_by_role = 'donor_darah' OR created_by_role IS NULL;

DELETE FROM public.mcu_users 
WHERE role = 'donor_darah' 
   OR email IN ('donor@ptpn.co.id', 'donordarah@ptpn.com')
   OR nik IN ('DNR-001', '3483828');

-- 7. SEED DATA AWAL DONOR DARAH (MENGAMBIL ID DARI mcu_records & mcu_users)
INSERT INTO public.mcu_donor_darah (
    mcu_record_id,
    user_id,
    nik,
    nama_lengkap,
    entitas,
    divisi,
    jabatan,
    nomor_inhealth,
    nomor_bpjs,
    jenis_kelamin,
    umur,
    tanggal_donor,
    golongan_darah,
    rhesus,
    jenis_donor,
    lokasi_donor,
    penyelenggara_donor,
    volume_darah,
    keterangan,
    status,
    created_by_role
)
SELECT
    (SELECT id FROM public.mcu_records WHERE nik = '1271181507880005' LIMIT 1),
    (SELECT id FROM public.mcu_users WHERE nik = '1271181507880005' LIMIT 1),
    '1271181507880005',
    'NICO DEMUS MARPAUNG',
    'PTPN III / Holding',
    'Divisi Keuangan Strategis dan Anggaran',
    'Staf Karyawan',
    '1001550650005',
    '0001488535121',
    'Laki-laki',
    35,
    CURRENT_DATE - INTERVAL '15 days',
    'O',
    '+',
    'Darah Lengkap (Whole Blood)',
    'Gedung Holding PTPN - Lt. 2 (Aula Serbaguna)',
    'Palang Merah Indonesia (PMI) Kota Medan',
    '350 ml',
    'Pendonor rutin ke-6. Kondisi pasca donor sangat baik.',
    'Selesai',
    'klinik'
WHERE NOT EXISTS (SELECT 1 FROM public.mcu_donor_darah WHERE nik = '1271181507880005');

INSERT INTO public.mcu_donor_darah (
    mcu_record_id,
    user_id,
    nik,
    nama_lengkap,
    entitas,
    divisi,
    jabatan,
    nomor_inhealth,
    nomor_bpjs,
    jenis_kelamin,
    umur,
    tanggal_donor,
    golongan_darah,
    rhesus,
    jenis_donor,
    lokasi_donor,
    penyelenggara_donor,
    volume_darah,
    keterangan,
    status,
    created_by_role
)
SELECT
    (SELECT id FROM public.mcu_records WHERE nik = '3301212612850001' LIMIT 1),
    (SELECT id FROM public.mcu_users WHERE nik = '3301212612850001' LIMIT 1),
    '3301212612850001',
    'ARIS AGUNG PURNOMO, SE. AK',
    'PTPN III / Holding',
    'Divisi Akuntansi & Perpajakan',
    'Kepala Sub Bagian',
    '1001550650012',
    '0001488535133',
    'Laki-laki',
    41,
    CURRENT_DATE - INTERVAL '5 days',
    'A',
    '+',
    'Darah Lengkap (Whole Blood)',
    'Klinik Pratama PTPN',
    'PMI Unit Transfusi Darah',
    '450 ml',
    'Donor darah dalam rangka HUT PTPN.',
    'Selesai',
    'klinik'
WHERE NOT EXISTS (SELECT 1 FROM public.mcu_donor_darah WHERE nik = '3301212612850001');

INSERT INTO public.mcu_donor_darah (
    mcu_record_id,
    user_id,
    nik,
    nama_lengkap,
    entitas,
    divisi,
    jabatan,
    nomor_inhealth,
    nomor_bpjs,
    jenis_kelamin,
    umur,
    tanggal_donor,
    golongan_darah,
    rhesus,
    jenis_donor,
    lokasi_donor,
    penyelenggara_donor,
    volume_darah,
    keterangan,
    status,
    created_by_role
)
SELECT
    (SELECT id FROM public.mcu_records WHERE nik = '3202141104890002' LIMIT 1),
    (SELECT id FROM public.mcu_users WHERE nik = '3202141104890002' LIMIT 1),
    '3202141104890002',
    'DEDE SAEPULROHMAN',
    'PTPN I / SuppCo',
    'Divisi Operasional & Logistik',
    'Supervisor',
    '1001550650088',
    '0001488535199',
    'Laki-laki',
    37,
    CURRENT_DATE - INTERVAL '2 days',
    'B',
    '+',
    'Apheresis (Trombosit)',
    'Kantor Direksi PTPN I',
    'PMI DKI Jakarta',
    '350 ml',
    'Donor darah trombosit afresis, hemoglobin normal (14.5 g/dL).',
    'Selesai',
    'klinik'
WHERE NOT EXISTS (SELECT 1 FROM public.mcu_donor_darah WHERE nik = '3202141104890002');

INSERT INTO public.mcu_donor_darah (
    mcu_record_id,
    user_id,
    nik,
    nama_lengkap,
    entitas,
    divisi,
    jabatan,
    nomor_inhealth,
    nomor_bpjs,
    jenis_kelamin,
    umur,
    tanggal_donor,
    golongan_darah,
    rhesus,
    jenis_donor,
    lokasi_donor,
    penyelenggara_donor,
    volume_darah,
    keterangan,
    status,
    created_by_role
)
SELECT
    (SELECT id FROM public.mcu_records WHERE nik = '2572874' LIMIT 1),
    (SELECT id FROM public.mcu_users WHERE nik = '2572874' LIMIT 1),
    '2572874',
    'allyssa',
    'PTPN III / Holding',
    'DPDU',
    'Staf Karyawan',
    '1001550650777',
    '0001488535777',
    'Perempuan',
    28,
    CURRENT_DATE - INTERVAL '20 days',
    'AB',
    '+',
    'Darah Lengkap (Whole Blood)',
    'Klinik Pratama PTPN',
    'PMI Kota Medan',
    '350 ml',
    'Donor pertama kali. Tensi stabil 110/75 mmHg.',
    'Selesai',
    'klinik'
WHERE NOT EXISTS (SELECT 1 FROM public.mcu_donor_darah WHERE nik = '2572874');

-- 8. REFRESH SCHEMA CACHE SUPABASE REST
NOTIFY pgrst, 'reload schema';

-- 9. VERIFIKASI DAFTAR TABEL mcu_* DI SUPABASE
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'mcu_%'
ORDER BY table_name;
