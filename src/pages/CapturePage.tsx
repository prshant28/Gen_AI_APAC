import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Globe, StickyNote, FileText, Sparkles, Loader2, CheckCircle2, X, Brain,
  Tag, ExternalLink, Save, Upload, Mic, MicOff, Code2, Twitter, Clipboard,
  Youtube, Link2, Zap, Shield, Network, Search, Layers,
  AlertCircle, Eye, FileDigit, Target, BookOpen, HelpCircle, ListChecks,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { YouTubeEmbed, YouTubeThumbnail, getYouTubeId } from '../lib/utils';
import { showToast } from '../App';
import type { Memory } from '../lib/types';

/* ── Helpers ───────────────────────────────────────────────────── */
const safeHostname = (raw: string): string | null => {
  try {
    const u = new URL(raw.trim());
    return u.hostname.replace(/^www\./, '');
  } catch { return null; }
};
const faviconUrl = (host: string) => `https://www.google.com/s2/favicons?domain=${host}&sz=64`;

/* ── Source types ───────────────────────────────────────────────── */
const SOURCES = [
  { id: 'web',       label: 'Web Article', icon: Globe,         color: '#3b82f6', hint: 'Any URL — news, blogs, docs' },
  { id: 'youtube',   label: 'YouTube',     icon: Youtube,       color: '#ef4444', hint: 'Video summary + transcript' },
  { id: 'pdf',       label: 'PDF / Doc',   icon: FileText,      color: '#f59e0b', hint: 'Upload & extract contents' },
  { id: 'note',      label: 'Quick Note',  icon: StickyNote,    color: '#22d3ee', hint: 'Ideas, meeting notes, thoughts' },
  { id: 'code',      label: 'Code',        icon: Code2,         color: '#a78bfa', hint: 'Snippets with AI explanation' },
  { id: 'twitter',   label: 'X / Thread',  icon: Twitter,       color: '#60a5fa', hint: 'Tweet or thread URL' },
  { id: 'voice',     label: 'Voice Memo',  icon: Mic,           color: '#34d399', hint: 'Record & auto-transcribe' },
  { id: 'clipboard', label: 'Clipboard',   icon: Clipboard,     color: '#fb7185', hint: 'Paste anything instantly' },
];

/* ── 7-Agent pipeline ───────────────────────────────────────────── */
const AGENTS = [
  { id: 'capture',   label: 'Capture',      icon: Layers,    color: '#3b82f6', desc: 'Fetching & ingesting raw content' },
  { id: 'summarize', label: 'Summarizer',   icon: Brain,     color: '#22d3ee', desc: 'Generating structured summary' },
  { id: 'insights',  label: 'Insight',      icon: Sparkles,  color: '#a78bfa', desc: 'Extracting key points & actions' },
  { id: 'graph',     label: 'Graph',        icon: Network,   color: '#f472b6', desc: 'Linking to your knowledge graph' },
  { id: 'tags',      label: 'Tagger',       icon: Tag,       color: '#fbbf24', desc: 'Auto-generating smart tags' },
  { id: 'vector',    label: 'Recall',       icon: Search,    color: '#34d399', desc: 'Embedding for semantic search' },
  { id: 'guardian',  label: 'Guardian',     icon: Shield,    color: '#60a5fa', desc: 'Privacy check & validation' },
];

type AgentStatus = 'idle' | 'active' | 'done' | 'error';

/* ── Voice recording helper ─────────────────────────────────────── */
function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeRef = useRef<string>('audio/webm');

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mimeRef.current = mr.mimeType || 'audio/webm';
      chunksRef.current = [];
      setTranscript('');
      mr.ondataavailable = e => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeRef.current });
        if (blob.size === 0) { showToast('No audio captured'); return; }
        setTranscribing(true);
        setTranscript('Transcribing audio…');
        try {
          const fd = new FormData();
          const ext = mimeRef.current.includes('mp4') ? 'm4a' : mimeRef.current.includes('ogg') ? 'ogg' : 'webm';
          fd.append('file', blob, `voice.${ext}`);
          const r = await fetch('/capture/voice', { method: 'POST', body: fd });
          const data = await r.json();
          if (data.transcript && !String(data.transcript).startsWith('[Transcription failed')) {
            setTranscript(data.transcript);
          } else {
            setTranscript('');
            showToast(data.error || 'Transcription failed — try again');
          }
        } catch (e: any) {
          setTranscript('');
          showToast(e.message || 'Voice upload failed');
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch { showToast('Microphone access denied'); }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return { recording, transcribing, transcript, setTranscript, start, stop };
}

/* ── Main component ─────────────────────────────────────────────── */
const CaptureView = () => {
  const [source, setSource]             = useState<string>('web');
  const [input, setInput]               = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview]           = useState<Memory | null>(null);
  const [previewUrl, setPreviewUrl]     = useState('');
  const [pdfFile, setPdfFile]           = useState<File | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string>('');
  const [dragOver, setDragOver]         = useState(false);
  const [agentState, setAgentState]     = useState<Record<string, AgentStatus>>({});
  const [activeAgentDesc, setActiveAgentDesc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceRecorder();

  /* Local PDF preview (object URL) */
  useEffect(() => {
    if (!pdfFile) { if (pdfObjectUrl) URL.revokeObjectURL(pdfObjectUrl); setPdfObjectUrl(''); return; }
    const u = URL.createObjectURL(pdfFile);
    setPdfObjectUrl(u);
    return () => URL.revokeObjectURL(u);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfFile]);

  /* Live previews for URL inputs */
  const ytId = useMemo(() => (source === 'youtube' ? getYouTubeId(input) : null), [source, input]);
  const urlHost = useMemo(() => (source === 'web' && input.startsWith('http') ? safeHostname(input) : null), [source, input]);

  const currentSource = SOURCES.find(s => s.id === source)!;

  /* Auto-detect source from URL */
  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.includes('youtube.com') || val.includes('youtu.be')) setSource('youtube');
    else if (val.includes('twitter.com') || val.includes('x.com'))  setSource('twitter');
    else if (val.startsWith('http') && source === 'note')            setSource('web');
  };

  /* Paste from clipboard */
  const pasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      handleInputChange(text);
    } catch { showToast('Clipboard access denied'); }
  };

  /* Animate agents sequentially */
  const runAgentPipeline = async (totalMs = 3200) => {
    const stepMs = totalMs / AGENTS.length;
    for (let i = 0; i < AGENTS.length; i++) {
      const a = AGENTS[i];
      setAgentState(s => ({ ...s, [a.id]: 'active' }));
      setActiveAgentDesc(a.desc);
      await new Promise(r => setTimeout(r, stepMs));
      setAgentState(s => ({ ...s, [a.id]: 'done' }));
    }
    setActiveAgentDesc('');
  };

  /* Capture handler */
  const handleCapture = async () => {
    if (source === 'pdf' && pdfFile) {
      setIsProcessing(true);
      setAgentState({});
      const pipelinePromise = runAgentPipeline(2800);
      try {
        const formData = new FormData();
        formData.append('file', pdfFile);
        const res = await fetch('/capture/upload?preview=true', { method: 'POST', body: formData });
        if (!res.ok) {
          let detail = `HTTP ${res.status}`;
          try { const j = await res.json(); detail = j.error || j.detail || detail; } catch {}
          throw new Error(detail);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!data.title || data.title === 'PDF Document') {
          data.title = pdfFile.name.replace(/\.pdf$/i, '');
        }
        data.source_type = 'pdf';
        await pipelinePromise;
        setPreview(data);
      } catch (err: any) {
        await pipelinePromise.catch(() => {});
        AGENTS.forEach(a => setAgentState(s => ({ ...s, [a.id]: s[a.id] === 'active' ? 'error' : s[a.id] })));
        showToast(err.message || 'Failed to process PDF.');
      } finally { setIsProcessing(false); }
      return;
    }

    const content = source === 'voice' ? voice.transcript : input;
    if (!content.trim()) return;

    setIsProcessing(true);
    setAgentState({});
    const pipelinePromise = runAgentPipeline(3200);

    try {
      const isYoutube = source === 'youtube' || content.includes('youtube.com') || content.includes('youtu.be');
      const source_type =
        ['web', 'youtube', 'twitter'].includes(source) ? (isYoutube ? 'youtube' : 'web') : 'note';

      const res = await fetch('/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type,
          url: ['web', 'youtube', 'twitter'].includes(source) ? content : '',
          content: ['note', 'code', 'voice', 'clipboard'].includes(source) ? content : '',
          preview: true,
        }),
      });
      if (res.status === 401) throw new Error('Unauthorized — check API config.');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.source_url && ['web', 'youtube', 'twitter'].includes(source)) data.source_url = content;

      await pipelinePromise;
      setPreviewUrl(['web', 'youtube', 'twitter'].includes(source) ? content : '');
      setPreview(data);
    } catch (err: any) {
      await pipelinePromise;
      showToast(err.message || 'Capture failed.');
    } finally { setIsProcessing(false); }
  };

  const handleSave = async () => {
    if (!preview) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview),
      });
      if (res.ok) {
        const saved = await res.json().catch(() => null);
        const memId = saved?.id;
        const isDup = !!saved?.duplicate;
        setPreview(null);
        setInput('');
        setPdfFile(null);
        voice.setTranscript('');
        setAgentState({});
        if (isDup) {
          showToast('Already in your Vault — opened existing entry');
        } else {
          showToast('Saved to Vault!');
        }
        // Skip auto-tag for duplicates (entry already tagged)
        if (memId && !isDup) {
          fetch(`/memories/${memId}/auto-tag`, { method: 'POST' })
            .then(r => r.ok ? r.json() : null)
            .then(d => {
              const added: string[] = Array.isArray(d?.added) ? d.added : [];
              if (added.length > 0) {
                showToast(`AI added: ${added.slice(0, 3).map(t => `#${t}`).join(' ')}`);
              }
            })
            .catch(() => {});
        }
      } else {
        showToast('Failed to save', 'error');
      }
    } catch (e) { console.error(e); showToast('Failed to save', 'error'); }
    finally { setIsProcessing(false); }
  };

  const inputLabel = {
    web: 'Web article URL', youtube: 'YouTube URL', twitter: 'Tweet or thread URL',
    note: 'Thoughts, ideas, or meeting notes', code: 'Code snippet',
    clipboard: 'Pasted content', voice: 'Voice transcript',
  }[source] || 'Content';

  const inputPlaceholder = {
    web: 'https://example.com/article...',
    youtube: 'https://youtube.com/watch?v=...',
    twitter: 'https://twitter.com/user/status/...',
    note: 'Type or paste anything — meeting notes, ideas, research snippets...',
    code: '// Paste your code snippet here...',
    clipboard: 'Click "Paste" or type content...',
    voice: 'Press the mic button to start recording...',
  }[source] || '';

  const isUrl = ['web', 'youtube', 'twitter'].includes(source);
  const isMultiline = ['note', 'code', 'clipboard', 'voice'].includes(source);
  const canSubmit = source === 'pdf'
    ? !!pdfFile
    : source === 'voice'
    ? !!voice.transcript.trim()
    : !!input.trim();

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ textAlign: 'center', paddingTop: 4 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px',
          background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 999, marginBottom: 10 }}>
          <Zap size={11} color="var(--primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px' }}>
            7-AGENT CAPTURE ENGINE
          </span>
        </div>
        <h2 style={{ fontSize: 'clamp(20px,3.5vw,28px)', fontWeight: 900, color: 'var(--text-1)',
          margin: '0 0 6px', fontFamily: "'Alegreya Sans SC',system-ui" }}>
          Smart Capture
        </h2>
        <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>
          8 input modes · 7 AI agents · Full pipeline visibility
        </p>
      </motion.div>

      {/* ── Live Agent Pipeline (visible in BOTH form and preview states) ─ */}
      <AnimatePresence>
        {(isProcessing || Object.keys(agentState).length > 0) && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="view-card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Layers size={14} color="var(--primary)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '0.3px' }}>
                Live Agent Pipeline
              </span>
              {activeAgentDesc && (
                <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4 }}>— {activeAgentDesc}</span>
              )}
              {!isProcessing && Object.keys(agentState).length > 0 && (
                <span style={{ fontSize: 10.5, color: 'var(--success, #16a34a)', marginLeft: 'auto', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={11} /> COMPLETE
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
              {AGENTS.map((ag, i) => {
                const st = agentState[ag.id] || 'idle';
                return (
                  <React.Fragment key={ag.id}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 64, flexShrink: 0 }}>
                      <motion.div
                        animate={st === 'active' ? { scale: [1, 1.15, 1], boxShadow: [`0 0 0 0 ${ag.color}44`, `0 0 0 8px ${ag.color}22`, `0 0 0 0 ${ag.color}00`] } : {}}
                        transition={{ repeat: Infinity, duration: 1.2 }}
                        style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${st === 'idle' ? 'var(--border)' : ag.color}`, background: st === 'idle' ? 'var(--surface-2)' : st === 'done' ? `color-mix(in srgb,${ag.color} 18%,transparent)` : `color-mix(in srgb,${ag.color} 14%,transparent)`, transition: 'all 0.3s' }}>
                        {st === 'done'
                          ? <CheckCircle2 size={16} color={ag.color} />
                          : st === 'error'
                          ? <AlertCircle size={16} color="#ef4444" />
                          : <ag.icon size={15} color={st === 'active' ? ag.color : 'var(--text-3)'} />}
                      </motion.div>
                      <span style={{ fontSize: 9.5, fontWeight: st === 'active' ? 700 : 500, color: st === 'idle' ? 'var(--text-3)' : st === 'done' ? ag.color : ag.color, textAlign: 'center', lineHeight: 1.2 }}>
                        {ag.label}
                      </span>
                    </div>
                    {i < AGENTS.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: agentState[AGENTS[i + 1].id] && agentState[AGENTS[i + 1].id] !== 'idle' ? AGENTS[i].color : 'var(--border)', transition: 'background 0.4s', minWidth: 8 }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Duplicate-memory warning banner (preview state) ─────────── */}
      {preview?.duplicate_of && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="view-card"
          style={{ padding: '12px 16px', borderColor: '#f59e0b', background: 'color-mix(in srgb, #f59e0b 8%, var(--surface))', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)' }}>
              Bhai, ye URL already Vault mein hai
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              "{preview.duplicate_of.title}" — saving will just open the existing entry, no duplicate created.
            </p>
          </div>
          <button onClick={() => { window.location.href = `/memory/${preview.duplicate_of.id}`; }}
            style={{ padding: '6px 10px', background: '#f59e0b', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 }}>
            Open existing
          </button>
        </motion.div>
      )}

      {!preview ? (
        <>
          {/* ── Source Selector Grid ────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="view-card" style={{ padding: '16px 16px 12px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '1px',
              textTransform: 'uppercase', margin: '0 0 12px' }}>Select source</p>
            <div className="capture-source-grid">
              {SOURCES.map(s => {
                const active = source === s.id;
                return (
                  <button key={s.id} onClick={() => setSource(s.id)}
                    title={s.hint}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '10px 6px', borderRadius: 12, border: `1.5px solid ${active ? s.color : 'var(--border)'}`,
                      background: active ? `color-mix(in srgb,${s.color} 12%,transparent)` : 'var(--surface-2)',
                      cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                    }}>
                    <s.icon size={18} color={active ? s.color : 'var(--text-3)'} />
                    <span style={{ fontSize: 10.5, fontWeight: active ? 700 : 500,
                      color: active ? s.color : 'var(--text-3)', lineHeight: 1.2, textAlign: 'center' }}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {currentSource && (
              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '10px 0 0', textAlign: 'center' }}>
                {currentSource.hint}
              </p>
            )}
          </motion.div>

          {/* ── Input Panel ─────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="view-card" style={{ overflow: 'hidden' }}>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* URL input */}
              {(isUrl) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {inputLabel}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Link2 size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                    <input type="url" value={input} onChange={e => handleInputChange(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCapture()}
                      placeholder={inputPlaceholder}
                      style={{ width: '100%', padding: '11px 14px 11px 36px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 13.5, outline: 'none', fontFamily: 'inherit', transition: 'all 0.15s', boxSizing: 'border-box' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-bg)'; }}
                      onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>

                  {/* Live YouTube thumbnail */}
                  <AnimatePresence>
                    {ytId && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(239,68,68,0.25)', boxShadow: '0 6px 20px rgba(239,68,68,0.10)' }}>
                        <YouTubeThumbnail url={input} />
                        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                          <Eye size={12} color="var(--text-3)" />
                          <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Live preview · video ID</span>
                          <code style={{ fontSize: 10.5, color: 'var(--text-2)', background: 'var(--surface-3)', padding: '2px 6px', borderRadius: 4, fontFamily: "'JetBrains Mono',monospace" }}>{ytId}</code>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Live web URL preview (favicon + host) */}
                  <AnimatePresence>
                    {!ytId && urlHost && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ marginTop: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 11, border: '1px solid var(--primary-border)', background: 'var(--primary-bg)' }}>
                        <img src={faviconUrl(urlHost)} alt="" width={20} height={20} style={{ borderRadius: 4, flexShrink: 0 }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', lineHeight: 1.2 }}>{urlHost}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{input}</div>
                        </div>
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px', padding: '2px 6px', background: 'var(--surface)', borderRadius: 4, border: '1px solid var(--primary-border)' }}>READY</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Multiline text input */}
              {isMultiline && source !== 'voice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {inputLabel}
                    </label>
                    {source === 'clipboard' && (
                      <button onClick={pasteClipboard}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Clipboard size={11} /> Paste
                      </button>
                    )}
                  </div>
                  <textarea value={input} onChange={e => setInput(e.target.value)}
                    placeholder={inputPlaceholder} rows={source === 'code' ? 8 : 6}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: source === 'code' ? 12.5 : 14, fontFamily: source === 'code' ? "'JetBrains Mono',monospace" : 'inherit', outline: 'none', resize: 'vertical', transition: 'all 0.15s', boxSizing: 'border-box', lineHeight: 1.65 }}
                    onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px var(--primary-bg)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  />
                  {source === 'code' && (
                    <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                      AI will explain the code, detect language, and extract concepts
                    </p>
                  )}
                </div>
              )}

              {/* Voice recorder */}
              {source === 'voice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                    background: voice.recording ? 'rgba(239,68,68,0.06)' : 'var(--surface-2)',
                    border: `1.5px solid ${voice.recording ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                    borderRadius: 14 }}>
                    <button onClick={voice.recording ? voice.stop : voice.start}
                      style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: voice.recording ? '#ef4444' : 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        boxShadow: voice.recording ? '0 0 0 6px rgba(239,68,68,0.18)' : '0 4px 14px rgba(37,99,235,0.4)',
                        transition: 'all 0.2s', animation: voice.recording ? 'pulse 1.4s ease infinite' : 'none' }}>
                      {voice.recording ? <MicOff size={20} color="#fff" /> : <Mic size={20} color="#fff" />}
                    </button>
                    <div>
                      <p style={{ fontWeight: 700, color: voice.recording ? '#ef4444' : voice.transcribing ? 'var(--primary)' : 'var(--text-1)', margin: '0 0 2px', fontSize: 14 }}>
                        {voice.recording ? '● Recording…' : voice.transcribing ? '◌ Transcribing…' : 'Press to record'}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>
                        {voice.recording ? 'Click again to stop and transcribe' : voice.transcribing ? 'Whisper AI is converting your audio' : 'Audio sent to Whisper for transcription'}
                      </p>
                    </div>
                  </div>
                  {voice.transcript && (
                    <textarea value={voice.transcript} onChange={e => voice.setTranscript(e.target.value)}
                      rows={5} placeholder="Transcript appears here..."
                      style={{ width: '100%', padding: '11px 14px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14, fontFamily: 'inherit', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                  )}
                </div>
              )}

              {/* PDF drop zone */}
              {source === 'pdf' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {!pdfFile ? (
                    <div
                      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setPdfFile(f); else if (f) showToast('Please drop a PDF file', 'error'); }}
                      onClick={() => fileInputRef.current?.click()}
                      style={{ border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-2)'}`, borderRadius: 16, padding: '36px 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragOver ? 'var(--primary-bg)' : 'var(--surface-2)' }}>
                      <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { if (f.size > 15 * 1024 * 1024) { showToast('PDF too large (max 15MB)', 'error'); return; } setPdfFile(f); } }} />
                      <div style={{ width: 52, height: 52, background: 'var(--surface-3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                        <Upload size={26} color="var(--text-3)" />
                      </div>
                      <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: '0 0 4px' }}>Drop PDF or click to upload</p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>AI extracts and structures all content · Max 15 MB</p>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      style={{ borderRadius: 14, border: '1.5px solid #10b981', overflow: 'hidden', background: 'var(--surface-2)' }}>
                      {/* PDF file header */}
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)', background: 'rgba(16,185,129,0.06)' }}>
                        <div style={{ width: 38, height: 38, borderRadius: 8, background: 'rgba(16,185,129,0.16)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileDigit size={18} color="#10b981" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, color: 'var(--text-1)', margin: 0, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdfFile.name}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '2px 0 0' }}>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB · ready to process</p>
                        </div>
                        <button onClick={() => setPdfFile(null)}
                          style={{ padding: '6px 10px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer', color: 'var(--text-2)', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <X size={11} /> Remove
                        </button>
                      </div>
                      {/* Inline PDF preview — large so user can read before pipeline runs */}
                      {pdfObjectUrl && (
                        <div style={{ height: 420, background: '#1a1a1a' }}>
                          <iframe src={pdfObjectUrl} title="PDF preview"
                            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* Capture button */}
              <button onClick={handleCapture} disabled={isProcessing || !canSubmit}
                className="btn-premium" style={{ width: '100%', fontSize: 14.5, gap: 10 }}>
                {isProcessing
                  ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Agents processing…</>
                  : <><Zap size={17} /> Run 7-Agent Capture Pipeline</>}
              </button>
            </div>
          </motion.div>
        </>
      ) : (
        /* ── Preview Panel ───────────────────────────────────────── */
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="view-card" style={{ overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#060b18 0%,#0d1f3c 60%,#0c2a6e 100%)', padding: '20px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ padding: '3px 8px', background: 'var(--primary)', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>
                  ✦ 7-Agent Processed
                </span>
                <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.12)', borderRadius: 5, fontSize: 10, fontWeight: 700 }}>{preview.domain}</span>
                <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.12)', borderRadius: 5, fontSize: 10, fontWeight: 700 }}>{preview.source_type}</span>
              </div>
              <h3 style={{ fontSize: 'clamp(15px,2.8vw,20px)', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{preview.title}</h3>
            </div>
            <button onClick={() => { setPreview(null); setAgentState({}); }}
              style={{ padding: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#fff', display: 'flex', flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>

          {/* Completed agent pipeline */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {AGENTS.map(ag => (
              <div key={ag.id} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: `color-mix(in srgb,${ag.color} 10%,transparent)`, border: `1px solid color-mix(in srgb,${ag.color} 25%,transparent)`, borderRadius: 20 }}>
                <CheckCircle2 size={10} color={ag.color} />
                <span style={{ fontSize: 10, fontWeight: 600, color: ag.color }}>{ag.label}</span>
              </div>
            ))}
          </div>

          {preview.source_type === 'youtube' && (previewUrl || preview.source_url) && (
            <div style={{ padding: '16px 20px 0' }}>
              <YouTubeEmbed url={previewUrl || preview.source_url!} />
            </div>
          )}

          {preview.source_type === 'pdf' && (preview.pdf_data || pdfObjectUrl) && (
            <div style={{ padding: '16px 20px 0' }}>
              <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', height: 540, background: '#1a1a1a' }}>
                <iframe src={preview.pdf_data || pdfObjectUrl} title="PDF preview" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, margin: '10px 0 0' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileDigit size={11} /> {pdfFile?.name || 'Document.pdf'}
                </span>
                {preview.pdf_pages != null && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#10b981', padding: '2px 8px', background: 'rgba(16,185,129,0.10)', borderRadius: 999, border: '1px solid rgba(16,185,129,0.25)' }}>
                    {preview.pdf_pages} {preview.pdf_pages === 1 ? 'page' : 'pages'}
                  </span>
                )}
                {preview.pdf_size_kb != null && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-2)', padding: '2px 8px', background: 'var(--surface-2)', borderRadius: 999, border: '1px solid var(--border)' }}>
                    {preview.pdf_size_kb < 1024 ? `${Math.round(preview.pdf_size_kb)} KB` : `${(preview.pdf_size_kb / 1024).toFixed(2)} MB`}
                  </span>
                )}
                {preview.pdf_word_count != null && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-2)', padding: '2px 8px', background: 'var(--surface-2)', borderRadius: 999, border: '1px solid var(--border)' }}>
                    ~{preview.pdf_word_count.toLocaleString()} words
                  </span>
                )}
                {preview.pdf_data && (
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--primary)', padding: '2px 8px', background: 'var(--primary-bg)', borderRadius: 999, border: '1px solid var(--primary-border)', letterSpacing: 0.4 }}>
                    EMBEDDED IN VAULT
                  </span>
                )}
              </div>
            </div>
          )}

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {preview.executive_summary && preview.executive_summary.trim() && (
              <section style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--primary-bg)', border: '1px solid var(--primary-border)' }}>
                <h4 style={{ fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11.5, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                  <Sparkles size={13} color="var(--primary)" /> Executive Summary
                </h4>
                <p style={{ color: 'var(--text-1)', lineHeight: 1.7, fontSize: 13.5, margin: 0, fontWeight: 500 }}>
                  {preview.executive_summary}
                </p>
              </section>
            )}

            <section>
              <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
                <Brain size={14} color="var(--primary)" /> Summary
              </h4>
              <p style={{ color: 'var(--text-2)', lineHeight: 1.75, fontSize: 13.5, margin: 0 }}>{preview.summary}</p>
            </section>

            <section>
              <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
                <CheckCircle2 size={14} color="#10b981" /> Key Insights
              </h4>
              <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8, padding: 0, listStyle: 'none', margin: 0 }}>
                {preview.key_points.map((point, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 12.5, color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, flexShrink: 0, border: '1px solid var(--primary-border)' }}>{i + 1}</span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>

            {preview.action_items && preview.action_items.length > 0 && (
              <section>
                <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
                  <Target size={14} color="#f97316" /> Action Items
                </h4>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 0, listStyle: 'none', margin: 0 }}>
                  {preview.action_items.map((item, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(249,115,22,0.06)', borderRadius: 10, fontSize: 13, color: 'var(--text-1)', border: '1px solid rgba(249,115,22,0.18)', alignItems: 'flex-start' }}>
                      <ListChecks size={14} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ lineHeight: 1.55 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {preview.glossary && preview.glossary.length > 0 && (
              <section>
                <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
                  <BookOpen size={14} color="#a78bfa" /> Glossary
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 8 }}>
                  {preview.glossary.map((g, i) => (
                    <div key={i} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#a78bfa', marginBottom: 3, letterSpacing: 0.2 }}>{g.term}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{g.definition}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {preview.study_questions && preview.study_questions.length > 0 && (
              <section>
                <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
                  <HelpCircle size={14} color="#22d3ee" /> Study Questions
                </h4>
                <ol style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 0, margin: 0, listStyle: 'none' }}>
                  {preview.study_questions.map((q, i) => (
                    <li key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'rgba(34,211,238,0.06)', borderRadius: 10, fontSize: 13, color: 'var(--text-1)', border: '1px solid rgba(34,211,238,0.18)' }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(34,211,238,0.18)', color: '#0e7490', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>Q{i + 1}</span>
                      <span style={{ lineHeight: 1.55 }}>{q}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <section>
              <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
                <Tag size={14} color="#fbbf24" /> Smart Tags
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {preview.tags.map(tag => (
                  <span key={tag} style={{ padding: '4px 10px', background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid var(--primary-border)' }}>#{tag}</span>
                ))}
              </div>
            </section>

            {preview.source_url && (
              <a href={preview.source_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                <ExternalLink size={12} /> View Original Source
              </a>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => { setPreview(null); setAgentState({}); }} className="btn-secondary" style={{ flex: 1, minWidth: 100 }}>Discard</button>
              <button onClick={handleSave} disabled={isProcessing} className="btn-premium" style={{ flex: 2, minWidth: 140 }}>
                {isProcessing ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                Save to Vault
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CaptureView;
