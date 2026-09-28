const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function getClinicalVitals(row, index) {
  const diseases = Array.isArray(row.penyakit) ? row.penyakit : (row.penyakit ? [row.penyakit] : []);
  const diseaseStr = (diseases.join(' ') + ' ' + (row.penyakit_text || '') + ' ' + (row.diagnosa || '')).toLowerCase();
  
  // Status Kebugaran & Kesimpulan
  let kesimpulan = row.kesimpulan || 'fit';
  let status_kebugaran = row.status_kebugaran;

  const hasSevereDisease = /cad|jantung|abnormal ekg|hipertensi|treadmill|ginjal|paru|stroke/.test(diseaseStr);
  const hasModerateDisease = /fatty liver|ldl|kolesterol|gula|lft|hepatitis|polip|urin|asam urat|dislipidemia/.test(diseaseStr);
  const hasMinorDisease = /mata|refraksi|gigi|overweight|anemia/.test(diseaseStr);

  if (hasSevereDisease && (index % 4 === 0 || row.kesimpulan === 'sementara_tidak_fit')) {
    kesimpulan = 'sementara_tidak_fit';
    status_kebugaran = 'Sementara Tidak Fit';
  } else if (hasModerateDisease || row.kesimpulan === 'fit_dengan_catatan') {
    kesimpulan = 'fit_dengan_catatan';
    status_kebugaran = 'Fit dengan Catatan';
  } else if (hasMinorDisease && index % 2 === 0) {
    kesimpulan = 'fit_dengan_catatan';
    status_kebugaran = 'Fit dengan Catatan';
  } else {
    kesimpulan = 'fit';
    status_kebugaran = 'Fit for Duty';
  }

  const isFit = kesimpulan === 'fit';
  const isTidakFit = kesimpulan === 'sementara_tidak_fit';

  // 1. Kolesterol
  let kolesterol = row.kolesterol;
  const hasHighLipid = /ldl|hiperkolesterol|dislipidemia/.test(diseaseStr);
  const hasModerateLipid = /fatty liver|trigliserida|lipid/.test(diseaseStr);
  
  if (hasHighLipid || (isTidakFit && index % 2 === 0)) {
    // >= 240
    const offsets = [242, 248, 255, 260, 268, 275, 282];
    kolesterol = String(offsets[index % offsets.length]);
  } else if (hasModerateLipid || (kesimpulan === 'fit_dengan_catatan' && index % 2 === 0)) {
    // 200 - 238
    const offsets = [205, 210, 215, 220, 226, 232, 238];
    kolesterol = String(offsets[index % offsets.length]);
  } else {
    // < 200
    const offsets = [162, 168, 174, 180, 185, 189, 194];
    kolesterol = String(offsets[index % offsets.length]);
  }

  // 2. Gula Darah
  let gula_darah = row.gula_darah;
  const hasDiabetes = /gula|diabetes|dm|glukosa/.test(diseaseStr);
  
  if (hasDiabetes || (isTidakFit && index % 5 === 0)) {
    // >= 126
    const offsets = [128, 134, 142, 150, 162, 175, 188];
    gula_darah = String(offsets[index % offsets.length]);
  } else if ((kesimpulan === 'fit_dengan_catatan' && index % 2 === 0) || (hasModerateDisease && index % 3 === 0)) {
    // 100 - 125
    const offsets = [102, 106, 110, 114, 118, 122];
    gula_darah = String(offsets[index % offsets.length]);
  } else {
    // < 100
    const offsets = [82, 85, 88, 91, 94, 97];
    gula_darah = String(offsets[index % offsets.length]);
  }

  // 3. Tensi
  let tensi = row.tensi;
  const hasHypertension = /hipertensi|tensi tinggi/.test(diseaseStr);
  
  if (hasHypertension || (isTidakFit && index % 2 === 0)) {
    // >= 140/90
    const tensiList = ['140/90', '145/90', '150/95', '155/95', '160/100'];
    tensi = tensiList[index % tensiList.length];
  } else if (kesimpulan === 'fit_dengan_catatan' || index % 3 !== 0) {
    // 120-139 / 80-89
    const tensiList = ['120/80', '125/80', '128/82', '130/85', '135/85'];
    tensi = tensiList[index % tensiList.length];
  } else {
    // < 120/80
    const tensiList = ['110/70', '115/75', '118/78', '112/74'];
    tensi = tensiList[index % tensiList.length];
  }

  // 4. Asam Urat
  let asam_urat = row.asam_urat;
  const hasUrat = /asam urat|gout|ginjal/.test(diseaseStr);
  if (hasUrat || (isTidakFit && index % 3 === 0)) {
    const offsets = ['7.5', '8.0', '8.4', '8.9'];
    asam_urat = offsets[index % offsets.length];
  } else if (kesimpulan === 'fit_dengan_catatan' && index % 2 === 0) {
    const offsets = ['6.2', '6.5', '6.8', '7.0'];
    asam_urat = offsets[index % offsets.length];
  } else {
    const offsets = ['4.8', '5.2', '5.6', '5.9'];
    asam_urat = offsets[index % offsets.length];
  }

  return { kesimpulan, status_kebugaran, kolesterol, gula_darah, tensi, asam_urat };
}

async function simulate() {
  const { data: mcu } = await supabase.from('mcu_records').select('*');
  const { data: mini } = await supabase.from('mini_mcu_records').select('*');

  console.log('--- SIMULATION FOR MCU ADMIN (283 records) ---');
  let k_t = 0, k_s = 0, k_r = 0;
  let g_d = 0, g_p = 0, g_n = 0;
  let t_h = 0, t_p = 0, t_n = 0;
  let s_f = 0, s_c = 0, s_t = 0;

  mcu.forEach((r, idx) => {
    const v = getClinicalVitals(r, idx);
    if (v.status_kebugaran === 'Fit for Duty') s_f++;
    else if (v.status_kebugaran === 'Fit dengan Catatan') s_c++;
    else s_t++;

    const k = Number(v.kolesterol);
    if (k >= 240) k_t++; else if (k >= 200) k_s++; else k_r++;

    const g = Number(v.gula_darah);
    if (g >= 126) g_d++; else if (g >= 100) g_p++; else g_n++;

    const sys = Number(v.tensi.split('/')[0]);
    const dia = Number(v.tensi.split('/')[1]);
    if (sys >= 140 || dia >= 90) t_h++; else if (sys >= 120 || dia >= 80) t_p++; else t_n++;
  });

  console.log(`MCU Status Kebugaran: Fit=${s_f}, Catatan=${s_c}, Tidak Fit=${s_t} -> Total = ${s_f+s_c+s_t}`);
  console.log(`MCU Kolesterol: Tinggi(>=240)=${k_t}, Sedang(200-239)=${k_s}, Rendah(<200)=${k_r} -> Total = ${k_t+k_s+k_r}`);
  console.log(`MCU Gula Darah: Diabetes(>=126)=${g_d}, Prediabetes(100-125)=${g_p}, Normal(<100)=${g_n} -> Total = ${g_d+g_p+g_n}`);
  console.log(`MCU Tensi: Hipertensi(>=140/90)=${t_h}, Pra-Hipertensi(120-139)=${t_p}, Normal(<120/80)=${t_n} -> Total = ${t_h+t_p+t_n}`);

  console.log('\n--- SIMULATION FOR MINI MCU (756 records) ---');
  let mk_t = 0, mk_s = 0, mk_r = 0;
  let mg_d = 0, mg_p = 0, mg_n = 0;
  let mt_h = 0, mt_p = 0, mt_n = 0;
  let ms_f = 0, ms_c = 0, ms_t = 0;

  mini.forEach((r, idx) => {
    const v = getClinicalVitals(r, idx);
    if (v.status_kebugaran === 'Fit for Duty') ms_f++;
    else if (v.status_kebugaran === 'Fit dengan Catatan') ms_c++;
    else ms_t++;

    const k = Number(v.kolesterol);
    if (k >= 240) mk_t++; else if (k >= 200) mk_s++; else mk_r++;

    const g = Number(v.gula_darah);
    if (g >= 126) mg_d++; else if (g >= 100) mg_p++; else mg_n++;

    const sys = Number(v.tensi.split('/')[0]);
    const dia = Number(v.tensi.split('/')[1]);
    if (sys >= 140 || dia >= 90) mt_h++; else if (sys >= 120 || dia >= 80) mt_p++; else mt_n++;
  });

  console.log(`Mini Status Kebugaran: Fit=${ms_f}, Catatan=${ms_c}, Tidak Fit=${ms_t} -> Total = ${ms_f+ms_c+ms_t}`);
  console.log(`Mini Kolesterol: Tinggi(>=240)=${mk_t}, Sedang(200-239)=${mk_s}, Rendah(<200)=${mk_r} -> Total = ${mk_t+mk_s+mk_r}`);
  console.log(`Mini Gula Darah: Diabetes(>=126)=${mg_d}, Prediabetes(100-125)=${mg_p}, Normal(<100)=${mg_n} -> Total = ${mg_d+mg_p+mg_n}`);
  console.log(`Mini Tensi: Hipertensi(>=140/90)=${mt_h}, Pra-Hipertensi(120-139)=${mt_p}, Normal(<120/80)=${mt_n} -> Total = ${mt_h+mt_p+mt_n}`);
}

simulate();
