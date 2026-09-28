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

async function updateDb() {
  console.log('Fetching mcu_records...');
  const { data: mcu, error: mcuErr } = await supabase.from('mcu_records').select('*');
  if (mcuErr) throw mcuErr;

  console.log(`Updating ${mcu.length} mcu_records...`);
  for (let i = 0; i < mcu.length; i++) {
    const r = mcu[i];
    const v = assignVitals(r, i, false);
    const { error: updateErr } = await supabase
      .from('mcu_records')
      .update({
        kolesterol: v.kolesterol,
        gula_darah: v.gula_darah,
        tensi: v.tensi,
        asam_urat: v.asam_urat,
      })
      .eq('id', r.id);
    if (updateErr) console.error(`Error updating MCU id ${r.id}:`, updateErr.message);
  }
  console.log('mcu_records update completed!');

  console.log('Fetching mini_mcu_records...');
  const { data: mini, error: miniErr } = await supabase.from('mini_mcu_records').select('*');
  if (miniErr) throw miniErr;

  console.log(`Updating ${mini.length} mini_mcu_records...`);
  for (let i = 0; i < mini.length; i++) {
    const r = mini[i];
    const v = assignVitals(r, i, true);
    const { error: updateErr } = await supabase
      .from('mini_mcu_records')
      .update({
        kolesterol: v.kolesterol,
        gula_darah: v.gula_darah,
        tensi: v.tensi,
        asam_urat: v.asam_urat,
      })
      .eq('id', r.id);
    if (updateErr) console.error(`Error updating Mini MCU id ${r.id}:`, updateErr.message);
  }
  console.log('mini_mcu_records update completed!');
}

updateDb().catch(console.error);
