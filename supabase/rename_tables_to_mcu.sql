-- ==============================================================================
-- MIGRASI NAMA TABEL SUPABASE: SEMUA TABEL DIBERI PREFIX 'mcu_'
-- 
-- Tujuan:
-- Menyeragamkan seluruh tabel di Supabase agar diawali dengan 'mcu_'
-- sehingga tertata rapi di Supabase Table Editor.
--
-- Cara Eksekusi:
-- 1. Buka Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Pilih Project Anda
-- 3. Klik menu "SQL Editor" di bilah navigasi kiri
-- 4. Buat New Query, tempel (paste) seluruh isi skrip ini
-- 5. Klik tombol "Run" (atau Ctrl + Enter)
-- ==============================================================================

-- 1. Ubah nama app_notifications -> mcu_app_notifications
ALTER TABLE IF EXISTS public.app_notifications RENAME TO mcu_app_notifications;

-- 2. Ubah nama karyawan_records -> mcu_karyawan_records
ALTER TABLE IF EXISTS public.karyawan_records RENAME TO mcu_karyawan_records;

-- 3. mcu_records (SUDAH berawalan 'mcu_', dibiarkan tetap mcu_records)

-- 4. Ubah nama medical_suggestions -> mcu_medical_suggestions
ALTER TABLE IF EXISTS public.medical_suggestions RENAME TO mcu_medical_suggestions;

-- 5. Ubah nama mini_mcu_records -> mcu_mini_mcu_records
ALTER TABLE IF EXISTS public.mini_mcu_records RENAME TO mcu_mini_mcu_records;

-- 6. Ubah nama obats -> mcu_obats
ALTER TABLE IF EXISTS public.obats RENAME TO mcu_obats;

-- 7. Ubah nama users -> mcu_users
ALTER TABLE IF EXISTS public.users RENAME TO mcu_users;

-- Tabel pendukung (jika pernah dibuat)
ALTER TABLE IF EXISTS public.master_karyawan RENAME TO mcu_master_karyawan;
ALTER TABLE IF EXISTS public.catatan_medis RENAME TO mcu_catatan_medis;

-- Muat ulang schema cache PostgREST agar REST API Supabase langsung mengenali tabel baru
NOTIFY pgrst, 'reload schema';

-- Verifikasi hasil perubahan nama tabel
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'mcu_%'
ORDER BY table_name;
