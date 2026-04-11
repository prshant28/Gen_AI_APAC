import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain, Search, CheckSquare, Calendar as CalendarIcon, LayoutDashboard, Plus,
  Youtube, Globe, FileText, StickyNote, Send, Loader2, Tag, Clock, ExternalLink,
  ChevronRight, CheckCircle2, X, Save, Sparkles, AlertCircle, Settings, Shield,
  AlertTriangle, Zap, Trash2, BookOpen, Target, TrendingUp, RotateCcw, ChevronLeft,
  GraduationCap, Lightbulb, FlipHorizontal, Award, Bell, Download, Upload,
  ArrowUpRight, Database, Bot, Network, Star, Activity, Menu, GitBranch,
  BarChart2, Workflow, Timer, Layers, Filter, Hash, ChevronDown, CheckCheck,
  Cpu, Boxes, Map, LayoutGrid, SlidersHorizontal, PieChart, CalendarDays, Kanban,
  FolderOpen, PlusCircle, MoreHorizontal, GripVertical, Circle, Square,
  Moon, Sun, LogOut, Mail, Lock, LogIn, ArrowLeft, User as UserIcon
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  resetPassword,
  checkRedirectResult,
  signOut as firebaseSignOut,
  signInAsGuest,
} from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── YouTube helpers ───────────────────────────────────────────────────────────

const getYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url?.match(p);
    if (m) return m[1];
  }
  return null;
};

const YouTubeEmbed = ({ url }: { url: string }) => {
  const id = getYouTubeId(url);
  if (!id) return null;
  return (
    <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', width: '100%', position: 'relative', paddingBottom: '56.25%', height: 0 }}>
      <iframe
        src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`}
        title="YouTube video"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
};

const YouTubeThumbnail = ({ url, onClick }: { url: string; onClick?: () => void }) => {
  const id = getYouTubeId(url);
  if (!id) return null;
  return (
    <div onClick={onClick} style={{ position: 'relative', borderRadius: '12px 12px 0 0', overflow: 'hidden', background: '#000', cursor: onClick ? 'pointer' : 'default' }}>
      <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="YouTube thumbnail"
        style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', opacity: 0.85 }} />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(239,68,68,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(239,68,68,0.5)' }}>
          <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', background: 'rgba(239,68,68,0.9)', borderRadius: 4, color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '1px' }}>YOUTUBE</div>
    </div>
  );
};

type View = 'dashboard' | 'capture' | 'vault' | 'recall' | 'tasks' | 'calendar' | 'flashcards' | 'settings' | 'timeline' | 'graph' | 'workspace' | 'analytics' | 'agent';

interface Memory {
  id: string;
  title: string;
  summary: string;
  key_points: string[];
  tags: string[];
  domain: string;
  source_type: 'youtube' | 'web' | 'pdf' | 'note';
  source_url?: string;
  created_at: string;
}

interface Flashcard {
  question: string;
  answer: string;
}

// ─── Neural Background ────────────────────────────────────────────────────────

const NeuralBackground = () => null;

// ─── Sidebar ────────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { id: 'dashboard',  label: 'Dashboard',   icon: LayoutDashboard, color: '#00d4ff' },
      { id: 'agent',      label: 'Agent Hub',    icon: Cpu,             color: '#a78bfa' },
      { id: 'capture',    label: 'Capture',      icon: Plus,            color: '#8b5cf6' },
      { id: 'vault',      label: 'Vault',        icon: Database,        color: '#f472b6' },
      { id: 'recall',     label: 'Neural Recall',icon: Bot,             color: '#00d4ff' },
    ]
  },
  {
    label: 'Explore',
    items: [
      { id: 'timeline',   label: 'Timeline',     icon: GitBranch,       color: '#f472b6' },
      { id: 'graph',      label: 'Mind Graph',   icon: Network,         color: '#8b5cf6' },
      { id: 'analytics',  label: 'Analytics',    icon: BarChart2,       color: '#10b981' },
      { id: 'workspace',  label: 'Workspace',    icon: Kanban,          color: '#f59e0b' },
    ]
  },
  {
    label: 'Learn',
    items: [
      { id: 'tasks',      label: 'Tasks',        icon: CheckSquare,     color: '#10b981' },
      { id: 'flashcards', label: 'Flashcards',   icon: FlipHorizontal,  color: '#f59e0b' },
      { id: 'calendar',   label: 'Calendar',     icon: CalendarIcon,    color: '#f472b6' },
    ]
  },
  {
    label: 'System',
    items: [
      { id: 'settings',   label: 'Settings',     icon: Settings,        color: '#6b7280' },
    ]
  },
];
const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

const Sidebar = ({ currentView, setView, isCollapsed, setIsCollapsed, user, onSignOut }: {
  currentView: View; setView: (v: View) => void; isCollapsed: boolean; setIsCollapsed: (v: boolean) => void;
  user: any; onSignOut: () => void;
}) => {
  const w = isCollapsed ? 60 : 220;
  const navRef = useRef<HTMLElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = navRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => { el.removeEventListener('scroll', checkScroll); window.removeEventListener('resize', checkScroll); };
  }, [checkScroll, isCollapsed]);

  return (
    <div style={{
      width: '100%', minWidth: 0, height: '100%', background: 'var(--surface)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Logo + collapse toggle */}
      <div style={{ padding: isCollapsed ? '12px 0' : '14px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0, minHeight: 56, justifyContent: isCollapsed ? 'center' : 'flex-start', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.03)' }}>
        <div
          onClick={() => isCollapsed && setIsCollapsed(false)}
          title={isCollapsed ? 'Expand sidebar' : ''}
          style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1 0%,#9333ea 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.2)', cursor: isCollapsed ? 'pointer' : 'default', transition: 'transform 0.15s', userSelect: 'none' }}
          onMouseEnter={e => { if (isCollapsed) (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'; }}
        >
          <Brain size={18} color="white" />
        </div>
        {!isCollapsed && (
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: 14, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>Recall X247</div>
            <div style={{ color: 'var(--primary)', fontSize: 9, letterSpacing: '1.8px', textTransform: 'uppercase', fontWeight: 600, marginTop: 1 }}>Neural OS v2.0</div>
          </div>
        )}
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            title="Collapse sidebar"
            style={{ padding: '5px 6px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)', zIndex: 10, position: 'relative' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--primary-bg)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary-border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--primary)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}
          >
            <ChevronLeft size={13} />
          </button>
        )}
      </div>

      {/* Status badge */}
      {!isCollapsed && (
        <div style={{ margin: '10px 12px 2px', padding: '5px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0, boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
          <span style={{ color: '#10b981', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.2px' }}>System Ready</span>
        </div>
      )}
      {isCollapsed && (
        <div style={{ margin: '8px auto 0', width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.5)', flexShrink: 0 }} />
      )}

      {/* Grouped Nav */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <nav ref={navRef} style={{ flex: 1, padding: '6px 8px', overflowY: 'auto', overflowX: 'hidden' }} className="sidebar-nav">
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              {!isCollapsed && (
                <div style={{ padding: '10px 8px 4px', color: 'var(--text-3)', fontSize: 9, letterSpacing: '1.6px', textTransform: 'uppercase', fontWeight: 700 }}>{group.label}</div>
              )}
              {isCollapsed && <div style={{ height: 6 }} />}
              {group.items.map(({ id, label, icon: Icon, color }) => {
                const active = currentView === id;
                return (
                  <button key={id} onClick={() => setView(id as View)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: isCollapsed ? '9px 0' : '7.5px 10px',
                      borderRadius: 9, border: 'none',
                      background: active ? 'var(--primary-bg)' : 'transparent',
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      position: 'relative', justifyContent: isCollapsed ? 'center' : 'flex-start',
                      flexShrink: 0, width: '100%', marginBottom: 1,
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    {active && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: 'var(--primary)', borderRadius: '0 3px 3px 0' }} />}
                    <Icon size={14} color={active ? 'var(--primary)' : 'var(--text-3)'} style={{ transition: 'color 0.15s', flexShrink: 0 }} />
                    {!isCollapsed && <span style={{ color: active ? 'var(--primary)' : 'var(--text-2)', fontSize: 13, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', letterSpacing: '-0.1px' }}>{label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Scroll indicator */}
        {!isCollapsed && canScrollDown && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 32, background: 'linear-gradient(to bottom, transparent, var(--surface))', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, opacity: 0.45 }}>
              <ChevronDown size={11} color="var(--text-3)" style={{ marginBottom: -4 }} />
              <ChevronDown size={11} color="var(--text-3)" style={{ marginBottom: -4 }} />
              <ChevronDown size={11} color="var(--text-3)" />
            </div>
          </div>
        )}
      </div>

      {/* User */}
      <div style={{ padding: isCollapsed ? '8px 6px 10px' : '8px 10px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isCollapsed ? '5px' : '6px 8px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          {user?.photoURL
            ? <img src={user.photoURL} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '2px solid var(--primary-border)' }} />
            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '-0.3px' }}>
                {user?.displayName?.[0]?.toUpperCase() ?? 'U'}
              </div>
          }
          {!isCollapsed && (
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: 'var(--text-1)', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.displayName ?? 'User'}</div>
              <div style={{ color: 'var(--text-3)', fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email ?? ''}</div>
            </div>
          )}
          {!isCollapsed && (
            <button onClick={onSignOut} title="Sign out"
              style={{ padding: 5, background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}
            >
              <LogOut size={13} />
            </button>
          )}
        </div>
        {isCollapsed && (
          <button onClick={onSignOut} title="Sign out"
            style={{ width: '100%', marginTop: 6, padding: '5px', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}
          >
            <LogOut size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

const DOMAIN_COLORS = ['#6366f1', '#9333ea', '#f472b6', '#10b981', '#f59e0b', '#ef4444'];

const SRC_ICON: Record<string, any> = { youtube: Youtube, web: Globe, pdf: FileText, note: StickyNote };
const SRC_CLR: Record<string, string> = { youtube: '#ef4444', web: '#00d4ff', pdf: '#f59e0b', note: '#10b981' };

const Dashboard = ({ setView }: { setView: (v: View) => void }) => {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<Memory[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [briefing, setBriefing] = useState('');
  const [briefingLoading, setBriefingLoading] = useState(true);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    Promise.all([
      fetch('/stats').then(r => r.ok ? r.json() : null),
      fetch('/memories?limit=6').then(r => r.ok ? r.json() : []),
      fetch('/logs?limit=5').then(r => r.ok ? r.json() : []),
    ]).then(([s, m, l]) => { if (s) setStats(s); setRecent(m); setLogs(l); }).catch(console.error);
    fetch('/briefing').then(r => r.ok ? r.json() : { briefing: 'Ready for another great day of learning!' })
      .then(d => setBriefing(d.briefing)).catch(() => setBriefing('Ready for another great day of learning!')).finally(() => setBriefingLoading(false));
  }, []);

  const totalMem = stats?.total_memories ?? 0;
  const domains: { name: string; value: number }[] = stats?.knowledge_domains ?? [];

  // Radar data from domains
  const radarData = domains.length > 0
    ? domains.slice(0, 6).map((d: any) => ({ subject: d.name, value: d.value, fullMark: Math.max(...domains.map((x: any) => x.value)) + 1 }))
    : [{ subject: 'AI/ML', value: 0, fullMark: 10 }, { subject: 'Science', value: 0, fullMark: 10 }, { subject: 'Tech', value: 0, fullMark: 10 }, { subject: 'Business', value: 0, fullMark: 10 }, { subject: 'Health', value: 0, fullMark: 10 }];

  // Simulated activity data (last 7 days)
  const activityData = [
    { day: 'Mon', captures: 3 }, { day: 'Tue', captures: 7 }, { day: 'Wed', captures: 2 },
    { day: 'Thu', captures: 9 }, { day: 'Fri', captures: 5 }, { day: 'Sat', captures: 4 }, { day: 'Sun', captures: totalMem },
  ];

  const statCards = [
    { label: 'Neural Memories', value: totalMem, icon: Brain, color: '#6366f1', trend: '+12%', sub: 'Total captured' },
    { label: 'Pending Tasks', value: stats?.pending_tasks ?? 0, icon: CheckSquare, color: '#9333ea', trend: '2 due today', sub: 'Open tasks' },
    { label: 'AI Interactions', value: stats?.ai_interactions ?? 0, icon: Sparkles, color: '#ec4899', trend: 'Lifetime', sub: 'Recall queries' },
    { label: 'Knowledge Domains', value: domains.length, icon: Network, color: '#10b981', trend: 'Active', sub: 'Topics tracked' },
    { label: 'Flashcards', value: stats?.flashcards ?? 0, icon: GraduationCap, color: '#f59e0b', trend: 'Study ready', sub: 'Created' },
    { label: 'Learning Streak', value: stats?.streak_days ?? 0, icon: Zap, color: '#ef4444', trend: 'Days', sub: 'Current streak' },
    { label: 'Focus Sessions', value: stats?.focus_sessions ?? 0, icon: Timer, color: '#06b6d4', trend: 'This week', sub: 'Deep work' },
    { label: 'Captured Today', value: stats?.captured_today ?? 0, icon: TrendingUp, color: '#8b5cf6', trend: 'Today', sub: 'New memories' },
  ];

  const S = { // shared card styles
    card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)', transition: 'all 0.2s' } as React.CSSProperties,
  };

  return (
    <div style={{ color: 'var(--text-1)' }}>
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div className="dash-header-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
              <span style={{ color: 'var(--text-3)', fontSize: 11, letterSpacing: '0.08em', fontWeight: 500 }}>NEURAL OS ACTIVE</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', margin: 0, lineHeight: 1.15, letterSpacing: '-0.5px' }}>
              Welcome back, <span style={{ color: 'var(--primary)' }}>Prashant</span>
            </h1>
            <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>{today}</p>
          </div>

          {/* Briefing card */}
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

      {/* ── Stat Cards (2 rows × 4) ── */}
      <div className="stat-cards-grid">
        {statCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{ ...S.card, padding: '16px 18px', cursor: 'default', background: 'var(--surface)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 20px ${s.color}18, inset 0 1px 0 rgba(255,255,255,0.9)`; (e.currentTarget as HTMLDivElement).style.borderColor = `${s.color}35`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}14`, border: `1px solid ${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6)` }}>
                <s.icon size={16} color={s.color} />
              </div>
              <span style={{ fontSize: 9.5, color: s.color, background: `${s.color}14`, border: `1px solid ${s.color}22`, padding: '2px 7px', borderRadius: 20, fontWeight: 600, letterSpacing: '0.2px' }}>{s.trend}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1, marginBottom: 3, letterSpacing: '-0.5px', fontFamily: "'Alegreya Sans SC', system-ui" }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 1 }}>{s.label}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>{s.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* ── Middle Row: Chart + Radar ── */}
      <div className="dash-chart-row" style={{ marginBottom: 16 }}>
        {/* Activity line chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={{ ...S.card, padding: '18px 20px' }}>
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

        {/* Radar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          style={{ ...S.card, padding: '18px 20px' }}>
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

      {/* ── Bottom Row: Memories + Sidebar ── */}
      <div className="dash-bottom-row">
        {/* Recent Memories */}
        <div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ ...S.card, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14 }}>Recent Memories</div>
              <button onClick={() => setView('vault')} style={{ color: '#6366f1', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                View all <ArrowUpRight size={11} />
              </button>
            </div>
            {recent.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {recent.map((mem) => {
                  const Icon = SRC_ICON[mem.source_type] ?? Brain;
                  const clr = SRC_CLR[mem.source_type] ?? '#6366f1';
                  return (
                    <div key={mem.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', transition: 'all 0.15s', cursor: 'default' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary-border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--primary-bg)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2)'; }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${clr}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} color={clr} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mem.title}</div>
                        <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mem.summary}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 9, color: clr, background: `${clr}15`, padding: '2px 7px', borderRadius: 20, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{mem.source_type}</span>
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(mem.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '36px 0', textAlign: 'center' }}>
                <Brain size={32} color="#cbd5e1" style={{ margin: '0 auto 12px' }} />
                <p style={{ color: '#94a3b8', fontSize: 13 }}>No memories yet</p>
                <button onClick={() => setView('capture')} style={{ marginTop: 10, color: '#6366f1', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Capture your first memory →</button>
              </div>
            )}
          </motion.div>

          {/* AI Interactions */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ ...S.card, padding: '18px 20px', marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14 }}>Recent AI Interactions</div>
              <button onClick={() => setView('recall')} style={{ color: '#9333ea', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                Open Recall <ArrowUpRight size={11} />
              </button>
            </div>
            {logs.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {logs.map((log, i) => (
                  <div key={i} style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                      <span style={{ color: 'var(--text-1)', fontSize: 12, fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.user_message}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: 10, marginLeft: 10, flexShrink: 0 }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p style={{ color: 'var(--text-2)', fontSize: 11, margin: 0, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{log.reply}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No interactions yet. Try Recall AI!</div>
            )}
          </motion.div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Knowledge Domains */}
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

          {/* Domain bar chart */}
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

          {/* Quick Actions */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} style={{ ...S.card, padding: '18px 20px' }}>
            <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: 'Capture Knowledge', icon: Plus, view: 'capture' as View, color: '#ffffff', bg: '#6366f1', isAccent: true },
                { label: 'Ask Recall AI', icon: Bot, view: 'recall' as View, color: '#9333ea', bg: `rgba(147,51,234,0.08)` },
                { label: 'Study Flashcards', icon: FlipHorizontal, view: 'flashcards' as View, color: '#ec4899', bg: `rgba(236,72,153,0.08)` },
                { label: 'Manage Tasks', icon: CheckSquare, view: 'tasks' as View, color: '#10b981', bg: `rgba(16,185,129,0.08)` },
              ].map((a) => (
                <button key={a.label} onClick={() => setView(a.view)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: a.bg, border: `1px solid ${a.isAccent ? '#4f46e5' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 8px rgba(0,0,0,0.08)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
                >
                  <a.icon size={14} color={a.isAccent ? '#ffffff' : a.color} />
                  <span style={{ color: a.isAccent ? '#ffffff' : a.color, fontSize: 12, fontWeight: 600 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── New Row: Goal Tracker + System Status ── */}
      <div className="dash-chart-row" style={{ marginTop: 16 }}>
        {/* Goal Tracker */}
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

        {/* AI System Status */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.58 }} style={{ ...S.card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
            <div style={{ color: 'var(--text-1)', fontWeight: 600, fontSize: 14 }}>System Status</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Neural AI Engine', status: 'Online', color: '#10b981', icon: Cpu },
              { label: 'Knowledge Indexer', status: 'Active', color: '#6366f1', icon: Database },
              { label: 'Recall Memory', status: `${totalMem} nodes`, color: '#9333ea', icon: Brain },
              { label: 'Calendar Sync', status: 'Synced', color: '#f59e0b', icon: CalendarIcon },
              { label: 'Agent Hub', status: '7 Agents', color: '#ec4899', icon: Bot },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)' }}>
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

// ─── Capture View ─────────────────────────────────────────────────────────────

const CaptureView = () => {
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'pdf'>('url');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<Memory | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCapture = async () => {
    if (activeTab === 'pdf' && pdfFile) {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append('file', pdfFile);
        const res = await fetch('/capture/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!res.ok) throw new Error(data.detail || 'Upload failed');
        showToast('PDF captured and saved to Vault!');
        setPdfFile(null);
      } catch (err: any) {
        alert(err.message || 'Failed to process PDF.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (!input.trim()) return;
    setIsProcessing(true);
    try {
      const isYoutube = input.includes('youtube.com') || input.includes('youtu.be');
      const source_type = activeTab === 'url' ? (isYoutube ? 'youtube' : 'web') : 'note';
      const res = await fetch('/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type,
          url: activeTab === 'url' ? input : '',
          content: activeTab === 'text' ? input : '',
          preview: true
        })
      });
      if (res.status === 401) {
        const data = await res.json();
        throw new Error(data.error || "Unauthorized: Check API configuration.");
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.source_url && activeTab === 'url') data.source_url = input;
      setPreviewUrl(activeTab === 'url' ? input : '');
      setPreview(data);
    } catch (err: any) {
      alert(err.message || 'Failed to analyze content.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview)
      });
      if (res.ok) {
        setPreview(null);
        setInput('');
        showToast('Saved to Vault!');
      }
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') setPdfFile(file);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            style={{ position: 'fixed', top: 24, right: 24, zIndex: 200, background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', padding: '12px 20px', borderRadius: 14, boxShadow: '0 8px 24px rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
            <CheckCircle2 size={16} />{toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 999, marginBottom: 12 }}>
          <Sparkles size={12} color="var(--primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px' }}>NEURAL AI CAPTURE ENGINE</span>
        </div>
        <h2 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, color: 'var(--text-1)', margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: "'Alegreya Sans SC',system-ui" }}>Capture Knowledge</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 14, margin: 0 }}>Feed your Second Brain with YouTube videos, web articles, PDFs, or notes.</p>
      </motion.div>

      {!preview ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="view-card" style={{ overflow: 'hidden' }}>
          {/* Tabs */}
          <div className="capture-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {[
              { id: 'url', label: 'URL / YouTube', icon: Globe },
              { id: 'text', label: 'Quick Note', icon: StickyNote },
              { id: 'pdf', label: 'PDF Upload', icon: FileText },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '14px 8px', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--primary)' : 'var(--text-3)', background: active ? 'var(--primary-bg)' : 'transparent', border: 'none', borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <tab.icon size={15} />
                  <span className="capture-tab-label">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="capture-body" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {activeTab === 'url' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Article or YouTube URL</label>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCapture()}
                  placeholder="https://example.com/article or https://youtube.com/watch?v=..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14, outline: 'none', fontFamily: 'inherit', transition: 'all 0.15s', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; e.target.style.background = 'var(--surface)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--surface-2)'; }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>Supports any web article or YouTube video URL</p>
              </div>
            )}

            {activeTab === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Paste your notes or ideas</label>
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Type or paste anything — meeting notes, ideas, research snippets..."
                  rows={7}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'none', transition: 'all 0.15s', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; e.target.style.background = 'var(--surface)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--surface-2)'; }}
                />
              </div>
            )}

            {activeTab === 'pdf' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !pdfFile && fileInputRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? '#6366f1' : pdfFile ? '#10b981' : 'var(--border-2)'}`, borderRadius: 16, padding: 'clamp(24px,5vw,56px) 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragOver ? 'var(--primary-bg)' : pdfFile ? 'rgba(16,185,129,0.06)' : 'var(--surface-2)' }}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && setPdfFile(e.target.files[0])} />
                <div style={{ width: 56, height: 56, background: pdfFile ? 'rgba(16,185,129,0.12)' : 'var(--surface-3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  {pdfFile ? <CheckCircle2 size={26} color="#10b981" /> : <Upload size={26} color="var(--text-3)" />}
                </div>
                {pdfFile ? (
                  <div>
                    <p style={{ fontWeight: 700, color: '#10b981', marginBottom: 4 }}>{pdfFile.name}</p>
                    <p style={{ fontSize: 12, color: '#10b981', marginBottom: 8 }}>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB — Ready to process</p>
                    <button onClick={(e) => { e.stopPropagation(); setPdfFile(null); }} style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Remove file</button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Drop PDF here or click to upload</p>
                    <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 4 }}>AI will extract and analyze the content</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Max 10MB</p>
                  </div>
                )}
              </div>
            )}

            <button onClick={handleCapture}
              disabled={isProcessing || (activeTab !== 'pdf' && !input.trim()) || (activeTab === 'pdf' && !pdfFile)}
              className="btn-premium"
              style={{ width: '100%', fontSize: 15 }}
            >
              {isProcessing ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />AI is analyzing...</>
              ) : (
                <><Sparkles size={18} />Process with Neural AI</>
              )}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="view-card" style={{ overflow: 'hidden' }}>
          {/* Preview header - always dark gradient */}
          <div style={{ background: 'linear-gradient(135deg,#0d1117 0%,#1a1040 60%,#312e81 100%)', padding: 'clamp(20px,4vw,32px)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ padding: '3px 8px', background: '#6366f1', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Neural Analysis</span>
                <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.12)', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{preview.domain}</span>
                <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.12)', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{preview.source_type}</span>
              </div>
              <h3 style={{ fontSize: 'clamp(16px,3vw,22px)', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{preview.title}</h3>
            </div>
            <button onClick={() => setPreview(null)} style={{ padding: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#fff', display: 'flex', flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>

          {preview.source_type === 'youtube' && (previewUrl || preview.source_url) && (
            <div style={{ padding: '16px 16px 0' }}>
              <YouTubeEmbed url={previewUrl || preview.source_url!} />
            </div>
          )}

          <div style={{ padding: 'clamp(20px,4vw,32px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <section>
              <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 14 }}><Brain size={15} color="var(--primary)" />Summary</h4>
              <p style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: 14, margin: 0 }}>{preview.summary}</p>
            </section>

            <section>
              <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 14 }}><CheckCircle2 size={15} color="#10b981" />Key Insights</h4>
              <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10, padding: 0, listStyle: 'none', margin: 0 }}>
                {preview.key_points.map((point, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 13, color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0, border: '1px solid var(--primary-border)' }}>{i + 1}</span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 14 }}><Tag size={15} color="#f59e0b" />Tags</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {preview.tags.map((tag) => (
                  <span key={tag} style={{ padding: '4px 10px', background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid var(--primary-border)' }}>#{tag}</span>
                ))}
              </div>
            </section>

            {preview.source_url && (
              <a href={preview.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                <ExternalLink size={13} />View Original Source
              </a>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setPreview(null)} className="btn-secondary" style={{ flex: 1, minWidth: 120 }}>Discard</button>
              <button onClick={handleSave} disabled={isProcessing} className="btn-premium" style={{ flex: 2, minWidth: 160 }}>
                {isProcessing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
                Save to Vault
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Vault View ───────────────────────────────────────────────────────────────

const VaultView = ({ setView }: { setView: (v: View) => void }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [flashcardsMemory, setFlashcardsMemory] = useState<Memory | null>(null);

  const fetchMemories = useCallback(() => {
    setIsLoading(true);
    const url = domainFilter ? `/memories?domain=${domainFilter}&limit=50` : '/memories?limit=50';
    fetch(url).then(r => r.ok ? r.json() : []).then(data => {
      setMemories(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [domainFilter]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this memory? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await fetch(`/memories/${id}`, { method: 'DELETE' });
      setMemories(prev => prev.filter(m => m.id !== id));
      if (selectedMemory?.id === id) setSelectedMemory(null);
    } catch (err) { console.error(err); }
    finally { setDeletingId(null); }
  };

  const filtered = memories.filter(m =>
    m.title.toLowerCase().includes(filter.toLowerCase()) ||
    m.tags.some(t => t.toLowerCase().includes(filter.toLowerCase())) ||
    m.summary.toLowerCase().includes(filter.toLowerCase())
  );

  const domains = ['', 'AI', 'Technology', 'Science', 'Business', 'Health', 'History', 'Philosophy', 'Engineering', 'Productivity', 'Other'];

  const sourceIcon = (type: string) => {
    if (type === 'youtube') return <Youtube className="w-5 h-5 text-red-500" />;
    if (type === 'web') return <Globe className="w-5 h-5 text-blue-500" />;
    if (type === 'pdf') return <FileText className="w-5 h-5 text-orange-500" />;
    return <StickyNote className="w-5 h-5 text-amber-500" />;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Knowledge Vault</h2>
          <p className="text-slate-500 mt-1">{memories.length} memories captured in your Second Brain.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search memories..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-4 py-2.5 w-60 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <select
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
          >
            {domains.map(d => <option key={d} value={d}>{d || 'All Domains'}</option>)}
          </select>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((memory) => (
            <motion.div
              key={memory.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-100 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group overflow-hidden"
            >
              {/* YouTube thumbnail at top of card */}
              {memory.source_type === 'youtube' && memory.source_url && getYouTubeId(memory.source_url) && (
                <YouTubeThumbnail url={memory.source_url} onClick={() => setSelectedMemory(memory)} />
              )}

              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors shrink-0">
                    {sourceIcon(memory.source_type)}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">{memory.domain}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setFlashcardsMemory(memory); }}
                      title="Generate Flashcards"
                      className="p-1.5 hover:bg-amber-50 hover:text-amber-600 rounded-lg transition-colors text-slate-300"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(memory.id); }}
                      disabled={deletingId === memory.id}
                      title="Delete memory"
                      className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-slate-300"
                    >
                      {deletingId === memory.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <h4 onClick={() => setSelectedMemory(memory)} className="font-bold text-slate-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors cursor-pointer">{memory.title}</h4>
                <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">{memory.summary}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {memory.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold">#{tag}</span>
                  ))}
                  {memory.tags.length > 3 && <span className="text-[10px] text-slate-400 font-bold self-center">+{memory.tags.length - 3}</span>}
                </div>

                <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{new Date(memory.created_at).toLocaleDateString()}
                  </span>
                  <button onClick={() => setSelectedMemory(memory)} className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700">View details →</button>
                </div>
              </div>
            </motion.div>
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400">
              <Brain className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-medium">No memories found</p>
            </div>
          )}
        </div>
      )}

      {/* Memory Detail Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMemory(null)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-8 text-white flex justify-between items-start shrink-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-indigo-500 rounded text-[10px] font-bold uppercase">{selectedMemory.source_type}</span>
                    <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-bold uppercase">{selectedMemory.domain}</span>
                  </div>
                  <h3 className="text-2xl font-bold">{selectedMemory.title}</h3>
                </div>
                <button onClick={() => setSelectedMemory(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-5 sm:p-8 space-y-6 overflow-y-auto">
                {/* YouTube embed in detail modal */}
                {selectedMemory.source_type === 'youtube' && selectedMemory.source_url && (
                  <YouTubeEmbed url={selectedMemory.source_url} />
                )}

                <section className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2"><Brain className="w-4 h-4 text-indigo-500" />Summary</h4>
                  <p className="text-slate-600 leading-relaxed">{selectedMemory.summary}</p>
                </section>
                <section className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Key Insights</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMemory.key_points.map((point, i) => (
                      <li key={i} className="flex gap-3 p-3 bg-slate-50 rounded-xl text-sm text-slate-700 border border-slate-100">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="space-y-3">
                  <h4 className="font-bold text-slate-900 flex items-center gap-2"><Tag className="w-4 h-4 text-amber-500" />Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemory.tags.map(tag => (
                      <span key={tag} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">#{tag}</span>
                    ))}
                  </div>
                </section>
                {selectedMemory.source_url && (
                  <section className="pt-4 border-t border-slate-100 flex flex-wrap gap-4">
                    <a href={selectedMemory.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700">
                      <ExternalLink className="w-4 h-4" />View Original Source
                    </a>
                    <button onClick={() => { setFlashcardsMemory(selectedMemory); setSelectedMemory(null); }} className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700">
                      <FlipHorizontal className="w-4 h-4" />Generate Flashcards
                    </button>
                  </section>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Flashcard Generator Modal */}
      <AnimatePresence>
        {flashcardsMemory && (
          <FlashcardGeneratorModal memory={flashcardsMemory} onClose={() => setFlashcardsMemory(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Flashcard Generator Modal ────────────────────────────────────────────────

const FlashcardGeneratorModal = ({ memory, onClose }: { memory: Memory; onClose: () => void }) => {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    fetch(`/memories/${memory.id}/flashcards`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.flashcards) setFlashcards(data.flashcards); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [memory.id]);

  const next = () => { setFlipped(false); setCurrentIndex(i => (i + 1) % flashcards.length); };
  const prev = () => { setFlipped(false); setCurrentIndex(i => (i - 1 + flashcards.length) % flashcards.length); };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white flex justify-between items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-amber-100">AI Flashcards</p>
            <h3 className="text-lg font-bold mt-1 line-clamp-1">{memory.title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
              <p className="text-slate-500 font-medium">Generating flashcards with Neural AI...</p>
            </div>
          ) : flashcards.length > 0 ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between text-sm text-slate-400 font-medium">
                <span>Card {currentIndex + 1} of {flashcards.length}</span>
                <div className="flex gap-1">
                  {flashcards.map((_, i) => (
                    <div key={i} className={cn("w-2 h-2 rounded-full", i === currentIndex ? "bg-amber-500" : "bg-slate-200")} />
                  ))}
                </div>
              </div>

              <motion.div
                key={`${currentIndex}-${flipped}`}
                initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                onClick={() => setFlipped(!flipped)}
                className={cn(
                  "min-h-[200px] rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer border-2 transition-colors",
                  flipped ? "bg-indigo-50 border-indigo-200" : "bg-amber-50 border-amber-200"
                )}
              >
                <div className={cn("text-xs font-bold uppercase tracking-widest mb-4", flipped ? "text-indigo-400" : "text-amber-400")}>
                  {flipped ? "Answer" : "Question"}
                </div>
                <p className={cn("text-lg font-semibold leading-relaxed", flipped ? "text-indigo-800" : "text-amber-800")}>
                  {flipped ? flashcards[currentIndex].answer : flashcards[currentIndex].question}
                </p>
                <p className="text-xs text-slate-400 mt-4">Click to {flipped ? 'see question' : 'reveal answer'}</p>
              </motion.div>

              <div className="flex gap-3">
                <button onClick={prev} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                  <ChevronLeft className="w-4 h-4" />Prev
                </button>
                <button onClick={() => setFlipped(!flipped)} className="px-6 py-3 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 flex items-center gap-2">
                  <RotateCcw className="w-4 h-4" />Flip
                </button>
                <button onClick={next} className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2">
                  Next<ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">Failed to generate flashcards.</div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Flashcards View ──────────────────────────────────────────────────────────

const FlashcardsView = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/memories?limit=30').then(r => r.ok ? r.json() : []).then(data => {
      setMemories(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900">AI Flashcards</h2>
        <p className="text-slate-500 mt-1">Select any memory to generate interactive flashcards powered by Neural AI.</p>
      </header>

      <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-3xl border border-amber-100 flex items-start gap-4">
        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-amber-900">How it works</h3>
          <p className="text-sm text-amber-700 mt-1">Neural AI generates 5 Q&A flashcards from any saved memory. Click on a memory card below to start studying. Flip each card to reveal the answer.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-amber-500 animate-spin" /></div>
      ) : memories.length === 0 ? (
        <div className="py-20 text-center">
          <FlipHorizontal className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No memories yet. Capture some content first!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {memories.map((memory) => (
            <motion.button
              key={memory.id}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedMemory(memory)}
              className="bg-white rounded-3xl border border-slate-100 p-6 text-left flex flex-col gap-4 hover:shadow-xl hover:border-amber-200 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <FlipHorizontal className="w-5 h-5 text-amber-500" />
                </div>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase">{memory.domain}</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 line-clamp-2 group-hover:text-amber-600 transition-colors">{memory.title}</h4>
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{memory.summary}</p>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-600 font-bold">Generate 5 flashcards</span>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedMemory && (
          <FlashcardGeneratorModal memory={selectedMemory} onClose={() => setSelectedMemory(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Recall View ─────────────────────────────────────────────────────────────

const RecallView = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string; sources?: any[]; agents?: string[] }[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, session_id: 'web_session_' + Date.now() })
      });
      if (res.status === 401) {
        const data = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', content: `Authorization Error: ${data.error || "Check API configuration."}` }]);
        return;
      }
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, sources: data.sources, agents: data.agents_called }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const suggestions = [
    "What have I learned about AI recently?",
    "Summarize my saved notes on productivity",
    "What are the key points from my YouTube captures?",
    "Create a task to review my recent memories",
  ];

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex flex-col animate-in slide-in-from-bottom-4 duration-500">
      <header className="text-center mb-6">
        <h2 className="text-3xl font-bold text-slate-900">Recall AI</h2>
        <p className="text-slate-500 mt-2">Powered by Neural AI — ask anything about your saved knowledge.</p>
      </header>

      <div className="flex-1 bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth bg-slate-50/30">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center">
                <Brain className="w-10 h-10 text-indigo-400" />
              </div>
              <div>
                <p className="font-bold text-slate-700 text-lg">Ask your Second Brain</p>
                <p className="text-sm text-slate-400 max-w-sm mt-1">The AI will search through all your saved memories, tasks, and notes to answer your questions.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="p-3 bg-white rounded-xl border border-slate-200 text-sm text-left text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all font-medium"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-4", msg.role === 'user' ? "flex-row-reverse" : "")}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", msg.role === 'user' ? "bg-indigo-600 text-white" : "bg-gradient-to-br from-slate-800 to-indigo-900 text-white")}>
                {msg.role === 'user' ? <Plus className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
              </div>
              <div className="space-y-2 max-w-[80%]">
                <div className={cn("p-4 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap", msg.role === 'user' ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-800 rounded-tl-none border border-slate-100")}>
                  {msg.content}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((source: any) => (
                      <div key={source.id} className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded text-[10px] font-bold text-indigo-500 flex items-center gap-1">
                        <Brain className="w-3 h-3" />{source.title}
                      </div>
                    ))}
                  </div>
                )}
                {msg.agents && msg.agents.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {msg.agents.map(a => (
                      <span key={a} className="px-2 py-0.5 bg-purple-50 text-purple-500 rounded text-[9px] font-bold uppercase">🤖 {a}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-indigo-900 text-white flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4" />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1.5 shadow-sm items-center">
                {[0, 1, 2].map(i => <span key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />)}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <div className="relative flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask your Second Brain... (Enter to send)"
              rows={1}
              className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all resize-none text-sm"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-all shadow-lg shadow-indigo-600/20 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Tasks View ───────────────────────────────────────────────────────────────

const TasksModule = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due_date: '' });
  const [tab, setTab] = useState<'pending' | 'completed'>('pending');

  const fetchTasks = useCallback(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/tasks?status=pending&limit=50').then(r => r.ok ? r.json() : []),
      fetch('/tasks?status=completed&limit=20').then(r => r.ok ? r.json() : [])
    ]).then(([pending, completed]) => {
      setTasks(pending);
      setCompletedTasks(completed);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreate = async () => {
    if (!newTask.title.trim()) return;
    try {
      await fetch('/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
      });
      setShowNewTask(false);
      setNewTask({ title: '', priority: 'medium', due_date: '' });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const handleComplete = async (id: string) => {
    try {
      await fetch(`/tasks/${id}/complete`, { method: 'POST' });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task?')) return;
    try {
      await fetch(`/tasks/${id}`, { method: 'DELETE' });
      fetchTasks();
    } catch (err) { console.error(err); }
  };

  const priorityColors: Record<string, string> = {
    high: 'bg-red-50 text-red-600 border-red-100',
    medium: 'bg-amber-50 text-amber-600 border-amber-100',
    low: 'bg-emerald-50 text-emerald-600 border-emerald-100'
  };

  const displayTasks = tab === 'pending' ? tasks : completedTasks;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Tasks</h2>
          <p className="text-slate-500 mt-1">{tasks.length} pending · {completedTasks.length} completed</p>
        </div>
        <button
          onClick={() => setShowNewTask(true)}
          className="rs-btn rs-btn-primary active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />New Task
        </button>
      </header>

      <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
        {(['pending', 'completed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn("px-5 py-2 rounded-lg text-sm font-bold transition-all", tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
          >
            {t === 'pending' ? `Pending (${tasks.length})` : `Completed (${completedTasks.length})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {displayTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center gap-4 group hover:shadow-md transition-shadow"
              >
                {tab === 'pending' ? (
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="w-6 h-6 rounded-full border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all shrink-0 flex items-center justify-center group/btn"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                  </button>
                ) : (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className={cn("font-bold text-slate-800", tab === 'completed' && "line-through text-slate-400")}>{task.title}</p>
                  {task.due_date && (
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />Due: {task.due_date}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {task.priority && (
                    <span className={cn("text-[10px] font-bold px-2 py-1 rounded border uppercase", priorityColors[task.priority] || priorityColors.medium)}>
                      {task.priority}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {displayTasks.length === 0 && (
            <div className="py-20 text-center">
              <CheckSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">{tab === 'pending' ? 'All caught up! No pending tasks.' : 'No completed tasks yet.'}</p>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showNewTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewTask(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <h3 className="text-xl font-bold text-slate-900">Create New Task</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Task Title</label>
                  <input
                    autoFocus
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="What needs to be done?"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                    <select value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Due Date</label>
                    <input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNewTask(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all">Cancel</button>
                <button onClick={handleCreate} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all">Create Task</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Calendar View ────────────────────────────────────────────────────────────

const CalendarModule = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const [showStudyPlan, setShowStudyPlan] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', duration_minutes: 60 });
  const [studyPlanTopic, setStudyPlanTopic] = useState('');
  const [studyPlan, setStudyPlan] = useState<any[]>([]);
  const [planLoading, setPlanLoading] = useState(false);
  const today = new Date();

  const fetchEvents = () => {
    setIsLoading(true);
    fetch('/schedule').then(r => r.ok ? r.json() : []).then(data => {
      setEvents(data);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) return;
    try {
      await fetch('/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      setShowNewEvent(false);
      setNewEvent({ title: '', date: '', time: '', duration_minutes: 60 });
      fetchEvents();
    } catch (err) { console.error(err); }
  };

  const handleGeneratePlan = async () => {
    setPlanLoading(true);
    try {
      const res = await fetch('/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: studyPlanTopic, days: 7 })
      });
      const data = await res.json();
      if (data.plan) setStudyPlan(data.plan);
    } catch (err) { console.error(err); }
    finally { setPlanLoading(false); }
  };

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Schedule</h2>
          <p className="text-slate-500 mt-1">Manage study sessions and knowledge review events.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowStudyPlan(true)}
            className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-all flex items-center gap-2"
          >
            <GraduationCap className="w-4 h-4" />AI Study Plan
          </button>
          <button
            onClick={() => setShowNewEvent(true)}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />New Event
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-100 shadow-xl p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">{today.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isToday = day === today.getDate();
              const dayEvents = events.filter(e => new Date(e.date).getDate() === day);
              return (
                <div
                  key={day}
                  className={cn("aspect-square rounded-xl flex flex-col p-1.5 transition-colors cursor-default text-center", isToday ? "bg-indigo-600 text-white" : "hover:bg-slate-50")}
                >
                  <span className={cn("text-xs font-bold", isToday ? "text-white" : "text-slate-500")}>{day}</span>
                  <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
                    {dayEvents.slice(0, 3).map((_, ei) => (
                      <div key={ei} className={cn("w-1.5 h-1.5 rounded-full", isToday ? "bg-white/60" : "bg-indigo-500")} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-900">Upcoming Events</h3>
          {isLoading ? (
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          ) : events.length > 0 ? events.slice(0, 8).map(event => (
            <div key={event.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-xs font-bold text-indigo-600 mb-1">{event.date} · {event.time}</p>
              <h4 className="font-bold text-slate-800 text-sm line-clamp-2">{event.title}</h4>
              <p className="text-[10px] text-slate-400 mt-1">{event.duration_minutes} mins</p>
            </div>
          )) : (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No upcoming events</p>
            </div>
          )}
        </div>
      </div>

      {/* New Event Modal */}
      <AnimatePresence>
        {showNewEvent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNewEvent(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 space-y-6">
              <h3 className="text-xl font-bold text-slate-900">Schedule Event</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Title</label>
                  <input type="text" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Study session, review, etc." className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</label>
                    <input type="date" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Time</label>
                    <input type="time" value={newEvent.time} onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Duration (minutes)</label>
                  <input type="number" value={newEvent.duration_minutes} onChange={(e) => setNewEvent({ ...newEvent, duration_minutes: parseInt(e.target.value) })} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" min="15" step="15" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowNewEvent(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50">Cancel</button>
                <button onClick={handleCreateEvent} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700">Schedule</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Study Plan Modal */}
      <AnimatePresence>
        {showStudyPlan && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowStudyPlan(false)} className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-center shrink-0">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-indigo-200">Neural AI Powered</p>
                  <h3 className="text-xl font-bold mt-1">7-Day Study Plan Generator</h3>
                </div>
                <button onClick={() => setShowStudyPlan(false)} className="p-2 hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {studyPlan.length === 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Focus Topic (optional)</label>
                      <input
                        type="text"
                        value={studyPlanTopic}
                        onChange={(e) => setStudyPlanTopic(e.target.value)}
                        placeholder="e.g., Machine Learning, Python, History..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <p className="text-xs text-slate-400">Leave empty to base the plan on all your saved memories</p>
                    </div>
                    <button
                      onClick={handleGeneratePlan}
                      disabled={planLoading}
                      className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      {planLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Generating Plan...</> : <><GraduationCap className="w-5 h-5" />Generate 7-Day Study Plan</>}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-slate-900">Your Personalized Study Plan</h4>
                      <button onClick={() => setStudyPlan([])} className="text-sm text-indigo-600 font-bold hover:underline">Generate New</button>
                    </div>
                    {studyPlan.map((day: any) => (
                      <div key={day.day} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="text-xs font-bold text-indigo-600 uppercase">Day {day.day} · {day.date}</span>
                            <h5 className="font-bold text-slate-900 mt-0.5">{day.title}</h5>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-400">{day.duration_minutes} min</span>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">{day.focus_area}</p>
                          </div>
                        </div>
                        <ul className="space-y-1.5">
                          {day.activities?.map((activity: string, i: number) => (
                            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                              <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full shrink-0" />
                              {activity}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Settings View ─────────────────────────────────────────────────────────────

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
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 999, marginBottom: 12 }}>
          <Settings size={11} color="var(--primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px' }}>SYSTEM SETTINGS</span>
        </div>
        <h2 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, color: 'var(--text-1)', margin: '0 0 6px', letterSpacing: '-0.5px', fontFamily: "'Alegreya Sans SC',system-ui" }}>Settings & Status</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 14, margin: 0 }}>Configure AI models and monitor system health.</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 20 }}>
        {/* AI Configuration card */}
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
          {/* System Status */}
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

          {/* Hackathon Features */}
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

// ─── Memory Timeline View ─────────────────────────────────────────────────────

const MemoryTimelineView = ({ setView }: { setView: (v: View) => void }) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<'all' | 'youtube' | 'web' | 'pdf' | 'note'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/memories?limit=50').then(r => r.ok ? r.json() : []).then(m => { setMemories(m); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = memories.filter(m =>
    (filter === 'all' || m.source_type === filter) &&
    (search === '' || m.title.toLowerCase().includes(search.toLowerCase()) || m.summary.toLowerCase().includes(search.toLowerCase()) || m.domain.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped: Record<string, Memory[]> = {};
  filtered.forEach(m => {
    const d = new Date(m.created_at);
    const key = isNaN(d.getTime()) ? 'Unknown Date' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    (grouped[key] = grouped[key] || []).push(m);
  });

  const SRC_CLR: Record<string, string> = { youtube: '#ef4444', web: '#00d4ff', pdf: '#f59e0b', note: '#10b981' };
  const SRC_ICON: Record<string, any> = { youtube: Youtube, web: Globe, pdf: FileText, note: StickyNote };
  const filters = [
    { id: 'all', label: 'All', color: '#00d4ff' },
    { id: 'youtube', label: 'YouTube', color: '#ef4444' },
    { id: 'web', label: 'Web', color: '#00d4ff' },
    { id: 'pdf', label: 'PDF', color: '#f59e0b' },
    { id: 'note', label: 'Notes', color: '#10b981' },
  ];

  const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, backdropFilter: 'blur(20px)' } as React.CSSProperties;

  return (
    <div>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={17} color="#f472b6" />
          </div>
          <div>
            <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>Memory Timeline</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: 0 }}>Chronological view of your captured knowledge</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => setView('capture')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: 'linear-gradient(135deg,#f472b6,#c026a1)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 0 20px rgba(244,114,182,0.3)', fontFamily: 'inherit' }}>
              <Plus size={14} /> Add Memory
            </button>
          </div>
        </div>
      </motion.div>

      {/* Search + Filters */}
      <div style={{ ...card, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} color="#6b7280" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search memories..."
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, color: '#e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)}
              style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${filter === f.id ? f.color + '60' : 'rgba(255,255,255,0.08)'}`, background: filter === f.id ? `${f.color}18` : 'transparent', color: filter === f.id ? f.color : '#6b7280', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ color: '#6b7280', fontSize: 12 }}>{filtered.length} memories</div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={28} color="#00d4ff" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 13 }}>Loading timeline...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: '60px 0', textAlign: 'center' }}>
          <GitBranch size={40} color="#4b5563" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>No memories match this filter</p>
          <button onClick={() => setView('capture')} style={{ marginTop: 10, color: '#f472b6', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Start capturing →</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {/* Vertical timeline line */}
          <div style={{ position: 'absolute', left: 100, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(244,114,182,0.4) 0%, rgba(139,92,246,0.2) 100%)', pointerEvents: 'none' }} />
          {Object.entries(grouped).map(([date, items], gi) => (
            <motion.div key={date} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: gi * 0.05 }} style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
              {/* Date label */}
              <div style={{ width: 100, flexShrink: 0, paddingRight: 16, paddingTop: 8, textAlign: 'right' }}>
                <span style={{ color: '#6b7280', fontSize: 11, lineHeight: 1.4 }}>{date.split(',')[0]}<br /><span style={{ color: '#4b5563', fontSize: 10 }}>{date.split(',').slice(1).join(',').trim()}</span></span>
              </div>
              {/* Dot */}
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f472b6', boxShadow: '0 0 12px rgba(244,114,182,0.6)', flexShrink: 0 }} />
              </div>
              {/* Cards */}
              <div style={{ flex: 1, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(m => {
                  const Icon = SRC_ICON[m.source_type] ?? Brain;
                  const clr = SRC_CLR[m.source_type] ?? '#00d4ff';
                  return (
                    <div key={m.id} style={{ ...card, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'all 0.2s', cursor: 'default' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${clr}30`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${clr}15`, border: `1px solid ${clr}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} color={clr} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#d1d5db', fontSize: 13, fontWeight: 500, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                        <div style={{ color: '#4b5563', fontSize: 11, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.summary}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, color: clr, background: `${clr}15`, padding: '2px 7px', borderRadius: 20, fontWeight: 500, textTransform: 'uppercase' }}>{m.source_type}</span>
                          <span style={{ fontSize: 9, color: '#6b7280', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 20 }}>{m.domain}</span>
                          {m.tags.slice(0, 2).map(t => <span key={t} style={{ fontSize: 9, color: '#6b7280', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 20 }}>#{t}</span>)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Knowledge Graph View ─────────────────────────────────────────────────────

const KnowledgeGraphView = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const nodesRef = useRef<any[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    Promise.all([
      fetch('/memories?limit=30').then(r => r.ok ? r.json() : []),
      fetch('/stats').then(r => r.ok ? r.json() : null),
    ]).then(([m, s]) => { setMemories(m); setStats(s); });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || memories.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.offsetWidth; const H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;

    const COLORS = ['#00d4ff', '#8b5cf6', '#f472b6', '#10b981', '#f59e0b', '#ef4444'];
    const domains = [...new Set(memories.map(m => m.domain || 'General'))];

    // Central node
    const nodes: any[] = [{ id: 'center', label: 'Recall X247', x: W / 2, y: H / 2, r: 28, color: '#00d4ff', type: 'center', vx: 0, vy: 0, fixed: true }];

    // Domain nodes
    domains.forEach((d, i) => {
      const angle = (i / domains.length) * Math.PI * 2 - Math.PI / 2;
      const dist = Math.min(W, H) * 0.28;
      nodes.push({ id: `domain:${d}`, label: d, x: W / 2 + Math.cos(angle) * dist, y: H / 2 + Math.sin(angle) * dist, r: 18, color: COLORS[i % COLORS.length], type: 'domain', vx: 0, vy: 0 });
    });

    // Memory nodes (sample up to 20)
    memories.slice(0, 20).forEach((m, i) => {
      const domIdx = domains.indexOf(m.domain || 'General');
      const parent = nodes.find(n => n.id === `domain:${m.domain || 'General'}`);
      const angle = (i / memories.slice(0, 20).length) * Math.PI * 2;
      const dist = 60;
      const px = parent ? parent.x : W / 2;
      const py = parent ? parent.y : H / 2;
      nodes.push({ id: `mem:${m.id}`, label: m.title.slice(0, 18), x: px + Math.cos(angle) * dist + (Math.random() - 0.5) * 20, y: py + Math.sin(angle) * dist + (Math.random() - 0.5) * 20, r: 8, color: COLORS[domIdx % COLORS.length], type: 'memory', domainId: `domain:${m.domain || 'General'}`, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5 });
    });

    nodesRef.current = nodes;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;

      // Update node positions (light physics)
      nodes.forEach(n => {
        if (n.fixed) return;
        // Attract to parent
        const parent = n.domainId ? nodes.find(p => p.id === n.domainId) : nodes[0];
        if (parent) {
          const dx = parent.x - n.x; const dy = parent.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const target = n.type === 'domain' ? Math.min(W, H) * 0.28 : 70;
          const force = (dist - target) * 0.002;
          n.vx += dx / dist * force; n.vy += dy / dist * force;
        }
        // Repel from other nodes
        nodes.forEach(o => {
          if (o.id === n.id) return;
          const dx = n.x - o.x; const dy = n.y - o.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 60 && dist > 0) { n.vx += dx / dist * 0.3; n.vy += dy / dist * 0.3; }
        });
        n.vx *= 0.85; n.vy *= 0.85;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(n.r + 10, Math.min(W - n.r - 10, n.x));
        n.y = Math.max(n.r + 10, Math.min(H - n.r - 10, n.y));
      });

      // Draw edges
      nodes.forEach(n => {
        if (n.type === 'center') return;
        const parent = n.domainId ? nodes.find(p => p.id === n.domainId) : nodes[0];
        if (!parent) return;
        ctx.beginPath();
        ctx.strokeStyle = n.type === 'domain' ? `${n.color}50` : `${n.color}25`;
        ctx.lineWidth = n.type === 'domain' ? 1.5 : 0.8;
        ctx.moveTo(parent.x, parent.y);
        ctx.lineTo(n.x, n.y);
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach(n => {
        const pulse = n.type === 'center' ? Math.sin(frame * 0.04) * 3 + n.r : n.r;
        // Outer glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, pulse * 2.5);
        grad.addColorStop(0, `${n.color}35`);
        grad.addColorStop(1, 'transparent');
        ctx.beginPath(); ctx.arc(n.x, n.y, pulse * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
        // Node body
        ctx.beginPath(); ctx.arc(n.x, n.y, pulse, 0, Math.PI * 2);
        ctx.fillStyle = `${n.color}25`; ctx.fill();
        ctx.strokeStyle = n.color; ctx.lineWidth = n.type === 'center' ? 2 : 1.5;
        ctx.stroke();
        // Label
        if (n.type !== 'memory' || n.r > 6) {
          ctx.fillStyle = n.type === 'center' ? '#00d4ff' : '#9ca3af';
          ctx.font = `${n.type === 'center' ? '700 11px' : '500 9px'} 'Poppins', sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y + pulse + 12);
        }
        if (n.type === 'center') {
          ctx.fillStyle = '#ffffff';
          ctx.font = "600 9px 'Poppins', sans-serif";
          ctx.textAlign = 'center';
          ctx.fillText(n.label, n.x, n.y + 4);
        }
      });

      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [memories]);

  const domains = stats?.knowledge_domains ?? [];
  const COLORS = ['#00d4ff', '#8b5cf6', '#f472b6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Network size={17} color="#8b5cf6" />
          </div>
          <div>
            <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>Mind Graph</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: 0 }}>Visual map of your knowledge connections</p>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }}>
        {/* Graph canvas */}
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 16, overflow: 'hidden', height: 520, position: 'relative' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          {memories.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Network size={40} color="#4b5563" />
              <p style={{ color: '#6b7280', fontSize: 13 }}>No memories to graph yet</p>
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 14, left: 14, display: 'flex', gap: 6 }}>
            {memories.length > 0 && (
              <div style={{ padding: '5px 10px', background: 'rgba(5,5,15,0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#4b5563', fontSize: 10 }}>
                {memories.length} memories · {[...new Set(memories.map(m => m.domain))].length} domains
              </div>
            )}
          </div>
        </motion.div>

        {/* Sidebar stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Domain Nodes</div>
            {domains.length > 0 ? domains.map((d: any, i: number) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}`, flexShrink: 0 }} />
                <span style={{ color: '#9ca3af', fontSize: 12, flex: 1 }}>{d.name}</span>
                <span style={{ color: COLORS[i % COLORS.length], fontSize: 11, fontWeight: 600 }}>{d.value}</span>
              </div>
            )) : <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>Capture memories to see graph</p>}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Legend</div>
            {[
              { label: 'Central Hub', color: '#00d4ff', size: 12 },
              { label: 'Domain Node', color: '#8b5cf6', size: 9 },
              { label: 'Memory Node', color: '#6b7280', size: 6 },
            ].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: l.size, height: l.size, borderRadius: '50%', background: l.color, boxShadow: `0 0 6px ${l.color}80`, flexShrink: 0 }} />
                <span style={{ color: '#6b7280', fontSize: 11 }}>{l.label}</span>
              </div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px' }}>
            <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 8 }}>Stats</div>
            {[
              { label: 'Total Nodes', value: memories.length + ([...new Set(memories.map(m => m.domain))].length || 0) + 1 },
              { label: 'Total Edges', value: memories.length + ([...new Set(memories.map(m => m.domain))].length || 0) },
              { label: 'Domains', value: [...new Set(memories.map(m => m.domain))].length || 0 },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: '#4b5563', fontSize: 11 }}>{s.label}</span>
                <span style={{ color: '#e2e8f0', fontSize: 11, fontWeight: 600 }}>{s.value}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// ─── Analytics View ───────────────────────────────────────────────────────────

const AnalyticsView = () => {
  const [stats, setStats] = useState<any>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/stats').then(r => r.ok ? r.json() : null),
      fetch('/memories?limit=50').then(r => r.ok ? r.json() : []),
      fetch('/logs?limit=20').then(r => r.ok ? r.json() : []),
      fetch('/tasks?limit=50').then(r => r.ok ? r.json() : []),
    ]).then(([s, m, l, t]) => { if (s) setStats(s); setMemories(m); setLogs(l); setTasks(t); });
  }, []);

  const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, backdropFilter: 'blur(20px)' } as React.CSSProperties;
  const COLORS = ['#00d4ff', '#8b5cf6', '#f472b6', '#10b981', '#f59e0b'];
  const domains = stats?.knowledge_domains ?? [];

  // Source distribution
  const srcCounts = { youtube: 0, web: 0, pdf: 0, note: 0 };
  memories.forEach(m => { if (m.source_type in srcCounts) (srcCounts as any)[m.source_type]++; });
  const srcData = [
    { name: 'YouTube', value: srcCounts.youtube, color: '#ef4444' },
    { name: 'Web', value: srcCounts.web, color: '#00d4ff' },
    { name: 'PDF', value: srcCounts.pdf, color: '#f59e0b' },
    { name: 'Notes', value: srcCounts.note, color: '#10b981' },
  ].filter(s => s.value > 0);

  // Tags frequency
  const tagFreq: Record<string, number> = {};
  memories.forEach(m => m.tags.forEach(t => { tagFreq[t] = (tagFreq[t] || 0) + 1; }));
  const topTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));

  // Activity by day (from timestamps)
  const actMap: Record<string, number> = {};
  memories.forEach(m => {
    const d = new Date(m.created_at);
    if (!isNaN(d.getTime())) { const k = d.toLocaleDateString('en-US', { weekday: 'short' }); actMap[k] = (actMap[k] || 0) + 1; }
  });
  const actData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => ({ day: d, captures: actMap[d] || 0 }));

  const kpis = [
    { label: 'Total Memories', value: memories.length, sub: 'All time', color: '#00d4ff' },
    { label: 'Avg per Domain', value: domains.length > 0 ? (memories.length / domains.length).toFixed(1) : 0, sub: 'Memories/domain', color: '#8b5cf6' },
    { label: 'AI Sessions', value: logs.length, sub: 'Queries answered', color: '#f472b6' },
    { label: 'Tasks Created', value: tasks.length, sub: 'Total tasks', color: '#10b981' },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={17} color="#10b981" />
          </div>
          <div>
            <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>Analytics</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: 0 }}>Deep insights into your knowledge patterns</p>
          </div>
        </div>
      </motion.div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 18 }}>
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ ...card, padding: '18px 20px', border: `1px solid ${k.color}25` }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: k.color, lineHeight: 1, marginBottom: 4 }}>{k.value}</div>
            <div style={{ color: '#d1d5db', fontSize: 13, fontWeight: 500 }}>{k.label}</div>
            <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>{k.sub}</div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Activity by day */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} style={{ ...card, padding: '18px 20px' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Captures by Day</div>
          <div style={{ color: '#4b5563', fontSize: 11, marginBottom: 14 }}>Day-of-week distribution</div>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={actData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#0d0d1a', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 8, fontSize: 11, color: '#e2e8f0' }} />
              <Bar dataKey="captures" fill="#00d4ff" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Source distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ ...card, padding: '18px 20px' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Source Distribution</div>
          <div style={{ color: '#4b5563', fontSize: 11, marginBottom: 12 }}>Where knowledge comes from</div>
          {srcData.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {srcData.map(s => (
                <div key={s.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>{s.name}</span>
                    <span style={{ color: s.color, fontSize: 11, fontWeight: 600 }}>{s.value} ({Math.round(s.value / memories.length * 100)}%)</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(s.value / memories.length) * 100}%` }} transition={{ duration: 0.7, delay: 0.5 }}
                      style={{ height: '100%', borderRadius: 4, background: s.color, boxShadow: `0 0 8px ${s.color}60` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p style={{ color: '#6b7280', fontSize: 12 }}>Capture memories to see distribution</p>}
        </motion.div>
      </div>

      {/* Domain distribution + Top tags */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} style={{ ...card, padding: '18px 20px' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Knowledge Domains</div>
          {domains.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={domains.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ background: '#0d0d1a', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 8, fontSize: 11, color: '#e2e8f0' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {domains.slice(0, 8).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>No domain data yet</p>}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} style={{ ...card, padding: '18px 20px' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13, marginBottom: 14 }}>Top Tags</div>
          {topTags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {topTags.map((t, i) => {
                const clr = COLORS[i % COLORS.length];
                const size = Math.max(11, Math.min(16, 10 + t.value * 1.5));
                return (
                  <div key={t.name} style={{ padding: '5px 11px', background: `${clr}12`, border: `1px solid ${clr}30`, borderRadius: 20, cursor: 'default' }}>
                    <span style={{ color: clr, fontSize: size, fontWeight: 500 }}>#{t.name}</span>
                    <span style={{ color: '#6b7280', fontSize: 9, marginLeft: 4 }}>×{t.value}</span>
                  </div>
                );
              })}
            </div>
          ) : <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>No tags yet — add tags when capturing</p>}
        </motion.div>
      </div>
    </div>
  );
};

// ─── Workspace View ───────────────────────────────────────────────────────────

interface WorkspaceProject {
  id: string;
  name: string;
  color: string;
  description: string;
  memoryIds: string[];
  tasks: { id: string; text: string; done: boolean }[];
}

const WorkspaceView = ({ setView }: { setView: (v: View) => void }) => {
  const [projects, setProjects] = useState<WorkspaceProject[]>([
    { id: '1', name: 'AI/ML Research', color: '#00d4ff', description: 'Deep learning, neural networks, and AI research notes', memoryIds: [], tasks: [{ id: 't1', text: 'Study transformer architecture', done: false }, { id: 't2', text: 'Summarize GPT-4 paper', done: true }] },
    { id: '2', name: 'Business Strategy', color: '#8b5cf6', description: 'Market research, strategy frameworks, and growth ideas', memoryIds: [], tasks: [{ id: 't3', text: 'Porter\'s Five Forces analysis', done: false }] },
    { id: '3', name: 'Personal Growth', color: '#10b981', description: 'Productivity, habits, and self-improvement captures', memoryIds: [], tasks: [] },
  ]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [activeProject, setActiveProject] = useState<string>(projects[0].id);
  const [newProjectName, setNewProjectName] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);

  useEffect(() => {
    fetch('/memories?limit=30').then(r => r.ok ? r.json() : []).then(setMemories);
  }, []);

  const project = projects.find(p => p.id === activeProject)!;

  const addProject = () => {
    if (!newProjectName.trim()) return;
    const colors = ['#00d4ff', '#8b5cf6', '#f472b6', '#10b981', '#f59e0b', '#ef4444'];
    setProjects(prev => [...prev, { id: Date.now().toString(), name: newProjectName.trim(), color: colors[prev.length % colors.length], description: '', memoryIds: [], tasks: [] }]);
    setNewProjectName(''); setShowNewProject(false);
  };

  const toggleTask = (taskId: string) => {
    setProjects(prev => prev.map(p => p.id === activeProject ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) } : p));
  };

  const addTask = () => {
    if (!newTaskText.trim()) return;
    setProjects(prev => prev.map(p => p.id === activeProject ? { ...p, tasks: [...p.tasks, { id: Date.now().toString(), text: newTaskText.trim(), done: false }] } : p));
    setNewTaskText(''); setShowNewTask(false);
  };

  const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, backdropFilter: 'blur(20px)' } as React.CSSProperties;
  const projectMemories = memories.filter(m => m.domain.toLowerCase().includes(project.name.toLowerCase().split('/')[0].trim().toLowerCase()) || project.memoryIds.includes(m.id));

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Kanban size={17} color="#f59e0b" />
          </div>
          <div>
            <h1 style={{ color: '#f1f5f9', fontSize: 22, fontWeight: 700, margin: 0 }}>Workspace</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: 0 }}>Organize knowledge into projects</p>
          </div>
        </div>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
        {/* Projects sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {projects.map((p, i) => (
            <motion.button key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => setActiveProject(p.id)}
              style={{ ...card, padding: '12px 14px', cursor: 'pointer', border: `1px solid ${activeProject === p.id ? p.color + '40' : 'rgba(255,255,255,0.07)'}`, background: activeProject === p.id ? `${p.color}10` : 'rgba(255,255,255,0.03)', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, boxShadow: activeProject === p.id ? `0 0 8px ${p.color}` : 'none', flexShrink: 0 }} />
                <span style={{ color: activeProject === p.id ? '#e2e8f0' : '#9ca3af', fontSize: 13, fontWeight: activeProject === p.id ? 600 : 400 }}>{p.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
                <span style={{ color: '#6b7280', fontSize: 10 }}>{p.tasks.length} tasks</span>
                <span style={{ color: '#6b7280', fontSize: 10 }}>·</span>
                <span style={{ color: '#6b7280', fontSize: 10 }}>{p.tasks.filter(t => t.done).length} done</span>
              </div>
            </motion.button>
          ))}
          {showNewProject ? (
            <div style={{ ...card, padding: '10px 12px' }}>
              <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addProject()} placeholder="Project name..."
                style={{ width: '100%', background: 'none', border: 'none', color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit', marginBottom: 8 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={addProject} style={{ flex: 1, padding: '5px 0', background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 7, color: '#00d4ff', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
                <button onClick={() => setShowNewProject(false)} style={{ flex: 1, padding: '5px 0', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 7, color: '#6b7280', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNewProject(true)}
              style={{ padding: '10px 14px', background: 'transparent', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 14, color: '#4b5563', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'inherit', transition: 'all 0.2s' }}
              onMouseEnter={e => { (e.currentTarget).style.borderColor = 'rgba(0,212,255,0.25)'; (e.currentTarget).style.color = '#00d4ff'; }}
              onMouseLeave={e => { (e.currentTarget).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget).style.color = '#4b5563'; }}>
              <PlusCircle size={13} /> New Project
            </button>
          )}
        </div>

        {/* Project content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Project header */}
          <motion.div key={activeProject} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ ...card, padding: '16px 20px', border: `1px solid ${project.color}25` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: project.color, boxShadow: `0 0 12px ${project.color}` }} />
              <h2 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 700, margin: 0 }}>{project.name}</h2>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                <span style={{ color: '#4b5563', fontSize: 11 }}>{project.tasks.filter(t => !t.done).length} pending tasks</span>
                <span style={{ color: project.color, fontSize: 11, fontWeight: 600 }}>{Math.round(project.tasks.length > 0 ? (project.tasks.filter(t => t.done).length / project.tasks.length) * 100 : 0)}% complete</span>
              </div>
            </div>
            {project.description && <p style={{ color: '#6b7280', fontSize: 12, margin: '8px 0 0 20px' }}>{project.description}</p>}
          </motion.div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {/* Tasks */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ ...card, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>Tasks</div>
                <button onClick={() => setShowNewTask(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'inherit' }}>
                  <PlusCircle size={12} /> Add
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {project.tasks.map(t => (
                  <div key={t.id} onClick={() => toggleTask(t.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${t.done ? project.color : '#6b7280'}`, background: t.done ? project.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                      {t.done && <CheckCheck size={10} color="#fff" />}
                    </div>
                    <span style={{ color: t.done ? '#6b7280' : '#9ca3af', fontSize: 12, textDecoration: t.done ? 'line-through' : 'none', transition: 'all 0.2s' }}>{t.text}</span>
                  </div>
                ))}
                {showNewTask && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <input autoFocus value={newTaskText} onChange={e => setNewTaskText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setShowNewTask(false); }}
                      placeholder="New task..."
                      style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: '#e2e8f0', fontSize: 12, padding: '5px 9px', outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                )}
                {project.tasks.length === 0 && !showNewTask && <p style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 0', textAlign: 'center', padding: '16px 0' }}>No tasks yet</p>}
              </div>
            </motion.div>

            {/* Related memories */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ ...card, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>Related Memories</div>
                <button onClick={() => setView('capture')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontFamily: 'inherit' }}>
                  <Plus size={12} /> Capture
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {projectMemories.slice(0, 4).map(m => {
                  const clr = { youtube: '#ef4444', web: '#00d4ff', pdf: '#f59e0b', note: '#10b981' }[m.source_type] ?? '#6b7280';
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: 8, padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', alignItems: 'flex-start' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: clr, marginTop: 4, flexShrink: 0 }} />
                      <div>
                        <div style={{ color: '#d1d5db', fontSize: 12, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{m.title}</div>
                        <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>{m.domain}</div>
                      </div>
                    </div>
                  );
                })}
                {projectMemories.length === 0 && <p style={{ color: '#6b7280', fontSize: 12, textAlign: 'center', padding: '16px 0', margin: 0 }}>No related memories yet</p>}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Agent Hub View ───────────────────────────────────────────────────────────

interface AgentMsg {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'thinking' | 'steps' | 'welcome';
  steps?: AgentStepData[];
  agents?: string[];
  workflow_id?: string;
  ts: string;
}

interface AgentStepData {
  step_id: string;
  agent: string;
  tool: string;
  name: string;
  status: 'running' | 'completed' | 'failed';
  input?: any;
  output_summary?: string;
  error?: string;
  duration_ms?: number;
}

const AGENT_COLORS: Record<string, string> = {
  Orchestrator: '#00d4ff', CaptureAgent: '#f43f5e', RecallAgent: '#8b5cf6',
  TaskAgent: '#10b981', CalendarAgent: '#f59e0b', BriefingAgent: '#06b6d4', AnalyticsAgent: '#3b82f6'
};

const QUICK_PROMPTS = [
  { label: 'Daily briefing', icon: Sparkles, msg: 'Give me my AI daily briefing with learning summary' },
  { label: 'Review tasks', icon: CheckSquare, msg: 'Show me all my pending tasks and prioritize them' },
  { label: 'What did I learn?', icon: Brain, msg: 'Recall the most important things I have saved recently' },
  { label: 'Study schedule', icon: CalendarIcon, msg: 'Create a study plan for this week based on my knowledge base' },
  { label: 'Knowledge stats', icon: BarChart2, msg: 'Analyze my knowledge base and give me learning insights' },
];

const AgentHubView = ({ setView }: { setView: (v: View) => void }) => {
  const [messages, setMessages] = useState<AgentMsg[]>([
    {
      id: 'welcome', role: 'assistant', type: 'welcome', ts: new Date().toISOString(),
      content: 'Hello! I am the Neural AI Orchestrator.\n\nI coordinate a team of specialized sub-agents to help you capture knowledge, manage tasks, schedule study sessions, and recall anything from your Second Brain.\n\nWhat would you like to accomplish today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'idle' | 'running' | 'done'>>({});
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activePanel, setActivePanel] = useState<'agents' | 'history'>('agents');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const thinkingIdRef = useRef<string>('');

  const agentList = [
    { name: 'Orchestrator', role: 'Primary coordinator', color: '#00d4ff', tools: ['plan', 'delegate', 'synthesize'] },
    { name: 'CaptureAgent', role: 'Captures YouTube, web, notes', color: '#f43f5e', tools: ['youtube', 'web', 'note'] },
    { name: 'RecallAgent', role: 'Semantic knowledge search', color: '#8b5cf6', tools: ['search', 'filter'] },
    { name: 'TaskAgent', role: 'Task creation & management', color: '#10b981', tools: ['create', 'list', 'complete'] },
    { name: 'CalendarAgent', role: 'Event scheduling', color: '#f59e0b', tools: ['schedule', 'list'] },
    { name: 'BriefingAgent', role: 'Daily briefings & study plans', color: '#06b6d4', tools: ['briefing', 'plan'] },
    { name: 'AnalyticsAgent', role: 'Stats & learning insights', color: '#3b82f6', tools: ['stats', 'graph'] },
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const data = await fetch('/workflows?limit=10').then(r => r.json());
      setWorkflows(Array.isArray(data) ? data : []);
    } catch { setWorkflows([]); }
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isStreaming) return;

    const userMsgId = `u-${Date.now()}`;
    const thinkId = `t-${Date.now()}`;
    thinkingIdRef.current = thinkId;

    setMessages(prev => [...prev,
      { id: userMsgId, role: 'user', type: 'text', content: msg, ts: new Date().toISOString() },
      { id: thinkId, role: 'assistant', type: 'thinking', content: '', ts: new Date().toISOString(), steps: [] }
    ]);
    setInput('');
    setIsStreaming(true);
    setAgentStatuses({ Orchestrator: 'running' });

    try {
      const response = await fetch('/agent/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: 'agent-hub' })
      });

      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        for (const chunk of lines) {
          const line = chunk.trim();
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              handleSSEEvent(event);
            } catch { /* ignore malformed */ }
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => prev.map(m => m.id === thinkingIdRef.current
        ? { ...m, type: 'text', content: `Error: ${e.message || 'Connection failed'}` }
        : m
      ));
    } finally {
      setIsStreaming(false);
      setAgentStatuses({});
      fetchWorkflows();
    }
  };

  const handleSSEEvent = (event: any) => {
    const thinkId = thinkingIdRef.current;
    switch (event.type) {
      case 'thinking':
        setAgentStatuses(prev => ({ ...prev, Orchestrator: 'running' }));
        break;

      case 'agent_start':
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'running', Orchestrator: 'running' }));
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, type: 'steps', steps: [...(m.steps || []), { step_id: event.step_id, agent: event.agent, tool: event.tool, name: event.name, status: 'running', input: event.input }] }
          : m
        ));
        break;

      case 'agent_complete':
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'done' }));
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, steps: (m.steps || []).map(s => s.step_id === event.step_id ? { ...s, status: 'completed', output_summary: event.output_summary, duration_ms: event.duration_ms } : s) }
          : m
        ));
        break;

      case 'agent_error':
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'idle' }));
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, steps: (m.steps || []).map(s => s.step_id === event.step_id ? { ...s, status: 'failed', error: event.error } : s) }
          : m
        ));
        break;

      case 'workflow_complete':
        setMessages(prev => [
          ...prev.filter(m => m.id !== thinkId),
          {
            id: event.workflow_id,
            role: 'assistant' as const,
            type: 'text' as const,
            content: event.reply,
            steps: event.steps,
            agents: event.agents_called,
            workflow_id: event.workflow_id,
            ts: event.timestamp || new Date().toISOString()
          }
        ]);
        setAgentStatuses({});
        break;

      case 'error':
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, type: 'text', content: `Neural AI error: ${event.message}` }
          : m
        ));
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="agent-hub-layout">

      {/* ── Left Panel: Agent Registry + History ── */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }} className="agent-hub-left hidden lg:flex">

        {/* Panel Toggle */}
        <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
          {(['agents', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActivePanel(tab)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: activePanel === tab ? 'var(--surface)' : 'transparent',
                color: activePanel === tab ? 'var(--primary)' : 'var(--text-3)', fontSize: 11, fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.2s',
                boxShadow: activePanel === tab ? 'var(--shadow-sm)' : 'none' }}>
              {tab === 'agents' ? 'Agents' : 'History'}
            </button>
          ))}
        </div>

        {activePanel === 'agents' ? (
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '11px 14px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ color: '#94a3b8', fontSize: 10, letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase' }}>Agent Registry</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }} className="scroll-custom">
              {agentList.map(agent => {
                const status = agentStatuses[agent.name] || 'idle';
                return (
                  <div key={agent.name} style={{ padding: '8px 10px', borderRadius: 9, marginBottom: 2,
                    background: status === 'running' ? `${agent.color}10` : 'transparent',
                    border: `1px solid ${status === 'running' ? agent.color + '30' : 'transparent'}`,
                    transition: 'all 0.25s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ position: 'relative', width: 7, height: 7, flexShrink: 0 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: status === 'running' ? agent.color : status === 'done' ? '#10b981' : '#e2e8f0' }} />
                        {status === 'running' && (
                          <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `1px solid ${agent.color}`, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite', opacity: 0.6 }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: status === 'running' ? agent.color : '#1e293b', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</div>
                        <div style={{ color: '#94a3b8', fontSize: 9.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.role}</div>
                      </div>
                    </div>
                    {status === 'running' && (
                      <div style={{ marginTop: 5, display: 'flex', gap: 3 }}>
                        {[1,2,3].map(i => (
                          <div key={i} style={{ height: 2, flex: 1, background: agent.color, borderRadius: 2, opacity: 0.5, animation: `pulse ${0.6 + i * 0.2}s ease-in-out infinite alternate` }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '9px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ color: 'var(--text-2)', fontSize: 10 }}>{agentList.length} agents ready</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '11px 14px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase' }}>Workflow History</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }} className="scroll-custom">
              {workflows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 11 }}>No workflows yet</div>
              ) : workflows.map(wf => (
                <div key={wf.id} style={{ padding: '8px 10px', borderRadius: 9, marginBottom: 4, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: wf.status === 'completed' ? '#10b981' : wf.status === 'failed' ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-1)', fontSize: 10, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.description || wf.name}</span>
                  </div>
                  <div style={{ color: 'var(--text-3)', fontSize: 9.5 }}>{wf.agents_called?.join(' › ')} · {wf.steps?.length || 0} steps</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick navigate */}
        <div style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ color: 'var(--text-3)', fontSize: 9.5, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Quick Access</div>
          {[
            { label: 'Vault', view: 'vault' as View, color: '#ec4899' },
            { label: 'Tasks', view: 'tasks' as View, color: '#10b981' },
            { label: 'Calendar', view: 'calendar' as View, color: '#f59e0b' },
          ].map(link => (
            <button key={link.view} onClick={() => setView(link.view)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px', borderRadius: 7, border: 'none', background: 'transparent', color: link.color, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'background 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              → {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Chat Interface ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
          <div>
            <h2 style={{ color: 'var(--text-1)', fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>
              Agent Hub <span style={{ color: 'var(--primary)', marginLeft: 4 }}>✦</span>
            </h2>
            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '2px 0 0' }}>Multi-agent AI system · Real-time coordination · SSE streaming</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isStreaming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1s ease-in-out infinite' }} />
                <span style={{ color: 'var(--primary)', fontSize: 11, fontWeight: 600 }}>Agents active</span>
              </div>
            )}
            <button onClick={() => { setMessages([{ id: 'welcome', role: 'assistant', type: 'welcome', ts: new Date().toISOString(), content: 'Session cleared. How can I help you?' }]); setAgentStatuses({}); }}
              style={{ padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface-2)', padding: 16, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 14 }} className="scroll-custom agent-messages">
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>

              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
                  <Brain size={15} color="white" />
                </div>
              )}

              <div style={{ maxWidth: msg.role === 'user' ? '70%' : '85%', minWidth: 0 }}>

                {/* Thinking indicator */}
                {msg.type === 'thinking' && (msg.steps || []).length === 0 && (
                  <div style={{ padding: '10px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: '4px 14px 14px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                      ))}
                    </div>
                    <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}>Orchestrator is planning...</span>
                  </div>
                )}

                {/* Step cards (during streaming) */}
                {msg.type === 'steps' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(msg.steps || []).map(step => {
                      const color = AGENT_COLORS[step.agent] || '#6366f1';
                      return (
                        <div key={step.step_id} style={{ padding: '10px 14px', background: `${color}08`, border: `1px solid ${color}20`, borderRadius: '4px 14px 14px 14px', transition: 'all 0.3s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: step.status !== 'running' ? 6 : 0 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: step.status === 'completed' ? '#10b981' : step.status === 'failed' ? '#ef4444' : color,
                              ...(step.status === 'running' ? { animation: 'pulse 1s ease-in-out infinite' } : {}) }} />
                            <span style={{ color, fontSize: 10.5, fontWeight: 700 }}>{step.agent}</span>
                            <span style={{ color: 'var(--text-3)', fontSize: 10 }}>›</span>
                            <span style={{ color: 'var(--text-2)', fontSize: 10.5 }}>{step.name}</span>
                            {step.status === 'running' && <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 9.5 }}>Running...</span>}
                            {step.status === 'completed' && <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: 9.5 }}>✓ {step.duration_ms?.toFixed(0)}ms</span>}
                            {step.status === 'failed' && <span style={{ marginLeft: 'auto', color: '#ef4444', fontSize: 9.5 }}>✗ Failed</span>}
                          </div>
                          {step.status === 'completed' && step.output_summary && (
                            <div style={{ color: 'var(--text-2)', fontSize: 11, paddingLeft: 14, borderLeft: `2px solid ${color}40`, marginTop: 4 }}>{step.output_summary}</div>
                          )}
                          {step.status === 'failed' && step.error && (
                            <div style={{ color: '#ef4444', fontSize: 10.5, marginTop: 4 }}>{step.error}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Text message */}
                {(msg.type === 'text' || msg.type === 'welcome') && (
                  <div>
                    <div style={{
                      padding: '11px 15px', borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                      background: msg.role === 'user'
                        ? '#6366f1'
                        : msg.type === 'welcome' ? '#eef2ff' : '#ffffff',
                      border: msg.role === 'user'
                        ? 'none'
                        : `1px solid ${msg.type === 'welcome' ? '#c7d2fe' : '#e2e8f0'}`,
                      boxShadow: msg.role === 'user' ? '0 2px 8px rgba(99,102,241,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                      <p style={{ color: msg.role === 'user' ? '#ffffff' : '#0f172a', fontSize: 13, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    </div>

                    {/* Completed workflow steps summary */}
                    {msg.steps && msg.steps.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {msg.steps.map(s => {
                          const color = AGENT_COLORS[s.agent] || '#6366f1';
                          return (
                            <span key={s.step_id} style={{ padding: '2px 8px', background: `${color}10`, border: `1px solid ${color}20`, borderRadius: 20, color, fontSize: 9.5, fontWeight: 700 }}>
                              {s.agent.replace('Agent', '')} · {s.name}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {msg.role === 'assistant' && msg.ts && (
                      <div style={{ color: '#94a3b8', fontSize: 9.5, marginTop: 4, paddingLeft: 2 }}>
                        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.agents && msg.agents.length > 0 && ` · ${msg.agents.length} agents`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length <= 2 && !isStreaming && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, flexShrink: 0 }}>
            {QUICK_PROMPTS.map(qp => (
              <button key={qp.label} onClick={() => handleSend(qp.msg)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-2)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-bg)'; e.currentTarget.style.borderColor = 'var(--primary-border)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
                <qp.icon size={11} /> {qp.label}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div style={{ flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-end', boxShadow: 'var(--shadow-sm)' }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask Neural AI anything... (Enter to send, Shift+Enter for new line)"
            disabled={isStreaming}
            rows={1}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, overflow: 'auto' }}
          />
          <button onClick={() => handleSend()} disabled={!input.trim() || isStreaming}
            style={{ width: 34, height: 34, borderRadius: 9, border: 'none', cursor: input.trim() && !isStreaming ? 'pointer' : 'default', fontFamily: 'inherit', flexShrink: 0,
              background: input.trim() && !isStreaming ? 'var(--primary)' : 'var(--surface-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
              boxShadow: input.trim() && !isStreaming ? '0 2px 8px rgba(99,102,241,0.3)' : 'none' }}>
            {isStreaming ? <Loader2 size={15} color="var(--text-3)" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} color={input.trim() ? 'white' : 'var(--text-3)'} />}
          </button>
        </div>

        <p style={{ color: 'var(--text-3)', fontSize: 9.5, textAlign: 'center', marginTop: 8, flexShrink: 0 }}>
          Powered by Neural AI · Multi-agent orchestration with real-time SSE streaming
        </p>
      </div>
    </div>
  );
};

// ─── Login Screen ─────────────────────────────────────────────────────────────

type AuthMode = 'signin' | 'signup' | 'forgot';

const FEATURES = [
  { icon: Brain,        color: '#6366f1', label: 'Semantic Recall',   desc: 'Find anything you\'ve ever captured instantly' },
  { icon: Cpu,          color: '#9333ea', label: 'Multi-Agent AI',    desc: '7 specialized agents working in parallel' },
  { icon: Sparkles,     color: '#ec4899', label: 'Daily Briefings',   desc: 'Personalized AI summaries every morning' },
  { icon: CheckSquare,  color: '#10b981', label: 'Smart Tasks',       desc: 'AI-prioritized tasks and workspace' },
  { icon: Database,     color: '#f59e0b', label: 'Knowledge Vault',   desc: 'Structured storage for everything you know' },
  { icon: Network,      color: '#3b82f6', label: 'Mind Graph',        desc: 'Visual map of connected ideas' },
];

const PREMIUM_STATS = [
  { label: 'Knowledge Captured', value: '1.2M+' },
  { label: 'Recall Accuracy', value: '98.7%' },
  { label: 'Avg. Time Saved', value: '9.4 hrs/week' },
];

const TRUST_BADGES = ['SOC2-ready', 'Encrypted by default', 'Enterprise SSO', '99.95% uptime'];

const TESTIMONIALS = [
  {
    quote: 'Recall X247 turned our research chaos into a searchable, actionable knowledge system in days.',
    author: 'Priya Nair',
    role: 'Product Lead, Knowledge Ops',
  },
  {
    quote: 'The multi-agent workflow is like having a premium AI operations team for every project.',
    author: 'Daniel Kim',
    role: 'Founder, Sprint Forge',
  },
  {
    quote: 'From capture to task to calendar, everything is finally connected and frictionless.',
    author: 'Ananya Rao',
    role: 'Learning Program Director',
  },
];

const TESTIMONIAL_ROTATION_INTERVAL_MS = 5000;
const TESTIMONIAL_DOT_WIDTH_ACTIVE = 18;
const TESTIMONIAL_DOT_WIDTH_INACTIVE = 6;
const PREMIUM_STAT_VALUE_FONT_SIZE = 13;
const PREMIUM_STAT_LABEL_FONT_SIZE = 9.5;

const PARTICLES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  x: Math.random() * 100, y: Math.random() * 100,
  size: 2 + Math.random() * 3,
  dur: 4 + Math.random() * 6,
  delay: Math.random() * 4,
  opacity: 0.15 + Math.random() * 0.3,
}));

const GoogleSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AuthInput = ({ label, type, value, onChange, placeholder, autoComplete, icon: Icon }: {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string; icon?: React.ElementType;
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
    <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>{label}</label>
    <div style={{ position: 'relative' }}>
      {Icon && (
        <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-3)', display: 'flex' }}>
          <Icon size={14} />
        </div>
      )}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoComplete={autoComplete}
        style={{
          width: '100%', padding: Icon ? '11px 13px 11px 36px' : '11px 13px',
          background: 'rgba(99,102,241,0.04)', border: '1.5px solid var(--border)',
          borderRadius: 11, fontFamily: 'inherit', fontSize: 13.5, color: 'var(--text-1)',
          outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box',
        }}
        onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = 'rgba(99,102,241,0.06)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.background = 'rgba(99,102,241,0.04)'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  </div>
);

const LoginScreen = ({ isDark, toggleTheme, onGoogleSignIn, onEmailSignIn, onEmailSignUp, onResetPassword, onAnonymousSignIn }: {
  isDark: boolean; toggleTheme: () => void;
  onGoogleSignIn: () => Promise<any>;
  onEmailSignIn: (email: string, password: string) => Promise<any>;
  onEmailSignUp: (email: string, password: string, name: string) => Promise<any>;
  onResetPassword: (email: string) => Promise<void>;
  onAnonymousSignIn: () => Promise<any>;
}) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [anonLoading, setAnonLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const testimonialInterval = setInterval(() => {
      setActiveTestimonial(prevIndex => (prevIndex + 1) % TESTIMONIALS.length);
    }, TESTIMONIAL_ROTATION_INTERVAL_MS);
    return () => clearInterval(testimonialInterval);
  }, []);

  const switchMode = (targetMode: AuthMode) => { setMode(targetMode); setError(''); setSuccess(''); };

  const friendlyError = (code: string) => ({
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
    'auth/operation-not-allowed': 'Email/password sign-in is not enabled. Please use Google sign-in.',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'Firebase API key is invalid. Please check your configuration.',
  } as Record<string, string>)[code] ?? 'Something went wrong. Please try again.';

  const handleGoogle = async () => {
    setError(''); setGoogleLoading(true);
    try { await onGoogleSignIn(); }
    catch (e: any) { setError(friendlyError(e.code ?? '')); }
    finally { setGoogleLoading(false); }
  };

  const handleAnonymous = async () => {
    setError(''); setAnonLoading(true);
    try { await onAnonymousSignIn(); }
    catch (e: any) { setError(friendlyError(e.code ?? '')); }
    finally { setAnonLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (mode === 'forgot') {
      if (!email) { setError('Enter your email address.'); return; }
      setLoading(true);
      try { await onResetPassword(email); setSuccess('Reset email sent! Check your inbox.'); }
      catch (e: any) { setError(friendlyError(e.code ?? '')); }
      finally { setLoading(false); }
      return;
    }
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    if (mode === 'signup') {
      if (!name.trim()) { setError('Please enter your name.'); return; }
      if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'signup') await onEmailSignUp(email, password, name.trim());
      else await onEmailSignIn(email, password);
    } catch (e: any) { setError(friendlyError(e.code ?? '')); }
    finally { setLoading(false); }
  };

  const NAV_LINKS = ['PLATFORM', 'FEATURES', 'COMMUNITY', 'ENTERPRISE'];

  return (
    <div style={{ height: '100vh', background: isDark ? '#080b12' : '#f0f1ff', display: 'flex', flexDirection: 'column', fontFamily: "'Poppins', system-ui, sans-serif", overflow: 'hidden', position: 'relative' }}>

      {/* ── Top navigation bar ────────────────────────────────────── */}
      <motion.nav initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', height: 56, flexShrink: 0,
          background: isDark ? 'rgba(10,12,20,0.85)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
          borderBottom: `1px solid ${isDark ? 'rgba(99,102,241,0.18)' : 'rgba(99,102,241,0.13)'}`,
          position: 'relative', zIndex: 10,
          boxShadow: isDark ? '0 1px 20px rgba(0,0,0,0.3)' : '0 1px 16px rgba(99,102,241,0.07)',
        }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 10px rgba(99,102,241,0.4)' }}>
            <Brain size={16} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, color: isDark ? '#f0f0ff' : '#1a1040', fontFamily: "'Alegreya Sans SC', system-ui, sans-serif", letterSpacing: '-0.2px' }}>Recall X247</span>
        </div>

        {/* Center nav links — desktop only */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 6 }}>
          {NAV_LINKS.map((link) => (
            <button key={link}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '6px 14px', borderRadius: 8,
                fontSize: 10.5, fontWeight: 700, letterSpacing: '0.8px',
                color: isDark ? 'rgba(180,180,210,0.65)' : 'rgba(60,50,100,0.55)',
                fontFamily: "'Poppins', system-ui, sans-serif",
                transition: 'color 0.15s, background 0.15s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.color = isDark ? '#a5b4fc' : '#6366f1';
                (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.color = isDark ? 'rgba(180,180,210,0.65)' : 'rgba(60,50,100,0.55)';
                (e.currentTarget as HTMLButtonElement).style.background = 'none';
              }}
            >{link}</button>
          ))}
        </div>

        {/* Right CTA buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme toggle */}
          <button onClick={toggleTheme}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.18)'}`, background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            {isDark ? <Sun size={14} color="#a5b4fc" /> : <Moon size={14} color="#6366f1" />}
          </button>
          {/* Sign In */}
          <button onClick={() => switchMode('signin')}
            style={{
              padding: '7px 16px', borderRadius: 999, cursor: 'pointer', fontFamily: "'Poppins', system-ui, sans-serif",
              fontWeight: 600, fontSize: 12, letterSpacing: '0.2px', transition: 'all 0.18s',
              background: 'none',
              color: isDark ? '#a5b4fc' : '#6366f1',
              border: `1.5px solid ${isDark ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.35)'}`,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >Sign In</button>
          {/* Get Started */}
          <button onClick={() => switchMode('signup')}
            style={{
              padding: '7px 18px', borderRadius: 999, cursor: 'pointer', fontFamily: "'Poppins', system-ui, sans-serif",
              fontWeight: 700, fontSize: 12, letterSpacing: '0.2px', transition: 'all 0.18s',
              background: 'linear-gradient(135deg, #6366f1, #9333ea)',
              color: '#fff', border: 'none',
              boxShadow: '0 3px 12px rgba(99,102,241,0.4)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 5px 18px rgba(99,102,241,0.55)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 3px 12px rgba(99,102,241,0.4)'; (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
          >Get Started Free</button>
        </div>
      </motion.nav>

      {/* ── Inner content row ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', minHeight: 0 }}>

      {/* ── Animated particle field ──────────────────────────────── */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        {PARTICLES.map(p => (
          <motion.div key={p.id}
            style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, borderRadius: '50%', background: p.id % 3 === 0 ? '#6366f1' : p.id % 3 === 1 ? '#9333ea' : '#ec4899', opacity: p.opacity }}
            animate={{ y: [0, -18, 0], opacity: [p.opacity, p.opacity * 1.8, p.opacity] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
        {/* Large ambient blobs */}
        <motion.div animate={{ scale: [1, 1.12, 1], opacity: [0.07, 0.13, 0.07] }} transition={{ duration: 8, repeat: Infinity }}
          style={{ position: 'absolute', top: '-15%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <motion.div animate={{ scale: [1, 1.08, 1], opacity: [0.05, 0.1, 0.05] }} transition={{ duration: 10, repeat: Infinity, delay: 2 }}
          style={{ position: 'absolute', bottom: '-20%', right: '-5%', width: 550, height: 550, borderRadius: '50%', background: 'radial-gradient(circle, #9333ea 0%, transparent 70%)' }} />
        <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.09, 0.04] }} transition={{ duration: 7, repeat: Infinity, delay: 4 }}
          style={{ position: 'absolute', top: '40%', left: '30%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
      </div>

      {/* ── Left panel — feature showcase ────────────────────────── */}
      <div className="hidden lg:flex sidebar-nav" style={{ flex: '0 0 400px', flexDirection: 'column', padding: '28px 36px', position: 'relative', zIndex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* Logo */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
          style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ position: 'relative' }}>
            <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 3, repeat: Infinity }}
              style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#6366f1,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(99,102,241,0.45)' }}>
              <Brain size={22} color="white" />
            </motion.div>
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
              style={{ position: 'absolute', inset: -3, borderRadius: 16, background: 'transparent', border: '1.5px solid rgba(99,102,241,0.4)', pointerEvents: 'none' }} />
          </div>
          <div>
            <div style={{ color: isDark ? '#f0f0ff' : '#1a1040', fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px', fontFamily: "'Alegreya Sans SC', system-ui, sans-serif" }}>Recall X247</div>
            <div style={{ color: '#6366f1', fontSize: 9, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 700 }}>Neural OS v2.0</div>
          </div>
        </motion.div>

        {/* Hero text */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }} style={{ marginBottom: 6 }}>
          {/* Floating badge */}
          <motion.div
            animate={{ y: [0, -3, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', border: `1px solid ${isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.28)'}`, marginBottom: 14 }}>
            <Sparkles size={11} color="#6366f1" />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: isDark ? '#a5b4fc' : '#4f46e5', letterSpacing: '0.3px' }}>Neural AI v3.0 — Now Live</span>
            <ChevronRight size={10} color={isDark ? '#a5b4fc' : '#4f46e5'} />
          </motion.div>
          <h2 style={{ fontSize: 30, fontWeight: 900, color: isDark ? '#f0f0ff' : '#1a1040', margin: '0 0 10px', lineHeight: 1.15, letterSpacing: '-0.6px', fontFamily: "'Alegreya Sans SC', system-ui, sans-serif" }}>
            Your AI-Powered<br />
            <span style={{ background: 'linear-gradient(135deg,#6366f1,#9333ea,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Second Brain</span>
          </h2>
          <p style={{ color: isDark ? 'rgba(200,200,230,0.65)' : 'rgba(50,40,90,0.6)', fontSize: 13.5, lineHeight: 1.7, margin: '0 0 14px' }}>
            Capture knowledge, recall anything instantly, and let your multi-agent AI handle the rest. Built for the way your mind works.
          </p>
          {/* Social proof avatar strip */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {['#6366f1','#9333ea','#ec4899','#10b981','#f59e0b'].map((c, i) => (
                <div key={i} style={{ width: 26, height: 26, borderRadius: '50%', background: `${c}`, border: `2px solid ${isDark ? '#080b12' : '#f0f1ff'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: i === 0 ? 0 : -8, fontSize: 9, fontWeight: 700, color: '#fff', zIndex: 5 - i }}>
                  {['P','D','A','S','R'][i]}
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {[0,1,2,3,4].map(i => <Star key={i} size={9} color="#f59e0b" fill="#f59e0b" />)}
              </div>
              <div style={{ fontSize: 9.5, color: isDark ? 'rgba(180,180,210,0.55)' : 'rgba(60,50,100,0.5)', marginTop: 1 }}>2,400+ professionals use Recall X247</div>
            </div>
          </div>
        </motion.div>

        {/* Premium KPI bar */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7, marginBottom: 10 }}>
          {PREMIUM_STATS.map((stat) => (
            <div key={stat.label} style={{
              padding: '10px 9px', borderRadius: 12,
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.14)'}`,
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ fontSize: PREMIUM_STAT_VALUE_FONT_SIZE, fontWeight: 800, color: isDark ? '#f0f0ff' : '#1a1040', marginBottom: 2 }}>{stat.value}</div>
              <div style={{ fontSize: PREMIUM_STAT_LABEL_FONT_SIZE, color: isDark ? 'rgba(180,180,210,0.6)' : 'rgba(60,50,100,0.55)', lineHeight: 1.3 }}>{stat.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          {FEATURES.map((f, i) => (
            <motion.div key={f.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.2 + i * 0.07 }}
              onMouseEnter={() => setHoveredFeature(i)} onMouseLeave={() => setHoveredFeature(null)}
              style={{
                padding: '12px 12px 10px', borderRadius: 13, cursor: 'default', transition: 'all 0.22s',
                background: hoveredFeature === i ? `${f.color}12` : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
                border: `1px solid ${hoveredFeature === i ? f.color + '38' : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.13)'}`,
                backdropFilter: 'blur(8px)',
                transform: hoveredFeature === i ? 'translateY(-2px)' : 'none',
                boxShadow: hoveredFeature === i ? `0 8px 24px ${f.color}22, inset 0 1px 0 rgba(255,255,255,0.7)` : isDark ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.5)',
              }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg,${f.color}22,${f.color}0a)`, border: `1px solid ${f.color}38`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, boxShadow: `0 2px 8px ${f.color}18` }}>
                <f.icon size={14} color={f.color} />
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: isDark ? '#e0e0f0' : '#1a1040', marginBottom: 3, letterSpacing: '-0.1px' }}>{f.label}</div>
              <div style={{ fontSize: 9.5, color: isDark ? 'rgba(180,180,210,0.55)' : 'rgba(60,50,100,0.5)', lineHeight: 1.45 }}>{f.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.28 }} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.8px', textTransform: 'uppercase', color: isDark ? 'rgba(180,180,210,0.4)' : 'rgba(60,50,100,0.38)', marginBottom: 10 }}>HOW IT WORKS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { n: '01', title: 'Capture', desc: 'Save URLs, PDFs, notes or voice in one click', color: '#6366f1' },
              { n: '02', title: 'AI Processes', desc: 'Agents index, tag and link it to your knowledge graph', color: '#9333ea' },
              { n: '03', title: 'Recall Instantly', desc: 'Ask anything — get precise answers from your own data', color: '#ec4899' },
            ].map((step, i) => (
              <div key={step.n} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                {/* Line connector */}
                {i < 2 && <div style={{ position: 'absolute', left: 15, top: 30, width: 1, height: 'calc(100% - 4px)', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(99,102,241,0.12)' }} />}
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${step.color}18`, border: `1.5px solid ${step.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 9, fontWeight: 800, color: step.color, letterSpacing: '0.5px', zIndex: 1 }}>{step.n}</div>
                <div style={{ paddingBottom: i < 2 ? 14 : 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#e8e8ff' : '#1a1040', marginBottom: 2 }}>{step.title}</div>
                  <div style={{ fontSize: 10, color: isDark ? 'rgba(180,180,210,0.5)' : 'rgba(60,50,100,0.48)', lineHeight: 1.4 }}>{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Rotating testimonial */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.32 }}
          style={{
            marginTop: 10, padding: '11px 12px 10px', borderRadius: 12,
            background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)',
            border: `1px solid ${isDark ? 'rgba(129,140,248,0.28)' : 'rgba(99,102,241,0.2)'}`,
            boxShadow: '0 10px 30px rgba(99,102,241,0.12)',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
            <Star size={12} color="#f59e0b" />
            <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', color: isDark ? '#c7d2fe' : '#4f46e5' }}>
              Customer Story
            </span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.25 }}
            >
              <p style={{ margin: '0 0 8px', fontSize: 11.5, lineHeight: 1.55, color: isDark ? '#dbe2ff' : '#312e81' }}>
                “{TESTIMONIALS[activeTestimonial].quote}”
              </p>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: isDark ? '#eef2ff' : '#1a1040' }}>{TESTIMONIALS[activeTestimonial].author}</div>
              <div style={{ fontSize: 9.5, color: isDark ? 'rgba(170,180,220,0.7)' : 'rgba(60,50,100,0.6)' }}>{TESTIMONIALS[activeTestimonial].role}</div>
            </motion.div>
          </AnimatePresence>
          <div style={{ display: 'flex', gap: 5, marginTop: 10 }}>
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                style={{
                  width: i === activeTestimonial ? TESTIMONIAL_DOT_WIDTH_ACTIVE : TESTIMONIAL_DOT_WIDTH_INACTIVE,
                  height: 6,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: i === activeTestimonial ? '#6366f1' : (isDark ? 'rgba(170,180,220,0.4)' : 'rgba(99,102,241,0.3)'),
                }}
                aria-label={`Show testimonial ${i + 1}`}
              />
            ))}
          </div>
        </motion.div>

        {/* Trust badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
          {TRUST_BADGES.map((badge) => (
            <div key={badge} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 8px',
              borderRadius: 999, fontSize: 9.5, fontWeight: 600,
              color: isDark ? 'rgba(188,198,240,0.9)' : 'rgba(60,50,100,0.72)',
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.62)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.16)'}`,
            }}>
              <CheckCircle2 size={10} color="#10b981" />
              {badge}
            </div>
          ))}
        </div>

        {/* Footer tag */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
          <span style={{ fontSize: 11, color: isDark ? 'rgba(180,180,210,0.5)' : 'rgba(60,50,100,0.45)', letterSpacing: '0.3px' }}>Gen AI Academy APAC 2026 · Recall X247</span>
        </motion.div>
      </div>

      {/* ── Right panel — auth form ───────────────────────────────── */}
      <div className="sidebar-nav" style={{ flex: 1, position: 'relative', zIndex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px' }}>

        {/* Mobile logo (hidden on lg) */}
        <motion.div className="flex lg:hidden" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
            <Brain size={18} color="white" />
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, color: isDark ? '#f0f0ff' : '#1a1040', fontFamily: "'Alegreya Sans SC', system-ui, sans-serif" }}>Recall X247</div>
        </motion.div>

        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: isDark ? 'rgba(180,180,210,0.65)' : 'rgba(60,50,100,0.62)', fontSize: 10.5, fontWeight: 600 }}>
          <CheckCheck size={12} color="#10b981" /> Trusted by founders, operators, and advanced learners
        </div>

        {/* Card */}
        <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          style={{ width: '100%', maxWidth: 400, background: isDark ? 'rgba(16,18,30,0.85)' : 'rgba(255,255,255,0.92)', border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.18)'}`, borderRadius: 20, padding: '22px 22px', backdropFilter: 'blur(24px)', boxShadow: isDark ? '0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1)' : '0 24px 64px rgba(99,102,241,0.12), 0 0 0 1px rgba(99,102,241,0.08)' }}>

          {/* Headline */}
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}
              style={{ marginBottom: 16, textAlign: 'center' }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#f0f0ff' : '#1a1040', margin: '0 0 5px', letterSpacing: '-0.4px', fontFamily: "'Alegreya Sans SC', system-ui, sans-serif" }}>
                {mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : 'Welcome Back'}
              </h1>
              <p style={{ color: isDark ? 'rgba(180,180,210,0.6)' : 'rgba(60,50,100,0.55)', fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>
                {mode === 'signup' ? 'Start building your second brain today' : mode === 'forgot' ? "We'll send a reset link to your email" : 'Sign in to your Neural OS'}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Tabs */}
          {mode !== 'forgot' && (
            <div style={{ display: 'flex', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.06)', borderRadius: 12, padding: 3, marginBottom: 20, position: 'relative' }}>
              {(['signin', 'signup'] as AuthMode[]).map(tabMode => (
                <button key={tabMode} onClick={() => switchMode(tabMode)}
                  style={{ flex: 1, padding: '8px 0', fontSize: 12.5, fontWeight: mode === tabMode ? 700 : 500, color: mode === tabMode ? '#6366f1' : isDark ? 'rgba(180,180,210,0.5)' : 'rgba(60,50,100,0.5)', background: mode === tabMode ? (isDark ? 'rgba(99,102,241,0.18)' : 'white') : 'transparent', border: 'none', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', boxShadow: mode === tabMode ? (isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(99,102,241,0.12)') : 'none' }}>
                  {tabMode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>
          )}

          {/* Premium Google button */}
          {mode !== 'forgot' && (
            <>
              <motion.button onClick={handleGoogle} disabled={googleLoading || loading}
                whileHover={!googleLoading ? { scale: 1.015, y: -1 } : {}}
                whileTap={!googleLoading ? { scale: 0.985 } : {}}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 11, padding: '12px 18px', background: isDark ? 'rgba(255,255,255,0.07)' : 'white', border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#e2e0f0'}`, borderRadius: 13, cursor: googleLoading ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: isDark ? '#f0f0ff' : '#1a1040', transition: 'all 0.2s', marginBottom: 14, boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(99,102,241,0.1), 0 1px 3px rgba(0,0,0,0.06)', backdropFilter: 'blur(8px)', position: 'relative', overflow: 'hidden' }}>
                {/* shimmer sweep on hover */}
                <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.12) 50%,transparent 100%)', transform: 'translateX(-100%)', pointerEvents: 'none' }}
                  animate={!googleLoading ? { transform: ['translateX(-100%)', 'translateX(200%)'] } : {}}
                  transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }} />
                {googleLoading
                  ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#4285F4' }} /><span>Connecting...</span></>
                  : <><GoogleSVG /><span>Continue with Google</span></>}
              </motion.button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.12)' }} />
                <span style={{ color: isDark ? 'rgba(160,160,190,0.5)' : 'rgba(99,102,241,0.45)', fontSize: 11, fontWeight: 500, letterSpacing: '0.5px' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(99,102,241,0.12)' }} />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mode === 'signup' && <AuthInput label="Full Name" type="text" value={name} onChange={setName} placeholder="Jane Smith" autoComplete="name" icon={UserIcon} />}
            <AuthInput label="Email Address" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" icon={Mail} />
            {mode !== 'forgot' && <AuthInput label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} icon={Lock} />}
            {mode === 'signup' && <AuthInput label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="••••••••" autoComplete="new-password" icon={Lock} />}

            {/* Forgot link */}
            {mode === 'signin' && (
              <button type="button" onClick={() => switchMode('forgot')}
                style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'right', padding: 0, marginTop: -4, fontWeight: 600 }}>
                Forgot password?
              </button>
            )}
            {mode === 'forgot' && (
              <button type="button" onClick={() => switchMode('signin')}
                style={{ background: 'none', border: 'none', color: isDark ? 'rgba(180,180,210,0.5)' : 'rgba(60,50,100,0.45)', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <ArrowLeft size={12} /> Back to Sign In
              </button>
            )}

            {/* Error / success */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div key="err" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10 }}>
                  <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ color: '#ef4444', fontSize: 12, lineHeight: 1.45 }}>{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div key="ok" initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10 }}>
                  <CheckCircle2 size={13} color="#22c55e" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span style={{ color: '#22c55e', fontSize: 12, lineHeight: 1.45 }}>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit button */}
            <motion.button type="submit" disabled={loading || googleLoading}
              whileHover={!loading ? { scale: 1.015, y: -1 } : {}}
              whileTap={!loading ? { scale: 0.985 } : {}}
              style={{ padding: '12.5px 16px', background: loading ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.06)') : 'linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#9333ea 100%)', border: 'none', borderRadius: 13, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: loading ? (isDark ? 'rgba(180,180,210,0.35)' : 'rgba(99,102,241,0.35)') : 'white', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: loading ? 'none' : '0 6px 20px rgba(99,102,241,0.42)', marginTop: 2, position: 'relative', overflow: 'hidden' }}>
              {!loading && <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)', transform: 'translateX(-100%)', pointerEvents: 'none' }}
                animate={{ transform: ['translateX(-100%)', 'translateX(200%)'] }}
                transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 0.8 }} />}
              {loading
                ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                : <>{mode === 'signin' ? <><LogIn size={15} /> Sign In</> : mode === 'signup' ? <><Sparkles size={15} /> Create Account</> : <><Mail size={15} /> Send Reset Email</>}</>}
            </motion.button>
          </form>

          {/* Continue as Guest */}
          <motion.button
            type="button"
            onClick={handleAnonymous}
            disabled={anonLoading || loading || googleLoading}
            whileHover={{ opacity: 0.8 }}
            whileTap={{ scale: 0.97 }}
            style={{
              marginTop: 10, width: '100%', background: 'none', border: `1px dashed ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.2)'}`,
              borderRadius: 11, padding: '9px 14px', cursor: anonLoading ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              color: isDark ? 'rgba(160,160,190,0.6)' : 'rgba(80,70,130,0.55)', fontSize: 12.5, fontWeight: 600,
              fontFamily: 'inherit', transition: 'all 0.18s',
            }}>
            {anonLoading
              ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Entering as guest...</>
              : <><UserIcon size={13} /> Continue as Guest</>}
          </motion.button>

          {/* Privacy note */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12 }}>
            <Shield size={10} color={isDark ? 'rgba(160,160,190,0.4)' : 'rgba(99,102,241,0.35)'} />
            <p style={{ color: isDark ? 'rgba(160,160,190,0.4)' : 'rgba(99,102,241,0.4)', fontSize: 10.5, margin: 0, lineHeight: 1.5 }}>
              Private & secure — your data is never shared
            </p>
          </div>
        </motion.div>

        {/* Mobile footer */}
        <div className="flex lg:hidden" style={{ marginTop: 18, color: isDark ? 'rgba(160,160,190,0.35)' : 'rgba(60,50,100,0.35)', fontSize: 10.5, textAlign: 'center' }}>
          Gen AI Academy APAC 2026 · Recall X247
        </div>

        </div>{/* end inner centering wrapper */}
      </div>{/* end right panel */}

      </div>{/* end inner content row */}
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [isReady, setIsReady] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('recall-theme') as 'light' | 'dark') || 'light';
  });

  // ── Auth state ──────────────────────────────────────────────────────────────
  const GUEST_USER_KEY = 'recall-guest-user';
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    checkRedirectResult().catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setAuthLoading(false);
      } else {
        try {
          const guestData = localStorage.getItem(GUEST_USER_KEY);
          setUser(guestData ? JSON.parse(guestData) : null);
        } catch { setUser(null); }
        setAuthLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleGuestSignIn = async () => {
    const guestUser = {
      uid: `guest-${Date.now()}`,
      displayName: 'Guest User',
      email: 'guest@recall-x247.local',
      photoURL: null,
      isAnonymous: true,
      isGuest: true,
    };
    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(guestUser));
    setUser(guestUser);
  };

  const handleSignOut = async () => {
    localStorage.removeItem(GUEST_USER_KEY);
    try { await firebaseSignOut(); } catch {}
    setUser(null);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('recall-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const isDark = theme === 'dark';

  useEffect(() => {
    fetch('/settings').then(r => r.ok ? r.json() : null).then(setAppSettings).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCommandPalette(true); }
      if (e.key === 'Escape') setShowCommandPalette(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', handleKeyDown); };
  }, []);

  // ── Auth gates (all hooks must be called ABOVE this line) ──────────────────
  if (authLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', fontFamily: "'Poppins', system-ui, sans-serif" }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg,#6366f1,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
            <Brain size={26} color="white" />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        isDark={isDark}
        toggleTheme={toggleTheme}
        onGoogleSignIn={signInWithGoogle}
        onEmailSignIn={signInWithEmail}
        onEmailSignUp={signUpWithEmail}
        onResetPassword={resetPassword}
        onAnonymousSignIn={handleGuestSignIn}
      />
    );
  }

  if (!isReady) {
    return (
      <div style={{ height: '100vh', width: '100%', background: '#f5f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2.2 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,#6366f1,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}>
            <Brain size={34} color="white" />
          </div>
        </motion.div>
        <div style={{ color: '#94a3b8', fontSize: 12, letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500 }}>Initializing Neural OS...</div>
      </div>
    );
  }

  const commands = [
    { icon: Cpu, label: 'Agent Hub — Multi-agent AI', view: 'agent' as View },
    { icon: Plus, label: 'Capture new memory', view: 'capture' as View },
    { icon: Search, label: 'Ask Neural Recall', view: 'recall' as View },
    { icon: CheckSquare, label: 'Manage tasks', view: 'tasks' as View },
    { icon: Database, label: 'Open Knowledge Vault', view: 'vault' as View },
    { icon: FlipHorizontal, label: 'Study Flashcards', view: 'flashcards' as View },
    { icon: CalendarIcon, label: 'View Schedule', view: 'calendar' as View },
    { icon: GitBranch, label: 'Memory Timeline', view: 'timeline' as View },
    { icon: Network, label: 'Mind Graph', view: 'graph' as View },
    { icon: BarChart2, label: 'Analytics', view: 'analytics' as View },
    { icon: Kanban, label: 'Workspace', view: 'workspace' as View },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--text-1)', overflow: 'hidden', fontFamily: "'Poppins', system-ui, sans-serif", padding: 8, gap: 8 }}>

      {/* Desktop Sidebar */}
      <div style={{ position: 'relative', zIndex: 50, flexShrink: 0, borderRadius: 14, border: '1px solid var(--border)', boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)', height: '100%', width: isCollapsed ? 60 : 220, minWidth: isCollapsed ? 60 : 220, transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }} className="hidden lg:block">
        <Sidebar currentView={view} setView={setView} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} user={user} onSignOut={handleSignOut} />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)', zIndex: 60 }}
              className="lg:hidden" />
            <motion.div initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              style={{ position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 70, width: 220 }}
              className="lg:hidden">
              <Sidebar currentView={view} setView={(v) => { setView(v); setIsMobileMenuOpen(false); }} isCollapsed={false} setIsCollapsed={() => {}} user={user} onSignOut={handleSignOut} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
        {/* Header */}
        <header style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 16px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, gap: 10, borderRadius: '14px 14px 0 0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden"
              style={{ padding: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-2)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <Menu size={16} />
            </button>
            <div className="header-search" style={{ position: 'relative', flex: 1, maxWidth: 440 }}>
              <Search size={13} color="var(--text-3)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input readOnly onFocus={() => setShowCommandPalette(true)}
                placeholder="Search memories, tasks... (⌘K)"
                style={{ width: '100%', paddingLeft: 34, paddingRight: 14, paddingTop: 8, paddingBottom: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-3)', fontSize: 13, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            {/* Theme Toggle */}
            <button onClick={toggleTheme} className="theme-toggle" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 20 }}>
              <Cpu size={11} color="var(--primary)" />
              <span style={{ color: 'var(--primary)', fontSize: 11, fontWeight: 600 }} className="hidden sm:inline">Neural AI</span>
            </div>
            <button onClick={() => setView('capture')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)', fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
            >
              <Plus size={14} /> <span className="hidden sm:inline">Capture</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg)', minHeight: 0 }} className="scroll-custom responsive-content">
          <div style={{ maxWidth: 1280, margin: '0 auto', minWidth: 0 }}>
            <AnimatePresence mode="wait">
              <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                {view === 'dashboard' && <Dashboard setView={setView} />}
                {view === 'agent' && <AgentHubView setView={setView} />}
                {view === 'capture' && <CaptureView />}
                {view === 'vault' && <VaultView setView={setView} />}
                {view === 'recall' && <RecallView />}
                {view === 'tasks' && <TasksModule />}
                {view === 'flashcards' && <FlashcardsView />}
                {view === 'calendar' && <CalendarModule />}
                {view === 'settings' && <SettingsView />}
                {view === 'timeline' && <MemoryTimelineView setView={setView} />}
                {view === 'graph' && <KnowledgeGraphView />}
                {view === 'analytics' && <AnalyticsView />}
                {view === 'workspace' && <WorkspaceView setView={setView} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Command Palette */}
      <AnimatePresence>
        {showCommandPalette && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '14vh 16px 16px' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowCommandPalette(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: -16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -16 }}
              style={{ position: 'relative', width: '100%', maxWidth: 540, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Search size={15} color="var(--primary)" />
                <input autoFocus type="text" placeholder="Type a command or navigate..."
                  style={{ flex: 1, background: 'none', border: 'none', color: 'var(--text-1)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
                <div style={{ padding: '3px 8px', background: 'var(--surface-3)', borderRadius: 6, color: 'var(--text-3)', fontSize: 10, fontWeight: 700 }}>ESC</div>
              </div>
              <div style={{ padding: '6px', maxHeight: '55vh', overflowY: 'auto' }} className="scroll-custom">
                <div style={{ padding: '8px 10px 4px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700 }}>Quick Navigation</div>
                {commands.map((item) => (
                  <button key={item.label} onClick={() => { setView(item.view); setShowCommandPalette(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.12s', fontFamily: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={14} color="var(--primary)" />
                    </div>
                    <span style={{ color: 'var(--text-1)', fontSize: 13 }}>{item.label}</span>
                  </button>
                ))}
              </div>
              <div style={{ padding: '10px 16px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-3)', fontSize: 10 }}>↑↓ Navigate · Enter to select · Esc to close</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Brain size={11} color="var(--primary)" />
                  <span style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '1px', textTransform: 'uppercase' }}>Recall X247</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
