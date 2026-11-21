import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { SampleFile, WaterbodyPair } from '@/data/schema';
import { useI18n } from '@/i18n';

const TimeSeriesChart = lazy(() => import('./TimeSeriesChart'));
const ChartLegend = lazy(() => import('./TimeSeriesChart').then((m) => ({ default: m.ChartLegend })));

/** Below-fold visualization: preserve its space without parsing Recharts on entry. */
export function DeferredResultsChart({ pair, samples, cutoff }: { pair: WaterbodyPair; samples: SampleFile; cutoff: string }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: '100px' });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const placeholder = <div className="skeleton h-[390px]" aria-label={t('loadingResults')} role="status" />;
  return <div ref={ref} className="min-h-[390px]">
    {visible ? <Suspense fallback={placeholder}>
      <TimeSeriesChart pair={pair} samples={samples} cutoff={cutoff} />
      <div className="mt-4"><ChartLegend pair={pair} /></div>
    </Suspense> : placeholder}
  </div>;
}
