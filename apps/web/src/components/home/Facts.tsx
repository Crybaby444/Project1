import { DEFAULT_BOOKING_SETTINGS } from '@yoyo/domain';
import { getTranslations } from 'next-intl/server';
import { homeFacts } from '@/lib/home/facts';

/**
 * "How Yoyo keeps it fair": five facts read from the booking rules. As plain markup they are a list; the
 * stage turns them into one huge number at a time that counts up, with a five-step bar.
 */
export async function Facts() {
  const t = await getTranslations('landing.facts');
  const facts = homeFacts(DEFAULT_BOOKING_SETTINGS);
  return (
    <section data-home="facts" className="relative bg-[var(--night)] text-[var(--paper)]">
      <div data-pin className="grid min-h-svh content-center gap-10 px-4 py-24 sm:px-8">
        <h2 className="m-0 flex items-center justify-center gap-2.5 text-[13px] font-semibold text-[var(--paper)]/60">
          <span aria-hidden="true" className="size-2 rounded-full bg-[var(--glow)]" />
          {t('label')}
        </h2>
        <ul data-facts className="m-0 grid list-none gap-10 p-0 text-center sm:grid-cols-5 sm:text-left">
          {facts.map((f) => (
            <li key={f.key} data-fact className="grid gap-3">
              <span className="font-display text-[clamp(3.6rem,8vw,9rem)] leading-[0.8] font-black tabular-nums">
                <b data-value={f.value} className="font-black">{f.value}</b>
                {f.unit ? <u className="ml-[0.04em] text-[0.5em] text-[var(--glow)] no-underline">{f.unit === 'h' ? t('hours') : f.unit}</u> : null}
              </span>
              <h3 className="font-display m-0 text-[clamp(1.6rem,2.4vw,2.6rem)] leading-[0.9] font-black uppercase">{t(`${f.key}.title`)}</h3>
              <p className="m-0 text-[15px] leading-relaxed text-[var(--paper)]/75">{t(`${f.key}.body`, { after: f.after ?? 0 })}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
