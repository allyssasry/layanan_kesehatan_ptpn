const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function cleanAdminMcuRecords() {
  console.log('Cleaning up admin MCU records in Supabase...');

  const { data, error } = await supabase
    .from('mcu_records')
    .update({
      nama_dokter: null,
      nama_perawat: null,
      keluhan: null,
      obat: [],
      nama_poli: null,
    })
    .or('created_by_role.eq.admin,created_by_role.is.null')
    .select('id, nama_lengkap, created_by_role');

  if (error) {
    console.error('Error cleaning mcu_records:', error.message);
  } else {
    console.log(`Successfully cleaned ${data?.length || 0} admin MCU records in mcu_records!`);
  }
}

cleanAdminMcuRecords();
