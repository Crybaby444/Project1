import { getTranslations } from 'next-intl/server';

const ITEMS = ['contract', 'deposit', 'checked', 'reviews'] as const;

/**
 * Four promises beside the title: what makes renting from a stranger safe, each in a few words (owner,
 * 2026-11-28: no extra lines). A column on a desktop, two by two on a phone.
 */
export async function TrustRow() {
  const t = await getTranslations('market.trust');
  return (
    <ul aria-label={t('label')} className="m-0 grid list-none grid-cols-2 gap-x-5 gap-y-3 p-0 lg:grid-cols-1 lg:gap-y-3.5 lg:pb-3" data-trust-row="">
      {ITEMS.map((k) => (
        <li key={k} className="flex items-center gap-2.5 text-sm leading-snug font-bold sm:text-base">
          <span aria-hidden="true" className="bg-accent text-accent-fg grid size-6 flex-none place-items-center rounded-full">
            <svg viewBox="0 0 24 24" className="size-3.5 fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:3]">
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </span>
          {t(`${k}.title`)}
        </li>
      ))}
    </ul>
  );
}
