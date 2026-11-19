import * as XLSX from 'xlsx';
import { LogEntry, LogType, Member, RegularityStatus, SpiritualElement } from '../types';
import { LOG_TYPE_META } from '../data/seedData';

export const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const ARABIC_WEEKDAYS_SHORT = [
  'أحد',
  'إثنين',
  'ثلاثاء',
  'أربعاء',
  'خميس',
  'جمعة',
  'سبت',
];

export const ARABIC_WEEKDAYS_FULL = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

/**
 * Returns actual current live calendar date formatted as YYYY-MM-DD
 * using the user's real local device clock (so midnight in Egypt/Sudan/Arab timezones
 * immediately advances to the new day instead of lagging behind by 2-3 hours in UTC).
 */
export function getTodayUTC(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalTimezoneLabel(date: Date = new Date()): string {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return mins === 0
    ? `UTC${sign}${hours}`
    : `UTC${sign}${hours}:${String(mins).padStart(2, '0')}`;
}

/**
 * Converts Arabic-Indic (٠-٩) and Persian (۰-۹) digits to standard Western digits (0-9).
 */
export function toWesternDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Normalizes any date string (YYYY-MM-DD, DD/MM/YYYY, YYYY/MM/DD, ISO timestamp, or Google Sheets Date text)
 * into a clean YYYY-MM-DD key so date matching is 100% consistent.
 */
export function normalizeDateKey(raw: string): string {
  const trimmed = toWesternDigits((raw || '').trim());
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Handle YYYY/MM/DD
  const ymdSlash = trimmed.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (ymdSlash) {
    return `${ymdSlash[1]}-${ymdSlash[2].padStart(2, '0')}-${ymdSlash[3].padStart(2, '0')}`;
  }

  // Handle DD/MM/YYYY
  const dmySlash = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmySlash) {
    return `${dmySlash[3]}-${dmySlash[2].padStart(2, '0')}-${dmySlash[1].padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    const match = trimmed.match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : trimmed.slice(0, 10);
  }
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Generates a unique ID for members or log entries.
 */
export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 12)}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Arabic text normalization for effortless searching:
 * Treats أ / إ / آ / ا as equivalent, ة / ه as equivalent, ى / ي as equivalent,
 * and removes Arabic diacritics (tashkeel) and extra whitespace.
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // tashkeel & tatweel
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ');
}

/**
 * Parses a YYYY-MM-DD string into UTC Date midnight.
 */
export function parseUTCDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y || 2000, (m || 1) - 1, d || 1));
}

/**
 * Returns whole days difference: (laterDate - earlierDate).
 */
export function daysBetweenUTC(earlierDateStr: string, laterDateStr: string): number {
  const d1 = parseUTCDate(earlierDateStr).getTime();
  const d2 = parseUTCDate(laterDateStr).getTime();
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * Formats a YYYY-MM-DD date nicely in Arabic, e.g., "الأحد، 19 نوفمبر 2026".
 */
export function formatArabicDateFull(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const d = parseUTCDate(dateStr);
  const weekday = ARABIC_WEEKDAYS_FULL[d.getUTCDay()];
  const day = d.getUTCDate();
  const month = ARABIC_MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${weekday}، ${day} ${month} ${year}`;
}

/**
 * Formats a YYYY-MM-DD date compactly in Arabic, e.g., "19 نوفمبر 2026".
 */
export function formatArabicDateShort(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return '';
  const d = parseUTCDate(dateStr);
  const day = d.getUTCDate();
  const month = ARABIC_MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

/**
 * Formats an ISO timestamp clearly in the user's real local time with timezone offset.
 */
export function formatCheckInTime(isoTimestamp: string): string {
  if (!isoTimestamp) return '—';
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;

  const hours24 = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const period = hours24 >= 12 ? 'م' : 'ص';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const tz = getLocalTimezoneLabel(date);

  return `${hours12}:${minutes}:${seconds} ${period} (${tz})`;
}

/**
 * Formats full date + time with local timezone offset for the master log table.
 */
export function formatFullUTCTimestamp(isoTimestamp: string): string {
  if (!isoTimestamp) return '—';
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return isoTimestamp;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  const tz = getLocalTimezoneLabel(date);
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss} (${tz})`;
}

/**
 * Returns the most recent attendance date (YYYY-MM-DD) for a member,
 * or completely empty string "" if the member has never attended.
 */
export function getLastAttendanceDate(memberId: string, logs: LogEntry[]): string {
  let latest = '';
  for (const log of logs) {
    if (log.memberId === memberId && log.type === 'attendance') {
      if (!latest || log.date > latest) {
        latest = log.date;
      }
    }
  }
  return latest;
}

/**
 * Returns count of unique attendance dates for a member.
 */
export function getTotalAttendanceCount(memberId: string, logs: LogEntry[]): number {
  const uniqueDates = new Set<string>();
  for (const log of logs) {
    if (log.memberId === memberId && log.type === 'attendance') {
      uniqueDates.add(log.date);
    }
  }
  return uniqueDates.size;
}

/**
 * Calculates regularity status for one of the 5 spiritual elements relative to today's live date:
 * - regular (منتظم — Green): logged within the last 7 days (0..7 days ago, including first-time check today!).
 * - intermittent (متقطع — Amber): more than 1 week (> 7 days) and less than 2 weeks (< 14 days) since last logged.
 * - irregular (غير منتظم — Red): 2 weeks or more (>= 14 days) since last logged, OR never logged.
 */
export function calculateElementRegularity(
  memberId: string,
  element: SpiritualElement,
  logs: LogEntry[],
  todayUTC: string = getTodayUTC()
): { status: RegularityStatus; lastDate: string; countLast7: number; countLast14: number } {
  const uniqueDates = new Set<string>();
  for (const log of logs) {
    if (log.memberId === memberId && log.type === element) {
      const normalized = normalizeDateKey(log.date);
      if (normalized) uniqueDates.add(normalized);
    }
  }

  if (uniqueDates.size === 0) {
    return { status: 'irregular', lastDate: '', countLast7: 0, countLast14: 0 };
  }

  const sortedDates = Array.from(uniqueDates).sort((a, b) => (a > b ? -1 : 1));
  const lastDate = sortedDates[0];

  let countLast7 = 0;
  let countLast14 = 0;

  for (const d of sortedDates) {
    const diff = daysBetweenUTC(d, todayUTC);
    if (diff >= 0 && diff <= 7) {
      countLast7++;
    }
    if (diff >= 0 && diff < 14) {
      countLast14++;
    }
  }

  const daysSinceLast = Math.max(0, daysBetweenUTC(lastDate, todayUTC));

  if (daysSinceLast <= 7) {
    return { status: 'regular', lastDate, countLast7, countLast14 };
  }

  if (daysSinceLast < 14) {
    return { status: 'intermittent', lastDate, countLast7, countLast14 };
  }

  return { status: 'irregular', lastDate, countLast7, countLast14 };
}

export const REGULARITY_META: Record<
  RegularityStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  regular: {
    label: 'منتظم',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    dotClass: 'bg-emerald-500',
  },
  intermittent: {
    label: 'متقطع',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    dotClass: 'bg-amber-500',
  },
  irregular: {
    label: 'غير منتظم',
    badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    dotClass: 'bg-rose-500',
  },
};

/**
 * Formats an absence duration in friendly Arabic text.
 */
export function formatAbsenceDuration(days: number | null): string {
  if (days === null) return 'لم يحضر أبداً';
  if (days <= 0) return 'حاضر اليوم';
  if (days === 1) return 'يوم واحد';
  if (days === 2) return 'يومان';
  if (days < 7) return `${days} أيام`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    const wText =
      weeks === 1 ? 'أسبوع' : weeks === 2 ? 'أسبوعين' : `${weeks} أسابيع`;
    if (rem === 0) return wText;
    return `${wText} و ${rem} ${rem === 1 ? 'يوم' : rem === 2 ? 'يومان' : 'أيام'}`;
  }
  const months = Math.floor(days / 30);
  const remDays = days % 30;
  const mText =
    months === 1 ? 'شهر' : months === 2 ? 'شهرين' : months <= 10 ? `${months} شهور` : `${months} شهر`;
  if (remDays < 7) return mText;
  const weeks = Math.floor(remDays / 7);
  return `${mText} و ${weeks === 1 ? 'أسبوع' : weeks === 2 ? 'أسبوعين' : `${weeks} أسابيع`}`;
}

/**
 * Calculates upcoming birthday details relative to today's live date cleanly without timezone bugs.
 */
export function getBirthdayInfo(birthDate: string, todayUTC: string = getTodayUTC()) {
  const cleanBirth = normalizeDateKey(birthDate);
  if (!cleanBirth || !/^\d{4}-\d{2}-\d{2}$/.test(cleanBirth)) return null;
  const [by, bm, bd] = cleanBirth.split('-').map(Number);
  if (!by || !bm || !bd || bm < 1 || bm > 12 || bd < 1 || bd > 31) return null;

  const cleanToday = normalizeDateKey(todayUTC);
  const [ty, tm, td] = cleanToday.split('-').map(Number);
  const todayMidnight = Date.UTC(ty, tm - 1, td);

  let nextYear = ty;
  let candidate = Date.UTC(nextYear, bm - 1, bd);
  if (candidate < todayMidnight) {
    nextYear = ty + 1;
    candidate = Date.UTC(nextYear, bm - 1, bd);
  }

  const daysRemaining = Math.round((candidate - todayMidnight) / (1000 * 60 * 60 * 24));
  const upcomingAge = Math.max(0, nextYear - by);

  return {
    normalizedDate: cleanBirth,
    month: bm,
    day: bd,
    birthYear: by,
    upcomingAge,
    daysRemaining,
    isToday: daysRemaining === 0,
    isThisWeek: daysRemaining >= 0 && daysRemaining <= 7,
    isThisMonth: daysRemaining >= 0 && daysRemaining <= 30,
    isCurrentCalendarMonth: bm === tm,
  };
}

/**
 * Builds clean Call (tel:) and Official WhatsApp (wa.me) hrefs from Egyptian/Sudanese/international numbers.
 * Supports Western and Arabic-Indic digits automatically.
 */
export function getPhoneLinks(phone: string, notes = '', customMessage?: string) {
  const western = toWesternDigits(phone || '');
  const digits = western.replace(/[^\d+]/g, '');
  const pureDigits = digits.replace(/\+/g, '');

  if (!pureDigits || pureDigits.length < 7) {
    return {
      hasValidPhone: false,
      hasWhatsApp: false,
      telHref: '',
      whatsappHref: '',
    };
  }

  let waNumber = pureDigits;
  let isLandline = false;

  if (waNumber.startsWith('00')) {
    waNumber = waNumber.slice(2);
  } else if (waNumber.startsWith('01') && waNumber.length === 11) {
    // Standard Egyptian mobile (010 / 011 / 012 / 015)
    waNumber = `20${waNumber.slice(1)}`;
  } else if (/^1[0125]\d{8}$/.test(waNumber)) {
    // Egyptian mobile missing leading 0 (e.g. from numeric spreadsheet cell)
    waNumber = `20${waNumber}`;
  } else if (waNumber.startsWith('01') && waNumber.length === 10) {
    // 10-digit 01x Sudanese mobile or Egypt mobile
    if (normalizeArabic(notes).includes('سودان')) {
      waNumber = `249${waNumber.slice(1)}`;
    } else {
      waNumber = `20${waNumber.slice(1)}`;
    }
  } else if (waNumber.startsWith('09') && waNumber.length === 10) {
    // Sudanese mobile
    waNumber = `249${waNumber.slice(1)}`;
  } else if (/^0[2-9]\d{6,8}$/.test(waNumber) && !waNumber.startsWith('09')) {
    // Short Egyptian landline (e.g. 02 / 03 / 04x)
    isLandline = true;
  }

  const telHref = digits.startsWith('00') ? `tel:+${digits.slice(2)}` : `tel:${digits}`;
  const hasWhatsApp = !isLandline && waNumber.length >= 10;
  const baseWa = `https://wa.me/${waNumber}`;
  const whatsappHref = customMessage
    ? `${baseWa}?text=${encodeURIComponent(customMessage)}`
    : baseWa;

  return {
    hasValidPhone: true,
    hasWhatsApp,
    telHref,
    whatsappHref,
  };
}

/**
 * Triggers a browser file download cleanly.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export rows to native Excel (.xlsx) with RTL sheet layout.
 */
export function exportRowsToExcel(
  rows: Record<string, string | number>[],
  sheetName: string,
  filename: string
) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!views'] = [{ rightToLeft: true }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

/**
 * Export rows to UTF-8 BOM CSV (Excel Arabic compatible).
 */
export function exportRowsToCSV(rows: Record<string, string | number>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escapeCell = (val: string | number | undefined | null) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(',')),
  ];
  const blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;',
  });
  downloadBlob(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/**
 * Export JSON backup.
 */
export function exportJSONBackup(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`);
}

/**
 * Parse an uploaded Excel (.xlsx/.xls) or CSV file into Member input rows.
 */
export async function parseMembersFromSpreadsheet(
  file: File
): Promise<Omit<Member, 'id'>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];

  const sheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  const findField = (row: Record<string, unknown>, candidates: string[]): string => {
    const entries = Object.entries(row);
    for (const [k, v] of entries) {
      const nk = normalizeArabic(k);
      for (const c of candidates) {
        if (nk === normalizeArabic(c) || nk.includes(normalizeArabic(c))) {
          return String(v ?? '').trim();
        }
      }
    }
    return '';
  };

  const results: Omit<Member, 'id'>[] = [];
  for (const row of jsonRows) {
    const name = findField(row, ['الاسم', 'الإسم', 'اسم', 'name', 'full name']);
    if (!name) continue;
    const phone = findField(row, ['رقم التليفون', 'التليفون', 'التلفون', 'موبايل', 'هاتف', 'phone', 'mobile']);
    let birthDate = findField(row, ['تاريخ الميلاد', 'الميلاد', 'birthdate', 'birth date', 'dob']);
    const address = findField(row, ['العنوان', 'عنوان', 'السكن', 'address']);
    const notes = findField(row, ['ملاحظات', 'ملاحظة', 'notes', 'note']);

    // Normalize simple date formats if needed
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      const parsed = new Date(birthDate);
      if (!Number.isNaN(parsed.getTime())) {
        birthDate = parsed.toISOString().slice(0, 10);
      } else {
        birthDate = '';
      }
    }

    results.push({ name, phone, birthDate, address, notes });
  }
  return results;
}

export function formatLogRowsForExport(logs: LogEntry[], membersMap: Map<string, Member>) {
  return logs.map((log) => {
    const member = membersMap.get(log.memberId);
    return {
      'التاريخ': log.date,
      'التوقيت الدقيق (UTC)': formatFullUTCTimestamp(log.timestampUTC),
      'اسم المخدوم': member?.name ?? 'مخدوم محذوف',
      'نوع التسجيل': LOG_TYPE_META[log.type as LogType]?.label ?? log.type,
      'رقم التليفون': member?.phone ?? '',
      'العنوان': member?.address ?? '',
      'ملاحظات': member?.notes ?? '',
    };
  });
}
