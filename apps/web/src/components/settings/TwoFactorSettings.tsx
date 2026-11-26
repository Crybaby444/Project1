'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { FormError } from '@/components/auth/FormError';
import { Button } from '@/components/ui/Button';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { useToast } from '@/components/ui/Toast';
import { useErrorText } from '@/lib/forms/error-text';
import { unwrap } from '@/lib/session/api-error';
import { useApiClient } from '@/lib/session/SessionProvider';

const KEY = ['me', 'two-factor'] as const;

/** The otpauth:// link as an SVG QR code (the library loads only when someone sets this up). */
function useQrSvg(uri: string | null): string | null {
  const [svg, setSvg] = useState<{ uri: string; svg: string } | null>(null);
  useEffect(() => {
    if (!uri) return;
    let live = true;
    void import('qrcode').then((qr) =>
      qr.toString(uri, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0a0b0e', light: '#ffffff' } }).then((text) => {
        if (live) setSvg({ uri, svg: text });
      }),
    );
    return () => {
      live = false;
    };
  }, [uri]);
  return uri && svg?.uri === uri ? svg.svg : null;
}

function CodeInput({ value, onChange, label }: { value: string; onChange(v: string): void; label: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={6}
        className={`${INPUT_CLASS} max-w-[12rem] font-mono text-2xl tracking-[0.4em]`}
      />
    </div>
  );
}

/**
 * Two-step sign-in (TOTP) for the signed-in person: off → scan the QR code (or type the key) → enter a code
 * to turn it on; on → a current code turns it off. Used in Settings → Security and in the admin panel.
 */
export function TwoFactorSettings({ hasPassword }: { hasPassword: boolean }) {
  const t = useTranslations('twoFactor');
  const client = useApiClient();
  const queryClient = useQueryClient();
  const toast = useToast();
  const errorText = useErrorText();
  const status = useQuery({ queryKey: KEY, queryFn: async () => unwrap(client.GET('/api/v1/me/two-factor')) });
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState('');
  const qr = useQrSvg(setup?.uri ?? null);

  const start = useMutation({ mutationFn: async () => unwrap(client.POST('/api/v1/me/two-factor/setup')), onSuccess: (s) => setSetup(s) });
  const enable = useMutation({
    mutationFn: async () => unwrap(client.POST('/api/v1/me/two-factor/enable', { body: { code } })),
    onSuccess: (s) => {
      queryClient.setQueryData(KEY, s);
      setSetup(null);
      setCode('');
      toast.show(t('turnedOn'));
    },
  });
  const disable = useMutation({
    mutationFn: async () => unwrap(client.POST('/api/v1/me/two-factor/disable', { body: { code } })),
    onSuccess: (s) => {
      queryClient.setQueryData(KEY, s);
      setCode('');
      toast.show(t('turnedOff'));
    },
  });

  if (!hasPassword) return <p className="leading-relaxed">{t('needPassword')}</p>;
  if (status.isPending) return <div aria-busy="true" className="bg-mist rounded-media h-24" />;
  if (status.isError) return <FormError message={errorText(status.error)} />;

  if (status.data.enabled) {
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.length === 6) disable.mutate();
        }}
      >
        <p className="flex items-center gap-2 font-semibold">
          <span aria-hidden="true" className="bg-ink inline-block size-2.5 rounded-full" />
          {t('on')}
        </p>
        <FormError message={disable.error ? errorText(disable.error) : null} />
        <CodeInput value={code} onChange={setCode} label={t('codeToTurnOff')} />
        <Button type="submit" variant="ghost" loading={disable.isPending} disabled={code.length !== 6} className="self-start">
          {t('turnOff')}
        </Button>
      </form>
    );
  }

  if (!setup) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="leading-relaxed">{t('offIntro')}</p>
        <FormError message={start.error ? errorText(start.error) : null} />
        <Button onClick={() => start.mutate()} loading={start.isPending}>
          {t('turnOn')}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (code.length === 6) enable.mutate();
      }}
    >
      <ol className="flex list-decimal flex-col gap-2 pl-5 leading-relaxed">
        <li>{t('step1')}</li>
        <li>{t('step2')}</li>
        <li>{t('step3')}</li>
      </ol>
      <div className="flex flex-wrap items-center gap-6">
        <div className="rounded-media grid size-44 shrink-0 place-items-center border border-[color-mix(in_srgb,var(--ink)_15%,transparent)] bg-white p-3">
          {qr ? <div role="img" aria-label={t('qrLabel')} className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: qr }} /> : <div aria-busy="true" className="bg-mist size-full rounded-tile" />}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-ink/75 text-sm">{t('keyLabel')}</p>
          <code className="bg-mist rounded-tile px-3 py-2 font-mono text-base font-semibold tracking-[0.08em] [overflow-wrap:anywhere] select-all">
            {setup.secret.match(/.{1,4}/g)?.join(' ')}
          </code>
        </div>
      </div>
      <FormError message={enable.error ? errorText(enable.error) : null} />
      <CodeInput value={code} onChange={setCode} label={t('codeToTurnOn')} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={enable.isPending} disabled={code.length !== 6}>
          {t('confirm')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSetup(null);
            setCode('');
          }}
        >
          {t('cancel')}
        </Button>
      </div>
    </form>
  );
}
