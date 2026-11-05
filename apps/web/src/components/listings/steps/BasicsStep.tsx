'use client';

import { LISTING_CONDITIONS, LISTING_LIMITS, type ListingCondition } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { ChoicePills } from '@/components/ui/ChoicePills';
import { Field } from '@/components/ui/Field';
import { INPUT_CLASS, TEXTAREA_CLASS } from '@/components/ui/inputs';
import { useBuilder } from '../BuilderContext';
import { TextCounter } from '../StepSection';
import { CategoryPicker } from './CategoryPicker';

/** Step 2: title, category, condition and description. */
export function BasicsStep() {
  const t = useTranslations('builder.basics');
  const tCount = useTranslations('builder');
  const tCondition = useTranslations('listingCondition');
  const { draft, errorFor, touch, readOnly, categories } = useBuilder();
  const { values } = draft;
  const ids = { title: useId(), description: useId() };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Field label={t('title')} hint={t('titleHint')} error={errorFor('title')}>
          <input
            type="text"
            value={values.title}
            maxLength={LISTING_LIMITS.title.max}
            aria-describedby={ids.title}
            readOnly={readOnly}
            onChange={(event) => draft.change({ title: event.target.value })}
            onBlur={() => touch('title')}
            className={INPUT_CLASS}
          />
        </Field>
        <TextCounter
          id={ids.title}
          label={tCount('counter', { count: values.title.length, max: LISTING_LIMITS.title.max })}
        />
      </div>

      {categories.length > 0 ? <CategoryPicker /> : <p role="status">{t('loadingCategories')}</p>}

      <ChoicePills<ListingCondition>
        legend={t('condition')}
        name="condition"
        choices={LISTING_CONDITIONS.map((condition) => ({ value: condition, label: tCondition(condition) }))}
        value={values.condition}
        onChange={(condition) => draft.change({ condition })}
        error={errorFor('condition')}
        disabled={readOnly}
      />

      <div className="flex flex-col gap-1">
        <Field label={t('description')} hint={t('descriptionHint')} error={errorFor('description')}>
          <textarea
            rows={7}
            value={values.description}
            maxLength={LISTING_LIMITS.description.max}
            aria-describedby={ids.description}
            readOnly={readOnly}
            onChange={(event) => draft.change({ description: event.target.value })}
            onBlur={() => touch('description')}
            className={TEXTAREA_CLASS}
          />
        </Field>
        <TextCounter
          id={ids.description}
          label={tCount('counter', { count: values.description.length, max: LISTING_LIMITS.description.max })}
        />
      </div>
    </div>
  );
}
