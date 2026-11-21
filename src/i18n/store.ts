export type Locale = 'en' | 'es';
let currentLocale: Locale = 'en';

export function getLocale(): Locale { return currentLocale; }
export function setLocale(next: Locale) { currentLocale = next; }
