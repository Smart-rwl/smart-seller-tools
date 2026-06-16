// lib/ppc-calculations.ts
//
// Pure math + insight generation for the Ad Profitability Engine.
// No React, no DOM, no fetch — easy to test, easy to reuse.

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */

/** Sentinel ACOS value representing "spent money, zero sales".
 *  We use a large finite number (not Infinity) so it still passes
 *  Number.isFinite checks and serializes cleanly. */
export const ACOS_INFINITE = 99999;

/** Default share of sales lost per doubling of ad spend (12%).
 *  Reflects high-intent keyword exhaustion in mature PPC accounts. */
export const DEFAULT_SCALE_DECAY = 0.12;

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

export type Preset = 'growth' | 'balanced' | 'profit';

export type CampaignStatus = 'profitable' | 'break-even' | 'loss' | 'critical';

export type InsightType = 'success' | 'warning' | 'danger' | 'info';

export interface CampaignInputs {
  adSpend: number;
  adSales: number;
  totalSales: number;
  cpc: number;
  sellingPrice: number;
  landedCost: number;
  targetProfitMargin: number;
}

export interface Metrics {
  acos: number;
  roas: number;
  tacos: number;
  marginPct: number;
  breakEvenAcos: number;
  targetAcos: number;
  orders: number;
  clicks: number;
  clicksToSale: number;
  conversionRate: number;
  netAdProfit: number;
  maxSafeBid: number;
  goldenBid: number;
  cpa: number;
  status: CampaignStatus;
}

export interface ScaleProjection {
  mult: number;
  spend: number;
  sales: number;
  profit: number;
  conversionRate: number;
}

export interface Insight {
  type: InsightType;
  text: string;
}

/* ─────────────────────────────────────────────
   SANITIZER
───────────────────────────────────────────── */

/** Coerce any input to a finite, non-negative number. Returns 0 for
 *  empty strings, dashes, NaN, Infinity, and negative values. */
export function safeNum(v: unknown): number {
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '' || trimmed === '-') return 0;
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  return n;
}

/* ─────────────────────────────────────────────
   INDIVIDUAL METRICS
───────────────────────────────────────────── */

/** ACOS = (spend / sales) × 100. Returns ACOS_INFINITE when spend > 0
 *  but sales = 0 (catastrophic case — spending with zero return). */
export function calculateAcos(spend: number, sales: number): number {
  if (spend === 0) return 0;
  if (sales === 0) return ACOS_INFINITE;
  return (spend / sales) * 100;
}

/** ROAS = sales / spend. Returns 0 when spend is 0. */
export function calculateRoas(spend: number, sales: number): number {
  if (spend === 0) return 0;
  return sales / spend;
}

/** TACoS = (ad spend / total sales) × 100. Total-account ad efficiency. */
export function calculateTacos(spend: number, totalSales: number): number {
  if (totalSales === 0) return 0;
  return (spend / totalSales) * 100;
}

/** Gross margin %. Can return negative (loss-leader). */
export function calculateMarginPct(price: number, cost: number): number {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
}

/** Status with proportional tolerance band: ±15% of break-even, minimum 2pp.
 *  - profitable: ACOS ≤ (breakEven − tolerance)
 *  - break-even: (breakEven − tolerance) < ACOS ≤ breakEven
 *  - loss:       breakEven < ACOS ≤ breakEven + 15
 *  - critical:   ACOS > breakEven + 15 */
export function calculateStatus(
  acos: number,
  breakEven: number,
): CampaignStatus {
  const tolerance = Math.max(breakEven * 0.15, 2);
  const lowerBound = breakEven - tolerance;
  const upperBound = breakEven;
  const criticalThreshold = breakEven + 15;

  if (acos > criticalThreshold) return 'critical';
  if (acos > upperBound) return 'loss';
  if (acos > lowerBound) return 'break-even';
  return 'profitable';
}

/* ─────────────────────────────────────────────
   FULL METRICS
───────────────────────────────────────────── */

export function calculateMetrics(inputs: CampaignInputs): Metrics {
  const acos = calculateAcos(inputs.adSpend, inputs.adSales);
  const roas = calculateRoas(inputs.adSpend, inputs.adSales);
  const tacos = calculateTacos(inputs.adSpend, inputs.totalSales);
  const marginPct = calculateMarginPct(inputs.sellingPrice, inputs.landedCost);

  // Floor at 0 for negative-margin (loss-leader) products
  const breakEvenAcos = Math.max(marginPct, 0);
  // Floor at 0 when desired margin exceeds gross margin
  const targetAcos = Math.max(breakEvenAcos - inputs.targetProfitMargin, 0);

  const orders = inputs.sellingPrice > 0 ? inputs.adSales / inputs.sellingPrice : 0;
  const clicks = inputs.cpc > 0 ? inputs.adSpend / inputs.cpc : 0;
  const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0;
  const clicksToSale = orders > 0 ? Math.round(clicks / orders) : 0;
  const cpa = orders > 0 ? inputs.adSpend / orders : 0;

  const grossMargin = inputs.sellingPrice - inputs.landedCost;
  const cogs = orders * inputs.landedCost;
  const netAdProfit = inputs.adSales - inputs.adSpend - cogs;

  const cvFrac = conversionRate / 100;
  const maxSafeBid = grossMargin > 0 ? grossMargin * cvFrac : 0;
  const goldenBid = inputs.sellingPrice * cvFrac * (targetAcos / 100);

  const status = calculateStatus(acos, breakEvenAcos);

  return {
    acos,
    roas,
    tacos,
    marginPct,
    breakEvenAcos,
    targetAcos,
    orders,
    clicks,
    clicksToSale,
    conversionRate,
    netAdProfit,
    maxSafeBid,
    goldenBid,
    cpa,
    status,
  };
}

/* ─────────────────────────────────────────────
   SCALE PROJECTION
───────────────────────────────────────────── */

/** Project performance at `mult`× current scale. Sales decay as
 *  (1 - decay)^log2(mult) — each doubling of spend loses `decay`
 *  fraction of marginal returns. CR decays proportionally because
 *  clicks scale linearly with spend. */
export function calculateScaleProjection(
  inputs: CampaignInputs,
  mult: number,
  decay: number = DEFAULT_SCALE_DECAY,
): ScaleProjection {
  const spend = inputs.adSpend * mult;

  // At mult ≤ 1, doublings = 0 (or negative), so decay factor = 1.
  // We use Math.max(mult, 1) to avoid spurious "growth" at mult < 1.
  const doublings = Math.log2(Math.max(mult, 1));
  const decayFactor = Math.pow(1 - decay, doublings);

  const sales = inputs.adSales * mult * decayFactor;

  const orders = inputs.sellingPrice > 0 ? sales / inputs.sellingPrice : 0;
  const cogs = orders * inputs.landedCost;
  const profit = sales - spend - cogs;

  const clicks = inputs.cpc > 0 ? spend / inputs.cpc : 0;
  const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0;

  return {
    mult,
    spend,
    sales,
    profit,
    conversionRate,
  };
}

/* ─────────────────────────────────────────────
   INSIGHTS GENERATOR
───────────────────────────────────────────── */

/** Default INR formatter used when no formatter is passed. Avoids
 *  taking a hard dependency on Intl in test runners that may stub
 *  globals. Currency-aware components can pass their own. */
function defaultFmt(n: number): string {
  if (!Number.isFinite(n)) return '₹0';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `₹${Math.round(n).toLocaleString()}`;
  }
}

export function generateInsights(
  metrics: Metrics,
  inputs: CampaignInputs,
  fmt: (n: number) => string = defaultFmt,
): Insight[] {
  const insights: Insight[] = [];

  // 1. Zero-sales catastrophe — spent money with no return
  if (metrics.acos >= ACOS_INFINITE && inputs.adSpend > 0) {
    insights.push({
      type: 'danger',
      text: `Spending ${fmt(inputs.adSpend)} with zero sales. Pause campaigns immediately and audit keyword relevance + landing-page conversion.`,
    });
  }

  // 2. Thin gross margin — even break-even is rough
  if (metrics.marginPct > 0 && metrics.marginPct < 10) {
    insights.push({
      type: 'danger',
      text: `Gross margin is only ${metrics.marginPct.toFixed(1)}% — there's almost no room for ads. Raise price or reduce landed cost before scaling spend.`,
    });
  }

  // 3. Loss or critical — concrete loss-per-sale
  if (
    (metrics.status === 'loss' || metrics.status === 'critical') &&
    metrics.acos < ACOS_INFINITE
  ) {
    const lossPerSale =
      metrics.orders > 0
        ? (inputs.adSpend + metrics.orders * inputs.landedCost - inputs.adSales) /
          metrics.orders
        : 0;
    insights.push({
      type: 'danger',
      text: `Losing approx. ${fmt(Math.abs(lossPerSale))} on every ad-driven sale. Cut CPC, narrow keyword targeting, or pause until economics improve.`,
    });
  }

  // 4. High ROAS — encourage scaling
  if (metrics.roas >= 5 && metrics.netAdProfit > 0) {
    insights.push({
      type: 'success',
      text: `ROAS of ${metrics.roas.toFixed(1)}× is exceptional. You likely have room to scale spend without major margin erosion.`,
    });
  }

  // 5. High TACoS — ads dominating total business
  if (metrics.tacos > 20 && inputs.totalSales > 0) {
    insights.push({
      type: 'warning',
      text: `TACoS at ${metrics.tacos.toFixed(1)}% means more than a fifth of total revenue is going to ads. Build organic ranking before scaling further.`,
    });
  }

  // 6. Low conversion rate — funnel leak
  if (
    metrics.conversionRate > 0 &&
    metrics.conversionRate < 2 &&
    metrics.clicks >= 50
  ) {
    insights.push({
      type: 'warning',
      text: `Conversion rate of ${metrics.conversionRate.toFixed(1)}% is below the 2-3% Amazon benchmark. Fix listing images, A+ content, or price competitiveness before paying for more traffic.`,
    });
  }

  // 7. Bid headroom — actual CPC much lower than max-safe bid
  if (
    inputs.cpc > 0 &&
    metrics.maxSafeBid > inputs.cpc * 1.5 &&
    metrics.status === 'profitable'
  ) {
    insights.push({
      type: 'success',
      text: `Your CPC (${fmt(inputs.cpc)}) is well below the max-safe bid (${fmt(metrics.maxSafeBid)}). You could bid more aggressively on top keywords without breaking even.`,
    });
  }

  // Fallback when nothing else triggered
  if (insights.length === 0) {
    insights.push({
      type: 'info',
      text: 'Enter your campaign data to see profitability insights and bid recommendations.',
    });
  }

  return insights.slice(0, 4);
}