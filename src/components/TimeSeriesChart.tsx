import { CartesianGrid, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from 'recharts';
import type { SampleFile, SampleResult, WaterbodyPair } from '@/data/schema';
import { fmtDate, fmtNum, isoToMs } from '@/lib/format';
import { tokens as T } from '@/styles/tokens';
import { useI18n } from '@/i18n';

type Pt = { t: number; v: number; r: SampleResult };

const DAY = 86400000;

export interface TimeSeriesChartProps {
  pair: WaterbodyPair;
  samples: SampleFile;
  cutoff: string;
  width?: number;
  height?: number;
  animate?: boolean;
}

export default function TimeSeriesChart({ samples, cutoff, width, height = 340, animate = true }: TimeSeriesChartProps) {
  const { t } = useI18n();
  const pts: Pt[] = samples.results.filter((r): r is SampleResult & { value: number } => r.value !== null).map((r) => ({ t: isoToMs(r.date), v: r.value, r }));
  const pre = pts.filter((p) => p.r.screening_eligible && p.r.before_cutoff && !p.r.exceeds);
  const post = pts.filter((p) => p.r.screening_eligible && !p.r.before_cutoff && !p.r.exceeds);
  const ex = pts.filter((p) => p.r.screening_eligible && p.r.exceeds);
  const pending = pts.filter((p) => !p.r.screening_eligible);
  const dates = samples.results.map((r) => isoToMs(r.date));

  const cutoffMs = isoToMs(cutoff);
  const tMin = Math.min(...dates) - 60 * DAY;
  const tMax = Math.max(...dates) + 60 * DAY;
  const y0 = new Date(tMin).getUTCFullYear() + 1;
  const y1 = new Date(tMax).getUTCFullYear();
  const ticks: number[] = [];
  for (let y = y0; y <= y1; y++) ticks.push(Date.UTC(y, 0, 1));

  const crit = [samples.criterion_value, ...(samples.criterion_value_upper !== null ? [samples.criterion_value_upper] : [])];
  const vals = [...pts.map((p) => p.v), ...crit];
  const vMax = Math.max(...vals);
  const vMin = Math.min(...vals);
  const span = Math.max(vMax - vMin, Math.abs(vMax) * 0.05, 0.1);
  const yLo = samples.criterion_direction === 'upper' ? 0 : Math.max(0, Math.floor(vMin - span * 0.15));
  const yHi = Math.ceil((vMax + span * 0.12) * 100) / 100;

  const critLabel = (v: number, which: 'min' | 'max' | 'only') =>
    `${t(which === 'min' ? 'lowerLimit' : which === 'max' ? 'upperLimit' : 'criterion')} ${fmtNum(v)} ${samples.unit}`;

  const chart = (
    <ScatterChart width={width} height={height} margin={{ top: 24, right: 24, bottom: 8, left: 4 }} style={{ fontFamily: 'Inter, Arial, sans-serif' }}>
      <CartesianGrid stroke={T.line} vertical={false} />
      <ReferenceArea x1={cutoffMs} x2={tMax} fill={T.mist} fillOpacity={0.7} ifOverflow="hidden" />
      <XAxis
        type="number"
        dataKey="t"
        domain={[tMin, tMax]}
        ticks={ticks}
        tickFormatter={(t: number) => String(new Date(t).getUTCFullYear())}
        stroke={T.line}
        tick={{ fill: T.navy, fontSize: 12 }}
        tickLine={false}
        allowDataOverflow
      />
      <YAxis
        type="number"
        dataKey="v"
        domain={[yLo, yHi]}
        stroke={T.line}
        tick={{ fill: T.navy, fontSize: 12 }}
        tickLine={false}
        width={56}
        tickFormatter={(v: number) => fmtNum(v, 2)}
        label={{ value: samples.unit, angle: -90, position: 'insideLeft', fill: T.slate, fontSize: 12, dy: 30 }}
      />
      <ZAxis range={[52, 52]} />
      {samples.criterion_direction === 'range' ? (
        <>
          <ReferenceLine y={samples.criterion_value} stroke={T.deepTeal} strokeWidth={1.5} label={{ value: critLabel(samples.criterion_value, 'min'), position: 'insideBottomRight', fill: T.deepTeal, fontSize: 12, fontWeight: 600 }} />
          <ReferenceLine y={samples.criterion_value_upper ?? 0} stroke={T.deepTeal} strokeWidth={1.5} label={{ value: critLabel(samples.criterion_value_upper ?? 0, 'max'), position: 'insideTopRight', fill: T.deepTeal, fontSize: 12, fontWeight: 600 }} />
        </>
      ) : (
        <ReferenceLine
          y={samples.criterion_value}
          stroke={T.deepTeal}
          strokeWidth={1.5}
          label={{ value: `${critLabel(samples.criterion_value, 'only')} (${t(samples.criterion_direction === 'upper' ? 'maximum' : 'minimum')})`, position: samples.criterion_direction === 'upper' ? 'insideTopRight' : 'insideBottomRight', fill: T.deepTeal, fontSize: 12, fontWeight: 600 }}
        />
      )}
      <ReferenceLine x={cutoffMs} stroke={T.navy} strokeDasharray="5 4" label={{ value: t('cutoffYear', { year: new Date(`${cutoff}T00:00:00Z`).getUTCFullYear() }), position: 'top', fill: T.navy, fontSize: 12, fontWeight: 600 }} />
      <Tooltip
        cursor={{ stroke: T.line }}
        content={({ active, payload }) => {
          if (!active || !payload?.length) return null;
          const p = payload[0].payload as Pt;
          return (
            <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs text-navy">
              <p className="font-semibold">{fmtDate(p.r.date)}</p>
              <p className="num mt-0.5">
                {p.r.qualifier === 'ND' ? `${t('notDetectedLimit')} ` : p.r.qualifier === 'DNQ' ? t('detectedNotQuantified') : p.r.qualifier === '<' ? `${t('belowValue')} ` : ''}
                {fmtNum(p.v)} {samples.unit}
              </p>
              <p className="mt-0.5 text-slate">{t('station')} <span className="num">{p.r.station_code}</span></p>
              <p className="mt-0.5">{!p.r.screening_eligible ? t('qaPendingTooltip') : p.r.exceeds ? t('outsideCriterionStatus') : t('meetsCriterionStatus')} · {p.r.before_cutoff ? t('beforeCutoff') : t('sinceCutoff')}</p>
            </div>
          );
        }}
      />
      <Scatter name={t('beforeCutoff')} data={pre} fill={T.cyan} isAnimationActive={animate} />
      <Scatter name={t('sinceCutoff')} data={post} fill={T.deepTeal} isAnimationActive={animate} />
      <Scatter name={t('exceedsCriterion')} data={ex} shape="triangle" fill={T.amber} stroke={T.amberText} strokeWidth={1.2} isAnimationActive={animate} />
      <Scatter name={t('pendingQa')} data={pending} fill={T.slate} isAnimationActive={animate} />
    </ScatterChart>
  );

  return width ? chart : <ResponsiveContainer width="100%" height={height}>{chart}</ResponsiveContainer>;
}

export function ChartLegend({ pair }: { pair: WaterbodyPair }) {
  const { t } = useI18n();
  const item = 'inline-flex items-center gap-1.5';
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-navy">
      <li className={item}><svg width="12" height="12" aria-hidden><circle cx="6" cy="6" r="4.5" fill={T.cyan} /></svg>{t('beforeCutoff')}</li>
      <li className={item}><svg width="12" height="12" aria-hidden><circle cx="6" cy="6" r="4.5" fill={T.deepTeal} /></svg>{t('sinceCutoff')}</li>
      <li className={item}><svg width="12" height="12" aria-hidden><path d="M6 1 L11 11 L1 11 Z" fill={T.amber} stroke={T.amberText} /></svg>{t('exceedsCriterionLegend', { direction: t(pair.criterion_direction === 'upper' ? 'aboveDirection' : pair.criterion_direction === 'lower' ? 'belowDirection' : 'outsideDirection') })}</li>
      <li className={item}><svg width="12" height="12" aria-hidden><circle cx="6" cy="6" r="4.5" fill={T.slate} /></svg>{t('pendingQa')}</li>
      <li className={item}><svg width="16" height="12" aria-hidden><line x1="0" y1="6" x2="16" y2="6" stroke={T.deepTeal} strokeWidth="2" /></svg>{t('criterion')}</li>
      <li className={item}><svg width="16" height="12" aria-hidden><line x1="0" y1="6" x2="16" y2="6" stroke={T.navy} strokeDasharray="4 3" strokeWidth="1.5" /></svg>{t('dataCutoff')}</li>
      <li className="basis-full text-slate">{t('censoredNotPlotted')}</li>
    </ul>
  );
}
