// app/blog/_data/posts.ts
//
// Single source of truth for blog content. Imported by both the /blog index
// page and the /api/blog-posts route, so they can't drift out of sync.
//
// When you move to a real CMS, replace the array below with a fetch from
// that CMS and update getAllPosts() / getPostBySlug() to call it. Consumers
// shouldn't need changes.

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;   // ISO 8601
  readMinutes: number;
  author?: string;
  cover?: string;        // optional image path/URL
};

const POSTS: BlogPost[] = [
  {
    slug: 'fix-meesho-errors',
    title: '5 Common Errors on Meesho and How to Fix Them',
    excerpt:
      'Struggling with price errors or listing suppressions? Here is a step-by-step guide to keeping your Meesho account healthy.',
    category: 'Meesho',
    publishedAt: '2026-02-20',
    readMinutes: 5,
  },
  {
    slug: 'amazon-ppc-india',
    title: 'Optimizing Amazon PPC for the Indian Market',
    excerpt:
      'Advertising in India is different. Learn how to lower your ACoS while targeting high-intent Indian shoppers.',
    category: 'Amazon',
    publishedAt: '2026-02-18',
    readMinutes: 8,
  },
  {
    slug: 'selling-health-category',
    title: "The Pharmacist's Guide to Selling Health & Personal Care",
    excerpt:
      'How to navigate the strict documentation requirements for the beauty and health category on Flipkart.',
    category: 'E-commerce Strategy',
    publishedAt: '2026-02-15',
    readMinutes: 6,
  },
];

/** Most-recent-first. */
export function getAllPosts(): BlogPost[] {
  return [...POSTS].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Lightweight format for /api/blog-posts feed. */
export function getPostSummaries() {
  return getAllPosts().map(({ slug, title, excerpt, category, publishedAt, readMinutes }) => ({
    slug,
    title,
    excerpt,
    category,
    publishedAt,
    readMinutes,
  }));
}