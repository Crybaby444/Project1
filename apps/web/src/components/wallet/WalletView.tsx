'use client';

import { LEDGER_KINDS, WALLET_PAGE_SIZE, type LedgerKind, type WalletSummary } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { CountUp } from '@/components/motion/CountUp';
import { Reveal } from '@/components/motion/Reveal';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { formatMoment } from '@/lib/deals/dates';
import { useMoney } from '@/lib/deals/money';
import { useWallet, useWalletHistory } from '@/lib/deals/queries';
import { useErrorText } from '@/lib/forms/error-text';
import { MoneyDialog, type MoneyMode } from './MoneyDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sheet } from '@/components/ui/Sheet';
import { PageHeader } from '@/components/ui/PageHeader';

type Tile = { key: 'available' | 'deposits' | 'incoming' | 'earned'; cents: number; hint?: string };

/** The four sums on sheets, the available one ringed; each counts up the first time it is seen. */
function BalanceTiles({ summary }: { summary: WalletSummary }) {
  const t = useTranslations('wallet');
  const money = useMoney();
  const tiles: Tile[] = [
    { key: 'available', cents: summary.balanceCents },
    { key: 'deposits', cents: summary.depositsCents, hint: t('depositsHint') },
    { key: 'incoming', cents: summary.incomingCents, hint: t('incomingHint') },
    { key: 'earned', cents: summary.earnedCents, hint: t('earnedHint') },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((tile, index) => (
        <Reveal
          key={tile.key}
          index={index}
          className={`sheet rounded-media flex flex-col gap-2 border p-5 ${tile.key === 'available' ? 'border-ink/40' : 'border-ink/15'}`}
        >
          <dt className="text-ink/70 text-sm font-semibold">{t(tile.key)}</dt>
          <dd
            className="font-display text-display-m leading-[0.9] font-black tabular-nums"
            data-tile={tile.key}
          >
            <CountUp value={tile.cents} format={money} />
          </dd>
          {tile.hint && <dd className="text-ink/80 max-w-[34ch] text-sm">{tile.hint}</dd>}
        </Reveal>
      ))}
    </dl>
  );
}

function History() {
  const t = useTranslations('wallet');
  const tk = useTranslations('ledgerKind');
  const locale = useLocale();
  const money = useMoney();
  const errorText = useErrorText();
  const [kind, setKind] = useState<LedgerKind | 'ALL'>(() => {
    if (typeof window === 'undefined') return 'ALL';
    const value = new URL(window.location.href).searchParams.get('kind');
    return (LEDGER_KINDS as readonly string[]).includes(value ?? '') ? (value as LedgerKind) : 'ALL';
  });
  const [page, setPage] = useState(1);
  const query = useWalletHistory(kind, page);
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / WALLET_PAGE_SIZE));

  function choose(next: LedgerKind | 'ALL') {
    setKind(next);
    setPage(1);
    const url = new URL(window.location.href);
    if (next === 'ALL') url.searchParams.delete('kind');
    else url.searchParams.set('kind', next);
    window.history.replaceState(window.history.state, '', url);
  }

  return (
    <section aria-labelledby="wallet-history" className="stack-section">
      <h2 id="wallet-history" className="type-section">
        {t('history')}
      </h2>
      <div
        role="group"
        aria-label={t('filters')}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {(['ALL', ...LEDGER_KINDS] as const).map((k, index) => (
          <Chip
            key={k}
            pressed={kind === k}
            onPressedChange={() => choose(k)}
            tilt={index % 2 ? 'right' : 'left'}
            className="shrink-0"
          >
            {k === 'ALL' ? t('all') : tk(k)}
          </Chip>
        ))}
      </div>
      {query.isPending ? (
        <ul aria-busy="true" className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((k) => (
            <li key={k} aria-hidden="true" className="bg-mist/60 h-16 animate-pulse" />
          ))}
        </ul>
      ) : query.isError ? (
        <div
          role="alert"
          className="sheet border-ink/15 rounded-media flex flex-col items-start gap-3 border p-5 sm:p-6"
        >
          <p className="font-bold">{t('loadFailed')}</p>
          <p>{errorText(query.error)}</p>
          <Button variant="ghost" onClick={() => void query.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : query.data.items.length === 0 ? (
        <EmptyState headingLevel={3} title={kind === 'ALL' ? t('emptyAll') : t('empty')} />
      ) : (
        <>
          <Sheet as="div" pad="none" className="overflow-hidden">
          <ul className="divide-ink/10 flex flex-col divide-y" data-ledger="">
            {query.data.items.map((item) => {
              const incoming = item.amountCents > 0;
              return (
                <li
                  key={`${item.id}-${item.amountCents}`}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-4 sm:px-5"
                  data-ledger-kind={item.kind}
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-9 shrink-0 place-items-center rounded-full border ${incoming ? 'bg-ink border-ink text-canvas' : 'border-ink text-ink'}`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={incoming ? 'M12 19V5m0 14-6-6m6 6 6-6' : 'M12 5v14m0-14-6 6m6-6 6 6'} />
                    </svg>
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-bold">{tk(item.kind)}</span>
                    <span className="flex flex-wrap gap-x-3 text-sm">
                      <time dateTime={item.createdAt}>
                        {formatMoment(item.createdAt, locale, 'Europe/Riga')}
                      </time>
                      {item.bookingId && (
                        <TransitionLink
                          href={`/bookings/${item.bookingId}`}
                          className="font-bold [overflow-wrap:anywhere] underline underline-offset-2"
                        >
                          {item.listingTitle ? t('deal', { item: item.listingTitle }) : t('dealFallback')}
                        </TransitionLink>
                      )}
                    </span>
                  </div>
                  <span
                    className="font-display ml-auto text-3xl leading-none font-black tabular-nums"
                    data-amount={item.amountCents}
                  >
                    {incoming ? '+' : ''}
                    {money(item.amountCents)}
                  </span>
                </li>
              );
            })}
          </ul>
          </Sheet>
          {pages > 1 && (
            <nav
              aria-label={t('page', { page, pages })}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <Button variant="ghost" onClick={() => setPage((p) => p - 1)} disabled={page <= 1}>
                ← {t('previous')}
              </Button>
              <span className="text-sm font-bold tabular-nums">{t('page', { page, pages })}</span>
              <Button variant="ghost" onClick={() => setPage((p) => p + 1)} disabled={page >= pages}>
                {t('next')} →
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}

/**
 * The wallet (spec §4.5): what is available, frozen in deposits, waiting for handover and earned;
 * top-ups and withdrawals through the test card provider; every ledger movement with a link to its deal.
 */
export function WalletView() {
  const t = useTranslations('wallet');
  const errorText = useErrorText();
  const wallet = useWallet();
  const [mode, setMode] = useState<MoneyMode | null>(null);

  return (
    <div className="stack-page">
      <PageHeader
        title={t('title')}
        intro={t('intro')}
        action={
          <>
            <Button onClick={() => setMode('topUp')} disabled={!wallet.data}>
              {t('topUp')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setMode('withdraw')}
              disabled={!wallet.data || wallet.data.balanceCents === 0}
            >
              {t('withdraw')}
            </Button>
          </>
        }
      />

      {wallet.isPending ? (
        <div aria-busy="true" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((k) => (
            <div key={k} aria-hidden="true" className="bg-mist/60 rounded-media h-32 animate-pulse" />
          ))}
        </div>
      ) : wallet.isError ? (
        <div
          role="alert"
          className="sheet border-ink/15 rounded-media flex flex-col items-start gap-3 border p-5 sm:p-6"
        >
          <p className="font-bold">{t('loadFailed')}</p>
          <p>{errorText(wallet.error)}</p>
          <Button variant="ghost" onClick={() => void wallet.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : (
        <BalanceTiles summary={wallet.data} />
      )}

      <History />

      {mode && wallet.data && (
        <MoneyDialog mode={mode} balanceCents={wallet.data.balanceCents} onClose={() => setMode(null)} />
      )}
    </div>
  );
}
