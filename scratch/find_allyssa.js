const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function findAllyssa() {
  const { data: mini } = await supabase.from('mini_mcu_records').select('*').or('nama_lengkap.ilike.%allyssa%,nik.eq.678976');
  console.log('mini_mcu_records matching allyssa/678976:', mini?.length);
  mini?.forEach(r => {
    console.log({
      id: r.id,
      nama: r.nama_lengkap,
      nik: r.nik,
      tgl: r.tanggal_pemeriksaan,
      foto: r.foto ? r.foto.substring(0, 50) + '...' : null,
      divisi: r.divisi
    });
  });

  const { data: mcu } = await supabase.from('mcu_records').select('*').or('nama_lengkap.ilike.%allyssa%,nik.eq.678976');
  console.log('\nmcu_records matching allyssa/678976:', mcu?.length);
  mcu?.forEach(r => {
    console.log({
      id: r.id,
      nama: r.nama_lengkap,
      nik: r.nik,
      tgl: r.tanggal_pemeriksaan,
      foto: r.foto ? r.foto.substring(0, 50) + '...' : null,
      divisi: r.divisi
    });
  });

  const { data: kary } = await supabase.from('karyawan_records').select('*').or('nama_lengkap.ilike.%allyssa%,nik.eq.678976');
  console.log('\nkaryawan_records matching allyssa/678976:', kary?.length);
  kary?.forEach(r => {
    console.log({
      id: r.id,
      nama: r.nama_lengkap,
      nik: r.nik,
      tgl: r.tanggal_pemeriksaan,
      foto: r.foto ? r.foto.substring(0, 50) + '...' : null,
      divisi: r.divisi
    });
  });
}

findAllyssa();
