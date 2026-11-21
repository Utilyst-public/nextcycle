import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Flag } from '@/data/schema';
import { FLAG_STYLE, FlagBadge } from './Badges';
import { flagLabel } from '@/lib/labels';

const BLURB: Record<Flag, string> = {
  'Delisting candidate': 'Newer results meet the state’s count-based test to come off the list.',
  'Still exceeding': 'Newer results remain above the limit too often to pass that test.',
  'Under-sampled': 'There are too few newer results to run the test yet.',
};

export function StatTile({ flag, count, total, delay = 0 }: { flag: Flag; count: number; total: number; delay?: number }) {
  return (
    <Link
      to={`/watch?flag=${encodeURIComponent(flag)}`}
      data-testid={`card-stat-${FLAG_STYLE[flag].short.toLowerCase()}`}
      className="card lift arrow-link rise group flex flex-col p-5 no-underline"
      style={{ animationDelay: `${delay}ms` }}
    >
      <FlagBadge flag={flag} size="sm" className="self-start" subline />
      <div className="mt-5 flex items-baseline gap-2">
        <span className="num text-5xl font-bold leading-none text-teal">{count}</span>
        <span className="num text-sm text-slate">of {total}</span>
      </div>
      <span aria-hidden className="grow-x mt-3 block h-1 w-10 rounded bg-amber" style={{ animationDelay: `${delay + 300}ms` }} />
      <p className="mt-3 text-sm">{BLURB[flag]}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-link">
        View {flagLabel(flag).toLowerCase()} waters <ArrowRight aria-hidden className="h-4 w-4" />
      </span>
    </Link>
  );
}
