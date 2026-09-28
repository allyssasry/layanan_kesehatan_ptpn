const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function check() {
  const tables = ['mcu_app_notifications', 'app_notifications', 'users', 'mcu_users'];
  for (const t of tables) {
    const res = await supabase.from(t).select('*').limit(1);
    console.log(t, { dataLength: res.data ? res.data.length : null, error: res.error });
  }
}
check();
