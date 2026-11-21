import { CircleSlash, FileWarning, RotateCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { DataLoadError } from '@/data/loaders';
import { cn } from '@/lib/format';
import { useI18n } from '@/i18n';

export function Loading({ rows = 4, label = 'Loading data' }: { rows?: number; label?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-live="polite" className="wrap py-12">
      <span className="sr-only">{label === 'Loading data' ? t('loadingData') : label}</span>
      <div className="skeleton mb-4 h-4 w-32" />
      <div className="skeleton mb-8 h-10 w-2/3 max-w-xl" />
      <div className="grid gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="skeleton h-14" style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
    </div>
  );
}

export function ErrorState({ error, onRetry, compact }: { error: Error; onRetry?: () => void; compact?: boolean }) {
  const { t } = useI18n();
  const isData = error instanceof DataLoadError;
  const dataMessage = isData
    ? error.message.includes('could not be reached') ? t('dataConnectionError')
      : error.message.includes('HTTP') ? t('dataHttpError')
      : error.message.includes('not valid JSON') ? t('dataJsonError')
      : error.message.includes('does not match') ? t('dataContractError')
      : error.message.includes('Cross-file') ? t('dataCrossFileError')
      : error.message.includes('disagrees') ? t('dataSampleError')
      : t('dataUnknownError')
    : t('genericError');
  return (
    <div className={cn(compact ? 'py-6' : 'wrap py-16')}>
      <div role="alert" className="card max-w-2xl p-6">
        <div className="flex items-start gap-4">
          <FileWarning aria-hidden className="mt-0.5 h-6 w-6 shrink-0 text-teal" />
          <div className="min-w-0">
            <h2 className="text-lg">{t('loadErrorTitle')}</h2>
            <p className="mt-1 text-sm">
              {isData && <span className="num mr-1 text-navy">{error.file}:</span>}
              {dataMessage}
            </p>
            {isData && error.details.length > 0 && <p className="mt-2 text-xs text-slate">{t('validationIssueCount', { count: error.details.length })}</p>}
            {onRetry && (
              <button data-testid="button-retry" onClick={onRetry} className="btn btn-primary mt-4">
                <RotateCw aria-hidden className="h-4 w-4" /> {t('tryAgain')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate bg-white px-6 py-12 text-center">
      <span className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-mist">
        <CircleSlash aria-hidden className="h-5 w-5 text-teal" />
      </span>
      <h3 className="text-lg">{title}</h3>
      {children && <div className="mt-1 max-w-md text-sm">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
