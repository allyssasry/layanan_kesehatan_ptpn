const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: mini } = await supabase.from('mini_mcu_records').select('id, nama_lengkap, intervensi, file_rujukan, file_surat_rujukan_intervensi, nama_rujukan_file, nama_surat_rujukan_intervensi').ilike('nama_lengkap', '%allyssa%');
  console.log('MINI_MCU:', JSON.stringify(mini, null, 2));

  const { data: mcu } = await supabase.from('mcu_records').select('id, nama_lengkap, intervensi, file_rujukan, file_surat_rujukan_intervensi, nama_rujukan_file, nama_surat_rujukan_intervensi').ilike('nama_lengkap', '%allyssa%');
  console.log('MCU:', JSON.stringify(mcu, null, 2));
}
run();
