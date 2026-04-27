import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Compass, Sparkles, Loader2, Search, FileText, Youtube, ExternalLink, BookmarkPlus, Globe, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getYouTubeId } from '../lib/utils';

interface DiscoverItem {
  title: string;
  url: string;
  type: 'article' | 'video';
  source: string;
  summary: string;
  domain?: string;
  youtube_id?: string;
  thumbnail?: string;
}

const SUGGESTED_TOPICS = [
  'Transformer architecture', 'RAG pipelines', 'System design',
  'Distributed systems', 'Algorithms', 'Productivity habits',
];

const DiscoverPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [topic, setTopic] = useState(params.get('topic') || '');
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'video' | 'article'>('all');
  const [savedUrls, setSavedUrls] = useState<Set<string>>(new Set());
  const [playingYt, setPlayingYt] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  const runDiscover = useCallback(async (q: string) => {
    if (!q.trim()) return;
    setIsLoading(true);
    setError('');
    setItems([]);
    setParams({ topic: q });
    try {
      const res = await fetch('/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: q.trim() })
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error || e.detail || 'Failed to load resources');
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setError('Network error — please try again');
    } finally {
      setIsLoading(false);
    }
  }, [setParams]);

  useEffect(() => {
    const initial = params.get('topic');
    if (initial) runDiscover(initial);
  }, []); // eslint-disable-line

  const handleSave = async (item: DiscoverItem) => {
    if (savedUrls.has(item.url)) return;
    try {
      const isVideo = item.type === 'video' || !!item.youtube_id;
      const res = await fetch('/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: isVideo ? 'youtube' : 'web',
          source_url: item.url,
          title: item.title,
          summary: item.summary,
          domain: item.source || item.domain || 'Other',
          tags: [topic.toLowerCase().split(/\s+/)[0]].filter(Boolean),
          key_points: [],
        })
      });
      if (res.ok) {
        setSavedUrls(prev => new Set(prev).add(item.url));
        window.dispatchEvent(new CustomEvent('recall-toast', { detail: { msg: `Saved "${item.title.slice(0, 40)}…" to Vault`, type: 'success' } }));
      }
    } catch {
      window.dispatchEvent(new CustomEvent('recall-toast', { detail: { msg: 'Save failed', type: 'error' } }));
    }
  };

  const filtered = items.filter(it => filter === 'all' || it.type === filter);
  const videoCount = items.filter(i => i.type === 'video').length;
  const articleCount = items.filter(i => i.type === 'article').length;

  const card: React.CSSProperties = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 };
  const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 16px 11px 42px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 11, color: 'var(--text-1)', fontSize: 14, outline: 'none', fontFamily: 'inherit' };

  return (
    <div style={{ color: 'var(--text-1)', padding: '14px 0' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="page-header" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg,#06b6d4,#0891b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(6,182,212,0.35)' }}>
            <Compass size={19} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>Discover</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '2px 0 0' }}>AI-curated articles and videos from external sources — save the ones that matter to your Vault</p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ ...card, padding: '18px 20px', marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-3)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="What do you want to learn? e.g., Transformer architecture, RAG…"
            style={inputStyle}
            onKeyDown={e => { if (e.key === 'Enter') runDiscover(topic); }} />
          <button onClick={() => runDiscover(topic)} disabled={!topic.trim() || isLoading}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', padding: '7px 14px', background: 'linear-gradient(135deg,#06b6d4,#0891b2)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: (!topic.trim() || isLoading) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6, opacity: (!topic.trim() || isLoading) ? 0.6 : 1 }}>
            {isLoading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={13} />}
            Discover
          </button>
        </div>

        {/* Suggested topics */}
        {!items.length && !isLoading && (
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            <span style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', alignSelf: 'center', marginRight: 4 }}>Try:</span>
            {SUGGESTED_TOPICS.map(t => (
              <button key={t} onClick={() => { setTopic(t); runDiscover(t); }}
                style={{ padding: '5px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, color: 'var(--text-2)', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {t}
              </button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Filters */}
      {items.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          {(['all', 'video', 'article'] as const).map(f => {
            const isActive = filter === f;
            const cnt = f === 'all' ? items.length : f === 'video' ? videoCount : articleCount;
            const Icon = f === 'video' ? Youtube : f === 'article' ? FileText : Sparkles;
            return (
              <button key={f} onClick={() => setFilter(f)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: isActive ? 'var(--primary-bg)' : 'var(--surface-2)', border: `1px solid ${isActive ? 'var(--primary-border)' : 'var(--border)'}`, borderRadius: 18, color: isActive ? 'var(--primary)' : 'var(--text-3)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>
                <Icon size={12} /> {f === 'all' ? 'All' : f}s · {cnt}
              </button>
            );
          })}
          <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>Topic: <strong style={{ color: 'var(--text-2)' }}>{topic}</strong></span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ ...card, padding: '14px 18px', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#fca5a5', fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ ...card, height: 280, opacity: 0.5, animation: `pulse 1.5s ease-in-out ${i * 0.08}s infinite` }} />
          ))}
        </div>
      )}

      {/* Results grid */}
      {!isLoading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          <AnimatePresence>
            {filtered.map((item, i) => {
              const isVideo = item.type === 'video' || !!item.youtube_id;
              const ytId = item.youtube_id || (isVideo ? getYouTubeId(item.url) : null);
              const isSaved = savedUrls.has(item.url);
              const isPlaying = ytId ? playingYt.has(item.url) : false;
              return (
                <motion.div key={item.url} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.03 }}
                  style={{ ...card, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderColor: ytId ? 'rgba(239,68,68,0.22)' : 'var(--border)' }}>
                  {/* Thumbnail / player */}
                  {ytId ? (
                    isPlaying ? (
                      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
                        <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`} title={item.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
                        <button onClick={(e) => { e.stopPropagation(); setPlayingYt(prev => { const n = new Set(prev); n.delete(item.url); return n; }); }}
                          style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, zIndex: 2 }}>
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setPlayingYt(prev => { const n = new Set(prev); n.add(item.url); return n; })}
                        title={`Play "${item.title}"`} aria-label={`Play ${item.title}`}
                        style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000', overflow: 'hidden', border: 0, padding: 0, cursor: 'pointer', display: 'block' }}>
                        <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" loading="lazy"
                          onError={e => { (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`; }}
                          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                          <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(239,68,68,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(239,68,68,0.5)' }}>
                            <svg viewBox="0 0 24 24" fill="white" width="18" height="18"><path d="M8 5v14l11-7z" /></svg>
                          </div>
                        </div>
                        <div style={{ position: 'absolute', top: 6, left: 6, padding: '2px 7px', background: 'rgba(239,68,68,0.92)', borderRadius: 3, color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', pointerEvents: 'none' }}>YOUTUBE</div>
                      </button>
                    )
                  ) : (
                    <div style={{ position: 'relative', width: '100%', paddingBottom: '40%', background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(99,102,241,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={36} color="rgba(255,255,255,0.4)" />
                      </div>
                      <div style={{ position: 'absolute', top: 6, left: 6, padding: '2px 7px', background: 'rgba(6,182,212,0.92)', borderRadius: 3, color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '0.8px' }}>ARTICLE</div>
                      <div style={{ position: 'absolute', bottom: 6, right: 8, color: 'rgba(255,255,255,0.65)', fontSize: 9.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Globe size={9} /> {item.domain || item.source}
                      </div>
                    </div>
                  )}

                  {/* Body */}
                  <div style={{ padding: '11px 14px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.source || item.domain}</div>
                    <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, lineHeight: 1.3, color: 'var(--text-1)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h4>
                    {item.summary && (
                      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-3)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.summary}</p>
                    )}
                    <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 8 }}>
                      <a href={item.url} target="_blank" rel="noreferrer"
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 11, fontWeight: 700, textDecoration: 'none', fontFamily: 'inherit' }}>
                        <ExternalLink size={11} /> Open
                      </a>
                      <button onClick={() => handleSave(item)} disabled={isSaved}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '6px 10px', background: isSaved ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', border: isSaved ? '1px solid rgba(16,185,129,0.4)' : 'none', borderRadius: 8, color: isSaved ? '#10b981' : '#fff', fontSize: 11, fontWeight: 700, cursor: isSaved ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                        <BookmarkPlus size={11} /> {isSaved ? 'Saved' : 'Save to Vault'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && !error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          style={{ ...card, borderStyle: 'dashed', padding: '60px 24px', textAlign: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: 14, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Compass size={28} color="#22d3ee" />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>Discover external knowledge</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 12.5, margin: '0 auto', maxWidth: 420, lineHeight: 1.55 }}>
            Type a topic above. The AI will surface high-signal articles and YouTube videos from reputable sources — you can play videos right here and save the best ones to your Vault with one click.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default DiscoverPage;
