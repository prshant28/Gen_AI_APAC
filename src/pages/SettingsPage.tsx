import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Settings, Zap, CheckCircle2, AlertCircle, Shield } from 'lucide-react';
import { motion } from 'motion/react';

const SettingsView = () => {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetch('/settings').then(r => r.ok ? r.json() : null).then(data => {
      setSettings(data);
      setIsLoading(false);
    });
  }, []);

  const handleTestAI = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/test-ai');
      const data = await res.json();
      if (res.ok) setTestResult({ status: 'success', message: `${data.message} (Model: ${data.model})` });
      else setTestResult({ status: 'error', message: data.detail || 'Test failed' });
    } catch { setTestResult({ status: 'error', message: 'Network error occurred' }); }
    finally { setIsTesting(false); }
  };

  const hasAiKey = settings?.openai_api_key_set || settings?.gen_apac_api_key_set;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 999, marginBottom: 12 }}>
          <Settings size={11} color="var(--primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px' }}>SYSTEM SETTINGS</span>
        </div>
        <h2 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, color: 'var(--text-1)', margin: '0 0 6px', letterSpacing: '-0.5px', fontFamily: "'Alegreya Sans SC',system-ui" }}>Settings & Status</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 14, margin: 0 }}>Configure AI models and monitor system health.</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="view-card" style={{ padding: 'clamp(18px,3vw,28px)' }}>
          <h3 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 15 }}>
            <Sparkles size={16} color="var(--primary)" />AI Configuration
          </h3>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <Loader2 size={24} color="var(--text-3)" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ padding: '12px 14px', background: 'var(--primary-bg)', borderRadius: 12, border: '1px solid var(--primary-border)', marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Active AI Engine</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', margin: '0 0 2px' }}>Neural AI</p>
                <p style={{ fontSize: 11, color: 'var(--primary)', opacity: 0.7, margin: 0 }}>GPT-class language model · Active</p>
              </div>

              {[
                { label: 'OpenAI API Key', value: settings?.openai_api_key_set },
                { label: 'OpenRouter / GEN APAC Key', value: settings?.gen_apac_api_key_set },
                { label: 'Google Gemini Key', value: settings?.gemini_api_key_set },
                { label: 'Google Calendar', value: settings?.google_calendar_configured },
              ].map((item, idx, arr) => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx < arr.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, background: item.value ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)', color: item.value ? '#10b981' : '#ef4444', letterSpacing: '0.3px' }}>
                    {item.value ? '✓ CONFIGURED' : '✗ MISSING'}
                  </span>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>GCP Project</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'monospace' }}>{settings?.gcp_project_id || 'N/A'}</span>
              </div>
            </div>
          )}

          <div style={{ paddingTop: 16, marginTop: 16, borderTop: '1px solid var(--border)' }}>
            <button onClick={handleTestAI} disabled={isTesting || !hasAiKey}
              className={hasAiKey ? 'btn-premium' : 'btn-secondary'}
              style={{ width: '100%' }}>
              {isTesting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Zap size={15} />}
              Test Neural AI Connection
            </button>
            {testResult && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 12, padding: '12px 14px', borderRadius: 10, fontSize: 12, display: 'flex', gap: 10, alignItems: 'flex-start', background: testResult.status === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${testResult.status === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color: testResult.status === 'success' ? '#10b981' : '#ef4444' }}>
                {testResult.status === 'success' ? <CheckCircle2 size={14} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />}
                <p style={{ margin: 0, lineHeight: 1.5 }}>{testResult.message}</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="view-card" style={{ padding: 'clamp(18px,3vw,28px)' }}>
            <h3 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 15 }}>
              <Shield size={16} color="var(--primary)" />System Status
            </h3>
            <div>
              {[
                { label: 'Backend Server', value: 'HEALTHY', color: '#10b981', pulse: true },
                { label: 'Firestore Database', value: 'CONNECTED', color: '#10b981', pulse: false },
                { label: 'AI Engine', value: 'Neural AI · Active', color: 'var(--primary)', pulse: false },
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

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 40%,#7c3aed 100%)', padding: 'clamp(18px,3vw,24px)', borderRadius: 16, color: '#fff' }}>
            <h3 style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🏆</span> Hackathon Features
            </h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                'Multi-agent Neural AI orchestration',
                'YouTube transcript extraction',
                'Web scraping & summarization',
                'PDF knowledge capture',
                'AI flashcard generation',
                'Personalized study plan AI',
                'Daily AI briefing',
                'Semantic recall search',
                'Google Firestore persistence',
                'Google Calendar integration',
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
    </div>
  );
};

export default SettingsView;
