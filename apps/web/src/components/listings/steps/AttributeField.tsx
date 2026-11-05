'use client';

import { ATTRIBUTE_TEXT_MAX, type AttributeDef, type AttributeValue } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { ChoicePills } from '@/components/ui/ChoicePills';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { localized } from '@/lib/listings/categories';
import { useCheckText } from '../BuilderContext';

type Props = {
  def: AttributeDef;
  value: AttributeValue | undefined;
  /** `undefined` clears the value. */
  onChange(value: AttributeValue | undefined): void;
  onBlur(): void;
  error: string | undefined;
  readOnly: boolean;
};

const NUMBER = /^-?\d+(?:[.,]\d+)?$/;

/** One attribute of the category as a form field: text, number (with its unit), yes/no, or a list. */
export function AttributeField({ def, value, onChange, onBlur, error, readOnly }: Props) {
  const t = useTranslations('builder.attributes');
  const checkText = useCheckText();
  const locale = useLocale();
  const label = localized(def.labels, locale);
  const note = def.required ? t('required') : undefined;
  const fieldLabel = note ? `${label} · ${note}` : label;
  const [numberText, setNumberText] = useState(
    typeof value === 'number' ? String(value).replace('.', locale === 'en' ? '.' : ',') : '',
  );
  const [numberError, setNumberError] = useState(false);

  switch (def.type) {
    case 'BOOLEAN':
      return (
        <ChoicePills<'yes' | 'no'>
          legend={label}
          note={note}
          choices={[
            { value: 'yes', label: t('yes') },
            { value: 'no', label: t('no') },
          ]}
          value={value === true ? 'yes' : value === false ? 'no' : null}
          onChange={(choice) => onChange(choice === 'yes')}
          error={error}
          disabled={readOnly}
        />
      );
    case 'SELECT':
      return (
        <Field label={fieldLabel} error={error}>
          <select
            value={typeof value === 'string' ? value : ''}
            disabled={readOnly}
            aria-required={def.required || undefined}
            onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
            onBlur={onBlur}
            className={`${INPUT_CLASS} appearance-auto`}
          >
            <option value="">{t('choose')}</option>
            {(def.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {localized(option.labels, locale)}
              </option>
            ))}
          </select>
        </Field>
      );
    case 'NUMBER':
      return (
        <Field
          label={def.unit ? `${fieldLabel} (${def.unit})` : fieldLabel}
          error={numberError ? checkText({ key: 'number' }) : error}
        >
          <input
            type="text"
            inputMode="decimal"
            value={numberText}
            readOnly={readOnly}
            aria-required={def.required || undefined}
            onChange={(event) => {
              const text = event.target.value;
              setNumberText(text);
              const compact = text.trim();
              if (compact === '') {
                setNumberError(false);
                onChange(undefined);
              } else if (NUMBER.test(compact)) {
                setNumberError(false);
                onChange(Number(compact.replace(',', '.')));
              } else setNumberError(true);
            }}
            onBlur={onBlur}
            className={INPUT_CLASS}
          />
        </Field>
      );
    case 'TEXT':
      return (
        <Field label={fieldLabel} error={error}>
          <input
            type="text"
            value={typeof value === 'string' ? value : ''}
            maxLength={ATTRIBUTE_TEXT_MAX}
            readOnly={readOnly}
            aria-required={def.required || undefined}
            onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
            onBlur={onBlur}
            className={INPUT_CLASS}
          />
        </Field>
      );
  }
}
