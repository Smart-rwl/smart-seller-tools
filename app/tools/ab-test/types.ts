export interface Variant {
  id: string;
  name: string;
  visitors: number | '';
  conversions: number | '';
  revenue: number | '';
}

export type TestStatus = 'winner' | 'loser' | 'leaning' | 'neutral';

export interface VariantMetrics {
  id: string;
  name: string;
  visitors: number;
  conversions: number;
  revenue: number;
  cr: number;
  rpv: number;
  aov: number;
}

export interface ComparisonMetrics {
  control: VariantMetrics;
  variant: VariantMetrics;
  liftCR: number;
  liftRPV: number;
  liftAOV: number;
  zScore: number;
  pValue: number;
  confidence: number;
  bayesianProb: number;
  ciLow: number;
  ciHigh: number;
  status: TestStatus;
  monthlyRevLift: number;
}