const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkKaryawanColumns() {
  const { data, error } = await supabase.from('karyawan_records').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
    return;
  }
  if (data && data[0]) {
    console.log('Columns in karyawan_records:', Object.keys(data[0]));
  } else {
    console.log('No rows in karyawan_records');
  }

  // Now test an insert without vitals_updated_at/by_role
  const testPayload = {
    nama_lengkap: 'allyssa',
    nik: '2572874',
    departemen: 'PTPN 3',
    divisi: 'Pengadaan & Umum',
    jabatan: 'Magang',
    nomor_inhealth: 'INH-994821',
    nomor_bpjs: '789y6789',
    jenis_kelamin: 'Laki-laki',
    umur: 20,
    tanggal_pemeriksaan: '2026-09-13',
    jam_pemeriksaan: '21:57:00',
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
    keluhan: 'Pemeriksaan Mandiri',
    kesimpulan: 'fit',
    status_kebugaran: 'Fit for Duty',
    butuh_tindak_lanjut: false,
    tindak_lanjut_selesai: false,
    created_by_role: 'karyawan',
  };

  const insertRes = await supabase.from('karyawan_records').insert(testPayload).select('*');
  if (insertRes.error) {
    console.error('Insert test error:', insertRes.error);
  } else {
    console.log('Insert test SUCCESS! Inserted row:', insertRes.data);
  }
}

checkKaryawanColumns();
