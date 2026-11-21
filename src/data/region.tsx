import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDataset } from './provider';

type RegionOption = { region_id: string; region_name: string };
type RegionContextValue = {
  regionId: string;
  regions: RegionOption[];
  setRegionId: (regionId: string) => void;
};

const DEFAULT_REGION = 'R9';
const FALLBACK_REGIONS: RegionOption[] = [
  { region_id: 'R9', region_name: 'San Diego Region' },
  { region_id: 'R3', region_name: 'Central Coast Region' },
];
const RegionContext = createContext<RegionContextValue | null>(null);

export function RegionProvider({ children }: { children: ReactNode }) {
  const { state } = useDataset();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const regions = state.status === 'ready' ? state.data.metadata.regions : FALLBACK_REGIONS;
  const regionIds = useMemo(() => new Set(regions.map((region) => region.region_id)), [regions]);
  const queryRegion = searchParams.get('region');
  const detailPairId = location.pathname.match(/^\/w\/([^/]+)/)?.[1];
  const detailRegion = state.status === 'ready'
    ? state.data.pairs.find((pair) => pair.pair_id === detailPairId)?.region_id
    : undefined;
  const [regionId, setRegionIdState] = useState(DEFAULT_REGION);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (queryRegion && regionIds.has(queryRegion)) {
      setRegionIdState(queryRegion);
      setInitialized(true);
      return;
    }
    if (!initialized && state.status === 'ready') {
      const inferred = detailRegion && regionIds.has(detailRegion) ? detailRegion : DEFAULT_REGION;
      setRegionIdState(inferred);
      setInitialized(true);
    }
  }, [detailRegion, initialized, queryRegion, regionIds, state.status]);

  useEffect(() => {
    if (!initialized) return;
    if (location.pathname.startsWith('/embed/')) return;
    if (queryRegion === regionId) return;
    const next = new URLSearchParams(searchParams);
    next.set('region', regionId);
    setSearchParams(next, { replace: true });
  }, [initialized, location.pathname, queryRegion, regionId, searchParams, setSearchParams]);

  const setRegionId = (nextRegionId: string) => {
    if (!regionIds.has(nextRegionId) || nextRegionId === regionId) return;
    setRegionIdState(nextRegionId);
    setInitialized(true);
    const currentPair = state.status === 'ready'
      ? state.data.pairs.find((pair) => pair.pair_id === detailPairId)
      : undefined;
    if (currentPair && currentPair.region_id !== nextRegionId) {
      navigate({ pathname: '/', search: `?region=${encodeURIComponent(nextRegionId)}` }, { replace: true });
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set('region', nextRegionId);
    if (location.pathname === '/map') {
      next.delete('pair');
      next.delete('focus');
    }
    setSearchParams(next, { replace: true });
  };

  return <RegionContext.Provider value={{ regionId, regions, setRegionId }}>{children}</RegionContext.Provider>;
}

export function useRegion() {
  const context = useContext(RegionContext);
  if (!context) throw new Error('useRegion must be used inside RegionProvider');
  return context;
}
