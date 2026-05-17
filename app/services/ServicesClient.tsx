'use client';
import React, { useEffect, useRef, useState } from 'react';

/* ────────────────────────────────────────────────
   Types & Data
──────────────────────────────────────────────── */
type AccentKey = 'orange' | 'emerald' | 'violet' | 'slate' | 'rose' | 'sky';

type Service = {
  id: string;
  title: string;
  desc: string;
  tags: string[];
  accent: AccentKey;
  size: 'large' | 'small';
  icon: string;
  category: string;
};

const ACCENTS: Record<AccentKey, { hex: string; bg: string; soft: string }> = {
  orange:  { hex: '#f97316', bg: '#fff7ed', soft: 'rgba(249,115,22,0.10)' },
  emerald: { hex: '#10b981', bg: '#f0fdf4', soft: 'rgba(16,185,129,0.10)' },
  violet:  { hex: '#7c3aed', bg: '#f5f3ff', soft: 'rgba(124,58,237,0.10)' },
  slate:   { hex: '#0f172a', bg: '#f1f5f9', soft: 'rgba(15,23,42,0.08)'  },
  rose:    { hex: '#e11d48', bg: '#fff1f2', soft: 'rgba(225,29,72,0.09)'  },
  sky:     { hex: '#0284c7', bg: '#f0f9ff', soft: 'rgba(2,132,199,0.10)'  },
};

/* ── Service Categories ── */
const CATEGORIES = [
  { id: 'all',        label: 'All Services' },
  { id: 'account',   label: 'Account Management' },
  { id: 'marketing', label: 'Marketing & Ads' },
  { id: 'content',   label: 'Content & SEO' },
  { id: 'logistics', label: 'Logistics & FBA' },
  { id: 'compliance',label: 'Compliance & Tax' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'growth',    label: 'Growth & Reviews' },
];

const SERVICES: Service[] = [
  /* ── Account Management ── */
  {
    id: '01', category: 'account',
    title: 'Full Account Management',
    desc: 'End-to-end health monitoring, policy compliance, catalog maintenance, and growth strategy for Amazon, Flipkart, and Meesho. One dedicated manager, zero firefighting for you.',
    tags: ['Amazon', 'Flipkart', 'Meesho'],
    accent: 'orange', size: 'large', icon: '🏪',
  },
  {
    id: '02', category: 'account',
    title: 'Account Setup & Registration',
    desc: 'New seller? We handle GST-linked registration, brand enrollment, and full onboarding on any Indian or global marketplace.',
    tags: ['Onboarding', 'Registration'],
    accent: 'sky', size: 'small', icon: '🚀',
  },
  {
    id: '03', category: 'account',
    title: 'Account Health Recovery',
    desc: 'Suspended or warned? We diagnose violations, write Plan of Action letters, and fast-track reinstatement.',
    tags: ['Reinstatement', 'POA'],
    accent: 'rose', size: 'small', icon: '🛡️',
  },
  /* ── Marketing & Ads ── */
  {
    id: '04', category: 'marketing',
    title: 'PPC & Sponsored Ads',
    desc: 'Data-driven Sponsored Products, Brands, and Display campaigns engineered to maximise ROAS and slash wasted spend.',
    tags: ['Sponsored Ads', 'DSP', 'ROAS'],
    accent: 'emerald', size: 'large', icon: '📈',
  },
  {
    id: '05', category: 'marketing',
    title: 'Performance Marketing',
    desc: 'Meta, Google, and YouTube ads that drive traffic directly to your marketplace listings or D2C store.',
    tags: ['Meta Ads', 'Google Ads', 'D2C'],
    accent: 'violet', size: 'small', icon: '🎯',
  },
  {
    id: '06', category: 'marketing',
    title: 'Deals & Promotions',
    desc: 'Lightning deals, coupons, and sale-event strategy for Amazon Great Indian Festival, Flipkart BBD, and Meesho Mega Sales.',
    tags: ['Lightning Deals', 'Coupons'],
    accent: 'orange', size: 'small', icon: '⚡',
  },
  {
    id: '07', category: 'marketing',
    title: 'Influencer & Social',
    desc: 'Coordinate UGC creators and nano-influencers to build authentic social proof and drive off-platform traffic.',
    tags: ['UGC', 'Influencers'],
    accent: 'rose', size: 'small', icon: '📲',
  },
  /* ── Content & SEO ── */
  {
    id: '08', category: 'content',
    title: 'SEO & Listing Optimisation',
    desc: 'Rank higher with keyword-rich titles, bullet points, search terms, and backend attributes that convert browsers into buyers.',
    tags: ['Keywords', 'Search Rank'],
    accent: 'orange', size: 'small', icon: '🔍',
  },
  {
    id: '09', category: 'content',
    title: 'A+ Content & EBC',
    desc: 'Visually rich A+ modules and Enhanced Brand Content that tell your brand story and reduce returns.',
    tags: ['A+ Content', 'EBC'],
    accent: 'violet', size: 'small', icon: '🎨',
  },
  {
    id: '10', category: 'content',
    title: 'Brand Store Design',
    desc: 'Custom multi-page storefronts with lifestyle imagery and category hubs that turn visitors into loyal customers.',
    tags: ['Branding', 'UI/UX'],
    accent: 'slate', size: 'small', icon: '🏬',
  },
  {
    id: '11', category: 'content',
    title: 'Product Photography & Video',
    desc: 'Studio shoots, infographics, and 30-second product videos optimised for marketplace main images and social.',
    tags: ['Photography', 'Video'],
    accent: 'sky', size: 'small', icon: '📸',
  },
  {
    id: '12', category: 'content',
    title: 'Bulk Listing Upload',
    desc: 'Upload thousands of SKUs in minutes with error-free flat files, variation trees, and category-specific attributes.',
    tags: ['Flat Files', 'SKU Ops'],
    accent: 'emerald', size: 'small', icon: '📦',
  },
  /* ── Logistics ── */
  {
    id: '13', category: 'logistics',
    title: 'FBA & FBF Management',
    desc: 'Shipment planning, restock alerts, IPI score optimisation, and removal order management for Amazon FBA and Flipkart Fulfillment.',
    tags: ['FBA', 'Restock', 'IPI'],
    accent: 'emerald', size: 'large', icon: '🚚',
  },
  {
    id: '14', category: 'logistics',
    title: 'Inventory Planning',
    desc: 'Demand forecasting and safety-stock models that prevent stockouts during peak events without over-investing in inventory.',
    tags: ['Forecasting', 'Safety Stock'],
    accent: 'sky', size: 'small', icon: '📊',
  },
  {
    id: '15', category: 'logistics',
    title: 'Pan-India Delivery Setup',
    desc: 'Onboard self-ship or third-party logistics partners and configure SLA settings across all platforms.',
    tags: ['Self-Ship', '3PL'],
    accent: 'slate', size: 'small', icon: '🗺️',
  },
  /* ── Compliance & Tax ── */
  {
    id: '16', category: 'compliance',
    title: 'GST Registration & Filing',
    desc: 'End-to-end GST registration, monthly/quarterly return filing (GSTR-1, 3B), and e-commerce TCS reconciliation.',
    tags: ['GSTR-1', 'GSTR-3B', 'TCS'],
    accent: 'rose', size: 'large', icon: '🧾',
  },
  {
    id: '17', category: 'compliance',
    title: 'Trademark & Brand Registry',
    desc: 'File your trademark, enroll in Amazon Brand Registry or Flipkart Brand Plus, and protect your IP from hijackers.',
    tags: ['Trademark', 'Brand Registry'],
    accent: 'violet', size: 'small', icon: '®️',
  },
  {
    id: '18', category: 'compliance',
    title: 'Legal Entity & MSME Setup',
    desc: 'Register a Private Limited, LLP, or proprietorship and obtain Udyam (MSME) certification to unlock marketplace benefits.',
    tags: ['Pvt Ltd', 'LLP', 'MSME'],
    accent: 'sky', size: 'small', icon: '📋',
  },
  {
    id: '19', category: 'compliance',
    title: 'Policy & Compliance Audit',
    desc: 'Proactive check of your catalog against Amazon, Flipkart, and Meesho policies before violations hit your metrics.',
    tags: ['Policy', 'Audit'],
    accent: 'rose', size: 'small', icon: '✅',
  },
  /* ── Analytics ── */
  {
    id: '20', category: 'analytics',
    title: 'Daily Reports & Dashboards',
    desc: 'Custom dashboards and Monday-morning summaries in your inbox — sales, ads, returns, and account health in one view.',
    tags: ['Analytics', 'Reports'],
    accent: 'slate', size: 'small', icon: '📉',
  },
  {
    id: '21', category: 'analytics',
    title: '48-Hour Account Audit',
    desc: 'A deep-dive into listings, ads, account health, and competitive positioning — delivered as a prioritised action plan.',
    tags: ['Free Audit', '48 hrs'],
    accent: 'emerald', size: 'small', icon: '🔎',
  },
  {
    id: '22', category: 'analytics',
    title: 'Competitor Intelligence',
    desc: 'Track rival pricing, keyword strategies, and BSR movements — and get monthly reports on where to outmanoeuvre them.',
    tags: ['BSR', 'Pricing', 'Intel'],
    accent: 'violet', size: 'small', icon: '🕵️',
  },
  /* ── Growth & Reviews ── */
  {
    id: '23', category: 'growth',
    title: 'Product Reviews & Ratings',
    desc: 'Build genuine review velocity through post-purchase follow-up automation, Vine programme enrolment, and feedback campaigns — fully policy-compliant.',
    tags: ['Vine', 'Reviews', 'Ratings'],
    accent: 'orange', size: 'large', icon: '⭐',
  },
  {
    id: '24', category: 'growth',
    title: 'Customer Support Management',
    desc: 'Handle buyer messages, returns, A-to-Z claims, and negative feedback — protecting your seller rating around the clock.',
    tags: ['Messages', 'Returns', 'A-to-Z'],
    accent: 'sky', size: 'small', icon: '💬',
  },
  {
    id: '25', category: 'growth',
    title: 'International Marketplace Launch',
    desc: 'Expand to Amazon UAE, UK, US, or Noon with localised listings, currency, and compliance handled end-to-end.',
    tags: ['Global', 'Amazon US', 'Noon'],
    accent: 'emerald', size: 'small', icon: '🌍',
  },
  {
    id: '26', category: 'growth',
    title: 'D2C Website & Store',
    desc: 'Launch a Shopify or WooCommerce store integrated with your marketplace inventory for a true omnichannel presence.',
    tags: ['Shopify', 'D2C', 'Omnichannel'],
    accent: 'violet', size: 'small', icon: '🌐',
  },
];

const PROCESS = [
  { step: '01', title: 'Free Audit', desc: '30-minute deep-dive into your account health, listings, ads, and competitive gaps. Zero commitment.', duration: 'Day 1', icon: '🔍' },
  { step: '02', title: 'Strategy', desc: 'A prioritised 90-day plan with clear KPIs, ad budget allocation, compliance tasks, and listing changes.', duration: 'Day 2–3', icon: '🗺️' },
  { step: '03', title: 'Execution', desc: 'We run campaigns, refresh content, file returns, and handle support — you get weekly updates in WhatsApp.', duration: 'Week 2+', icon: '⚡' },
  { step: '04', title: 'Reporting', desc: 'Custom dashboards and a Monday-morning summary in your inbox. Always transparent, always actionable.', duration: 'Ongoing', icon: '📊' },
];

const STATS = [
  { value: '3 Platforms', label: 'Amazon · Flipkart · Meesho' },
  { value: 'GST + TM', label: 'Compliance Covered' },
  { value: '48 hrs', label: 'Audit Turnaround' },
  { value: 'D2C Ready', label: 'Shopify & WooCommerce' },
];

const TESTIMONIALS = [
  {
    quote: 'We went from manually firefighting account issues every day to actually focusing on product launches. The audit alone was worth a quarter of revenue.',
    name: 'Rahul M.', role: 'Founder, D2C brand', category: 'Home & Kitchen · Amazon + Flipkart', avatar: 'R',
  },
  {
    quote: 'GST filings and marketplace management under one roof saved us enormous time. Their team recovered our suspended listing within 72 hours.',
    name: 'Priya S.', role: 'Co-founder, Fashion Label', category: 'Apparel · Meesho + Flipkart', avatar: 'P',
  },
  {
    quote: 'PPC ROAS jumped from 2.1x to 4.8x in the first 60 days. They restructured our ad campaigns completely.',
    name: 'Arjun K.', role: 'Operations Head', category: 'Electronics · Amazon India', avatar: 'A',
  },
];

const WHATSAPP_BASE = 'https://wa.me/918930903322?text=';
const WA_CONSULT = WHATSAPP_BASE + encodeURIComponent('Hello SellerHands! I am interested in your services.');
const WA_AUDIT   = WHATSAPP_BASE + encodeURIComponent('Hi SellerHands — I would like to book a free account audit.');

/* ────────────────────────────────────────────────
   Service Card
──────────────────────────────────────────────── */
function ServiceCard({ service, index }: { service: Service; index: number }) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const accent  = ACCENTS[service.accent];
  const isLarge = service.size === 'large';

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: isLarge ? 'span 2' : 'span 1',
        gridRow:    isLarge ? 'span 2' : 'span 1',
        background: hovered ? accent.hex : accent.bg,
        borderColor: hovered ? accent.hex : '#e2e8f0',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
        opacity: visible ? 1 : 0,
        transition: `all 0.55s cubic-bezier(0.22,1,0.36,1) ${(index % 6) * 55}ms`,
        cursor: 'default',
      }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border-2 p-7"
    >
      {/* Number watermark */}
      <span
        style={{
          color: hovered ? 'rgba(255,255,255,0.12)' : `${accent.hex}1a`,
          fontSize: isLarge ? '9rem' : '6rem',
          lineHeight: 1,
          fontFamily: "'Playfair Display', Georgia, serif",
          transition: 'color 0.4s ease',
        }}
        className="pointer-events-none absolute -bottom-4 -right-2 select-none font-bold"
        aria-hidden
      >
        {service.id}
      </span>

      {/* Icon + pill top row */}
      <div className="mb-4 flex items-center gap-3">
        <span style={{ fontSize: isLarge ? '2rem' : '1.5rem' }}>{service.icon}</span>
        <div
          style={{
            background: hovered ? 'rgba(255,255,255,0.22)' : accent.soft,
            color: hovered ? '#fff' : accent.hex,
            border: `1px solid ${hovered ? 'rgba(255,255,255,0.3)' : accent.hex + '30'}`,
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em',
            padding: '2px 10px', borderRadius: 99,
            transition: 'all 0.3s ease',
          }}
        >
          {service.category.toUpperCase()}
        </div>
      </div>

      <div className="relative z-10 flex-1">
        <h3
          style={{
            color: hovered ? '#fff' : '#0f172a',
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: isLarge ? '1.75rem' : '1.1rem',
            lineHeight: 1.2,
            transition: 'color 0.3s ease',
          }}
          className="mb-2 font-bold"
        >
          {service.title}
        </h3>
        <p
          style={{
            color: hovered ? 'rgba(255,255,255,0.85)' : '#64748b',
            fontSize: isLarge ? '0.97rem' : '0.85rem',
            lineHeight: 1.65,
            transition: 'color 0.3s ease',
          }}
        >
          {service.desc}
        </p>
      </div>

      <div className="relative z-10 mt-5 flex flex-wrap gap-2">
        {service.tags.map((tag) => (
          <span
            key={`${service.id}-${tag}`}
            style={{
              background: hovered ? 'rgba(255,255,255,0.22)' : accent.soft,
              color: hovered ? '#fff' : accent.hex,
              border: `1px solid ${hovered ? 'rgba(255,255,255,0.3)' : accent.hex + '40'}`,
              transition: 'all 0.3s ease',
            }}
            className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Page
──────────────────────────────────────────────── */
export default function ServicesClient() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#f8fafc' }} className="min-h-screen">
      <PageStyles />
      <Hero />
      <ServicesGrid />
      <ProcessSection />
      <PricingHint />
      <Testimonials />
      <FinalCTA />
    </div>
  );
}

/* ────────────────────────────────────────────────
   Hero
──────────────────────────────────────────────── */
function Hero() {
  return (
    <section
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 55%, #0f172a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="px-6 pb-24 pt-20 md:pb-32 md:pt-28"
    >
      {/* Grid texture */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      {/* Glow blobs */}
      <GlowBlob style={{ top: -80, right: -80, width: 450, height: 450 }} color="rgba(249,115,22,0.18)" />
      <GlowBlob style={{ bottom: -60, left: '10%', width: 320, height: 320 }} color="rgba(16,185,129,0.12)" />
      <GlowBlob style={{ top: '40%', left: '40%', width: 300, height: 300 }} color="rgba(124,58,237,0.08)" />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="hero-title mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur">
          <span aria-hidden className="live-dot inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.08em' }}>
            ACTIVELY MANAGING SELLER ACCOUNTS
          </span>
        </div>

        <h1
          className="hero-title"
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
            lineHeight: 1.05,
            color: '#f8fafc',
            maxWidth: '820px',
          }}
        >
          Your Complete{' '}
          <span style={{ color: '#f97316' }}>E-Commerce Partner</span>
          <br />
          <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>from setup to scale.</span>
        </h1>

        <p className="hero-sub mt-6 max-w-2xl" style={{ color: '#94a3b8', fontSize: '1.08rem', lineHeight: 1.7 }}>
          SellerHands handles everything — marketplace management, performance marketing, GST filings, logistics, product reviews, and compliance — so you can focus on building your brand.
        </p>

        <div className="hero-cta mt-10 flex flex-wrap gap-4">
          <a href={WA_CONSULT} target="_blank" rel="noopener noreferrer" className="btn-primary">
            <WhatsAppIcon /> Get Free Consultation
          </a>
          <a href="#services" className="btn-secondary">
            Explore Services ↓
          </a>
        </div>

        <div className="mt-14 flex flex-wrap gap-x-10 gap-y-6">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="stat-item" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
              <div style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.45rem', color: '#f8fafc', lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 500, marginTop: 4, letterSpacing: '0.03em' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   Services Grid with category filter
──────────────────────────────────────────────── */
function ServicesGrid() {
  const [active, setActive] = useState('all');

  const visible = active === 'all'
    ? SERVICES
    : SERVICES.filter((s) => s.category === active);

  return (
    <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
      <div className="mb-10">
        <p style={{ color: '#f97316', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.14em' }} className="mb-2">
          WHAT WE DO
        </p>
        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            color: '#0f172a', lineHeight: 1.1,
          }}
        >
          26 services. One team.
          <br />
          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>everything your brand needs.</span>
        </h2>
      </div>

      {/* Category filter tabs */}
      <div className="mb-10 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActive(cat.id)}
            style={{
              background: active === cat.id ? '#0f172a' : '#fff',
              color: active === cat.id ? '#fff' : '#64748b',
              border: `1.5px solid ${active === cat.id ? '#0f172a' : '#e2e8f0'}`,
              fontWeight: 600,
              fontSize: '0.82rem',
              padding: '0.45rem 1.1rem',
              borderRadius: 99,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              letterSpacing: '0.02em',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="services-grid">
        {visible.map((service, i) => (
          <ServiceCard key={service.id} service={service} index={i} />
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   Process
──────────────────────────────────────────────── */
function ProcessSection() {
  return (
    <section style={{ background: '#fff' }} className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12">
          <p style={{ color: '#10b981', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.14em' }} className="mb-2">
            HOW WE WORK
          </p>
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              color: '#0f172a', lineHeight: 1.1,
            }}
          >
            Four steps from{' '}
            <span style={{ color: '#10b981', fontStyle: 'italic' }}>chaos to clarity</span>.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map((p, i) => (
            <div
              key={p.step}
              className="process-card relative rounded-[1.5rem] border border-slate-200 bg-white p-6"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{p.icon}</div>
              <div
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '2.8rem', color: '#f97316', lineHeight: 1,
                }}
                className="opacity-90"
              >
                {p.step}
              </div>
              <h3
                style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '1.4rem', color: '#0f172a' }}
                className="mt-3"
              >
                {p.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.desc}</p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{p.duration}</span>
              </div>
              {i < PROCESS.length - 1 && (
                <div
                  aria-hidden
                  className="hidden lg:block"
                  style={{
                    position: 'absolute', right: '-1.6rem', top: '2.5rem',
                    color: '#cbd5e1', fontSize: '1.5rem', fontWeight: 300, userSelect: 'none',
                  }}
                >
                  →
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   Pricing hint section
──────────────────────────────────────────────── */
function PricingHint() {
  const plans = [
    {
      name: 'Starter',
      tagline: 'For new sellers launching on 1 platform',
      color: '#0284c7',
      features: ['Account setup & onboarding', 'Listing upload (up to 50 SKUs)', 'GST registration', 'Monthly performance report'],
      cta: 'Get Started',
    },
    {
      name: 'Growth',
      tagline: 'For established sellers scaling across platforms',
      color: '#f97316',
      features: ['Full account management (2 platforms)', 'PPC & Sponsored Ads management', 'SEO & A+ Content', 'Inventory planning', 'Monthly GST filing', 'Weekly reporting dashboard'],
      cta: 'Most Popular',
      highlight: true,
    },
    {
      name: 'Enterprise',
      tagline: 'For brands wanting total peace of mind',
      color: '#10b981',
      features: ['All Growth features', '3 platforms + D2C website', 'Performance marketing (Meta/Google)', 'Trademark & Brand Registry', 'Influencer & UGC campaigns', 'International expansion', 'Dedicated account manager'],
      cta: 'Let\'s Talk',
    },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12">
        <p style={{ color: '#7c3aed', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.14em' }} className="mb-2">
          PLANS
        </p>
        <h2
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            color: '#0f172a', lineHeight: 1.1,
          }}
        >
          Flexible packages,{' '}
          <span style={{ color: '#7c3aed', fontStyle: 'italic' }}>custom pricing.</span>
        </h2>
        <p className="mt-3 text-slate-500 text-sm max-w-lg">
          Every brand is unique. These plans give you a starting point — we'll tailor the exact scope and pricing on your free audit call.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <div
            key={plan.name}
            style={{
              background: plan.highlight ? '#0f172a' : '#fff',
              border: `2px solid ${plan.highlight ? plan.color : '#e2e8f0'}`,
              borderRadius: '1.75rem',
              padding: '2rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {plan.highlight && (
              <div
                aria-hidden
                style={{
                  position: 'absolute', top: -50, right: -50,
                  width: 180, height: 180, borderRadius: '50%',
                  background: `radial-gradient(circle, ${plan.color}22 0%, transparent 70%)`,
                }}
              />
            )}
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: `${plan.color}18`,
                color: plan.color,
                border: `1px solid ${plan.color}30`,
                padding: '3px 12px', borderRadius: 99,
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em',
                marginBottom: 16,
              }}
            >
              {plan.cta.toUpperCase()}
            </div>
            <h3
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: '1.75rem',
                color: plan.highlight ? '#f8fafc' : '#0f172a',
                lineHeight: 1.1,
              }}
            >
              {plan.name}
            </h3>
            <p style={{ color: plan.highlight ? '#94a3b8' : '#64748b', fontSize: '0.87rem', marginTop: 6, marginBottom: 20 }}>
              {plan.tagline}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.875rem', color: plan.highlight ? '#cbd5e1' : '#475569' }}>
                  <span style={{ color: plan.color, flexShrink: 0, marginTop: 1 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <a
              href={WA_AUDIT}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 24,
                background: plan.highlight ? plan.color : 'transparent',
                color: plan.highlight ? '#fff' : plan.color,
                border: `1.5px solid ${plan.color}`,
                fontWeight: 700, fontSize: '0.9rem',
                padding: '0.7rem 1.5rem', borderRadius: '0.875rem',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Book Free Audit →
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   Testimonials
──────────────────────────────────────────────── */
function Testimonials() {
  return (
    <section style={{ background: '#fff' }} className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12">
          <p style={{ color: '#0f172a', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.14em', opacity: 0.5 }} className="mb-2">
            IN THEIR WORDS
          </p>
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              color: '#0f172a', lineHeight: 1.1,
            }}
          >
            Sellers who{' '}
            <span style={{ fontStyle: 'italic', color: '#f97316' }}>trust SellerHands.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={t.name}
              style={{
                borderRadius: '1.75rem',
                border: '1.5px solid #e2e8f0',
                padding: '2rem',
                background: '#fff',
                backgroundImage: i === 0
                  ? 'radial-gradient(ellipse at top left, rgba(249,115,22,0.05), transparent 60%)'
                  : i === 1
                  ? 'radial-gradient(ellipse at top left, rgba(16,185,129,0.05), transparent 60%)'
                  : 'radial-gradient(ellipse at top left, rgba(124,58,237,0.05), transparent 60%)',
              }}
            >
              <div style={{ fontSize: '1.5rem', marginBottom: 16, color: '#f97316' }}>★★★★★</div>
              <p
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: '1rem', color: '#0f172a',
                  lineHeight: 1.6, fontStyle: 'italic',
                }}
              >
                "{t.quote}"
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div
                  style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: '#0f172a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                  }}
                >
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 1 }}>{t.role}</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t.category}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   Final CTA
──────────────────────────────────────────────── */
function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24 pt-10">
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '2.5rem',
          padding: 'clamp(2rem, 5vw, 4rem)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <GlowBlob style={{ top: -60, right: -60, width: 250, height: 250 }} color="rgba(16,185,129,0.15)" />
        <GlowBlob style={{ bottom: -40, left: -40, width: 200, height: 200 }} color="rgba(249,115,22,0.1)" />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
              color: '#f8fafc', lineHeight: 1.15, maxWidth: 500,
            }}
          >
            Ready to hand off the hard parts?
            <span style={{ color: '#10b981', fontStyle: 'italic' }}> Let's talk.</span>
          </h3>
          <p style={{ color: '#94a3b8', marginTop: 12, fontSize: '0.95rem' }}>
            Free 30-minute account audit — no commitment required.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <a href={WA_AUDIT} target="_blank" rel="noopener noreferrer" className="btn-cta">
            <WhatsAppIcon /> WhatsApp Us Now
          </a>
          <a href="#services" className="btn-secondary">
            View Services
          </a>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   Shared helpers
──────────────────────────────────────────────── */
function GlowBlob({ style, color }: { style: React.CSSProperties; color: string }) {
  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        borderRadius: '50%',
        background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        pointerEvents: 'none',
        ...style,
      }}
    />
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ────────────────────────────────────────────────
   Global styles
──────────────────────────────────────────────── */
function PageStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(40px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-30px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes pulseDot {
        0%, 100% { transform: scale(1); opacity: 1; }
        50%      { transform: scale(1.6); opacity: 0.6; }
      }
      .hero-title   { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
      .hero-sub     { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
      .hero-cta     { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
      .stat-item    { animation: slideIn 0.7s cubic-bezier(0.22,1,0.36,1) both; }
      .process-card { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
      .live-dot     { animation: pulseDot 1.8s ease-in-out infinite; }

      /* Buttons */
      .btn-primary {
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: #fff; font-weight: 700; font-size: 0.95rem;
        padding: 0.85rem 2rem; border-radius: 0.875rem;
        display: inline-flex; align-items: center; gap: 0.5rem;
        text-decoration: none; box-shadow: 0 8px 32px rgba(249,115,22,0.35);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(249,115,22,0.45); }
      .btn-primary:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }

      .btn-secondary {
        background: transparent; color: #cbd5e1; font-weight: 600; font-size: 0.95rem;
        padding: 0.85rem 2rem; border-radius: 0.875rem;
        border: 1.5px solid rgba(255,255,255,0.15);
        display: inline-flex; align-items: center; gap: 0.5rem;
        text-decoration: none; transition: border-color 0.2s, color 0.2s;
      }
      .btn-secondary:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
      .btn-secondary:focus-visible { outline: 2px solid rgba(255,255,255,0.6); outline-offset: 3px; }

      .btn-cta {
        background: linear-gradient(135deg, #10b981, #059669);
        color: #fff; font-weight: 700; font-size: 1rem;
        padding: 1rem 2.5rem; border-radius: 1rem;
        display: inline-flex; align-items: center; gap: 0.6rem;
        text-decoration: none; box-shadow: 0 8px 32px rgba(16,185,129,0.35);
        flex-shrink: 0; position: relative; z-index: 1;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .btn-cta:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(16,185,129,0.45); }
      .btn-cta:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }

      /* Services bento grid */
      .services-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        grid-auto-rows: 210px;
      }
      @media (max-width: 768px) {
        .services-grid {
          grid-template-columns: 1fr;
          grid-auto-rows: auto;
        }
        .services-grid > div {
          grid-column: span 1 !important;
          grid-row: span 1 !important;
          min-height: 180px;
        }
      }
      @media (min-width: 769px) and (max-width: 1024px) {
        .services-grid { grid-template-columns: repeat(2, 1fr); }
        .services-grid > div:first-child {
          grid-column: span 2 !important;
          grid-row: span 1 !important;
        }
      }
    `}</style>
  );
}