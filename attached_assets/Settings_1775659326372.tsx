import { useState } from 'react';
import {
  User, Bell, Palette, Brain, Zap, Globe, Moon, Sun,
  Monitor, Lock, Key, Trash2, Download, Upload,
  CheckCircle2, ChevronRight, Loader, Shield,
  Volume2, VolumeX, Eye, EyeOff, Sliders, Database,
  RefreshCw, LogOut, Mail, Smartphone, Clock, Sparkles
} from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';

// ── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ on, onChange, color = '#00d4ff' }: { on: boolean; onChange: (v: boolean) => void; color?: string }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 42, height: 23, borderRadius: 12, flexShrink: 0,
        background: on ? color : 'rgba(255,255,255,0.1)',
        border: `1px solid ${on ? color + '60' : 'rgba(255,255,255,0.12)'}`,
        cursor: 'pointer', position: 'relative', transition: 'all 0.25s ease',
        boxShadow: on ? `0 0 14px ${color}50` : 'none',
      }}
    >
      <div style={{
        position: 'absolute', top: 3,
        left: on ? 22 : 3,
        width: 16, height: 16, borderRadius: '50%',
        background: on ? '#fff' : '#6b7280',
        boxShadow: on ? `0 0 8px ${color}80` : 'none',
        transition: 'all 0.25s ease',
      }} />
    </div>
  );
}

// ── Setting Row ──────────────────────────────────────────────────────────────
function SettingRow({ label, sub, children, noBorder }: {
  label: string; sub?: string; children: React.ReactNode; noBorder?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      padding: '14px 0',
      borderBottom: noBorder ? 'none' : '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#d1d5db', fontSize: 14, fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

// ── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color = '#00d4ff' }: { icon: any; title: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={color} />
      </div>
      <span style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700 }}>{title}</span>
    </div>
  );
}

type Tab = 'profile' | 'appearance' | 'notifications' | 'ai' | 'data' | 'account';

const TABS: { key: Tab; label: string; icon: any; color: string }[] = [
  { key: 'profile',       label: 'Profile',        icon: User,      color: '#00d4ff' },
  { key: 'appearance',    label: 'Appearance',      icon: Palette,   color: '#8b5cf6' },
  { key: 'notifications', label: 'Notifications',   icon: Bell,      color: '#f59e0b' },
  { key: 'ai',            label: 'AI & Neural',     icon: Brain,     color: '#f472b6' },
  { key: 'data',          label: 'Data & Storage',  icon: Database,  color: '#10b981' },
  { key: 'account',       label: 'Account',         icon: Shield,    color: '#ef4444' },
];

export function Settings() {
  const { isMobile, isTablet } = useWindowSize();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [saved, setSaved] = useState(false);

  // Profile
  const [name, setName] = useState('Alex Chen');
  const [email, setEmail] = useState('alex@recallsense.ai');
  const [bio, setBio] = useState('AI researcher · Knowledge architect · Neural OS enthusiast');

  // Appearance
  const [theme, setTheme] = useState<'dark' | 'darker' | 'midnight'>('dark');
  const [accentColor, setAccentColor] = useState('#00d4ff');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [glowEffects, setGlowEffects] = useState(true);

  // Notifications
  const [captureNotifs, setCaptureNotifs] = useState(true);
  const [insightNotifs, setInsightNotifs] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState(false);

  // AI
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [autoTag, setAutoTag] = useState(true);
  const [neuralConnections, setNeuralConnections] = useState(true);
  const [aiSummary, setAiSummary] = useState(true);
  const [modelQuality, setModelQuality] = useState<'fast' | 'balanced' | 'best'>('balanced');

  // Data
  const [autoBackup, setAutoBackup] = useState(true);
  const [compressionEnabled, setCompressionEnabled] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const cols = isMobile ? '1fr' : isTablet ? '1fr' : '240px 1fr';

  const ACCENTS = ['#00d4ff', '#8b5cf6', '#f472b6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 18 : 24 }}>

      {/* Header */}
      <div className="fade-in-up">
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: isMobile ? 22 : 26, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
              Settings
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              Configure RecallSense to match your workflow
            </p>
          </div>
          <button
            onClick={handleSave}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
              borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              background: saved ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#00d4ff,#0099cc)',
              color: '#fff', boxShadow: saved ? '0 0 20px rgba(16,185,129,0.4)' : '0 0 20px rgba(0,212,255,0.3)',
              transition: 'all 0.3s ease',
            }}
          >
            {saved ? <CheckCircle2 size={15} /> : <Zap size={15} />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 20 }}>

        {/* ── Sidebar tabs ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: 5, flexWrap: 'wrap' }}>
          {TABS.map(({ key, label, icon: Icon, color }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: isMobile ? '9px 13px' : '12px 14px',
                  borderRadius: 11,
                  border: `1px solid ${active ? color + '35' : 'rgba(255,255,255,0.06)'}`,
                  background: active ? `${color}10` : 'rgba(255,255,255,0.02)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                  boxShadow: active ? `0 0 18px ${color}10` : 'none',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {active && !isMobile && (
                  <div style={{ position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 3, borderRadius: '0 3px 3px 0', background: color, boxShadow: `0 0 10px ${color}` }} />
                )}
                <div style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: active ? `${color}18` : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${active ? color + '30' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s',
                }}>
                  <Icon size={14} color={active ? color : '#6b7280'} />
                </div>
                {!isMobile && (
                  <span style={{ color: active ? '#e2e8f0' : '#9ca3af', fontSize: 13, fontWeight: active ? 600 : 400 }}>
                    {label}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Panel ────────────────────────────────────────────────────────── */}
        <div className="rs-card" style={{ padding: isMobile ? 18 : 26 }}>

          {/* PROFILE */}
          {activeTab === 'profile' && (
            <div>
              <SectionHeader icon={User} title="Profile Settings" color="#00d4ff" />

              {/* Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#8b5cf6,#f472b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 25px rgba(139,92,246,0.4)', fontSize: 24, fontWeight: 700, color: '#fff' }}>
                  {name.charAt(0)}
                </div>
                <div>
                  <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600 }}>{name}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>Pro Neural Plan</div>
                  <button style={{ marginTop: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 7, padding: '5px 12px', color: '#9ca3af', fontSize: 12, cursor: 'pointer' }}>
                    Change Avatar
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
                <div>
                  <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Display Name</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="rs-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Email Address</label>
                  <input
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="rs-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ color: '#9ca3af', fontSize: 12, display: 'block', marginBottom: 6 }}>Bio</label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="rs-input scroll-custom"
                    style={{ width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              {/* Plan */}
              <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ color: '#00d4ff', fontSize: 13, fontWeight: 700 }}>Pro Neural Plan</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>5 GB storage · Unlimited captures · AI features</div>
                </div>
                <button style={{ background: 'linear-gradient(135deg,#00d4ff,#0099cc)', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Manage Plan
                </button>
              </div>
            </div>
          )}

          {/* APPEARANCE */}
          {activeTab === 'appearance' && (
            <div>
              <SectionHeader icon={Palette} title="Appearance" color="#8b5cf6" />

              {/* Theme */}
              <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: '#d1d5db', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Theme</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {([
                    { key: 'dark',     label: 'Dark',      bg: '#0a0a1a' },
                    { key: 'darker',   label: 'Darker',    bg: '#050508' },
                    { key: 'midnight', label: 'Midnight',  bg: '#000010' },
                  ] as const).map(({ key, label, bg }) => (
                    <button
                      key={key}
                      onClick={() => setTheme(key)}
                      style={{
                        padding: '14px', borderRadius: 11, border: `2px solid ${theme === key ? '#8b5cf6' : 'rgba(255,255,255,0.08)'}`,
                        background: bg, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                        boxShadow: theme === key ? '0 0 18px rgba(139,92,246,0.3)' : 'none',
                      }}
                    >
                      <div style={{ width: '100%', height: 30, borderRadius: 6, background: `linear-gradient(135deg,rgba(0,212,255,0.3),rgba(139,92,246,0.3))` }} />
                      <span style={{ color: theme === key ? '#8b5cf6' : '#9ca3af', fontSize: 12, fontWeight: theme === key ? 600 : 400 }}>{label}</span>
                      {theme === key && <CheckCircle2 size={13} color="#8b5cf6" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent color */}
              <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: '#d1d5db', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Accent Color</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {ACCENTS.map(color => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      style={{
                        width: 34, height: 34, borderRadius: '50%', background: color, border: `3px solid ${accentColor === color ? '#fff' : 'transparent'}`,
                        cursor: 'pointer', boxShadow: accentColor === color ? `0 0 14px ${color}80` : 'none', transition: 'all 0.2s',
                      }}
                    />
                  ))}
                </div>
              </div>

              <SettingRow label="Enable Animations" sub="Smooth transitions and micro-animations throughout the app">
                <Toggle on={animationsEnabled} onChange={setAnimationsEnabled} color="#8b5cf6" />
              </SettingRow>
              <SettingRow label="Glow Effects" sub="Neural glow effects on active elements and cards">
                <Toggle on={glowEffects} onChange={setGlowEffects} color="#8b5cf6" />
              </SettingRow>
              <SettingRow label="Compact Mode" sub="Reduce spacing for a denser, more information-rich layout" noBorder>
                <Toggle on={compactMode} onChange={setCompactMode} color="#8b5cf6" />
              </SettingRow>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div>
              <SectionHeader icon={Bell} title="Notifications" color="#f59e0b" />
              <SettingRow label="Capture Completions" sub="Notify when a knowledge capture finishes processing">
                <Toggle on={captureNotifs} onChange={setCaptureNotifs} color="#f59e0b" />
              </SettingRow>
              <SettingRow label="New AI Insights" sub="Alert when the neural engine discovers new connections">
                <Toggle on={insightNotifs} onChange={setInsightNotifs} color="#f59e0b" />
              </SettingRow>
              <SettingRow label="Weekly Neural Digest" sub="A curated summary of your knowledge activity every Monday">
                <Toggle on={weeklyDigest} onChange={setWeeklyDigest} color="#f59e0b" />
              </SettingRow>
              <SettingRow label="Email Notifications" sub="Send notification summaries to your email">
                <Toggle on={emailNotifs} onChange={setEmailNotifs} color="#f59e0b" />
              </SettingRow>
              <SettingRow label="Sound Effects" sub="Play subtle sounds for capture and AI events" noBorder>
                <Toggle on={soundEnabled} onChange={setSoundEnabled} color="#f59e0b" />
              </SettingRow>
            </div>
          )}

          {/* AI & NEURAL */}
          {activeTab === 'ai' && (
            <div>
              <SectionHeader icon={Brain} title="AI & Neural Engine" color="#f472b6" />

              {/* Model quality */}
              <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: '#d1d5db', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>Processing Quality</div>
                <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 12 }}>Balance between speed and depth of analysis</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                  {([
                    { key: 'fast',     label: 'Fast',     sub: '<1s · Basic',     color: '#10b981' },
                    { key: 'balanced', label: 'Balanced', sub: '~2s · Smart',     color: '#f59e0b' },
                    { key: 'best',     label: 'Best',     sub: '~5s · Deep',      color: '#f472b6' },
                  ] as const).map(({ key, label, sub, color }) => (
                    <button
                      key={key}
                      onClick={() => setModelQuality(key)}
                      style={{
                        padding: '12px', borderRadius: 10, border: `1px solid ${modelQuality === key ? color + '40' : 'rgba(255,255,255,0.08)'}`,
                        background: modelQuality === key ? `${color}10` : 'rgba(255,255,255,0.02)', cursor: 'pointer', textAlign: 'center',
                        boxShadow: modelQuality === key ? `0 0 16px ${color}15` : 'none',
                      }}
                    >
                      <Sparkles size={16} color={modelQuality === key ? color : '#4b5563'} style={{ marginBottom: 5 }} />
                      <div style={{ color: modelQuality === key ? '#e2e8f0' : '#9ca3af', fontSize: 13, fontWeight: modelQuality === key ? 600 : 400 }}>{label}</div>
                      <div style={{ color: '#4b5563', fontSize: 10, marginTop: 2 }}>{sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              <SettingRow label="Auto-Suggest Connections" sub="Automatically suggest related memories when capturing">
                <Toggle on={autoSuggest} onChange={setAutoSuggest} color="#f472b6" />
              </SettingRow>
              <SettingRow label="Auto-Tagging" sub="Let AI suggest and apply tags to your captures">
                <Toggle on={autoTag} onChange={setAutoTag} color="#f472b6" />
              </SettingRow>
              <SettingRow label="Neural Connection Mapping" sub="Build a live graph of connections between all captures">
                <Toggle on={neuralConnections} onChange={setNeuralConnections} color="#f472b6" />
              </SettingRow>
              <SettingRow label="AI Capture Summaries" sub="Generate a summary for every new capture automatically" noBorder>
                <Toggle on={aiSummary} onChange={setAiSummary} color="#f472b6" />
              </SettingRow>
            </div>
          )}

          {/* DATA & STORAGE */}
          {activeTab === 'data' && (
            <div>
              <SectionHeader icon={Database} title="Data & Storage" color="#10b981" />

              <SettingRow label="Auto-Backup" sub="Automatically back up your knowledge base every 24 hours">
                <Toggle on={autoBackup} onChange={setAutoBackup} color="#10b981" />
              </SettingRow>
              <SettingRow label="Compress Old Captures" sub="Apply compression to captures older than 30 days" noBorder>
                <Toggle on={compressionEnabled} onChange={setCompressionEnabled} color="#10b981" />
              </SettingRow>

              {/* Storage bar */}
              <div style={{ marginTop: 20, padding: '16px', background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>Storage Used</span>
                  <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>298 MB / 5 GB</span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{ height: '100%', width: '5.9%', background: 'linear-gradient(90deg,#10b981,#34d399)', borderRadius: 4, boxShadow: '0 0 8px #10b98160' }} />
                </div>
                <div style={{ color: '#4b5563', fontSize: 12 }}>4.7 GB remaining · Plenty of space</div>
              </div>

              {/* Export / Import */}
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.25)', background: 'rgba(16,185,129,0.07)', color: '#10b981', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Download size={14} /> Export Data
                </button>
                <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 10, border: '1px solid rgba(0,212,255,0.25)', background: 'rgba(0,212,255,0.07)', color: '#00d4ff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  <Upload size={14} /> Import Data
                </button>
              </div>
            </div>
          )}

          {/* ACCOUNT */}
          {activeTab === 'account' && (
            <div>
              <SectionHeader icon={Shield} title="Account & Security" color="#ef4444" />

              {/* Change password */}
              <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: '#d1d5db', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Change Password</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="password" placeholder="Current password" className="rs-input" style={{ width: '100%' }} />
                  <input type="password" placeholder="New password" className="rs-input" style={{ width: '100%' }} />
                  <input type="password" placeholder="Confirm new password" className="rs-input" style={{ width: '100%' }} />
                  <button style={{ alignSelf: 'flex-start', padding: '9px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg,#00d4ff,#0099cc)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Update Password
                  </button>
                </div>
              </div>

              {/* Sessions */}
              <div style={{ padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ color: '#d1d5db', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Active Sessions</div>
                {[
                  { device: 'Chrome · MacBook Pro',   location: 'San Francisco, US', time: 'Now',     current: true  },
                  { device: 'Safari · iPhone 15 Pro', location: 'San Francisco, US', time: '2h ago',  current: false },
                  { device: 'Firefox · Windows 11',   location: 'New York, US',      time: '3d ago',  current: false },
                ].map(({ device, location, time, current }) => (
                  <div key={device} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Monitor size={14} color={current ? '#10b981' : '#6b7280'} />
                      <div>
                        <div style={{ color: current ? '#e2e8f0' : '#9ca3af', fontSize: 13 }}>{device}</div>
                        <div style={{ color: '#4b5563', fontSize: 11 }}>{location} · {time}</div>
                      </div>
                    </div>
                    {current
                      ? <span style={{ color: '#10b981', fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 5, padding: '2px 7px' }}>Current</span>
                      : <button style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 10px', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>Revoke</button>
                    }
                  </div>
                ))}
              </div>

              {/* Danger zone */}
              <div style={{ marginTop: 20, padding: '16px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 12 }}>
                <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 700, marginBottom: 12 }}>⚠ Danger Zone</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: 'fit-content' }}>
                    <LogOut size={14} /> Sign Out of All Devices
                  </button>
                  <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#ef4444', fontSize: 13, fontWeight: 500, cursor: 'pointer', width: 'fit-content' }}>
                    <Trash2 size={14} /> Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
