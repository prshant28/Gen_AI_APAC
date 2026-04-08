import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import {
  Brain, Eye, EyeOff, Mail, Lock, User, Zap,
  ArrowRight, CheckCircle2, Loader, AlertCircle, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { NeuralBackground } from './NeuralBackground';

const PERKS = [
  'Capture anything — YouTube, Web, PDF, Notes, Audio',
  'AI-powered neural connections & auto-tagging',
  'Private, encrypted knowledge graph',
  'Infinite memory timeline & smart search',
];

export function AuthPage() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup'>(
    params.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0); // subtle animation counter

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/app', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const t = setInterval(() => setStep(s => s + 1), 3000);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup') {
      if (password !== confirm) { setError('Passwords do not match'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    }

    setLoading(true);
    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, name);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      navigate('/app', { replace: true });
    }
  };

  const toggle = () => {
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setError(null);
    setPassword('');
    setConfirm('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#05050f',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div className="recall-blob-1" />
      <div className="recall-blob-2" />
      <div className="recall-blob-3" />
      <NeuralBackground />

      {/* Grid bg */}
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* LEFT PANEL — branding */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-start',
        padding: '60px', position: 'relative', zIndex: 1,
        display: 'none',
      }}
        className="auth-left-panel"
      >
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', marginBottom: 60 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(0,212,255,0.5)',
          }}>
            <Brain size={24} color="#fff" />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 22 }}>RecallSense</div>
            <div style={{ color: '#00d4ff', fontSize: 10, letterSpacing: '3px', textTransform: 'uppercase', opacity: 0.8 }}>Neural OS v2.1</div>
          </div>
        </Link>

        <h2 style={{ color: '#fff', fontSize: 36, fontWeight: 800, lineHeight: 1.2, margin: '0 0 16px' }}>
          Your Second Brain,<br />
          <span style={{ background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Now Online
          </span>
        </h2>
        <p style={{ color: '#9ca3af', fontSize: 16, lineHeight: 1.6, marginBottom: 40, maxWidth: 400 }}>
          Join thousands of researchers, founders, and knowledge workers who trust RecallSense to capture and connect everything they learn.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PERKS.map((perk, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={12} color="#00d4ff" />
              </div>
              <span style={{ color: '#d1d5db', fontSize: 14 }}>{perk}</span>
            </div>
          ))}
        </div>

        {/* Floating stat cards */}
        <div style={{ display: 'flex', gap: 16, marginTop: 48 }}>
          {[
            { value: '50K+', label: 'Users', color: '#00d4ff' },
            { value: '2.5M+', label: 'Captures', color: '#8b5cf6' },
            { value: '99%', label: 'Uptime', color: '#10b981' },
          ].map(({ value, label, color }) => (
            <div key={label} style={{
              padding: '14px 20px', borderRadius: 12,
              background: `${color}08`, border: `1px solid ${color}20`,
              textAlign: 'center',
            }}>
              <div style={{ color, fontSize: 20, fontWeight: 800 }}>{value}</div>
              <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT PANEL — form */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '40px 24px',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Mobile logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 36 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg,#00d4ff,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(0,212,255,0.45)',
          }}>
            <Brain size={20} color="#fff" />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>RecallSense</div>
            <div style={{ color: '#00d4ff', fontSize: 9, letterSpacing: '2.5px', textTransform: 'uppercase', opacity: 0.8 }}>Neural OS v2.1</div>
          </div>
        </Link>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: 20,
          padding: '36px 32px',
          backdropFilter: 'blur(30px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(0,212,255,0.04)',
        }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h1>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
              {mode === 'signin'
                ? 'Sign in to your neural knowledge base'
                : 'Start building your second brain today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Name (signup only) */}
            {mode === 'signup' && (
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="#4b5563" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Alex Chen"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="rs-input"
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#4b5563" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="rs-input"
                  style={{ paddingLeft: 38 }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#4b5563" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="rs-input"
                  style={{ paddingLeft: 38, paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', display: 'flex' }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            {mode === 'signup' && (
              <div>
                <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} color="#4b5563" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    className="rs-input"
                    style={{ paddingLeft: 38 }}
                  />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              }}>
                <AlertCircle size={14} color="#ef4444" />
                <span style={{ color: '#ef4444', fontSize: 13 }}>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px', borderRadius: 12, border: 'none',
                background: loading ? 'rgba(0,212,255,0.3)' : 'linear-gradient(135deg,#00d4ff,#8b5cf6)',
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 0 30px rgba(0,212,255,0.3)',
                transition: 'all 0.25s ease',
                marginTop: 4,
              }}
            >
              {loading
                ? <><Loader size={16} style={{ animation: 'rotate-slow 1s linear infinite' }} /> Processing...</>
                : mode === 'signin'
                  ? <><Zap size={16} /> Sign In to Neural OS</>
                  : <><Brain size={16} /> Create Neural Account</>
              }
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              <span style={{ color: '#4b5563', fontSize: 12 }}>or</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
            </div>

            {/* Toggle mode */}
            <button
              type="button"
              onClick={toggle}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '12px', borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.09)',
                background: 'rgba(255,255,255,0.03)',
                color: '#9ca3af', fontSize: 14, cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.25)'; (e.currentTarget as HTMLButtonElement).style.color = '#00d4ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.09)'; (e.currentTarget as HTMLButtonElement).style.color = '#9ca3af'; }}
            >
              {mode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Trust badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 }}>
            <Shield size={12} color="#4b5563" />
            <span style={{ color: '#4b5563', fontSize: 11 }}>End-to-end encrypted · SOC 2 Type II · GDPR compliant</span>
          </div>
        </div>

        <p style={{ color: '#374151', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
          By continuing, you agree to our{' '}
          <span style={{ color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</span>
          {' '}and{' '}
          <span style={{ color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</span>
        </p>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .auth-left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
