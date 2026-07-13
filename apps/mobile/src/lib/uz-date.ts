const UZ_WEEKDAYS_SHORT = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'] as const;

const UZ_MONTHS_SHORT = [
  'yan', 'fev', 'mar', 'apr', 'may', 'iyn',
  'iyl', 'avg', 'sen', 'okt', 'noy', 'dek',
] as const;

const UZ_MONTHS_LONG = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
] as const;

function parseDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatClock(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatUzOrderCardDate(value: string | Date) {
  const date = parseDate(value);
  if (!date) return '';

  return `${UZ_WEEKDAYS_SHORT[date.getDay()]}, ${date.getDate()}-${UZ_MONTHS_SHORT[date.getMonth()]} / ${formatClock(date)}`;
}

export function formatUzDayMonthTime(value: string | Date) {
  const date = parseDate(value);
  if (!date) return '';

  return `${date.getDate()}-${UZ_MONTHS_LONG[date.getMonth()]}, ${formatClock(date)}`;
}

export function formatUzShortDate(value: string | Date, includeYear = false) {
  const date = parseDate(value);
  if (!date) return '';

  const year = includeYear ? `, ${date.getFullYear()}` : '';
  return `${date.getDate()}-${UZ_MONTHS_SHORT[date.getMonth()]}${year}`;
}

export function formatUzFullDateTime(value: string | Date) {
  const date = parseDate(value);
  if (!date) return '';

  return `${date.getDate()}-${UZ_MONTHS_LONG[date.getMonth()]}, ${date.getFullYear()} · ${formatClock(date)}`;
}
