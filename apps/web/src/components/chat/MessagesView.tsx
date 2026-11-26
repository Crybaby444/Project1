'use client';

import { PageHeader } from '@/components/ui/PageHeader';
import type { ChatMessage, ConversationSummary, ConversationThread } from '@yoyo/shared';
import { MESSAGE_TEXT } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from '@/i18n/navigation';
import { ReportButton } from '@/components/reports/ReportButton';
import { DealStrip } from './DealStrip';
import { initials } from '@/components/item/OwnerCard';
import { useConversations, useMarkRead, useSendMessage, useThread } from '@/lib/chat/queries';
import { dealKeys } from '@/lib/deals/queries';
import { useQueryClient } from '@tanstack/react-query';

const dayKey = (iso: string) => iso.slice(0, 10);

function useFormats() {
  const locale = useLocale();
  const t = useTranslations('chat');
  const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const day = (iso: string) => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 86_400_000);
    const d = new Date(iso);
    if (d.toDateString() === today.toDateString()) return t('today');
    if (d.toDateString() === yesterday.toDateString()) return t('yesterday');
    return date.format(d);
  };
  /** A list stamp: the time today, the date before. */
  const stamp = (iso: string) =>
    new Date(iso).toDateString() === new Date().toDateString()
      ? time.format(new Date(iso))
      : date.format(new Date(iso));
  return { time: (iso: string) => time.format(new Date(iso)), day, stamp };
}

/** What a line says in the list: a person's text, or the deal step in the reader's language. */
function useLineText() {
  const t = useTranslations('chat');
  return (m: ChatMessage) => (m.kind === 'SYSTEM' && m.event ? t(`system.${m.event}`) : m.text);
}

/**
 * "Messages" (plan 9, spec §4.6): my conversations and, when one is open, its thread. On a phone the
 * page is either the list or the thread; from 1024px both sit side by side. The thread asks for new
 * lines every few seconds while the tab is visible; the text is always text, never HTML.
 */
export function MessagesView({ activeId }: { activeId?: string }) {
  const t = useTranslations('chat');
  const conversations = useConversations();
  const frame = useRef<HTMLDivElement>(null);
  const fit = useFitAboveTabBar(frame, Boolean(activeId) && conversations.isSuccess);

  return (
    <div className="stack-page min-h-0 flex-1">
      <div className={activeId ? 'max-lg:sr-only' : ''}>
        <PageHeader title={t('title')} count={conversations.data?.length} />
      </div>
      {conversations.isPending ? (
        <div aria-busy="true" className="border-ink/15 rounded-media h-64 border" />
      ) : conversations.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('loadFailed')}</p>
          <Button variant="ghost" onClick={() => void conversations.refetch()}>
            {t('retry')}
          </Button>
        </div>
      ) : conversations.data.length === 0 && !activeId ? (
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Button href="/c" size="lg">
              {t('browse')}
            </Button>
          }
        />
      ) : (
        <div
          ref={frame}
          data-thread-open={activeId ? '' : undefined}
          style={fit ? ({ '--frame-h': `${fit}px` } as CSSProperties) : undefined}
          className={`sheet border-ink/15 rounded-media grid h-[max(26rem,calc(100svh-17rem))] grid-cols-[minmax(0,1fr)] overflow-hidden border lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] ${activeId && fit ? 'max-lg:h-[var(--frame-h)]' : ''}`}
        >
          <div
            className={`border-ink/15 min-h-0 overflow-y-auto lg:border-r ${activeId ? 'max-lg:hidden' : ''}`}
          >
            <ConversationList items={conversations.data} activeId={activeId} />
          </div>
          <div className={`flex min-h-0 min-w-0 flex-col ${activeId ? '' : 'max-lg:hidden'}`}>
            {activeId ? (
              <Thread key={activeId} id={activeId} />
            ) : (
              <p className="text-ink/75 m-auto px-6 py-16 text-center">{t('pick')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ConversationList({ items, activeId }: { items: ConversationSummary[]; activeId?: string }) {
  const t = useTranslations('chat');
  const text = useLineText();
  const { stamp } = useFormats();
  return (
    <ul aria-label={t('listLabel')} className="divide-ink/10 divide-y">
      {items.map((c) => {
        const active = c.id === activeId;
        return (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              aria-current={active ? 'page' : undefined}
              className={`ease-yoyo flex gap-3 px-4 py-4 transition-colors duration-150 ${active ? 'bg-ink text-canvas' : 'hover:bg-ink/[0.04]'}`}
            >
              {c.listing ? <Thumb url={c.listing.photoUrl} /> : <Initials name={c.other.name} />}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={`truncate ${c.unread > 0 ? 'font-bold' : 'font-semibold'}`}>
                    {c.other.name}
                  </span>
                  <span
                    className={`shrink-0 text-xs tabular-nums ${active ? 'text-canvas/80' : 'text-ink/75'}`}
                  >
                    {stamp(c.lastMessageAt)}
                  </span>
                </span>
                {c.listing && (
                  <span className={`block truncate text-sm ${active ? 'text-canvas/75' : 'text-ink/65'}`}>
                    {c.listing.title}
                  </span>
                )}
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-sm ${c.unread > 0 ? 'font-semibold' : active ? 'text-canvas/75' : 'text-ink/65'}`}
                  >
                    {c.lastMessage
                      ? `${c.lastMessage.mine ? `${t('you')}: ` : ''}${text(c.lastMessage)}`
                      : ''}
                  </span>
                  {c.unread > 0 && (
                    <span
                      className={`rounded-pill inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center px-1.5 text-xs font-bold tabular-nums ${active ? 'bg-canvas text-ink' : 'bg-ink text-canvas'}`}
                    >
                      <span aria-hidden="true">{c.unread}</span>
                      <span className="sr-only">{t('unread', { count: c.unread })}</span>
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * On a phone an open conversation fills the screen from where it starts down to the tab bar, which never
 * moves (owner, 2026-11-26), so the box to write in is always above it, whatever sits over the frame (the
 * email banner, for one). Measured, as that top is not known in CSS; null on wider screens.
 */
function useFitAboveTabBar(ref: RefObject<HTMLDivElement | null>, open: boolean): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = ref.current;
      if (!el || window.innerWidth >= 1024) return setHeight(null);
      const top = el.getBoundingClientRect().top + window.scrollY;
      setHeight(Math.max(320, Math.round(window.innerHeight - top - 104)));
    };
    const frame = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [ref, open]);
  return open ? height : null;
}

/** A personal conversation has no item photo: the other person's initials instead. */
function Initials({ name }: { name: string }) {
  const letters = initials(name);
  return (
    <span
      aria-hidden="true"
      className="bg-ink text-canvas font-display grid size-12 shrink-0 place-items-center rounded-full text-xl font-black"
    >
      {letters}
    </span>
  );
}

function Thumb({ url }: { url: string | null }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- a 48px thumbnail from the photo store
    <img
      src={url}
      alt=""
      width={48}
      height={48}
      className="bg-mist size-12 shrink-0 rounded-tile object-cover"
    />
  ) : (
    <span aria-hidden="true" className="bg-mist border-ink/10 size-12 shrink-0 rounded-tile border" />
  );
}

/** One conversation; `inDeal` when shown inside its deal's page (no back link, no 'open the deal'). */
export function Thread({ id, inDeal = false }: { id: string; inDeal?: boolean }) {
  const t = useTranslations('chat');
  const thread = useThread(id);
  const markRead = useMarkRead(id);
  const unread = thread.data?.unread ?? 0;
  const lastId = thread.data?.messages.at(-1)?.id;

  // A deal step shows up as a system line: refresh the deal too, so its buttons are current.
  const queryClient = useQueryClient();
  const lastSystem = thread.data?.messages.filter((m) => m.kind === 'SYSTEM').at(-1)?.id;
  const dealId = thread.data?.dealId;
  useEffect(() => {
    if (lastSystem && dealId) void queryClient.invalidateQueries({ queryKey: dealKeys.one(dealId) });
  }, [lastSystem, dealId, queryClient]);

  // Reading the thread marks it read; again whenever new lines from the other side arrive.
  const { mutate } = markRead;
  useEffect(() => {
    if (unread > 0) mutate();
  }, [unread, lastId, mutate]);

  if (thread.isPending) return <div aria-busy="true" className="flex-1" />;
  if (thread.isError) {
    return (
      <div role="alert" className="m-auto flex flex-col items-center gap-3 px-6 py-16">
        <p>{t('loadFailed')}</p>
        <Button variant="ghost" onClick={() => void thread.refetch()}>
          {t('retry')}
        </Button>
      </div>
    );
  }
  return <ThreadBody data={thread.data} inDeal={inDeal} />;
}

function ThreadBody({ data, inDeal }: { data: ConversationThread; inDeal: boolean }) {
  const t = useTranslations('chat');
  const text = useLineText();
  const { time, day } = useFormats();
  const logRef = useRef<HTMLDivElement>(null);
  const count = data.messages.length;

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [count]);

  const lastMine = [...data.messages].reverse().find((m) => m.mine && m.kind === 'TEXT');
  const seen = lastMine && data.otherReadAt !== null && data.otherReadAt >= lastMine.createdAt;

  return (
    <>
      <header className="border-ink/15 flex items-center gap-3 border-b px-4 py-3">
        {!inDeal && (
          <Link
            href="/messages"
            className="rounded-pill hover:bg-ink/[0.06] -ml-1 inline-grid size-10 place-items-center lg:hidden"
          >
            <span aria-hidden="true">←</span>
            <span className="sr-only">{t('back')}</span>
          </Link>
        )}
        {data.listing ? <Thumb url={data.listing.photoUrl} /> : <Initials name={data.other.name} />}
        <span className="min-w-0 flex-1">
          <Link
            href={`/u/${data.other.id}`}
            className="font-display block text-3xl leading-none font-black [overflow-wrap:anywhere] uppercase hover:underline"
          >
            {data.other.name}
          </Link>
          {data.listing && (
            <span className="text-ink/65 block truncate text-sm">
              {data.role === 'RENTER' ? t('withOwner') : t('withRenter')} ·{' '}
              <Link href={`/items/${data.listing.id}`} className="underline decoration-1 underline-offset-2">
                {data.listing.title}
              </Link>
            </span>
          )}
        </span>
        <ReportButton target="USER" id={data.other.id} className="max-sm:hidden" />
      </header>
      {/* The deal and the chat are one place (owner, 2026-11-16): its status and the next step sit in the chat. */}
      {data.dealId && !inDeal && <DealStrip id={data.dealId} />}

      <div
        ref={logRef}
        role="log"
        tabIndex={0}
        aria-live="polite"
        aria-label={data.other.name}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-5"
      >
        <ol className="flex min-h-full flex-col gap-1.5">
          {count === 0 && (
            <li className="text-ink/75 m-auto max-w-xs text-center text-sm">{t('noMessages')}</li>
          )}
          {data.messages.map((m, i) => {
            const prev = data.messages[i - 1];
            const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
            return (
              <li key={m.id} className="flex flex-col">
                {newDay && (
                  <span className="text-ink/75 my-3 self-center text-xs font-semibold tracking-wide">
                    {day(m.createdAt)}
                  </span>
                )}
                {m.kind === 'SYSTEM' ? (
                  <span className="text-ink/70 my-2 flex items-center gap-3 text-sm font-semibold">
                    <span aria-hidden="true" className="bg-ink/15 h-px flex-1" />
                    <span className="text-center">{text(m)}</span>
                    <span aria-hidden="true" className="bg-ink/15 h-px flex-1" />
                  </span>
                ) : (
                  <span
                    className={`max-w-[min(80%,34rem)] rounded-float px-4 py-2.5 break-words whitespace-pre-wrap ${
                      m.mine
                        ? 'bg-ink text-canvas self-end rounded-br-[6px]'
                        : 'border-ink/15 bg-surface self-start rounded-bl-[6px] border'
                    }`}
                  >
                    {m.text}
                    <span
                      className={`mt-0.5 block text-right text-xs tabular-nums ${m.mine ? 'text-canvas/75' : 'text-ink/70'}`}
                    >
                      {time(m.createdAt)}
                    </span>
                  </span>
                )}
                {seen && m.id === lastMine.id && (
                  <span className="text-ink/75 mt-1 self-end text-xs font-semibold">{t('seen')}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <Composer id={data.id} aboutItem={data.listing !== null} />
    </>
  );
}

/** `aboutItem`: the payments note is about deals, so a direct message between people goes without it (owner, 2026-11-16). */
function Composer({ id, aboutItem }: { id: string; aboutItem: boolean }) {
  const t = useTranslations('chat');
  const send = useSendMessage(id);
  // Opened from an item ("Write to the owner"): the box starts with the item's link.
  const [draft, setDraft] = useState(() => {
    if (typeof window === 'undefined') return '';
    const about = new URLSearchParams(window.location.search).get('about');
    return about && /^[\w-]{1,64}$/.test(about) ? `${window.location.origin}/listings/${about}\n` : '';
  });
  const ready = draft.trim().length > 0 && !send.isPending;

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = draft.trim();
    if (!text || send.isPending) return;
    send.mutate(text, { onSuccess: () => setDraft('') });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter starts a new line; typing with an IME never sends mid-word.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) submit(event);
  }

  return (
    <form onSubmit={submit} className="border-ink/15 flex flex-col gap-2 border-t p-3">
      {send.isError && (
        <p role="alert" className="px-2 text-sm font-semibold">
          {t('sendFailed')}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          aria-label={t('placeholder')}
          placeholder={t('placeholder')}
          value={draft}
          maxLength={MESSAGE_TEXT.max}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          className="border-ink bg-surface text-ink placeholder:text-ink/60 field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-float border px-4 py-2.5 text-base"
        />
        <Button type="submit" disabled={!ready} aria-busy={send.isPending}>
          {send.isPending ? t('sending') : t('send')}
        </Button>
      </div>
      {aboutItem && <p className="text-ink/70 px-2 text-xs">{t('hint')}</p>}
    </form>
  );
}
