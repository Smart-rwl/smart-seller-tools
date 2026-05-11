// ppc.test.ts
//
// Adjust this import path to wherever you placed the calculations file.
// If your project uses path aliases configured in tsconfig.json + vitest.config.ts,
// you can also use: import { ... } from '@/lib/ppc-calculations'
import { describe, it, expect } from 'vitest';
import {
  safeNum,
  calculateAcos,
  calculateRoas,
  calculateTacos,
  calculateMarginPct,
  calculateStatus,
  calculateMetrics,
  calculateScaleProjection,
  generateInsights,
  ACOS_INFINITE,
  type CampaignInputs,
} from '@/lib/ppc-calculations';

const baseline: CampaignInputs = {
  adSpend: 5000,
  adSales: 15000,
  totalSales: 45000,
  cpc: 15,
  sellingPrice: 1000,
  landedCost: 400,
  targetProfitMargin: 10,
};

// ===========================================================================
// safeNum
// ===========================================================================
describe('safeNum', () => {
  it('parses valid number strings', () => {
    expect(safeNum('100')).toBe(100);
    expect(safeNum('0.5')).toBe(0.5);
  });

  it('returns 0 for empty / dash strings', () => {
    expect(safeNum('')).toBe(0);
    expect(safeNum('-')).toBe(0);
  });

  it('returns 0 for non-numeric input', () => {
    expect(safeNum('abc')).toBe(0);
    expect(safeNum(NaN)).toBe(0);
  });

  it('returns 0 for Infinity', () => {
    expect(safeNum(Infinity)).toBe(0);
    expect(safeNum(-Infinity)).toBe(0);
  });

  it('clamps negative values to 0', () => {
    expect(safeNum(-100)).toBe(0);
    expect(safeNum('-50')).toBe(0);
  });

  it('passes through positive numbers', () => {
    expect(safeNum(42)).toBe(42);
    expect(safeNum(0)).toBe(0);
  });
});

// ===========================================================================
// calculateAcos
// ===========================================================================
describe('calculateAcos', () => {
  it('calculates ACOS as spend / sales × 100', () => {
    expect(calculateAcos(100, 500)).toBe(20);
    expect(calculateAcos(5000, 15000)).toBeCloseTo(33.33, 2);
  });

  it('returns ACOS_INFINITE when revenue is 0 but spend exists', () => {
    // This is the bug-fix that wasn't in the original: spending money with
    // zero sales is NOT 0% ACOS — it's catastrophic.
    expect(calculateAcos(100, 0)).toBe(ACOS_INFINITE);
  });

  it('returns 0 when both spend and revenue are 0', () => {
    expect(calculateAcos(0, 0)).toBe(0);
  });

  it('returns 0 when spend is 0 but revenue exists', () => {
    expect(calculateAcos(0, 1000)).toBe(0);
  });
});

// ===========================================================================
// calculateRoas
// ===========================================================================
describe('calculateRoas', () => {
  it('calculates ROAS as sales / spend', () => {
    expect(calculateRoas(1000, 4000)).toBe(4);
    expect(calculateRoas(5000, 15000)).toBe(3);
  });

  it('returns 0 when spend is 0', () => {
    expect(calculateRoas(0, 1000)).toBe(0);
  });
});

// ===========================================================================
// calculateTacos
// ===========================================================================
describe('calculateTacos', () => {
  it('calculates TACoS correctly', () => {
    expect(calculateTacos(5000, 45000)).toBeCloseTo(11.11, 2);
  });

  it('returns 0 when total sales is 0', () => {
    expect(calculateTacos(1000, 0)).toBe(0);
  });
});

// ===========================================================================
// calculateMarginPct
// ===========================================================================
describe('calculateMarginPct', () => {
  it('calculates margin percentage correctly', () => {
    expect(calculateMarginPct(1000, 400)).toBe(60);
    expect(calculateMarginPct(100, 80)).toBe(20);
  });

  it('returns 0 when selling price is 0', () => {
    expect(calculateMarginPct(0, 0)).toBe(0);
    expect(calculateMarginPct(0, 100)).toBe(0);
  });

  it('returns negative margin when cost exceeds price (loss-leader)', () => {
    expect(calculateMarginPct(100, 150)).toBe(-50);
  });
});

// ===========================================================================
// calculateStatus
// ===========================================================================
describe('calculateStatus', () => {
  it('returns profitable when ACOS is well below break-even', () => {
    expect(calculateStatus(20, 60)).toBe('profitable');
  });

  it('returns break-even when ACOS is just below break-even', () => {
    // breakEven 60, tolerance = max(60*0.15, 2) = 9, so 51 < x <= 60 is break-even
    expect(calculateStatus(55, 60)).toBe('break-even');
  });

  it('returns loss when ACOS exceeds break-even', () => {
    expect(calculateStatus(65, 60)).toBe('loss');
  });

  it('returns critical when ACOS overshoots break-even by 15+', () => {
    expect(calculateStatus(80, 60)).toBe('critical');
  });

  it('enforces minimum 2pp tolerance for thin margins', () => {
    // breakEven 10, proportional tolerance would be 1.5pp, but we clamp at 2pp
    // So ACOS 8.5 should be break-even (10 - 2 = 8, and 8.5 > 8)
    expect(calculateStatus(8.5, 10)).toBe('break-even');
    // ACOS 7 should be profitable
    expect(calculateStatus(7, 10)).toBe('profitable');
  });
});

// ===========================================================================
// calculateMetrics — full integration
// ===========================================================================
describe('calculateMetrics', () => {
  it('computes every metric correctly for baseline inputs', () => {
    const m = calculateMetrics(baseline);

    expect(m.acos).toBeCloseTo(33.33, 1);
    expect(m.roas).toBe(3);
    expect(m.tacos).toBeCloseTo(11.11, 1);
    expect(m.marginPct).toBe(60);
    expect(m.breakEvenAcos).toBe(60);
    expect(m.targetAcos).toBe(50);
    expect(m.orders).toBe(15);
    expect(m.clicks).toBeCloseTo(333.33, 1);
    expect(m.conversionRate).toBeCloseTo(4.5, 1);
    expect(m.status).toBe('profitable');
  });

  it('calculates net ad profit correctly', () => {
    const m = calculateMetrics(baseline);
    // sales(15000) - spend(5000) - cogs(15 * 400 = 6000) = 4000
    expect(m.netAdProfit).toBe(4000);
  });

  it('calculates max safe bid as margin × CR', () => {
    const m = calculateMetrics(baseline);
    // grossMargin(600) * CR(0.045) = 27
    expect(m.maxSafeBid).toBeCloseTo(27, 1);
  });

  it('calculates golden bid as price × CR × targetACOS', () => {
    const m = calculateMetrics(baseline);
    // 1000 * 0.045 * 0.50 = 22.5
    expect(m.goldenBid).toBeCloseTo(22.5, 1);
  });

  it('handles zero sales gracefully (catastrophic ACOS)', () => {
    const m = calculateMetrics({ ...baseline, adSales: 0 });
    expect(m.acos).toBe(ACOS_INFINITE);
    expect(m.roas).toBe(0);
    expect(m.orders).toBe(0);
    expect(m.status).toBe('critical');
  });

  it('handles zero spend gracefully', () => {
    const m = calculateMetrics({ ...baseline, adSpend: 0 });
    expect(m.acos).toBe(0);
    expect(m.clicks).toBe(0);
    expect(m.conversionRate).toBe(0);
    expect(m.status).toBe('profitable'); // technically nothing is being lost
  });

  it('handles all-zero inputs without producing NaN or Infinity', () => {
    const m = calculateMetrics({
      adSpend: 0,
      adSales: 0,
      totalSales: 0,
      cpc: 0,
      sellingPrice: 0,
      landedCost: 0,
      targetProfitMargin: 0,
    });
    expect(m.acos).toBe(0);
    expect(m.roas).toBe(0);
    expect(m.marginPct).toBe(0);
    expect(m.netAdProfit).toBe(0);
    expect(isFinite(m.maxSafeBid)).toBe(true);
    expect(isFinite(m.goldenBid)).toBe(true);
    expect(isFinite(m.cpa)).toBe(true);
  });

  it('handles negative margin (cost > price) safely', () => {
    const m = calculateMetrics({ ...baseline, landedCost: 1200 });
    expect(m.marginPct).toBe(-20);
    expect(m.breakEvenAcos).toBe(0);
    expect(m.maxSafeBid).toBe(0);
  });

  it('floors target ACOS at zero when desired margin exceeds gross margin', () => {
    // breakEvenAcos = 10, desired margin = 30 → targetAcos would be -20, floor at 0
    const m = calculateMetrics({
      ...baseline,
      landedCost: 900,
      targetProfitMargin: 30,
    });
    expect(m.targetAcos).toBe(0);
  });
});

// ===========================================================================
// calculateScaleProjection — REALISTIC decay
// ===========================================================================
describe('calculateScaleProjection', () => {
  it('returns baseline at 1x with no decay applied', () => {
    const p = calculateScaleProjection(baseline, 1);
    expect(p.spend).toBe(baseline.adSpend);
    expect(p.sales).toBe(baseline.adSales);
  });

  it('applies efficiency decay at 2x scale', () => {
    const p = calculateScaleProjection(baseline, 2);
    expect(p.spend).toBe(10000); // spend always scales linearly
    expect(p.sales).toBeLessThan(30000); // sales DON'T — that's the whole point
    expect(p.sales).toBeCloseTo(15000 * 2 * 0.88, 0);
  });

  it('compounds decay at 4x scale (two doublings)', () => {
    const p = calculateScaleProjection(baseline, 4);
    // (1 - 0.12)^log2(4) = 0.88^2 = 0.7744
    expect(p.sales).toBeCloseTo(15000 * 4 * 0.7744, 0);
  });

  it('respects custom decay rate', () => {
    const noDecay = calculateScaleProjection(baseline, 2, 0);
    expect(noDecay.sales).toBe(30000); // pure linear when decay is 0

    const heavyDecay = calculateScaleProjection(baseline, 2, 0.25);
    expect(heavyDecay.sales).toBeCloseTo(15000 * 2 * 0.75, 0);
  });

  it('decays conversion rate alongside sales', () => {
    const base = calculateMetrics(baseline);
    const proj = calculateScaleProjection(baseline, 2);
    expect(proj.conversionRate).toBeLessThan(base.conversionRate);
    expect(proj.conversionRate).toBeCloseTo(base.conversionRate * 0.88, 1);
  });

  it('reduces profit growth vs linear assumption', () => {
    const base = calculateMetrics(baseline);
    const proj = calculateScaleProjection(baseline, 2);
    // Linear assumption would predict profit = base * 2 = 8000
    // With decay, profit is less
    expect(proj.profit).toBeLessThan(base.netAdProfit * 2);
  });
});

// ===========================================================================
// generateInsights
// ===========================================================================
describe('generateInsights', () => {
  it('returns a fallback info insight when nothing else triggers', () => {
    const zeros: CampaignInputs = {
      adSpend: 0,
      adSales: 0,
      totalSales: 0,
      cpc: 0,
      sellingPrice: 0,
      landedCost: 0,
      targetProfitMargin: 10,
    };
    const m = calculateMetrics(zeros);
    const tips = generateInsights(m, zeros);
    expect(tips).toHaveLength(1);
    expect(tips[0].type).toBe('info');
  });

  it('warns about thin gross margins', () => {
    const inputs = { ...baseline, landedCost: 950 }; // 5% margin
    const m = calculateMetrics(inputs);
    const tips = generateInsights(m, inputs);
    expect(
      tips.some((t) => t.type === 'danger' && /margin/i.test(t.text))
    ).toBe(true);
  });

  it('warns about loss-making campaigns with exact loss per sale', () => {
    const inputs = { ...baseline, adSpend: 12000 }; // ACOS 80% > breakEven 60%
    const m = calculateMetrics(inputs);
    const tips = generateInsights(m, inputs);
    expect(
      tips.some((t) => t.type === 'danger' && /Losing/i.test(t.text))
    ).toBe(true);
  });

  it('praises high ROAS when campaign is profitable', () => {
    const inputs = { ...baseline, adSpend: 2000 }; // ROAS 7.5x
    const m = calculateMetrics(inputs);
    const tips = generateInsights(m, inputs);
    expect(
      tips.some((t) => t.type === 'success' && /ROAS/i.test(t.text))
    ).toBe(true);
  });

  it('flags the zero-sales catastrophe explicitly', () => {
    const inputs = { ...baseline, adSales: 0 };
    const m = calculateMetrics(inputs);
    const tips = generateInsights(m, inputs);
    expect(
      tips.some((t) => t.type === 'danger' && /zero sales/i.test(t.text))
    ).toBe(true);
  });

  it('caps output at 4 insights', () => {
    const m = calculateMetrics(baseline);
    const tips = generateInsights(m, baseline);
    expect(tips.length).toBeLessThanOrEqual(4);
  });
});