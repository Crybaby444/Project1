import { isBuilderStep, type BuilderStep } from '@/lib/listings/listing-checks';

export type BuilderPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** `?step=price` → `price`; anything unknown opens the first step. */
export function stepParam(value: string | string[] | undefined): BuilderStep {
  const step = Array.isArray(value) ? value[0] : value;
  return isBuilderStep(step) ? step : 'photos';
}
