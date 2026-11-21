import { ArrowRight, Building2, CloudRain, FileSearch, Mail, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FlagBadge } from '@/components/Badges';
import type { Dataset, WaterbodyPair } from '@/data/schema';
import { samplesNeeded, topByFlag } from '@/data/selectors';
import { usePageTitle } from '@/lib/title';
import { useI18n } from '@/i18n';
import { DataFreshnessNote } from '@/components/DataFreshnessNote';
import { ValidationBadge } from '@/components/RegionValidation';

export default function Utilities({ data }: { data: Dataset }) {
  const { t } = useI18n();
  usePageTitle(t('utilities'));
  const still = topByFlag(data.pairs, 'Still exceeding', 1)[0];
  const improving = topByFlag(data.pairs, 'Delisting candidate', 1)[0];
  const more = topByFlag(data.pairs, 'Under-sampled', 1)[0];
  const cases = [
    still && { icon: CloudRain, who: 'caseStormwater' as const, pair: still, title: 'caseStillTitle' as const, body: t('caseStillBody', { water: still.waterbody_name, pollutant: still.pollutant.toLowerCase(), count: still.new_exceedances, total: still.new_samples }) },
    improving && { icon: Building2, who: 'caseWastewater' as const, pair: improving, title: 'caseCandidateTitle' as const, body: t('caseCandidateBody', { water: improving.waterbody_name, pollutant: improving.pollutant.toLowerCase(), count: improving.new_exceedances, total: improving.new_samples }) },
    more && { icon: FileSearch, who: 'caseConsultant' as const, pair: more, title: 'caseUnderTitle' as const, body: t('caseUnderBody', { water: more.waterbody_name, pollutant: more.pollutant.toLowerCase(), needed: samplesNeeded(more) }) },
  ].filter(Boolean) as { icon: typeof CloudRain; who: 'caseStormwater' | 'caseWastewater' | 'caseConsultant'; pair: WaterbodyPair; title: 'caseStillTitle' | 'caseCandidateTitle' | 'caseUnderTitle'; body: string }[];
  const requestHref = `mailto:hello@utilyst.com?subject=${encodeURIComponent(t('utilityRequestSubject'))}`;
  const feedbackHref = `mailto:hello@utilyst.com?subject=${encodeURIComponent(t('utilityFeedbackSubject'))}&body=${encodeURIComponent(t('utilityFeedbackBody'))}`;

  return (
    <div className="pb-16">
      <section className="wrap pt-10 pb-14 md:pt-16">
        <p className="label-caps text-link">{t('utilities')}</p>
        <h1 className="mt-2 max-w-4xl text-4xl font-bold md:text-5xl">{t('utilitiesHero')}</h1>
        <p className="prose-nc mt-5 text-lg">{t('utilitiesAudience')}</p>
      </section>

      <section className="border-y border-line bg-white py-14">
        <div className="wrap grid items-start gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl">{t('whatYouGet')}</h2>
            <ul className="mt-5 grid gap-4">
                {[
                ['utilityBulletEarly', 'utilityBulletEarlyBody'],
                ['utilityBulletSampling', 'utilityBulletSamplingBody'],
                ['utilityBulletOutputs', 'utilityBulletOutputsBody'],
              ].map(([title, body]) => <li key={title} className="flex gap-3"><span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan" /><p><b className="font-semibold text-navy">{t(title as 'utilityBulletEarly' | 'utilityBulletSampling' | 'utilityBulletOutputs')}</b> {t(body as 'utilityBulletEarlyBody' | 'utilityBulletSamplingBody' | 'utilityBulletOutputsBody')}</p></li>)}
            </ul>
          </div>
          <div className="self-start rounded-xl bg-mist p-6">
            <h2 className="text-2xl">{t('whatNot')}</h2>
            <p className="mt-4">{t('utilityDisclaimer')}</p>
          </div>
        </div>
      </section>

      <section className="wrap mt-16" aria-labelledby="cases">
        <h2 id="cases" className="text-3xl">{t('exampleUseCases')}</h2>
        <DataFreshnessNote date={data.metadata.monitoring_data_through} className="mt-2" />
        <div className="mt-8 grid items-stretch gap-5 md:grid-cols-3">
          {cases.map((item) => <article key={item.who} className="card lift flex min-h-[280px] flex-col p-6">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-lg bg-mist"><item.icon aria-hidden className="h-5 w-5 text-teal" /></span><p className="label-caps text-slate">{t(item.who)}</p></div>
            <h3 className="mt-5 text-xl">{t(item.title)}</h3><p className="mt-2 text-sm">{item.body}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-6"><span className="flex flex-wrap items-center gap-2"><FlagBadge flag={item.pair.screening_flag} size="sm" /><ValidationBadge regionId={item.pair.region_id} pairId={item.pair.pair_id} surface="utilities" /></span><Link to={`/w/${item.pair.pair_id}`} className="arrow-link inline-flex items-center gap-1 text-sm font-semibold text-link">{t('seeExample')} <ArrowRight aria-hidden className="h-4 w-4" /></Link></div>
          </article>)}
        </div>
      </section>

      <section className="wrap mt-14" aria-label={t('utilityHowLabel')}>
        <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line md:grid-cols-3">
          {t('utilitySteps').split('|').map((title) => <li key={title} className="flex min-h-16 items-center bg-white px-5 py-4 font-semibold text-teal">{title}</li>)}
        </ol>
      </section>

      <section className="wrap mt-16">
        <div className="grid gap-6 rounded-2xl bg-teal p-8 md:grid-cols-2 md:p-12">
          <div><h2 className="text-3xl text-white">{t('utilityRequestTitle')}</h2><p className="mt-3 text-white">{t('utilityRequestBody')}</p></div>
          <div className="flex flex-col justify-center gap-3 md:items-end">
            <a href={requestHref} data-testid="link-request-region" className="btn btn-onteal"><Mail aria-hidden className="h-4 w-4" /> {t('requestRegion')}</a>
            <a href={feedbackHref} data-testid="link-feedback" className="btn border border-white text-white hover:bg-teal-800"><MessageSquare aria-hidden className="h-4 w-4" /> {t('tellUse')}</a>
          </div>
        </div>
      </section>
    </div>
  );
}
