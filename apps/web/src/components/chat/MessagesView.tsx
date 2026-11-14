'use client';

import type { ChatMessage, ConversationSummary, ConversationThread } from '@yoyo/shared';
import { MESSAGE_TEXT } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from '@/i18n/navigation';
import { useConversations, useMarkRead, useSendMessage, useThread } from '@/lib/chat/queries';

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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <h1
        className={`font-display text-[clamp(2.6rem,6vw,4.8rem)] leading-[0.95] font-black uppercase ${activeId ? 'max-lg:sr-only' : ''}`}
      >
        {t('title')}
      </h1>
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
        <div className={`border-ink/15 rounded-media grid h-[max(26rem,calc(100svh-15rem))] grid-cols-[minmax(0,1fr)] overflow-hidden border lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] ${activeId ? 'max-lg:h-[calc(100svh-7.5rem)]' : ''}`}>
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
              <Thumb url={c.listing.photoUrl} />
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
                <span className={`block truncate text-sm ${active ? 'text-canvas/75' : 'text-ink/65'}`}>
                  {c.listing.title}
                </span>
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
                      className={`rounded-pill inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center px-1.5 text-[11px] font-bold tabular-nums ${active ? 'bg-canvas text-ink' : 'bg-ink text-canvas'}`}
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

function Thumb({ url }: { url: string | null }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- a 48px thumbnail from the photo store
    <img
      src={url}
      alt=""
      width={48}
      height={48}
      className="bg-mist size-12 shrink-0 rounded-[12px] object-cover"
    />
  ) : (
    <span aria-hidden="true" className="bg-mist border-ink/10 size-12 shrink-0 rounded-[12px] border" />
  );
}

function Thread({ id }: { id: string }) {
  const t = useTranslations('chat');
  const thread = useThread(id);
  const markRead = useMarkRead(id);
  const unread = thread.data?.unread ?? 0;
  const lastId = thread.data?.messages.at(-1)?.id;

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
  return <ThreadBody data={thread.data} />;
}

function ThreadBody({ data }: { data: ConversationThread }) {
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
        <Link
          href="/messages"
          className="rounded-pill hover:bg-ink/[0.06] -ml-1 inline-grid size-10 place-items-center lg:hidden"
        >
          <span aria-hidden="true">←</span>
          <span className="sr-only">{t('back')}</span>
        </Link>
        <Thumb url={data.listing.photoUrl} />
        <span className="min-w-0 flex-1">
          <span className="font-display block truncate text-[1.6rem] leading-none font-black uppercase">
            {data.other.name}
          </span>
          <span className="text-ink/65 block truncate text-sm">
            {data.role === 'RENTER' ? t('withOwner') : t('withRenter')} ·{' '}
            <Link href={`/items/${data.listing.id}`} className="underline decoration-1 underline-offset-2">
              {data.listing.title}
            </Link>
          </span>
        </span>
        {data.dealId && (
          <Button href={`/bookings/${data.dealId}`} variant="ghost" className="max-sm:hidden">
            {t('openDeal')}
          </Button>
        )}
      </header>

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
                  <span className="text-ink/70 my-2 flex items-center gap-3 text-[13px] font-semibold">
                    <span aria-hidden="true" className="bg-ink/15 h-px flex-1" />
                    <span className="text-center">{text(m)}</span>
                    <span aria-hidden="true" className="bg-ink/15 h-px flex-1" />
                  </span>
                ) : (
                  <span
                    className={`max-w-[min(80%,34rem)] rounded-[20px] px-4 py-2.5 break-words whitespace-pre-wrap ${
                      m.mine
                        ? 'bg-ink text-canvas self-end rounded-br-[6px]'
                        : 'border-ink/15 bg-surface self-start rounded-bl-[6px] border'
                    }`}
                  >
                    {m.text}
                    <span
                      className={`mt-0.5 block text-right text-[11px] tabular-nums ${m.mine ? 'text-canvas/75' : 'text-ink/70'}`}
                    >
                      {time(m.createdAt)}
                    </span>
                  </span>
                )}
                {seen && m.id === lastMine.id && (
                  <span className="text-ink/75 mt-1 self-end text-[11px] font-semibold">{t('seen')}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <Composer id={data.id} />
    </>
  );
}

function Composer({ id }: { id: string }) {
  const t = useTranslations('chat');
  const send = useSendMessage(id);
  const [draft, setDraft] = useState('');
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
          className="border-ink bg-surface text-ink placeholder:text-ink/60 field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-[22px] border px-4 py-2.5 text-base"
        />
        <Button type="submit" disabled={!ready} aria-busy={send.isPending}>
          {send.isPending ? t('sending') : t('send')}
        </Button>
      </div>
      <p className="text-ink/70 px-2 text-xs">{t('hint')}</p>
    </form>
  );
}
