const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function testUpdateMcu() {
  const payloadWithBpjs = {
    nomor_inhealth: '8909938',
    nomor_bpjs: '0001234567890',
    bpjs: '0001234567890',
  };
  const { error: err1 } = await supabase.from('mcu_records').update(payloadWithBpjs).eq('id', 276);
  console.log('MCU Update with bpjs error:', err1 ? err1.message : 'SUCCESS');

  const cleanPayload = {
    nomor_inhealth: '8909938',
    nomor_bpjs: '0001234567890',
  };
  const { error: err2 } = await supabase.from('mcu_records').update(cleanPayload).eq('id', 276);
  console.log('MCU Update with cleanPayload error:', err2 ? err2.message : 'SUCCESS');
}

testUpdateMcu();
