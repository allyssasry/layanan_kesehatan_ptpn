/**
 * Utility to generate an official digital "Surat Rujukan Medis" SVG Data URI
 * for PT Perkebunan Nusantara (PTPN) Medical Services.
 */

export interface RujukanPatientInfo {
  id?: number | string;
  nama_lengkap?: string;
  nama_karyawan?: string;
  nik?: string;
  divisi?: string;
  departemen?: string;
  entitas?: string;
  jabatan?: string;
  nomor_inhealth?: string;
  nomor_bpjs?: string;
  jenis_kelamin?: string;
  umur?: number | string;
  tanggal_pemeriksaan?: string;
  tanggal_pemeriksaan_lanjutan?: string;
  rumah_sakit_rujukan?: string;
  nama_poli_rujukan?: string;
  dokter_pemeriksa?: string;
  diagnosa?: string;
  catatan_intervensi?: string;
  catatan_intervensi_rehabilitatif?: string;
  catatan_intervensi_kuratif?: string;
  intervensi?: string[] | string;
  file_surat_rujukan_intervensi?: string;
  tensi?: string;
  gula_darah?: string | number;
  kolesterol?: string | number;
}

export function generateSuratRujukanDataUrl(info: RujukanPatientInfo): string {
  const patientName = (info.nama_lengkap || info.nama_karyawan || 'Pasien PTPN').toUpperCase();
  const nik = info.nik || '678976';
  const divisi = info.divisi || 'Operasional Kebun / DPDU';
  const entitas = info.departemen || info.entitas || 'PT Perkebunan Nusantara (PTPN)';
  const jabatan = info.jabatan || 'Karyawan';
  const nomorInhealth = info.nomor_inhealth || '-';
  const dokter = info.dokter_pemeriksa || 'dr. Maya Andriana, Sp.Ok';

  // Dates
  const tglRujukan = info.tanggal_pemeriksaan_lanjutan || info.tanggal_pemeriksaan || '2026-09-13';
  const formattedDate = formatIndonesianDate(tglRujukan);
  const nomorSurat = `SR/PTPN-MED/${nik.substring(0, 6)}/${info.id || '289'}/IX/2026`;

  // Destination Hospital & Poli
  let rsTujuan = info.rumah_sakit_rujukan || 'Rumah Sakit Umum Pusat / Faskes Rujukan PTPN';
  let poliTujuan = info.nama_poli_rujukan || 'Poli Spesialis Penyakit Dalam / Dokter Spesialis';

  // If intervensi mentions dokter ahli
  const intervensiText = Array.isArray(info.intervensi)
    ? info.intervensi.join(', ')
    : String(info.intervensi || '');

  if (intervensiText.toLowerCase().includes('dokter ahli') || intervensiText.toLowerCase().includes('rehabilitatif')) {
    poliTujuan = 'Dokter Ahli Spesialis (Konsultan Penyakit Dalam / Kardiologi)';
    rsTujuan = 'RS Rujukan Tingkat Lanjut PTPN IV / RS Mitra';
  } else if (intervensiText.toLowerCase().includes('konseling') || intervensiText.toLowerCase().includes('ehcp')) {
    poliTujuan = 'Poli Employee Health Counseling Program (EHCP)';
  }

  // Diagnosis
  let diagnosa = info.diagnosa || 'Pemeriksaan Kesehatan Berkala & Evaluasi Lanjutan';
  if (info.catatan_intervensi_rehabilitatif) {
    diagnosa += ` - ${info.catatan_intervensi_rehabilitatif}`;
  } else if (info.catatan_intervensi) {
    diagnosa += ` - ${info.catatan_intervensi}`;
  }

  const lampiran = info.file_surat_rujukan_intervensi || 'Screenshot 2025-04-06 104753.jpg';

  // SVG dimensions
  const width = 840;
  const height = 1120;

  const escapeXml = (unsafe: string) => {
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#064e3b" />
      <stop offset="100%" stop-color="#0f766e" />
    </linearGradient>
    <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0f172a" flood-opacity="0.08" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="${width}" height="${height}" fill="#f8fafc" />

  <!-- Main Document Container -->
  <g transform="translate(30, 30)">
    <rect width="${width - 60}" height="${height - 60}" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5" filter="url(#cardShadow)" />

    <!-- Top Decorative Header Bar -->
    <path d="M 0 16 Q 0 0 16 0 L ${width - 76} 0 Q ${width - 60} 0 ${width - 60} 16 L ${width - 60} 12 L 0 12 Z" fill="url(#headerGrad)" />

    <!-- Document Header & Logo -->
    <g transform="translate(45, 35)">
      <!-- Logo Symbol -->
      <rect x="0" y="0" width="56" height="56" rx="14" fill="#005930" />
      <path d="M 28 14 L 38 32 L 18 32 Z" fill="#22c55e" opacity="0.9" />
      <circle cx="28" cy="38" r="4" fill="#ffffff" />

      <!-- Company Name & Header Text -->
      <text x="70" y="22" font-family="'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="900" fill="#064e3b" letter-spacing="0.5">PT PERKEBUNAN NUSANTARA</text>
      <text x="70" y="40" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="700" fill="#0f766e">KLINIK PRATAMA &amp; PUSAT LAYANAN KESEHATAN KERJA</text>
      <text x="70" y="54" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="500" fill="#64748b">Jl. Sei Batanghari No. 2, Medan - Sumatera Utara | Email: klinik@ptpn.co.id | Telp: (061) 8452244</text>

      <!-- Badge "DOKUMEN RESMI" -->
      <rect x="${width - 230}" y="6" width="130" height="26" rx="8" fill="#ecfdf5" stroke="#10b981" stroke-width="1" />
      <text x="${width - 165}" y="23" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="800" fill="#065f46" text-anchor="middle">DOKUMEN RESMI</text>
    </g>

    <!-- Header Separator Line -->
    <line x1="45" y1="108" x2="${width - 105}" y2="108" stroke="#005930" stroke-width="2.5" />
    <line x1="45" y1="112" x2="${width - 105}" y2="112" stroke="#cbd5e1" stroke-width="0.8" />

    <!-- Title Section -->
    <g transform="translate(45, 140)">
      <text x="${(width - 150) / 2}" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="1">SURAT RUJUKAN PEMERIKSAAN MEDIS</text>
      <text x="${(width - 150) / 2}" y="20" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#475569" text-anchor="middle">Nomor: ${escapeXml(nomorSurat)}</text>
    </g>

    <!-- Destination Box -->
    <g transform="translate(45, 185)">
      <rect width="${width - 150}" height="70" rx="10" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1" />
      <text x="20" y="24" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#166534">Kepada Yth. Dokter / Spesialis Pemeriksa:</text>
      <text x="20" y="44" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="900" fill="#0f172a">${escapeXml(poliTujuan)}</text>
      <text x="20" y="60" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#334155">${escapeXml(rsTujuan)}</text>
    </g>

    <!-- Introductory Paragraph -->
    <g transform="translate(45, 275)">
      <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#334155">Dengan hormat,</text>
      <text x="0" y="18" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#334155">Bersama surat ini, kami merujuk pasien karyawan PT Perkebunan Nusantara untuk mendapatkan pemeriksaan,</text>
      <text x="0" y="34" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#334155">tatalaksana lanjutan serta monitoring hasil tindak lanjut medis dengan rincian identitas sebagai berikut:</text>
    </g>

    <!-- Patient Details Table Card -->
    <g transform="translate(45, 330)">
      <rect width="${width - 150}" height="175" rx="10" fill="#ffffff" stroke="#e2e8f0" stroke-width="1" />

      <!-- Table Rows -->
      <!-- Row 1: Nama -->
      <rect x="0" y="0" width="200" height="35" fill="#f8fafc" rx="10 0 0 0" />
      <text x="18" y="22" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#475569">Nama Lengkap Pasien</text>
      <text x="220" y="22" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="#0f172a">: ${escapeXml(patientName)}</text>
      <line x1="0" y1="35" x2="${width - 150}" y2="35" stroke="#e2e8f0" stroke-width="1" />

      <!-- Row 2: NIK & Jabatan -->
      <rect x="0" y="35" width="200" height="35" fill="#f8fafc" />
      <text x="18" y="57" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#475569">Nomor Induk Karyawan (NIK)</text>
      <text x="220" y="57" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#0f172a">: ${escapeXml(nik)}  &#8226;  Jabatan: ${escapeXml(jabatan)}</text>
      <line x1="0" y1="70" x2="${width - 150}" y2="70" stroke="#e2e8f0" stroke-width="1" />

      <!-- Row 3: Unit Kerja / Divisi -->
      <rect x="0" y="70" width="200" height="35" fill="#f8fafc" />
      <text x="18" y="92" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#475569">Entitas / Divisi Kerja</text>
      <text x="220" y="92" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#0f172a">: ${escapeXml(entitas)} - ${escapeXml(divisi)}</text>
      <line x1="0" y1="105" x2="${width - 150}" y2="105" stroke="#e2e8f0" stroke-width="1" />

      <!-- Row 4: No. Asuransi / BPJS / Inhealth -->
      <rect x="0" y="105" width="200" height="35" fill="#f8fafc" />
      <text x="18" y="127" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#475569">Nomor Inhealth / JKN</text>
      <text x="220" y="127" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#0f172a">: ${escapeXml(nomorInhealth)}</text>
      <line x1="0" y1="140" x2="${width - 150}" y2="140" stroke="#e2e8f0" stroke-width="1" />

      <!-- Row 5: Jadwal Pemeriksaan Lanjutan -->
      <rect x="0" y="140" width="200" height="35" fill="#f8fafc" rx="0 0 0 10" />
      <text x="18" y="162" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#475569">Jadwal Tindak Lanjut</text>
      <text x="220" y="162" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#b45309">: ${escapeXml(formattedDate)} (Sesuai Terjadwal Sistem Intervensi)</text>
    </g>

    <!-- Clinical Findings & Program Section -->
    <g transform="translate(45, 525)">
      <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="800" fill="#065f46">HASIL PEMERIKSAAN KLINIS AWAL &amp; ANJURAN TINDAK LANJUT:</text>

      <rect x="0" y="12" width="${width - 150}" height="145" rx="10" fill="#f8fafc" stroke="#e2e8f0" stroke-width="1" />

      <g transform="translate(18, 32)">
        <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#334155">1. Diagnosa / Temuan Medis:</text>
        <text x="18" y="18" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#0f172a">${escapeXml(diagnosa)}</text>

        <text x="0" y="44" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#334155">2. Kategori &amp; Program Intervensi:</text>
        <text x="18" y="62" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#0f172a">${escapeXml(intervensiText || 'Monitoring hasil tindak lanjut oleh dokter ahli (Rehabilitatif)')}</text>

        <text x="0" y="88" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#334155">3. Instruksi / Permintaan Tindakan Faskes Rujukan:</text>
        <text x="18" y="106" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#334155">Mohon evaluasi spesialis komprehensif, pemeriksaan penunjang yang relevan, serta pengembalian resume hasil tindakan ke Klinik Pratama PTPN.</text>
      </g>
    </g>

    <!-- Attachment Reference Badge -->
    <g transform="translate(45, 700)">
      <rect width="${width - 150}" height="42" rx="10" fill="#faf5ff" stroke="#e9d5ff" stroke-width="1" />
      <text x="20" y="26" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#6b21a8">&#128206; Dokumen Lampiran Rujukan:</text>
      <text x="205" y="26" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#581c87">${escapeXml(lampiran)}</text>
    </g>

    <!-- Closing Remarks -->
    <g transform="translate(45, 765)">
      <text x="0" y="0" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#475569">Demikian surat rujukan ini kami buat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</text>
      <text x="0" y="18" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#475569">Atas perhatian dan kerja sama sejawat, kami ucapkan terima kasih.</text>
    </g>

    <!-- Signature & Seal Section -->
    <g transform="translate(45, 825)">
      <!-- Left: Verification QR & Stamp -->
      <g transform="translate(20, 0)">
        <rect width="130" height="130" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />
        <!-- QR Code Mockup -->
        <rect x="15" y="15" width="40" height="40" fill="#0f172a" />
        <rect x="20" y="20" width="30" height="30" fill="#ffffff" />
        <rect x="25" y="25" width="20" height="20" fill="#0f172a" />

        <rect x="75" y="15" width="40" height="40" fill="#0f172a" />
        <rect x="80" y="20" width="30" height="30" fill="#ffffff" />
        <rect x="85" y="25" width="20" height="20" fill="#0f172a" />

        <rect x="15" y="75" width="40" height="40" fill="#0f172a" />
        <rect x="20" y="80" width="30" height="30" fill="#ffffff" />
        <rect x="25" y="85" width="20" height="20" fill="#0f172a" />

        <!-- Mock bits -->
        <rect x="65" y="65" width="10" height="10" fill="#0f172a" />
        <rect x="80" y="75" width="15" height="10" fill="#0f172a" />
        <rect x="100" y="90" width="15" height="15" fill="#0f172a" />
        <rect x="65" y="95" width="10" height="10" fill="#0f172a" />

        <text x="65" y="145" font-family="'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle">VERIFIKASI DIGITAL</text>
      </g>

      <!-- Right: Doctor Signature & Official Stamp -->
      <g transform="translate(${width - 420}, 0)">
        <text x="140" y="18" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#475569" text-anchor="middle">Medan, ${escapeXml(formattedDate)}</text>
        <text x="140" y="34" font-family="'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#0f172a" text-anchor="middle">Dokter Penanggung Jawab Klinik,</text>

        <!-- Official Seal Graphic -->
        <circle cx="100" cy="85" r="45" fill="#005930" opacity="0.12" stroke="#005930" stroke-width="2" stroke-dasharray="4 2" />
        <text x="100" y="80" font-family="'Segoe UI', Roboto, sans-serif" font-size="8" font-weight="900" fill="#005930" text-anchor="middle" letter-spacing="1">KLINIK PRATAMA</text>
        <text x="100" y="92" font-family="'Segoe UI', Roboto, sans-serif" font-size="7" font-weight="800" fill="#005930" text-anchor="middle">PTPN TERVALIDASI</text>

        <!-- Doctor Signature Line -->
        <path d="M 60 85 Q 90 60 120 85 T 180 75 Q 210 90 220 80" fill="none" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" />

        <text x="140" y="125" font-family="'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="#0f172a" text-anchor="middle">${escapeXml(dokter)}</text>
        <text x="140" y="140" font-family="'Segoe UI', Roboto, sans-serif" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">SIP. 446/1842/DISKES/2024</text>
      </g>
    </g>

    <!-- Bottom Footer Bar -->
    <g transform="translate(45, ${height - 115})">
      <line x1="0" y1="0" x2="${width - 150}" y2="0" stroke="#e2e8f0" stroke-width="1" />
      <text x="0" y="18" font-family="'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="500" fill="#94a3b8">Dokumen ini diterbitkan secara elektronik melalui Sistem Informasi Manajemen MCU &amp; Intervensi Kesehatan Terpadu PT Perkebunan Nusantara.</text>
      <text x="${width - 150}" y="18" font-family="'Segoe UI', Roboto, sans-serif" font-size="9" font-weight="700" fill="#0f766e" text-anchor="end">Halaman 1 dari 1</text>
    </g>
  </g>
</svg>
`.trim();

  const base64Svg = typeof window !== 'undefined'
    ? window.btoa(
        encodeURIComponent(svgContent).replace(/%([0-9A-F]{2})/g, (_, p1) =>
          String.fromCharCode(parseInt(p1, 16))
        )
      )
    : Buffer.from(svgContent, 'utf-8').toString('base64');

  return `data:image/svg+xml;base64,${base64Svg}`;
}

function formatIndonesianDate(dateStr?: string | null): string {
  if (!dateStr) return '13 September 2026';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const day = parseInt(match[3]);
      const monthIdx = parseInt(match[2]) - 1;
      const year = parseInt(match[1]);
      return `${day} ${months[monthIdx] || 'September'} ${year}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    }
    return dateStr;
  } catch {
    return dateStr || '13 September 2026';
  }
}
