import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate
} from 'react-router-dom';
import {
  Brain, Search, CheckSquare, Calendar as CalendarIcon, LayoutDashboard, Plus,
  Database, Bot, Network, GitBranch, BarChart2, FlipHorizontal,
  Settings, ChevronLeft, ChevronDown, ChevronRight, LogOut, Menu, Moon, Sun, Cpu, Presentation,
  CheckCircle2, AlertTriangle, Info, X, StickyNote, Globe, Zap, HelpCircle,
  Plug, Bookmark, Flame, GraduationCap, Compass, Bell, Kanban, Pin,
  Library, Target
} from 'lucide-react';
import OnboardingTour from './components/OnboardingTour';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  signInWithGoogle,
  signUpWithEmail,
  signInWithEmail,
  resetPassword,
  checkRedirectResult,
  signOut as firebaseSignOut,
} from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import Landing from './pages/Landing';
import Login from './pages/Login';
import DashboardPage from './pages/DashboardPage';
import AgentPage from './pages/AgentPage';
import CapturePage from './pages/CapturePage';
import VaultPage from './pages/VaultPage';
import RecallPage from './pages/RecallPage';
import TasksPage from './pages/TasksPage';
import FlashcardsPage from './pages/FlashcardsPage';
import CalendarPage from './pages/CalendarPage';
import SettingsPage from './pages/SettingsPage';
import TimelinePage from './pages/TimelinePage';
import GraphPage from './pages/GraphPage';
import AnalyticsPage from './pages/AnalyticsPage';
import WorkspacePage from './pages/WorkspacePage';
import MemoryDetailPage from './pages/MemoryDetailPage';
import DeckPage from './pages/DeckPage';
import ProfilePage from './pages/ProfilePage';
import IntegrationsPage from './pages/IntegrationsPage';
import NotesPage from './pages/NotesPage';
import BookmarksPage from './pages/BookmarksPage';
import HabitsPage from './pages/HabitsPage';
import RevisitsPage from './pages/RevisitsPage';
import SharePage from './pages/SharePage';
import StudyPlanPage from './pages/StudyPlanPage';
import DiscoverPage from './pages/DiscoverPage';
import LibraryPage from './pages/LibraryPage';
import FocusPage from './pages/FocusPage';
import LearnPage from './pages/LearnPage';
import InsightsPage from './pages/InsightsPage';
import './pages/pages.css';

// ── Pinned essentials — the 4 daily-driver pages, always visible at the top ──
const PINNED_NAV = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Your daily overview',         path: '/dashboard', icon: LayoutDashboard, color: '#3b82f6' },
  { id: 'library',   label: 'Library',   desc: 'Vault, notes, files & inbox', path: '/library',   icon: Library,         color: '#f472b6' },
  { id: 'recall',    label: 'Recall AI', desc: 'Ask & get answers',           path: '/recall',    icon: Bot,             color: '#00d4ff' },
  { id: 'agent',     label: 'Agent Hub', desc: 'Multi-agent workflows',       path: '/agent',     icon: Cpu,             color: '#a78bfa' },
];

// ── Collapsible groups — secondary features, organized by intent ───────────
const NAV_GROUPS = [
  {
    id: 'workspace',
    label: 'Workspace',
    icon: Kanban,
    items: [
      { id: 'workspace', label: 'Projects', path: '/workspace', icon: Kanban,       color: '#f59e0b' },
      { id: 'focus',     label: 'Focus',    path: '/focus',     icon: Target,       color: '#10b981' },
      { id: 'calendar',  label: 'Calendar', path: '/calendar',  icon: CalendarIcon, color: '#818cf8' },
    ]
  },
];

// ── Flat nav — top-level destinations rendered between groups and footer ───
const FLAT_NAV = [
  { id: 'learn',    label: 'Learn',    path: '/learn',    icon: GraduationCap, color: '#7c3aed' },
  { id: 'discover', label: 'Discover', path: '/discover', icon: Compass,       color: '#06b6d4' },
  { id: 'insights', label: 'Insights', path: '/insights', icon: BarChart2,     color: '#10b981' },
];

// ── Footer — system/admin pages, demoted to small icons at the bottom ──────
const FOOTER_NAV = [
  { id: 'integrations', label: 'Integrations', path: '/integrations', icon: Plug,     color: '#22d3ee' },
  { id: 'settings',     label: 'Settings',     path: '/settings',     icon: Settings, color: '#6b7280' },
];

const NAV_OPEN_KEY = 'recall-x247-nav-open-v1';

const loadOpenGroups = (): Record<string, boolean> => {
  try {
    const raw = localStorage.getItem(NAV_OPEN_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // First-time defaults: only "Workspace" is open. Keeps initial nav clean.
  return { workspace: true };
};

const Sidebar = ({
  isCollapsed, setIsCollapsed, user, onSignOut,
}: {
  isCollapsed: boolean; setIsCollapsed: (v: boolean) => void;
  user: any; onSignOut: () => void;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = useRef<HTMLElement>(null);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(loadOpenGroups);

  const toggleGroup = (id: string) => {
    setOpenGroups(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(NAV_OPEN_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

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
  }, [checkScroll, isCollapsed, openGroups]);

  // If a group contains the active route, auto-expand it (so the user sees where they are)
  useEffect(() => {
    const groupForActive = NAV_GROUPS.find(g => g.items.some(i => i.path === location.pathname));
    if (groupForActive && !openGroups[groupForActive.id]) {
      setOpenGroups(prev => ({ ...prev, [groupForActive.id]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const isActive = (path: string) =>
    location.pathname === path || (path === '/dashboard' && location.pathname === '/');

  return (
    <div style={{ width: '100%', minWidth: 0, height: '100%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Logo + collapse toggle */}
      <div style={{ padding: isCollapsed ? '12px 0' : '14px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', flexShrink: 0, minHeight: 56 }}>
        {isCollapsed ? (
          <button onClick={() => setIsCollapsed(false)} title="Expand sidebar"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 7, color: 'var(--text-3)', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}>
            <ChevronLeft size={15} style={{ transform: 'rotate(180deg)' }} />
          </button>
        ) : (
          <>
            <img src="/x247-logo.png" alt="x247 AI" className="x247-logo-img" draggable={false} style={{ height: 22, width: 'auto' }} />
            <button onClick={() => setIsCollapsed(true)} title="Collapse sidebar"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 7, color: 'var(--text-3)', transition: 'all 0.15s', flexShrink: 0 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}>
              <ChevronLeft size={15} />
            </button>
          </>
        )}
      </div>

      {/* Status pill */}
      {!isCollapsed && (
        <div style={{ margin: '10px 12px 4px', padding: '5px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0, boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
          <span style={{ color: '#10b981', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.2px' }}>System Ready</span>
        </div>
      )}
      {isCollapsed && (
        <div style={{ margin: '8px auto 0', width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.5)', flexShrink: 0 }} />
      )}

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <nav ref={navRef} style={{ flex: 1, padding: '8px', overflowY: 'auto', overflowX: 'hidden' }} className="sidebar-nav">

          {/* ── PINNED ESSENTIALS — always visible, prominent ───────────────── */}
          {!isCollapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px 6px', color: 'var(--text-3)', fontSize: 9, letterSpacing: '1.6px', textTransform: 'uppercase', fontWeight: 700 }}>
              <Pin size={9} /> Essentials
            </div>
          )}
          {isCollapsed && <div style={{ height: 4 }} />}
          {PINNED_NAV.map(({ id, label, desc, path, icon: Icon, color }) => {
            const active = isActive(path);
            return (
              <button key={id} onClick={() => navigate(path)} title={isCollapsed ? `${label} — ${desc}` : desc}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: isCollapsed ? '10px 0' : '8px 10px',
                  borderRadius: 10, border: 'none',
                  background: active ? `${color}15` : 'transparent',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                  position: 'relative', justifyContent: isCollapsed ? 'center' : 'flex-start',
                  flexShrink: 0, width: '100%', marginBottom: 2,
                }}
                onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; } }}
                onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; } }}>
                {active && <div style={{ position: 'absolute', left: 0, top: '18%', bottom: '18%', width: 3, background: color, borderRadius: '0 3px 3px 0' }} />}
                <div style={{
                  width: isCollapsed ? 26 : 28, height: isCollapsed ? 26 : 28, borderRadius: 8,
                  background: active ? color : `${color}18`,
                  border: active ? 'none' : `1px solid ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  transition: 'all 0.15s',
                }}>
                  <Icon size={14} color={active ? '#fff' : color} strokeWidth={2.2} />
                </div>
                {!isCollapsed && (
                  <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                    <div style={{ color: active ? 'var(--text-1)' : 'var(--text-1)', fontSize: 13, fontWeight: active ? 700 : 600, lineHeight: 1.15, letterSpacing: '-0.1px' }}>{label}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 10.5, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{desc}</div>
                  </div>
                )}
              </button>
            );
          })}

          {/* ── COLLAPSIBLE GROUPS — secondary features ──────────────────────── */}
          {NAV_GROUPS.map(group => {
            const GroupIcon = group.icon;
            const open = !!openGroups[group.id];
            const containsActive = group.items.some(i => isActive(i.path));
            return (
              <div key={group.id} style={{ marginTop: 10 }}>
                {!isCollapsed ? (
                  <button onClick={() => toggleGroup(group.id)}
                    aria-expanded={open}
                    aria-controls={`nav-group-${group.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '6px 8px', borderRadius: 7, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      color: 'var(--text-3)', fontSize: 9.5, letterSpacing: '1.5px',
                      textTransform: 'uppercase', fontWeight: 700, fontFamily: 'inherit',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                    <GroupIcon size={11} color={containsActive ? 'var(--primary)' : 'var(--text-3)'} />
                    <span style={{ flex: 1, textAlign: 'left', color: containsActive ? 'var(--text-2)' : 'var(--text-3)' }}>{group.label}</span>
                    {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  </button>
                ) : (
                  <div style={{ height: 8, borderTop: '1px solid var(--border)', margin: '6px 8px 4px' }} />
                )}
                <AnimatePresence initial={false}>
                  {(open || isCollapsed) && (
                    <motion.div
                      id={`nav-group-${group.id}`}
                      initial={isCollapsed ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{ overflow: 'hidden' }}>
                      {group.items.map(({ id, label, path, icon: Icon, color }) => {
                        const active = isActive(path);
                        return (
                          <button key={id} onClick={() => navigate(path)} title={isCollapsed ? label : undefined}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 9,
                              padding: isCollapsed ? '8px 0' : '6.5px 10px 6.5px 14px',
                              borderRadius: 8, border: 'none',
                              background: active ? 'var(--primary-bg)' : 'transparent',
                              cursor: 'pointer', transition: 'all 0.15s ease',
                              position: 'relative', justifyContent: isCollapsed ? 'center' : 'flex-start',
                              flexShrink: 0, width: '100%', marginBottom: 1,
                            }}
                            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                            {active && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: 'var(--primary)', borderRadius: '0 3px 3px 0' }} />}
                            <Icon size={13} color={active ? 'var(--primary)' : color} style={{ opacity: active ? 1 : 0.85, flexShrink: 0 }} />
                            {!isCollapsed && <span style={{ color: active ? 'var(--primary)' : 'var(--text-2)', fontSize: 12.5, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', letterSpacing: '-0.1px' }}>{label}</span>}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* ── FLAT NAV — top-level destinations ──────────────────────────── */}
          <div style={{ marginTop: 10 }}>
            {FLAT_NAV.map(({ id, label, path, icon: Icon, color }) => {
              const active = isActive(path);
              return (
                <button key={id} onClick={() => navigate(path)} title={isCollapsed ? label : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: isCollapsed ? '8px 0' : '7px 10px',
                    borderRadius: 9, border: 'none',
                    background: active ? `${color}15` : 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                    position: 'relative', justifyContent: isCollapsed ? 'center' : 'flex-start',
                    flexShrink: 0, width: '100%', marginBottom: 2,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                  {active && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: color, borderRadius: '0 3px 3px 0' }} />}
                  <Icon size={14} color={active ? color : color} style={{ opacity: active ? 1 : 0.85, flexShrink: 0 }} />
                  {!isCollapsed && <span style={{ color: active ? 'var(--text-1)' : 'var(--text-2)', fontSize: 12.5, fontWeight: active ? 700 : 500, whiteSpace: 'nowrap', letterSpacing: '-0.1px' }}>{label}</span>}
                </button>
              );
            })}
          </div>

          {/* ── FOOTER ICONS — system pages, demoted ─────────────────────────── */}
          {!isCollapsed && (
            <div style={{ marginTop: 14, padding: '8px 8px 4px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-around', gap: 4 }}>
              {FOOTER_NAV.map(({ id, label, path, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <button key={id} onClick={() => navigate(path)} title={label}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      padding: '7px 4px', background: active ? 'var(--primary-bg)' : 'transparent',
                      border: 'none', borderRadius: 8, cursor: 'pointer',
                      transition: 'all 0.15s', color: active ? 'var(--primary)' : 'var(--text-3)',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; } }}
                    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; } }}>
                    <Icon size={13} />
                    <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.2px' }}>{label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          )}
          {isCollapsed && (
            <div style={{ marginTop: 10, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
              {FOOTER_NAV.map(({ id, label, path, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <button key={id} onClick={() => navigate(path)} title={label}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '8px 0', background: active ? 'var(--primary-bg)' : 'transparent',
                      border: 'none', borderRadius: 8, cursor: 'pointer',
                      transition: 'all 0.15s', color: active ? 'var(--primary)' : 'var(--text-3)', marginBottom: 2,
                    }}
                    onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)'; } }}
                    onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; } }}>
                    <Icon size={13} />
                  </button>
                );
              })}
            </div>
          )}
        </nav>
        {!isCollapsed && canScrollDown && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 24, background: 'linear-gradient(to bottom, transparent, var(--surface))', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 2, pointerEvents: 'none' }}>
            <ChevronDown size={11} color="var(--text-3)" style={{ opacity: 0.45 }} />
          </div>
        )}
      </div>

      {/* Profile footer */}
      <div style={{ padding: isCollapsed ? '8px 6px 10px' : '8px 10px 10px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div onClick={() => navigate('/profile')} title="Open profile" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isCollapsed ? '5px' : '6px 8px', borderRadius: 9, background: 'var(--surface-2)', border: '1px solid var(--border)', justifyContent: isCollapsed ? 'center' : 'flex-start', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary-border)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; }}>
          {user?.photoURL
            ? <img src={user.photoURL} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: '2px solid var(--primary-border)' }} />
            : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#2563eb,#1e3a8a)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: 11, fontWeight: 700, letterSpacing: '-0.3px' }}>
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
            <button onClick={e => { e.stopPropagation(); onSignOut(); }} title="Sign out"
              style={{ padding: 5, background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0, display: 'flex', alignItems: 'center', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}>
              <LogOut size={13} />
            </button>
          )}
        </div>
        {isCollapsed && (
          <button onClick={onSignOut} title="Sign out"
            style={{ width: '100%', marginTop: 6, padding: '5px', background: 'transparent', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-3)'; }}>
            <LogOut size={13} />
          </button>
        )}
      </div>
    </div>
  );
};

const ALL_NAV = [
  ...PINNED_NAV.map(p => ({ ...p, color: p.color })),
  ...NAV_GROUPS.flatMap(g => g.items),
  ...FLAT_NAV,
  ...FOOTER_NAV,
];

// Deep links into merged hub tabs/views — surfaced in the command palette
// so users can jump straight to a sub-page (Library → Notes, Insights → Graph, etc.)
const HUB_DEEP_LINKS = [
  { id: 'library:vault',     label: 'Library · Vault',      path: '/library?tab=vault',       icon: Database,        color: '#f472b6' },
  { id: 'library:notes',     label: 'Library · Notes',      path: '/library?tab=notes',       icon: StickyNote,      color: '#f59e0b' },
  { id: 'library:bookmarks', label: 'Library · Bookmarks',  path: '/library?tab=bookmarks',   icon: Bookmark,        color: '#ec4899' },
  { id: 'library:files',     label: 'Library · Files',      path: '/library?tab=files',       icon: FlipHorizontal,  color: '#f472b6' },
  { id: 'library:inbox',     label: 'Library · Inbox',      path: '/library?tab=inbox',       icon: Plus,            color: '#06b6d4' },
  { id: 'library:tasks',     label: 'Library · Tasks',      path: '/library?tab=tasks',       icon: CheckSquare,     color: '#10b981' },
  { id: 'library:habits',    label: 'Library · Habits',     path: '/library?tab=habits',      icon: Flame,           color: '#f59e0b' },
  { id: 'library:flashcards',label: 'Library · Flashcards', path: '/library?tab=flashcards',  icon: FlipHorizontal,  color: '#06b6d4' },
  { id: 'library:revisits',  label: 'Library · Revisits',   path: '/library?tab=revisits',    icon: Bell,            color: '#f59e0b' },
  { id: 'learn:plan',        label: 'Learn · Study Plan',   path: '/learn?tab=plan',          icon: GraduationCap,   color: '#7c3aed' },
  { id: 'learn:flashcards',  label: 'Learn · Flashcards',   path: '/learn?tab=flashcards',    icon: FlipHorizontal,  color: '#06b6d4' },
  { id: 'learn:revisits',    label: 'Learn · Revisits',     path: '/learn?tab=revisits',      icon: Bell,            color: '#f59e0b' },
  { id: 'insights:timeline', label: 'Insights · Timeline',  path: '/insights?view=timeline',  icon: GitBranch,       color: '#818cf8' },
  { id: 'insights:graph',    label: 'Insights · Mind Graph',path: '/insights?view=graph',     icon: Network,         color: '#06b6d4' },
  { id: 'insights:analytics',label: 'Insights · Analytics', path: '/insights?view=analytics', icon: BarChart2,       color: '#10b981' },
  { id: 'settings:deck',     label: 'Settings · Pitch Deck',path: '/deck',                    icon: Presentation,    color: '#22d3ee' },
];

/* ─────────────────────────────────────────────
   GLOBAL TOAST SYSTEM
   Any page can trigger: window.dispatchEvent(new CustomEvent('recall-toast', { detail: { msg, type } }))
────────────────────────────────────────────── */
type ToastType = 'success' | 'error' | 'info';
interface ToastItem { id: number; msg: string; type: ToastType; }

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={15} />,
  error:   <AlertTriangle size={15} />,
  info:    <Info size={15} />,
};
const TOAST_COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: 'linear-gradient(135deg,#10b981,#059669)', border: 'rgba(16,185,129,0.4)', text: '#fff' },
  error:   { bg: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'rgba(239,68,68,0.4)',  text: '#fff' },
  info:    { bg: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: 'rgba(37,99,235,0.4)', text: '#fff' },
};

const GlobalToast = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  useEffect(() => {
    const handler = (e: Event) => {
      const { msg, type = 'success' } = (e as CustomEvent).detail ?? {};
      if (!msg) return;
      const id = ++counterRef.current;
      setToasts(prev => [...prev, { id, msg, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3800);
    };
    window.addEventListener('recall-toast', handler);
    return () => window.removeEventListener('recall-toast', handler);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 22, right: 22, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      <AnimatePresence>
        {toasts.map(t => {
          const c = TOAST_COLORS[t.type];
          return (
            <motion.div key={t.id} initial={{ opacity: 0, x: 60, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 60, scale: 0.9 }}
              style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: '11px 18px', display: 'flex', alignItems: 'center', gap: 9, color: c.text, fontSize: 13, fontWeight: 600, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)', fontFamily: "'Poppins', sans-serif", pointerEvents: 'all', minWidth: 220, maxWidth: 340 }}>
              {TOAST_ICONS[t.type]}
              <span style={{ flex: 1 }}>{t.msg}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export const showToast = (msg: string, type: ToastType = 'success') => {
  window.dispatchEvent(new CustomEvent('recall-toast', { detail: { msg, type } }));
};

/* ─────────────────────────────────────────────
   QUICK CAPTURE FAB
────────────────────────────────────────────── */
const QuickCaptureFAB = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Hide FAB on the Capture page itself (you're already there) and on Pitch Deck
  const hideFab = location.pathname.startsWith('/capture') || location.pathname.startsWith('/deck');

  const saveNote = async () => {
    if (!note.trim() || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_type: 'note', url: '', content: note, preview: false })
      });
      if (res.ok) {
        showToast('Note saved to Vault!');
        setNote(''); setShowNote(false); setOpen(false);
      } else {
        showToast('Failed to save note', 'error');
      }
    } catch { showToast('Failed to save note', 'error'); }
    finally { setSaving(false); }
  };

  const ACTIONS = [
    { icon: Globe, label: 'Capture URL', color: '#00d4ff', action: () => { navigate('/capture'); setOpen(false); } },
    { icon: StickyNote, label: 'Quick Note', color: '#06b6d4', action: () => { setShowNote(true); setOpen(false); } },
    { icon: Bot, label: 'Agent Hub', color: '#3b82f6', action: () => { navigate('/agent'); setOpen(false); } },
  ];

  if (hideFab) return null;

  return (
    <>
      {/* Quick Note Modal */}
      <AnimatePresence>
        {showNote && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: '0 24px 88px' }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNote(false)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,15,0.5)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ opacity: 0, y: 16, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.95 }}
              style={{ position: 'relative', width: 340, background: 'var(--surface)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: '18px 20px', boxShadow: '0 16px 48px rgba(0,0,0,0.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <StickyNote size={15} color="#f59e0b" />
                <span style={{ color: '#06b6d4', fontSize: 12, fontWeight: 700 }}>Quick Note</span>
                <button onClick={() => setShowNote(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}><X size={14} /></button>
              </div>
              <textarea value={note} onChange={e => setNote(e.target.value)} autoFocus
                placeholder="Capture an idea, thought, or insight..."
                rows={4}
                style={{ width: '100%', padding: '10px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', lineHeight: 1.55 }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote(); }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <span style={{ color: 'var(--text-3)', fontSize: 10 }}>⌘↵ to save</span>
                <button onClick={saveNote} disabled={!note.trim() || saving}
                  style={{ padding: '7px 16px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: note.trim() ? 'pointer' : 'default', fontFamily: 'inherit', opacity: note.trim() ? 1 : 0.5 }}>
                  {saving ? 'Saving…' : 'Save to Vault'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FAB actions */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 8000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
        <AnimatePresence>
          {open && ACTIONS.map((a, i) => (
            <motion.button key={a.label}
              initial={{ opacity: 0, y: 12, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: 0.8 }}
              transition={{ delay: i * 0.05 }}
              onClick={a.action}
              title={a.label}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 14px 8px 10px', background: 'var(--surface)', border: `1px solid ${a.color}35`, borderRadius: 22, boxShadow: `0 6px 18px rgba(0,0,0,0.4), 0 0 0 1px ${a.color}15`, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-1)', fontSize: 12, fontWeight: 600 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${a.color}18`, border: `1px solid ${a.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <a.icon size={14} color={a.color} />
              </div>
              {a.label}
            </motion.button>
          ))}
        </AnimatePresence>

        {/* Main FAB button */}
        <motion.button
          onClick={() => setOpen(o => !o)}
          whileTap={{ scale: 0.93 }}
          style={{ width: 52, height: 52, borderRadius: '50%', background: open ? 'var(--surface-2)' : 'linear-gradient(135deg,#2563eb,#06b6d4)', border: open ? '1px solid var(--border)' : '1px solid rgba(37,99,235,0.4)', boxShadow: open ? 'none' : '0 8px 24px rgba(37,99,235,0.5), 0 0 0 1px rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.25s' }}>
          <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus size={22} color={open ? 'var(--text-2)' : '#fff'} />
          </motion.div>
        </motion.button>
      </div>
    </>
  );
};

const AppShell = ({ user, onSignOut, isDark, toggleTheme }: { user: any; onSignOut: () => void; isDark: boolean; toggleTheme: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCommandPalette(true); }
      if (e.key === 'Escape') setShowCommandPalette(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!user) return;
    try {
      if (!localStorage.getItem('recall-x247-onboarded')) {
        const t = setTimeout(() => setShowTour(true), 350);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [user?.uid]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--text-1)', overflow: 'hidden', fontFamily: "'Poppins', system-ui, sans-serif", padding: '8px 12px', gap: 8 }}>

      {/* Desktop Sidebar */}
      <div style={{ position: 'relative', zIndex: 50, flexShrink: 0, borderRadius: 14, border: '1px solid var(--border)', boxShadow: isDark ? '0 2px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)' : '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.88)', height: '100%', width: isCollapsed ? 60 : 220, minWidth: isCollapsed ? 60 : 220, transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }} className="desktop-sidebar">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} user={user} onSignOut={onSignOut} />
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', backdropFilter: 'blur(2px)', zIndex: 60 }} />
            <motion.div initial={{ x: -240 }} animate={{ x: 0 }} exit={{ x: -240 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              style={{ position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 70, width: 220 }}>
              <Sidebar isCollapsed={false} setIsCollapsed={() => {}} user={user} onSignOut={() => { onSignOut(); setIsMobileMenuOpen(false); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: isDark ? '0 2px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)' : '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.88)' }}>
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 14px', height: 46, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 8, borderRadius: '14px 14px 0 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <button onClick={() => setIsMobileMenuOpen(true)} className="mobile-only"
              style={{ padding: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-2)', alignItems: 'center', flexShrink: 0 }}>
              <Menu size={15} />
            </button>
            <div className="header-search" style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
              <Search size={12} color="var(--text-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input readOnly onFocus={() => setShowCommandPalette(true)}
                placeholder="Search memories, tasks... (⌘K)"
                style={{ width: '100%', paddingLeft: 30, paddingRight: 12, paddingTop: 6, paddingBottom: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-3)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button onClick={() => setShowTour(true)} className="theme-toggle" title="Take the tour">
              <HelpCircle size={14} />
            </button>
            <button onClick={toggleTheme} className="theme-toggle" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            <button onClick={() => navigate('/capture')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', border: '1px solid rgba(37,99,235,0.4)', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.15)', fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(37,99,235,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.transform = ''; }}>
              <Plus size={13} /> <span className="desktop-text">Capture</span>
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg)', minHeight: 0 }} className="scroll-custom responsive-content">
          <div style={{ maxWidth: 1280, margin: '0 auto', minWidth: 0 }}>
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage isDark={isDark} user={user} />} />
                  <Route path="/agent" element={<AgentPage />} />
                  <Route path="/recall" element={<RecallPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/workspace" element={<WorkspacePage />} />
                  <Route path="/memory/:id" element={<MemoryDetailPage />} />
                  <Route path="/deck" element={<DeckPage />} />
                  <Route path="/profile" element={<ProfilePage user={user} onSignOut={onSignOut} />} />
                  <Route path="/integrations" element={<IntegrationsPage />} />
                  <Route path="/discover" element={<DiscoverPage />} />

                  {/* Merged hub pages */}
                  <Route path="/library"  element={<LibraryPage />} />
                  <Route path="/focus"    element={<FocusPage />} />
                  <Route path="/learn"    element={<LearnPage />} />
                  <Route path="/insights" element={<InsightsPage />} />

                  {/* Backwards-compatible redirects to the merged hubs */}
                  <Route path="/capture"    element={<Navigate to="/library?tab=inbox"     replace />} />
                  <Route path="/vault"      element={<Navigate to="/library?tab=vault"      replace />} />
                  <Route path="/notes"      element={<Navigate to="/library?tab=notes"      replace />} />
                  <Route path="/bookmarks"  element={<Navigate to="/library?tab=bookmarks"  replace />} />
                  <Route path="/tasks"      element={<Navigate to="/focus"                  replace />} />
                  <Route path="/habits"     element={<Navigate to="/focus"                  replace />} />
                  <Route path="/plan"       element={<Navigate to="/learn?tab=plan"         replace />} />
                  <Route path="/flashcards" element={<Navigate to="/learn?tab=flashcards"   replace />} />
                  <Route path="/revisits"   element={<Navigate to="/learn?tab=revisits"     replace />} />
                  <Route path="/timeline"   element={<Navigate to="/insights?view=timeline" replace />} />
                  <Route path="/graph"      element={<Navigate to="/insights?view=graph"    replace />} />
                  <Route path="/analytics"  element={<Navigate to="/insights?view=analytics" replace />} />

                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Global Toast + FAB */}
      <GlobalToast />
      <QuickCaptureFAB />

      {/* Onboarding Tour */}
      <OnboardingTour open={showTour} onClose={() => setShowTour(false)} />

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
                {ALL_NAV.map((item) => (
                  <button key={item.id} onClick={() => { navigate(item.path); setShowCommandPalette(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.12s', fontFamily: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={14} color="var(--primary)" />
                    </div>
                    <span style={{ color: 'var(--text-1)', fontSize: 13 }}>{item.label}</span>
                  </button>
                ))}
                <div style={{ padding: '12px 10px 4px', color: 'var(--text-3)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 700 }}>Jump to</div>
                {HUB_DEEP_LINKS.map((item) => (
                  <button key={item.id} onClick={() => { navigate(item.path); setShowCommandPalette(false); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.12s', fontFamily: 'inherit' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${item.color}15`, border: `1px solid ${item.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <item.icon size={14} color={item.color} />
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
};

const GUEST_USER_KEY = 'recall-guest-user';

function AppRouter() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('recall-theme-v2') as 'light' | 'dark') || 'light'
  );
  const navigate = useNavigate();

  useEffect(() => {
    checkRedirectResult().catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        try {
          const guestData = localStorage.getItem(GUEST_USER_KEY);
          setUser(guestData ? JSON.parse(guestData) : null);
        } catch { setUser(null); }
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('recall-theme-v2', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Hide splash only after auth is resolved AND the page has painted
  useEffect(() => {
    if (authLoading || !isReady) return;
    // Wait for the browser to paint the actual page content
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (typeof (window as any).hideSplash === 'function') {
          (window as any).hideSplash();
        }
      });
    });
  }, [authLoading, isReady]);

  const handleGuestSignIn = async () => {
    const guestUser = { uid: `guest-${Date.now()}`, displayName: 'Guest User', email: 'guest@recall-x247.local', photoURL: null, isAnonymous: true, isGuest: true };
    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(guestUser));
    setUser(guestUser);
    navigate('/dashboard', { replace: true });
  };

  const handleSignOut = async () => {
    localStorage.removeItem(GUEST_USER_KEY);
    // Clear per-user transient state so the next user starts fresh
    try {
      localStorage.removeItem('agent-hub-current-chat-v1');
      localStorage.removeItem('agent-hub-current-session-id-v1');
      localStorage.removeItem('agent-hub-sessions-v1');
    } catch {}
    try { await firebaseSignOut(); } catch {}
    setUser(null);
    navigate('/', { replace: true });
  };

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const isDark = theme === 'dark';

  // Public share view — accessible without auth, before all other gating
  const isSharePath = window.location.pathname.startsWith('/share/');
  if (isSharePath) {
    return (
      <Routes>
        <Route path="/share/:token" element={<SharePage />} />
      </Routes>
    );
  }

  if (authLoading || !isReady) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#03080f' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <img src="/x247-logo.png" alt="x247 AI" style={{ width: 'clamp(120px,15vw,180px)', height: 'auto', userSelect: 'none' }} draggable={false} />
          <div style={{ display: 'flex', gap: 6 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.42)', animation: `bounce 1.1s ease-in-out ${i*0.15}s infinite` }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />} />
        <Route path="/login" element={
          <Login
            navigate={navigate}
            initialMode={window.location.search.includes('mode=signup') ? 'sign-up' : 'sign-in'}
            onGoogleSignIn={signInWithGoogle}
            onEmailSignIn={signInWithEmail}
            onEmailSignUp={signUpWithEmail}
            onResetPassword={resetPassword}
            onAnonymousSignIn={handleGuestSignIn}
          />
        } />
        <Route path="/auth" element={<Navigate to="/login" replace />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/signup" element={<Navigate to="/login?mode=signup" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return <AppShell user={user} onSignOut={handleSignOut} isDark={isDark} toggleTheme={toggleTheme} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
