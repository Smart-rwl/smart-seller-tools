'use client';

import React from 'react';

// 1. Define the actual tool component here
function ToolClient({ slug }: { slug: string }) {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">A/B Testing Tool</h1>
      <p>Current Tool: {slug}</p>
      {/* Add your A/B testing logic/forms here */}
    </div>
  );
}

// 2. This is the part that Next.js uses to render the page
export default function Page() {
  return <ToolClient slug="ab-test" />;
}