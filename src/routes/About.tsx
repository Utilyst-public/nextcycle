import { ExternalLink, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Dataset } from '@/data/schema';
import { usePageTitle } from '@/lib/title';
import { useI18n } from '@/i18n';

export default function About({ data }: { data: Dataset }) {
  const { t } = useI18n();
  usePageTitle(t('about'), t('aboutMeta'));
  const rec = data.about.recognition;
  const team = data.about.team ?? [];
  const repoUrl = data.metadata.repo_url;
  return (
    <div className="wrap pt-10 md:pt-16">
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
           <p className="label-caps text-link">{t('aboutEyebrow')}</p>
           <h1 className="mt-2 text-4xl font-bold md:text-5xl">{t('aboutTitle')}</h1>
          <div className="prose-nc mt-8 text-[17px]">
            <p>{t('aboutParagraph1')}</p>
            <p>{t('aboutParagraph2')}</p>
            <p>{t('aboutParagraph3')}</p>
            <p>{t('aboutParagraph4')}</p>
          </div>
           <div className="mt-8 flex flex-wrap gap-3">
             <Link to="/method" className="btn btn-primary">{t('readMethod')}</Link>
              <Link to="/showcase" className="btn btn-ghost">{t('showcaseOverview')}</Link>
             {repoUrl && <a href={repoUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">{t('sourceCode')} <ExternalLink aria-hidden className="h-4 w-4" /></a>}
          </div>
        </div>
        <aside className="grid content-start gap-4 lg:col-span-5">
          {[
            ['openMethodsTitle', 'openMethodsBody'], ['openCodeTitle', 'openCodeBody'], ['plainLanguageTitle', 'plainLanguageBody'],
          ].map(([title, body]) => (
            <div key={title} className="card p-5"><h2 className="text-lg">{t(title as 'openMethodsTitle' | 'openCodeTitle' | 'plainLanguageTitle')}</h2><p className="mt-1 text-sm">{t(body as 'openMethodsBody' | 'openCodeBody' | 'plainLanguageBody')}</p></div>
          ))}
        </aside>
      </div>

      {rec.length > 0 && <section aria-labelledby="rec" className="mt-16">
        <h2 id="rec" className="text-2xl">{t('recognitionTitle')}</h2>
        <div className="mt-6">
            <ul className="grid gap-3 md:grid-cols-2">
              {rec.map((r) => (
                <li key={r.name} className="card p-5">
                  <p className="font-semibold text-navy">{r.name}</p>
                  <p className="text-sm text-slate">{[r.program, r.year].filter(Boolean).join(' · ')}</p>
                  {r.note && <p className="mt-2 text-sm">{r.note}</p>}
                  {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-link hover:underline">{t('learnMore')} <ExternalLink aria-hidden className="h-3.5 w-3.5" /></a>}
                </li>
              ))}
            </ul>
        </div>
      </section>}

      {team.length > 0 && <section aria-labelledby="team" className="mt-16">
        <h2 id="team" className="text-2xl">{t('teamHeading')}</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {team.map((member) => <li key={member.name} className="card p-5">
            <h3 className="text-lg">{member.name}</h3>
            <p className="text-sm font-semibold text-teal">{member.role}</p>
            <p className="mt-3 text-sm">{member.bio}</p>
          </li>)}
        </ul>
      </section>}

      <section aria-labelledby="contact" className="mt-16 rounded-2xl bg-mist p-8 md:p-10">
        <h2 id="contact" className="text-2xl">{t('contact')}</h2>
        <p className="mt-2">{t('contactBody')}</p>
        <a href="mailto:hello@utilyst.com" data-testid="link-contact-email" className="btn btn-primary mt-5"><Mail aria-hidden className="h-4 w-4" /> hello@utilyst.com</a>
      </section>
      <section aria-labelledby="privacy" className="mt-8 rounded-xl border border-line bg-white p-5">
        <h2 id="privacy" className="text-lg">{t('privacySection')}</h2>
        <p className="mt-2 text-sm">{t('privacyDescription')}</p>
      </section>
    </div>
  );
}
