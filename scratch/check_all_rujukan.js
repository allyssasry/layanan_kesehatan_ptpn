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
  const { data: mcus } = await supabase.from('mcu_records').select('id, nama_lengkap, file_rujukan, file_surat_rujukan_intervensi, file_dokumen').not('file_rujukan', 'is', null);
  console.log('mcu_records with file_rujukan:', mcus);

  const { data: minis } = await supabase.from('mini_mcu_records').select('id, nama_lengkap, file_rujukan, file_surat_rujukan_intervensi, file_dokumen').not('file_rujukan', 'is', null);
  console.log('mini_mcu_records with file_rujukan:', minis);

  const { data: karys } = await supabase.from('karyawan_records').select('id, nama_lengkap, file_rujukan, file_dokumen').not('file_rujukan', 'is', null);
  console.log('karyawan_records with file_rujukan:', karys);
}
run();
