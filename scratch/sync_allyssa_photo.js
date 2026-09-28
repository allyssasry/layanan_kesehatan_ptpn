const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function syncPhotos() {
  // 1. Get the known photo from mini_mcu_records ID 757
  const { data: rec757 } = await supabase.from('mini_mcu_records').select('foto').eq('id', 757).single();
  const photo = rec757?.foto;
  if (!photo) {
    console.log('No photo found in 757');
    return;
  }
  console.log('Found photo, length:', photo.length);

  // 2. Update mini_mcu_records ID 758
  const { error: err1 } = await supabase.from('mini_mcu_records').update({ foto: photo }).eq('id', 758);
  console.log('Update mini_mcu_records 758:', err1 || 'SUCCESS');

  // 3. Update mcu_records for allyssa
  const { error: err2 } = await supabase.from('mcu_records').update({ foto: photo }).or('nama_lengkap.ilike.%allyssa%,nik.eq.678976');
  console.log('Update mcu_records:', err2 || 'SUCCESS');

  // 4. Update karyawan_records for allyssa
  const { error: err3 } = await supabase.from('karyawan_records').update({ foto: photo }).or('nama_lengkap.ilike.%allyssa%,nik.eq.678976,nik.eq.2572874');
  console.log('Update karyawan_records:', err3 || 'SUCCESS');
}

syncPhotos();
