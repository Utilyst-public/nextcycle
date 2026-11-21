import { AttributionControl, LngLatBounds, Map as MlMap, Popup, setWorkerUrl, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SampleResult, Station, WaterbodyPair } from '@/data/schema';
import { fmtDate } from '@/lib/format';
import { useI18n } from '@/i18n';
import { tokens as T } from '@/styles/tokens';

setWorkerUrl(mapWorkerUrl);

type Props = {
  pair: WaterbodyPair;
  pairs: WaterbodyPair[];
  stations: Station[];
  samples?: SampleResult[];
  sampleCountStatus: 'loading' | 'ready' | 'unavailable';
  cutoff: string;
};

const featureCollection = (features: unknown[]) => ({ type: 'FeatureCollection', features });

function positionsOf(geometry: WaterbodyPair['geometry']): [number, number][] {
  if (geometry.type === 'LineString') return geometry.coordinates;
  if (geometry.type === 'MultiLineString' || geometry.type === 'Polygon') return geometry.coordinates.flat();
  return geometry.coordinates.flat(2);
}

function stationFeatures(stations: Station[], samples: SampleResult[] | undefined) {
  const counts = new Map<string, number>();
  for (const sample of samples ?? []) {
    if (!sample.before_cutoff) counts.set(sample.station_code, (counts.get(sample.station_code) ?? 0) + 1);
  }
  return featureCollection(stations.map((station) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [station.lon, station.lat] },
    properties: {
      code: station.station_code,
      name: station.station_name,
      samples_since_cutoff: counts.get(station.station_code) ?? 0,
    },
  })));
}

export default function WaterbodyLocatorMap({ pair, pairs, stations, samples, sampleCountStatus, cutoff }: Props) {
  const { t } = useI18n();
  const mapElement = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const interactiveRef = useRef(false);
  const translateRef = useRef(t);
  const sampleCountStatusRef = useRef(sampleCountStatus);
  translateRef.current = t;
  sampleCountStatusRef.current = sampleCountStatus;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const linkedStations = useMemo(
    () => stations.filter((station) => station.waterbody_id === pair.waterbody_id),
    [pair.waterbody_id, stations],
  );
  const contextualPairs = useMemo(
    () => pairs.filter((other) => other.region_id === pair.region_id && other.pair_id !== pair.pair_id),
    [pair.pair_id, pair.region_id, pairs],
  );

  useEffect(() => {
    if (!mapElement.current) return;
    setReady(false);
    setFailed(false);
    setInteractive(false);
    interactiveRef.current = false;
    const map = new MlMap({
      container: mapElement.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [pair.centroid.lon, pair.centroid.lat],
      zoom: 10,
      attributionControl: false,
      scrollZoom: false,
      dragPan: false,
      dragRotate: false,
      doubleClickZoom: false,
      keyboard: false,
      boxZoom: false,
      touchZoomRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    map.addControl(new AttributionControl({
      compact: false,
      customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>',
    }), 'bottom-right');
    const styleTimeout = window.setTimeout(() => {
      if (!map.isStyleLoaded()) setFailed(true);
    }, 8000);
    const popup = new Popup({ closeButton: true, closeOnClick: true, maxWidth: '260px' });

    map.on('error', (event) => {
      if (!map.isStyleLoaded()) setFailed(true);
      console.warn('[NextCycle locator map] MapLibre error:', event.error);
    });
    map.once('style.load', () => {
      try {
        const otherFeatures = contextualPairs.map((other) => ({
          type: 'Feature',
          geometry: other.geometry,
          properties: { pair_id: other.pair_id },
        }));
        const selectedFeature = {
          type: 'Feature',
          geometry: pair.geometry,
          properties: { pair_id: pair.pair_id },
        };
        map.addSource('locator-waters', {
          type: 'geojson',
          data: featureCollection([...otherFeatures, selectedFeature]) as never,
        });
        map.addSource('locator-stations', {
          type: 'geojson',
          data: stationFeatures(linkedStations, samples) as never,
        });
        map.addLayer({
          id: 'locator-other-waters',
          type: 'line',
          source: 'locator-waters',
          filter: ['!=', ['get', 'pair_id'], pair.pair_id],
          paint: { 'line-color': T.slate, 'line-width': 1.5, 'line-opacity': 0.28 },
        });
        map.addLayer({
          id: 'locator-selected-fill',
          type: 'fill',
          source: 'locator-waters',
          filter: ['==', ['get', 'pair_id'], pair.pair_id],
          paint: { 'fill-color': T.teal400, 'fill-opacity': 0.18 },
        });
        map.addLayer({
          id: 'locator-selected-outline',
          type: 'line',
          source: 'locator-waters',
          filter: ['==', ['get', 'pair_id'], pair.pair_id],
          paint: { 'line-color': T.deepTeal, 'line-width': 5, 'line-opacity': 0.96 },
        });
        map.addLayer({
          id: 'locator-stations',
          type: 'circle',
          source: 'locator-stations',
          paint: {
            'circle-radius': 6,
            'circle-color': T.cyan,
            'circle-stroke-color': T.deepTeal,
            'circle-stroke-width': 2,
          },
        });

        const bounds = new LngLatBounds();
        for (const coordinate of positionsOf(pair.geometry)) bounds.extend(coordinate);
        if (bounds.isEmpty()) map.setCenter([pair.centroid.lon, pair.centroid.lat]);
        else map.fitBounds(bounds, { padding: { top: 42, right: 42, bottom: 42, left: 42 }, maxZoom: 13, duration: 0 });
        window.clearTimeout(styleTimeout);
        setReady(true);
      } catch (error) {
        console.error('[NextCycle locator map] Failed to add locator features:', error);
        setFailed(true);
      }
    });

    map.on('click', (event: MapMouseEvent) => {
      if (!interactiveRef.current) return;
      const station = map.queryRenderedFeatures(event.point, { layers: ['locator-stations'] })[0];
      if (!station) { popup.remove(); return; }
      const code = String(station.properties?.code ?? '');
      const name = String(station.properties?.name ?? code);
      const count = Number(station.properties?.samples_since_cutoff ?? 0);
      const content = document.createElement('div');
      content.className = 'locator-popup text-sm text-navy';
      const heading = document.createElement('strong');
      heading.textContent = code;
      const stationName = document.createElement('p');
      stationName.className = 'mt-1';
      stationName.textContent = name;
      const countLine = document.createElement('p');
      countLine.className = 'mt-2 text-xs text-slate';
      const translate = translateRef.current;
      const countStatus = sampleCountStatusRef.current;
      countLine.textContent = countStatus === 'ready'
        ? translate('locatorSamplesSinceCutoff', { count, cutoff: fmtDate(cutoff) })
        : translate(countStatus === 'loading' ? 'locatorSamplesLoading' : 'locatorSamplesUnavailable');
      content.append(heading, stationName, countLine);
      popup.setLngLat(event.lngLat).setDOMContent(content).addTo(map);
    });
    map.on('mousemove', (event) => {
      if (!interactiveRef.current) return;
      map.getCanvas().style.cursor = map.queryRenderedFeatures(event.point, { layers: ['locator-stations'] }).length ? 'pointer' : '';
    });

    return () => {
      window.clearTimeout(styleTimeout);
      popup.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [contextualPairs, linkedStations, pair]);

  useEffect(() => {
    if (!ready) return;
    const source = mapRef.current?.getSource('locator-stations') as GeoJSONSource | undefined;
    source?.setData(stationFeatures(linkedStations, samples) as never);
  }, [linkedStations, ready, samples]);

  const activateMap = () => {
    const map = mapRef.current;
    if (!map || !ready) return;
    interactiveRef.current = true;
    setInteractive(true);
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.doubleClickZoom.enable();
    map.keyboard.enable();
    map.touchZoomRotate.enable();
  };

  return (
    <div className="relative h-[320px] w-full bg-mist">
      <div ref={mapElement} role="region" aria-label={t('locatorMapTitle')} className="h-full w-full" />
      {!ready && !failed && <div role="status" className="absolute inset-x-3 bottom-3 z-10 rounded bg-white/95 px-3 py-2 text-sm text-navy">{t('mapLoadingMessage')}</div>}
      {failed && <div role="alert" className="absolute inset-x-3 bottom-3 z-10 rounded border border-line bg-white/95 p-3 text-sm text-navy">{t('mapListFallback')}</div>}
      {ready && !interactive && <button
        type="button"
        onClick={activateMap}
        className="absolute inset-0 z-20 flex items-center justify-center bg-white/35 p-4 text-center focus-visible:outline focus-visible:outline-3 focus-visible:outline-cyan"
      >
        <span className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold text-teal shadow-md">{t('activateLocatorMap')}</span>
      </button>}
    </div>
  );
}
