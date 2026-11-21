import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePageTitle } from '@/lib/title';
import { useI18n } from '@/i18n';

export default function NotFound({ message }: { message?: string }) {
  const { t } = useI18n();
  usePageTitle(t('notFoundTitle'), t('notFoundMeta'));
  return (
    <div className="wrap flex min-h-[60dvh] flex-col justify-center py-16">
      <p className="num text-7xl font-bold text-teal-200 md:text-9xl">404</p>
      <h1 className="mt-4 text-3xl font-bold md:text-4xl">{t('notFoundHeading')}</h1>
      <p className="prose-nc mt-3">{message ?? t('notFoundBody')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/watch" data-testid="link-404-watch" className="btn btn-primary arrow-link">{t('goWatchList')} <ArrowRight aria-hidden className="h-4 w-4" /></Link>
        <Link to="/map" data-testid="link-404-map" className="btn btn-ghost">{t('openMap')}</Link>
      </div>
    </div>
  );
}
