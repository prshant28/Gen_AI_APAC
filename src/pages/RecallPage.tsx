import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Send, Search, Sparkles, Clock, Database, Bot,
  Youtube, Globe, FileText, StickyNote, Loader2,
  ArrowRight, Zap, BookOpen, ChevronRight, Mic, MicOff, X,
  Hash, Lightbulb, Layers, Compass, Flame, History, Command,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MarkdownMessage from '../components/MarkdownMessage';
import { getYouTubeId } from '../lib/utils';

interface RecallMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: any[];
  agents?: string[];
  ts: string;
  streaming?: boolean;
}

const SRC_ICON: Record<string, any> = { youtube: Youtube, web: Globe, pdf: FileText, note: StickyNote };
const SRC_CLR: Record<string, string> = { youtube: '#ef4444', web: '#00d4ff', pdf: '#f59e0b', note: '#10b981' };

const SUGGESTIONS = [
  { icon: Brain, label: 'What have I learned recently?', q: 'What are the most important things I have captured and learned recently?' },
  { icon: Youtube, label: 'Key points from YouTube captures', q: 'What are the key points and insights from my YouTube video captures?' },
  { icon: BookOpen, label: 'Summarize my knowledge base', q: 'Give me a comprehensive summary of everything in my knowledge base.' },
];

const SUGGESTION_GROUPS: { id: string; title: string; icon: any; color: string; items: { icon: any; label: string; q: string }[] }[] = [
  {
    id: 'recap', title: 'Quick recap', icon: Compass, color: '#22d3ee',
    items: [
      { icon: Brain,    label: 'What have I learned recently?', q: 'What are the most important things I have captured and learned recently?' },
      { icon: Sparkles, label: 'Show me my top insights',       q: 'Give me the top 5 insights from across everything I have saved so far.' },
      { icon: Clock,    label: 'Recap the last 7 days',         q: 'What did I capture or work on in the last 7 days? Group by theme.' },
    ],
  },
  {
    id: 'deep', title: 'Deep dive', icon: Layers, color: '#8b5cf6',
    items: [
      { icon: BookOpen, label: 'Summarize my knowledge base',   q: 'Give me a comprehensive summary of everything in my knowledge base, grouped by topic.' },
      { icon: Lightbulb,label: 'Connect ideas across topics',   q: 'Find non-obvious connections between the topics I have been studying.' },
      { icon: Zap,      label: 'Patterns in my notes',          q: 'What patterns or recurring themes emerge from my notes? Cite specific examples.' },
    ],
  },
  {
    id: 'find', title: 'Find specific', icon: Search, color: '#f59e0b',
    items: [
      { icon: Youtube,    label: 'Key points from YouTube',     q: 'What are the key points and insights from my YouTube video captures?' },
      { icon: Globe,      label: 'Important quotes from articles', q: 'Pull out the most important quotes from the web articles I have saved.' },
      { icon: StickyNote, label: 'Action items from my notes',  q: 'List the action items, todos, or next steps mentioned across my notes.' },
    ],
  },
];

const RecallView = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<RecallMessage[]>([]);
  const [playingYt, setPlayingYt] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [memCount, setMemCount] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  // Show "Recall vs Agent Hub" card on first visit; persist dismissal so it doesn't keep returning.
  const [showDiff, setShowDiff] = useState<boolean>(() => {
    try { return localStorage.getItem('recall-x247-diff-dismissed') !== '1'; } catch { return true; }
  });
  const dismissDiff = useCallback(() => {
    setShowDiff(false);
    try { localStorage.setItem('recall-x247-diff-dismissed', '1'); } catch {}
  }, []);
  const [topTags, setTopTags] = useState<{ tag: string; count: number }[]>([]);
  const [streak, setStreak] = useState<number>(0);
  const [recentMems, setRecentMems] = useState<any[]>([]);
  const [sourceMix, setSourceMix] = useState<{ youtube: number; web: number; pdf: number; note: number }>({ youtube: 0, web: 0, pdf: 0, note: 0 });
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('recall-x247-history') || '[]');
      return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string').slice(0, 6) : [];
    } catch { return []; }
  });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetch('/stats').then(r => r.ok ? r.json() : null).then(s => { if (s) setMemCount(s.total_memories); }).catch(() => {});
    fetch('/dashboard/advanced').then(r => r.ok ? r.json() : null).then(d => {
      if (!d) return;
      setTopTags(Array.isArray(d.top_tags) ? d.top_tags : []);
      setStreak(d.streak?.current || 0);
    }).catch(() => {});
    fetch('/memories?limit=100').then(r => r.ok ? r.json() : []).then((arr: any[]) => {
      const list = Array.isArray(arr) ? arr : [];
      setRecentMems(list.slice(0, 4));
      const mix = { youtube: 0, web: 0, pdf: 0, note: 0 };
      list.forEach(m => { const t = m?.source_type; if (t && t in mix) (mix as any)[t]++; });
      setSourceMix(mix);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Don't auto-scroll while the empty state is showing — that hides the hero/suggestions
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const toggleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US';
    rec.onresult = (e: any) => setInput(Array.from(e.results).map((r: any) => r[0].transcript).join(''));
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start(); setIsListening(true);
  }, [isListening]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;

    try { localStorage.setItem('recall-x247-tried-recall', '1'); } catch {}

    setHistory(prev => {
      const next = [msg, ...prev.filter(h => h !== msg)].slice(0, 6);
      try { localStorage.setItem('recall-x247-history', JSON.stringify(next)); } catch {}
      return next;
    });

    const userId = `u-${Date.now()}`;
    const aiId = `a-${Date.now()}`;
    setMessages(prev => [...prev,
      { id: userId, role: 'user', content: msg, ts: new Date().toISOString() },
      { id: aiId, role: 'assistant', content: '', ts: new Date().toISOString(), streaming: true }
    ]);
    setInput(''); setIsLoading(true);

    try {
      const res = await fetch('/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: msg })
      });
      const data = await res.json();
      setMessages(prev => prev.map(m => m.id === aiId
        ? { ...m, content: data.answer || data.error || 'No response received.', sources: data.sources, agents: ['RecallAgent'], streaming: false }
        : m
      ));
    } catch {
      setMessages(prev => prev.map(m => m.id === aiId
        ? { ...m, content: 'Connection error — please try again.', streaming: false }
        : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 };

  return (
    <div className="recall-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 5rem)', gap: 0, padding: '10px 0 28px' }}>

      {/* Header — compact, no duplicate subtitle (hero below has it) */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 10, flexShrink: 0, padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(147,51,234,0.15))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(99,102,241,0.2)' }}>
              <Search size={18} color="#818cf8" />
            </div>
            <h1 style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>Neural Recall</h1>
          </div>

          {/* Differentiation card — dismissible, no emojis */}
          <AnimatePresence>
            {showDiff && messages.length === 0 && (
              <motion.div initial={{ opacity: 0, x: 20, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.97 }}
                style={{ ...card, padding: '12px 14px', maxWidth: 320, border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.05)', position: 'relative', flexShrink: 0 }}>
                <button onClick={dismissDiff} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex' }} title="Dismiss">
                  <X size={12} />
                </button>
                <div style={{ color: '#818cf8', fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 8 }}>Recall vs Agent Hub</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ padding: '8px 10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}>
                    <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>Neural Recall (here)</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 11 }}>Fast Q&A from your saved memories.</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 8 }}>
                    <div style={{ color: '#a78bfa', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>Agent Hub</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 11 }}>7 specialised agents for multi-step workflows.</div>
                  </div>
                  <button onClick={() => navigate('/agent')}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', padding: '7px 10px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 8, color: '#a78bfa', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Try Agent Hub <ArrowRight size={11} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Chat Area — grows with content; the page scrolls, not this card.
          Input flows naturally below the messages instead of being pinned
          to the viewport bottom, so the whole page reads in one go. */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        style={{ display: 'flex', flexDirection: 'column', ...card, border: '1px solid rgba(99,102,241,0.15)', boxShadow: '0 0 0 1px rgba(99,102,241,0.05), 0 8px 32px rgba(0,0,0,0.2)' }}>

        {/* Messages — grows naturally, no inner scrollbox */}
        <div style={{ padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: 14 }} className="recall-messages">

          {/* Empty state — expanded */}
          {messages.length === 0 && (() => {
            const totalSrc = sourceMix.youtube + sourceMix.web + sourceMix.pdf + sourceMix.note;
            const srcEntries = ([
              { key: 'youtube' as const, label: 'YouTube', count: sourceMix.youtube },
              { key: 'web' as const,     label: 'Web',     count: sourceMix.web },
              { key: 'pdf' as const,     label: 'PDF',     count: sourceMix.pdf },
              { key: 'note' as const,    label: 'Notes',   count: sourceMix.note },
            ]).filter(s => s.count > 0);

            return (
              <div className="recall-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0 8px', gap: 18 }}>
                {/* Hero — larger, single source of truth for the page intro */}
                <div className="recall-empty-hero-row" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 0 2px' }}>
                  <motion.div className="recall-hero" initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.1 }}
                    style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(147,51,234,0.12))', border: '1px solid rgba(99,102,241,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px rgba(99,102,241,0.22)', flexShrink: 0 }}>
                    <Search size={28} color="#818cf8" />
                  </motion.div>
                  <div className="recall-empty-text">
                    <div style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.3px' }}>Ask your Second Brain</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 14, lineHeight: 1.45, marginTop: 4 }}>
                      Instant answers from everything you've saved.
                    </div>
                  </div>
                </div>

                {/* MAIN 2-COL GRID */}
                <div className="recall-empty-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)', gap: 18, width: '100%', maxWidth: 1040, alignItems: 'start' }}>

                  {/* LEFT — Categorized suggestions + history */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
                    {SUGGESTION_GROUPS.map((group, gi) => {
                      const GIcon = group.icon;
                      return (
                        <motion.div key={group.id} className="recall-grp"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + gi * 0.06 }}
                          style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                          <div className="recall-grp-head" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px' }}>
                            <div className="recall-grp-icon" style={{ width: 24, height: 24, borderRadius: 7, background: `${group.color}1c`, border: `1px solid ${group.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <GIcon size={13} color={group.color} />
                            </div>
                            <span className="recall-grp-title" style={{ color: group.color, fontSize: 12, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase' }}>{group.title}</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 6 }} />
                          </div>
                          <div className="recall-sug-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
                            {group.items.map(s => {
                              const SIcon = s.icon;
                              return (
                                <button key={s.label} className="recall-sug-btn" onClick={() => handleSend(s.q)} title={s.q}
                                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 11, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.16s', minWidth: 0 }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${group.color}55`; (e.currentTarget as HTMLButtonElement).style.background = `${group.color}10`; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}>
                                  <div className="recall-sug-icon" style={{ width: 30, height: 30, borderRadius: 8, background: `${group.color}15`, border: `1px solid ${group.color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <SIcon size={14} color={group.color} />
                                  </div>
                                  <span className="recall-sug-label" style={{ flex: 1, minWidth: 0, color: 'var(--text-2)', fontSize: 13.5, lineHeight: 1.35, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Recent questions history */}
                    {history.length > 0 && (
                      <motion.div className="recall-grp recall-hist" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                        <div className="recall-grp-head" style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '0 2px' }}>
                          <div className="recall-grp-icon" style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(148,163,184,0.12)', border: '1px solid rgba(148,163,184,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <History size={13} color="var(--text-3)" />
                          </div>
                          <span className="recall-grp-title" style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase' }}>Recent questions</span>
                          <div style={{ flex: 1, height: 1, background: 'var(--border)', marginLeft: 6 }} />
                          <button className="recall-hist-clear" onClick={() => { setHistory([]); try { localStorage.removeItem('recall-x247-history'); } catch {} }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 11.5, fontWeight: 600, padding: '4px 8px', borderRadius: 5, fontFamily: 'inherit' }}
                            title="Clear history">Clear</button>
                        </div>
                        <div className="recall-hist-list" style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                          {history.slice(0, 6).map((q, i) => (
                            <button key={`${q}-${i}`} className="recall-hist-chip" onClick={() => handleSend(q)} title={q}
                              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 13px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 18, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', maxWidth: 320 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}>
                              <Clock size={11} color="var(--text-3)" />
                              <span style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* RIGHT — Knowledge panel */}
                  <motion.div className="recall-kb" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, background: 'linear-gradient(160deg, rgba(99,102,241,0.06) 0%, rgba(147,51,234,0.03) 100%)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 14, minWidth: 0 }}>
                    <div className="recall-kb-head" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Database size={14} color="#818cf8" />
                      <span className="recall-kb-title" style={{ color: '#818cf8', fontSize: 12, fontWeight: 700, letterSpacing: '1.4px', textTransform: 'uppercase' }}>Your knowledge</span>
                    </div>

                    {/* Stats row */}
                    <div className="recall-kb-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                      <div className="recall-kb-stat" style={{ padding: '13px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 11 }}>
                        <div className="recall-kb-stat-num" style={{ color: 'var(--text-1)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>{memCount ?? '—'}</div>
                        <div className="recall-kb-stat-lbl" style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 600, marginTop: 5, letterSpacing: '0.4px' }}>Memories</div>
                      </div>
                      <div className="recall-kb-stat" style={{ padding: '13px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 11, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                          <div className="recall-kb-stat-num" style={{ color: 'var(--text-1)', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1 }}>{streak}</div>
                          <Flame size={14} color={streak > 0 ? '#f59e0b' : 'var(--text-3)'} />
                        </div>
                        <div className="recall-kb-stat-lbl" style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 600, marginTop: 5, letterSpacing: '0.4px' }}>Day streak</div>
                      </div>
                    </div>

                    {/* Source mix */}
                    {totalSrc > 0 && (
                      <div className="recall-kb-section">
                        <div className="recall-kb-sec-title" style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>Source mix</div>
                        <div className="recall-kb-bar" style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--surface-2)' }}>
                          {srcEntries.map(s => (
                            <div key={s.key} title={`${s.count} ${s.label}`} style={{ flex: s.count, background: SRC_CLR[s.key], transition: 'flex 0.3s' }} />
                          ))}
                        </div>
                        <div className="recall-kb-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 9 }}>
                          {srcEntries.map(s => (
                            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{ width: 9, height: 9, borderRadius: '50%', background: SRC_CLR[s.key] }} />
                              <span className="recall-kb-legend-text" style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 600 }}>{s.count} {s.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Top topics — duplicate "click to ask" stripped, action implicit via cursor + title */}
                    {topTags.length > 0 && (
                      <div className="recall-kb-section">
                        <div className="recall-kb-sec-title" style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>Top topics</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {topTags.slice(0, 8).map(t => (
                            <button key={t.tag} className="recall-topic-chip" onClick={() => handleSend(`What do I know about ${t.tag}? Give me a structured summary with sources.`)}
                              title={`Ask about ${t.tag}`}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.22)', borderRadius: 18, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.18)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.4)'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.1)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.22)'; }}>
                              <Hash size={11} color="#818cf8" />
                              <span className="recall-topic-text" style={{ color: 'var(--text-2)', fontSize: 12, fontWeight: 600 }}>{t.tag}</span>
                              <span className="recall-topic-count" style={{ color: 'var(--text-3)', fontSize: 11, fontWeight: 700 }}>{t.count}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent captures — same: action implicit */}
                    {recentMems.length > 0 && (
                      <div className="recall-kb-section">
                        <div className="recall-kb-sec-title" style={{ color: 'var(--text-3)', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>Recent captures</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {recentMems.slice(0, 3).map(m => {
                            const RIcon = SRC_ICON[m.source_type] ?? Brain;
                            const rclr = SRC_CLR[m.source_type] ?? '#6366f1';
                            const safeTitle = (m.title && String(m.title).trim()) || 'Untitled';
                            const title = safeTitle.slice(0, 60);
                            return (
                              <button key={m.id} className="recall-cap-row" onClick={() => handleSend(`Tell me more about "${safeTitle}". What are the key points and how does it connect to the rest of my knowledge?`)}
                                title={safeTitle}
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${rclr}55`; (e.currentTarget as HTMLButtonElement).style.background = `${rclr}10`; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}>
                                <div className="recall-cap-icon" style={{ width: 28, height: 28, borderRadius: 7, background: `${rclr}15`, border: `1px solid ${rclr}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  <RIcon size={13} color={rclr} />
                                </div>
                                <span className="recall-cap-text" style={{ flex: 1, minWidth: 0, color: 'var(--text-2)', fontSize: 13, lineHeight: 1.3, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
                                <ChevronRight size={14} color="var(--text-3)" style={{ flexShrink: 0 }} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* Pro tips strip — bigger */}
                <motion.div className="recall-tips" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16, padding: '11px 16px', background: 'var(--surface-2)', border: '1px dashed var(--border)', borderRadius: 12, width: '100%', maxWidth: 1040, marginTop: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-3)', fontSize: 12 }}>
                    <Lightbulb size={13} color="#f59e0b" />
                    <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>Tips:</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: 12 }}>
                    <Command size={12} /> <kbd style={{ padding: '2px 7px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, fontSize: 11, fontFamily: 'inherit' }}>Enter</kbd> to send
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: 12 }}>
                    <Mic size={12} /> Tap mic for voice
                  </div>
                  <div style={{ color: 'var(--text-3)', fontSize: 12 }}>Ask in plain English — citations included</div>
                </motion.div>
              </div>
            );
          })()}

          {/* Message history */}
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>

              {/* Avatar */}
              <div style={{ width: 32, height: 32, borderRadius: 9, background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'linear-gradient(135deg,#1e1b4b,#312e81)', border: `1px solid ${msg.role === 'user' ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: msg.role === 'user' ? '0 2px 8px rgba(99,102,241,0.35)' : 'none' }}>
                {msg.role === 'user' ? <ChevronRight size={15} color="#fff" /> : <Brain size={15} color="#818cf8" />}
              </div>

              <div style={{ maxWidth: '78%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{
                  padding: '11px 15px',
                  borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                  background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'var(--surface-2)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  boxShadow: msg.role === 'user' ? '0 2px 12px rgba(99,102,241,0.3)' : 'none',
                }}>
                  {msg.streaming ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 20 }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#818cf8', animation: `bounce 1.2s ease-in-out ${i * 0.18}s infinite` }} />
                      ))}
                      <span style={{ color: '#818cf8', fontSize: 11, marginLeft: 4 }}>Searching your knowledge base...</span>
                    </div>
                  ) : msg.role === 'user' ? (
                    <p style={{ color: '#fff', fontSize: 13.5, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                  ) : (
                    <div style={{ color: 'var(--text-1)', fontSize: 13.5, lineHeight: 1.65 }}>
                      <MarkdownMessage content={msg.content} onActionClick={(t) => handleSend(t)} />
                    </div>
                  )}
                </div>

                {/* Sources */}
                {msg.sources && msg.sources.length > 0 && (() => {
                  const ytSources = msg.sources.filter((s: any) => s.source_type === 'youtube' && getYouTubeId(s.source_url || ''));
                  const otherSources = msg.sources.filter((s: any) => !(s.source_type === 'youtube' && getYouTubeId(s.source_url || '')));
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', paddingLeft: 2 }}>Sources used</div>

                      {/* YouTube preview cards */}
                      {ytSources.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: ytSources.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, maxWidth: 520 }}>
                          {ytSources.slice(0, 4).map((src: any) => {
                            const ytId = getYouTubeId(src.source_url);
                            const playKey = `${msg.id}:${src.id}`;
                            const isPlaying = playingYt.has(playKey);
                            return (
                              <div key={src.id}
                                style={{ display: 'flex', flexDirection: 'column', background: 'var(--surface-2)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, overflow: 'hidden', transition: 'all 0.18s' }}>
                                {/* Thumbnail or inline player */}
                                {isPlaying ? (
                                  <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
                                    <iframe
                                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`}
                                      title={src.title}
                                      frameBorder="0"
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', border: 0 }}
                                    />
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setPlayingYt(prev => { const next = new Set(prev); next.delete(playKey); return next; }); }}
                                      title="Stop"
                                      style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}>
                                      <X size={11} />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setPlayingYt(prev => { const next = new Set(prev); next.add(playKey); return next; })}
                                    title={`Play "${src.title}"`}
                                    style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000', overflow: 'hidden', border: 0, padding: 0, cursor: 'pointer', display: 'block' }}>
                                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={src.title} loading="lazy"
                                      onError={e => { (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`; }}
                                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.4) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(239,68,68,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(239,68,68,0.5)', transition: 'transform 0.15s' }}>
                                        <svg viewBox="0 0 24 24" fill="white" width="15" height="15"><path d="M8 5v14l11-7z" /></svg>
                                      </div>
                                    </div>
                                    <div style={{ position: 'absolute', top: 5, left: 5, padding: '2px 6px', background: 'rgba(239,68,68,0.92)', borderRadius: 3, color: '#fff', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.8px' }}>YOUTUBE</div>
                                  </button>
                                )}
                                {/* Caption */}
                                <div style={{ padding: '7px 9px 8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                  <div style={{ color: 'var(--text-1)', fontSize: 11.5, fontWeight: 600, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{src.title}</div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 2 }}>
                                    <button onClick={() => navigate(`/memory/${src.id}`)}
                                      style={{ background: 'transparent', border: 'none', color: '#a78bfa', fontSize: 9.5, fontWeight: 700, cursor: 'pointer', padding: 0, fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                      Open in Vault →
                                    </button>
                                    <a href={src.source_url} target="_blank" rel="noreferrer"
                                      style={{ color: 'var(--text-3)', fontSize: 9.5, fontWeight: 600, textDecoration: 'none' }}>
                                      youtube.com ↗
                                    </a>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Other source pills */}
                      {otherSources.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {otherSources.slice(0, 4).map((src: any) => {
                            const Icon = SRC_ICON[src.source_type] ?? Brain;
                            const clr = SRC_CLR[src.source_type] ?? '#6366f1';
                            const inner = (
                              <>
                                <Icon size={10} color={clr} />
                                <span style={{ color: clr, fontSize: 10, fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.title}</span>
                              </>
                            );
                            const baseStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: `${clr}10`, border: `1px solid ${clr}25`, borderRadius: 20, textDecoration: 'none' };
                            return src.source_url ? (
                              <a key={src.id} href={src.source_url} target="_blank" rel="noreferrer" style={baseStyle}>{inner}</a>
                            ) : (
                              <div key={src.id} style={baseStyle}>{inner}</div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Agents */}
                {msg.agents && msg.agents.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {msg.agents.map(a => (
                      <span key={a} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, color: '#818cf8', fontSize: 9.5, fontWeight: 700 }}>
                        <Bot size={9} /> {a}
                      </span>
                    ))}
                  </div>
                )}

                {msg.role === 'assistant' && !msg.streaming && (
                  <div style={{ color: 'var(--text-3)', fontSize: 10, paddingLeft: 2 }}>
                    {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

        {/* Input */}
        <div className="recall-input-wrap" style={{ padding: '10px 14px', flexShrink: 0 }}>
          {/* Suggested follow-ups when there are messages */}
          {messages.length > 0 && messages.length <= 4 && !isLoading && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {SUGGESTIONS.slice(0, 3).map(s => (
                <button key={s.label} onClick={() => handleSend(s.q)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-3)', fontSize: 10.5, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', fontWeight: 500 }}
                  onMouseEnter={e => { (e.currentTarget).style.color = '#818cf8'; (e.currentTarget).style.borderColor = 'rgba(99,102,241,0.3)'; }}
                  onMouseLeave={e => { (e.currentTarget).style.color = 'var(--text-3)'; (e.currentTarget).style.borderColor = 'var(--border)'; }}>
                  <s.icon size={10} /> {s.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--surface-2)', border: `1px solid ${isListening ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 13, padding: '10px 12px', transition: 'border-color 0.2s', boxShadow: isListening ? '0 0 0 3px rgba(239,68,68,0.1)' : '0 0 0 1px rgba(99,102,241,0.05)' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'center' }}>
              <Search size={13} color="#818cf8" />
            </div>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening...' : 'Ask your Second Brain anything...'}
              disabled={isLoading}
              rows={1}
              wrap="off"
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13.5, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 100, overflow: 'auto', whiteSpace: 'pre' }}
              title="Enter to send"
            />
            <button onClick={toggleVoice}
              style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: isListening ? 'rgba(239,68,68,0.12)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
              {isListening ? <MicOff size={14} color="#ef4444" style={{ animation: 'pulse 1s ease-in-out infinite' }} /> : <Mic size={14} color="var(--text-3)" />}
            </button>
            <button onClick={() => handleSend()} disabled={!input.trim() || isLoading}
              style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'default', background: input.trim() && !isLoading ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', boxShadow: input.trim() && !isLoading ? '0 2px 10px rgba(99,102,241,0.4)' : 'none', fontFamily: 'inherit' }}>
              {isLoading ? <Loader2 size={15} color="var(--text-3)" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} color={input.trim() ? '#fff' : 'var(--text-3)'} />}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <p style={{ color: 'var(--text-3)', fontSize: 10, margin: 0 }}>
              Powered by Neural AI · Searches {memCount ?? '—'} memories · Enter to send
            </p>
            <button onClick={() => navigate('/agent')}
              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 10, fontWeight: 600, fontFamily: 'inherit' }}
              title="Need multi-step tasks? Try Agent Hub">
              Need agents? Try Agent Hub <ArrowRight size={10} />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RecallView;
