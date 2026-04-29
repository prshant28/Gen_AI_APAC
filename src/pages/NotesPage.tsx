import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StickyNote, Plus, Search, Pin, PinOff, Trash2, Save, Edit3, X,
  Eye, Code, Tag as TagIcon, FileText, Sparkles, Calendar as CalendarIcon,
  Hash, Filter, Type, ChevronRight, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  created_at: string;
  updated_at: string;
  word_count: number;
}

const renderMarkdown = (md: string): string => {
  if (!md) return '<p style="color:var(--text-3);font-style:italic">Start writing...</p>';
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.*)$/gm, '<h3 style="font-size:15px;font-weight:800;color:var(--text-1);margin:16px 0 6px">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 style="font-size:17px;font-weight:800;color:var(--text-1);margin:18px 0 8px">$1</h2>')
    .replace(/^# (.*)$/gm, '<h1 style="font-size:20px;font-weight:900;color:var(--text-1);margin:20px 0 10px;letter-spacing:-0.4px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-1);font-weight:700">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:var(--text-1)">$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:var(--surface-2);padding:1px 6px;border-radius:5px;font-family:JetBrains Mono,monospace;font-size:12px;color:var(--primary)">$1</code>')
    .replace(/^\- (.*)$/gm, '<li style="margin-left:18px;margin-bottom:4px;color:var(--text-2)">$1</li>')
    .replace(/^\d+\. (.*)$/gm, '<li style="margin-left:18px;margin-bottom:4px;color:var(--text-2);list-style-type:decimal">$1</li>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--primary);text-decoration:underline">$1</a>')
    .replace(/\n\n/g, '</p><p style="margin:8px 0;color:var(--text-2);line-height:1.6">')
    .replace(/\n/g, '<br/>');
  return `<p style="margin:8px 0;color:var(--text-2);line-height:1.6">${html}</p>`;
};

interface NotesPageProps { embedded?: boolean }
const NotesPage: React.FC<NotesPageProps> = ({ embedded = false }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [view, setView] = useState<'edit' | 'preview' | 'split'>('split');
  const [draft, setDraft] = useState({ title: '', content: '', tags: [] as string[] });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotes = useCallback(() => {
    fetch('/notes').then(r => r.json()).then((data: Note[]) => {
      setNotes(data);
      if (data.length && !selectedId) setSelectedId(data[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => { loadNotes(); }, []);

  const selected = useMemo(() => notes.find(n => n.id === selectedId) || null, [notes, selectedId]);

  useEffect(() => {
    if (selected) setDraft({ title: selected.title, content: selected.content, tags: selected.tags });
  }, [selectedId]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    notes.forEach(n => n.tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    return notes.filter(n => {
      if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.content.toLowerCase().includes(search.toLowerCase())) return false;
      if (tagFilter && !n.tags.includes(tagFilter)) return false;
      return true;
    });
  }, [notes, search, tagFilter]);

  const saveNote = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await fetch(`/notes/${selected.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
      loadNotes();
    } finally { setTimeout(() => setSaving(false), 400); }
  };

  // Auto-save
  useEffect(() => {
    if (!selected) return;
    if (draft.title === selected.title && draft.content === selected.content && JSON.stringify(draft.tags) === JSON.stringify(selected.tags)) return;
    const t = setTimeout(saveNote, 800);
    return () => clearTimeout(t);
  }, [draft.title, draft.content, draft.tags]);

  const createNew = async () => {
    const r = await fetch('/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Untitled note', content: '', tags: [] }) });
    const newNote = await r.json();
    setNotes([newNote, ...notes]);
    setSelectedId(newNote.id);
  };

  const togglePin = async (id: string, current: boolean) => {
    await fetch(`/notes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pinned: !current }) });
    loadNotes();
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await fetch(`/notes/${id}`, { method: 'DELETE' });
    setNotes(notes.filter(n => n.id !== id));
    if (selectedId === id) setSelectedId(notes.find(n => n.id !== id)?.id ?? null);
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    const t = tagInput.trim().toLowerCase();
    if (!draft.tags.includes(t)) setDraft({ ...draft, tags: [...draft.tags, t] });
    setTagInput('');
  };

  const removeTag = (t: string) => setDraft({ ...draft, tags: draft.tags.filter(x => x !== t) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '14px 0 28px', minHeight: 'calc(100vh - 5rem)' }}>

      {/* HERO HEADER */}
      {!embedded && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, rgba(245,158,11,0.25), rgba(217,119,6,0.18))', border: '1px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px rgba(245,158,11,0.2)' }}>
              <StickyNote size={24} color="#f59e0b" />
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#f59e0b', letterSpacing: '0.5px' }}>{notes.length} NOTES · MARKDOWN ENABLED · AUTO-SAVE</span>
              </div>
              <h2 style={{ fontSize: 'clamp(22px,3.5vw,30px)', fontWeight: 900, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.6px', lineHeight: 1.05 }}>
                Notes <span style={{ color: '#f59e0b' }}>✦</span>
              </h2>
              <p style={{ color: 'var(--text-3)', fontSize: 13.5, margin: '4px 0 0' }}>
                Quick markdown notes that flow into your second brain
              </p>
            </div>
          </div>
          <button onClick={createNew} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 16px rgba(245,158,11,0.4)' }}>
            <Plus size={14} /> New note
          </button>
        </div>
      )}

      {/* BODY: list + editor */}
      <div className="notes-body-grid" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14, alignItems: 'start' }}>

        {/* LEFT: list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 12, alignSelf: 'start', maxHeight: 'calc(100vh - 80px)' }}>
          {embedded && (
            <button onClick={createNew}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(245,158,11,0.25)' }}>
              <Plus size={13} /> New note
            </button>
          )}
          <div style={{ position: 'relative' }}>
            <Search size={13} color="var(--text-3)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..."
              style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-1)', fontSize: 12.5, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>

          {allTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <button onClick={() => setTagFilter(null)} style={{ padding: '3px 9px', background: !tagFilter ? 'var(--primary-bg)' : 'transparent', border: `1px solid ${!tagFilter ? 'var(--primary-border)' : 'var(--border)'}`, borderRadius: 12, color: !tagFilter ? 'var(--primary)' : 'var(--text-3)', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>All</button>
              {allTags.slice(0, 8).map(t => (
                <button key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)} style={{ padding: '3px 9px', background: tagFilter === t ? 'var(--primary-bg)' : 'transparent', border: `1px solid ${tagFilter === t ? 'var(--primary-border)' : 'var(--border)'}`, borderRadius: 12, color: tagFilter === t ? 'var(--primary)' : 'var(--text-3)', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>#{t}</button>
              ))}
            </div>
          )}

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }} className="scroll-custom">
            {loading ? (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 12, padding: 30 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)' }}>
                <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ fontSize: 12 }}>No notes yet</div>
                <button onClick={createNew} style={{ marginTop: 10, padding: '6px 12px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 8, color: 'var(--primary)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Create first note</button>
              </div>
            ) : filtered.map(n => (
              <motion.div key={n.id} onClick={() => setSelectedId(n.id)}
                whileHover={{ x: 2 }}
                style={{ padding: '10px 12px', background: selectedId === n.id ? 'var(--primary-bg)' : 'var(--surface)', border: `1px solid ${selectedId === n.id ? 'var(--primary-border)' : 'var(--border)'}`, borderRadius: 11, cursor: 'pointer', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
                  {n.pinned && <Pin size={11} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: selectedId === n.id ? 'var(--primary)' : 'var(--text-1)', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 10.5, marginTop: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.content.replace(/[#*`]/g, '').slice(0, 80) || 'Empty note'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, color: 'var(--text-3)', fontSize: 9.5 }}>
                      <Clock size={9} /> {new Date(n.updated_at).toLocaleDateString()} · {n.word_count} words
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* RIGHT: editor */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 600 }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-3)' }}>
              <Edit3 size={42} style={{ opacity: 0.3 }} />
              <div style={{ fontSize: 14 }}>Select a note or create a new one</div>
              <button onClick={createNew} style={{ padding: '8px 16px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={12} /> New note</button>
            </div>
          ) : (
            <>
              {/* toolbar */}
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })}
                  style={{ flex: 1, minWidth: 180, padding: '6px 10px', background: 'transparent', border: '1px solid transparent', borderRadius: 8, color: 'var(--text-1)', fontSize: 16, fontWeight: 800, outline: 'none', fontFamily: 'inherit', letterSpacing: '-0.3px' }}
                  onFocus={e => (e.target as HTMLInputElement).style.borderColor = 'var(--border)'}
                  onBlur={e => (e.target as HTMLInputElement).style.borderColor = 'transparent'} />
                <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 9, padding: 3, gap: 1 }}>
                  {([
                    { v: 'edit', icon: Code, label: 'Edit' },
                    { v: 'split', icon: Type, label: 'Split' },
                    { v: 'preview', icon: Eye, label: 'Preview' },
                  ] as const).map(b => (
                    <button key={b.v} onClick={() => setView(b.v)} title={b.label}
                      style={{ padding: '5px 9px', background: view === b.v ? 'var(--surface)' : 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', color: view === b.v ? 'var(--primary)' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', fontSize: 11, fontWeight: 600 }}>
                      <b.icon size={12} />
                    </button>
                  ))}
                </div>
                <button onClick={() => togglePin(selected.id, selected.pinned)} title={selected.pinned ? 'Unpin' : 'Pin'} style={{ padding: 7, background: selected.pinned ? 'rgba(245,158,11,0.12)' : 'var(--surface-2)', border: `1px solid ${selected.pinned ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, borderRadius: 8, color: selected.pinned ? '#f59e0b' : 'var(--text-3)', cursor: 'pointer', display: 'flex' }}>
                  {selected.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                </button>
                <button onClick={() => deleteNote(selected.id)} title="Delete" style={{ padding: 7, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, color: '#ef4444', cursor: 'pointer', display: 'flex' }}>
                  <Trash2 size={12} />
                </button>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: saving ? 'rgba(99,102,241,0.1)' : 'rgba(16,185,129,0.08)', border: `1px solid ${saving ? 'rgba(99,102,241,0.3)' : 'rgba(16,185,129,0.25)'}`, borderRadius: 12, color: saving ? '#6366f1' : '#10b981', fontSize: 10, fontWeight: 700 }}>
                  {saving ? 'Saving...' : <><Save size={9} /> Saved</>}
                </span>
              </div>

              {/* tags row */}
              <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <TagIcon size={11} color="var(--text-3)" />
                {draft.tags.map(t => (
                  <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 11, color: 'var(--primary)', fontSize: 10.5, fontWeight: 600 }}>
                    #{t}
                    <button onClick={() => removeTag(t)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', display: 'flex', padding: 0 }}><X size={9} /></button>
                  </span>
                ))}
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Add tag..." style={{ width: 100, padding: '3px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 11, color: 'var(--text-1)', fontSize: 10.5, outline: 'none', fontFamily: 'inherit' }} />
              </div>

              {/* editor + preview */}
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: view === 'split' ? '1fr 1fr' : '1fr', gap: 0, minHeight: 400 }}>
                {(view === 'edit' || view === 'split') && (
                  <textarea value={draft.content} onChange={e => setDraft({ ...draft, content: e.target.value })}
                    placeholder="Start writing in markdown..."
                    style={{ width: '100%', height: '100%', padding: '16px 18px', background: 'transparent', border: 'none', borderRight: view === 'split' ? '1px solid var(--border)' : 'none', color: 'var(--text-1)', fontSize: 13.5, outline: 'none', fontFamily: "'JetBrains Mono', monospace", resize: 'none', boxSizing: 'border-box', lineHeight: 1.65 }} />
                )}
                {(view === 'preview' || view === 'split') && (
                  <div style={{ padding: '16px 20px', overflow: 'auto', fontSize: 13.5 }} dangerouslySetInnerHTML={{ __html: renderMarkdown(draft.content) }} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesPage;
