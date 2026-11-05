import { ListingBuilder } from '@/components/listings/ListingBuilder';
import { stepParam, type BuilderPageProps } from '../step-param';

/** A new listing: nothing is created until the first change (see useListingDraft). */
export default async function NewListingPage({ searchParams }: BuilderPageProps) {
  return <ListingBuilder initial={null} initialStep={stepParam((await searchParams)['step'])} />;
}
