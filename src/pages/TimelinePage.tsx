import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Search, Plus, Loader2, Globe, StickyNote, FileText, Brain } from 'lucide-react';
import { Youtube } from 'lucide-react';
import { motion } from 'motion/react';
import type { Memory } from '../lib/types';

const MemoryTimelineView = () => {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [filter, setFilter] = useState<'all' | 'youtube' | 'web' | 'pdf' | 'note'>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/memories?limit=50').then(r => r.ok ? r.json() : []).then(m => { setMemories(m); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = memories.filter(m =>
    (filter === 'all' || m.source_type === filter) &&
    (search === '' || m.title.toLowerCase().includes(search.toLowerCase()) || m.summary.toLowerCase().includes(search.toLowerCase()) || m.domain.toLowerCase().includes(search.toLowerCase()))
  );

  const grouped: Record<string, Memory[]> = {};
  filtered.forEach(m => {
    const d = new Date(m.created_at);
    const key = isNaN(d.getTime()) ? 'Unknown Date' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    (grouped[key] = grouped[key] || []).push(m);
  });

  const SRC_CLR: Record<string, string> = { youtube: '#ef4444', web: '#00d4ff', pdf: '#f59e0b', note: '#10b981' };
  const SRC_ICON: Record<string, any> = { youtube: Youtube, web: Globe, pdf: FileText, note: StickyNote };
  const filters = [
    { id: 'all', label: 'All', color: '#00d4ff' },
    { id: 'youtube', label: 'YouTube', color: '#ef4444' },
    { id: 'web', label: 'Web', color: '#00d4ff' },
    { id: 'pdf', label: 'PDF', color: '#f59e0b' },
    { id: 'note', label: 'Notes', color: '#10b981' },
  ];

  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, backdropFilter: 'blur(20px)' } as React.CSSProperties;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={17} color="#f472b6" />
          </div>
          <div>
            <h1 style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 700, margin: 0 }}>Memory Timeline</h1>
            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: 0 }}>Chronological view of your captured knowledge</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button onClick={() => navigate('/capture')}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', background: 'linear-gradient(135deg,#f472b6,#c026a1)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 0 20px rgba(244,114,182,0.3)', fontFamily: 'inherit' }}>
              <Plus size={14} /> Add Memory
            </button>
          </div>
        </div>
      </motion.div>

      <div style={{ ...card, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} color="#6b7280" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search memories..."
            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)}
              style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${filter === f.id ? f.color + '60' : 'var(--border)'}`, background: filter === f.id ? `${f.color}18` : 'transparent', color: filter === f.id ? f.color : 'var(--text-3)', fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: 12 }}>{filtered.length} memories</div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Loader2 size={28} color="#00d4ff" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 13 }}>Loading timeline...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ ...card, padding: '60px 0', textAlign: 'center' }}>
          <GitBranch size={40} color="#4b5563" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#6b7280', fontSize: 14 }}>No memories match this filter</p>
          <button onClick={() => navigate('/capture')} style={{ marginTop: 10, color: '#f472b6', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>Start capturing →</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: 100, top: 0, bottom: 0, width: 1, background: 'linear-gradient(180deg, rgba(244,114,182,0.4) 0%, rgba(139,92,246,0.2) 100%)', pointerEvents: 'none' }} />
          {Object.entries(grouped).map(([date, items], gi) => (
            <motion.div key={date} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: gi * 0.05 }} style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
              <div style={{ width: 100, flexShrink: 0, paddingRight: 16, paddingTop: 8, textAlign: 'right' }}>
                <span style={{ color: '#6b7280', fontSize: 11, lineHeight: 1.4 }}>{date.split(',')[0]}<br /><span style={{ color: '#4b5563', fontSize: 10 }}>{date.split(',').slice(1).join(',').trim()}</span></span>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, paddingTop: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f472b6', boxShadow: '0 0 12px rgba(244,114,182,0.6)', flexShrink: 0 }} />
              </div>
              <div style={{ flex: 1, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map(m => {
                  const Icon = SRC_ICON[m.source_type] ?? Brain;
                  const clr = SRC_CLR[m.source_type] ?? '#00d4ff';
                  return (
                    <div key={m.id} style={{ ...card, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'all 0.2s', cursor: 'default' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${clr}30`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${clr}15`, border: `1px solid ${clr}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} color={clr} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#d1d5db', fontSize: 13, fontWeight: 500, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</div>
                        <div style={{ color: '#4b5563', fontSize: 11, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.summary}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 9, color: clr, background: `${clr}15`, padding: '2px 7px', borderRadius: 20, fontWeight: 500, textTransform: 'uppercase' }}>{m.source_type}</span>
                          <span style={{ fontSize: 9, color: '#6b7280', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 20 }}>{m.domain}</span>
                          {m.tags.slice(0, 2).map(t => <span key={t} style={{ fontSize: 9, color: '#6b7280', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 20 }}>#{t}</span>)}
                        </div>
                      </div>
                    </div>
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
