/**
 * Canvas Chart Renderer for Excel Export
 * Menghasilkan gambar grafik PNG berkualitas tinggi (Retina / High DPI)
 * untuk disematkan langsung ke lembar Excel (.xlsx).
 */

export interface ClusteredBarItem {
  category: string;
  series1Val: number;
  series2Val: number;
}

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

/**
 * 1. GRAFIK BATANG BERKELOMPOK (Clustered Column / Bar Chart)
 * Persis seperti grafik pada foto Dashboard Admin:
 * - Batang 1 (Biru #0284c7): Jumlah Karyawan
 * - Batang 2 (Hijau #059669): Sudah Melaksanakan MCU
 * - Kategori di sumbu X: PTPN 1, PTPN 3, PTPN 4
 */
export function renderClusteredBarChartPng(
  data: ClusteredBarItem[],
  series1Name = 'Jumlah Karyawan',
  series2Name = 'Sudah Melaksanakan MCU',
  title = 'Jumlah Karyawan Atas Hasil MCU'
): string {
  if (typeof window === 'undefined') return '';

  const scale = 2; // High DPI (Retina)
  const width = 840 * scale;
  const height = 400 * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background Putih Bersih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border kartu halus
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(10 * scale, 10 * scale, (840 - 20) * scale, (400 - 20) * scale);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${16 * scale}px Calibri, Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(title, 35 * scale, 38 * scale);

  // Subtitle
  ctx.fillStyle = '#64748b';
  ctx.font = `${11 * scale}px Calibri, Inter, sans-serif`;
  ctx.fillText('Distribusi data per entitas holding & anak perusahaan (PTPN 1, PTPN 3, PTPN 4)', 35 * scale, 56 * scale);

  // Legend di atas tengah
  const legendY = 82 * scale;
  const legendX = (840 / 2 - 140) * scale;

  // Legend 1: Biru
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(legendX, legendY, 14 * scale, 14 * scale);
  ctx.fillStyle = '#0369a1';
  ctx.font = `bold ${11 * scale}px Calibri, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(series1Name, legendX + 20 * scale, legendY + 11 * scale);

  // Legend 2: Hijau
  const legend2X = legendX + 160 * scale;
  ctx.fillStyle = '#059669';
  ctx.fillRect(legend2X, legendY, 14 * scale, 14 * scale);
  ctx.fillStyle = '#047857';
  ctx.fillText(series2Name, legend2X + 20 * scale, legendY + 11 * scale);

  // Layout Area Grafik
  const plotLeft = 70 * scale;
  const plotRight = (840 - 50) * scale;
  const plotTop = 115 * scale;
  const plotBottom = (400 - 65) * scale;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;

  // Hitung Nilai Maksimum untuk Skala Y
  let maxVal = 0;
  data.forEach((d) => {
    maxVal = Math.max(maxVal, d.series1Val, d.series2Val);
  });
  if (maxVal <= 0) maxVal = 100;
  // Bulatkan ke kelipatan 50 atau 100 terdekat
  const yCeil = Math.ceil(maxVal / 50) * 50 || 300;
  const ticks = [0, yCeil * 0.25, yCeil * 0.5, yCeil * 0.75, yCeil];

  // Gambar Garis Grid Horizontal & Label Sumbu Y
  ticks.forEach((val) => {
    const y = plotBottom - (val / yCeil) * plotHeight;

    // Garis Grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1.5 * scale;
    ctx.setLineDash([4 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Label Y
    ctx.fillStyle = '#64748b';
    ctx.font = `${11 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'right';
    ctx.fillText(Math.round(val).toString(), plotLeft - 12 * scale, y + 4 * scale);
  });

  // Garis Sumbu X & Y
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotTop - 5 * scale);
  ctx.lineTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  // Gambar Batang Berkelompok (Clustered Bars)
  const numCats = Math.max(1, data.length);
  const catWidth = plotWidth / numCats;
  const barWidth = 38 * scale;
  const barGap = 6 * scale;

  data.forEach((item, idx) => {
    const catCenterX = plotLeft + idx * catWidth + catWidth / 2;

    // Batang 1 (Biru - Seri 1)
    const bar1X = catCenterX - barWidth - barGap / 2;
    const h1 = (item.series1Val / yCeil) * plotHeight;
    const bar1Y = plotBottom - h1;

    // Gambar rounded top rect batang 1
    ctx.fillStyle = '#0284c7';
    drawRoundedTopRect(ctx, bar1X, bar1Y, barWidth, h1, 6 * scale);

    // Label nilai angka di atas batang 1
    if (item.series1Val > 0) {
      ctx.fillStyle = '#0369a1';
      ctx.font = `bold ${11 * scale}px Calibri, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(item.series1Val.toString(), bar1X + barWidth / 2, bar1Y - 6 * scale);
    }

    // Batang 2 (Hijau - Seri 2)
    const bar2X = catCenterX + barGap / 2;
    const h2 = (item.series2Val / yCeil) * plotHeight;
    const bar2Y = plotBottom - h2;

    // Gambar rounded top rect batang 2
    ctx.fillStyle = '#059669';
    drawRoundedTopRect(ctx, bar2X, bar2Y, barWidth, h2, 6 * scale);

    // Label nilai angka di atas batang 2
    if (item.series2Val > 0) {
      ctx.fillStyle = '#047857';
      ctx.font = `bold ${11 * scale}px Calibri, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(item.series2Val.toString(), bar2X + barWidth / 2, bar2Y - 6 * scale);
    }

    // Label Kategori Sumbu X
    ctx.fillStyle = '#334155';
    ctx.font = `bold ${12 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(item.category, catCenterX, plotBottom + 24 * scale);
  });

  return canvas.toDataURL('image/png');
}

/**
 * 2. GRAFIK DONAT TUNGGAL (Single Donut Chart)
 */
export function renderDonutChartPng(
  title: string,
  slices: DonutSlice[],
  centerText = '',
  chartWidth = 480,
  chartHeight = 360
): string {
  if (typeof window === 'undefined') return '';

  const scale = 2;
  const width = chartWidth * scale;
  const height = chartHeight * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border kartu
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(8 * scale, 8 * scale, (chartWidth - 16) * scale, (chartHeight - 16) * scale);

  // Judul
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${13 * scale}px Calibri, Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 32 * scale);

  const total = slices.reduce((acc, s) => acc + s.value, 0);

  // Donut geometry
  const cx = width / 2;
  const cy = (chartHeight * 0.44) * scale;
  const outerR = 68 * scale;
  const innerR = 40 * scale;

  if (total <= 0) {
    // Lingkaran kosong abu-abu
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, 2 * Math.PI);
    ctx.arc(cx, cy, innerR, 2 * Math.PI, 0, true);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = `${11 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('Belum ada data', cx, cy + 4 * scale);
  } else {
    let startAngle = -Math.PI / 2;

    slices.forEach((slice) => {
      if (slice.value <= 0) return;
      const sliceAngle = (slice.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.fillStyle = slice.color;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();

      // Border pemisah putih
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // Label angka di dalam slice
      if (sliceAngle > 0.3) {
        const midAngle = startAngle + sliceAngle / 2;
        const midR = (outerR + innerR) / 2;
        const lx = cx + Math.cos(midAngle) * midR;
        const ly = cy + Math.sin(midAngle) * midR;

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${10 * scale}px Calibri, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(slice.value.toString(), lx, ly + 4 * scale);
      }

      startAngle = endAngle;
    });

    // Teks di tengah lubang donut
    if (centerText) {
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${14 * scale}px Calibri, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(centerText, cx, cy + 5 * scale);
    }
  }

  // Legend di bawah
  const legendStartY = (chartHeight - 65) * scale;
  const colWidth = (chartWidth - 40) / Math.max(1, slices.length) * scale;

  slices.forEach((slice, idx) => {
    const lx = 25 * scale + idx * colWidth;
    const ly = legendStartY;

    ctx.fillStyle = slice.color;
    ctx.fillRect(lx, ly, 10 * scale, 10 * scale);

    ctx.fillStyle = '#334155';
    ctx.font = `bold ${9.5 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'left';
    const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
    ctx.fillText(`${slice.name}`, lx + 14 * scale, ly + 8 * scale);

    ctx.fillStyle = '#64748b';
    ctx.font = `${9 * scale}px Calibri, sans-serif`;
    ctx.fillText(`${slice.value} Org (${pct}%)`, lx + 14 * scale, ly + 21 * scale);
  });

  return canvas.toDataURL('image/png');
}

/**
 * 3. DUA GRAFIK DONAT BERDAMPINGAN (Dual Donut Charts: Admin vs Klinik)
 * Meniru persis layout side-by-side donut chart di dashboard admin
 */
export function renderDualDonutChartPng(
  mainTitle: string,
  leftTitle: string,
  leftSlices: DonutSlice[],
  rightTitle: string,
  rightSlices: DonutSlice[],
  chartWidth = 840,
  chartHeight = 360
): string {
  if (typeof window === 'undefined') return '';

  const scale = 2;
  const width = chartWidth * scale;
  const height = chartHeight * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border kartu
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(10 * scale, 10 * scale, (chartWidth - 20) * scale, (chartHeight - 20) * scale);

  // Main Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${15 * scale}px Calibri, Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(mainTitle, 35 * scale, 38 * scale);

  // Sub-Donut Kiri
  renderSingleDonutSubplot(
    ctx,
    leftTitle,
    leftSlices,
    (chartWidth * 0.26) * scale,
    (chartHeight * 0.50) * scale,
    62 * scale,
    36 * scale,
    scale
  );

  // Garis pemisah vertikal tengah
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo((chartWidth * 0.5) * scale, 65 * scale);
  ctx.lineTo((chartWidth * 0.5) * scale, (chartHeight - 25) * scale);
  ctx.stroke();

  // Sub-Donut Kanan
  renderSingleDonutSubplot(
    ctx,
    rightTitle,
    rightSlices,
    (chartWidth * 0.74) * scale,
    (chartHeight * 0.50) * scale,
    62 * scale,
    36 * scale,
    scale
  );

  return canvas.toDataURL('image/png');
}

/**
 * Helper Subplot Donut
 */
function renderSingleDonutSubplot(
  ctx: CanvasRenderingContext2D,
  title: string,
  slices: DonutSlice[],
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  scale: number
) {
  // Title sub-chart
  ctx.fillStyle = '#1e293b';
  ctx.font = `bold ${12 * scale}px Calibri, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(title, cx, cy - outerR - 18 * scale);

  const total = slices.reduce((acc, s) => acc + s.value, 0);

  if (total <= 0) {
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, 2 * Math.PI);
    ctx.arc(cx, cy, innerR, 2 * Math.PI, 0, true);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = `${10 * scale}px Calibri, sans-serif`;
    ctx.fillText('Belum ada data', cx, cy + 4 * scale);
  } else {
    let startAngle = -Math.PI / 2;

    slices.forEach((slice) => {
      if (slice.value <= 0) return;
      const sliceAngle = (slice.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.fillStyle = slice.color;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fill();

      // Border pemisah putih
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();

      // Label angka
      if (sliceAngle > 0.3) {
        const midAngle = startAngle + sliceAngle / 2;
        const midR = (outerR + innerR) / 2;
        const lx = cx + Math.cos(midAngle) * midR;
        const ly = cy + Math.sin(midAngle) * midR;

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${9.5 * scale}px Calibri, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(slice.value.toString(), lx, ly + 3.5 * scale);
      }

      startAngle = endAngle;
    });

    // Total di tengah
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${13 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`${total}`, cx, cy + 4 * scale);
  }

  // Legend mini horizontal di bawah
  const legendY = cy + outerR + 24 * scale;
  const totalSlices = slices.length;
  const startX = cx - ((totalSlices * 85) / 2) * scale;

  slices.forEach((slice, idx) => {
    const lx = startX + idx * 85 * scale;
    ctx.fillStyle = slice.color;
    ctx.fillRect(lx, legendY, 9 * scale, 9 * scale);

    ctx.fillStyle = '#475569';
    ctx.font = `${9 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'left';
    const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;
    ctx.fillText(`${slice.name.split(' ')[0]} ${pct}%`, lx + 12 * scale, legendY + 8 * scale);
  });
}

/**
 * 4. GRAFIK BATANG HORIZONTAL LEADERBOARD (Horizontal Bar Chart)
 * Untuk Divisi dan Diagnosa Penyakit
 */
export function renderHorizontalBarChartPng(
  title: string,
  items: { label: string; value: number; subtext?: string }[],
  barColor = '#059669',
  labelColor = '#047857',
  chartWidth = 840,
  chartHeight = 440
): string {
  if (typeof window === 'undefined') return '';

  const scale = 2;
  const width = chartWidth * scale;
  const height = chartHeight * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border kartu
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(10 * scale, 10 * scale, (chartWidth - 20) * scale, (chartHeight - 20) * scale);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${15 * scale}px Calibri, Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(title, 35 * scale, 38 * scale);

  const maxVal = Math.max(1, ...items.map((i) => i.value));
  const topY = 65 * scale;
  const bottomY = (chartHeight - 35) * scale;
  const plotH = bottomY - topY;
  const numItems = Math.max(1, items.length);
  const rowH = plotH / numItems;
  const barH = Math.min(22 * scale, rowH * 0.65);

  const labelW = 260 * scale;
  const barStartX = 35 * scale + labelW;
  const maxBarW = (chartWidth * scale) - barStartX - 100 * scale;

  items.forEach((item, idx) => {
    const y = topY + idx * rowH + rowH / 2;

    // Label Nama
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${10.5 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'left';
    const displayLabel = item.label.length > 32 ? `${item.label.substring(0, 30)}..` : item.label;
    ctx.fillText(`${idx + 1}. ${displayLabel}`, 35 * scale, y + 3 * scale);

    // Baris Bar Horizontal
    const barW = Math.max(4 * scale, (item.value / maxVal) * maxBarW);
    ctx.fillStyle = barColor;
    drawRoundedRightRect(ctx, barStartX, y - barH / 2, barW, barH, 4 * scale);

    // Nilai Angka di Ujung Bar
    ctx.fillStyle = labelColor;
    ctx.font = `bold ${10.5 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`${item.value} Org`, barStartX + barW + 8 * scale, y + 4 * scale);
  });

  return canvas.toDataURL('image/png');
}

export interface DivisiColumnItem {
  divisi: string;
  sudahMcu: number;
  belumMcu?: number;
}

/**
 * 4.b GRAFIK BATANG VERTIKAL DIVISI (PERSIS FOTO DASHBOARD ADMIN PENGGUNA)
 * Menampilkan:
 * - Header kartu dengan badge "22 Divisi Terdata"
 * - 4 Kartu Mini KPI di atas: Total Divisi, Total Karyawan, Divisi Terbanyak, Rata-rata/Divisi
 * - Legenda: "Sudah Melakukan MCU" (Hijau) & "Belum Melakukan MCU" (Abu-abu)
 * - Batang-batang hijau tua rounded-top dengan angka jumlah orang tebal di atas masing-masing batang
 * - Label nama divisi di sumbu X
 */
export function renderDivisiColumnChartPng(
  items: DivisiColumnItem[],
  totalDivisi: number,
  totalKaryawan: number,
  divisiTerbanyak: string,
  rataRata: number,
  chartWidth = 860,
  chartHeight = 440
): string {
  if (typeof window === 'undefined') return '';

  const scale = 2; // High DPI Retina
  const width = chartWidth * scale;
  const height = chartHeight * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background Putih Bersih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border Kartu Halus
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(8 * scale, 8 * scale, (chartWidth - 16) * scale, (chartHeight - 16) * scale);

  // 1. HEADER TITLE & BADGE
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${15 * scale}px Calibri, Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Jumlah Karyawan Per Divisi Atas Hasil MCU', 25 * scale, 20 * scale);

  // Badge Hijau "22 Divisi Terdata"
  const titleW = ctx.measureText('Jumlah Karyawan Per Divisi Atas Hasil MCU').width;
  const badgeX = 25 * scale + titleW + 12 * scale;
  ctx.fillStyle = '#dcfce7';
  ctx.beginPath();
  ctx.roundRect(badgeX, 18 * scale, 120 * scale, 22 * scale, 11 * scale);
  ctx.fill();
  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 1 * scale;
  ctx.stroke();

  ctx.fillStyle = '#166534';
  ctx.font = `bold ${10 * scale}px Calibri, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${totalDivisi} Divisi Terdata`, badgeX + 60 * scale, 29 * scale);

  // Subtitle
  ctx.fillStyle = '#64748b';
  ctx.font = `${10.5 * scale}px Calibri, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Distribusi dan peringkat partisipasi karyawan per unit divisi kerja berdasarkan hasil MCU', 25 * scale, 44 * scale);

  // 2. 4 KARTU MINI KPI (Baris Y = 68 s/d 112)
  const kpiTopY = 68 * scale;
  const kpiH = 44 * scale;
  const kpiGap = 12 * scale;
  const kpiTotalW = (chartWidth - 50) * scale;
  const kpiW = (kpiTotalW - 3 * kpiGap) / 4;

  const kpis = [
    { label: 'TOTAL DIVISI', val: `${totalDivisi} Divisi`, bg: '#f0fdf4', border: '#bbf7d0', valColor: '#166534' },
    { label: 'TOTAL KARYAWAN', val: `${totalKaryawan} Orang`, bg: '#eff6ff', border: '#bfdbfe', valColor: '#1e40af' },
    { label: 'DIVISI TERBANYAK', val: divisiTerbanyak || '-', bg: '#fffbeb', border: '#fde68a', valColor: '#b45309' },
    { label: 'RATA-RATA / DIVISI', val: `${rataRata} Karyawan`, bg: '#f0fdfa', border: '#99f6e4', valColor: '#0f766e' },
  ];

  kpis.forEach((kpi, idx) => {
    const kx = 25 * scale + idx * (kpiW + kpiGap);
    ctx.fillStyle = kpi.bg;
    ctx.beginPath();
    ctx.roundRect(kx, kpiTopY, kpiW, kpiH, 8 * scale);
    ctx.fill();
    ctx.strokeStyle = kpi.border;
    ctx.lineWidth = 1 * scale;
    ctx.stroke();

    // Label
    ctx.fillStyle = '#64748b';
    ctx.font = `bold ${8.5 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(kpi.label, kx + 10 * scale, kpiTopY + 7 * scale);

    // Nilai
    ctx.fillStyle = kpi.valColor;
    ctx.font = `bold ${11 * scale}px Calibri, sans-serif`;
    let displayVal = kpi.val;
    if (ctx.measureText(displayVal).width > kpiW - 20 * scale) {
      while (displayVal.length > 3 && ctx.measureText(displayVal + '..').width > kpiW - 20 * scale) {
        displayVal = displayVal.slice(0, -1);
      }
      displayVal += '..';
    }
    ctx.fillText(displayVal, kx + 10 * scale, kpiTopY + 22 * scale);
  });

  // 3. LEGENDA DI ATAS GRAFIK (Y = 124)
  const legY = 125 * scale;
  // Kotak Hijau
  ctx.fillStyle = '#00875a';
  ctx.fillRect(25 * scale, legY, 12 * scale, 12 * scale);
  ctx.fillStyle = '#1e293b';
  ctx.font = `bold ${10 * scale}px Calibri, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Sudah Melakukan MCU', 42 * scale, legY + 6 * scale);

  // Kotak Abu-abu
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(190 * scale, legY, 12 * scale, 12 * scale);
  ctx.fillStyle = '#64748b';
  ctx.fillText('Belum Melakukan MCU', 207 * scale, legY + 6 * scale);

  // 4. AREA PLOT GRAFIK BATANG VERTIKAL
  const plotLeft = 45 * scale;
  const plotRight = (chartWidth - 25) * scale;
  const plotTop = 150 * scale;
  const plotBottom = (chartHeight - 90) * scale;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;

  // Hitung Nilai Max untuk Sumbu Y
  let maxVal = Math.max(10, ...items.map((i) => i.sudahMcu));
  const yCeil = Math.ceil(maxVal / 10) * 10 || 40;
  const ticks = [0, yCeil * 0.25, yCeil * 0.5, yCeil * 0.75, yCeil];

  // Garis Grid Horizontal & Angka Sumbu Y
  ticks.forEach((val) => {
    const y = plotBottom - (val / yCeil) * plotHeight;
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1 * scale;
    ctx.setLineDash([3 * scale, 3 * scale]);
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Label Sumbu Y
    ctx.fillStyle = '#64748b';
    ctx.font = `${10 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(val).toString(), plotLeft - 8 * scale, y);
  });

  // Garis Sumbu X bawah
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  // 5. GAMBAR BATANG-BATANG HIJAU DENGAN ANGKA DI ATASNYA
  const numBars = Math.max(1, items.length);
  const slotWidth = plotWidth / numBars;
  const barWidth = Math.min(36 * scale, slotWidth * 0.72);

  items.forEach((item, idx) => {
    const slotCenterX = plotLeft + idx * slotWidth + slotWidth / 2;
    const barX = slotCenterX - barWidth / 2;
    const barH = Math.max(3 * scale, (item.sudahMcu / yCeil) * plotHeight);
    const barY = plotBottom - barH;

    // Batang Hijau Tua Rounded-Top
    ctx.fillStyle = '#00875a';
    drawRoundedTopRect(ctx, barX, barY, barWidth, barH, 4 * scale);

    // Angka Jumlah Orang di Atas Batang
    if (item.sudahMcu > 0) {
      ctx.fillStyle = '#005930';
      ctx.font = `bold ${10.5 * scale}px Calibri, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(item.sudahMcu.toString(), slotCenterX, barY - 4 * scale);
    }

    // Label Nama Divisi pada Sumbu X (Miring -45 derajat agar terbaca rapi)
    ctx.save();
    ctx.translate(slotCenterX, plotBottom + 8 * scale);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#334155';
    ctx.font = `bold ${9 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    let label = item.divisi;
    if (label.length > 20) label = `${label.substring(0, 18)}..`;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  return canvas.toDataURL('image/png');
}

export interface PoliRujukanItem {
  poli: string;
  count: number;
}

/**
 * 4.c GRAFIK BATANG VERTIKAL RUJUKAN POLI SPESIALIS (PERSIS FOTO KLINIK PENGGUNA)
 * Menampilkan:
 * - Batang-batang biru rounded-top (#0088cc / #0284c7)
 * - Angka jumlah rujukan tebal di atas setiap batang (misal: 64, 46, 15, 12, 9, 6, 3, 2, ...)
 * - Sumbu Y berjenjang: 0, 20, 40, 60, 80
 * - Sumbu X: Nama-nama poli miring -45 derajat
 */
export function renderPoliRujukanColumnChartPng(
  items: PoliRujukanItem[],
  title = 'Distribusi Rujukan Pasien Berdasarkan Poli Tujuan',
  chartWidth = 860,
  chartHeight = 360
): string {
  if (typeof window === 'undefined') return '';

  const scale = 2; // High DPI Retina
  const width = chartWidth * scale;
  const height = chartHeight * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background Putih Bersih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border Kartu Halus
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(8 * scale, 8 * scale, (chartWidth - 16) * scale, (chartHeight - 16) * scale);

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${14.5 * scale}px Calibri, Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title, 25 * scale, 18 * scale);

  // Subtitle
  ctx.fillStyle = '#64748b';
  ctx.font = `${10.5 * scale}px Calibri, sans-serif`;
  ctx.fillText('Distribusi frekuensi rujukan medis ke poliklinik spesialis rekanan rumah sakit', 25 * scale, 38 * scale);

  // Area Plot
  const plotLeft = 45 * scale;
  const plotRight = (chartWidth - 25) * scale;
  const plotTop = 75 * scale;
  const plotBottom = (chartHeight - 85) * scale;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;

  // Max value calculation
  const maxVal = Math.max(10, ...items.map((i) => i.count));
  const yCeil = Math.ceil(maxVal / 20) * 20 || 80;
  const ticks = [0, yCeil * 0.25, yCeil * 0.5, yCeil * 0.75, yCeil];

  // Grid Lines & Y-Axis Labels
  ticks.forEach((val) => {
    const y = plotBottom - (val / yCeil) * plotHeight;
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1 * scale;
    ctx.setLineDash([3 * scale, 3 * scale]);
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.font = `${10 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.round(val).toString(), plotLeft - 8 * scale, y);
  });

  // Sumbu X Bawah
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5 * scale;
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  // Draw Bars & Labels
  const numBars = Math.max(1, items.length);
  const slotWidth = plotWidth / numBars;
  const barWidth = Math.min(32 * scale, slotWidth * 0.68);

  items.forEach((item, idx) => {
    const slotCenterX = plotLeft + idx * slotWidth + slotWidth / 2;
    const barX = slotCenterX - barWidth / 2;
    const barH = Math.max(item.count > 0 ? 4 * scale : 0, (item.count / yCeil) * plotHeight);
    const barY = plotBottom - barH;

    // Batang Biru Rounded-Top (Persis Foto Pengguna)
    if (barH > 0) {
      ctx.fillStyle = '#0284c7';
      drawRoundedTopRect(ctx, barX, barY, barWidth, barH, 4 * scale);

      // Angka Jumlah di Atas Batang
      ctx.fillStyle = '#0369a1';
      ctx.font = `bold ${11 * scale}px Calibri, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(item.count.toString(), slotCenterX, barY - 4 * scale);
    }

    // Label Poli pada Sumbu X (Miring -45 derajat)
    ctx.save();
    ctx.translate(slotCenterX, plotBottom + 8 * scale);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = '#334155';
    ctx.font = `bold ${9 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    let label = item.poli;
    if (label.length > 22) label = `${label.substring(0, 20)}..`;
    ctx.fillText(label, 0, 0);
    ctx.restore();
  });

  return canvas.toDataURL('image/png');
}

/**
 * Utility rounded corners
 */
function drawRoundedTopRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (height <= 0) return;
  const r = Math.min(radius, width / 2, height);
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fill();
}

function drawRoundedRightRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (width <= 0) return;
  const r = Math.min(radius, width, height / 2);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x, y + height);
  ctx.closePath();
  ctx.fill();
}

/**
 * 5. GRAFIK PIE / DONAT STANDAR EXCEL DENGAN LEGENDA DI SISI KANAN
 * Persis seperti foto yang diunggah pengguna:
 * - Judul Chart di atas tengah/kiri
 * - Lingkaran Pie/Donat di sisi kiri
 * - Legenda vertikal bertingkat di sisi kanan
 * - Kotak bingkai tipis khas Microsoft Excel
 */
export function renderExcelStylePieDonutChartPng(
  title: string,
  slices: DonutSlice[],
  chartWidth = 520,
  chartHeight = 260,
  isDonut = false,
  centerText = ''
): string {
  if (typeof window === 'undefined') return '';

  const scale = 2; // High DPI
  const width = chartWidth * scale;
  const height = chartHeight * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background Putih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border Bingkai Excel
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(6 * scale, 6 * scale, (chartWidth - 12) * scale, (chartHeight - 12) * scale);

  // Judul Chart di Atas
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${13 * scale}px Calibri, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(title, width / 2, 28 * scale);

  const total = slices.reduce((acc, s) => acc + s.value, 0);

  // Geometri Lingkaran (Posisi di sisi kiri)
  const cx = 150 * scale;
  const cy = (chartHeight / 2 + 10) * scale;
  const outerR = 72 * scale;
  const innerR = isDonut ? 42 * scale : 0;

  if (total <= 0) {
    // Lingkaran abu-abu jika belum ada data
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, 2 * Math.PI);
    if (innerR > 0) ctx.arc(cx, cy, innerR, 2 * Math.PI, 0, true);
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.font = `${10.5 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N/A', cx, cy);
  } else {
    let startAngle = -Math.PI / 2;

    // 1. Gambar Slice-Slice Donut/Pie
    slices.forEach((slice) => {
      if (slice.value <= 0) return;
      const sliceAngle = (slice.value / total) * 2 * Math.PI;
      const endAngle = startAngle + sliceAngle;

      ctx.fillStyle = slice.color;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      if (innerR > 0) {
        ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      } else {
        ctx.lineTo(cx, cy);
      }
      ctx.closePath();
      ctx.fill();

      // Border pemisah putih jika lebih dari 1 slice aktif
      const nonZeroCount = slices.filter((s) => s.value > 0).length;
      if (nonZeroCount > 1) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();
      }

      startAngle = endAngle;
    });

    // 2. Gambar Data Label (Angka Jumlah) di Atas Masing-Masing Slice
    let labelAngleStart = -Math.PI / 2;
    slices.forEach((slice) => {
      if (slice.value <= 0) return;
      const sliceAngle = (slice.value / total) * 2 * Math.PI;
      const midAngle = labelAngleStart + sliceAngle / 2;
      const pct = Math.round((slice.value / total) * 100);

      // Tampilkan angka jika slice cukup proporsional
      if (sliceAngle > 0.28) {
        const midR = isDonut ? (outerR + innerR) / 2 : outerR * 0.65;
        const lx = cx + Math.cos(midAngle) * midR;
        const ly = cy + Math.sin(midAngle) * midR;

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 5 * scale;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (sliceAngle > 0.7) {
          ctx.font = `bold ${12 * scale}px Calibri, sans-serif`;
          ctx.fillText(`${slice.value}`, lx, ly - 6 * scale);
          ctx.font = `bold ${9.5 * scale}px Calibri, sans-serif`;
          ctx.fillText(`(${pct}%)`, lx, ly + 7 * scale);
        } else {
          ctx.font = `bold ${11 * scale}px Calibri, sans-serif`;
          ctx.fillText(`${slice.value}`, lx, ly);
        }
        ctx.restore();
      }

      labelAngleStart += sliceAngle;
    });

    // 3. Teks di Tengah Lubang Donut
    if (isDonut) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const centerVal = centerText || `${total}`;
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${15 * scale}px Calibri, sans-serif`;
      ctx.fillText(centerVal, cx, cy - 5 * scale);

      ctx.fillStyle = '#64748b';
      ctx.font = `bold ${9.5 * scale}px Calibri, sans-serif`;
      ctx.fillText('Pasien', cx, cy + 9 * scale);
      ctx.restore();
    }
  }

  // 4. Legenda Vertikal di Sisi Kanan (Mulai dari x = 270)
  // Menampilkan Nama Kategori LENGKAP dengan Angka Berapa Orang dan Persentasenya!
  const legendStartX = 265 * scale;
  const totalLegRows = Math.max(1, slices.length);
  const rowH = Math.min(32 * scale, ((chartHeight - 55) * scale) / totalLegRows);
  const legendStartY = Math.max(42 * scale, cy - ((totalLegRows * rowH) / 2) + 6 * scale);

  slices.forEach((slice, idx) => {
    const ly = legendStartY + idx * rowH;
    const pct = total > 0 ? Math.round((slice.value / total) * 100) : 0;

    // Kotak warna legenda
    ctx.fillStyle = slice.color;
    ctx.fillRect(legendStartX, ly + 2 * scale, 11 * scale, 11 * scale);

    // Border kotak warna halus
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1 * scale;
    ctx.strokeRect(legendStartX, ly + 2 * scale, 11 * scale, 11 * scale);

    // Baris 1: Nama Kategori
    ctx.fillStyle = '#1e293b';
    ctx.font = `bold ${10 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const maxTextWidth = (chartWidth - 265 - 20) * scale;
    let label = slice.name;
    if (ctx.measureText(label).width > maxTextWidth) {
      while (label.length > 3 && ctx.measureText(label + '...').width > maxTextWidth) {
        label = label.slice(0, -1);
      }
      label += '...';
    }
    ctx.fillText(label, legendStartX + 16 * scale, ly);

    // Baris 2: Jumlah Angka Berapa Orang & Persentasenya
    ctx.fillStyle = slice.value > 0 ? '#0f766e' : '#94a3b8';
    ctx.font = `bold ${9.5 * scale}px Calibri, sans-serif`;
    ctx.fillText(`${slice.value} Orang (${pct}%)`, legendStartX + 16 * scale, ly + 13 * scale);
  });

  return canvas.toDataURL('image/png');
}

/**
 * 6. GRAFIK BATANG ENTITAS KLINIK DENGAN TREN BULANAN & 4 KARTU KPI
 * Persis seperti Foto Komponen Dashboard Klinik yang diunggah pengguna:
 * - Judul: "Jumlah Kunjungan Berdasarkan Entitas & Tren Bulanan"
 * - Badge: "X Bulan Terpilih"
 * - 4 Kartu Mini KPI di atas chart:
 *    [TOTAL KUNJUNGAN] [BULAN TERTINGGI] [ENTITAS TERBANYAK] [RATA-RATA / BULAN]
 * - Legenda Bulan (Ungu #8b5cf6, Toska #06b6d4, dsb.)
 * - 8 Entitas Klinik pada Sumbu X:
 *    Holding, PalmCo, SuppCo, Magang, Penugasan, Non - karyawan, LPP, Kapitasi
 * - Angka jumlah pasien tercetak jelas di atas setiap batang
 */
export interface KlinikEntityBarItem {
  entity: string;
  total: number;
  monthlyCounts?: Array<{ monthLabel: string; count: number; color: string }>;
}

export function renderKlinikEntitasMonthlyChartPng(
  items: KlinikEntityBarItem[],
  kpi: {
    totalKunjungan: number | string;
    bulanTertinggi: string;
    entitasTerbanyak: string;
    rataRataBulan: string;
    periodeBulanText?: string;
  },
  chartWidth = 860,
  chartHeight = 440
): string {
  if (typeof window === 'undefined') return '';

  const scale = 2; // Retina / High DPI
  const width = chartWidth * scale;
  const height = chartHeight * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // 1. Background Putih Bersih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Border Bingkai Luar Halus
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1 * scale;
  ctx.strokeRect(8 * scale, 8 * scale, (chartWidth - 16) * scale, (chartHeight - 16) * scale);

  // 2. Header Komponen
  // Ikon BarChart Kecil
  ctx.fillStyle = '#e0e7ff';
  ctx.beginPath();
  const iconX = 24 * scale;
  const iconY = 22 * scale;
  const iconSize = 28 * scale;
  ctx.roundRect ? ctx.roundRect(iconX, iconY, iconSize, iconSize, 6 * scale) : ctx.rect(iconX, iconY, iconSize, iconSize);
  ctx.fill();

  ctx.fillStyle = '#4f46e5';
  ctx.fillRect(iconX + 6 * scale, iconY + 14 * scale, 3.5 * scale, 9 * scale);
  ctx.fillRect(iconX + 12 * scale, iconY + 8 * scale, 3.5 * scale, 15 * scale);
  ctx.fillRect(iconX + 18 * scale, iconY + 11 * scale, 3.5 * scale, 12 * scale);

  // Judul
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold ${14 * scale}px Calibri, Inter, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const titleText = 'Jumlah Kunjungan Berdasarkan Entitas & Tren Bulanan';
  ctx.fillText(titleText, iconX + iconSize + 10 * scale, iconY + 8 * scale);

  // Badge Periode
  const titleMetrics = ctx.measureText(titleText);
  const badgeX = iconX + iconSize + 10 * scale + titleMetrics.width + 12 * scale;
  const badgeText = kpi.periodeBulanText || 'Periode Terpilih';
  ctx.font = `bold ${9 * scale}px Calibri, sans-serif`;
  const badgeW = ctx.measureText(badgeText).width + 14 * scale;

  ctx.fillStyle = '#ede9fe';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(badgeX, iconY, badgeW, 16 * scale, 8 * scale) : ctx.rect(badgeX, iconY, badgeW, 16 * scale);
  ctx.fill();

  ctx.fillStyle = '#6d28d9';
  ctx.textAlign = 'center';
  ctx.fillText(badgeText, badgeX + badgeW / 2, iconY + 8 * scale);

  // Subtitle
  ctx.fillStyle = '#64748b';
  ctx.font = `${10 * scale}px Calibri, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Distribusi pasien per bulan (Januari - Desember) dan entitas perusahaan • Rekapitulasi Inhouse Clinic', iconX + iconSize + 10 * scale, iconY + 18 * scale);

  // 3. 4 KARTU MINI KPI (PERSIS SEPERTI FOTO SEBELAH KIRI)
  const kpiY = 60 * scale;
  const kpiH = 46 * scale;
  const kpiSpacing = 12 * scale;
  const totalKpiWidth = (chartWidth - 48) * scale;
  const kpiW = (totalKpiWidth - kpiSpacing * 3) / 4;

  const kpiCards = [
    {
      label: 'TOTAL KUNJUNGAN',
      val: String(kpi.totalKunjungan || '0 Pasien'),
      color: '#4f46e5',
      bg: '#eef2ff',
      border: '#e0e7ff',
      iconChar: '👥',
    },
    {
      label: 'BULAN TERTINGGI',
      val: String(kpi.bulanTertinggi || '-'),
      color: '#059669',
      bg: '#ecfdf5',
      border: '#d1fae5',
      iconChar: '📈',
    },
    {
      label: 'ENTITAS TERBANYAK',
      val: String(kpi.entitasTerbanyak || '-'),
      color: '#0284c7',
      bg: '#f0f9ff',
      border: '#e0f2fe',
      iconChar: '🏢',
    },
    {
      label: 'RATA-RATA / BULAN',
      val: String(kpi.rataRataBulan || '0 Pasien'),
      color: '#d97706',
      bg: '#fffbeb',
      border: '#fef3c7',
      iconChar: '⚡',
    },
  ];

  kpiCards.forEach((c, idx) => {
    const x = iconX + idx * (kpiW + kpiSpacing);

    // Card background
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, kpiY, kpiW, kpiH, 8 * scale) : ctx.rect(x, kpiY, kpiW, kpiH);
    ctx.fill();
    ctx.stroke();

    // Icon container
    ctx.fillStyle = c.bg;
    ctx.beginPath();
    const iconW = 28 * scale;
    ctx.roundRect ? ctx.roundRect(x + 8 * scale, kpiY + 9 * scale, iconW, iconW, 6 * scale) : ctx.rect(x + 8 * scale, kpiY + 9 * scale, iconW, iconW);
    ctx.fill();

    ctx.font = `${13 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c.iconChar, x + 8 * scale + iconW / 2, kpiY + 9 * scale + iconW / 2);

    // Text Label & Value
    const textStartX = x + 42 * scale;
    ctx.textAlign = 'left';

    ctx.fillStyle = '#64748b';
    ctx.font = `bold ${8.5 * scale}px Calibri, sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillText(c.label, textStartX, kpiY + 10 * scale);

    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${11.5 * scale}px Calibri, sans-serif`;

    let displayVal = c.val;
    const maxValW = kpiW - 48 * scale;
    if (ctx.measureText(displayVal).width > maxValW) {
      while (displayVal.length > 3 && ctx.measureText(displayVal + '..').width > maxValW) {
        displayVal = displayVal.slice(0, -1);
      }
      displayVal += '..';
    }
    ctx.fillText(displayVal, textStartX, kpiY + 24 * scale);
  });

  // 4. LEGENDA BULAN DI ATAS PLOT AREA (PERSIS FOTO SEBELAH KIRI)
  // Ambil daftar series bulan dari items
  const uniqueMonthsMap = new Map<string, string>();
  items.forEach((item) => {
    if (item.monthlyCounts) {
      item.monthlyCounts.forEach((mc) => {
        if (!uniqueMonthsMap.has(mc.monthLabel)) {
          uniqueMonthsMap.set(mc.monthLabel, mc.color);
        }
      });
    }
  });

  const monthSeriesList = Array.from(uniqueMonthsMap.entries()).map(([monthLabel, color]) => ({
    monthLabel,
    color,
  }));

  const plotTop = (kpiY + kpiH + 42 * scale);
  const plotLeft = 45 * scale;
  const plotRight = (chartWidth - 25) * scale;
  const plotBottom = (chartHeight - 60) * scale;
  const plotHeight = plotBottom - plotTop;
  const plotWidth = plotRight - plotLeft;

  // Render Legend Bulan di Tengah
  if (monthSeriesList.length > 0) {
    const legendY = kpiY + kpiH + 16 * scale;
    const itemGap = 35 * scale;
    let totalLegW = 0;

    ctx.font = `bold ${10 * scale}px Calibri, sans-serif`;
    monthSeriesList.forEach((m) => {
      totalLegW += 16 * scale + ctx.measureText(m.monthLabel).width + itemGap;
    });

    let curLegX = Math.max(plotLeft, width / 2 - totalLegW / 2);

    monthSeriesList.forEach((m) => {
      ctx.fillStyle = m.color;
      ctx.fillRect(curLegX, legendY, 12 * scale, 12 * scale);

      ctx.fillStyle = '#334155';
      ctx.font = `bold ${10 * scale}px Calibri, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(m.monthLabel, curLegX + 16 * scale, legendY + 6 * scale);

      curLegX += 16 * scale + ctx.measureText(m.monthLabel).width + itemGap;
    });
  }

  // 5. SKALA SUMBU Y & GRID LINES
  let maxVal = 0;
  items.forEach((item) => {
    if (item.monthlyCounts && item.monthlyCounts.length > 0) {
      item.monthlyCounts.forEach((mc) => {
        maxVal = Math.max(maxVal, mc.count);
      });
    } else {
      maxVal = Math.max(maxVal, item.total);
    }
  });

  // Skala minimal 4 seperti di foto (0, 1, 2, 3, 4)
  const yCeil = Math.max(4, Math.ceil(maxVal * 1.25));
  const step = yCeil <= 5 ? 1 : yCeil <= 10 ? 2 : yCeil <= 20 ? 5 : 10;
  const ticks: number[] = [];
  for (let i = 0; i <= yCeil; i += step) {
    ticks.push(i);
  }

  // Draw Grid Lines & Ticks
  ticks.forEach((tickVal) => {
    const y = plotBottom - (tickVal / yCeil) * plotHeight;

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1 * scale;
    ctx.setLineDash([3 * scale, 3 * scale]);
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#64748b';
    ctx.font = `${10 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(tickVal.toString(), plotLeft - 8 * scale, y);
  });

  // Sumbu X Bawah
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  // 6. DRAW BATANG-BATANG ENTITAS (PERSIS FOTO SEBELAH KIRI)
  const numEntities = items.length;
  const slotWidth = plotWidth / Math.max(1, numEntities);

  items.forEach((item, entIdx) => {
    const slotX = plotLeft + entIdx * slotWidth;
    const slotCenterX = slotX + slotWidth / 2;

    const seriesData = item.monthlyCounts && item.monthlyCounts.length > 0
      ? item.monthlyCounts
      : [{ monthLabel: 'Total', count: item.total, color: '#8b5cf6' }];

    const numSeries = seriesData.length;
    const barWidth = Math.min(22 * scale, (slotWidth * 0.7) / Math.max(1, numSeries));
    const clusterWidth = numSeries * barWidth + (numSeries - 1) * (2 * scale);
    const clusterStartX = slotCenterX - clusterWidth / 2;

    seriesData.forEach((s, sIdx) => {
      const barX = clusterStartX + sIdx * (barWidth + 2 * scale);
      const barH = s.count > 0 ? Math.max(4 * scale, (s.count / yCeil) * plotHeight) : 0;
      const barY = plotBottom - barH;

      if (barH > 0) {
        // Draw Bar Rounded Top
        ctx.fillStyle = s.color;
        drawRoundedTopRect(ctx, barX, barY, barWidth, barH, 3 * scale);

        // Angka Tebal di Atas Batang (Persis 1, 1, 2 di foto pengguna)
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold ${11 * scale}px Calibri, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(s.count.toString(), barX + barWidth / 2, barY - 3 * scale);
      }
    });

    // Label Entitas pada Sumbu X
    ctx.fillStyle = '#334155';
    ctx.font = `bold ${9.5 * scale}px Calibri, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    let entLabel = item.entity;
    // Sumbu X label: Holding, PalmCo, SuppCo, Magang, Penugasan, Non - karyawan, LPP, Kapitasi
    ctx.fillText(entLabel, slotCenterX, plotBottom + 8 * scale);
  });

  return canvas.toDataURL('image/png');
}

