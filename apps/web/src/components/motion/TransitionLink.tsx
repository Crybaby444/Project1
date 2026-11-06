'use client';

import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useLocale } from 'next-intl';
import { useContext, type ComponentProps, type MouseEvent } from 'react';
import { getPathname, Link } from '@/i18n/navigation';
import { prefersReducedMotion } from '@/lib/motion';
import { shouldAnimatePageChange, switchPage } from './switch-page';

type TransitionLinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  /** A path on this site without the language prefix (`/faq`, `/#safety`); the prefix is added. */
  href: string;
};

function isPlainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.currentTarget.target
  );
}

/**
 * A link to another page of the site that moves there with a View Transition (the old page fades out of
 * focus and the new one comes in, the same as the language switch). Anything but a plain left click (new tab, new window, download), and
 * links to a part of the same page, behave exactly like a normal link.
 */
export function TransitionLink({ href, onClick, ...rest }: TransitionLinkProps) {
  // The app router itself (what next/navigation's useRouter reads), or null outside a Next page
  // (component tests): then this is simply a link.
  const router = useContext(AppRouterContext);
  const locale = useLocale();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (!router || !isPlainClick(event)) return;
    const [beforeHash = '', hash] = href.split('#');
    const [path = '', query] = beforeHash.split('?');
    const target = getPathname({ href: path || '/', locale });
    if (target === decodeURI(window.location.pathname)) return; // same page: let the anchor scroll
    event.preventDefault();
    const localized = `${target}${query ? `?${query}` : ''}${hash ? `#${hash}` : ''}`;
    void switchPage({
      pathname: target,
      navigate: () => router.push(localized),
      animate: shouldAnimatePageChange(
        prefersReducedMotion(),
        typeof document.startViewTransition === 'function',
      ),
    });
  }

  return <Link href={href} onClick={handleClick} {...rest} />;
}
