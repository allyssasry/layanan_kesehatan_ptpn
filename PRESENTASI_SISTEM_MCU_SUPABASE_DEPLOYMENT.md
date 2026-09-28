# MATERI PRESENTASI: SISTEM INFORMASI KESEHATAN KERJA & MCU TERPADU PTPN
## Paparan Alur Aplikasi Web, Fitur Unggulan, dan Kebutuhan Integrasi Supabase / Deployment IT

> **Petunjuk untuk NotebookLM:**  
> Dokumen ini dirancang sebagai materi presentasi (Slide Deck) komprehensif. Sebagian besar materi berfokus pada **alur kerja aplikasi web, alur bisnis kesehatan, fitur tiap role (Admin, Klinik, Karyawan), dan manfaat operasional**. Pembahasan teknis Supabase dan permohonan ke Tim IT dirangkum padat dalam **2 slide khusus** di bagian akhir.

---

# BAGIAN 1: PENGENALAN & LATAR BELAKANG

## SLIDE 1: Judul Presentasi & Gambaran Umum
- **Judul:** Transformasi Digital Layanan Kesehatan Kerja & Medical Check-Up (MCU) Karyawan PTPN.
- **Nama Aplikasi:** PTPN Occupational Health & MCU Management System.
- **Visi Aplikasi:** Mewujudkan *Single Source of Truth* untuk seluruh riwayat kesehatan, hasil MCU tahunan, dan rekam medis rawat jalan poliklinik karyawan secara aman, terintegrasi, dan mudah diakses.
- **Audiens Presentasi:** Tim Manajemen LK3, Tenaga Medis Perusahaan, dan Tim IT / DevOps PTPN.

---

## SLIDE 2: Urgensi & Masalah yang Diselesaikan
- **Tantangan Saat Ini:**
  - **Data Terfragmentasi:** Hasil pemeriksaan MCU tahunan dari RS rekanan berupa berkas kertas atau file Excel terpisah-pisah yang sulit dicari kembali.
  - **Klinik Berjalan Manual:** Kunjungan harian karyawan di poliklinik kebun/kantor belum terhubung dengan riwayat MCU tahunan mereka.
  - **Tindak Lanjut Lambat:** Karyawan dengan status *Unfit* atau *Fit dengan Catatan* sulit dipantau apakah sudah minum obat, kontrol ke spesialis, atau perbaikan pola hidup.
  - **Karyawan Pasif:** Karyawan sering kali tidak mengetahui detail hasil laboratorium dan kondisi vital mereka sendiri.
- **Solusi yang Disediakan Sistem Web Ini:**
  - Satu aplikasi web berbasis cloud yang menghubungkan **Tim LK3 Perusahaan**, **Dokter/Perawat Klinik Pratama**, dan **Seluruh Karyawan**.

---

# BAGIAN 2: ALUR KERJA BESAR SISTEM (END-TO-END WORKFLOW)

## SLIDE 3: Peta Alur Bisnis Terintegrasi (End-to-End Health Journey)
Sistem ini mengintegrasikan 4 tahapan alur utama:

```
[1. PEMERIKSAAN MCU TAHUNAN] 
   └── RS Rekanan melakukan tes ──► Admin import/input data ke Web ──► Klasifikasi Status Kebugaran
                                                                                │
[2. PEMANTAUAN & INTERVENSI LK3] ◄─────────────────────────────────────────────┘
   └── Filter Karyawan Berisiko ──► Program Intervensi (Promotif/Preventif/Kuratif)
              │
              ▼
[3. LAYANAN KLINIK HARIAN (MINI MCU)]
   └── Pasien berobat ──► Anamnesis & Vital ──► Resep Obat ──► Surat Rujukan / Surat Sakit
              │
              ▼
[4. PORTAL MANDIRI KARYAWAN]
   └── Karyawan login ──► Cek Rekam Medis Pribadi ──► Pantau Vital Sign ──► Upload Bukti Kontrol
```

---

## SLIDE 4: Alur 1 — Manajemen MCU Tahunan (Pemeriksaan RS Mitra)
1. **Penerimaan Hasil MCU:** RS Mitra menyerahkan rekapitulasi data hasil tes laboratorium dan fisik 280+ karyawan.
2. **Input Data Cepat:**
   - Fitur **Import Excel Otomatis**: Sekali unggah ratusan baris langsung tervalidasi ke sistem.
   - Fitur **Form Input Manual / Edit Data**: Memungkinkan input individu dengan validasi tanda vital, keluhan, dan faktor risiko.
3. **Penetapan Status Kebugaran Kerja (Fitness for Duty):**
   - **Fit for Duty:** Kondisi prima dan sehat tanpa batasan kerja.
   - **Fit with Note (Fit dengan Catatan):** Sehat namun memerlukan pemantauan (misal: hipertensi ringan, kolesterol tinggi).
   - **Unfit / Sementara Tidak Fit:** Memerlukan istirahat, pengobatan intensif, atau rujukan segera.
4. **Penyimpanan Berkas Digital:** File PDF laporan MCU lengkap diunggah dan terarsip rapi per karyawan.

---

## SLIDE 5: Alur 2 — Layanan Poliklinik Pratama Harian (Mini MCU)
Alur ketika karyawan berobat atau kontrol rutin ke klinik perusahaan:

1. **Pencarian Data Pasien:** Paramedis cukup mengetikkan **NIK** atau **Nama Karyawan**, data profil langsung muncul otomatis.
2. **Pemeriksaan Fisik & Laboratorium Cepat (POCT):**
   - Input tensi darah, gula darah sewaktu, kolesterol, asam urat, denyut nadi, dan suhu tubuh.
   - Sistem otomatis memberi indikator warna jika nilai berada di atas batas normal.
3. **Anamnesis & Diagnosa Medis (SOAP):**
   - Dokter mencatat keluhan utama, riwayat alergi, dan menetapkan diagnosa kerja.
4. **Terapi & Administrasi Medis:**
   - **Resep Obat:** Memilih obat langsung dari master inventaris farmasi klinik.
   - **Surat Izin Sakit:** Menerbitkan surat istirahat digital jika tidak layak bekerja.
   - **Surat Rujukan Eksternal:** Menerbitkan rujukan ke RS rujukan spesialis jika memerlukan tindakan lanjut.

---

## SLIDE 6: Alur 3 — Pelacakan Intervensi & Tindak Lanjut Medis
Menjamin bahwa karyawan yang sakit benar-benar mendapatkan perawatan hingga tuntas:

- **Empat Pilar Intervensi Terintegrasi:**
  1. **Promotif:** Edukasi gizi, seminar kesehatan kerja (*health talk*), dan konseling hidup sehat.
  2. **Preventif:** Penjadwalan pemeriksaan berkala ulang untuk parameter berisiko tinggi.
  3. **Kuratif:** Pemberian terapi obat rutin klinik, rujukan ke dokter spesialis RS, dan kepatuhan minum obat.
  4. **Rehabilitatif:** Pemantauan masa pemulihan pasca sakit/operasi hingga karyawan dinyatakan fit kembali.
- **Monitoring Status:**
  - Dilengkapi status toggle: `Butuh Tindak Lanjut` vs `Tindak Lanjut Selesai`.
  - Admin dan dokter dapat melampirkan berkas bukti hasil kontrol/laboratorium evaluasi.

---

## SLIDE 7: Alur 4 — Portal Personal Karyawan (Employee Self-Service)
Memberdayakan karyawan untuk peduli terhadap kesehatannya sendiri:

- **Akses Personal:** Karyawan login menggunakan akun terdaftar dan hanya dapat melihat data kesehatannya sendiri (privasi terjamin).
- **Health Passport Digital:**
  - Menampilkan ringkasan tanda vital terkini dan status kebugaran kerja.
  - Riwayat grafik perkembangan tekanan darah, gula darah, dan kolesterol dari tahun ke tahun.
- **Transparansi Saran Dokter:** Karyawan dapat membaca anjuran gaya hidup, pantangan makanan, dan rekomendasi dokter pemeriksa.
- **Unggah Dokumen Mandiri:** Karyawan dapat mengunggah bukti hasil laboratorium dari faskes luar atau surat sakit dari dokter keluarga secara mandiri.

---

# BAGIAN 3: DETAIL FITUR UNGGULAN APLIKASI WEB

## SLIDE 8: Fitur Modul Admin (Dashboard & Analitik Eksekutif)
- **Executive Health Dashboard:**
  - Kartu statistik total peserta, rasio kebugaran (*Fit vs Fit dengan Catatan vs Unfit*).
  - Grafik tren tanda vital (distribusi Hipertensi, Diabetes Melitus, Asam Urat Tinggi, Obesitas BMI).
  - Pemetaan kesehatan berdasarkan Departemen dan Divisi kerja.
- **Tabel Rekapitulasi Cerdas:**
  - Filter multi-kategori: berdasarkan tahun pemeriksaan, divisi, poli, dan status kebugaran.
  - Pencarian instan berdasarkan NIK atau nama.
  - Modal detail pemeriksaan lengkap beserta tombol aksi unduh PDF dan cetak laporan.
- **Export & Reporting:** Cetak rekapitulasi data siap saji untuk pelaporan ke pimpinan holding dan dinas terkait.

---

## SLIDE 9: Fitur Modul Klinik (Praktis, Cepat, Terstandar)
- **Antarmuka Rawat Jalan yang Ringkas:** Didesain khusus agar tenaga medis dapat menginput data dalam waktu kurang dari 2 menit per pasien.
- **Integrasi Master Obat:** Pencarian nama obat instan dengan saran dosis dan pengurangan stok otomatis.
- **Template Rekomendasi Medis:** Tersedia *quick-select* saran dan anjuran dokter untuk efisiensi pengetikan.
- **Riwayat Kunjungan Pasien:** Dokter dapat melihat riwayat kunjungan lampau pasien untuk mendiagnosa penyakit berulang/kronis.

---

## SLIDE 10: Tampilan Antarmuka & Pengalaman Pengguna (UI/UX)
- **Desain Modern & Profesional:**
  - Menggunakan palet warna standar kesehatan korporat (Emerald Green, Cyan, Slate Gray).
  - Desain responsif: nyaman dibuka di monitor kantor, laptop, maupun tablet klinik kebun.
- **Indikator Visual Pintar (Color-Coded Badges):**
  - Nilai vital normal bertanda hijau, waspada bertanda kuning, dan bahaya bertanda merah.
- **Feedback Interaktif:** Notifikasi toast real-time saat data berhasil disimpan, diubah, atau diunggah.

---

# BAGIAN 4: BASIS DATA SUPABASE & PERMOHONAN KE TIM IT

## SLIDE 11: Arsitektur Backend Supabase (Ringkasan Teknis untuk IT)
> *Halaman ini merangkum kebutuhan database dan penyimpanan file yang diperlukan sistem.*

- **Database PostgreSQL Terkelola (Supabase):**
  - **Tabel Utama:** `users` (otentikasi & role), `master_karyawan` (biodata), `mcu_records` (hasil MCU RS), `mini_mcu_records` (kunjungan klinik), `catatan_medis` (SOAP rekam medis), `obats` (master obat), dan `app_notifications`.
  - **Keamanan:** Dilengkapi **Row Level Security (RLS)** agar privasi rekam medis karyawan terlindungi sesuai hak akses.
  - **Performa:** Pengindeksan pada kolom NIK dan email untuk pencarian data instan milidetik.
- **Supabase Storage Bucket (`medical-files`):**
  - 1 Bucket penyimpanan cloud untuk berkas: `/dokumen/` (PDF MCU), `/rujukan/` (surat rujukan), `/surat-sakit/` (surat istirahat), dan `/fotos/` (foto karyawan).
- **Kesiapan Script:** Seluruh struktur tabel, relasi, dan data awal sudah siap dalam 1 file skrip: `supabase/schema.sql`.

---

## SLIDE 12: Permohonan & Dukungan yang Diharapkan dari Tim IT
Kami memohon dukungan rekan-rekan Tim IT PTPN untuk tahap finalisasi dan peluncuran sistem:

1. **Penyediaan Akun / Project Supabase Resmi Perusahaan:**
   - Membantu membuat project Supabase (Cloud resmi atau Docker On-Premise PTPN).
   - Menjalankan file skrip `supabase/schema.sql` dan mengaktifkan Storage Bucket `medical-files`.
   - Menyerahkan 2 baris environment variable: `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
2. **Deployment Aplikasi Web Next.js:**
   - Melakukan hosting aplikasi web ke infrastruktur resmi PTPN (Opsi: Cloud Vercel, Server VPS Ubuntu via PM2/Docker, atau Intranet PTPN).
   - Memetakan domain resmi perusahaan (contoh: `mcu.ptpn.co.id` / `health.ptpn.co.id`).
3. **Waktu Implementasi:** Aplikasi web sudah selesai 100% dan siap di-deploy dalam waktu 1-2 hari kerja bersama Tim IT.

---

# BAGIAN 5: PENUTUP & KESIMPULAN

## SLIDE 13: Kesimpulan & Dampak Positif
- **Efisiensi:** Menghemat waktu administrasi pelaporan MCU hingga 80% dibanding cara manual.
- **Kepatuhan K3:** Memudahkan audit keselamatan dan kesehatan kerja karyawan di lingkungan perkebunan dan kantor.
- **Akurasi & Keamanan:** Rekam medis tersimpan digital secara aman, rapi, dan terenkripsi.
- **Kolaborasi:** Sinergi antara Tim Kesehatan (pengguna sistem) dan Tim IT (penyedia infrastruktur) mewujudkan digitalisasi nyata di tubuh PTPN.

---

## SLIDE 14: Sesi Diskusi & Tanya Jawab (Q&A)
- Pembahasan teknis lanjutan dengan Tim IT mengenai opsi server dan keamanan jaringan.
- Demonstrasi langsung (*live demo*) alur web:
  - Demo 1: Alur Admin mengolah data MCU 280 peserta dan filter status kebugaran.
  - Demo 2: Alur Tenaga Medis Klinik memeriksa pasien dan menerbitkan rujukan/resep.
  - Demo 3: Alur Karyawan melihat hasil laboratorium dan riwayat tensi.
- Terima kasih atas dukungan Tim IT PTPN!
