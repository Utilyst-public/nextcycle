import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

type CounterWindow = Window & { goatcounter?: { count: (payload: { path: string }) => void } };

export function OptionalAnalytics() {
  const { pathname } = useLocation();
  const previousPath = useRef<string | null>(null);
  useEffect(() => {
    const code = import.meta.env.VITE_GOATCOUNTER_CODE?.trim() ?? '';
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(code)) return;
    let script = document.querySelector<HTMLScriptElement>('script[data-nextcycle-goatcounter]');
    if (!script) {
      script = document.createElement('script');
      script.async = true;
      script.dataset.nextcycleGoatcounter = 'true';
      script.dataset.goatcounter = `https://${code}.goatcounter.com/count`;
      script.src = 'https://gc.zgo.at/count.js';
      document.head.append(script);
    }
    if (previousPath.current === null) {
      previousPath.current = pathname;
      return;
    }
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    const counter = (window as CounterWindow).goatcounter;
    if (counter) counter.count({ path: pathname });
  }, [pathname]);
  return null;
}
