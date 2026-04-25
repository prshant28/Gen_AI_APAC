import React, { useState, useRef } from 'react';
import { Globe, StickyNote, FileText, Sparkles, Loader2, CheckCircle2, X, Brain, Tag, ExternalLink, Save, Upload } from 'lucide-react';
import { motion } from 'motion/react';
import { YouTubeEmbed } from '../lib/utils';
import { showToast } from '../App';
import type { Memory } from '../lib/types';

const CaptureView = () => {
  const [activeTab, setActiveTab] = useState<'url' | 'text' | 'pdf'>('url');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<Memory | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = async () => {
    if (activeTab === 'pdf' && pdfFile) {
      setIsProcessing(true);
      try {
        const formData = new FormData();
        formData.append('file', pdfFile);
        const res = await fetch('/capture/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        if (!res.ok) throw new Error(data.detail || 'Upload failed');
        showToast('PDF captured and saved to Vault!');
        setPdfFile(null);
      } catch (err: any) {
        alert(err.message || 'Failed to process PDF.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (!input.trim()) return;
    setIsProcessing(true);
    try {
      const isYoutube = input.includes('youtube.com') || input.includes('youtu.be');
      const source_type = activeTab === 'url' ? (isYoutube ? 'youtube' : 'web') : 'note';
      const res = await fetch('/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_type, url: activeTab === 'url' ? input : '', content: activeTab === 'text' ? input : '', preview: true })
      });
      if (res.status === 401) {
        const data = await res.json();
        throw new Error(data.error || 'Unauthorized: Check API configuration.');
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.source_url && activeTab === 'url') data.source_url = input;
      setPreviewUrl(activeTab === 'url' ? input : '');
      setPreview(data);
    } catch (err: any) {
      alert(err.message || 'Failed to analyze content.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!preview) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview)
      });
      if (res.ok) { setPreview(null); setInput(''); showToast('Saved to Vault!'); }
    } catch (err) { console.error(err); }
    finally { setIsProcessing(false); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === 'application/pdf') setPdfFile(file);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 999, marginBottom: 12 }}>
          <Sparkles size={12} color="var(--primary)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.5px' }}>NEURAL AI CAPTURE ENGINE</span>
        </div>
        <h2 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, color: 'var(--text-1)', margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: "'Alegreya Sans SC',system-ui" }}>Capture Knowledge</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 14, margin: 0 }}>Feed your Second Brain with YouTube videos, web articles, PDFs, or notes.</p>
      </motion.div>

      {!preview ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="view-card" style={{ overflow: 'hidden' }}>
          <div className="capture-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
            {[
              { id: 'url', label: 'URL / YouTube', icon: Globe },
              { id: 'text', label: 'Quick Note', icon: StickyNote },
              { id: 'pdf', label: 'PDF Upload', icon: FileText },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '14px 8px', fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--primary)' : 'var(--text-3)', background: active ? 'var(--primary-bg)' : 'transparent', border: 'none', borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                >
                  <tab.icon size={15} />
                  <span className="capture-tab-label">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="capture-body" style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {activeTab === 'url' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Article or YouTube URL</label>
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCapture()}
                  placeholder="https://example.com/article or https://youtube.com/watch?v=..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14, outline: 'none', fontFamily: 'inherit', transition: 'all 0.15s', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; e.target.style.background = 'var(--surface)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--surface-2)'; }}
                />
                <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>Supports any web article or YouTube video URL</p>
              </div>
            )}

            {activeTab === 'text' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Paste your notes or ideas</label>
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Type or paste anything — meeting notes, ideas, research snippets..."
                  rows={7}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 11, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text-1)', fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'none', transition: 'all 0.15s', boxSizing: 'border-box' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; e.target.style.background = 'var(--surface)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'var(--surface-2)'; }}
                />
              </div>
            )}

            {activeTab === 'pdf' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !pdfFile && fileInputRef.current?.click()}
                style={{ border: `2px dashed ${dragOver ? '#6366f1' : pdfFile ? '#10b981' : 'var(--border-2)'}`, borderRadius: 16, padding: 'clamp(24px,5vw,56px) 24px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: dragOver ? 'var(--primary-bg)' : pdfFile ? 'rgba(16,185,129,0.06)' : 'var(--surface-2)' }}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && setPdfFile(e.target.files[0])} />
                <div style={{ width: 56, height: 56, background: pdfFile ? 'rgba(16,185,129,0.12)' : 'var(--surface-3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  {pdfFile ? <CheckCircle2 size={26} color="#10b981" /> : <Upload size={26} color="var(--text-3)" />}
                </div>
                {pdfFile ? (
                  <div>
                    <p style={{ fontWeight: 700, color: '#10b981', marginBottom: 4 }}>{pdfFile.name}</p>
                    <p style={{ fontSize: 12, color: '#10b981', marginBottom: 8 }}>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB — Ready to process</p>
                    <button onClick={(e) => { e.stopPropagation(); setPdfFile(null); }} style={{ fontSize: 11, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Remove file</button>
                  </div>
                ) : (
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Drop PDF here or click to upload</p>
                    <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 4 }}>AI will extract and analyze the content</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Max 10MB</p>
                  </div>
                )}
              </div>
            )}

            <button onClick={handleCapture}
              disabled={isProcessing || (activeTab !== 'pdf' && !input.trim()) || (activeTab === 'pdf' && !pdfFile)}
              className="btn-premium"
              style={{ width: '100%', fontSize: 15 }}
            >
              {isProcessing ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />AI is analyzing...</>
              ) : (
                <><Sparkles size={18} />Process with Neural AI</>
              )}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="view-card" style={{ overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg,#0d1117 0%,#1a1040 60%,#312e81 100%)', padding: 'clamp(20px,4vw,32px)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                <span style={{ padding: '3px 8px', background: '#6366f1', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Neural Analysis</span>
                <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.12)', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{preview.domain}</span>
                <span style={{ padding: '3px 8px', background: 'rgba(255,255,255,0.12)', borderRadius: 5, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{preview.source_type}</span>
              </div>
              <h3 style={{ fontSize: 'clamp(16px,3vw,22px)', fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{preview.title}</h3>
            </div>
            <button onClick={() => setPreview(null)} style={{ padding: 8, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', cursor: 'pointer', color: '#fff', display: 'flex', flexShrink: 0 }}>
              <X size={18} />
            </button>
          </div>

          {preview.source_type === 'youtube' && (previewUrl || preview.source_url) && (
            <div style={{ padding: '16px 16px 0' }}>
              <YouTubeEmbed url={previewUrl || preview.source_url!} />
            </div>
          )}

          <div style={{ padding: 'clamp(20px,4vw,32px)', display: 'flex', flexDirection: 'column', gap: 24 }}>
            <section>
              <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 14 }}><Brain size={15} color="var(--primary)" />Summary</h4>
              <p style={{ color: 'var(--text-2)', lineHeight: 1.7, fontSize: 14, margin: 0 }}>{preview.summary}</p>
            </section>
            <section>
              <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 14 }}><CheckCircle2 size={15} color="#10b981" />Key Insights</h4>
              <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 10, padding: 0, listStyle: 'none', margin: 0 }}>
                {preview.key_points.map((point, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 13, color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--primary-bg)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0, border: '1px solid var(--primary-border)' }}>{i + 1}</span>
                    {point}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h4 style={{ fontWeight: 700, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 14 }}><Tag size={15} color="#f59e0b" />Tags</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {preview.tags.map((tag) => (
                  <span key={tag} style={{ padding: '4px 10px', background: 'var(--primary-bg)', color: 'var(--primary)', borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid var(--primary-border)' }}>#{tag}</span>
                ))}
              </div>
            </section>
            {preview.source_url && (
              <a href={preview.source_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}>
                <ExternalLink size={13} />View Original Source
              </a>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <button onClick={() => setPreview(null)} className="btn-secondary" style={{ flex: 1, minWidth: 120 }}>Discard</button>
              <button onClick={handleSave} disabled={isProcessing} className="btn-premium" style={{ flex: 2, minWidth: 160 }}>
                {isProcessing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={16} />}
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
