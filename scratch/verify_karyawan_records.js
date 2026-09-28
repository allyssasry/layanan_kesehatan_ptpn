const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testFetchAll() {
  const { data, error } = await supabase
    .from('karyawan_records')
    .select('*')
    .order('tanggal_pemeriksaan', { ascending: false });

  if (error) {
    console.error('Fetch error:', error);
  } else {
    console.log('Total records in karyawan_records:', data.length);
    console.log('Latest 2 records:');
    data.slice(0, 2).forEach(r => {
      console.log(`- ID: ${r.id}, Nama: ${r.nama_lengkap}, NIK: ${r.nik}, Tgl: ${r.tanggal_pemeriksaan}, Tensi: ${r.tensi}, Gula: ${r.gula_darah}, Kolesterol: ${r.kolesterol}, Kesimpulan: ${r.kesimpulan}`);
    });
  }
}

testFetchAll();
