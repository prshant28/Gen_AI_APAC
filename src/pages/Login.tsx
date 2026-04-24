import { useEffect, useState, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, ArrowLeft, Eye, EyeOff, Mail, Lock, User as UserIcon,
  ShieldCheck, Sparkles, Loader2, Brain, Chrome, Zap,
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

  useEffect(() => { setError(''); setSuccess(''); }, [mode]);

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

  return (
    <div className="login-page">
      <div className="login-bg-glow" aria-hidden="true" />
      <div className="login-bg-grain" aria-hidden="true" />

      <div className="login-outer-card">
        {/* LEFT — Form panel */}
        <div className="login-form-panel">
          <div className="login-form-inner">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="login-home-btn"
              aria-label="Go to home"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Home</span>
            </button>

            <div className="login-form-card">
              <div className="login-form-eyebrow">
                <span className="login-form-eyebrow-dot" />
                <span>NEURAL OS · v3.0</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`heading-${mode}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h1 className="login-heading">
                    {mode === 'sign-in' ? 'Sign in to your account' : 'Create your account'}
                  </h1>
                  <p className="login-sub">
                    {mode === 'sign-in'
                      ? 'Enter your credentials to access your second brain.'
                      : 'Join thousands building their AI-powered second brain. Free forever.'}
                  </p>
                </motion.div>
              </AnimatePresence>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading || submitting}
                className="login-google-btn"
                data-testid="button-login-google"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <svg className="login-google-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#EA4335" d="M12 5.04c1.95 0 3.7.67 5.07 1.98l3.78-3.78C18.42 1 15.46 0 12 0 7.31 0 3.26 2.69 1.28 6.61l4.42 3.42C6.74 7.04 9.14 5.04 12 5.04z" />
                      <path fill="#4285F4" d="M23.49 12.27c0-.78-.07-1.53-.2-2.27H12v4.51h6.47c-.28 1.5-1.13 2.78-2.41 3.64l3.69 2.86c2.16-2 3.74-4.95 3.74-8.74z" />
                      <path fill="#FBBC05" d="M5.7 14.2a7.06 7.06 0 0 1 0-4.4L1.28 6.4A12 12 0 0 0 0 12c0 1.94.46 3.78 1.28 5.4l4.42-3.2z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.69-2.86c-1.02.69-2.34 1.1-4.26 1.1-2.86 0-5.27-2-6.13-4.7l-4.42 3.42C3.26 21.31 7.31 24 12 24z" />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="login-divider">
                <span className="login-divider-line" />
                <span className="login-divider-text">or</span>
                <span className="login-divider-line" />
              </div>

              <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
                <AnimatePresence mode="wait">
                  {mode === 'sign-up' && (
                    <motion.div
                      key="signup-fields"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div className="login-field">
                        <label htmlFor="fullName" className="login-label">Full name</label>
                        <div className="login-input-wrap">
                          <UserIcon className="login-input-icon" />
                          <input
                            id="fullName"
                            name="fullName"
                            type="text"
                            autoComplete="name"
                            placeholder="Enter your full name"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                            className="login-input"
                            data-testid="input-fullname"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="login-field">
                  <label htmlFor="email" className="login-label">Email address</label>
                  <div className="login-input-wrap">
                    <Mail className="login-input-icon" />
                    <input
                      id="email" name="email" type="email" autoComplete="email" required
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="login-input"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="login-field">
                  <div className="login-label-row">
                    <label htmlFor="password" className="login-label">Password</label>
                    {mode === 'sign-in' && (
                      <button type="button" onClick={handleForgot} className="login-forgot-btn">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="login-input-wrap">
                    <Lock className="login-input-icon" />
                    <input
                      id="password" name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                      required minLength={6}
                      placeholder={mode === 'sign-in' ? 'Enter your password' : 'Min. 6 characters'}
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="login-input"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="login-input-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="login-alert login-alert-error"
                  >
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="login-alert login-alert-success"
                  >
                    {success}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className={`login-submit-btn group ${submitting ? 'is-loading' : ''}`}
                  data-testid="button-submit"
                >
                  <span className="login-submit-shine" />
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin relative z-[2]" />
                  ) : (
                    <>
                      <span className="relative z-[2]">
                        {mode === 'sign-in' ? 'Sign in' : 'Create account'}
                      </span>
                      <ArrowRight className="w-4 h-4 relative z-[2] login-submit-arrow" />
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={handleGuest}
                disabled={guestLoading}
                className="login-guest-btn"
                data-testid="button-guest"
              >
                {guestLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserIcon className="w-4 h-4" />
                    <span>Continue as Guest</span>
                  </>
                )}
              </button>

              <div className="login-mode-toggle">
                {mode === 'sign-in' ? (
                  <>
                    Don't have an account?{' '}
                    <button type="button" onClick={() => setMode('sign-up')} data-testid="link-toggle-signup">
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button type="button" onClick={() => setMode('sign-in')} data-testid="link-toggle-signin">
                      Sign in
                    </button>
                  </>
                )}
              </div>

              <div className="login-trust-row">
                <div className="login-trust-item">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Bank-grade security</span>
                </div>
                <span className="login-trust-dot" />
                <div className="login-trust-item">
                  <Sparkles className="w-3 h-3" />
                  <span>Instant access</span>
                </div>
                <span className="login-trust-dot" />
                <div className="login-trust-item">
                  <Zap className="w-3 h-3" />
                  <span>Free forever</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — Hero visual panel */}
        <div className="login-img-panel">
          <div className="login-img-bg" aria-hidden="true">
            <div className="login-img-orb login-img-orb-1" />
            <div className="login-img-orb login-img-orb-2" />
            <div className="login-img-orb login-img-orb-3" />
            <div className="login-img-grid" />
          </div>

          <div className="login-img-content">
            <motion.div
              className="login-img-brain"
              animate={{ y: [0, -10, 0], rotate: [0, 2, 0, -2, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Brain className="w-16 h-16 text-white" />
            </motion.div>

            <h2 className="login-img-title">Your second brain,<br />always on.</h2>
            <p className="login-img-text">
              Capture anything. Recall instantly. Let your multi-agent AI handle the rest.
            </p>

            <div className="login-img-stats">
              <div className="login-img-stat">
                <div className="login-img-stat-num">1.2M+</div>
                <div className="login-img-stat-label">Memories captured</div>
              </div>
              <div className="login-img-stat">
                <div className="login-img-stat-num">98.7%</div>
                <div className="login-img-stat-label">Recall accuracy</div>
              </div>
              <div className="login-img-stat">
                <div className="login-img-stat-num">9.4h</div>
                <div className="login-img-stat-label">Saved/week</div>
              </div>
            </div>
          </div>

          <div className="login-img-watermark">recall x247</div>
        </div>
      </div>
    </div>
  );
}
