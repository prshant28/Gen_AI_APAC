import { useEffect, useState, type ReactNode } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, ArrowRight, ArrowLeft, Shield, Cpu, Search,
  Calendar, Layers,
  Star, Check, ChevronRight, Play, Github, Twitter, Linkedin,
  Menu, X, Sun, Moon, FileText, Network, BookOpen,
  Activity, Database, Workflow, Headphones,
  Plus, Minus, Quote,
} from 'lucide-react';

type LandingProps = {
  navigate: (path: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
};

const AGENTS = [
  { icon: Layers, name: 'Orchestrator', role: 'Routes intent in real time', desc: 'Picks the right specialist agent for every query and streams the answer back fast.', accent: '#a78bfa' },
  { icon: FileText, name: 'Capture Agent', role: 'Universal ingestion', desc: 'YouTube, web, PDFs, voice notes — turned into clean, searchable knowledge.', accent: '#22d3ee' },
  { icon: Search, name: 'Recall Agent', role: 'Semantic memory', desc: 'Vector search across everything you ever captured. Finds meaning, not keywords.', accent: '#34d399' },
  { icon: Network, name: 'Graph Agent', role: 'Living knowledge graph', desc: 'Auto-links ideas, people, projects. Watch your second brain wire itself.', accent: '#f472b6' },
  { icon: Calendar, name: 'Planner Agent', role: 'Time + tasks', desc: 'Turns insights into prioritized work, schedules deep-work blocks for you.', accent: '#fbbf24' },
];

const FEATURES = [
  { icon: Brain, title: 'Semantic Recall', desc: 'Find anything by meaning. Vector embeddings + reranking surface the right memory in milliseconds.', span: 'wide' },
  { icon: Cpu, title: '7 Specialist Agents', desc: 'A multi-agent system orchestrates capture, recall, planning, briefings.', span: 'tall' },
  { icon: Workflow, title: 'Live Workflows', desc: 'Chain agents into reusable flows.', span: 'normal' },
  { icon: Database, title: 'Knowledge Graph', desc: 'Living graph of ideas, sources, people.', span: 'normal' },
  { icon: BookOpen, title: 'Daily Briefings', desc: 'AI-curated summary every morning of what mattered yesterday and what to focus on today.', span: 'wide' },
  { icon: Shield, title: 'Privacy First', desc: 'Encrypted in transit. Never used to train models.', span: 'normal' },
];

const STATS = [
  { value: '1.2M+', label: 'Memories captured' },
  { value: '98.7%', label: 'Recall accuracy' },
  { value: '9.4h', label: 'Saved per week' },
  { value: '2,400+', label: 'Active thinkers' },
];

const TESTIMONIALS = [
  { quote: 'Recall X247 replaced four apps for me. The multi-agent setup is genuinely magical — like having a team of researchers on call 24/7.', name: 'Maya Rodriguez', role: 'Founder, Lumen Labs', avatar: 'MR' },
  { quote: 'I used to lose 2 hours a day searching old notes. Now I just ask the Orchestrator and it pulls the exact memory in seconds.', name: 'Daniel Park', role: 'Sr. PM at Stripe', avatar: 'DP' },
  { quote: 'The daily briefings are wild. It surfaces connections between ideas I forgot I had. Felt like cheating my way to a research PhD.', name: 'Aisha Patel', role: 'Independent researcher', avatar: 'AP' },
];

const FAQ = [
  { q: 'How is this different from Notion or Mem?', a: 'Recall X247 is multi-agent first. Instead of a single chatbot or a static wiki, seven specialist AIs coordinate to capture, link, recall, plan, and brief you continuously.' },
  { q: 'Where is my data stored?', a: 'Your knowledge lives in a private graph tied to your account. Auth runs through Firebase; transit is encrypted. Your data is never used to train any model.' },
  { q: 'Which models power the agents?', a: 'GPT-4o-mini via OpenRouter today, with Anthropic and local-model swap-in coming soon. Each agent picks the best model for its job.' },
  { q: 'Is there a free tier?', a: 'Yes — all core capture, recall, and agent features are free forever. Premium tiers unlock advanced analytics, longer context, and team workspaces.' },
  { q: 'Can I import from other tools?', a: 'Yes. We support Notion, Obsidian, Apple Notes, Readwise, Pocket, Roam and CSV import out of the box. More integrations land monthly.' },
  { q: 'Does it work offline?', a: 'Capture works offline and syncs when you reconnect. Recall and agent features need a live connection for inference.' },
];

const COMPARE_ROWS: Array<{ label: string; recall: string | boolean; notion: string | boolean; mem: string | boolean }> = [
  { label: 'Multi-agent orchestration', recall: '7 specialist agents', notion: false, mem: 'Single AI' },
  { label: 'Semantic recall', recall: true, notion: 'Limited', mem: true },
  { label: 'Living knowledge graph', recall: true, notion: false, mem: false },
  { label: 'YouTube + audio capture', recall: true, notion: false, mem: false },
  { label: 'Daily AI briefings', recall: true, notion: false, mem: 'Beta' },
  { label: 'Open model architecture', recall: true, notion: false, mem: false },
];

const INTEGRATIONS = [
  'OpenAI', 'Anthropic', 'Notion', 'YouTube', 'Slack', 'Linear', 'Gmail', 'Google Drive', 'Obsidian', 'GitHub', 'Readwise', 'Stripe',
];

const ACTIVITY = [
  { icon: FileText, text: 'Capture Agent ingested a 47-min lecture', time: '2s ago', color: '#22d3ee' },
  { icon: Network, text: 'Graph Agent linked 12 new concepts', time: '8s ago', color: '#f472b6' },
  { icon: Search, text: 'Recall served “2024 GTM playbook”', time: '14s ago', color: '#34d399' },
  { icon: Calendar, text: 'Planner scheduled deep-work block', time: '22s ago', color: '#fbbf24' },
  { icon: BookOpen, text: 'Daily briefing delivered to Maya', time: '31s ago', color: '#a78bfa' },
];

export default function Landing({ navigate, isDark, toggleTheme }: LandingProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const [agentSlide, setAgentSlide] = useState(0);

  const { scrollY } = useScroll();
  const heroParallax = useTransform(scrollY, [0, 600], [0, -80]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.4]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const t = setInterval(() => setActiveTestimonial(i => (i + 1) % TESTIMONIALS.length), 6500);
    return () => clearInterval(t);
  }, []);

  const nextAgent = () => setAgentSlide(i => (i + 1) % AGENTS.length);
  const prevAgent = () => setAgentSlide(i => (i - 1 + AGENTS.length) % AGENTS.length);

  return (
    <div className="lx-shell">
      {/* Background layers */}
      <div className="lx-bg">
        <div className="lx-bg-vignette" />
        <div className="lx-bg-grid" />
        <div className="lx-bg-orb lx-bg-orb-1" />
        <div className="lx-bg-orb lx-bg-orb-2" />
        <div className="lx-bg-orb lx-bg-orb-3" />
        <div className="lx-bg-noise" />
      </div>

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <header className={`lx-nav ${scrolled ? 'lx-nav-scrolled' : ''}`}>
        <div className="lx-nav-inner">
          <button
            className="lx-nav-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={18} />
          </button>

          <button className="lx-nav-logo" onClick={() => navigate('/')} aria-label="Recall X247 home">
            <span className="lx-nav-logo-mark">
              <Brain size={16} strokeWidth={2.4} />
            </span>
            <span className="lx-nav-logo-text">
              recall<span className="lx-nav-logo-x">×247</span>
            </span>
          </button>

          <nav className="lx-nav-links">
            <a href="#agents" className="lx-nav-link">Agents</a>
            <a href="#features" className="lx-nav-link">Platform</a>
            <a href="#pricing" className="lx-nav-link">Pricing</a>
            <a href="#faq" className="lx-nav-link">FAQ</a>
          </nav>

          <div className="lx-nav-actions">
            <button onClick={toggleTheme} className="lx-icon-btn" aria-label="Toggle theme">
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={() => navigate('/login')} className="lx-pill-ghost lx-nav-signin">
              Sign in
            </button>
            <button onClick={() => navigate('/login?mode=signup')} className="lx-pill-primary">
              <span>Get Started</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="lx-mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button className="lx-mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <X size={20} />
            </button>
            <nav className="lx-mobile-links">
              <a href="#agents" onClick={() => setMobileMenuOpen(false)}>Agents</a>
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Platform</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</a>
            </nav>
            <div className="lx-mobile-cta">
              <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} className="lx-pill-ghost">Sign in</button>
              <button onClick={() => { setMobileMenuOpen(false); navigate('/login?mode=signup'); }} className="lx-pill-primary">
                <span>Get Started</span><ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="lx-hero">
        <motion.div className="lx-hero-card" style={{ y: heroParallax, opacity: heroOpacity }}>
          {/* Animated dashboard preview inside the hero card */}
          <div className="lx-hero-preview">
            <div className="lx-hero-preview-glow" />
            <div className="lx-hero-preview-grid" />
            {/* Orbital agents */}
            <div className="lx-orbital">
              <div className="lx-orbital-core">
                <Brain size={32} strokeWidth={1.6} />
              </div>
              <div className="lx-orbital-ring lx-orbital-ring-1" />
              <div className="lx-orbital-ring lx-orbital-ring-2" />
              <div className="lx-orbital-ring lx-orbital-ring-3" />
              {AGENTS.slice(0, 5).map((a, i) => {
                const angle = (i / 5) * 360;
                const Icon = a.icon;
                return (
                  <motion.div
                    key={a.name}
                    className="lx-orbital-node"
                    style={{
                      transform: `rotate(${angle}deg) translateX(165px) rotate(-${angle}deg)`,
                      ['--node-color' as any]: a.accent,
                    }}
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.3 }}
                  >
                    <Icon size={16} />
                  </motion.div>
                );
              })}
            </div>

            {/* Floating activity cards */}
            <motion.div
              className="lx-hero-float lx-hero-float-tl"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Activity size={12} />
              <span>2,481 memories indexed today</span>
            </motion.div>
            <motion.div
              className="lx-hero-float lx-hero-float-br"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
            >
              <Sparkles size={12} />
              <span>Briefing ready · 06:30</span>
            </motion.div>
          </div>
        </motion.div>

        <div className="lx-hero-content">
          <motion.div
            className="lx-eyebrow"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="lx-eyebrow-dot" />
            <span>Neural OS · v3.0 — multi-agent workflows live</span>
            <ChevronRight size={12} />
          </motion.div>

          <motion.h1
            className="lx-hero-title"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
          >
            <span className="lx-hero-title-line">Your second brain,</span>
            <span className="lx-hero-title-line lx-hero-title-grad">always on.</span>
          </motion.h1>

          <motion.p
            className="lx-hero-sub"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            Capture anything. Recall instantly. A team of seven specialist AI agents
            quietly organizes your knowledge so you can think clearer, decide faster,
            and never lose an idea again.
          </motion.p>

          <motion.div
            className="lx-hero-ctas"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
          >
            <button onClick={() => navigate('/login?mode=signup')} className="lx-pill-primary lx-pill-lg">
              <span>Start free</span>
              <ArrowRight size={15} />
            </button>
            <button onClick={() => navigate('/login')} className="lx-pill-ghost lx-pill-lg">
              <Play size={13} fill="currentColor" />
              <span>Watch demo</span>
            </button>
          </motion.div>

          <motion.div
            className="lx-hero-trust"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <div className="lx-trust-avatars">
              {['P', 'D', 'A', 'S', 'R'].map((l, i) => (
                <div key={l} className="lx-trust-avatar" style={{ ['--i' as any]: i }}>{l}</div>
              ))}
            </div>
            <div className="lx-trust-meta">
              <div className="lx-trust-stars">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} fill="#fbbf24" stroke="none" />)}
              </div>
              <div className="lx-trust-text">2,400+ professionals · trusted by founders & operators</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── INTEGRATIONS MARQUEE ─────────────────────────────────────── */}
      <section className="lx-marquee-section">
        <div className="lx-marquee-label">
          <span className="lx-eyebrow-dot" />
          Connects with the tools you already use
        </div>
        <div className="lx-marquee">
          <div className="lx-marquee-track">
            {[...INTEGRATIONS, ...INTEGRATIONS].map((name, i) => (
              <div key={i} className="lx-marquee-item">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENTS CAROUSEL ──────────────────────────────────────────── */}
      <section id="agents" className="lx-section">
        <div className="lx-carousel-card">
          <div className="lx-carousel-header">
            <div className="lx-eyebrow">
              <span className="lx-eyebrow-dot" />
              Meet the agents
            </div>
            <div className="lx-carousel-count">
              {String(agentSlide + 1).padStart(2, '0')} <span>/ {String(AGENTS.length).padStart(2, '0')}</span>
            </div>
          </div>

          <div className="lx-carousel-body">
            <AnimatePresence mode="wait">
              <motion.div
                key={agentSlide}
                className="lx-carousel-slide"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.45 }}
              >
                <div className="lx-carousel-text">
                  <h3 className="lx-carousel-title">{AGENTS[agentSlide].name}</h3>
                  <div className="lx-carousel-role">{AGENTS[agentSlide].role}</div>
                  <p className="lx-carousel-desc">{AGENTS[agentSlide].desc}</p>
                  <div className="lx-carousel-tags">
                    <span className="lx-tag">Real-time</span>
                    <span className="lx-tag">Streaming</span>
                    <span className="lx-tag">Memory-aware</span>
                  </div>
                </div>
                <div className="lx-carousel-visual" style={{ ['--accent' as any]: AGENTS[agentSlide].accent }}>
                  <div className="lx-carousel-visual-glow" />
                  <div className="lx-carousel-visual-icon">
                    {(() => { const I = AGENTS[agentSlide].icon; return <I size={64} strokeWidth={1.4} />; })()}
                  </div>
                  <div className="lx-carousel-visual-rings">
                    <div /><div /><div />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="lx-carousel-controls">
            <button onClick={prevAgent} className="lx-carousel-btn" aria-label="Previous agent">
              <ArrowLeft size={15} />
            </button>
            <div className="lx-carousel-dots">
              {AGENTS.map((_, i) => (
                <button
                  key={i}
                  className={`lx-carousel-dot ${i === agentSlide ? 'lx-carousel-dot-active' : ''}`}
                  onClick={() => setAgentSlide(i)}
                  aria-label={`Go to agent ${i + 1}`}
                />
              ))}
            </div>
            <button onClick={nextAgent} className="lx-carousel-btn" aria-label="Next agent">
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ── BENTO FEATURES ───────────────────────────────────────────── */}
      <section id="features" className="lx-section">
        <SectionHeader
          eyebrow="Platform"
          title={<>Built for <span className="lx-grad-silver">deep work.</span></>}
          sub="Every surface is designed to help you think — not to demand more of your attention."
        />
        <div className="lx-bento">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className={`lx-bento-card lx-bento-${f.span}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                <div className="lx-bento-icon">
                  <Icon size={18} />
                </div>
                <div className="lx-bento-title">{f.title}</div>
                <div className="lx-bento-desc">{f.desc}</div>
                <div className="lx-bento-shine" />
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── LIVE ACTIVITY ────────────────────────────────────────────── */}
      <section className="lx-section">
        <div className="lx-activity-wrap">
          <div className="lx-activity-text">
            <SectionHeader
              eyebrow="Live now"
              title={<>Your second brain is <span className="lx-grad-silver">always working.</span></>}
              sub="While you focus, agents quietly capture, link, recall and plan in the background."
              align="left"
            />
            <div className="lx-stats-row">
              {STATS.map(s => (
                <div key={s.label} className="lx-stat">
                  <div className="lx-stat-value">{s.value}</div>
                  <div className="lx-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lx-activity-feed">
            <div className="lx-activity-header">
              <div className="lx-activity-dot" />
              <span>Live activity</span>
            </div>
            <div className="lx-activity-list">
              {ACTIVITY.map((a, i) => {
                const Icon = a.icon;
                return (
                  <motion.div
                    key={i}
                    className="lx-activity-item"
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.45, delay: i * 0.08 }}
                  >
                    <span className="lx-activity-icon" style={{ background: `${a.color}22`, color: a.color }}>
                      <Icon size={13} />
                    </span>
                    <span className="lx-activity-text-line">{a.text}</span>
                    <span className="lx-activity-time">{a.time}</span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ─────────────────────────────────────────── */}
      <section className="lx-section">
        <SectionHeader
          eyebrow="Why Recall X247"
          title={<>The fastest path from <span className="lx-grad-silver">capture to clarity.</span></>}
          sub="A modern second brain that does the work, instead of asking you to organize it."
        />
        <div className="lx-compare-card">
          <div className="lx-compare-row lx-compare-head">
            <div className="lx-compare-cell">Capability</div>
            <div className="lx-compare-cell lx-compare-mine">
              <span className="lx-compare-mark">●</span> Recall X247
            </div>
            <div className="lx-compare-cell">Notion AI</div>
            <div className="lx-compare-cell">Mem</div>
          </div>
          {COMPARE_ROWS.map(row => (
            <div key={row.label} className="lx-compare-row">
              <div className="lx-compare-cell lx-compare-label">{row.label}</div>
              <CompareCell value={row.recall} highlight />
              <CompareCell value={row.notion} />
              <CompareCell value={row.mem} />
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────── */}
      <section className="lx-section">
        <SectionHeader
          eyebrow="From the field"
          title={<>Loved by people who <span className="lx-grad-silver">build & think.</span></>}
        />
        <div className="lx-testimonial-card">
          <Quote className="lx-testimonial-quote-icon" size={36} />
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.5 }}
              className="lx-testimonial-body"
            >
              <p className="lx-testimonial-quote">{TESTIMONIALS[activeTestimonial].quote}</p>
              <div className="lx-testimonial-meta">
                <div className="lx-testimonial-avatar">{TESTIMONIALS[activeTestimonial].avatar}</div>
                <div>
                  <div className="lx-testimonial-name">{TESTIMONIALS[activeTestimonial].name}</div>
                  <div className="lx-testimonial-role">{TESTIMONIALS[activeTestimonial].role}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="lx-testimonial-dots">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                className={`lx-carousel-dot ${i === activeTestimonial ? 'lx-carousel-dot-active' : ''}`}
                onClick={() => setActiveTestimonial(i)}
                aria-label={`Show testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section id="pricing" className="lx-section">
        <SectionHeader
          eyebrow="Pricing"
          title={<>Free to start. <span className="lx-grad-silver">Premium when ready.</span></>}
          sub="Every plan unlocks the full multi-agent system. Pay only for scale and team features."
        />
        <div className="lx-price-grid">
          <div className="lx-price-card">
            <div className="lx-price-name">Starter</div>
            <div className="lx-price-amount"><span>$0</span><em>/mo</em></div>
            <div className="lx-price-tag">Forever free</div>
            <ul className="lx-price-features">
              <li><Check size={13} /> All 7 agents included</li>
              <li><Check size={13} /> 1 GB knowledge graph</li>
              <li><Check size={13} /> 500 captures / month</li>
              <li><Check size={13} /> Daily AI briefings</li>
              <li><Check size={13} /> Community support</li>
            </ul>
            <button onClick={() => navigate('/login?mode=signup')} className="lx-pill-ghost lx-pill-block">Get started</button>
          </div>

          <div className="lx-price-card lx-price-card-feature">
            <div className="lx-price-badge">Most popular</div>
            <div className="lx-price-name">Pro</div>
            <div className="lx-price-amount"><span>$19</span><em>/mo</em></div>
            <div className="lx-price-tag">Best for serious thinkers</div>
            <ul className="lx-price-features">
              <li><Check size={13} /> Unlimited captures</li>
              <li><Check size={13} /> 50 GB knowledge graph</li>
              <li><Check size={13} /> Advanced analytics</li>
              <li><Check size={13} /> Custom agent workflows</li>
              <li><Check size={13} /> Priority models (GPT-4o)</li>
              <li><Check size={13} /> Priority support</li>
            </ul>
            <button onClick={() => navigate('/login?mode=signup')} className="lx-pill-primary lx-pill-block">Start Pro trial</button>
          </div>

          <div className="lx-price-card">
            <div className="lx-price-name">Teams</div>
            <div className="lx-price-amount"><span>$49</span><em>/seat/mo</em></div>
            <div className="lx-price-tag">For small high-output teams</div>
            <ul className="lx-price-features">
              <li><Check size={13} /> Everything in Pro</li>
              <li><Check size={13} /> Shared knowledge graphs</li>
              <li><Check size={13} /> Team briefings & digests</li>
              <li><Check size={13} /> Admin & SSO controls</li>
              <li><Check size={13} /> SOC 2 controls</li>
            </ul>
            <button onClick={() => navigate('/login')} className="lx-pill-ghost lx-pill-block">Talk to sales</button>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section id="faq" className="lx-section">
        <SectionHeader
          eyebrow="FAQ"
          title={<>Questions, <span className="lx-grad-silver">answered.</span></>}
        />
        <div className="lx-faq">
          {FAQ.map((f, i) => (
            <div key={i} className={`lx-faq-item ${openFaq === i ? 'lx-faq-open' : ''}`}>
              <button className="lx-faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                <span>{f.q}</span>
                <span className="lx-faq-icon">{openFaq === i ? <Minus size={15} /> : <Plus size={15} />}</span>
              </button>
              <AnimatePresence initial={false}>
                {openFaq === i && (
                  <motion.div
                    className="lx-faq-a"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p>{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="lx-section">
        <div className="lx-final-cta">
          <div className="lx-final-glow" />
          <div className="lx-final-content">
            <h2 className="lx-final-title">
              Stop forgetting. <span className="lx-grad-silver">Start recalling.</span>
            </h2>
            <p className="lx-final-sub">
              Your second brain is one click away. Free to start, magical to use.
            </p>
            <div className="lx-hero-ctas">
              <button onClick={() => navigate('/login?mode=signup')} className="lx-pill-primary lx-pill-lg">
                <span>Get started for free</span>
                <ArrowRight size={15} />
              </button>
              <button onClick={() => navigate('/login')} className="lx-pill-ghost lx-pill-lg">
                <span>Sign in</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="lx-footer">
        <div className="lx-footer-top">
          <div className="lx-footer-brand">
            <button className="lx-nav-logo" onClick={() => navigate('/')}>
              <span className="lx-nav-logo-mark"><Brain size={16} strokeWidth={2.4} /></span>
              <span className="lx-nav-logo-text">recall<span className="lx-nav-logo-x">×247</span></span>
            </button>
            <p className="lx-footer-tag">Your AI-powered second brain. Multi-agent. Always on.</p>
            <div className="lx-footer-social">
              <a href="#" aria-label="Twitter"><Twitter size={15} /></a>
              <a href="#" aria-label="GitHub"><Github size={15} /></a>
              <a href="#" aria-label="LinkedIn"><Linkedin size={15} /></a>
            </div>
          </div>
          <div className="lx-footer-cols">
            <div>
              <h5>Product</h5>
              <a href="#agents">Agents</a>
              <a href="#features">Platform</a>
              <a href="#pricing">Pricing</a>
              <a href="#">Changelog</a>
            </div>
            <div>
              <h5>Resources</h5>
              <a href="#">Docs</a>
              <a href="#">API</a>
              <a href="#">Guides</a>
              <a href="#">Status</a>
            </div>
            <div>
              <h5>Company</h5>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
            <div>
              <h5>Legal</h5>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Security</a>
              <a href="#">DPA</a>
            </div>
          </div>
        </div>
        <div className="lx-footer-bottom">
          <span>© 2026 Recall X247 Labs · All rights reserved.</span>
          <span className="lx-footer-meta">Built for thinkers · Made on Earth 🌍</span>
        </div>
      </footer>

      {/* ── FLOATING DOCK ────────────────────────────────────────────── */}
      <div className="lx-dock">
        <button className="lx-dock-btn" onClick={() => navigate('/login')} aria-label="Talk to us">
          <Headphones size={16} />
        </button>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow, title, sub, align = 'center',
}: { eyebrow: string; title: ReactNode; sub?: string; align?: 'left' | 'center' }) {
  return (
    <motion.div
      className={`lx-section-header lx-section-header-${align}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
    >
      <div className="lx-eyebrow">
        <span className="lx-eyebrow-dot" />
        {eyebrow}
      </div>
      <h2 className="lx-section-title">{title}</h2>
      {sub && <p className="lx-section-sub">{sub}</p>}
    </motion.div>
  );
}

function CompareCell({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  if (value === true) {
    return <div className={`lx-compare-cell ${highlight ? 'lx-compare-mine' : ''}`}><Check size={15} className="lx-compare-yes" /></div>;
  }
  if (value === false) {
    return <div className={`lx-compare-cell ${highlight ? 'lx-compare-mine' : ''}`}><X size={15} className="lx-compare-no" /></div>;
  }
  return <div className={`lx-compare-cell ${highlight ? 'lx-compare-mine' : ''}`}><span className="lx-compare-text">{value}</span></div>;
}
