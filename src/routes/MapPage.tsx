import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FlagBadge } from '@/components/Badges';
import { ValidationBadge } from '@/components/RegionValidation';
import { SidePanel } from '@/components/SidePanel';
import type { Dataset } from '@/data/schema';
import { cn } from '@/lib/format';
import { usePageTitle } from '@/lib/title';
import { Discovery } from '@/components/Discovery';
import { useI18n } from '@/i18n';
import { useRegion } from '@/data/region';
import { pollutantName } from '@/i18n/messages';
import { flagLabel, flagWithOfficialTerm } from '@/lib/labels';

const MapView = lazy(() => import('@/components/MapView'));
const SIDEBAR_WIDTH_KEY = 'nextcycle-map-sidebar-width';
const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 560;
const DEFAULT_SIDEBAR_WIDTH = 360;

function clampSidebarWidth(width: number) {
  return Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width));
}

function readSidebarWidth() {
  if (typeof window === 'undefined') return DEFAULT_SIDEBAR_WIDTH;
  try {
    const saved = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return Number.isFinite(saved) && saved > 0 ? clampSidebarWidth(saved) : DEFAULT_SIDEBAR_WIDTH;
  } catch {
    return DEFAULT_SIDEBAR_WIDTH;
  }
}

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3 py-2">
      <span>
        <span className="block text-sm font-semibold text-navy">{label}</span>
        <span className="block text-xs text-slate">{hint}</span>
      </span>
      <span className="relative">
        <input id={id} data-testid={`toggle-${id}`} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="block h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-teal peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-cyan" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function validRing(value: unknown): value is number[][] {
  return Array.isArray(value) && value.length >= 4 && value.every((point) =>
    Array.isArray(point) && point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
    point[0] >= -180 && point[0] <= 180 && point[1] >= -90 && point[1] <= 90);
}

function validTribalGeometry(geometry: unknown) {
  if (!geometry || typeof geometry !== 'object') return false;
  const g = geometry as { type?: string; coordinates?: unknown };
  if (g.type === 'Polygon') return Array.isArray(g.coordinates) && g.coordinates.length > 0 && g.coordinates.every(validRing);
  if (g.type === 'MultiPolygon') return Array.isArray(g.coordinates) && g.coordinates.length > 0 &&
    g.coordinates.every((polygon) => Array.isArray(polygon) && polygon.length > 0 && polygon.every(validRing));
  return false;
}

export default function MapPage({ data }: { data: Dataset }) {
  const { t } = useI18n();
  const { regionId } = useRegion();
  const regionName = regionId === 'R3' ? t('regionCentralCoast') : t('regionSanDiego');
  usePageTitle(t('map'));
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('pair') ?? params.get('focus');
  const showStations = params.get('stations') === '1';
  const dac = params.get('dac') === '1';
  const hasCes = data.pairs.some((p) => p.ces_percentile != null && p.disadvantaged_community != null);
  const showTribal = params.get('tribal') === '1';
  const selected = data.pairs.find((p) => p.pair_id === selectedId) ?? null;
  const [tribalData, setTribalData] = useState<unknown>(null);
  const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const resizeStart = useRef<{ x: number; width: number } | null>(null);
  const mobileDragStart = useRef<number | null>(null);
  const skipMobileClick = useRef(false);
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
    } catch {
      // Keep resizing functional when browser storage is blocked or unavailable.
    }
  }, [sidebarWidth]);
  useEffect(() => {
    let alive = true;
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    fetch(`${base}data/tribal_lands.geojson`).then(async (response) => {
      if (!response.ok) throw new Error('unavailable');
      const json: unknown = await response.json();
      if (!json || typeof json !== 'object' || (json as { type?: unknown }).type !== 'FeatureCollection' || !Array.isArray((json as { features?: unknown }).features)) throw new Error('invalid');
      const features = (json as { features: unknown[] }).features;
      if (!features.every((f) => !!f && typeof f === 'object' && validTribalGeometry((f as { geometry?: unknown }).geometry))) throw new Error('invalid geometry');
      if (alive && features.length) setTribalData(json);
    }).catch(() => { if (alive) setTribalData(null); });
    return () => { alive = false; };
  }, []);
  const set = (k: string, v: string | null) =>
    setParams((prev) => {
      const n = new URLSearchParams(prev);
      if (k === 'pair') n.delete('focus');
      if (v) n.set(k, v); else n.delete(k);
      return n;
    }, { replace: true });
  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeStart.current = { x: event.clientX, width: sidebarWidth };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const resize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resizeStart.current) {
      setSidebarWidth(clampSidebarWidth(resizeStart.current.width + event.clientX - resizeStart.current.x));
    }
  };
  const stopResize = () => { resizeStart.current = null; };
  const resizeByKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 40 : 20;
    if (event.key === 'ArrowLeft') { event.preventDefault(); setSidebarWidth((width) => clampSidebarWidth(width - step)); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); setSidebarWidth((width) => clampSidebarWidth(width + step)); }
    else if (event.key === 'Home') { event.preventDefault(); setSidebarWidth(MIN_SIDEBAR_WIDTH); }
    else if (event.key === 'End') { event.preventDefault(); setSidebarWidth(MAX_SIDEBAR_WIDTH); }
  };
  const beginMobileDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    mobileDragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const endMobileDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (mobileDragStart.current === null) return;
    const delta = mobileDragStart.current - event.clientY;
    mobileDragStart.current = null;
    if (Math.abs(delta) >= 32) {
      skipMobileClick.current = true;
      setMobileExpanded(delta > 0);
      window.setTimeout(() => { skipMobileClick.current = false; }, 0);
    }
  };
  const toggleMobileSheet = () => {
    if (skipMobileClick.current) { skipMobileClick.current = false; return; }
    setMobileExpanded((expanded) => !expanded);
  };

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-[480px] flex-col overflow-hidden lg:min-h-[600px] lg:flex-row">
      <aside
        style={{ '--map-sidebar-width': `${sidebarCollapsed ? 0 : sidebarWidth}px` } as CSSProperties}
        className={cn(
          'absolute inset-x-0 bottom-0 z-20 flex w-full flex-col overflow-hidden border-t border-line bg-white shadow-[0_-10px_32px_rgba(18,48,71,0.12)]',
          mobileExpanded ? 'h-[calc(100dvh-4rem)]' : 'h-[42dvh]',
          'lg:relative lg:inset-auto lg:order-1 lg:h-full lg:w-[var(--map-sidebar-width)] lg:shrink-0 lg:flex-none lg:rounded-none lg:border-t-0 lg:shadow-none',
          sidebarCollapsed ? 'lg:overflow-hidden lg:border-r-0' : 'lg:overflow-visible lg:border-r',
        )}
      >
        <button
          type="button"
          aria-label={t(mobileExpanded ? 'collapseMapResults' : 'expandMapResults')}
          aria-expanded={mobileExpanded}
          aria-controls="map-sidebar-content"
          onPointerDown={beginMobileDrag}
          onPointerUp={endMobileDrag}
          onPointerCancel={() => { mobileDragStart.current = null; }}
          onClick={toggleMobileSheet}
          className="flex shrink-0 touch-none flex-col items-center gap-2 px-4 pb-2 pt-2 text-sm font-semibold text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan lg:hidden"
        >
          <span aria-hidden className="h-1 w-10 rounded-full bg-slate/40" />
          <span className="flex w-full items-center justify-between">
            <span>{t('map')} · {data.pairs.length}</span>
            {mobileExpanded ? <ChevronDown aria-hidden className="h-4 w-4" /> : <ChevronUp aria-hidden className="h-4 w-4" />}
          </span>
        </button>

        <div id="map-sidebar-content" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">{t('map')}</h1>
              <p className="mt-1 text-sm">{t('mapIntro', { region: regionName })}</p>
            </div>
            <button
              type="button"
              aria-label={t('collapseMapSidebar')}
              title={t('collapseMapSidebar')}
              onClick={() => setSidebarCollapsed(true)}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-white text-teal hover:bg-cloud focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan lg:inline-flex"
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4"><Discovery data={data} compact /></div>

          <section aria-labelledby="legend" className="mt-5 rounded-lg border border-line p-4">
            <h2 id="legend" className="label-caps text-slate">{t('legend')}</h2>
            <ul className="mt-3 grid gap-2.5 text-sm text-navy">
              <li title={flagWithOfficialTerm('Delisting candidate')} className="flex items-center gap-3"><svg width="34" height="10" aria-hidden><line x1="2" y1="5" x2="32" y2="5" stroke="var(--nc-link-teal)" strokeWidth="4" strokeLinecap="round" /></svg><CheckCircle2 aria-hidden className="h-4 w-4 text-link" />{flagLabel('Delisting candidate')}</li>
              <li title={flagWithOfficialTerm('Still exceeding')} className="flex items-center gap-3"><svg width="34" height="10" aria-hidden><line x1="2" y1="5" x2="32" y2="5" stroke="var(--nc-amber-text)" strokeWidth="6" strokeLinecap="round" /><line x1="2" y1="5" x2="32" y2="5" stroke="var(--nc-amber)" strokeWidth="3.5" strokeLinecap="round" /></svg><span className="h-4 w-4 rounded-full bg-amber" aria-hidden />{flagLabel('Still exceeding')}</li>
              <li title={flagWithOfficialTerm('Under-sampled')} className="flex items-center gap-3"><svg width="34" height="10" aria-hidden><line x1="2" y1="5" x2="32" y2="5" stroke="var(--nc-slate-gray)" strokeWidth="3.5" strokeDasharray="6 4" /></svg><span className="h-3 w-3 rounded-full border border-slate" aria-hidden />{flagLabel('Under-sampled')}</li>
              <li className="flex items-center gap-3"><svg width="34" height="10" aria-hidden><circle cx="17" cy="5" r="4" fill="var(--nc-cyan)" stroke="var(--nc-midnight-navy)" /></svg>{t('stationMapLabel')}</li>
              {hasCes && dac && <li className="flex items-center gap-3"><svg width="34" height="12" aria-hidden><line x1="4" y1="6" x2="30" y2="6" stroke="var(--nc-teal-200)" strokeWidth="11" strokeLinecap="round" /></svg>{t('dacHalo')}</li>}
              {showTribal && <li className="flex items-center gap-3"><span className="h-3 w-8 rounded border border-teal bg-teal-200" aria-hidden />{t('tribalBoundary')}</li>}
            </ul>
          </section>

          <div className="mt-4 divide-y divide-line">
            <Toggle id="stations" label={t('stations')} hint={t('stationCount', { count: data.stations.length })} checked={showStations} onChange={(v) => set('stations', v ? '1' : null)} />
            {hasCes && <Toggle id="dac" label={t('dacToggle')} hint={t('dacHint')} checked={dac} onChange={(v) => set('dac', v ? '1' : null)} />}
            {!!tribalData && <Toggle id="tribal" label={t('tribalToggle')} hint={t('tribalHint')} checked={showTribal} onChange={(v) => set('tribal', v ? '1' : null)} />}
          </div>

          <div className="mt-6 grid gap-4">
            {(['Delisting candidate', 'Still exceeding', 'Under-sampled'] as const).map((flag) => {
              const group = data.pairs.filter((pair) => pair.screening_flag === flag);
              if (!group.length) return null;
              return <section key={flag} aria-label={`${flagLabel(flag)} (${group.length})`}>
                <h2 title={flagWithOfficialTerm(flag)} className="mb-1 text-sm font-semibold text-navy">{flagLabel(flag)} ({group.length})</h2>
                <ul className="grid min-w-0 gap-1">
                  {group.map((p) => (
                    <li key={p.pair_id}>
                      <button
                        data-testid={`button-select-${p.pair_id}`}
                        aria-pressed={p.pair_id === selectedId}
                        onClick={() => set('pair', p.pair_id === selectedId ? null : p.pair_id)}
                        title={p.waterbody_name}
                        className={cn('w-full min-w-0 rounded-lg px-3 py-2 text-left transition-colors', p.pair_id === selectedId ? 'bg-mist' : 'hover:bg-cloud')}
                      >
                        <span className="block line-clamp-2 break-words text-sm font-semibold leading-snug text-teal" title={p.waterbody_name}>{p.waterbody_name}</span>
                        <span className="mt-1 block truncate text-xs text-slate" title={pollutantName(p.pollutant)}>{pollutantName(p.pollutant)}</span>
                        {hasCes && dac && p.disadvantaged_community === true && <span className="mt-1 block text-[10px] leading-tight text-deep">{t('disadvantagedCommunity')}</span>}
                        <span className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                          <FlagBadge flag={p.screening_flag} size="sm" />
                          <ValidationBadge regionId={p.region_id} pairId={p.pair_id} surface="map-list" className="max-w-full" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>;
            })}
          </div>
        </div>
        <div
          role="separator"
          aria-label={t('resizeMapSidebar')}
          aria-controls="map-sidebar-content"
          aria-orientation="vertical"
          aria-valuemin={MIN_SIDEBAR_WIDTH}
          aria-valuemax={MAX_SIDEBAR_WIDTH}
          aria-valuenow={sidebarWidth}
          tabIndex={sidebarCollapsed ? -1 : 0}
          onPointerDown={beginResize}
          onPointerMove={resize}
          onPointerUp={stopResize}
          onPointerCancel={stopResize}
          onKeyDown={resizeByKeyboard}
          className={cn('absolute inset-y-0 right-0 z-30 hidden w-3 -translate-x-1/2 cursor-col-resize touch-none items-center justify-center bg-transparent outline-none after:h-12 after:w-1 after:rounded-full after:bg-line hover:after:bg-teal-400 focus-visible:after:bg-cyan lg:flex', sidebarCollapsed && 'lg:hidden')}
        />
      </aside>
      <div className="relative order-1 h-full min-h-0 min-w-0 flex-1 overflow-hidden lg:order-2">
        <Suspense fallback={<div className="skeleton h-full w-full rounded-none" />}>
          <MapView
            pairs={data.pairs}
            stations={data.stations}
            showStations={showStations}
            emphasizeDac={hasCes && dac}
            tribalGeojson={tribalData ?? undefined}
            showTribal={showTribal}
            selectedId={selectedId}
            onSelect={(id) => set('pair', id)}
            ariaLabel={t('mapInteractiveAria')}
          />
        </Suspense>
        {sidebarCollapsed && <button type="button" aria-label={t('expandMapSidebar')} title={t('expandMapSidebar')} onClick={() => setSidebarCollapsed(false)} className="absolute left-3 top-3 z-20 hidden items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-teal shadow-sm hover:bg-cloud focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan lg:inline-flex"><ChevronRight aria-hidden className="h-4 w-4" />{t('map')}</button>}
        {selected && (
          <div className="absolute inset-x-2 bottom-2 z-10 max-h-[78%] lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-4 lg:w-[360px] lg:max-h-[calc(100%-2rem)]">
            <SidePanel pair={selected} asOf={data.metadata.monitoring_data_through} onClose={() => set('pair', null)} />
          </div>
        )}
      </div>
    </div>
  );
}
