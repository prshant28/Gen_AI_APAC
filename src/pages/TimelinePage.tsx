import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Search, Plus, Loader2, Globe, StickyNote, FileText, Brain, Youtube } from 'lucide-react';
import { motion } from 'motion/react';
import type { Memory } from '../lib/types';

const SRC_CLR: Record<string, string> = { youtube: '#ef4444', web: '#00d4ff', pdf: '#f59e0b', note: '#10b981' };
const SRC_ICON: Record<string, any> = { youtube: Youtube, web: Globe, pdf: FileText, note: StickyNote };

const FILTERS = [
  { id: 'all',     label: 'All',     color: '#f472b6' },
  { id: 'youtube', label: 'YouTube', color: '#ef4444' },
  { id: 'web',     label: 'Web',     color: '#00d4ff' },
  { id: 'pdf',     label: 'PDF',     color: '#f59e0b' },
  { id: 'note',    label: 'Notes',   color: '#10b981' },
];

const MemoryTimelineView = () => {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/memories?limit=50')
      .then(r => r.ok ? r.json() : [])
      .then(m => { setMemories(m); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = memories.filter(m =>
    (filter === 'all' || m.source_type === filter) &&
    (search === '' ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.summary.toLowerCase().includes(search.toLowerCase()) ||
      m.domain.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped: Record<string, Memory[]> = {};
  filtered.forEach(m => {
    const d = new Date(m.created_at);
    const key = isNaN(d.getTime())
      ? 'Unknown Date'
      : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    (grouped[key] = grouped[key] || []).push(m);
  });

  const card: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    transition: 'all 0.18s',
  };

  return (
    <div style={{ color: 'var(--text-1)' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <GitBranch size={17} color="#f472b6" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>Memory Timeline</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '2px 0 0' }}>
              Chronological view of your captured knowledge · <strong style={{ color: '#f472b6' }}>{filtered.length}</strong> memories
            </p>
          </div>
        </div>
        <button onClick={() => navigate('/capture')}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'linear-gradient(135deg,#f472b6,#c026a1)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(244,114,182,0.35)', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
          <Plus size={14} /> Add Memory
        </button>
      </div>

      {/* Search + filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ ...card, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={13} color="var(--text-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search timeline…"
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${filter === f.id ? f.color + '55' : 'var(--border)'}`, background: filter === f.id ? `${f.color}18` : 'transparent', color: filter === f.id ? f.color : 'var(--text-3)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
              {f.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <div className="loading-center">
          <Loader2 size={28} color="#f472b6" style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>Loading timeline…</p>
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="empty-state" style={{ ...card }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(244,114,182,0.1)', border: '1px solid rgba(244,114,182,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={24} color="#f472b6" />
          </div>
          <div>
            <p style={{ color: 'var(--text-1)', fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>No memories found</p>
            <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>
              {search || filter !== 'all' ? 'Try adjusting your filters' : 'Start capturing to build your timeline'}
            </p>
          </div>
          <button onClick={() => navigate('/capture')}
            style={{ padding: '8px 20px', background: 'linear-gradient(135deg,#f472b6,#c026a1)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Capture Knowledge →
          </button>
        </motion.div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div className="timeline-line" style={{ position: 'absolute', left: 100, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg,rgba(244,114,182,0.4) 0%,rgba(139,92,246,0.15) 100%)', pointerEvents: 'none' }} />

          {Object.entries(grouped).map(([date, items], gi) => (
            <motion.div key={date} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: gi * 0.04 }}
              style={{ display: 'flex', gap: 0, marginBottom: 28 }}>

              <div className="timeline-date-col" style={{ width: 100, flexShrink: 0, paddingRight: 16, paddingTop: 10, textAlign: 'right' }}>
                <span style={{ color: 'var(--text-2)', fontSize: 11, lineHeight: 1.4, display: 'block' }}>
                  {date.split(',')[0]}
                </span>
                <span style={{ color: 'var(--text-3)', fontSize: 10 }}>
                  {date.split(',').slice(1).join(',').trim()}
                </span>
              </div>

              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, zIndex: 1 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f472b6', boxShadow: '0 0 10px rgba(244,114,182,0.6)', flexShrink: 0 }} />
              </div>

              <div style={{ flex: 1, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                {items.map(m => {
                  const Icon = SRC_ICON[m.source_type] ?? Brain;
                  const clr = SRC_CLR[m.source_type] ?? '#6366f1';
                  return (
                    <motion.div key={m.id} whileHover={{ x: 2 }}
                      style={{ ...card, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${clr}35`; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 16px ${clr}10`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: `${clr}15`, border: `1px solid ${clr}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} color={clr} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--text-1)', fontSize: 13, fontWeight: 600, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                        <div style={{ color: 'var(--text-3)', fontSize: 11, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.summary}</div>
                        <div style={{ display: 'flex', gap: 5, marginTop: 7, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9.5, color: clr, background: `${clr}15`, padding: '2px 8px', borderRadius: 20, fontWeight: 600, textTransform: 'uppercase' }}>{m.source_type}</span>
                          <span style={{ fontSize: 9.5, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>{m.domain}</span>
                          {m.tags.slice(0, 2).map(t => (
                            <span key={t} style={{ fontSize: 9.5, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 20, border: '1px solid var(--border)' }}>#{t}</span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
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

export default MemoryTimelineView;
