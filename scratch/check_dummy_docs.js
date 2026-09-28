const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) envVars[k.trim()] = v.join('=').trim().replace(/^['\"]|['\"]$/g, '');
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase
    .from('mcu_records')
    .select('id, file_dokumen, nama_dokumen')
    .eq('file_dokumen', 'Laporan_MCU_Karyawan.pdf');
  console.log('Count of Laporan_MCU_Karyawan.pdf:', data ? data.length : 0);
  if (data && data.length > 0) {
    console.log('Sample IDs:', data.slice(0, 10).map(d => d.id));
  }
}
check();
