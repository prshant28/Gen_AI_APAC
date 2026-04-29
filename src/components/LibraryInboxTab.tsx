import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2, Inbox, Plus, CheckCircle2, Tag as TagIcon, Archive,
  Youtube, Globe, FileText, StickyNote, ExternalLink, X, Clock,
} from 'lucide-react';
import { showToast } from '../App';
import type { Memory } from '../lib/types';
import CapturePage from '../pages/CapturePage';

const SOURCE_META: Record<string, { icon: React.ComponentType<{ size?: number; color?: string }>; color: string; label: string }> = {
  youtube: { icon: Youtube,    color: '#ef4444', label: 'YouTube' },
  web:     { icon: Globe,      color: '#3b82f6', label: 'Web'     },
  pdf:     { icon: FileText,   color: '#f59e0b', label: 'PDF'     },
  note:    { icon: StickyNote, color: '#22d3ee', label: 'Note'    },
};

const timeAgo = (iso?: string): string => {
  if (!iso) return 'just now';
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 'just now';
  const diff = Math.max(0, Date.now() - t);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
};

const safeHostname = (raw: string): string | null => {
  try { return new URL(raw).hostname.replace(/^www\./, ''); } catch { return null; }
};

interface CaptureModalProps { onClose: () => void; onCaptured: () => void; }
const CaptureModal: React.FC<CaptureModalProps> = ({ onClose, onCaptured }) => {
  useEffect(() => {
    // Escape key dismisses the modal AND triggers a re-fetch (same path as
    // overlay click / X) so any newly captured items show up in the inbox.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); onCaptured(); }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, onCaptured]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => { onClose(); onCaptured(); }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(5,5,15,0.88)', backdropFilter: 'blur(10px)' }}
        data-testid="overlay-capture-modal"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 20 }}
        style={{
          position: 'relative', width: '100%', maxWidth: 1080, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 18, overflow: 'hidden',
          boxShadow: '0 28px 80px rgba(0,0,0,0.55)', marginTop: 20, marginBottom: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Plus size={16} color="#06b6d4" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>New capture</span>
          </div>
          <button
            onClick={() => { onClose(); onCaptured(); }}
            data-testid="button-close-capture-modal"
            style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-2)' }}
          >
            <X size={14} />
          </button>
        </div>
        <div style={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}>
          <CapturePage embedded />
        </div>
      </motion.div>
    </div>
  );
};

interface InlineTagEditorProps {
  initialTags: string[];
  onSave: (tags: string[]) => Promise<void> | void;
  onCancel: () => void;
}
const InlineTagEditor: React.FC<InlineTagEditorProps> = ({ initialTags, onSave, onCancel }) => {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const v = draft.trim();
    if (!v) return;
    if (tags.some(t => t.toLowerCase() === v.toLowerCase())) { setDraft(''); return; }
    setTags(prev => [...prev, v]);
    setDraft('');
  };
  const removeTag = (i: number) => setTags(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(tags); }
    finally { setSaving(false); }
  };

  return (
    <div
      style={{ marginTop: 10, padding: 12, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10 }}
      data-testid="editor-inline-tags"
    >
      <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 8 }}>Edit tags</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {tags.map((t, i) => (
          <span key={`${t}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: 'rgba(244,114,182,0.12)', border: '1px solid rgba(244,114,182,0.25)', borderRadius: 999, fontSize: 11, color: '#f472b6', fontWeight: 600 }}>
            {t}
            <button onClick={() => removeTag(i)} aria-label={`Remove tag ${t}`} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#f472b6', display: 'flex', padding: 0 }}>
              <X size={11} />
            </button>
          </span>
        ))}
        {tags.length === 0 && (
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>No tags yet</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); addTag(); }
            else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
          }}
          placeholder="Type a tag and press Enter"
          data-testid="input-new-tag"
          style={{ flex: 1, padding: '7px 10px', fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', outline: 'none', fontFamily: 'inherit' }}
        />
        <button
          onClick={addTag}
          data-testid="button-add-tag"
          style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Add
        </button>
        <button
          onClick={onCancel}
          data-testid="button-cancel-tags"
          style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          data-testid="button-save-tags"
          style={{ padding: '7px 14px', fontSize: 11, fontWeight: 700, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', border: 'none', borderRadius: 8, color: '#fff', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
};

const LibraryInboxTab: React.FC = () => {
  const [items, setItems] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCapture, setShowCapture] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/memories?unreviewed=true&limit=50');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load inbox';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const removeFromList = (id: string) =>
    setItems(prev => prev.filter(m => m.id !== id));

  const patchMemory = async (id: string, body: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch(`/memories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return true;
    } catch (e) {
      showToast(e instanceof Error ? `Update failed: ${e.message}` : 'Update failed');
      return false;
    }
  };

  const handleReview = async (m: Memory) => {
    setBusyId(m.id);
    const ok = await patchMemory(m.id, { reviewed: true });
    setBusyId(null);
    if (ok) {
      removeFromList(m.id);
      showToast('Marked as reviewed');
    }
  };

  const handleArchive = async (m: Memory) => {
    setBusyId(m.id);
    const ok = await patchMemory(m.id, { archived: true });
    setBusyId(null);
    if (ok) {
      removeFromList(m.id);
      showToast('Archived');
    }
  };

  const handleSaveTags = async (m: Memory, tags: string[]) => {
    const ok = await patchMemory(m.id, { tags });
    if (ok) {
      setItems(prev => prev.map(x => x.id === m.id ? { ...x, tags } : x));
      setEditingTagsId(null);
      showToast('Tags updated');
    }
  };

  const handleCaptureClosed = () => {
    setShowCapture(false);
    load();
  };

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Inbox size={18} color="#06b6d4" />
            Inbox
            {!loading && items.length > 0 && (
              <span data-testid="badge-inbox-count" style={{ marginLeft: 6, padding: '2px 9px', background: 'rgba(6,182,212,0.14)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 999, fontSize: 11, color: '#06b6d4', fontWeight: 700 }}>
                {items.length}
              </span>
            )}
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)' }}>Triage recent captures — review, tag, or archive them.</p>
        </div>
        <button
          onClick={() => setShowCapture(true)}
          data-testid="button-open-capture"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'linear-gradient(135deg,#06b6d4,#0891b2)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 6px 18px rgba(6,182,212,0.28)' }}
        >
          <Plus size={14} />
          Capture
        </button>
      </div>

      {loading && (
        <div data-testid="state-inbox-loading" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', color: 'var(--text-3)' }}>
          <Loader2 size={26} color="#06b6d4" style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
          <span style={{ fontSize: 12 }}>Loading inbox…</span>
        </div>
      )}

      {!loading && error && (
        <div data-testid="state-inbox-error" style={{ padding: '20px 22px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, color: '#fca5a5', fontSize: 12 }}>
          Couldn't load inbox: {error}
          <button onClick={load} style={{ marginLeft: 12, padding: '5px 11px', background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.35)', borderRadius: 8, color: '#fca5a5', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div data-testid="state-inbox-empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 14 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <CheckCircle2 size={28} color="#10b981" />
          </div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>All caught up — nothing to review</h3>
          <p style={{ margin: '6px 0 16px', fontSize: 12, color: 'var(--text-3)', maxWidth: 360 }}>
            New captures land here for quick triage. Add one to get started.
          </p>
          <button
            onClick={() => setShowCapture(true)}
            data-testid="button-empty-open-capture"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'linear-gradient(135deg,#06b6d4,#0891b2)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            <Plus size={14} />
            Capture something
          </button>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AnimatePresence initial={false}>
            {items.map(m => {
              const meta = SOURCE_META[m.source_type] || SOURCE_META.note;
              const Icon = meta.icon;
              const host = m.source_url ? safeHostname(m.source_url) : null;
              const isBusy = busyId === m.id;
              const isEditingTags = editingTagsId === m.id;
              const isExpanded = expandedId === m.id;
              return (
                <motion.div
                  key={m.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                  transition={{ duration: 0.18 }}
                  data-testid={`row-inbox-${m.id}`}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, opacity: isBusy ? 0.55 : 1, transition: 'opacity 0.15s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 9, background: `${meta.color}1f`, border: `1px solid ${meta.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} color={meta.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : m.id)}
                          data-testid={`button-toggle-${m.id}`}
                          style={{ background: 'transparent', border: 'none', padding: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-1)', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {m.title || 'Untitled'}
                        </button>
                        {host && (
                          <a
                            href={m.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)', textDecoration: 'none' }}
                          >
                            {host} <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, fontSize: 11, color: 'var(--text-3)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={10} /> {timeAgo(m.created_at)}
                        </span>
                        <span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span>
                        {m.domain && m.domain !== 'Other' && (
                          <span style={{ padding: '1px 7px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, fontSize: 10, fontWeight: 600, color: 'var(--text-2)' }}>
                            {m.domain}
                          </span>
                        )}
                      </div>
                      {m.summary && (
                        <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: isExpanded ? 99 : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {m.summary}
                        </p>
                      )}
                      {isExpanded && m.key_points && m.key_points.length > 0 && (
                        <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
                          {m.key_points.slice(0, 5).map((kp, i) => (
                            <li key={i}>{kp}</li>
                          ))}
                        </ul>
                      )}
                      {m.tags && m.tags.length > 0 && !isEditingTags && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                          {m.tags.slice(0, 8).map((t, i) => (
                            <span key={`${t}-${i}`} style={{ padding: '2px 7px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 999, fontSize: 10, color: 'var(--text-2)', fontWeight: 600 }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {isEditingTags && (
                        <InlineTagEditor
                          initialTags={m.tags || []}
                          onSave={(tags) => handleSaveTags(m, tags)}
                          onCancel={() => setEditingTagsId(null)}
                        />
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 12 }}>
                    <button
                      onClick={() => handleReview(m)}
                      disabled={isBusy}
                      data-testid={`button-review-${m.id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, color: '#10b981', fontSize: 11, fontWeight: 700, cursor: isBusy ? 'wait' : 'pointer', fontFamily: 'inherit' }}
                    >
                      <CheckCircle2 size={12} />
                      Review
                    </button>
                    <button
                      onClick={() => setEditingTagsId(isEditingTags ? null : m.id)}
                      disabled={isBusy}
                      data-testid={`button-tag-${m.id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: isEditingTags ? 'rgba(244,114,182,0.18)' : 'var(--surface-2)', border: `1px solid ${isEditingTags ? 'rgba(244,114,182,0.4)' : 'var(--border)'}`, borderRadius: 8, color: isEditingTags ? '#f472b6' : 'var(--text-2)', fontSize: 11, fontWeight: 700, cursor: isBusy ? 'wait' : 'pointer', fontFamily: 'inherit' }}
                    >
                      <TagIcon size={12} />
                      Tag
                    </button>
                    <button
                      onClick={() => handleArchive(m)}
                      disabled={isBusy}
                      data-testid={`button-archive-${m.id}`}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 11, fontWeight: 700, cursor: isBusy ? 'wait' : 'pointer', fontFamily: 'inherit' }}
                    >
                      <Archive size={12} />
                      Archive
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showCapture && (
          <CaptureModal onClose={() => setShowCapture(false)} onCaptured={handleCaptureClosed} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default LibraryInboxTab;
