/**
 * Pure statistical functions for A/B testing.
 * No React, no DOM — fully testable.
 */

/** Abramowitz & Stegun normal CDF approximation (max error ≈ 7.5e-8) */
export function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-(z * z) / 2);
  const poly =
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.7814779 + t * (-1.821256 + t * 1.3302744))));
  const p = 1 - d * poly;
  return z >= 0 ? p : 1 - p;
}

/** Two-proportion Z-test (pooled, two-tailed) */
export function zTestProportions(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
): { z: number; p: number; confidence: number } {
  if (!n1 || !n2) return { z: 0, p: 1, confidence: 0 };
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pooled = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2));
  if (se === 0) return { z: 0, p: 1, confidence: 0 };
  const z = (p2 - p1) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  const confidence = (1 - pValue) * 100;
  return { z, p: pValue, confidence: Math.min(Math.max(confidence, 0), 99.99) };
}

/** 95% CI for relative lift via delta method (log-transform) */
export function liftConfidenceInterval(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
): { low: number; high: number } {
  if (!n1 || !n2 || x1 === 0) return { low: 0, high: 0 };
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  if (p1 === 0 || p2 === 0) return { low: 0, high: 0 };
  const varLog = (1 - p1) / (n1 * p1) + (1 - p2) / (n2 * p2);
  const seLog = Math.sqrt(varLog);
  const ratio = p2 / p1;
  const low = ratio * Math.exp(-1.96 * seLog) - 1;
  const high = ratio * Math.exp(1.96 * seLog) - 1;
  return { low: low * 100, high: high * 100 };
}

/* ── Bayesian helpers ── */

function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sampleGamma(shape: number): number {
  if (shape < 1) {
    const u = Math.random();
    return sampleGamma(shape + 1) * Math.pow(u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let x: number, v: number;
    do {
      x = randn();
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = Math.random();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

function sampleBeta(a: number, b: number): number {
  const x = sampleGamma(a);
  const y = sampleGamma(b);
  return x / (x + y);
}

/**
 * Bayesian P(variant > control) with Beta(1,1) priors.
 * Returns 0–100.
 */
export function bayesianProbability(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
  samples = 5000,
): number {
  if (!n1 || !n2) return 50;
  const a1 = x1 + 1;
  const b1 = n1 - x1 + 1;
  const a2 = x2 + 1;
  const b2 = n2 - x2 + 1;

  let wins = 0;
  for (let i = 0; i < samples; i++) {
    const sA = sampleBeta(a1, b1);
    const sB = sampleBeta(a2, b2);
    if (sB > sA) wins++;
  }
  return (wins / samples) * 100;
}

/** Required sample size per variant (two-proportion, two-tailed) */
export function requiredSampleSize(
  baselineCR: number,
  mde: number,
  alpha = 0.05,
  power: 0.8 | 0.9 = 0.8,
): number {
  const p1 = baselineCR;
  const p2 = p1 * (1 + mde);
  if (p1 <= 0 || p1 >= 1 || p2 <= 0 || p2 >= 1) return 0;
  const zAlpha = alpha === 0.05 ? 1.96 : 2.576;
  const zBeta = power === 0.9 ? 1.282 : 0.842;
  const pooled = (p1 + p2) / 2;
  const num = Math.pow(
    zAlpha * Math.sqrt(2 * pooled * (1 - pooled)) +
      zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)),
    2,
  );
  const den = Math.pow(p2 - p1, 2);
  return Math.ceil(num / den);
}