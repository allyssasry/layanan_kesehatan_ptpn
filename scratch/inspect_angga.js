const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) envVars[k.trim()] = v.join('=').trim().replace(/^['\"]|['\"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspect() {
  try {
    const { data: mcu, error: mcuErr } = await supabase
      .from('mcu_records')
      .select('id, nama_lengkap, file_dokumen, nama_dokumen, tanggal_pemeriksaan')
      .ilike('nama_lengkap', '%angga%');
    console.log('MCU ERR:', mcuErr);
    console.log('MCU DATA:', mcu);

    const { data: mini, error: miniErr } = await supabase
      .from('mini_mcu_records')
      .select('id, nama_lengkap, file_dokumen, nama_dokumen, tanggal_pemeriksaan')
      .ilike('nama_lengkap', '%angga%');
    console.log('MINI ERR:', miniErr);
    console.log('MINI DATA:', mini);
  } catch (e) {
    console.error('EXCEPTION:', e);
  }
}
inspect();
