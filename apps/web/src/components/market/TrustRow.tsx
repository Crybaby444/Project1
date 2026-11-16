import { getTranslations } from 'next-intl/server';

const ITEMS = ['contract', 'deposit', 'checked', 'reviews'] as const;

/** Four promises under the search, in one line on a desktop: what makes renting from a stranger safe. */
export async function TrustRow() {
  const t = await getTranslations('market.trust');
  return (
    <ul aria-label={t('label')} className="m-0 grid list-none grid-cols-2 gap-x-4 gap-y-3 p-0 lg:grid-cols-4" data-trust-row="">
      {ITEMS.map((k) => (
        <li key={k} className="flex items-start gap-3 text-[14.5px] leading-snug">
          <span aria-hidden="true" className="bg-ink mt-0.5 grid size-6 flex-none place-items-center rounded-full">
            <span className="bg-canvas h-[2px] w-3 rounded-full" />
          </span>
          <span>
            <b className="block font-bold">{t(`${k}.title`)}</b>
            <span className="text-ink/75">{t(`${k}.body`)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
