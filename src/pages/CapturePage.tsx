import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe, StickyNote, FileText, Sparkles, Loader2, CheckCircle2, X, Brain,
  Tag, ExternalLink, Save, Upload, Mic, MicOff, Code2, Twitter, Clipboard,
  Youtube, Link2, Zap, Shield, Network, Search, Layers,
  AlertCircle, Eye, FileDigit, Target, BookOpen, HelpCircle, ListChecks,
  Clock, FolderOpen, Star, ArrowRight, GitBranch,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { YouTubeEmbed, YouTubeThumbnail, getYouTubeId } from '../lib/utils';
import { showToast } from '../App';
import type { Memory } from '../lib/types';
import { RevisitScheduler } from '../components/RevisitScheduler';

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
interface CaptureViewProps { embedded?: boolean }
const CaptureView: React.FC<CaptureViewProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [source, setSource]             = useState<string>('web');
  const [input, setInput]               = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview]           = useState<Memory | null>(null);
  const [previewUrl, setPreviewUrl]     = useState('');
  const [pdfFile, setPdfFile]           = useState<File | null>(null);
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string>('');
  const [dragOver, setDragOver]         = useState(false);
  const [justSavedId, setJustSavedId]   = useState<string | null>(null);
  const [justSaved, setJustSaved]       = useState<{ id: string; title: string; url: string } | null>(null);
  const [showRevisit, setShowRevisit]   = useState(false);
  const [agentState, setAgentState]     = useState<Record<string, AgentStatus>>({});
  const [activeAgentDesc, setActiveAgentDesc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceRecorder();

  // ── Time Capture (capture-my-last-N-hours bundle) ───────────────
  const [bundling, setBundling] = useState<null | number>(null); // hours we're bundling, or null
  const [bundleResult, setBundleResult] = useState<any>(null);
  // Synchronous lock — React state updates are async, so a rapid double-click
  // can otherwise pass the `bundling !== null` check twice and fire two requests.
  const bundlingLock = useRef(false);
  const runTimeBundle = async (hours: number) => {
    if (bundlingLock.current || bundling !== null) return;
    bundlingLock.current = true;
    setBundling(hours);
    setBundleResult(null);
    try {
      const r = await fetch('/capture/time-bundle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      const data = await r.json();
      setBundleResult(data);
      if (data?.ok) {
        showToast(`Bundled ${data.stats?.captured || 0} captures into "${data.project?.name || 'workspace'}"`);
      } else if (data?.reason === 'no_recent') {
        showToast(`No captures in the last ${hours}h yet`);
      } else if (data?.reason === 'all_bundled') {
        showToast('All recent captures already in a workspace');
      } else {
        showToast(data?.message || data?.detail || 'Time bundle failed');
      }
    } catch (e: any) {
      showToast(e?.message || 'Time bundle failed');
    } finally {
      setBundling(null);
      bundlingLock.current = false;
    }
  };

  // ── Multi-Source Capture Session (tray of mixed inputs → 1 workspace) ──
  type SessionItem =
    | { id: string; kind: 'note';  content: string }
    | { id: string; kind: 'link';  url: string }
    | { id: string; kind: 'voice'; transcript: string }
    | { id: string; kind: 'image'; data_url: string; caption: string };

  const [sessionMode, setSessionMode] = useState(false);
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [sessionDraftKind, setSessionDraftKind] = useState<'note' | 'link' | 'voice' | 'image'>('note');
  const [sessionDraftText, setSessionDraftText] = useState('');
  const [sessionFolderMode, setSessionFolderMode] = useState<'auto' | 'create' | 'existing'>('auto');
  const [sessionFolderName, setSessionFolderName] = useState('');
  const [sessionExistingId, setSessionExistingId] = useState('');
  const [sessionHint, setSessionHint] = useState('');
  const [sessionProjects, setSessionProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [sessionSubmitting, setSessionSubmitting] = useState(false);
  const [sessionResult, setSessionResult] = useState<any>(null);
  const sessionImageInputRef = useRef<HTMLInputElement>(null);
  const sessionVoice = useVoiceRecorder();
  const sessionSubmitLock = useRef(false);

  // Lazily fetch existing workspaces when user picks the Existing mode.
  useEffect(() => {
    if (!sessionMode || sessionFolderMode !== 'existing' || sessionProjects.length > 0) return;
    fetch('/workspace/projects')
      .then(r => r.json())
      .then(d => setSessionProjects(((d?.projects || []) as any[]).map(p => ({ id: p.id, name: p.name }))))
      .catch(() => {});
  }, [sessionMode, sessionFolderMode, sessionProjects.length]);

  const newSessionId = () => Math.random().toString(36).slice(2, 10);

  const addSessionItem = (item: SessionItem) => setSessionItems(prev => [...prev, item]);
  const removeSessionItem = (id: string) => setSessionItems(prev => prev.filter(x => x.id !== id));

  const commitDraftItem = () => {
    const text = sessionDraftText.trim();
    if (sessionDraftKind === 'note') {
      if (!text) { showToast('Note is empty'); return; }
      addSessionItem({ id: newSessionId(), kind: 'note', content: text });
    } else if (sessionDraftKind === 'link') {
      if (!text || !/^https?:\/\//i.test(text)) { showToast('Enter a valid URL'); return; }
      addSessionItem({ id: newSessionId(), kind: 'link', url: text });
    } else {
      return;
    }
    setSessionDraftText('');
  };

  const commitVoiceToSession = () => {
    const t = (sessionVoice.transcript || '').trim();
    if (!t || t.startsWith('Transcribing')) { showToast('No transcript yet'); return; }
    addSessionItem({ id: newSessionId(), kind: 'voice', transcript: t });
    sessionVoice.setTranscript('');
  };

  const handleSessionImagePick = (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { showToast('Image too large (max 2MB)'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      addSessionItem({ id: newSessionId(), kind: 'image', data_url: dataUrl, caption: file.name.replace(/\.[^.]+$/, '') });
    };
    reader.readAsDataURL(file);
  };

  const submitSession = async () => {
    if (sessionSubmitLock.current || sessionSubmitting) return;
    if (sessionItems.length === 0) { showToast('Add at least one item'); return; }
    if (sessionFolderMode === 'create' && !sessionFolderName.trim()) { showToast('Folder name required'); return; }
    if (sessionFolderMode === 'existing' && !sessionExistingId) { showToast('Pick an existing folder'); return; }
    sessionSubmitLock.current = true;
    setSessionSubmitting(true);
    setSessionResult(null);
    try {
      const r = await fetch('/capture/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          items: sessionItems.map(it => {
            if (it.kind === 'note')  return { kind: 'note',  content: it.content };
            if (it.kind === 'link')  return { kind: 'link',  url: it.url };
            if (it.kind === 'voice') return { kind: 'voice', transcript: it.transcript };
            return { kind: 'image', data_url: it.data_url, caption: it.caption };
          }),
          folder_mode: sessionFolderMode,
          folder_name: sessionFolderName.trim(),
          project_id: sessionExistingId,
          hint: sessionHint.trim(),
        }),
      });
      const data = await r.json();
      setSessionResult(data);
      if (data?.ok) {
        showToast(`Session saved · ${data.stats?.captured || 0} items → "${data.project?.name || 'workspace'}"`);
        setSessionItems([]);
        setSessionFolderName('');
        setSessionHint('');
      } else {
        showToast(data?.message || data?.detail || 'Session save failed');
      }
    } catch (e: any) {
      showToast(e?.message || 'Session save failed');
    } finally {
      setSessionSubmitting(false);
      sessionSubmitLock.current = false;
    }
  };

  const sessionItemLabel = (it: SessionItem) => {
    if (it.kind === 'note')  return it.content.slice(0, 80);
    if (it.kind === 'link')  return it.url;
    if (it.kind === 'voice') return it.transcript.slice(0, 80);
    return it.caption || 'image';
  };

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
        if (memId) {
          setJustSavedId(memId);
          setJustSaved({
            id: memId,
            title: saved?.title || preview?.title || 'Captured item',
            url: saved?.source_url || preview?.source_url || '',
          });
          setShowRevisit(true);
          setTimeout(() => setJustSavedId(prev => prev === memId ? null : prev), 15000);
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

      {/* ── Just-saved pill (jump into timeline) ───────────────── */}
      <AnimatePresence>
        {justSavedId && (
          <motion.div
            key={justSavedId}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
              background: 'linear-gradient(90deg, rgba(167,139,250,0.10), rgba(244,114,182,0.10))',
              border: '1px solid rgba(167,139,250,0.35)', borderRadius: 10,
            }}>
            <CheckCircle2 size={15} color="#10b981" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>Saved to your Vault.</span>
            <span style={{ flex: 1 }} />
            <button onClick={() => navigate(`/memory/${justSavedId}`)}
              style={{ padding: '5px 11px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-1)', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Eye size={11} /> Open
            </button>
            <button onClick={() => navigate('/timeline')}
              style={{ padding: '5px 11px', background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <GitBranch size={11} /> View Timeline
            </button>
            <button onClick={() => setJustSavedId(null)}
              style={{ padding: 4, background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
              title="Dismiss">
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Inline Revisit Scheduler — shown right after a save ───── */}
      <AnimatePresence>
        {showRevisit && justSaved && (
          <RevisitScheduler
            key={justSaved.id}
            defaultTitle={justSaved.title}
            defaultUrl={justSaved.url}
            memoryId={justSaved.id}
            hintText={`${justSaved.title} ${justSaved.url}`}
            onCreated={() => { setShowRevisit(false); setJustSaved(null); }}
            onCancel={() => { setShowRevisit(false); setJustSaved(null); }}
          />
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────── */}
      {!embedded && (
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
      )}

      {/* ── Time Capture: bundle the last N hours into one workspace ──── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="view-card"
        style={{
          padding: '14px 16px',
          background: 'linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(168,85,247,0.06) 100%)',
          border: '1px solid var(--primary-border)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(34,211,238,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Clock size={18} color="#22d3ee" />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>
              Capture my recent activity
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
              Bundle scattered captures into one AI-organized workspace · skips already-bundled items
            </div>
          </div>
          <div style={{
            display: 'flex', gap: 8, flexWrap: 'wrap',
            // Hard-disable the entire button group at the DOM level when a bundle
            // is in flight — pointer-events:none beats React's async state updates
            // and stops rapid double-clicks before JS event handlers even fire.
            pointerEvents: bundling !== null ? 'none' : 'auto',
          }} aria-busy={bundling !== null}>
            {[{ h: 6, label: 'Last 6 hours' }, { h: 24, label: 'Full day (24h)' }].map(opt => (
              <button key={opt.h}
                type="button"
                onClick={() => runTimeBundle(opt.h)}
                disabled={bundling !== null}
                aria-disabled={bundling !== null}
                style={{
                  padding: '8px 14px', fontSize: 12, fontWeight: 700,
                  borderRadius: 999,
                  border: '1px solid var(--primary-border)',
                  background: bundling === opt.h ? 'var(--primary)' : 'var(--surface-2)',
                  color: bundling === opt.h ? '#fff' : 'var(--text-1)',
                  cursor: bundling !== null ? 'wait' : 'pointer',
                  opacity: bundling !== null && bundling !== opt.h ? 0.55 : 1,
                  display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s',
                }}>
                {bundling === opt.h ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {bundleResult && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                {bundleResult.ok ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Title + counters */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                      <FolderOpen size={16} color="var(--primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.3 }}>
                          {bundleResult.project?.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                          {bundleResult.stats?.captured} captures · {bundleResult.stats?.folders} folders
                          {bundleResult.stats?.skipped_already_bundled > 0 && ` · ${bundleResult.stats.skipped_already_bundled} skipped (dedup)`}
                        </div>
                      </div>
                      <a href="/workspace"
                        style={{
                          padding: '6px 12px', fontSize: 11, fontWeight: 700, borderRadius: 8,
                          background: 'var(--primary)', color: '#fff', textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                        Open <ArrowRight size={11} />
                      </a>
                    </div>

                    {/* Summary */}
                    {bundleResult.summary && (
                      <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                        {bundleResult.summary}
                      </div>
                    )}

                    {/* Folders */}
                    {bundleResult.project?.folders?.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {bundleResult.project.folders.map((f: any) => (
                          <span key={f.id} style={{
                            padding: '3px 9px', fontSize: 10.5, fontWeight: 700,
                            background: 'var(--surface-2)', border: '1px solid var(--border)',
                            borderRadius: 999, color: 'var(--text-2)',
                          }}>
                            {f.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Key learnings */}
                    {bundleResult.key_learnings?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.5px', marginBottom: 4 }}>
                          KEY LEARNINGS
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>
                          {bundleResult.key_learnings.slice(0, 5).map((l: string, i: number) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Highlights */}
                    {bundleResult.highlights?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Star size={10} /> HIGHLIGHTS
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {bundleResult.highlights.map((h: any, i: number) => (
                            <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>
                              <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{h.title}</span>
                              {h.why && <span style={{ color: 'var(--text-3)' }}> — {h.why}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--text-3)' }}>
                    <AlertCircle size={14} color="var(--text-3)" />
                    <span>{bundleResult.message || 'Nothing to bundle right now.'}</span>
                    <button onClick={() => setBundleResult(null)} style={{
                      marginLeft: 'auto', padding: '4px 8px', fontSize: 11, background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-3)', cursor: 'pointer',
                    }}>Dismiss</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Capture Session: tray of mixed inputs → ONE workspace folder ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="view-card"
        style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(168,85,247,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Layers size={18} color="#a855f7" />
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.2 }}>
              Capture Session — multi-source bundle
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 2 }}>
              Add notes, links, voice, images — commit them all into one folder
            </div>
          </div>
          <button type="button" onClick={() => setSessionMode(v => !v)}
            style={{
              padding: '7px 14px', fontSize: 12, fontWeight: 700, borderRadius: 999,
              border: '1px solid var(--primary-border)',
              background: sessionMode ? 'var(--primary)' : 'var(--surface-2)',
              color: sessionMode ? '#fff' : 'var(--text-1)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {sessionMode ? 'Session ON' : 'Start session'}
          </button>
        </div>

        <AnimatePresence>
          {sessionMode && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* ── Add-item area (kind picker + draft input) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['note', 'link', 'voice', 'image'] as const).map(k => {
                      const Icon = k === 'note' ? StickyNote : k === 'link' ? Link2 : k === 'voice' ? Mic : FileDigit;
                      return (
                        <button key={k} type="button" onClick={() => setSessionDraftKind(k)}
                          style={{
                            padding: '6px 12px', fontSize: 11.5, fontWeight: 700, borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: sessionDraftKind === k ? 'var(--primary-bg)' : 'var(--surface-2)',
                            color: sessionDraftKind === k ? 'var(--primary)' : 'var(--text-2)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                          }}>
                          <Icon size={11} /> {k}
                        </button>
                      );
                    })}
                  </div>

                  {(sessionDraftKind === 'note' || sessionDraftKind === 'link') && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text"
                        value={sessionDraftText}
                        onChange={e => setSessionDraftText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitDraftItem(); } }}
                        placeholder={sessionDraftKind === 'note' ? 'Type a note and press Enter…' : 'Paste a URL and press Enter…'}
                        style={{
                          flex: 1, padding: '8px 12px', fontSize: 13, borderRadius: 8,
                          border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)',
                        }} />
                      <button type="button" onClick={commitDraftItem}
                        style={{
                          padding: '8px 14px', fontSize: 12, fontWeight: 700, borderRadius: 8,
                          border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer',
                        }}>Add</button>
                    </div>
                  )}

                  {sessionDraftKind === 'voice' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {!sessionVoice.recording ? (
                          <button type="button" onClick={sessionVoice.start} disabled={sessionVoice.transcribing}
                            style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none',
                              background: '#10b981', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Mic size={12} /> Record
                          </button>
                        ) : (
                          <button type="button" onClick={sessionVoice.stop}
                            style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none',
                              background: '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <MicOff size={12} /> Stop
                          </button>
                        )}
                        {sessionVoice.transcribing && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Transcribing…</span>}
                        {sessionVoice.transcript && !sessionVoice.transcribing && (
                          <button type="button" onClick={commitVoiceToSession}
                            style={{ padding: '6px 12px', fontSize: 11.5, fontWeight: 700, borderRadius: 8,
                              border: '1px solid var(--primary-border)', background: 'var(--primary-bg)', color: 'var(--primary)', cursor: 'pointer' }}>
                            Add transcript to session
                          </button>
                        )}
                      </div>
                      {sessionVoice.transcript && !sessionVoice.transcribing && (
                        <div style={{ fontSize: 12, color: 'var(--text-2)', padding: 10, background: 'var(--surface-2)', borderRadius: 8, border: '1px solid var(--border)', maxHeight: 100, overflowY: 'auto' }}>
                          {sessionVoice.transcript}
                        </div>
                      )}
                    </div>
                  )}

                  {sessionDraftKind === 'image' && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input ref={sessionImageInputRef} type="file" accept="image/*"
                        onChange={e => { handleSessionImagePick(e.target.files?.[0] || null); if (e.target) e.target.value = ''; }}
                        style={{ display: 'none' }} />
                      <button type="button" onClick={() => sessionImageInputRef.current?.click()}
                        style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: '1px solid var(--border)',
                          background: 'var(--surface-2)', color: 'var(--text-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Upload size={12} /> Pick image (max 2MB)
                      </button>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Stored in session as captioned data URL</span>
                    </div>
                  )}
                </div>

                {/* ── Tray of staged items ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.5px' }}>
                    SESSION TRAY · {sessionItems.length} item{sessionItems.length === 1 ? '' : 's'}
                  </div>
                  {sessionItems.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', padding: '8px 0' }}>
                      Nothing added yet — pick a kind above and add your first item.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                      {sessionItems.map(it => {
                        const Icon = it.kind === 'note' ? StickyNote : it.kind === 'link' ? Link2 : it.kind === 'voice' ? Mic : FileDigit;
                        return (
                          <div key={it.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                            background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8,
                          }}>
                            <Icon size={12} color="var(--text-3)" />
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{it.kind}</span>
                            <span style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {sessionItemLabel(it)}
                            </span>
                            <button type="button" onClick={() => removeSessionItem(it.id)}
                              aria-label="Remove item"
                              style={{ padding: 4, background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
                              <X size={12} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── Folder picker (auto / create / existing) ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 4 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text-3)', letterSpacing: '0.5px' }}>
                    DESTINATION FOLDER
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {([
                      { id: 'auto',     label: 'AI auto-folder', hint: 'AI names a new folder from your captures' },
                      { id: 'create',   label: 'New folder',     hint: 'Pick a name yourself' },
                      { id: 'existing', label: 'Existing…',      hint: 'Add into a workspace you already have' },
                    ] as const).map(opt => (
                      <button key={opt.id} type="button" onClick={() => setSessionFolderMode(opt.id)}
                        title={opt.hint}
                        style={{
                          padding: '6px 12px', fontSize: 11.5, fontWeight: 700, borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: sessionFolderMode === opt.id ? 'var(--primary-bg)' : 'var(--surface-2)',
                          color: sessionFolderMode === opt.id ? 'var(--primary)' : 'var(--text-2)',
                          cursor: 'pointer',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {sessionFolderMode === 'auto' && (
                    <input type="text" value={sessionHint}
                      onChange={e => setSessionHint(e.target.value)}
                      placeholder="Optional hint to steer the AI naming (e.g. 'morning research')"
                      style={{ marginTop: 4, padding: '7px 10px', fontSize: 12, borderRadius: 6,
                        border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)' }} />
                  )}

                  {sessionFolderMode === 'create' && (
                    <input type="text" value={sessionFolderName}
                      onChange={e => setSessionFolderName(e.target.value)}
                      placeholder="New folder name (required)"
                      style={{ marginTop: 4, padding: '7px 10px', fontSize: 12, borderRadius: 6,
                        border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)' }} />
                  )}

                  {sessionFolderMode === 'existing' && (
                    <select value={sessionExistingId}
                      onChange={e => setSessionExistingId(e.target.value)}
                      style={{ marginTop: 4, padding: '7px 10px', fontSize: 12, borderRadius: 6,
                        border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)' }}>
                      <option value="">— pick a workspace —</option>
                      {sessionProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* ── Submit ── */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, pointerEvents: sessionSubmitting ? 'none' : 'auto' }}
                  aria-busy={sessionSubmitting}>
                  <button type="button" onClick={() => { setSessionItems([]); setSessionResult(null); }}
                    disabled={sessionSubmitting || sessionItems.length === 0}
                    style={{ padding: '8px 14px', fontSize: 12, fontWeight: 700, borderRadius: 8,
                      border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-2)',
                      cursor: sessionItems.length === 0 ? 'not-allowed' : 'pointer', opacity: sessionItems.length === 0 ? 0.5 : 1 }}>
                    Clear tray
                  </button>
                  <button type="button" onClick={submitSession}
                    disabled={sessionSubmitting || sessionItems.length === 0}
                    aria-disabled={sessionSubmitting || sessionItems.length === 0}
                    style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none',
                      background: sessionItems.length > 0 ? 'var(--primary)' : 'var(--surface-3)',
                      color: '#fff', cursor: sessionSubmitting ? 'wait' : (sessionItems.length === 0 ? 'not-allowed' : 'pointer'),
                      display: 'flex', alignItems: 'center', gap: 6 }}>
                    {sessionSubmitting ? <Loader2 size={12} className="spin" /> : <CheckCircle2 size={12} />}
                    {sessionSubmitting ? 'Committing…' : 'Finish session'}
                  </button>
                </div>

                {/* ── Result card ── */}
                <AnimatePresence>
                  {sessionResult && sessionResult.ok && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ marginTop: 4, padding: 12, background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <FolderOpen size={14} color="var(--primary)" style={{ marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{sessionResult.project?.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                            {sessionResult.stats?.captured} item{sessionResult.stats?.captured === 1 ? '' : 's'} saved · folder mode: {sessionResult.stats?.folder_mode}
                          </div>
                          {sessionResult.summary && (
                            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>
                              {sessionResult.summary}
                            </div>
                          )}
                        </div>
                        <a href="/workspace" style={{
                          padding: '5px 10px', fontSize: 11, fontWeight: 700, borderRadius: 6,
                          background: 'var(--primary)', color: '#fff', textDecoration: 'none',
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                        }}>
                          Open <ArrowRight size={10} />
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
                        {voice.recording ? 'Click again to stop and transcribe' : voice.transcribing ? 'Converting your audio…' : 'Audio is transcribed automatically'}
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

              {/* Capture button — morphs into the live agent pipeline while running */}
              {(isProcessing || Object.keys(agentState).length > 0) ? (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    width: '100%', borderRadius: 14, padding: '14px 16px 12px',
                    background: 'linear-gradient(135deg, color-mix(in srgb,var(--primary) 12%, var(--surface)) 0%, color-mix(in srgb,var(--primary) 4%, var(--surface)) 100%)',
                    border: '1.5px solid color-mix(in srgb,var(--primary) 30%, transparent)',
                    boxShadow: '0 4px 18px color-mix(in srgb,var(--primary) 12%, transparent)',
                  }}>
                  {/* Header row: title + live status / COMPLETE badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {isProcessing
                      ? <Loader2 size={14} color="var(--primary)" style={{ animation: 'spin 1s linear infinite' }} />
                      : <Layers size={14} color="var(--primary)" />}
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '0.3px' }}>
                      {isProcessing ? '7-Agent Capture Pipeline running' : '7-Agent Capture Pipeline'}
                    </span>
                    {activeAgentDesc && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>— {activeAgentDesc}</span>
                    )}
                    {!isProcessing && Object.keys(agentState).length > 0 && (
                      <span style={{ fontSize: 10.5, color: 'var(--success, #16a34a)', marginLeft: 'auto', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={11} /> COMPLETE
                      </span>
                    )}
                  </div>
                  {/* Agents row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 4 }}
                    className="scroll-custom">
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
                            <span style={{ fontSize: 9.5, fontWeight: st === 'active' ? 700 : 500, color: st === 'idle' ? 'var(--text-3)' : ag.color, textAlign: 'center', lineHeight: 1.2 }}>
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
              ) : (
                <button onClick={handleCapture} disabled={!canSubmit}
                  className="btn-premium" style={{ width: '100%', fontSize: 14.5, gap: 10 }}>
                  <Zap size={17} /> Run 7-Agent Capture Pipeline
                </button>
              )}
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
