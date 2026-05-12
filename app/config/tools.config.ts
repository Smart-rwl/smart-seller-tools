// app/config/tools.config.ts
//
// Migration notes (from the old shape):
//   • `group`  → `category`     (field rename)
//   • `desc`   → `description`  (field rename)
//   • NEW: optional `icon`      (Lucide icon component)
//   • NEW: optional `keywords`  (terms the search bar should match)
//   • NEW: optional `isNew`     (shows a "New" badge in the dashboard)
//
// Type aliases at the bottom keep `ToolGroupId` and `ToolItem` working as
// legacy names so existing imports don't break — but any code reading
// `.group` or `.desc` on a tool needs to be updated to `.category` / `.description`.

import {
  // Calculators
  Calculator,
  Target,
  ShieldCheck,
  Box,
  Warehouse,
  RotateCcw,
  Boxes,
  Receipt,
  // Finance
  Waves,
  Plane,
  Building2,
  Megaphone,
  UserCheck,
  Tag,
  HandCoins,
  // Listing
  Search,
  BarChart3,
  Shuffle,
  Sparkles,
  ListChecks,
  Code2,
  ClipboardCheck,
  FlaskConical,
  // Operations
  Package,
  Crosshair,
  Scale,
  Swords,
  Rocket,
  Star,
  Link2,
  // Assets
  ImagePlus,
  Hash,
  QrCode,
  Barcode,
  Download,
  type LucideIcon,
} from 'lucide-react';

/* ────────────────────────────────────────────────
   Types
──────────────────────────────────────────────── */

export type ToolCategory =
  | 'calculators'
  | 'finance'
  | 'listing'
  | 'operations'
  | 'assets';

export interface ToolSEO {
  title: string;
  description: string;
}

export interface Tool {
  /** URL slug — `/tools/{slug}` */
  slug: string;
  /** Display name */
  label: string;
  /** One-sentence description shown on the card */
  description?: string;
  /** Used for filter pills and grouping */
  category: ToolCategory;
  
  /** Lucide icon component (defaults to Zap in the UI if omitted) */
  icon?: LucideIcon;
  /** Extra terms the search bar should match */
  keywords?: string[];
  /** Shows a "New" badge */
  isNew?: boolean;
  /** Shows a "Pro" badge and gates access if you wire that up */
  isPro?: boolean;
  /** Featured ranking. Lower number = surfaced higher. */
  priority?: number;
  /** SEO metadata for these tool's page */
  seo?: ToolSEO;
  // Legacy aliases (to keep old code working without type errors)
  group?: string;
  // Legacy alias (to keep old code working without type errors)
  desc?: string;
  // Legacy aliases (to keep old code working without type errors)
}

/* ────────────────────────────────────────────────
   Category labels (drives the dashboard filter pills)
──────────────────────────────────────────────── */

export const TOOL_GROUPS: Record<ToolCategory, string> = {
  calculators: 'Calculators',
  finance: 'Finance',
  listing: 'Listing',
  operations: 'Operations',
  assets: 'Assets',
};

/* ────────────────────────────────────────────────
   Tools
──────────────────────────────────────────────── */

export const TOOLS: Tool[] = [
  /* ── Calculators ─────────────────────────── */
  {
    slug: 'calculator',
    label: 'Profit & RTO',
    description: 'Net margin and RTO impact, weighted for return rates.',
    category: 'calculators',
    icon: Calculator,
    priority: 1,
    keywords: ['profit', 'rto', 'margin', 'roi', 'returns', 'net profit'],
    seo: {
      title: 'Amazon Profit & RTO Calculator',
      description: 'Calculate net profit and RTO impact for Amazon sellers.',
    },
  },
  {
    slug: 'ppc-calculator',
    label: 'PPC / Ads',
    description: 'ACoS, ROAS and break-even ad spend per SKU.',
    category: 'calculators',
    icon: Target,
    isPro: true,
    keywords: ['ppc', 'ads', 'acos', 'roas', 'sponsored', 'amazon ads'],
    seo: {
      title: 'Amazon PPC Calculator',
      description: 'Calculate ACoS, ROAS and ad profitability.',
    },
  },
  {
    slug: 'odr-calculator',
    label: 'Account Health (ODR)',
    description: 'Track order defect rate and account health metrics.',
    category: 'calculators',
    icon: ShieldCheck,
    keywords: ['odr', 'order defect rate', 'account health', 'metrics'],
  },
  {
    slug: 'cbm-calculator',
    label: 'CBM Calculator',
    description: 'Cubic-meter sizing and freight volume.',
    category: 'calculators',
    icon: Box,
    keywords: ['cbm', 'cubic meter', 'freight', 'shipping volume', 'carton'],
  },
  {
    slug: 'ltsf-calculator',
    label: 'LTSF Calculator',
    description: 'Estimate long-term storage fee impact on margin.',
    category: 'calculators',
    icon: Warehouse,
    keywords: ['ltsf', 'long term storage', 'fba storage', 'aged inventory'],
  },
  {
    slug: 'returns-calculator',
    label: 'Returns Calculator',
    description: 'True per-unit cost of returns including reverse logistics.',
    category: 'calculators',
    icon: RotateCcw,
    keywords: ['returns', 'rto', 'refund', 'return cost', 'reverse logistics'],
  },
  {
    slug: 'bundle-calculator',
    label: 'Bundle Profit',
    description: 'Margin math for kits, combos and multipacks.',
    category: 'calculators',
    icon: Boxes,
    keywords: ['bundle', 'kit', 'combo', 'multipack', 'set'],
  },
  {
    slug: 'amazon-fee-calculator',
    label: 'Amazon Profit Calc',
    description: 'Full referral, closing and FBA fee breakdown.',
    category: 'calculators',
    icon: Receipt,
    keywords: ['amazon fee', 'referral fee', 'closing fee', 'fba fee'],
  },

  /* ── Finance ─────────────────────────────── */
  {
    slug: 'cashflow-planner',
    label: 'Cashflow Planner',
    description: 'Forecast liquidity from payouts, inventory and ad spend.',
    category: 'finance',
    icon: Waves,
    priority: 2,
    keywords: ['cashflow', 'liquidity', 'forecast', 'cash', 'working capital'],
  },
  {
    slug: 'landed-cost',
    label: 'Landed Cost',
    description: 'Import duty, freight and customs in one number.',
    category: 'finance',
    icon: Plane,
    keywords: ['landed cost', 'import duty', 'freight', 'customs', 'cif'],
  },
  {
    slug: 'storage-fee-planner',
    label: 'Storage Fee Planner',
    description: 'Monthly warehouse and FBA storage projections.',
    category: 'finance',
    icon: Building2,
    keywords: ['storage', 'warehouse', 'monthly fee', 'fba'],
  },
  {
    slug: 'influencer-roi',
    label: 'Influencer ROI',
    description: 'Campaign performance math for paid creator partnerships.',
    category: 'finance',
    icon: Megaphone,
    keywords: ['influencer', 'roi', 'campaign', 'creator', 'ugc'],
  },
  {
    slug: 'ltv-calculator',
    label: 'Customer LTV',
    description: 'Lifetime value across repeat purchases and channels.',
    category: 'finance',
    icon: UserCheck,
    keywords: ['ltv', 'lifetime value', 'customer', 'retention'],
  },
  {
    slug: 'deal-planner',
    label: 'Deal Planner',
    description: 'Project promo impact on margin and ranking.',
    category: 'finance',
    icon: Tag,
    keywords: ['deal', 'promo', 'discount', 'lightning deal', 'coupon'],
  },
  {
    slug: 'reimbursement-estimator',
    label: 'Refund Estimator',
    description: 'How much FBA owes you for lost or damaged stock.',
    category: 'finance',
    icon: HandCoins,
    isPro: true,
    keywords: ['reimbursement', 'refund', 'fba', 'lost inventory', 'damaged'],
  },

  /* ── Listing ─────────────────────────────── */
  {
    slug: 'keywords',
    label: 'Keyword Explorer',
    description: 'Seed terms and long-tail ideas from competitor listings.',
    category: 'listing',
    icon: Search,
    keywords: ['keyword', 'seo', 'search terms', 'long tail', 'research'],
  },
  {
    slug: 'keyword-density',
    label: 'Keyword Density',
    description: 'Audit competitor copy for keyword coverage.',
    category: 'listing',
    icon: BarChart3,
    keywords: ['keyword density', 'coverage', 'competitor analysis', 'audit'],
  },
  {
    slug: 'keyword-mixer',
    label: 'Keyword Mixer',
    description: 'Generate phrase and exact-match permutations.',
    category: 'listing',
    icon: Shuffle,
    keywords: ['keyword mixer', 'phrase', 'exact match', 'permutations'],
  },
  {
    slug: 'title-optimizer',
    label: 'Title Optimizer',
    description: 'Build SEO-optimized titles within character limits.',
    category: 'listing',
    icon: Sparkles,
    priority: 3,
    keywords: ['title', 'seo', 'listing optimization', 'product title'],
  },
  {
    slug: 'bullet-builder',
    label: 'Bullet Builder',
    description: 'Feature and benefit bullets that actually convert.',
    category: 'listing',
    icon: ListChecks,
    keywords: ['bullet', 'features', 'benefits', 'description'],
  },
  {
    slug: 'html-formatter',
    label: 'HTML Formatter',
    description: 'Clean product description HTML for Amazon and Flipkart.',
    category: 'listing',
    icon: Code2,
    keywords: ['html', 'description', 'format', 'product description'],
  },
  {
    slug: 'lqs-checker',
    label: 'LQS Checker',
    description: 'Quick listing-quality audit against best practices.',
    category: 'listing',
    icon: ClipboardCheck,
    keywords: ['lqs', 'listing quality', 'audit', 'listing score'],
  },
  {
    slug: 'ab-test',
    label: 'A/B Test Calculator',
    description: 'Statistical significance for listing experiments.',
    category: 'listing',
    icon: FlaskConical,
    keywords: ['ab test', 'split test', 'significance', 'experiment'],
  },

  /* ── Operations ──────────────────────────── */
  {
    slug: 'inventory-planner',
    label: 'Inventory Planner',
    description: 'Replenishment dates from sales velocity and lead time.',
    category: 'operations',
    icon: Package,
    priority: 4,
    keywords: ['inventory', 'restock', 'replenishment', 'stock', 'forecast'],
  },
  {
    slug: 'price-finder',
    label: 'Target Price Finder',
    description: 'Reverse-calculate the ideal selling price for a margin target.',
    category: 'operations',
    icon: Crosshair,
    keywords: ['price', 'target price', 'pricing', 'margin target'],
  },
  {
    slug: 'price-matcher',
    label: 'Price Matcher',
    description: 'Compare your price to competitors across marketplaces.',
    category: 'operations',
    icon: Scale,
    keywords: ['price match', 'competitor pricing', 'compare', 'repricer'],
  },
  {
    slug: 'competitor-war-room',
    label: 'Competitor War Room',
    description: 'Track competitor moves on price, content and ads.',
    category: 'operations',
    icon: Swords,
    isPro: true,
    keywords: ['competitor', 'spy', 'tracking', 'monitor', 'intel'],
  },
  {
    slug: 'launch-simulator',
    label: 'Launch Simulator',
    description: 'Plan launch units, velocity and ranking trajectory.',
    category: 'operations',
    icon: Rocket,
    keywords: ['launch', 'simulator', 'new product', 'units', 'ranking'],
  },
  {
    slug: 'review-planner',
    label: 'Review Planner',
    description: 'Schedule review-request automation across SKUs.',
    category: 'operations',
    icon: Star,
    keywords: ['review', 'request', 'automation', 'feedback'],
  },
  {
    slug: 'super-url',
    label: 'Super URL Builder',
    description: 'Generate canonical and 2-step tracking URLs.',
    category: 'operations',
    icon: Link2,
    keywords: ['url', 'super url', 'canonical', '2-step', 'tracking url'],
  },

  /* ── Assets ──────────────────────────────── */
  {
    slug: 'amazon-image-tool',
    label: 'Image Editor',
    description: 'Resize, crop and rename product images to platform specs.',
    category: 'assets',
    icon: ImagePlus,
    priority: 5,
    keywords: ['image', 'resize', 'rename', 'crop', 'thumbnail'],
  },
  {
    slug: 'sku-generator',
    label: 'SKU Generator',
    description: 'Smart, collision-free SKUs from product attributes.',
    category: 'assets',
    icon: Hash,
    keywords: ['sku', 'generator', 'product id', 'identifier'],
  },
  {
    slug: 'qr-generator',
    label: 'QR Generator',
    description: 'QR codes for package inserts and physical marketing.',
    category: 'assets',
    icon: QrCode,
    keywords: ['qr', 'qr code', 'insert', 'package insert'],
  },
  {
    slug: 'barcode-generator',
    label: 'Barcode Generator',
    description: 'FNSKU, UPC-A and EAN-13 labels ready for the printer.',
    category: 'assets',
    icon: Barcode,
    keywords: ['barcode', 'fnsku', 'upc', 'ean', 'label'],
  },
  {
    slug: 'amazon-bulk-image-dwn-tool',
    label: 'Bulk Image Downloader',
    description: 'Download and auto-rename Amazon product images at scale.',
    category: 'assets',
    icon: Download,
    isNew: true,
    keywords: ['amazon', 'image', 'download', 'bulk', 'zip', 'asin'],
  },
];

/* ────────────────────────────────────────────────
   Legacy aliases (so old `ToolGroupId` / `ToolItem`
   imports keep type-checking). Prefer `ToolCategory`
   and `Tool` in new code.
──────────────────────────────────────────────── */

export type ToolGroupId = ToolCategory;
export type ToolItem = Tool;