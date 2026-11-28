import { getTranslations } from 'next-intl/server';

const ITEMS = ['contract', 'deposit', 'checked', 'reviews'] as const;

/** Each guarantee's own line icon (24-unit grid, round caps, one stroke weight). */
const ICON: Record<(typeof ITEMS)[number], React.ReactNode> = {
  contract: (
    <>
      <path d="M7 3.5h7l4 4v13H7z" />
      <path d="M14 3.5v4h4M10 12h5M10 15.5h5" />
    </>
  ),
  deposit: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
      <path d="M4.5 4.5v3h3" />
    </>
  ),
  checked: (
    <>
      <path d="M12 3.5 5 6.5v5c0 4.2 3 7.6 7 9 4-1.4 7-4.8 7-9v-5z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </>
  ),
  reviews: <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4 7.2 18.9l.9-5.4-3.9-3.8 5.4-.8z" />,
};

/**
 * Four promises at the foot of the hero, in one line on a desktop: what makes renting from a stranger safe.
 * Each has its own small icon in an ink disc, the title and one line (owner, 2026-11-28: the first version
 * was better; no yo-yo used as decoration anywhere).
 */
export async function TrustRow() {
  const t = await getTranslations('market.trust');
  return (
    <ul aria-label={t('label')} className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-5 p-0 lg:grid-cols-4" data-trust-row="">
      {ITEMS.map((k) => (
        <li key={k} className="flex items-start gap-3 text-sm leading-snug">
          <span aria-hidden="true" className="bg-ink text-canvas grid size-8 flex-none place-items-center rounded-full">
            <svg viewBox="0 0 24 24" className="size-[1.05rem] fill-none stroke-current [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.9]">
              {ICON[k]}
            </svg>
          </span>
          <span className="pt-0.5">
            <b className="block font-bold">{t(`${k}.title`)}</b>
            <span className="text-ink/75">{t(`${k}.body`)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
