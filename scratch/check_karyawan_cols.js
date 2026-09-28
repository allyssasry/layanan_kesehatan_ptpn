const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function checkKaryawan() {
  const { data: karyData } = await supabase.from('mcu_karyawan_records').select('*').limit(1);
  if (karyData && karyData[0]) {
    console.log('mcu_karyawan_records columns:', Object.keys(karyData[0]));
  }
}

checkKaryawan();
