import type { Metadata } from 'next';
import ToolClient from './ToolClient';

export const metadata: Metadata = {
  title: 'A/B Test Significance Calculator | Smart Seller Tools',
  description:
    'Frequentist Z-test plus Bayesian probability for A/B tests. Multi-variant support, RPV/AOV analysis, sample size planning, and shareable results.',
  openGraph: {
    title: 'A/B Test Significance Calculator',
    description: 'Statistical engine for serious e-commerce teams.',
    type: 'website',
  },
};

export default function Page() {
  return <ToolClient />;
}