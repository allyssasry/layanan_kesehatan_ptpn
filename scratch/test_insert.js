const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testInsert() {
  const record = {
    user_id: 3,
    nama_lengkap: 'allyssa',
    nik: '2572874',
    departemen: 'PTPN 3',
    kategori_peserta: 'karyawan',
    divisi: 'Pengadaan & Umum',
    jabatan: 'Magang',
    nomor_inhealth: null,
    nomor_bpjs: '789y6789',
    jenis_kelamin: 'Laki-laki',
    umur: 20,
    tanggal_pemeriksaan: '2026-09-13',
    jam_pemeriksaan: '21:57',
    nama_rs: 'Klinik Pratama PTPN',
    golongan_darah: 'O+',
    tinggi_badan: 157,
    berat_badan: 41,
    bmi: 16.6,
    tensi: '130/85',
    gula_darah: '110',
    kolesterol: '215',
    asam_urat: '6.8',
    suhu: '36.5',
    vitals_updated_at: new Date().toISOString(),
    vitals_updated_by_role: 'karyawan',
    penyakit: [],
    obat: [],
    keluhan: 'Pemeriksaan Mandiri',
    diagnosa: 'Pemeriksaan Mandiri',
    kesimpulan: 'fit',
    status_kebugaran: 'Fit for Duty',
    intervensi: [],
    created_by_role: 'karyawan',
  };

  const nowIso = new Date().toISOString();
  const karyawanPayload = {
    user_id: record.user_id ? Number(record.user_id) : null,
    nama_lengkap: record.nama_lengkap,
    nik: record.nik,
    departemen: record.departemen,
    divisi: record.divisi,
    jabatan: record.jabatan || 'Magang',
    nomor_inhealth: record.nomor_inhealth || null,
    nomor_bpjs: record.nomor_bpjs || null,
    jenis_kelamin: record.jenis_kelamin === 'P' || record.gender === 'P' || record.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
    umur: Number(record.umur) || 30,
    tanggal_pemeriksaan: record.tanggal_pemeriksaan,
    jam_pemeriksaan: record.jam_pemeriksaan,
    nama_rs: record.nama_rs,
    nama_poli: record.nama_poli || null,
    foto: record.foto || null,
    file_dokumen: record.file_dokumen || null,
    nama_dokumen: record.nama_dokumen || null,
    file_rujukan: record.file_rujukan || null,
    nama_rujukan_file: record.nama_rujukan_file || null,
    file_surat_sakit: record.file_surat_sakit || null,
    nama_surat_sakit: record.nama_surat_sakit || null,
    golongan_darah: record.golongan_darah || 'O+',
    tinggi_badan: record.tinggi_badan,
    berat_badan: record.berat_badan,
    bmi: record.bmi,
    tensi: record.tensi,
    gula_darah: record.gula_darah,
    kolesterol: record.kolesterol,
    asam_urat: record.asam_urat,
    suhu: record.suhu,
    vitals_updated_at: nowIso,
    vitals_updated_by_role: 'karyawan',
    keluhan: record.keluhan || null,
    catatan_tambahan: null,
    diagnosa: 'Pemeriksaan Mandiri',
    penyakit: [],
    obat: [],
    kesimpulan: record.kesimpulan,
    status_kebugaran: record.status_kebugaran,
    intervensi: [],
    catatan_intervensi: null,
    file_surat_rujukan_intervensi: null,
    nama_surat_rujukan_intervensi: null,
    butuh_tindak_lanjut: false,
    tindak_lanjut_selesai: false,
    created_by_role: 'karyawan',
    created_at: nowIso,
    updated_at: nowIso,
  };

  const { data, error } = await supabase
    .from('karyawan_records')
    .insert(karyawanPayload)
    .select('*');

  if (error) {
    console.error('INSERT ERROR:', error);
  } else {
    console.log('INSERT SUCCESS:', data);
  }
}

testInsert();
