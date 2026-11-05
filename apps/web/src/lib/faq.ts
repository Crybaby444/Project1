import type { FaqGroup } from '@/components/pages/FaqList';

/** The FAQ in reading order: groups and the keys of their questions in messages (`faq.groups`). */
export const FAQ_GROUPS = {
  renting: ['who', 'days', 'meet', 'longer'],
  lending: ['what', 'price', 'hidden', 'decline'],
  money: ['cost', 'payNow', 'deposit', 'paid'],
  safety: ['broken', 'notReturned', 'report', 'insurance'],
  account: ['delete', 'data', 'language', 'contact'],
} as const;

/** The questions the landing page shows, as [group, question]. */
export const FAQ_TEASER = [
  ['renting', 'meet'],
  ['money', 'deposit'],
  ['money', 'payNow'],
  ['safety', 'broken'],
] as const;

type Translate = (key: string) => string;

/** The FAQ with its texts, from a translator bound to the `faq` namespace. */
export function faqGroups(t: Translate): FaqGroup[] {
  return Object.entries(FAQ_GROUPS).map(([group, keys]) => ({
    id: group,
    title: t(`groups.${group}.title`),
    items: keys.map((key) => ({
      id: key,
      question: t(`groups.${group}.items.${key}.q`),
      answer: t(`groups.${group}.items.${key}.a`),
    })),
  }));
}

/** schema.org FAQPage for the same questions (only on /faq, where they are shown in full). */
export function faqPageJsonLd(groups: FaqGroup[], url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url,
    mainEntity: groups.flatMap((group) =>
      group.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    ),
  };
}
