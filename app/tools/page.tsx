// app/tools/page.tsx
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { TOOLS, TOOL_GROUPS, type ToolCategory } from '../config/tools.config';

const GROUP_ORDER: ToolCategory[] = [
  'calculators',
  'finance',
  'listing',
  'operations',
  'assets',
];

export default function ToolsIndexPage() {
  const [query, setQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<ToolCategory | 'all'>('all');

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((tool) => {
      const matchesGroup = activeGroup === 'all' || tool.category === activeGroup;
      const matchesSearch =
        !q ||
        tool.label.toLowerCase().includes(q) ||
        tool.slug.toLowerCase().includes(q) ||
        (tool.description?.toLowerCase().includes(q) ?? false) ||
        (tool.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false);
      return matchesGroup && matchesSearch;
    }).sort((a, b) => {
      // Priority-aware sort (lower = higher priority), then alphabetical
      const pa = a.priority ?? 999;
      const pb = b.priority ?? 999;
      if (pa !== pb) return pa - pb;
      return a.label.localeCompare(b.label);
    });
  }, [query, activeGroup]);

  return (
    <div className="pt-24 pb-12 px-4 md:px-8 bg-slate-950 text-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Smart Seller Toolbox
            </h1>
            <p className="text-sm md:text-base text-slate-400 mt-2 max-w-2xl">
              All your calculators, listing helpers and operational tools in one control center.
            </p>
          </div>

          {/* Search */}
          <div className="w-full md:w-80">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tools (e.g. PPC, FNSKU, keyword)…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-3 top-2.5 text-[11px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                Ctrl + F also works
              </span>
            </div>
          </div>
        </div>

        {/* Group tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <TabButton
            label="All tools"
            active={activeGroup === 'all'}
            onClick={() => setActiveGroup('all')}
          />
          {GROUP_ORDER.map((groupId) => (
            <TabButton
              key={groupId}
              label={TOOL_GROUPS[groupId]}
              active={activeGroup === groupId}
              onClick={() => setActiveGroup(groupId)}
            />
          ))}
        </div>

        {/* Tool grid / Empty state */}
        {filteredTools.length === 0 ? (
          <div className="mt-12 text-center text-slate-500 text-sm">
            {activeGroup === 'all' ? (
              <>No tools match your search. Try a different keyword.</>
            ) : (
              <>
                No tools found in <strong>{TOOL_GROUPS[activeGroup]}</strong>.
                <br />
                Try another category or clear filters.
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredTools.map((tool) => {
              const Icon = tool.icon ?? Zap;
              return (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group rounded-xl border border-slate-800 bg-slate-900/70 hover:bg-slate-900 hover:border-indigo-500/70 transition-colors p-4 flex flex-col justify-between shadow-sm hover:shadow-lg hover:shadow-indigo-900/30"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/15 transition-colors">
                          <Icon className="w-4 h-4 text-indigo-400" />
                        </div>
                        <h2 className="font-semibold text-sm md:text-base text-slate-50 group-hover:text-white truncate">
                          {tool.label}
                        </h2>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {tool.isNew && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            NEW
                          </span>
                        )}
                        {tool.isPro && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            PRO
                          </span>
                        )}
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {TOOL_GROUPS[tool.category]}
                        </span>
                      </div>
                    </div>
                    {tool.description && (
                      <p className="text-xs md:text-sm text-slate-400 line-clamp-2">
                        {tool.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-mono opacity-70">/{tool.slug}</span>
                    <span className="inline-flex items-center gap-1 text-indigo-400 group-hover:gap-1.5 transition-all">
                      Open tool
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5h10m0 0v10m0-10L9 15"
                        />
                      </svg>
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Creator footer — now inside the component so it actually renders */}
        <div className="mt-16 flex flex-col items-center justify-center space-y-2 border-t border-slate-800 pt-8">
          <p className="text-slate-500 font-medium text-sm">Created by SmartRwl</p>
          <div className="flex space-x-4">
            <a
              href="http://www.instagram.com/smartrwl"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-pink-500 transition-colors"
              title="Instagram"
              aria-label="Instagram"
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
            <a
              href="https://github.com/Smart-rwl/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-white transition-colors"
              title="GitHub"
              aria-label="GitHub"
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
      </div>
    </div>
  );
}

/* Small tab-button component */
function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs md:text-sm px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'bg-indigo-600 border-indigo-500 text-white'
          : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );
}