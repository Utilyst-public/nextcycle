import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { catalogs, pollutantName, type Messages } from './messages';
import { setLocale as setSharedLocale, type Locale } from './store';
import type { Flag } from '@/data/schema';
import type { WaterbodyPair } from '@/data/schema';
import { flagLabel, flagSubline } from '@/lib/labels';
import { fmtNum } from '@/lib/format';
const Context = createContext<{ locale: Locale; setLocale: (locale: Locale) => void; t: (key: keyof Messages, values?: Record<string, string | number>) => string; flagLabel: (flag: Flag) => string; flagSubline: (flag: Flag) => string; criterionText: (pair: Pick<WaterbodyPair, 'criterion_direction' | 'criterion_value' | 'criterion_value_upper' | 'criterion_unit'>) => string }>({
  locale: 'en', setLocale: () => undefined, t: (key) => String(catalogs.en[key]), flagLabel, flagSubline,
  criterionText: (pair) => `${pair.criterion_direction === 'upper' ? 'Not above' : pair.criterion_direction === 'lower' ? 'Not below' : 'Between'} ${fmtNum(pair.criterion_value)}${pair.criterion_direction === 'range' ? ` and ${fmtNum(pair.criterion_value_upper ?? 0)}` : ''}${pair.criterion_unit ? ` ${pair.criterion_unit}` : ''}`,
});

function readLocale(): Locale {
  try {
    const locale = window.localStorage.getItem('nextcycle-language') === 'es' ? 'es' : 'en';
    setSharedLocale(locale);
    return locale;
  } catch { setSharedLocale('en'); return 'en'; }
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale);
  const setLocale = (next: Locale) => { setSharedLocale(next); setLocaleState(next); };
  useEffect(() => {
    setSharedLocale(locale);
    document.documentElement.lang = locale;
    try { window.localStorage.setItem('nextcycle-language', locale); } catch { /* storage may be disabled */ }
  }, [locale]);
  const value = useMemo(() => ({
    locale, setLocale,
    t: (key: keyof Messages, values: Record<string, string | number> = {}) =>
      Object.entries(values).reduce((text, [name, v]) => text.split(`{${name}}`).join(name === 'pollutant' ? pollutantName(String(v), locale) : String(v)), catalogs[locale][key]),
    flagLabel, flagSubline,
    criterionText: (pair: Pick<WaterbodyPair, 'criterion_direction' | 'criterion_value' | 'criterion_value_upper' | 'criterion_unit'>) => {
      const unit = pair.criterion_unit ? ` ${pair.criterion_unit}` : '';
      if (pair.criterion_direction === 'upper') return `${locale === 'es' ? 'No más de' : 'Not above'} ${fmtNum(pair.criterion_value)}${unit}`;
      if (pair.criterion_direction === 'lower') return `${locale === 'es' ? 'No menos de' : 'Not below'} ${fmtNum(pair.criterion_value)}${unit}`;
      return `${locale === 'es' ? 'Entre' : 'Between'} ${fmtNum(pair.criterion_value)} ${locale === 'es' ? 'y' : 'and'} ${fmtNum(pair.criterion_value_upper ?? 0)}${unit}`;
    },
  }), [locale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useI18n() { return useContext(Context); }
