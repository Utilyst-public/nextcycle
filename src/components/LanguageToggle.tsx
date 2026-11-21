import { useI18n } from '@/i18n';

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  return <div className="flex items-center gap-2 text-xs text-white">
    <label htmlFor="language-select" className="sr-only">{t('language')}</label>
    <select id="language-select" data-testid="select-language" value={locale} onChange={(e) => setLocale(e.target.value as 'en' | 'es')}
      className="rounded border border-white/40 bg-teal px-2 py-1.5 text-white focus-visible:outline-cyan">
      <option value="en">{t('english')}</option><option value="es">{t('spanish')}</option>
    </select>
  </div>;
}
