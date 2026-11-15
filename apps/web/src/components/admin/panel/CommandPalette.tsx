'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';

type Hit = { key: string; group: 'pages' | 'users' | 'listings' | 'deals'; label: string; detail: string; href: string };

const PAGES: { key: string; href: string }[] = [
  { key: 'overview', href: '/admin' },
  { key: 'traffic', href: '/admin/traffic' },
  { key: 'seo', href: '/admin/seo' },
  { key: 'moderation', href: '/admin/listings' },
  { key: 'deals', href: '/admin/deals' },
  { key: 'reports', href: '/admin/reports' },
  { key: 'categories', href: '/admin/categories' },
  { key: 'users', href: '/admin/users' },
  { key: 'money', href: '/admin/money' },
  { key: 'audit', href: '/admin/audit' },
  { key: 'settings', href: '/admin/settings' },
  { key: 'system', href: '/admin/system' },
];

/** Opens the palette from anywhere in the panel (the sidebar's search button sends this event). */
export const OPEN_PALETTE = 'yoyo-admin-palette';

/**
 * ⌘K / Ctrl+K anywhere in the admin panel: one box for people (name, email), items, deals (number or
 * item) and the panel's sections. Arrows move, Enter opens, Esc closes. A WAI-ARIA combobox over a
 * listbox in a modal dialog.
 */
export function CommandPalette() {
  const t = useTranslations('admin');
  const client = useApiClient();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    // Every opening starts from an empty box.
    const show = () => {
      setQ('');
      setDebounced('');
      setActive(0);
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (openRef.current) setOpen(false);
        else show();
      }
    };
    const onOpen = () => show();
    document.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_PALETTE, onOpen);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_PALETTE, onOpen);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(q.trim()), 180);
    return () => clearTimeout(timer);
  }, [q]);

  const search = useQuery({
    queryKey: ['admin', 'search', debounced] as const,
    queryFn: async () => unwrap(client.GET('/api/v1/admin/search', { params: { query: { q: debounced } } })),
    enabled: open && debounced.length >= 2,
    staleTime: 10_000,
  });

  const hits = useMemo<Hit[]>(() => {
    const needle = q.trim().toLowerCase();
    const pages = PAGES.filter((p) => !needle || t(`nav.${p.key}`).toLowerCase().includes(needle)).map<Hit>((p) => ({
      key: `p-${p.key}`,
      group: 'pages',
      label: t(`nav.${p.key}`),
      detail: p.href,
      href: p.href,
    }));
    const data = debounced.length >= 2 ? search.data : undefined;
    return [
      ...(data?.users ?? []).map<Hit>((u) => ({ key: `u-${u.id}`, group: 'users', label: u.name, detail: u.blocked ? `${u.email} · ${t('search.blocked')}` : u.email, href: `/admin/users/${u.id}` })),
      ...(data?.listings ?? []).map<Hit>((l) => ({ key: `l-${l.id}`, group: 'listings', label: l.title || '—', detail: `${l.owner} · ${l.status}`, href: `/listings/${l.id}` })),
      ...(data?.deals ?? []).map<Hit>((d) => ({ key: `d-${d.id}`, group: 'deals', label: d.title || d.id, detail: `${d.renter} → ${d.owner} · ${d.status}`, href: `/admin/deals/${d.id}` })),
      ...pages,
    ];
  }, [q, debounced, search.data, t]);

  function go(hit: Hit | undefined) {
    if (!hit) return;
    setOpen(false);
    router.push(hit.href);
  }

  if (!open) return null;
  const optionId = (i: number) => `${listId}-${i}`;
  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-[color-mix(in_srgb,var(--night)_45%,transparent)] px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={() => setOpen(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('search.open')}
        onMouseDown={(e) => e.stopPropagation()}
        className="border-ink/15 bg-surface text-ink animate-pop-in rounded-media flex w-full max-w-xl flex-col overflow-hidden border shadow-[0_40px_80px_-30px_rgba(10,11,14,0.6)]"
      >
        <div className="border-ink/15 flex items-center gap-3 border-b px-4">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0 fill-none stroke-current [stroke-linecap:round] [stroke-width:1.8]">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
          <input
            ref={input}
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={hits.length ? optionId(Math.min(active, hits.length - 1)) : undefined}
            aria-label={t('search.placeholder')}
            placeholder={t('search.placeholder')}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, hits.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(hits[Math.min(active, hits.length - 1)]);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            className="min-h-14 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[color-mix(in_srgb,var(--ink)_55%,transparent)]"
          />
          <kbd className="border-ink/20 rounded-[6px] border px-1.5 text-[11px] font-semibold">Esc</kbd>
        </div>
        <ul id={listId} role="listbox" aria-label={t('search.open')} className="max-h-[min(60vh,28rem)] overflow-y-auto p-2">
          {hits.length === 0 && <li className="text-ink/70 px-3 py-6 text-center text-sm">{t('search.empty')}</li>}
          {hits.map((hit, i) => {
            const heading = hit.group !== lastGroup ? hit.group : null;
            lastGroup = hit.group;
            const isActive = i === Math.min(active, hits.length - 1);
            return (
              <li key={hit.key} role="presentation">
                {heading && <p className="text-ink/60 px-3 pt-3 pb-1 text-[11px] font-bold tracking-[0.08em] uppercase" aria-hidden="true">{t(`search.${heading}`)}</p>}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={isActive}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(hit)}
                  className={`flex cursor-pointer items-baseline justify-between gap-4 rounded-[12px] px-3 py-2.5 ${isActive ? 'bg-ink text-canvas' : ''}`}
                >
                  <span className="min-w-0 truncate font-semibold">{hit.label}</span>
                  <span className={`shrink-0 truncate text-[13px] ${isActive ? 'text-canvas/75' : 'text-ink/65'}`}>{hit.detail}</span>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="border-ink/15 text-ink/65 border-t px-4 py-2 text-[12px]">{t('search.hint')}</p>
      </div>
    </div>
  );
}
