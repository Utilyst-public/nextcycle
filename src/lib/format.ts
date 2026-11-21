import { getLocale } from '@/i18n/store';

const dateFormats = new Map<string, Intl.DateTimeFormat>();
const numberFormats = new Map<string, Intl.NumberFormat>();
function dateFormat(locale: 'en' | 'es', monthOnly = false) {
  const key = locale + (monthOnly ? '-month' : '-date');
  let formatter = dateFormats.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale === 'es' ? 'es-US' : 'en-US', {
      month: 'short', ...(monthOnly ? {} : { day: 'numeric' as const }), year: 'numeric', timeZone: 'UTC',
    });
    dateFormats.set(key, formatter);
  }
  return formatter;
}
export function parseIso(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return { y, m, d };
}
export function fmtDate(iso: string, locale: 'en' | 'es' = getLocale()) {
  const { y, m, d } = parseIso(iso);
  return dateFormat(locale).format(new Date(Date.UTC(y, m - 1, d)));
}
export function fmtMonthYear(iso: string, locale: 'en' | 'es' = getLocale()) {
  const { y, m } = parseIso(iso);
  return dateFormat(locale, true).format(new Date(Date.UTC(y, m - 1, 1)));
}
export const isoToMs = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
export function monthsBetween(a: string, b: string) {
  const x = parseIso(a), y = parseIso(b);
  return (y.y - x.y) * 12 + (y.m - x.m) + (y.d >= x.d ? 0 : -1);
}
export function fmtNum(v: number, maxDigits = 3) {
  const locale = getLocale() === 'es' ? 'es-US' : 'en-US';
  const key = `${locale}-${maxDigits}`;
  let formatter = numberFormats.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: maxDigits });
    numberFormats.set(key, formatter);
  }
  return formatter.format(v);
}
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export const todayIso = () => new Date().toISOString().slice(0, 10);
