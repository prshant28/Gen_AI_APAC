import { useEffect, useRef, useState, useMemo, type ReactNode } from 'react';
import { motion, useScroll, useSpring, AnimatePresence, useReducedMotion, useInView } from 'framer-motion';
import {
  Brain, Sparkles, ArrowRight, Shield, Cpu, Search,
  Calendar, Layers, Star, Check, ChevronRight, Github, Twitter, Linkedin,
  Menu, X, Sun, Moon, FileText, Network, BookOpen, Activity, Database,
  Headphones, Plus, Minus, Quote, Youtube, Globe, Mail,
  Zap, Rocket, Target, Telescope, Compass, Send, MessageCircle,
  TrendingUp, Clock, Lock, Hexagon, Mic, Link2, BrainCircuit,
  FlaskConical, Wifi, BarChart3,
} from 'lucide-react';

type LandingProps = {
  navigate: (path: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
};

// ── DATA ─────────────────────────────────────────────────────────
const HERO_WORDS = ['thinks with you.', 'connects your ideas.', 'plans your week.'];

const AGENTS = [
  { icon: Layers, name: 'Orchestrator', tagline: 'Routes intent', color: '#fbbf24', desc: 'Picks the right specialist for every query and streams the answer.' },
  { icon: FileText, name: 'Capture', tagline: 'Universal ingest', color: '#38bdf8', desc: 'YouTube, web, PDFs, voice, Slack — all turned into clean memory.' },
  { icon: Search, name: 'Recall', tagline: 'Semantic memory', color: '#34d399', desc: 'Vector + reranking finds meaning, not just keywords.' },
  { icon: Network, name: 'Graph', tagline: 'Living knowledge', color: '#34d399', desc: 'Auto-links ideas, people and projects into a graph.' },
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
    accent: '#38bdf8',
  },
  {
    step: '02',
    icon: Network,
    title: 'Connect everything',
    desc: 'Graph Agent silently links new memories to old ones. Concepts, people, projects, decisions — all wired together.',
    samples: ['"RAG" → linked to 14 memories', '"Maya" → 3 new mentions', 'Cluster: GTM playbook (12)', '+ 8 new edges added'],
    accent: '#34d399',
  },
  {
    step: '03',
    icon: Compass,
    title: 'Recall instantly',
    desc: 'Ask in plain English. Orchestrator routes to the right agents and streams an answer with cited memories.',
    samples: ['→ "What did Maya say about pricing?"', '→ Found 6 memories · 0.4s', '→ Answer streamed with sources', '→ Saved to your daily brief'],
    accent: '#fbbf24',
  },
];

const PERSONAS = [
  {
    icon: Rocket,
    name: 'Founders',
    color: '#fbbf24',
    promise: 'Never lose a customer insight, investor note, or roadmap idea again.',
    bullets: ['Capture investor calls automatically', 'Daily brief of what your team shipped', 'Recall every customer conversation'],
  },
  {
    icon: Telescope,
    name: 'Researchers',
    color: '#38bdf8',
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
  { value: 1200000, display: '1.2M+', label: 'Memories captured', suffix: '' },
  { value: 98.7, display: '98.7%', label: 'Recall accuracy', suffix: '%' },
  { value: 9.4, display: '9.4h', label: 'Saved per week', suffix: 'h' },
  { value: 400, display: '< 400ms', label: 'Avg recall time', suffix: 'ms' },
];

const TESTIMONIALS = [
  { quote: 'Recall X247 replaced four apps for me. The multi-agent setup is genuinely magical — like having a team of researchers on call 24/7.', name: 'Maya Rodriguez', role: 'Founder, Lumen Labs', avatar: 'MR', tint: '#fbbf24' },
  { quote: 'The daily briefings are wild. It surfaces connections between ideas I forgot I had. Felt like cheating my way to a research PhD.', name: 'Aisha Patel', role: 'Independent researcher', avatar: 'AP', tint: '#34d399' },
  { quote: 'I used to lose 2 hours a day searching old notes. Now I just ask the Orchestrator and it pulls the exact memory in seconds.', name: 'Daniel Park', role: 'Sr. PM at Stripe', avatar: 'DP', tint: '#38bdf8' },
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

const TERMINAL_LOGS = [
  { time: '09:41:03', agent: 'Orchestrator', text: 'Query: "What did Maya say about pricing?"', color: '#fbbf24', bg: 'rgba(167,139,250,0.12)' },
  { time: '09:41:03', agent: 'Recall', text: 'Searching 2,847 memories for "Maya pricing"…', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  { time: '09:41:04', agent: 'Recall', text: '6 memories found · semantic score 0.94', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  { time: '09:41:04', agent: 'Graph', text: 'Loading memory edges → 14 connected nodes', color: '#34d399', bg: 'rgba(244,114,182,0.1)' },
  { time: '09:41:04', agent: 'Orchestrator', text: 'Synthesising with 6 citation anchors…', color: '#fbbf24', bg: 'rgba(167,139,250,0.12)' },
  { time: '09:41:05', agent: 'Briefing', text: 'Flagged for today\'s brief · added to context', color: '#fb7185', bg: 'rgba(251,113,133,0.1)' },
  { time: '09:41:05', agent: 'Planner', text: 'Scheduling follow-up · Mon 9am deep-work', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  { time: '09:41:05', agent: 'Orchestrator', text: '✓ Done · 0.41s · 6 citations · 3 agents', color: '#fbbf24', bg: 'rgba(167,139,250,0.12)' },
];

const TERMINAL_FEATS = [
  { icon: Zap, label: 'Sub-500ms end-to-end orchestration', detail: '0.41s avg', color: '#fbbf24' },
  { icon: Network, label: 'Real-time knowledge graph updates', detail: 'live edges', color: '#34d399' },
  { icon: Shield, label: 'Zero data leakage — private by design', detail: 'encrypted', color: '#60a5fa' },
  { icon: Activity, label: 'Streaming SSE — words as they generate', detail: 'SSE stream', color: '#34d399' },
];

const LIVE_FEED = [
  { icon: Mic, text: 'Voice memo captured', meta: '0.3s · Orchestrator', color: '#fbbf24' },
  { icon: Youtube, text: 'YouTube lecture parsed', meta: '12s · 47 memories', color: '#fb7185' },
  { icon: FileText, text: 'PDF strategy doc ingested', meta: '2.1s · 28 memories', color: '#38bdf8' },
  { icon: Link2, text: 'Article linked to 8 memories', meta: '0.8s · Graph Agent', color: '#34d399' },
  { icon: MessageCircle, text: 'Slack thread summarized', meta: '1.4s · 12 memories', color: '#fbbf24' },
  { icon: Globe, text: 'Web research captured', meta: '3.2s · 19 memories', color: '#34d399' },
  { icon: Send, text: 'Email thread distilled', meta: '0.9s · 6 memories', color: '#60a5fa' },
  { icon: BrainCircuit, text: 'Knowledge cluster formed', meta: 'Graph · 34 nodes', color: '#fbbf24' },
  { icon: Zap, text: 'Daily brief generated', meta: 'Briefing Agent · 08:00', color: '#fbbf24' },
  { icon: Clock, text: 'Deep-work block scheduled', meta: 'Planner · Mon 9am', color: '#34d399' },
];

const FEATURES = [
  {
    icon: BrainCircuit, title: 'Neural memory graph', size: 'wide',
    desc: 'Every idea becomes a node. Every concept an edge. Watch your second brain wire itself in real time.',
    color: '#fbbf24', tag: 'Graph Agent',
  },
  {
    icon: Mic, title: 'Voice-first capture', size: 'tall',
    desc: 'Record a thought, get a structured memory. Works offline, syncs instantly.',
    color: '#38bdf8', tag: 'Capture Agent',
  },
  {
    icon: Zap, title: 'Sub-400ms recall', size: 'small',
    desc: 'Semantic search across every memory you\'ve ever captured.',
    color: '#34d399', tag: 'Recall Agent',
  },
  {
    icon: FlaskConical, title: 'Open model swap', size: 'small',
    desc: 'GPT-4o, Claude, local models — each agent picks the best for its job.',
    color: '#fbbf24', tag: 'Architecture',
  },
  {
    icon: BarChart3, title: 'Daily AI briefings', size: 'tall',
    desc: 'Every morning: what happened yesterday, what matters today, what you\'re forgetting.',
    color: '#fb7185', tag: 'Briefing Agent',
  },
  {
    icon: Lock, title: 'Private by design', size: 'wide',
    desc: 'Your graph never trains a model. End-to-end encrypted. Firebase Auth + SOC 2 controls.',
    color: '#60a5fa', tag: 'Guardian Agent',
  },
];

// ── COMPONENT ────────────────────────────────────────────────────
export default function Landing({ navigate, isDark, toggleTheme }: LandingProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const [chatStep, setChatStep] = useState(1);
  const [activePersona, setActivePersona] = useState(0);

  // Typewriter state
  const [wordIdx, setWordIdx] = useState(0);
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

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

  // Typewriter cycling
  useEffect(() => {
    if (reduceMotion) return;
    let timeout: ReturnType<typeof setTimeout>;
    if (phase === 'in') {
      timeout = setTimeout(() => setPhase('hold'), 350);
    } else if (phase === 'hold') {
      timeout = setTimeout(() => setPhase('out'), 1400);
    } else {
      timeout = setTimeout(() => {
        setWordIdx(i => (i + 1) % HERO_WORDS.length);
        setPhase('in');
      }, 280);
    }
    return () => clearTimeout(timeout);
  }, [phase, reduceMotion]);

  // Animate chat preview
  useEffect(() => {
    if (reduceMotion) { setChatStep(CHAT_SCRIPT.length); return; }
    const t = setInterval(() => {
      setChatStep(s => (s >= CHAT_SCRIPT.length ? 1 : s + 1));
    }, 2800);
    return () => clearInterval(t);
  }, [reduceMotion]);

  // Mobile menu keyboard
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
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
      <section className="lx-hero">
        <NeuralCanvas />
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
            <span className="lx-hero-line">The second brain that</span>
            <span className="lx-hero-line lx-hero-line-animated">
              <AnimatePresence mode="wait">
                <motion.span
                  key={wordIdx}
                  className="lx-hero-word"
                  initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -14, filter: 'blur(6px)' }}
                  transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
                >
                  {HERO_WORDS[wordIdx]}
                </motion.span>
              </AnimatePresence>
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

          {/* Live stats ticker */}
          <motion.div
            className="lx-hero-ticker"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.55 }}
          >
            {[
              { val: '1.2M+', lbl: 'memories' },
              { val: '< 400ms', lbl: 'recall' },
              { val: '7', lbl: 'agents' },
              { val: '98.7%', lbl: 'accuracy' },
            ].map((s, i) => (
              <div key={i} className="lx-hero-tick">
                <span className="lx-hero-tick-val">{s.val}</span>
                <span className="lx-hero-tick-lbl">{s.lbl}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── PRODUCT MOCKUP ───────────────────────────────────────── */}
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
            <div className="lx-mock-chrome">
              <span className="lx-mock-dot" style={{ background: '#ff5f57' }} />
              <span className="lx-mock-dot" style={{ background: '#febc2e' }} />
              <span className="lx-mock-dot" style={{ background: '#28c840' }} />
              <div className="lx-mock-url">recall x247 · second brain</div>
              <div className="lx-mock-pill"><Activity size={11} /> Live</div>
            </div>

            <div className="lx-mock-body">
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
                <div className="lx-mock-input-bar">
                  <div className="lx-mock-input"><span className="lx-mock-input-placeholder">Ask your second brain…</span></div>
                  <button className="lx-mock-send"><Send size={11} /></button>
                </div>
              </div>

              <div className="lx-mock-right">
                <div className="lx-mock-card">
                  <div className="lx-mock-card-head">
                    <Cpu size={11} style={{ color: '#fbbf24' }} />
                    <span>Agents · active</span>
                  </div>
                  <div className="lx-mock-agents-mini">
                    {AGENTS.slice(0, 4).map(a => (
                      <div key={a.name} className="lx-mock-agent-row">
                        <span style={{ color: a.color, width: 8, height: 8, borderRadius: '50%', background: a.color, display: 'inline-block', boxShadow: `0 0 5px ${a.color}`, flexShrink: 0 }} />
                        <span className="lx-mock-agent-label">{a.name}</span>
                        <div className="lx-mock-bar"><span style={{ width: `${60 + Math.random() * 35}%` }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lx-mock-card">
                  <div className="lx-mock-card-head">
                    <Network size={11} style={{ color: '#34d399' }} />
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

      {/* ── LIVE ACTIVITY FEED ───────────────────────────────────── */}
      <section className="lx-feed-section">
        <div className="lx-feed-label">
          <span className="lx-feed-dot" />
          <span>Live intelligence feed — memories being captured right now</span>
        </div>
        <div className="lx-feed-track-wrap">
          <div className="lx-feed-fade lx-feed-fade-l" />
          <div className="lx-feed-track">
            <div className="lx-feed-row">
              {[...LIVE_FEED, ...LIVE_FEED].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="lx-feed-item" style={{ ['--fc' as any]: item.color }}>
                    <span className="lx-feed-icon"><Icon size={13} /></span>
                    <span className="lx-feed-text">{item.text}</span>
                    <span className="lx-feed-meta">{item.meta}</span>
                  </div>
                );
              })}
            </div>
            <div className="lx-feed-row lx-feed-row-rev">
              {[...LIVE_FEED.slice(5), ...LIVE_FEED.slice(0, 5), ...LIVE_FEED.slice(5), ...LIVE_FEED.slice(0, 5)].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="lx-feed-item" style={{ ['--fc' as any]: item.color }}>
                    <span className="lx-feed-icon"><Icon size={13} /></span>
                    <span className="lx-feed-text">{item.text}</span>
                    <span className="lx-feed-meta">{item.meta}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="lx-feed-fade lx-feed-fade-r" />
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

      {/* ── FEATURE BENTO GRID ───────────────────────────────────── */}
      <section className="lx-section">
        <SectionHeader
          eyebrow="Built different"
          title={<>Every feature is a <span className="lx-grad-silver">specialist agent.</span></>}
          sub="Not a plugin. Not a wrapper. A coordinated intelligence system."
        />
        <div className="lx-bento">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className={`lx-bento-card lx-bento-${f.size}`}
                style={{ ['--accent' as any]: f.color }}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.55, delay: i * 0.07 }}
              >
                <div className="lx-bento-glow" />
                <div className="lx-bento-tag">{f.tag}</div>
                <div className="lx-bento-icon"><Icon size={22} /></div>
                <h3 className="lx-bento-title">{f.title}</h3>
                <p className="lx-bento-desc">{f.desc}</p>
                <div className="lx-bento-accent-line" />
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

      {/* ── INTELLIGENCE TERMINAL ────────────────────────────────── */}
      <section className="lx-section">
        <div className="lx-terminal-wrap">
          <motion.div
            className="lx-terminal-text"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <div className="lx-eyebrow"><span className="lx-eyebrow-dot" />Inside the machine</div>
            <h2 className="lx-section-title" style={{ textAlign: 'left', fontSize: 'clamp(28px, 3.8vw, 52px)' }}>
              Watch your agents <span className="lx-grad-silver">think out loud.</span>
            </h2>
            <p>Every query routes through a real-time orchestration layer — seven specialists coordinate in under 500ms, so you get answers, not interfaces.</p>
            <div className="lx-terminal-feat">
              {TERMINAL_FEATS.map((f, i) => {
                const Icon = f.icon;
                return (
                  <div key={i} className="lx-terminal-feat-row" style={{ ['--fc' as any]: f.color }}>
                    <span className="lx-terminal-feat-icon"><Icon size={14} /></span>
                    <span>{f.label}</span>
                    <em>{f.detail}</em>
                  </div>
                );
              })}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
          >
            <TerminalDemo />
          </motion.div>
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

      {/* ── STATS ─────────────────────────────────────────────────── */}
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
              <CountUp display={s.display} className="lx-bigstat-v" />
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

      {/* ── TESTIMONIAL MARQUEE ──────────────────────────────────── */}
      <section className="lx-section lx-section-tight">
        <SectionHeader
          eyebrow="Loved out loud"
          title={<>People who think for a living, <span className="lx-grad-silver">love thinking with us.</span></>}
        />
        <div className="lx-tmarquee-wrap">
          <div className="lx-tmarquee-fade lx-tmarquee-fade-l" />
          <div className="lx-tmarquee-fade lx-tmarquee-fade-r" />
          {/* Row 1 → left */}
          <div className="lx-tmarquee-row">
            <div className="lx-tmarquee-track">
              {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                <div key={i} className="lx-tmarquee-card" style={{ ['--accent' as any]: t.tint }}>
                  <Quote size={16} className="lx-tw-q" />
                  <p className="lx-tmarquee-quote">{t.quote}</p>
                  <div className="lx-tw-meta">
                    <div className="lx-tw-avatar" style={{ background: `linear-gradient(135deg, ${t.tint}, #22d3ee)` }}>{t.avatar}</div>
                    <div>
                      <div className="lx-tw-name">{t.name}</div>
                      <div className="lx-tw-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Row 2 → right */}
          <div className="lx-tmarquee-row lx-tmarquee-row-rev">
            <div className="lx-tmarquee-track">
              {[...TESTIMONIALS.slice(3), ...TESTIMONIALS.slice(0, 3), ...TESTIMONIALS.slice(3), ...TESTIMONIALS.slice(0, 3)].map((t, i) => (
                <div key={i} className="lx-tmarquee-card" style={{ ['--accent' as any]: t.tint }}>
                  <Quote size={16} className="lx-tw-q" />
                  <p className="lx-tmarquee-quote">{t.quote}</p>
                  <div className="lx-tw-meta">
                    <div className="lx-tw-avatar" style={{ background: `linear-gradient(135deg, ${t.tint}, #22d3ee)` }}>{t.avatar}</div>
                    <div>
                      <div className="lx-tw-name">{t.name}</div>
                      <div className="lx-tw-role">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
          <div className="lx-final-orb lx-final-orb-1" />
          <div className="lx-final-orb lx-final-orb-2" />
          <div className="lx-final-content">
            <div className="lx-eyebrow">
              <span className="lx-eyebrow-dot" />
              Your second brain is one click away
            </div>
            <h2 className="lx-final-title">
              Stop forgetting.<br /><span className="lx-final-grad">Start thinking with it.</span>
            </h2>
            <p className="lx-final-sub">Free forever. Set up in 90 seconds. Scales to your whole team when you're ready.</p>
            <div className="lx-hero-ctas">
              <button onClick={() => navigate('/login?mode=signup')} className="lx-pill-primary lx-pill-lg">
                <Sparkles size={14} /><span>Start free — no card</span>
              </button>
              <button onClick={() => navigate('/login')} className="lx-pill-ghost lx-pill-lg">
                <span>Sign in</span><ArrowRight size={14} />
              </button>
            </div>
            <div className="lx-final-badges">
              <span className="lx-final-badge"><Check size={11} /> No credit card</span>
              <span className="lx-final-badge"><Check size={11} /> 90-second setup</span>
              <span className="lx-final-badge"><Check size={11} /> Cancel anytime</span>
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

function CountUp({ display, className }: { display: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (inView && !shown) setShown(true);
  }, [inView]);
  return (
    <div ref={ref} className={className}>
      <AnimatePresence mode="wait">
        <motion.span
          key={shown ? 'final' : 'init'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {display}
        </motion.span>
      </AnimatePresence>
    </div>
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

// ── NEURAL CANVAS ────────────────────────────────────────────────
function NeuralCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animId: number;

    const resize = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      ctx.scale(ratio, ratio);
    };
    resize();
    window.addEventListener('resize', resize);

    const COLORS = ['#fbbf24', '#38bdf8', '#34d399', '#34d399', '#fbbf24', '#60a5fa'];
    const pts = Array.from({ length: 60 }, () => ({
      x: Math.random() * (canvas.offsetWidth || 900),
      y: Math.random() * (canvas.offsetHeight || 600),
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.6 + 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    const draw = () => {
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(167,139,250,${(1 - d / 120) * 0.13})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '55';
        ctx.fill();
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [reduceMotion]);

  return <canvas ref={canvasRef} className="lx-neural-canvas" />;
}

// ── TERMINAL DEMO ─────────────────────────────────────────────────
function TerminalDemo() {
  const [visibleLines, setVisibleLines] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: '-120px' });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCycle = () => {
    setVisibleLines(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      i++;
      setVisibleLines(i);
      if (i >= TERMINAL_LOGS.length) {
        clearInterval(timerRef.current!);
        timerRef.current = setTimeout(() => startCycle(), 2800) as unknown as ReturnType<typeof setInterval>;
      }
    }, 620);
  };

  useEffect(() => {
    if (inView) startCycle();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [inView]);

  return (
    <div ref={ref} className="lx-terminal-box">
      <div className="lx-terminal-chrome">
        <div className="lx-terminal-dots">
          <span style={{ background: '#ff5f57' }} />
          <span style={{ background: '#febc2e' }} />
          <span style={{ background: '#28c840' }} />
        </div>
        <div className="lx-terminal-title">agent-orchestrator · live</div>
        <div className="lx-terminal-live">
          <span className="lx-terminal-live-dot" />
          active
        </div>
      </div>
      <div className="lx-terminal-body">
        {TERMINAL_LOGS.slice(0, visibleLines).map((log, i) => (
          <motion.div
            key={`${i}-${visibleLines}`}
            className="lx-terminal-line"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
          >
            <span className="lx-terminal-line-time">{log.time}</span>
            <span className="lx-terminal-line-agent" style={{ color: log.color, background: log.bg }}>
              {log.agent}
            </span>
            <span className="lx-terminal-line-text">
              {log.text}
              {i === visibleLines - 1 && <span className="lx-terminal-cursor" />}
            </span>
          </motion.div>
        ))}
        {visibleLines === 0 && (
          <div className="lx-terminal-line">
            <span className="lx-terminal-line-time">—</span>
            <span className="lx-terminal-line-text" style={{ color: 'var(--lx-text-3)' }}>
              Waiting for query<span className="lx-terminal-cursor" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

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
        [20, 40, '#38bdf8'], [70, 20, '#fbbf24'], [110, 35, '#34d399'],
        [50, 65, '#fbbf24'], [90, 60, '#34d399'], [130, 55, '#60a5fa'],
      ].map((n, i) => (
        <g key={i}>
          <circle cx={n[0]} cy={n[1]} r="6" fill="url(#mgnode)" opacity="0.5" />
          <circle cx={n[0]} cy={n[1]} r="2.5" fill={n[2] as string} />
        </g>
      ))}
    </svg>
  );
}

function BigGraph() {
  const nodes = useMemo(() => ([
    { id: 0, x: 50, y: 50, r: 14, color: '#fbbf24', label: 'You' },
    { id: 1, x: 20, y: 25, r: 8, color: '#38bdf8' },
    { id: 2, x: 78, y: 22, r: 9, color: '#34d399' },
    { id: 3, x: 85, y: 65, r: 7, color: '#34d399' },
    { id: 4, x: 18, y: 75, r: 8, color: '#fbbf24' },
    { id: 5, x: 50, y: 14, r: 6, color: '#60a5fa' },
    { id: 6, x: 50, y: 86, r: 6, color: '#fb7185' },
    { id: 7, x: 32, y: 50, r: 5, color: '#38bdf8' },
    { id: 8, x: 68, y: 50, r: 5, color: '#34d399' },
    { id: 9, x: 8, y: 50, r: 4, color: '#fbbf24' },
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
