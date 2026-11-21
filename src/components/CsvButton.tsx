import { Download } from 'lucide-react';
import { toCsv, downloadText, type CsvValue } from '@/lib/csv';
import { useToast } from './Toast';
import { useI18n } from '@/i18n';

export function CsvButton({ filename, rows, columns, label, testId = 'button-download-csv' }: { filename: string; rows: Record<string, CsvValue>[]; columns: string[]; label?: string; testId?: string }) {
  const notify = useToast();
  const { t } = useI18n();
  return (
    <button
      data-testid={testId}
      className="btn btn-ghost"
      disabled={!rows.length}
      onClick={() => {
        downloadText(filename, toCsv(rows, columns));
        notify(t('downloadedCsv', { count: rows.length }));
      }}
    >
      <Download aria-hidden className="h-4 w-4" /> {label ?? t('downloadCsv')}
      <span className="num rounded bg-mist px-1.5 text-xs text-teal">{rows.length}</span>
    </button>
  );
}
