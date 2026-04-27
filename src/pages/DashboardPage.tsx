import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Sparkles, CheckSquare, Network, GraduationCap, Zap, Timer, TrendingUp, Plus, Bot, FlipHorizontal, Activity, ArrowUpRight, Youtube, Globe, FileText, StickyNote, Flame, Check, Pin, ChevronRight, Cpu, Compass } from 'lucide-react';
import { motion } from 'motion/react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import type { Memory } from '../lib/types';

const DOMAIN_COLORS = ['#6366f1', '#9333ea', '#f472b6', '#10b981', '#f59e0b', '#ef4444'];
const SRC_ICON: Record<string, any> = { youtube: Youtube, web: Globe, pdf: FileText, note: StickyNote };
const SRC_CLR: Record<string, string> = { youtube: '#ef4444', web: '#00d4ff', pdf: '#f59e0b', note: '#10b981' };

const Dashboard = ({ isDark, user }: { isDark?: boolean; user?: any }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<Memory[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [briefing, setBriefing] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [habits, setHabits] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const rawName = (user?.displayName ?? '').trim();
  const firstName = rawName ? rawName.split(/\s+/)[0] : (user?.isAnonymous || user?.isGuest ? 'there' : 'there');

  useEffect(() => {
    Promise.all([
      fetch('/stats').then(r => r.ok ? r.json() : null),
      fetch('/memories?limit=6').then(r => r.ok ? r.json() : []),
      fetch('/logs?limit=5').then(r => r.ok ? r.json() : []),
    ]).then(([s, m, l]) => { if (s) setStats(s); setRecent(m); setLogs(l); }).catch(console.error);
    fetch('/briefing').then(r => r.ok ? r.json() : { briefing: 'Ready for another great day of learning!' })
      .then(d => setBriefing(d.briefing)).catch(() => setBriefing('Ready for another great day of learning!')).finally(() => setBriefingLoading(false));
    fetch('/habits').then(r => r.ok ? r.json() : []).then(setHabits).catch(() => setHabits([]));
    fetch('/notes?limit=4').then(r => r.ok ? r.json() : []).then(setNotes).catch(() => setNotes([]));
  }, []);

  const toggleHabit = async (h: any) => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const r = await fetch(`/habits/${h.id}/toggle?date=${today}`, { method: 'POST' });
      const updated = await r.json();
      setHabits(habits.map(x => x.id === h.id ? updated : x));
    } catch {}
  };

  const totalMem = stats?.total_memories ?? 0;
  const domains: { name: string; value: number }[] = stats?.knowledge_domains ?? [];

  const radarData = domains.length > 0
    ? domains.slice(0, 6).map((d: any) => ({ subject: d.name, value: d.value, fullMark: Math.max(...domains.map((x: any) => x.value)) + 1 }))
    : [{ subject: 'AI/ML', value: 0, fullMark: 10 }, { subject: 'Science', value: 0, fullMark: 10 }, { subject: 'Tech', value: 0, fullMark: 10 }, { subject: 'Business', value: 0, fullMark: 10 }, { subject: 'Health', value: 0, fullMark: 10 }];

  const activityData = [
    { day: 'Mon', captures: 3 }, { day: 'Tue', captures: 7 }, { day: 'Wed', captures: 2 },
    { day: 'Thu', captures: 9 }, { day: 'Fri', captures: 5 }, { day: 'Sat', captures: 4 }, { day: 'Sun', captures: totalMem },
  ];

  const statCards = [
    { label: 'Neural Memories', value: totalMem, icon: Brain, color: '#6366f1', trend: '+12%', sub: 'Total captured', route: '/vault' },
    { label: 'Pending Tasks', value: stats?.pending_tasks ?? 0, icon: CheckSquare, color: '#9333ea', trend: '2 due today', sub: 'Open tasks', route: '/tasks' },
    { label: 'AI Interactions', value: stats?.ai_interactions ?? 0, icon: Sparkles, color: '#ec4899', trend: 'Lifetime', sub: 'Recall queries', route: '/recall' },
    { label: 'Knowledge Domains', value: domains.length, icon: Network, color: '#10b981', trend: 'Active', sub: 'Topics tracked', route: '/graph' },
    { label: 'Flashcards', value: stats?.flashcards ?? 0, icon: GraduationCap, color: '#f59e0b', trend: 'Study ready', sub: 'Created', route: '/flashcards' },
    { label: 'Learning Streak', value: stats?.streak_days ?? 0, icon: Zap, color: '#ef4444', trend: 'Days', sub: 'Current streak', route: '/flashcards' },
    { label: 'Focus Sessions', value: stats?.focus_sessions ?? 0, icon: Timer, color: '#06b6d4', trend: 'This week', sub: 'Deep work', route: '/tasks' },
    { label: 'Captured Today', value: stats?.captured_today ?? 0, icon: TrendingUp, color: '#8b5cf6', trend: 'Today', sub: 'New memories', route: '/capture' },
  ];

  const S = {
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: isDark ? '0 2px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' : '0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.88)', transition: 'all 0.2s' } as React.CSSProperties,
  };

  return (
    <div style={{ color: 'var(--text-1)' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div className="dash-header-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.08em', fontWeight: 500 }}>NEURAL OS ACTIVE</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
              {totalMem === 0 ? <>Welcome, <span style={{ color: 'var(--primary)' }}>{firstName}</span></> : <>Welcome back, <span style={{ color: 'var(--primary)' }}>{firstName}</span></>}
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>{today}</p>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="dash-briefing"
            style={{ ...S.card, maxWidth: 360, padding: '14px 18px', border: '1px solid var(--primary-border)', flex: '1 1 280px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Sparkles size={15} color="var(--primary)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: 'var(--primary)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 5, fontWeight: 700 }}>AI DAILY BRIEFING</div>
                {briefingLoading
                  ? <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>{[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', opacity: 0.4, animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}</div>
                  : <p style={{ color: 'var(--text-2)', fontSize: 12, lineHeight: 1.55, margin: 0 }}>{briefing}</p>
                }
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {stats && totalMem === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.10) 0%, rgba(34,211,238,0.06) 50%, rgba(129,140,248,0.08) 100%)',
            border: '1px solid rgba(59,130,246,0.28)',
            borderRadius: 18,
            padding: '24px 26px',
            marginBottom: 18,
            overflow: 'hidden',
            boxShadow: '0 8px 32px -10px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div aria-hidden style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, background: 'radial-gradient(circle, rgba(59,130,246,0.22) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Sparkles size={14} color="var(--primary)" />
              <span style={{ fontSize: 10.5, letterSpacing: '0.18em', color: 'var(--primary)', fontWeight: 700 }}>GET STARTED</span>
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              Capture your first memory in 30 seconds
            </h2>
            <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-2)', maxWidth: 560, lineHeight: 1.55 }}>
              Pick any source — your 7 AI agents will read, summarize, tag and link it to your knowledge graph automatically.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
              {[
                { label: 'Save a Website', sub: 'Paste a URL', icon: Globe, color: '#22d3ee', path: '/capture' },
                { label: 'YouTube Video', sub: 'Auto transcribe', icon: Youtube, color: '#ef4444', path: '/capture' },
                { label: 'Quick Note', sub: 'Type a thought', icon: StickyNote, color: '#10b981', path: '/capture' },
                { label: 'Ask Recall AI', sub: 'Try a question', icon: Bot, color: '#818cf8', path: '/recall' },
              ].map((t) => (
                <button key={t.label} onClick={() => navigate(t.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'all 0.18s', textAlign: 'left',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${t.color}66`; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 18px ${t.color}22`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.transform = ''; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 9, background: `${t.color}1a`, border: `1px solid ${t.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <t.icon size={15} color={t.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', lineHeight: 1.2 }}>{t.label}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>{t.sub}</div>
                  </div>
                  <ArrowUpRight size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      <div className="stat-cards-grid">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            onClick={() => navigate(s.route)}
            style={{ ...S.card, padding: '16px 18px', cursor: 'pointer', background: 'var(--surface)', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = 'translateY(-3px)';
              el.style.boxShadow = `0 8px 24px ${s.color}22, inset 0 1px 0 rgba(255,255,255,0.9)`;
              el.style.borderColor = `${s.color}50`;
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLDivElement;
              el.style.transform = '';
              el.style.boxShadow = isDark ? '0 2px 14px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)' : '0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)';
              el.style.borderColor = 'var(--border)';
            }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}14`, border: `1px solid ${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6)` }}>
                <s.icon size={16} color={s.color} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 9.5, color: s.color, background: `${s.color}14`, border: `1px solid ${s.color}22`, padding: '2px 7px', borderRadius: 20, fontWeight: 600, letterSpacing: '0.2px' }}>{s.trend}</span>
                <ArrowUpRight size={11} color={s.color} style={{ opacity: 0.6 }} />
              </div>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1, marginBottom: 3, letterSpacing: '-0.5px', fontFamily: "'Alegreya Sans SC', system-ui" }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 1 }}>{s.label}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{s.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="dash-chart-row" style={{ marginBottom: 16 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ ...S.card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14 }}>Capture Activity</div>
              <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>Weekly knowledge flow</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#10b981', fontSize: 11, fontWeight: 500 }}>
              <Activity size={12} /> <span>Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={activityData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-1)', boxShadow: 'var(--shadow-md)' }} cursor={{ stroke: 'rgba(99,102,241,0.15)' }} />
              <Line type="monotone" dataKey="captures" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#6366f1' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ ...S.card, padding: '18px 20px' }}>
          <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Knowledge Radar</div>
          <div style={{ color: 'var(--text-3)', fontSize: 11, marginBottom: 4 }}>Domain spread</div>
          <ResponsiveContainer width="100%" height={170}>
            <RadarChart data={radarData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 9 }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.12} strokeWidth={2} dot={{ r: 2, fill: '#6366f1' }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="dash-bottom-row">
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ ...S.card, padding: '18px 20px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14 }}>Recent Memories</div>
              <button onClick={() => navigate('/vault')} style={{ color: '#6366f1', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, flexShrink: 0 }}>
                View all <ArrowUpRight size={11} />
              </button>
            </div>
            {recent.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recent.map((mem) => {
                  const Icon = SRC_ICON[mem.source_type] ?? Brain;
                  const clr = SRC_CLR[mem.source_type] ?? '#6366f1';
                  return (
                    <div key={mem.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', transition: 'all 0.15s', cursor: 'default', overflow: 'hidden', minWidth: 0 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary-border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--primary-bg)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: `${clr}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={13} color={clr} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mem.title}</div>
                        <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const, lineHeight: 1.4 }}>{mem.summary}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                        <span style={{ fontSize: 9, color: clr, background: `${clr}15`, padding: '2px 6px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{mem.source_type}</span>
                        <span style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{new Date(mem.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '36px 0', textAlign: 'center' }}>
                <Brain size={32} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No memories yet</p>
                <button onClick={() => navigate('/capture')} style={{ marginTop: 10, color: '#6366f1', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Capture your first memory →</button>
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ ...S.card, padding: '18px 20px', marginTop: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14 }}>Recent AI Interactions</div>
              <button onClick={() => navigate('/recall')} style={{ color: '#9333ea', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, flexShrink: 0 }}>
                Open Recall <ArrowUpRight size={11} />
              </button>
            </div>
            {logs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', overflow: 'hidden', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3, gap: 8 }}>
                      <span style={{ color: 'var(--text-1)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{log.user_message}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: 10, flexShrink: 0, whiteSpace: 'nowrap' }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ color: 'var(--text-2)', fontSize: 11, margin: 0, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{log.reply}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No interactions yet. Try Recall AI!</div>
            )}
          </motion.div>

          {/* Today's Habits widget */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ ...S.card, padding: '18px 20px', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Flame size={14} color="#10b981" />
                <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14 }}>Today's Habits</div>
                {habits.length > 0 && (
                  <span style={{ padding: '1px 8px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10, color: '#10b981', fontSize: 10, fontWeight: 700 }}>
                    {habits.filter(h => h.completed_today).length}/{habits.length}
                  </span>
                )}
              </div>
              <button onClick={() => navigate('/habits')} style={{ color: '#10b981', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                View all <ArrowUpRight size={11} />
              </button>
            </div>
            {habits.length === 0 ? (
              <div style={{ padding: '14px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>No habits — <button onClick={() => navigate('/habits')} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>create one</button></div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
                {habits.slice(0, 4).map(h => (
                  <button key={h.id} onClick={() => toggleHabit(h)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 11px', background: h.completed_today ? `${h.color}15` : 'var(--surface-2)', border: `1px solid ${h.completed_today ? h.color + '40' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: h.completed_today ? h.color : 'transparent', border: `2px solid ${h.completed_today ? h.color : 'var(--border-2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {h.completed_today && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text-1)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</div>
                      {h.streak > 0 && <div style={{ color: '#f59e0b', fontSize: 10, marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}><Flame size={9} /> {h.streak}d streak</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Recent Notes widget */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} style={{ ...S.card, padding: '18px 20px', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StickyNote size={14} color="#f59e0b" />
                <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14 }}>Recent Notes</div>
              </div>
              <button onClick={() => navigate('/notes')} style={{ color: '#f59e0b', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                Open notes <ArrowUpRight size={11} />
              </button>
            </div>
            {notes.length === 0 ? (
              <div style={{ padding: '14px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>No notes yet — <button onClick={() => navigate('/notes')} style={{ color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>create one</button></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {notes.slice(0, 3).map(n => (
                  <button key={n.id} onClick={() => navigate('/notes')}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}>
                    {n.pinned && <Pin size={11} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text-1)', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                      <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(n.content || '').replace(/[#*`]/g, '').slice(0, 60)}</div>
                    </div>
                    <ChevronRight size={11} color="var(--text-3)" style={{ flexShrink: 0, marginTop: 3 }} />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.42 }} style={{ ...S.card, padding: '18px 20px' }}>
            <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14, marginBottom: 14 }}>Knowledge Domains</div>
            {domains.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {domains.slice(0, 5).map((d: any, i: number) => {
                  const pct = Math.round((d.value / (totalMem || 1)) * 100);
                  const clr = DOMAIN_COLORS[i % DOMAIN_COLORS.length];
                  return (
                    <div key={d.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{d.name}</span>
                        <span style={{ color: clr, fontSize: 11, fontWeight: 600 }}>{d.value}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.5 + i * 0.1 }}
                          style={{ height: '100%', borderRadius: 4, background: clr }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Start capturing to see domains</div>
            )}
          </motion.div>

          {domains.length > 0 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.47 }} style={{ ...S.card, padding: '18px 20px' }}>
              <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Domain Distribution</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={domains.slice(0, 6)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 8 }} axisLine={false} tickLine={false} />
                  <YAxis tick={false} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11, color: 'var(--text-1)', boxShadow: 'var(--shadow-md)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {domains.slice(0, 6).map((_: any, i: number) => <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} style={{ ...S.card, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14 }}>Power Hub</div>
              <span style={{ fontSize: 9, letterSpacing: '0.18em', color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase' }}>One-click</span>
            </div>
            <div className="power-hub-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 7 }}>
              {[
                { label: 'Capture',     icon: Plus,           path: '/capture',    color: '#ffffff', bg: 'linear-gradient(135deg,#6366f1,#4f46e5)', isAccent: true },
                { label: 'Agent Hub',   icon: Cpu,            path: '/agent',      color: '#3b82f6', bg: `rgba(59,130,246,0.08)` },
                { label: 'Recall AI',   icon: Bot,            path: '/recall',     color: '#9333ea', bg: `rgba(147,51,234,0.08)` },
                { label: 'Discover',    icon: Compass,        path: '/discover',   color: '#06b6d4', bg: `rgba(6,182,212,0.08)` },
                { label: 'Flashcards',  icon: FlipHorizontal, path: '/flashcards', color: '#ec4899', bg: `rgba(236,72,153,0.08)` },
                { label: 'Tasks',       icon: CheckSquare,    path: '/tasks',      color: '#10b981', bg: `rgba(16,185,129,0.08)` },
                { label: 'Mind Graph',  icon: Network,        path: '/graph',      color: '#06b6d4', bg: `rgba(6,182,212,0.08)` },
                { label: 'Study Plan',  icon: GraduationCap,  path: '/plan',       color: '#7c3aed', bg: `rgba(124,58,237,0.08)` },
              ].map((a) => (
                <button key={a.label} onClick={() => navigate(a.path)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9, background: a.bg, border: `1px solid ${a.isAccent ? '#4f46e5' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = a.isAccent ? '0 4px 12px rgba(99,102,241,0.35)' : `0 4px 12px ${a.color}25`; if (!a.isAccent) (e.currentTarget as HTMLButtonElement).style.borderColor = `${a.color}50`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; if (!a.isAccent) (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}>
                  <a.icon size={13} color={a.isAccent ? '#ffffff' : a.color} />
                  <span style={{ color: a.isAccent ? '#ffffff' : a.color, fontSize: 11.5, fontWeight: 600, letterSpacing: '-0.1px' }}>{a.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="dash-chart-row" style={{ marginTop: 16 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} style={{ ...S.card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14 }}>Learning Goals</div>
              <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 2 }}>Weekly progress tracker</div>
            </div>
            <div style={{ padding: '4px 10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, fontSize: 10.5, color: 'var(--primary)', fontWeight: 600 }}>This Week</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Knowledge Captures', current: totalMem, target: 20, color: '#6366f1' },
              { label: 'AI Recall Sessions', current: stats?.ai_interactions ?? 0, target: 10, color: '#9333ea' },
              { label: 'Flashcard Reviews', current: stats?.flashcards ?? 0, target: 15, color: '#f59e0b' },
              { label: 'Tasks Completed', current: Math.max(0, (stats?.total_tasks ?? 0) - (stats?.pending_tasks ?? 0)), target: 8, color: '#10b981' },
            ].map((goal) => {
              const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
              return (
                <div key={goal.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 500 }}>{goal.label}</span>
                    <span style={{ color: pct >= 100 ? '#10b981' : 'var(--text-3)', fontSize: 11, fontWeight: 600 }}>{goal.current}/{goal.target}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.6 }}
                      style={{ height: '100%', borderRadius: 6, background: pct >= 100 ? '#10b981' : goal.color, boxShadow: `0 0 8px ${goal.color}40` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.58 }} style={{ ...S.card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14 }}>System Status</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Neural AI Engine', status: 'Online', color: '#10b981', icon: Brain },
              { label: 'Knowledge Indexer', status: 'Active', color: '#6366f1', icon: Network },
              { label: 'Recall Memory', status: `${totalMem} nodes`, color: '#9333ea', icon: Brain },
              { label: 'Calendar Sync', status: 'Synced', color: '#f59e0b', icon: CheckSquare },
              { label: 'Agent Hub', status: '7 Agents', color: '#ec4899', icon: Bot },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: `${item.color}15`, border: `1px solid ${item.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <item.icon size={12} color={item.color} />
                  </div>
                  <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{item.label}</span>
                </div>
                <span style={{ fontSize: 11, color: item.color, fontWeight: 600, background: `${item.color}12`, padding: '2px 8px', borderRadius: 12, border: `1px solid ${item.color}20` }}>{item.status}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
