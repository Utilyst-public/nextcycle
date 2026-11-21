import { useEffect, useState } from 'react';
import type { WaterbodyPair } from '@/data/schema';
import { useI18n } from '@/i18n';
import { evaluateScenario, ListingTablesSchema, minimumCleanSamples, type ListingTables } from '@/lib/policy';
import { policyVersionText } from '@/i18n/messages';
import { fmtDate } from '@/lib/format';
import { DataFreshnessNote } from './DataFreshnessNote';

const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;

export function ScenarioCalculator({ pair, asOf }: { pair: WaterbodyPair; asOf?: string }) {
  const { t, locale } = useI18n();
  const [tables, setTables] = useState<ListingTables | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [k, setK] = useState(0); const [m, setM] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch(`${base}data/listing_tables.json`).then(async (r) => {
      if (!r.ok) throw new Error('missing');
      const json: unknown = await r.json();
      const parsed = ListingTablesSchema.safeParse(json);
      if (!parsed.success) throw new Error('invalid');
      if (alive) setTables(parsed.data);
    }).catch(() => { if (alive) setFailed(true); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const scenario = tables ? evaluateScenario(pair, k, m, tables) : null;
  const unsupported = !scenario || scenario.reason === 'outside-coverage' || scenario.reason === 'invalid';
  const minimumClean = tables ? minimumCleanSamples(pair, tables) : null;
  const status = unsupported ? t('scenarioUnsupported') : scenario.reason === 'not-listed' ? t('scenarioNotListed') :
    scenario.flag === 'Under-sampled' ? t('scenarioInsufficient', { total: scenario.total, minimum: tables!.tables[pair.delisting_table].min_samples }) :
      scenario.flag === 'Delisting candidate' ? t('scenarioPass') : t('scenarioFail');
  const issueText = t('scenarioResult');
  return <section className="card mt-6 p-5 md:p-6" aria-labelledby="scenario-heading">
    <h2 id="scenario-heading" className="text-xl">{t('calculatorTitle')}</h2>
    <p className="mt-1 text-sm text-slate">{t('calculatorIntro')}</p>
    {asOf && <DataFreshnessNote date={asOf} className="mt-1" />}
    {pair.official_status !== 'Listed' ? <p className="mt-4 rounded-lg bg-mist p-4 text-sm">{t('scenarioNotListed')}</p> : <>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-navy">{t('additionalSamples')}
          <input type="number" min="0" max="500" value={k} onChange={(e) => { const n = Math.max(0, Number(e.target.value) || 0); setK(n); setM((v) => Math.min(v, n)); }} className="rounded-md border border-line bg-cloud px-3 py-2" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-navy">{t('additionalExceedances')}
          <input type="number" min="0" max={k} value={m} onChange={(e) => setM(Math.min(k, Math.max(0, Number(e.target.value) || 0)))} className="rounded-md border border-line bg-cloud px-3 py-2" />
        </label>
      </div>
      <div className="mt-4 rounded-lg border border-teal-200 bg-ice p-4" aria-live="polite">
        <p className="label-caps text-teal">{issueText}</p>
        {loading ? <p className="mt-2 font-semibold text-navy" role="status">{t('tablesLoading')}</p> :
          failed ? <p className="mt-2 font-semibold text-navy" role="alert">{t('tablesUnavailable')}</p> :
            <p className="mt-2 font-semibold text-navy">{t('scenarioSentence', { k, m, result: status })}</p>}
        {!failed && !unsupported && scenario && <p className="mt-1 text-sm text-navy">{t('scenarioTotals', { total: scenario.total, exceedances: scenario.exceedances, allowed: scenario.allowed ?? t('scenarioAllowedUnknown') })}</p>}
        <p className="mt-3 text-xs font-semibold text-amber-text">{t('scenarioDisclaimer')}</p>
      </div>
      <p className="mt-3 text-sm text-navy">{t('cleanSamples')}: <b className="num">{minimumClean === null ? t('minimumUnknown') : minimumClean}</b></p>
      {tables && <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[320px] text-sm">
          <caption className="label-caps mb-2 text-left text-slate">{t('tableSourceCoverage', {
            table: pair.delisting_table,
            minimum: t('tableMinimum', { count: tables.tables[pair.delisting_table].min_samples }),
            version: policyVersionText(tables.version),
            verified: t('verifiedOn', { date: fmtDate(tables.verified_at, locale) }),
          })}</caption>
          <thead><tr className="border-b border-line text-left"><th scope="col" className="py-2 font-semibold text-navy">{t('sampleRange')}</th><th scope="col" className="py-2 text-right font-semibold text-navy">{t('allowedColumn')}</th></tr></thead>
          <tbody>{tables.tables[pair.delisting_table].rows.map((row) => <tr key={`${row.min}-${row.max}`} className="border-b border-line last:border-0"><td className="num py-1.5 text-navy">{row.min}–{row.max}</td><td className="num py-1.5 text-right text-navy">{row.allowed}</td></tr>)}</tbody>
        </table>
        <p className="mt-2 text-xs text-slate">{t('source')}: <a className="link-u" href={tables.source_url} target="_blank" rel="noreferrer" title={tables.version}>{tables.source_url}</a> · {policyVersionText(tables.version)}</p>
      </div>}
    </>}
  </section>;
}
