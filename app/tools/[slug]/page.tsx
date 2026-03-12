// app/tools/[slug]/page.tsx
import ToolClient from './ToolClient';

// Ensure the params type is a Promise for Next.js 15+
export default async function Page({ 
  params 
}: { 
  params: Promise<{ slug: string }> 
}) {
  // 1. Await the params to get the actual slug
  const { slug } = await params;

  // 2. Pass the slug prop to ToolClient
  // This is the line that was throwing the error!
  return <ToolClient slug={slug} />;
}