'use client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TOOLS, TOOL_GROUPS } from '@/app/config/tools.config';
import { isProUser } from '@/lib/pro';

/* -----------------------------------------
   SEO METADATA (POINT 5)
------------------------------------------ */
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const tool = TOOLS.find(t => t.slug === params.slug);

  if (!tool || !tool.seo) return {};

  return {
    title: tool.seo.title,
    description: tool.seo.description,
  };
}

/* -----------------------------------------
   PAGE
------------------------------------------ */
export default function ToolPage({ params }: { params: { slug: string } }) {
  const tool = TOOLS.find(t => t.slug === params.slug);
  if (!tool) return notFound();

  /* -----------------------------------------
     POINT 4: PRO / FREEMIUM GATING
  ------------------------------------------ */
  if (tool.isPro && !isProUser()) {
    return <UpgradeToPro toolName={tool.label} />;
  }

  /* -----------------------------------------
     POINT 5: RELATED TOOLS
  ------------------------------------------ */
  const relatedTools = TOOLS.filter(
    t => t.group === tool.group && t.slug !== tool.slug
  ).slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 px-4 py-12">
      <div className="max-w-4xl mx-auto">

        {/* Tool Header */}
        <div className="mb-8">
          <span className="inline-block text-xs mb-2 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
            {TOOL_GROUPS[tool.group]}
          </span>

          <h1 className="text-2xl md:text-3xl font-bold mt-2">
            {tool.label}
          </h1>

          {tool.desc && (
            <p className="text-slate-400 mt-2 max-w-2xl">
              {tool.desc}
            </p>
          )}
        </div>

        {/* TOOL UI SLOT */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-12">
          <p className="text-sm text-slate-400">
            Tool UI goes here.
          </p>
        </div>

        {/* RELATED TOOLS (POINT 5) */}
        {relatedTools.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Related Tools
            </h3>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedTools.map(rt => (
                <Link
                  key={rt.slug}
                  href={`/tools/${rt.slug}`}
                  className="rounded-lg border border-slate-800 bg-slate-900 p-4 hover:border-indigo-500 transition-colors"
                >
                  <h4 className="font-medium text-sm mb-1">
                    {rt.label}
                  </h4>
                  {rt.desc && (
                    <p className="text-xs text-slate-400">
                      {rt.desc}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* -----------------------------------------
   PRO UPGRADE CTA COMPONENT
------------------------------------------ */
function UpgradeToPro({ toolName }: { toolName: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-2xl md:text-3xl font-bold mb-4">
          {toolName} is a Pro Tool
        </h1>

        <p className="text-slate-400 mb-8">
          Upgrade to Pro to unlock advanced seller tools, analytics,
          and productivity features.
        </p>

        {/* DEMO UNLOCK BUTTON */}
        <button
          onClick={() => {
            localStorage.setItem('isProUser', 'true');
            window.location.reload();
          }}
          className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-semibold"
        >
          Unlock Pro (Demo)
        </button>

        <p className="text-xs text-slate-500 mt-4">
          Demo unlock uses localStorage. Replace with Stripe later.
        </p>
      </div>

      {/* --- CREATOR FOOTER START --- */}
        <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
          <p className="text-slate-500 font-medium text-sm">Created by SmartRwl</p>
          <div className="flex space-x-4">
            {/* Instagram Icon */}
            <a
              href="http://www.instagram.com/smartrwl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-pink-500 transition-colors"
              title="Instagram"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>

            {/* GitHub Icon */}
            <a
              href="https://github.com/Smart-rwl/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-white transition-colors"
              title="GitHub"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
              </svg>
            </a>
          </div>
        </div>
        {/* --- CREATOR FOOTER END --- */}
    </div>

    
  );
}
