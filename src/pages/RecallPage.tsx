import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Send, Search, Sparkles, Clock, Database,
  Youtube, Globe, FileText, StickyNote, Loader2,
  ArrowRight, Zap, BookOpen, ChevronRight, Mic, MicOff, X
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
  { icon: Sparkles, label: 'AI & ML insights', q: 'What have I saved about AI, machine learning, or technology?' },
  { icon: Zap, label: 'Productivity notes summary', q: 'Summarize my saved notes about productivity and personal development.' },
  { icon: Clock, label: 'Recent captures', q: 'What memories have I added most recently? Give me a quick recap.' },
];

const FeatureBadge = ({ icon: Icon, label, color }: { icon: any; label: string; color: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', background: `${color}12`, border: `1px solid ${color}25`, borderRadius: 20 }}>
    <Icon size={11} color={color} />
    <span style={{ color, fontSize: 10.5, fontWeight: 600 }}>{label}</span>
  </div>
);

const RecallView = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<RecallMessage[]>([]);
  const [playingYt, setPlayingYt] = useState<Set<string>>(new Set());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [memCount, setMemCount] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    fetch('/stats').then(r => r.ok ? r.json() : null).then(s => { if (s) setMemCount(s.total_memories); }).catch(() => {});
  }, []);

  useEffect(() => {
    // Don't auto-scroll while the empty state is showing — that hides the hero/suggestions
    if (messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
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

    const userId = `u-${Date.now()}`;
    const aiId = `a-${Date.now()}`;
    setMessages(prev => [...prev,
      { id: userId, role: 'user', content: msg, ts: new Date().toISOString() },
      { id: aiId, role: 'assistant', content: '', ts: new Date().toISOString(), streaming: true }
    ]);
    setInput(''); setIsLoading(true); setShowDiff(false);

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
    <div className="recall-shell" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 5rem)', minHeight: 0, gap: 0, padding: '10px 0 0' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 10, flexShrink: 0, padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(147,51,234,0.15))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(99,102,241,0.2)' }}>
                <Search size={17} color="#818cf8" />
              </div>
              <div>
                <h1 style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>Neural Recall</h1>
                <p style={{ color: 'var(--text-3)', fontSize: 11.5, margin: 0 }}>Search & query your personal knowledge base</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <FeatureBadge icon={Database} label={`${memCount ?? '—'} memories indexed`} color="#6366f1" />
              <FeatureBadge icon={Brain} label="Semantic search" color="#9333ea" />
              <FeatureBadge icon={Zap} label="Instant answers" color="#10b981" />
            </div>
          </div>

          {/* Differentiation card — dismissible */}
          <AnimatePresence>
            {showDiff && messages.length === 0 && (
              <motion.div initial={{ opacity: 0, x: 20, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 20, scale: 0.97 }}
                style={{ ...card, padding: '12px 14px', maxWidth: 300, border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.05)', position: 'relative', flexShrink: 0 }}>
                <button onClick={() => setShowDiff(false)} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, display: 'flex' }}>
                  <X size={12} />
                </button>
                <div style={{ color: '#818cf8', fontSize: 9.5, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 6 }}>💡 RECALL vs AGENT HUB</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ padding: '7px 10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8 }}>
                    <div style={{ color: '#818cf8', fontSize: 10, fontWeight: 700, marginBottom: 2 }}>⚡ Neural Recall (here)</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 10 }}>Fast Q&A from your saved memories. Single AI, instant answers.</div>
                  </div>
                  <div style={{ padding: '7px 10px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: 8 }}>
                    <div style={{ color: '#a78bfa', fontSize: 10, fontWeight: 700, marginBottom: 2 }}>🤖 Agent Hub</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 10 }}>7 specialized agents for complex tasks: capture, schedule, analyze & more.</div>
                  </div>
                  <button onClick={() => navigate('/agent')}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', padding: '5px 10px', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 8, color: '#a78bfa', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Try Agent Hub <ArrowRight size={10} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Chat Area */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...card, overflow: 'hidden', border: '1px solid rgba(99,102,241,0.15)', boxShadow: '0 0 0 1px rgba(99,102,241,0.05), 0 8px 32px rgba(0,0,0,0.2)' }}>

        {/* Messages */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 16px 8px', display: 'flex', flexDirection: 'column', gap: 14 }} className="scroll-custom recall-messages">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="recall-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '8px 0 4px', gap: 14 }}>
              <motion.div className="recall-hero" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', delay: 0.15 }}
                style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(147,51,234,0.1))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(99,102,241,0.18)', flexShrink: 0 }}>
                <Search size={24} color="#818cf8" />
              </motion.div>
              <div className="recall-empty-text" style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-1)', fontSize: 15.5, fontWeight: 700, marginBottom: 4 }}>Ask your Second Brain</div>
                <div style={{ color: 'var(--text-3)', fontSize: 11.5, lineHeight: 1.5, maxWidth: 360 }}>
                  Search across YouTube captures, web articles, PDFs, and notes — get instant intelligent answers.
                </div>
              </div>

              {/* Suggestion grid */}
              <div className="recall-suggest-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, width: '100%', maxWidth: 560 }}>
                {SUGGESTIONS.map((s, i) => (
                  <motion.button key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                    onClick={() => handleSend(s.q)}
                    title={s.label}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'all 0.18s', minWidth: 0 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(99,102,241,0.35)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.07)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <s.icon size={12} color="#818cf8" />
                    </div>
                    <span style={{ flex: 1, minWidth: 0, color: 'var(--text-2)', fontSize: 11.5, lineHeight: 1.35, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

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
                      <span key={a} style={{ padding: '2px 8px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, color: '#818cf8', fontSize: 9.5, fontWeight: 700 }}>
                        🤖 {a}
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
              placeholder={isListening ? '🎙 Listening...' : 'Ask your Second Brain anything... (Enter to send)'}
              disabled={isLoading}
              rows={1}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13.5, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 100, overflow: 'auto' }}
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
