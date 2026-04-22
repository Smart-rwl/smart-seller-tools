'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart2,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Activity,
  BookOpen,
  MousePointerClick,
  Lightbulb,
  Search,
  FlaskConical,
  Zap,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ChevronRight,
  BarChart,
  Target,
  RefreshCw,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────── */
function AnimatedNumber({ value, decimals = 2, prefix = '', suffix = '' }: {
  value: number; decimals?: number; prefix?: string; suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    const duration = 700;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const prog = Math.min((ts - startRef.current) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setDisplay(from + (to - from) * ease);
      if (prog < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <>{prefix}{display.toFixed(decimals)}{suffix}</>;
}

/* ─────────────────────────────────────────────
   CONFIDENCE RING SVG
───────────────────────────────────────────── */
function ConfidenceRing({ confidence, status }: { confidence: number; status: string }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const fill = (confidence / 100) * circ;
  const color = status === 'winner' ? '#10b981' : status === 'loser' ? '#ef4444' : status === 'leaning' ? '#f59e0b' : '#475569';

  return (
    <div style={{ position: 'relative', width: 140, height: 140 }}>
      <svg width="140" height="140" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1), stroke 0.4s' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1 }}>
          <AnimatedNumber value={confidence} decimals={1} suffix="%" />
        </span>
        <span style={{ fontSize: '0.6rem', color: '#475569', fontWeight: 700, letterSpacing: '0.1em', marginTop: 2 }}>
          CONFIDENCE
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   BAR COMPARISON
───────────────────────────────────────────── */
function CompareBar({ labelA, valA, labelB, valB, color, format }: {
  labelA: string; valA: number; labelB: string; valB: number;
  color: string; format: (n: number) => string;
}) {
  const max = Math.max(valA, valB, 0.001);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[{ label: labelA, val: valA, c: '#64748b' }, { label: labelB, val: valB, c: color }].map(({ label, val, c }) => (
        <div key={label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ color: c, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em' }}>{label}</span>
            <span style={{ fontFamily: "'Syne', sans-serif", color: '#e2e8f0', fontSize: '0.85rem', fontWeight: 700 }}>
              {format(val)}
            </span>
          </div>
          <div style={{ background: '#0f172a', borderRadius: 99, height: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99, background: c,
              width: `${(val / max) * 100}%`,
              transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
              boxShadow: `0 0 10px ${c}60`,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   INPUT FIELD
───────────────────────────────────────────── */
function Field({ label, value, onChange, placeholder, accent }: {
  label: string; value: number | ''; onChange: (v: number | '') => void;
  placeholder: string; accent: string;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.1em', color: '#475569', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type="number"
        value={value}
        min={0}
        onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        placeholder={placeholder}
        style={{
          width: '100%', background: '#020617',
          border: `1.5px solid #1e293b`, borderRadius: 10,
          padding: '10px 14px', color: '#f1f5f9',
          fontFamily: "'Syne', sans-serif", fontSize: '0.9rem',
          outline: 'none', transition: 'border-color 0.2s',
          boxSizing: 'border-box',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = accent)}
        onBlur={e => (e.currentTarget.style.borderColor = '#1e293b')}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   SAMPLE SIZE CALCULATOR
───────────────────────────────────────────── */
function SampleSizeCalc() {
  const [baseline, setBaseline] = useState<number | ''>(3);
  const [mde, setMde] = useState<number | ''>(20);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    const p1 = Number(baseline) / 100;
    const lift = Number(mde) / 100;
    if (!p1 || !lift) { setResult(null); return; }
    const p2 = p1 * (1 + lift);
    const z_alpha = 1.96; // 95% confidence
    const z_beta = 0.842; // 80% power
    const pooled = (p1 + p2) / 2;
    const n = Math.ceil(
      Math.pow(z_alpha * Math.sqrt(2 * pooled * (1 - pooled)) + z_beta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) /
      Math.pow(p2 - p1, 2)
    );
    setResult(n);
  }, [baseline, mde]);

  return (
    <div style={{ background: '#0a0f1a', border: '1.5px solid #1e293b', borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ background: '#7c3aed20', borderRadius: 8, padding: 8 }}>
          <Target size={16} color="#a78bfa" />
        </div>
        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, color: '#e2e8f0', fontSize: '0.85rem', letterSpacing: '0.05em' }}>
          SAMPLE SIZE PLANNER
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <Field label="BASELINE CR (%)" value={baseline} onChange={setBaseline} placeholder="e.g. 3" accent="#a78bfa" />
        <Field label="MIN. DETECTABLE EFFECT (%)" value={mde} onChange={setMde} placeholder="e.g. 20" accent="#a78bfa" />
      </div>
      {result !== null && (
        <div style={{
          background: 'linear-gradient(135deg, #7c3aed15, #4c1d9520)',
          border: '1px solid #7c3aed40', borderRadius: 12, padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontWeight: 600 }}>Required per variant</span>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.4rem', fontWeight: 800, color: '#a78bfa' }}>
            {result.toLocaleString()} visitors
          </span>
        </div>
      )}
      <p style={{ color: '#334155', fontSize: '0.68rem', marginTop: 10, lineHeight: 1.5 }}>
        Based on 95% confidence, 80% statistical power (two-tailed Z-test).
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function AdvancedAbTestCalculator() {
  const [visA, setVisA] = useState<number | ''>('');
  const [convA, setConvA] = useState<number | ''>('');
  const [revA, setRevA] = useState<number | ''>('');
  const [visB, setVisB] = useState<number | ''>('');
  const [convB, setConvB] = useState<number | ''>('');
  const [revB, setRevB] = useState<number | ''>('');
  const [metrics, setMetrics] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setLoaded(true); }, []);

  const handleReset = () => {
    setVisA(''); setConvA(''); setRevA('');
    setVisB(''); setConvB(''); setRevB('');
    setMetrics(null);
  };

  useEffect(() => {
    const n1 = Number(visA), x1 = Number(convA), r1 = Number(revA);
    const n2 = Number(visB), x2 = Number(convB), r2 = Number(revB);
    if (!n1 || !n2) { setMetrics(null); return; }

    const cr1 = x1 / n1;
    const cr2 = x2 / n2;
    const rpv1 = r1 / n1;
    const rpv2 = r2 / n2;
    const aov1 = x1 > 0 ? r1 / x1 : 0;
    const aov2 = x2 > 0 ? r2 / x2 : 0;

    // Z-Test for proportions
    const p = (x1 + x2) / (n1 + n2);
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    const zScore = se > 0 ? Math.abs((cr1 - cr2) / se) : 0;

    // Normal CDF approximation (Abramowitz & Stegun)
    const normalCDF = (z: number) => {
      const t = 1 / (1 + 0.2316419 * Math.abs(z));
      const d = 0.3989423 * Math.exp(-z * z / 2);
      const poly = t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.8212560 + t * 1.3302744))));
      const p = 1 - d * poly;
      return z >= 0 ? p : 1 - p;
    };
    const confidence = (2 * normalCDF(zScore) - 1) * 100;
    const clampedConf = Math.min(Math.max(confidence, 0), 99.9);

    const liftCR = cr1 > 0 ? ((cr2 - cr1) / cr1) * 100 : 0;
    const liftRPV = rpv1 > 0 ? ((rpv2 - rpv1) / rpv1) * 100 : 0;
    const liftAOV = aov1 > 0 ? ((aov2 - aov1) / aov1) * 100 : 0;

    let status = 'neutral';
    if (clampedConf >= 95) status = liftCR >= 0 ? 'winner' : 'loser';
    else if (clampedConf >= 80) status = 'leaning';

    // Projected monthly impact (annualised from sample)
    const totalDays = 30;
    const dailyVisitors = (n1 + n2) > 0 ? (n1 + n2) / totalDays : 0;
    const monthlyRevLift = rpv1 > 0 ? (rpv2 - rpv1) * dailyVisitors * 30 : 0;

    setMetrics({ cr1: cr1 * 100, cr2: cr2 * 100, rpv1, rpv2, aov1, aov2, confidence: clampedConf, liftCR, liftRPV, liftAOV, status, zScore, monthlyRevLift, n1, n2, x1, x2 });
  }, [visA, convA, revA, visB, convB, revB]);

  const statusConfig = {
    winner: { color: '#10b981', bg: '#052e1640', border: '#10b98130', label: 'VARIANT B WINS', icon: <CheckCircle2 size={22} />, headline: 'Statistically Significant Winner' },
    loser:  { color: '#ef4444', bg: '#2d060640', border: '#ef444430', label: 'VARIANT B LOSES', icon: <XCircle size={22} />, headline: 'Statistically Significant — B Underperforms' },
    leaning:{ color: '#f59e0b', bg: '#2d1b0040', border: '#f59e0b30', label: 'LEANING B', icon: <TrendingUp size={22} />, headline: 'Trending — Not Yet Significant' },
    neutral:{ color: '#475569', bg: '#0f172a', border: '#1e293b', label: 'INCONCLUSIVE', icon: <Activity size={22} />, headline: 'Insufficient Data — Keep Running' },
  };

  const sc = metrics ? statusConfig[metrics.status as keyof typeof statusConfig] : null;

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#020617', minHeight: '100vh', color: '#cbd5e1' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

        @keyframes fadeUp {
          from { opacity:0; transform:translateY(24px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulse-ring {
          0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          70%  { box-shadow: 0 0 0 12px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .fade-up { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .delay-1 { animation-delay: 0.1s; }
        .delay-2 { animation-delay: 0.2s; }
        .delay-3 { animation-delay: 0.3s; }
        .delay-4 { animation-delay: 0.4s; }
        .shimmer-text {
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4, #6366f1);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        .metric-card:hover { border-color: #334155 !important; transform: translateY(-2px); }
        .metric-card { transition: border-color 0.2s, transform 0.2s; }
      `}</style>

      {/* ── SCANLINE OVERLAY ── */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden', opacity:0.015 }}>
        <div style={{ position:'absolute', left:0, right:0, height:2, background:'linear-gradient(transparent,rgba(99,102,241,0.8),transparent)', animation:'scanline 8s linear infinite' }} />
      </div>

      {/* ── DOT GRID BACKGROUND ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
        backgroundSize: '32px 32px', opacity: 0.4,
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '32px 24px 64px' }}>

        {/* ═══════════════════════════════
            HEADER
        ═══════════════════════════════ */}
        <div className={loaded ? 'fade-up' : ''} style={{ marginBottom: 48 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                <div style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius:12, padding:10, boxShadow:'0 0 24px rgba(99,102,241,0.4)', animation:'pulse-ring 2.5s ease-out infinite' }}>
                  <FlaskConical size={22} color="#fff" />
                </div>
                <div>
                  <span style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.15em', color:'#6366f1', display:'block' }}>
                    SMART SELLER TOOLS
                  </span>
                  <span style={{ fontSize:'0.6rem', color:'#334155', fontWeight:600, letterSpacing:'0.08em' }}>
                    STATISTICAL ENGINE v2.0
                  </span>
                </div>
              </div>
              <h1 style={{ fontFamily:"'Syne', sans-serif", fontSize:'clamp(1.8rem,4vw,2.8rem)', fontWeight:800, lineHeight:1.05, color:'#f1f5f9', marginBottom:8 }}>
                A/B Test <span className="shimmer-text">Significance</span><br />Calculator
              </h1>
              <p style={{ color:'#475569', fontSize:'0.9rem', maxWidth:480, lineHeight:1.6 }}>
                Two-tailed Z-test engine with Revenue Per Visitor tracking, AOV analysis, and sample size planning — built for serious e-commerce teams.
              </p>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, alignItems:'flex-end' }}>
              <div style={{ display:'flex', gap:8 }}>
                {[
                  { label:'Algorithm', value:'Z-Test · Two-tailed' },
                  { label:'Threshold', value:'p < 0.05' },
                ].map(b => (
                  <div key={b.label} style={{ background:'#0a0f1a', border:'1px solid #1e293b', borderRadius:10, padding:'8px 14px', textAlign:'right' }}>
                    <div style={{ fontSize:'0.6rem', color:'#334155', fontWeight:700, letterSpacing:'0.1em' }}>{b.label}</div>
                    <div style={{ fontFamily:"'DM Mono', monospace", color:'#6366f1', fontSize:'0.78rem', fontWeight:500, marginTop:2 }}>{b.value}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleReset}
                style={{ display:'flex', alignItems:'center', gap:6, background:'#0a0f1a', border:'1px solid #1e293b', borderRadius:10, padding:'8px 16px', color:'#475569', fontSize:'0.78rem', fontWeight:600, cursor:'pointer', transition:'all 0.2s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='#6366f1'; (e.currentTarget as HTMLButtonElement).style.color='#6366f1'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='#1e293b'; (e.currentTarget as HTMLButtonElement).style.color='#475569'; }}
              >
                <RefreshCw size={13} /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════
            MAIN GRID: INPUTS + RESULTS
        ═══════════════════════════════ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }} className="input-grid">
          <style>{`@media(max-width:768px){ .input-grid{ grid-template-columns:1fr !important; } .results-grid{ grid-template-columns:1fr !important; } .metrics-row{ grid-template-columns:1fr !important; } }`}</style>

          {/* ── CONTROL A ── */}
          <div className={`fade-up delay-1`} style={{ background:'#0a0f1a', border:'1.5px solid #1e293b', borderRadius:20, padding:28, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, width:4, height:'100%', background:'#475569', borderRadius:'20px 0 0 20px' }} />
            <div style={{ marginLeft:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:'#1e293b', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:'#94a3b8', fontSize:'0.85rem' }}>A</span>
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'0.7rem', letterSpacing:'0.12em', color:'#475569' }}>CONTROL GROUP</div>
                    <div style={{ fontSize:'0.6rem', color:'#334155', fontWeight:600 }}>Original / Baseline</div>
                  </div>
                </div>
                <span style={{ background:'#1e293b', color:'#64748b', fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.1em', padding:'4px 10px', borderRadius:99 }}>ORIGINAL</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Field label="VISITORS / SESSIONS" value={visA} onChange={setVisA} placeholder="e.g. 5000" accent="#64748b" />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Field label="ORDERS / CONVERSIONS" value={convA} onChange={setConvA} placeholder="e.g. 150" accent="#64748b" />
                  <Field label="TOTAL REVENUE ($)" value={revA} onChange={setRevA} placeholder="Optional" accent="#64748b" />
                </div>
                {visA && convA ? (
                  <div style={{ background:'#0f172a', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'0.7rem', color:'#334155', fontWeight:600 }}>Live CR</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", color:'#94a3b8', fontWeight:500 }}>
                      {((Number(convA)/Number(visA))*100).toFixed(2)}%
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* ── VARIANT B ── */}
          <div className={`fade-up delay-2`} style={{ background:'#0a0f1a', border:'1.5px solid #1e29529', borderRadius:20, padding:28, position:'relative', overflow:'hidden', borderColor:'#1e293b' }}>
            <div style={{ position:'absolute', top:0, left:0, width:4, height:'100%', background:'linear-gradient(180deg,#6366f1,#8b5cf6)', borderRadius:'20px 0 0 20px' }} />
            <div style={{ marginLeft:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 14px rgba(99,102,241,0.4)' }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:'#fff', fontSize:'0.85rem' }}>B</span>
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'0.7rem', letterSpacing:'0.12em', color:'#6366f1' }}>VARIANT GROUP</div>
                    <div style={{ fontSize:'0.6rem', color:'#334155', fontWeight:600 }}>New Version / Challenger</div>
                  </div>
                </div>
                <span style={{ background:'linear-gradient(135deg,#6366f110,#8b5cf610)', color:'#818cf8', fontSize:'0.6rem', fontWeight:800, letterSpacing:'0.1em', padding:'4px 10px', borderRadius:99, border:'1px solid #6366f130' }}>NEW VERSION</span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <Field label="VISITORS / SESSIONS" value={visB} onChange={setVisB} placeholder="e.g. 5000" accent="#6366f1" />
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  <Field label="ORDERS / CONVERSIONS" value={convB} onChange={setConvB} placeholder="e.g. 180" accent="#6366f1" />
                  <Field label="TOTAL REVENUE ($)" value={revB} onChange={setRevB} placeholder="Optional" accent="#6366f1" />
                </div>
                {visB && convB ? (
                  <div style={{ background:'#0f172a', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'0.7rem', color:'#334155', fontWeight:600 }}>Live CR</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", color:'#818cf8', fontWeight:500 }}>
                      {((Number(convB)/Number(visB))*100).toFixed(2)}%
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════
            RESULTS PANEL
        ═══════════════════════════════ */}
        {metrics ? (
          <div className="fade-up delay-3" style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* ── VERDICT BANNER ── */}
            <div style={{
              background: sc!.bg, border:`1.5px solid ${sc!.border}`,
              borderRadius:20, padding:'24px 32px',
              display:'flex', alignItems:'center', justifyContent:'space-between',
              flexWrap:'wrap', gap:20,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:20 }}>
                <ConfidenceRing confidence={metrics.confidence} status={metrics.status} />
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ color: sc!.color }}>{sc!.icon}</span>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.15em', color: sc!.color }}>{sc!.label}</span>
                  </div>
                  <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.4rem', fontWeight:800, color:'#f1f5f9', lineHeight:1.2, marginBottom:8 }}>
                    {sc!.headline}
                  </h2>
                  <p style={{ color:'#475569', fontSize:'0.82rem', maxWidth:380, lineHeight:1.6 }}>
                    {metrics.status === 'winner'
                      ? `Variant B outperforms Control A by ${metrics.liftCR.toFixed(2)}% in conversion rate with ${metrics.confidence.toFixed(1)}% statistical confidence. Safe to ship.`
                      : metrics.status === 'loser'
                      ? `Variant B underperforms Control A by ${Math.abs(metrics.liftCR).toFixed(2)}% with ${metrics.confidence.toFixed(1)}% confidence. Do not ship.`
                      : metrics.status === 'leaning'
                      ? `Results are trending but not yet statistically significant (${metrics.confidence.toFixed(1)}% / need 95%). Continue the test.`
                      : `Only ${metrics.confidence.toFixed(1)}% confidence. Keep running — don't make decisions on this data yet.`}
                  </p>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { label:'Z-Score', value: metrics.zScore.toFixed(3), note:'> 1.96 = significant' },
                  { label:'Total Sample', value: (metrics.n1+metrics.n2).toLocaleString(), note:'visitors combined' },
                ].map(s => (
                  <div key={s.label} style={{ background:'#0a0f1a', border:'1px solid #1e293b', borderRadius:12, padding:'10px 16px', minWidth:180 }}>
                    <div style={{ fontSize:'0.6rem', color:'#334155', fontWeight:700, letterSpacing:'0.1em' }}>{s.label}</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.2rem', fontWeight:800, color:'#e2e8f0', lineHeight:1.2 }}>{s.value}</div>
                    <div style={{ fontSize:'0.6rem', color:'#334155', marginTop:2 }}>{s.note}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── METRICS ROW ── */}
            <div className="metrics-row" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>

              {/* Conversion Rate */}
              <div className="metric-card" style={{ background:'#0a0f1a', border:'1.5px solid #1e293b', borderRadius:16, padding:22 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <MousePointerClick size={14} color="#6366f1" />
                    <span style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.1em', color:'#334155' }}>CONVERSION RATE</span>
                  </div>
                  <span style={{
                    background: metrics.liftCR > 0 ? '#10b98115' : '#ef444415',
                    color: metrics.liftCR > 0 ? '#10b981' : '#ef4444',
                    fontSize:'0.72rem', fontWeight:800, padding:'3px 10px', borderRadius:99,
                    display:'flex', alignItems:'center', gap:3,
                  }}>
                    {metrics.liftCR > 0 ? <ArrowUpRight size={11}/> : <ArrowDownRight size={11}/>}
                    {metrics.liftCR > 0 ? '+' : ''}{metrics.liftCR.toFixed(2)}%
                  </span>
                </div>
                <CompareBar labelA="A · CONTROL" valA={metrics.cr1} labelB="B · VARIANT" valB={metrics.cr2} color="#6366f1" format={n => n.toFixed(2)+'%'} />
              </div>

              {/* RPV */}
              <div className="metric-card" style={{ background:'#0a0f1a', border:'1.5px solid #1e293b', borderRadius:16, padding:22 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <DollarSign size={14} color="#10b981" />
                    <span style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.1em', color:'#334155' }}>REVENUE / VISITOR</span>
                  </div>
                  {metrics.rpv1 > 0 || metrics.rpv2 > 0 ? (
                    <span style={{
                      background: metrics.liftRPV > 0 ? '#10b98115' : metrics.liftRPV < 0 ? '#ef444415' : '#1e293b',
                      color: metrics.liftRPV > 0 ? '#10b981' : metrics.liftRPV < 0 ? '#ef4444' : '#475569',
                      fontSize:'0.72rem', fontWeight:800, padding:'3px 10px', borderRadius:99,
                      display:'flex', alignItems:'center', gap:3,
                    }}>
                      {metrics.liftRPV > 0 ? <ArrowUpRight size={11}/> : metrics.liftRPV < 0 ? <ArrowDownRight size={11}/> : <Minus size={11}/>}
                      {metrics.liftRPV !== 0 ? (metrics.liftRPV > 0 ? '+' : '') + metrics.liftRPV.toFixed(2) + '%' : 'N/A'}
                    </span>
                  ) : <span style={{ fontSize:'0.65rem', color:'#334155' }}>Add revenue</span>}
                </div>
                {metrics.rpv1 === 0 && metrics.rpv2 === 0 ? (
                  <div style={{ height:80, display:'flex', alignItems:'center', justifyContent:'center', color:'#1e293b', fontSize:'0.75rem', textAlign:'center', lineHeight:1.6 }}>
                    Enter revenue data<br/>to unlock RPV analysis
                  </div>
                ) : (
                  <CompareBar labelA="A · CONTROL" valA={metrics.rpv1} labelB="B · VARIANT" valB={metrics.rpv2} color="#10b981" format={n => '$'+n.toFixed(2)} />
                )}
              </div>

              {/* AOV */}
              <div className="metric-card" style={{ background:'#0a0f1a', border:'1.5px solid #1e293b', borderRadius:16, padding:22 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <BarChart size={14} color="#f59e0b" />
                    <span style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.1em', color:'#334155' }}>AVG. ORDER VALUE</span>
                  </div>
                  {metrics.aov1 > 0 || metrics.aov2 > 0 ? (
                    <span style={{
                      background: metrics.liftAOV > 0 ? '#f59e0b15' : metrics.liftAOV < 0 ? '#ef444415' : '#1e293b',
                      color: metrics.liftAOV > 0 ? '#f59e0b' : metrics.liftAOV < 0 ? '#ef4444' : '#475569',
                      fontSize:'0.72rem', fontWeight:800, padding:'3px 10px', borderRadius:99,
                      display:'flex', alignItems:'center', gap:3,
                    }}>
                      {metrics.liftAOV > 0 ? <ArrowUpRight size={11}/> : metrics.liftAOV < 0 ? <ArrowDownRight size={11}/> : <Minus size={11}/>}
                      {metrics.liftAOV !== 0 ? (metrics.liftAOV > 0 ? '+' : '') + metrics.liftAOV.toFixed(2) + '%' : 'N/A'}
                    </span>
                  ) : <span style={{ fontSize:'0.65rem', color:'#334155' }}>Add revenue</span>}
                </div>
                {metrics.aov1 === 0 && metrics.aov2 === 0 ? (
                  <div style={{ height:80, display:'flex', alignItems:'center', justifyContent:'center', color:'#1e293b', fontSize:'0.75rem', textAlign:'center', lineHeight:1.6 }}>
                    Enter revenue data<br/>to unlock AOV analysis
                  </div>
                ) : (
                  <CompareBar labelA="A · CONTROL" valA={metrics.aov1} labelB="B · VARIANT" valB={metrics.aov2} color="#f59e0b" format={n => '$'+n.toFixed(2)} />
                )}
              </div>
            </div>

            {/* ── CONFIDENCE + PROJECTED IMPACT ── */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16 }} className="results-grid">

              {/* Confidence bar */}
              <div style={{ background:'#0a0f1a', border:'1.5px solid #1e293b', borderRadius:16, padding:24 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                  <span style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.1em', color:'#334155' }}>CONFIDENCE LEVEL BREAKDOWN</span>
                  <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:'1rem', color: metrics.confidence >= 95 ? '#10b981' : metrics.confidence >= 80 ? '#f59e0b' : '#475569' }}>
                    <AnimatedNumber value={metrics.confidence} decimals={1} suffix="%" />
                  </span>
                </div>
                {/* Segmented bar */}
                <div style={{ position:'relative', height:16, background:'#0f172a', borderRadius:99, overflow:'hidden', marginBottom:10 }}>
                  {/* Zones */}
                  <div style={{ position:'absolute', inset:0, display:'flex' }}>
                    <div style={{ width:'80%', borderRight:'1px dashed #1e293b' }}/>
                    <div style={{ width:'15%', borderRight:'1px dashed #334155' }}/>
                  </div>
                  <div style={{
                    height:'100%', borderRadius:99,
                    background: metrics.confidence >= 95 ? 'linear-gradient(90deg,#6366f1,#10b981)' : metrics.confidence >= 80 ? 'linear-gradient(90deg,#6366f1,#f59e0b)' : '#334155',
                    width:`${metrics.confidence}%`,
                    transition:'width 1.2s cubic-bezier(0.22,1,0.36,1)',
                    position:'relative', zIndex:1,
                    boxShadow: metrics.confidence >= 95 ? '0 0 16px rgba(16,185,129,0.4)' : 'none',
                  }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.6rem', color:'#334155', fontFamily:"'DM Mono',monospace" }}>
                  <span>0%</span>
                  <span style={{ color:'#475569' }}>80% (Leaning)</span>
                  <span style={{ color: metrics.confidence >= 95 ? '#10b981' : '#475569' }}>95% ← Target</span>
                  <span>100%</span>
                </div>
                {/* Zone labels */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginTop:16 }}>
                  {[
                    { range:'0 – 80%', label:'Inconclusive', color:'#334155' },
                    { range:'80 – 95%', label:'Leaning', color:'#f59e0b' },
                    { range:'95 – 100%', label:'Significant', color:'#10b981' },
                  ].map(z => (
                    <div key={z.range} style={{ background:'#0f172a', borderRadius:10, padding:'8px 12px', borderLeft:`3px solid ${z.color}` }}>
                      <div style={{ fontFamily:"'DM Mono',monospace", color:z.color, fontSize:'0.62rem', fontWeight:500 }}>{z.range}</div>
                      <div style={{ color:'#334155', fontSize:'0.6rem', marginTop:2 }}>{z.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projected impact */}
              <div style={{ background:'#0a0f1a', border:'1.5px solid #1e293b', borderRadius:16, padding:24 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
                  <Zap size={14} color="#f59e0b" />
                  <span style={{ fontSize:'0.65rem', fontWeight:800, letterSpacing:'0.1em', color:'#334155' }}>30-DAY IMPACT</span>
                </div>
                {metrics.rpv1 > 0 ? (
                  <>
                    <div style={{ marginBottom:16 }}>
                      <div style={{ fontSize:'0.68rem', color:'#334155', marginBottom:4 }}>Projected Monthly Rev. Lift</div>
                      <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'1.8rem', fontWeight:800, color: metrics.monthlyRevLift >= 0 ? '#10b981' : '#ef4444', lineHeight:1 }}>
                        {metrics.monthlyRevLift >= 0 ? '+' : ''}$<AnimatedNumber value={Math.abs(metrics.monthlyRevLift)} decimals={0} />
                      </div>
                    </div>
                    <div style={{ fontSize:'0.65rem', color:'#334155', lineHeight:1.6, background:'#0f172a', borderRadius:10, padding:'10px 12px' }}>
                      Based on current traffic rate and RPV delta. Assumes stable traffic.
                    </div>
                  </>
                ) : (
                  <div style={{ height:100, display:'flex', alignItems:'center', justifyContent:'center', color:'#1e293b', fontSize:'0.75rem', textAlign:'center', lineHeight:1.6 }}>
                    Add revenue data<br />to see projected impact
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="fade-up delay-3" style={{
            background:'#0a0f1a', border:'1.5px dashed #1e293b', borderRadius:20,
            padding:64, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16,
          }}>
            <div style={{ background:'#0f172a', borderRadius:16, padding:20 }}>
              <BarChart2 size={36} color="#1e293b" />
            </div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:'#1e293b', fontSize:'1rem' }}>
              Enter visitor data above to run the statistical engine
            </p>
            <p style={{ color:'#1e293b', fontSize:'0.78rem' }}>Results update in real-time as you type</p>
          </div>
        )}

        {/* ═══════════════════════════════
            SAMPLE SIZE PLANNER
        ═══════════════════════════════ */}
        <div className="fade-up delay-4" style={{ marginTop:20 }}>
          <SampleSizeCalc />
        </div>

        {/* ═══════════════════════════════
            METHODOLOGY GUIDE
        ═══════════════════════════════ */}
        <div style={{ marginTop:40, borderTop:'1px solid #0f172a', paddingTop:40 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24 }}>
            <BookOpen size={18} color="#6366f1" />
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, color:'#e2e8f0', fontSize:'1.1rem', letterSpacing:'0.03em' }}>
              Testing Methodology
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:16 }}>
            {[
              {
                icon: <MousePointerClick size={16} color="#6366f1" />,
                bg: '#6366f110', border: '#6366f120',
                title: 'When to Run a Test?',
                body: 'Any time you change a Main Image, Title, Price, or Bullet Points. On Amazon use Manage Experiments; for Shopify or manual tests, use this engine to validate results before committing.',
              },
              {
                icon: <AlertCircle size={16} color="#f59e0b" />,
                bg: '#f59e0b10', border: '#f59e0b20',
                title: 'The 95% Rule',
                body: 'Below 95% confidence, your result may be pure random noise. Imagine flipping a coin 10 times and getting 7 heads — that\'s not proof heads is "better." You need more flips (visitors) to be certain.',
              },
              {
                icon: <DollarSign size={16} color="#10b981" />,
                bg: '#10b98110', border: '#10b98120',
                title: 'RPV Over CR',
                body: 'Conversion rate alone can mislead you. Variant B might convert fewer visitors but attract buyers of higher-value items. Revenue Per Visitor (RPV) tells you the truth about which version actually makes more money.',
              },
              {
                icon: <ShieldCheck size={16} color="#a78bfa" />,
                bg: '#a78bfa10', border: '#a78bfa20',
                title: 'Avoiding False Positives',
                body: 'Never "peek" at results daily and stop the moment you see a lift. Run your test for the full pre-planned duration (use the Sample Size Planner above). Peeking inflates false-positive rates significantly.',
              },
              {
                icon: <Lightbulb size={16} color="#fb923c" />,
                bg: '#fb923c10', border: '#fb923c20',
                title: 'One Variable at a Time',
                body: 'Change only one element per test — image, title, or price. Changing multiple things simultaneously makes it impossible to know what caused the lift or drop in performance.',
              },
              {
                icon: <TrendingUp size={16} color="#38bdf8" />,
                bg: '#38bdf810', border: '#38bdf820',
                title: 'Minimum Detectable Effect',
                body: 'The smaller the improvement you\'re trying to detect, the more traffic you need. Use the Sample Size Planner to avoid under-powered tests — the #1 reason A/B tests produce false results.',
              },
            ].map(card => (
              <div key={card.title} style={{ background:'#0a0f1a', border:`1.5px solid ${card.border}`, borderRadius:16, padding:22 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <div style={{ background:card.bg, borderRadius:8, padding:8 }}>{card.icon}</div>
                  <h3 style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, color:'#e2e8f0', fontSize:'0.82rem' }}>{card.title}</h3>
                </div>
                <p style={{ color:'#475569', fontSize:'0.78rem', lineHeight:1.7 }}>{card.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════
            CREATOR FOOTER
        ═══════════════════════════════ */}
        <div style={{ marginTop:56, paddingTop:28, borderTop:'1px solid #0f172a', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <p style={{ fontSize:'0.72rem', color:'#1e293b', fontWeight:700, letterSpacing:'0.1em' }}>CREATED BY SMARTRWL</p>
          <div style={{ display:'flex', gap:16 }}>
            <a href="http://www.instagram.com/smartrwl" target="_blank" rel="noopener noreferrer"
              style={{ color:'#334155', transition:'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color='#ec4899'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color='#334155'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
            </a>
            <a href="https://github.com/Smart-rwl/" target="_blank" rel="noopener noreferrer"
              style={{ color:'#334155', transition:'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color='#f1f5f9'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color='#334155'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
              </svg>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}