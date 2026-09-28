-- =====================================================================
-- SCHEMA DATABASE SUPABASE — PTPN-LK3 (SISTEM KESEHATAN & MCU LENGKAP)
-- Versi: 9 September 2026
-- =====================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'klinik', 'karyawan');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE kesimpulan_status AS ENUM ('fit', 'fit_dengan_catatan', 'sementara_tidak_fit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TABEL USERS (Akun Login & Autentikasi)
CREATE TABLE IF NOT EXISTS public.users (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    nik             TEXT UNIQUE,
    divisi          TEXT,
    role            user_role NOT NULL DEFAULT 'karyawan',
    email_verified_at TIMESTAMPTZ,
    password        TEXT NOT NULL,
    remember_token  TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL MASTER_KARYAWAN (Master Biodata Karyawan Terpusat)
CREATE TABLE IF NOT EXISTS public.master_karyawan (
    id                BIGSERIAL PRIMARY KEY,
    nik               TEXT NOT NULL UNIQUE,
    nama_lengkap      TEXT NOT NULL,
    departemen        TEXT DEFAULT 'PTPN 3',
    divisi            TEXT,
    jabatan           TEXT,
    kategori_peserta  TEXT DEFAULT 'Tetap',
    jenis_kelamin     TEXT CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    tanggal_lahir     DATE,
    umur              INTEGER,
    golongan_darah    TEXT,
    nomor_bpjs        TEXT,
    nomor_inhealth    TEXT,
    nomor_telepon     TEXT,
    alamat            TEXT,
    foto              TEXT,
    status_aktif      BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABEL MCU_RECORDS (Data Medical Check-Up Tahunan / RS dari Admin)
CREATE TABLE IF NOT EXISTS public.mcu_records (
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
    jenis_kelamin     TEXT CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    nama_dokter       TEXT,
    nama_perawat      TEXT,
    umur              INTEGER,
    tanggal_pemeriksaan DATE NOT NULL,
    jam_pemeriksaan   TIME,
    foto              TEXT,

    -- Berkas & Dokumen MCU
    file_dokumen      TEXT,
    nama_dokumen      TEXT,
    file_rujukan      TEXT,
    nama_rujukan_file TEXT,
    file_surat_sakit  TEXT,
    nama_surat_sakit  TEXT,
    nama_poli         TEXT,
    nama_rs           TEXT,

    -- Tanda Vital & Parameter Medis
    golongan_darah    TEXT,
    tinggi_badan      NUMERIC(5,1),
    berat_badan       NUMERIC(5,1),
    bmi               NUMERIC(4,1),
    tensi             TEXT,           -- Format: "120/80"
    gula_darah        TEXT,
    suhu              TEXT,
    vitals_updated_at TIMESTAMPTZ,
    vitals_updated_by_role TEXT,
    kolesterol        TEXT,
    asam_urat         TEXT,

    -- Catatan Medis, Keluhan, & Diagnosa
    penyakit          JSONB,          -- ["Anemia", "Hipertensi", ...]
    obat              JSONB,          -- ["PCT", "Amoxicilin", ...]
    keluhan           TEXT,
    faktor_risiko     TEXT,
    penyakit_text     TEXT,
    diagnosa          TEXT,
    konsultasi        TEXT,
    saran             TEXT,
    anjuran           TEXT,

    -- Status Kebugaran & Kesimpulan
    kesimpulan        kesimpulan_status DEFAULT 'fit',
    status_kebugaran  TEXT DEFAULT 'Fit for Duty',

    -- Intervensi Medis
    intervensi                  JSONB,    -- ["Health Talk", "Konsultasi Lanjutan", ...]
    tanggal_pemeriksaan_lanjutan DATE,
    file_surat_rujukan_intervensi TEXT,
    nama_surat_rujukan_intervensi TEXT,
    catatan_intervensi          TEXT,

    -- Tindak Lanjut Umum
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

-- 5. TABEL MINI_MCU_RECORDS (Data Kunjungan Harian & Mini MCU Klinik Kebun)
CREATE TABLE IF NOT EXISTS public.mini_mcu_records (
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
    status_kebugaran  TEXT DEFAULT 'Fit for Duty',
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

-- 6. TABEL KARYAWAN_RECORDS (Khusus Data Unggahan & Pemeriksaan Mandiri Karyawan)
CREATE TABLE IF NOT EXISTS public.karyawan_records (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    nama_lengkap      TEXT NOT NULL,
    nik               TEXT NOT NULL,
    departemen        TEXT DEFAULT 'PTPN 3',
    divisi            TEXT,
    jabatan           TEXT,
    nomor_inhealth    TEXT,
    nomor_bpjs        TEXT,
    jenis_kelamin     TEXT CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    umur              INTEGER,
    tanggal_pemeriksaan DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_pemeriksaan   TIME,
    nama_rs           TEXT,           -- RS / Faskes eksternal tempat tes
    nama_poli         TEXT,
    foto              TEXT,

    -- Berkas Unggahan
    file_dokumen      TEXT,           -- Laporan MCU PDF / Foto
    nama_dokumen      TEXT,
    file_rujukan      TEXT,           -- Surat Rujukan
    nama_rujukan_file TEXT,
    file_surat_sakit  TEXT,           -- Surat Izin Sakit / Istirahat
    nama_surat_sakit  TEXT,

    -- Tanda Vital Mandiri
    golongan_darah    TEXT,
    tinggi_badan      NUMERIC(5,1),
    berat_badan       NUMERIC(5,1),
    bmi               NUMERIC(4,1),
    tensi             TEXT,
    gula_darah        TEXT,
    kolesterol        TEXT,
    asam_urat         TEXT,
    suhu              TEXT,

    -- Catatan Mandiri & Status
    keluhan           TEXT,
    catatan_tambahan  TEXT,
    kesimpulan        kesimpulan_status DEFAULT 'fit',
    status_kebugaran  TEXT DEFAULT 'Fit for Duty',
    butuh_tindak_lanjut BOOLEAN DEFAULT FALSE,
    tindak_lanjut_selesai BOOLEAN DEFAULT FALSE,
    created_by_role   TEXT DEFAULT 'karyawan',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABEL CATATAN_MEDIS (Rekam Medis Khusus, Anamnesis, Catatan Dokter & Konsultasi)
CREATE TABLE IF NOT EXISTS public.catatan_medis (
    id                BIGSERIAL PRIMARY KEY,
    nik               TEXT NOT NULL,
    nama_pasien       TEXT NOT NULL,
    mcu_record_id     BIGINT REFERENCES public.mcu_records(id) ON DELETE SET NULL,
    mini_mcu_record_id BIGINT REFERENCES public.mini_mcu_records(id) ON DELETE SET NULL,
    dokter_pemeriksa  TEXT,
    perawat_pemeriksa TEXT,
    lokasi_klinik     TEXT DEFAULT 'Klinik Pratama PTPN',
    tanggal_kunjungan DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_kunjungan     TIME,

    -- SOAP (Subjective, Objective, Assessment, Plan)
    keluhan_utama     TEXT,           -- S (Subjective)
    riwayat_penyakit  TEXT,
    riwayat_alergi    TEXT,
    faktor_risiko     TEXT,
    tanda_vital       JSONB,          -- O (Objective): tensi, nadi, suhu, gula_darah, bmi, dll.
    diagnosa_utama    TEXT NOT NULL,  -- A (Assessment / ICD-10)
    diagnosa_sekunder TEXT,
    kategori_penyakit TEXT,           -- Kardiovaskular, Metabolik, ISPA, Gastro, dll.
    terapi_obat       JSONB,          -- P (Plan): daftar obat dan dosis
    tindakan_medis    TEXT,           -- Tindakan medis yang dilakukan
    konsultasi        TEXT,           -- Catatan konsultasi & edukasi
    saran_dokter      TEXT,           -- Saran pola hidup & pemulihan
    anjuran_medis     TEXT,           -- Anjuran istirahat / rujukan

    -- Status & Rujukan
    status_kebugaran  TEXT DEFAULT 'Fit for Duty',
    perlu_rujukan     BOOLEAN DEFAULT FALSE,
    rs_rujukan        TEXT,
    poli_rujukan      TEXT,
    tanggal_kontrol   DATE,
    created_by_role   TEXT DEFAULT 'klinik',
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABEL APP_NOTIFICATIONS (Notifikasi Sistem Real-time)
CREATE TABLE IF NOT EXISTS public.app_notifications (
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

-- 9. TABEL OBATS (Master Data Obat)
CREATE TABLE IF NOT EXISTS public.obats (
    id         BIGSERIAL PRIMARY KEY,
    nama_obat  TEXT NOT NULL UNIQUE,
    kategori   TEXT DEFAULT 'Umum',
    stok       INTEGER DEFAULT 100,
    satuan     TEXT DEFAULT 'Tablet',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TABEL MEDICAL_SUGGESTIONS (Template Saran & Anjuran Dokter)
CREATE TABLE IF NOT EXISTS public.medical_suggestions (
    id         BIGSERIAL PRIMARY KEY,
    type       VARCHAR(50) NOT NULL,
    text       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(type, text)
);

-- =====================================================================
-- 11. INDEXES (Untuk Kecepatan Query & Pencarian NIK)
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_nik ON public.users(nik);
CREATE INDEX IF NOT EXISTS idx_master_karyawan_nik ON public.master_karyawan(nik);
CREATE INDEX IF NOT EXISTS idx_mcu_nik ON public.mcu_records(nik);
CREATE INDEX IF NOT EXISTS idx_mini_mcu_nik ON public.mini_mcu_records(nik);
CREATE INDEX IF NOT EXISTS idx_karyawan_records_nik ON public.karyawan_records(nik);
CREATE INDEX IF NOT EXISTS idx_catatan_medis_nik ON public.catatan_medis(nik);
CREATE INDEX IF NOT EXISTS idx_notif_user ON public.app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_role ON public.app_notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notif_read ON public.app_notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_suggestions_type ON public.medical_suggestions(type);

-- =====================================================================
-- 12. ROW LEVEL SECURITY (RLS) & POLICIES
-- =====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_karyawan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mcu_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mini_mcu_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karyawan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catatan_medis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.obats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_suggestions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow All Users" ON public.users;
    DROP POLICY IF EXISTS "Allow All MasterKaryawan" ON public.master_karyawan;
    DROP POLICY IF EXISTS "Allow All Mcu" ON public.mcu_records;
    DROP POLICY IF EXISTS "Allow All MiniMcu" ON public.mini_mcu_records;
    DROP POLICY IF EXISTS "Allow All KaryawanRecords" ON public.karyawan_records;
    DROP POLICY IF EXISTS "Allow All CatatanMedis" ON public.catatan_medis;
    DROP POLICY IF EXISTS "Allow All AppNotif" ON public.app_notifications;
    DROP POLICY IF EXISTS "Allow All Obats" ON public.obats;
    DROP POLICY IF EXISTS "Allow All Suggestions" ON public.medical_suggestions;
END $$;

CREATE POLICY "Allow All Users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All MasterKaryawan" ON public.master_karyawan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Mcu" ON public.mcu_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All MiniMcu" ON public.mini_mcu_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All KaryawanRecords" ON public.karyawan_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All CatatanMedis" ON public.catatan_medis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All AppNotif" ON public.app_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Obats" ON public.obats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Suggestions" ON public.medical_suggestions FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 13. AUTO-UPDATE TRIGGER FUNCTION
-- =====================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_users ON public.users;
    DROP TRIGGER IF EXISTS trg_master_karyawan ON public.master_karyawan;
    DROP TRIGGER IF EXISTS trg_mcu ON public.mcu_records;
    DROP TRIGGER IF EXISTS trg_mini_mcu ON public.mini_mcu_records;
    DROP TRIGGER IF EXISTS trg_karyawan_records ON public.karyawan_records;
    DROP TRIGGER IF EXISTS trg_catatan_medis ON public.catatan_medis;
    DROP TRIGGER IF EXISTS trg_notif ON public.app_notifications;
END $$;

CREATE TRIGGER trg_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_master_karyawan BEFORE UPDATE ON public.master_karyawan FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_mcu BEFORE UPDATE ON public.mcu_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_mini_mcu BEFORE UPDATE ON public.mini_mcu_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_karyawan_records BEFORE UPDATE ON public.karyawan_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_catatan_medis BEFORE UPDATE ON public.catatan_medis FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notif BEFORE UPDATE ON public.app_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================================
-- 14. REALTIME NOTIFICATIONS
-- =====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_notifications;

-- =====================================================================
-- 15. SEED DATA: MASTER OBAT
-- =====================================================================
INSERT INTO public.obats (nama_obat) VALUES
  ('Allopurinol 100 mg'),('Alpara'),('Ambroxol'),('Amlodipin 5 mg'),
  ('Amoxicilin'),('Asam Mefenamat'),('Becomzet'),('Betahistine'),
  ('Cetirizine'),('Degirol'),('Dexamethasone (Dex/Dexa)'),('Donperidon'),
  ('Lansoprazole'),('Methylprednisolone 4 mg'),('Methylprednisolone 8 mg'),
  ('Mucofek'),('Neurodex'),('New Diatab'),('Omeprazole'),('Omz'),
  ('PCT'),('Polysilane'),('Ranitidine'),('Sanmol'),('Scopma'),
  ('Tremenza'),('Salep Hydrocortisone')
ON CONFLICT (nama_obat) DO NOTHING;
