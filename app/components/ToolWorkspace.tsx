// app/components/ToolWorkspace.tsx
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TOOLS, TOOL_GROUPS, type ToolCategory } from '../config/tools.config';

type Props = {
  /** Tool title (h1) */
  title: string;
  /** Short description shown under the title */
  subtitle: string;
  /** Main / wider workspace column */
  left: React.ReactNode;
  /** Optional sidebar column (info panels, settings, history…) */
  right?: React.ReactNode;
  /**
   * Optional: pass the tool's slug to auto-derive the category breadcrumb
   * from your tools.config.ts. If omitted, only a generic "All tools" back
   * link is shown.
   */
  slug?: string;
  /** Override the back-link destination. Defaults to /tools. */
  backHref?: string;
};

export default function ToolWorkspace({
  title,
  subtitle,
  left,
  right,
  slug,
  backHref = '/tools',
}: Props) {
  const tool = slug ? TOOLS.find((t) => t.slug === slug) : undefined;
  const categoryLabel = tool?.category
    ? TOOL_GROUPS[tool.category as ToolCategory]
    : undefined;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#09090b] text-zinc-200">
      {/* Atmospheric background matching the dashboard */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[480px]"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 15% 0%, rgba(249, 115, 22, 0.04), transparent 50%), radial-gradient(ellipse at 85% 0%, rgba(139, 92, 246, 0.025), transparent 40%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-24 lg:px-8">
        {/* Breadcrumb / back link */}
        <div className="mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
          <Link
            href={backHref}
            className="flex items-center gap-1.5 transition hover:text-zinc-200"
          >
            <ArrowLeft className="h-3 w-3" />
            All tools
          </Link>
          {categoryLabel && (
            <>
              <span className="text-zinc-700">/</span>
              <span>{categoryLabel}</span>
            </>
          )}
        </div>

        {/* Header */}
        <div className="mb-10 border-b border-white/[0.06] pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-light tracking-tight text-zinc-100">
              {title}
            </h1>
            {tool?.isNew && (
              <span className="rounded bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-400">
                New
              </span>
            )}
            {tool?.isPro && (
              <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                Pro
              </span>
            )}
          </div>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">{subtitle}</p>
        </div>

        {/* Workspace */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-8">{left}</div>
          {right && <div className="space-y-6 lg:col-span-4">{right}</div>}
        </div>
      </div>
    </div>
  );
}