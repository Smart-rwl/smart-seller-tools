'use client';
import React from 'react';
import {
  BookOpen,
  MousePointerClick,
  AlertCircle,
  DollarSign,
  ShieldCheck,
  Lightbulb,
  TrendingUp,
  Sparkles,
  Activity,
} from 'lucide-react';

const CARDS = [
  {
    icon: <MousePointerClick size={16} color="#6366f1" />,
    bg: '#6366f110',
    border: '#6366f120',
    title: 'When to run a test?',
    body:
      'Any time you change a Main Image, Title, Price, or Bullet Points. On Amazon use Manage Experiments; for Shopify or manual tests, use this engine to validate results before committing.',
  },
  {
    icon: <AlertCircle size={16} color="#f59e0b" />,
    bg: '#f59e0b10',
    border: '#f59e0b20',
    title: 'The 95% rule',
    body:
      'Below 95% confidence, your result may be pure noise. Imagine flipping a coin 10 times and getting 7 heads — that is not proof. You need more flips (visitors) to be certain.',
  },
  {
    icon: <DollarSign size={16} color="#10b981" />,
    bg: '#10b98110',
    border: '#10b98120',
    title: 'RPV over CR',
    body:
      'Conversion rate alone can mislead. A variant might convert fewer visitors but attract higher-value buyers. Revenue Per Visitor (RPV) tells you which version actually makes more money.',
  },
  {
    icon: <ShieldCheck size={16} color="#a78bfa" />,
    bg: '#a78bfa10',
    border: '#a78bfa20',
    title: 'Avoiding false positives',
    body:
      'Never "peek" daily and stop the moment you see a lift. Run for the full pre-planned duration (use the Sample Size Planner). Peeking inflates false-positive rates significantly.',
  },
  {
    icon: <Lightbulb size={16} color="#fb923c" />,
    bg: '#fb923c10',
    border: '#fb923c20',
    title: 'One variable at a time',
    body:
      'Change only one element per test — image, title, or price. Changing multiple things simultaneously makes it impossible to know what caused the lift or drop.',
  },
  {
    icon: <TrendingUp size={16} color="#38bdf8" />,
    bg: '#38bdf810',
    border: '#38bdf820',
    title: 'Minimum detectable effect',
    body:
      'The smaller the improvement you want to detect, the more traffic you need. Use the Sample Size Planner to avoid under-powered tests — the #1 reason A/B tests produce false results.',
  },
  {
    icon: <Sparkles size={16} color="#ec4899" />,
    bg: '#ec489910',
    border: '#ec489920',
    title: 'Frequentist + Bayesian',
    body:
      'This tool reports both p-values (frequentist) and P(B>A) (Bayesian). When they agree, you have strong evidence. When they disagree, gather more data.',
  },
  {
    icon: <Activity size={16} color="#10b981" />,
    bg: '#10b98110',
    border: '#10b98120',
    title: 'Confidence intervals',
    body:
      'A 95% CI of [+2%, +18%] means the true lift is plausibly anywhere in that range. Wide intervals = more data needed. Narrow intervals = high precision.',
  },
];

export default function MethodologyGuide() {
  return (
    <div style={{ marginTop: 40, borderTop: '1px solid #0f172a', paddingTop: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <BookOpen size={18} color="#6366f1" />
        <h2
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 600,
            color: '#e2e8f0',
            fontSize: '1.15rem',
            letterSpacing: '-0.02em',
          }}
        >
          Testing methodology
        </h2>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
          gap: 16,
        }}
      >
        {CARDS.map((card) => (
          <div
            key={card.title}
            style={{
              background: '#0a0f1a',
              border: `1.5px solid ${card.border}`,
              borderRadius: 16,
              padding: 22,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ background: card.bg, borderRadius: 8, padding: 8 }}>{card.icon}</div>
              <h3
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontWeight: 600,
                  color: '#e2e8f0',
                  fontSize: '0.88rem',
                  letterSpacing: '-0.015em',
                }}
              >
                {card.title}
              </h3>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.8rem', lineHeight: 1.65 }}>{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}