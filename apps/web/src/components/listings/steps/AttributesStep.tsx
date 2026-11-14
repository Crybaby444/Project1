'use client';

import type { AttributeValue } from '@yoyo/shared';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { isLeaf } from '@/lib/listings/categories';
import { useBuilder } from '../BuilderContext';
import { AttributeField } from './AttributeField';

/** Step 3: the attributes the chosen subcategory defines (spec §4.3). */
export function AttributesStep() {
  const t = useTranslations('builder.attributes');
  const { category, draft, errorFor, touch, readOnly, goTo } = useBuilder();

  if (!category || !isLeaf(category)) {
    return (
      <div className="border-ink/15 rounded-media flex flex-col items-start gap-4 border border-dashed p-6">
        <p>{t('needCategory')}</p>
        <Button variant="ghost" onClick={() => goTo('basics')}>
          {t('toBasics')}
        </Button>
      </div>
    );
  }
  if (category.attributes.length === 0) return <p>{t('none')}</p>;

  function set(key: string, value: AttributeValue | undefined) {
    const next = { ...draft.values.attributes };
    if (value === undefined) delete next[key];
    else next[key] = value;
    draft.change({ attributes: next });
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {category.attributes.map((def) => (
        <AttributeField
          key={`${category.id}:${def.key}`}
          def={def}
          value={draft.values.attributes[def.key]}
          onChange={(value) => set(def.key, value)}
          onBlur={() => touch(`attributes.${def.key}`)}
          error={errorFor(`attributes.${def.key}`)}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}
