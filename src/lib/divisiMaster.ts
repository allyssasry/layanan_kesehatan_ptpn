// src/lib/divisiMaster.ts
/**
 * Master Data Divisi Kantor Holding PT Perkebunan Nusantara III (Persero)
 * Berdasarkan tabel resmi kode divisi dan cost center.
 */

export interface MasterDivisiItem {
  kode: string;
  costCenter: string;
  nama: string;
  label: string;
  aliases: string[];
}

export const MASTER_DIVISI_LIST: MasterDivisiItem[] = [
  {
    kode: 'DAPN',
    costCenter: 'CHOL020002',
    nama: 'Divisi Akuntansi dan Perpajakan',
    label: 'DAPN - Divisi Akuntansi dan Perpajakan',
    aliases: [
      'dapn',
      'dapj',
      'dpak',
      'akuntansi',
      'perpajakan',
      'akuntansi & perpajakan',
      'akuntansi dan perpajakan',
      'divisi akuntansi dan perpajakan',
      'divisi akuntansi & perpajakan',
    ],
  },
  {
    kode: 'DATN',
    costCenter: 'CHOL070005',
    nama: 'Divisi Aneka Tanaman',
    label: 'DATN - Divisi Aneka Tanaman',
    aliases: [
      'datn',
      'datm',
      'aneka tanaman',
      'tanaman aneka',
      'divisi aneka tanaman',
    ],
  },
  {
    kode: 'DHKM',
    costCenter: 'CHOL060001',
    nama: 'Divisi Hubungan Kelembagaan & Hukum',
    label: 'DHKM - Divisi Hubungan Kelembagaan & Hukum',
    aliases: [
      'dhkm',
      'dhkt',
      'dhkl',
      'dham',
      'dkhm',
      'hukum',
      'divisi hukum',
      'kelembagaan',
      'hubungan kelembagaan',
      'hubungan kelembagaan & hukum',
      'hubungan kelembagaan dan hukum',
      'divisi hubungan kelembagaan & hukum',
      'divisi hubungan kelembagaan dan hukum',
    ],
  },
  {
    kode: 'DIMR',
    costCenter: 'CHOL020008',
    nama: 'Divisi Manajemen Risiko',
    label: 'DIMR - Divisi Manajemen Risiko',
    aliases: [
      'dimr',
      'dmrs',
      'drkm',
      'dkmr',
      'manajemen risiko',
      'manajemen resiko',
      'risiko',
      'resiko',
      'divisi manajemen risiko',
      'divisi manajemen resiko',
    ],
  },
  {
    kode: 'DKSA',
    costCenter: 'CHOL020007',
    nama: 'Divisi Keuangan Strategis dan Anggaran',
    label: 'DKSA - Divisi Keuangan Strategis dan Anggaran',
    aliases: [
      'dksa',
      'keuangan',
      'anggaran',
      'keuangan strategis',
      'keuangan strategis dan anggaran',
      'keuangan strategis & anggaran',
      'divisi keuangan strategis dan anggaran',
      'divisi keuangan strategis & anggaran',
    ],
  },
  {
    kode: 'DKSR',
    costCenter: 'CHOL070003',
    nama: 'Divisi Kelapa Sawit dan Karet',
    label: 'DKSR - Divisi Kelapa Sawit dan Karet',
    aliases: [
      'dksr',
      'sawit',
      'karet',
      'sawit dan karet',
      'kelapa sawit dan karet',
      'kelapa sawit & karet',
      'divisi kelapa sawit dan karet',
      'divisi kelapa sawit & karet',
      'dksr (magang)',
    ],
  },
  {
    kode: 'DMAS',
    costCenter: 'CHOL080001',
    nama: 'Divisi Manajemen Aset',
    label: 'DMAS - Divisi Manajemen Aset',
    aliases: [
      'dmas',
      'dpas',
      'aset',
      'manajemen aset',
      'divisi manajemen aset',
    ],
  },
  {
    kode: 'DOPS',
    costCenter: 'CHOL060005',
    nama: 'Divisi Operasional SDM',
    label: 'DOPS - Divisi Operasional SDM',
    aliases: [
      'dops',
      'dosg',
      'ods',
      'operasional sdm',
      'ops sdm',
      'divisi operasional sdm',
    ],
  },
  {
    kode: 'DPDU',
    costCenter: 'CHOL060002',
    nama: 'Divisi Pengadaan dan Umum',
    label: 'DPDU - Divisi Pengadaan dan Umum',
    aliases: [
      'dpdu',
      'dpum',
      'umum',
      'pengadaan',
      'pengadaan dan umum',
      'pengadaan & umum',
      'divisi pengadaan dan umum',
      'divisi pengadaan & umum',
    ],
  },
  {
    kode: 'DPPN',
    costCenter: 'CHOL050005',
    nama: 'Divisi Pemasaran & Penjualan',
    label: 'DPPN - Divisi Pemasaran & Penjualan',
    aliases: [
      'dppn',
      'depn',
      'pemasaran',
      'penjualan',
      'pemasaran dan penjualan',
      'pemasaran & penjualan',
      'divisi pemasaran & penjualan',
      'divisi pemasaran dan penjualan',
    ],
  },
  {
    kode: 'DSMK',
    costCenter: 'CHOL020005',
    nama: 'Divisi Strategi dan Manajemen Kinerja Korporasi',
    label: 'DSMK - Divisi Strategi dan Manajemen Kinerja Korporasi',
    aliases: [
      'dsmk',
      'dsko',
      'kinerja korporasi',
      'manajemen kinerja korporasi',
      'strategi dan manajemen kinerja korporasi',
      'strategi & manajemen kinerja korporasi',
      'divisi strategi dan manajemen kinerja korporasi',
      'divisi strategi & manajemen kinerja korporasi',
    ],
  },
  {
    kode: 'DSPI',
    costCenter: 'CHOL010002',
    nama: 'Divisi Satuan Pengawasan Intern',
    label: 'DSPI - Divisi Satuan Pengawasan Intern',
    aliases: [
      'dspi',
      'spi',
      'pengawasan intern',
      'satuan pengawasan intern',
      'divisi satuan pengawasan intern',
    ],
  },
  {
    kode: 'DSPN',
    costCenter: 'CHOL010001',
    nama: 'Divisi Sekretariat Perusahaan',
    label: 'DSPN - Divisi Sekretariat Perusahaan',
    aliases: [
      'dspn',
      'dpsn',
      'dspr',
      'dpsr',
      'sekper',
      'sekretariat',
      'sekretariat perusahaan',
      'divisi sekretariat perusahaan',
    ],
  },
  {
    kode: 'DSPS',
    costCenter: 'CHOL060006',
    nama: 'Divisi Strategi dan Pengembangan SDM',
    label: 'DSPS - Divisi Strategi dan Pengembangan SDM',
    aliases: [
      'dsps',
      'dsdm',
      'dpsp',
      'dskp',
      'pengembangan sdm',
      'strategi sdm',
      'strategi dan pengembangan sdm',
      'strategi & pengembangan sdm',
      'divisi strategi dan pengembangan sdm',
      'divisi strategi & pengembangan sdm',
    ],
  },
  {
    kode: 'DTDI',
    costCenter: 'CHOL090001',
    nama: 'Divisi Transformasi Digital',
    label: 'DTDI - Divisi Transformasi Digital',
    aliases: [
      'dtdi',
      'dinf',
      'it',
      'digital',
      'transformasi digital',
      'divisi transformasi digital',
    ],
  },
  {
    kode: 'PMKH',
    costCenter: 'CHOL070006',
    nama: 'PMO Pengembangan Komoditi dan Hilirisasi',
    label: 'PMKH - PMO Pengembangan Komoditi dan Hilirisasi',
    aliases: [
      'pmkh',
      'dpmo',
      'hilirisasi',
      'pengembangan komoditi',
      'pengembangan komoditi dan hilirisasi',
      'pengembangan komoditi & hilirisasi',
      'pmo pengembangan komoditi dan hilirisasi',
      'pmo pengembangan komoditi & hilirisasi',
    ],
  },
];

/**
 * Normalisasi string input divisi menjadi nama divisi resmi yang konsisten.
 * Contoh:
 *   "DPDU" -> "Divisi Pengadaan dan Umum"
 *   "dpdu" -> "Divisi Pengadaan dan Umum"
 *   "Divisi Pengadaan dan Umum" -> "Divisi Pengadaan dan Umum"
 *   "PENGADAAN DAN UMUM" -> "Divisi Pengadaan dan Umum"
 *   "DSPN" -> "Divisi Sekretariat Perusahaan"
 *   "SEKPER" -> "Divisi Sekretariat Perusahaan"
 */
export function normalizeDivisiName(raw: string | null | undefined): string {
  if (!raw) return '';
  const clean = raw.trim();
  if (!clean || clean === '-' || clean === '0') return '';

  const lower = clean.toLowerCase();

  // 1. Cek kecocokan kode langsung (misal: "DPDU", "dpdu")
  const byKode = MASTER_DIVISI_LIST.find((item) => item.kode.toLowerCase() === lower);
  if (byKode) return byKode.nama;

  // 2. Cek kecocokan kode dengan awalan/akhiran (misal: "DPDU - Divisi Pengadaan")
  for (const item of MASTER_DIVISI_LIST) {
    if (lower.startsWith(item.kode.toLowerCase()) || lower.includes(item.kode.toLowerCase())) {
      // Pastikan bukan kata biasa yang kebetulan mengandung substring
      const tokenRegex = new RegExp(`(^|[^a-z0-9])${item.kode.toLowerCase()}([^a-z0-9]|$)`, 'i');
      if (tokenRegex.test(lower)) {
        return item.nama;
      }
    }
  }

  // 3. Cek kecocokan nama resmi atau aliases
  for (const item of MASTER_DIVISI_LIST) {
    if (item.nama.toLowerCase() === lower) return item.nama;
    if (item.aliases.some((alias) => alias.toLowerCase() === lower)) {
      return item.nama;
    }
  }

  // 4. Cek partial inclusion yang kuat pada aliases
  for (const item of MASTER_DIVISI_LIST) {
    for (const alias of item.aliases) {
      if (alias.length >= 5 && (lower.includes(alias) || alias.includes(lower))) {
        return item.nama;
      }
    }
  }

  // Jika divisi non-holding khusus (misal: "Dewan Komite", "Direksi", "Magang"), kembalikan bentuk rapi
  return clean;
}

/**
 * Mencari item master divisi berdasarkan kode, nama, atau alias.
 */
export function findMasterDivisi(raw: string | null | undefined): MasterDivisiItem | null {
  if (!raw) return null;
  const normName = normalizeDivisiName(raw);
  if (!normName) return null;
  return MASTER_DIVISI_LIST.find((item) => item.nama.toLowerCase() === normName.toLowerCase()) || null;
}

/**
 * Mengecek apakah dua string divisi merujuk pada divisi yang sama
 * Contoh: isSameDivisi("DPDU", "Divisi Pengadaan dan Umum") -> true
 */
export function isSameDivisi(div1: string | null | undefined, div2: string | null | undefined): boolean {
  if (!div1 && !div2) return true;
  if (!div1 || !div2) return false;
  const n1 = normalizeDivisiName(div1).toLowerCase();
  const n2 = normalizeDivisiName(div2).toLowerCase();
  if (!n1 || !n2) return div1.trim().toLowerCase() === div2.trim().toLowerCase();
  return n1 === n2;
}
