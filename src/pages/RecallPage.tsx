import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Send, Search, Sparkles, Clock, Bot,
  Youtube, Globe, FileText, StickyNote, Loader2,
  ArrowRight, Mic, MicOff, X, Hash, History, Radio,
  ChevronUp, ChevronDown, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MarkdownMessage from '../components/MarkdownMessage';
import { LiveInlineGate } from '../components/LiveChatPanel';

interface Source {
  id: string;
  title?: string;
  source_url?: string;
  source_type?: 'youtube' | 'web' | 'note' | 'pdf' | string;
  domain?: string;
  summary?: string;
  key_points?: string[];
  tags?: string[];
  thumbnail_url?: string;
  youtube_id?: string;
  favicon_url?: string;
  host?: string;
  created_at?: string;
}

interface RecallMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  follow_ups?: string[];
  ts: string;
  streaming?: boolean;
}

const SRC_ICON: Record<string, any> = { youtube: Youtube, web: Globe, pdf: FileText, note: StickyNote };
const SRC_CLR: Record<string, string> = { youtube: '#ef4444', web: '#00d4ff', pdf: '#f59e0b', note: '#10b981' };

const QUICK_PROMPTS = [
  { icon: Sparkles, label: 'Top insights', q: 'Give me my top 5 insights from across everything I have saved.' },
  { icon: Youtube,  label: 'YouTube key points', q: 'What are the key points from my YouTube video captures?' },
  { icon: Globe,    label: 'Article highlights', q: 'Summarize the most important points from my saved articles.' },
  { icon: StickyNote, label: 'Action items', q: 'List the action items and todos from my notes.' },
  { icon: Clock,    label: 'Last 7 days', q: 'What did I capture in the last 7 days, grouped by theme?' },
  { icon: Brain,    label: 'Connect ideas', q: 'Find non-obvious connections between the topics I have studied.' },
];

const formatRelativeDate = (iso?: string): string => {
  if (!iso) return '';
  try {
    const then = new Date(iso).getTime();
    const days = Math.round((Date.now() - then) / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.round(days / 7)}w ago`;
    return `${Math.round(days / 30)}mo ago`;
  } catch { return ''; }
};

/* ----------------------------------------------------------------------- */
/* Source Card — richer than before, with YouTube banner / web favicon     */
/* ----------------------------------------------------------------------- */
const SourceCard: React.FC<{
  src: Source;
  onAsk: (q: string) => void;
  onPlay?: (id: string) => void;
  isPlaying?: boolean;
  onStop?: () => void;
}> = ({ src, onAsk, onPlay, isPlaying, onStop }) => {
  const navigate = useNavigate();
  const Icon = SRC_ICON[src.source_type || 'note'] ?? Brain;
  const clr = SRC_CLR[src.source_type || 'note'] ?? '#6366f1';
  const isYt = src.source_type === 'youtube' && src.youtube_id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="recall-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'all 0.18s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = `${clr}55`;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 24px ${clr}1a`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
      }}
    >
      {/* Banner: YouTube thumb / player */}
      {isYt && (
        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
          {isPlaying ? (
            <>
              <iframe
                src={`https://www.youtube.com/embed/${src.youtube_id}?autoplay=1&rel=0&modestbranding=1`}
                title={src.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
              />
              <button onClick={(e) => { e.stopPropagation(); onStop?.(); }}
                title="Stop"
                style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}>
                <X size={13} />
              </button>
            </>
          ) : (
            <button
              onClick={() => onPlay?.(src.id)}
              title={`Play "${src.title}"`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#000', overflow: 'hidden', border: 0, padding: 0, cursor: 'pointer' }}>
              <img
                src={src.thumbnail_url}
                alt={src.title}
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${src.youtube_id}/hqdefault.jpg`; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.5) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239,68,68,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(239,68,68,0.5)' }}>
                  <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
              <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', background: 'rgba(239,68,68,0.95)', borderRadius: 4, color: '#fff', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.8px' }}>
                YOUTUBE
              </div>
            </button>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {/* Header row: type + date */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {src.favicon_url ? (
              <img src={src.favicon_url} alt="" width={14} height={14} style={{ borderRadius: 3 }} />
            ) : (
              <Icon size={13} color={clr} />
            )}
            <span style={{ color: clr, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              {src.host || src.source_type || 'memory'}
            </span>
          </div>
          {src.created_at && (
            <span style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 500 }}>
              {formatRelativeDate(src.created_at)}
            </span>
          )}
        </div>

        {/* Title */}
        <div style={{ color: 'var(--text-1)', fontSize: 14, fontWeight: 700, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {src.title || 'Untitled'}
        </div>

        {/* Summary */}
        {src.summary && (
          <div style={{ color: 'var(--text-2)', fontSize: 12.5, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {src.summary}
          </div>
        )}

        {/* Tags */}
        {src.tags && src.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {src.tags.slice(0, 4).map((t) => (
              <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', background: `${clr}10`, border: `1px solid ${clr}22`, borderRadius: 10, color: clr, fontSize: 10, fontWeight: 600 }}>
                <Hash size={8} />{t}
              </span>
            ))}
          </div>
        )}

        {/* Footer actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', paddingTop: 4 }}>
          <button onClick={() => navigate(`/memory/${src.id}`)}
            style={{ flex: 1, padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-2)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            Open <ArrowRight size={10} />
          </button>
          <button onClick={() => onAsk(`Tell me more about "${src.title}". What are the key takeaways?`)}
            title="Ask follow-up about this memory"
            style={{ flex: 1, padding: '6px 10px', background: `${clr}14`, border: `1px solid ${clr}30`, borderRadius: 7, color: clr, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            Ask AI
          </button>
          {src.source_url && (
            <a href={src.source_url} target="_blank" rel="noreferrer"
              title={src.source_url}
              style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-3)', textDecoration: 'none', flexShrink: 0 }}>
              <ExternalLink size={11} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
};

/* ----------------------------------------------------------------------- */
/* Main Recall View                                                        */
/* ----------------------------------------------------------------------- */
const RecallView = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<RecallMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [memCount, setMemCount] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [playingYt, setPlayingYt] = useState<Set<string>>(new Set());
  const [liveOpen, setLiveOpen] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('recall-x247-history') || '[]');
      return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string').slice(0, 5) : [];
    } catch { return []; }
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetch('/stats').then(r => r.ok ? r.json() : null).then(s => { if (s) setMemCount(s.total_memories); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const conversationHistory = useMemo(() => {
    return messages
      .filter(m => !m.streaming && (m.content || '').trim().length > 0)
      .map(m => ({ role: m.role, content: m.content }));
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

    setHistory(prev => {
      const next = [msg, ...prev.filter(h => h !== msg)].slice(0, 5);
      try { localStorage.setItem('recall-x247-history', JSON.stringify(next)); } catch {}
      return next;
    });

    const userId = `u-${Date.now()}`;
    const aiId = `a-${Date.now()}`;
    const priorHistory = conversationHistory;

    setMessages(prev => [...prev,
      { id: userId, role: 'user', content: msg, ts: new Date().toISOString() },
      { id: aiId, role: 'assistant', content: '', ts: new Date().toISOString(), streaming: true }
    ]);
    setInput(''); setIsLoading(true);

    try {
      const res = await fetch('/recall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: msg, history: priorHistory })
      });
      const data = await res.json();
      setMessages(prev => prev.map(m => m.id === aiId
        ? {
          ...m,
          content: data.answer || data.error || 'No response received.',
          sources: data.sources || [],
          follow_ups: data.follow_ups || [],
          streaming: false,
        }
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
  const isEmpty = messages.length === 0;

  return (
    <div className="recall-shell" style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 5rem)', gap: 14, padding: '6px 0 28px', maxWidth: 980, margin: '0 auto', width: '100%' }}>

      {/* Compact header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(147,51,234,0.15))', border: '1px solid rgba(99,102,241,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99,102,241,0.22)' }}>
            <Search size={17} color="#818cf8" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text-1)', fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.4px', lineHeight: 1.1 }}>Neural Recall</h1>
            <div style={{ color: 'var(--text-3)', fontSize: 11.5, marginTop: 2 }}>
              {memCount ?? '—'} memories · ask in plain English or voice
            </div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setPlayingYt(new Set()); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <X size={11} /> New chat
          </button>
        )}
      </motion.div>

      {/* Live Voice Recall — collapsible card with REAL-TIME badge */}
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ ...card, overflow: 'hidden', border: liveOpen ? '1px solid rgba(34,211,238,0.3)' : '1px solid var(--border)' }}>
        <button
          onClick={() => setLiveOpen(o => !o)}
          aria-expanded={liveOpen}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(34,211,238,0.14)', border: '1px solid rgba(34,211,238,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Radio size={14} color="#22d3ee" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ color: 'var(--text-1)', fontSize: 13.5, fontWeight: 700 }}>Voice Recall</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', background: 'rgba(239,68,68,0.14)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#f87171', fontSize: 9, fontWeight: 800, letterSpacing: '0.5px' }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s ease-in-out infinite' }} />
                  REAL-TIME
                </span>
              </div>
              <div style={{ color: 'var(--text-3)', fontSize: 11.5, marginTop: 2 }}>
                Talk to your Second Brain — answers stream back in real time
              </div>
            </div>
          </div>
          {liveOpen ? <ChevronUp size={16} color="var(--text-3)" /> : <ChevronDown size={16} color="var(--text-3)" />}
        </button>
        <AnimatePresence>
          {liveOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: 'hidden' }}>
              <div style={{ padding: '0 14px 14px' }}>
                <LiveInlineGate active={liveOpen} compact />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Empty state — minimal hero + 6 prompt chips */}
      {isEmpty && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ ...card, padding: '28px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, textAlign: 'center' }}>
          <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
            style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(147,51,234,0.12))', border: '1px solid rgba(99,102,241,0.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px rgba(99,102,241,0.22)' }}>
            <Brain size={26} color="#818cf8" />
          </motion.div>
          <div>
            <div style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.3px' }}>Ask your Second Brain</div>
            <div style={{ color: 'var(--text-3)', fontSize: 13.5, marginTop: 6, maxWidth: 460 }}>
              Type, speak, or pick a prompt — get instant answers from everything you've saved.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, width: '100%', maxWidth: 720, marginTop: 4 }}>
            {QUICK_PROMPTS.map((p) => {
              const Icon = p.icon;
              return (
                <button key={p.label} onClick={() => handleSend(p.q)}
                  className="recall-prompt-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 11, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.45)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} color="#818cf8" />
                  </div>
                  <span style={{ color: 'var(--text-2)', fontSize: 13, fontWeight: 600 }}>{p.label}</span>
                </button>
              );
            })}
          </div>

          {history.length > 0 && (
            <div style={{ width: '100%', maxWidth: 720, paddingTop: 4, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 9, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginTop: 12 }}>
                <History size={11} /> Recent questions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                {history.slice(0, 5).map((q, i) => (
                  <button key={`${q}-${i}`} onClick={() => handleSend(q)} title={q}
                    style={{ padding: '6px 11px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, cursor: 'pointer', color: 'var(--text-2)', fontSize: 11.5, fontWeight: 500, fontFamily: 'inherit', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Messages thread */}
      {messages.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {msg.role === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ maxWidth: '85%', padding: '10px 15px', borderRadius: '14px 4px 14px 14px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', fontSize: 13.5, lineHeight: 1.55, boxShadow: '0 2px 12px rgba(99,102,241,0.3)', whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Short answer chip */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#1e1b4b,#312e81)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Brain size={14} color="#818cf8" />
                    </div>
                    <div style={{ flex: 1, padding: '11px 15px', borderRadius: '4px 14px 14px 14px', background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-1)', fontSize: 13.5, lineHeight: 1.6 }}>
                      {msg.streaming ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center', height: 18 }}>
                          {[0,1,2].map(i => (
                            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', animation: `bounce 1.2s ease-in-out ${i * 0.18}s infinite` }} />
                          ))}
                          <span style={{ color: '#818cf8', fontSize: 11, marginLeft: 6 }}>Searching your vault…</span>
                        </div>
                      ) : (
                        <MarkdownMessage content={msg.content} onActionClick={(t) => handleSend(t)} />
                      )}
                    </div>
                  </div>

                  {/* Source cards grid */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{ paddingLeft: 40 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
                        <span style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                          {msg.sources.length} {msg.sources.length === 1 ? 'memory' : 'memories'} from your vault
                        </span>
                        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                        {msg.sources.map((src) => {
                          const playKey = `${msg.id}:${src.id}`;
                          return (
                            <SourceCard
                              key={src.id}
                              src={src}
                              onAsk={(q) => handleSend(q)}
                              onPlay={() => setPlayingYt(prev => { const n = new Set(prev); n.add(playKey); return n; })}
                              isPlaying={playingYt.has(playKey)}
                              onStop={() => setPlayingYt(prev => { const n = new Set(prev); n.delete(playKey); return n; })}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Follow-up chips */}
                  {msg.follow_ups && msg.follow_ups.length > 0 && !msg.streaming && (
                    <div style={{ paddingLeft: 40, display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <div style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Ask a follow-up
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                        {msg.follow_ups.map((f, i) => (
                          <button key={`${f}-${i}`} onClick={() => handleSend(f)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 18, color: '#a5b4fc', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', maxWidth: 360, textAlign: 'left', transition: 'all 0.15s' }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.18)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)'; }}>
                            <Sparkles size={11} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agent attribution */}
                  {!msg.streaming && (
                    <div style={{ paddingLeft: 40, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 10 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Bot size={9} color="#818cf8" /> RecallAgent
                      </span>
                      <span>·</span>
                      <span>{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input — sticky-ish bottom but in flow */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ ...card, padding: '12px 14px', position: 'sticky', bottom: 12, boxShadow: '0 -8px 32px rgba(0,0,0,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', background: 'var(--surface-2)', border: `1px solid ${isListening ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 12, padding: '9px 11px', transition: 'border-color 0.2s' }}>
          <Search size={14} color="#818cf8" style={{ alignSelf: 'center', flexShrink: 0 }} />
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={isListening ? 'Listening…' : isEmpty ? 'Ask your Second Brain anything…' : 'Ask a follow-up…'}
            disabled={isLoading}
            rows={1}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13.5, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 100, overflow: 'auto', minHeight: 22 }}
            title="Enter to send, Shift+Enter for newline"
          />
          <button onClick={toggleVoice}
            title={isListening ? 'Stop listening' : 'Voice input'}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: isListening ? 'rgba(239,68,68,0.14)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {isListening ? <MicOff size={14} color="#ef4444" style={{ animation: 'pulse 1s ease-in-out infinite' }} /> : <Mic size={14} color="var(--text-3)" />}
          </button>
          <button onClick={() => handleSend()} disabled={!input.trim() || isLoading}
            style={{ width: 36, height: 36, borderRadius: 9, border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'default', background: input.trim() && !isLoading ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: input.trim() && !isLoading ? '0 2px 10px rgba(99,102,241,0.4)' : 'none' }}>
            {isLoading ? <Loader2 size={14} color="var(--text-3)" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} color={input.trim() ? '#fff' : 'var(--text-3)'} />}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7, paddingLeft: 4, paddingRight: 4 }}>
          <div style={{ color: 'var(--text-3)', fontSize: 10.5 }}>
            Enter to send · Shift+Enter for newline · Tap mic for voice
          </div>
          <button onClick={() => navigate('/agent')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#a78bfa', fontSize: 10.5, fontWeight: 600, fontFamily: 'inherit' }}
            title="Need multi-step workflows? Try Agent Hub">
            Agent Hub <ArrowRight size={10} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RecallView;
