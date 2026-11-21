import { AttributionControl, Map as MlMap, NavigationControl, Popup, setWorkerUrl, type GeoJSONSource, type MapMouseEvent } from 'maplibre-gl';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { Station, WaterbodyPair } from '@/data/schema';
import { cn } from '@/lib/format';
import { tokens as T } from '@/styles/tokens';
import { useI18n } from '@/i18n';

// Vite relocates the main bundle; explicitly bundle its companion module worker.
setWorkerUrl(mapWorkerUrl);

export interface MapViewProps {
  pairs: WaterbodyPair[];
  stations: Station[];
  showStations?: boolean;
  emphasizeDac?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  compact?: boolean;
  className?: string;
  ariaLabel: string;
  tribalGeojson?: unknown;
  showTribal?: boolean;
}

type FC = Parameters<GeoJSONSource['setData']>[0];

const pairFC = (pairs: WaterbodyPair[]) => ({
  type: 'FeatureCollection',
  features: pairs.map((p) => ({ type: 'Feature', geometry: p.geometry as never, properties: { pair_id: p.pair_id, flag: p.screening_flag, dac: p.disadvantaged_community, name: p.waterbody_name } })),
}) as FC;
const centroidFC = (pairs: WaterbodyPair[]) => ({
  type: 'FeatureCollection',
  features: pairs.map((p) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.centroid.lon, p.centroid.lat] }, properties: { pair_id: p.pair_id, flag: p.screening_flag, dac: p.disadvantaged_community } })),
}) as FC;
const stationFC = (stations: Station[]) => ({
  type: 'FeatureCollection',
  features: stations.map((s) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [s.lon, s.lat] }, properties: { code: s.station_code, name: s.station_name, n: s.sample_count, link: s.link_method } })),
}) as FC;

const flagColor = ['match', ['get', 'flag'], 'Delisting candidate', T.linkTeal, 'Still exceeding', T.amber, T.slate];

function positionsOf(geometry: WaterbodyPair['geometry']): [number, number][] {
  if (geometry.type === 'LineString') return geometry.coordinates;
  if (geometry.type === 'MultiLineString' || geometry.type === 'Polygon') return geometry.coordinates.flat();
  return geometry.coordinates.flat(2);
}

function boundsOf(pairs: WaterbodyPair[]): [[number, number], [number, number]] | null {
  if (!pairs.length) return null;
  const pts = pairs.flatMap((p) => positionsOf(p.geometry));
  const lons = pts.map((c) => c[0]);
  const lats = pts.map((c) => c[1]);
  return [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
}

export default function MapView({ pairs, stations, showStations = false, emphasizeDac = false, selectedId = null, onSelect, compact, className, ariaLabel, tribalGeojson, showTribal = false }: MapViewProps) {
  const { t } = useI18n();
  const translateRef = useRef(t);
  translateRef.current = t;
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const initializedMapRef = useRef<MlMap | null>(null);
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<'mapInitFailed' | 'mapStyleTimeout' | 'basemapLoadFailed' | 'layersLoadFailed' | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const initial = useRef({ pairs, stations });

  useEffect(() => {
    if (!el.current) return;
    // In React StrictMode the map effect is deliberately mounted, cleaned up,
    // then mounted again. Never let the previous instance's ready state permit
    // source updates against this new map before its style and layers exist.
    initializedMapRef.current = null;
    setReady(false);
    setFailure(null);
    let map: MlMap;
    try {
      map = new MlMap({
        container: el.current,
        style: 'https://tiles.openfreemap.org/styles/positron',
        center: [-117.15, 32.95],
        zoom: 8.4,
        attributionControl: false,
        scrollZoom: !compact,
        dragRotate: false,
        pitchWithRotate: false,
      });
    } catch {
      setFailure('mapInitFailed');
      return;
    }
    map.addControl(new AttributionControl({ compact: false, customAttribution: '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a>' }), 'bottom-right');
    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.touchZoomRotate.disableRotation();

    // Draw local monitoring features as soon as the style is available,
    // without waiting for every third-party basemap tile to finish.
    const styleTimeout = window.setTimeout(() => {
      if (!map.isStyleLoaded()) {
        const message = 'The OpenFreeMap style did not finish loading.';
        console.error(`[NextCycle map] ${message}`);
        setFailure('mapStyleTimeout');
      }
    }, 6000);

    map.on('error', (event) => {
      console.error('[NextCycle map] MapLibre reported an error:', event.error);
      if (!map.isStyleLoaded()) setFailure('basemapLoadFailed');
    });

    map.once('style.load', () => {
      try {
        const { pairs: ps, stations: ss } = initial.current;
        map.addSource('pairs', { type: 'geojson', data: pairFC(ps) });
        map.addSource('centroids', { type: 'geojson', data: centroidFC(ps) });
        map.addSource('stations', { type: 'geojson', data: stationFC(ss) });

        map.addLayer({ id: 'pairs-fill', type: 'fill', source: 'pairs', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': flagColor as never, 'fill-opacity': 0.22 } });
        map.addLayer({ id: 'pairs-dac', type: 'line', source: 'pairs', filter: ['==', ['get', 'dac'], true], layout: { 'line-cap': 'round', 'line-join': 'round', visibility: 'none' }, paint: { 'line-color': T.teal200, 'line-width': 16, 'line-opacity': 0.85 } });
        map.addLayer({ id: 'pairs-selected', type: 'line', source: 'pairs', filter: ['==', ['get', 'pair_id'], ''], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': T.deepTeal, 'line-width': 10, 'line-opacity': 0.9 } });
        map.addLayer({ id: 'pairs-casing', type: 'line', source: 'pairs', filter: ['==', ['get', 'flag'], 'Still exceeding'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': T.amberText, 'line-width': 6.5 } });
        map.addLayer({ id: 'pairs-solid', type: 'line', source: 'pairs', filter: ['!=', ['get', 'flag'], 'Under-sampled'], layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': flagColor as never, 'line-width': ['match', ['get', 'flag'], 'Still exceeding', 3.5, 4] } });
        map.addLayer({ id: 'pairs-dashed', type: 'line', source: 'pairs', filter: ['==', ['get', 'flag'], 'Under-sampled'], layout: { 'line-join': 'round' }, paint: { 'line-color': T.slate, 'line-width': 3.5, 'line-dasharray': [2, 1.6] } });
        map.addLayer({ id: 'centroid-dac', type: 'circle', source: 'centroids', filter: ['==', ['get', 'dac'], true], layout: { visibility: 'none' }, paint: { 'circle-radius': 12, 'circle-color': T.teal200, 'circle-opacity': 0.9 } });
        map.addLayer({
          id: 'centroids',
          type: 'circle',
          source: 'centroids',
          paint: {
            'circle-radius': 6,
            'circle-color': ['match', ['get', 'flag'], 'Under-sampled', T.white, flagColor] as never,
            'circle-stroke-color': ['match', ['get', 'flag'], 'Still exceeding', T.amberText, 'Under-sampled', T.slate, T.white] as never,
            'circle-stroke-width': 2,
          },
        });
        map.addLayer({ id: 'stations', type: 'circle', source: 'stations', paint: { 'circle-radius': 4, 'circle-color': T.cyan, 'circle-stroke-color': T.navy, 'circle-stroke-width': 1.2 } });

        const b = boundsOf(ps);
        if (b) map.fitBounds(b, { padding: 40, duration: 0 });
        window.clearTimeout(styleTimeout);
        initializedMapRef.current = map;
        setFailure(null);
        setReady(true);
      } catch (error) {
        console.error('[NextCycle map] Failed to add waterbody or station layers:', error);
        setFailure('layersLoadFailed');
      }
      });

    const pairLayers = ['centroids', 'pairs-solid', 'pairs-dashed', 'pairs-casing', 'pairs-fill'];
    const hit = (e: MapMouseEvent) => {
      const { x, y } = e.point;
      const box: [[number, number], [number, number]] = [[x - 7, y - 7], [x + 7, y + 7]];
      const layers = [...pairLayers, ...(map.getLayoutProperty('stations', 'visibility') === 'visible' ? ['stations'] : [])];
      return map.queryRenderedFeatures(box, { layers });
    };
    let popup: Popup | null = null;
    map.on('click', (e) => {
      const fs = hit(e);
      const station = fs.find((f) => f.layer.id === 'stations');
      const pair = fs.find((f) => f.layer.id !== 'stations');
      popup?.remove();
      if (pair) return onSelectRef.current?.(String(pair.properties.pair_id));
      if (station) {
        const div = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = String(station.properties.name);
        const m = document.createElement('div');
        m.style.fontSize = '12px';
        const sampleCount = Number(station.properties.n);
        const translate = translateRef.current;
        const method = translate(station.properties.link === 'Fact sheet' ? 'factSheetLink' : 'spatialJoin');
        m.textContent = translate('stationPopup', { code: String(station.properties.code), count: translate('sampleCountLabel', { count: sampleCount }), method });
        div.append(title, m);
        popup = new Popup({ closeButton: true, offset: 8 }).setLngLat(e.lngLat).setDOMContent(div).addTo(map);
        return;
      }
      onSelectRef.current?.(null);
    });
    map.on('mousemove', (e) => {
      if (!map.isStyleLoaded()) return;
      map.getCanvas().style.cursor = hit(e).length ? 'pointer' : '';
    });
    mapRef.current = map;
    return () => {
      window.clearTimeout(styleTimeout);
      if (initializedMapRef.current === map) initializedMapRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || initializedMapRef.current !== map) return;
    const pairsSource = map.getSource('pairs') as GeoJSONSource | undefined;
    const centroidsSource = map.getSource('centroids') as GeoJSONSource | undefined;
    if (!pairsSource || !centroidsSource) return;
    pairsSource.setData(pairFC(pairs));
    centroidsSource.setData(centroidFC(pairs));
  }, [pairs, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || initializedMapRef.current !== map) return;
    const stationsSource = map.getSource('stations') as GeoJSONSource | undefined;
    if (!stationsSource) return;
    stationsSource.setData(stationFC(stations));
    map.setLayoutProperty('stations', 'visibility', showStations ? 'visible' : 'none');
  }, [stations, showStations, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || initializedMapRef.current !== map) return;
    map.setLayoutProperty('pairs-dac', 'visibility', emphasizeDac ? 'visible' : 'none');
    map.setLayoutProperty('centroid-dac', 'visibility', emphasizeDac ? 'visible' : 'none');
  }, [emphasizeDac, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || initializedMapRef.current !== map || !tribalGeojson) return;
    const source = map.getSource('tribal-lands') as GeoJSONSource | undefined;
    if (source) source.setData(tribalGeojson as FC);
    else {
      map.addSource('tribal-lands', { type: 'geojson', data: tribalGeojson as FC });
      map.addLayer({ id: 'tribal-lands-fill', type: 'fill', source: 'tribal-lands', paint: { 'fill-color': T.teal200, 'fill-opacity': 0.22 } }, 'pairs-fill');
      map.addLayer({ id: 'tribal-lands-outline', type: 'line', source: 'tribal-lands', paint: { 'line-color': T.deepTeal, 'line-width': 1.5, 'line-dasharray': [3, 2] } }, 'pairs-fill');
    }
    map.setLayoutProperty('tribal-lands-fill', 'visibility', showTribal ? 'visible' : 'none');
    map.setLayoutProperty('tribal-lands-outline', 'visibility', showTribal ? 'visible' : 'none');
  }, [tribalGeojson, showTribal, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || initializedMapRef.current !== map) return;
    map.setFilter('pairs-selected', ['==', ['get', 'pair_id'], selectedId ?? '']);
    const p = selectedId ? initial.current.pairs.find((x) => x.pair_id === selectedId) : null;
    if (p && !compact) map.easeTo({ center: [p.centroid.lon, p.centroid.lat], zoom: Math.max(map.getZoom(), 10.5), duration: 700 });
  }, [selectedId, ready, compact]);

  return (
    <div className={cn('relative h-full w-full bg-mist', className)}>
      <div ref={el} role="region" aria-label={ariaLabel} className="h-full w-full" />
      {!ready && !failure && <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded border border-line bg-white px-3 py-2 text-sm text-navy" role="status">{t('mapLoadingMessage')}</div>}
      {failure && <div className="absolute inset-x-4 bottom-4 z-10 rounded border border-line bg-white p-4 text-sm text-navy shadow-sm" role="alert">{t(failure)} <span className="block text-slate">{t('mapListFallback')}</span></div>}
    </div>
  );
}
