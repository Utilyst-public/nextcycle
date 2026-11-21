import type { Dataset } from '@/data/schema';
import { usePageTitle } from '@/lib/title';
import { useI18n } from '@/i18n';
import { disclosureKey } from '@/i18n/messages';
import { CsvButton } from '@/components/CsvButton';
import type { CsvValue } from '@/lib/csv';
import { DataFreshnessNote } from '@/components/DataFreshnessNote';

export default function Api({ data }: { data: Dataset }) {
  const { t } = useI18n(); usePageTitle(t('apiTitle'));
  const base = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/v1`;
  const columns = [...new Set([...data.pairs.flatMap((pair) => Object.keys(pair)), 'in_ceden_as_of', 'recent_data_submission_note'])];
  const rows = data.pairs.map((p) => Object.fromEntries(Object.entries({
    ...p, in_ceden_as_of: data.metadata.monitoring_data_through, recent_data_submission_note: t('recentDataSubmissionNote'),
  }).map(([key, value]) => [key, value !== null && typeof value === 'object' ? JSON.stringify(value) : value])) as Record<string, CsvValue>);
  const endpoints = [
    { path: '/waters.json', shape: 'endpointAllWaters' },
    { path: '/waters/{pair_id}.json', shape: 'endpointOneWater' },
    { path: '/data-gaps.json', shape: 'endpointGaps' },
    { path: '/meta.json', shape: 'endpointMetadata' },
    { path: '/waters.csv', shape: 'endpointCsv' },
  ] as const;
  return <div className="wrap py-10 md:py-14">
    <p className="label-caps text-link">{t('api')}</p><h1 className="mt-2 text-4xl font-bold">{t('apiTitle')}</h1><p className="prose-nc mt-3">{t('apiIntro')}</p>
    <DataFreshnessNote date={data.metadata.monitoring_data_through} className="mt-2" />
    <div className="mt-4"><CsvButton filename={`nextcycle-waters-${data.metadata.dataset_version}.csv`} rows={rows} columns={columns} label={t('downloadFullCsv')} testId="button-download-full-api-csv" /></div>
    <p className="mt-5 rounded-lg border border-amber/50 bg-ice p-4 text-sm text-navy">{t(disclosureKey(data.metadata.data_status))} Dataset <span className="num">{data.metadata.dataset_version}</span>.</p>
    <div className="mt-7 overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full min-w-[580px] text-left text-sm"><thead className="bg-mist"><tr><th scope="col" className="px-4 py-3">{t('endpointColumn')}</th><th scope="col" className="px-4 py-3">{t('shapeColumn')}</th></tr></thead>
        <tbody>{endpoints.map((e) => <tr key={e.path} className="border-t border-line"><td className="px-4 py-3"><code className="num">{base}{e.path}</code></td><td className="px-4 py-3">{t(e.shape)}</td></tr>)}</tbody></table>
    </div>
     <section className="card mt-6 p-5"><h2 className="text-lg">{t('fetchExample')}</h2><pre className="mt-3 overflow-x-auto rounded bg-navy p-4 text-sm text-white"><code>{`const response = await fetch('${base}/waters.json');\nconst waters = await response.json();`}</code></pre><p className="mt-3 text-sm">{t('apiUsageNote', { version: data.metadata.dataset_version })}</p></section>
     <p className="mt-5 text-sm text-slate">{t('licenseLabel')}: {(data.metadata as Dataset['metadata'] & { license?: string }).license ?? t('licenseFallback')}</p>
  </div>;
}
