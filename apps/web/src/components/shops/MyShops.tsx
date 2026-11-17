'use client';

import type { MyShop } from '@yoyo/shared';
import { SHOP_LIMITS } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { Link } from '@/i18n/navigation';
import { useCategories, useMyListings } from '@/lib/listings/queries';
import { useDeleteShop, useMyShops, useSaveShop } from '@/lib/shops/queries';
import { useSession } from '@/lib/session/SessionProvider';

type Lang = 'en' | 'lv' | 'ru';

/** Dashboard → My shops: make a shop, name it, pick a category and your items, order them, delete it. */
export function MyShops() {
  const t = useTranslations('shops');
  const { user } = useSession();
  const shops = useMyShops();
  const [editing, setEditing] = useState<MyShop | 'new' | null>(null);
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-display-l leading-[0.9] font-black uppercase">{t('mineTitle')}</h1>
          <p className="text-ink/75 max-w-read">{t('mineIntro')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user && (
            <Button variant="ghost" href={`/u/${user.id}`}>
              {t('seeProfile')}
            </Button>
          )}
          <Button onClick={() => setEditing('new')} disabled={(shops.data?.length ?? 0) >= SHOP_LIMITS.perUser}>
            {t('create')}
          </Button>
        </div>
      </header>
      {shops.data && shops.data.length === 0 && <EmptyState headingLevel={2} title={t('noShops')} body={t('noShopsBody')} />}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shops.data?.map((s) => (
          <li key={s.id} className="border-ink/15 bg-surface rounded-media flex flex-col gap-3 border p-5" data-my-shop={s.id}>
            <Link href={`/shops/${s.id}`} className="font-display text-3xl leading-none font-black uppercase hover:underline">
              {s.name}
            </Link>
            <span className="text-ink/70 text-sm font-semibold">{t('itemCount', { count: s.listingIds.length })}</span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditing(s)}>
                {t('edit')}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {editing && <ShopEditor shop={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ShopEditor({ shop, onClose }: { shop: MyShop | null; onClose(): void }) {
  const t = useTranslations('shops');
  const locale = useLocale() as Lang;
  const toast = useToast();
  const save = useSaveShop();
  const remove = useDeleteShop();
  const listings = useMyListings('ALL');
  const categories = useCategories();
  const nameId = useId();
  const aboutId = useId();
  const catId = useId();
  const [name, setName] = useState(shop?.name ?? '');
  const [about, setAbout] = useState(shop?.about ?? '');
  const [categoryId, setCategoryId] = useState(shop?.categoryId ?? '');
  const [picked, setPicked] = useState<string[]>(shop?.listingIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const move = (id: string, by: -1 | 1) =>
    setPicked((p) => {
      const i = p.indexOf(id);
      const j = i + by;
      if (i < 0 || j < 0 || j >= p.length) return p;
      const next = [...p];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  const options = [{ value: '', label: t('noCategory') }, ...(categories.data ?? []).flatMap((root) => [{ value: root.id, label: root.names[locale] }, ...root.children.map((c) => ({ value: c.id, label: `${root.names[locale]} → ${c.names[locale]}` }))])];
  const mine = (listings.data ?? []).filter((l) => l.status !== 'ARCHIVED');
  const titleOf = (id: string) => mine.find((l) => l.id === id)?.title || t('untitled');

  return (
    <Dialog open onClose={onClose} title={shop ? t('editTitle', { name: shop.name }) : t('create')} wide>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length < 2) return setError(t('nameMissing'));
          save.mutate(
            { id: shop?.id ?? null, body: { name: name.trim(), about: about.trim() || null, categoryId: categoryId || null, listingIds: picked } },
            {
              onSuccess: () => {
                toast.show(t('saved'));
                onClose();
              },
              onError: () => setError(t('failed')),
            },
          );
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={nameId} className="text-sm font-bold tracking-[0.03em] uppercase">
            {t('name')}
          </label>
          <input id={nameId} value={name} maxLength={SHOP_LIMITS.name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={aboutId} className="text-sm font-bold tracking-[0.03em] uppercase">
            {t('about')}
          </label>
          <textarea id={aboutId} value={about} rows={3} maxLength={SHOP_LIMITS.about} onChange={(e) => setAbout(e.target.value)} className={`${INPUT_CLASS} min-h-24 rounded-[22px] py-2.5`} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={catId} className="text-sm font-bold tracking-[0.03em] uppercase">
            {t('category')}
          </label>
          <Select id={catId} value={categoryId} onChange={setCategoryId} options={options} />
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-bold tracking-[0.03em] uppercase">{t('items')}</legend>
          {mine.length === 0 && <p className="text-ink/75 text-sm">{t('noItemsYet')}</p>}
          <ul className="border-ink/15 divide-ink/10 max-h-72 divide-y overflow-y-auto rounded-[18px] border">
            {mine.map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-3 py-2">
                <input id={`pick-${l.id}`} type="checkbox" checked={picked.includes(l.id)} onChange={() => toggle(l.id)} className="accent-ink size-5" />
                {l.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a thumbnail from the photo store
                  <img src={l.cover.thumb} alt="" className="size-10 rounded-[8px] object-cover" />
                ) : (
                  <span className="bg-mist size-10 rounded-[8px]" />
                )}
                <label htmlFor={`pick-${l.id}`} className="min-w-0 flex-1 truncate">
                  {l.title || t('untitled')}
                </label>
              </li>
            ))}
          </ul>
          {picked.length > 1 && (
            <div className="flex flex-col gap-1">
              <p className="text-ink/70 text-sm font-semibold">{t('order')}</p>
              <ol className="flex flex-col gap-1">
                {picked.map((id, i) => (
                  <li key={id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 tabular-nums">{i + 1}.</span>
                    <span className="min-w-0 flex-1 truncate">{titleOf(id)}</span>
                    <button type="button" aria-label={t('up', { title: titleOf(id) })} disabled={i === 0} onClick={() => move(id, -1)} className="border-ink/25 rounded-pill size-8 border disabled:opacity-30">
                      ↑
                    </button>
                    <button type="button" aria-label={t('down', { title: titleOf(id) })} disabled={i === picked.length - 1} onClick={() => move(id, 1)} className="border-ink/25 rounded-pill size-8 border disabled:opacity-30">
                      ↓
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="text-sm font-bold">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          {shop ? (
            <Button
              type="button"
              variant="ghost"
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(shop.id, {
                  onSuccess: () => {
                    toast.show(t('deleted'));
                    onClose();
                  },
                })
              }
            >
              {t('delete')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" loading={save.isPending}>
              {t('save')}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
