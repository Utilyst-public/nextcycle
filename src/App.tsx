import { Component, lazy, Suspense, useEffect, type ReactNode } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Footer } from '@/components/Footer';
import { Nav } from '@/components/Nav';
import { SampleBanner } from '@/components/SampleBanner';
import { ErrorState, Loading } from '@/components/States';
import { ToastProvider } from '@/components/Toast';
import { DataProvider, useDataset } from '@/data/provider';
import { RegionProvider, useRegion } from '@/data/region';
import type { Dataset } from '@/data/schema';
import Home from '@/routes/Home';
const MapPage = lazy(() => import('@/routes/MapPage'));
import NotFound from '@/routes/NotFound';
const About = lazy(() => import('@/routes/About'));
const DataGaps = lazy(() => import('@/routes/DataGaps'));
const Method = lazy(() => import('@/routes/Method'));
const Utilities = lazy(() => import('@/routes/Utilities'));
const Watch = lazy(() => import('@/routes/Watch'));
const Updates = lazy(() => import('@/routes/Updates'));
const Api = lazy(() => import('@/routes/Api'));
const Showcase = lazy(() => import('@/routes/Showcase'));
const Embed = lazy(() => import('@/routes/Embed'));
import { I18nProvider } from '@/i18n';
import { OptionalAnalytics } from '@/components/OptionalAnalytics';

const Detail = lazy(() => import('@/routes/Detail'));

class Boundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }
  render() {
    return this.state.error ? <ErrorState error={this.state.error} onRetry={() => this.setState({ error: null })} /> : this.props.children;
  }
}

function WithData({ render, allRegions = false }: { render: (d: Dataset) => ReactNode; allRegions?: boolean }) {
  const { state, retry } = useDataset();
  const { regionId } = useRegion();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') return <ErrorState error={state.error} onRetry={retry} />;
  if (allRegions) return <>{render(state.data)}</>;
  const pairs = state.data.pairs.filter((pair) => pair.region_id === regionId);
  const waterbodyIds = new Set(pairs.map((pair) => pair.waterbody_id));
  const data = {
    ...state.data,
    pairs,
    stations: state.data.stations.filter((station) => waterbodyIds.has(station.waterbody_id)),
  };
  return <>{render(data)}</>;
}

function DetailRoute() {
  const { pairId = '' } = useParams();
  return <Suspense fallback={<div className="min-h-[100dvh]"><Loading /></div>}><WithData render={(d) => <Detail key={pairId} data={d} pairId={pairId} />} /></Suspense>;
}

function Shell() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  const isMap = pathname === '/map';
  if (pathname.startsWith('/embed/')) {
    return <Boundary resetKey={pathname}><Outlet /></Boundary>;
  }
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <Nav />
      <SampleBanner />
      <main id="main" className="flex-1" key={pathname}>
        <Boundary resetKey={pathname}>
          <div>
            <Suspense fallback={<div className="min-h-[100dvh]"><Loading /></div>}><Outlet /></Suspense>
          </div>
        </Boundary>
      </main>
      {!isMap && <Footer />}
    </div>
  );
}

function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
  return (
    <I18nProvider>
    <DataProvider>
      <ToastProvider>
        <BrowserRouter basename={basename} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <RegionProvider>
          <OptionalAnalytics />
          <Routes>
            <Route path="embed/:pairId" element={<Suspense fallback={<Loading />}><WithData allRegions render={(d) => <Embed data={d} />} /></Suspense>} />
            <Route element={<Shell />}>
              <Route index element={<WithData render={(d) => <Home data={d} />} />} />
              <Route path="watch" element={<WithData render={(d) => <Watch data={d} />} />} />
              <Route path="map" element={<Suspense fallback={<Loading />}><WithData render={(d) => <MapPage data={d} />} /></Suspense>} />
              <Route path="w/:pairId" element={<DetailRoute />} />
              <Route path="data-gaps" element={<WithData render={(d) => <DataGaps data={d} />} />} />
              <Route path="method" element={<WithData render={(d) => <Method data={d} />} />} />
              <Route path="utilities" element={<WithData render={(d) => <Utilities data={d} />} />} />
              <Route path="about" element={<WithData render={(d) => <About data={d} />} />} />
              <Route path="updates" element={<WithData render={(d) => <Updates data={d} />} />} />
              <Route path="api" element={<WithData render={(d) => <Api data={d} />} />} />
              <Route path="showcase" element={<WithData render={(d) => <Showcase data={d} />} />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
          </RegionProvider>
        </BrowserRouter>
      </ToastProvider>
    </DataProvider>
    </I18nProvider>
  );
}

export default App;
