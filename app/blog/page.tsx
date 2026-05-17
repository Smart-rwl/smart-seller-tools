// app/blog/page.tsx
import React from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock, Tag } from 'lucide-react';
import type { Metadata } from 'next';
import { getAllPosts } from './_data/posts';

export const metadata: Metadata = {
  title: 'Seller Academy & Blog | Seller Hands',
  description:
    "Learn how to grow your e-commerce business on Amazon, Flipkart, and Meesho with expert guides from sellers who've actually done it.",
  openGraph: {
    title: 'Seller Academy & Blog | Seller Hands',
    description:
      'Expert advice on account management, SEO, and scaling your brand across India\'s biggest marketplaces.',
    type: 'website',
  },
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="min-h-screen bg-white px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-12 border-b border-slate-100 pb-10">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-orange-600">
            <BookOpen size={16} />
            <span>Seller Academy</span>
          </div>
          <h1 className="mb-4 text-4xl font-extrabold text-slate-900 sm:text-5xl">
            Insights for Smart Sellers
          </h1>
          <p className="max-w-2xl text-lg text-slate-500">
            Expert advice on account management, SEO, and scaling your brand
            across India&apos;s biggest marketplaces.
          </p>
        </header>

        {/* Post list */}
        {posts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="divide-y divide-slate-100">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="group relative flex flex-col items-start py-10 first:pt-0"
              >
                <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1 rounded bg-slate-100 px-2 py-1 font-medium text-slate-700">
                    <Tag size={12} /> {post.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {post.readMinutes} min read
                  </span>
                  <time dateTime={post.publishedAt}>
                    {dateFormatter.format(new Date(post.publishedAt))}
                  </time>
                </div>

                <h2 className="mb-3 text-2xl font-bold text-slate-900 transition-colors group-hover:text-orange-600">
                  <Link href={`/blog/${post.slug}`}>
                    {/* Stretch-link overlay — makes the whole card clickable */}
                    <span className="absolute inset-0" aria-hidden="true" />
                    {post.title}
                  </Link>
                </h2>

                <p className="mb-4 max-w-3xl leading-relaxed text-slate-600">
                  {post.excerpt}
                </p>

                <div className="flex items-center text-sm font-bold text-orange-600">
                  Read article
                  <ArrowRight
                    size={16}
                    className="ml-1 transition-transform group-hover:translate-x-1"
                  />
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Newsletter */}
        <NewsletterCta />
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────────
   Empty state
──────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center">
      <BookOpen className="mx-auto mb-4 h-10 w-10 text-slate-400" />
      <h2 className="mb-1 text-lg font-bold text-slate-900">
        Posts coming soon
      </h2>
      <p className="text-sm text-slate-500">
        We&apos;re writing in-depth guides for Amazon, Flipkart, and Meesho
        sellers. Check back shortly.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Newsletter CTA
   Wired as a real <form>. POST endpoint is TODO —
   route this to your provider (ConvertKit, Buttondown,
   a Supabase edge function, etc.) when you're ready.
──────────────────────────────────────────────── */

function NewsletterCta() {
  return (
    <section className="mt-20 rounded-[2.5rem] bg-slate-900 p-8 text-center text-white md:p-12">
      <h3 className="mb-4 text-2xl font-bold">Never miss an update</h3>
      <p className="mx-auto mb-8 max-w-md text-slate-400">
        Get the latest marketplace strategies and tool updates delivered to
        your inbox.
      </p>
      <form
        action="/api/newsletter-subscribe"
        method="post"
        className="mx-auto flex max-w-md flex-col justify-center gap-3 sm:flex-row"
      >
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Enter your email"
          className="w-full rounded-xl border-none bg-slate-800 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 sm:w-64"
        />
        <button
          type="submit"
          className="rounded-xl bg-orange-600 px-8 py-3 font-bold text-white transition-all hover:bg-orange-500"
        >
          Subscribe
        </button>
      </form>
      <p className="mt-4 text-xs text-slate-500">
        No spam, unsubscribe anytime.
      </p>
    </section>
  );
}