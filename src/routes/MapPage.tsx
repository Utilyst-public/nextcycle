import { CheckCircle2 } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
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

const MapView = lazy(() => import('@/components/MapView'));

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
  const { t, flagLabel } = useI18n();
  const { regionId } = useRegion();
  const regionName = regionId === 'R3' ? t('regionCentralCoast') : t('regionSanDiego');
  usePageTitle(t('map'));
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('pair');
  const showStations = params.get('stations') === '1';
  const dac = params.get('dac') === '1';
  const hasCes = data.pairs.some((p) => p.ces_percentile != null && p.disadvantaged_community != null);
  const showTribal = params.get('tribal') === '1';
  const selected = data.pairs.find((p) => p.pair_id === selectedId) ?? null;
  const [tribalData, setTribalData] = useState<unknown>(null);
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
    setParams((prev) => { const n = new URLSearchParams(prev); if (v) n.set(k, v); else n.delete(k); return n; }, { replace: true });

  return (
    <div className="flex flex-col lg:h-[calc(100dvh-4rem)] lg:min-h-[600px] lg:flex-row">
      <aside className="order-2 min-w-0 overflow-x-hidden border-line bg-white lg:order-1 lg:w-[360px] lg:shrink-0 lg:overflow-y-auto lg:border-r">
        <div className="p-5">
          <h1 className="text-2xl font-bold">{t('map')}</h1>
          <p className="mt-1 text-sm">{t('mapIntro', { region: regionName })}</p>
          <div className="mt-4"><Discovery data={data} compact /></div>

          <section aria-labelledby="legend" className="mt-5 rounded-lg border border-line p-4">
            <h2 id="legend" className="label-caps text-slate">{t('legend')}</h2>
            <ul className="mt-3 grid gap-2.5 text-sm text-navy">
              <li className="flex items-center gap-3"><svg width="34" height="10" aria-hidden><line x1="2" y1="5" x2="32" y2="5" stroke="var(--nc-link-teal)" strokeWidth="4" strokeLinecap="round" /></svg><CheckCircle2 aria-hidden className="h-4 w-4 text-link" />{flagLabel('Delisting candidate')}</li>
              <li className="flex items-center gap-3"><svg width="34" height="10" aria-hidden><line x1="2" y1="5" x2="32" y2="5" stroke="var(--nc-amber-text)" strokeWidth="6" strokeLinecap="round" /><line x1="2" y1="5" x2="32" y2="5" stroke="var(--nc-amber)" strokeWidth="3.5" strokeLinecap="round" /></svg><span className="h-4 w-4 rounded-full bg-amber" aria-hidden />{flagLabel('Still exceeding')}</li>
              <li className="flex items-center gap-3"><svg width="34" height="10" aria-hidden><line x1="2" y1="5" x2="32" y2="5" stroke="var(--nc-slate-gray)" strokeWidth="3.5" strokeDasharray="6 4" /></svg><span className="h-3 w-3 rounded-full border border-slate" aria-hidden />{flagLabel('Under-sampled')}</li>
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
              return <section key={flag} aria-label={flagLabel(flag)}>
                <h2 className="mb-1 flex items-center justify-between gap-2 text-sm font-semibold text-navy"><span>{flagLabel(flag)}</span><span className="num text-slate">{group.length}</span></h2>
                <ul className="grid min-w-0 gap-1">
            {group.map((p) => (
              <li key={p.pair_id}>
                <button
                  data-testid={`button-select-${p.pair_id}`}
                  aria-pressed={p.pair_id === selectedId}
                  onClick={() => set('pair', p.pair_id === selectedId ? null : p.pair_id)}
                  className={cn('w-full min-w-0 rounded-lg px-3 py-2 text-left transition-colors', p.pair_id === selectedId ? 'bg-mist' : 'hover:bg-cloud')}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-semibold text-teal">{p.waterbody_name}</span>
                    {hasCes && dac && p.disadvantaged_community === true && <span className="shrink-0 text-[10px] text-deep">{t('disadvantagedCommunity')}</span>}
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-slate">{pollutantName(p.pollutant)}</span>
                    <span className="flex flex-wrap items-center justify-end gap-1">
                      <FlagBadge flag={p.screening_flag} size="sm" />
                      <ValidationBadge regionId={p.region_id} pairId={p.pair_id} surface="map-list" />
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
              </section>;
            })}
          </div>
        </div>
      </aside>
      <div className="relative order-1 h-[56dvh] min-h-[340px] min-w-0 overflow-hidden lg:order-2 lg:h-auto lg:flex-1">
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
        {selected && (
          <div className="absolute inset-x-2 bottom-2 z-10 max-h-[78%] lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-4 lg:w-[360px] lg:max-h-[calc(100%-2rem)]">
            <SidePanel pair={selected} asOf={data.metadata.monitoring_data_through} onClose={() => set('pair', null)} />
          </div>
        )}
      </div>
    </div>
  );
}
