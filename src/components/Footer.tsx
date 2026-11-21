import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDataset } from '@/data/provider';
import { fmtDate } from '@/lib/format';
import { Logo } from './Logo';
import { NAV_LINKS } from './Nav';
import { useI18n } from '@/i18n';
import { dataStatusLabelKey } from '@/i18n/messages';

export function Footer() {
  const { state } = useDataset();
  const { t } = useI18n();
  const md = state.status === 'ready' ? state.data.metadata : null;
  return (
    <footer className="shrink-0 border-t border-line bg-white">
      <div className="wrap grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-4 max-w-md text-sm">{t('disclaimerBody')}</p>
          {md && (
            <p className="mt-4 text-sm text-slate">
              {t('dataAsOf')} <span className="num text-navy">{fmtDate(md.monitoring_data_through)}</span> · {t('datasetVersionLabel')} <span className="num text-navy">{md.dataset_version}</span>
              {` · ${t(dataStatusLabelKey(md.data_status))}`}
            </p>
          )}
        </div>
        <nav aria-label={t('footerNavigation')} className="md:col-span-2">
          <p className="label-caps mb-3 text-slate">{t('exploreFooter')}</p>
          <ul className="grid gap-2 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.to}><Link className="text-link hover:underline" to={l.to}>{t(l.key)}</Link></li>
            ))}
            {[
              { to: '/updates', label: t('updates') },
              { to: '/api', label: t('api') },
              { to: '/showcase', label: t('showcase') },
            ].map((l) => (
              <li key={l.to}><Link className="text-link hover:underline" to={l.to}>{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-5">
          <p className="label-caps mb-3 text-slate">{t('sourcesFooter')}</p>
          <ul className="grid gap-2 text-sm">
            {md?.sources.map((s) => (
              <li key={s.name}>
                <a className="inline-flex items-start gap-1 text-link hover:underline" href={s.url} target="_blank" rel="noreferrer">
                  <span title={s.name === 'SWAMP / CEDEN surface water chemistry' ? t('swampDefinition') : s.name.includes('303(d)') ? t('act303Definition') : undefined}>{s.name}</span>
                  <ExternalLink aria-hidden className="mt-1 h-3 w-3 shrink-0" />
                </a>
                <span className="block text-xs text-slate">{s.publisher}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="wrap flex flex-col gap-2 py-5 text-xs text-slate sm:flex-row sm:items-center sm:justify-between">
          <p>{t('mitNotice')} {md?.repo_url && <a className="text-link underline underline-offset-2 hover:decoration-2" href={md.repo_url} target="_blank" rel="noreferrer">GitHub</a>}</p>
          <p><a className="text-link hover:underline" href={`${import.meta.env.BASE_URL.replace(/\/$/, '')}/feed.xml`}>{t('atomFeed')}</a></p>
          <p>
            {t('builtBy')} <a data-testid="link-utilyst" className="font-semibold text-link hover:underline" href="https://utilyst.com" target="_blank" rel="noreferrer">Utilyst</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
