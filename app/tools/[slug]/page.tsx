// app/tools/[slug]/page.tsx
import ToolClient from './ToolClient';

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Pass the slug here! This is what's missing.
  return <ToolClient slug={slug} />;
}