import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark, Plus, Search, Trash2, ExternalLink, Globe, Tag as TagIcon,
  CheckCircle2, Clock, BookOpen, Filter, Hash, X, Link as LinkIcon,
  Star, Eye, Archive, Youtube, Play, CheckSquare, Square, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getYouTubeId } from '../lib/utils';
import { showToast } from '../App';

interface BM {
  id: string;
  url: string;
  title: string;
  description: string;
  domain: string;
  tags: string[];
  status: 'unread' | 'reading' | 'done';
  created_at: string;
  favicon: string;
}

const STATUS_META = {
  unread: { color: '#3b82f6', label: 'Unread', icon: Clock },
  reading: { color: '#f59e0b', label: 'Reading', icon: BookOpen },
  done: { color: '#10b981', label: 'Done', icon: CheckCircle2 },
};

interface BookmarksPageProps { embedded?: boolean }
const BookmarksPage: React.FC<BookmarksPageProps> = ({ embedded = false }) => {
  const [items, setItems] = useState<BM[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [tagPrompt, setTagPrompt] = useState<null | 'add' | 'remove'>(null);
  const [tagPromptInput, setTagPromptInput] = useState('');

  const load = () => {
    fetch('/bookmarks').then(r => r.json()).then((data: BM[]) => {
      setItems(data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const domains = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach(i => { map[i.domain] = (map[i.domain] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter(i => {
      if (statusFilter && i.status !== statusFilter) return false;
      if (domainFilter && i.domain !== domainFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!i.title.toLowerCase().includes(q) && !i.url.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q) && !i.tags.some(t => t.includes(q))) return false;
      }
      return true;
    });
  }, [items, search, statusFilter, domainFilter]);

  const counts = {
    all: items.length,
    unread: items.filter(i => i.status === 'unread').length,
    reading: items.filter(i => i.status === 'reading').length,
    done: items.filter(i => i.status === 'done').length,
  };

  const addBookmark = async () => {
    if (!newUrl.trim()) return;
    const tags = newTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    await fetch('/bookmarks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newUrl, title: newTitle, tags })
    });
    setNewUrl(''); setNewTitle(''); setNewTags(''); setShowAdd(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/bookmarks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    setItems(items.map(i => i.id === id ? { ...i, status: status as any } : i));
  };

  const deleteBM = async (id: string) => {
    if (!confirm('Move this bookmark to Trash?')) return;
    await fetch(`/bookmarks/${id}`, { method: 'DELETE' });
    setItems(items.filter(i => i.id !== id));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const exitSelect = () => { setSelectMode(false); setSelectedIds(new Set()); setTagPrompt(null); };

  const bulkApi = async (path: string, body: any, okMsg: string) => {
    setBulkBusy(true);
    try {
      const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok) throw new Error('bulk failed');
      showToast(okMsg);
      load();
      exitSelect();
    } catch {
      showToast('Bulk action failed');
    } finally { setBulkBusy(false); }
  };

  const bulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Move ${selectedIds.size} bookmarks to Trash?`)) return;
    bulkApi('/library/bulk-delete', { entity: 'bookmark', ids: Array.from(selectedIds) }, 'Moved to Trash');
  };

  const bulkArchive = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Archive ${selectedIds.size} bookmarks? They get hidden from the main list but stay searchable.`)) return;
    bulkApi('/library/bulk-archive', { entity: 'bookmark', ids: Array.from(selectedIds), archived: true }, 'Archived');
  };

  const bulkTagAdd = () => {
    const tags = tagPromptInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (!tags.length || selectedIds.size === 0) return;
    bulkApi('/library/bulk-tag-add', { entity: 'bookmark', ids: Array.from(selectedIds), tags }, 'Tags added');
    setTagPromptInput('');
  };

  const bulkTagRemove = () => {
    const tags = tagPromptInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    if (!tags.length || selectedIds.size === 0) return;
    bulkApi('/library/bulk-tag-remove', { entity: 'bookmark', ids: Array.from(selectedIds), tags }, 'Tags removed');
    setTagPromptInput('');
  };

  const bulkExport = () => {
    if (selectedIds.size === 0) return;
    const chosen = items.filter(i => selectedIds.has(i.id));
    const text = chosen.map(b => `- [${b.title}](${b.url})${b.tags.length ? '  ' + b.tags.map(t => '#' + t).join(' ') : ''}`).join('\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `bookmarks-export-${Date.now()}.md`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    showToast(`Exported ${chosen.length} bookmarks`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '14px 0 28px', minHeight: 'calc(100vh - 5rem)' }}>

      {/* HERO HEADER */}
      {!embedded && (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, rgba(236,72,153,0.25), rgba(219,39,119,0.18))', border: '1px solid rgba(236,72,153,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px rgba(236,72,153,0.2)' }}>
              <Bookmark size={24} color="#ec4899" />
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: 20, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#ec4899', letterSpacing: '0.5px' }}>{counts.all} BOOKMARKS · READ-LATER QUEUE</span>
              </div>
              <h2 style={{ fontSize: 'clamp(22px,3.5vw,30px)', fontWeight: 900, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.6px', lineHeight: 1.05 }}>
                Bookmarks <span style={{ color: '#ec4899' }}>✦</span>
              </h2>
              <p style={{ color: 'var(--text-3)', fontSize: 13.5, margin: '4px 0 0' }}>
                Save links now, read later. Tag, organise and convert into memories
              </p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: 'linear-gradient(135deg,#ec4899,#db2777)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(236,72,153,0.4)' }}>
            <Plus size={14} /> Add bookmark
          </button>
        </div>

        {/* Stats strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {[
            { icon: LinkIcon, color: '#a78bfa', label: 'Total saved', value: counts.all },
            { icon: Clock, color: '#3b82f6', label: 'Unread', value: counts.unread },
            { icon: BookOpen, color: '#f59e0b', label: 'Reading', value: counts.reading },
            { icon: CheckCircle2, color: '#10b981', label: 'Completed', value: counts.done },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${stat.color}15`, border: `1px solid ${stat.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <stat.icon size={18} color={stat.color} />
              </div>
              <div>
                <div style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>{stat.label}</div>
                <div style={{ color: 'var(--text-1)', fontSize: 22, fontWeight: 800, lineHeight: 1.1 }}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {!embedded ? null : (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', background: 'linear-gradient(135deg,#ec4899,#db2777)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={13} /> Add bookmark
          </button>
        </div>
      )}

      {/* FILTERS */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px', position: 'relative', minWidth: 200 }}>
            <Search size={13} color="var(--text-3)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search title, URL, tags..."
              style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 12.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          {(['', 'unread', 'reading', 'done'] as const).map(s => {
            const meta = s ? STATUS_META[s as 'unread' | 'reading' | 'done'] : { color: '#a78bfa', label: 'All', icon: Filter };
            const Icon = meta.icon;
            return (
              <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: statusFilter === s ? `${meta.color}15` : 'transparent', border: `1px solid ${statusFilter === s ? meta.color + '50' : 'var(--border)'}`, borderRadius: 9, color: statusFilter === s ? meta.color : 'var(--text-2)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Icon size={11} /> {meta.label}
              </button>
            );
          })}
          <button onClick={() => { if (selectMode) exitSelect(); else setSelectMode(true); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: selectMode ? 'var(--primary-bg)' : 'transparent', border: `1px solid ${selectMode ? 'var(--primary-border)' : 'var(--border)'}`, borderRadius: 9, color: selectMode ? 'var(--primary)' : 'var(--text-2)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {selectMode ? <CheckSquare size={11} /> : <Square size={11} />}
            {selectMode ? `Selected: ${selectedIds.size}` : 'Select'}
          </button>
          {selectMode && filtered.length > 0 && (
            <button onClick={() => {
              const allIds = new Set(filtered.map(i => i.id));
              setSelectedIds(selectedIds.size === filtered.length ? new Set() : allIds);
            }}
              style={{ padding: '7px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-2)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              {selectedIds.size === filtered.length ? 'Clear' : 'Select all'}
            </button>
          )}
        </div>

        {selectMode && selectedIds.size > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: 10, background: 'var(--surface-2)', border: '1px solid var(--primary-border)', borderRadius: 10 }}>
            <span style={{ color: 'var(--primary)', fontSize: 11.5, fontWeight: 700, marginRight: 4 }}>{selectedIds.size} selected:</span>
            <button onClick={bulkDelete} disabled={bulkBusy}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: bulkBusy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              <Trash2 size={11} /> Trash
            </button>
            <button onClick={() => { setTagPrompt('add'); setTagPromptInput(''); }} disabled={bulkBusy}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 11, fontWeight: 700, cursor: bulkBusy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              <TagIcon size={11} /> Add tags
            </button>
            <button onClick={() => { setTagPrompt('remove'); setTagPromptInput(''); }} disabled={bulkBusy}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 11, fontWeight: 700, cursor: bulkBusy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              <X size={11} /> Remove tags
            </button>
            <button onClick={bulkArchive} disabled={bulkBusy} title="Archive — hidden from main list, still searchable"
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8, color: '#a855f7', fontSize: 11, fontWeight: 700, cursor: bulkBusy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              <Archive size={11} /> Archive
            </button>
            <button onClick={bulkExport} disabled={bulkBusy}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 11, fontWeight: 700, cursor: bulkBusy ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              <Download size={11} /> Export
            </button>
            {tagPrompt && (
              <div style={{ display: 'flex', gap: 4, marginLeft: 6 }}>
                <input autoFocus value={tagPromptInput} onChange={e => setTagPromptInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { tagPrompt === 'add' ? bulkTagAdd() : bulkTagRemove(); } }}
                  placeholder="tag1, tag2"
                  style={{ width: 140, padding: '5px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-1)', fontSize: 11, outline: 'none', fontFamily: 'inherit' }} />
                <button onClick={tagPrompt === 'add' ? bulkTagAdd : bulkTagRemove} disabled={!tagPromptInput.trim()}
                  style={{ padding: '5px 12px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 7, color: 'var(--primary)', fontSize: 11, fontWeight: 700, cursor: tagPromptInput.trim() ? 'pointer' : 'default', fontFamily: 'inherit', opacity: tagPromptInput.trim() ? 1 : 0.5 }}>OK</button>
              </div>
            )}
          </div>
        )}
        {domains.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Domain:</span>
            <button onClick={() => setDomainFilter(null)} style={{ padding: '3px 9px', background: !domainFilter ? 'var(--primary-bg)' : 'transparent', border: `1px solid ${!domainFilter ? 'var(--primary-border)' : 'var(--border)'}`, borderRadius: 11, color: !domainFilter ? 'var(--primary)' : 'var(--text-3)', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>All ({items.length})</button>
            {domains.slice(0, 8).map(([d, c]) => (
              <button key={d} onClick={() => setDomainFilter(domainFilter === d ? null : d)} style={{ padding: '3px 9px', background: domainFilter === d ? 'var(--primary-bg)' : 'transparent', border: `1px solid ${domainFilter === d ? 'var(--primary-border)' : 'var(--border)'}`, borderRadius: 11, color: domainFilter === d ? 'var(--primary)' : 'var(--text-3)', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>{d} ({c})</button>
            ))}
          </div>
        )}
      </div>

      {/* LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>Loading bookmarks...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
            <Bookmark size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>No bookmarks found</p>
            <p style={{ margin: '4px 0 12px', fontSize: 11.5 }}>Try changing filters or add your first bookmark</p>
            <button onClick={() => setShowAdd(true)} style={{ padding: '7px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 9, color: 'var(--primary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Add bookmark</button>
          </div>
        ) : filtered.map(bm => {
          const meta = STATUS_META[bm.status] || STATUS_META.unread;
          const StatusIcon = meta.icon;
          const ytId = getYouTubeId(bm.url);
          const isSel = selectedIds.has(bm.id);
          return (
            <motion.div key={bm.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -1 }}
              onClick={() => { if (selectMode) toggleSelect(bm.id); }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: selectMode && isSel ? 'rgba(99,102,241,0.08)' : 'var(--surface)', border: `1px solid ${selectMode && isSel ? 'var(--primary)' : ytId ? 'rgba(239,68,68,0.22)' : 'var(--border)'}`, borderRadius: 12, transition: 'all 0.15s', cursor: selectMode ? 'pointer' : 'default' }}>
              {selectMode && (
                <button onClick={e => { e.stopPropagation(); toggleSelect(bm.id); }}
                  style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}>
                  {isSel ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-3)" />}
                </button>
              )}
              {ytId ? (
                <a href={bm.url} target="_blank" rel="noreferrer" title={`Play "${bm.title}" on YouTube`}
                  style={{ position: 'relative', width: 96, height: 54, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#000', display: 'block', textDecoration: 'none' }}>
                  <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={bm.title} loading="lazy"
                    onError={e => { (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(239,68,68,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Play size={11} color="#fff" fill="#fff" style={{ marginLeft: 1 }} />
                    </div>
                  </div>
                  <span style={{ position: 'absolute', top: 3, left: 3, padding: '1px 5px', background: 'rgba(239,68,68,0.92)', borderRadius: 3, color: '#fff', fontSize: 7.5, fontWeight: 700, letterSpacing: '0.5px', lineHeight: 1.1 }}>YT</span>
                </a>
              ) : (
                <img src={bm.favicon} alt="" style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', flexShrink: 0 }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <a href={bm.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-1)', fontSize: 13.5, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, minWidth: 0 }}>
                    {bm.title}
                  </a>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 8px', background: `${meta.color}15`, border: `1px solid ${meta.color}30`, borderRadius: 10, color: meta.color, fontSize: 9.5, fontWeight: 700 }}>
                    <StatusIcon size={9} /> {meta.label}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 11 }}>
                  <Globe size={10} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>{bm.url}</span>
                  {bm.tags.length > 0 && <>
                    <span>·</span>
                    {bm.tags.slice(0, 3).map(t => <span key={t} style={{ color: 'var(--primary)' }}>#{t}</span>)}
                  </>}
                </div>
                {bm.description && <p style={{ margin: '4px 0 0', color: 'var(--text-3)', fontSize: 11.5, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{bm.description}</p>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <select value={bm.status} onChange={e => updateStatus(bm.id, e.target.value)}
                  style={{ padding: '5px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-1)', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                  <option value="unread">Unread</option>
                  <option value="reading">Reading</option>
                  <option value="done">Done</option>
                </select>
                <a href={bm.url} target="_blank" rel="noreferrer" title="Open" style={{ padding: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-2)', display: 'flex', textDecoration: 'none' }}>
                  <ExternalLink size={11} />
                </a>
                <button onClick={() => deleteBM(bm.id)} title="Delete" style={{ padding: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 7, color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
                  <Trash2 size={11} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ADD MODAL */}
      <AnimatePresence>
        {showAdd && (
          <div onClick={() => setShowAdd(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9000, padding: 20 }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={e => e.stopPropagation()}
              style={{ background: 'var(--surface)', border: '1px solid rgba(236,72,153,0.4)', borderRadius: 16, padding: '22px 24px', maxWidth: 460, width: '100%' }}>
              <h3 style={{ margin: '0 0 14px', color: 'var(--text-1)', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={16} color="#ec4899" /> Add bookmark
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'URL *', value: newUrl, set: setNewUrl, ph: 'https://example.com/article' },
                  { label: 'Title (optional)', value: newTitle, set: setNewTitle, ph: 'Auto-detected from URL' },
                  { label: 'Tags (comma-separated)', value: newTags, set: setNewTags, ph: 'ai, research, important' },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5, display: 'block' }}>{f.label}</label>
                    <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 9, color: 'var(--text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={addBookmark} disabled={!newUrl.trim()} style={{ flex: 2, padding: '10px', background: newUrl.trim() ? 'linear-gradient(135deg,#ec4899,#db2777)' : 'var(--surface-3)', border: 'none', borderRadius: 9, color: '#fff', fontSize: 12.5, fontWeight: 700, cursor: newUrl.trim() ? 'pointer' : 'default', fontFamily: 'inherit', opacity: newUrl.trim() ? 1 : 0.5 }}>Save bookmark</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookmarksPage;
