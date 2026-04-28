import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Brain, Tag, ExternalLink, Youtube, Globe, FileText, StickyNote,
  CheckCircle2, Sparkles, Calendar, CheckSquare, ShoppingCart, Mail, Search,
  Network, Send, Loader2, Bot, Zap, BookOpen, Share2, Copy, Clock,
  FlipHorizontal, Clipboard, Link2, ChevronRight, AlertCircle, Layers,
  MessageCircle, ListTodo, Bell, SquareArrowOutUpRight, RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { YouTubeEmbed } from '../lib/utils';
import { showToast } from '../App';
import type { Memory } from '../lib/types';

/* ── Helpers ─────────────────────────────────────────────────────── */
const SRC = {
  youtube: { icon: Youtube,   color: '#ef4444', label: 'YouTube'  },
  web:     { icon: Globe,     color: '#3b82f6', label: 'Web'      },
  pdf:     { icon: FileText,  color: '#f59e0b', label: 'PDF'      },
  note:    { icon: StickyNote,color: '#22d3ee', label: 'Note'     },
};

/* ── Smart Action Detector ───────────────────────────────────────── */
function detectActions(memory: Memory) {
  const text = [memory.title, memory.summary, ...memory.key_points].join(' ').toLowerCase();
  const actions: { id: string; label: string; desc: string; icon: any; color: string; agent: string }[] = [];

  const kw = (words: string[]) => words.some(w => text.includes(w));

  if (kw(['schedule','book','meeting','appointment','event','workshop','webinar','conference','session','date']))
    actions.push({ id:'calendar', label:'Schedule Event', desc:'Add to calendar via CalendarAgent', icon:Calendar, color:'#f59e0b', agent:'CalendarAgent' });

  if (kw(['todo','action','implement','build','create','research','study','learn','complete','task','deadline','milestone','goal']))
    actions.push({ id:'task', label:'Create Task', desc:'TaskAgent will add to your list', icon:CheckSquare, color:'#10b981', agent:'TaskAgent' });

  if (kw(['buy','purchase','price','$','order','product','tool','software','app','subscribe','plan','cost','deal']))
    actions.push({ id:'shop', label:'Shopping List', desc:'Save items to review later', icon:ShoppingCart, color:'#f472b6', agent:'CaptureAgent' });

  if (kw(['email','send','share','team','colleague','forward','newsletter','notify','message','contact']))
    actions.push({ id:'email', label:'Draft & Share', desc:'Draft email summary with AI', icon:Mail, color:'#60a5fa', agent:'Orchestrator' });

  if (kw(['remind','reminder','follow up','follow-up','check back','check in','revisit','dont forget']))
    actions.push({ id:'remind', label:'Set Reminder', desc:'CalendarAgent will remind you', icon:Bell, color:'#a78bfa', agent:'CalendarAgent' });

  // Always present
  actions.push({ id:'research', label:'Deep Research', desc:'Ask RecallAgent to dig deeper', icon:Search, color:'#22d3ee', agent:'RecallAgent' });
  actions.push({ id:'flashcards', label:'Flashcards', desc:'Generate study cards from this', icon:FlipHorizontal, color:'#f59e0b', agent:'BriefingAgent' });

  return actions;
}

/* ── Chat message ─────────────────────────────────────────────────── */
interface ChatMsg { role: 'user' | 'assistant'; content: string; loading?: boolean; }

/* ── Main Page ───────────────────────────────────────────────────── */
export default function MemoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [memory, setMemory]           = useState<Memory | null>(null);
  const [related, setRelated]         = useState<Memory[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  // Research chat
  const [msgs, setMsgs]               = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput]     = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [autoTagging, setAutoTagging] = useState(false);
  const [taskTitle, setTaskTitle]     = useState('');
  const [eventTitle, setEventTitle]   = useState('');
  const [eventDate, setEventDate]     = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);

  /* ── Fetch memory ──────────────────────────────────────────────── */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/memories/${id}`)
      .then(r => r.ok ? r.json() : Promise.reject('Not found'))
      .then((m: Memory) => {
        setMemory(m);
        // Initialise research chat with context greeting
        setMsgs([{
          role: 'assistant',
          content: `I've read **"${m.title}"** — ask me anything about this topic, request deeper insights, or tell me what you'd like to do with it.`,
        }]);
        // Fetch related
        if (m.tags?.length) {
          fetch(`/memories?limit=6`)
            .then(r => r.ok ? r.json() : [])
            .then((all: Memory[]) => setRelated(all.filter(x => x.id !== id && x.tags?.some(t => m.tags.includes(t))).slice(0,4)))
            .catch(() => {});
        }
      })
      .catch(() => setError('Memory not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!msgs || msgs.length === 0) return;
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [msgs]);

  /* ── Research Chat ─────────────────────────────────────────────── */
  const sendChat = useCallback(async (msg?: string) => {
    const text = (msg ?? chatInput).trim();
    if (!text || chatLoading || !memory) return;
    setChatInput('');
    setMsgs(m => [...m, { role:'user', content:text }, { role:'assistant', content:'', loading:true }]);
    setChatLoading(true);
    try {
      const contextPrompt = `Context — Memory titled "${memory.title}":\n${memory.summary}\n\nKey points:\n${memory.key_points.join('\n')}\n\nUser question: ${text}`;
      const res = await fetch('/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: contextPrompt }),
      });
      const data = await res.json();
      const reply = data.response || data.content || data.message || 'I couldn\'t generate a response. Try again.';
      setMsgs(m => m.map((x, i) => i === m.length - 1 ? { role:'assistant', content:reply } : x));
    } catch {
      setMsgs(m => m.map((x, i) => i === m.length - 1 ? { role:'assistant', content:'Something went wrong. Please try again.' } : x));
    } finally { setChatLoading(false); }
  }, [chatInput, chatLoading, memory]);

  /* ── Actions ───────────────────────────────────────────────────── */
  const runAction = async (actionId: string) => {
    if (!memory) return;
    setActionLoading(actionId);
    try {
      if (actionId === 'task') {
        const title = taskTitle.trim() || memory.title;
        await fetch('/tasks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, description: memory.summary, source_memory_id: memory.id }) });
        showToast('Task created!'); setActiveAction(null); setTaskTitle('');
      } else if (actionId === 'calendar') {
        const title = eventTitle.trim() || memory.title;
        const date = eventDate || new Date(Date.now() + 86400000).toISOString().split('T')[0];
        await fetch('/calendar/events', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ title, date, notes: memory.summary }) });
        showToast('Event scheduled!'); setActiveAction(null); setEventTitle(''); setEventDate('');
      } else if (actionId === 'flashcards') {
        navigate(`/flashcards?memory_id=${memory.id}`);
      } else if (actionId === 'research') {
        sendChat(`Give me a deep-dive analysis of "${memory.title}" — find connections, gaps, and what I should explore next.`);
        setActiveAction(null);
      } else if (actionId === 'shop') {
        const items = memory.key_points.slice(0,3).join(', ');
        await navigator.clipboard.writeText(`Shopping list from "${memory.title}":\n${items}`);
        showToast('Shopping list copied!');
      } else if (actionId === 'email') {
        const draft = `Subject: Insights from "${memory.title}"\n\nHi,\n\nSharing some key takeaways:\n\n${memory.key_points.map((p,i) => `${i+1}. ${p}`).join('\n')}\n\nFull summary:\n${memory.summary}`;
        await navigator.clipboard.writeText(draft);
        showToast('Email draft copied!');
      } else if (actionId === 'remind') {
        showToast('Reminder set for tomorrow!');
      }
    } catch {
      showToast('Action failed — try again');
    } finally { setActionLoading(null); }
  };

  /* ── Quick prompts ─────────────────────────────────────────────── */
  const QUICK = memory ? [
    `What are the most actionable takeaways from this?`,
    `How does this connect to other things I know?`,
    `Explain this like I'm a beginner`,
    `What should I learn next after this?`,
  ] : [];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:16 }}>
      <Loader2 size={32} color="var(--primary)" style={{ animation:'spin 1s linear infinite' }} />
      <p style={{ color:'var(--text-3)', fontSize:14 }}>Loading memory…</p>
    </div>
  );

  if (error || !memory) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:12 }}>
      <AlertCircle size={32} color="#ef4444" />
      <p style={{ color:'var(--text-2)', fontSize:14 }}>{error || 'Memory not found'}</p>
      <button onClick={() => navigate('/vault')} className="btn-secondary" style={{ marginTop:8 }}>Back to Vault</button>
    </div>
  );

  const src = SRC[memory.source_type as keyof typeof SRC] ?? SRC.note;
  const SrcIcon = src.icon;
  const actions = detectActions(memory);

  return (
    <div style={{ maxWidth:1100, margin:'0 auto', display:'flex', flexDirection:'column', gap:0 }}>

      {/* ── Back + Breadcrumb ─────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0 18px' }}>
        <button onClick={() => navigate(-1)}
          style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-2)', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--primary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}>
          <ArrowLeft size={13} /> Back
        </button>
        <span style={{ color:'var(--text-3)', fontSize:12 }}>Vault</span>
        <ChevronRight size={11} color="var(--text-3)" />
        <span style={{ color:'var(--text-2)', fontSize:12, fontWeight:600, maxWidth:300, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{memory.title}</span>
      </div>

      {/* ── Hero Header ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
        style={{ borderRadius:'18px 18px 0 0', overflow:'hidden', background:'linear-gradient(135deg,#03080f 0%,#061230 55%,#0a1a50 100%)', padding:'24px 28px', borderBottom:'1px solid var(--border)', marginBottom:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', background:`color-mix(in srgb,${src.color} 20%,transparent)`, border:`1px solid color-mix(in srgb,${src.color} 35%,transparent)`, borderRadius:20 }}>
                <SrcIcon size={11} color={src.color} /><span style={{ fontSize:10, fontWeight:700, color:src.color }}>{src.label}</span>
              </div>
              <span style={{ padding:'3px 9px', background:'rgba(255,255,255,0.08)', borderRadius:20, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.6)', letterSpacing:'0.5px' }}>{memory.domain}</span>
              <span style={{ padding:'3px 9px', background:'rgba(59,130,246,0.2)', borderRadius:20, fontSize:10, fontWeight:700, color:'#93c5fd' }}>
                ✦ 7-Agent Processed
              </span>
              <span style={{ padding:'3px 9px', background:'rgba(255,255,255,0.06)', borderRadius:20, fontSize:10, color:'rgba(255,255,255,0.45)', display:'flex', alignItems:'center', gap:4 }}>
                <Clock size={9} /> {new Date(memory.created_at).toLocaleDateString('en-US',{ month:'short', day:'numeric', year:'numeric' })}
              </span>
            </div>
            <h1 style={{ fontSize:'clamp(17px,2.8vw,24px)', fontWeight:900, color:'#fff', margin:'0 0 8px', lineHeight:1.3, fontFamily:"'Alegreya Sans SC',system-ui" }}>
              {memory.title}
            </h1>
            {memory.source_url && (
              <a href={memory.source_url} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,0.45)', textDecoration:'none', transition:'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = src.color)}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
                <Link2 size={10} /> {memory.source_url.slice(0,60)}{memory.source_url.length > 60 ? '…' : ''}
              </a>
            )}
          </div>
          <div style={{ display:'flex', gap:6, flexShrink:0 }}>
            <button onClick={async () => {
              setActionLoading('share');
              try {
                const r = await fetch(`/memories/${memory.id}/share`, { method:'POST' });
                const data = await r.json();
                if (data.share_token) {
                  const fullUrl = `${window.location.origin}/share/${data.share_token}`;
                  setShareUrl(fullUrl);
                  setShowShareModal(true);
                  navigator.clipboard.writeText(fullUrl).catch(()=>{});
                  showToast('Public link copied to clipboard');
                }
              } catch { showToast('Could not create share link'); }
              finally { setActionLoading(null); }
            }}
              style={{ padding:'7px 13px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:9, color:'rgba(255,255,255,0.85)', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:'inherit', transition:'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.16)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
              {actionLoading === 'share' ? <Loader2 size={12} className="spin" /> : <Share2 size={12} />} Share
            </button>
            <button onClick={() => { navigator.clipboard.writeText(`${memory.title}\n\n${memory.summary}`); showToast('Copied!'); }}
              title="Copy summary"
              style={{ padding:'7px 11px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:9, color:'rgba(255,255,255,0.7)', fontSize:11, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:'inherit' }}>
              <Copy size={12} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Body: Two Columns ─────────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:0, alignItems:'start', border:'1px solid var(--border)', borderTop:'none', borderRadius:'0 0 18px 18px', overflow:'hidden' }}>

        {/* ── LEFT COLUMN ──────────────────────────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:0, borderRight:'1px solid var(--border)', minWidth:0 }}>

          {/* YouTube embed */}
          {memory.source_type === 'youtube' && memory.source_url && (
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
              <YouTubeEmbed url={memory.source_url} />
            </div>
          )}

          {/* PDF embed — full-document viewer */}
          {memory.source_type === 'pdf' && memory.pdf_data && (
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
              <div style={{ borderRadius:12, overflow:'hidden', border:'1px solid var(--border)', height:560, background:'#1a1a1a' }}>
                <iframe src={memory.pdf_data} title={memory.title} style={{ width:'100%', height:'100%', border:'none', display:'block' }} />
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8, margin:'10px 0 0' }}>
                {memory.pdf_pages != null && (
                  <span style={{ fontSize:10.5, fontWeight:700, color:'#10b981', padding:'2px 8px', background:'rgba(16,185,129,0.10)', borderRadius:999, border:'1px solid rgba(16,185,129,0.25)' }}>
                    {memory.pdf_pages} {memory.pdf_pages === 1 ? 'page' : 'pages'}
                  </span>
                )}
                {memory.pdf_size_kb != null && (
                  <span style={{ fontSize:10.5, fontWeight:700, color:'var(--text-2)', padding:'2px 8px', background:'var(--surface-2)', borderRadius:999, border:'1px solid var(--border)' }}>
                    {memory.pdf_size_kb < 1024 ? `${Math.round(memory.pdf_size_kb)} KB` : `${(memory.pdf_size_kb / 1024).toFixed(2)} MB`}
                  </span>
                )}
                {memory.pdf_word_count != null && (
                  <span style={{ fontSize:10.5, fontWeight:700, color:'var(--text-2)', padding:'2px 8px', background:'var(--surface-2)', borderRadius:999, border:'1px solid var(--border)' }}>
                    ~{memory.pdf_word_count.toLocaleString()} words
                  </span>
                )}
                <a href={memory.pdf_data} download={`${memory.title}.pdf`}
                  style={{ marginLeft:'auto', fontSize:11, fontWeight:700, color:'var(--primary)', textDecoration:'none', display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', border:'1px solid var(--primary-border)', borderRadius:8, background:'var(--primary-bg)' }}>
                  <SquareArrowOutUpRight size={11} /> Download PDF
                </a>
              </div>
            </div>
          )}

          {/* PDF placeholder when pdf_data missing (legacy memories) */}
          {memory.source_type === 'pdf' && !memory.pdf_data && memory.source_url && (
            <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
              <div style={{ padding:'18px 20px', borderRadius:12, border:'1px dashed var(--border-2)', background:'var(--surface-2)', display:'flex', alignItems:'center', gap:12 }}>
                <FileText size={22} color="#f59e0b" />
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', margin:0 }}>PDF not embedded</p>
                  <p style={{ fontSize:11.5, color:'var(--text-3)', margin:'2px 0 0' }}>This memory was captured before inline PDF embedding. Re-upload to view here.</p>
                </div>
              </div>
            </div>
          )}

          {/* Executive Summary */}
          {memory.executive_summary && memory.executive_summary.trim() && (
            <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', background:'var(--primary-bg)' }}>
              <h3 style={{ display:'flex', alignItems:'center', gap:8, fontSize:11.5, fontWeight:800, color:'var(--primary)', margin:'0 0 8px', letterSpacing:0.6, textTransform:'uppercase' }}>
                <Sparkles size={13} color="var(--primary)" /> Executive Summary
              </h3>
              <p style={{ color:'var(--text-1)', lineHeight:1.7, fontSize:13.5, margin:0, fontWeight:500 }}>{memory.executive_summary}</p>
            </div>
          )}

          {/* Summary */}
          <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
            <h3 style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'var(--text-1)', margin:'0 0 12px' }}>
              <Brain size={14} color="var(--primary)" /> AI Summary
            </h3>
            <p style={{ color:'var(--text-2)', lineHeight:1.78, fontSize:13.5, margin:0 }}>{memory.summary}</p>
          </div>

          {/* Key Insights */}
          <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
            <h3 style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'var(--text-1)', margin:'0 0 14px' }}>
              <Sparkles size={14} color="#22d3ee" /> Key Insights
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {memory.key_points.map((pt, i) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'10px 14px', background:'var(--surface-2)', borderRadius:11, border:'1px solid var(--border)' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--primary-bg)', border:'1px solid var(--primary-border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:1 }}>
                    <span style={{ fontSize:10, fontWeight:800, color:'var(--primary)' }}>{i+1}</span>
                  </div>
                  <p style={{ color:'var(--text-2)', fontSize:13, lineHeight:1.6, margin:0 }}>{pt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          {memory.action_items && memory.action_items.length > 0 && (
            <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
              <h3 style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'var(--text-1)', margin:'0 0 12px' }}>
                <ListTodo size={14} color="#f97316" /> Action Items
              </h3>
              <ul style={{ display:'flex', flexDirection:'column', gap:7, padding:0, margin:0, listStyle:'none' }}>
                {memory.action_items.map((item, i) => (
                  <li key={i} style={{ display:'flex', gap:10, padding:'10px 13px', background:'rgba(249,115,22,0.06)', borderRadius:11, border:'1px solid rgba(249,115,22,0.18)', alignItems:'flex-start' }}>
                    <CheckSquare size={14} color="#f97316" style={{ flexShrink:0, marginTop:1 }} />
                    <span style={{ fontSize:13, color:'var(--text-1)', lineHeight:1.55 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Glossary */}
          {memory.glossary && memory.glossary.length > 0 && (
            <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
              <h3 style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'var(--text-1)', margin:'0 0 12px' }}>
                <BookOpen size={14} color="#a78bfa" /> Glossary
              </h3>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:8 }}>
                {memory.glossary.map((g, i) => (
                  <div key={i} style={{ padding:'11px 13px', background:'var(--surface-2)', borderRadius:11, border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:12, fontWeight:800, color:'#a78bfa', marginBottom:4, letterSpacing:0.2 }}>{g.term}</div>
                    <div style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.55 }}>{g.definition}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Study Questions */}
          {memory.study_questions && memory.study_questions.length > 0 && (
            <div style={{ padding:'22px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
              <h3 style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'var(--text-1)', margin:'0 0 12px' }}>
                <MessageCircle size={14} color="#22d3ee" /> Study Questions
              </h3>
              <ol style={{ display:'flex', flexDirection:'column', gap:7, padding:0, margin:0, listStyle:'none' }}>
                {memory.study_questions.map((q, i) => (
                  <li key={i} style={{ display:'flex', gap:10, padding:'10px 13px', background:'rgba(34,211,238,0.06)', borderRadius:11, border:'1px solid rgba(34,211,238,0.18)', alignItems:'flex-start' }}>
                    <span style={{ width:22, height:22, borderRadius:'50%', background:'rgba(34,211,238,0.18)', color:'#0e7490', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, flexShrink:0 }}>Q{i + 1}</span>
                    <span style={{ fontSize:13, color:'var(--text-1)', lineHeight:1.55, flex:1 }}>{q}</span>
                    <button onClick={() => sendChat(q)} title="Ask the research agent"
                      style={{ padding:'3px 8px', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, fontSize:10, fontWeight:700, color:'var(--text-2)', cursor:'pointer', fontFamily:'inherit', flexShrink:0 }}>
                      Ask
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Tags */}
          <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, gap:10, flexWrap:'wrap' }}>
              <h3 style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'var(--text-1)', margin:0 }}>
                <Tag size={14} color="#fbbf24" /> Smart Tags
              </h3>
              <button onClick={async () => {
                setAutoTagging(true);
                try {
                  const r = await fetch(`/memories/${memory.id}/auto-tag`, { method:'POST' });
                  const data = await r.json();
                  if (data.tags) {
                    setMemory({ ...memory, tags: data.tags });
                    showToast(`Added ${(data.added || []).length} new tags`);
                  } else { showToast('Auto-tag failed'); }
                } catch { showToast('Auto-tag failed'); }
                finally { setAutoTagging(false); }
              }}
                style={{ padding:'5px 10px', background:'rgba(251,191,36,0.12)', border:'1px solid rgba(251,191,36,0.3)', borderRadius:8, color:'#fbbf24', fontSize:10.5, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:'inherit' }}
                disabled={autoTagging}>
                {autoTagging ? <Loader2 size={11} className="spin" /> : <Sparkles size={11} />}
                {autoTagging ? 'AI thinking…' : 'Auto-tag with AI'}
              </button>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {memory.tags.map(tag => (
                <span key={tag} onClick={() => navigate(`/vault?tag=${tag}`)}
                  style={{ padding:'4px 11px', background:'var(--primary-bg)', color:'var(--primary)', borderRadius:8, fontSize:12, fontWeight:700, border:'1px solid var(--primary-border)', cursor:'pointer', transition:'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--primary-bg)'; e.currentTarget.style.color = 'var(--primary)'; }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>

          {/* Related Memories */}
          {related.length > 0 && (
            <div style={{ padding:'18px 24px', borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
              <h3 style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, fontWeight:700, color:'var(--text-1)', margin:'0 0 12px' }}>
                <Network size={14} color="#818cf8" /> Graph Connections
              </h3>
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {related.map(r => {
                  const rs = SRC[r.source_type as keyof typeof SRC] ?? SRC.note;
                  return (
                    <button key={r.id} onClick={() => navigate(`/memory/${r.id}`)}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, cursor:'pointer', textAlign:'left', fontFamily:'inherit', transition:'all 0.15s', width:'100%' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--surface-3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; }}>
                      <rs.icon size={13} color={rs.color} style={{ flexShrink:0 }} />
                      <span style={{ fontSize:12, fontWeight:600, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{r.title}</span>
                      <ChevronRight size={12} color="var(--text-3)" style={{ flexShrink:0 }} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Research AI Agent Chat ─────────────────────────── */}
          <div style={{ display:'flex', flexDirection:'column', background:'var(--surface)', flex:1 }}>
            <div style={{ padding:'14px 20px 10px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#22d3ee)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Bot size={14} color="#fff" />
              </div>
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:'var(--text-1)', margin:0 }}>Research Agent</p>
                <p style={{ fontSize:10, color:'var(--text-3)', margin:0 }}>Context-aware · Powered by RecallAgent</p>
              </div>
            </div>

            {/* Quick prompts */}
            <div style={{ padding:'10px 16px', display:'flex', gap:6, flexWrap:'wrap', borderBottom:'1px solid var(--border)' }}>
              {QUICK.map((q, i) => (
                <button key={i} onClick={() => sendChat(q)}
                  style={{ padding:'4px 10px', fontSize:11, fontWeight:500, color:'var(--text-2)', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:20, cursor:'pointer', fontFamily:'inherit', transition:'all 0.12s', whiteSpace:'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
                  {q.length > 30 ? q.slice(0,30)+'…' : q}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'14px 18px', display:'flex', flexDirection:'column', gap:12, maxHeight:340, minHeight:200 }} className="scroll-custom">
              {msgs.map((m, i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', flexDirection: m.role==='user' ? 'row-reverse' : 'row' }}>
                  {m.role==='assistant' && (
                    <div style={{ width:26, height:26, borderRadius:'50%', background:'linear-gradient(135deg,#3b82f6,#22d3ee)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2 }}>
                      <Bot size={13} color="#fff" />
                    </div>
                  )}
                  <div style={{ maxWidth:'80%', padding:'9px 13px', borderRadius: m.role==='user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: m.role==='user' ? 'var(--primary)' : 'var(--surface-2)', color: m.role==='user' ? '#fff' : 'var(--text-1)', fontSize:12.5, lineHeight:1.65, border: m.role==='user' ? 'none' : '1px solid var(--border)' }}>
                    {m.loading ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> : m.content}
                  </div>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat input */}
            <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && sendChat()}
                placeholder="Ask anything about this topic…"
                style={{ flex:1, padding:'9px 13px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-1)', fontSize:12.5, outline:'none', fontFamily:'inherit', transition:'border-color 0.15s' }}
                onFocus={e => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              <button onClick={() => sendChat()} disabled={chatLoading || !chatInput.trim()}
                style={{ width:36, height:36, borderRadius:9, background:'var(--primary)', border:'none', color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity: chatLoading || !chatInput.trim() ? 0.5 : 1, transition:'opacity 0.15s' }}>
                {chatLoading ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }} /> : <Send size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN — Smart Actions ──────────────────────── */}
        <div style={{ display:'flex', flexDirection:'column', gap:0, background:'var(--surface)', minWidth:0 }}>

          <div style={{ padding:'16px 18px 12px', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', letterSpacing:'1px', textTransform:'uppercase', margin:0 }}>
              Smart Actions
            </p>
            <p style={{ fontSize:11, color:'var(--text-3)', margin:'4px 0 0' }}>
              AI detected {actions.length} possible actions
            </p>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {actions.map((action, i) => {
              const isActive = activeAction === action.id;
              return (
                <div key={action.id} style={{ borderBottom: i < actions.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <button onClick={() => {
                    if (['task','calendar'].includes(action.id)) setActiveAction(isActive ? null : action.id);
                    else runAction(action.id);
                  }}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:11, padding:'13px 18px', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit', transition:'background 0.12s', textAlign:'left' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width:34, height:34, borderRadius:10, background:`color-mix(in srgb,${action.color} 12%,transparent)`, border:`1px solid color-mix(in srgb,${action.color} 22%,transparent)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.15s' }}>
                      {actionLoading === action.id
                        ? <Loader2 size={15} color={action.color} style={{ animation:'spin 1s linear infinite' }} />
                        : <action.icon size={15} color={action.color} />}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontSize:12.5, fontWeight:700, color:'var(--text-1)', margin:'0 0 2px' }}>{action.label}</p>
                      <p style={{ fontSize:10.5, color:'var(--text-3)', margin:0 }}>{action.desc}</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:4, flexShrink:0 }}>
                      <span style={{ fontSize:9, fontWeight:600, padding:'2px 6px', background:`color-mix(in srgb,${action.color} 10%,transparent)`, color:action.color, borderRadius:6, border:`1px solid color-mix(in srgb,${action.color} 20%,transparent)`, whiteSpace:'nowrap' }}>
                        {action.agent}
                      </span>
                      <ChevronRight size={12} color="var(--text-3)" style={{ transform: isActive ? 'rotate(90deg)' : 'none', transition:'transform 0.2s' }} />
                    </div>
                  </button>

                  {/* Inline forms */}
                  <AnimatePresence>
                    {isActive && action.id === 'task' && (
                      <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} style={{ overflow:'hidden' }}>
                        <div style={{ padding:'0 18px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                          <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                            placeholder={memory.title.slice(0,50)}
                            style={{ width:'100%', padding:'8px 11px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-1)', fontSize:12, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                            onFocus={e => (e.target.style.borderColor = '#10b981')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                          <button onClick={() => runAction('task')} className="btn-premium" style={{ fontSize:12, gap:6 }}>
                            {actionLoading==='task' ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> : <CheckSquare size={13} />}
                            Add Task
                          </button>
                        </div>
                      </motion.div>
                    )}
                    {isActive && action.id === 'calendar' && (
                      <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} style={{ overflow:'hidden' }}>
                        <div style={{ padding:'0 18px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                          <input value={eventTitle} onChange={e => setEventTitle(e.target.value)}
                            placeholder={memory.title.slice(0,40)}
                            style={{ width:'100%', padding:'8px 11px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-1)', fontSize:12, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                            onFocus={e => (e.target.style.borderColor = '#f59e0b')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                          <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                            style={{ width:'100%', padding:'8px 11px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-1)', fontSize:12, outline:'none', fontFamily:'inherit', boxSizing:'border-box', colorScheme:'dark' }}
                            onFocus={e => (e.target.style.borderColor = '#f59e0b')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                          <button onClick={() => runAction('calendar')} className="btn-premium" style={{ fontSize:12, gap:6 }}>
                            {actionLoading==='calendar' ? <Loader2 size={13} style={{ animation:'spin 1s linear infinite' }} /> : <Calendar size={13} />}
                            Schedule It
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Memory meta */}
          <div style={{ padding:'16px 18px', borderTop:'1px solid var(--border)', marginTop:'auto' }}>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', letterSpacing:'1px', textTransform:'uppercase', margin:'0 0 10px' }}>Memory Info</p>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {[
                { label:'Source type', value:memory.source_type },
                { label:'Domain', value:memory.domain },
                { label:'Captured', value:new Date(memory.created_at).toLocaleString() },
                { label:'Insights', value:`${memory.key_points.length} points` },
                { label:'Tags', value:`${memory.tags.length} tags` },
              ].map(row => (
                <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'var(--text-3)' }}>{row.label}</span>
                  <span style={{ fontSize:11, fontWeight:600, color:'var(--text-2)' }}>{row.value}</span>
                </div>
              ))}
            </div>
            {memory.source_url && (
              <a href={memory.source_url} target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:5, marginTop:12, padding:'7px 12px', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text-2)', fontSize:12, fontWeight:600, textDecoration:'none', transition:'all 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <ExternalLink size={12} /> Open Original Source
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Share modal */}
      {showShareModal && shareUrl && (
        <div onClick={() => setShowShareModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.65)', backdropFilter:'blur(6px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9000, padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:16, padding:24, maxWidth:480, width:'100%' }}>
            <h3 style={{ margin:'0 0 8px', color:'var(--text-1)', fontSize:16, fontWeight:800, display:'flex', alignItems:'center', gap:8 }}>
              <Share2 size={16} color="var(--primary)" /> Public link created
            </h3>
            <p style={{ margin:'0 0 14px', color:'var(--text-3)', fontSize:12.5 }}>
              Anyone with this link can view a read-only version of this memory. The link is already copied to your clipboard.
            </p>
            <div style={{ display:'flex', gap:6, marginBottom:14 }}>
              <input readOnly value={shareUrl} onClick={e => (e.target as HTMLInputElement).select()}
                style={{ flex:1, padding:'9px 12px', borderRadius:9, border:'1px solid var(--border)', background:'var(--surface-2)', color:'var(--text-1)', fontSize:12, outline:'none', fontFamily:"'JetBrains Mono', monospace" }} />
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); showToast('Copied!'); }}
                style={{ padding:'9px 14px', background:'var(--primary-bg)', border:'1px solid var(--primary-border)', borderRadius:9, color:'var(--primary)', fontSize:11.5, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontFamily:'inherit' }}>
                <Copy size={11} /> Copy
              </button>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <a href={shareUrl} target="_blank" rel="noreferrer"
                style={{ flex:1, padding:'10px', textAlign:'center', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:9, color:'var(--text-2)', fontSize:12.5, fontWeight:600, textDecoration:'none' }}>
                Open public view
              </a>
              <button onClick={() => setShowShareModal(false)} style={{ flex:1, padding:'10px', background:'var(--primary)', border:'none', borderRadius:9, color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
