'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

const SHOW_MS = 5000;

type Toast = { id: number; message: string };
type ToastContextValue = { show(message: string): void };

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Short confirmations ("Saved", "Email sent") in a black pill at the bottom of the screen.
 * The live region is always in the page, so screen readers announce each new message.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string) => {
    nextId.current += 1;
    setToast({ id: nextId.current, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(
      () => setToast((current) => (current?.id === toast.id ? null : current)),
      SHOW_MS,
    );
    return () => clearTimeout(timer);
  }, [toast]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
        <div role="status" aria-live="polite" aria-atomic="true">
          {toast && (
            <p
              key={toast.id}
              className="border-cta bg-cta text-cta-fg animate-toast-in rounded-pill pointer-events-auto max-w-[min(32rem,calc(100vw-2rem))] border px-5 py-3 text-center text-sm font-bold"
            >
              {toast.message}
            </p>
          )}
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside <ToastProvider>');
  return value;
}
