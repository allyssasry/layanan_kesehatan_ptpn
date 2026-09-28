-- =====================================================================
-- SCRIPT PENAMBAHAN TABEL BARU SUPABASE — PTPN-LK3
-- Jalankan skrip ini di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Skrip ini AMAN dijalankan (tidak akan menghapus data tabel lama Anda)
-- =====================================================================

-- 1. TABEL KARYAWAN_RECORDS (Tabel Khusus Unggahan & Pemeriksaan Mandiri Karyawan)
CREATE TABLE IF NOT EXISTS public.karyawan_records (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    nama_lengkap        TEXT NOT NULL,
    nik                 TEXT NOT NULL,
    departemen          TEXT DEFAULT 'PTPN 3',
    divisi              TEXT,
    jabatan             TEXT,
    nomor_inhealth      TEXT,
    nomor_bpjs          TEXT,
    jenis_kelamin       TEXT CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    umur                INTEGER,
    tanggal_pemeriksaan DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_pemeriksaan     TIME,
    nama_rs             TEXT,           -- RS / Faskes eksternal tempat tes mandiri
    nama_poli           TEXT,
    foto                TEXT,

    -- Dokumen & Berkas yang Diunggah Karyawan
    file_dokumen        TEXT,           -- Laporan Hasil MCU Mandiri (PDF / Foto)
    nama_dokumen        TEXT,
    file_rujukan        TEXT,           -- Berkas Surat Rujukan
    nama_rujukan_file   TEXT,
    file_surat_sakit    TEXT,           -- Berkas Surat Izin Sakit
    nama_surat_sakit    TEXT,

    -- Tanda Vital Mandiri
    golongan_darah      TEXT,
    tinggi_badan        NUMERIC(5,1),
    berat_badan         NUMERIC(5,1),
    bmi                 NUMERIC(4,1),
    tensi               TEXT,
    gula_darah          TEXT,
    kolesterol          TEXT,
    asam_urat           TEXT,
    suhu                TEXT,

    -- Catatan Mandiri & Status Kebugaran
    keluhan             TEXT,
    catatan_tambahan    TEXT,
    kesimpulan          kesimpulan_status DEFAULT 'fit',
    status_kebugaran    TEXT DEFAULT 'Fit for Duty',
    butuh_tindak_lanjut BOOLEAN DEFAULT FALSE,
    tindak_lanjut_selesai BOOLEAN DEFAULT FALSE,
    created_by_role     TEXT DEFAULT 'karyawan',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABEL CATATAN_MEDIS (Rekam Medis Khusus, Anamnesis, Catatan Dokter & Konsultasi)
CREATE TABLE IF NOT EXISTS public.catatan_medis (
    id                  BIGSERIAL PRIMARY KEY,
    nik                 TEXT NOT NULL,
    nama_pasien         TEXT NOT NULL,
    mcu_record_id       BIGINT REFERENCES public.mcu_records(id) ON DELETE SET NULL,
    mini_mcu_record_id  BIGINT REFERENCES public.mini_mcu_records(id) ON DELETE SET NULL,
    dokter_pemeriksa    TEXT,
    perawat_pemeriksa   TEXT,
    lokasi_klinik       TEXT DEFAULT 'Klinik Pratama PTPN',
    tanggal_kunjungan   DATE NOT NULL DEFAULT CURRENT_DATE,
    jam_kunjungan       TIME,

    -- SOAP (Subjective, Objective, Assessment, Plan)
    keluhan_utama       TEXT,           -- Subjective / Anamnesis
    riwayat_penyakit    TEXT,
    riwayat_alergi      TEXT,
    faktor_risiko       TEXT,
    tanda_vital         JSONB,          -- Objective: tensi, nadi, suhu, gula_darah, dll.
    diagnosa_utama      TEXT NOT NULL,  -- Assessment / ICD-10
    diagnosa_sekunder   TEXT,
    kategori_penyakit   TEXT,           -- Kardiovaskular, Metabolik, ISPA, Gastro, dll.
    terapi_obat         JSONB,          -- Plan: resep obat & dosis
    tindakan_medis      TEXT,           -- Tindakan medis / injeksi / perawatan luka
    konsultasi          TEXT,           -- Catatan konsultasi & edukasi dokter
    saran_dokter        TEXT,           -- Saran pola hidup & pemulihan
    anjuran_medis       TEXT,           -- Anjuran istirahat / rujukan

    -- Status & Rujukan
    status_kebugaran    TEXT DEFAULT 'Fit for Duty',
    perlu_rujukan       BOOLEAN DEFAULT FALSE,
    rs_rujukan          TEXT,
    poli_rujukan        TEXT,
    tanggal_kontrol     DATE,
    created_by_role     TEXT DEFAULT 'klinik',
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABEL MASTER_KARYAWAN (Master Biodata Karyawan Terpusat)
CREATE TABLE IF NOT EXISTS public.master_karyawan (
    id                  BIGSERIAL PRIMARY KEY,
    nik                 TEXT NOT NULL UNIQUE,
    nama_lengkap        TEXT NOT NULL,
    departemen          TEXT DEFAULT 'PTPN 3',
    divisi              TEXT,
    jabatan             TEXT,
    kategori_peserta    TEXT DEFAULT 'Tetap',
    jenis_kelamin       TEXT CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    tanggal_lahir       DATE,
    umur                INTEGER,
    golongan_darah      TEXT,
    nomor_bpjs          TEXT,
    nomor_inhealth      TEXT,
    nomor_telepon       TEXT,
    alamat              TEXT,
    foto                TEXT,
    status_aktif        BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- 4. INDEXES UNTUK PERFORMA PENCARIAN CEPAT
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_karyawan_records_nik ON public.karyawan_records(nik);
CREATE INDEX IF NOT EXISTS idx_catatan_medis_nik ON public.catatan_medis(nik);
CREATE INDEX IF NOT EXISTS idx_master_karyawan_nik ON public.master_karyawan(nik);

-- =====================================================================
-- 5. ROW LEVEL SECURITY (RLS) & POLICIES
-- =====================================================================
ALTER TABLE public.karyawan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catatan_medis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_karyawan ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow All KaryawanRecords" ON public.karyawan_records;
    DROP POLICY IF EXISTS "Allow All CatatanMedis" ON public.catatan_medis;
    DROP POLICY IF EXISTS "Allow All MasterKaryawan" ON public.master_karyawan;
END $$;

CREATE POLICY "Allow All KaryawanRecords" ON public.karyawan_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All CatatanMedis" ON public.catatan_medis FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All MasterKaryawan" ON public.master_karyawan FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 6. AUTO-UPDATE TRIGGER FUNCTION
-- =====================================================================
DO $$ BEGIN
    DROP TRIGGER IF EXISTS trg_karyawan_records ON public.karyawan_records;
    DROP TRIGGER IF EXISTS trg_catatan_medis ON public.catatan_medis;
    DROP TRIGGER IF EXISTS trg_master_karyawan ON public.master_karyawan;
END $$;

CREATE TRIGGER trg_karyawan_records BEFORE UPDATE ON public.karyawan_records FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_catatan_medis BEFORE UPDATE ON public.catatan_medis FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_master_karyawan BEFORE UPDATE ON public.master_karyawan FOR EACH ROW EXECUTE FUNCTION update_updated_at();
