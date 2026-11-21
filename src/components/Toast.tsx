import { CheckCircle2 } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const notify = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setMsg({ text, id: Date.now() });
    timer.current = window.setTimeout(() => setMsg(null), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={notify}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex justify-center px-4">
        {msg && (
          <div key={msg.id} style={{ animation: 'toast .3s ease both' }} className="flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-medium text-white">
            <CheckCircle2 aria-hidden className="h-4 w-4 text-cyan" />
            {msg.text}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
