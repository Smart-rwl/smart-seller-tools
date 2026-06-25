import type { Variant } from '@/app/tools/ab-test/types';

export function encodeStateToURL(variants: Variant[], duration: number): string {
  const data = variants
    .map((v) => `${v.visitors || 0},${v.conversions || 0},${v.revenue || 0}`)
    .join('|');
  const params = new URLSearchParams();
  params.set('d', data);
  params.set('t', String(duration));
  return params.toString();
}

export function decodeStateFromURL(): {
  variants?: Variant[];
  duration?: number;
} {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const d = params.get('d');
  const t = params.get('t');
  if (!d) return {};
  const parsed = d.split('|').map((row, i) => {
    const [v, c, r] = row.split(',').map(Number);
    return {
      id: `v${i}`,
      name: i === 0 ? 'Control' : `Variant ${String.fromCharCode(65 + i)}`,
      visitors: v || ('' as const),
      conversions: c || ('' as const),
      revenue: r || ('' as const),
    } as Variant;
  });
  return { variants: parsed, duration: t ? Number(t) : 30 };
}