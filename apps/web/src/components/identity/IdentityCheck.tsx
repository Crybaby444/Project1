'use client';

import { IDENTITY_DOCUMENTS, type IdentityDocument } from '@yoyo/shared';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { ChoicePills } from '@/components/ui/ChoicePills';
import { Button } from '@/components/ui/Button';
import { useIdentityState, useSubmitIdentity } from '@/lib/identity/queries';
import { UnreadablePhotoError } from '@/lib/identity/shrink';
import { ApiError } from '@/lib/session/api-error';

/** One photo: a tile you tap to pick or take it; the picture shows in its place. */
function PhotoTile({ label, hint, file, onFile, capture, error }: { label: string; hint: string; file: File | null; onFile: (f: File | null) => void; capture?: 'user' | 'environment'; error?: string | undefined }) {
  const id = useId();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) return;
    const next = URL.createObjectURL(file);
    // The preview follows the chosen file; the old object URL is released with it.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronising with an external object URL
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={id}
        className={`rounded-media ease-yoyo relative grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden border-[1.5px] border-dashed transition-colors focus-within:outline-2 focus-within:outline-offset-2 ${error ? 'border-[var(--danger)]' : 'border-ink/30 hover:border-ink'}`}
      >
        {file && url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a local preview (object URL)
          <img src={url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 px-4 text-center">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            <span className="text-base font-bold">{label}</span>
          </span>
        )}
        <input
          id={id}
          type="file"
          accept="image/*"
          {...(capture && { capture })}
          className="sr-only"
          aria-describedby={`${id}-hint`}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        {file && <span className="sr-only">{label}</span>}
      </label>
      <p id={`${id}-hint`} className={`text-sm leading-snug ${error ? 'text-[var(--danger)]' : 'text-ink/70'}`}>
        {error ?? hint}
      </p>
    </div>
  );
}

/**
 * Confirming who you are (owner, 2026-11-16): a document photo and a selfie, looked at by a moderator,
 * needed to lend, to rent and to sign a deal's contract. Said plainly: why, who sees it, when it is erased.
 */
export function IdentityCheck() {
  const t = useTranslations('identityCheck');
  const format = useFormatter();
  const state = useIdentityState();
  const submit = useSubmitIdentity();
  const [documentType, setDocumentType] = useState<IdentityDocument | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [tried, setTried] = useState(false);

  if (state.isPending) return <div aria-busy="true" className="bg-mist rounded-media h-40" />;
  if (state.isError) {
    return (
      <Button variant="ghost" onClick={() => void state.refetch()}>
        {t('loadFailed')}
      </Button>
    );
  }

  const { status, refusal: reason, decidedAt, submittedAt } = state.data;
  if (status === 'VERIFIED') {
    return (
      <p role="status" className="bg-ink text-canvas rounded-media flex items-start gap-3 p-5 leading-relaxed">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-0.5 size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12l2 2 4-4M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
        </svg>
        <span>{t('verified', { date: decidedAt ? format.dateTime(new Date(decidedAt), { dateStyle: 'medium' }) : '' })}</span>
      </p>
    );
  }
  if (status === 'PENDING') {
    return (
      <p role="status" className="border-ink/20 rounded-media border p-5 leading-relaxed">
        {t('pending', { date: submittedAt ? format.dateTime(new Date(submittedAt), { dateStyle: 'medium' }) : '' })}
      </p>
    );
  }

  const missing = {
    documentType: tried && !documentType ? t('errors.documentType') : undefined,
    document: tried && !document ? t('errors.document') : undefined,
    selfie: tried && !selfie ? t('errors.selfie') : undefined,
    consent: tried && !consent ? t('errors.consent') : undefined,
  };
  const unreadable = submit.error instanceof UnreadablePhotoError;
  const failure = submit.error instanceof ApiError ? submit.error : submit.error && !unreadable ? ApiError.network() : null;

  function send(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!documentType || !document || !selfie || !consent) return;
    submit.mutate({ documentType, document, selfie });
  }

  return (
    <form noValidate onSubmit={send} className="flex flex-col gap-6">
      {status === 'REJECTED' && reason && (
        <p role="alert" className="rounded-media border border-[var(--danger)] p-4 leading-relaxed">
          {t('rejected', { reason })}
        </p>
      )}
      <ul className="m-0 grid list-none gap-2 p-0 text-base leading-relaxed">
        {(['why', 'who', 'erase'] as const).map((k) => (
          <li key={k} className="flex gap-3">
            <span aria-hidden="true" className="bg-ink mt-[0.6em] size-1.5 shrink-0 rounded-full" />
            {t(`facts.${k}`)}
          </li>
        ))}
      </ul>
      <ChoicePills<IdentityDocument>
        legend={t('documentType')}
        choices={IDENTITY_DOCUMENTS.map((d) => ({ value: d, label: t(`documents.${d}`) }))}
        value={documentType}
        onChange={setDocumentType}
        error={missing.documentType}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PhotoTile label={t('document.label')} hint={t('document.hint')} file={document} onFile={setDocument} capture="environment" error={missing.document} />
        <PhotoTile label={t('selfie.label')} hint={t('selfie.hint')} file={selfie} onFile={setSelfie} capture="user" error={missing.selfie} />
      </div>
      <label className="flex items-start gap-3 text-base leading-relaxed">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} aria-invalid={missing.consent ? true : undefined} className="accent-ink mt-1 size-5 shrink-0" />
        <span>
          {t('consent')}
          {missing.consent && <span className="mt-1 block text-sm text-[var(--danger)]">{missing.consent}</span>}
        </span>
      </label>
      {(failure || unreadable) && (
        <p role="alert" className="text-[var(--danger)]">
          {unreadable || failure?.code === 'UNSUPPORTED_MEDIA' || failure?.code === 'PAYLOAD_TOO_LARGE' ? t('errors.photo') : t('errors.send')}
        </p>
      )}
      <Button type="submit" size="lg" loading={submit.isPending} className="self-start">
        {t('submit')}
      </Button>
    </form>
  );
}
