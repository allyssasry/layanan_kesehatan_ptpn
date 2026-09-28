-- =====================================================================
-- SUPABASE STORAGE CONFIGURATION — BUCKET: medical-files
-- Sistem Kesehatan & MCU PTPN-LK3
-- =====================================================================
-- Jalankan query ini di Dashboard Supabase -> SQL Editor -> Run
-- atau buat manual melalui menu Storage -> "New bucket" -> "medical-files" (Public)

-- 1. Buat Storage Bucket 'medical-files' jika belum ada
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'medical-files',
    'medical-files',
    TRUE,
    20971520, -- 20 MB Maksimal per berkas
    ARRAY[
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = TRUE,
    file_size_limit = 20971520;

-- 2. Hapus policy lama jika ada duplikasi
DROP POLICY IF EXISTS "Public Access Medical Files" ON storage.objects;
DROP POLICY IF EXISTS "Allow Upload Medical Files" ON storage.objects;
DROP POLICY IF EXISTS "Allow Update Medical Files" ON storage.objects;
DROP POLICY IF EXISTS "Allow Delete Medical Files" ON storage.objects;

-- 3. Kebijakan Keamanan (Row-Level Security) untuk Storage Objects:

-- Policy 1: Mengizinkan SEMUA orang (publik, admin, karyawan, klinik) melihat & mengunduh berkas
CREATE POLICY "Public Access Medical Files"
ON storage.objects FOR SELECT
USING (bucket_id = 'medical-files');

-- Policy 2: Mengizinkan aplikasi (Anon / Authenticated) mengunggah berkas ke bucket medical-files
CREATE POLICY "Allow Upload Medical Files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'medical-files');

-- Policy 3: Mengizinkan pembaruan berkas pada bucket medical-files
CREATE POLICY "Allow Update Medical Files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'medical-files');

-- Policy 4: Mengizinkan penghapusan berkas pada bucket medical-files
CREATE POLICY "Allow Delete Medical Files"
ON storage.objects FOR DELETE
USING (bucket_id = 'medical-files');
