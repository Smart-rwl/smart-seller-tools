// app/config/tools.config.ts

export type ToolGroupId =
  | 'calculators'
  | 'finance'
  | 'listing'
  | 'operations'
  | 'assets';

export interface ToolSEO {
  title: string;
  description: string;
}

export interface ToolItem {
  slug: string;        // folder name under /app/tools
  label: string;       // visible name
  desc?: string;       // short description
  group: ToolGroupId;

  /* --- ADDITIVE (OPTIONAL) --- */
  isPro?: boolean;     // freemium gating
  priority?: number;  // dashboard / recommendation ranking
  seo?: ToolSEO;       // SEO metadata
}

export const TOOL_GROUPS: Record<ToolGroupId, string> = {
  calculators: 'Calculators',
  finance: 'Finance',
  listing: 'Listing Tools',
  operations: 'Operations',
  assets: 'Assets',
};

export const TOOLS: ToolItem[] = [
  // --- Calculators ---
  {
    slug: 'calculator',
    label: 'Profit & RTO',
    desc: 'Net margin & RTO impact',
    group: 'calculators',
    priority: 1,
    seo: {
      title: 'Amazon Profit & RTO Calculator',
      description: 'Calculate net profit and RTO impact for Amazon sellers.'
    }
  },
  {
    slug: 'ppc-calculator',
    label: 'PPC / Ads',
    desc: 'ACOS, ROAS & breakeven',
    group: 'calculators',
    isPro: true,
    seo: {
      title: 'Amazon PPC Calculator',
      description: 'Calculate ACoS, ROAS and ad profitability.'
    }
  },
  {
    slug: 'odr-calculator',
    label: 'Account Health (ODR)',
    desc: 'Order defect rate monitor',
    group: 'calculators'
  },
  { slug: 'cbm-calculator', label: 'CBM Calculator', desc: 'Carton CBM & freight', group: 'calculators' },
  { slug: 'ltsf-calculator', label: 'LTSF Calculator', desc: 'Long-term storage impact', group: 'calculators' },
  { slug: 'returns-calculator', label: 'Returns Calculator', desc: 'Analyze return costs', group: 'calculators' },
  { slug: 'bundle-calculator', label: 'Bundle Profit', desc: 'Kit & combo margin', group: 'calculators' },
{ 
  slug: 'amazon-fee-calculator', 
  label: 'Amazon Profit Calc', 
  desc: 'Referral, Closing & FBA Fee breakdown', 
  group: 'calculators' 
},
  // --- Finance ---
  {
    slug: 'cashflow-planner',
    label: 'Cashflow Planner',
    desc: 'Forecast liquidity',
    group: 'finance',
    priority: 2
  },
  { slug: 'landed-cost', label: 'Landed Cost', desc: 'Import duty & freight', group: 'finance' },
  { slug: 'storage-fee-planner', label: 'Storage Fee Planner', desc: 'Monthly warehouse fees', group: 'finance' },
  { slug: 'influencer-roi', label: 'Influencer ROI', desc: 'Campaign performance math', group: 'finance' },
  { slug: 'ltv-calculator', label: 'Customer LTV', desc: 'Lifetime value analysis', group: 'finance' },
  { slug: 'deal-planner', label: 'Deal Planner', desc: 'Promo impact planning', group: 'finance' },
  {
    slug: 'reimbursement-estimator',
    label: 'Refund Estimator',
    desc: 'Calculate owed FBA money',
    group: 'finance',
    isPro: true
  },

  // --- Listing Tools ---
  { slug: 'keywords', label: 'Keyword Explorer', desc: 'Seed & long-tail ideas', group: 'listing' },
  { slug: 'keyword-density', label: 'Keyword Density', desc: 'Competitor copy coverage', group: 'listing' },
  { slug: 'keyword-mixer', label: 'Keyword Mixer', desc: 'Phrase / exact mixing', group: 'listing' },
  {
    slug: 'title-optimizer',
    label: 'Title Optimizer',
    desc: 'SEO-optimized titles',
    group: 'listing',
    priority: 3
  },
  { slug: 'bullet-builder', label: 'Bullet Builder', desc: 'Benefits & feature bullets', group: 'listing' },
  { slug: 'html-formatter', label: 'HTML Formatter', desc: 'Clean product descriptions', group: 'listing' },
  { slug: 'lqs-checker', label: 'LQS Checker', desc: 'Basic listing audit', group: 'listing' },
  { slug: 'ab-test', label: 'A/B Test Calculator', desc: 'Statistical significance', group: 'listing' },

  // --- Operations ---
  {
    slug: 'inventory-planner',
    label: 'Inventory Planner',
    desc: 'Replenishment planning',
    group: 'operations',
    priority: 4
  },
  { slug: 'price-finder', label: 'Target Price Finder', desc: 'Reverse-calc ideal price', group: 'operations' },
  { slug: 'price-matcher', label: 'Price Matcher', desc: 'Competitor comparison', group: 'operations' },
  { slug: 'competitor-war-room', label: 'Competitor War Room', desc: 'Track competitor moves', group: 'operations', isPro: true },
  { slug: 'launch-simulator', label: 'Launch Simulator', desc: 'Plan launch units', group: 'operations' },
  { slug: 'review-planner', label: 'Review Planner', desc: 'Request automation schedule', group: 'operations' },
  {
    slug: 'super-url',
    label: 'Super URL Builder',
    desc: 'Generate Canonical & 2-Step URLs',
    group: 'operations'
  },

  // --- Assets ---
  {
    slug: 'amazon-image-tool', label: 'Image Editor', desc: 'Resize & Rename Images', group: 'assets', priority: 5
  },
  { slug: 'sku-generator', label: 'SKU Generator', desc: 'Smart custom SKUs', group: 'assets' },
  { slug: 'qr-generator', label: 'QR Generator', desc: 'QR codes for inserts', group: 'assets' },
  { slug: 'barcode-generator', label: 'Barcode Generator', desc: 'FNSKU / UPC labels', group: 'assets' },
  { slug: 'amazon-bulk-image-dwn-tool', label: 'Bulk Image Downloader', desc: 'Download multiple images at once', group: 'assets' }
];
