const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkCols() {
  const t1 = await supabase.from('mcu_records').select('id, nama_lengkap, nomor_bpjs, nomor_inhealth').limit(5);
  console.log('mcu_records sample:', t1.data, t1.error);

  const t2 = await supabase.from('mcu_mini_mcu_records').select('id, nama_lengkap, nomor_bpjs, nomor_inhealth').limit(5);
  console.log('mcu_mini_mcu_records sample:', t2.data, t2.error);

  const t3 = await supabase.from('mcu_karyawan_records').select('id, nama_lengkap, nomor_bpjs, nomor_inhealth').limit(5);
  console.log('mcu_karyawan_records sample:', t3.data, t3.error);
}

checkCols();
