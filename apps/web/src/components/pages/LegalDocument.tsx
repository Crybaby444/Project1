import type { Locale } from '@yoyo/shared';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { TransitionLink } from '@/components/motion/TransitionLink';
import { describeOperator } from '@/content/legal/operator';
import type { Block, LegalDoc } from '@/content/legal/types';
import { PageBanner } from './PageBanner';

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const LINK_CLASS = 'font-bold underline underline-offset-4';

/**
 * Text with `[label](target)` links: a site path becomes a link in the page language, `mailto:` and
 * `https:` stay as they are (other sites get rel=noopener, same tab). No HTML is ever injected.
 */
function Inline({ text }: { text: string }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const [whole, label, target] = match as unknown as [string, string, string];
    parts.push(text.slice(last, match.index));
    if (target.startsWith('/')) {
      parts.push(
        <TransitionLink key={match.index} href={target} className={LINK_CLASS}>
          {label}
        </TransitionLink>,
      );
    } else {
      const external = target.startsWith('http');
      parts.push(
        <a
          key={match.index}
          href={target}
          className={LINK_CLASS}
          {...(external ? { rel: 'noopener noreferrer' } : {})}
        >
          {label}
        </a>,
      );
    }
    last = match.index + whole.length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function BlockView({ block, fill }: { block: Block; fill: (text: string) => string }) {
  if ('p' in block) {
    return (
      <p className="leading-relaxed">
        <Inline text={fill(block.p)} />
      </p>
    );
  }
  if ('list' in block) {
    return (
      <ul className="flex list-disc flex-col gap-2 pl-6 leading-relaxed marker:text-current">
        {block.list.map((item) => (
          <li key={item}>
            <Inline text={fill(item)} />
          </li>
        ))}
      </ul>
    );
  }
  return (
    // Wide tables scroll inside their own box on a phone, never the page; the box takes the keyboard
    // focus (and has a name), so it can be scrolled without a mouse.
    <div
      role="region"
      aria-label={block.table.head.join(', ')}
      tabIndex={0}
      className="border-ink rounded-card overflow-x-auto border"
    >
      <table className="w-full min-w-[34rem] border-collapse text-left text-[15px] leading-relaxed">
        <thead className="bg-mist">
          <tr>
            {block.table.head.map((cell) => (
              <th key={cell} scope="col" className="border-ink border-b px-4 py-3 text-xs font-bold tracking-[0.032em] uppercase">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.table.rows.map((row) => (
            <tr key={row.join('|')} className="border-ink border-b last:border-b-0">
              {row.map((cell, index) => (
                <td key={index} className={`px-4 py-3 align-top ${index === 0 ? 'font-bold' : ''}`}>
                  <Inline text={fill(cell)} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** A legal document: calm banner, the date it takes effect, a short summary, contents and sections. */
export function LegalDocument({ doc, effective }: { doc: LegalDoc; effective: string }) {
  const t = useTranslations('legal');
  const format = useFormatter();
  const locale = useLocale() as Locale;
  const operator = describeOperator(locale);
  const fill = (text: string) => text.replaceAll('{operator}', operator);
  const date = format.dateTime(new Date(`${effective}T12:00:00Z`), { dateStyle: 'long' });

  return (
    <main className="flex flex-1 flex-col">
      <PageBanner title={doc.title} stickers={[{ kind: 'shield', size: 96, top: '-14%', right: '4%', rotate: 10, className: 'max-sm:hidden' }]}>
        <p className="border-ink bg-surface rounded-pill self-start border px-3 py-1.5 text-xs font-bold tracking-[0.032em] uppercase">
          {t('effective', { date })}
        </p>
      </PageBanner>

      <div className="bg-surface">
        <div className="mx-auto grid max-w-[1440px] grid-cols-[minmax(0,1fr)] gap-10 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label={t('contents')} className="lg:sticky lg:top-6 lg:self-start">
            <h2 className="mb-3 text-xs font-bold tracking-[0.032em] uppercase">{t('contents')}</h2>
            <ol className="flex flex-col gap-1">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="rounded-pill hover:bg-mist -mx-3 flex min-h-10 items-center px-3 text-[15px] leading-snug transition-colors duration-150 ease-yoyo"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="flex max-w-[72ch] flex-col gap-12 text-base">
            <section aria-labelledby="summary" className="border-ink bg-sticker-lavender rounded-card-xl flex flex-col gap-3 border p-6 text-black sm:p-8">
              <h2 id="summary" className="text-2xl leading-tight font-bold">
                {t('summary')}
              </h2>
              <ul className="flex list-disc flex-col gap-2 pl-6 leading-relaxed">
                {doc.summary.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <p className="text-[15px] leading-relaxed">{t('note')}</p>
            </section>

            {doc.sections.map((section) => (
              <section key={section.id} aria-labelledby={section.id} className="flex flex-col gap-4">
                <h2 id={section.id} className="scroll-mt-6 text-[clamp(1.5rem,2.4vw,1.875rem)] leading-tight font-bold">
                  {section.heading}
                </h2>
                {section.blocks.map((block, index) => (
                  <BlockView key={index} block={block} fill={fill} />
                ))}
              </section>
            ))}
          </article>
        </div>
      </div>
    </main>
  );
}
