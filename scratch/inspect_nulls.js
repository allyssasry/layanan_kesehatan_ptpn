const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectNulls() {
  const { data: mcu } = await supabase.from('mcu_records').select('id, nama_lengkap, nik, tensi, gula_darah, kolesterol, asam_urat, kesimpulan, created_by_role');
  console.log('Total MCU in DB:', mcu.length);
  const nullRecords = mcu.filter(r => !r.kolesterol || !r.gula_darah || !r.tensi);
  console.log('Null or missing vitals records:', nullRecords);
}

inspectNulls();
