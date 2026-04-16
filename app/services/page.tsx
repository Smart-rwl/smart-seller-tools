'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  TrendingUp, 
  BarChart3, 
  Package, 
  MessageCircle, 
  Search, 
  Store,
  Truck,
  Headphones,
  UploadCloud,
  Zap
} from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Professional E-commerce Services | Smart Seller Tools',
  description: 'Expert Amazon, Flipkart, and Meesho account management, PPC optimization, and listing services.',
};

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
            Scale Your Seller Central
          </h1>
          <p className="mt-4 text-xl text-slate-600">
            Professional management for the modern marketplace.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[200px]">
          
          {/* 1. Account Management */}
          <div className="md:col-span-2 md:row-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group">
            <div>
              <div className="bg-blue-100 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck className="text-blue-600" size={30} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Full Account Management</h3>
              <p className="text-slate-500 leading-relaxed">
                End-to-end health monitoring, policy compliance, and growth strategy for Amazon, Flipkart, and Meesho.
              </p>
            </div>
            <div className="flex gap-2 mt-4">
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold">Amazon</span>
              <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold">Flipkart</span>
              <span className="bg-pink-50 text-pink-700 px-3 py-1 rounded-full text-xs font-semibold">Meesho</span>
            </div>
          </div>

          {/* 2. PPC */}
          <div className="md:col-span-2 bg-slate-900 p-8 rounded-[2rem] text-white flex items-center justify-between hover:bg-slate-800 transition-all">
            <div className="max-w-[70%]">
              <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                <TrendingUp className="text-emerald-400" /> PPC & Ads Management
              </h3>
              <p className="text-slate-400 text-sm">
                Data-driven campaigns to maximize ROAS.
              </p>
            </div>
            <div className="hidden sm:block text-5xl font-bold text-slate-700">↗</div>
          </div>

          {/* 3. SEO */}
          <div className="md:row-span-2 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
            <Search className="text-orange-600 mb-4" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">SEO & Listing</h3>
              <p className="text-slate-500 text-sm mt-2">
                Rank higher with optimized content.
              </p>
            </div>
          </div>

          {/* 4. Brand Store */}
          <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100 flex flex-col items-center">
            <Store className="text-indigo-600 mb-2" />
            <h3 className="font-bold text-indigo-900 text-sm">Brand Store</h3>
          </div>

          {/* 5. Reports */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col items-center">
            <BarChart3 className="text-slate-400 mb-2" />
            <h3 className="font-bold text-slate-900 text-sm">Daily Reports</h3>
          </div>

          {/* 🆕 6. Product Upload */}
          <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col items-center">
            <UploadCloud className="text-blue-500 mb-2" />
            <h3 className="text-sm font-bold">Bulk Listing Upload</h3>
          </div>

          {/* 🆕 7. Logistics */}
          <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col items-center">
            <Truck className="text-green-500 mb-2" />
            <h3 className="text-sm font-bold">FBA & Logistics</h3>
          </div>

          {/* 🆕 8. Support */}
          <div className="bg-white p-6 rounded-[2rem] border shadow-sm flex flex-col items-center">
            <Headphones className="text-purple-500 mb-2" />
            <h3 className="text-sm font-bold">Customer Support</h3>
          </div>

          {/* 🆕 9. Quick Action */}
          <div className="bg-yellow-50 p-6 rounded-[2rem] border flex flex-col items-center">
            <Zap className="text-yellow-500 mb-2" />
            <h3 className="text-sm font-bold">Quick Audit</h3>
          </div>

          {/* CTA */}
          <div className="md:col-span-2 bg-emerald-500 p-8 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-white text-center sm:text-left">
              <h3 className="text-xl font-bold">Ready to scale your business?</h3>
              <p className="text-emerald-100 text-sm">Contact us now.</p>
            </div>
            <a 
              href="https://wa.me/919999999999" 
              target="_blank"
              className="bg-white text-emerald-600 px-8 py-3 rounded-2xl font-bold hover:bg-emerald-50 transition flex items-center gap-2"
            >
              <MessageCircle size={18} /> WhatsApp
            </a>
          </div>

        </div>
      </div>
    </main>
  );
}