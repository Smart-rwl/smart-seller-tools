import type { TestStatus, Variant } from '@/app/tools/ab-test/types';
import type { ReactNode } from 'react';

export const DEFAULT_VARIANTS: Variant[] = [
  { id: 'v0', name: 'Control', visitors: '', conversions: '', revenue: '' },
  { id: 'v1', name: 'Variant B', visitors: '', conversions: '', revenue: '' },
];

export const MAX_VARIANTS = 4;

export interface StatusConfigItem {
  color: string;
  bg: string;
  border: string;
  label: string;
  headline: string;
}

export const STATUS_CONFIG: Record<TestStatus, StatusConfigItem> = {
  winner: {
    color: '#10b981',
    bg: '#052e1640',
    border: '#10b98130',
    label: 'CHALLENGER WINS',
    headline: 'Statistically Significant Winner',
  },
  loser: {
    color: '#ef4444',
    bg: '#2d060640',
    border: '#ef444430',
    label: 'CHALLENGER LOSES',
    headline: 'Statistically Significant — Challenger Underperforms',
  },
  leaning: {
    color: '#f59e0b',
    bg: '#2d1b0040',
    border: '#f59e0b30',
    label: 'TRENDING',
    headline: 'Trending — Not Yet Significant',
  },
  neutral: {
    color: '#475569',
    bg: '#0f172a',
    border: '#1e293b',
    label: 'INCONCLUSIVE',
    headline: 'Insufficient Data — Keep Running',
  },
};

export const VARIANT_ACCENTS = ['#64748b', '#6366f1', '#ec4899', '#06b6d4'];