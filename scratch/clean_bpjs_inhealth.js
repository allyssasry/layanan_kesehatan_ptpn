const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

function sanitizeDigits(val) {
  if (!val) return null;
  const digits = String(val).replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

async function inspectAndClean() {
  const tables = ['mcu_records', 'mcu_mini_mcu_records', 'mcu_karyawan_records'];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('id, nama_lengkap, nomor_bpjs, nomor_inhealth');
    if (error) {
      console.log(`Error reading ${t}:`, error.message);
      continue;
    }

    let dirtyCount = 0;
    for (const r of data) {
      const cleanBpjs = sanitizeDigits(r.nomor_bpjs);
      const cleanInhealth = sanitizeDigits(r.nomor_inhealth);

      const bpjsChanged = (r.nomor_bpjs || null) !== cleanBpjs;
      const inhealthChanged = (r.nomor_inhealth || null) !== cleanInhealth;

      if (bpjsChanged || inhealthChanged) {
        dirtyCount++;
        console.log(`[${t}] ID ${r.id} (${r.nama_lengkap}):`);
        if (bpjsChanged) console.log(`   BPJS: "${r.nomor_bpjs}" -> "${cleanBpjs}"`);
        if (inhealthChanged) console.log(`   Inhealth: "${r.nomor_inhealth}" -> "${cleanInhealth}"`);

        await supabase.from(t).update({
          nomor_bpjs: cleanBpjs,
          nomor_inhealth: cleanInhealth
        }).eq('id', r.id);
      }
    }
    console.log(`[${t}] Total rows cleaned: ${dirtyCount} / ${data.length}`);
  }
}

inspectAndClean();
