import { Search, MapPin } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Dataset } from '@/data/schema';
import { useI18n } from '@/i18n';
import { pollutantName } from '@/i18n/messages';
import { ValidationBadge } from './RegionValidation';

type Place = { pair_id: string; waterbody_name: string; county: string; cities?: string[]; zips?: string[]; lat: number; lon: number };
type GeoError = 'geoUnsupported' | 'geoDenied' | 'geoFailed';
const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
const rad = (n: number) => (n * Math.PI) / 180;
function miles(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const dLat = rad(b.lat - a.lat); const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(Math.min(1, h)), Math.sqrt(Math.max(0, 1 - h)));
}

export function Discovery({ data, compact = false }: { data: Dataset; compact?: boolean }) {
  const { t, flagLabel } = useI18n();
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lon: number } | null>(null);
  const [geoError, setGeoError] = useState<GeoError | null>(null);
  const [locating, setLocating] = useState(false);
  const resultsRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    let alive = true;
    fetch(`${base}data/places.json`).then(async (r) => {
      if (!r.ok) throw new Error('missing');
      const json: unknown = await r.json();
      if (!Array.isArray(json) || !json.every((p) => p && typeof p.pair_id === 'string' && typeof p.waterbody_name === 'string' && typeof p.county === 'string' && typeof p.lat === 'number' && typeof p.lon === 'number' && (p.cities === undefined || (Array.isArray(p.cities) && p.cities.every((v: unknown) => typeof v === 'string'))) && (p.zips === undefined || (Array.isArray(p.zips) && p.zips.every((v: unknown) => typeof v === 'string'))))) throw new Error('invalid');
      if (alive) setPlaces(json as Place[]);
    }).catch(() => { if (alive) setPlaces(null); });
    return () => { alive = false; };
  }, []);
  const hits = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return [];
    const placeById = new Map((places ?? []).map((p) => [p.pair_id, p]));
    return data.pairs.filter((pair) => {
      const p = placeById.get(pair.pair_id);
      return [pair.waterbody_name, pair.county, ...(p?.cities ?? []), ...(p?.zips ?? [])].some((v) => v.toLocaleLowerCase().includes(q));
    }).slice(0, 8);
  }, [data.pairs, places, query]);
  const nearest = useMemo(() => {
    if (!geo) return [];
    const byId = new Map((places ?? []).map((place) => [place.pair_id, place]));
    return data.pairs.filter((p) => p.official_status === 'Listed').map((pair) => {
      const place = byId.get(pair.pair_id);
      return { pair, distance: miles(geo, place ? { lat: place.lat, lon: place.lon } : pair.centroid) };
    }).sort((a, b) => a.distance - b.distance).slice(0, 5);
  }, [data.pairs, geo, places]);
  const locate = () => {
    setGeoError(null);
    if (!navigator.geolocation) { setGeoError('geoUnsupported'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setGeo({ lat: pos.coords.latitude, lon: pos.coords.longitude }); setLocating(false); },
      (err) => { setGeoError(err.code === err.PERMISSION_DENIED ? 'geoDenied' : 'geoFailed'); setLocating(false); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };
  return <section aria-labelledby="find-waters" className={`card ${compact ? 'p-4' : 'p-5 md:p-6'}`}>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 id="find-waters" className="label-caps text-link">{t('findTitle')}</h2><p className="mt-1 text-sm text-slate">{t('findHint')}</p></div>
      <button type="button" data-testid="button-geolocation" onClick={locate} disabled={locating} className="btn btn-ghost"><MapPin aria-hidden className="h-4 w-4" />{locating ? t('checkingLocation') : t('geoButton')}</button>
    </div>
    <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={(e) => { e.preventDefault(); resultsRef.current?.focus(); }}>
      <label className="sr-only" htmlFor={compact ? 'map-local-search' : 'home-local-search'}>{t('findPlaceholder')}</label>
      <input id={compact ? 'map-local-search' : 'home-local-search'} data-testid="input-local-search" value={query} onChange={(e) => setQuery(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-line bg-cloud px-3 py-2.5 text-sm text-navy" placeholder={t('findPlaceholder')} />
      <button className="btn btn-primary" type="submit"><Search aria-hidden className="h-4 w-4" />{t('findButton')}</button>
    </form>
    {query && <ul ref={resultsRef} tabIndex={-1} className="mt-3 divide-y divide-line focus-visible:outline-cyan" aria-live="polite">
      {hits.length ? hits.map((pair) => <li key={pair.pair_id} className="flex flex-wrap items-center gap-2 py-2"><Link className="font-semibold text-link hover:underline" to={`/w/${pair.pair_id}`}>{pair.waterbody_name}</Link><span className="text-xs text-slate">{t('countyName', { county: pair.county })} · {pollutantName(pair.pollutant)}</span><ValidationBadge regionId={pair.region_id} pairId={pair.pair_id} surface="discovery-search" /></li>) : <li className="py-2 text-sm text-slate">{t('noMatches')}</li>}
    </ul>}
    {geoError && <p role="status" className="mt-3 rounded-md bg-mist p-3 text-sm text-navy">{t(geoError)}</p>}
    {locating && <p role="status" className="mt-3 text-sm text-slate">{t('checkingLocation')}</p>}
    {geo && <div className="mt-4"><h3 className="text-sm font-semibold text-navy">{t('nearest')}</h3><ol className="mt-2 grid gap-2 sm:grid-cols-2">
      {nearest.map(({ pair, distance }) => <li key={pair.pair_id}><Link className="flex items-center justify-between gap-3 rounded-md bg-cloud p-3 text-sm hover:bg-mist" to={`/w/${pair.pair_id}`}><span><span className="font-semibold text-link">{pair.waterbody_name}</span><span className="mt-1 block text-xs text-navy">{pollutantName(pair.pollutant)} · {flagLabel(pair.screening_flag)}</span><ValidationBadge regionId={pair.region_id} pairId={pair.pair_id} surface="discovery-nearby" className="mt-1" /></span><span className="num shrink-0 text-xs text-slate">{t('distance', { distance: distance.toFixed(1) })}</span></Link></li>)}
    </ol></div>}
    <p className="mt-3 text-xs text-slate">{t('geoPrivacy')} {t('coverageNote')}</p>
  </section>;
}
