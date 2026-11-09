import { BuilderLayout, builderMetadata, type BuilderLayoutProps } from '../../builder-layout';

export async function generateMetadata({ params }: Omit<BuilderLayoutProps, 'children'>) {
  return builderMetadata((await params).locale, 'titleEdit');
}

export default BuilderLayout;
