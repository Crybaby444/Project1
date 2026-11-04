'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useErrorText } from '@/lib/forms/error-text';
import { ApiError, unwrap } from '@/lib/session/api-error';
import { useApiClient, useSession } from '@/lib/session/SessionProvider';
import { AuthCard } from './AuthCard';
import { RetryAfterNotice } from './RetryAfterNotice';
import { useResendVerification } from './use-resend-verification';

export type LinkProblem = 'used' | 'expired' | 'invalid';

/** Which "link problem" screen an email-link error stands for, or null for other failures. */
export function linkProblemOf(error: unknown): LinkProblem | null {
  if (!(error instanceof ApiError)) return null;
  if (error.code === 'TOKEN_USED') return 'used';
  if (error.code === 'TOKEN_EXPIRED') return 'expired';
  if (error.code === 'VALIDATION_FAILED' && error.fields?.['token']) return 'invalid';
  return null;
}

type State =
  | { kind: 'checking' }
  | { kind: 'done' }
  | { kind: 'problem'; problem: LinkProblem }
  | { kind: 'failed'; error: unknown };

/** One request per token for the life of the page, even if React mounts the view twice. */
const attempts = new Map<string, Promise<unknown>>();

/** /verify-email?token=…: confirms the email once on opening and says how it went. */
export function VerifyEmailView({ token }: { token: string | null }) {
  const t = useTranslations('auth.verify');
  const errorText = useErrorText();
  const client = useApiClient();
  const { status, user, refresh } = useSession();
  const [state, setState] = useState<State>(
    token ? { kind: 'checking' } : { kind: 'problem', problem: 'invalid' },
  );
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });

  const check = useCallback(
    (fresh: boolean) => {
      if (!token) return;
      if (fresh) attempts.delete(token);
      let attempt = attempts.get(token);
      if (!attempt) {
        attempt = unwrap(client.POST('/api/v1/auth/verify-email', { body: { token } }));
        attempts.set(token, attempt);
      }
      attempt.then(
        () => {
          setState({ kind: 'done' });
          void refreshRef.current(); // a signed-in person's banner goes away
        },
        (error: unknown) => {
          const problem = linkProblemOf(error);
          setState(problem ? { kind: 'problem', problem } : { kind: 'failed', error });
        },
      );
    },
    [client, token],
  );

  useEffect(() => check(false), [check]);

  if (state.kind === 'checking') {
    return (
      <AuthCard title={t('title')}>
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <p className="text-base">{t('checking')}</p>
          <div aria-hidden="true" className="bg-mist rounded-pill h-3 w-3/4 animate-pulse" />
          <div aria-hidden="true" className="bg-mist rounded-pill h-3 w-1/2 animate-pulse" />
        </div>
      </AuthCard>
    );
  }

  if (state.kind === 'done') {
    return (
      <AuthCard title={t('done.title')} subtitle={t('done.body')}>
        <Button href="/" size="lg">
          {t('continue')}
        </Button>
      </AuthCard>
    );
  }

  if (state.kind === 'failed') {
    return (
      <AuthCard title={t('title')} subtitle={errorText(state.error)}>
        <Button size="lg" onClick={() => (setState({ kind: 'checking' }), check(true))}>
          {t('retry')}
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t(`${state.problem}.title`)} subtitle={t(`${state.problem}.body`)}>
      {status === 'authenticated' && user && !user.emailVerified ? (
        <ResendAction />
      ) : status === 'authenticated' ? (
        <Button href="/" size="lg">
          {t('continue')}
        </Button>
      ) : (
        <Button href="/login" size="lg">
          {t('signIn')}
        </Button>
      )}
    </AuthCard>
  );
}

function ResendAction() {
  const t = useTranslations('auth.verify');
  const { resend, busy, retryInSeconds } = useResendVerification();
  return (
    <div className="flex flex-col gap-4">
      <RetryAfterNotice seconds={retryInSeconds} />
      <Button size="lg" onClick={resend} loading={busy} disabled={retryInSeconds > 0}>
        {t('resend')}
      </Button>
    </div>
  );
}
