import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/Button';
import { displayFit } from '@/lib/display-fit';
import { LIST_ITEM_HREF } from '@/lib/site';

/**
 * The last slide: "It always comes back." The stage brings the yo-yo down on its string in the dark, lets the
 * light out of it, and leaves it rolling away and back under the words (`data-anchor="final-slot"`).
 */
export async function Finale() {
  const t = await getTranslations('landing');
  return (
    <section data-home="finale" className="bg-canvas text-ink relative">
      <div data-pin className="relative grid min-h-svh place-items-center overflow-hidden px-4 sm:px-8">
        <div data-shade aria-hidden="true" className="hidden" />
        <div className="@container w-full text-center">
          <h2
            style={displayFit(`${t('finale.line1')} ${t('finale.line2')}`, { min: '2.6rem', max: '19rem' })}
            className="font-display text-display-fit m-0 leading-[0.96] font-black uppercase [--fit-em:0.62]"
          >
            <span className="block">{t('finale.line1')}</span>
            <span className="block text-[var(--canvas)] [-webkit-text-stroke:4px_var(--ink)] [paint-order:stroke_fill]">{t('finale.line2')}</span>
          </h2>
          <div className="relative mx-auto mt-[3vh] h-[clamp(84px,9vw,150px)]">
            <div data-anchor="final-slot" aria-hidden="true" className="absolute bottom-0 left-1/2 aspect-square h-full -translate-x-1/2" />
            <i data-roll-shadow aria-hidden="true" className="absolute -bottom-2.5 left-1/2 h-5 w-[clamp(70px,7.5vw,124px)] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(10,11,14,0.34),rgba(10,11,14,0.08)_60%,transparent)] opacity-0" />
          </div>
          <div className="mt-[6vh] flex flex-wrap justify-center gap-2.5">
            <Button href="/c" size="lg">
              <span aria-hidden="true" className="size-2 rounded-full bg-[var(--glow)]" />
              {t('hero.find')}
            </Button>
            {LIST_ITEM_HREF ? (
              <Button href={LIST_ITEM_HREF} variant="ghost" size="lg">
                {t('hero.lend')}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
