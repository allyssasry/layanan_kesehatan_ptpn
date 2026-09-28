const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function findSubarli() {
  const { data: mini } = await supabase.from('mcu_mini_mcu_records').select('id, nama_lengkap, nik, nomor_inhealth, nomor_bpjs').ilike('nama_lengkap', '%subarli%');
  console.log('Mini Subarli:', mini);

  const { data: mcu } = await supabase.from('mcu_records').select('id, nama_lengkap, nik, nomor_inhealth, nomor_bpjs').ilike('nama_lengkap', '%subarli%');
  console.log('MCU Subarli:', mcu);
}

findSubarli();
