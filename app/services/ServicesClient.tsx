'use client';
import React, { useEffect, useRef, useState } from 'react';

const services = [
  {
    id: '01',
    title: 'Full Account Management',
    desc: 'End-to-end health monitoring, policy compliance, and growth strategy for Amazon, Flipkart, and Meesho.',
    tags: ['Amazon', 'Flipkart', 'Meesho'],
    accent: '#0ea5e9',
    bg: '#f0f9ff',
    size: 'large',
  },
  {
    id: '02',
    title: 'PPC & Ads Management',
    desc: 'Data-driven campaigns engineered to maximize ROAS and cut wasted spend.',
    tags: ['Sponsored Ads', 'DSP'],
    accent: '#10b981',
    bg: '#f0fdf4',
    size: 'medium',
  },
  {
    id: '03',
    title: 'SEO & Listing Optimization',
    desc: 'Rank higher with keyword-rich titles, bullets, and A+ content that converts.',
    tags: ['Keywords', 'A+ Content'],
    accent: '#f97316',
    bg: '#fff7ed',
    size: 'medium',
  },
  {
    id: '04',
    title: 'Brand Store Design',
    desc: 'Custom storefronts that turn browsers into buyers.',
    tags: ['Branding', 'UI/UX'],
    accent: '#8b5cf6',
    bg: '#faf5ff',
    size: 'small',
  },
  {
    id: '05',
    title: 'Bulk Listing Upload',
    desc: 'Upload thousands of SKUs in minutes with error-free flat files.',
    tags: ['Flat Files', 'Bulk'],
    accent: '#0ea5e9',
    bg: '#f0f9ff',
    size: 'small',
  },
  {
    id: '06',
    title: 'FBA & Logistics',
    desc: 'Shipment planning, inventory management, and IPI score optimization.',
    tags: ['FBA', 'Inventory'],
    accent: '#10b981',
    bg: '#f0fdf4',
    size: 'small',
  },
  {
    id: '07',
    title: 'Daily Reports & Analytics',
    desc: 'Custom dashboards and daily performance reports delivered to your inbox.',
    tags: ['Analytics', 'Reports'],
    accent: '#f97316',
    bg: '#fff7ed',
    size: 'small',
  },
  {
    id: '08',
    title: 'Customer Support',
    desc: 'Manage buyer messages, returns, and feedback to protect your seller rating.',
    tags: ['Feedback', 'Returns'],
    accent: '#ec4899',
    bg: '#fdf2f8',
    size: 'small',
  },
  {
    id: '09',
    title: 'Quick Account Audit',
    desc: 'A 48-hour deep-dive into your account health with a prioritized action plan.',
    tags: ['Audit', '48hrs'],
    accent: '#f59e0b',
    bg: '#fffbeb',
    size: 'small',
  },
];

function ServiceCard({ service, index }: { service: typeof services[0]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const isLarge = service.size === 'large';
  const isMedium = service.size === 'medium';

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: isLarge ? 'span 2' : isMedium ? 'span 1' : 'span 1',
        gridRow: isLarge ? 'span 2' : isMedium ? 'span 1' : 'span 1',
        background: hovered ? service.accent : service.bg,
        borderColor: hovered ? service.accent : '#e2e8f0',
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(28px) scale(0.97)',
        opacity: visible ? 1 : 0,
        transition: `all 0.55s cubic-bezier(0.22,1,0.36,1) ${index * 60}ms`,
        cursor: 'default',
      }}
      className="relative rounded-[1.75rem] border-2 p-7 flex flex-col justify-between overflow-hidden group"
    >
      {/* Number watermark */}
      <span
        style={{
          color: hovered ? 'rgba(255,255,255,0.12)' : `${service.accent}18`,
          fontSize: isLarge ? '9rem' : '6rem',
          lineHeight: 1,
          fontFamily: "'DM Serif Display', Georgia, serif",
          transition: 'color 0.4s ease',
        }}
        className="absolute -bottom-4 -right-2 font-bold select-none pointer-events-none"
      >
        {service.id}
      </span>

      {/* Accent dot */}
      <div
        style={{
          background: hovered ? 'rgba(255,255,255,0.3)' : service.accent,
          width: hovered ? 48 : 10,
          height: 10,
          borderRadius: 99,
          transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
        }}
        className="mb-5"
      />

      <div className="flex-1">
        <h3
          style={{
            color: hovered ? '#fff' : '#0f172a',
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: isLarge ? '1.75rem' : isMedium ? '1.25rem' : '1.1rem',
            lineHeight: 1.2,
            transition: 'color 0.3s ease',
          }}
          className="font-bold mb-3"
        >
          {service.title}
        </h3>
        <p
          style={{
            color: hovered ? 'rgba(255,255,255,0.8)' : '#64748b',
            fontSize: isLarge ? '1rem' : '0.875rem',
            transition: 'color 0.3s ease',
          }}
          className="leading-relaxed"
        >
          {service.desc}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mt-5 relative z-10">
        {service.tags.map(tag => (
          <span
            key={tag}
            style={{
              background: hovered ? 'rgba(255,255,255,0.2)' : `${service.accent}15`,
              color: hovered ? '#fff' : service.accent,
              border: `1px solid ${hovered ? 'rgba(255,255,255,0.3)' : `${service.accent}40`}`,
              transition: 'all 0.3s ease',
            }}
            className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ServicesClient() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#f8fafc', minHeight: '100vh' }}>

      {/* Google Fonts */}
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
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.6); opacity: 0.6; }
        }
        .hero-title { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .hero-sub   { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
        .hero-cta   { animation: fadeUp 0.8s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
        .stat-item  { animation: slideIn 0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .live-dot   { animation: pulse-dot 1.8s ease-in-out infinite; }
      `}</style>

      {/* ── HERO ── */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="px-6 pt-20 pb-24 md:pt-28 md:pb-32"
      >
        {/* grid texture */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* glow blobs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-60px', left: '10%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="max-w-5xl mx-auto relative z-10">
          {/* Live badge */}
          <div className="hero-title inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-8">
            <span className="live-dot w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.05em' }}>
              ACTIVELY MANAGING 50+ SELLER ACCOUNTS
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
            Scale Your <span style={{ color: '#0ea5e9' }}>Seller Central</span>
            <br />
            <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>without the guesswork.</span>
          </h1>

          <p
            className="hero-sub mt-6 max-w-xl"
            style={{ color: '#94a3b8', fontSize: '1.1rem', lineHeight: 1.7, fontWeight: 400 }}
          >
            Professional e-commerce management for Amazon, Flipkart & Meesho sellers who are serious about growth.
          </p>

          <div className="hero-cta flex flex-wrap gap-4 mt-10">
            <a
              href="https://wa.me/918930903322?text=Hello%20Smart%20Seller%20Tools!%20I%20am%20interested%20in%20your%20services."
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.95rem',
                padding: '0.85rem 2rem',
                borderRadius: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                boxShadow: '0 8px 32px rgba(14,165,233,0.35)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 12px 40px rgba(14,165,233,0.45)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 32px rgba(14,165,233,0.35)';
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Get Free Consultation
            </a>
            <a
              href="#services"
              style={{
                background: 'transparent',
                color: '#cbd5e1',
                fontWeight: 600,
                fontSize: '0.95rem',
                padding: '0.85rem 2rem',
                borderRadius: '0.875rem',
                border: '1.5px solid rgba(255,255,255,0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.4)';
                (e.currentTarget as HTMLAnchorElement).style.color = '#fff';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.15)';
                (e.currentTarget as HTMLAnchorElement).style.color = '#cbd5e1';
              }}
            >
              View Services ↓
            </a>
          </div>

          {/* Stats row */}
          <div className="flex flex-wrap gap-8 mt-14">
            {[
              { value: '50+', label: 'Active Accounts' },
              { value: '₹2Cr+', label: 'Ad Spend Managed' },
              { value: '4.8★', label: 'Avg. Seller Rating' },
              { value: '3 Platforms', label: 'Amazon · Flipkart · Meesho' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="stat-item"
                style={{ animationDelay: `${0.5 + i * 0.1}s` }}
              >
                <div style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: '1.75rem',
                  color: '#f8fafc',
                  lineHeight: 1,
                }}>
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

      {/* ── SERVICES GRID ── */}
      <section id="services" className="max-w-6xl mx-auto px-6 py-20">
        <div className="mb-12">
          <p style={{ color: '#0ea5e9', fontWeight: 700, fontSize: '0.8rem', letterSpacing: '0.12em' }} className="mb-2">
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            gridAutoRows: '200px',
          }}
          className="services-grid"
        >
          {services.map((service, i) => (
            <ServiceCard key={service.id} service={service} index={i} />
          ))}
        </div>

        {/* Mobile note */}
        <style>{`
          @media (max-width: 768px) {
            .services-grid {
              grid-template-columns: 1fr !important;
              grid-auto-rows: auto !important;
            }
            .services-grid > div {
              grid-column: span 1 !important;
              grid-row: span 1 !important;
              min-height: 180px;
            }
          }
          @media (min-width: 769px) and (max-width: 1024px) {
            .services-grid {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
        `}</style>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
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
          <div style={{
            position: 'absolute', top: '-60px', right: '-60px',
            width: 250, height: 250, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
              color: '#f8fafc',
              lineHeight: 1.15,
              maxWidth: 480,
            }}>
              Ready to scale your business?
              <span style={{ color: '#10b981', fontStyle: 'italic' }}> Let's talk.</span>
            </h3>
            <p style={{ color: '#64748b', marginTop: 12, fontSize: '0.95rem' }}>
              Free 30-minute account audit — no commitment required.
            </p>
          </div>
          <a
            href="https://wa.me/918930903322?text=Hello%20Smart%20Seller%20Tools!%20I%20am%20interested%20in%20your%20services."
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              padding: '1rem 2.5rem',
              borderRadius: '1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              textDecoration: 'none',
              boxShadow: '0 8px 32px rgba(16,185,129,0.35)',
              flexShrink: 0,
              position: 'relative',
              zIndex: 1,
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-3px)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 16px 48px rgba(16,185,129,0.45)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 32px rgba(16,185,129,0.35)';
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp Us Now
          </a>
        </div>
      </section>
    </div>
  );
}