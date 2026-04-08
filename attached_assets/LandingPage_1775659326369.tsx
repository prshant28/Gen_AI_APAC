import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Brain, Zap, ArrowRight, Play, Youtube, Globe, FileText,
  StickyNote, Image, Mic, Bot, Clock, Network, Layers,
  Shield, LayoutDashboard, Check, Star, ChevronRight,
  Lock, Sparkles, TrendingUp, Database, Library, Plus,
  Users, Activity, Eye, Cpu, Moon, Twitter, Github, Mail,
  Menu, X
} from 'lucide-react';
import { NeuralBackground } from './NeuralBackground';

// ── Animated counter ─────────────────────────────────────────────────────────
function Counter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started.current) {
        started.current = true;
        let current = 0;
        const step = Math.ceil(target / 60);
        const t = setInterval(() => {
          current = Math.min(current + step, target);
          setCount(current);
          if (current >= target) clearInterval(t);
        }, 20);
      }
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Feature card ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: Brain, color: '#00d4ff', title: 'Home Dashboard',
    desc: 'Your neural command center. Live stats, recent captures, AI insight feed and quick-capture widgets all in one glanceable view.',
    tag: 'Central Hub',
  },
  {
    icon: Plus, color: '#8b5cf6', title: 'Knowledge Capture',
    desc: 'Capture from YouTube, web pages, PDFs, notes, images, or audio. AI Security Engine scans every item before it enters your brain.',
    tag: 'Multi-Source',
  },
  {
    icon: Bot, color: '#f472b6', title: 'AI Neural Assistant',
    desc: 'Ask anything. Your AI assistant surfaces relevant memories, synthesizes insights and generates answers grounded in your own knowledge.',
    tag: 'GPT-Powered',
  },
  {
    icon: Clock, color: '#10b981', title: 'Memory Timeline',
    desc: 'Scroll your entire knowledge history in a beautiful chronological feed. Filter by type, tag, or semantic relevance.',
    tag: 'Infinite Scroll',
  },
  {
    icon: LayoutDashboard, color: '#f472b6', title: 'Knowledge Insights',
    desc: 'Rich charts and analytics. See your capture velocity, top topics, knowledge density maps and learning curves.',
    tag: 'Analytics',
  },
  {
    icon: Network, color: '#10b981', title: 'Knowledge Graph',
    desc: 'An interactive force-directed graph of all your memories. See clusters, connections, and discover hidden relationships.',
    tag: 'Visual Graph',
  },
  {
    icon: Layers, color: '#f59e0b', title: 'Project Workspace',
    desc: 'Organise captures into projects. AI generates summaries, quizzes, research reports and mind-maps from your content.',
    tag: 'AI Reports',
  },
  {
    icon: Shield, color: '#00d4ff', title: 'Privacy & Safety',
    desc: 'Live privacy trust score, granular data controls, AI content filters and a tamper-proof security event log.',
    tag: 'Zero-Trust',
  },
  {
    icon: Library, color: '#8b5cf6', title: 'Capture Library',
    desc: 'Browse all your saves with filters, search, grid/list views, tag clouds and per-capture security scores.',
    tag: 'Smart Search',
  },
];

// ── How it works ─────────────────────────────────────────────────────────────
const HOW = [
  {
    num: '01', icon: Zap, color: '#00d4ff',
    title: 'Capture Anything',
    desc: 'Paste a URL, record audio, upload a PDF or type a thought. Our AI Security Engine verifies every source before it enters your brain.',
  },
  {
    num: '02', icon: Cpu, color: '#8b5cf6',
    title: 'Neural Processing',
    desc: 'RecallSense extracts key insights, auto-generates tags, builds semantic embeddings and plots connections to existing memories.',
  },
  {
    num: '03', icon: Brain, color: '#f472b6',
    title: 'Recall Instantly',
    desc: 'Ask your AI assistant, browse the graph, or scroll the timeline. Your knowledge is always one natural-language query away.',
  },
];

// ── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    name: 'Dr. Sarah Kim',
    role: 'Neuroscience Researcher, MIT',
    avatar: 'S',
    color: '#00d4ff',
    quote: 'RecallSense has fundamentally changed how I manage research. I captured 3 years of literature notes and the AI connections blew my mind — it found links I had missed.',
    stars: 5,
  },
  {
    name: 'Marcus Rowe',
    role: 'Founder, Axiom Labs',
    avatar: 'M',
    color: '#8b5cf6',
    quote: 'I use it for every investor meeting, competitor analysis, and product brainstorm. The workspace AI reports save me hours every week.',
    stars: 5,
  },
  {
    name: 'Yuki Tanaka',
    role: 'Lead AI Engineer, Stripe',
    avatar: 'Y',
    color: '#10b981',
    quote: 'The knowledge graph is genuinely beautiful and useful. I can finally see how my 2,000+ captures are connected. Worth every penny.',
    stars: 5,
  },
];

// ── Pricing ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'Free',
    price: '0',
    period: 'forever',
    color: '#6b7280',
    desc: 'Perfect to get started',
    features: ['50 captures / month', 'Basic AI tagging', '1 GB storage', 'Web & Note capture', 'Memory Timeline', 'Community support'],
    cta: 'Get Started Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '12',
    period: 'per month',
    color: '#00d4ff',
    desc: 'For serious knowledge workers',
    features: ['Unlimited captures', 'Full AI Neural Engine', '5 GB storage', 'All source types', 'Knowledge Graph', 'Project Workspace', 'AI Reports & Quizzes', 'Priority support'],
    cta: 'Start Pro Free Trial',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: '49',
    period: 'per seat / month',
    color: '#8b5cf6',
    desc: 'For teams & organizations',
    features: ['Everything in Pro', 'Team knowledge graph', 'SSO & SAML', 'Advanced analytics', '100 GB storage', 'Custom AI training', 'SLA guarantee', 'Dedicated success manager'],
    cta: 'Contact Sales',
    highlight: false,
  },
];

// ── Source types showcase ────────────────────────────────────────────────────
const SOURCES = [
  { icon: Youtube, color: '#ff4444', label: 'YouTube' },
  { icon: Globe, color: '#00d4ff', label: 'Web' },
  { icon: FileText, color: '#f59e0b', label: 'PDF' },
  { icon: StickyNote, color: '#8b5cf6', label: 'Notes' },
  { icon: Image, color: '#f472b6', label: 'Images' },
  { icon: Mic, color: '#10b981', label: 'Audio' },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <div style={{ background: '#05050f', minHeight: '100vh', color: '#e2e8f0', position: 'relative', overflowX: 'hidden' }}>
      <div className="recall-blob-1" />
      <div className="recall-blob-2" />
      <div className="recall-blob-3" />
      <NeuralBackground />
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 64,
        background: scrolled ? 'rgba(5,5,15,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(30px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,212,255,0.08)' : 'none',
        transition: 'all 0.3s ease',
        display: 'flex', alignItems: 'center',
        padding: '0 clamp(16px, 5vw, 80px)',
        gap: 32,
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(0,212,255,0.45)', flexShrink: 0 }}>
            <Brain size={18} color="#fff" />
          </div>
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 17 }}>RecallSense</span>
        </Link>

        {/* Nav links (desktop) */}
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 32, flex: 1 }}>
          {[['Features', 'features'], ['How It Works', 'how'], ['Pricing', 'pricing'], ['Testimonials', 'testimonials']].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)}
              style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 14, cursor: 'pointer', padding: 0, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e2e8f0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
            >{label}</button>
          ))}
        </div>

        <div style={{ flex: 1 }} className="nav-spacer" />

        {/* CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <Link to="/auth" style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9ca3af', fontSize: 14, textDecoration: 'none', transition: 'all 0.2s', display: 'block' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#e2e8f0'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.18)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#9ca3af'; (e.currentTarget as HTMLAnchorElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            Sign In
          </Link>
          <Link to="/auth?mode=signup" style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)', color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 20px rgba(0,212,255,0.3)', transition: 'all 0.2s', display: 'block' }}>
            Get Started
          </Link>
          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(v => !v)} className="hamburger-btn"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: 7, cursor: 'pointer', color: '#9ca3af', display: 'none', alignItems: 'center' }}>
            {menuOpen ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 99, background: 'rgba(5,5,15,0.97)', backdropFilter: 'blur(30px)', borderBottom: '1px solid rgba(0,212,255,0.08)', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[['Features', 'features'], ['How It Works', 'how'], ['Pricing', 'pricing'], ['Testimonials', 'testimonials']].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 15, cursor: 'pointer', padding: '10px 0', textAlign: 'left' }}>{label}</button>
          ))}
        </div>
      )}

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px clamp(16px, 5vw, 80px) 60px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, border: '1px solid rgba(0,212,255,0.25)', background: 'rgba(0,212,255,0.07)', marginBottom: 28 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', boxShadow: '0 0 8px #00d4ff' }} />
          <span style={{ color: '#00d4ff', fontSize: 13, fontWeight: 600 }}>Neural OS v2.1 — Now in Public Beta</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(36px, 7vw, 80px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-2px', margin: '0 0 24px', maxWidth: 900 }}>
          Your Second Brain,{' '}
          <span style={{ background: 'linear-gradient(135deg,#00d4ff 0%,#8b5cf6 50%,#f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'inline-block' }}>
            Powered by Neural AI
          </span>
        </h1>

        <p style={{ color: '#9ca3af', fontSize: 'clamp(16px, 2.2vw, 20px)', lineHeight: 1.6, maxWidth: 620, margin: '0 0 40px' }}>
          Capture knowledge from anywhere. Connect every idea with AI. Recall anything, instantly. RecallSense is the knowledge OS built for the age of intelligence.
        </p>

        {/* CTA Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 56 }}>
          <Link to="/auth?mode=signup" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '15px 28px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none', boxShadow: '0 0 40px rgba(0,212,255,0.35)', transition: 'all 0.25s' }}>
            <Brain size={18} /> Start Free — No Card Required <ArrowRight size={16} />
          </Link>
          <button onClick={() => scrollTo('features')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '15px 28px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: 16, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)' }}>
            <Play size={16} fill="currentColor" style={{ opacity: 0.7 }} /> Explore Features
          </button>
        </div>

        {/* Source types */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 60 }}>
          {SOURCES.map(({ icon: Icon, color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 20, background: `${color}0d`, border: `1px solid ${color}25`, color, fontSize: 13, fontWeight: 500 }}>
              <Icon size={14} /> {label}
            </div>
          ))}
        </div>

        {/* Mock app preview */}
        <div style={{
          maxWidth: 900, width: '100%', borderRadius: 20,
          border: '1px solid rgba(0,212,255,0.15)',
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 80px rgba(0,212,255,0.06)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Fake browser bar */}
          <div style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {['#ef4444', '#f59e0b', '#10b981'].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
              ))}
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: 6, height: 26, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
              <span style={{ color: '#4b5563', fontSize: 12 }}>app.recallsense.ai/dashboard</span>
            </div>
          </div>
          {/* Dashboard preview */}
          <div style={{ padding: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
            {[
              { label: 'Total Captures', value: '2,847', color: '#00d4ff', icon: Library },
              { label: 'AI Insights', value: '14,230', color: '#8b5cf6', icon: Brain },
              { label: 'Neural Connections', value: '89,412', color: '#f472b6', icon: Network },
              { label: 'Knowledge Score', value: '94%', color: '#10b981', icon: TrendingUp },
              { label: 'Sources Captured', value: '6 types', color: '#f59e0b', icon: Database },
              { label: 'Active Projects', value: '12', color: '#00d4ff', icon: Layers },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} style={{ padding: '14px 16px', borderRadius: 12, background: `${color}08`, border: `1px solid ${color}18`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color={color} />
                </div>
                <div>
                  <div style={{ color, fontSize: 16, fontWeight: 800 }}>{value}</div>
                  <div style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <section style={{ background: 'rgba(0,212,255,0.04)', borderTop: '1px solid rgba(0,212,255,0.1)', borderBottom: '1px solid rgba(0,212,255,0.1)', padding: '32px clamp(16px, 5vw, 80px)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 24, maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          {[
            { target: 50000, suffix: '+', label: 'Active Users', color: '#00d4ff' },
            { target: 2500000, suffix: '+', label: 'Memories Captured', color: '#8b5cf6' },
            { target: 99, suffix: '.9%', label: 'Uptime SLA', color: '#10b981' },
            { target: 4, suffix: '.9 ★', label: 'Average Rating', color: '#f59e0b' },
          ].map(({ target, suffix, label, color }) => (
            <div key={label}>
              <div style={{ color, fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900 }}>
                <Counter target={target} suffix={suffix} />
              </div>
              <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px clamp(16px, 5vw, 80px)', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.07)', marginBottom: 18 }}>
            <Sparkles size={13} color="#8b5cf6" />
            <span style={{ color: '#8b5cf6', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>All Features</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 16px' }}>
            Everything Your Knowledge Needs
          </h2>
          <p style={{ color: '#9ca3af', fontSize: 17, maxWidth: 540, margin: '0 auto' }}>
            Nine powerful modules working together as one seamless neural OS
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18, maxWidth: 1200, margin: '0 auto' }}>
          {FEATURES.map(({ icon: Icon, color, title, desc, tag }) => (
            <div key={title}
              style={{
                padding: '24px', borderRadius: 18,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(20px)',
                transition: 'all 0.3s ease',
                position: 'relative', overflow: 'hidden',
                cursor: 'default',
              }}
              onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = `${color}30`; d.style.boxShadow = `0 0 40px ${color}0a`; d.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = 'rgba(255,255,255,0.07)'; d.style.boxShadow = 'none'; d.style.transform = 'none'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}60, transparent)` }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={color} />
                </div>
                <span style={{ padding: '3px 10px', borderRadius: 6, background: `${color}0d`, border: `1px solid ${color}20`, color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{tag}</span>
              </div>
              <h3 style={{ color: '#e2e8f0', fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{title}</h3>
              <p style={{ color: '#6b7280', fontSize: 13, lineHeight: 1.6, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how" style={{ padding: '100px clamp(16px, 5vw, 80px)', background: 'rgba(255,255,255,0.01)', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.07)', marginBottom: 18 }}>
            <Zap size={13} color="#00d4ff" />
            <span style={{ color: '#00d4ff', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>How It Works</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 16px' }}>
            Three Steps to Total Recall
          </h2>
          <p style={{ color: '#9ca3af', fontSize: 17, maxWidth: 480, margin: '0 auto' }}>
            From raw input to crystallized knowledge in seconds
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32, maxWidth: 960, margin: '0 auto', position: 'relative' }}>
          {HOW.map(({ num, icon: Icon, color, title, desc }, i) => (
            <div key={num} style={{ position: 'relative', textAlign: 'center' }}>
              {/* Connector line */}
              {i < HOW.length - 1 && (
                <div style={{ position: 'absolute', top: 52, right: -16, width: 32, height: 2, background: `linear-gradient(90deg, ${color}50, transparent)`, display: 'none' }} className="connector-line" />
              )}
              <div style={{ width: 80, height: 80, borderRadius: 22, background: `${color}10`, border: `2px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: `0 0 40px ${color}20`, position: 'relative' }}>
                <Icon size={34} color={color} />
                <div style={{ position: 'absolute', top: -10, right: -10, width: 28, height: 28, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 800 }}>{num}</div>
              </div>
              <h3 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{title}</h3>
              <p style={{ color: '#9ca3af', fontSize: 14, lineHeight: 1.7, margin: 0, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section id="testimonials" style={{ padding: '100px clamp(16px, 5vw, 80px)', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.07)', marginBottom: 18 }}>
            <Star size={13} color="#10b981" />
            <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Loved by Thousands</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 16px' }}>
            What Our Users Say
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, maxWidth: 1100, margin: '0 auto' }}>
          {TESTIMONIALS.map(({ name, role, avatar, color, quote, stars }) => (
            <div key={name} style={{ padding: '28px', borderRadius: 18, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${color}25`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}50, transparent)` }} />
              <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                {Array(stars).fill(0).map((_, i) => <Star key={i} size={14} color="#f59e0b" fill="#f59e0b" />)}
              </div>
              <p style={{ color: '#d1d5db', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px', fontStyle: 'italic' }}>"{quote}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg,${color},${color}80)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0, boxShadow: `0 0 16px ${color}40` }}>
                  {avatar}
                </div>
                <div>
                  <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700 }}>{name}</div>
                  <div style={{ color: '#6b7280', fontSize: 11 }}>{role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '100px clamp(16px, 5vw, 80px)', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 14px', borderRadius: 20, border: '1px solid rgba(244,114,182,0.3)', background: 'rgba(244,114,182,0.07)', marginBottom: 18 }}>
            <Zap size={13} color="#f472b6" />
            <span style={{ color: '#f472b6', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Pricing</span>
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, letterSpacing: '-1px', margin: '0 0 16px' }}>
            Simple, Transparent Pricing
          </h2>
          <p style={{ color: '#9ca3af', fontSize: 17, maxWidth: 440, margin: '0 auto' }}>
            Start free. Upgrade when you're ready. Cancel anytime.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, maxWidth: 1000, margin: '0 auto' }}>
          {PLANS.map(({ name, price, period, color, desc, features, cta, highlight }) => (
            <div key={name}
              style={{
                padding: '32px 28px',
                borderRadius: 20,
                background: highlight ? 'rgba(0,212,255,0.05)' : 'rgba(255,255,255,0.02)',
                border: `${highlight ? '2px' : '1px'} solid ${highlight ? `${color}30` : 'rgba(255,255,255,0.07)'}`,
                backdropFilter: 'blur(20px)',
                boxShadow: highlight ? `0 0 60px ${color}12` : 'none',
                position: 'relative', overflow: 'hidden',
                transform: highlight ? 'scale(1.02)' : 'scale(1)',
              }}
            >
              {highlight && (
                <div style={{ position: 'absolute', top: 16, right: 16, padding: '3px 10px', borderRadius: 6, background: color, color: '#000', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>Most Popular</div>
              )}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}60)` }} />

              <div style={{ marginBottom: 24 }}>
                <div style={{ color, fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>{name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ color: '#fff', fontSize: 42, fontWeight: 900 }}>${price}</span>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>/ {period}</span>
                </div>
                <div style={{ color: '#9ca3af', fontSize: 13 }}>{desc}</div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                {features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={10} color={color} strokeWidth={3} />
                    </div>
                    <span style={{ color: '#d1d5db', fontSize: 13 }}>{f}</span>
                  </div>
                ))}
              </div>

              <Link to={name === 'Enterprise' ? '#' : '/auth?mode=signup'}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '13px', borderRadius: 12, border: highlight ? 'none' : `1px solid ${color}30`,
                  background: highlight ? `linear-gradient(135deg, ${color}, #8b5cf6)` : `${color}0d`,
                  color: highlight ? '#fff' : color, fontSize: 14, fontWeight: 700,
                  textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: highlight ? `0 0 30px ${color}30` : 'none',
                }}
              >
                {cta} <ArrowRight size={15} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '120px clamp(16px, 5vw, 80px)', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: '0 0 50px rgba(0,212,255,0.4)' }}>
            <Brain size={34} color="#fff" />
          </div>
          <h2 style={{ fontSize: 'clamp(30px, 5vw, 56px)', fontWeight: 900, letterSpacing: '-1.5px', margin: '0 0 18px' }}>
            Start Building Your{' '}
            <span style={{ background: 'linear-gradient(135deg,#00d4ff,#8b5cf6,#f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Neural Memory Bank
            </span>
          </h2>
          <p style={{ color: '#9ca3af', fontSize: 18, lineHeight: 1.6, margin: '0 0 40px' }}>
            Join 50,000+ knowledge workers who've upgraded their minds with RecallSense. Free forever, no credit card required.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
            <Link to="/auth?mode=signup" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 32px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)', color: '#fff', fontSize: 16, fontWeight: 800, textDecoration: 'none', boxShadow: '0 0 50px rgba(0,212,255,0.35)', transition: 'all 0.25s', letterSpacing: '-0.2px' }}>
              <Zap size={18} /> Create Free Account <ArrowRight size={16} />
            </Link>
            <Link to="/auth" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 28px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', fontSize: 16, fontWeight: 600, textDecoration: 'none', backdropFilter: 'blur(10px)', transition: 'all 0.2s' }}>
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px clamp(16px, 5vw, 80px)', position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 40, marginBottom: 40 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Brain size={17} color="#fff" />
                </div>
                <span style={{ color: '#fff', fontWeight: 800, fontSize: 16 }}>RecallSense</span>
              </div>
              <p style={{ color: '#4b5563', fontSize: 13, lineHeight: 1.6, margin: '0 0 16px' }}>
                The neural knowledge OS for the age of intelligence. Capture, connect, recall.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                {[Twitter, Github, Mail].map((Icon, i) => (
                  <div key={i} style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Icon size={15} color="#6b7280" />
                  </div>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              { title: 'Product', links: ['Features', 'How It Works', 'Pricing', 'Changelog'] },
              { title: 'Company', links: ['About', 'Blog', 'Careers', 'Press'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security', 'GDPR'] },
            ].map(({ title, links }) => (
              <div key={title}>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{title}</div>
                {links.map(l => (
                  <div key={l} style={{ color: '#4b5563', fontSize: 13, marginBottom: 8, cursor: 'pointer', transition: 'color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#9ca3af')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                  >{l}</div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ color: '#374151', fontSize: 12 }}>© 2026 RecallSense Inc. All rights reserved.</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              <span style={{ color: '#4b5563', fontSize: 12 }}>All systems operational</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
          .nav-spacer { display: none !important; }
          .hamburger-btn { display: flex !important; }
        }
        @media (min-width: 768px) {
          .connector-line { display: block !important; }
        }
      `}</style>
    </div>
  );
}
