// lib/ppc-calculations.ts
// Pure calculation functions for the Ad Profitability Engine.
// Separated from the UI so they can be unit-tested in isolation.

// ---------- TYPES ----------
export type CampaignStatus = 'profitable' | 'break-even' | 'loss' | 'critical';
export type Preset = 'growth' | 'balanced' | 'profit';
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
  breakEvenAcos: number;
  targetAcos: number;
  maxSafeBid: number;
  goldenBid: number;
  netAdProfit: number;
  conversionRate: number;
  clicksToSale: number;
  cpa: number;
  marginPct: number;
  orders: number;
  clicks: number;
  status: CampaignStatus;
}

export interface Insight {
  type: InsightType;
  text: string;
}

export interface ScaleProjection {
  mult: number;
  spend: number;
  sales: number;
  profit: number;
  conversionRate: number;
}

// ---------- CONSTANTS ----------
export const ACOS_INFINITE = 999;
export const STATUS_TOLERANCE_PCT = 0.15;
export const STATUS_TOLERANCE_MIN = 2;
export const CRITICAL_OVERSHOOT = 15;

// Industry rule of thumb: ad efficiency drops ~10–15% per doubling of spend
// because you exhaust high-intent searches first.
export const DEFAULT_SCALE_DECAY = 0.12;

// ---------- HELPERS ----------
export function safeNum(val: string | number): number {
  if (typeof val === 'number') {
    if (isNaN(val) || !isFinite(val)) return 0;
    return Math.max(0, val);
  }
  if (val === '' || val === '-') return 0;
  const n = Number(val);
  if (isNaN(n) || !isFinite(n)) return 0;
  return Math.max(0, n);
}

// ---------- ATOMIC CALCULATIONS ----------
export function calculateAcos(adSpend: number, adSales: number): number {
  if (adSales > 0) return (adSpend / adSales) * 100;
  if (adSpend > 0) return ACOS_INFINITE;
  return 0;
}

export function calculateRoas(adSpend: number, adSales: number): number {
  if (adSpend <= 0) return 0;
  return adSales / adSpend;
}

export function calculateTacos(adSpend: number, totalSales: number): number {
  if (totalSales <= 0) return 0;
  return (adSpend / totalSales) * 100;
}

export function calculateMarginPct(
  sellingPrice: number,
  landedCost: number
): number {
  if (sellingPrice <= 0) return 0;
  return ((sellingPrice - landedCost) / sellingPrice) * 100;
}

export function calculateStatus(
  acos: number,
  breakEvenAcos: number
): CampaignStatus {
  const tolerance = Math.max(
    breakEvenAcos * STATUS_TOLERANCE_PCT,
    STATUS_TOLERANCE_MIN
  );
  if (acos > breakEvenAcos + CRITICAL_OVERSHOOT) return 'critical';
  if (acos > breakEvenAcos) return 'loss';
  if (acos > breakEvenAcos - tolerance) return 'break-even';
  return 'profitable';
}

// ---------- COMPOSITE ----------
export function calculateMetrics(inputs: CampaignInputs): Metrics {
  const {
    adSpend,
    adSales,
    totalSales,
    cpc,
    sellingPrice,
    landedCost,
    targetProfitMargin,
  } = inputs;

  const acos = calculateAcos(adSpend, adSales);
  const roas = calculateRoas(adSpend, adSales);
  const tacos = calculateTacos(adSpend, totalSales);

  const grossMargin = sellingPrice - landedCost;
  const marginPct = calculateMarginPct(sellingPrice, landedCost);

  const breakEvenAcos = Math.max(marginPct, 0);
  const targetAcos = Math.max(breakEvenAcos - targetProfitMargin, 0);

  const clicks = cpc > 0 ? adSpend / cpc : 0;
  const orders = sellingPrice > 0 ? adSales / sellingPrice : 0;
  const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0;

  const maxSafeBid = grossMargin > 0 ? grossMargin * (conversionRate / 100) : 0;
  const goldenBid =
    sellingPrice > 0
      ? sellingPrice * (conversionRate / 100) * (targetAcos / 100)
      : 0;

  const clicksToSale = conversionRate > 0 ? Math.ceil(100 / conversionRate) : 0;
  const cpa = clicksToSale * cpc;

  const costOfAdGoods = orders * landedCost;
  const netAdProfit = adSales - adSpend - costOfAdGoods;

  const status = calculateStatus(acos, breakEvenAcos);

  return {
    acos,
    roas,
    tacos,
    breakEvenAcos,
    targetAcos,
    maxSafeBid,
    goldenBid,
    netAdProfit,
    conversionRate,
    clicksToSale,
    cpa,
    marginPct,
    orders,
    clicks,
    status,
  };
}

// ---------- SCALE PROJECTION ----------
// Realistic model: efficiency decays as you scale because you exhaust
// high-intent search terms first. Each doubling of spend multiplies
// effective conversion rate by (1 - decayRate).
//
// At multiplier M, factor = (1 - decayRate)^log2(M).
// M=1   -> factor = 1.00 (no decay)
// M=2   -> factor = 0.88 (12% decay)
// M=4   -> factor = 0.77 (compounded)
// M=8   -> factor = 0.68
export function calculateScaleProjection(
  inputs: CampaignInputs,
  multiplier: number,
  decayRate: number = DEFAULT_SCALE_DECAY
): ScaleProjection {
  const baseMetrics = calculateMetrics(inputs);

  // At 1x or below, no decay applies
  if (multiplier <= 1) {
    return {
      mult: multiplier,
      spend: inputs.adSpend * multiplier,
      sales: inputs.adSales * multiplier,
      profit: baseMetrics.netAdProfit * multiplier,
      conversionRate: baseMetrics.conversionRate,
    };
  }

  const doublings = Math.log2(multiplier);
  const efficiencyFactor = Math.pow(1 - decayRate, doublings);

  const projSpend = inputs.adSpend * multiplier;
  const projSales = inputs.adSales * multiplier * efficiencyFactor;
  const projOrders = baseMetrics.orders * multiplier * efficiencyFactor;
  const projCogs = projOrders * inputs.landedCost;
  const projProfit = projSales - projSpend - projCogs;
  const projCr = baseMetrics.conversionRate * efficiencyFactor;

  return {
    mult: multiplier,
    spend: projSpend,
    sales: projSales,
    profit: projProfit,
    conversionRate: projCr,
  };
}

// ---------- INSIGHTS ENGINE ----------
export function generateInsights(
  metrics: Metrics,
  inputs: CampaignInputs
): Insight[] {
  const tips: Insight[] = [];
  const { sellingPrice } = inputs;

  if (metrics.marginPct > 0 && metrics.marginPct < 10) {
    tips.push({
      type: 'danger',
      text: `Gross margin is only ${metrics.marginPct.toFixed(
        1
      )}%. Renegotiate supplier costs or raise prices before scaling ads.`,
    });
  }

  if (
    metrics.acos > metrics.breakEvenAcos &&
    metrics.breakEvenAcos > 0 &&
    metrics.acos < ACOS_INFINITE
  ) {
    const lossPct = metrics.acos - metrics.breakEvenAcos;
    const lossPerSale = (sellingPrice * lossPct) / 100;
    tips.push({
      type: 'danger',
      text: `Losing approx ₹${Math.round(
        lossPerSale
      ).toLocaleString('en-IN')} per ad sale. Reduce max bid toward ₹${metrics.maxSafeBid.toFixed(
        2
      )} or pause underperforming keywords.`,
    });
  }

  if (
    metrics.tacos > 0 &&
    metrics.tacos < 8 &&
    metrics.acos < metrics.breakEvenAcos &&
    metrics.acos > 0
  ) {
    tips.push({
      type: 'success',
      text: `TACoS at ${metrics.tacos.toFixed(
        1
      )}% is excellent — organic sales are carrying the brand. Safe to scale ad spend 20–30%.`,
    });
  }

  if (metrics.conversionRate > 0 && metrics.conversionRate < 5) {
    tips.push({
      type: 'warning',
      text: `Conversion rate of ${metrics.conversionRate.toFixed(
        1
      )}% is below average. Improve listing images, A+ content, and reviews before scaling.`,
    });
  }

  if (metrics.conversionRate >= 10) {
    tips.push({
      type: 'success',
      text: `${metrics.conversionRate.toFixed(
        1
      )}% conversion rate is strong. You can bid more aggressively without burning cash.`,
    });
  }

  if (metrics.roas >= 4 && metrics.acos < metrics.breakEvenAcos) {
    tips.push({
      type: 'success',
      text: `${metrics.roas.toFixed(
        2
      )}x ROAS is healthy. Test increasing daily budget by 25% to capture more market share.`,
    });
  }

  if (
    metrics.cpa > 0 &&
    sellingPrice > 0 &&
    metrics.cpa > sellingPrice * 0.4
  ) {
    tips.push({
      type: 'warning',
      text: `CPA of ₹${Math.round(metrics.cpa).toLocaleString(
        'en-IN'
      )} eats over 40% of selling price. Tighten keyword targeting or pause low-converting search terms.`,
    });
  }

  if (metrics.acos >= ACOS_INFINITE) {
    tips.push({
      type: 'danger',
      text: `You're spending on ads with zero sales. Pause the campaign and audit search terms before any more spend.`,
    });
  }

  if (tips.length === 0) {
    tips.push({
      type: 'info',
      text: 'Adjust your inputs to see personalized recommendations powered by your unit economics.',
    });
  }

  return tips.slice(0, 4);
}