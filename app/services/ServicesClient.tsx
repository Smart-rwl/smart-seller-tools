// app/services/ServicesClient.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';

/* ────────────────────────────────────────────────
   Data
──────────────────────────────────────────────── */

type Service = {
  id: string;
  title: string;
  desc: string;
  tags: string[];
  /** Accent group — kept to three (orange / emerald / slate) for visual cohesion */
  accent: 'orange' | 'emerald' | 'slate';
  size: 'large' | 'small';
};

const ACCENTS = {
  orange: { hex: '#f97316', bg: '#fff7ed', soft: 'rgba(249,115,22,0.10)' },
  emerald: { hex: '#10b981', bg: '#f0fdf4', soft: 'rgba(16,185,129,0.10)' },
  slate: { hex: '#0f172a', bg: '#f1f5f9', soft: 'rgba(15,23,42,0.08)' },
} as const;

const SERVICES: Service[] = [
  {
    id: '01',
    title: 'Full Account Management',
    desc: 'End-to-end health monitoring, policy compliance, and growth strategy for Amazon, Flipkart, and Meesho.',
    tags: ['Amazon', 'Flipkart', 'Meesho'],
    accent: 'orange',
    size: 'large',
  },
  {
    id: '02',
    title: 'PPC & Ads Management',
    desc: 'Data-driven campaigns engineered to maximize ROAS and cut wasted spend.',
    tags: ['Sponsored Ads', 'DSP'],
    accent: 'emerald',
    size: 'small',
  },
  {
    id: '03',
    title: 'SEO & Listing Optimization',
    desc: 'Rank higher with keyword-rich titles, bullets, and A+ content that converts.',
    tags: ['Keywords', 'A+ Content'],
    accent: 'orange',
    size: 'small',
  },
  {
    id: '04',
    title: 'Brand Store Design',
    desc: 'Custom storefronts that turn browsers into buyers.',
    tags: ['Branding', 'UI/UX'],
    accent: 'slate',
    size: 'small',
  },
  {
    id: '05',
    title: 'Bulk Listing Upload',
    desc: 'Upload thousands of SKUs in minutes with error-free flat files.',
    tags: ['Flat Files', 'Bulk'],
    accent: 'orange',
    size: 'small',
  },
  {
    id: '06',
    title: 'FBA & Logistics',
    desc: 'Shipment planning, inventory management, and IPI score optimization.',
    tags: ['FBA', 'Inventory'],
    accent: 'emerald',
    size: 'small',
  },
  {
    id: '07',
    title: 'Daily Reports & Analytics',
    desc: 'Custom dashboards and daily performance reports delivered to your inbox.',
    tags: ['Analytics', 'Reports'],
    accent: 'slate',
    size: 'small',
  },
  {
    id: '08',
    title: 'Customer Support',
    desc: 'Manage buyer messages, returns, and feedback to protect your seller rating.',
    tags: ['Feedback', 'Returns'],
    accent: 'orange',
    size: 'small',
  },
  {
    id: '09',
    title: 'Quick Account Audit',
    desc: 'A 48-hour deep-dive into your account health with a prioritized action plan.',
    tags: ['Audit', '48 hrs'],
    accent: 'emerald',
    size: 'small',
  },
];

const PROCESS = [
  {
    step: '01',
    title: 'Audit',
    desc: 'Free 30-minute deep-dive into your account health, listings, ads, and competitive position.',
    duration: 'Day 1',
  },
  {
    step: '02',
    title: 'Strategy',
    desc: 'A prioritized 90-day plan with clear KPIs, ad budget allocation, and listing changes.',
    duration: 'Day 2-3',
  },
  {
    step: '03',
    title: 'Execution',
    desc: 'We run campaigns, refresh content, and handle support — you get weekly updates.',
    duration: 'Week 2+',
  },
  {
    step: '04',
    title: 'Reporting',
    desc: 'Custom dashboards and a Monday-morning summary in your inbox. Always.',
    duration: 'Ongoing',
  },
];

const WHATSAPP_BASE = 'https://wa.me/918930903322?text=';
const WA_CONSULT = WHATSAPP_BASE + encodeURIComponent('Hello Smart Seller Tools! I am interested in your services.');
const WA_AUDIT = WHATSAPP_BASE + encodeURIComponent('Hi Smart Seller Tools — I would like to book a free account audit.');

/* ────────────────────────────────────────────────
   Service card
──────────────────────────────────────────────── */

function ServiceCard({ service, index }: { service: Service; index: number }) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const accent = ACCENTS[service.accent];
  const isLarge = service.size === 'large';

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: isLarge ? 'span 2' : 'span 1',
        gridRow: isLarge ? 'span 2' : 'span 1',
        background: hovered ? accent.hex : accent.bg,
        borderColor: hovered ? accent.hex : '#e2e8f0',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
        opacity: visible ? 1 : 0,
        transition: `all 0.55s cubic-bezier(0.22,1,0.36,1) ${index * 60}ms`,
      }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-[1.75rem] border-2 p-7"
    >
      {/* Number watermark */}
      <span
        style={{
          color: hovered ? 'rgba(255,255,255,0.14)' : `${accent.hex}22`,
          fontSize: isLarge ? '9rem' : '6rem',
          lineHeight: 1,
          fontFamily: "'DM Serif Display', Georgia, serif",
          transition: 'color 0.4s ease',
        }}
        className="pointer-events-none absolute -bottom-4 -right-2 select-none font-bold"
        aria-hidden
      >
        {service.id}
      </span>

      {/* Accent indicator */}
      <div
        style={{
          background: hovered ? 'rgba(255,255,255,0.35)' : accent.hex,
          width: hovered ? 48 : 10,
          height: 10,
          borderRadius: 99,
          transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
        }}
        className="mb-5"
        aria-hidden
      />

      <div className="relative z-10 flex-1">
        <h3
          style={{
            color: hovered ? '#fff' : '#0f172a',
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: isLarge ? '1.75rem' : '1.15rem',
            lineHeight: 1.2,
            transition: 'color 0.3s ease',
          }}
          className="mb-3 font-bold"
        >
          {service.title}
        </h3>
        <p
          style={{
            color: hovered ? 'rgba(255,255,255,0.85)' : '#64748b',
            fontSize: isLarge ? '1rem' : '0.875rem',
            transition: 'color 0.3s ease',
          }}
          className="leading-relaxed"
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
      <SocialProof />
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
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
      className="px-6 pb-24 pt-20 md:pb-32 md:pt-28"
    >
      {/* Grid texture */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          backgroundImage:
            'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Glow blobs */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          bottom: '-60px',
          left: '10%',
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        <div className="hero-title mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 backdrop-blur">
          <span aria-hidden className="live-dot inline-block h-2 w-2 rounded-full bg-emerald-400" />
          <span
            style={{
              color: '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
            }}
          >
            ACTIVELY MANAGING SELLER ACCOUNTS
          </span>
        </div>

        <h1
          className="hero-title"
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(2.8rem, 6vw, 5.5rem)',
            lineHeight: 1.05,
            color: '#f8fafc',
            maxWidth: '800px',
          }}
        >
          Scale Your <span style={{ color: '#f97316' }}>Seller Central</span>
          <br />
          <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>without the guesswork.</span>
        </h1>

        <p
          className="hero-sub mt-6 max-w-xl"
          style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.7 }}
        >
          Professional e-commerce management for Amazon, Flipkart & Meesho sellers who are serious about growth.
        </p>

        <div className="hero-cta mt-10 flex flex-wrap gap-4">
          <a
            href={WA_CONSULT}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            <WhatsAppIcon />
            Get Free Consultation
          </a>
          <a href="#services" className="btn-secondary">
            View Services ↓
          </a>
        </div>

        {/* Trust signals — softened from specific unverifiable numbers */}
        <div className="mt-14 flex flex-wrap gap-x-10 gap-y-6">
          {[
            { value: 'Amazon', label: 'India + Global' },
            { value: 'Flipkart', label: 'Plus Affiliate' },
            { value: 'Meesho', label: 'Reseller Network' },
            { value: '48 hrs', label: 'Audit Turnaround' },
          ].map((stat, i) => (
            <div key={stat.label} className="stat-item" style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
              <div
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: '1.5rem',
                  color: '#f8fafc',
                  lineHeight: 1,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  color: '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: 500,
                  marginTop: 4,
                  letterSpacing: '0.03em',
                }}
              >
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
   Services grid
──────────────────────────────────────────────── */

function ServicesGrid() {
  return (
    <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
      <div className="mb-12">
        <p
          style={{
            color: '#f97316',
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: '0.14em',
          }}
          className="mb-2"
        >
          WHAT WE DO
        </p>
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            color: '#0f172a',
            lineHeight: 1.1,
          }}
        >
          Everything your brand needs
          <br />
          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>to dominate the marketplace.</span>
        </h2>
      </div>

      <div className="services-grid">
        {SERVICES.map((service, i) => (
          <ServiceCard key={service.id} service={service} index={i} />
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   Process timeline
──────────────────────────────────────────────── */

function ProcessSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12">
        <p
          style={{
            color: '#10b981',
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: '0.14em',
          }}
          className="mb-2"
        >
          HOW WE WORK
        </p>
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
            color: '#0f172a',
            lineHeight: 1.1,
          }}
        >
          Four steps from <span style={{ color: '#10b981', fontStyle: 'italic' }}>chaos to clarity</span>.
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {PROCESS.map((p, i) => (
          <div
            key={p.step}
            className="process-card relative rounded-[1.5rem] border border-slate-200 bg-white p-6"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: '3rem',
                color: '#f97316',
                lineHeight: 1,
              }}
              className="opacity-90"
            >
              {p.step}
            </div>
            <h3
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: '1.5rem',
                color: '#0f172a',
              }}
              className="mt-4"
            >
              {p.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{p.desc}</p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {p.duration}
              </span>
            </div>

            {/* Connector arrow on desktop, except last card */}
            {i < PROCESS.length - 1 && (
              <div
                aria-hidden
                className="hidden lg:block"
                style={{
                  position: 'absolute',
                  right: '-1.6rem',
                  top: '2.5rem',
                  color: '#cbd5e1',
                  fontSize: '1.5rem',
                  fontWeight: 300,
                  userSelect: 'none',
                }}
              >
                →
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   Social proof (placeholder you can fill in)
──────────────────────────────────────────────── */

function SocialProof() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20">
      <div
        className="rounded-[2rem] border border-slate-200 bg-white p-8 md:p-12"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at top left, rgba(249,115,22,0.05), transparent 50%)',
        }}
      >
        <p
          style={{
            color: '#0f172a',
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: '0.14em',
          }}
          className="mb-2 opacity-60"
        >
          IN THEIR WORDS
        </p>
        <p
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(1.4rem, 3vw, 2rem)',
            color: '#0f172a',
            lineHeight: 1.3,
            fontStyle: 'italic',
          }}
          className="max-w-3xl"
        >
          “We went from manually firefighting account issues every day to actually focusing on
          product launches. The audit alone was worth a quarter of revenue.”
        </p>
        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
            R
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Founder, D2C brand</div>
            <div className="text-xs text-slate-500">Home &amp; kitchen · Amazon + Flipkart</div>
          </div>
        </div>
        {/* TODO: replace placeholder with real testimonial once collected. */}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   Final CTA
──────────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
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
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '-60px',
            right: '-60px',
            width: 250,
            height: 250,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h3
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
              color: '#f8fafc',
              lineHeight: 1.15,
              maxWidth: 480,
            }}
          >
            Ready to scale your business?
            <span style={{ color: '#10b981', fontStyle: 'italic' }}> Let&apos;s talk.</span>
          </h3>
          <p style={{ color: '#94a3b8', marginTop: 12, fontSize: '0.95rem' }}>
            Free 30-minute account audit — no commitment required.
          </p>
        </div>
        <a href={WA_AUDIT} target="_blank" rel="noopener noreferrer" className="btn-cta">
          <WhatsAppIcon />
          WhatsApp Us Now
        </a>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────
   Icons
──────────────────────────────────────────────── */

function WhatsAppIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      focusable="false"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ────────────────────────────────────────────────
   Page-level styles (fonts, animations, buttons, grid breakpoints)
──────────────────────────────────────────────── */

function PageStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600;700&display=swap');

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
      .hero-title { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
      .hero-sub   { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
      .hero-cta   { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
      .stat-item  { animation: slideIn 0.7s cubic-bezier(0.22,1,0.36,1) both; }
      .process-card { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
      .live-dot   { animation: pulseDot 1.8s ease-in-out infinite; }

      /* Buttons */
      .btn-primary {
        background: linear-gradient(135deg, #f97316, #ea580c);
        color: #fff;
        font-weight: 700;
        font-size: 0.95rem;
        padding: 0.85rem 2rem;
        border-radius: 0.875rem;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        text-decoration: none;
        box-shadow: 0 8px 32px rgba(249,115,22,0.35);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .btn-primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 40px rgba(249,115,22,0.45);
      }
      .btn-primary:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
      }

      .btn-secondary {
        background: transparent;
        color: #cbd5e1;
        font-weight: 600;
        font-size: 0.95rem;
        padding: 0.85rem 2rem;
        border-radius: 0.875rem;
        border: 1.5px solid rgba(255,255,255,0.15);
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        text-decoration: none;
        transition: border-color 0.2s, color 0.2s;
      }
      .btn-secondary:hover {
        border-color: rgba(255,255,255,0.4);
        color: #fff;
      }
      .btn-secondary:focus-visible {
        outline: 2px solid rgba(255,255,255,0.6);
        outline-offset: 3px;
      }

      .btn-cta {
        background: linear-gradient(135deg, #10b981, #059669);
        color: #fff;
        font-weight: 700;
        font-size: 1rem;
        padding: 1rem 2.5rem;
        border-radius: 1rem;
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        text-decoration: none;
        box-shadow: 0 8px 32px rgba(16,185,129,0.35);
        flex-shrink: 0;
        position: relative;
        z-index: 1;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .btn-cta:hover {
        transform: translateY(-3px);
        box-shadow: 0 16px 48px rgba(16,185,129,0.45);
      }
      .btn-cta:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
      }

      /* Services bento grid */
      .services-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1rem;
        grid-auto-rows: 200px;
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
        .services-grid {
          grid-template-columns: repeat(2, 1fr);
        }
        .services-grid > div:first-child {
          grid-column: span 2 !important;
          grid-row: span 1 !important;
        }
      }
    `}</style>
  );
}