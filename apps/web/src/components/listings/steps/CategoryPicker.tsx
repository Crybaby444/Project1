'use client';

import type { CategoryNode } from '@yoyo/shared';
import { useLocale, useTranslations } from 'next-intl';
import { ChoicePills } from '@/components/ui/ChoicePills';
import { useToast } from '@/components/ui/Toast';
import { findPath, localized } from '@/lib/listings/categories';
import { useBuilder } from '../BuilderContext';

/**
 * The category in two rows of sticker pills: the top level, then its subcategories. Changing it
 * clears the attributes in the same save (those of another category would be refused).
 */
export function CategoryPicker() {
  const t = useTranslations('builder.basics');
  const locale = useLocale();
  const toast = useToast();
  const { categories, draft, errorFor, readOnly } = useBuilder();
  const path = findPath(categories, draft.values.categoryId);
  const top = path[0];

  function choose(id: string) {
    if (id === draft.values.categoryId) return;
    const hadAttributes = Object.keys(draft.values.attributes).length > 0;
    draft.change({ categoryId: id, attributes: {} });
    if (hadAttributes) toast.show(t('attributesReset'));
  }

  const pills = (nodes: CategoryNode[]) =>
    nodes.map((node) => ({ value: node.id, label: localized(node.names, locale), color: node.sticker }));

  return (
    <div className="flex flex-col gap-5">
      <ChoicePills
        legend={t('category')}
        name="category"
        choices={pills(categories)}
        value={top?.id ?? null}
        onChange={choose}
        error={top && top.children.length > 0 && path.length === 1 ? undefined : errorFor('categoryId')}
        disabled={readOnly}
      />
      {top && top.children.length > 0 && (
        <ChoicePills
          legend={t('subcategory')}
          name="subcategory"
          choices={pills(top.children)}
          value={path[1]?.id ?? null}
          onChange={choose}
          error={errorFor('categoryId')}
          disabled={readOnly}
        />
      )}
    </div>
  );
}
