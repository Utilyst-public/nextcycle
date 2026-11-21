import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { countByFlag, noUsableWaterStats, samplesNeeded } from '@/data/selectors';
import type { DataStatus, Dataset } from '@/data/schema';
import { useI18n } from '@/i18n';
import { usePageTitle } from '@/lib/title';
import { fmtDate } from '@/lib/format';
import { dataStatusLabelKey, disclosureKey } from '@/i18n/messages';
import { DataFreshnessNote } from '@/components/DataFreshnessNote';
import { useRegion } from '@/data/region';

type ValidationReport = {
  dataset_version: string;
  data_status: DataStatus;
  is_sample_data: boolean;
  checked_at: string;
  scope: string;
  pair_count: number;
  station_count: number;
  checks: { name: string; status: string }[];
};
type QaSummary = {
  dataset_version: string;
  data_status: DataStatus;
  pairs: { pair_id: string; match_status: 'exact' | 'close' | 'gap' }[];
};

function isValidationReport(value: unknown): value is ValidationReport {
  if (!value || typeof value !== 'object') return false;
  const report = value as Record<string, unknown>;
  return typeof report.dataset_version === 'string' && ['illustrative', 'provisional', 'reviewed'].includes(report.data_status as string) && typeof report.is_sample_data === 'boolean' &&
    typeof report.checked_at === 'string' && typeof report.scope === 'string' &&
    Number.isInteger(report.pair_count) && Number.isInteger(report.station_count) &&
    Array.isArray(report.checks) && report.checks.every((item) => item && typeof item.name === 'string' && typeof item.status === 'string');
}
function isQaSummary(value: unknown): value is QaSummary {
  if (!value || typeof value !== 'object') return false;
  const report = value as Record<string, unknown>;
  return typeof report.dataset_version === 'string' &&
    ['illustrative', 'provisional', 'reviewed'].includes(report.data_status as string) &&
    Array.isArray(report.pairs) && report.pairs.every((row) => row && typeof row.pair_id === 'string' && ['exact', 'close', 'gap'].includes(row.match_status));
}

export default function Showcase({ data }: { data: Dataset }) {
  const { t, locale } = useI18n(); usePageTitle(t('showcaseTitle'), t('showcaseMeta'));
  const { regionId } = useRegion();
  const regionName = regionId === 'R3' ? t('regionCentralCoast') : t('regionSanDiego');
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [validationFound, setValidationFound] = useState(false);
  const [qaSummary, setQaSummary] = useState<QaSummary | null>(null);
  const [qaLoading, setQaLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    fetch(`${base}data/validation.json`).then(async (r) => {
      if (!r.ok) return null;
      const report: unknown = await r.json();
      if (alive && isValidationReport(report)) { setValidation(report); setValidationFound(true); }
      return null;
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);
  useEffect(() => {
    let alive = true;
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    fetch(`${base}data/method-validation.json`).then(async (response) => {
      if (!response.ok) throw new Error('missing QA validation');
      const json: unknown = await response.json();
      if (!isQaSummary(json)) throw new Error('invalid QA validation');
      if (alive) setQaSummary(json);
    }).catch(() => undefined).finally(() => { if (alive) setQaLoading(false); });
    return () => { alive = false; };
  }, []);
  const counts = countByFlag(data.pairs);
  const noSamples = noUsableWaterStats(data.pairs);
  const under = data.pairs.filter((p) => p.screening_flag === 'Under-sampled');
  const totalNeeded = under.reduce((n, p) => n + samplesNeeded(p), 0);
  const findings = [
    t('findingCandidate', { count: counts['Delisting candidate'] }),
    t('findingStill', { count: counts['Still exceeding'] }),
    t('findingUnder', { count: under.length, samples: totalNeeded }),
  ];
  const recommendedElements = [
    ['recommendedElement1Title', 'recommendedElement1Body'],
    ['recommendedElement2Title', 'recommendedElement2Body'],
    ['recommendedElement3Title', 'recommendedElement3Body'],
    ['recommendedElement4Title', 'recommendedElement4Body'],
    ['recommendedElement5Title', 'recommendedElement5Body'],
    ['recommendedElement6Title', 'recommendedElement6Body'],
  ] as const;
  const fiveMinuteOutline = [
    ['00:00–01:00', 'demoMinute1'],
    ['01:00–02:00', 'demoMinute2'],
    ['02:00–03:00', 'demoMinute3'],
    ['03:00–04:00', 'demoMinute4'],
    ['04:00–05:00', 'demoMinute5'],
  ] as const;
  const validationMatches = validation?.dataset_version === data.metadata.dataset_version && validation.data_status === data.metadata.data_status;
  const qaValidationMatches = qaSummary?.dataset_version === data.metadata.dataset_version && qaSummary.data_status === data.metadata.data_status;
  const selectedPairIds = new Set(data.pairs.map((pair) => pair.pair_id));
  const scopedQaPairs = qaSummary?.pairs.filter((pair) => selectedPairIds.has(pair.pair_id)) ?? [];
  const scopedQaCounts = {
    exact: scopedQaPairs.filter((pair) => pair.match_status === 'exact').length,
    close: scopedQaPairs.filter((pair) => pair.match_status === 'close').length,
    gap: scopedQaPairs.filter((pair) => pair.match_status === 'gap').length,
  };
  const passedChecks = validation?.checks.filter((check) => check.status === 'passed').length ?? 0;
  const otherChecks = (validation?.checks.length ?? 0) - passedChecks;
  return <div className="wrap py-10 md:py-14">
    <p className="label-caps text-link">{t('showcase')}</p><h1 className="mt-2 max-w-4xl text-4xl font-bold md:text-5xl">{t('zeroSampleHeadline', { count: noSamples.withoutUsableSamples, total: noSamples.total, date: fmtDate(data.metadata.cutoff_date), region: regionName })}</h1>
    <DataFreshnessNote date={data.metadata.monitoring_data_through} className="mt-3" />
    <Link className="link-u mt-2 inline-block" to="/data-gaps">{t('gaps')}</Link>
    <section className="mt-8 rounded-xl border border-line bg-white p-5" aria-labelledby="showcase-validation">
      <h2 id="showcase-validation" className="text-xl">{t('qaValidation')}</h2>
      <p className="mt-2 text-sm text-navy">{qaLoading ? t('loadingResults') : qaValidationMatches && qaSummary
        ? t('showcaseExactMatches', { exact: scopedQaCounts.exact, close: scopedQaCounts.close, gap: scopedQaCounts.gap, total: scopedQaPairs.length })
        : t('qaValidationMissing')}</p>
      <Link className="link-u mt-3 inline-block" to="/method">{t('method')}</Link>
    </section>
    <section className="mt-4 rounded-xl border border-line bg-white p-5" aria-labelledby="showcase-method">
      <h2 id="showcase-method" className="text-xl">{t('method')}</h2>
      <p className="mt-2 text-sm text-navy">{t('showcaseMethodSummary')}</p>
      <Link className="link-u mt-3 inline-block" to="/method">{t('method')}</Link>
    </section>
    {data.about.team && data.about.team.length > 0 && <section className="mt-8" aria-labelledby="showcase-team"><h2 id="showcase-team" className="text-2xl">{t('teamHeading')}</h2><ul className="mt-4 grid gap-4 md:grid-cols-2">{data.about.team.map((member) => <li key={member.name} className="card p-5"><h3 className="text-lg">{member.name}</h3><p className="text-sm font-semibold text-teal">{member.role}</p><p className="mt-2 text-sm">{member.bio}</p></li>)}</ul></section>}
    <p className="mt-3 text-xs text-slate">{t('teamTruth')}</p>
    <section className="card mt-5 p-5" aria-labelledby="showcase-links"><h2 id="showcase-links" className="text-lg">{t('sourcesData')}</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{data.metadata.sources.map((s) => <li key={s.name}><a className="link-u" href={s.url} target="_blank" rel="noreferrer">{s.name}</a> · {s.publisher}</li>)}</ul><div className="mt-4 flex flex-wrap gap-5"><Link className="link-u" to="/api">{t('api')}</Link>{data.metadata.repo_url && <a className="link-u" href={data.metadata.repo_url} target="_blank" rel="noreferrer">{t('openRepository')}</a>}</div></section>
    <section className="mt-8 grid gap-7 border-y border-line py-7 md:grid-cols-2"><div><p className="label-caps text-slate">{t('showcaseProblemLabel')}</p><h2 className="mt-2 text-2xl">{t('showcaseProblem')}</h2></div><div><p className="label-caps text-slate">{t('showcaseToolLabel')}</p><p className="mt-2 text-lg">{t('showcaseExplanation')}</p></div></section>
    <section className="mt-10"><h2 className="text-2xl">{t('showcaseFindingsTitle')}</h2><ol className="mt-4 grid gap-4 md:grid-cols-3">{findings.map((f, i) => <li key={f} className="card p-5"><span className="num text-3xl font-bold text-teal">{String(i + 1).padStart(2, '0')}</span><p className="mt-3 font-semibold text-navy">{f}.</p></li>)}</ol><p className="mt-3 text-xs text-slate">{t(disclosureKey(data.metadata.data_status))} {t('datasetThrough', { version: data.metadata.dataset_version, date: fmtDate(data.metadata.monitoring_data_through) })}</p></section>
    <section className="mt-10" aria-labelledby="recommended-data">
      <p className="label-caps text-link">{t('recommendedDataEyebrow')}</p>
      <h2 id="recommended-data" className="mt-2 text-2xl">{t('recommendedDataTitle')}</h2>
      <p className="prose-nc mt-2 text-sm text-slate">{t('recommendedDataIntro')}</p>
      <ol className="mt-5 grid gap-3 md:grid-cols-2">
        {recommendedElements.map(([title, body], index) => <li key={title} className="card flex gap-4 p-5">
          <span className="num text-xl font-bold text-teal">{String(index + 1).padStart(2, '0')}</span>
          <div><h3 className="font-semibold text-navy">{t(title)}</h3><p className="mt-1 text-sm text-slate">{t(body)}</p></div>
        </li>)}
      </ol>
    </section>
    <section className="mt-10 rounded-xl border border-line bg-white p-5 md:p-6" aria-labelledby="five-minute-demo">
      <p className="label-caps text-link">{t('fiveMinuteLabel')}</p>
      <h2 id="five-minute-demo" className="mt-2 text-2xl">{t('fiveMinuteTitle')}</h2>
      <ol className="mt-5 grid gap-3 md:grid-cols-5">
        {fiveMinuteOutline.map(([time, key]) => <li key={time} className="border-t-2 border-teal-200 pt-3">
          <span className="num text-xs font-bold text-teal">{time}</span>
          <p className="mt-2 text-sm text-navy">{t(key)}</p>
        </li>)}
      </ol>
    </section>
    <section className="mt-10"><article className="card p-5"><h2 className="text-lg">{t('demoTitle')}</h2><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm"><li>{t('findWaters')}: {t('findStep')}</li><li>{t('compareStep')}</li><li>{t('scenarioStep')}</li><li>{t('gapsStep')}</li><li>{t('shareStep')}</li></ol></article></section>
    <section className="mt-10 rounded-xl border border-line bg-white p-5">
      <h2 className="text-xl">{t('validationTitle')}</h2>
      {!validationFound || !validation ? <p className="mt-2 text-sm text-slate">{t('validationMissing')}</p> : !validationMatches ? <p className="mt-2 text-sm text-slate">{t('validationMismatch')}</p> : <>
        <p className="mt-2 text-sm text-navy">{t('integritySummary', { passed: passedChecks, other: otherChecks, pairs: validation.pair_count, stations: validation.station_count })}</p>
        <p className="mt-2 text-xs text-slate">{t('datasetVersionLabel')} {validation.dataset_version} · {t(dataStatusLabelKey(validation.data_status))} · {t('checkedAt', { date: new Date(validation.checked_at).toLocaleString(locale === 'es' ? 'es-US' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })})}</p>
        <details className="mt-4 rounded-lg border border-line p-4"><summary className="cursor-pointer text-sm font-semibold text-teal">{t('validationJsonDetails')}</summary><pre className="mt-3 max-h-96 overflow-auto rounded bg-mist p-4 text-xs text-navy">{JSON.stringify(validation, null, 2)}</pre></details>
      </>}
    </section>
  </div>;
}
