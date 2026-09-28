const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function verifyAll() {
  const { data: mcu } = await supabase.from('mcu_records').select('*');
  const { data: mini } = await supabase.from('mini_mcu_records').select('*');

  console.log(`MCU count: ${mcu?.length}, Mini MCU count: ${mini?.length}`);

  function report(records, title) {
    let kolT = 0, kolS = 0, kolR = 0;
    let gulaD = 0, gulaP = 0, gulaN = 0;
    let tensiH = 0, tensiP = 0, tensiN = 0;
    let fit = 0, catatan = 0, tidakFit = 0;

    records.forEach(r => {
      // status kebugaran
      const st = r.status_kebugaran || (r.kesimpulan === 'fit' ? 'Fit for Duty' : r.kesimpulan === 'sementara_tidak_fit' ? 'Sementara Tidak Fit' : 'Fit dengan Catatan');
      if (st === 'Fit for Duty') fit++;
      else if (st === 'Fit dengan Catatan') catatan++;
      else tidakFit++;

      const k = Number(r.kolesterol) || 190;
      if (k >= 240) kolT++; else if (k >= 200) kolS++; else kolR++;

      const g = Number(r.gula_darah) || 95;
      if (g >= 126) gulaD++; else if (g >= 100) gulaP++; else gulaN++;

      const sys = Number(String(r.tensi || '').split('/')[0]) || 120;
      const dia = Number(String(r.tensi || '').split('/')[1]) || 80;
      if (sys >= 140 || dia >= 90) tensiH++; else if (sys >= 120 || dia >= 80) tensiP++; else tensiN++;
    });

    console.log(`\n=== ${title} (Total ${records.length}) ===`);
    console.log(`Status Kebugaran (Total ${fit+catatan+tidakFit}): Fit=${fit}, Catatan=${catatan}, Tidak Fit=${tidakFit}`);
    console.log(`Kolesterol (Total ${kolT+kolS+kolR}): Tinggi=${kolT}, Sedang=${kolS}, Rendah=${kolR}`);
    console.log(`Gula Darah (Total ${gulaD+gulaP+gulaN}): Diabetes=${gulaD}, Prediabetes=${gulaP}, Normal=${gulaN}`);
    console.log(`Tensi (Total ${tensiH+tensiP+tensiN}): Hipertensi=${tensiH}, Pra-Hipertensi=${tensiP}, Normal=${tensiN}`);
  }

  report(mcu, 'MCU ADMIN');
  report(mini, 'INHOUSE CLINIC');
}

verifyAll();
