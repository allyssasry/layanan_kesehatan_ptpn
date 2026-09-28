const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function assignVitals(r, index, isClinic = false) {
  const diseases = Array.isArray(r.penyakit) ? r.penyakit : (r.penyakit ? [r.penyakit] : []);
  const dStr = (diseases.join(' ') + ' ' + (r.penyakit_text || '') + ' ' + (r.diagnosa || '')).toLowerCase();
  
  const isTidakFit = r.kesimpulan === 'sementara_tidak_fit' || r.status_kebugaran === 'Sementara Tidak Fit';
  const isFit = r.kesimpulan === 'fit' || r.status_kebugaran === 'Fit for Duty';

  // KOLESTEROL
  let kol = r.kolesterol;
  const hasHighLipid = /ldl|hiperkolesterol|dislipidemia/.test(dStr);
  const hasModerateLipid = /fatty liver|trigliserida|lipid|asam urat/.test(dStr);

  if (hasHighLipid || (isClinic && index % 5 === 0) || (isTidakFit && index % 4 === 0)) {
    const list = [242, 248, 255, 260, 268, 275, 282];
    kol = String(list[index % list.length]);
  } else if (hasModerateLipid || (isClinic && index % 2 === 0) || (!isFit && index % 3 !== 0)) {
    const list = [205, 210, 215, 220, 226, 232, 238];
    kol = String(list[index % list.length]);
  } else {
    const list = [162, 168, 174, 180, 185, 189, 194];
    kol = String(list[index % list.length]);
  }

  // GULA DARAH
  let gula = r.gula_darah;
  const hasDiabetes = /gula|diabetes|dm|glukosa/.test(dStr);
  if (hasDiabetes || (isClinic && index % 8 === 0) || (isTidakFit && index % 6 === 0)) {
    const list = [128, 134, 142, 150, 162, 175, 188];
    gula = String(list[index % list.length]);
  } else if (!isFit && (index % 2 === 0 || hasModerateLipid || (isClinic && index % 3 === 0))) {
    const list = [102, 106, 110, 114, 118, 122];
    gula = String(list[index % list.length]);
  } else {
    const list = [82, 85, 88, 91, 94, 97];
    gula = String(list[index % list.length]);
  }

  // TENSI
  let tensi = r.tensi;
  const hasHipertensi = /hipertensi|tensi tinggi|ht\b/.test(dStr);
  if (hasHipertensi || (isClinic && index % 7 === 0) || (isTidakFit && index % 5 === 0)) {
    const list = ['140/90', '145/90', '150/95', '155/95', '160/100'];
    tensi = list[index % list.length];
  } else if (isFit || (index % 3 === 0 && !isTidakFit)) {
    const list = ['110/70', '115/75', '118/78', '112/74'];
    tensi = list[index % list.length];
  } else {
    const list = ['120/80', '125/80', '128/82', '130/85', '135/85'];
    tensi = list[index % list.length];
  }

  // ASAM URAT
  let asam = r.asam_urat;
  const hasUrat = /asam urat|gout|ginjal/.test(dStr);
  if (hasUrat || (isTidakFit && index % 3 === 0)) {
    const list = ['7.5', '8.0', '8.4', '8.9'];
    asam = list[index % list.length];
  } else if (!isFit && index % 2 === 0) {
    const list = ['6.2', '6.5', '6.8', '7.0'];
    asam = list[index % list.length];
  } else {
    const list = ['4.8', '5.2', '5.6', '5.9'];
    asam = list[index % list.length];
  }

  return { kolesterol: kol, gula_darah: gula, tensi: tensi, asam_urat: asam };
}

async function testFinal() {
  const { data: mcu } = await supabase.from('mcu_records').select('*');
  const { data: mini } = await supabase.from('mini_mcu_records').select('*');

  console.log(`\n=== MCU ADMIN (${mcu.length} records) ===`);
  let mcu_k = { tinggi: 0, sedang: 0, rendah: 0 };
  let mcu_g = { diab: 0, prediab: 0, normal: 0 };
  let mcu_t = { hiper: 0, pra: 0, normal: 0 };

  mcu.forEach((r, idx) => {
    const v = assignVitals(r, idx, false);
    const k = Number(v.kolesterol);
    if (k >= 240) mcu_k.tinggi++; else if (k >= 200) mcu_k.sedang++; else mcu_k.rendah++;

    const g = Number(v.gula_darah);
    if (g >= 126) mcu_g.diab++; else if (g >= 100) mcu_g.prediab++; else mcu_g.normal++;

    const sys = Number(v.tensi.split('/')[0]);
    const dia = Number(v.tensi.split('/')[1]);
    if (sys >= 140 || dia >= 90) mcu_t.hiper++; else if (sys >= 120 || dia >= 80) mcu_t.pra++; else mcu_t.normal++;
  });

  console.log('Kolesterol:', mcu_k, 'Total =', Object.values(mcu_k).reduce((a,b)=>a+b, 0));
  console.log('Gula Darah:', mcu_g, 'Total =', Object.values(mcu_g).reduce((a,b)=>a+b, 0));
  console.log('Tensi:', mcu_t, 'Total =', Object.values(mcu_t).reduce((a,b)=>a+b, 0));

  console.log(`\n=== INHOUSE CLINIC (${mini.length} records) ===`);
  let mini_k = { tinggi: 0, sedang: 0, rendah: 0 };
  let mini_g = { diab: 0, prediab: 0, normal: 0 };
  let mini_t = { hiper: 0, pra: 0, normal: 0 };

  mini.forEach((r, idx) => {
    const v = assignVitals(r, idx, true);
    const k = Number(v.kolesterol);
    if (k >= 240) mini_k.tinggi++; else if (k >= 200) mini_k.sedang++; else mini_k.rendah++;

    const g = Number(v.gula_darah);
    if (g >= 126) mini_g.diab++; else if (g >= 100) mini_g.prediab++; else mini_g.normal++;

    const sys = Number(v.tensi.split('/')[0]);
    const dia = Number(v.tensi.split('/')[1]);
    if (sys >= 140 || dia >= 90) mini_t.hiper++; else if (sys >= 120 || dia >= 80) mini_t.pra++; else mini_t.normal++;
  });

  console.log('Kolesterol:', mini_k, 'Total =', Object.values(mini_k).reduce((a,b)=>a+b, 0));
  console.log('Gula Darah:', mini_g, 'Total =', Object.values(mini_g).reduce((a,b)=>a+b, 0));
  console.log('Tensi:', mini_t, 'Total =', Object.values(mini_t).reduce((a,b)=>a+b, 0));
}

testFinal();
