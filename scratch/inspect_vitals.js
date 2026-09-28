const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspect() {
  const { data: mcu } = await supabase.from('mcu_records').select('id, nama_lengkap, kesimpulan, penyakit, diagnosa, keluhan');
  
  let noDiseaseCount = 0;
  let minorCount = 0;
  let seriousCount = 0;

  (mcu || []).forEach(r => {
    const list = Array.isArray(r.penyakit) ? r.penyakit : (r.penyakit ? [r.penyakit] : []);
    const cleanList = list.filter(p => {
      const s = String(p).toLowerCase();
      return s && s !== '-' && s !== 'tidak ada' && s !== 'normal' && s !== 'sehat' && !s.includes('tidak memiliki');
    });

    if (cleanList.length === 0) noDiseaseCount++;
    else if (cleanList.length <= 2 && cleanList.every(p => ['Mata', 'Gangguan Refraksi Mata', 'Gigi', 'Overweight', 'Anemia'].includes(p))) minorCount++;
    else seriousCount++;
  });

  console.log(`MCU Health breakdown: No Disease = ${noDiseaseCount}, Minor Only = ${minorCount}, Serious/Multi = ${seriousCount}`);
}

inspect();
