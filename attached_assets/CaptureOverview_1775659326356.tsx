import { useState, useEffect, useCallback } from 'react';
import {
  Youtube, Globe, FileText, StickyNote, Image, Mic,
  Search, Filter, Trash2, RefreshCw, Plus, Brain,
  CheckCircle2, Clock, Tag, Zap, AlertTriangle,
  ChevronDown, X, Loader, ShieldCheck, TrendingUp,
  BarChart2, Library
} from 'lucide-react';
import { Link } from 'react-router';
import { useWindowSize } from '../hooks/useWindowSize';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-c294fbf1`;
const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

type SourceType = 'youtube' | 'web' | 'pdf' | 'note' | 'image' | 'audio';

const SOURCE_META: Record<string, { icon: any; color: string; label: string }> = {
  youtube: { icon: Youtube,    color: '#ff4444', label: 'YouTube'    },
  web:     { icon: Globe,      color: '#00d4ff', label: 'Webpage'    },
  pdf:     { icon: FileText,   color: '#f59e0b', label: 'PDF / Doc'  },
  note:    { icon: StickyNote, color: '#8b5cf6', label: 'Quick Note' },
  image:   { icon: Image,      color: '#f472b6', label: 'Image'      },
  audio:   { icon: Mic,        color: '#10b981', label: 'Audio'      },
};

interface Capture {
  id: string;
  type: SourceType;
  title: string;
  source: string;
  content: string;
  tags: string[];
  securityScore: number;
  insights: number;
  status: string;
  createdAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

type SortKey = 'newest' | 'oldest' | 'score' | 'insights';
type ViewMode = 'grid' | 'list';

export function CaptureOverview() {
  const { isMobile, isTablet } = useWindowSize();
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [view, setView] = useState<ViewMode>('grid');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const fetchCaptures = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/captures`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch captures');
      setCaptures(data.captures || []);
    } catch (e: any) {
      console.error('Fetch captures error:', e);
      setError(e.message || 'Failed to load captures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCaptures(); }, [fetchCaptures]);

  const deleteCapture = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`${API}/captures/${id}`, { method: 'DELETE', headers: authHeaders });
      if (!res.ok) throw new Error('Delete failed');
      setCaptures(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      console.error('Delete error:', e);
    } finally {
      setDeleting(null);
    }
  };

  // All tags from all captures
  const allTags = [...new Set(captures.flatMap(c => c.tags || []))];

  // Filter + sort
  const filtered = captures
    .filter(c => {
      if (filterType !== 'all' && c.type !== filterType) return false;
      if (selectedTags.length > 0 && !selectedTags.every(t => c.tags?.includes(t))) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.title.toLowerCase().includes(q) || c.source.toLowerCase().includes(q) || (c.tags || []).some(t => t.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      if (sortKey === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortKey === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === 'score') return (b.securityScore ?? 0) - (a.securityScore ?? 0);
      if (sortKey === 'insights') return (b.insights ?? 0) - (a.insights ?? 0);
      return 0;
    });

  // Stats
  const totalInsights = captures.reduce((s, c) => s + (c.insights || 0), 0);
  const avgScore = captures.length > 0 ? Math.round(captures.reduce((s, c) => s + (c.securityScore || 0), 0) / captures.length) : 0;
  const typeCounts = captures.reduce((acc, c) => { acc[c.type] = (acc[c.type] || 0) + 1; return acc; }, {} as Record<string, number>);
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const gridCols = isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 18 : 24 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="fade-in-up">
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: isMobile ? 22 : 26, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
              Capture Library
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              {captures.length} knowledge captures · All synced to your neural memory bank
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={fetchCaptures}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}
            >
              <RefreshCw size={14} />
              {!isMobile && 'Refresh'}
            </button>
            <Link to="/app/capture"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer', boxShadow: '0 0 20px rgba(139,92,246,0.35)' }}
            >
              <Plus size={14} /> New Capture
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total Captures', value: String(captures.length), icon: Library,      color: '#00d4ff', sub: 'In memory bank' },
          { label: 'Total Insights',  value: String(totalInsights),   icon: Brain,        color: '#8b5cf6', sub: 'Neural connections' },
          { label: 'Avg Trust Score', value: `${avgScore}%`,          icon: ShieldCheck,  color: '#10b981', sub: 'Security verified' },
          { label: 'Top Source',      value: topType ? SOURCE_META[topType[0]]?.label || topType[0] : '—', icon: TrendingUp, color: '#f59e0b', sub: topType ? `${topType[1]} captures` : 'No data yet' },
        ].map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="rs-card" style={{ padding: '16px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: `${color}12`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color, fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{value}</div>
              <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 500, marginTop: 2 }}>{label}</div>
              <div style={{ color: '#4b5563', fontSize: 11, marginTop: 1 }}>{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Source type filter pills ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['all', ...Object.keys(SOURCE_META)].map(type => {
          const active = filterType === type;
          const meta = type === 'all' ? null : SOURCE_META[type];
          const count = type === 'all' ? captures.length : (typeCounts[type] || 0);
          return (
            <button key={type} onClick={() => setFilterType(type)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: active ? 600 : 400, transition: 'all 0.2s',
                background: active ? (meta ? `${meta.color}18` : 'rgba(0,212,255,0.12)') : 'rgba(255,255,255,0.04)',
                color: active ? (meta ? meta.color : '#00d4ff') : '#6b7280',
                boxShadow: active ? `0 0 14px ${meta ? meta.color : '#00d4ff'}20` : 'none',
                borderWidth: 1, borderStyle: 'solid',
                borderColor: active ? (meta ? `${meta.color}35` : 'rgba(0,212,255,0.3)') : 'rgba(255,255,255,0.07)',
              }}
            >
              {meta && <meta.icon size={12} />}
              {type === 'all' ? 'All Sources' : meta?.label}
              <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '1px 6px', fontSize: 10 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ── Search + controls ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '9px 14px' }}>
          <Search size={14} color="#4b5563" />
          <input
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: 14 }}
            placeholder="Search captures, tags, sources..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '9px 14px', cursor: 'pointer', position: 'relative' }}>
          <Filter size={13} color="#6b7280" />
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            style={{ background: 'transparent', border: 'none', outline: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer', appearance: 'none' }}
          >
            <option value="newest" style={{ background: '#0f0f1f' }}>Newest first</option>
            <option value="oldest" style={{ background: '#0f0f1f' }}>Oldest first</option>
            <option value="score"  style={{ background: '#0f0f1f' }}>Trust score</option>
            <option value="insights" style={{ background: '#0f0f1f' }}>Most insights</option>
          </select>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, overflow: 'hidden' }}>
          {(['grid', 'list'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: '9px 14px', border: 'none', cursor: 'pointer', fontSize: 12, transition: 'all 0.2s', background: view === v ? 'rgba(0,212,255,0.12)' : 'transparent', color: view === v ? '#00d4ff' : '#6b7280' }}
            >
              {v === 'grid' ? '⊞ Grid' : '≡ List'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tag filter chips ─────────────────────────────────────────────────── */}
      {allTags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ color: '#4b5563', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={10} /> Tags:</span>
          {allTags.map(tag => {
            const active = selectedTags.includes(tag);
            return (
              <button key={tag} onClick={() => toggleTag(tag)}
                style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${active ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.08)'}`, background: active ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.03)', color: active ? '#8b5cf6' : '#6b7280', fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                #{tag}
              </button>
            );
          })}
          {selectedTags.length > 0 && (
            <button onClick={() => setSelectedTags([])} style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.07)', color: '#ef4444', fontSize: 11, cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '80px 20px' }}>
          <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader size={22} color="#00d4ff" style={{ animation: 'rotate-slow 1s linear infinite' }} />
          </div>
          <span style={{ color: '#6b7280', fontSize: 14 }}>Loading captures from memory bank...</span>
        </div>
      ) : error ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '60px 20px' }}>
          <AlertTriangle size={32} color="#f59e0b" />
          <div style={{ color: '#f59e0b', fontSize: 14, fontWeight: 600 }}>Failed to load captures</div>
          <div style={{ color: '#6b7280', fontSize: 13 }}>{error}</div>
          <button onClick={fetchCaptures} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(0,212,255,0.25)', background: 'rgba(0,212,255,0.08)', color: '#00d4ff', fontSize: 13, cursor: 'pointer' }}>
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Library size={28} color="#8b5cf6" />
          </div>
          <div>
            <div style={{ color: '#d1d5db', fontSize: 16, fontWeight: 600 }}>
              {captures.length === 0 ? 'No captures yet' : 'No results found'}
            </div>
            <div style={{ color: '#6b7280', fontSize: 13, marginTop: 5 }}>
              {captures.length === 0
                ? 'Start capturing knowledge to build your neural memory bank'
                : 'Try adjusting your search or filters'}
            </div>
          </div>
          {captures.length === 0 && (
            <Link to="/app/capture" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff', fontSize: 13, fontWeight: 600, textDecoration: 'none', boxShadow: '0 0 20px rgba(139,92,246,0.35)' }}>
              <Plus size={14} /> Make Your First Capture
            </Link>
          )}
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 14 }}>
          {filtered.map(capture => {
            const meta = SOURCE_META[capture.type] || SOURCE_META.web;
            const Icon = meta.icon;
            const scoreColor = (capture.securityScore ?? 0) >= 80 ? '#10b981' : (capture.securityScore ?? 0) >= 60 ? '#f59e0b' : '#ef4444';
            const isBeingDeleted = deleting === capture.id;
            return (
              <div key={capture.id}
                style={{
                  padding: 18, borderRadius: 14, display: 'flex', flexDirection: 'column', gap: 12,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid rgba(255,255,255,0.07)`,
                  transition: 'all 0.2s ease',
                  opacity: isBeingDeleted ? 0.5 : 1,
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${meta.color}30`; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 25px ${meta.color}08`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
              >
                {/* Accent line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${meta.color}60, transparent)` }} />

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0, flex: 1 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: `${meta.color}15`, border: `1px solid ${meta.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={16} color={meta.color} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: meta.color, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{meta.label}</div>
                      <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{capture.title}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteCapture(capture.id)}
                    disabled={isBeingDeleted}
                    style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.07)'; }}
                  >
                    {isBeingDeleted ? <Loader size={11} color="#ef4444" style={{ animation: 'rotate-slow 1s linear infinite' }} /> : <Trash2 size={11} color="#ef4444" />}
                  </button>
                </div>

                {/* Source */}
                {capture.source && (
                  <div style={{ color: '#4b5563', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {capture.source}
                  </div>
                )}

                {/* Tags */}
                {capture.tags && capture.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {capture.tags.map(tag => (
                      <span key={tag} style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: '#8b5cf6', borderRadius: 5, padding: '2px 7px', fontSize: 10 }}>
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} color="#4b5563" />
                    <span style={{ color: '#4b5563', fontSize: 10 }}>{timeAgo(capture.createdAt)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {capture.insights != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#8b5cf6', fontSize: 10 }}>
                        <Brain size={10} />
                        {capture.insights}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 5, background: `${scoreColor}12`, border: `1px solid ${scoreColor}25` }}>
                      <CheckCircle2 size={9} color={scoreColor} />
                      <span style={{ color: scoreColor, fontSize: 10, fontWeight: 600 }}>{capture.securityScore}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* List header */}
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 80px 80px 40px', gap: 12, padding: '8px 16px', color: '#4b5563', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              <span>Title</span>
              <span>Type</span>
              <span>Tags</span>
              <span>Insights</span>
              <span>Trust</span>
              <span></span>
            </div>
          )}
          {filtered.map(capture => {
            const meta = SOURCE_META[capture.type] || SOURCE_META.web;
            const Icon = meta.icon;
            const scoreColor = (capture.securityScore ?? 0) >= 80 ? '#10b981' : (capture.securityScore ?? 0) >= 60 ? '#f59e0b' : '#ef4444';
            const isBeingDeleted = deleting === capture.id;
            return (
              <div key={capture.id}
                style={{
                  display: isMobile ? 'flex' : 'grid',
                  gridTemplateColumns: '1fr 120px 80px 80px 80px 40px',
                  flexDirection: isMobile ? 'column' : undefined,
                  gap: isMobile ? 8 : 12, padding: '12px 16px', borderRadius: 11,
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
                  alignItems: 'center', transition: 'all 0.2s', opacity: isBeingDeleted ? 0.5 : 1,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${meta.color}30`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
              >
                {/* Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: `${meta.color}12`, border: `1px solid ${meta.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={14} color={meta.color} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: '#d1d5db', fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{capture.title}</div>
                    <div style={{ color: '#4b5563', fontSize: 11 }}>{timeAgo(capture.createdAt)}</div>
                  </div>
                </div>
                {/* Type */}
                <span style={{ color: meta.color, fontSize: 11, fontWeight: 600 }}>{meta.label}</span>
                {/* Tags */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(capture.tags || []).slice(0, 2).map(tag => (
                    <span key={tag} style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', borderRadius: 4, padding: '1px 5px', fontSize: 10 }}>#{tag}</span>
                  ))}
                </div>
                {/* Insights */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8b5cf6', fontSize: 12 }}>
                  <Brain size={11} /> {capture.insights ?? '—'}
                </div>
                {/* Score */}
                <div style={{ color: scoreColor, fontSize: 12, fontWeight: 700 }}>{capture.securityScore ?? '—'}%</div>
                {/* Delete */}
                <button
                  onClick={() => deleteCapture(capture.id)}
                  disabled={isBeingDeleted}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}
                >
                  {isBeingDeleted ? <Loader size={12} style={{ animation: 'rotate-slow 1s linear infinite' }} /> : <Trash2 size={13} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Results count ─────────────────────────────────────────────────────── */}
      {!loading && !error && filtered.length > 0 && (
        <div style={{ textAlign: 'center', color: '#4b5563', fontSize: 12 }}>
          Showing {filtered.length} of {captures.length} captures
        </div>
      )}
    </div>
  );
}