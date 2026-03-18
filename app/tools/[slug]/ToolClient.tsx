'use client';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { TOOLS, TOOL_GROUPS } from '@/app/config/tools.config';
import { isProUser } from '@/lib/pro';

/* -----------------------------------------
   TOOL CLIENT
------------------------------------------ */
export default function ToolClient({ slug }: { slug: string }) {

  const tool = TOOLS.find(t => t.slug === slug);
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

        {/* RELATED TOOLS */}
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

      <div className="mt-12 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
        <p className="text-slate-500 font-medium text-sm">Created by SmartRwl</p>

        <div className="flex space-x-4">
          <a
            href="http://www.instagram.com/smartrwl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-pink-500 transition-colors"
          >
            Instagram
          </a>

          <a
            href="https://github.com/Smart-rwl/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-white transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
    </div>
  );
}