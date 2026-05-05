import type { VariantMetrics, ComparisonMetrics } from '@/app/tools/ab-test/types';

export function buildCSV(
  variantMetrics: VariantMetrics[],
  comparisons: ComparisonMetrics[],
): string {
  const rows: string[][] = [
    ['Variant', 'Visitors', 'Conversions', 'Revenue', 'CR (%)', 'RPV ($)', 'AOV ($)'],
    ...variantMetrics.map((v) => [
      v.name,
      v.visitors.toString(),
      v.conversions.toString(),
      v.revenue.toFixed(2),
      (v.cr * 100).toFixed(3),
      v.rpv.toFixed(3),
      v.aov.toFixed(2),
    ]),
    [],
    ['Statistical Analysis (vs Control)'],
    [
      'Variant',
      'Lift CR (%)',
      'Z-Score',
      'p-value',
      'Confidence (%)',
      'Bayesian P(B>A) (%)',
      '95% CI Low (%)',
      '95% CI High (%)',
      'Status',
    ],
    ...comparisons.map((c) => [
      c.variant.name,
      c.liftCR.toFixed(3),
      c.zScore.toFixed(4),
      c.pValue.toFixed(4),
      c.confidence.toFixed(2),
      c.bayesianProb.toFixed(2),
      c.ciLow.toFixed(2),
      c.ciHigh.toFixed(2),
      c.status,
    ]),
  ];
  return rows.map((r) => r.map((cell) => `"${cell}"`).join(',')).join('\n');
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}