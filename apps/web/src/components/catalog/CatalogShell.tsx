'use client';

import { createContext, useContext, useTransition, type ReactNode } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';

type Navigate = (search: string, pathname?: string) => void;

const ShellContext = createContext<{ navigate: Navigate; pending: boolean }>({ navigate: () => {}, pending: false });

/**
 * The catalog's filters live in the address (W03 §H). A change replaces the address inside a
 * transition: the server renders the new results while the old ones stay, dimmed, so nothing jumps.
 */
export function CatalogShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const navigate: Navigate = (search, path = pathname) =>
    startTransition(() => router.replace(`${path}${search}`, { scroll: false }));
  return <ShellContext.Provider value={{ navigate, pending }}>{children}</ShellContext.Provider>;
}

export function useCatalogNavigation() {
  return useContext(ShellContext);
}

/** The results: busy while new ones load, and the count read out when it changes. */
export function ResultsRegion({ children, status }: { children: ReactNode; status: string }) {
  const { pending } = useCatalogNavigation();
  return (
    <section aria-busy={pending} aria-label={status} className="flex flex-col gap-6">
      <p role="status" aria-live="polite" className="text-sm font-bold">
        {status}
      </p>
      <div className={`ease-yoyo transition-opacity duration-250 ${pending ? 'pointer-events-none opacity-50' : ''}`}>{children}</div>
    </section>
  );
}
