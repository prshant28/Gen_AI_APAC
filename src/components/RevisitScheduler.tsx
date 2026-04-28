import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Sparkles, Check, X, Loader2, RotateCw, Calendar as CalIcon } from 'lucide-react';
import { showToast } from '../App';

export type Frequency =
  | 'once' | 'daily' | 'twice_weekly' | 'weekly' | 'biweekly'
  | 'monthly' | 'custom_days' | 'specific_date';

export const FREQ_OPTIONS: { key: Frequency; label: string; hint: string }[] = [
  { key: 'once', label: 'Once', hint: 'Single check-in' },
  { key: 'daily', label: 'Daily', hint: 'Every day' },
  { key: 'twice_weekly', label: '2× a week', hint: 'Every 3-4 days' },
  { key: 'weekly', label: 'Weekly', hint: 'Every 7 days' },
  { key: 'biweekly', label: '2× a month', hint: 'Every 14 days' },
  { key: 'monthly', label: 'Monthly', hint: 'Every 30 days' },
  { key: 'custom_days', label: 'Every N days', hint: 'Pick interval' },
  { key: 'specific_date', label: 'Specific date', hint: 'Fire on a date' },
];

interface Props {
  defaultTitle?: string;
  defaultUrl?: string;
  memoryId?: string;
  hintText?: string;        // e.g. used by AI suggest endpoint
  compact?: boolean;        // capture inline mode
  onCreated?: (revisit: any) => void;
  onCancel?: () => void;
}

export const RevisitScheduler: React.FC<Props> = ({
  defaultTitle = '',
  defaultUrl = '',
  memoryId = '',
  hintText = '',
  compact = false,
  onCreated,
  onCancel,
}) => {
  const [title, setTitle] = useState(defaultTitle);
  const [url, setUrl] = useState(defaultUrl);
  const [notes, setNotes] = useState('');
  const [freq, setFreq] = useState<Frequency>('weekly');
  const [intervalDays, setIntervalDays] = useState(3);
  const [specificDate, setSpecificDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState<{ frequency: string; reason: string } | null>(null);

  useEffect(() => { setTitle(defaultTitle); }, [defaultTitle]);
  useEffect(() => { setUrl(defaultUrl); }, [defaultUrl]);

  // AI-ish heuristic suggestion based on title/notes/url combined
  useEffect(() => {
    const text = [hintText, defaultTitle, defaultUrl].filter(Boolean).join(' ');
    if (!text.trim()) return;
    fetch('/revisits/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.frequency) { setSuggestion(d); setFreq(d.frequency as Frequency); } })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hintText, defaultTitle, defaultUrl]);

  const submit = async () => {
    if (!title.trim()) { showToast('Title is required', 'error'); return; }
    setSaving(true);
    try {
      const body: any = {
        title: title.trim(),
        url: url.trim(),
        notes: notes.trim(),
        memory_id: memoryId || '',
        frequency: freq,
        action_label: url ? 'Visit link' : 'Open',
      };
      if (freq === 'custom_days') body.interval_days = Math.max(1, intervalDays);
      if (freq === 'specific_date' || freq === 'once') body.specific_date = specificDate;

      const r = await fetch('/revisits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) { showToast('Could not schedule revisit', 'error'); setSaving(false); return; }
      const created = await r.json();
      showToast('Revisit scheduled');
      onCreated?.(created);
    } catch {
      showToast('Could not schedule revisit', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showCustom = freq === 'custom_days';
  const showDate = freq === 'specific_date' || freq === 'once';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{
        overflow: 'hidden',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: compact ? 12 : 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={14} color="#f59e0b" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Schedule a revisit</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
            Recall will surface this in your Daily Briefing when it's time.
          </div>
        </div>
        {onCancel && (
          <button onClick={onCancel} style={btnIcon}><X size={13} /></button>
        )}
      </div>

      {!compact && (
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What should I remind you about?"
          style={inputStyle}
        />
      )}

      {!compact && !memoryId && (
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Optional URL (https://...)"
          style={{ ...inputStyle, marginTop: 8 }}
        />
      )}

      {/* Frequency chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {FREQ_OPTIONS.map(opt => {
          const active = freq === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => setFreq(opt.key)}
              title={opt.hint}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: active ? 'var(--primary-bg)' : 'var(--surface-2)',
                color: active ? 'var(--primary)' : 'var(--text-2)',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {showCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12.5, color: 'var(--text-2)' }}>
          <RotateCw size={13} />
          <span>Every</span>
          <input
            type="number"
            min={1}
            max={365}
            value={intervalDays}
            onChange={e => setIntervalDays(parseInt(e.target.value || '1', 10))}
            style={{ ...inputStyle, width: 70, padding: '5px 8px', textAlign: 'center' }}
          />
          <span>days</span>
        </div>
      )}

      {showDate && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 12.5, color: 'var(--text-2)' }}>
          <CalIcon size={13} />
          <span>On</span>
          <input
            type="date"
            value={specificDate}
            onChange={e => setSpecificDate(e.target.value)}
            style={{ ...inputStyle, width: 160, padding: '5px 8px' }}
          />
        </div>
      )}

      {!compact && (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Notes (optional) — what do you want to do when this fires?"
          rows={2}
          style={{ ...inputStyle, marginTop: 10, resize: 'vertical', fontFamily: 'inherit' }}
        />
      )}

      <AnimatePresence>
        {suggestion && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '6px 10px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: 11.5, color: 'var(--text-2)' }}>
            <Sparkles size={12} color="#6366f1" />
            <span><strong style={{ color: '#6366f1' }}>AI suggests:</strong> {suggestion.reason}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        {onCancel && (
          <button onClick={onCancel} style={btnGhost} disabled={saving}>Skip</button>
        )}
        <button onClick={submit} disabled={saving || !title.trim()} style={btnPrimary}>
          {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={12} />}
          Schedule revisit
        </button>
      </div>
    </motion.div>
  );
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface-2)',
  color: 'var(--text-1)', fontSize: 12.5, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px',
  borderRadius: 8, border: 'none', cursor: 'pointer',
  background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', color: '#fff',
  fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
};

const btnGhost: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
  background: 'var(--surface-2)', border: '1px solid var(--border)',
  color: 'var(--text-2)', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
};

const btnIcon: React.CSSProperties = {
  padding: 4, background: 'transparent', border: 'none',
  color: 'var(--text-3)', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center',
};
