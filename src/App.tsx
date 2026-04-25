import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate
} from 'react-router-dom';
import {
  Brain, Search, CheckSquare, Calendar as CalendarIcon, LayoutDashboard, Plus,
  Database, Bot, Network, GitBranch, BarChart2, Kanban, FlipHorizontal,
  Settings, ChevronLeft, ChevronDown, LogOut, Menu, Moon, Sun, Cpu
} from 'lucide-react';
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
import './pages/pages.css';

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { id: 'dashboard',  label: 'Dashboard',    path: '/dashboard', icon: LayoutDashboard, color: '#00d4ff' },
      { id: 'agent',      label: 'Agent Hub',    path: '/agent',     icon: Cpu,             color: '#a78bfa' },
      { id: 'capture',    label: 'Capture',      path: '/capture',   icon: Plus,            color: '#8b5cf6' },
      { id: 'vault',      label: 'Vault',        path: '/vault',     icon: Database,        color: '#f472b6' },
      { id: 'recall',     label: 'Neural Recall', path: '/recall',   icon: Bot,             color: '#00d4ff' },
    ]
  },
  {
    label: 'Explore',
    items: [
      { id: 'timeline',   label: 'Timeline',     path: '/timeline',  icon: GitBranch,  color: '#f472b6' },
      { id: 'graph',      label: 'Mind Graph',   path: '/graph',     icon: Network,    color: '#8b5cf6' },
      { id: 'analytics',  label: 'Analytics',    path: '/analytics', icon: BarChart2,  color: '#10b981' },
      { id: 'workspace',  label: 'Workspace',    path: '/workspace', icon: Kanban,     color: '#f59e0b' },
    ]
  },
  {
    label: 'Learn',
    items: [
      { id: 'tasks',      label: 'Tasks',       path: '/tasks',      icon: CheckSquare,   color: '#10b981' },
      { id: 'flashcards', label: 'Flashcards',  path: '/flashcards', icon: FlipHorizontal, color: '#f59e0b' },
      { id: 'calendar',   label: 'Calendar',    path: '/calendar',   icon: CalendarIcon,  color: '#f472b6' },
    ]
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, color: '#6b7280' },
    ]
  },
];

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
    <div style={{ width: '100%', minWidth: 0, height: '100%', background: 'var(--surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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

      {!isCollapsed && (
        <div style={{ margin: '10px 12px 2px', padding: '5px 10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 7, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0, boxShadow: '0 0 6px rgba(16,185,129,0.5)' }} />
          <span style={{ color: '#10b981', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.2px' }}>System Ready</span>
        </div>
      )}
      {isCollapsed && (
        <div style={{ margin: '8px auto 0', width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.5)', flexShrink: 0 }} />
      )}

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <nav ref={navRef} style={{ flex: 1, padding: '6px 8px', overflowY: 'auto', overflowX: 'hidden' }} className="sidebar-nav">
          {NAV_GROUPS.map(group => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              {!isCollapsed && (
                <div style={{ padding: '10px 8px 4px', color: 'var(--text-3)', fontSize: 9, letterSpacing: '1.6px', textTransform: 'uppercase', fontWeight: 700 }}>{group.label}</div>
              )}
              {isCollapsed && <div style={{ height: 6 }} />}
              {group.items.map(({ id, label, path, icon: Icon, color }) => {
                const active = location.pathname === path || (path === '/dashboard' && location.pathname === '/');
                return (
                  <button key={id} onClick={() => navigate(path)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: isCollapsed ? '9px 0' : '7.5px 10px', borderRadius: 9, border: 'none', background: active ? 'var(--primary-bg)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s ease', position: 'relative', justifyContent: isCollapsed ? 'center' : 'flex-start', flexShrink: 0, width: '100%', marginBottom: 1 }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                    {active && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: 'var(--primary)', borderRadius: '0 3px 3px 0' }} />}
                    <Icon size={14} color={active ? 'var(--primary)' : 'var(--text-3)'} style={{ transition: 'color 0.15s', flexShrink: 0 }} />
                    {!isCollapsed && <span style={{ color: active ? 'var(--primary)' : 'var(--text-2)', fontSize: 13, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', letterSpacing: '-0.1px' }}>{label}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
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

const ALL_NAV = NAV_GROUPS.flatMap(g => g.items);

const AppShell = ({ user, onSignOut, isDark, toggleTheme }: { user: any; onSignOut: () => void; isDark: boolean; toggleTheme: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowCommandPalette(true); }
      if (e.key === 'Escape') setShowCommandPalette(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg)', color: 'var(--text-1)', overflow: 'hidden', fontFamily: "'Poppins', system-ui, sans-serif", padding: 8, gap: 8 }}>

      {/* Desktop Sidebar */}
      <div style={{ position: 'relative', zIndex: 50, flexShrink: 0, borderRadius: 14, border: '1px solid var(--border)', boxShadow: isDark ? '0 2px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)' : '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.88)', height: '100%', width: isCollapsed ? 60 : 220, minWidth: isCollapsed ? 60 : 220, transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)', overflow: 'hidden' }} className="hidden lg:block">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} user={user} onSignOut={onSignOut} />
      </div>

      {/* Mobile Sidebar */}
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
              <Sidebar isCollapsed={false} setIsCollapsed={() => {}} user={user} onSignOut={() => { onSignOut(); setIsMobileMenuOpen(false); }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', minWidth: 0, borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface)', boxShadow: isDark ? '0 2px 14px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)' : '0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.88)' }}>
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 16px', height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 10, borderRadius: '14px 14px 0 0' }}>
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
            <button onClick={toggleTheme} className="theme-toggle" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 20 }}>
              <Cpu size={11} color="var(--primary)" />
              <span style={{ color: 'var(--primary)', fontSize: 11, fontWeight: 600 }} className="hidden sm:inline">Neural AI</span>
            </div>
            <button onClick={() => navigate('/capture')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)', fontFamily: 'inherit', transition: 'all 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 14px rgba(99,102,241,0.45), inset 0 1px 0 rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'; (e.currentTarget as HTMLButtonElement).style.transform = ''; }}>
              <Plus size={14} /> <span className="hidden sm:inline">Capture</span>
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', background: 'var(--bg)', minHeight: 0 }} className="scroll-custom responsive-content">
          <div style={{ maxWidth: 1280, margin: '0 auto', minWidth: 0 }}>
            <AnimatePresence mode="wait">
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage isDark={isDark} />} />
                  <Route path="/agent" element={<AgentPage />} />
                  <Route path="/capture" element={<CapturePage />} />
                  <Route path="/vault" element={<VaultPage />} />
                  <Route path="/recall" element={<RecallPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/flashcards" element={<FlashcardsPage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/timeline" element={<TimelinePage />} />
                  <Route path="/graph" element={<GraphPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/workspace" element={<WorkspacePage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
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
    (localStorage.getItem('recall-theme') as 'light' | 'dark') || 'dark'
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
    localStorage.setItem('recall-theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleGuestSignIn = async () => {
    const guestUser = { uid: `guest-${Date.now()}`, displayName: 'Guest User', email: 'guest@recall-x247.local', photoURL: null, isAnonymous: true, isGuest: true };
    localStorage.setItem(GUEST_USER_KEY, JSON.stringify(guestUser));
    setUser(guestUser);
    navigate('/dashboard', { replace: true });
  };

  const handleSignOut = async () => {
    localStorage.removeItem(GUEST_USER_KEY);
    try { await firebaseSignOut(); } catch {}
    setUser(null);
    navigate('/', { replace: true });
  };

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const isDark = theme === 'dark';

  if (authLoading || !isReady) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07080c' }}>
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
