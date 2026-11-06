import { z } from 'zod';
import { STICKER_COLORS, type StickerColor } from './status';
import { cleanText } from './text';

/** A text in every interface language. */
export const LocalizedTextSchema = z.object({ en: z.string(), lv: z.string(), ru: z.string() });

export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

/** Kinds of category attributes (spec §4.8): text, number, yes/no, one of a list. */
export const ATTRIBUTE_TYPES = ['TEXT', 'NUMBER', 'BOOLEAN', 'SELECT'] as const;

export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export const STICKERS = Object.keys(STICKER_COLORS) as [StickerColor, ...StickerColor[]];

/** Longest value of a TEXT attribute, after cleaning. */
export const ATTRIBUTE_TEXT_MAX = 200;

/** Largest magnitude of a NUMBER attribute. */
const ATTRIBUTE_NUMBER_MAX = 1_000_000_000;

export const AttributeOptionSchema = z.object({ value: z.string(), labels: LocalizedTextSchema });

/** One attribute a category asks for in the listing builder. */
export const AttributeDefSchema = z.object({
  /** Key under which the value is stored in the listing's `attributes`. */
  key: z.string(),
  type: z.enum(ATTRIBUTE_TYPES),
  required: z.boolean(),
  /** A unit symbol shown next to a number (`W`, `m`, `kg`), or null. */
  unit: z.string().nullable(),
  labels: LocalizedTextSchema,
  /** The choices of a SELECT; null for other types. */
  options: z.array(AttributeOptionSchema).nullable(),
});

export type AttributeDef = z.infer<typeof AttributeDefSchema>;

export interface CategoryNode {
  id: string;
  slug: string;
  sticker: StickerColor;
  icon: string;
  names: LocalizedText;
  /** Its address on each language's site: `/c/<slugs.en>`, `/lv/c/<slugs.lv>`, `/ru/c/<slugs.ru>`. */
  slugs: LocalizedText;
  attributes: AttributeDef[];
  children: CategoryNode[];
}

/** A category with its attributes and subcategories. Only leaves (no children) take listings. */
export const CategoryNodeSchema: z.ZodType<CategoryNode> = z.object({
  id: z.string(),
  slug: z.string(),
  sticker: z.enum(STICKERS),
  icon: z.string(),
  names: LocalizedTextSchema,
  slugs: LocalizedTextSchema,
  attributes: z.array(AttributeDefSchema),
  get children() {
    return z.array(CategoryNodeSchema);
  },
}).meta({ id: 'CategoryNode' });

export const CategoriesResponseSchema = z.object({ categories: z.array(CategoryNodeSchema) });

export type CategoriesResponse = z.infer<typeof CategoriesResponseSchema>;

/** A draft may leave attributes empty; a listing sent for review must fill every required one. */
export type AttributeMode = 'draft' | 'submit';

export type AttributeValue = string | number | boolean;

export type AttributesResult =
  | { ok: true; value: Record<string, AttributeValue> }
  | { ok: false; fields: Record<string, string> };

type Checked = { value: AttributeValue | undefined } | { error: string };

function checkValue(raw: unknown, def: AttributeDef): Checked {
  if (raw === undefined || raw === null) return { value: undefined };
  switch (def.type) {
    case 'TEXT': {
      if (typeof raw !== 'string') return { error: 'Expected text' };
      const text = cleanText(raw);
      if (text.length > ATTRIBUTE_TEXT_MAX) return { error: `At most ${ATTRIBUTE_TEXT_MAX} characters` };
      return { value: text === '' ? undefined : text };
    }
    case 'NUMBER':
      if (typeof raw !== 'number' || !Number.isFinite(raw) || Math.abs(raw) > ATTRIBUTE_NUMBER_MAX) {
        return { error: 'Expected a number' };
      }
      return { value: raw };
    case 'BOOLEAN':
      return typeof raw === 'boolean' ? { value: raw } : { error: 'Expected yes or no' };
    case 'SELECT': {
      if (raw === '') return { value: undefined };
      const known = (def.options ?? []).some((option) => option.value === raw);
      return typeof raw === 'string' && known ? { value: raw } : { error: 'Choose one of the options' };
    }
  }
}

/**
 * Checks listing attribute values against the category's definitions. Errors are keyed
 * `attributes.<key>`, one per broken attribute: an unknown key (of another category, say), a value of
 * the wrong type (a number sent as text), a choice outside the list, and in `submit` mode a missing
 * required value. Empty values (null, blank text) are dropped; text is cleaned of HTML.
 */
export function validateAttributes(values: Record<string, unknown>, defs: AttributeDef[], mode: AttributeMode): AttributesResult {
  if (typeof values !== 'object' || values === null || Array.isArray(values)) {
    return { ok: false, fields: { attributes: 'Expected an object of attribute values' } };
  }
  const fields: Record<string, string> = {};
  const value: Record<string, AttributeValue> = {};
  const byKey = new Map(defs.map((def) => [def.key, def]));
  for (const key of Object.keys(values)) {
    if (!byKey.has(key)) fields[`attributes.${key}`] = 'This category has no such attribute';
  }
  for (const def of defs) {
    const checked = checkValue(values[def.key], def);
    if ('error' in checked) fields[`attributes.${def.key}`] = checked.error;
    else if (checked.value !== undefined) value[def.key] = checked.value;
    else if (mode === 'submit' && def.required) fields[`attributes.${def.key}`] = 'Required';
  }
  return Object.keys(fields).length > 0 ? { ok: false, fields } : { ok: true, value };
}
