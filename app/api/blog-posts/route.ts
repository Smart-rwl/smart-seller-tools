// app/api/blog-posts/route.ts
//
// Replace the SAMPLE_POSTS below with your real source:
//   - CMS (Sanity, Contentful, Hygraph): fetch and map their shape to BlogPost
//   - Markdown / MDX files: read from disk and parse frontmatter (gray-matter)
//   - Database: query your Supabase 'posts' table
//
// Shape required by the dashboard:
//   { id, slug, title, excerpt?, category?, readMinutes, publishedAt (ISO) }
//
// As long as the response is { posts: [...] } with that shape,
// no changes are needed on the dashboard side.

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 300; // cache for 5 minutes

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  category?: string;
  readMinutes: number;
  publishedAt: string;
};

const SAMPLE_POSTS: BlogPost[] = [
  {
    id: '1',
    slug: 'flipkart-big-billion-days-prep',
    title: 'Flipkart Big Billion Days prep: 7 checks before T-30',
    excerpt:
      'Stock buffers, ad budget allocation, listing freshness, and the operational mistakes that cost sellers the most.',
    category: 'Sales events',
    readMinutes: 6,
    publishedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(),
  },
  {
    id: '2',
    slug: 'new-gst-rules-ecommerce-2026',
    title: 'New GST rules for e-commerce: what changes for sellers in FY26',
    excerpt:
      'TCS thresholds, invoicing format updates, and the input tax credit changes you need to act on this quarter.',
    category: 'Compliance',
    readMinutes: 9,
    publishedAt: new Date(Date.now() - 86_400_000 * 5).toISOString(),
  },
  {
    id: '3',
    slug: 'amazon-ppc-mastery-2026',
    title: 'Mastering Amazon PPC in 2026: a margin-first playbook',
    excerpt:
      'Why ACOS is a vanity metric, how to set break-even ROAS targets per SKU, and how to phase out manual campaigns.',
    category: 'Ads',
    readMinutes: 12,
    publishedAt: new Date(Date.now() - 86_400_000 * 8).toISOString(),
  },
  {
    id: '4',
    slug: 'reducing-rto-rate',
    title: 'Cutting your RTO rate by 40%: 4 levers that actually move the needle',
    excerpt:
      'Size charts, COD restrictions, post-purchase confirmation flows, and how to identify chronic-return buyers.',
    category: 'Operations',
    readMinutes: 7,
    publishedAt: new Date(Date.now() - 86_400_000 * 12).toISOString(),
  },
];

export async function GET() {
  return NextResponse.json(
    { posts: SAMPLE_POSTS },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  );
}