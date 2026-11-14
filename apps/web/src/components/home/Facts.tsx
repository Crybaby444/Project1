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
              {/* Each layer is a mask (the outer box) with the moving content inside ([data-l]): when the
                  stage slides one fact out and the next in, neither shows outside its own box. */}
              <span data-layer="num" className="font-display block overflow-hidden text-[clamp(3.6rem,8vw,9rem)] leading-[0.86] font-black tabular-nums">
                <span data-l className="block">
                  <b data-value={f.value} className="font-black">{f.value}</b>
                  {f.unit ? <u className="ml-[0.04em] text-[0.5em] text-[var(--glow)] no-underline">{f.unit === 'h' ? t('hours') : f.unit}</u> : null}
                </span>
              </span>
              <h3 data-layer="title" className="font-display m-0 overflow-hidden text-[clamp(1.6rem,2.4vw,2.6rem)] leading-[0.95] font-black uppercase">
                <span data-l className="block pt-[0.08em]">{t(`${f.key}.title`)}</span>
              </h3>
              <p data-layer="body" className="m-0 overflow-hidden text-[15px] leading-relaxed text-[var(--paper)]/75">
                <span data-l className="block">{t(`${f.key}.body`, { after: f.after ?? 0 })}</span>
              </p>
            </li>
          ))}
        </ul>
        <div data-fbar aria-hidden="true" className="hidden">
          {facts.map((f) => <i key={f.key} />)}
          <span data-fidx>01 / 0{facts.length}</span>
        </div>
      </div>
    </section>
  );
}
