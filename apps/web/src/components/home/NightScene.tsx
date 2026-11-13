import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';

const ROW = 'font-display flex gap-[0.3em] whitespace-nowrap text-[21vw] leading-[0.82] font-black uppercase will-change-transform sm:text-[clamp(4.4rem,13vw,15rem)]';

/** Repeats a phrase across a row, with the small dot between, for the drifting lines of the night. */
function Row({ text, times, className, row }: { text: string; times: number; className: string; row: number }) {
  return (
    <div data-row={row} aria-hidden="true" className={`${ROW} ${className}`}>
      {Array.from({ length: times }, (_, i) => (
        <span key={i} className="inline-flex flex-none items-center gap-[0.3em]">
          {text}
          <i className="inline-block size-[0.16em] rounded-full bg-current opacity-45" />
        </span>
      ))}
    </div>
  );
}

/**
 * The night that spills out of the yo-yo: "Rent it · Use it · Bring it back" drifting across the dark, a
 * line, and the way into the catalog. Always night, in both themes.
 */
export async function NightScene() {
  const t = await getTranslations('landing.night');
  return (
    <section data-home="night" className="relative grid min-h-svh content-center gap-[1.2vh] overflow-hidden bg-[var(--night)] py-24 text-[var(--paper)]">
      <h2 className="sr-only">{`${t('rent')}. ${t('use')}. ${t('back')}.`}</h2>
      <Row row={1} text={t('rent')} times={5} className="" />
      <Row row={2} text={t('use')} times={6} className="text-transparent [-webkit-text-stroke:1.5px_var(--paper)]" />
      <Row row={3} text={t('back')} times={4} className="text-[var(--glow)]" />
      <div data-say className="mx-auto mt-[6vh] grid w-[min(90vw,30em)] justify-items-center gap-[18px] text-center">
        <p className="m-0 text-[clamp(1rem,1.3vw,1.2rem)] leading-relaxed font-medium text-[var(--paper)]/75">{t('line')}</p>
        <Button href="/c" className="border-[var(--paper)] bg-[var(--paper)] text-[var(--night)]">
          <span aria-hidden="true" className="size-2 rounded-full bg-[var(--glow)]" />
          {t('catalog')}
        </Button>
      </div>
    </section>
  );
}
