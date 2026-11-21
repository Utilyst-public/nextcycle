import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FLAG_VALUES, type DataStatus, type Dataset, type Flag } from '@/data/schema';
import { usePageTitle } from '@/lib/title';
import { useI18n } from '@/i18n';
import { dataStatusLabelKey, pollutantName } from '@/i18n/messages';
import { DataFreshnessNote } from '@/components/DataFreshnessNote';
import { ValidationBadge } from '@/components/RegionValidation';

type PairSnapshot = { pair_id: string; waterbody_name: string; pollutant: string; screening_flag: Flag; new_samples: number; new_exceedances: number; pending_new_samples: number; region_id?: string };
type Snapshot = { date: string; dataset_version: string; data_status: DataStatus; is_sample_data: boolean; qa_rule_version?: string; pairs: PairSnapshot[] };
const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
function isHistory(x: unknown): x is Snapshot[] {
  return Array.isArray(x) && x.every((r) => r && typeof r.date === 'string' && typeof r.dataset_version === 'string' &&
    ['illustrative', 'provisional', 'reviewed'].includes(r.data_status) && typeof r.is_sample_data === 'boolean' &&
    (r.qa_rule_version === undefined || typeof r.qa_rule_version === 'string') && Array.isArray(r.pairs) &&
    r.pairs.every((p: Snapshot['pairs'][number]) => typeof p.pair_id === 'string' && typeof p.waterbody_name === 'string' && typeof p.pollutant === 'string' &&
      FLAG_VALUES.includes(p.screening_flag) && Number.isFinite(p.new_samples) && Number.isFinite(p.new_exceedances) && Number.isFinite(p.pending_new_samples) &&
      (p.region_id === undefined || typeof p.region_id === 'string')));
}
export default function Updates({ data }: { data: Dataset }) {
  const { t, locale, flagLabel } = useI18n();
  const [history, setHistory] = useState<Snapshot[] | null>(null); const [failed, setFailed] = useState(false);
  usePageTitle(t('updatesTitle'));
  useEffect(() => {
    let alive = true;
    fetch(`${base}data/history.json`).then(async (r) => { if (!r.ok) throw new Error(); const j: unknown = await r.json(); if (!isHistory(j)) throw new Error(); if (alive) setHistory(j); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, []);
  const now = history?.at(-1);
  const compatible = now && history ? history.slice(0, -1).filter((h) => h.data_status === now.data_status && h.qa_rule_version === now.qa_rule_version) : [];
  const priorRuleChanged = Boolean(now && history?.slice(0, -1).some((h) => h.data_status === now.data_status && h.qa_rule_version !== now.qa_rule_version));
  const prior = compatible.at(-1) ?? null;
  const monthAgo = now ? [...compatible].reverse().find((x) => Date.parse(now.date) - Date.parse(x.date) >= 28 * 86400000) ?? null : null;
  const compare = (a: Snapshot | null | undefined, b: Snapshot | null | undefined) => {
    if (!a || !b) return null;
    if (a.data_status !== b.data_status) return null;
    const old = new Map(a.pairs.map((p) => [p.pair_id, p]));
    let flagChanges = 0;
    let newSamples = 0;
    let pendingSamples = 0;
    const changed = b.pairs.flatMap((p) => {
      const q = old.get(p.pair_id); if (!q) return [];
      if (p.screening_flag !== q.screening_flag) flagChanges += 1;
      newSamples += Math.max(0, p.new_samples - q.new_samples);
      pendingSamples += Math.max(0, p.pending_new_samples - q.pending_new_samples);
      const didChange = p.screening_flag !== q.screening_flag || p.new_samples !== q.new_samples || p.new_exceedances !== q.new_exceedances || p.pending_new_samples !== q.pending_new_samples;
      return didChange ? [{ ...p, previous: q, added: false }] : [];
    });
    const added = b.pairs.filter((p) => !old.has(p.pair_id)).map((p) => ({ ...p, previous: null, added: true }));
    return { rows: [...changed, ...added], changedExistingPairs: changed.length, flagChanges, newSamples, pendingSamples, newPairs: added.length };
  };
  const latestChanges = compare(prior, now); const monthly = compare(monthAgo, now);
  return <div className="wrap py-10 md:py-14">
    <p className="label-caps text-link">{t('updates')}</p><h1 className="mt-2 text-4xl font-bold">{t('updatesTitle')}</h1>
    <p className="prose-nc mt-3">{t('updatesIntro')}</p>
    <DataFreshnessNote date={data.metadata.monitoring_data_through} className="mt-2" />
    {failed && <p role="status" className="mt-6 rounded-lg border border-line bg-white p-4 text-sm">{t('historyUnavailable', { version: data.metadata.dataset_version })}</p>}
    {!failed && !history && <div role="status" className="skeleton mt-6 h-28" />}
    {history && !history.length && <p className="mt-6 rounded-lg border border-line bg-white p-5">{t('noHistory')}</p>}
    {now && <section className="mt-8 grid gap-4 md:grid-cols-2">
      {[{ title: t('latestRefresh'), baseline: prior, changes: latestChanges }, { title: t('monthComparison'), baseline: monthAgo, changes: monthly }].map((section, sectionIndex) =>
        <article key={section.title} className="card p-5">
          <h2 className="text-lg">{section.title}</h2>
          <p className="mt-2 text-sm text-slate">{new Date(now.date).toLocaleString(locale === 'es' ? 'es-US' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })} · {now.dataset_version} · {t(dataStatusLabelKey(now.data_status))}</p>
          {!section.baseline || !section.changes ? <p className="mt-4 text-sm">{priorRuleChanged ? t('historyRuleChanged') : t('baselineUnavailable')}</p> : <>
            <p className="mt-3 text-sm">{t('comparedWith')} {new Date(section.baseline.date).toLocaleDateString(locale === 'es' ? 'es-US' : 'en-US')}</p>
            <ul className="mt-3 grid gap-2 rounded-lg bg-mist p-3 text-sm">
              <li>{t('changedPairsCount', { count: section.changes.changedExistingPairs })}</li>
              <li>{t('flagChangesCount', { count: section.changes.flagChanges })}</li>
              <li>{t('newSamplesCount', { count: section.changes.newSamples })}</li>
              <li>{t('pendingChangesCount', { count: section.changes.pendingSamples })}</li>
              <li>{t('newPairsCount', { count: section.changes.newPairs })}</li>
            </ul>
            {!!section.changes.rows.length && <ul className="mt-3 divide-y divide-line">{section.changes.rows.slice(0, 12).map((p) => {
              const before = p.previous ? flagLabel(p.previous.screening_flag) : null;
              const after = flagLabel(p.screening_flag);
              const flagChange = p.added ? t('newPairLabel') : before === after ? after : `${before} → ${after}`;
              return <li className="py-2 text-sm" key={p.pair_id}><Link className="font-semibold text-link hover:underline" to={`/w/${p.pair_id}`}>{p.waterbody_name}</Link> <ValidationBadge regionId={p.region_id} pairId={p.pair_id} surface={`updates-${sectionIndex}`} /> · {pollutantName(p.pollutant)}: {t('historyChangeDetail', { flagChange, samples: p.new_samples, exceedances: p.new_exceedances })}.</li>;
            })}</ul>}
          </>}
        </article>)}
    </section>}
    {history && <section className="mt-10"><h2 className="text-2xl">{t('refreshSnapshots')}</h2><ol className="mt-4 divide-y divide-line border-y border-line">{history.slice().reverse().map((h) => <li key={`${h.date}-${h.dataset_version}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{new Date(h.date).toLocaleString(locale === 'es' ? 'es-US' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })} · {h.dataset_version} · {t(dataStatusLabelKey(h.data_status))}</span><span className="num text-slate">{t('sampleCountLabel', { count: h.pairs.length })}</span></li>)}</ol></section>}
  </div>;
}
