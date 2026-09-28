// src/lib/dateUtils.ts - Waktu Indonesia Barat (WIB / Asia/Jakarta) Date & Time Utilities

/**
 * Returns the current time in WIB timezone (UTC+7 / Asia/Jakarta) formatted as "HH:mm".
 */
export function getWIBTime(): string {
  try {
    const formatter = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = parts.find((p) => p.type === 'hour')?.value || '00';
    const minute = parts.find((p) => p.type === 'minute')?.value || '00';
    return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } catch {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const wib = new Date(utc + 7 * 3600000);
    const h = String(wib.getHours()).padStart(2, '0');
    const m = String(wib.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

/**
 * Returns the current date in WIB timezone (UTC+7 / Asia/Jakarta) formatted as "YYYY-MM-DD".
 */
export function getWIBDate(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const wib = new Date(utc + 7 * 3600000);
    return wib.toISOString().split('T')[0];
  }
}

/**
 * Formats a date string and optional custom time into readable Indonesian text in WIB.
 * Example: "3 September 2026, 16:45 WIB"
 */
export function formatDateWIB(
  dateStr: string | null | undefined,
  includeTime = false,
  customTime?: string | null
): string {
  if (!dateStr) return '-';
  try {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const isoDateMatch = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    let day = 1;
    let month = months[0];
    let year = 2026;
    let hours = '00';
    let mins = '00';

    if (isoDateMatch) {
      year = parseInt(isoDateMatch[1]);
      const monthIdx = parseInt(isoDateMatch[2]) - 1;
      month = months[monthIdx] || 'Januari';
      day = parseInt(isoDateMatch[3]);

      const timeInStr = String(dateStr).match(/[T ](\d{1,2}):(\d{1,2})/);
      if (timeInStr) {
        hours = timeInStr[1].padStart(2, '0');
        mins = timeInStr[2].padStart(2, '0');
      }
    } else {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        day = d.getDate();
        month = months[d.getMonth()];
        year = d.getFullYear();
        hours = String(d.getHours()).padStart(2, '0');
        mins = String(d.getMinutes()).padStart(2, '0');
      }
    }

    if (customTime && typeof customTime === 'string') {
      const timeMatch = customTime.match(/(\d{1,2})[:.](\d{1,2})/);
      if (timeMatch) {
        hours = timeMatch[1].padStart(2, '0');
        mins = timeMatch[2].padStart(2, '0');
      }
    }

    if (includeTime) {
      return `${day} ${month} ${year}, ${hours}:${mins} WIB`;
    }
    return `${day} ${month} ${year}`;
  } catch {
    return dateStr;
  }
}
