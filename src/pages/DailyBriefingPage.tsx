import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Sparkles, Volume2, Square, Pause, Play, RefreshCw, ListChecks, Clock,
  Calendar as CalendarIcon, BookOpen, History, Brain, ChevronRight, ExternalLink,
  CheckCircle2, Circle, Tag, Activity, TrendingUp, Hash, Bell, RotateCcw,
  Target, Sparkle, AlertTriangle, Zap, CheckSquare, ArrowUpRight
} from 'lucide-react';
import { showToast } from '../App';

type Stats = {
  total_memories?: number;
  pending_tasks?: number;
  due_revisits?: number;
};

type BriefingSections = {
  summary?: string;
  focus?: string;
  new?: string;
  revisit?: string;
  at_risk?: string;
};

type Revisit = {
  id: string;
  memory_id?: string;
  title: string;
  url?: string;
  next_due?: string;
  overdue_hours?: number;
  due_in_hours?: number | null;
};

type BriefingResponse = {
  briefing: string;
  executive_summary?: string;
  sections?: BriefingSections;
  stats?: Stats;
  revisits_due?: Revisit[];
  revisits_upcoming?: Revisit[];
  revisits_due_count?: number;
};

type ActionItem = {
  id: string;
  memory_id: string;
  memory_title: string;
  domain: string;
  text: string;
  completed: boolean;
  created_at: string;
};

type TimelineItem = {
  kind: 'task' | 'revisit' | 'event' | 'habit';
  id: string;
  title: string;
  subtitle: string;
  time_iso: string;
  url?: string;
  memory_id?: string;
  color: string;
};

type PastBriefing = {
  date: string;
  briefing: string;
  executive_summary?: string;
  saved_at: string;
};

type RecapStats = {
  captures: number;
  previous_captures?: number;
  captures_delta?: number;
  captures_direction?: 'up' | 'down' | 'flat';
  top_domains: Array<{ name: string; count: number }>;
  top_tags: Array<{ tag: string; count: number }>;
  source_mix: Array<{ type: string; count: number }>;
};

type RecapResponse = {
  period: string;
  days: number;
  stats: RecapStats;
  recap: string;
};

type AdvancedResponse = {
  greeting?: { label?: string };
  pulse?: {
    memories_this_week?: { current: number; previous: number; diff: number; direction: 'up' | 'down' | 'flat' };
  };
  top_tags?: Array<{ tag: string; count: number }>;
};

type SmartInsightCard = {
  id: string;
  icon: typeof TrendingUp;
  color: string;
  eyebrow: string;
  headline: string;
  sub: string;
  onClick?: () => void;
};

type Tab = 'today' | 'week' | 'month';

const formatDate = (iso: string): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return iso; }
};

const formatTime = (iso: string): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch { return ''; }
};

const formatLongDate = (d: Date): string =>
  d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

const greetingForHour = (h: number): string => {
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
};

export default function DailyBriefingPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get('tab') as Tab) || 'today';
  const [tab, setTab] = useState<Tab>(initialTab);

  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  // When the user opens a past briefing, this holds that briefing's date so
  // the header reflects what the user is reading rather than always "today".
  const [viewingDate, setViewingDate] = useState<string | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [past, setPast] = useState<PastBriefing[]>([]);
  const [recap, setRecap] = useState<RecapResponse | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [advanced, setAdvanced] = useState<AdvancedResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<any[]>([]);

  // Audio (browser SpeechSynthesis) — incl. progress estimate driven by an
  // interval since the API has no native progress event in all browsers.
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startedAtRef = useRef<number>(0);
  const elapsedBeforePauseRef = useRef<number>(0);
  const intervalRef = useRef<number | null>(null);
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'paused'>('idle');
  const [audioProgress, setAudioProgress] = useState(0); // 0..1
  const [estimatedDurationMs, setEstimatedDurationMs] = useState(0);

  const today = useMemo(() => new Date(), []);
  // Header reflects the briefing the user is currently viewing — "today" when
  // no past briefing is open, otherwise that briefing's saved date.
  const headerDate = useMemo(() => {
    if (viewingDate) {
      try {
        const d = new Date(viewingDate + 'T00:00:00');
        if (!Number.isNaN(d.getTime())) return d;
      } catch { /* fall through */ }
    }
    return today;
  }, [viewingDate, today]);
  const isViewingPast = viewingDate !== null;
  const headerDateLabel = useMemo(() => formatLongDate(headerDate), [headerDate]);
  const greetLabel = useMemo(() => {
    if (isViewingPast) return 'Looking back at';
    return advanced?.greeting?.label || greetingForHour(today.getHours());
  }, [advanced, today, isViewingPast]);
  const headerHeadline = useMemo(() => {
    return isViewingPast ? `${greetLabel}` : `${greetLabel}, here's today`;
  }, [greetLabel, isViewingPast]);

  const loadBriefing = useCallback(async (force = false) => {
    setBriefingLoading(true);
    setViewingDate(null);
    try {
      const r = await fetch(`/briefing${force ? '?force=true' : ''}`);
      const data = r.ok ? await r.json() : null;
      setBriefing(data);
    } catch { setBriefing(null); }
    setBriefingLoading(false);
  }, []);

  const loadAuxiliary = useCallback(async () => {
    try {
      const [aRes, tRes, pRes, advRes, ptRes] = await Promise.all([
        fetch('/briefing/actions'),
        fetch('/briefing/timeline'),
        fetch('/briefing/list?limit=14'),
        fetch('/dashboard/advanced'),
        fetch('/tasks?status=pending&limit=8'),
      ]);
      if (aRes.ok) {
        const j = await aRes.json();
        setActions(j.actions || []);
      }
      if (tRes.ok) {
        const j = await tRes.json();
        setTimeline(j.timeline || []);
      }
      if (pRes.ok) {
        const j = await pRes.json();
        setPast(j.briefings || []);
      }
      if (advRes.ok) {
        const j = await advRes.json();
        setAdvanced(j);
      }
      if (ptRes.ok) {
        const j = await ptRes.json();
        setPendingTasks(Array.isArray(j) ? j : []);
      }
    } catch { /* silent — page still works */ }
  }, []);

  useEffect(() => {
    loadBriefing();
    loadAuxiliary();
    return () => {
      try { window.speechSynthesis?.cancel(); } catch {}
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [loadBriefing, loadAuxiliary]);

  // When the tab/window regains focus, re-pull the action list so checkboxes
  // ticked from another device or browser tab show up here too. Both the
  // `focus` and `visibilitychange` events can fire when a tab becomes active,
  // so we guard with a short cooldown to avoid double-fetching.
  const lastFocusRefreshRef = useRef(0);
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastFocusRefreshRef.current < 1500) return;
      lastFocusRefreshRef.current = now;
      loadAuxiliary();
    };
    window.addEventListener('focus', handler);
    document.addEventListener('visibilitychange', handler);
    return () => {
      window.removeEventListener('focus', handler);
      document.removeEventListener('visibilitychange', handler);
    };
  }, [loadAuxiliary]);

  useEffect(() => {
    // Only push a URL update when the tab param actually differs from `tab`,
    // otherwise React Router can churn on every render.
    if (params.get('tab') === tab) return;
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [tab, params, setParams]);

  // Lazy-load recap when user opens week/month
  useEffect(() => {
    if (tab === 'today') return;
    let cancelled = false;
    setRecapLoading(true);
    setRecap(null);
    fetch(`/briefing/recap?period=${tab}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (!cancelled) setRecap(data); })
      .catch(() => { if (!cancelled) setRecap(null); })
      .finally(() => { if (!cancelled) setRecapLoading(false); });
    return () => { cancelled = true; };
  }, [tab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    handleStop();
    await Promise.all([loadBriefing(true), loadAuxiliary()]);
    if (tab !== 'today') {
      setRecapLoading(true);
      try {
        const r = await fetch(`/briefing/recap?period=${tab}`);
        setRecap(r.ok ? await r.json() : null);
      } catch { setRecap(null); }
      setRecapLoading(false);
    }
    setRefreshing(false);
    showToast('Briefing refreshed');
  };

  // ── Audio controls ────────────────────────────────────────────────────────
  const speakable = useMemo(() => {
    if (!briefing) return '';
    const s = briefing.sections || {};
    const parts = [
      briefing.executive_summary || s.summary || '',
      s.focus ? `Focus. ${s.focus}` : '',
      s.new ? `What's new. ${s.new}` : '',
      s.revisit ? `Revisit. ${s.revisit}` : '',
      s.at_risk ? `At risk. ${s.at_risk}` : '',
    ].filter((x) => x && x.trim().length);
    if (parts.length === 0 && briefing.briefing) return briefing.briefing;
    return parts.join(' ');
  }, [briefing]);

  // Rough estimate: ~14 chars / second of speech at default rate. Used only
  // to drive the visual progress bar — actual playback timing wins.
  useEffect(() => {
    const ms = Math.max(1500, Math.round((speakable.length / 14) * 1000));
    setEstimatedDurationMs(ms);
  }, [speakable]);

  const stopProgressLoop = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startProgressLoop = () => {
    stopProgressLoop();
    intervalRef.current = window.setInterval(() => {
      const elapsed = elapsedBeforePauseRef.current + (Date.now() - startedAtRef.current);
      const pct = estimatedDurationMs > 0 ? Math.min(1, elapsed / estimatedDurationMs) : 0;
      setAudioProgress(pct);
    }, 200) as unknown as number;
  };

  const playFromStart = () => {
    if (!('speechSynthesis' in window)) {
      showToast('Audio not supported in this browser', 'error');
      return;
    }
    if (!speakable.trim()) return;
    try { window.speechSynthesis.cancel(); } catch {}
    const u = new SpeechSynthesisUtterance(speakable);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onend = () => {
      setAudioProgress(1);
      setAudioState('idle');
      stopProgressLoop();
      elapsedBeforePauseRef.current = 0;
    };
    u.onerror = () => {
      setAudioState('idle');
      stopProgressLoop();
      elapsedBeforePauseRef.current = 0;
    };
    utterRef.current = u;
    elapsedBeforePauseRef.current = 0;
    startedAtRef.current = Date.now();
    setAudioProgress(0);
    window.speechSynthesis.speak(u);
    setAudioState('playing');
    startProgressLoop();
  };

  const handlePlay = () => {
    if (audioState === 'paused') {
      try { window.speechSynthesis.resume(); } catch {}
      startedAtRef.current = Date.now();
      setAudioState('playing');
      startProgressLoop();
      return;
    }
    playFromStart();
  };

  const handlePause = () => {
    try { window.speechSynthesis.pause(); } catch {}
    elapsedBeforePauseRef.current += Date.now() - startedAtRef.current;
    setAudioState('paused');
    stopProgressLoop();
  };

  const handleStop = () => {
    try { window.speechSynthesis.cancel(); } catch {}
    setAudioState('idle');
    stopProgressLoop();
    setAudioProgress(0);
    elapsedBeforePauseRef.current = 0;
  };

  const handleRestart = () => {
    playFromStart();
  };

  // ── Action item toggle ────────────────────────────────────────────────────
  const toggleAction = async (item: ActionItem) => {
    const next = !item.completed;
    setActions((prev) => prev.map((a) => (a.id === item.id ? { ...a, completed: next } : a)));
    let ok = false;
    try {
      const res = await fetch('/briefing/actions/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, done: next }),
      });
      ok = res.ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      // Revert on network error OR non-2xx so the screen never lies about
      // saved state.
      setActions((prev) => prev.map((a) => (a.id === item.id ? { ...a, completed: !next } : a)));
      showToast('Could not save — try again', 'error');
      return;
    }
    if (next) showToast('Action completed');
  };

  // ── Smart insights — same shape as the Dashboard cards ────────────────────
  const smartInsights = useMemo<SmartInsightCard[]>(() => {
    const out: SmartInsightCard[] = [];
    const velocityWk = advanced?.pulse?.memories_this_week;
    if (velocityWk) {
      const dirSign = velocityWk.direction === 'up' ? '+' : velocityWk.direction === 'down' ? '−' : '';
      const dirClr = velocityWk.direction === 'up' ? '#10b981' : velocityWk.direction === 'down' ? '#ef4444' : '#94a3b8';
      out.push({
        id: 'velocity',
        icon: TrendingUp,
        color: dirClr,
        eyebrow: 'LEARNING VELOCITY',
        headline: `${dirSign}${Math.abs(velocityWk.diff)} this week`,
        sub: `${velocityWk.current} captures · was ${velocityWk.previous} last week`,
        onClick: () => navigate('/insights?view=analytics'),
      });
    }
    const topicLead = advanced?.top_tags?.[0];
    if (topicLead) {
      out.push({
        id: 'topic',
        icon: Hash,
        color: '#06b6d4',
        eyebrow: 'TOPIC LEAD',
        headline: topicLead.tag,
        sub: `${topicLead.count} item${topicLead.count === 1 ? '' : 's'} tagged across your vault`,
        onClick: () => navigate(`/library?tab=vault&q=${encodeURIComponent(topicLead.tag)}`),
      });
    }
    const nextRevisit: Revisit | undefined = briefing?.revisits_due?.[0] || briefing?.revisits_upcoming?.[0];
    if (nextRevisit) {
      const overdue = (nextRevisit.overdue_hours ?? 0) > 0;
      const dueIn = nextRevisit.due_in_hours;
      const meta = overdue
        ? `Overdue by ${(nextRevisit.overdue_hours ?? 0) < 24 ? (nextRevisit.overdue_hours ?? 0) + 'h' : Math.round((nextRevisit.overdue_hours ?? 0) / 24) + 'd'}`
        : dueIn != null
          ? (dueIn < 24 ? `Due in ${Math.max(1, dueIn)}h` : `Due in ${Math.round(dueIn / 24)}d`)
          : 'Coming up';
      out.push({
        id: 'revisit',
        icon: Bell,
        color: overdue ? '#ef4444' : '#f59e0b',
        eyebrow: 'NEXT REVISIT',
        headline: nextRevisit.title || 'Untitled',
        sub: meta,
        onClick: () => {
          if (nextRevisit.memory_id) navigate(`/memory/${nextRevisit.memory_id}`);
          else if (nextRevisit.url) window.open(nextRevisit.url, '_blank');
        },
      });
    }
    return out;
  }, [advanced, briefing, navigate]);

  const sections: BriefingSections = briefing?.sections || {};
  const briefingFallbackParagraphs = useMemo(() => {
    // If `sections` is empty (older saved briefing), fall back to splitting
    // the long `briefing` text on blank lines so we still get paragraphs.
    if (sections.focus || sections.new || sections.revisit || sections.at_risk) return null;
    const text = briefing?.briefing || '';
    if (!text) return null;
    return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  }, [briefing, sections]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="briefing-page">
      <div className="briefing-header">
        <div className="briefing-header-left">
          <div className="briefing-eyebrow">
            <Sparkles size={14} /> AI DAILY BRIEFING
          </div>
          <h1 className="briefing-title">{headerHeadline}</h1>
          <p className="briefing-sub">
            {headerDateLabel}
            {isViewingPast && (
              <>
                {' '}·{' '}
                <button
                  type="button"
                  className="briefing-link"
                  onClick={() => loadBriefing()}
                >
                  Back to today
                </button>
              </>
            )}
          </p>
        </div>
        <div className="briefing-header-actions">
          <div className="briefing-audio-controls">
            {audioState === 'idle' && (
              <button type="button" className="briefing-btn primary" onClick={handlePlay} disabled={!speakable}>
                <Volume2 size={14} /> Listen
              </button>
            )}
            {audioState === 'playing' && (
              <>
                <button type="button" className="briefing-btn ghost" onClick={handlePause}>
                  <Pause size={14} /> Pause
                </button>
                <button type="button" className="briefing-btn ghost" onClick={handleRestart} title="Restart from start">
                  <RotateCcw size={14} />
                </button>
                <button type="button" className="briefing-btn ghost" onClick={handleStop}>
                  <Square size={14} /> Stop
                </button>
              </>
            )}
            {audioState === 'paused' && (
              <>
                <button type="button" className="briefing-btn primary" onClick={handlePlay}>
                  <Play size={14} /> Resume
                </button>
                <button type="button" className="briefing-btn ghost" onClick={handleRestart} title="Restart from start">
                  <RotateCcw size={14} />
                </button>
                <button type="button" className="briefing-btn ghost" onClick={handleStop}>
                  <Square size={14} /> Stop
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            className="briefing-btn ghost"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Regenerate"
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      {(audioState === 'playing' || audioState === 'paused') && (
        <div className="briefing-progress" aria-label="Audio progress">
          <div className="briefing-progress-fill" style={{ width: `${Math.round(audioProgress * 100)}%` }} />
        </div>
      )}

      <div className="briefing-tabs" role="tablist">
        {(['today', 'week', 'month'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`briefing-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
            type="button"
          >
            {t === 'today' ? 'Today' : t === 'week' ? 'This week' : 'This month'}
          </button>
        ))}
      </div>

      {tab === 'today' ? (
        <>
          {/* Smart insights row — Dashboard-style cards, larger */}
          {smartInsights.length > 0 && (
            <div className="briefing-insight-row">
              {smartInsights.map((ins) => {
                const Icon = ins.icon;
                return (
                  <button
                    key={ins.id}
                    type="button"
                    className="briefing-insight-card"
                    onClick={ins.onClick}
                    style={{ borderColor: `${ins.color}55` }}
                  >
                    <div className="briefing-insight-card-head">
                      <span className="briefing-insight-card-eyebrow" style={{ color: ins.color }}>
                        <Icon size={12} /> {ins.eyebrow}
                      </span>
                    </div>
                    <div className="briefing-insight-card-headline">{ins.headline}</div>
                    <div className="briefing-insight-card-sub">{ins.sub}</div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="briefing-grid">
            {/* Main column */}
            <div className="briefing-main">
              <motion.section
                className="briefing-card hero"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              >
                <div className="briefing-card-eyebrow"><Sparkles size={12} /> SUMMARY</div>
                {briefingLoading ? (
                  <div className="briefing-skeleton">
                    <div className="briefing-skel-line" />
                    <div className="briefing-skel-line short" />
                    <div className="briefing-skel-line" />
                  </div>
                ) : (
                  <>
                    {briefing?.executive_summary && (
                      <p className="briefing-exec">{briefing.executive_summary}</p>
                    )}
                    <div className="briefing-sections">
                      {sections.focus && (
                        <div className="briefing-section">
                          <div className="briefing-section-head">
                            <Target size={13} /> <span>Focus</span>
                          </div>
                          <p>{sections.focus}</p>
                        </div>
                      )}
                      {sections.new && (
                        <div className="briefing-section">
                          <div className="briefing-section-head">
                            <Sparkle size={13} /> <span>What's new in your vault</span>
                          </div>
                          <p>{sections.new}</p>
                        </div>
                      )}
                      {sections.revisit && (
                        <div className="briefing-section">
                          <div className="briefing-section-head">
                            <Brain size={13} /> <span>What to revisit</span>
                          </div>
                          <p>{sections.revisit}</p>
                        </div>
                      )}
                      {sections.at_risk && (
                        <div className="briefing-section">
                          <div className="briefing-section-head warn">
                            <AlertTriangle size={13} /> <span>What's at risk</span>
                          </div>
                          <p>{sections.at_risk}</p>
                        </div>
                      )}
                    </div>
                    {briefingFallbackParagraphs && briefingFallbackParagraphs.map((p, i) => (
                      <p key={i} className="briefing-body-text">{p}</p>
                    ))}
                  </>
                )}
              </motion.section>

              {/* Action items */}
              <section className="briefing-card">
                <div className="briefing-card-head">
                  <div className="briefing-card-eyebrow"><ListChecks size={12} /> ACTION ITEMS</div>
                  <span className="briefing-count">
                    {actions.filter((a) => !a.completed).length} open
                  </span>
                </div>
                {actions.length === 0 ? (
                  <div className="briefing-empty">No action items right now — capture a few notes and they'll appear here.</div>
                ) : (
                  <ul className="briefing-actions">
                    {actions.map((a) => (
                      <li key={a.id} className={`briefing-action ${a.completed ? 'done' : ''}`}>
                        <button
                          type="button"
                          className="briefing-action-check"
                          onClick={() => toggleAction(a)}
                          aria-label={a.completed ? 'Mark incomplete' : 'Mark complete'}
                          aria-pressed={a.completed}
                        >
                          {a.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                        <div className="briefing-action-body">
                          <div className="briefing-action-text">{a.text}</div>
                          <button
                            type="button"
                            className="briefing-action-source"
                            onClick={() => a.memory_id && navigate(`/memory/${a.memory_id}`)}
                          >
                            <BookOpen size={11} /> {a.memory_title}
                            {a.domain ? <> · <span className="briefing-action-domain">{a.domain}</span></> : null}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Pending tasks — deep-link cards */}
              <section className="briefing-card">
                <div className="briefing-card-head">
                  <div className="briefing-card-eyebrow"><CheckSquare size={12} /> PENDING TASKS</div>
                  <span className="briefing-count">{pendingTasks.length} open</span>
                </div>
                {pendingTasks.length === 0 ? (
                  <div className="briefing-empty">No pending tasks — you're all caught up. Add one from the Tasks page.</div>
                ) : (
                  <div className="briefing-pending-list">
                    {pendingTasks.slice(0, 5).map((t) => {
                      const priKey = (t.priority === 'high' || t.priority === 'low') ? t.priority : 'medium';
                      const priColor = priKey === 'high' ? '#ef4444' : priKey === 'low' ? '#10b981' : '#f59e0b';
                      const priBg = priKey === 'high' ? 'rgba(239,68,68,0.12)' : priKey === 'low' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)';
                      const dueInfo = (() => {
                        if (!t.due_date) return { label: '', overdue: false };
                        const d = new Date(`${t.due_date}T00:00:00`);
                        if (Number.isNaN(d.getTime())) return { label: '', overdue: false };
                        const today = new Date(); today.setHours(0,0,0,0);
                        const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
                        let label = '';
                        if (diff < 0) label = `${Math.abs(diff)}d overdue`;
                        else if (diff === 0) label = 'Due today';
                        else if (diff === 1) label = 'Due tomorrow';
                        else if (diff < 7) label = `Due in ${diff}d`;
                        else label = `Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                        return { label, overdue: diff < 0 };
                      })();
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={`briefing-pending-task pri-${priKey}`}
                          onClick={() => navigate(`/tasks?focus=${encodeURIComponent(t.id)}`)}
                        >
                          <div className="briefing-pending-task-body">
                            <div className="briefing-pending-task-title">{t.title}</div>
                            <div className="briefing-pending-task-meta">
                              <span className="briefing-pending-task-pri" style={{ color: priColor, background: priBg }}>{priKey}</span>
                              {dueInfo.label && <span style={{ color: dueInfo.overdue ? '#ef4444' : 'var(--text-3)' }}>{dueInfo.label}</span>}
                              {t.category && <span>· {t.category}</span>}
                            </div>
                          </div>
                          <span className="briefing-pending-task-go">Go to <ArrowUpRight size={11} /></span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Side column */}
            <div className="briefing-side">
              {/* Timeline */}
              <section className="briefing-card">
                <div className="briefing-card-head">
                  <div className="briefing-card-eyebrow"><Clock size={12} /> TODAY'S TIMELINE</div>
                </div>
                {timeline.length === 0 ? (
                  <div className="briefing-empty small">A clear day — nothing scheduled.</div>
                ) : (
                  <ul className="briefing-timeline">
                    {timeline.map((t, i) => (
                      <li key={`${t.kind}-${t.id || i}`} className="briefing-tl-item">
                        <span className="briefing-tl-dot" style={{ background: t.color }} />
                        <div className="briefing-tl-body">
                          <div className="briefing-tl-row">
                            <span className="briefing-tl-time">{formatTime(t.time_iso) || 'Anytime'}</span>
                            <span className="briefing-tl-kind">
                              {t.kind === 'habit' ? <Zap size={9} /> : null}
                              {t.kind}
                            </span>
                          </div>
                          <div className="briefing-tl-title">
                            {t.url ? (
                              <a href={t.url} target="_blank" rel="noreferrer" className="briefing-tl-link">
                                {t.title} <ExternalLink size={10} />
                              </a>
                            ) : t.memory_id ? (
                              <button
                                type="button"
                                className="briefing-tl-link as-btn"
                                onClick={() => navigate(`/memory/${t.memory_id}`)}
                              >
                                {t.title}
                              </button>
                            ) : (
                              <span>{t.title}</span>
                            )}
                          </div>
                          <div className="briefing-tl-sub">{t.subtitle}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Past briefings */}
              <section className="briefing-card">
                <div className="briefing-card-head">
                  <div className="briefing-card-eyebrow"><History size={12} /> PAST BRIEFINGS</div>
                </div>
                {past.length === 0 ? (
                  <div className="briefing-empty small">Your saved briefings will live here.</div>
                ) : (
                  <ul className="briefing-past">
                    {past.map((p) => (
                      <li key={p.date}>
                        <button
                          type="button"
                          className="briefing-past-item"
                          onClick={async () => {
                            try {
                              const r = await fetch(`/briefing/by-date/${p.date}`);
                              if (!r.ok) return;
                              const data = await r.json();
                              setBriefing({
                                briefing: data.briefing || '',
                                executive_summary: data.executive_summary || '',
                                sections: data.sections || {},
                                stats: data.stats || {},
                                revisits_due: [],
                                revisits_upcoming: [],
                                revisits_due_count: 0,
                              });
                              setViewingDate(p.date);
                              handleStop();
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            } catch {}
                          }}
                        >
                          <span className="briefing-past-date">{formatDate(p.date)}</span>
                          <span className="briefing-past-snip">{(p.executive_summary || p.briefing || '').slice(0, 80)}{(p.executive_summary || p.briefing || '').length > 80 ? '…' : ''}</span>
                          <ChevronRight size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </>
      ) : (
        <RecapView loading={recapLoading} recap={recap} period={tab} />
      )}
    </div>
  );
}

function RecapView({ loading, recap, period }: { loading: boolean; recap: RecapResponse | null; period: Tab }) {
  if (loading) {
    return (
      <div className="briefing-card">
        <div className="briefing-skeleton">
          <div className="briefing-skel-line" />
          <div className="briefing-skel-line" />
          <div className="briefing-skel-line short" />
        </div>
      </div>
    );
  }
  if (!recap) {
    return (
      <div className="briefing-card">
        <div className="briefing-empty">Could not load the recap. Try refreshing.</div>
      </div>
    );
  }
  return (
    <div className="briefing-grid">
      <div className="briefing-main">
        <section className="briefing-card hero">
          <div className="briefing-card-head">
            <div className="briefing-card-eyebrow"><Sparkles size={12} /> {period === 'week' ? 'WEEKLY RECAP' : 'MONTHLY RECAP'}</div>
            <span className="briefing-count">{recap.stats.captures} captures</span>
          </div>
          {typeof recap.stats.captures_delta === 'number' && (
            <div className="briefing-recap-delta">
              {(() => {
                const dir = recap.stats.captures_direction || 'flat';
                const diff = recap.stats.captures_delta || 0;
                const prev = recap.stats.previous_captures ?? 0;
                const sign = dir === 'up' ? '+' : dir === 'down' ? '−' : '';
                const color = dir === 'up' ? '#10b981' : dir === 'down' ? '#ef4444' : '#94a3b8';
                const word = period === 'week' ? 'week' : 'month';
                return (
                  <>
                    <span className="briefing-delta-pill" style={{ color, borderColor: `${color}55` }}>
                      <TrendingUp size={11} /> {sign}{Math.abs(diff)} vs last {word}
                    </span>
                    <span className="briefing-delta-meta">{prev} captures last {word}</span>
                  </>
                );
              })()}
            </div>
          )}
          <p className="briefing-body-text">{recap.recap}</p>
        </section>

        <section className="briefing-card">
          <div className="briefing-card-head">
            <div className="briefing-card-eyebrow"><Tag size={12} /> TOP TAGS</div>
          </div>
          {recap.stats.top_tags.length === 0 ? (
            <div className="briefing-empty small">No tags in this window.</div>
          ) : (
            <div className="briefing-tag-cloud">
              {recap.stats.top_tags.map((t) => (
                <span key={t.tag} className="briefing-tag-chip">
                  #{t.tag} <span className="briefing-tag-count">{t.count}</span>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="briefing-side">
        <section className="briefing-card">
          <div className="briefing-card-head">
            <div className="briefing-card-eyebrow"><Activity size={12} /> TOP DOMAINS</div>
          </div>
          {recap.stats.top_domains.length === 0 ? (
            <div className="briefing-empty small">Nothing yet.</div>
          ) : (
            <ul className="briefing-bars">
              {recap.stats.top_domains.map((d) => {
                const max = recap.stats.top_domains[0]?.count || 1;
                const pct = Math.max(6, Math.round((d.count / max) * 100));
                return (
                  <li key={d.name} className="briefing-bar-row">
                    <span className="briefing-bar-label">{d.name}</span>
                    <span className="briefing-bar-track"><span className="briefing-bar-fill" style={{ width: `${pct}%` }} /></span>
                    <span className="briefing-bar-count">{d.count}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="briefing-card">
          <div className="briefing-card-head">
            <div className="briefing-card-eyebrow"><BookOpen size={12} /> SOURCE MIX</div>
          </div>
          {recap.stats.source_mix.length === 0 ? (
            <div className="briefing-empty small">No captures yet.</div>
          ) : (
            <ul className="briefing-source-list">
              {recap.stats.source_mix.map((s) => (
                <li key={s.type}>
                  <span className="briefing-source-name">{s.type}</span>
                  <span className="briefing-source-count">{s.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
