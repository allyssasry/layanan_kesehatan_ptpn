const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkMini() {
  const { data, error } = await supabase.from('mini_mcu_records').select('id, nama_lengkap, nik, tanggal_pemeriksaan, foto, divisi');
  if (error) console.error(error);
  else {
    console.log('mini_mcu_records total:', data.length);
    data.forEach(r => {
      console.log(`ID: ${r.id}, Nama: ${r.nama_lengkap}, NIK: ${r.nik}, Tgl: ${r.tanggal_pemeriksaan}, HasFoto: ${Boolean(r.foto)}, Divisi: ${r.divisi}`);
    });
  }
}

checkMini();
