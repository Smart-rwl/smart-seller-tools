// app/tools/[slug]/ToolClient.tsx
'use client';

export default function ToolClient({ slug }: { slug: string }) {
  return (
    <div>
      <h1>Tool: {slug}</h1>
      {/* Your logic here */}
    </div>
  );
}