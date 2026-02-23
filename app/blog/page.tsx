import React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, Clock, Tag } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Seller Academy & Blog | Smart Seller Tools',
  description: 'Learn how to grow your e-commerce business on Amazon, Flipkart, and Meesho with expert guides.',
};

// Mock data: You can later move this to a separate JSON file or fetch from a CMS/Markdown
const posts = [
  {
    id: 1,
    title: "5 Common Errors on Meesho and How to Fix Them",
    excerpt: "Struggling with price errors or listing suppressions? Here is a step-by-step guide to keeping your Meesho account healthy.",
    date: "Feb 20, 2026",
    readTime: "5 min read",
    category: "Meesho",
    slug: "fix-meesho-errors"
  },
  {
    id: 2,
    title: "Optimizing Amazon PPC for the Indian Market",
    excerpt: "Advertising in India is different. Learn how to lower your ACoS while targeting high-intent Indian shoppers.",
    date: "Feb 18, 2026",
    readTime: "8 min read",
    category: "Amazon",
    slug: "amazon-ppc-india"
  },
  {
    id: 3,
    title: "The Pharmacist's Guide to Selling Health & Personal Care",
    excerpt: "How to navigate the strict documentation requirements for the beauty and health category on Flipkart.",
    date: "Feb 15, 2026",
    readTime: "6 min read",
    category: "E-commerce Strategy",
    slug: "selling-health-category"
  }
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        
        {/* Blog Header */}
        <div className="border-b border-slate-100 pb-10 mb-12">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm uppercase tracking-widest mb-4">
            <BookOpen size={16} />
            <span>Seller Academy</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 sm:text-5xl mb-4">
            Insights for Smart Sellers
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl">
            Expert advice on account management, SEO, and scaling your brand across India's biggest marketplaces.
          </p>
        </div>

        {/* Featured / List Section */}
        <div className="space-y-12">
          {posts.map((post) => (
            <article key={post.id} className="group relative flex flex-col items-start">
              <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium flex items-center gap-1">
                  <Tag size={12} /> {post.category}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {post.readTime}
                </span>
                <span>{post.date}</span>
              </div>
              
              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-3">
                <Link href={`/blog/${post.slug}`}>
                  <span className="absolute -inset-y-2.5 -inset-x-4 md:-inset-x-6 sm:rounded-2xl" />
                  {post.title}
                </Link>
              </h2>
              
              <p className="text-slate-600 leading-relaxed mb-4 max-w-3xl">
                {post.excerpt}
              </p>
              
              <div className="flex items-center text-blue-600 font-bold text-sm">
                Read Article <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
              
              <div className="w-full h-[1px] bg-slate-100 mt-12" />
            </article>
          ))}
        </div>

        {/* Newsletter / CTA Section */}
        <div className="mt-20 bg-slate-900 rounded-[2.5rem] p-8 md:p-12 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">Never miss an update</h3>
          <p className="text-slate-400 mb-8 max-w-md mx-auto">
            Get the latest marketplace strategies and tool updates delivered to your inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="bg-slate-800 border-none rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
            <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3 rounded-xl transition-all">
              Subscribe
            </button>
          </div>
        </div>
        
      </div>
    </main>
  );
}