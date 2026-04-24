import { useEffect, useRef, useState, type FormEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Eye, EyeOff, Mail, Lock, User as UserIcon,
  ShieldCheck, Sparkles, Loader2, Brain, Zap, Activity, Send, Hexagon,
  Network, Star,
} from 'lucide-react';

type AuthFns = {
  onGoogleSignIn: () => Promise<any>;
  onEmailSignIn: (email: string, password: string) => Promise<any>;
  onEmailSignUp: (email: string, password: string, name: string) => Promise<any>;
  onResetPassword: (email: string) => Promise<void>;
  onAnonymousSignIn: () => Promise<any>;
  navigate: (path: string) => void;
  initialMode?: 'sign-in' | 'sign-up';
};

const friendlyError = (code: string): string => ({
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
  'auth/popup-blocked': 'Pop-up blocked — allow pop-ups or use email sign-in.',
  'auth/unauthorized-domain': 'Domain not authorized. Please use email sign-in.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/operation-not-allowed': 'Email/password sign-in is not enabled.',
}[code] ?? 'Something went wrong. Please try again.');

const SHOWCASE_CHAT: Array<{ role: 'user' | 'ai'; text: string }> = [
  { role: 'user', text: 'What did Maya say about pricing on the last call?' },
  { role: 'ai',   text: 'Found 6 memories. Maya pushed usage-based tied to query volume. Revisit after 100 paying users.' },
  { role: 'user', text: 'Plan deep-work blocks for the rewrite.' },
  { role: 'ai',   text: 'Booked Mon–Wed 9–11am. Linked to "Q3 strategy" memory.' },
];

const ACTIVITY = [
  { icon: Brain, color: '#a78bfa', text: 'Capture Agent indexed 14 memories' },
  { icon: Network, color: '#f472b6', text: 'Graph Agent drew 8 new edges' },
  { icon: Sparkles, color: '#fbbf24', text: 'Briefing ready · 06:30' },
  { icon: Activity, color: '#34d399', text: 'Recall returned in 312ms' },
];

export default function Login({
  onGoogleSignIn, onEmailSignIn, onEmailSignUp, onResetPassword, onAnonymousSignIn,
  navigate, initialMode = 'sign-in',
}: AuthFns) {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [chatStep, setChatStep] = useState(2);
  const [activityIdx, setActivityIdx] = useState(0);
  const [memoryCount, setMemoryCount] = useState(1283491);

  const reduceMotion = useReducedMotion();
  const showcaseRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setError(''); setSuccess(''); }, [mode]);

  // Loop showcase chat
  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(() => {
      setChatStep(s => s >= SHOWCASE_CHAT.length ? 2 : s + 1);
    }, 2400);
    return () => clearInterval(t);
  }, [reduceMotion]);

  // Cycle activity feed
  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(() => setActivityIdx(i => (i + 1) % ACTIVITY.length), 2200);
    return () => clearInterval(t);
  }, [reduceMotion]);

  // Animated counter
  useEffect(() => {
    if (reduceMotion) return;
    const t = setInterval(() => setMemoryCount(c => c + Math.floor(Math.random() * 4) + 1), 1800);
    return () => clearInterval(t);
  }, [reduceMotion]);

  // Mouse parallax on showcase
  useEffect(() => {
    if (reduceMotion) return;
    const el = showcaseRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - 0.5) * 14;
      const y = ((e.clientY - r.top) / r.height - 0.5) * 14;
      el.style.setProperty('--px', `${x}px`);
      el.style.setProperty('--py', `${y}px`);
    };
    el.addEventListener('mousemove', onMove);
    return () => el.removeEventListener('mousemove', onMove);
  }, [reduceMotion]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await onEmailSignIn(form.email.trim(), form.password);
      } else {
        if (!form.fullName.trim() || !form.email.trim() || !form.password) {
          setError('Please fill name, email, and password.'); return;
        }
        if (form.password.length < 6) {
          setError('Password must be at least 6 characters.'); return;
        }
        await onEmailSignUp(form.email.trim(), form.password, form.fullName.trim());
      }
    } catch (err: any) {
      setError(friendlyError(err?.code ?? ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (googleLoading) return;
    setError(''); setGoogleLoading(true);
    try { await onGoogleSignIn(); }
    catch (err: any) { setError(friendlyError(err?.code ?? '')); }
    finally { setGoogleLoading(false); }
  };

  const handleGuest = async () => {
    if (guestLoading) return;
    setError(''); setGuestLoading(true);
    try { await onAnonymousSignIn(); }
    catch (err: any) { setError(friendlyError(err?.code ?? '')); }
    finally { setGuestLoading(false); }
  };

  const handleForgot = async () => {
    if (!form.email.trim()) { setError('Enter your email first to reset password.'); return; }
    setError(''); setSuccess('');
    try {
      await onResetPassword(form.email.trim());
      setSuccess('Password reset email sent. Check your inbox.');
    } catch (err: any) { setError(friendlyError(err?.code ?? '')); }
  };

  const visibleChat = SHOWCASE_CHAT.slice(Math.max(0, chatStep - 2), chatStep);

  return (
    <div className="lg-page">
      {/* Background layers */}
      <div className="lg-bg" aria-hidden="true">
        <div className="lg-bg-vignette" />
        <div className="lg-bg-grid" />
        <div className="lg-bg-orb lg-bg-orb-1" />
        <div className="lg-bg-orb lg-bg-orb-2" />
        <div className="lg-bg-orb lg-bg-orb-3" />
        <div className="lg-bg-noise" />
      </div>

      <div className="lg-card">
        {/* ── LEFT: COMPACT FORM ─────────────────────────────────── */}
        <div className="lg-form-panel">
          <div className="lg-form-top">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="lg-home-btn"
              aria-label="Back to home"
            >
              <ArrowLeft size={13} />
              <span>Home</span>
            </button>
            <button onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} className="lg-mode-pill">
              {mode === 'sign-in' ? 'Create account' : 'Sign in'}
              <ArrowRight size={11} />
            </button>
          </div>

          <div className="lg-form-body">
            <div className="lg-eyebrow">
              <span className="lg-eyebrow-dot" />
              <span>Neural OS · v3.0 — live now</span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`heading-${mode}`}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
                className="lg-heading-block"
              >
                <h1 className="lg-heading">
                  {mode === 'sign-in' ? (
                    <>Welcome <span className="lg-heading-grad">back.</span></>
                  ) : (
                    <>Build your <span className="lg-heading-grad">second brain.</span></>
                  )}
                </h1>
                <p className="lg-sub">
                  {mode === 'sign-in'
                    ? 'Pick up where your seven agents left off.'
                    : 'Free forever. 90 seconds to first memory.'}
                </p>
              </motion.div>
            </AnimatePresence>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading || submitting}
              className="lg-google-btn"
              data-testid="button-login-google"
            >
              {googleLoading ? (
                <Loader2 size={15} className="lg-spin" />
              ) : (
                <>
                  <svg className="lg-google-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M12 5.04c1.95 0 3.7.67 5.07 1.98l3.78-3.78C18.42 1 15.46 0 12 0 7.31 0 3.26 2.69 1.28 6.61l4.42 3.42C6.74 7.04 9.14 5.04 12 5.04z" />
                    <path fill="#4285F4" d="M23.49 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h6.47c-.28 1.5-1.13 2.78-2.41 3.64l3.69 2.86c2.16-2 3.74-4.95 3.74-8.74z" />
                    <path fill="#FBBC05" d="M5.7 14.2a7.06 7.06 0 0 1 0-4.4L1.28 6.4A12 12 0 0 0 0 12c0 1.94.46 3.78 1.28 5.4l4.42-3.2z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.69-2.86c-1.02.69-2.34 1.1-4.26 1.1-2.86 0-5.27-2-6.13-4.7l-4.42 3.42C3.26 21.31 7.31 24 12 24z" />
                  </svg>
                  <span>Continue with Google</span>
                </>
              )}
            </button>

            <div className="lg-divider"><span>or with email</span></div>

            <form onSubmit={handleSubmit} className="lg-form" autoComplete="on">
              <AnimatePresence initial={false}>
                {mode === 'sign-up' && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="lg-field">
                      <UserIcon size={14} className="lg-field-icon" aria-hidden="true" />
                      <input
                        id="fullName" name="fullName" type="text" autoComplete="name"
                        aria-label="Full name"
                        placeholder="Full name"
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        className="lg-input"
                        data-testid="input-fullname"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="lg-field">
                <Mail size={14} className="lg-field-icon" aria-hidden="true" />
                <input
                  id="email" name="email" type="email" autoComplete="email" required
                  aria-label="Email address"
                  placeholder="Email address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="lg-input"
                  data-testid="input-email"
                />
              </div>

              <div className="lg-field">
                <Lock size={14} className="lg-field-icon" aria-hidden="true" />
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  required minLength={6}
                  aria-label="Password"
                  placeholder={mode === 'sign-in' ? 'Password' : 'Password (min. 6)'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="lg-input"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="lg-field-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {mode === 'sign-in' && (
                <button type="button" onClick={handleForgot} className="lg-forgot">
                  Forgot password?
                </button>
              )}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="lg-alert lg-alert-error"
                  >
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="lg-alert lg-alert-success"
                  >
                    {success}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={submitting}
                className={`lg-submit ${submitting ? 'is-loading' : ''}`}
                data-testid="button-submit"
              >
                <span className="lg-submit-shine" />
                {submitting ? (
                  <Loader2 size={15} className="lg-spin lg-submit-z" />
                ) : (
                  <>
                    <span className="lg-submit-z">{mode === 'sign-in' ? 'Sign in' : 'Create account'}</span>
                    <ArrowRight size={14} className="lg-submit-arrow lg-submit-z" />
                  </>
                )}
              </button>
            </form>

            <div className="lg-row-actions">
              <button
                type="button"
                onClick={handleGuest}
                disabled={guestLoading}
                className="lg-guest-btn"
                data-testid="button-guest"
              >
                {guestLoading ? <Loader2 size={13} className="lg-spin" /> : <UserIcon size={13} />}
                <span>Continue as guest</span>
              </button>
            </div>

            <div className="lg-trust">
              <div className="lg-trust-item"><ShieldCheck size={11} /><span>Bank-grade</span></div>
              <span className="lg-trust-dot" />
              <div className="lg-trust-item"><Zap size={11} /><span>Instant</span></div>
              <span className="lg-trust-dot" />
              <div className="lg-trust-item"><Sparkles size={11} /><span>Free forever</span></div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: ADVANCED LIVING SHOWCASE ────────────────────── */}
        <div className="lg-show-panel" ref={showcaseRef}>
          <div className="lg-show-mesh" />
          <div className="lg-show-grid" />

          {/* Floating live status pill */}
          <motion.div
            className="lg-show-live"
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="lg-show-live-dot" />
            <span>2,481 minds online · all 7 agents running</span>
          </motion.div>

          {/* Hero copy */}
          <div className="lg-show-hero">
            <div className="lg-show-eyebrow">
              <Hexagon size={11} />
              <span>recall ×247</span>
            </div>
            <h2 className="lg-show-title">
              Your second brain,
              <br /><span className="lg-show-title-grad">always thinking.</span>
            </h2>
            <p className="lg-show-sub">
              Seven specialist agents capture, link and recall your ideas
              while you sleep. Sign in to wake them up.
            </p>
          </div>

          {/* Live mockup card with parallax */}
          <motion.div
            className="lg-show-mockup"
            initial={reduceMotion ? false : { opacity: 0, y: 24, rotateX: -4 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="lg-show-mock-head">
              <span className="lg-show-mock-dot" style={{ background: '#ff5f57' }} />
              <span className="lg-show-mock-dot" style={{ background: '#febc2e' }} />
              <span className="lg-show-mock-dot" style={{ background: '#28c840' }} />
              <div className="lg-show-mock-url">strategy thread · today</div>
              <div className="lg-show-mock-pill"><Activity size={9} /> 412ms</div>
            </div>
            <div className="lg-show-mock-body">
              {visibleChat.map((m, i) => (
                <motion.div
                  key={`${chatStep}-${i}`}
                  className={`lg-show-msg lg-show-msg-${m.role}`}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.1 }}
                >
                  {m.role === 'ai' && (
                    <span className="lg-show-msg-avatar"><Brain size={10} /></span>
                  )}
                  <div className="lg-show-msg-bubble">
                    {m.text}
                    {m.role === 'ai' && i === visibleChat.length - 1 && <span className="lg-show-cursor" />}
                  </div>
                </motion.div>
              ))}
              <div className="lg-show-mock-input">
                <span className="lg-show-mock-prompt">Ask your second brain…</span>
                <span className="lg-show-mock-send"><Send size={10} /></span>
              </div>
            </div>
          </motion.div>

          {/* Floating notification badges */}
          <motion.div
            className="lg-show-float lg-show-float-tl"
            animate={reduceMotion ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <span className="lg-show-float-icon" style={{ background: '#22d3ee22', color: '#22d3ee' }}>
              <Brain size={11} />
            </span>
            <div>
              <div className="lg-show-float-t">{memoryCount.toLocaleString()}</div>
              <div className="lg-show-float-s">memories indexed</div>
            </div>
          </motion.div>

          <motion.div
            className="lg-show-float lg-show-float-br"
            animate={reduceMotion ? undefined : { y: [0, 6, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          >
            <span className="lg-show-float-icon" style={{ background: '#fbbf2422', color: '#fbbf24' }}>
              <Star size={11} />
            </span>
            <div>
              <div className="lg-show-float-t">4.9 / 5 · loved by 2,400+</div>
              <div className="lg-show-float-s">founders · researchers · operators</div>
            </div>
          </motion.div>

          {/* Live activity feed */}
          <div className="lg-show-activity">
            <div className="lg-show-activity-label">
              <span className="lg-show-activity-pulse" />
              <span>Live agent activity</span>
            </div>
            <div className="lg-show-activity-stream">
              <AnimatePresence mode="wait">
                {(() => {
                  const a = ACTIVITY[activityIdx];
                  const I = a.icon;
                  return (
                    <motion.div
                      key={activityIdx}
                      initial={reduceMotion ? false : { opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, x: -12 }}
                      transition={{ duration: 0.35 }}
                      className="lg-show-activity-row"
                    >
                      <span className="lg-show-activity-icon" style={{ background: `${a.color}22`, color: a.color }}>
                        <I size={11} />
                      </span>
                      <span>{a.text}</span>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
