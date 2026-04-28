import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, Youtube, Globe, FileText, StickyNote, Download, Trash2, ExternalLink, FlipHorizontal, Brain, CheckCircle2, Tag, Clock, X, RotateCcw, ChevronLeft, ChevronRight, Award, Database, Filter, ArrowUpDown, XCircle, CheckCircle, ListTodo, BookOpen, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, getYouTubeId, YouTubeEmbed, YouTubeThumbnail } from '../lib/utils';
import type { Memory, Flashcard } from '../lib/types';

interface StudyCard extends Flashcard { status: 'unseen' | 'known' | 'unknown'; }

const FlashcardModal = ({ memory, onClose }: { memory: Memory; onClose: () => void }) => {
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [known, setKnown] = useState(0);

  useEffect(() => {
    fetch(`/memories/${memory.id}/flashcards`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.flashcards) setCards(data.flashcards.map((c: Flashcard) => ({ ...c, status: 'unseen' }))); })
      .catch(console.error).finally(() => setLoading(false));
  }, [memory.id]);

  const markCard = (status: 'known' | 'unknown') => {
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, status } : c));
    if (status === 'known') setKnown(k => k + 1);
    if (idx < cards.length - 1) { setIdx(i => i + 1); setFlipped(false); }
    else setDone(true);
  };

  const score = cards.length > 0 ? Math.round((known / cards.length) * 100) : 0;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,15,0.88)', backdropFilter: 'blur(10px)' }} />
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 24 }}
        style={{ position: 'relative', width: '100%', maxWidth: 520, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(249,115,22,0.08))', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: '#f59e0b', fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', marginBottom: 3 }}>AI FLASHCARDS</div>
            <div style={{ color: 'var(--text-1)', fontWeight: 700, fontSize: 13 }}>{memory.title.slice(0, 50)}{memory.title.length > 50 ? '…' : ''}</div>
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)' }}>
            <X size={13} />
          </button>
        </div>
        <div style={{ padding: '20px 22px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '36px 0' }}>
              <Loader2 size={26} color="#f59e0b" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>Generating flashcards…</p>
            </div>
          ) : done ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: score >= 80 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', border: `2px solid ${score >= 80 ? '#10b981' : '#f59e0b'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: `0 0 24px ${score >= 80 ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: score >= 80 ? '#10b981' : '#f59e0b' }}>{score}%</span>
              </div>
              <div style={{ color: 'var(--text-1)', fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{score >= 80 ? 'Great job!' : score >= 50 ? 'Good progress!' : 'Keep going!'}</div>
              <div style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 16 }}>{known}/{cards.length} correct</div>
              <button onClick={onClose} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
            </div>
          ) : cards.length > 0 ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ flex: 1, height: 3, background: 'var(--surface-3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(idx / cards.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#f59e0b,#f97316)', transition: 'width 0.3s' }} />
                </div>
                <span style={{ color: 'var(--text-3)', fontSize: 10, fontWeight: 600 }}>{idx + 1}/{cards.length}</span>
              </div>
              <motion.div key={`${idx}-${flipped}`} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                onClick={() => setFlipped(!flipped)}
                style={{ minHeight: 160, borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', cursor: 'pointer', border: `2px solid ${flipped ? 'rgba(99,102,241,0.25)' : 'rgba(245,158,11,0.2)'}`, background: flipped ? 'rgba(99,102,241,0.05)' : 'rgba(245,158,11,0.04)', marginBottom: 12 }}>
                <span style={{ color: flipped ? '#818cf8' : '#f59e0b', fontSize: 8.5, fontWeight: 700, letterSpacing: '1.5px', marginBottom: 10, display: 'block' }}>{flipped ? 'ANSWER' : 'QUESTION'}</span>
                <p style={{ color: 'var(--text-1)', fontSize: 14, fontWeight: 600, lineHeight: 1.55, margin: 0 }}>{flipped ? cards[idx].answer : cards[idx].question}</p>
                <span style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 10 }}>Click to {flipped ? 'see question' : 'reveal answer'}</span>
              </motion.div>
              {flipped ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => markCard('unknown')} style={{ flex: 1, padding: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <XCircle size={13} /> Don't know
                  </button>
                  <button onClick={() => markCard('known')} style={{ flex: 1, padding: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, color: '#10b981', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <CheckCircle size={13} /> Know it!
                  </button>
                </div>
              ) : (
                <button onClick={() => setFlipped(true)} style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Reveal Answer →
                </button>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-3)', fontSize: 13 }}>
              Failed to generate flashcards.
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const SRC_ICON: Record<string, { icon: React.ElementType; color: string }> = {
  youtube: { icon: Youtube, color: '#ef4444' },
  web:     { icon: Globe,   color: '#00d4ff' },
  pdf:     { icon: FileText,color: '#f59e0b' },
};

const DOMAINS = ['', 'AI', 'Technology', 'Science', 'Business', 'Health', 'History', 'Philosophy', 'Engineering', 'Productivity', 'Other'];
const SORT_OPTS = [{ value: 'newest', label: 'Newest' }, { value: 'oldest', label: 'Oldest' }, { value: 'title', label: 'A–Z' }];

const VaultView = () => {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [flashcardsMemory, setFlashcardsMemory] = useState<Memory | null>(null);

  const fetchMemories = useCallback(() => {
    setIsLoading(true);
    const url = domainFilter ? `/memories?domain=${domainFilter}&limit=50` : '/memories?limit=50';
    fetch(url).then(r => r.ok ? r.json() : []).then(data => { setMemories(data); setIsLoading(false); }).catch(() => setIsLoading(false));
  }, [domainFilter]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this memory? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await fetch(`/memories/${id}`, { method: 'DELETE' });
      setMemories(prev => prev.filter(m => m.id !== id));
      if (selectedMemory?.id === id) setSelectedMemory(null);
    } catch (err) { console.error(err); }
    finally { setDeletingId(null); }
  };

  const filtered = memories
    .filter(m => !filter || m.title.toLowerCase().includes(filter.toLowerCase()) || m.tags.some(t => t.toLowerCase().includes(filter.toLowerCase())) || m.summary.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return a.title.localeCompare(b.title);
    });

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16 };

  return (
    <div style={{ color: 'var(--text-1)' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(244,114,182,0.12)' }}>
              <Database size={18} color="#f472b6" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>Knowledge Vault</h1>
              <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '2px 0 0' }}>{memories.length} memories in your Second Brain</p>
            </div>
          </div>
          <a href="/export/vault" download="recall-x247-vault.md" title="Export vault as Markdown"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.35)', flexShrink: 0 }}>
            <Download size={14} /> Export Vault
          </a>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 300 }}>
            <Search size={13} color="var(--text-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input type="text" placeholder="Search memories..." value={filter} onChange={e => setFilter(e.target.value)}
              style={{ width: '100%', paddingLeft: 30, paddingRight: filter ? 28 : 12, paddingTop: 9, paddingBottom: 9, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', fontSize: 12.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(244,114,182,0.4)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
            />
            {filter && (
              <button onClick={() => setFilter('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
                <X size={12} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <Filter size={11} color="var(--text-3)" />
          </div>

          <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', fontSize: 12, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
            {DOMAINS.map(d => <option key={d} value={d}>{d || 'All Domains'}</option>)}
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8 }}>
            <ArrowUpDown size={11} color="var(--text-3)" />
          </div>

          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-1)', fontSize: 12, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
            {SORT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </motion.div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 size={34} color="#f472b6" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div className="vault-grid">
          {filtered.map((memory, i) => {
            const src = SRC_ICON[memory.source_type] ?? { icon: StickyNote, color: '#f59e0b' };
            const SrcIcon = src.icon;
            return (
              <motion.div key={memory.id} layout initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                style={{ ...card, display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'all 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 10px 28px ${src.color}12`; e.currentTarget.style.borderColor = `${src.color}25`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border)'; }}>

                {memory.source_type === 'youtube' && memory.source_url && getYouTubeId(memory.source_url) && (
                  <YouTubeThumbnail url={memory.source_url} onClick={() => setSelectedMemory(memory)} />
                )}

                <div style={{ padding: '14px 15px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `${src.color}12`, border: `1px solid ${src.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <SrcIcon size={16} color={src.color} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ padding: '2px 7px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-3)', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{memory.domain}</span>
                      <button onClick={e => { e.stopPropagation(); setFlashcardsMemory(memory); }} title="Generate Flashcards"
                        style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.12)'; e.currentTarget.style.color = '#f59e0b'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'transparent'; }}>
                        <FlipHorizontal size={12} />
                      </button>
                      <button onClick={e => handleDelete(memory.id, e)} disabled={deletingId === memory.id} title="Delete"
                        style={{ width: 26, height: 26, borderRadius: 7, background: 'transparent', border: '1px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'transparent'; }}>
                        {deletingId === memory.id ? <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  </div>

                  <h4 onClick={() => navigate(`/memory/${memory.id}`)} style={{ color: 'var(--text-1)', fontSize: 13.5, fontWeight: 700, lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', cursor: 'pointer', transition: 'color 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-1)'; }}>
                    {memory.title}
                  </h4>
                  <p style={{ color: 'var(--text-3)', fontSize: 12, lineHeight: 1.55, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, marginBottom: 10 }}>{memory.summary}</p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {memory.tags.slice(0, 3).map(tag => (
                      <span key={tag} style={{ padding: '2px 7px', background: 'rgba(244,114,182,0.08)', border: '1px solid rgba(244,114,182,0.18)', borderRadius: 20, color: '#f472b6', fontSize: 9.5, fontWeight: 700 }}>#{tag}</span>
                    ))}
                    {memory.tags.length > 3 && <span style={{ color: 'var(--text-3)', fontSize: 9.5, fontWeight: 700, alignSelf: 'center' }}>+{memory.tags.length - 3}</span>}
                  </div>

                  <div style={{ paddingTop: 10, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-3)', fontSize: 10 }}>
                      <Clock size={10} />{new Date(memory.created_at).toLocaleDateString()}
                    </span>
                    <button onClick={() => navigate(`/memory/${memory.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 10.5, fontWeight: 700, fontFamily: 'inherit' }}>
                      Deep Dive →
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '70px 0' }}>
              <Brain size={40} color="var(--border-2)" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: 'var(--text-3)', margin: 0 }}>{filter ? 'No memories match your search.' : 'No memories yet — start capturing knowledge!'}</p>
              <button onClick={() => navigate('/capture')} style={{ marginTop: 14, padding: '9px 20px', background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                + Capture Knowledge
              </button>
            </div>
          )}
        </div>
      )}

      {/* Memory Detail Modal */}
      <AnimatePresence>
        {selectedMemory && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMemory(null)}
              style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,15,0.82)', backdropFilter: 'blur(8px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ position: 'relative', width: '100%', maxWidth: 720, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.55)' }}>

              <div style={{ background: 'linear-gradient(135deg, #0d1117 0%, #1a1040 60%, #1e1b4b 100%)', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span style={{ padding: '3px 9px', background: '#6366f1', borderRadius: 6, fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#fff' }}>{selectedMemory.source_type}</span>
                    <span style={{ padding: '3px 9px', background: 'rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)' }}>{selectedMemory.domain}</span>
                  </div>
                  <h3 style={{ color: '#fff', fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1.35 }}>{selectedMemory.title}</h3>
                </div>
                <button onClick={() => setSelectedMemory(null)} style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0, marginLeft: 12 }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '22px 28px' }} className="scroll-custom">
                {selectedMemory.source_type === 'youtube' && selectedMemory.source_url && <YouTubeEmbed url={selectedMemory.source_url} />}

                {selectedMemory.source_type === 'pdf' && selectedMemory.pdf_data && (
                  <div style={{ marginBottom: 18, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: '#1a1040' }}>
                    <iframe src={selectedMemory.pdf_data} title={selectedMemory.title}
                      style={{ width: '100%', height: 480, border: 0, display: 'block', background: '#fff' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-2)', fontSize: 11, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                      <FileText size={11} color="#f59e0b" />
                      <span style={{ fontWeight: 700, color: 'var(--text-2)' }}>PDF embedded</span>
                      {selectedMemory.pdf_pages && <span>{selectedMemory.pdf_pages} pages</span>}
                      {selectedMemory.pdf_size_kb && <span>{selectedMemory.pdf_size_kb} KB</span>}
                      {selectedMemory.pdf_word_count && <span>~{selectedMemory.pdf_word_count.toLocaleString()} words</span>}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {selectedMemory.executive_summary && (
                    <section>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-1)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                        <Award size={14} color="#a855f7" /> Executive Summary
                      </h4>
                      <p style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: 13.5, margin: 0, padding: '12px 14px', background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.18)', borderRadius: 11 }}>
                        {selectedMemory.executive_summary}
                      </p>
                    </section>
                  )}

                  <section>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-1)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                      <Brain size={14} color="#6366f1" /> Summary
                    </h4>
                    <p style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: 13.5, margin: 0 }}>{selectedMemory.summary}</p>
                  </section>

                  {selectedMemory.action_items && selectedMemory.action_items.length > 0 && (
                    <section>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-1)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                        <ListTodo size={14} color="#22d3ee" /> Action Items
                      </h4>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {selectedMemory.action_items.map((it, i) => (
                          <li key={i} style={{ display: 'flex', gap: 9, padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                            <span style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid #22d3ee', flexShrink: 0, marginTop: 1 }} />
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-1)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                      <CheckCircle2 size={14} color="#10b981" /> Key Insights
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 8 }}>
                      {selectedMemory.key_points.map((point, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 13px', background: 'var(--surface-2)', borderRadius: 11, fontSize: 12.5, color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9.5, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                          {point}
                        </div>
                      ))}
                    </div>
                  </section>

                  {selectedMemory.glossary && selectedMemory.glossary.length > 0 && (
                    <section>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-1)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                        <BookOpen size={14} color="#f97316" /> Glossary
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {selectedMemory.glossary.map((g, i) => (
                          <div key={i} style={{ padding: '9px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                            <strong style={{ color: '#f97316', marginRight: 6 }}>{g.term}</strong>
                            <span>{g.definition}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {selectedMemory.study_questions && selectedMemory.study_questions.length > 0 && (
                    <section>
                      <h4 style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-1)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                        <MessageCircle size={14} color="#ec4899" /> Study Questions
                      </h4>
                      <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {selectedMemory.study_questions.map((q, i) => (
                          <li key={i} style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{q}</li>
                        ))}
                      </ol>
                    </section>
                  )}

                  <section>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--text-1)', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                      <Tag size={14} color="#f59e0b" /> Tags
                    </h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                      {selectedMemory.tags.map(tag => (
                        <span key={tag} style={{ padding: '4px 11px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, color: '#818cf8', fontSize: 11.5, fontWeight: 700 }}>#{tag}</span>
                      ))}
                    </div>
                  </section>

                  {(selectedMemory.source_url || true) && (
                    <div style={{ paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {selectedMemory.source_url && (
                        <a href={selectedMemory.source_url} target="_blank" rel="noopener noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#6366f1', textDecoration: 'none' }}>
                          <ExternalLink size={13} /> View Source
                        </a>
                      )}
                      <button onClick={() => { setFlashcardsMemory(selectedMemory); setSelectedMemory(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <FlipHorizontal size={13} /> Generate Flashcards
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flashcardsMemory && (
          <FlashcardModal memory={flashcardsMemory} onClose={() => setFlashcardsMemory(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default VaultView;
