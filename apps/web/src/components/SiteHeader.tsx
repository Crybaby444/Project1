import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from './ui/LanguageSwitcher';
import { LogoMark } from './ui/LogoMark';
import { Wordmark } from './ui/Wordmark';

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 pt-4 sm:px-8">
      <Link href="/" className="inline-flex min-h-10 items-center gap-2 rounded-full">
        <LogoMark />
        <Wordmark className="text-[22px]" />
      </Link>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
      </div>
    </header>
  );
}
