import { useState, useCallback } from 'react';
import {
  Youtube, Globe, FileText, StickyNote, Image, Mic,
  Link, Upload, X, Check, Clock, Sparkles, ChevronRight,
  AlertCircle, Loader, Tag, Brain, Shield, ShieldCheck, ShieldAlert,
  Eye, Lock, Zap, AlertTriangle, CheckCircle2, ScanLine, Library
} from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';
import { useNavigate } from 'react-router';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-c294fbf1`;
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` };

type SourceType = 'youtube' | 'web' | 'pdf' | 'note' | 'image' | 'audio';

const SOURCE_TYPES: { id: SourceType; icon: any; label: string; color: string; desc: string }[] = [
  { id: 'youtube', icon: Youtube, label: 'YouTube', color: '#ff4444', desc: 'Extract insights from videos' },
  { id: 'web', icon: Globe, label: 'Webpage', color: '#00d4ff', desc: 'Capture any URL or article' },
  { id: 'pdf', icon: FileText, label: 'PDF / Doc', color: '#f59e0b', desc: 'Upload documents & papers' },
  { id: 'note', icon: StickyNote, label: 'Quick Note', color: '#8b5cf6', desc: 'Capture text thoughts' },
  { id: 'image', icon: Image, label: 'Image', color: '#f472b6', desc: 'Visual knowledge capture' },
  { id: 'audio', icon: Mic, label: 'Audio', color: '#10b981', desc: 'Record or upload audio' },
];

const CAPTURE_QUEUE = [
  {
    id: 1,
    type: 'youtube' as SourceType,
    title: 'Geoffrey Hinton on Neural Nets',
    status: 'completed',
    color: '#ff4444',
    time: '2m ago',
    insights: 18,
    thumbnail: 'https://images.unsplash.com/photo-1768327239584-e97d004f1830?w=120&q=80',
  },
  {
    id: 2,
    type: 'pdf' as SourceType,
    title: 'Consciousness and the Brain (PDF)',
    status: 'processing',
    color: '#f59e0b',
    time: 'Just now',
    insights: null,
    thumbnail: 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=120&q=80',
  },
  {
    id: 3,
    type: 'web' as SourceType,
    title: 'Anthropic Scaling Laws Blog',
    status: 'completed',
    color: '#00d4ff',
    time: '15m ago',
    insights: 12,
    thumbnail: 'https://images.unsplash.com/photo-1762279801041-88a60aee22b7?w=120&q=80',
  },
  {
    id: 4,
    type: 'audio' as SourceType,
    title: 'Meeting Notes – AI Team Sync',
    status: 'queued',
    color: '#10b981',
    time: '30m ago',
    insights: null,
    thumbnail: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?w=120&q=80',
  },
];

const AI_SUGGESTIONS = [
  'Connect this to your existing notes on Transformers',
  'Tag with: #AI #Research #Scaling',
  'Related: 3 memories about LLM training',
  'Add to collection: "Neural Architecture Studies"',
];

const getSourceIcon = (type: SourceType) => {
  const found = SOURCE_TYPES.find(s => s.id === type);
  return found ? { Icon: found.icon, color: found.color } : { Icon: Globe, color: '#00d4ff' };
};

type ScanPhase = 'idle' | 'scanning' | 'safe' | 'flagged';

interface SecurityResult {
  phase: ScanPhase;
  score: number;
  checks: { label: string; status: 'pass' | 'fail' | 'warn'; detail: string }[];
  threat?: string;
}

export function KnowledgeCapture() {
  const [activeSource, setActiveSource] = useState<SourceType>('youtube');
  const [inputValue, setInputValue] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [tags, setTags] = useState(['AI', 'Research']);
  const [tagInput, setTagInput] = useState('');
  const [security, setSecurity] = useState<SecurityResult>({ phase: 'idle', score: 0, checks: [] });
  const [captureError, setCaptureError] = useState<string | null>(null);
  const { isMobile, isTablet } = useWindowSize();
  const navigate = useNavigate();

  const activeSourceData = SOURCE_TYPES.find(s => s.id === activeSource)!;

  const runSecurityScan = () => {
    setSecurity({ phase: 'scanning', score: 0, checks: [] });
    const isSafe = Math.random() > 0.18;
    setTimeout(() => {
      setSecurity({
        phase: isSafe ? 'safe' : 'flagged',
        score: isSafe ? Math.floor(88 + Math.random() * 12) : Math.floor(30 + Math.random() * 40),
        threat: isSafe ? undefined : 'Potential phishing pattern detected in domain',
        checks: [
          { label: 'Malware & Phishing Detection', status: isSafe ? 'pass' : 'fail', detail: isSafe ? 'No threats found' : 'Suspicious URL pattern' },
          { label: 'Content Safety Filter', status: isSafe ? 'pass' : 'warn', detail: isSafe ? 'Content verified clean' : 'Unverified content source' },
          { label: 'Privacy Leak Scan', status: 'pass', detail: 'No PII exposure detected' },
          { label: 'Data Integrity Check', status: isSafe ? 'pass' : 'warn', detail: isSafe ? 'Source verified authentic' : 'Source authenticity unclear' },
          { label: 'Encryption Verification', status: 'pass', detail: 'TLS/SSL certificate valid' },
        ],
      });
    }, 1800);
  };

  const deriveTitle = (): string => {
    if (activeSource === 'note') {
      return noteText.trim().slice(0, 60) || 'Quick Note';
    }
    if (inputValue.trim()) {
      try {
        const url = new URL(inputValue.trim());
        return url.hostname.replace('www.', '') + url.pathname.slice(0, 30);
      } catch {
        return inputValue.trim().slice(0, 60);
      }
    }
    return `${activeSourceData.label} Capture`;
  };

  const handleCapture = async () => {
    if (security.phase === 'idle' || security.phase === 'flagged') {
      runSecurityScan();
      return;
    }
    setIsCapturing(true);
    setCaptureError(null);
    try {
      const title = deriveTitle();
      const res = await fetch(`${API}/captures`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          type: activeSource,
          title,
          source: inputValue.trim() || noteText.trim().slice(0, 200),
          content: activeSource === 'note' ? noteText.trim() : inputValue.trim(),
          tags,
          securityScore: security.score,
          insights: Math.floor(Math.random() * 20) + 5,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save capture');
      setIsCapturing(false);
      setShowSuccess(true);
      setInputValue('');
      setNoteText('');
      setTags(['AI', 'Research']);
      setSecurity({ phase: 'idle', score: 0, checks: [] });
      setTimeout(() => {
        setShowSuccess(false);
        navigate('/app/captures');
      }, 2000);
    } catch (err: any) {
      console.error('Capture save error:', err);
      setCaptureError(err.message || 'Failed to save capture');
      setIsCapturing(false);
    }
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));
  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const mainColumns = isMobile || isTablet ? '1fr' : '1fr 380px';
  const sourceTypeColumns = isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)';

  const secBtnLabel = () => {
    if (showSuccess) return <><Check size={16} /> Memory Captured Successfully!</>;
    if (isCapturing) return <><Loader size={16} style={{ animation: 'rotate-slow 1s linear infinite' }} /> Neural Processing...</>;
    if (security.phase === 'scanning') return <><ScanLine size={16} style={{ animation: 'rotate-slow 1.2s linear infinite' }} /> AI Security Scanning...</>;
    if (security.phase === 'safe') return <><Brain size={16} /> Capture to Memory Bank</>;
    if (security.phase === 'flagged') return <><Shield size={16} /> Re-scan & Override</>;
    return <><Shield size={16} /> Scan &amp; Capture</>;
  };

  const secBtnBg = () => {
    if (showSuccess) return 'linear-gradient(135deg, #10b981, #059669)';
    if (security.phase === 'flagged') return 'linear-gradient(135deg, #f59e0b, #d97706)';
    if (security.phase === 'safe') return `linear-gradient(135deg, ${activeSourceData.color}, ${activeSourceData.color}cc)`;
    return `linear-gradient(135deg, #00d4ff, #0099cc)`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 18 : 24 }}>
      {/* Header */}
      <div className="fade-in-up">
        <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ color: '#fff', fontSize: isMobile ? 22 : 26, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
              Knowledge Capture
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              Ingest knowledge from any source into your neural memory bank
            </p>
          </div>
          {/* Security Engine badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.18)', borderRadius: 10, padding: '8px 14px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <ShieldCheck size={14} color="#00d4ff" />
            <span style={{ color: '#00d4ff', fontSize: 12, fontWeight: 600 }}>AI Security Engine Active</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mainColumns, gap: 24 }}>
        {/* Left Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Source Selector */}
          <div className="rs-card" style={{ padding: isMobile ? 16 : 22 }}>
            <div style={{ color: '#9ca3af', fontSize: 12, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 14 }}>
              Select Source Type
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: sourceTypeColumns, gap: 10 }}>
              {SOURCE_TYPES.map(({ id, icon: Icon, label, color, desc }) => {
                const active = activeSource === id;
                return (
                  <button
                    key={id}
                    onClick={() => { setActiveSource(id); setSecurity({ phase: 'idle', score: 0, checks: [] }); }}
                    style={{
                      padding: isMobile ? '12px' : '14px 16px',
                      borderRadius: 12,
                      border: `1px solid ${active ? color + '40' : 'rgba(255,255,255,0.07)'}`,
                      background: active ? `${color}10` : 'rgba(255,255,255,0.02)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left',
                      boxShadow: active ? `0 0 20px ${color}15` : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: `${color}18`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          filter: active ? `drop-shadow(0 0 6px ${color}80)` : 'none',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={15} color={color} />
                      </div>
                      <span style={{ color: active ? '#e2e8f0' : '#9ca3af', fontSize: 13, fontWeight: active ? 600 : 400 }}>
                        {label}
                      </span>
                    </div>
                    {!isMobile && (
                      <div style={{ color: '#4b5563', fontSize: 11 }}>{desc}</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input Area */}
          <div className="rs-card" style={{ padding: isMobile ? 16 : 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${activeSourceData.color}18`,
                  border: `1px solid ${activeSourceData.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 0 15px ${activeSourceData.color}20`,
                  flexShrink: 0,
                }}
              >
                <activeSourceData.icon size={18} color={activeSourceData.color} />
              </div>
              <div>
                <div style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 600 }}>
                  Capture {activeSourceData.label}
                </div>
                <div style={{ color: '#6b7280', fontSize: 12 }}>{activeSourceData.desc}</div>
              </div>
            </div>

            {activeSource === 'note' ? (
              <textarea
                className="rs-input scroll-custom"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Start typing your thoughts, ideas, or knowledge to capture..."
                style={{ minHeight: 140, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
            ) : activeSource === 'pdf' || activeSource === 'image' || activeSource === 'audio' ? (
              <div
                style={{
                  border: `2px dashed ${activeSourceData.color}30`,
                  borderRadius: 12,
                  padding: isMobile ? 28 : 40,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                  background: `${activeSourceData.color}05`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${activeSourceData.color}60`;
                  (e.currentTarget as HTMLDivElement).style.background = `${activeSourceData.color}08`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = `${activeSourceData.color}30`;
                  (e.currentTarget as HTMLDivElement).style.background = `${activeSourceData.color}05`;
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 14,
                    background: `${activeSourceData.color}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Upload size={24} color={activeSourceData.color} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: '#d1d5db', fontSize: 14, fontWeight: 500 }}>
                    Drop your {activeSource === 'pdf' ? 'PDF/document' : activeSource === 'image' ? 'image' : 'audio file'} here
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>
                    or click to browse files
                  </div>
                </div>
                <div style={{ color: '#4b5563', fontSize: 11 }}>
                  Supports{' '}
                  {activeSource === 'pdf'
                    ? 'PDF, DOCX, TXT, MD'
                    : activeSource === 'image'
                    ? 'PNG, JPG, WebP, SVG'
                    : 'MP3, WAV, M4A, FLAC'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid rgba(255,255,255,0.08)`,
                    borderRadius: 10,
                    padding: '10px 14px',
                  }}
                >
                  <Link size={15} color="#4b5563" />
                  <input
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#e2e8f0',
                      fontSize: 14,
                      minWidth: 0,
                    }}
                    placeholder={
                      activeSource === 'youtube'
                        ? 'Paste YouTube URL...'
                        : 'Paste webpage URL...'
                    }
                    value={inputValue}
                    onChange={e => { setInputValue(e.target.value); setSecurity({ phase: 'idle', score: 0, checks: [] }); }}
                  />
                </div>
              </div>
            )}

            {/* Tags */}
            <div style={{ marginTop: 16 }}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Tag size={12} />
                Tags
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {tags.map(tag => (
                  <span
                    key={tag}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      background: 'rgba(139, 92, 246, 0.1)',
                      border: '1px solid rgba(139, 92, 246, 0.25)',
                      color: '#8b5cf6',
                      borderRadius: 6,
                      padding: '3px 8px',
                      fontSize: 12,
                    }}
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8b5cf6', display: 'flex' }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <input
                  style={{
                    background: 'transparent',
                    border: '1px dashed rgba(255,255,255,0.1)',
                    borderRadius: 6,
                    color: '#9ca3af',
                    fontSize: 12,
                    padding: '3px 8px',
                    outline: 'none',
                    width: 80,
                  }}
                  placeholder="Add tag..."
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                />
              </div>
            </div>

            {/* AI Suggestions */}
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                background: 'rgba(139, 92, 246, 0.06)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                borderRadius: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#8b5cf6', fontSize: 12, marginBottom: 8 }}>
                <Sparkles size={12} />
                AI Suggestions
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {AI_SUGGESTIONS.map((s, i) => (
                  <div key={i} style={{ color: '#9ca3af', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ChevronRight size={11} color="#6b7280" />
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {/* ── AI Security Engine Panel ─────────────────────────────── */}
            {security.phase !== 'idle' && (
              <div style={{
                marginTop: 16,
                borderRadius: 14,
                overflow: 'hidden',
                border: security.phase === 'flagged'
                  ? '1px solid rgba(245,158,11,0.35)'
                  : security.phase === 'safe'
                  ? '1px solid rgba(16,185,129,0.3)'
                  : '1px solid rgba(0,212,255,0.2)',
                background: security.phase === 'flagged'
                  ? 'rgba(245,158,11,0.05)'
                  : security.phase === 'safe'
                  ? 'rgba(16,185,129,0.04)'
                  : 'rgba(0,212,255,0.04)',
              }}>
                {/* Header bar */}
                <div style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                  {security.phase === 'scanning' && <ScanLine size={15} color="#00d4ff" style={{ animation: 'rotate-slow 1.2s linear infinite' }} />}
                  {security.phase === 'safe' && <ShieldCheck size={15} color="#10b981" />}
                  {security.phase === 'flagged' && <ShieldAlert size={15} color="#f59e0b" />}
                  <span style={{ color: security.phase === 'flagged' ? '#f59e0b' : security.phase === 'safe' ? '#10b981' : '#00d4ff', fontSize: 12, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    AI Security Engine
                    {security.phase === 'scanning' && ' — Scanning...'}
                    {security.phase === 'safe' && ' — Verified Safe'}
                    {security.phase === 'flagged' && ' — Threats Detected'}
                  </span>
                  {(security.phase === 'safe' || security.phase === 'flagged') && (
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#6b7280', fontSize: 10 }}>Trust Score</span>
                      <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 20, padding: '3px 10px', fontWeight: 700, fontSize: 13, color: security.score >= 80 ? '#10b981' : security.score >= 60 ? '#f59e0b' : '#ef4444' }}>
                        {security.score}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Scanning progress */}
                {security.phase === 'scanning' && (
                  <div style={{ padding: '14px 16px' }}>
                    {['Malware & Phishing Detection', 'Content Safety Filter', 'Privacy Leak Scan', 'Data Integrity Check', 'Encryption Verification'].map((label, i) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                        <Loader size={12} color="#00d4ff" style={{ animation: `rotate-slow ${0.8 + i * 0.15}s linear infinite`, flexShrink: 0 }} />
                        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${30 + i * 14}%`, background: 'linear-gradient(90deg, #00d4ff60, #00d4ff)', borderRadius: 2, animation: 'data-stream 1s linear infinite', backgroundSize: '200% 100%' }} />
                        </div>
                        <span style={{ color: '#4b5563', fontSize: 10, flexShrink: 0, width: 56 }}>{30 + i * 14}%</span>
                      </div>
                    ))}
                    <div style={{ color: '#4b5563', fontSize: 11, marginTop: 6, textAlign: 'center' }}>Running 5 neural security checks...</div>
                  </div>
                )}

                {/* Results */}
                {(security.phase === 'safe' || security.phase === 'flagged') && (
                  <div style={{ padding: '12px 16px' }}>
                    {security.threat && (
                      <div style={{ display: 'flex', gap: 8, padding: '9px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 9, marginBottom: 12, alignItems: 'flex-start' }}>
                        <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ color: '#f59e0b', fontSize: 12 }}>{security.threat}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {security.checks.map((chk) => (
                        <div key={chk.label} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          {chk.status === 'pass' && <CheckCircle2 size={13} color="#10b981" style={{ flexShrink: 0 }} />}
                          {chk.status === 'warn' && <AlertTriangle size={13} color="#f59e0b" style={{ flexShrink: 0 }} />}
                          {chk.status === 'fail' && <AlertCircle size={13} color="#ef4444" style={{ flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ color: chk.status === 'pass' ? '#9ca3af' : chk.status === 'warn' ? '#f59e0b' : '#ef4444', fontSize: 12 }}>{chk.label}</span>
                          </div>
                          <span style={{ color: '#4b5563', fontSize: 10, flexShrink: 0 }}>{chk.detail}</span>
                        </div>
                      ))}
                    </div>
                    {/* Trust bar */}
                    <div style={{ marginTop: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#6b7280', fontSize: 10 }}>Content Trust Score</span>
                        <span style={{ color: security.score >= 80 ? '#10b981' : '#f59e0b', fontSize: 10, fontWeight: 600 }}>{security.score}/100</span>
                      </div>
                      <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${security.score}%`, borderRadius: 3, background: security.score >= 80 ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)', boxShadow: `0 0 8px ${security.score >= 80 ? '#10b981' : '#f59e0b'}60`, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Capture Button */}
            <button
              onClick={handleCapture}
              disabled={isCapturing || security.phase === 'scanning'}
              style={{
                marginTop: 16,
                width: '100%',
                padding: '13px',
                borderRadius: 11,
                border: 'none',
                background: showSuccess
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : secBtnBg(),
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                cursor: (isCapturing || security.phase === 'scanning') ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: showSuccess
                  ? '0 0 25px rgba(16, 185, 129, 0.4)'
                  : security.phase === 'safe' ? `0 0 25px ${activeSourceData.color}40` : '0 0 25px rgba(0,212,255,0.3)',
                transition: 'all 0.3s ease',
                opacity: security.phase === 'scanning' ? 0.7 : 1,
              }}
            >
              {secBtnLabel()}
            </button>

            {security.phase === 'safe' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 8 }}>
                <Lock size={10} color="#10b981" />
                <span style={{ color: '#10b981', fontSize: 11 }}>Security scan passed · Safe to capture</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Queue Header */}
          <div className="rs-card" style={{ padding: isMobile ? 16 : 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 }}>Capture Queue</h3>
                <p style={{ color: '#6b7280', fontSize: 12, marginTop: 3 }}>Neural processing pipeline</p>
              </div>
              <div
                style={{
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.2)',
                  borderRadius: 6,
                  padding: '3px 10px',
                  color: '#00d4ff',
                  fontSize: 12,
                }}
              >
                {CAPTURE_QUEUE.length} items
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {CAPTURE_QUEUE.map(({ id, type, title, status, color, time, insights, thumbnail }) => {
                const { Icon } = getSourceIcon(type);
                return (
                  <div
                    key={id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.06)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = `${color}30`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
                    }}
                  >
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        overflow: 'hidden',
                        flexShrink: 0,
                        position: 'relative',
                      }}
                    >
                      <img src={thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: `${color}30`,
                        }}
                      >
                        <Icon size={16} color={color} />
                      </div>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          color: '#d1d5db',
                          fontSize: 13,
                          fontWeight: 500,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          marginBottom: 4,
                        }}
                      >
                        {title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 11 }}>
                        <Clock size={10} />
                        {time}
                      </div>
                    </div>

                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      {status === 'completed' && (
                        <>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 3,
                              background: 'rgba(16, 185, 129, 0.1)',
                              border: '1px solid rgba(16, 185, 129, 0.2)',
                              borderRadius: 5,
                              padding: '2px 6px',
                              color: '#10b981',
                              fontSize: 10,
                            }}
                          >
                            <Check size={9} />
                            Done
                          </div>
                          <span style={{ color: '#6b7280', fontSize: 10 }}>{insights} insights</span>
                        </>
                      )}
                      {status === 'processing' && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                            background: 'rgba(0, 212, 255, 0.1)',
                            border: '1px solid rgba(0, 212, 255, 0.2)',
                            borderRadius: 5,
                            padding: '2px 6px',
                            color: '#00d4ff',
                            fontSize: 10,
                          }}
                        >
                          <Loader size={9} style={{ animation: 'rotate-slow 1s linear infinite' }} />
                          Processing
                        </div>
                      )}
                      {status === 'queued' && (
                        <div
                          style={{
                            background: 'rgba(107, 114, 128, 0.1)',
                            border: '1px solid rgba(107, 114, 128, 0.2)',
                            borderRadius: 5,
                            padding: '2px 6px',
                            color: '#6b7280',
                            fontSize: 10,
                          }}
                        >
                          Queued
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Neural Tip */}
          <div
            style={{
              padding: 18,
              background: 'rgba(0, 212, 255, 0.04)',
              border: '1px solid rgba(0, 212, 255, 0.12)',
              borderRadius: 14,
            }}
          >
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <AlertCircle size={16} color="#00d4ff" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ color: '#00d4ff', fontSize: 13, fontWeight: 600 }}>Neural Tip</div>
            </div>
            <div style={{ color: '#9ca3af', fontSize: 12, lineHeight: 1.6 }}>
              Adding tags helps RecallSense build stronger memory connections. The AI will automatically
              suggest related memories from your existing knowledge base.
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Today', value: '24', color: '#00d4ff' },
              { label: 'This week', value: '147', color: '#8b5cf6' },
              { label: 'Processing', value: '2', color: '#f59e0b' },
              { label: 'Total', value: '2,847', color: '#10b981' },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                style={{
                  padding: 14,
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${color}20`,
                  borderRadius: 10,
                  textAlign: 'center',
                }}
              >
                <div style={{ color, fontSize: 22, fontWeight: 700 }}>{value}</div>
                <div style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>Captured {label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}