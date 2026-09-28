// src/lib/exportDashboardExcel.ts
// Modul Generator Ekspor Excel Dashboard Admin & Masing-masing Grafik
// Menghasilkan berkas .xlsx DALAM 1 SHEET SAJA:
// Berisi Kop Resmi, Ringkasan Metrik, Gambar Visual Grafik Asli (HD PNG), dan Tabel Data Pasien Lengkap.

import ExcelJS from 'exceljs';
import { McuRecord, MiniMcuRecord } from '@/types/mcu';
import { normalizeDivisiName } from '@/lib/divisiMaster';
import {
  renderClusteredBarChartPng,
  renderDualDonutChartPng,
  renderHorizontalBarChartPng,
  renderExcelStylePieDonutChartPng,
  renderDivisiColumnChartPng,
  ClusteredBarItem,
  DonutSlice,
} from '@/lib/chartCanvasRenderer';
import {
  getRecordFitnessStatus,
  getTensiStatus,
  getKolesterolStatus,
  getGulaDarahStatus,
  getBmiStatus,
  matchDivisi,
} from '@/lib/mcuHelpers';

const INDO_MONTHS: Record<string, string> = {
  '01': 'Januari',
  '02': 'Februari',
  '03': 'Maret',
  '04': 'April',
  '05': 'Mei',
  '06': 'Juni',
  '07': 'Juli',
  '08': 'Agustus',
  '09': 'September',
  '10': 'Oktober',
  '11': 'November',
  '12': 'Desember',
};

function formatMonthYearLabel(ym: string): string {
  if (!ym || ym === 'all') return 'Semua Periode';
  if (ym === 'current') return 'Bulan Ini (September 2026)';
  const parts = ym.split('-');
  if (parts.length === 2) {
    const m = INDO_MONTHS[parts[1]] || parts[1];
    return `${m} ${parts[0]}`;
  }
  return ym;
}

function matchEntity(departemen?: string | null, targetEntity: string = 'all'): boolean {
  if (!targetEntity || targetEntity === 'all') return true;
  if (!departemen) return false;
  const d = departemen.toLowerCase().trim();
  const t = targetEntity.toLowerCase().trim();
  if (t === 'ptpn 1' || t === 'ptpn1' || t === 'suppco') return d.includes('ptpn 1') || d.includes('ptpn1') || d.includes('suppco') || d === '1' || d === 'i';
  if (t === 'ptpn 3' || t === 'ptpn3' || t === 'holding') return d.includes('ptpn 3') || d.includes('ptpn3') || d.includes('holding') || d === '3' || d === 'iii';
  if (t === 'ptpn 4' || t === 'ptpn4' || t === 'palmco') return d.includes('ptpn 4') || d.includes('ptpn4') || d.includes('palmco') || d === '4' || d === 'iv';
  return d === t || d.includes(t);
}

// Format filter tanggal bulan
function checkRecordMonth(tgl: string | undefined, selectedBulan: string): boolean {
  if (!selectedBulan || selectedBulan === 'all') return true;
  if (!tgl) return false;
  if (selectedBulan === 'current') {
    return tgl.startsWith('2026-09') || tgl.includes('2026-09');
  }
  return tgl.includes(selectedBulan);
}

// Download trigger di browser
function triggerExcelDownload(buffer: ExcelJS.Buffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Helper styling border
const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

const headerBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'medium', color: { argb: 'FF004022' } },
  bottom: { style: 'medium', color: { argb: 'FF004022' } },
  left: { style: 'thin', color: { argb: 'FF004022' } },
  right: { style: 'thin', color: { argb: 'FF004022' } },
};

export interface UnifiedPatientRow {
  no: number;
  tanggal: string;
  nik: string;
  nama: string;
  departemen: string;
  divisi: string;
  usia: number | string;
  gender: string;
  kategori: string;
  statusKebugaran: string;
  tensi: string;
  kategoriTensi: string;
  gulaDarah: string;
  kolesterol: string;
  bmi: string;
  kategoriBmi: string;
  diagnosa: string;
  keluhan: string;
  anjuran: string;
}

// Render data pasien ke dalam worksheet pada baris tertentu
function appendPatientDataTable(
  ws: ExcelJS.Worksheet,
  startRow: number,
  rows: UnifiedPatientRow[],
  subTitle: string
): number {
  let currentRow = startRow;

  // Header Sub-Section Data Detail
  ws.mergeCells(currentRow, 1, currentRow, 19);
  const titleCell = ws.getCell(currentRow, 1);
  titleCell.value = `TABEL DATA PASIEN & REKAM MEDIS: ${subTitle.toUpperCase()}`;
  titleCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005930' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(currentRow).height = 24;
  currentRow++;

  // Header Kolom Tabel Pasien
  const headers = [
    'No',
    'Tanggal',
    'NIK',
    'Nama Karyawan',
    'Entitas',
    'Divisi',
    'Usia',
    'Gender',
    'Layanan',
    'Status Kebugaran',
    'Tensi (mmHg)',
    'Kategori Tensi',
    'Gula Darah (mg/dL)',
    'Kolesterol (mg/dL)',
    'BMI',
    'Status Gizi',
    'Diagnosa Dokter',
    'Keluhan Pasien',
    'Anjuran / Saran Dokter',
  ];

  const headerRow = ws.getRow(currentRow);
  headerRow.values = headers;
  headerRow.height = 24;

  headers.forEach((_, colIdx) => {
    const cell = headerRow.getCell(colIdx + 1);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = headerBorder;
  });
  currentRow++;

  if (rows.length === 0) {
    ws.mergeCells(currentRow, 1, currentRow, 19);
    const emptyCell = ws.getCell(currentRow, 1);
    emptyCell.value = 'Tidak ada data pasien yang sesuai dengan filter periode dan kriteria yang dipilih.';
    emptyCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(currentRow).height = 24;
    return currentRow + 2;
  }

  rows.forEach((r, idx) => {
    const row = ws.getRow(currentRow);
    row.values = [
      r.no,
      r.tanggal,
      r.nik,
      r.nama,
      r.departemen,
      r.divisi,
      r.usia,
      r.gender,
      r.kategori,
      r.statusKebugaran,
      r.tensi,
      r.kategoriTensi,
      r.gulaDarah,
      r.kolesterol,
      r.bmi,
      r.kategoriBmi,
      r.diagnosa,
      r.keluhan,
      r.anjuran,
    ];
    row.height = 20;
    const isZebra = idx % 2 === 1;

    for (let c = 1; c <= 19; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 9.5 };
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      cell.border = thinBorder;

      // Status kebugaran color indicator
      if (c === 10) {
        const val = String(cell.value || '').toLowerCase();
        if (val.includes('sehat') || val === 'fit for duty') {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF047857' } };
        } else if (val.includes('catatan')) {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
        } else if (val.includes('tidak') || val.includes('unfit')) {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFBE123C' } };
        }
      }

      // Alignments
      if (c === 3 || c === 4 || c === 6 || c === 17 || c === 18 || c === 19) {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
    currentRow++;
  });

  return currentRow + 1;
}

// Konversi McuRecord & MiniMcuRecord ke baris data pasien terpadu
function mapRecordsToUnifiedRows(
  mcuList: McuRecord[],
  miniList: MiniMcuRecord[]
): UnifiedPatientRow[] {
  const result: UnifiedPatientRow[] = [];
  let counter = 1;

  mcuList.forEach((r) => {
    const tensiVal = r.vitals?.tensi || r.tensi || '-';
    const tensiStatus = getTensiStatus(r);
    const kolVal = r.vitals?.kolesterol || r.kolesterol || '-';
    const kolStatus = getKolesterolStatus(r);
    const gulaVal = r.vitals?.gula_darah || r.gula_darah || '-';
    const gulaStatus = getGulaDarahStatus(r);
    const bmiVal = r.vitals?.bmi || r.bmi || '-';
    const bmiStatus = getBmiStatus(r);
    const fitness = getRecordFitnessStatus(r);

    let fitLabel = 'Fit for Duty';
    if (fitness === 'fit_dengan_catatan') fitLabel = 'Fit dengan Catatan';
    else if (fitness === 'sementara_tidak_fit') fitLabel = 'Sementara Tidak Fit';

    result.push({
      no: counter++,
      tanggal: r.tanggal_pemeriksaan || '-',
      nik: r.nik || '-',
      nama: r.nama_lengkap || r.nama_karyawan || '-',
      departemen: r.departemen || (r as any).entitas || 'PTPN 3',
      divisi: r.divisi || '-',
      usia: r.umur || '-',
      gender: r.jenis_kelamin || '-',
      kategori: 'MCU Berkala',
      statusKebugaran: fitLabel,
      tensi: tensiVal,
      kategoriTensi:
        tensiStatus === 'normal'
          ? 'Normal'
          : tensiStatus === 'pra_hipertensi'
          ? 'Pra-Hipertensi'
          : tensiStatus === 'hipertensi'
          ? 'Hipertensi'
          : '-',
      gulaDarah: gulaVal !== '-' ? `${gulaVal}` : '-',
      kolesterol: kolVal !== '-' ? `${kolVal}` : '-',
      bmi: bmiVal !== '-' ? `${bmiVal}` : '-',
      kategoriBmi:
        bmiStatus === 'normal'
          ? 'Normal'
          : bmiStatus === 'underweight'
          ? 'Kurus'
          : bmiStatus === 'overweight'
          ? 'Kelebihan BB'
          : bmiStatus === 'obesitas'
          ? 'Obesitas'
          : '-',
      diagnosa: r.diagnosa || r.keluhan || '-',
      keluhan: r.keluhan || '-',
      anjuran: (r as any).rekomendasi || (r as any).catatan || r.kesimpulan || '-',
    });
  });

  miniList.forEach((r) => {
    const tensiVal = (r as any).tensi || '-';
    const gulaVal = (r as any).gula_darah || '-';
    const kolVal = (r as any).kolesterol || '-';
    const fit = String(r.status_kebugaran || (r as any).kesimpulan || '').toLowerCase();
    let fitLabel = 'Fit Sehat';
    if (fit.includes('catatan')) fitLabel = 'Fit dengan Catatan';
    else if (fit.includes('tidak') || fit.includes('unfit')) fitLabel = 'Sementara Tidak Fit';

    result.push({
      no: counter++,
      tanggal: r.tanggal_pemeriksaan || (r as any).tanggal_kunjungan || '-',
      nik: r.nik || '-',
      nama: r.nama_lengkap || r.nama_karyawan || '-',
      departemen: r.departemen || (r as any).entitas || 'PTPN 3',
      divisi: r.divisi || '-',
      usia: r.umur || '-',
      gender: r.jenis_kelamin || '-',
      kategori: 'Inhouse Clinic',
      statusKebugaran: fitLabel,
      tensi: tensiVal,
      kategoriTensi: '-',
      gulaDarah: gulaVal !== '-' ? `${gulaVal}` : '-',
      kolesterol: kolVal !== '-' ? `${kolVal}` : '-',
      bmi: '-',
      kategoriBmi: '-',
      diagnosa: r.diagnosa || r.keluhan || '-',
      keluhan: r.keluhan || '-',
      anjuran: (r as any).terapi || (r as any).rekomendasi || '-',
    });
  });

  return result;
}

// =========================================================================
// 1. EKSPOR GRAFIK TERTENTU BESERTA DATANYA DALAM 1 SHEET SAJA
// =========================================================================

export interface ExportSingleChartParams {
  chartType:
    | 'entitas'
    | 'divisi'
    | 'mcu_vs_klinik'
    | 'status_kebugaran'
    | 'penyakit'
    | 'usia'
    | 'tensi'
    | 'kolesterol'
    | 'gula_darah'
    | 'bmi';
  mcuRecords: McuRecord[];
  miniMcuRecords: MiniMcuRecord[];
  selectedBulan?: string;
  searchTerm?: string;
  filterKategoriEntitas?: string;
  filterEntitasDivisi?: string;
  filterLimitDivisi?: string;
  filterEntitasMcuType?: string;
  filterDivisiMcuType?: string;
  filterEntitasStatusFit?: string;
  filterDivisiStatusFit?: string;
  filterEntitasDiag?: string;
  filterLimitDiag?: string;
  searchNamaDiag?: string;
  filterEntitasUmur?: string;
  filterDivisiUmur?: string;
  filterEntitasTensi?: string;
  filterEntitasKolesterol?: string;
  filterEntitasGula?: string;
  filterEntitasBmi?: string;
}

export async function exportSingleChartExcel({
  chartType,
  mcuRecords,
  miniMcuRecords,
  selectedBulan = 'all',
  searchTerm = '',
  filterKategoriEntitas = 'mcu',
  filterEntitasDivisi = 'all',
  filterEntitasMcuType = 'all',
  filterDivisiMcuType = 'all',
  filterEntitasStatusFit = 'all',
  filterEntitasDiag = 'all',
  searchNamaDiag = '',
  filterEntitasUmur = 'all',
  filterDivisiUmur = 'all',
  filterEntitasTensi = 'all',
  filterEntitasKolesterol = 'all',
  filterEntitasGula = 'all',
  filterEntitasBmi = 'all',
}: ExportSingleChartParams): Promise<void> {
  // 1. Filter Data Pasien sesuai bulan dan pencarian global
  const filteredMcu = mcuRecords.filter((r) => {
    const nama = r.nama_lengkap || r.nama_karyawan || '';
    const nik = r.nik || '';
    const matchSearch =
      !searchTerm.trim() ||
      nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nik.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMonth = checkRecordMonth(r.tanggal_pemeriksaan, selectedBulan);
    return matchSearch && matchMonth;
  });

  const filteredMini = miniMcuRecords.filter((r) => {
    const nama = r.nama_lengkap || r.nama_karyawan || '';
    const nik = r.nik || '';
    const matchSearch =
      !searchTerm.trim() ||
      nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nik.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMonth = checkRecordMonth(
      r.tanggal_pemeriksaan || (r as any).tanggal_kunjungan,
      selectedBulan
    );
    return matchSearch && matchMonth;
  });

  const periodeLabel = formatMonthYearLabel(selectedBulan);
  const now = new Date();
  const tanggalUnduh = `${now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OneHealth MCU PTPN - Health Analytics Portal';
  workbook.created = now;

  // HANYA 1 SHEET SAJA
  const ws = workbook.addWorksheet('Laporan & Grafik MCU');
  ws.views = [{ showGridLines: true }];

  // Column widths
  ws.columns = [
    { key: 'c1', width: 6 },   // No
    { key: 'c2', width: 14 },  // Tanggal
    { key: 'c3', width: 16 },  // NIK
    { key: 'c4', width: 26 },  // Nama
    { key: 'c5', width: 16 },  // Entitas
    { key: 'c6', width: 24 },  // Divisi
    { key: 'c7', width: 8 },   // Usia
    { key: 'c8', width: 12 },  // Gender
    { key: 'c9', width: 16 },  // Layanan
    { key: 'c10', width: 22 }, // Status Kebugaran
    { key: 'c11', width: 14 }, // Tensi
    { key: 'c12', width: 18 }, // Kat Tensi
    { key: 'c13', width: 18 }, // Gula Darah
    { key: 'c14', width: 18 }, // Kolesterol
    { key: 'c15', width: 10 }, // BMI
    { key: 'c16', width: 16 }, // Status Gizi
    { key: 'c17', width: 28 }, // Diagnosa
    { key: 'c18', width: 24 }, // Keluhan
    { key: 'c19', width: 32 }, // Anjuran
  ];

  // Identitas & Konfigurasi Chart berdasarkan chartType
  let chartTitle = '';
  let chartSubtitle = '';
  let filenamePrefix = '';
  let base64Png = '';
  let tableHeaders: string[] = [];
  let tableRows: { label: string; val1: any; val2?: any; val3?: any }[] = [];
  let totalRow: { label: string; val1: any; val2?: any; val3?: any } = { label: 'TOTAL', val1: 0 };
  let relevantPatientRows: UnifiedPatientRow[] = [];

  // =========================================================================
  // LOGIKA MASING-MASING TIPE GRAFIK
  // =========================================================================

  if (chartType === 'entitas') {
    chartTitle = 'JUMLAH KARYAWAN ATAS HASIL MCU (PER ENTITAS)';
    chartSubtitle = 'Distribusi data karyawan per entitas holding & anak perusahaan (PTPN 1, PTPN 3, PTPN 4)';
    filenamePrefix = 'Ekspor_MCU_Entitas';

    const entities = [
      { code: 'PTPN 1', label: 'PTPN 1 / SuppCo', targetDefault: 300 },
      { code: 'PTPN 3', label: 'PTPN 3 / Holding', targetDefault: 283 },
      { code: 'PTPN 4', label: 'PTPN 4 / PalmCo', targetDefault: 300 },
    ];

    const dataEntitas = entities.map((ent) => {
      let mcuCount = filteredMcu.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent.code)).length;
      let klinikCount = filteredMini.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent.code)).length;
      let val = filterKategoriEntitas === 'klinik' ? klinikCount : filterKategoriEntitas === 'all' ? mcuCount + klinikCount : mcuCount;
      let target = Math.max(val, ent.targetDefault);
      let pct = target > 0 ? Math.round((val / target) * 100) : 0;
      return {
        name: ent.code,
        label: ent.label,
        target,
        realisasi: val,
        pct,
      };
    });

    tableHeaders = ['Entitas Perusahaan', 'Target Personel', 'Realisasi Pemeriksaan', 'Partisipasi'];
    tableRows = dataEntitas.map((d) => ({
      label: d.label,
      val1: d.target,
      val2: d.realisasi,
      val3: `${d.pct}%`,
    }));

    const totTarget = dataEntitas.reduce((acc, d) => acc + d.target, 0);
    const totReal = dataEntitas.reduce((acc, d) => acc + d.realisasi, 0);
    totalRow = {
      label: 'TOTAL SELURUH ENTITAS',
      val1: totTarget,
      val2: totReal,
      val3: `${totTarget > 0 ? Math.round((totReal / totTarget) * 100) : 0}%`,
    };

    const clusteredBarItems: ClusteredBarItem[] = dataEntitas.map((d) => ({
      category: d.name,
      series1Val: d.target,
      series2Val: d.realisasi,
    }));
    base64Png = renderClusteredBarChartPng(clusteredBarItems, 'Target Personel', 'Sudah Melaksanakan MCU', 'Jumlah Karyawan Atas Hasil MCU');

    // Data Pasien Terkait
    const datasetMcu = filterKategoriEntitas === 'klinik' ? [] : filteredMcu;
    const datasetMini = filterKategoriEntitas === 'mcu' ? [] : filteredMini;
    relevantPatientRows = mapRecordsToUnifiedRows(datasetMcu, datasetMini);

  } else if (chartType === 'divisi') {
    chartTitle = 'PARTISIPASI & DISTRIBUSI KARYAWAN PER DIVISI';
    chartSubtitle = `Peringkat unit kerja/divisi berdasarkan MCU (Filter Entitas: ${filterEntitasDivisi})`;
    filenamePrefix = 'Ekspor_MCU_Divisi';

    const divRecords = filteredMcu.filter((r) => matchEntity(r.departemen || (r as any).entitas, filterEntitasDivisi));
    const divisiMap: Record<string, number> = {};

    divRecords.forEach((r) => {
      let rawDiv = (r.divisi || '').trim();
      if (!rawDiv || rawDiv === '-' || rawDiv === '0') rawDiv = 'Belum Ditentukan';
      const divName = normalizeDivisiName(rawDiv);
      divisiMap[divName] = (divisiMap[divName] || 0) + 1;
    });

    const sortedDivisi = Object.entries(divisiMap)
      .map(([divisi, count]) => ({
        divisi,
        target: Math.max(count, Math.round(count * 1.15)),
        sudahMcu: count,
        pct: Math.round((count / Math.max(count, Math.round(count * 1.15))) * 100),
      }))
      .sort((a, b) => b.sudahMcu - a.sudahMcu);

    tableHeaders = ['Nama Divisi / Unit Kerja', 'Estimasi Target', 'Sudah MCU', 'Partisipasi'];
    tableRows = sortedDivisi.slice(0, 20).map((d) => ({
      label: d.divisi,
      val1: d.target,
      val2: d.sudahMcu,
      val3: `${d.pct}%`,
    }));

    const totDivSudah = sortedDivisi.reduce((acc, d) => acc + d.sudahMcu, 0);
    const totDivTarget = sortedDivisi.reduce((acc, d) => acc + d.target, 0);
    totalRow = {
      label: 'TOTAL SELURUH DIVISI',
      val1: totDivTarget,
      val2: totDivSudah,
      val3: '100%',
    };

    const totalDivCount = sortedDivisi.length;
    const topDivName = sortedDivisi[0]?.divisi || '-';
    const avgPerDiv = totalDivCount > 0 ? Math.round(totDivSudah / totalDivCount) : 0;

    base64Png = renderDivisiColumnChartPng(
      sortedDivisi.slice(0, 15).map((d) => ({
        divisi: d.divisi,
        sudahMcu: d.sudahMcu,
        belumMcu: Math.max(0, d.target - d.sudahMcu),
      })),
      totalDivCount,
      totDivSudah,
      topDivName,
      avgPerDiv
    );

    relevantPatientRows = mapRecordsToUnifiedRows(divRecords, []);

  } else if (chartType === 'mcu_vs_klinik') {
    chartTitle = 'PERBANDINGAN MCU BERKALA VS INHOUSE CLINIC';
    chartSubtitle = 'Perbandingan peserta MCU karyawan unik vs akumulasi kunjungan rawat jalan klinik';
    filenamePrefix = 'Ekspor_MCU_vs_Klinik';

    const mcuFiltered = filteredMcu.filter((r) => {
      const matchEnt = matchEntity(r.departemen || (r as any).entitas, filterEntitasMcuType);
      const matchDiv = filterDivisiMcuType === 'all' || matchDivisi(r.divisi, filterDivisiMcuType);
      return matchEnt && matchDiv;
    });

    const miniFiltered = filteredMini.filter((r) => {
      const matchEnt = matchEntity(r.departemen || (r as any).entitas, filterEntitasMcuType);
      const matchDiv = filterDivisiMcuType === 'all' || matchDivisi(r.divisi, filterDivisiMcuType);
      return matchEnt && matchDiv;
    });

    const totMcu = mcuFiltered.length;
    const totKlinik = miniFiltered.length;
    const totalSemua = totMcu + totKlinik || 1;

    tableHeaders = ['Kategori Pemeriksaan', 'Total Jumlah', 'Proporsi (%)'];
    tableRows = [
      { label: 'MCU Berkala (Pemeriksaan Karyawan)', val1: totMcu, val2: `${Math.round((totMcu / totalSemua) * 100)}%` },
      { label: 'Inhouse Clinic (Kunjungan Pasien)', val1: totKlinik, val2: `${Math.round((totKlinik / totalSemua) * 100)}%` },
    ];
    totalRow = {
      label: 'TOTAL AKUMULASI LAYANAN',
      val1: totMcu + totKlinik,
      val2: '100%',
    };

    const slices: DonutSlice[] = [
      { name: 'MCU Berkala', value: totMcu, color: '#0284c7' },
      { name: 'Inhouse Clinic', value: totKlinik, color: '#10b981' },
    ];
    base64Png = renderExcelStylePieDonutChartPng('Perbandingan MCU Berkala vs Inhouse Clinic', slices);

    relevantPatientRows = mapRecordsToUnifiedRows(mcuFiltered, miniFiltered);

  } else if (chartType === 'status_kebugaran') {
    chartTitle = 'DISTRIBUSI STATUS KEBUGARAN (FITNESS STATUS)';
    chartSubtitle = 'Klasifikasi kelaikan kerja: Fit for Duty, Fit dengan Catatan, dan Sementara Tidak Fit';
    filenamePrefix = 'Ekspor_Status_Kebugaran';

    const mcuFiltered = filteredMcu.filter((r) => matchEntity(r.departemen || (r as any).entitas, filterEntitasStatusFit));
    let fitSehat = 0, fitCatatan = 0, tidakFit = 0;

    mcuFiltered.forEach((r) => {
      const s = getRecordFitnessStatus(r);
      if (s === 'fit_sehat') fitSehat++;
      else if (s === 'fit_dengan_catatan') fitCatatan++;
      else tidakFit++;
    });

    const total = fitSehat + fitCatatan + tidakFit || 1;

    tableHeaders = ['Status Kebugaran / Kelaikan', 'Jumlah Karyawan', 'Persentase'];
    tableRows = [
      { label: 'Fit for Duty (Sehat Laik Kerja)', val1: fitSehat, val2: `${Math.round((fitSehat / total) * 100)}%` },
      { label: 'Fit dengan Catatan (Butuh Pemantauan)', val1: fitCatatan, val2: `${Math.round((fitCatatan / total) * 100)}%` },
      { label: 'Sementara Tidak Fit (Memerlukan Terapi)', val1: tidakFit, val2: `${Math.round((tidakFit / total) * 100)}%` },
    ];
    totalRow = {
      label: 'TOTAL SELURUH KARYAWAN',
      val1: mcuFiltered.length,
      val2: '100%',
    };

    const slices: DonutSlice[] = [
      { name: 'Fit for Duty', value: fitSehat, color: '#10b981' },
      { name: 'Fit dg Catatan', value: fitCatatan, color: '#f59e0b' },
      { name: 'Tidak Fit', value: tidakFit, color: '#ef4444' },
    ];
    base64Png = renderExcelStylePieDonutChartPng('Distribusi Status Kebugaran MCU', slices);

    relevantPatientRows = mapRecordsToUnifiedRows(mcuFiltered, []);

  } else if (chartType === 'penyakit') {
    chartTitle = 'POLA DIAGNOSA & PENYAKIT TERBANYAK';
    chartSubtitle = `Daftar temuan penyakit hasil skrining kesehatan (Filter Entitas: ${filterEntitasDiag})`;
    filenamePrefix = 'Ekspor_Diagnosa_Penyakit';

    const mcuFiltered = filteredMcu.filter((r) => matchEntity(r.departemen || (r as any).entitas, filterEntitasDiag));
    const diagCount: Record<string, number> = {};

    mcuFiltered.forEach((r) => {
      const rawDiag = r.diagnosa || r.keluhan || '';
      if (!rawDiag || rawDiag === '-' || rawDiag.toLowerCase().includes('sehat')) return;
      const parts = rawDiag.split(/[,;/+]/).map((p) => p.trim()).filter(Boolean);
      parts.forEach((p) => {
        if (searchNamaDiag && !p.toLowerCase().includes(searchNamaDiag.toLowerCase())) return;
        diagCount[p] = (diagCount[p] || 0) + 1;
      });
    });

    const sortedDiag = Object.entries(diagCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const totalKasus = sortedDiag.reduce((acc, d) => acc + d.count, 0) || 1;

    tableHeaders = ['Nama Diagnosa / Penyakit', 'Jumlah Kasus', 'Proporsi Temuan'];
    tableRows = sortedDiag.map((d) => ({
      label: d.name,
      val1: d.count,
      val2: `${Math.round((d.count / totalKasus) * 100)}%`,
    }));
    totalRow = {
      label: 'TOTAL TEMUAN KASUS TERATAS',
      val1: totalKasus,
      val2: '100%',
    };

    base64Png = renderHorizontalBarChartPng(
      '10 Temuan Diagnosa Penyakit Terbanyak',
      sortedDiag.slice(0, 10).map((d) => ({ label: d.name, value: d.count })),
      '#ef4444'
    );

    relevantPatientRows = mapRecordsToUnifiedRows(mcuFiltered, []);

  } else if (chartType === 'usia') {
    chartTitle = 'DISTRIBUSI KELOMPOK USIA KARYAWAN (DEMOGRAFI UMUR)';
    chartSubtitle = `Rentang usia peserta MCU (<25, 25-35, 36-45, 46-55, >55 thn) - Entitas: ${filterEntitasUmur}`;
    filenamePrefix = 'Ekspor_Kelompok_Usia';

    const mcuFiltered = filteredMcu.filter((r) => {
      const matchEnt = matchEntity(r.departemen || (r as any).entitas, filterEntitasUmur);
      const matchDiv = filterDivisiUmur === 'all' || matchDivisi(r.divisi, filterDivisiUmur);
      return matchEnt && matchDiv;
    });

    const brackets: Record<string, number> = {
      '< 25 thn': 0,
      '25 - 35 thn': 0,
      '36 - 45 thn': 0,
      '46 - 55 thn': 0,
      '> 55 thn': 0,
    };

    mcuFiltered.forEach((r) => {
      const u = Number(r.umur);
      if (isNaN(u) || u <= 0) return;
      if (u < 25) brackets['< 25 thn']++;
      else if (u <= 35) brackets['25 - 35 thn']++;
      else if (u <= 45) brackets['36 - 45 thn']++;
      else if (u <= 55) brackets['46 - 55 thn']++;
      else brackets['> 55 thn']++;
    });

    const totalKaryawan = mcuFiltered.length || 1;

    tableHeaders = ['Kelompok Rentang Usia', 'Jumlah Karyawan', 'Persentase'];
    tableRows = Object.entries(brackets).map(([k, v]) => ({
      label: k,
      val1: v,
      val2: `${Math.round((v / totalKaryawan) * 100)}%`,
    }));
    totalRow = {
      label: 'TOTAL SELURUH KARYAWAN',
      val1: mcuFiltered.length,
      val2: '100%',
    };

    base64Png = renderHorizontalBarChartPng(
      'Distribusi Usia Karyawan Peserta MCU',
      Object.entries(brackets).map(([label, value]) => ({ label, value })),
      '#8b5cf6'
    );

    relevantPatientRows = mapRecordsToUnifiedRows(mcuFiltered, []);

  } else if (chartType === 'tensi') {
    chartTitle = 'SKRINING TEKANAN DARAH (BLOOD PRESSURE & HIPERTENSI)';
    chartSubtitle = `Klasifikasi JNC VII (Normal, Pra-Hipertensi, Hipertensi) - Entitas: ${filterEntitasTensi}`;
    filenamePrefix = 'Ekspor_Tekanan_Darah';

    const mcuFiltered = filteredMcu.filter((r) => matchEntity(r.departemen || (r as any).entitas, filterEntitasTensi));
    let tNorm = 0, tPre = 0, tHip = 0;

    mcuFiltered.forEach((r) => {
      const st = getTensiStatus(r);
      if (st === 'normal') tNorm++;
      else if (st === 'pra_hipertensi') tPre++;
      else if (st === 'hipertensi') tHip++;
    });

    const total = tNorm + tPre + tHip || 1;

    tableHeaders = ['Klasifikasi Tekanan Darah', 'Kriteria Klinis', 'Jumlah', 'Persentase'];
    tableRows = [
      { label: 'Normal', val1: '< 120/80 mmHg', val2: tNorm, val3: `${Math.round((tNorm / total) * 100)}%` },
      { label: 'Pra-Hipertensi', val1: '120-139 / 80-89 mmHg', val2: tPre, val3: `${Math.round((tPre / total) * 100)}%` },
      { label: 'Hipertensi', val1: '≥ 140 / ≥ 90 mmHg', val2: tHip, val3: `${Math.round((tHip / total) * 100)}%` },
    ];
    totalRow = {
      label: 'TOTAL PEMERIKSAAN TENSI',
      val1: '-',
      val2: mcuFiltered.length,
      val3: '100%',
    };

    const slices: DonutSlice[] = [
      { name: 'Normal', value: tNorm, color: '#10b981' },
      { name: 'Pra-Hipertensi', value: tPre, color: '#f59e0b' },
      { name: 'Hipertensi', value: tHip, color: '#ef4444' },
    ];
    base64Png = renderExcelStylePieDonutChartPng('Skrining Tekanan Darah Karyawan', slices);

    relevantPatientRows = mapRecordsToUnifiedRows(mcuFiltered, []);

  } else if (chartType === 'kolesterol') {
    chartTitle = 'SKRINING PROFIL LIPID (TOTAL CHOLESTEROL)';
    chartSubtitle = `Klasifikasi NCEP ATP III (Normal <200, Batas Tinggi 200-239, Tinggi >=240) - Entitas: ${filterEntitasKolesterol}`;
    filenamePrefix = 'Ekspor_Kolesterol_Total';

    const mcuFiltered = filteredMcu.filter((r) => matchEntity(r.departemen || (r as any).entitas, filterEntitasKolesterol));
    let cNorm = 0, cPre = 0, cHigh = 0;

    mcuFiltered.forEach((r) => {
      const k = Number(r.vitals?.kolesterol || r.kolesterol || 0);
      if (isNaN(k) || k <= 0) return;
      if (k >= 240) cHigh++;
      else if (k >= 200) cPre++;
      else cNorm++;
    });

    const total = cNorm + cPre + cHigh || 1;

    tableHeaders = ['Kategori Kolesterol', 'Kadar Ambang', 'Jumlah', 'Persentase'];
    tableRows = [
      { label: 'Normal', val1: '< 200 mg/dL', val2: cNorm, val3: `${Math.round((cNorm / total) * 100)}%` },
      { label: 'Batas Tinggi / Sedang', val1: '200 - 239 mg/dL', val2: cPre, val3: `${Math.round((cPre / total) * 100)}%` },
      { label: 'Tinggi (Hiperkolesterolemia)', val1: '≥ 240 mg/dL', val2: cHigh, val3: `${Math.round((cHigh / total) * 100)}%` },
    ];
    totalRow = {
      label: 'TOTAL PEMERIKSAAN KOLESTEROL',
      val1: '-',
      val2: mcuFiltered.length,
      val3: '100%',
    };

    const slices: DonutSlice[] = [
      { name: 'Normal (<200)', value: cNorm, color: '#10b981' },
      { name: 'Batas Tinggi (200-239)', value: cPre, color: '#f59e0b' },
      { name: 'Tinggi (≥240)', value: cHigh, color: '#ef4444' },
    ];
    base64Png = renderExcelStylePieDonutChartPng('Skrining Profil Kolesterol Total', slices);

    relevantPatientRows = mapRecordsToUnifiedRows(mcuFiltered, []);

  } else if (chartType === 'gula_darah') {
    chartTitle = 'SKRINING KADAR GLUKOSA DARAH (BLOOD GLUCOSE)';
    chartSubtitle = `Klasifikasi ADA (Normal <100, Prediabetes 100-125, Diabetes >=126 mg/dL) - Entitas: ${filterEntitasGula}`;
    filenamePrefix = 'Ekspor_Gula_Darah';

    const mcuFiltered = filteredMcu.filter((r) => matchEntity(r.departemen || (r as any).entitas, filterEntitasGula));
    let gNorm = 0, gPre = 0, gDm = 0;

    mcuFiltered.forEach((r) => {
      const st = getGulaDarahStatus(r);
      if (st === 'normal') gNorm++;
      else if (st === 'pre_diabetes') gPre++;
      else if (st === 'diabetes') gDm++;
    });

    const total = gNorm + gPre + gDm || 1;

    tableHeaders = ['Kategori Glukosa Darah', 'Nilai Rujukan', 'Jumlah', 'Persentase'];
    tableRows = [
      { label: 'Normal', val1: '< 100 mg/dL', val2: gNorm, val3: `${Math.round((gNorm / total) * 100)}%` },
      { label: 'Prediabetes', val1: '100 - 125 mg/dL', val2: gPre, val3: `${Math.round((gPre / total) * 100)}%` },
      { label: 'Diabetes Melitus', val1: '≥ 126 mg/dL', val2: gDm, val3: `${Math.round((gDm / total) * 100)}%` },
    ];
    totalRow = {
      label: 'TOTAL PEMERIKSAAN GULA DARAH',
      val1: '-',
      val2: mcuFiltered.length,
      val3: '100%',
    };

    const slices: DonutSlice[] = [
      { name: 'Normal (<100)', value: gNorm, color: '#10b981' },
      { name: 'Prediabetes (100-125)', value: gPre, color: '#f59e0b' },
      { name: 'Diabetes (≥126)', value: gDm, color: '#ef4444' },
    ];
    base64Png = renderExcelStylePieDonutChartPng('Skrining Kadar Glukosa Darah', slices);

    relevantPatientRows = mapRecordsToUnifiedRows(mcuFiltered, []);

  } else if (chartType === 'bmi') {
    chartTitle = 'DISTRIBUSI INDEKS MASSA TUBUH (BMI / STATUS GIZI)';
    chartSubtitle = `Klasifikasi WHO Asia-Pasifik (Underweight, Normal, Overweight, Obesitas) - Entitas: ${filterEntitasBmi}`;
    filenamePrefix = 'Ekspor_BMI_Status_Gizi';

    const mcuFiltered = filteredMcu.filter((r) => matchEntity(r.departemen || (r as any).entitas, filterEntitasBmi));
    let bUnder = 0, bNorm = 0, bOver = 0, bObese = 0;

    mcuFiltered.forEach((r) => {
      const st = getBmiStatus(r);
      if (st === 'underweight') bUnder++;
      else if (st === 'normal') bNorm++;
      else if (st === 'overweight') bOver++;
      else if (st === 'obesitas') bObese++;
    });

    const total = bUnder + bNorm + bOver + bObese || 1;

    tableHeaders = ['Klasifikasi Status Gizi', 'Rentang Indeks BMI', 'Jumlah Karyawan', 'Persentase'];
    tableRows = [
      { label: 'Underweight (Kurus)', val1: '< 18.5 kg/m²', val2: bUnder, val3: `${Math.round((bUnder / total) * 100)}%` },
      { label: 'Normal (Ideal)', val1: '18.5 - 24.9 kg/m²', val2: bNorm, val3: `${Math.round((bNorm / total) * 100)}%` },
      { label: 'Overweight (Kelebihan BB)', val1: '25.0 - 26.9 kg/m²', val2: bOver, val3: `${Math.round((bOver / total) * 100)}%` },
      { label: 'Obesitas (Risiko Tinggi)', val1: '≥ 27.0 kg/m²', val2: bObese, val3: `${Math.round((bObese / total) * 100)}%` },
    ];
    totalRow = {
      label: 'TOTAL EVALUASI STATUS GIZI',
      val1: '-',
      val2: mcuFiltered.length,
      val3: '100%',
    };

    const slices: DonutSlice[] = [
      { name: 'Kurus (<18.5)', value: bUnder, color: '#3b82f6' },
      { name: 'Normal (18.5-24.9)', value: bNorm, color: '#10b981' },
      { name: 'Overweight (25-26.9)', value: bOver, color: '#f59e0b' },
      { name: 'Obesitas (≥27)', value: bObese, color: '#ef4444' },
    ];
    base64Png = renderExcelStylePieDonutChartPng('Distribusi Indeks Massa Tubuh (BMI)', slices);

    relevantPatientRows = mapRecordsToUnifiedRows(mcuFiltered, []);
  }

  // =========================================================================
  // SUSUN KONTEN DALAM 1 SHEET: KOP, GRAFIK + TABEL REKAP, LALU DATA PASIEN
  // =========================================================================

  // Baris 1: Logo & Nama Perusahaan
  ws.mergeCells('A1:S1');
  const r1 = ws.getCell('A1');
  r1.value = 'PT PERKEBUNAN NUSANTARA (PTPN) — ONEHEALTH PORTAL';
  r1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF004D25' } };
  r1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 24;

  // Baris 2: Judul Laporan
  ws.mergeCells('A2:S2');
  const r2 = ws.getCell('A2');
  r2.value = `LAPORAN EKSPOR: ${chartTitle}`;
  r2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  r2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 22;

  // Baris 3: Subtitle & Metadata
  ws.mergeCells('A3:S3');
  const r3 = ws.getCell('A3');
  r3.value = `Periode: ${periodeLabel} | ${chartSubtitle} | Waktu Ekspor: ${tanggalUnduh}`;
  r3.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  r3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(3).height = 18;

  // Baris 5-6: Tabel Rekapitulasi Data Indikator Grafik di Kolom A - D (atau E)
  const summaryStartRow = 5;
  const numHeaders = tableHeaders.length;

  // Header Rekap Tabel
  const sumHeaderRow = ws.getRow(summaryStartRow);
  sumHeaderRow.height = 22;
  tableHeaders.forEach((h, idx) => {
    const cell = sumHeaderRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005930' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = headerBorder;
  });

  // Baris Data Rekap Tabel
  let curSumRow = summaryStartRow + 1;
  tableRows.forEach((r, idx) => {
    const row = ws.getRow(curSumRow);
    row.height = 19;
    const isZebra = idx % 2 === 1;

    const cell1 = row.getCell(1);
    cell1.value = r.label;
    cell1.alignment = { horizontal: 'left', vertical: 'middle' };

    const cell2 = row.getCell(2);
    cell2.value = r.val1;
    cell2.alignment = { horizontal: 'center', vertical: 'middle' };

    if (numHeaders >= 3) {
      const cell3 = row.getCell(3);
      cell3.value = r.val2 !== undefined ? r.val2 : '-';
      cell3.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    if (numHeaders >= 4) {
      const cell4 = row.getCell(4);
      cell4.value = r.val3 !== undefined ? r.val3 : '-';
      cell4.alignment = { horizontal: 'center', vertical: 'middle' };
    }

    for (let c = 1; c <= numHeaders; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Calibri', size: 9.5 };
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      cell.border = thinBorder;
    }
    curSumRow++;
  });

  // Baris Total Rekap Tabel
  const totRow = ws.getRow(curSumRow);
  totRow.height = 22;
  totRow.getCell(1).value = totalRow.label;
  totRow.getCell(2).value = totalRow.val1;
  if (numHeaders >= 3) totRow.getCell(3).value = totalRow.val2 !== undefined ? totalRow.val2 : '-';
  if (numHeaders >= 4) totRow.getCell(4).value = totalRow.val3 !== undefined ? totalRow.val3 : '-';

  for (let c = 1; c <= numHeaders; c++) {
    const cell = totRow.getCell(c);
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF004D25' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
    cell.border = headerBorder;
    if (c === 1) cell.alignment = { horizontal: 'left', vertical: 'middle' };
    else cell.alignment = { horizontal: 'center', vertical: 'middle' };
  }
  curSumRow++;

  // Sematkan Gambar Visual Grafik Asli (HD PNG) di Samping Tabel Rekap (Mulai Kolom F)
  if (base64Png) {
    const imageId = workbook.addImage({
      base64: base64Png,
      extension: 'png',
    });

    ws.addImage(imageId, {
      tl: { col: Math.max(numHeaders + 1, 5), row: 4 },
      ext: { width: 560, height: 280 },
      editAs: 'oneCell',
    });
  }

  // Tentukan baris awal untuk Tabel Data Pasien Lengkap (setelah tabel & grafik selesai)
  const patientStartRow = Math.max(curSumRow + 2, 20);

  // Tambahkan Tabel Data Pasien Lengkap di bawahnya dalam Sheet yang SAMA
  appendPatientDataTable(ws, patientStartRow, relevantPatientRows, chartTitle);

  // Generate Buffer & Trigger Download Langsung
  const buffer = await workbook.xlsx.writeBuffer();
  const cleanBulan = selectedBulan === 'all' ? 'Semua_Periode' : selectedBulan === 'current' ? 'September_2026' : selectedBulan;
  const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const finalFilename = `${filenamePrefix}_${cleanBulan}_${timestamp}.xlsx`;

  triggerExcelDownload(buffer, finalFilename);
}

// =========================================================================
// 2. EKSPOR SELURUH DASHBOARD (GLOBAL EKSPOR EXCEL) DALAM 1 SHEET SAJA
// =========================================================================

export interface ExportDashboardExcelParams {
  mcuRecords: McuRecord[];
  miniMcuRecords: MiniMcuRecord[];
  selectedBulan?: string;
  searchTerm?: string;
}

export async function exportDashboardToExcel({
  mcuRecords,
  miniMcuRecords,
  selectedBulan = 'all',
  searchTerm = '',
}: ExportDashboardExcelParams): Promise<void> {
  const filteredMcu = mcuRecords.filter((r) => {
    const nama = r.nama_lengkap || r.nama_karyawan || '';
    const nik = r.nik || '';
    const matchSearch =
      !searchTerm.trim() ||
      nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nik.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMonth = checkRecordMonth(r.tanggal_pemeriksaan, selectedBulan);
    return matchSearch && matchMonth;
  });

  const filteredMini = miniMcuRecords.filter((r) => {
    const nama = r.nama_lengkap || r.nama_karyawan || '';
    const nik = r.nik || '';
    const matchSearch =
      !searchTerm.trim() ||
      nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nik.toLowerCase().includes(searchTerm.toLowerCase());
    const matchMonth = checkRecordMonth(
      r.tanggal_pemeriksaan || (r as any).tanggal_kunjungan,
      selectedBulan
    );
    return matchSearch && matchMonth;
  });

  const periodeLabel = formatMonthYearLabel(selectedBulan);
  const now = new Date();
  const tanggalUnduh = `${now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;

  const totalAdminMcu = filteredMcu.length;
  const totalMiniMcu = filteredMini.length;

  // KPI Status Kebugaran MCU Admin
  let fitDutyAdmin = 0, fitCatatanAdmin = 0, tidakFitAdmin = 0;
  filteredMcu.forEach((r) => {
    const s = getRecordFitnessStatus(r);
    if (s === 'fit_sehat') fitDutyAdmin++;
    else if (s === 'fit_dengan_catatan') fitCatatanAdmin++;
    else tidakFitAdmin++;
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OneHealth MCU PTPN - Health Analytics Portal';
  workbook.created = now;

  // HANYA 1 SHEET SAJA
  const ws = workbook.addWorksheet('Dashboard & Rekap Data');
  ws.views = [{ showGridLines: true }];

  ws.columns = [
    { key: 'c1', width: 6 },
    { key: 'c2', width: 14 },
    { key: 'c3', width: 16 },
    { key: 'c4', width: 26 },
    { key: 'c5', width: 16 },
    { key: 'c6', width: 24 },
    { key: 'c7', width: 8 },
    { key: 'c8', width: 12 },
    { key: 'c9', width: 16 },
    { key: 'c10', width: 22 },
    { key: 'c11', width: 14 },
    { key: 'c12', width: 18 },
    { key: 'c13', width: 18 },
    { key: 'c14', width: 18 },
    { key: 'c15', width: 10 },
    { key: 'c16', width: 16 },
    { key: 'c17', width: 28 },
    { key: 'c18', width: 24 },
    { key: 'c19', width: 32 },
  ];

  // 1. Kop Laporan
  ws.mergeCells('A1:S1');
  const r1 = ws.getCell('A1');
  r1.value = 'PT PERKEBUNAN NUSANTARA (PTPN) — ONEHEALTH PORTAL';
  r1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF004D25' } };
  r1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:S2');
  const r2 = ws.getCell('A2');
  r2.value = 'REKAPITULASI ANALITIK DASHBOARD ADMIN & KESEHATAN KARYAWAN';
  r2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  r2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(2).height = 22;

  ws.mergeCells('A3:S3');
  const r3 = ws.getCell('A3');
  r3.value = `Periode Data: ${periodeLabel} | Total Karyawan MCU: ${totalAdminMcu} | Total Kunjungan Klinik: ${totalMiniMcu} | Unduh: ${tanggalUnduh}`;
  r3.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  r3.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(3).height = 18;

  // 2. 5 Kartu Metrik Utama di Baris 5-6
  const metrics = [
    { label: 'MCU ADMIN', val: `${totalAdminMcu} Karyawan`, colStart: 1, colEnd: 3, bg: 'FFEFF6FF', text: 'FF1D4ED8' },
    { label: 'INHOUSE CLINIC', val: `${totalMiniMcu} Kunjungan`, colStart: 4, colEnd: 6, bg: 'FFF0FDF4', text: 'FF047857' },
    { label: 'FIT SEHAT', val: `${fitDutyAdmin} Orang`, colStart: 7, colEnd: 9, bg: 'FFF0FDF4', text: 'FF065F46' },
    { label: 'FIT CATATAN', val: `${fitCatatanAdmin} Orang`, colStart: 10, colEnd: 12, bg: 'FFFFFBEB', text: 'FFB45309' },
    { label: 'TIDAK FIT', val: `${tidakFitAdmin} Orang`, colStart: 13, colEnd: 16, bg: 'FFFFF1F2', text: 'FFBE123C' },
  ];

  ws.getRow(5).height = 18;
  ws.getRow(6).height = 24;

  metrics.forEach((m) => {
    ws.mergeCells(5, m.colStart, 5, m.colEnd);
    const labelCell = ws.getCell(5, m.colStart);
    labelCell.value = m.label;
    labelCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: m.bg } };
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.mergeCells(6, m.colStart, 6, m.colEnd);
    const valCell = ws.getCell(6, m.colStart);
    valCell.value = m.val;
    valCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: m.text } };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: m.bg } };
    valCell.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let r = 5; r <= 6; r++) {
      for (let c = m.colStart; c <= m.colEnd; c++) {
        ws.getCell(r, c).border = thinBorder;
      }
    }
  });

  // 3. Render Gambar Visual Grafik Entitas & Divisi
  const entities = [
    { code: 'PTPN 1', label: 'PTPN 1 / SuppCo', targetDefault: 300 },
    { code: 'PTPN 3', label: 'PTPN 3 / Holding', targetDefault: 283 },
    { code: 'PTPN 4', label: 'PTPN 4 / PalmCo', targetDefault: 300 },
  ];

  const clusteredBarItems: ClusteredBarItem[] = entities.map((ent) => {
    const sudah = filteredMcu.filter((r) => matchEntity(r.departemen || (r as any).entitas, ent.code)).length;
    return {
      category: ent.code,
      series1Val: Math.max(sudah, ent.targetDefault),
      series2Val: sudah,
    };
  });

  const entitasPng = renderClusteredBarChartPng(clusteredBarItems, 'Target Personel', 'Sudah MCU', 'Jumlah Karyawan Atas Hasil MCU');
  if (entitasPng) {
    const imgId = workbook.addImage({ base64: entitasPng, extension: 'png' });
    ws.addImage(imgId, {
      tl: { col: 0, row: 8 },
      ext: { width: 520, height: 260 },
      editAs: 'oneCell',
    });
  }

  // Grafik Kebugaran Donut
  const kebugaranSlices: DonutSlice[] = [
    { name: 'Fit for Duty', value: fitDutyAdmin, color: '#10b981' },
    { name: 'Fit Catatan', value: fitCatatanAdmin, color: '#f59e0b' },
    { name: 'Tidak Fit', value: tidakFitAdmin, color: '#ef4444' },
  ];
  const fitPng = renderExcelStylePieDonutChartPng('Distribusi Status Kebugaran MCU', kebugaranSlices);
  if (fitPng) {
    const imgId2 = workbook.addImage({ base64: fitPng, extension: 'png' });
    ws.addImage(imgId2, {
      tl: { col: 9, row: 8 },
      ext: { width: 500, height: 260 },
      editAs: 'oneCell',
    });
  }

  // 4. Tabel Detail Seluruh Data Pasien di Bawah Grafik (Mulai Baris 24)
  const allPatientRows = mapRecordsToUnifiedRows(filteredMcu, filteredMini);
  appendPatientDataTable(ws, 24, allPatientRows, 'SELURUH PESERTA MCU & KUNJUNGAN KLINIK');

  // 5. Trigger Download
  const buffer = await workbook.xlsx.writeBuffer();
  const cleanBulan = selectedBulan === 'all' ? 'Semua_Periode' : selectedBulan === 'current' ? 'September_2026' : selectedBulan;
  const timestamp = now.toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const finalFilename = `Laporan_Dashboard_MCU_Admin_PTPN_${cleanBulan}_${timestamp}.xlsx`;

  triggerExcelDownload(buffer, finalFilename);
}
