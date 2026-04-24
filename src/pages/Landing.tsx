import { useEffect, useRef, useState, useMemo, type ReactNode } from 'react';
import { motion, useScroll, useSpring, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Brain, Sparkles, ArrowRight, ArrowLeft, Shield, Cpu, Search,
  Calendar, Layers, Star, Check, ChevronRight, Github, Twitter, Linkedin,
  Menu, X, Sun, Moon, FileText, Network, BookOpen, Activity, Database,
  Workflow, Headphones, Plus, Minus, Quote, Youtube, Globe, Mail,
  Zap, Rocket, Target, Telescope, Compass, Send, MessageCircle,
  TrendingUp, Clock, Bolt, Lock, Hexagon,
} from 'lucide-react';

type LandingProps = {
  navigate: (path: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
};

// ── DATA ─────────────────────────────────────────────────────────
const AGENTS = [
  { icon: Layers, name: 'Orchestrator', tagline: 'Routes intent', color: '#a78bfa', desc: 'Picks the right specialist for every query and streams the answer.' },
  { icon: FileText, name: 'Capture', tagline: 'Universal ingest', color: '#22d3ee', desc: 'YouTube, web, PDFs, voice, Slack — all turned into clean memory.' },
  { icon: Search, name: 'Recall', tagline: 'Semantic memory', color: '#34d399', desc: 'Vector + reranking finds meaning, not just keywords.' },
  { icon: Network, name: 'Graph', tagline: 'Living knowledge', color: '#f472b6', desc: 'Auto-links ideas, people and projects into a graph.' },
  { icon: Calendar, name: 'Planner', tagline: 'Time + tasks', color: '#fbbf24', desc: 'Turns insights into prioritized work and deep-work blocks.' },
  { icon: BookOpen, name: 'Briefing', tagline: 'Daily digest', color: '#fb7185', desc: 'AI brief every morning of yesterday + what to focus on today.' },
  { icon: Shield, name: 'Guardian', tagline: 'Privacy & policy', color: '#60a5fa', desc: 'Encryption, redaction and audit so your second brain stays yours.' },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: Telescope,
    title: 'Capture anything',
    desc: 'Drop a link, paste a doc, record a voice note, forward an email. Capture Agent ingests and structures it instantly.',
    samples: ['🎙️ Voice memo · 4:12', '📺 YouTube · 47 min lecture', '📄 PDF · Q3 strategy.pdf', '🔗 Article · Stratechery'],
    accent: '#22d3ee',
  },
  {
    step: '02',
    icon: Network,
    title: 'Connect everything',
    desc: 'Graph Agent silently links new memories to old ones. Concepts, people, projects, decisions — all wired together.',
    samples: ['"RAG" → linked to 14 memories', '"Maya" → 3 new mentions', 'Cluster: GTM playbook (12)', '+ 8 new edges added'],
    accent: '#f472b6',
  },
  {
    step: '03',
    icon: Compass,
    title: 'Recall instantly',
    desc: 'Ask in plain English. Orchestrator routes to the right agents and streams an answer with cited memories.',
    samples: ['→ "What did Maya say about pricing?"', '→ Found 6 memories · 0.4s', '→ Answer streamed with sources', '→ Saved to your daily brief'],
    accent: '#a78bfa',
  },
];

const PERSONAS = [
  {
    icon: Rocket,
    name: 'Founders',
    color: '#a78bfa',
    promise: 'Never lose a customer insight, investor note, or roadmap idea again.',
    bullets: ['Capture investor calls automatically', 'Daily brief of what your team shipped', 'Recall every customer conversation'],
  },
  {
    icon: Telescope,
    name: 'Researchers',
    color: '#22d3ee',
    promise: 'Build a living library of every paper, lecture, and breakthrough you read.',
    bullets: ['Auto-summarize papers + lectures', 'Find connections across fields', 'Cite memories in your writing'],
  },
  {
    icon: Target,
    name: 'Operators',
    color: '#34d399',
    promise: 'Stop searching docs. Just ask your second brain and get the answer.',
    bullets: ['Index every Notion + Slack thread', 'Surface SOPs the moment you need them', 'Auto-schedule deep-work blocks'],
  },
];

const STATS = [
  { value: '1.2M+', label: 'Memories captured' },
  { value: '98.7%', label: 'Recall accuracy' },
  { value: '9.4h', label: 'Saved per week' },
  { value: '< 400ms', label: 'Avg recall time' },
];

const TESTIMONIALS = [
  { quote: 'Recall X247 replaced four apps for me. The multi-agent setup is genuinely magical — like having a team of researchers on call 24/7.', name: 'Maya Rodriguez', role: 'Founder, Lumen Labs', avatar: 'MR', tint: '#a78bfa' },
  { quote: 'The daily briefings are wild. It surfaces connections between ideas I forgot I had. Felt like cheating my way to a research PhD.', name: 'Aisha Patel', role: 'Independent researcher', avatar: 'AP', tint: '#f472b6' },
  { quote: 'I used to lose 2 hours a day searching old notes. Now I just ask the Orchestrator and it pulls the exact memory in seconds.', name: 'Daniel Park', role: 'Sr. PM at Stripe', avatar: 'DP', tint: '#22d3ee' },
  { quote: 'Setup took 3 minutes. By day two I had a graph of 800 memories. By week one I felt 30% smarter at work.', name: 'Jordan Lee', role: 'Eng lead, Series B', avatar: 'JL', tint: '#34d399' },
  { quote: 'The fact that seven specialist agents coordinate behind one chat is pure science fiction. And it just works.', name: 'Priya Suresh', role: 'AI consultant', avatar: 'PS', tint: '#fbbf24' },
  { quote: 'I run a 12-person team. Shared graph means we stop re-asking each other the same question. Massive unlock.', name: 'Sam Chen', role: 'COO at Arcfield', avatar: 'SC', tint: '#fb7185' },
];

const FAQ = [
  { q: 'How is this different from Notion or Mem?', a: 'Recall X247 is multi-agent first. Instead of a single chatbot or a static wiki, seven specialist AIs coordinate to capture, link, recall, plan and brief you continuously.' },
  { q: 'Where is my data stored?', a: 'Your knowledge lives in a private graph tied to your account. Auth runs through Firebase; everything is encrypted in transit. Your data is never used to train any model.' },
  { q: 'Which models power the agents?', a: 'GPT-4o-mini today via OpenRouter, with Anthropic and local-model swap-in coming soon. Each agent picks the best model for its job.' },
  { q: 'Is there a free tier?', a: 'Yes — all core capture, recall and agent features are free forever. Premium tiers unlock advanced analytics, longer context and team workspaces.' },
  { q: 'Can I import from other tools?', a: 'Yes. We support Notion, Obsidian, Apple Notes, Readwise, Pocket, Roam and CSV out of the box. More integrations land monthly.' },
  { q: 'Does it work offline?', a: 'Capture works offline and syncs when you reconnect. Recall and agent features need a live connection for inference.' },
];

const COMPARE: Array<{ label: string; recall: string | boolean; notion: string | boolean; mem: string | boolean }> = [
  { label: 'Multi-agent orchestration', recall: '7 specialist agents', notion: false, mem: 'Single AI' },
  { label: 'Semantic recall', recall: true, notion: 'Limited', mem: true },
  { label: 'Living knowledge graph', recall: true, notion: false, mem: false },
  { label: 'YouTube + audio capture', recall: true, notion: false, mem: false },
  { label: 'Daily AI briefings', recall: true, notion: false, mem: 'Beta' },
  { label: 'Open model architecture', recall: true, notion: false, mem: false },
  { label: 'Free forever tier', recall: true, notion: 'Trial only', mem: 'Trial only' },
];

const LOGOS = ['Lumen Labs', 'Arcfield', 'Stripe', 'Linear', 'Notion', 'OpenAI', 'Vercel', 'Anthropic'];

const CHAT_SCRIPT = [
  { role: 'user', text: 'What did Maya say about pricing on the last call?' },
  { role: 'ai', text: 'Found 6 memories. Maya pushed for usage-based pricing tied to query volume. Final note: revisit after 100 paying users.' },
  { role: 'user', text: 'Schedule deep-work for the rewrite.' },
  { role: 'ai', text: 'Booked Mon–Wed 9–11am. Linked to Q3 strategy memory.' },
];

// ── COMPONENT ────────────────────────────────────────────────────
export default function Landing({ navigate, isDark, toggleTheme }: LandingProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const [chatStep, setChatStep] = useState(1);
  const [activePersona, setActivePersona] = useState(0);

  const heroRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const progressBar = useSpring(scrollYProgress, { stiffness: 100, damping: 20 });

  // Scroll handler
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Mouse spotlight in hero
  useEffect(() => {
    if (reduceMotion) return;
    const hero = heroRef.current;
    const spot = spotRef.current;
    if (!hero || !spot) return;
    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100;
      const y = ((e.clientY - r.top) / r.height) * 100;
      spot.style.setProperty('--mx', `${x}%`);
      spot.style.setProperty('--my', `${y}%`);
    };
    hero.addEventListener('mousemove', onMove);
    return () => hero.removeEventListener('mousemove', onMove);
  }, [reduceMotion]);

  // Animate chat preview
  useEffect(() => {
    if (reduceMotion) { setChatStep(CHAT_SCRIPT.length); return; }
    const t = setInterval(() => {
      setChatStep(s => (s >= CHAT_SCRIPT.length ? 1 : s + 1));
    }, 2600);
    return () => clearInterval(t);
  }, [reduceMotion]);

  // Auto-rotate personas
  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(() => setActivePersona(i => (i + 1) % PERSONAS.length), 5500);
    return () => clearInterval(t);
  }, [reduceMotion]);

  // Mobile menu accessibility — Escape, focus trap, restore focus
  useEffect(() => {
    if (!mobileMenuOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement;
    const menu = mobileMenuRef.current;
    const focusables = menu?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMobileMenuOpen(false); return; }
      if (e.key === 'Tab' && focusables && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      lastFocusedRef.current?.focus();
    };
  }, [mobileMenuOpen]);

  return (
    <div className="lx-shell">
      {/* Scroll progress bar */}
      <motion.div className="lx-progress" style={{ scaleX: progressBar }} />

      {/* Background layers */}
      <div className="lx-bg">
        <div className="lx-bg-vignette" />
        <div className="lx-bg-grid" />
        <div className="lx-bg-orb lx-bg-orb-1" />
        <div className="lx-bg-orb lx-bg-orb-2" />
        <div className="lx-bg-orb lx-bg-orb-3" />
        <div className="lx-bg-noise" />
      </div>

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <header className={`lx-nav ${scrolled ? 'lx-nav-scrolled' : ''}`}>
        <div className="lx-nav-inner">
          <button className="lx-nav-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <button className="lx-nav-logo" onClick={() => navigate('/')} aria-label="Recall X247 home">
            <img src="/x247-logo.png" alt="x247 AI" className="lx-brand-img" draggable={false} />
          </button>
          <nav className="lx-nav-links">
            <a href="#how" className="lx-nav-link">How it works</a>
            <a href="#agents" className="lx-nav-link">Agents</a>
            <a href="#use" className="lx-nav-link">Use cases</a>
            <a href="#pricing" className="lx-nav-link">Pricing</a>
            <a href="#faq" className="lx-nav-link">FAQ</a>
          </nav>
          <div className="lx-nav-actions">
            <button onClick={toggleTheme} className="lx-icon-btn" aria-label="Toggle theme">
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={() => navigate('/login')} className="lx-pill-ghost lx-nav-signin">Sign in</button>
            <button onClick={() => navigate('/login?mode=signup')} className="lx-pill-primary">
              <span>Get Started</span><ArrowRight size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            className="lx-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <button className="lx-mobile-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
            <nav className="lx-mobile-links">
              <a href="#how" onClick={() => setMobileMenuOpen(false)}>How it works</a>
              <a href="#agents" onClick={() => setMobileMenuOpen(false)}>Agents</a>
              <a href="#use" onClick={() => setMobileMenuOpen(false)}>Use cases</a>
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

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="lx-hero" ref={heroRef}>
        <div className="lx-hero-spot" ref={spotRef} />
        <div className="lx-hero-inner">
          <motion.div
            className="lx-eyebrow"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="lx-eyebrow-dot" />
            <span>Now live · Recall X247 v3.0 — multi-agent OS</span>
            <ChevronRight size={12} />
          </motion.div>

          <motion.h1
            className="lx-hero-title"
            initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
          >
            <span className="lx-hero-line">The second brain</span>
            <span className="lx-hero-line">
              that <span className="lx-hero-grad">thinks with you.</span>
            </span>
          </motion.h1>

          <motion.p
            className="lx-hero-sub"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.18 }}
          >
            Seven specialist AI agents capture, link, recall and plan around you —
            so every idea, conversation and decision is one question away. Forever.
          </motion.p>

          <motion.div
            className="lx-hero-ctas"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28 }}
          >
            <button onClick={() => navigate('/login?mode=signup')} className="lx-pill-primary lx-pill-lg">
              <Sparkles size={14} /><span>Start free — no card</span>
            </button>
            <button onClick={() => navigate('/login')} className="lx-pill-ghost lx-pill-lg">
              <span>Sign in</span><ArrowRight size={14} />
            </button>
          </motion.div>

          <motion.div
            className="lx-hero-trust"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.42 }}
          >
            <div className="lx-trust-avatars">
              {['M', 'D', 'A', 'S', 'P'].map((l, i) => (
                <div key={l} className="lx-trust-avatar" style={{ ['--i' as any]: i }}>{l}</div>
              ))}
            </div>
            <div className="lx-trust-meta">
              <div className="lx-trust-stars">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} size={11} fill="#fbbf24" stroke="none" />)}
                <span className="lx-trust-rating">4.9</span>
              </div>
              <div className="lx-trust-text">2,400+ thinkers · loved by founders, researchers & operators</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── PRODUCT MOCKUP — the hero's "wow" ───────────────────── */}
      <section className="lx-mockup-section">
        <motion.div
          className="lx-mockup-wrap"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <div className="lx-mockup-glow" />
          <div className="lx-mockup">
            {/* Mockup chrome */}
            <div className="lx-mock-chrome">
              <span className="lx-mock-dot" style={{ background: '#ff5f57' }} />
              <span className="lx-mock-dot" style={{ background: '#febc2e' }} />
              <span className="lx-mock-dot" style={{ background: '#28c840' }} />
              <div className="lx-mock-url">recall x247 · second brain</div>
              <div className="lx-mock-pill"><Activity size={11} /> Live</div>
            </div>

            <div className="lx-mock-body">
              {/* Sidebar */}
              <div className="lx-mock-sidebar">
                <div className="lx-mock-side-head">
                  <span className="lx-nav-logo-mark" style={{ width: 22, height: 22, borderRadius: 7 }}>
                    <Brain size={11} strokeWidth={2.4} />
                  </span>
                  <span>recall ×247</span>
                </div>
                <div className="lx-mock-side-section">Workspace</div>
                {[
                  { icon: MessageCircle, label: 'Chat', active: true },
                  { icon: Database, label: 'Memories' },
                  { icon: Network, label: 'Graph' },
                  { icon: Calendar, label: 'Briefings' },
                  { icon: Activity, label: 'Activity' },
                ].map((it, i) => {
                  const I = it.icon;
                  return (
                    <div key={i} className={`lx-mock-side-item ${it.active ? 'lx-mock-side-active' : ''}`}>
                      <I size={12} /><span>{it.label}</span>
                    </div>
                  );
                })}
                <div className="lx-mock-side-section">Agents · 7</div>
                <div className="lx-mock-agent-dots">
                  {AGENTS.map(a => (
                    <span key={a.name} className="lx-mock-agent-dot" style={{ background: a.color, boxShadow: `0 0 6px ${a.color}` }} title={a.name} />
                  ))}
                </div>
              </div>

              {/* Main: chat */}
              <div className="lx-mock-main">
                <div className="lx-mock-main-head">
                  <div className="lx-mock-thread">
                    <Hexagon size={11} />
                    <span>Strategy thread · today</span>
                  </div>
                  <div className="lx-mock-status">
                    <span className="lx-mock-status-dot" />
                    <span>3 agents working · 412 ms</span>
                  </div>
                </div>
                <div className="lx-mock-chat">
                  {CHAT_SCRIPT.slice(0, chatStep).map((m, i) => (
                    <motion.div
                      key={i}
                      className={`lx-mock-msg lx-mock-msg-${m.role}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35 }}
                    >
                      {m.role === 'ai' && (
                        <span className="lx-mock-msg-avatar"><Brain size={11} /></span>
                      )}
                      <div className="lx-mock-msg-bubble">
                        {m.text}
                        {m.role === 'ai' && i === chatStep - 1 && (
                          <span className="lx-mock-cursor" />
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="lx-mock-input">
                  <span className="lx-mock-input-prompt">Ask your second brain…</span>
                  <span className="lx-mock-input-send"><Send size={11} /></span>
                </div>
              </div>

              {/* Right rail */}
              <div className="lx-mock-rail">
                <div className="lx-mock-card">
                  <div className="lx-mock-card-head">
                    <Sparkles size={11} style={{ color: '#fbbf24' }} />
                    <span>Today's brief</span>
                  </div>
                  <div className="lx-mock-card-body">
                    <div className="lx-mock-bar"><span style={{ width: '82%' }} /></div>
                    <div className="lx-mock-bar"><span style={{ width: '64%' }} /></div>
                    <div className="lx-mock-bar"><span style={{ width: '91%' }} /></div>
                  </div>
                </div>
                <div className="lx-mock-card">
                  <div className="lx-mock-card-head">
                    <Network size={11} style={{ color: '#f472b6' }} />
                    <span>Graph · live</span>
                  </div>
                  <MiniGraph />
                </div>
                <div className="lx-mock-card">
                  <div className="lx-mock-card-head">
                    <TrendingUp size={11} style={{ color: '#34d399' }} />
                    <span>This week</span>
                  </div>
                  <div className="lx-mock-stat">
                    <span className="lx-mock-stat-val">+218</span>
                    <span className="lx-mock-stat-lbl">new memories</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      </section>

      {/* ── LOGO BAR ─────────────────────────────────────────────── */}
      <section className="lx-logobar">
        <div className="lx-logobar-label">Trusted by teams shipping at companies like</div>
        <div className="lx-logobar-row">
          {LOGOS.map(name => <span key={name} className="lx-logo">{name}</span>)}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section id="how" className="lx-section">
        <SectionHeader
          eyebrow="How it works"
          title={<>From scattered notes to <span className="lx-grad-silver">a thinking partner</span> — in three moves.</>}
          sub="No setup ceremony. No wikis. Just capture and ask."
        />
        <div className="lx-how-grid">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                className="lx-how-card"
                style={{ ['--accent' as any]: step.accent }}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <div className="lx-how-num">{step.step}</div>
                <div className="lx-how-icon"><Icon size={20} /></div>
                <h3 className="lx-how-title">{step.title}</h3>
                <p className="lx-how-desc">{step.desc}</p>
                <div className="lx-how-samples">
                  {step.samples.map((s, j) => (
                    <motion.div
                      key={j}
                      className="lx-how-sample"
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 + 0.3 + j * 0.08 }}
                    >
                      {s}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── 7 AGENTS BENTO ───────────────────────────────────────── */}
      <section id="agents" className="lx-section">
        <SectionHeader
          eyebrow="The team behind the magic"
          title={<>Seven specialist agents. <span className="lx-grad-silver">One quiet symphony.</span></>}
          sub="Each agent is great at exactly one thing. Together, they think with you."
        />
        <div className="lx-agents-grid">
          {AGENTS.map((a, i) => {
            const Icon = a.icon;
            return (
              <motion.div
                key={a.name}
                className="lx-agent-card"
                style={{ ['--accent' as any]: a.color }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.06 }}
              >
                <div className="lx-agent-glow" />
                <div className="lx-agent-icon"><Icon size={18} /></div>
                <div className="lx-agent-name">{a.name}</div>
                <div className="lx-agent-tag">{a.tagline}</div>
                <p className="lx-agent-desc">{a.desc}</p>
                <div className="lx-agent-pulse">
                  <span className="lx-agent-pulse-dot" />
                  <span>online</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── KNOWLEDGE GRAPH SHOWCASE ─────────────────────────────── */}
      <section className="lx-section">
        <div className="lx-graph-wrap">
          <div className="lx-graph-text">
            <div className="lx-eyebrow">
              <span className="lx-eyebrow-dot" />
              The living graph
            </div>
            <h2 className="lx-section-title" style={{ margin: '14px 0 16px' }}>
              Watch your second brain <span className="lx-grad-silver">wire itself.</span>
            </h2>
            <p className="lx-section-sub" style={{ marginBottom: 24 }}>
              Every memory becomes a node. Every concept becomes an edge. The Graph Agent
              quietly stitches your knowledge together so connections you'd never spot
              surface on their own.
            </p>
            <div className="lx-graph-stats">
              <div className="lx-graph-stat">
                <div className="lx-graph-stat-v">14,892</div>
                <div className="lx-graph-stat-l">Nodes wired</div>
              </div>
              <div className="lx-graph-stat">
                <div className="lx-graph-stat-v">38,217</div>
                <div className="lx-graph-stat-l">Edges drawn</div>
              </div>
              <div className="lx-graph-stat">
                <div className="lx-graph-stat-v">412</div>
                <div className="lx-graph-stat-l">Clusters formed</div>
              </div>
            </div>
          </div>
          <div className="lx-graph-canvas-wrap">
            <BigGraph />
          </div>
        </div>
      </section>

      {/* ── USE CASES / PERSONAS ─────────────────────────────────── */}
      <section id="use" className="lx-section">
        <SectionHeader
          eyebrow="Built for the way you think"
          title={<>One brain, <span className="lx-grad-silver">three thinkers.</span></>}
          sub="Whether you're shipping product, doing research, or running ops — your second brain adapts."
        />
        <div className="lx-persona-wrap">
          <div className="lx-persona-tabs">
            {PERSONAS.map((p, i) => {
              const I = p.icon;
              return (
                <button
                  key={p.name}
                  onClick={() => setActivePersona(i)}
                  className={`lx-persona-tab ${i === activePersona ? 'lx-persona-tab-active' : ''}`}
                  style={{ ['--accent' as any]: p.color }}
                >
                  <I size={15} />
                  <span>{p.name}</span>
                </button>
              );
            })}
          </div>
          <div className="lx-persona-card" style={{ ['--accent' as any]: PERSONAS[activePersona].color }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activePersona}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.45 }}
                className="lx-persona-content"
              >
                <div className="lx-persona-icon">
                  {(() => { const I = PERSONAS[activePersona].icon; return <I size={26} />; })()}
                </div>
                <div className="lx-persona-name">{PERSONAS[activePersona].name}</div>
                <p className="lx-persona-promise">{PERSONAS[activePersona].promise}</p>
                <ul className="lx-persona-bullets">
                  {PERSONAS[activePersona].bullets.map((b, i) => (
                    <li key={i}><Check size={13} /> {b}</li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <section className="lx-section lx-section-tight">
        <div className="lx-bigstats">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              className="lx-bigstat"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <div className="lx-bigstat-v">{s.value}</div>
              <div className="lx-bigstat-l">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── COMPARISON TABLE ─────────────────────────────────────── */}
      <section className="lx-section">
        <SectionHeader
          eyebrow="Why Recall X247"
          title={<>The fastest path from <span className="lx-grad-silver">capture to clarity.</span></>}
        />
        <div className="lx-compare-card">
          <div className="lx-compare-row lx-compare-head">
            <div className="lx-compare-cell">Capability</div>
            <div className="lx-compare-cell lx-compare-mine"><span className="lx-compare-mark">●</span> Recall X247</div>
            <div className="lx-compare-cell">Notion AI</div>
            <div className="lx-compare-cell">Mem</div>
          </div>
          {COMPARE.map(row => (
            <div key={row.label} className="lx-compare-row">
              <div className="lx-compare-cell lx-compare-label">{row.label}</div>
              <CompareCell value={row.recall} highlight />
              <CompareCell value={row.notion} />
              <CompareCell value={row.mem} />
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIAL WALL ─────────────────────────────────────── */}
      <section className="lx-section">
        <SectionHeader
          eyebrow="Loved out loud"
          title={<>People who think for a living, <span className="lx-grad-silver">love thinking with us.</span></>}
        />
        <div className="lx-tw">
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={i}
              className="lx-tw-card"
              style={{ ['--accent' as any]: t.tint }}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            >
              <Quote size={20} className="lx-tw-q" />
              <p className="lx-tw-quote">{t.quote}</p>
              <div className="lx-tw-meta">
                <div className="lx-tw-avatar" style={{ background: `linear-gradient(135deg, ${t.tint}, #22d3ee)` }}>{t.avatar}</div>
                <div>
                  <div className="lx-tw-name">{t.name}</div>
                  <div className="lx-tw-role">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="pricing" className="lx-section">
        <SectionHeader
          eyebrow="Pricing"
          title={<>Free to start. <span className="lx-grad-silver">Premium when ready.</span></>}
          sub="Every plan unlocks the full multi-agent system. Pay only for scale and team features."
        />
        <div className="lx-price-grid">
          <PriceCard
            name="Starter"
            price="$0"
            period="/mo"
            tag="Forever free"
            features={['All 7 agents included', '1 GB knowledge graph', '500 captures / month', 'Daily AI briefings', 'Community support']}
            cta="Get started"
            onCta={() => navigate('/login?mode=signup')}
          />
          <PriceCard
            name="Pro"
            price="$19"
            period="/mo"
            tag="Best for serious thinkers"
            features={['Unlimited captures', '50 GB knowledge graph', 'Advanced analytics', 'Custom agent workflows', 'Priority models (GPT-4o)', 'Priority support']}
            cta="Start Pro trial"
            onCta={() => navigate('/login?mode=signup')}
            featured
          />
          <PriceCard
            name="Teams"
            price="$49"
            period="/seat/mo"
            tag="For small high-output teams"
            features={['Everything in Pro', 'Shared knowledge graphs', 'Team briefings & digests', 'Admin & SSO controls', 'SOC 2 controls']}
            cta="Talk to sales"
            onCta={() => navigate('/login')}
          />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section id="faq" className="lx-section">
        <SectionHeader eyebrow="FAQ" title={<>Questions, <span className="lx-grad-silver">answered.</span></>} />
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

      {/* ── FINAL CTA ────────────────────────────────────────────── */}
      <section className="lx-section">
        <div className="lx-final-cta">
          <div className="lx-final-glow" />
          <div className="lx-final-content">
            <div className="lx-eyebrow">
              <span className="lx-eyebrow-dot" />
              Your second brain is one click away
            </div>
            <h2 className="lx-final-title">
              Stop forgetting. <span className="lx-grad-silver">Start thinking with it.</span>
            </h2>
            <p className="lx-final-sub">Free forever. Set up in 90 seconds. Scales to your whole team when you're ready.</p>
            <div className="lx-hero-ctas">
              <button onClick={() => navigate('/login?mode=signup')} className="lx-pill-primary lx-pill-lg">
                <Sparkles size={14} /><span>Start free</span>
              </button>
              <button onClick={() => navigate('/login')} className="lx-pill-ghost lx-pill-lg">
                <span>Sign in</span><ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="lx-footer">
        <div className="lx-footer-top">
          <div className="lx-footer-brand">
            <button className="lx-nav-logo" onClick={() => navigate('/')}>
              <img src="/x247-logo.png" alt="x247 AI" className="lx-brand-img" draggable={false} />
            </button>
            <p className="lx-footer-tag">Your AI-powered second brain. Multi-agent. Always on.</p>
            <div className="lx-footer-social">
              <a href="#" aria-label="Twitter"><Twitter size={15} /></a>
              <a href="#" aria-label="GitHub"><Github size={15} /></a>
              <a href="#" aria-label="LinkedIn"><Linkedin size={15} /></a>
              <a href="#" aria-label="Email"><Mail size={15} /></a>
            </div>
          </div>
          <div className="lx-footer-cols">
            <div>
              <h5>Product</h5>
              <a href="#agents">Agents</a>
              <a href="#how">How it works</a>
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
          <span className="lx-footer-meta">v3.0 · Made on Earth 🌍</span>
        </div>
      </footer>

      {/* Floating help dock */}
      <div className="lx-dock">
        <button className="lx-dock-btn" onClick={() => navigate('/login')} aria-label="Talk to us">
          <Headphones size={16} />
        </button>
      </div>
    </div>
  );
}

// ── SUB-COMPONENTS ───────────────────────────────────────────────
function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: ReactNode; sub?: string }) {
  return (
    <motion.div
      className="lx-section-header"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6 }}
    >
      <div className="lx-eyebrow">
        <span className="lx-eyebrow-dot" />{eyebrow}
      </div>
      <h2 className="lx-section-title">{title}</h2>
      {sub && <p className="lx-section-sub">{sub}</p>}
    </motion.div>
  );
}

function CompareCell({ value, highlight }: { value: string | boolean; highlight?: boolean }) {
  if (value === true) return <div className={`lx-compare-cell ${highlight ? 'lx-compare-mine' : ''}`}><Check size={15} className="lx-compare-yes" /></div>;
  if (value === false) return <div className={`lx-compare-cell ${highlight ? 'lx-compare-mine' : ''}`}><X size={15} className="lx-compare-no" /></div>;
  return <div className={`lx-compare-cell ${highlight ? 'lx-compare-mine' : ''}`}><span className="lx-compare-text">{value}</span></div>;
}

function PriceCard({
  name, price, period, tag, features, cta, onCta, featured,
}: {
  name: string; price: string; period: string; tag: string;
  features: string[]; cta: string; onCta: () => void; featured?: boolean;
}) {
  return (
    <motion.div
      className={`lx-price-card ${featured ? 'lx-price-card-feature' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5 }}
    >
      {featured && <div className="lx-price-badge">Most popular</div>}
      <div className="lx-price-name">{name}</div>
      <div className="lx-price-amount"><span>{price}</span><em>{period}</em></div>
      <div className="lx-price-tag">{tag}</div>
      <ul className="lx-price-features">
        {features.map(f => <li key={f}><Check size={13} /> {f}</li>)}
      </ul>
      <button onClick={onCta} className={`${featured ? 'lx-pill-primary' : 'lx-pill-ghost'} lx-pill-block`}>{cta}</button>
    </motion.div>
  );
}

// Mini graph for the dashboard mockup
function MiniGraph() {
  return (
    <svg viewBox="0 0 140 80" className="lx-mock-mini-graph">
      <defs>
        <radialGradient id="mgnode">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
        </radialGradient>
      </defs>
      {[
        [20, 40, 70, 20], [70, 20, 110, 35], [70, 20, 90, 60], [20, 40, 50, 65], [50, 65, 90, 60], [110, 35, 130, 55],
      ].map((l, i) => (
        <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="rgba(167,139,250,0.35)" strokeWidth="0.6" />
      ))}
      {[
        [20, 40, '#22d3ee'], [70, 20, '#a78bfa'], [110, 35, '#34d399'],
        [50, 65, '#fbbf24'], [90, 60, '#f472b6'], [130, 55, '#60a5fa'],
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n[0]} cy={n[1]} r="6" fill="url(#mgnode)" opacity="0.5" />
          <circle cx={n[0]} cy={n[1]} r="2.5" fill={n[2] as string} />
        </g>
      ))}
    </svg>
  );
}

// Big interactive-looking graph for the showcase section
function BigGraph() {
  const nodes = useMemo(() => ([
    { id: 0, x: 50, y: 50, r: 14, color: '#a78bfa', label: 'You' },
    { id: 1, x: 20, y: 25, r: 8, color: '#22d3ee' },
    { id: 2, x: 78, y: 22, r: 9, color: '#f472b6' },
    { id: 3, x: 85, y: 65, r: 7, color: '#34d399' },
    { id: 4, x: 18, y: 75, r: 8, color: '#fbbf24' },
    { id: 5, x: 50, y: 14, r: 6, color: '#60a5fa' },
    { id: 6, x: 50, y: 86, r: 6, color: '#fb7185' },
    { id: 7, x: 32, y: 50, r: 5, color: '#22d3ee' },
    { id: 8, x: 68, y: 50, r: 5, color: '#f472b6' },
    { id: 9, x: 8, y: 50, r: 4, color: '#a78bfa' },
    { id: 10, x: 92, y: 40, r: 4, color: '#34d399' },
    { id: 11, x: 38, y: 30, r: 4, color: '#60a5fa' },
    { id: 12, x: 62, y: 75, r: 4, color: '#fb7185' },
  ]), []);

  const edges = useMemo(() => ([
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
    [1, 5], [2, 5], [2, 8], [3, 8], [3, 6], [4, 7], [4, 6], [4, 9],
    [1, 9], [2, 10], [3, 10], [11, 1], [11, 5], [12, 6], [12, 8],
  ]), []);

  return (
    <div className="lx-graph-canvas">
      <div className="lx-graph-canvas-glow" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="lx-graph-svg">
        <defs>
          <radialGradient id="bgnode" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </radialGradient>
        </defs>
        {edges.map(([a, b], i) => {
          const A = nodes[a], B = nodes[b];
          return (
            <motion.line
              key={i}
              x1={A.x} y1={A.y} x2={B.x} y2={B.y}
              stroke="rgba(167,139,250,0.25)"
              strokeWidth={0.18}
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.15 + i * 0.04 }}
            />
          );
        })}
        {nodes.map((n, i) => (
          <g key={n.id}>
            <motion.circle
              cx={n.x} cy={n.y} r={n.r * 1.6}
              fill={n.color}
              opacity={0.18}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 0.18 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 + i * 0.04 }}
              style={{ transformOrigin: `${n.x}px ${n.y}px` }}
            />
            <motion.circle
              cx={n.x} cy={n.y} r={n.r * 0.45}
              fill={n.color}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 + i * 0.04 }}
              style={{ transformOrigin: `${n.x}px ${n.y}px`, filter: `drop-shadow(0 0 4px ${n.color})` }}
            />
            {n.label && (
              <motion.text
                x={n.x} y={n.y - n.r - 1.6}
                textAnchor="middle"
                fontSize="2.4"
                fill="white"
                fontWeight="600"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.9 }}
              >{n.label}</motion.text>
            )}
          </g>
        ))}
      </svg>
      <div className="lx-graph-tag lx-graph-tag-1">+ "RAG playbook" linked</div>
      <div className="lx-graph-tag lx-graph-tag-2">3 new edges</div>
      <div className="lx-graph-tag lx-graph-tag-3">cluster "GTM"</div>
    </div>
  );
}
