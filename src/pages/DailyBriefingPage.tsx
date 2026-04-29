import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Sparkles, Volume2, Square, Pause, Play, RefreshCw, ListChecks, Clock,
  Calendar as CalendarIcon, BookOpen, History, Brain, ChevronRight, ExternalLink,
  CheckCircle2, Circle, Tag, Activity
} from 'lucide-react';
import { showToast } from '../App';

type Stats = {
  total_memories?: number;
  pending_tasks?: number;
  due_revisits?: number;
};

type BriefingResponse = {
  briefing: string;
  executive_summary?: string;
  stats?: Stats;
  revisits_due?: Array<{ id: string; memory_id?: string; title: string; url?: string; next_due?: string }>;
  revisits_upcoming?: Array<{ id: string; title: string; next_due?: string }>;
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
  kind: 'task' | 'revisit' | 'event';
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

export default function DailyBriefingPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get('tab') as Tab) || 'today';
  const [tab, setTab] = useState<Tab>(initialTab);

  const [briefing, setBriefing] = useState<BriefingResponse | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [past, setPast] = useState<PastBriefing[]>([]);
  const [recap, setRecap] = useState<RecapResponse | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Audio (browser SpeechSynthesis)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'paused'>('idle');

  const loadBriefing = useCallback(async (force = false) => {
    setBriefingLoading(true);
    try {
      const r = await fetch(`/briefing${force ? '?force=true' : ''}`);
      const data = r.ok ? await r.json() : null;
      setBriefing(data);
    } catch { setBriefing(null); }
    setBriefingLoading(false);
  }, []);

  const loadAuxiliary = useCallback(async () => {
    try {
      const [aRes, tRes, pRes] = await Promise.all([
        fetch('/briefing/actions'),
        fetch('/briefing/timeline'),
        fetch('/briefing/list?limit=14'),
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
    } catch { /* silent — page still works */ }
  }, []);

  useEffect(() => {
    loadBriefing();
    loadAuxiliary();
    return () => {
      // Stop any in-flight speech if user navigates away
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, [loadBriefing, loadAuxiliary]);

  useEffect(() => {
    setParams((p) => {
      const next = new URLSearchParams(p);
      next.set('tab', tab);
      return next;
    }, { replace: true });
  }, [tab, setParams]);

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
    try { window.speechSynthesis?.cancel(); } catch {}
    setAudioState('idle');
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
    const parts = [
      briefing.executive_summary || '',
      briefing.briefing || '',
    ].filter((s) => s && s.trim().length);
    return parts.join('. ');
  }, [briefing]);

  const handlePlay = () => {
    if (!('speechSynthesis' in window)) {
      showToast('Audio not supported in this browser', 'error');
      return;
    }
    if (audioState === 'paused') {
      window.speechSynthesis.resume();
      setAudioState('playing');
      return;
    }
    if (!speakable.trim()) return;
    try { window.speechSynthesis.cancel(); } catch {}
    const u = new SpeechSynthesisUtterance(speakable);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onend = () => setAudioState('idle');
    u.onerror = () => setAudioState('idle');
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setAudioState('playing');
  };

  const handlePause = () => {
    try { window.speechSynthesis.pause(); } catch {}
    setAudioState('paused');
  };

  const handleStop = () => {
    try { window.speechSynthesis.cancel(); } catch {}
    setAudioState('idle');
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
      // Network error OR non-2xx — revert and notify so the user knows the
      // state on screen no longer matches what's saved.
      setActions((prev) => prev.map((a) => (a.id === item.id ? { ...a, completed: !next } : a)));
      showToast('Could not save — try again', 'error');
      return;
    }
    if (next) showToast('Action completed');
  };

  // ── Smart insights derived client-side from action + timeline data ────────
  const insights = useMemo(() => {
    const out: Array<{ icon: typeof Sparkles; text: string; tone: 'info' | 'warn' | 'good' }> = [];
    const open = actions.filter((a) => !a.completed).length;
    const done = actions.filter((a) => a.completed).length;
    if (open > 5) {
      out.push({ icon: ListChecks, text: `${open} open action items — pick three to finish today.`, tone: 'warn' });
    } else if (open > 0) {
      out.push({ icon: ListChecks, text: `${open} action item${open === 1 ? '' : 's'} waiting — light load, easy clear.`, tone: 'info' });
    }
    if (done > 0) {
      out.push({ icon: CheckCircle2, text: `${done} action${done === 1 ? '' : 's'} already done. Good momentum.`, tone: 'good' });
    }
    const dueRev = briefing?.revisits_due_count || (briefing?.revisits_due?.length ?? 0);
    if (dueRev > 0) {
      out.push({ icon: Brain, text: `${dueRev} revisit${dueRev === 1 ? '' : 's'} due — quick recall keeps recall sharp.`, tone: 'info' });
    }
    const eventCount = timeline.filter((t) => t.kind === 'event').length;
    if (eventCount > 0) {
      out.push({ icon: CalendarIcon, text: `${eventCount} event${eventCount === 1 ? '' : 's'} on the calendar today.`, tone: 'info' });
    }
    if (out.length === 0) {
      out.push({ icon: Sparkles, text: 'Nothing pressing — a great window for deep work.', tone: 'good' });
    }
    return out;
  }, [actions, briefing, timeline]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="briefing-page">
      <div className="briefing-header">
        <div>
          <div className="briefing-eyebrow">
            <Sparkles size={14} /> AI DAILY BRIEFING
          </div>
          <h1 className="briefing-title">Today, in one read</h1>
          <p className="briefing-sub">A summary of what matters, who's waiting, and what to revisit.</p>
        </div>
        <div className="briefing-header-actions">
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
        <div className="briefing-grid">
          {/* Main column */}
          <div className="briefing-main">
            <motion.section
              className="briefing-card hero"
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            >
              <div className="briefing-card-head">
                <div className="briefing-card-eyebrow"><Sparkles size={12} /> SUMMARY</div>
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
                      <button type="button" className="briefing-btn ghost" onClick={handleStop}>
                        <Square size={14} /> Stop
                      </button>
                    </>
                  )}
                </div>
              </div>
              {briefingLoading ? (
                <div className="briefing-skeleton">
                  <div className="briefing-skel-line" />
                  <div className="briefing-skel-line short" />
                  <div className="briefing-skel-line" />
                </div>
              ) : (
                <p className="briefing-body-text">{briefing?.briefing || 'No briefing yet — your first capture will get one started.'}</p>
              )}
            </motion.section>

            {/* Smart insights */}
            <section className="briefing-card">
              <div className="briefing-card-head">
                <div className="briefing-card-eyebrow"><Activity size={12} /> SMART INSIGHTS</div>
              </div>
              <ul className="briefing-insights">
                {insights.map((ins, i) => {
                  const Icon = ins.icon;
                  return (
                    <li key={i} className={`briefing-insight tone-${ins.tone}`}>
                      <Icon size={14} />
                      <span>{ins.text}</span>
                    </li>
                  );
                })}
              </ul>
            </section>

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
                          <span className="briefing-tl-kind">{t.kind}</span>
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
                              stats: data.stats || {},
                              revisits_due: [],
                              revisits_upcoming: [],
                              revisits_due_count: 0,
                            });
                            try { window.speechSynthesis?.cancel(); } catch {}
                            setAudioState('idle');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } catch {}
                        }}
                      >
                        <span className="briefing-past-date">{formatDate(p.date)}</span>
                        <span className="briefing-past-snip">{(p.briefing || '').slice(0, 80)}{(p.briefing || '').length > 80 ? '…' : ''}</span>
                        <ChevronRight size={12} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
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
