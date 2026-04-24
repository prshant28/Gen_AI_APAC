import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Brain, Sparkles, ArrowRight, Zap, Shield, Cpu, Search,
  Calendar, BarChart3, MessageSquare, Layers, Lock, Globe,
  Star, Check, ChevronRight, Play, Github, Twitter, Linkedin,
  Menu, X, Sun, Moon, FileText, Youtube, Network, BookOpen, Mic, Clock,
} from 'lucide-react';

type LandingProps = {
  navigate: (path: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
};

const AGENTS = [
  { icon: Layers, name: 'Orchestrator', desc: 'Routes requests to the right agents in real time', color: '#8b5cf6' },
  { icon: FileText, name: 'Capture Agent', desc: 'Captures from YouTube, web, PDFs, voice & notes', color: '#06b6d4' },
  { icon: Search, name: 'Recall Agent', desc: 'Semantic search across your entire memory graph', color: '#10b981' },
  { icon: Check, name: 'Task Agent', desc: 'Turns insights into prioritized action items', color: '#f59e0b' },
  { icon: Calendar, name: 'Calendar Agent', desc: 'Schedules deep work and study sessions', color: '#ec4899' },
  { icon: MessageSquare, name: 'Briefing Agent', desc: 'Personalized AI summaries every morning', color: '#6366f1' },
  { icon: BarChart3, name: 'Analytics Agent', desc: 'Tracks patterns in how you learn and think', color: '#ef4444' },
];

const FEATURES = [
  { icon: Brain, title: 'Semantic Recall', desc: 'Find anything you ever captured by meaning, not keywords. Powered by vector embeddings.' },
  { icon: Cpu, title: '7 Specialist Agents', desc: 'A multi-agent system orchestrates capture, recall, planning, and briefings for you.' },
  { icon: Network, title: 'Knowledge Graph', desc: 'Your ideas auto-link into a living graph that grows smarter with every memory.' },
  { icon: Youtube, title: 'Universal Capture', desc: 'YouTube transcripts, web pages, PDFs, voice notes — all become searchable knowledge.' },
  { icon: BookOpen, title: 'Daily Briefings', desc: 'Wake up to an AI-curated summary of what matters most across your second brain.' },
  { icon: Shield, title: 'Privacy First', desc: 'Bank-grade auth, encryption in transit, your data is never used to train models.' },
];

const STEPS = [
  { num: '01', title: 'Capture anything', desc: 'Drop in a YouTube link, paste text, upload a PDF, or speak. Our agents ingest and structure it instantly.' },
  { num: '02', title: 'Let agents organize', desc: 'The Capture, Knowledge Graph and Analytics agents auto-tag, link, and embed everything for instant recall.' },
  { num: '03', title: 'Recall & act', desc: 'Ask the Orchestrator anything. It dispatches to specialist agents, streams answers, and turns them into tasks.' },
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
  { q: 'How is this different from Notion or Mem?', a: 'Recall X247 is multi-agent first. Instead of a single chatbot or wiki, seven specialist AIs coordinate to capture, link, recall, plan, and brief you.' },
  { q: 'Where is my data stored?', a: 'Your knowledge lives in a private graph tied to your account. Auth runs through Firebase; transit is encrypted. Your data is never used to train models.' },
  { q: 'Which models power the agents?', a: 'GPT-4o-mini via OpenRouter today, with Anthropic and local-model swap-in coming soon. Each agent picks the best model for its job.' },
  { q: 'Is there a free tier?', a: 'Yes — all core capture, recall, and agent features are free forever. Premium tiers unlock advanced analytics, longer context, and team workspaces.' },
];

export default function Landing({ navigate, isDark, toggleTheme }: LandingProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setActiveTestimonial(i => (i + 1) % TESTIMONIALS.length), 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="landing-page">
      {/* Background layers */}
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-bg-grid" />
        <div className="landing-bg-glow landing-bg-glow-1" />
        <div className="landing-bg-glow landing-bg-glow-2" />
        <div className="landing-bg-glow landing-bg-glow-3" />
        <div className="landing-bg-grain" />
      </div>

      {/* Navbar */}
      <header className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="landing-nav-inner">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="landing-nav-logo">
            <div className="landing-nav-logo-mark">
              <Brain size={18} />
            </div>
            <div className="landing-nav-logo-text">
              <span className="landing-nav-logo-name">Recall<span className="landing-nav-logo-x">X247</span></span>
              <span className="landing-nav-logo-sub">NEURAL OS · v3.0</span>
            </div>
          </button>

          <nav className="landing-nav-links">
            <a href="#platform">Platform</a>
            <a href="#agents">Agents</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="landing-nav-actions">
            <button onClick={toggleTheme} className="landing-nav-theme" aria-label="Toggle theme">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => navigate('/login')} className="landing-nav-signin">Sign in</button>
            <button onClick={() => navigate('/login?mode=signup')} className="landing-nav-cta">
              <span>Get Started</span>
              <ArrowRight size={14} />
            </button>
            <button onClick={() => setMobileMenuOpen(true)} className="landing-nav-burger" aria-label="Menu">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="landing-mobile-menu"
          >
            <button onClick={() => setMobileMenuOpen(false)} className="landing-mobile-close" aria-label="Close">
              <X size={24} />
            </button>
            {['platform', 'agents', 'features', 'pricing', 'faq'].map(s => (
              <a key={s} href={`#${s}`} onClick={() => setMobileMenuOpen(false)}>{s}</a>
            ))}
            <button onClick={() => { setMobileMenuOpen(false); navigate('/login'); }} className="landing-mobile-cta">
              Sign in
            </button>
            <button onClick={() => { setMobileMenuOpen(false); navigate('/login?mode=signup'); }} className="landing-nav-cta">
              <span>Get Started</span><ArrowRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="landing-hero"
        id="platform"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="landing-hero-eyebrow"
        >
          <span className="landing-hero-eyebrow-dot" />
          <span>Neural AI v3.0 — Now live with multi-agent workflows</span>
          <ChevronRight size={14} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="landing-hero-title"
        >
          Your AI-powered
          <br />
          <span className="landing-hero-title-grad">Second Brain</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="landing-hero-sub"
        >
          Capture anything. Recall instantly. A team of seven specialist AI agents
          quietly organizes your knowledge so you can think clearer, decide faster,
          and never lose an idea again.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="landing-hero-actions"
        >
          <button onClick={() => navigate('/login?mode=signup')} className="landing-cta-primary group">
            <span className="landing-cta-shine" />
            <span className="relative z-[2]">Start free</span>
            <ArrowRight size={16} className="relative z-[2] landing-cta-arrow" />
          </button>
          <button onClick={() => navigate('/login')} className="landing-cta-secondary">
            <Play size={14} fill="currentColor" />
            <span>Watch demo</span>
          </button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="landing-hero-trust"
        >
          <div className="landing-hero-trust-avatars">
            {['P','D','A','S','R'].map((c, i) => (
              <div key={c} className="landing-hero-trust-avatar" style={{
                background: `linear-gradient(135deg, ${['#8b5cf6','#06b6d4','#10b981','#f59e0b','#ec4899'][i]}, ${['#6366f1','#0891b2','#059669','#d97706','#db2777'][i]})`,
                zIndex: 5 - i,
              }}>{c}</div>
            ))}
          </div>
          <div className="landing-hero-trust-text">
            <div className="landing-hero-trust-stars">
              {[...Array(5)].map((_, i) => <Star key={i} size={12} fill="currentColor" />)}
            </div>
            <span>2,400+ professionals · trusted by founders & operators</span>
          </div>
        </motion.div>

        {/* Hero visual: floating agent cards */}
        <motion.div
          initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.7 }}
          className="landing-hero-visual"
        >
          <div className="landing-hero-orbital">
            <div className="landing-hero-core">
              <Brain size={48} />
              <div className="landing-hero-core-glow" />
            </div>

            {AGENTS.slice(0, 7).map((agent, i) => {
              const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
              const radius = 220;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const Icon = agent.icon;
              return (
                <motion.div
                  key={agent.name}
                  className="landing-hero-agent"
                  style={{
                    left: `calc(50% + ${x}px - 28px)`,
                    top: `calc(50% + ${y}px - 28px)`,
                    boxShadow: `0 0 40px ${agent.color}33, 0 0 0 1px ${agent.color}55`,
                  }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 3 + i * 0.3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }}
                >
                  <Icon size={20} style={{ color: agent.color }} />
                </motion.div>
              );
            })}

            {/* Connection lines (SVG) */}
            <svg className="landing-hero-lines" viewBox="-300 -300 600 600">
              {AGENTS.slice(0, 7).map((_, i) => {
                const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(angle) * 220;
                const y = Math.sin(angle) * 220;
                return (
                  <line key={i} x1="0" y1="0" x2={x} y2={y}
                    stroke="url(#linegrad)" strokeWidth="1" opacity="0.35" />
                );
              })}
              <defs>
                <linearGradient id="linegrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </motion.div>
      </motion.section>

      {/* LOGOS / TRUST STRIP */}
      <section className="landing-strip">
        <div className="landing-strip-label">Trusted by teams shipping at</div>
        <div className="landing-strip-logos">
          {['STRIPE', 'VERCEL', 'LINEAR', 'NOTION', 'FIGMA', 'GITHUB'].map(b => (
            <div key={b} className="landing-strip-logo">{b}</div>
          ))}
        </div>
      </section>

      {/* MULTI-AGENT SECTION */}
      <section id="agents" className="landing-section">
        <SectionHeader
          eyebrow="MULTI-AGENT ARCHITECTURE"
          title={<>Seven specialist AIs<br /><span className="landing-section-grad">working in concert</span></>}
          sub="Instead of a single overloaded chatbot, Recall X247 dispatches your requests to seven purpose-built agents — each tuned to do one thing exceptionally well."
        />

        <div className="landing-agents-grid">
          {AGENTS.map((agent, i) => {
            const Icon = agent.icon;
            return (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.05 }}
                className="landing-agent-card"
                style={{ '--agent-color': agent.color } as any}
              >
                <div className="landing-agent-icon" style={{ background: `${agent.color}1a`, color: agent.color, boxShadow: `inset 0 0 0 1px ${agent.color}33` }}>
                  <Icon size={20} />
                </div>
                <h3 className="landing-agent-name">{agent.name}</h3>
                <p className="landing-agent-desc">{agent.desc}</p>
                <div className="landing-agent-glow" style={{ background: `radial-gradient(circle at 50% 0%, ${agent.color}33, transparent 60%)` }} />
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="landing-section">
        <SectionHeader
          eyebrow="WHAT YOU GET"
          title={<>Everything a knowledge worker<br /><span className="landing-section-grad">actually needs</span></>}
          sub="Not another note-taker. A complete operating system for your second brain — capture, recall, plan, and ship."
        />

        <div className="landing-features-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                className="landing-feature-card"
              >
                <div className="landing-feature-icon">
                  <Icon size={20} />
                </div>
                <h3 className="landing-feature-title">{f.title}</h3>
                <p className="landing-feature-desc">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-section">
        <SectionHeader
          eyebrow="HOW IT WORKS"
          title={<>From scattered notes to<br /><span className="landing-section-grad">a living memory in 3 steps</span></>}
        />

        <div className="landing-steps">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="landing-step"
            >
              <div className="landing-step-num">{step.num}</div>
              <h3 className="landing-step-title">{step.title}</h3>
              <p className="landing-step-desc">{step.desc}</p>
              {i < STEPS.length - 1 && <div className="landing-step-arrow"><ArrowRight size={20} /></div>}
            </motion.div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="landing-stats">
        <div className="landing-stats-grid">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="landing-stat"
            >
              <div className="landing-stat-value">{s.value}</div>
              <div className="landing-stat-label">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="landing-section">
        <SectionHeader
          eyebrow="LOVED BY THINKERS"
          title={<>Built for the way<br /><span className="landing-section-grad">your mind actually works</span></>}
        />

        <div className="landing-testimonial-wrap">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="landing-testimonial"
            >
              <div className="landing-testimonial-stars">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <blockquote className="landing-testimonial-quote">
                "{TESTIMONIALS[activeTestimonial].quote}"
              </blockquote>
              <div className="landing-testimonial-author">
                <div className="landing-testimonial-avatar">{TESTIMONIALS[activeTestimonial].avatar}</div>
                <div>
                  <div className="landing-testimonial-name">{TESTIMONIALS[activeTestimonial].name}</div>
                  <div className="landing-testimonial-role">{TESTIMONIALS[activeTestimonial].role}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="landing-testimonial-dots">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`landing-testimonial-dot ${i === activeTestimonial ? 'is-active' : ''}`}
                aria-label={`Testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="landing-section">
        <SectionHeader
          eyebrow="PRICING"
          title={<>Free forever for thinkers.<br /><span className="landing-section-grad">Pro for power users.</span></>}
        />

        <div className="landing-pricing-grid">
          <div className="landing-price-card">
            <div className="landing-price-tag">FREE</div>
            <div className="landing-price-amount">$0<span>/forever</span></div>
            <p className="landing-price-desc">Everything you need to build your second brain.</p>
            <ul className="landing-price-features">
              {['Unlimited memories', 'All 7 AI agents', 'YouTube + web + PDF capture', 'Knowledge graph', 'Daily briefings'].map(f => (
                <li key={f}><Check size={14} /> {f}</li>
              ))}
            </ul>
            <button onClick={() => navigate('/login?mode=signup')} className="landing-price-btn">
              Get started free
            </button>
          </div>

          <div className="landing-price-card landing-price-featured">
            <div className="landing-price-badge">POPULAR</div>
            <div className="landing-price-tag">PRO</div>
            <div className="landing-price-amount">$12<span>/month</span></div>
            <p className="landing-price-desc">For serious knowledge workers and researchers.</p>
            <ul className="landing-price-features">
              {['Everything in Free', 'Advanced analytics', 'Long context (1M tokens)', 'Priority models (Claude / GPT-4o)', 'Calendar integrations', 'Voice capture'].map(f => (
                <li key={f}><Check size={14} /> {f}</li>
              ))}
            </ul>
            <button onClick={() => navigate('/login?mode=signup')} className="landing-price-btn landing-price-btn-primary">
              <span className="landing-cta-shine" />
              <span className="relative z-[2]">Start 14-day trial</span>
              <ArrowRight size={14} className="relative z-[2]" />
            </button>
          </div>

          <div className="landing-price-card">
            <div className="landing-price-tag">TEAMS</div>
            <div className="landing-price-amount">Custom</div>
            <p className="landing-price-desc">Shared workspaces for teams that think together.</p>
            <ul className="landing-price-features">
              {['Everything in Pro', 'Team workspaces', 'Shared knowledge graphs', 'SSO + audit logs', 'Dedicated support', 'Custom integrations'].map(f => (
                <li key={f}><Check size={14} /> {f}</li>
              ))}
            </ul>
            <button onClick={() => navigate('/login')} className="landing-price-btn">
              Contact sales
            </button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="landing-section">
        <SectionHeader
          eyebrow="FREQUENTLY ASKED"
          title={<>Questions, answered.<br /><span className="landing-section-grad">No fluff.</span></>}
        />

        <div className="landing-faq">
          {FAQ.map((item, i) => (
            <div key={item.q} className={`landing-faq-item ${openFaq === i ? 'is-open' : ''}`}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="landing-faq-q">
                <span>{item.q}</span>
                <ChevronRight size={18} className="landing-faq-chevron" />
              </button>
              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="landing-faq-a-wrap"
                  >
                    <p className="landing-faq-a">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="landing-final-cta">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="landing-final-card"
        >
          <Sparkles className="landing-final-icon" size={28} />
          <h2 className="landing-final-title">
            Stop forgetting.<br />
            <span className="landing-section-grad">Start recalling.</span>
          </h2>
          <p className="landing-final-sub">
            Join 2,400+ founders, operators and researchers building their second brain with Recall X247.
          </p>
          <div className="landing-final-actions">
            <button onClick={() => navigate('/login?mode=signup')} className="landing-cta-primary group">
              <span className="landing-cta-shine" />
              <span className="relative z-[2]">Get started — it's free</span>
              <ArrowRight size={16} className="relative z-[2] landing-cta-arrow" />
            </button>
            <button onClick={() => navigate('/login')} className="landing-cta-secondary">
              <span>I already have an account</span>
            </button>
          </div>
          <div className="landing-final-trust">
            <Lock size={12} /> No credit card · Free forever · Cancel anytime
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="landing-nav-logo">
              <div className="landing-nav-logo-mark"><Brain size={18} /></div>
              <div className="landing-nav-logo-text">
                <span className="landing-nav-logo-name">Recall<span className="landing-nav-logo-x">X247</span></span>
                <span className="landing-nav-logo-sub">NEURAL OS · v3.0</span>
              </div>
            </button>
            <p className="landing-footer-tagline">
              Your AI-powered second brain. Capture anything, recall instantly, ship faster.
            </p>
            <div className="landing-footer-socials">
              <a href="#" aria-label="GitHub"><Github size={16} /></a>
              <a href="#" aria-label="Twitter"><Twitter size={16} /></a>
              <a href="#" aria-label="LinkedIn"><Linkedin size={16} /></a>
            </div>
          </div>

          <div className="landing-footer-cols">
            <div>
              <div className="landing-footer-h">Product</div>
              <a href="#platform">Platform</a>
              <a href="#agents">Agents</a>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div>
              <div className="landing-footer-h">Company</div>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Blog</a>
              <a href="#">Contact</a>
            </div>
            <div>
              <div className="landing-footer-h">Resources</div>
              <a href="#faq">FAQ</a>
              <a href="#">Docs</a>
              <a href="#">API</a>
              <a href="#">Privacy</a>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© 2026 Recall X247 · Built for Gen AI Academy APAC</span>
          <span>Made with <Brain size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> in the cloud</span>
        </div>
      </footer>
    </div>
  );
}

function SectionHeader({ eyebrow, title, sub }: { eyebrow: string; title: ReactNode; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="landing-section-header"
    >
      <div className="landing-section-eyebrow">
        <span className="landing-section-eyebrow-dot" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="landing-section-title">{title}</h2>
      {sub && <p className="landing-section-sub">{sub}</p>}
    </motion.div>
  );
}
