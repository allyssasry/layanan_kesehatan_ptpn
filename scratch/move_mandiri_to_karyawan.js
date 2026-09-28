const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const ALLOWED_KARYAWAN_COLS = [
  'user_id',
  'nama_lengkap',
  'nik',
  'departemen',
  'divisi',
  'jabatan',
  'nomor_inhealth',
  'nomor_bpjs',
  'jenis_kelamin',
  'umur',
  'tanggal_pemeriksaan',
  'jam_pemeriksaan',
  'nama_rs',
  'nama_poli',
  'foto',
  'file_dokumen',
  'nama_dokumen',
  'file_rujukan',
  'nama_rujukan_file',
  'file_surat_sakit',
  'nama_surat_sakit',
  'golongan_darah',
  'tinggi_badan',
  'berat_badan',
  'bmi',
  'tensi',
  'gula_darah',
  'kolesterol',
  'asam_urat',
  'suhu',
  'keluhan',
  'catatan_tambahan',
  'diagnosa',
  'penyakit',
  'obat',
  'kesimpulan',
  'status_kebugaran',
  'intervensi',
  'catatan_intervensi',
  'file_surat_rujukan_intervensi',
  'nama_surat_rujukan_intervensi',
  'butuh_tindak_lanjut',
  'tindak_lanjut_selesai',
  'created_by_role',
];

async function migrate() {
  // Delete test record
  await supabase.from('karyawan_records').delete().eq('nik', '999999');

  // Ambil records mandiri dari mcu_records
  const { data: mandiriInMcu } = await supabase
    .from('mcu_records')
    .select('*')
    .or('created_by_role.eq.karyawan,diagnosa.ilike.%Pemeriksaan Mandiri%');

  console.log('Mandiri records found in mcu_records:', mandiriInMcu?.length || 0);

  if (mandiriInMcu && mandiriInMcu.length > 0) {
    for (const rec of mandiriInMcu) {
      const payload = {};
      ALLOWED_KARYAWAN_COLS.forEach(col => {
        if (rec[col] !== undefined) payload[col] = rec[col];
      });
      payload.created_by_role = 'karyawan';

      const { data: ins, error: insErr } = await supabase
        .from('karyawan_records')
        .insert(payload)
        .select('id')
        .single();

      if (insErr) {
        console.error(`Error inserting to karyawan_records:`, insErr);
      } else {
        console.log(`Successfully migrated record to karyawan_records ID ${ins?.id}. Removing from mcu_records ID ${rec.id}...`);
        await supabase.from('mcu_records').delete().eq('id', rec.id);
      }
    }
  }

  // Check results
  const { data: mcuAllyssa } = await supabase.from('mcu_records').select('id, nama_lengkap, nik, diagnosa, created_by_role').ilike('nama_lengkap', '%allyssa%');
  console.log('Final mcu_records for allyssa:', mcuAllyssa);

  const { data: karyAllyssa } = await supabase.from('karyawan_records').select('id, nama_lengkap, nik, diagnosa, created_by_role, jam_pemeriksaan, tensi, gula_darah').ilike('nama_lengkap', '%allyssa%');
  console.log('Final karyawan_records for allyssa:', karyAllyssa);
}

migrate();
