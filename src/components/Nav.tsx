import { Database, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useDataset } from '@/data/provider';
import { useRegion } from '@/data/region';
import { cn, fmtDate } from '@/lib/format';
import { Logo } from './Logo';
import { LanguageToggle } from './LanguageToggle';
import { useI18n } from '@/i18n';

export const NAV_LINKS = [
  { to: '/watch', key: 'watch' as const },
  { to: '/map', key: 'map' as const },
  { to: '/data-gaps', key: 'gaps' as const },
  { to: '/method', key: 'method' as const },
  { to: '/utilities', key: 'utilities' as const },
  { to: '/about', key: 'about' as const },
];

function FreshnessChip({ className }: { className?: string }) {
  const { t } = useI18n();
  const { state } = useDataset();
  const through = state.status === 'ready' ? fmtDate(state.data.metadata.monitoring_data_through) : null;
  return (
    <span data-testid="text-data-freshness" className={cn('inline-flex items-center gap-2 rounded-full bg-teal-800 px-3 py-1 text-xs font-medium text-white', className)}>
      <Database aria-hidden className="h-3.5 w-3.5 text-cyan" />
      {through ? t('freshness', { date: through }) : t('loadingData')}
    </span>
  );
}

export function Nav() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { regionId, regions, setRegionId } = useRegion();
  const regionLabel = (region: { region_id: string; region_name: string }) =>
    region.region_id === 'R9' ? t('regionSanDiego') : region.region_id === 'R3' ? t('regionCentralCoast') : region.region_name;
  const regionSelect = (mobile = false) => (
    <label className={mobile ? 'grid gap-1' : 'flex items-center gap-2'} htmlFor={mobile ? 'mobile-region' : 'desktop-region'}>
      <span className={mobile ? 'text-xs font-semibold text-teal-100' : 'sr-only'}>{t('regionSwitcher')}</span>
      <select
        id={mobile ? 'mobile-region' : 'desktop-region'}
        aria-label={t('regionSwitcher')}
        value={regionId}
        onChange={(event) => setRegionId(event.target.value)}
        className="rounded-md border border-teal-700 bg-teal-900 px-2.5 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-cyan"
      >
        {regions.map((region) => (
          <option key={region.region_id} value={region.region_id}>{regionLabel(region)}</option>
        ))}
      </select>
    </label>
  );
  useEffect(() => setOpen(false), [pathname]);
  return (
    <header className="sticky top-0 z-40 bg-teal">
      <a href="#main" className="sr-only rounded bg-white px-3 py-2 text-teal focus:not-sr-only focus:absolute focus:left-3 focus:top-3">
        {t('skipToContent')}
      </a>
      <div className="wrap flex h-16 items-center gap-8">
        <Link to="/" data-testid="link-home" aria-label={t('homeLinkAria')} className="rounded-md">
          <Logo tone="white" />
        </Link>
        <nav aria-label={t('primaryNavigation')} className="hidden flex-1 items-center gap-6 lg:flex">
          {NAV_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} data-testid={`link-nav-${l.to.slice(1)}`} className={({ isActive }) => cn('nav-link', isActive && 'is-active')}>
              {t(l.key)}
            </NavLink>
          ))}
        </nav>
        <FreshnessChip className="ml-auto hidden md:inline-flex lg:ml-0" />
        <div className="hidden lg:block">{regionSelect()}</div>
        <div className="hidden lg:block"><LanguageToggle /></div>
        <button
          data-testid="button-menu"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? t('closeMenu') : t('openMenu')}
          onClick={() => setOpen((o) => !o)}
          className="ml-auto grid h-10 w-10 place-items-center rounded-md text-white hover:bg-teal-800 md:ml-0 lg:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label={t('mobileNavigation')} className="slidein border-t border-teal-800 bg-teal pb-4 lg:hidden">
          <div className="wrap grid gap-1 pt-2">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => cn('rounded-md px-3 py-2.5 font-medium text-white', isActive ? 'bg-teal-800' : 'hover:bg-teal-800')}>
                 {t(l.key)}
              </NavLink>
            ))}
            <FreshnessChip className="mt-2 w-fit md:hidden" />
            {regionSelect(true)}
            <div className="mt-3"><LanguageToggle /></div>
          </div>
        </nav>
      )}
    </header>
  );
}
