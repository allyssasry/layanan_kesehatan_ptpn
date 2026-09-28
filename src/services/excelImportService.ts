import * as XLSX from 'xlsx';
import { FitnessStatus } from '@/types/mcu';
import { normalizeDivisiName } from '@/lib/divisiMaster';

export interface ParsedMcuRow {
  nama_karyawan: string;
  nik: string;
  divisi: string;
  tanggal_pemeriksaan: string; // Formatted YYYY-MM-DD
  nomor_inhealth?: string;
  bpjs?: string;
  nomor_bpjs?: string;
  jabatan?: string;
  departemen?: string;
  entitas?: string;
  kategori_peserta?: 'Tetap' | 'Magang';
  gender?: 'Laki-laki' | 'Perempuan';
  umur?: number;
  golongan_darah?: string;
  tinggi_badan?: number;
  berat_badan?: number;
  bmi?: number;
  tensi?: string;
  gula_darah?: string;
  kolesterol?: string;
  asam_urat?: string;
  suhu?: string;
  penyakit: string[];
  penyakit_list: string[];
  penyakit_text: string;
  diagnosa: string;
  diagnosa_klinik?: string;
  tindakan_terapi?: string;
  tindak_lanjut: string;
  intervensi: string[];
  status_kebugaran: FitnessStatus;
  kesimpulan: 'fit' | 'fit_dengan_catatan' | 'sementara_tidak_fit';
  vitals?: any;
  waktu_kunjungan?: string;
  jam_pemeriksaan?: string;
  nomor_pegawai?: string;
  nama_poli_rujukan?: string | null;
  rumah_sakit_rujukan?: string | null;
  obat?: string[];
  obat_list?: string[];
  raw_obat?: string;
  qty?: string;
  butuh_tindak_lanjut?: boolean;
  keluhan?: string;
  keluhan_harian?: string;
  faktor_risiko?: string;
  dokter?: string | null;
  perawat?: string | null;
}

// Master Disease Column Names in exact display order
export const EXCEL_DISEASE_COLUMNS = [
  'Fatty Liver',
  'Mild Fatty Liver',
  'Obesitas I',
  'Obesitas II',
  'Overweight',
  'Hipertensi',
  'Dislipidemia',
  'Hiperkolesterolemia',
  'LDL Tinggi',
  'HDL Rendah',
  'Trigliserida Tinggi',
  'Gula Darah Tinggi',
  'LFT (SGOT/SGPT)',
  'Abnormal EKG',
  'Treadmill (+)',
  'Suspect CAD',
  'Gangguan Refraksi Mata',
  'Gangguan Pendengaran',
  'Buta Warna',
  'Gigi',
  'Polip Empedu',
  'Kista Ginjal',
  'Kista Ovarium',
  'Paru',
  'Anemia',
  'Gangguan Ginjal',
  'Kelainan Urin',
  'Hepatitis B (Non Imun)',
] as const;

/**
 * Robust disease matcher for Excel column headers (handles line breaks and variations)
 */
export function matchDiseaseHeader(colHeaderRaw: string): string | null {
  const norm = String(colHeaderRaw || '')
    .trim()
    .toLowerCase()
    .replace(/[\r\n\t_]+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');

  if (!norm) return null;
  const compact = norm.replace(/\s+/g, '');

  // Specific compound diseases checked first
  if (norm.includes('mild fatty') || compact.includes('mildfatty') || norm.includes('mild fatty liver') || compact.includes('mildfattyliver')) return 'Mild Fatty Liver';
  if (norm.includes('fatty liver') || compact.includes('fattyliver') || norm.includes('perlemakan hati') || compact.includes('perlemakanhati')) return 'Fatty Liver';
  if (norm.includes('obesitas ii') || norm.includes('obesitas 2') || compact.includes('obesitasii') || compact.includes('obesitas2') || compact.includes('obeseii') || compact.includes('obese2') || norm.includes('obese grade 2') || compact.includes('obesegrade2')) return 'Obesitas II';
  if (norm.includes('obesitas i') || norm.includes('obesitas 1') || compact.includes('obesitasi') || compact.includes('obesitas1') || compact.includes('obesei') || compact.includes('obese1') || norm.includes('obese grade 1') || compact.includes('obesegrade1') || norm === 'obesitas' || compact === 'obesitas') return 'Obesitas I';
  if (norm.includes('overweight') || compact.includes('overweight') || norm.includes('over weight')) return 'Overweight';
  if (norm.includes('hipertensi') || compact.includes('hipertensi') || norm.includes('hypertension') || norm.includes('tekanan darah tinggi')) return 'Hipertensi';
  if (norm.includes('dislipidemia') || compact.includes('dislipidemia') || norm.includes('dyslipidemia')) return 'Dislipidemia';
  if (norm.includes('hiperkolesterol') || compact.includes('hiperkolesterol') || norm.includes('hiperkolesterolemia') || compact.includes('hiperkolesterolemia') || norm.includes('kolesterol tinggi')) return 'Hiperkolesterolemia';
  if (norm.includes('ldl') || compact.includes('ldl') || norm.includes('ldl tinggi')) return 'LDL Tinggi';
  if (norm.includes('hdl') || compact.includes('hdl') || norm.includes('hdl rendah')) return 'HDL Rendah';
  if (norm.includes('trigliserid') || compact.includes('trigliserid') || norm.includes('trigliserida') || compact.includes('trigliserida') || norm.includes('triglyceride')) return 'Trigliserida Tinggi';
  if (norm.includes('gula darah') || compact.includes('guladarah') || norm.includes('diabetes') || norm.includes('gds tinggi') || norm.includes('gdp tinggi') || (norm.includes('gula') && !norm.includes('obat'))) return 'Gula Darah Tinggi';
  if (norm.includes('lft') || compact.includes('lft') || norm.includes('sgot') || norm.includes('sgpt')) return 'LFT (SGOT/SGPT)';
  if (norm.includes('ekg') || compact.includes('ekg') || norm.includes('ecg')) return 'Abnormal EKG';
  if (norm.includes('treadmill') || compact.includes('treadmill') || norm.includes('treadmil')) return 'Treadmill (+)';
  if (norm.includes('cad') || compact.includes('cad') || norm.includes('suspect cad') || norm.includes('suspek cad')) return 'Suspect CAD';
  if (norm.includes('refraksi') || compact.includes('refraksi') || norm.includes('gangguan refraksi') || (norm.includes('mata') && !norm.includes('buta'))) return 'Gangguan Refraksi Mata';
  if (norm.includes('dengar') || compact.includes('dengar') || norm.includes('pendengaran') || norm.includes('telinga')) return 'Gangguan Pendengaran';
  if (norm.includes('buta warna') || compact.includes('butawarna') || norm.includes('color blind')) return 'Buta Warna';
  if (norm.includes('gigi') || compact.includes('gigi') || norm.includes('dental') || norm.includes('karies')) return 'Gigi';
  if ((norm.includes('polip') || compact.includes('polip')) && (norm.includes('empedu') || norm.includes('kantung'))) return 'Polip Empedu';
  if (norm.includes('polip') || compact.includes('polip')) return 'Polip Empedu';
  if ((norm.includes('kista') || compact.includes('kista')) && norm.includes('ginjal')) return 'Kista Ginjal';
  if ((norm.includes('kista') || compact.includes('kista')) && (norm.includes('ovarium') || norm.includes('kandungan'))) return 'Kista Ovarium';
  if (norm.includes('kista') || compact.includes('kista')) return 'Kista Ginjal';
  if (norm.includes('paru') || compact.includes('paru') || norm.includes('tbc') || norm.includes('flek')) return 'Paru';
  if (norm.includes('anemia') || compact.includes('anemia') || norm.includes('hb rendah') || norm.includes('kurang darah')) return 'Anemia';
  if (norm.includes('ginjal') || compact.includes('ginjal')) return 'Gangguan Ginjal';
  if (norm.includes('urin') || compact.includes('urin') || norm.includes('urine')) return 'Kelainan Urin';
  if (norm.includes('hepatitis') || compact.includes('hepatitis') || norm.includes('hbsag')) return 'Hepatitis B (Non Imun)';

  return null;
}

/**
 * Check if a cell contains a truthy/checked indicator (e.g. '✓', '✔', '√', 'v', '1', 'x', 'ya', non-empty)
 */
export function isCheckedCell(val: any): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val > 0;
  const str = String(val).replace(/[\u00A0\uFEFF]/g, ' ').trim().toLowerCase();
  if (!str) return false;
  // Explicit negative indicators
  if (['0', 'false', 'tidak', 'no', '-', '--', 'none', 'null', 'undefined', 'negatif', 'neg', 'tidak ada', 'tdk', 'n/a', 'na'].includes(str)) {
    return false;
  }
  return true;
}

export function isEntityName(rawVal: any): boolean {
  if (!rawVal) return false;
  const str = String(rawVal).trim().toLowerCase();
  if (!str) return false;
  return (
    str.includes('ptpn') ||
    str.includes('holding') ||
    str.includes('suppco') ||
    str.includes('palmco') ||
    ['1', '3', '4', 'i', 'iii', 'iv', 'ptpn1', 'ptpn3', 'ptpn4'].includes(str)
  );
}

/**
 * Helper to map entity / departemen according to user specification:
 * - Holding / PTPN 3 -> PTPN 3
 * - SuppCo / PTPN 1  -> PTPN 1
 * - PalmCo / PTPN 4  -> PTPN 4
 */
export function parseDepartemenEntitas(rawVal: any): { entitas: string; departemen: string } {
  const str = String(rawVal || '').trim().toLowerCase();

  // Check Magang
  if (str.includes('magang') || str.includes('intern')) {
    return { entitas: 'Magang', departemen: 'Magang' };
  }

  // Check Penugasan
  if (str.includes('penugasan') || str.includes('tugas')) {
    return { entitas: 'Penugasan', departemen: 'Penugasan' };
  }

  // Check OB / Outsourcing
  if (str.includes('office boy') || str.includes('outsourcing') || str === 'ob') {
    return { entitas: 'OB', departemen: 'OB' };
  }

  // Check PTPN 4 / PalmCo / IV
  if (
    str.includes('palmco') ||
    str.includes('palm co') ||
    str.includes('ptpn 4') ||
    str.includes('ptpn4') ||
    str.includes('ptpn-4') ||
    str.includes('ptpn_4') ||
    str.includes('ptpn iv') ||
    str.includes('ptpn-iv') ||
    str.includes('ptpniv') ||
    str === 'iv' ||
    str === '4'
  ) {
    return { entitas: 'PTPN 4', departemen: 'PTPN 4' };
  }

  // Check PTPN 3 / Holding / III
  if (
    str.includes('holding') ||
    str.includes('ptpn 3') ||
    str.includes('ptpn3') ||
    str.includes('ptpn-3') ||
    str.includes('ptpn_3') ||
    str.includes('ptpn iii') ||
    str.includes('ptpn-iii') ||
    str.includes('ptpniii') ||
    str === 'iii' ||
    str === '3'
  ) {
    return { entitas: 'PTPN 3', departemen: 'PTPN 3' };
  }

  // Check PTPN 1 / SuppCo / I
  if (
    str.includes('suppco') ||
    str.includes('supp co') ||
    str.includes('ptpn 1') ||
    str.includes('ptpn1') ||
    str.includes('ptpn-1') ||
    str.includes('ptpn_1') ||
    str.includes('ptpn i') ||
    str.includes('ptpn-i') ||
    str.includes('ptpni') ||
    str === 'i' ||
    str === '1'
  ) {
    return { entitas: 'PTPN 1', departemen: 'PTPN 1' };
  }

  if (str) {
    if (str.includes('4')) return { entitas: 'PTPN 4', departemen: 'PTPN 4' };
    if (str.includes('1')) return { entitas: 'PTPN 1', departemen: 'PTPN 1' };
    if (str.includes('3')) return { entitas: 'PTPN 3', departemen: 'PTPN 3' };
    return { entitas: String(rawVal).trim(), departemen: String(rawVal).trim() };
  }

  return { entitas: 'PTPN 3', departemen: 'PTPN 3' };
}

/**
 * Convert raw Excel date (serial number, string DD/MM/YYYY, Indonesian "2 Feb 2026", YYYY-MM-DD, etc.) to YYYY-MM-DD
 */
export function parseExcelDate(val: any): string {
  if (val === null || val === undefined || val === '') {
    return new Date().toISOString().split('T')[0];
  }

  // If already a JS Date object
  if (val instanceof Date) {
    if (!isNaN(val.getTime())) {
      // Add small buffer to compensate for SheetJS 12-second leap drift (23:59:48 -> 00:00:xx)
      const adjusted = new Date(val.getTime() + 120 * 1000);
      const year = adjusted.getFullYear();
      const month = String(adjusted.getMonth() + 1).padStart(2, '0');
      const day = String(adjusted.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // If Excel serial number (e.g. 46059 or 46059.36458 -> 2026-02-06)
  if (typeof val === 'number' && val > 1000 && val < 100000) {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        const year = String(parsed.y);
        const month = String(parsed.m).padStart(2, '0');
        const day = String(parsed.d).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch {
      // fallback
    }
  }

  const str = String(val).trim();
  if (!str) return new Date().toISOString().split('T')[0];

  // String numeric serial number (e.g. "46059" or "46059.36458")
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    if (!isNaN(num) && num > 1000 && num < 100000) {
      try {
        const parsed = XLSX.SSF.parse_date_code(num);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          const year = String(parsed.y);
          const month = String(parsed.m).padStart(2, '0');
          const day = String(parsed.d).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
      } catch {
        // fallback
      }
    }
  }

  // Indonesian / English textual dates: e.g. "3 Feb 2026", "2 Feb 2026", "14 Februari 2026", "05-Agu-2026", "4 Mar 2026"
  const indonesianMonths: Record<string, string> = {
    jan: '01', januari: '01', january: '01',
    feb: '02', februari: '02', february: '02',
    mar: '03', maret: '03', march: '03',
    apr: '04', april: '04',
    mei: '05', may: '05',
    jun: '06', juni: '06', june: '06',
    jul: '07', juli: '07', july: '07',
    agu: '08', agt: '08', agst: '08', agustus: '08', aug: '08', august: '08',
    sep: '09', spt: '09', sept: '09', september: '09',
    okt: '10', oktober: '10', oct: '10', october: '10',
    nov: '11', nop: '11', nopember: '11', november: '11',
    des: '12', desember: '12', dec: '12', december: '12',
  };

  const textDateMatch = str.match(/^(\d{1,2})[\s\-\/\.]([a-zA-Z]+)[\s\-\/\.](\d{2,4})/);
  if (textDateMatch) {
    const day = textDateMatch[1].padStart(2, '0');
    const monthKey = textDateMatch[2].toLowerCase();
    let year = textDateMatch[3];
    if (year.length === 2) year = `20${year}`;
    const monthNum = indonesianMonths[monthKey] || '02';
    return `${year}-${monthNum}-${day}`;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (e.g. 06/02/2026, 17/06/2025)
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Format: YYYY-MM-DD or YYYY/MM/DD (e.g. 2026-02-06)
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Fallback try standard Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const adjusted = new Date(parsed.getTime() + 120 * 1000);
    const year = adjusted.getFullYear();
    const month = String(adjusted.getMonth() + 1).padStart(2, '0');
    const day = String(adjusted.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return new Date().toISOString().split('T')[0];
}

/**
 * Clean & match header keys ignoring case, spaces, and punctuation
 */
function normalizeKey(header: string): string {
  return String(header || '')
    .trim()
    .toLowerCase()
    .replace(/[\r\n\t_]+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Helper to parse medicine strings and extract vitals (e.g. "chol: 195", "ALPARA (6) BECOM ZET (4)")
 */
function parseMedicinesAndVitals(rawObat: string) {
  if (!rawObat) return { medicines: [] as string[], extractedVitals: {} as any };

  const extractedVitals: any = {};

  // Check for cholesterol e.g. "chol: 195", "chel: 195", "kolesterol: 195"
  const cholMatch = rawObat.match(/(?:chol|chel|kolesterol|koles)\s*[:=]?\s*(\d+)/i);
  if (cholMatch) {
    extractedVitals.kolesterol = cholMatch[1];
  }

  // Check for blood sugar e.g. "gula: 110" or "gds: 110"
  const gulaMatch = rawObat.match(/(?:gula|gds|gdp)\s*[:=]?\s*(\d+)/i);
  if (gulaMatch) {
    extractedVitals.gula_darah = gulaMatch[1];
  }

  // Check for blood pressure e.g. "tensi: 120/80" or "td: 120/80"
  const tensiMatch = rawObat.match(/(?:tensi|td)\s*[:=]?\s*(\d+\/\d+)/i);
  if (tensiMatch) {
    extractedVitals.tensi = tensiMatch[1];
  }

  // Clean raw string
  const cleanStr = rawObat
    .replace(/(?:chol|chel|kolesterol|koles)\s*[:=]?\s*\d+/gi, '')
    .replace(/(?:gula|gds|gdp)\s*[:=]?\s*\d+/gi, '')
    .replace(/(?:tensi|td)\s*[:=]?\s*\d+\/\d+/gi, '')
    .trim();

  if (!cleanStr || cleanStr === '-' || cleanStr === '0') {
    return { medicines: [] as string[], extractedVitals };
  }

  // Extract individual medicines with quantity, e.g. "ALPARA (6) BECOM ZET (4)" -> ["ALPARA (6)", "BECOM ZET (4)"]
  const medItems: string[] = [];
  const parenMatches = cleanStr.match(/[a-zA-Z0-9\.\-\/]+(?:\s+[a-zA-Z0-9\.\-\/]+)*(?:\s*\(\d+\))?/g);
  if (parenMatches && parenMatches.length > 0) {
    for (const m of parenMatches) {
      const trimmed = m.trim().replace(/^[\s,\+\&]+|[\s,\+\&]+$/g, '');
      if (trimmed && !['dan', 'plus', '+', '-', 'none'].includes(trimmed.toLowerCase())) {
        medItems.push(trimmed);
      }
    }
  }

  return {
    medicines: medItems.length > 0 ? Array.from(new Set(medItems)) : [cleanStr],
    extractedVitals,
  };
}

/**
 * Parse an Excel / CSV File buffer or ArrayBuffer supporting both MCU Berkala and Inhouse Clinic (Mini MCU)
 */
export async function parseMcuExcelFile(file: File): Promise<ParsedMcuRow[]> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File Excel tidak memiliki sheet yang valid.');
  }

  // Find the worksheet with the most data
  let worksheet = workbook.Sheets[workbook.SheetNames[0]];
  let maxRowCount = 0;
  for (const sName of workbook.SheetNames) {
    const ws = workbook.Sheets[sName];
    const testRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    if (testRows.length > maxRowCount) {
      maxRowCount = testRows.length;
      worksheet = ws;
    }
  }

  // Convert worksheet to 2D array of rows to handle top header titles cleanly (raw: false preserves formatted strings like BPJS and Inhealth)
  const rows2D: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });
  if (!rows2D || rows2D.length === 0) {
    throw new Error('File Excel kosong atau tidak memiliki baris data.');
  }

  // Scan top 30 rows using multi-column scoring to detect the TRUE table header row
  const recognizedKeywords = [
    'nama', 'pasien', 'karyawan',
    'tanggal', 'tgl', 'waktu', 'jam',
    'divisi', 'bagian', 'sub divisi', 'unit kerja',
    'departemen', 'entitas', 'holding', 'suppco', 'palmco', 'ptpn',
    'nik', 'nip', 'nomor pegawa', 'no pegaw',
    'diagnosa', 'diagnosis', 'keluhan',
    'tindakan', 'terapi', 'anjuran',
    'obat', 'resep', 'poli', 'rujukan', 'no', 'nomor',
    'inhealth', 'bpjs', 'gender', 'jenis kelamin', 'kelamin',
    'fatty liver', 'hipertensi', 'dislipidemia', 'kolesterol', 'obesitas', 'overweight', 'gula darah'
  ];

  let headerRowIndex = 0;
  let maxScore = -1;

  for (let r = 0; r < Math.min(30, rows2D.length); r++) {
    const row = rows2D[r];
    if (!row || row.length === 0) continue;

    let score = 0;
    row.forEach((cell: any) => {
      const cellStr = String(cell || '').trim().toLowerCase();
      if (!cellStr) return;
      for (const kw of recognizedKeywords) {
        if (cellStr === kw || cellStr.includes(kw)) {
          score++;
          break;
        }
      }
    });

    if (score > maxScore) {
      maxScore = score;
      headerRowIndex = r;
    }
  }

  const headerRow = (rows2D[headerRowIndex] || []).map((h: any) => normalizeKey(String(h)));
  const dataRows = rows2D.slice(headerRowIndex + 1);

  const parsedRecords: ParsedMcuRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    if (!row || row.length === 0) continue;

    let nama = '';
    let nik = '';
    let nomorPegawai = '';
    let nomorInhealth = '';
    let nomorBpjs = '';
    let rawGender = '';
    let rawDepartemen = '';
    let rawDivisi = '';
    let rawTanggal: any = null;
    let waktuKunjungan = '';
    let diagnosa = '';
    let tindakan = '';
    let poliRujukan = '';
    let lokasiRujukan = '';
    let rawObat = '';
    let qty = '';
    let height = 0;
    let weight = 0;
    let golonganDarah = '';
    let tensi = '120/80';
    let kesimpulanRaw = '';
    let anjuran = '';
    let saran = '';
    let keluhan = '';
    let faktorRisiko = '';

    const detectedDiseases: string[] = [];

    for (let c = 0; c < headerRow.length; c++) {
      const colHeader = headerRow[c];
      const val = row[c];
      if (val === undefined || val === null || val === '') continue;

      const valStr = String(val).trim();

      // Cek apakah kolom ini adalah kolom checklist penyakit (misal: Fatty Liver, LDL Tinggi, Gula Darah Tinggi, dll)
      const matchedDisease = matchDiseaseHeader(colHeader);
      if (matchedDisease) {
        if (isCheckedCell(val)) {
          if (!detectedDiseases.includes(matchedDisease)) {
            detectedDiseases.push(matchedDisease);
          }
        }
        continue;
      }

      // Column Matching
      if (colHeader.includes('inhealth') || colHeader.includes('in health')) {
        let clean = valStr.replace(/[\u00A0\uFEFF]/g, ' ').trim();
        if (clean === '-' || clean === '--') clean = '';
        if (/^\d+\.0+$/.test(clean)) clean = clean.split('.')[0];
        nomorInhealth = clean;
      } else if (colHeader.includes('bpjs')) {
        let clean = valStr.replace(/[\u00A0\uFEFF]/g, ' ').trim();
        if (clean === '-' || clean === '--') clean = '';
        if (/^\d+\.0+$/.test(clean)) clean = clean.split('.')[0];
        nomorBpjs = clean;
      } else if (colHeader.includes('jenis kelamin') || colHeader === 'jk' || colHeader === 'gender' || colHeader.includes('kelamin')) {
        rawGender = valStr;
      } else if (colHeader.includes('nama obat') || colHeader.includes('resep obat') || colHeader.includes('obat') || colHeader === 'terapi obat') {
        rawObat = valStr;
      } else if (colHeader.includes('poli rujukan') || colHeader.includes('poli')) {
        poliRujukan = valStr;
      } else if (colHeader.includes('lokasi rujukan') || colHeader.includes('lokasi') || colHeader.includes('rs') || colHeader.includes('rumah sakit')) {
        lokasiRujukan = valStr;
      } else if (colHeader.includes('nomor pegaw') || colHeader.includes('no pegaw') || colHeader.includes('no peg') || colHeader.includes('nip') || colHeader.includes('nomor pegawai')) {
        nomorPegawai = valStr;
      } else if (colHeader.includes('nama pasien') || colHeader.includes('nama karyawan') || colHeader === 'nama' || colHeader === 'pasien' || colHeader === 'name' || (colHeader.includes('nama') && !colHeader.includes('obat') && !colHeader.includes('poli') && !colHeader.includes('rs') && !colHeader.includes('dokumen'))) {
        nama = valStr;
      } else if (colHeader.includes('nik') && !colHeader.includes('klinik') && !colHeader.includes('inhealth')) {
        nik = valStr;
      } else if (
        colHeader === 'divisi' ||
        colHeader === 'bagian' ||
        colHeader === 'sub divisi' ||
        colHeader === 'unit kerja' ||
        (colHeader.includes('divisi') && !colHeader.includes('entitas') && !colHeader.includes('dept')) ||
        (colHeader.includes('bagian') && !colHeader.includes('obat'))
      ) {
        rawDivisi = valStr;
      } else if (
        colHeader.includes('departem') ||
        colHeader.includes('entitas') ||
        colHeader.includes('holding') ||
        colHeader === 'unit' ||
        colHeader.includes('instansi') ||
        colHeader.includes('ptpn')
      ) {
        rawDepartemen = valStr;
      } else if (
        colHeader.includes('tanggal kunj') ||
        colHeader.includes('tgl kunj') ||
        colHeader.includes('tanggal periks') ||
        colHeader.includes('tgl periks') ||
        colHeader.includes('tanggal mcu') ||
        colHeader.includes('tgl mcu') ||
        colHeader.includes('tanggal') ||
        colHeader.includes('tgl') ||
        colHeader === 'date'
      ) {
        rawTanggal = val;
      } else if (colHeader.includes('waktu') || colHeader.includes('jam')) {
        waktuKunjungan = valStr;
      } else if (colHeader.includes('diagnos') || colHeader.includes('diagnosis')) {
        diagnosa = valStr;
      } else if (colHeader.includes('tindakan') || colHeader.includes('terapi')) {
        tindakan = valStr;
      } else if (colHeader.includes('qt') || colHeader.includes('qty') || colHeader.includes('kuantitas') || colHeader.includes('jumlah')) {
        qty = valStr;
      } else if (colHeader.includes('height') || colHeader.includes('tb') || colHeader.includes('tinggi badan') || colHeader.includes('tinggi')) {
        height = parseFloat(valStr.replace(',', '.')) || 0;
      } else if (colHeader.includes('weight') || colHeader.includes('bb') || colHeader.includes('berat badan') || colHeader.includes('berat')) {
        weight = parseFloat(valStr.replace(',', '.')) || 0;
      } else if (colHeader.includes('golongan darah') || colHeader.includes('gol darah') || colHeader.includes('goldar') || colHeader === 'gol') {
        golonganDarah = valStr.toUpperCase();
      } else if (colHeader.includes('tensi') || colHeader.includes('tekanan darah') || colHeader === 'td' || colHeader === 'bp') {
        tensi = valStr;
      } else if (colHeader.includes('kesimpulan') || colHeader.includes('status kebugaran') || colHeader.includes('kebugaran') || colHeader === 'status') {
        kesimpulanRaw = valStr;
      } else if (colHeader.includes('anjuran') || colHeader.includes('tindak lanjut')) {
        anjuran = valStr;
      } else if (colHeader.includes('saran') || colHeader.includes('konsultasi') || colHeader.includes('intervensi')) {
        saran = valStr;
      } else if (colHeader.includes('keluhan')) {
        keluhan = valStr;
      } else if (colHeader.includes('faktor')) {
        faktorRisiko = valStr;
      }
    }

    // Skip empty rows
    if (!nama && !nik && !diagnosa && !tindakan && detectedDiseases.length === 0) {
      continue;
    }

    // 1. Departemen & Entitas Mapping
    let entitySource = rawDepartemen;
    if (!entitySource && isEntityName(rawDivisi)) {
      entitySource = rawDivisi;
    }
    const entityResult = parseDepartemenEntitas(entitySource);
    const departemen = entityResult.departemen;
    const entitas = entityResult.entitas;

    // Divisi logic
    let finalDivisi = 'Tidak memiliki divisi';
    if (rawDivisi && !isEntityName(rawDivisi) && rawDivisi.trim() !== '-' && rawDivisi.trim() !== '') {
      finalDivisi = normalizeDivisiName(rawDivisi) || rawDivisi.trim();
    }

    // 2. Tanggal Pemeriksaan
    const parsedDate = parseExcelDate(rawTanggal);

    // 3. Obat & Vitals extraction
    const { medicines, extractedVitals } = parseMedicinesAndVitals(rawObat);

    // 4. Height, Weight, BMI
    if (height <= 0) height = 168;
    if (weight <= 0) weight = 62;
    const heightM = height / 100;
    const bmiVal = heightM > 0 ? Number((weight / (heightM * heightM)).toFixed(1)) : 22.0;

    // 5. Status Kebugaran & Kesimpulan Logic
    const trimmedDiag = (diagnosa || '').trim();
    const hasExplicitDiagnosa =
      trimmedDiag !== '' &&
      trimmedDiag !== '-' &&
      trimmedDiag.toLowerCase() !== 'null' &&
      trimmedDiag.toLowerCase() !== 'undefined';

    let statusKebugaran: FitnessStatus = 'Fit for Duty';
    let kesimpulanKey: 'fit' | 'fit_dengan_catatan' | 'sementara_tidak_fit' = 'fit';
    let butuhTindakLanjut = false;

    const lowerTindakan = tindakan.toLowerCase();
    const lowerPoli = poliRujukan.toLowerCase();
    const lowerLokasi = lokasiRujukan.toLowerCase();
    const isRujukan =
      lowerTindakan.includes('rujukan') ||
      lowerPoli.includes('rujukan') ||
      lowerLokasi.includes('rs') ||
      Boolean(poliRujukan && poliRujukan !== '-');

    if (kesimpulanRaw) {
      const lowKes = kesimpulanRaw.toLowerCase();
      if (lowKes.includes('sementara') || lowKes.includes('unfit') || lowKes.includes('tidak fit')) {
        statusKebugaran = 'Sementara Tidak Fit';
        kesimpulanKey = 'sementara_tidak_fit';
        butuhTindakLanjut = true;
      } else if (lowKes.includes('catatan') || lowKes.includes('note') || lowKes.includes('dengan catatan')) {
        statusKebugaran = 'Fit dengan Catatan';
        kesimpulanKey = 'fit_dengan_catatan';
        butuhTindakLanjut = false;
      } else if (lowKes.includes('fit')) {
        statusKebugaran = 'Fit for Duty';
        kesimpulanKey = 'fit';
        butuhTindakLanjut = false;
      }
    } else if (isRujukan) {
      statusKebugaran = 'Sementara Tidak Fit';
      kesimpulanKey = 'sementara_tidak_fit';
      butuhTindakLanjut = true;
    } else if (
      medicines.length > 0 ||
      detectedDiseases.length > 0 ||
      (hasExplicitDiagnosa &&
        trimmedDiag.toUpperCase() !== 'CHEKUP' &&
        trimmedDiag.toUpperCase() !== 'CC' &&
        trimmedDiag.toUpperCase() !== 'COMMON COLD')
    ) {
      statusKebugaran = 'Fit dengan Catatan';
      kesimpulanKey = 'fit_dengan_catatan';
      butuhTindakLanjut = false;
    } else {
      statusKebugaran = 'Fit for Duty';
      kesimpulanKey = 'fit';
      butuhTindakLanjut = false;
    }

    // 6. Action / Findings & Diagnosa
    const finalPoliRujukan =
      poliRujukan && poliRujukan !== '-' && poliRujukan.trim() !== '' && poliRujukan.toLowerCase().trim() !== 'inhouse clinic'
        ? poliRujukan.trim()
        : null;
    const finalRsRujukan =
      lokasiRujukan && lokasiRujukan !== '-' && lokasiRujukan.trim() !== ''
        ? lokasiRujukan.trim()
        : null;

    // Anjuran masuk ke dalam tindak lanjut sesuai permintaan pengguna
    const finalTindakLanjut =
      anjuran ||
      tindakan ||
      saran ||
      (finalPoliRujukan
        ? `Rujukan ke ${finalPoliRujukan}${finalRsRujukan ? ` (${finalRsRujukan})` : ''}`
        : 'Tidak memiliki anjuran');

    const mappedDiagnosa = trimmedDiag.toUpperCase() === 'CC' ? 'Common Cold' : trimmedDiag;
    const finalDiagnosa = hasExplicitDiagnosa
      ? mappedDiagnosa
      : detectedDiseases.length > 0
        ? detectedDiseases.join(', ')
        : 'Tidak memiliki diagnosa';

    const finalPenyakitList =
      detectedDiseases.length > 0
        ? detectedDiseases
        : [];

    const finalPenyakitText =
      detectedDiseases.length > 0
        ? detectedDiseases.join(', ')
        : 'Tidak memiliki penyakit';

    const intervensiList: string[] = [];

    // Split tensi
    const tensiParts = tensi.split('/');
    const sis = parseInt(tensiParts[0], 10) || 120;
    const dia = parseInt(tensiParts[1], 10) || 80;

    let jamPemeriksaanFormatted = '08:30';
    if (waktuKunjungan) {
      const timeMatch = waktuKunjungan.match(/\b(\d{1,2})[\.:,](\d{2})\b/);
      if (timeMatch) {
        jamPemeriksaanFormatted = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
      } else {
        jamPemeriksaanFormatted = waktuKunjungan;
      }
    }

    const isMagang =
      departemen.toLowerCase().includes('magang') ||
      entitas.toLowerCase().includes('magang') ||
      finalDivisi.toLowerCase().includes('magang');
    const kategoriPeserta: 'Tetap' | 'Magang' = isMagang ? 'Magang' : 'Tetap';

    const finalGender: 'Laki-laki' | 'Perempuan' =
      rawGender && (
        rawGender.toLowerCase().startsWith('p') ||
        rawGender.toLowerCase().includes('wanita') ||
        rawGender.toLowerCase().includes('perempuan') ||
        rawGender.toLowerCase() === 'f' ||
        rawGender.toLowerCase() === 'female'
      ) ? 'Perempuan' : 'Laki-laki';

    // Nomor Inhealth & BPJS dengan fallback jelas jika kosong
    const finalNomorInhealth = nomorInhealth || 'Tidak memiliki nomor inhealth';
    const finalNomorBpjs = nomorBpjs || 'Tidak memiliki BPJS';

    const finalNik = nik && nik !== '-' && nik !== '--'
      ? nik
      : (nomorInhealth && nomorInhealth !== 'Tidak memiliki nomor inhealth'
          ? nomorInhealth
          : `NIK-${Math.floor(10000000 + Math.random() * 90000000)}`);

    const finalButuhTindakLanjut = false;

    parsedRecords.push({
      nama_karyawan: nama || `Karyawan Baris ${i + 1}`,
      nik: finalNik,
      divisi: finalDivisi,
      departemen: departemen,
      entitas: entitas,
      tanggal_pemeriksaan: parsedDate,
      jabatan: isMagang ? 'Peserta Magang' : 'Staf Karyawan',
      kategori_peserta: kategoriPeserta,
      gender: finalGender,
      umur: 35,
      nomor_inhealth: finalNomorInhealth,
      nomor_bpjs: finalNomorBpjs,
      bpjs: finalNomorBpjs,
      golongan_darah: golonganDarah || 'O+',
      tinggi_badan: height,
      berat_badan: weight,
      bmi: bmiVal,
      tensi: extractedVitals.tensi || `${sis}/${dia}`,
      gula_darah: extractedVitals.gula_darah || '110',
      kolesterol: extractedVitals.kolesterol || '190',
      asam_urat: '6.0',
      suhu: '36.5',
      penyakit: finalPenyakitList,
      penyakit_list: finalPenyakitList,
      penyakit_text: finalPenyakitText,
      diagnosa: finalDiagnosa,
      diagnosa_klinik: finalDiagnosa,
      keluhan: hasExplicitDiagnosa ? trimmedDiag : (finalPenyakitText !== 'Tidak memiliki penyakit' ? finalPenyakitText : 'Tidak memiliki keluhan'),
      keluhan_harian: hasExplicitDiagnosa ? trimmedDiag : (finalPenyakitText !== 'Tidak memiliki penyakit' ? finalPenyakitText : 'Tidak memiliki keluhan'),
      faktor_risiko: 'Tidak memiliki faktor risiko',
      dokter: null,
      perawat: null,
      tindakan_terapi: finalTindakLanjut,
      tindak_lanjut: finalTindakLanjut,
      intervensi: intervensiList,
      status_kebugaran: statusKebugaran,
      kesimpulan: kesimpulanKey,
      waktu_kunjungan: waktuKunjungan,
      jam_pemeriksaan: jamPemeriksaanFormatted,
      nomor_pegawai: finalNomorInhealth !== 'Tidak memiliki nomor inhealth' ? finalNomorInhealth : (nomorPegawai || undefined),
      nama_poli_rujukan: finalPoliRujukan,
      rumah_sakit_rujukan: finalRsRujukan,
      obat: medicines.length > 0 ? medicines : ['Multivitamin & Mineral'],
      obat_list: medicines.length > 0 ? medicines : ['Multivitamin & Mineral'],
      raw_obat: rawObat,
      qty: qty,
      butuh_tindak_lanjut: finalButuhTindakLanjut,
      vitals: {
        tensi_sistolik: sis,
        tensi_diastolik: dia,
        tensi: extractedVitals.tensi || `${sis}/${dia}`,
        suhu: 36.5,
        nadi: 78,
        spo2: 98,
        gula_darah: Number(extractedVitals.gula_darah) || 110,
        kolesterol: Number(extractedVitals.kolesterol) || 190,
        asam_urat: 6.0,
        tinggi_badan: height,
        berat_badan: weight,
        bmi: bmiVal,
      },
    });
  }

  return parsedRecords;
}

/**
 * Generate and download formatted sample Excel template matching exact columns
 */
export function downloadMcuExcelTemplate() {
  const headers = [
    'No',
    'Tanggal Kunjungan',
    'Waktu Kunjungan',
    'Nama Pasien',
    'Divisi',
    'Nomor Pegawai',
    'NIK',
    'Departemen',
    'Diagnosa',
    'Tindakan',
    'Poli Rujukan',
    'Lokasi Rujukan',
    'Nama Obat',
    'QTY',
  ];

  const sampleRows = [
    {
      'No': 1,
      'Tanggal Kunjungan': '05/04/2026',
      'Waktu Kunjungan': '09.13',
      'Nama Pasien': 'Cut Rizky Ramadana',
      'Divisi': 'Keluarga',
      'Nomor Pegawai': '',
      'NIK': '1011734422705',
      'Departemen': 'PTPN 3',
      'Diagnosa': 'Urinary tract infection, site not specified',
      'Tindakan': 'KONSULTASI + OBAT',
      'Poli Rujukan': '-',
      'Lokasi Rujukan': '-',
      'Nama Obat': 'CIPROFLOXACIN 500MG (10)',
      'QTY': '10',
    },
    {
      'No': 2,
      'Tanggal Kunjungan': '05/04/2026',
      'Waktu Kunjungan': '14.10',
      'Nama Pasien': 'ARIEF SATRIA ARDIANSYAH',
      'Divisi': 'DPSP',
      'Nomor Pegawai': '',
      'NIK': '3577030901920000',
      'Departemen': 'PTPN 1',
      'Diagnosa': 'KONJUNGTIVITIS',
      'Tindakan': 'KONSULTASI + OBAT',
      'Poli Rujukan': '-',
      'Lokasi Rujukan': '-',
      'Nama Obat': 'CENDO XITROL (1)',
      'QTY': '1',
    },
    {
      'No': 3,
      'Tanggal Kunjungan': '05/04/2026',
      'Waktu Kunjungan': '13.53',
      'Nama Pasien': 'ATIKA LESTARI',
      'Divisi': '',
      'Nomor Pegawai': '',
      'NIK': '1806186102020000',
      'Departemen': 'Magang',
      'Diagnosa': 'CC',
      'Tindakan': 'KONSULTASI',
      'Poli Rujukan': '-',
      'Lokasi Rujukan': '-',
      'Nama Obat': '-',
      'QTY': '-',
    },
    {
      'No': 4,
      'Tanggal Kunjungan': '05/04/2026',
      'Waktu Kunjungan': '14.15',
      'Nama Pasien': 'Dini Afriyani Siregar',
      'Divisi': 'DPDU',
      'Nomor Pegawai': '',
      'NIK': '1001494243359',
      'Departemen': 'PTPN 3',
      'Diagnosa': 'LARINGITIS',
      'Tindakan': 'KONSULTASI + OBAT',
      'Poli Rujukan': '-',
      'Lokasi Rujukan': '-',
      'Nama Obat': 'BECOM ZET (10)',
      'QTY': '10',
    },
    {
      'No': 5,
      'Tanggal Kunjungan': '05/04/2026',
      'Waktu Kunjungan': '19.20',
      'Nama Pasien': 'WAHID NURWAHYUDIN',
      'Divisi': 'DSPS',
      'Nomor Pegawai': '',
      'NIK': '1001494243001',
      'Departemen': 'PTPN 3',
      'Diagnosa': 'HT',
      'Tindakan': 'KONSULTASI + OBAT',
      'Poli Rujukan': '-',
      'Lokasi Rujukan': '-',
      'Nama Obat': 'AMLODIPINE 5MG (10)',
      'QTY': '10',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows, { header: headers });

  // Auto-width columns
  const colWidths = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
  colWidths[1] = { wch: 20 }; // Tanggal Kunjungan
  colWidths[2] = { wch: 18 }; // Waktu Kunjungan
  colWidths[3] = { wch: 30 }; // Nama Pasien
  colWidths[4] = { wch: 16 }; // Nomor Pegawai
  colWidths[5] = { wch: 18 }; // NIK
  colWidths[6] = { wch: 16 }; // Departemen
  colWidths[7] = { wch: 30 }; // Diagnosa
  colWidths[8] = { wch: 26 }; // Tindakan
  colWidths[9] = { wch: 26 }; // Poli Rujukan
  colWidths[10] = { wch: 22 }; // Lokasi Rujukan
  colWidths[11] = { wch: 35 }; // Nama Obat
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Mini MCU');

  XLSX.writeFile(workbook, 'Template_Import_Mini_MCU_Klinik.xlsx');
}
