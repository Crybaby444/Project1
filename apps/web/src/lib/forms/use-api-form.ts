'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';
import { ApiError } from '@/lib/session/api-error';
import { useCountdown } from '@/lib/use-countdown';
import { useErrorText } from './error-text';
import { zodErrorMap } from './zod-messages';

type ApiFormOptions<Values extends FieldValues, Output> = {
  defaultValues: DefaultValues<Values>;
  /** Runs with the parsed values; throw an ApiError (see unwrap) to show it on the form. */
  onSubmit(values: Output): Promise<void>;
};

export type ApiForm<Values extends FieldValues, Output> = {
  form: UseFormReturn<Values, unknown, Output>;
  submit(event?: React.BaseSyntheticEvent): Promise<void>;
  /** A failure that belongs to no single field (wrong password, network…), in the visitor's words. */
  formError: string | null;
  /** Seconds left of a 429 (Retry-After); the submit button stays off until it reaches 0. */
  retryInSeconds: number;
  busy: boolean;
  /** True while sending or waiting out a rate limit. */
  disabled: boolean;
  /** Field error text by name (client check or the server's, see errors.fieldInvalid). */
  fieldError(name: Path<Values>): string | undefined;
};

/**
 * react-hook-form with a zod schema from @yoyo/shared and API errors mapped back onto the form.
 *
 * - The schema checks every field first, in the visitor's language (zod-messages); the first
 *   invalid field gets the focus.
 * - `VALIDATION_FAILED` with `fields` marks those fields with errors.fieldInvalid (focus on the first).
 * - `RATE_LIMITED` starts the Retry-After countdown; anything else becomes `formError`.
 */
export function useApiForm<Schema extends z.ZodType<unknown, FieldValues>>(
  schema: Schema,
  { defaultValues, onSubmit }: ApiFormOptions<z.input<Schema>, z.output<Schema>>,
): ApiForm<z.input<Schema>, z.output<Schema>> {
  type Values = z.input<Schema>;
  const tValidation = useTranslations('validation');
  const tErrors = useTranslations('errors');
  const errorText = useErrorText();
  const [formError, setFormError] = useState<string | null>(null);
  const { secondsLeft, start } = useCountdown();

  const resolver = useMemo(
    () => zodResolver(schema as never, { error: zodErrorMap((key, values) => tValidation(key, values)) }),
    [schema, tValidation],
  );
  const form = useForm<Values, unknown, z.output<Schema>>({
    resolver: resolver as never,
    defaultValues,
    shouldFocusError: true,
  });

  const submit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'RATE_LIMITED' && error.retryAfterSeconds) {
        start(error.retryAfterSeconds);
        return;
      }
      const known = Object.keys(form.getValues() as object);
      const fields =
        error instanceof ApiError ? Object.keys(error.fields ?? {}).filter((f) => known.includes(f)) : [];
      if (fields.length > 0) {
        fields.forEach((name, index) =>
          form.setError(
            name as Path<Values>,
            { type: 'server', message: tErrors('fieldInvalid') },
            { shouldFocus: index === 0 },
          ),
        );
        return;
      }
      setFormError(errorText(error));
    }
  });

  const busy = form.formState.isSubmitting;
  const errors = form.formState.errors as Record<string, { message?: string } | undefined>;

  return {
    form,
    submit,
    formError,
    retryInSeconds: secondsLeft,
    busy,
    disabled: busy || secondsLeft > 0,
    fieldError: (name) => errors[name as string]?.message,
  };
}
