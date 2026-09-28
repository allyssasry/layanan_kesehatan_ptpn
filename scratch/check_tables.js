const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

if (!urlMatch || !keyMatch) {
  console.error('Missing credentials');
  process.exit(1);
}

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function check() {
  const tables = [
    'app_notifications', 'mcu_app_notifications',
    'karyawan_records', 'mcu_karyawan_records',
    'mcu_records',
    'medical_suggestions', 'mcu_medical_suggestions',
    'mini_mcu_records', 'mcu_mini_mcu_records',
    'obats', 'mcu_obats',
    'users', 'mcu_users'
  ];

  for (const t of tables) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`[ ] ${t}: NOT FOUND / ERROR (${error.code || error.message})`);
      } else {
        console.log(`[OK] ${t}: FOUND (count: ${count})`);
      }
    } catch (err) {
      console.log(`[ERR] ${t}: ${err.message}`);
    }
  }
}

check();
