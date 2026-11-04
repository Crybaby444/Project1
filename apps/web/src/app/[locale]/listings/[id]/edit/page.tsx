import { EditListing } from '@/components/listings/EditListing';
import { stepParam, type BuilderPageProps } from '../../step-param';

export default async function EditListingPage({
  params,
  searchParams,
}: BuilderPageProps & { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditListing id={id} initialStep={stepParam((await searchParams)['step'])} />;
}
