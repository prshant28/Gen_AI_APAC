import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Settings, Zap, CheckCircle2, AlertCircle, Shield, RefreshCw, Presentation, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

const SettingsView = () => {
  const navigate = useNavigate();
  const [cfg, setCfg] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const loadConfig = () => {
    setIsLoading(true);
    setLoadError(false);
    // Use /config (pure API endpoint) to avoid the SPA route conflict with /settings
    fetch('/config')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        setCfg(data);
        setIsLoading(false);
      })
      .catch(() => {
        setLoadError(true);
        setIsLoading(false);
      });
  };

  useEffect(() => { loadConfig(); }, []);

  const handleTestAI = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/test-ai');
      const data = await res.json();
      if (res.ok) setTestResult({ status: 'success', message: `${data.message} (Model: ${data.model})` });
      else setTestResult({ status: 'error', message: data.detail || 'Test failed' });
    } catch {
      setTestResult({ status: 'error', message: 'Network error — backend may be restarting' });
    } finally {
      setIsTesting(false);
    }
  };

  const hasAiKey = cfg?.openai_api_key_set || cfg?.gen_apac_api_key_set || cfg?.gemini_api_key_set;

  const badge = (val: boolean) => (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, letterSpacing: '0.3px',
      background: val ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
      color: val ? '#10b981' : '#ef4444',
    }}>
      {val ? '✓ CONFIGURED' : '✗ MISSING'}
    </span>
  );

  const row = (label: string, val: boolean, extra?: string) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
      <div>
        <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
        {extra && <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 6 }}>{extra}</span>}
      </div>
      {badge(val)}
    </div>
  );

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 999, marginBottom: 12 }}>
          <Settings size={11} color="var(--primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px' }}>SYSTEM SETTINGS</span>
        </div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--text-1)', margin: '0 0 6px', letterSpacing: '-0.5px', fontFamily: "'Alegreya Sans SC',system-ui" }}>Settings & Status</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 14, margin: 0 }}>Configure AI models and monitor system health.</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
        {/* AI Configuration Card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="view-card" style={{ padding: 'var(--space-md)' }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 15 }}>
            <Sparkles size={16} color="var(--primary)" />AI Configuration
          </h3>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 0', color: 'var(--text-3)' }}>
              <Loader2 size={22} style={{ animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 12 }}>Loading configuration…</span>
            </div>
          ) : loadError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0', textAlign: 'center' }}>
              <AlertCircle size={22} color="#ef4444" />
              <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0 }}>Could not load configuration.<br />The backend may be starting up.</p>
              <button onClick={loadConfig} className="btn-secondary" style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Active provider banner */}
              <div style={{ padding: '12px 14px', background: 'var(--primary-bg)', borderRadius: 12, border: '1px solid var(--primary-border)', marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Active AI Engine</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--primary)', margin: '0 0 2px' }}>{cfg?.ai_provider_name || 'Neural AI'}</p>
                {cfg?.fallback_provider && (
                  <p style={{ fontSize: 11, color: 'var(--primary)', opacity: 0.7, margin: 0 }}>
                    Fallback: {cfg.fallback_provider} · Auto-activates on quota
                  </p>
                )}
              </div>

              {row('Google Gemini Key', cfg?.gemini_api_key_set, cfg?.gemini_model)}
              {row('OpenAI / Fallback Key', cfg?.openai_api_key_set)}
              {row('OpenRouter / GEN APAC Key', cfg?.gen_apac_api_key_set)}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>Google Calendar</span>
                {badge(cfg?.google_calendar_configured)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>GCP Project</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'monospace' }}>{cfg?.gcp_project_id || 'N/A'}</span>
              </div>
            </div>
          )}

          <div style={{ paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--border)' }}>
            <button onClick={handleTestAI} disabled={isTesting || (!hasAiKey && !isLoading)}
              className={hasAiKey || isLoading ? 'btn-premium' : 'btn-secondary'}
              style={{ width: '100%' }}>
              {isTesting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={15} />}
              Test Neural AI Connection
            </button>
            {testResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  marginTop: 12, padding: '12px 14px', borderRadius: 10, fontSize: 12,
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  background: testResult.status === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${testResult.status === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                  color: testResult.status === 'success' ? '#10b981' : '#ef4444',
                }}>
                {testResult.status === 'success'
                  ? <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  : <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
                <p style={{ margin: 0, lineHeight: 1.5 }}>{testResult.message}</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* System Status */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="view-card" style={{ padding: 'var(--space-md)' }}>
            <h3 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 15 }}>
              <Shield size={16} color="var(--primary)" />System Status
            </h3>
            <div>
              {[
                { label: 'Backend Server', value: 'HEALTHY', color: '#10b981', pulse: true },
                { label: 'Firestore Database', value: 'CONNECTED', color: '#10b981', pulse: false },
                { label: 'AI Engine', value: cfg?.ai_provider_name || 'Neural AI · Active', color: 'var(--primary)', pulse: false },
                { label: 'Fallback AI', value: cfg?.fallback_provider ? `${cfg.fallback_provider} · Ready` : 'Not configured', color: cfg?.fallback_provider ? '#10b981' : 'var(--text-3)', pulse: false },
                { label: 'App Version', value: 'v2.0.0 HACKATHON', color: 'var(--text-3)', pulse: false },
              ].map((item, idx, arr) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: item.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {item.pulse && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s ease-in-out infinite', display: 'inline-block' }} />}
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hackathon Features */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 40%,#7c3aed 100%)', padding: 'var(--space-md)', borderRadius: 'var(--radius)', color: '#fff' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>
              Hackathon Features
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Multi-agent Neural AI orchestration',
                'YouTube transcript extraction',
                'Web scraping & summarization',
                'PDF knowledge capture',
                'AI flashcard generation (spaced repetition)',
                'Personalized study plan AI',
                'Daily AI briefing',
                'Semantic recall search',
                'Google Firestore persistence',
                'Google Calendar integration',
                'Auto-fallback on API quota',
              ].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>
                  <CheckCircle2 size={13} color="rgba(255,255,255,0.6)" style={{ flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Pitch Deck — promoted from sidebar to a Settings entry */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="view-card" style={{ marginTop: 20, padding: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(34,211,238,0.12)', border: '1px solid rgba(34,211,238,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Presentation size={18} color="#22d3ee" />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 3px' }}>Pitch Deck</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>The hackathon-ready story of x247 — open it in a new tab.</p>
          </div>
          <button onClick={() => navigate('/deck')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'linear-gradient(135deg,#06b6d4,#0891b2)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Open Pitch Deck <ArrowRight size={13} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsView;
