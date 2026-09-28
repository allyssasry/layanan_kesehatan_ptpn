const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/)[1].trim();
const client = createClient(url, key);

async function testResolver() {
  const TABLES = {
    MCU_RECORDS: 'mcu_records',
    MINI_MCU: 'mcu_mini_mcu_records',
    KARYAWAN: 'mcu_karyawan_records',
    USERS: 'mcu_users',
    NOTIFICATIONS: 'mcu_app_notifications',
    OBATS: 'mcu_obats',
    SUGGESTIONS: 'mcu_medical_suggestions',
  };

  async function getTable(preferred, fallback) {
    try {
      const { error } = await client.from(preferred).select('id').limit(1);
      if (!error || (error.code !== 'PGRST205' && !error.message?.includes('schema cache'))) {
        return preferred;
      }
    } catch {}
    return fallback;
  }

  const pairs = [
    [TABLES.MCU_RECORDS, 'mcu_records'],
    [TABLES.MINI_MCU, 'mini_mcu_records'],
    [TABLES.KARYAWAN, 'karyawan_records'],
    [TABLES.USERS, 'users'],
    [TABLES.NOTIFICATIONS, 'app_notifications'],
    [TABLES.OBATS, 'obats'],
  ];

  console.log('Testing dynamic table resolution:');
  for (const [pref, fall] of pairs) {
    const resolved = await getTable(pref, fall);
    const { count } = await client.from(resolved).select('*', { count: 'exact', head: true });
    console.log(`Preferred: ${pref.padEnd(25)} -> Resolved: ${resolved.padEnd(22)} (Rows: ${count})`);
  }
}

testResolver();
