'use client';

import type { AdminCategory } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useAdminCategories, useChangeAdminCategory } from '@/lib/admin/queries';
import { AddCategoryButton, DeleteCategoryButton } from './AdminCrud';
import { AdminPageHeader } from './parts';

type Leaf = Omit<AdminCategory, 'children'>;
type Target = { id: string; label: string };
type Lang = 'en' | 'lv' | 'ru';

/**
 * Admin → Categories: every category with its items; rename one in the three languages (or go back to
 * the catalog's names), move it up or down among its siblings, hide or show it. Changes reach the site
 * within five minutes (its category cache) and go to the audit log.
 */
export function AdminCategories() {
  const t = useTranslations('admin');
  const tc = useTranslations('admin.categories');
  const categories = useAdminCategories();
  const [renaming, setRenaming] = useState<Leaf | null>(null);
  const locale = useLocale() as Lang;
  // Where a deleted category's listings can go: subcategories, and roots without any.
  const targets: Target[] = (categories.data ?? []).flatMap((root) =>
    root.children.length > 0 ? root.children.map((c) => ({ id: c.id, label: `${root.names[locale]} → ${c.names[locale]}` })) : [{ id: root.id, label: root.names[locale] }],
  );

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <AdminPageHeader title={tc('title')} note={tc('intro')} action={<AddCategoryButton />} />
      {categories.isPending ? (
        <div aria-busy="true" className="bg-mist rounded-media h-96" />
      ) : categories.isError ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p>{t('common.loadFailed')}</p>
          <Button variant="ghost" onClick={() => void categories.refetch()}>
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {categories.data.map((root, i) => (
            <li key={root.id} className="border-ink/15 rounded-media overflow-hidden border">
              <Row category={root} first={i === 0} last={i === categories.data.length - 1} root onRename={setRenaming} targets={targets} />
              {root.children.length > 0 && (
                <ol className="border-ink/10 divide-ink/10 divide-y border-t">
                  {root.children.map((child, j) => (
                    <li key={child.id}>
                      <Row category={child} first={j === 0} last={j === root.children.length - 1} onRename={setRenaming} targets={targets} />
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
      <RenameDialog category={renaming} onClose={() => setRenaming(null)} />
    </div>
  );
}

function Row({ category: c, first, last, root = false, onRename, targets }: { category: Leaf; first: boolean; last: boolean; root?: boolean; onRename(c: Leaf): void; targets: Target[] }) {
  const tc = useTranslations('admin.categories');
  const locale = useLocale() as Lang;
  const toast = useToast();
  const change = useChangeAdminCategory();
  const act = (body: Parameters<typeof change.mutate>[0]['change']) => change.mutate({ id: c.id, change: body }, { onError: () => toast.show(tc('failed')) });
  const icon = 'border-ink/25 hover:border-ink rounded-pill inline-grid size-9 place-items-center border disabled:opacity-30';

  return (
    <div className={`flex flex-wrap items-center gap-3 px-4 py-3 ${root ? 'bg-ink/[0.03]' : 'pl-8'} ${c.hidden ? 'opacity-60' : ''}`}>
      <div className="min-w-0 flex-1">
        <p className={root ? 'font-display text-3xl leading-none font-black uppercase' : 'font-semibold'}>{c.names[locale]}</p>
        <p className="text-ink/70 mt-1 text-sm">
          {tc('items', { count: c.items })}
          {c.renamed && <span className="bg-ink text-canvas rounded-pill ml-2 px-2 py-0.5 text-xs font-bold">{tc('renamed')}</span>}
          {c.hidden && <span className="border-ink/30 rounded-pill ml-2 border px-2 py-0.5 text-xs font-bold">{tc('hidden')}</span>}
          {c.custom && <span className="border-ink/30 rounded-pill ml-2 border px-2 py-0.5 text-xs font-bold">{tc('custom')}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <button type="button" className={icon} disabled={first || change.isPending} onClick={() => act({ move: 'up' })} aria-label={`${tc('up')}: ${c.names[locale]}`} title={tc('up')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
            <path d="M6 15l6-6 6 6" />
          </svg>
        </button>
        <button type="button" className={icon} disabled={last || change.isPending} onClick={() => act({ move: 'down' })} aria-label={`${tc('down')}: ${c.names[locale]}`} title={tc('down')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2]">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        <button type="button" onClick={() => onRename(c)} className="border-ink/25 hover:border-ink rounded-pill min-h-9 border px-3 text-xs font-bold uppercase">
          {tc('rename')}
        </button>
        <button type="button" onClick={() => act({ hidden: !c.hidden })} disabled={change.isPending} className="border-ink/25 hover:border-ink rounded-pill min-h-9 border px-3 text-xs font-bold uppercase">
          {c.hidden ? tc('show') : tc('hide')}
        </button>
        {root && <AddCategoryButton parent={c} />}
        <DeleteCategoryButton category={c} targets={targets} />
      </div>
    </div>
  );
}

function RenameDialog({ category, onClose }: { category: Leaf | null; onClose(): void }) {
  const tc = useTranslations('admin.categories');
  const locale = useLocale() as Lang;
  const toast = useToast();
  const change = useChangeAdminCategory();
  const [names, setNames] = useState<Record<Lang, string> | null>(null);
  const current = names ?? category?.names ?? { en: '', lv: '', ru: '' };
  const close = () => {
    setNames(null);
    onClose();
  };
  const save = (value: Record<Lang, string> | null) =>
    category &&
    change.mutate(
      { id: category.id, change: { names: value } },
      {
        onSuccess: () => {
          toast.show(tc('done'));
          close();
        },
        onError: () => toast.show(tc('failed')),
      },
    );

  return (
    <Dialog open={category !== null} onClose={close} title={category ? tc('renameTitle', { name: category.names[locale] }) : ''}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if ((['en', 'lv', 'ru'] as Lang[]).every((l) => current[l].trim())) save({ en: current.en.trim(), lv: current.lv.trim(), ru: current.ru.trim() });
        }}
      >
        {(['lv', 'en', 'ru'] as Lang[]).map((lang) => (
          <label key={lang} className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold uppercase">{lang}</span>
            <input value={current[lang]} maxLength={60} onChange={(e) => setNames({ ...current, [lang]: e.target.value })} className={INPUT_CLASS} />
            {category && <span className="text-ink/65 text-xs">{tc('original', { name: category.defaultNames[lang] })}</span>}
          </label>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {category?.renamed ? (
            <button type="button" onClick={() => save(null)} className="text-sm font-bold underline decoration-1 underline-offset-4">
              {tc('reset')}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              {tc('cancel')}
            </Button>
            <Button type="submit" loading={change.isPending}>
              {tc('save')}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
