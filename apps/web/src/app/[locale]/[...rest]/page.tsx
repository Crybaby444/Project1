import { notFound } from 'next/navigation';

/** Any path without a page (including unknown locale prefixes like /de or /LV) renders the localized 404. */
export default function CatchAll() {
  notFound();
}
