import ToolClient from './ToolClient';
import { TOOLS } from '@/app/config/tools.config';

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const tool = TOOLS.find(t => t.slug === params.slug);

  if (!tool || !tool.seo) return {};

  return {
    title: tool.seo.title,
    description: tool.seo.description,
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  return <ToolClient slug={params.slug} />;
}