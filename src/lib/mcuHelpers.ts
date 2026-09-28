// src/lib/mcuHelpers.ts
/**
 * Shared MCU helpers to guarantee 100% data consistency between Dashboard, Rekapan MCU, and Exports.
 */

import { normalizeDivisiName, isSameDivisi } from './divisiMaster';

/**
 * Normalizes an employee record to a canonical unique key.
 * If a valid NIK exists (>= 3 chars, not dummy), key is `nik_${cleanNik}`.
 * Otherwise uses `nama_${cleanNama}`.
 * Fallback to record ID.
 */
export const getKaryawanUniqueKey = (r: any): string => {
  if (!r) return 'unknown';
  const rawNik = String(r.nik || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const rawNama = String(r.nama_lengkap || r.nama_karyawan || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const hasValidNik =
    rawNik &&
    rawNik !== '-' &&
    rawNik !== '0' &&
    rawNik !== 'null' &&
    rawNik !== 'undefined' &&
    rawNik !== 'tidakada' &&
    !/^0+$/.test(rawNik) &&
    rawNik.length >= 3;

  const hasValidNama =
    rawNama &&
    rawNama !== '-' &&
    rawNama !== 'null' &&
    rawNama !== 'undefined' &&
    rawNama !== 'tidak ada' &&
    rawNama !== 'karyawan' &&
    rawNama.length >= 2;

  if (hasValidNik && hasValidNama) {
    return `nik_${rawNik}_nama_${rawNama}`;
  }

  if (hasValidNik) {
    return `nik_${rawNik}`;
  }

  if (hasValidNama) {
    return `nama_${rawNama}`;
  }

  return `id_${r.id || Math.random()}`;
};

/**
 * Deduplicates records so each unique employee appears at most once (picking their latest examination).
 */
export const getUniqueEmployeeRecords = <T extends any>(records: T[]): T[] => {
  if (!Array.isArray(records)) return [];
  const empMap = new Map<string, T>();

  // Sort newest to oldest
  const sorted = [...records].sort((a: any, b: any) => {
    const tA = new Date(a.tanggal_pemeriksaan || a.tanggal_kunjungan || a.created_at || 0).getTime();
    const tB = new Date(b.tanggal_pemeriksaan || b.tanggal_kunjungan || b.created_at || 0).getTime();
    return (isNaN(tB) ? 0 : tB) - (isNaN(tA) ? 0 : tA);
  });

  sorted.forEach((r) => {
    const key = getKaryawanUniqueKey(r);
    if (!empMap.has(key)) {
      empMap.set(key, r);
    }
  });

  return Array.from(empMap.values());
};

/**
 * Standard Fitness Status Categorization:
 * - 'sementara_tidak_fit'
 * - 'fit_dengan_catatan'
 * - 'fit_sehat'
 */
export const getRecordFitnessStatus = (rec: any): 'sementara_tidak_fit' | 'fit_dengan_catatan' | 'fit_sehat' => {
  if (!rec) return 'fit_sehat';
  const statusStr = String(rec.status_kebugaran || '').toLowerCase();
  const kesimpulanStr = String(rec.kesimpulan || '').toLowerCase();

  if (
    statusStr.includes('tidak fit') ||
    statusStr.includes('sementara') ||
    statusStr.includes('unfit') ||
    statusStr.includes('evaluasi') ||
    kesimpulanStr === 'sementara_tidak_fit' ||
    kesimpulanStr === 'tidak_fit'
  ) {
    return 'sementara_tidak_fit';
  }

  if (
    statusStr.includes('catatan') ||
    kesimpulanStr === 'fit_dengan_catatan' ||
    kesimpulanStr === 'catatan'
  ) {
    return 'fit_dengan_catatan';
  }

  if (
    statusStr.includes('fit for duty') ||
    statusStr.includes('fit sehat') ||
    statusStr === 'fit' ||
    kesimpulanStr === 'fit'
  ) {
    return 'fit_sehat';
  }

  const penyakitList = rec.penyakit_list || rec.penyakit || [];
  const hasPenyakit = Array.isArray(penyakitList) && penyakitList.length > 0 && penyakitList[0] !== 'Kondisi Fisik Baik';
  if (hasPenyakit) {
    return 'fit_dengan_catatan';
  }

  return 'fit_sehat';
};

/**
 * Checks if a record has actual physical measurements or examination findings.
 */
export const hasMcuExamination = (r: any): boolean => {
  if (!r) return false;
  const tb = Number(r.tinggi_badan || 0);
  const bb = Number(r.berat_badan || 0);
  const bmi = Number(r.bmi || 0);
  const hasTb = !isNaN(tb) && tb > 0;
  const hasBb = !isNaN(bb) && bb > 0;
  const hasBmi = !isNaN(bmi) && bmi > 0;

  const tensiStr = String(r.tensi || '').trim();
  const hasTensi = Boolean(tensiStr && tensiStr !== '-' && tensiStr !== '0' && tensiStr !== 'null');

  const gulaStr = String(r.gula_darah || '').trim();
  const hasGula = Boolean(gulaStr && gulaStr !== '-' && gulaStr !== '0' && gulaStr !== 'null');

  const kolStr = String(r.kolesterol || '').trim();
  const hasKol = Boolean(kolStr && kolStr !== '-' && kolStr !== '0' && kolStr !== 'null');

  const asamStr = String(r.asam_urat || '').trim();
  const hasAsam = Boolean(asamStr && asamStr !== '-' && asamStr !== '0' && asamStr !== 'null');

  const suhuStr = String(r.suhu || '').trim();
  const hasSuhu = Boolean(suhuStr && suhuStr !== '-' && suhuStr !== '0' && suhuStr !== 'null');

  const hasPhysicalMeasurements = hasTb || hasBb || hasBmi || hasTensi || hasGula || hasKol || hasAsam || hasSuhu;

  const v = r.vitals;
  const hasVitalsObj = Boolean(
    v && (
      (typeof v.tinggi_badan === 'number' && v.tinggi_badan > 0) ||
      (typeof v.berat_badan === 'number' && v.berat_badan > 0) ||
      (typeof v.bmi === 'number' && v.bmi > 0) ||
      (typeof v.tensi_sistolik === 'number' && v.tensi_sistolik > 0) ||
      (v.tensi && v.tensi.trim() !== '' && v.tensi.trim() !== '-' && v.tensi.trim() !== '0') ||
      (typeof v.gula_darah === 'number' && v.gula_darah > 0) ||
      (typeof v.kolesterol === 'number' && v.kolesterol > 0) ||
      (typeof v.asam_urat === 'number' && v.asam_urat > 0) ||
      (typeof v.suhu === 'number' && v.suhu > 0)
    )
  );

  const hasFile = Boolean(r.file_dokumen || r.nama_dokumen);

  const isMeaningful = (s: string | null | undefined) => {
    if (!s) return false;
    const str = s.trim().toLowerCase();
    return str !== '' && str !== '-' && str !== '0' && str !== 'null' && str !== 'tidak ada' && str !== 'sehat' && str !== 'normal';
  };

  const hasDiagnosa = isMeaningful(r.diagnosa);
  const hasKeluhan = isMeaningful(r.keluhan);
  const hasPenyakitList = Array.isArray(r.penyakit_list) && r.penyakit_list.length > 0 && r.penyakit_list.some((p: any) => isMeaningful(p));
  const hasPenyakitArr = Array.isArray(r.penyakit) && r.penyakit.length > 0 && r.penyakit.some((p: any) => isMeaningful(p));
  const hasPenyakitText = isMeaningful(r.penyakit_text);

  return hasPhysicalMeasurements || hasVitalsObj || hasFile || hasDiagnosa || hasKeluhan || hasPenyakitList || hasPenyakitArr || hasPenyakitText;
};

/**
 * Canonical clean divisi name
 */
export const cleanDivisiName = (rawDiv: string | null | undefined): string => {
  const d = (rawDiv || '').trim();
  if (!d || d === '-' || d === '0') return 'Belum Ditentukan';
  const isEntity = ['ptpn 1', 'ptpn 3', 'ptpn 4', 'ptpn1', 'ptpn3', 'ptpn4', 'holding', 'suppco', 'palmco'].includes(d.toLowerCase());
  if (isEntity) return '';
  const norm = normalizeDivisiName(d);
  return norm || d;
};

/**
 * Divisi matcher
 */
export const matchDivisi = (recDiv: string | null | undefined, filterDiv: string | null | undefined): boolean => {
  if (!filterDiv || filterDiv === 'all') return true;
  if (!recDiv) return false;
  const cleanRec = cleanDivisiName(recDiv).toLowerCase();
  const cleanFilter = cleanDivisiName(filterDiv).toLowerCase();
  if (cleanRec === cleanFilter) return true;
  if (isSameDivisi(recDiv, filterDiv)) return true;
  return false;
};

/**
 * Age brackets and matcher
 */
export const AGE_BRACKETS = [
  '< 25 thn',
  '25 - 35 thn',
  '36 - 45 thn',
  '46 - 55 thn',
  '> 55 thn',
] as const;

export const matchAgeBracket = (umur: number, filterBracket: string | null | undefined): boolean => {
  if (!filterBracket || filterBracket === 'all') return true;
  if (!umur || isNaN(umur) || umur <= 0) return false;
  const b = filterBracket.toLowerCase();
  if (b.includes('< 25') || b.includes('<25')) return umur < 25;
  if (b.includes('25 - 35') || b.includes('25-35') || b.includes('25 - 30') || b.includes('31 - 35')) return umur >= 25 && umur <= 35;
  if (b.includes('36 - 45') || b.includes('36-45') || b.includes('36 - 40') || b.includes('41 - 45')) return umur >= 36 && umur <= 45;
  if (b.includes('46 - 55') || b.includes('46-55') || b.includes('46 - 50') || b.includes('51 - 55')) return umur >= 46 && umur <= 55;
  if (b.includes('> 55') || b.includes('>55') || b.includes('> 50')) return umur > 55;
  return false;
};

/**
 * Vital parameter status extractors
 */
export const getTensiStatus = (rec: any): 'hipertensi' | 'pra_hipertensi' | 'normal' | 'unknown' => {
  let sis = rec?.vitals?.tensi_sistolik;
  let dia = rec?.vitals?.tensi_diastolik;
  if ((!sis || !dia) && rec?.tensi) {
    const parts = String(rec.tensi).split('/');
    sis = parseInt(parts[0], 10) || 0;
    dia = parseInt(parts[1], 10) || 0;
  }
  if (!sis && !dia) return 'unknown';
  if (sis >= 140 || dia >= 90) return 'hipertensi';
  if (sis >= 120 || dia >= 80) return 'pra_hipertensi';
  if (sis > 0 && dia > 0) return 'normal';
  return 'unknown';
};

export const getKolesterolStatus = (rec: any): 'tinggi' | 'normal' | 'unknown' => {
  const k = Number(rec?.kolesterol || rec?.vitals?.kolesterol);
  if (!k || isNaN(k) || k <= 0) return 'unknown';
  if (k >= 200) return 'tinggi';
  return 'normal';
};

export const getGulaDarahStatus = (rec: any): 'diabetes' | 'pre_diabetes' | 'normal' | 'unknown' => {
  const g = Number(rec?.gula_darah || rec?.vitals?.gula_darah);
  if (!g || isNaN(g) || g <= 0) return 'unknown';
  if (g >= 126) return 'diabetes';
  if (g >= 100) return 'pre_diabetes';
  return 'normal';
};

export const getBmiValue = (rec: any): number => {
  let bmi = parseFloat(String(rec?.bmi || rec?.vitals?.bmi || '0')) || 0;
  if (!bmi && rec?.tinggi_badan && rec?.berat_badan) {
    const hm = (parseFloat(rec.tinggi_badan) || 0) / 100;
    const w = parseFloat(rec.berat_badan) || 0;
    if (hm > 0 && w > 0) bmi = Number((w / (hm * hm)).toFixed(1));
  }
  return bmi;
};

export const getBmiStatus = (rec: any): 'obesitas' | 'overweight' | 'normal' | 'underweight' | 'unknown' => {
  const bmi = getBmiValue(rec);
  if (!bmi || isNaN(bmi) || bmi <= 0) return 'unknown';
  if (bmi >= 27.0) return 'obesitas';
  if (bmi >= 25.0) return 'overweight';
  if (bmi >= 18.5) return 'normal';
  return 'underweight';
};
