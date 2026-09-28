const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  try {
    console.log('--- Testing karyawan_records ---');
    const res1 = await supabase.from('karyawan_records').select('*').limit(3);
    if (res1.error) {
      console.log('karyawan_records ERROR:', res1.error);
    } else {
      console.log('karyawan_records SUCCESS, count:', res1.data.length);
      console.log('Sample:', res1.data);
    }

    console.log('\n--- Testing mcu_records with created_by_role ---');
    const res2 = await supabase.from('mcu_records').select('id, nama_lengkap, nik, created_by_role, status_kebugaran, kesimpulan').limit(5);
    if (res2.error) {
      console.log('mcu_records ERROR:', res2.error);
    } else {
      console.log('mcu_records count:', res2.data.length);
      console.log('mcu_records sample:', res2.data);
    }

    console.log('\n--- Testing mini_mcu_records ---');
    const res3 = await supabase.from('mini_mcu_records').select('id, nama_lengkap, nik, kesimpulan').limit(3);
    if (res3.error) {
      console.log('mini_mcu_records ERROR:', res3.error);
    } else {
      console.log('mini_mcu_records count:', res3.data.length);
    }
  } catch (e) {
    console.error('Fatal:', e);
  }
}

check();
