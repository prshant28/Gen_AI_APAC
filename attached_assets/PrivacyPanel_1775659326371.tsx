import { useState, useEffect } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, Lock, Eye, EyeOff,
  Database, Cpu, Globe, FileText, Mic, Image, Youtube, StickyNote,
  AlertTriangle, CheckCircle2, Info, Zap, RefreshCw,
  Server, Wifi, Key, Fingerprint, Bell, Trash2,
  ChevronRight, ExternalLink, Clock, TrendingUp, Activity, Loader
} from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-c294fbf1`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

// ── Toggle Switch ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange, color = '#00d4ff', size = 'md' }: {
  on: boolean; onChange: (v: boolean) => void; color?: string; size?: 'sm' | 'md';
}) {
  const W = size === 'sm' ? 34 : 42;
  const H = size === 'sm' ? 18 : 23;
  const R = size === 'sm' ? 12 : 16;
  const OFF = size === 'sm' ? 2 : 3;
  const travel = W - R - OFF * 2;
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: W, height: H, borderRadius: H / 2, flexShrink: 0,
        background: on ? color : 'rgba(255,255,255,0.1)',
        border: `1px solid ${on ? color + '60' : 'rgba(255,255,255,0.12)'}`,
        cursor: 'pointer', position: 'relative', transition: 'all 0.25s ease',
        boxShadow: on ? `0 0 14px ${color}50` : 'none',
      }}
    >
      <div style={{
        position: 'absolute', top: OFF, left: on ? OFF + travel : OFF,
        width: R, height: R, borderRadius: '50%',
        background: on ? '#fff' : '#6b7280',
        boxShadow: on ? `0 0 8px ${color}80` : 'none',
        transition: 'all 0.25s ease',
      }} />
    </div>
  );
}

// ── Security Meter ────────────────────────────────────────────────────────────
function SecurityMeter({ score, label }: { score: number; label: string }) {
  const color = score >= 85 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const ring = 52;
  const circ = 2 * Math.PI * ring;
  const dash = (score / 100) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 120, height: 120 }}>
        <svg width={120} height={120} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={60} cy={60} r={ring} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
          <circle cx={60} cy={60} r={ring} fill="none" stroke={color} strokeWidth={8}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${color}80)`, transition: 'all 1s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color, fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{score}</span>
          <span style={{ color: '#6b7280', fontSize: 9, marginTop: 2, textTransform: 'uppercase', letterSpacing: '1px' }}>/ 100</span>
        </div>
      </div>
      <div style={{ color: '#d1d5db', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
        borderRadius: 20, fontSize: 11, fontWeight: 600,
        background: `${color}15`, border: `1px solid ${color}30`, color,
      }}>
        {score >= 85 ? <ShieldCheck size={11} /> : score >= 60 ? <AlertTriangle size={11} /> : <ShieldAlert size={11} />}
        {score >= 85 ? 'Excellent' : score >= 60 ? 'Good' : 'At Risk'}
      </div>
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, color = '#00d4ff' }: {
  icon: any; title: string; subtitle: string; color?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 18px ${color}15`, flexShrink: 0 }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700 }}>{title}</div>
        <div style={{ color: '#6b7280', fontSize: 12, marginTop: 1 }}>{subtitle}</div>
      </div>
    </div>
  );
}

// ── Setting Row ───────────────────────────────────────────────────────────────
function SettingRow({ label, sub, on, onChange, color, badge, warn }: {
  label: string; sub: string; on: boolean; onChange: (v: boolean) => void;
  color?: string; badge?: string; warn?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', rowGap: 4, marginBottom: 3 }}>
          <span style={{ color: '#d1d5db', fontSize: 14, fontWeight: 500 }}>{label}</span>
          {badge && (
            <span style={{ background: `${color || '#00d4ff'}15`, border: `1px solid ${color || '#00d4ff'}30`, color: color || '#00d4ff', borderRadius: 4, padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>{badge}</span>
          )}
        </div>
        <div style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.55 }}>{sub}</div>
        {warn && on && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
            <AlertTriangle size={10} color="#f59e0b" />
            <span style={{ color: '#f59e0b', fontSize: 11 }}>{warn}</span>
          </div>
        )}
      </div>
      <Toggle on={on} onChange={onChange} color={color} />
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PrivacyState {
  // Data Privacy
  localStorageOnly: boolean;
  encryptAtRest: boolean;
  anonymizeMetadata: boolean;
  autoDeleteAfter: boolean;
  shareAnonymousStats: boolean;
  // Sensitive Content
  detectPII: boolean;
  blockNSFW: boolean;
  flagMisinformation: boolean;
  redactCredentials: boolean;
  warnSensitiveTopics: boolean;
  // Capture Permissions
  allowYoutube: boolean;
  allowWebpages: boolean;
  allowPDF: boolean;
  allowNotes: boolean;
  allowImages: boolean;
  allowAudio: boolean;
  // Security
  twoFactorCapture: boolean;
  auditLog: boolean;
  rateLimit: boolean;
  blocklistEnabled: boolean;
  // Notifications
  notifyThreats: boolean;
  notifyCaptures: boolean;
}

const INITIAL: PrivacyState = {
  localStorageOnly: true, encryptAtRest: true, anonymizeMetadata: false,
  autoDeleteAfter: false, shareAnonymousStats: false,
  detectPII: true, blockNSFW: true, flagMisinformation: true,
  redactCredentials: true, warnSensitiveTopics: false,
  allowYoutube: true, allowWebpages: true, allowPDF: true,
  allowNotes: true, allowImages: false, allowAudio: false,
  twoFactorCapture: false, auditLog: true, rateLimit: true, blocklistEnabled: true,
  notifyThreats: true, notifyCaptures: false,
};

const AUDIT_LOG = [
  { id: 1, time: '2m ago',   action: 'Capture blocked',    detail: 'Malware URL detected',          status: 'blocked', color: '#ef4444' },
  { id: 2, time: '8m ago',   action: 'PII redacted',       detail: 'SSN detected in PDF capture',   status: 'warn',    color: '#f59e0b' },
  { id: 3, time: '15m ago',  action: 'Capture allowed',    detail: 'YouTube · Geoffrey Hinton',     status: 'ok',      color: '#10b981' },
  { id: 4, time: '42m ago',  action: 'Capture allowed',    detail: 'Web · Anthropic Scaling Laws',  status: 'ok',      color: '#10b981' },
  { id: 5, time: '1h ago',   action: 'Threat neutralized', detail: 'Phishing domain in URL capture',status: 'blocked', color: '#ef4444' },
  { id: 6, time: '3h ago',   action: 'Capture allowed',    detail: 'PDF · Consciousness & Brain',   status: 'ok',      color: '#10b981' },
];

// ── Compute score ─────────────────────────────────────────────────────────────
function computeScore(s: PrivacyState): number {
  let score = 40;
  if (s.encryptAtRest) score += 15;
  if (s.detectPII) score += 10;
  if (s.blockNSFW) score += 5;
  if (s.redactCredentials) score += 8;
  if (s.flagMisinformation) score += 4;
  if (s.auditLog) score += 6;
  if (s.rateLimit) score += 5;
  if (s.blocklistEnabled) score += 5;
  if (s.twoFactorCapture) score += 8;
  if (s.localStorageOnly) score += 4;
  if (s.anonymizeMetadata) score += 3;
  if (!s.allowImages) score -= 2;
  if (!s.allowAudio) score -= 2;
  return Math.min(100, Math.max(10, score));
}

// ─────────────────────────────────────────────────────────────────────────────
export function PrivacyPanel() {
  const { isMobile, isTablet } = useWindowSize();
  const [settings, setSettings] = useState<PrivacyState>(INITIAL);
  const [activeTab, setActiveTab] = useState<'privacy' | 'content' | 'permissions' | 'security'>('privacy');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [score, setScore] = useState(computeScore(INITIAL));
  const [animScore, setAnimScore] = useState(0);

  const set = (key: keyof PrivacyState) => (val: boolean) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    setScore(computeScore(next));
  };

  // Load settings from Supabase on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/privacy/settings`, { headers: authHeaders });
        const data = await res.json();
        if (data.settings) {
          const loaded = { ...INITIAL, ...data.settings };
          setSettings(loaded);
          setScore(computeScore(loaded));
        }
      } catch (e) {
        console.error('Failed to load privacy settings:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Animate score
  useEffect(() => {
    if (loading) return;
    const target = score;
    let current = animScore;
    const step = () => {
      current = Math.min(current + 2, target);
      setAnimScore(current);
      if (current < target) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [score, loading]);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${API}/privacy/settings`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      console.error('Failed to save privacy settings:', e);
      setSaveError(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const cols = isMobile ? '1fr' : isTablet ? '1fr' : '300px 1fr';
  const TABS = [
    { key: 'privacy',     label: 'Data Privacy',   icon: Database,    color: '#00d4ff' },
    { key: 'content',     label: 'Content Safety', icon: Shield,      color: '#8b5cf6' },
    { key: 'permissions', label: 'Permissions',    icon: Key,         color: '#f59e0b' },
    { key: 'security',    label: 'Security',       icon: Fingerprint, color: '#10b981' },
  ] as const;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 18 : 24 }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="fade-in-up">
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: isMobile ? 22 : 26, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
              Privacy &amp; Safety
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              Control how RecallSense handles your data · All processing on-device by default
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600, cursor: (saving || loading) ? 'not-allowed' : 'pointer',
                background: saved ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#00d4ff,#0099cc)',
                color: '#fff', boxShadow: saved ? '0 0 20px rgba(16,185,129,0.4)' : '0 0 20px rgba(0,212,255,0.3)',
                transition: 'all 0.3s ease', opacity: (saving || loading) ? 0.7 : 1,
              }}
            >
              {saving ? <Loader size={15} style={{ animation: 'rotate-slow 1s linear infinite' }} /> : saved ? <CheckCircle2 size={15} /> : <Lock size={15} />}
              {saving ? 'Saving...' : saved ? 'Settings Saved!' : 'Save Settings'}
            </button>
            {saveError && <span style={{ color: '#ef4444', fontSize: 11 }}>{saveError}</span>}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 60 }}>
          <Loader size={20} color="#00d4ff" style={{ animation: 'rotate-slow 1s linear infinite' }} />
          <span style={{ color: '#6b7280', fontSize: 14 }}>Loading privacy settings...</span>
        </div>
      ) : (
        <>
          {/* ── Dashboard row ──────────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 14 }}>
            {/* Trust score */}
            <div className="rs-card rs-card-cyan" style={{ padding: '22px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <SecurityMeter score={animScore} label="Privacy Trust Score" />
            </div>

            {/* Quick stats */}
            <div className="rs-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ color: '#6b7280', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 14 }}>Protection Status</div>
              {[
                { label: 'Data Encryption',     active: settings.encryptAtRest,     icon: Lock,        color: '#00d4ff' },
                { label: 'PII Detection',        active: settings.detectPII,         icon: Eye,         color: '#8b5cf6' },
                { label: 'Threat Blocking',      active: settings.blocklistEnabled,  icon: ShieldCheck, color: '#10b981' },
                { label: 'Content Filtering',    active: settings.blockNSFW,         icon: Shield,      color: '#f472b6' },
                { label: 'Audit Logging',        active: settings.auditLog,          icon: Activity,    color: '#f59e0b' },
              ].map(({ label, active, icon: Icon, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? `${color}15` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? color + '30' : 'rgba(255,255,255,0.06)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.3s' }}>
                    <Icon size={13} color={active ? color : '#4b5563'} />
                  </div>
                  <span style={{ color: active ? '#d1d5db' : '#6b7280', fontSize: 13, flex: 1, transition: 'color 0.3s' }}>{label}</span>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? '#10b981' : '#374151', boxShadow: active ? '0 0 6px #10b981' : 'none', flexShrink: 0, transition: 'all 0.3s' }} />
                </div>
              ))}
            </div>

            {/* Audit log preview */}
            <div className="rs-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ color: '#6b7280', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Recent Activity</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                  <span style={{ color: '#10b981', fontSize: 10 }}>Live</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {AUDIT_LOG.slice(0, 5).map(entry => (
                  <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: entry.color, boxShadow: `0 0 5px ${entry.color}`, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#9ca3af', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.detail}</div>
                    </div>
                    <span style={{ color: '#4b5563', fontSize: 10, flexShrink: 0 }}>{entry.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Main settings area ─────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 20 }}>

            {/* Tab list */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 6, flexWrap: 'wrap' }}>
              {TABS.map(({ key, label, icon: Icon, color }) => {
                const active = activeTab === key;
                return (
                  <button key={key} onClick={() => setActiveTab(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: isMobile ? '10px 14px' : '13px 16px',
                      borderRadius: 12, border: `1px solid ${active ? color + '35' : 'rgba(255,255,255,0.07)'}`,
                      background: active ? `${color}10` : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                      boxShadow: active ? `0 0 20px ${color}0e` : 'none',
                      position: 'relative', overflow: 'hidden',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}25`; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
                  >
                    {active && !isMobile && <div style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 3, borderRadius: '0 3px 3px 0', background: color, boxShadow: `0 0 10px ${color}` }} />}
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: active ? `${color}18` : 'rgba(255,255,255,0.05)', border: `1px solid ${active ? color + '30' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: active ? `0 0 14px ${color}25` : 'none', transition: 'all 0.2s' }}>
                      <Icon size={15} color={active ? color : '#6b7280'} />
                    </div>
                    {!isMobile && <span style={{ color: active ? '#e2e8f0' : '#9ca3af', fontSize: 13, fontWeight: active ? 600 : 400 }}>{label}</span>}
                  </button>
                );
              })}
            </div>

            {/* Settings panel */}
            <div className="rs-card" style={{ padding: isMobile ? 18 : 24 }}>

              {/* ── DATA PRIVACY ─────────────────────────────────────────────── */}
              {activeTab === 'privacy' && (
                <div>
                  <SectionHeader icon={Database} title="Data Privacy Settings" subtitle="Control how and where your knowledge data is stored" color="#00d4ff" />

                  <div style={{ marginBottom: 24 }}>
                    <SettingRow
                      label="Local Storage Only"
                      sub="All knowledge data stays on your device. No cloud sync or external servers."
                      on={settings.localStorageOnly} onChange={set('localStorageOnly')} color="#00d4ff" badge="Recommended"
                    />
                    <SettingRow
                      label="Encrypt Data at Rest"
                      sub="AES-256 encryption applied to all stored knowledge files and notes."
                      on={settings.encryptAtRest} onChange={set('encryptAtRest')} color="#10b981" badge="Critical"
                    />
                    <SettingRow
                      label="Anonymize Metadata"
                      sub="Strip timestamps, device info, and location data from captured sources."
                      on={settings.anonymizeMetadata} onChange={set('anonymizeMetadata')} color="#8b5cf6"
                    />
                    <SettingRow
                      label="Auto-Delete Old Captures"
                      sub="Automatically purge captures older than 90 days to minimize data footprint."
                      on={settings.autoDeleteAfter} onChange={set('autoDeleteAfter')} color="#f472b6"
                      warn="Permanent deletion cannot be undone. Review before enabling."
                    />
                    <SettingRow
                      label="Share Anonymous Usage Stats"
                      sub="Help improve RecallSense by sharing anonymized feature usage data (no content)."
                      on={settings.shareAnonymousStats} onChange={set('shareAnonymousStats')} color="#f59e0b"
                    />
                  </div>

                  {/* Storage breakdown */}
                  <div style={{ padding: 16, background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: 12 }}>
                    <div style={{ color: '#00d4ff', fontSize: 12, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Server size={13} /> Storage Breakdown
                    </div>
                    {[
                      { label: 'Knowledge Notes', size: '124 MB', pct: 42, color: '#8b5cf6' },
                      { label: 'Web Captures',    size: '87 MB',  pct: 29, color: '#00d4ff' },
                      { label: 'PDF Documents',   size: '54 MB',  pct: 18, color: '#f59e0b' },
                      { label: 'Video Metadata',  size: '33 MB',  pct: 11, color: '#ff4444' },
                    ].map(({ label, size, pct, color }) => (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: '#9ca3af', fontSize: 12 }}>{label}</span>
                          <span style={{ color, fontSize: 12, fontWeight: 600 }}>{size}</span>
                        </div>
                        <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${color}80,${color})`, borderRadius: 2, boxShadow: `0 0 6px ${color}50` }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <span style={{ color: '#6b7280', fontSize: 12 }}>Total Used</span>
                      <span style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 600 }}>298 MB / 5 GB</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CONTENT SAFETY ───────────────────────────────────────────── */}
              {activeTab === 'content' && (
                <div>
                  <SectionHeader icon={Shield} title="Sensitive Content Detection" subtitle="AI-powered filters applied to every source before capture" color="#8b5cf6" />

                  {/* AI engine status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12, marginBottom: 20 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Cpu size={18} color="#10b981" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#10b981', fontSize: 13, fontWeight: 700 }}>Neural Safety Engine v3.2</div>
                      <div style={{ color: '#6b7280', fontSize: 11, marginTop: 1 }}>5-layer AI model · 99.4% accuracy · &lt;50ms latency</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                      <span style={{ color: '#10b981', fontSize: 11, fontWeight: 600 }}>Online</span>
                    </div>
                  </div>

                  <SettingRow
                    label="Personally Identifiable Info (PII)"
                    sub="Detect and redact names, emails, phone numbers, SSNs, and addresses before storing."
                    on={settings.detectPII} onChange={set('detectPII')} color="#8b5cf6" badge="Critical"
                  />
                  <SettingRow
                    label="NSFW & Explicit Content"
                    sub="Block adult or graphic content from being captured into your knowledge base."
                    on={settings.blockNSFW} onChange={set('blockNSFW')} color="#ef4444"
                  />
                  <SettingRow
                    label="Misinformation Detection"
                    sub="Flag content identified as potentially misleading or factually inaccurate."
                    on={settings.flagMisinformation} onChange={set('flagMisinformation')} color="#f59e0b"
                  />
                  <SettingRow
                    label="Credential & Secret Redaction"
                    sub="Automatically mask API keys, passwords, tokens, and private credentials."
                    on={settings.redactCredentials} onChange={set('redactCredentials')} color="#00d4ff" badge="Recommended"
                  />
                  <SettingRow
                    label="Sensitive Topic Warnings"
                    sub="Show a review prompt before capturing content on flagged sensitive topics."
                    on={settings.warnSensitiveTopics} onChange={set('warnSensitiveTopics')} color="#f472b6"
                  />

                  {/* Detection stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 20 }}>
                    {[
                      { label: 'Threats Blocked', value: '47', color: '#ef4444', icon: ShieldAlert },
                      { label: 'PII Redacted',    value: '12', color: '#8b5cf6', icon: EyeOff },
                      { label: 'Safe Captures',   value: '2.8K', color: '#10b981', icon: ShieldCheck },
                    ].map(({ label, value, color, icon: Icon }) => (
                      <div key={label} style={{ padding: '12px 14px', background: `${color}08`, border: `1px solid ${color}20`, borderRadius: 10, textAlign: 'center' }}>
                        <Icon size={16} color={color} style={{ marginBottom: 5 }} />
                        <div style={{ color, fontSize: 20, fontWeight: 800 }}>{value}</div>
                        <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── PERMISSIONS ──────────────────────────────────────────────── */}
              {activeTab === 'permissions' && (
                <div>
                  <SectionHeader icon={Key} title="Capture Permissions" subtitle="Choose which source types RecallSense is allowed to ingest" color="#f59e0b" />

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 12, marginBottom: 24 }}>
                    {[
                      { key: 'allowYoutube',  label: 'YouTube Videos', sub: 'Extract transcripts & metadata', icon: Youtube,    color: '#ff4444',  enabled: settings.allowYoutube  },
                      { key: 'allowWebpages', label: 'Web Articles',   sub: 'Capture any URL or article',    icon: Globe,      color: '#00d4ff',  enabled: settings.allowWebpages },
                      { key: 'allowPDF',      label: 'PDF / Documents',sub: 'Upload and parse documents',    icon: FileText,   color: '#f59e0b',  enabled: settings.allowPDF      },
                      { key: 'allowNotes',    label: 'Quick Notes',    sub: 'Write & capture text content',  icon: StickyNote, color: '#8b5cf6',  enabled: settings.allowNotes    },
                      { key: 'allowImages',   label: 'Images & OCR',   sub: 'Visual content with OCR scan',  icon: Image,      color: '#f472b6',  enabled: settings.allowImages   },
                      { key: 'allowAudio',    label: 'Audio & Voice',  sub: 'Record or transcribe audio',    icon: Mic,        color: '#10b981',  enabled: settings.allowAudio    },
                    ].map(({ key, label, sub, icon: Icon, color, enabled }) => (
                      <div key={key}
                        style={{
                          padding: '16px', borderRadius: 12, cursor: 'pointer',
                          background: enabled ? `${color}08` : 'rgba(255,255,255,0.02)',
                          border: `1px solid ${enabled ? color + '30' : 'rgba(255,255,255,0.07)'}`,
                          transition: 'all 0.25s ease',
                          boxShadow: enabled ? `0 0 18px ${color}08` : 'none',
                        }}
                        onClick={() => set(key as keyof PrivacyState)(!enabled)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: enabled ? `${color}15` : 'rgba(255,255,255,0.05)', border: `1px solid ${enabled ? color + '30' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.25s' }}>
                            <Icon size={16} color={enabled ? color : '#4b5563'} />
                          </div>
                          <Toggle on={enabled} onChange={v => set(key as keyof PrivacyState)(v)} color={color} size="sm" />
                        </div>
                        <div style={{ color: enabled ? '#e2e8f0' : '#6b7280', fontSize: 13, fontWeight: 600, marginBottom: 3, transition: 'color 0.25s' }}>{label}</div>
                        <div style={{ color: '#4b5563', fontSize: 11 }}>{sub}</div>
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: enabled ? '#10b981' : '#374151', boxShadow: enabled ? '0 0 6px #10b981' : 'none', transition: 'all 0.25s' }} />
                          <span style={{ color: enabled ? '#10b981' : '#4b5563', fontSize: 10, fontWeight: 600, transition: 'color 0.25s' }}>{enabled ? 'Enabled' : 'Disabled'}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Permission summary */}
                  <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Info size={14} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ color: '#9ca3af', fontSize: 12, lineHeight: 1.6 }}>
                      <strong style={{ color: '#f59e0b' }}>
                        {[settings.allowYoutube, settings.allowWebpages, settings.allowPDF, settings.allowNotes, settings.allowImages, settings.allowAudio].filter(Boolean).length} of 6
                      </strong> capture types enabled. Disabled sources will be blocked at the capture interface and cannot be processed by the neural engine.
                    </div>
                  </div>
                </div>
              )}

              {/* ── SECURITY ─────────────────────────────────────────────────── */}
              {activeTab === 'security' && (
                <div>
                  <SectionHeader icon={Fingerprint} title="Security Controls" subtitle="Advanced protection and monitoring for your knowledge system" color="#10b981" />

                  <SettingRow
                    label="Two-Factor Capture Verification"
                    sub="Require 2FA approval for captures from untrusted or new domains."
                    on={settings.twoFactorCapture} onChange={set('twoFactorCapture')} color="#10b981"
                  />
                  <SettingRow
                    label="Security Audit Log"
                    sub="Maintain a detailed log of all capture attempts, blocks, and security events."
                    on={settings.auditLog} onChange={set('auditLog')} color="#00d4ff" badge="Recommended"
                  />
                  <SettingRow
                    label="Capture Rate Limiting"
                    sub="Limit to 50 captures/hour to prevent abuse and protect system integrity."
                    on={settings.rateLimit} onChange={set('rateLimit')} color="#8b5cf6"
                  />
                  <SettingRow
                    label="Domain Blocklist"
                    sub="Block captures from known malware, phishing, and unsafe domains (99K+ entries)."
                    on={settings.blocklistEnabled} onChange={set('blocklistEnabled')} color="#ef4444" badge="Critical"
                  />
                  <SettingRow
                    label="Threat Alerts"
                    sub="Send in-app notifications when security threats are detected and blocked."
                    on={settings.notifyThreats} onChange={set('notifyThreats')} color="#f59e0b"
                  />
                  <SettingRow
                    label="Capture Notifications"
                    sub="Notify on every successful capture completion."
                    on={settings.notifyCaptures} onChange={set('notifyCaptures')} color="#f472b6"
                  />

                  {/* Full audit log */}
                  <div style={{ marginTop: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ color: '#6b7280', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase' }}>Security Event Log</div>
                      <button style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, padding: '4px 10px', color: '#9ca3af', fontSize: 11, cursor: 'pointer' }}>
                        <RefreshCw size={10} /> Refresh
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {AUDIT_LOG.map(entry => (
                        <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: `${entry.color}06`, border: `1px solid ${entry.color}18`, borderRadius: 9 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: entry.color, boxShadow: `0 0 6px ${entry.color}`, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: entry.color, fontSize: 11, fontWeight: 600 }}>{entry.action}</div>
                            <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.detail}</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <Clock size={9} color="#4b5563" />
                            <span style={{ color: '#4b5563', fontSize: 10 }}>{entry.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Danger zone */}
                    <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 12 }}>
                      <div style={{ color: '#ef4444', fontSize: 12, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={13} /> Danger Zone
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
                          <Trash2 size={12} /> Clear Audit Log
                        </button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
                          <Trash2 size={12} /> Purge All Data
                        </button>
                        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
                          <RefreshCw size={12} /> Reset to Defaults
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Transparency footer ─────────────────────────────────────────────── */}
          <div style={{ padding: '16px 20px', background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.1)', borderRadius: 14, display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: 14, flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ShieldCheck size={20} color="#00d4ff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600, marginBottom: 3 }}>RecallSense Transparency Commitment</div>
              <div style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.6 }}>
                We never sell your data. Your knowledge stays on your device unless you explicitly enable cloud sync.
                All AI processing is opt-in and clearly disclosed. Open-source security audits published quarterly.
              </div>
            </div>
            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#00d4ff', fontSize: 12, textDecoration: 'none', flexShrink: 0 }}>
              Privacy Policy <ExternalLink size={10} />
            </a>
          </div>
        </>
      )}
    </div>
  );
}