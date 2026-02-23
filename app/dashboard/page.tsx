'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Calculator,
  Package,
  Activity,
  Bell,
  Heart,
  Search,
  Zap,
  BookOpen,
  Sparkles,
  ArrowUpRight,
  Truck,
  LineChart
} from 'lucide-react';
import { TOOLS } from '../config/tools.config';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [usageCount, setUsageCount] = useState<number>(0);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) router.push('/login');
      setUser(data.user);
      setLoading(false);
    };
    init();

    const favs = localStorage.getItem('userFavorites');
    if (favs) setFavorites(JSON.parse(favs));

    const usage = localStorage.getItem('toolUsageCount');
    setUsageCount(usage ? Number(usage) : 0);
  }, [router]);

  const toggleFavorite = (slug: string) => {
    const updated = favorites.includes(slug)
      ? favorites.filter(f => f !== slug)
      : [...favorites, slug];
    setFavorites(updated);
    localStorage.setItem('userFavorites', JSON.stringify(updated));
  };

  const filteredTools = useMemo(() => {
    const q = query.toLowerCase();
    return TOOLS.filter(t => t.label.toLowerCase().includes(q));
  }, [query]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <LayoutDashboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Smart Seller Center</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-gray-400" />
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 border border-white" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* TOP ROW: HERO & CREATIVE PULSE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 flex flex-col justify-center">
            <h2 className="text-3xl font-extrabold tracking-tight">
              Hello, {user?.email?.split('@')[0]} 👋
            </h2>
            <p className="text-gray-500 mt-1">Your e-commerce empire is looking strong today.</p>
          </div>
          
          {/* CREATIVE PULSE WIDGET */}
          <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
            <Sparkles className="absolute -right-2 -top-2 w-24 h-24 text-white/10 rotate-12" />
            <h3 className="font-bold text-sm flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" /> Creative Pulse
            </h3>
            <p className="text-xs text-blue-100 mb-3 italic">"Try using A+ Content focusing on 'Durability' for your top SKU this week."</p>
            <button className="text-[10px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full backdrop-blur-sm transition">
              Generate More Ideas
            </button>
          </div>
        </div>

        {/* TOOL SEARCH */}
        <div className="bg-white border rounded-2xl p-2 shadow-sm flex items-center gap-3 px-4 focus-within:ring-2 ring-blue-500/20 transition">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tools like 'Flipkart ROI' or 'Image Resizer'..."
            className="flex-1 py-3 text-sm outline-none bg-transparent"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* LEFT: TOOLS & SERVICES */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* SERVICES SECTION */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-600" /> Professional Services
                </h3>
                <Link href="/services" className="text-xs font-semibold text-blue-600 hover:underline">View All</Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ServiceCard 
                  title="Account Management" 
                  desc="Full handling for Amazon/Flipkart." 
                  icon={<LayoutDashboard className="w-4 h-4"/>}
                />
                <ServiceCard 
                  title="A+ Content Design" 
                  desc="High-conversion visual storytelling." 
                  icon={<Sparkles className="w-4 h-4"/>}
                />
                <ServiceCard 
                  title="Ads Optimization" 
                  desc="Lower your ACOS with expert PPC." 
                  icon={<LineChart className="w-4 h-4"/>}
                />
              </div>
            </section>

            {/* TOOLS GRID */}
            <section>
              <h3 className="font-bold text-lg mb-4">Your Toolbox</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(query ? filteredTools : TOOLS.slice(0, 8)).map(tool => (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="group bg-white p-4 rounded-xl border hover:border-blue-500 hover:shadow-md transition relative"
                  >
                    <div className="mb-2 p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 w-fit transition">
                      <Zap className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                    </div>
                    <p className="text-sm font-bold">{tool.label}</p>
                    <ArrowUpRight className="absolute top-4 right-4 w-3 h-3 text-gray-300 group-hover:text-blue-500" />
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT: BLOGS & FAVORITES */}
          <div className="space-y-8">
            
            {/* BLOG SECTION */}
            <div className="bg-white rounded-2xl border p-5 shadow-sm">
              <h3 className="font-bold text-sm flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-orange-500" /> Seller Insights
              </h3>
              <div className="space-y-4">
                <BlogItem 
                  title="Flipkart Big Billion Days Prep" 
                  date="2 mins read"
                />
                <BlogItem 
                  title="New GST rules for E-commerce" 
                  date="5 mins read"
                />
                <BlogItem 
                  title="Mastering Amazon PPC in 2026" 
                  date="8 mins read"
                />
              </div>
              <button className="w-full mt-4 py-2 text-xs font-bold text-gray-500 border border-dashed rounded-lg hover:bg-gray-50">
                Read More Updates
              </button>
            </div>

            {/* QUICK STATS */}
            <div className="bg-gray-900 rounded-2xl p-5 text-white shadow-xl">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-4">Quick Stats</p>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-xs text-gray-400">Tool Usage</span>
                  <span className="text-xl font-mono font-bold">{usageCount}</span>
                </div>
                <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full w-2/3" />
                </div>
                <p className="text-[10px] text-gray-500 italic">You're in the top 15% of active sellers this month!</p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

/* ---------------- SUB COMPONENTS ---------------- */

function ServiceCard({ title, desc, icon }: any) {
  return (
    <div className="bg-white p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition shadow-sm group cursor-pointer">
      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition">
        {icon}
      </div>
      <h4 className="text-sm font-bold mb-1">{title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function BlogItem({ title, date }: any) {
  return (
    <div className="group cursor-pointer">
      <h4 className="text-xs font-bold group-hover:text-blue-600 transition line-clamp-1">{title}</h4>
      <p className="text-[10px] text-gray-400 mt-0.5">{date}</p>
    </div>
  );
}