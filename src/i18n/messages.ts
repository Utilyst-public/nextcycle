import en from './en.json';
import es from './es.json';
import type { DataStatus } from '@/data/schema';
import { getLocale, type Locale } from './store';

export type Messages = typeof en;
export type MessageKey = keyof Messages;
export const catalogs: Record<Locale, Messages> = { en, es };
export function message(key: MessageKey, locale: Locale = getLocale()) {
  return catalogs[locale][key];
}

export function disclosureKey(status: DataStatus): MessageKey {
  if (status === 'illustrative') return 'sampleDisclaimer';
  if (status === 'provisional') return 'provisionalDisclaimer';
  return 'screenDisclaimer';
}

export function dataStatusLabelKey(status: DataStatus): MessageKey {
  if (status === 'illustrative') return 'statusIllustrative';
  if (status === 'provisional') return 'statusProvisional';
  return 'statusReviewed';
}

const pollutantKeys: Record<string, MessageKey> = {
  'dissolved zinc': 'pollutantDissolvedZinc', 'total nitrogen': 'pollutantTotalNitrogen',
  phosphorus: 'pollutantPhosphorus', 'dissolved copper': 'pollutantDissolvedCopper',
  'dissolved oxygen': 'pollutantDissolvedOxygen', selenium: 'pollutantSelenium', toxicity: 'pollutantToxicity',
};
/** Display only: source records, CSV, filter values and IDs are never rewritten. */
export function pollutantName(value: string, locale: Locale = getLocale()): string {
  const key = value.toLowerCase();
  if (key === 'ph') return 'pH';
  if (locale !== 'es' || !pollutantKeys[key]) return value;
  const translated = message(pollutantKeys[key], locale);
  return value[0] === value[0]?.toLowerCase() ? translated.toLocaleLowerCase('es') : translated;
}

export function policyVersionText(value: string): string {
  return value === catalogs.en.policyVersion2015 ? message('policyVersion2015') : value;
}
