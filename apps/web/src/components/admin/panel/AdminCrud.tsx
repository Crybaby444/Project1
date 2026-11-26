'use client';

import type { AdminCategory, AdminUserDetail } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { INPUT_CLASS, TEXTAREA_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from '@/i18n/navigation';
import { useAdminCrud } from '@/lib/admin/queries';
import { ApiError } from '@/lib/session/api-error';
import { AdminSelect } from './parts';

type Lang = 'en' | 'lv' | 'ru';
const LANGS: Lang[] = ['lv', 'en', 'ru'];

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  hint,
  required = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange(v: string): void;
  type?: string;
  hint?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          maxLength={500}
          className={TEXTAREA_CLASS}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          required={required}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
        />
      )}
      {hint && <span className="text-ink/65 text-xs">{hint}</span>}
    </div>
  );
}

/** What the API's refusal means, in the panel's words. */
function useWhy() {
  const t = useTranslations('admin.crud');
  return (error: unknown) => {
    if (error instanceof ApiError) {
      if (error.code === 'AUTH_EMAIL_TAKEN') return t('emailTaken');
      const why = error.details?.why;
      if (
        typeof why === 'string' &&
        [
          'SELF',
          'STAFF',
          'OPEN_DEALS',
          'WALLET_NOT_EMPTY',
          'HAS_CHILDREN',
          'HAS_LISTINGS',
          'TOO_DEEP',
        ].includes(why)
      )
        return t(`why.${why}`);
      if (error.code === 'VALIDATION_FAILED') return t('invalid');
    }
    return t('failed');
  };
}

function Form({
  children,
  onSubmit,
  error,
  busy,
  submit,
  onCancel,
  danger = false,
}: {
  children: ReactNode;
  onSubmit(): void;
  error: string | null;
  busy: boolean;
  submit: string;
  onCancel(): void;
  danger?: boolean;
}) {
  const t = useTranslations('admin.crud');
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      {children}
      {error && (
        <p role="alert" className="text-sm font-bold">
          {error}
        </p>
      )}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          {t('cancel')}
        </Button>
        <Button
          type="submit"
          loading={busy}
          className={danger ? 'border-[var(--danger)] bg-[var(--danger)]' : undefined}
        >
          {submit}
        </Button>
      </div>
    </form>
  );
}

/** Admin → Users: add a person. */
export function AddPersonButton() {
  const t = useTranslations('admin.crud');
  const crud = useAdminCrud();
  const toast = useToast();
  const why = useWhy();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ name: '', email: '', password: '', locale: 'lv' as Lang });
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setError(null);
    setV({ name: '', email: '', password: '', locale: 'lv' });
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>{t('addPerson')}</Button>
      <Dialog open={open} onClose={close} title={t('addPerson')}>
        <Form
          busy={crud.addPerson.isPending}
          error={error}
          submit={t('add')}
          onCancel={close}
          onSubmit={() => {
            if (!v.name.trim() || !v.email.trim() || (v.password && v.password.length < 8))
              return setError(t('invalid'));
            crud.addPerson.mutate(
              {
                name: v.name.trim(),
                email: v.email.trim(),
                locale: v.locale,
                ...(v.password ? { password: v.password } : {}),
              },
              {
                onSuccess: (r) => {
                  toast.show(r.passwordLinkSent ? t('addedLink') : t('added'));
                  close();
                  router.push(`/admin/users/${r.id}`);
                },
                onError: (e) => setError(why(e)),
              },
            );
          }}
        >
          <TextField label={t('name')} value={v.name} onChange={(name) => setV({ ...v, name })} required />
          <TextField
            label={t('email')}
            type="email"
            value={v.email}
            onChange={(email) => setV({ ...v, email })}
            required
          />
          <TextField
            label={t('password')}
            type="password"
            value={v.password}
            onChange={(password) => setV({ ...v, password })}
            hint={t('passwordHint')}
          />
          <AdminSelect
            label={t('language')}
            value={v.locale}
            onChange={(locale) => setV({ ...v, locale: locale as Lang })}
            options={LANGS.map((l) => ({ value: l, label: l.toUpperCase() }))}
          />
        </Form>
      </Dialog>
    </>
  );
}

/** A person's page: correct their name, email, city, about. */
export function EditPersonButton({ user }: { user: AdminUserDetail['user'] }) {
  const t = useTranslations('admin.crud');
  const crud = useAdminCrud();
  const toast = useToast();
  const why = useWhy();
  const [open, setOpen] = useState(false);
  const initial = { name: user.name, email: user.email, city: user.city ?? '', about: user.about ?? '' };
  const [v, setV] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setError(null);
  };
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => {
          setV(initial);
          setOpen(true);
        }}
      >
        {t('edit')}
      </Button>
      <Dialog open={open} onClose={close} title={t('editPerson', { name: user.name })}>
        <Form
          busy={crud.editPerson.isPending}
          error={error}
          submit={t('save')}
          onCancel={close}
          onSubmit={() => {
            if (!v.name.trim() || !v.email.trim()) return setError(t('invalid'));
            crud.editPerson.mutate(
              {
                id: user.id,
                name: v.name.trim(),
                email: v.email.trim(),
                city: v.city.trim() || null,
                about: v.about.trim() || null,
              },
              {
                onSuccess: () => {
                  toast.show(t('saved'));
                  close();
                },
                onError: (e) => setError(why(e)),
              },
            );
          }}
        >
          <TextField label={t('name')} value={v.name} onChange={(name) => setV({ ...v, name })} required />
          <TextField
            label={t('email')}
            type="email"
            value={v.email}
            onChange={(email) => setV({ ...v, email })}
            required
          />
          <TextField label={t('city')} value={v.city} onChange={(city) => setV({ ...v, city })} />
          <TextField
            label={t('about')}
            value={v.about}
            onChange={(about) => setV({ ...v, about })}
            multiline
          />
        </Form>
      </Dialog>
    </>
  );
}

/** A person's page: delete their account (the same rules as their own deletion). */
export function DeletePersonButton({ user }: { user: AdminUserDetail['user'] }) {
  const t = useTranslations('admin.crud');
  const crud = useAdminCrud();
  const toast = useToast();
  const why = useWhy();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {t('delete')}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={t('deletePerson', { name: user.name })}>
        <Form
          danger
          busy={crud.deletePerson.isPending}
          error={error}
          submit={t('deleteYes')}
          onCancel={() => setOpen(false)}
          onSubmit={() =>
            crud.deletePerson.mutate(user.id, {
              onSuccess: () => {
                toast.show(t('deleted'));
                router.push('/admin/users');
              },
              onError: (e) => setError(why(e)),
            })
          }
        >
          <p>{t('deletePersonBody')}</p>
        </Form>
      </Dialog>
    </>
  );
}

/** Admin → Categories: a new root (no parent) or a subcategory of `parent`. */
export function AddCategoryButton({ parent }: { parent?: Pick<AdminCategory, 'id' | 'names'> }) {
  const t = useTranslations('admin.crud');
  const locale = useLocale() as Lang;
  const crud = useAdminCrud();
  const toast = useToast();
  const why = useWhy();
  const [open, setOpen] = useState(false);
  const [names, setNames] = useState<Record<Lang, string>>({ en: '', lv: '', ru: '' });
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setOpen(false);
    setError(null);
    setNames({ en: '', lv: '', ru: '' });
  };
  const title = parent ? t('addSub', { name: parent.names[locale] }) : t('addRoot');
  return (
    <>
      {parent ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="border-ink/25 hover:border-ink rounded-pill min-h-9 border px-3 text-xs font-bold uppercase"
        >
          {t('addSubShort')}
        </button>
      ) : (
        <Button onClick={() => setOpen(true)}>{t('addRoot')}</Button>
      )}
      <Dialog open={open} onClose={close} title={title}>
        <Form
          busy={crud.addCategory.isPending}
          error={error}
          submit={t('add')}
          onCancel={close}
          onSubmit={() => {
            if (LANGS.some((l) => !names[l].trim())) return setError(t('allNames'));
            crud.addCategory.mutate(
              {
                names: { en: names.en.trim(), lv: names.lv.trim(), ru: names.ru.trim() },
                parentId: parent?.id ?? null,
              },
              {
                onSuccess: () => {
                  toast.show(t('added'));
                  close();
                },
                onError: (e) => setError(why(e)),
              },
            );
          }}
        >
          {LANGS.map((l) => (
            <TextField
              key={l}
              label={l.toUpperCase()}
              value={names[l]}
              onChange={(x) => setNames({ ...names, [l]: x })}
              required
            />
          ))}
          <p className="text-ink/70 text-sm">{t('categoryHint')}</p>
        </Form>
      </Dialog>
    </>
  );
}

/** Admin → Categories: delete one; its listings move to the subcategory the admin picks. */
export function DeleteCategoryButton({
  category,
  targets,
}: {
  category: Pick<AdminCategory, 'id' | 'names' | 'allListings'>;
  targets: { id: string; label: string }[];
}) {
  const t = useTranslations('admin.crud');
  const locale = useLocale() as Lang;
  const crud = useAdminCrud();
  const toast = useToast();
  const why = useWhy();
  const [open, setOpen] = useState(false);
  const [moveTo, setMoveTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const options = targets.filter((x) => x.id !== category.id);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-ink/25 hover:border-ink rounded-pill min-h-9 border px-3 text-xs font-bold uppercase"
      >
        {t('delete')}
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t('deleteCategory', { name: category.names[locale] })}
      >
        <Form
          danger
          busy={crud.deleteCategory.isPending}
          error={error}
          submit={t('deleteYes')}
          onCancel={() => setOpen(false)}
          onSubmit={() => {
            if (category.allListings > 0 && !moveTo) return setError(t('chooseTarget'));
            crud.deleteCategory.mutate(
              { id: category.id, ...(moveTo ? { moveTo } : {}) },
              {
                onSuccess: () => {
                  toast.show(t('deleted'));
                  setOpen(false);
                },
                onError: (e) => setError(why(e)),
              },
            );
          }}
        >
          <p>
            {category.allListings > 0
              ? t('deleteCategoryMove', { count: category.allListings })
              : t('deleteCategoryEmpty')}
          </p>
          {category.allListings > 0 && (
            <AdminSelect
              label={t('moveTo')}
              value={moveTo}
              onChange={setMoveTo}
              className="min-w-64"
              options={[
                { value: '', label: t('choose') },
                ...options.map((o) => ({ value: o.id, label: o.label })),
              ]}
            />
          )}
        </Form>
      </Dialog>
    </>
  );
}
