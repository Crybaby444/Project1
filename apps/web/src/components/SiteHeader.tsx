import { Link } from '@/i18n/navigation';
import { ThemeToggle } from './theme/ThemeToggle';
import { LanguageSwitcher } from './ui/LanguageSwitcher';
import { LogoMark } from './ui/LogoMark';

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
      <Link href="/" className="inline-flex min-h-10 items-center rounded-pill" aria-label="Yoyo">
        <LogoMark size={44} />
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
