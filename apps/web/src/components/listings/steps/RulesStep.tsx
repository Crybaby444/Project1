'use client';

import { LISTING_LIMITS, RULE_PRESETS, type RulePreset } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { IconButton } from '@/components/ui/IconButton';
import { INPUT_CLASS } from '@/components/ui/inputs';
import { useBuilder } from '../BuilderContext';

/** Step 6 (first half): ready-made rules as toggles and up to five rules of the owner's own. */
export function RulesStep() {
  const t = useTranslations('builder.rules');
  const tRule = useTranslations('listingRules');
  const { draft, errorFor, touch, readOnly } = useBuilder();
  const { rules } = draft.values;
  /** A rule just added and still empty lives here, not in the draft, so it is not an error yet. */
  const [extra, setExtra] = useState<string | null>(null);
  const extraInput = useRef<HTMLInputElement>(null);
  const shown = extra === null ? rules.custom : [...rules.custom, extra];

  useEffect(() => {
    if (extra === '') extraInput.current?.focus();
  }, [extra]);

  function togglePreset(preset: RulePreset) {
    const on = rules.preset.includes(preset);
    // Kept in the order of RULE_PRESETS, so the saved list does not depend on the clicking order.
    const preset_ = RULE_PRESETS.filter((key) => (key === preset ? !on : rules.preset.includes(key)));
    draft.change({ rules: { ...rules, preset: preset_ } });
  }

  const setCustom = (custom: string[]) => draft.change({ rules: { ...rules, custom } });

  return (
    <div className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-3" disabled={readOnly}>
        <legend className="mb-2 text-[13px] font-bold tracking-[0.03em] uppercase">{t('presets')}</legend>
        <div className="flex flex-wrap gap-2">
          {RULE_PRESETS.map((preset, index) => {
            const on = rules.preset.includes(preset);
            return (
              <label
                key={preset}
                className={`rounded-pill ease-yoyo has-focus-visible:outline-ink inline-flex min-h-10 cursor-pointer items-center gap-2 border px-4 py-2 text-left text-sm leading-snug font-bold transition-[transform,background-color,color] duration-250 select-none hover:-translate-y-0.5 active:scale-[0.95] has-focus-visible:outline-2 has-focus-visible:outline-offset-3 ${
                  index % 2 ? 'hover:rotate-2' : 'hover:-rotate-2'
                } ${on ? 'border-cta bg-cta text-cta-fg' : 'border-ink bg-surface text-ink'}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => togglePreset(preset)}
                  className="sr-only"
                />
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
                  {on ? (
                    <path
                      d="m5 12.5 4.5 4.5L19 7.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <path
                      d="M12 6v12M6 12h12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  )}
                </svg>
                {tRule(preset)}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3" disabled={readOnly}>
        <legend className="mb-1 text-[13px] font-bold tracking-[0.03em] uppercase">{t('custom')}</legend>
        <p className="text-sm">{t('customHint', { max: LISTING_LIMITS.customRules })}</p>
        <ol className="flex flex-col gap-3">
          {shown.map((rule, index) => (
            <li key={index} className="flex items-start gap-2">
              <Field
                label={t('customLabel', { number: index + 1 })}
                error={errorFor(`rules.custom.${index}`)}
                className="flex-1"
              >
                <input
                  ref={index === rules.custom.length ? extraInput : undefined}
                  type="text"
                  value={rule}
                  maxLength={LISTING_LIMITS.customRule.max}
                  onChange={(event) => {
                    const text = event.target.value;
                    if (index === rules.custom.length) {
                      setExtra(null);
                      setCustom([...rules.custom, text]);
                    } else setCustom(rules.custom.map((value, at) => (at === index ? text : value)));
                  }}
                  onBlur={() => touch(`rules.custom.${index}`)}
                  className={INPUT_CLASS}
                />
              </Field>
              <IconButton
                label={t('remove', { number: index + 1 })}
                onClick={() =>
                  index === rules.custom.length
                    ? setExtra(null)
                    : setCustom(rules.custom.filter((_, at) => at !== index))
                }
                className="mt-7 shrink-0"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
                  <path
                    d="m7 7 10 10M17 7 7 17"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </IconButton>
            </li>
          ))}
        </ol>
        <Button
          variant="ghost"
          className="self-start"
          disabled={shown.length >= LISTING_LIMITS.customRules || extra !== null}
          onClick={() => setExtra('')}
        >
          <span aria-hidden="true">+</span> {t('add')}
        </Button>
      </fieldset>
    </div>
  );
}
