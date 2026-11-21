import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadDataset, loadSamples, readBootstrapDataset } from './loaders';
import type { Dataset, SampleFile, WaterbodyPair } from './schema';

type State = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: Dataset };
interface Ctx {
  state: State;
  retry: () => void;
}

const DataContext = createContext<Ctx | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [initialState] = useState<State>(() => {
    try {
      const data = readBootstrapDataset();
      return data ? { status: 'ready', data } : { status: 'loading' };
    } catch (error) { return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) }; }
  });
  const [state, setState] = useState<State>(initialState);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (attempt === 0 && initialState.status !== 'loading') return;
    let alive = true;
    setState({ status: 'loading' });
    loadDataset(attempt > 0)
      .then((data) => alive && setState({ status: 'ready', data }))
      .catch((error: Error) => alive && setState({ status: 'error', error }));
    return () => {
      alive = false;
    };
  }, [attempt, initialState]);
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return <DataContext.Provider value={{ state, retry }}>{children}</DataContext.Provider>;
}

export function useDataset(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataset must be used inside DataProvider');
  return ctx;
}

type SampleState = { status: 'loading' } | { status: 'error'; error: Error } | { status: 'ready'; data: SampleFile };

export function useSamples(pair: WaterbodyPair | undefined, cutoff: string) {
  const [state, setState] = useState<SampleState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!pair) return;
    let alive = true;
    setState({ status: 'loading' });
    loadSamples(pair, cutoff, attempt > 0)
      .then((data) => alive && setState({ status: 'ready', data }))
      .catch((error: Error) => alive && setState({ status: 'error', error }));
    return () => {
      alive = false;
    };
  }, [pair, cutoff, attempt]);
  return { state, retry: () => setAttempt((a) => a + 1) };
}
