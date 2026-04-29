import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Mic, MicOff, Loader2, Plus, Radio, MessageSquare, Trash2,
  X, Clock, Cpu, Check, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AgentMsg, AgentStepData } from '../lib/types';
import type { LucideIcon } from 'lucide-react';
import MarkdownMessage from '../components/MarkdownMessage';
import MessageToolbar from '../components/MessageToolbar';
import ActionResultCards from '../components/ActionResultCards';
import { LiveInlineGate } from '../components/LiveChatPanel';

// ─── Persisted chat storage (cleared on sign-out by App.handleSignOut) ────
const STORAGE_KEY_CURRENT = 'agent-hub-current-chat-v1';
const STORAGE_KEY_CURRENT_SESSION_ID = 'agent-hub-current-session-id-v1';
const STORAGE_KEY_SESSIONS = 'agent-hub-sessions-v1';
const MAX_SESSIONS = 25;
const MAX_MSGS_PER_SESSION = 80;       // cap conversation length we store
const MAX_CONTENT_CHARS = 8000;        // truncate oversized assistant content

// Trim a message for storage: drop bulky internal fields, cap content length.
function trimMessageForStorage(m: AgentMsg): AgentMsg {
  const content = (m.content || '').length > MAX_CONTENT_CHARS
    ? (m.content || '').slice(0, MAX_CONTENT_CHARS) + '\n\n…[truncated for storage]'
    : m.content;
  const steps = m.steps?.map(s => ({
    ...s,
    input: typeof s.input === 'string' && s.input.length > 400 ? s.input.slice(0, 400) + '…' : s.input,
    output_summary: typeof s.output_summary === 'string' && s.output_summary.length > 400 ? s.output_summary.slice(0, 400) + '…' : s.output_summary,
  }));
  return { ...m, content, ...(steps ? { steps } : {}) };
}

function trimMessagesForStorage(msgs: AgentMsg[]): AgentMsg[] {
  const capped = msgs.length > MAX_MSGS_PER_SESSION ? msgs.slice(-MAX_MSGS_PER_SESSION) : msgs;
  return capped.map(trimMessageForStorage);
}

type ChatSession = {
  id: string;
  title: string;
  ts: string;
  msg_count: number;
  messages: AgentMsg[];
};

const buildWelcomeMsg = (): AgentMsg => ({
  id: 'welcome', role: 'assistant', type: 'welcome', ts: new Date().toISOString(),
  content: `Hi — I'm your assistant. Ask me to plan your day, find something you saved, capture a link, or schedule study time.`,
});

// Empty-state suggestion chips. Plain labels, no model colors, no agent tags.
// Hidden as soon as the user sends a first message.
const SUGGESTIONS: Array<{ label: string; msg: string }> = [
  { label: 'Plan my day',         msg: 'Give me my daily briefing with what I should focus on today.' },
  { label: 'Show my tasks',       msg: 'Show me all my pending tasks and help me prioritise them.' },
  { label: 'Recall recent saves', msg: 'Recall the most important things I have saved recently.' },
  { label: 'Build a study plan',  msg: 'Create a study plan for this week and put it on my calendar.' },
];

// Friendly display labels — never surface raw "FooAgent" identifiers in UI.
const AGENT_LABEL: Record<string, string> = {
  Orchestrator: 'Coordinator',
  CaptureAgent: 'Capture',
  RecallAgent: 'Recall',
  TaskAgent: 'Tasks',
  CalendarAgent: 'Calendar',
  BriefingAgent: 'Briefing',
  AnalyticsAgent: 'Insights',
};
const friendlyAgent = (a: string) => AGENT_LABEL[a] || a.replace('Agent', '');

// Format a duration in ms as a short human-readable string ("420ms" / "2.4s" / "1m 12s").
// Uses integer-second math at the minute boundary to avoid "1m 60s" rollover artifacts.
const formatDuration = (ms: number): string => {
  if (!ms || ms < 0) return '0ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) {
    const seconds = ms / 1000;
    return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
  }
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
};

// End-of-stream summary chip: shows status + friendly agent path + total duration
// for completed assistant messages. Read-only — drill-down lives in the toolbar export.
// Only friendly agent labels from AGENT_LABEL are shown — unknown identifiers are dropped
// so we never leak raw "FooAgent" or model strings into the UI.
const CompletionSummary: React.FC<{ steps: AgentStepData[] }> = ({ steps }) => {
  if (!steps || steps.length === 0) return null;
  const completed = steps.filter(s => s.status === 'completed').length;
  const failed = steps.filter(s => s.status === 'failed').length;
  const totalMs = steps.reduce((a, s) => a + (s.duration_ms || 0), 0);

  // Dedupe agents in execution order. Drop anything not in our friendly map so
  // unfamiliar identifiers / model names cannot leak through.
  const seen = new Set<string>();
  const agentList: string[] = [];
  for (const s of steps) {
    const label = AGENT_LABEL[s.agent];
    if (label && !seen.has(label)) { seen.add(label); agentList.push(label); }
  }

  // Status ladder: any failures > 0 demote the chip; otherwise "Done" if at least
  // one step actually finished, else neutral "Finished" (covers stuck/unknown states).
  let statusText = 'Done';
  let statusColor = '#10b981';
  let StatusIcon: LucideIcon = Check;
  if (failed > 0 && completed === 0) {
    statusText = "Couldn't complete";
    statusColor = '#ef4444';
    StatusIcon = AlertTriangle;
  } else if (failed > 0) {
    statusText = 'Finished with issues';
    statusColor = '#f59e0b';
    StatusIcon = AlertTriangle;
  } else if (completed === 0) {
    statusText = 'Finished';
    statusColor = '#a78bfa';
    StatusIcon = Check;
  }

  const durationStr = totalMs > 0 ? formatDuration(totalMs) : null;
  const agentsTitle = agentList.length > 0 ? agentList.join(' → ') : '';
  const titleParts = [statusText, agentsTitle, durationStr].filter(Boolean);

  return (
    <div
      role="status"
      aria-live="polite"
      title={titleParts.join(' · ')}
      style={{
        marginTop: 8,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '4px 10px 4px 8px',
        background: `${statusColor}10`,
        border: `1px solid ${statusColor}33`,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        color: statusColor,
        maxWidth: '100%',
        cursor: 'default',
        userSelect: 'none',
      }}>
      <StatusIcon size={11} strokeWidth={2.5} />
      <span style={{ color: statusColor, fontWeight: 700, letterSpacing: '0.1px' }}>{statusText}</span>
      {agentList.length > 0 && (
        <>
          <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>·</span>
          <span style={{
            color: 'var(--text-2)', fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 280, minWidth: 0,
          }}>{agentList.join(' → ')}</span>
        </>
      )}
      {durationStr && (
        <>
          <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>·</span>
          <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{durationStr}</span>
        </>
      )}
    </div>
  );
};

const AgentHubView = () => {
  // ── persisted state ──
  const [messages, setMessages] = useState<AgentMsg[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [buildWelcomeMsg()];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY_CURRENT_SESSION_ID) || `s-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }
    catch { return `s-${Date.now()}-${Math.random().toString(36).slice(2,6)}`; }
  });
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // ── ephemeral UI state ──
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [liveOpen, setLiveOpen] = useState(false);
  // Kept for potential future status display; not surfaced as a separate card.
  const [, setAgentStatuses] = useState<Record<string, 'idle' | 'running' | 'done'>>({});

  // ── refs ──
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeRequestRef = useRef<string | null>(null);

  // ── auto-scroll on new messages (skip first welcome paint to avoid jumping past header on mobile) ──
  useEffect(() => {
    if (messages.length <= 1 && messages[0]?.id === 'welcome') return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // ── persist current chat (survives reloads / route navigation) ──
  useEffect(() => {
    try {
      const trimmed = trimMessagesForStorage(messages);
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(trimmed));
      localStorage.setItem(STORAGE_KEY_CURRENT_SESSION_ID, currentSessionId);
    } catch (e: any) {
      console.warn('[agent-hub] failed to persist current chat:', e?.message || e);
    }
  }, [messages, currentSessionId]);

  // ── browser speech recognition (dictation only — does not touch live voice) ──
  const toggleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return; }
    const rec = new SR();
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US';
    rec.onresult = (e: any) => setInput(Array.from(e.results).map((r: any) => r[0].transcript).join(''));
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start(); setIsListening(true);
  }, [isListening]);

  // ── sessions: archive / load / delete ──
  const archiveCurrentSession = useCallback((overrideMsgs?: AgentMsg[]) => {
    const src = overrideMsgs || messages;
    const userMsgs = src.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return;
    const firstUser = (userMsgs[0]?.content || '').trim().slice(0, 80) || 'Untitled chat';
    const lastTs = src[src.length - 1]?.ts || new Date().toISOString();
    const trimmed = trimMessagesForStorage(src);
    setChatSessions(prev => {
      const next: ChatSession[] = [
        { id: currentSessionId, title: firstUser, ts: lastTs, msg_count: userMsgs.length, messages: trimmed },
        ...prev.filter(s => s.id !== currentSessionId),
      ].slice(0, MAX_SESSIONS);
      try { localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(next)); }
      catch (e: any) { console.warn('[agent-hub] failed to persist sessions:', e?.message || e); }
      return next;
    });
  }, [messages, currentSessionId]);

  const loadSession = useCallback((s: ChatSession) => {
    if (s.id === currentSessionId) { setHistoryOpen(false); return; }
    archiveCurrentSession();
    activeRequestRef.current = null;
    if (abortRef.current) { try { abortRef.current.abort(); } catch {} abortRef.current = null; }
    setIsStreaming(false);
    setCurrentSessionId(s.id);
    setMessages(s.messages && s.messages.length > 0 ? s.messages : [buildWelcomeMsg()]);
    setAgentStatuses({});
    setHistoryOpen(false);
    window.dispatchEvent(new CustomEvent('recall-toast', { detail: { msg: `Loaded chat: ${s.title.slice(0, 40)}`, type: 'info' } }));
  }, [currentSessionId, archiveCurrentSession]);

  const deleteSession = useCallback((sessionId: string) => {
    setChatSessions(prev => {
      const next = prev.filter(s => s.id !== sessionId);
      try { localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  // ── send + stream (unchanged streaming protocol) ──
  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isStreaming) return;
    // Per-request token — guards aborted-but-still-resolving streams from
    // corrupting a freshly started one.
    const requestId = `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const userMsgId = `u-${Date.now()}`;
    const thinkId = `t-${Date.now()}`;
    activeRequestRef.current = requestId;
    setMessages(prev => [...prev,
      { id: userMsgId, role: 'user', type: 'text', content: msg, ts: new Date().toISOString() },
      { id: thinkId, role: 'assistant', type: 'thinking', content: '', ts: new Date().toISOString(), steps: [] },
    ]);
    setInput(''); setIsStreaming(true);
    setAgentStatuses({ Orchestrator: 'running' });

    const ac = new AbortController();
    abortRef.current = ac;
    const isStillActive = () => activeRequestRef.current === requestId;

    try {
      const response = await fetch('/agent/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: 'agent-hub' }),
        signal: ac.signal,
      });
      if (!response.body) throw new Error('No response body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';
        for (const chunk of lines) {
          const line = chunk.trim();
          if (line.startsWith('data: ')) {
            try { handleStreamEvent(JSON.parse(line.slice(6)), thinkId, isStillActive); } catch { }
          }
        }
      }
    } catch (e: any) {
      if (!isStillActive()) return;
      if (e.name === 'AbortError') {
        setMessages(prev => prev.filter(m => m.id !== thinkId));
      } else {
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, type: 'text', content: `Something went wrong: ${e.message || 'Connection failed'}` }
          : m
        ));
      }
    } finally {
      if (isStillActive()) {
        abortRef.current = null;
        activeRequestRef.current = null;
        setIsStreaming(false); setAgentStatuses({});
      }
    }
  };

  const handleStreamEvent = (event: any, thinkId: string, isActive: () => boolean) => {
    if (!isActive()) return;
    switch (event.type) {
      case 'thinking':
        setAgentStatuses(prev => ({ ...prev, Orchestrator: 'running' }));
        break;
      case 'agent_start':
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'running', Orchestrator: 'running' }));
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, type: 'steps', steps: [...(m.steps || []), { step_id: event.step_id, agent: event.agent, tool: event.tool, name: event.name, status: 'running', input: event.input }] }
          : m));
        break;
      case 'agent_complete':
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'done' }));
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, steps: (m.steps || []).map(s => s.step_id === event.step_id ? { ...s, status: 'completed', output_summary: event.output_summary, duration_ms: event.duration_ms } : s) }
          : m));
        break;
      case 'agent_error':
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'idle' }));
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, steps: (m.steps || []).map(s => s.step_id === event.step_id ? { ...s, status: 'failed', error: event.error } : s) }
          : m));
        break;
      case 'token':
        setMessages(prev => prev.map(m => m.id === thinkId ? { ...m, type: 'streaming' as const, content: (m.content || '') + event.text } : m));
        break;
      case 'workflow_complete':
        setMessages(prev => [
          ...prev.filter(m => m.id !== thinkId),
          { id: event.workflow_id, role: 'assistant' as const, type: 'text' as const, content: event.reply, steps: event.steps, agents: event.agents_called, workflow_id: event.workflow_id, ts: event.timestamp || new Date().toISOString() },
        ]);
        setAgentStatuses({});
        break;
      case 'error':
        setMessages(prev => prev.map(m => m.id === thinkId ? { ...m, type: 'text', content: `Something went wrong: ${event.message}` } : m));
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const startNewChat = useCallback(async () => {
    // Invalidate any in-flight stream so its leftover events become no-ops.
    activeRequestRef.current = null;
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
      abortRef.current = null;
    }
    setIsStreaming(false);
    archiveCurrentSession();
    try {
      await fetch('/agent/chat/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', session_id: 'agent-hub' }),
      });
    } catch {}
    setCurrentSessionId(`s-${Date.now()}-${Math.random().toString(36).slice(2,6)}`);
    setMessages([buildWelcomeMsg()]);
    setAgentStatuses({});
    inputRef.current?.focus();
  }, [archiveCurrentSession]);

  // True empty state: only the welcome message is showing.
  const isEmpty = messages.length === 1 && messages[0]?.id === 'welcome';

  // ─────────────────────────── UI ───────────────────────────
  return (
    <div className="agent-hub-v2" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '14px 0 28px', minHeight: 'calc(100vh - 5rem)' }}>

      {/* HEADER — title + status dot + history + new chat */}
      <header className="agent-hero" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(139,92,246,0.16))', border: '1px solid rgba(99,102,241,0.35)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Cpu size={17} color="#a78bfa" />
          </div>
          <h2 style={{ fontSize: 'clamp(17px, 2.2vw, 20px)', fontWeight: 800, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.3px', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
            Agent Hub
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.28)', borderRadius: 20, fontSize: 10, fontWeight: 700, color: '#10b981', letterSpacing: '0.4px' }}
              title={isStreaming ? 'Working on your request' : 'Ready'}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', animation: isStreaming ? 'pulse 1.2s ease-in-out infinite' : 'none' }} />
              {isStreaming ? 'WORKING' : 'READY'}
            </span>
          </h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setHistoryOpen(true)}
            title="Open chat history"
            aria-label="Open chat history"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 13px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            <MessageSquare size={13} /> History
            {chatSessions.length > 0 && (
              <span style={{ marginLeft: 2, padding: '1px 7px', borderRadius: 10, background: 'var(--surface-3)', color: 'var(--text-3)', fontSize: 10.5, fontWeight: 700 }}>{chatSessions.length}</span>
            )}
          </button>
          <button onClick={startNewChat}
            title="Start a fresh chat — your current chat is saved to history"
            aria-label="Start a new chat"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))', border: '1px solid rgba(99,102,241,0.35)', borderRadius: 10, color: '#a78bfa', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            <Plus size={13} /> New chat
          </button>
        </div>
      </header>

      {/* CONVERSATION */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, flex: 1 }}>

        {/* Empty-state suggestion chips — visible only before the first user message */}
        {isEmpty && !isStreaming && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, paddingTop: 4 }}>
            {SUGGESTIONS.map(s => (
              <button key={s.label} onClick={() => handleSend(s.msg)}
                style={{ padding: '7px 13px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.45)'; e.currentTarget.style.color = '#a78bfa'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* MESSAGE THREAD — flows with the page; no inner scrollbox */}
        <div className="agent-messages" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '4px 0' }}>
          {messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 11, alignItems: 'flex-start' }}>

              {msg.role === 'assistant' && (
                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#312e81,#1e1b4b)', border: '1px solid rgba(99,102,241,0.3)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                  <Cpu size={15} color="#a78bfa" />
                </div>
              )}

              <div style={{ maxWidth: msg.role === 'user' ? '78%' : '92%', minWidth: 0 }}>

                {/* In-progress assistant bubble: subtle inline progress + step ticker */}
                {(msg.type === 'thinking' || msg.type === 'steps') && (
                  <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px 14px 14px 14px', color: 'var(--text-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: `bounce 1.2s ${i * 0.18}s ease-in-out infinite` }} />)}
                      </div>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-2)' }}>
                        Thinking
                        {msg.steps && msg.steps.length > 0 && (
                          <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>
                            {' · '}{msg.steps.map(s => friendlyAgent(s.agent)).join(' → ')}
                          </span>
                        )}
                      </span>
                    </div>
                    {/* Quiet detail rows for completed/failed steps so power users still see what happened */}
                    {msg.type === 'steps' && msg.steps && msg.steps.length > 0 && (
                      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {msg.steps.map(step => (
                          <div key={step.step_id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: 'var(--text-3)' }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%',
                                background: step.status === 'running' ? '#a78bfa' : step.status === 'completed' ? '#10b981' : step.status === 'failed' ? '#ef4444' : 'var(--text-3)',
                                boxShadow: step.status === 'running' ? '0 0 6px #a78bfa' : 'none' }} />
                            <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{friendlyAgent(step.agent)}</span>
                            {step.name && <span>· {step.name}</span>}
                            {step.status === 'completed' && step.duration_ms !== undefined && (
                              <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>{step.duration_ms.toFixed(0)}ms</span>
                            )}
                            {step.status === 'failed' && <span style={{ marginLeft: 'auto', color: '#ef4444' }}>didn't complete</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Streaming markdown */}
                {msg.type === 'streaming' && (
                  <div style={{ padding: '12px 16px', borderRadius: '4px 14px 14px 14px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-1)' }}>
                    <MarkdownMessage content={msg.content || ''} />
                    <span style={{ display: 'inline-block', width: 2, height: '1em', background: '#a78bfa', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'bounce 1s ease-in-out infinite', opacity: 0.8 }} />
                  </div>
                )}

                {/* Final text / welcome */}
                {(msg.type === 'text' || msg.type === 'welcome') && (
                  <div>
                    <div className={msg.role === 'user' ? 'user-bubble' : ''} style={{
                      padding: '13px 17px',
                      borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                      background: msg.role === 'user'
                        ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
                        : msg.type === 'welcome'
                          ? 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))'
                          : 'var(--surface)',
                      border: msg.role === 'user' ? 'none' : msg.type === 'welcome' ? '1px solid rgba(99,102,241,0.22)' : '1px solid var(--border)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-1)',
                    }}>
                      <MarkdownMessage
                        content={msg.content || ''}
                        onActionClick={msg.role === 'assistant' ? (text) => handleSend(text) : undefined}
                      />
                    </div>

                    {/* End-of-stream summary chip — quick "Done — Coordinator → Capture · 2.4s" */}
                    {msg.role === 'assistant' && msg.type === 'text' && msg.steps && msg.steps.length > 0 && (
                      <CompletionSummary steps={msg.steps} />
                    )}

                    {/* Action result cards (memory saved, task created, event scheduled) */}
                    {msg.role === 'assistant' && msg.steps && msg.steps.length > 0 && (
                      <ActionResultCards steps={msg.steps as any} />
                    )}

                    {/* Quiet meta row: timestamp + export menu only */}
                    {msg.role === 'assistant' && (
                      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 10.5, paddingLeft: 2 }}>
                        {msg.ts && <span>{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                        {msg.type === 'text' && msg.content && (
                          <MessageToolbar
                            messageId={msg.id}
                            content={msg.content}
                            meta={{ agents: (msg as any).agents, ts: msg.ts, durationMs: msg.steps?.reduce((a, s) => a + (s.duration_ms || 0), 0) }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* INPUT BAR — sticky bottom; live voice expands inline below the row */}
        <div className="agent-input" style={{
          position: 'sticky', bottom: 12, zIndex: 5,
          background: 'var(--surface)',
          border: `1px solid ${isListening ? 'rgba(239,68,68,0.45)' : isStreaming ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
          borderRadius: 14, padding: '10px 12px',
          boxShadow: '0 -6px 24px rgba(0,0,0,0.10)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={isListening ? 'Listening…' : isStreaming ? 'Working…' : 'Message your assistant…'}
              disabled={isStreaming}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 14, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 140, overflow: 'auto', padding: '8px 6px', minHeight: 24 }}
              title="Press Enter to send, Shift + Enter for a new line"
            />
            <button onClick={toggleVoice}
              title={isListening ? 'Stop voice input' : 'Use voice input'}
              aria-label={isListening ? 'Stop voice input' : 'Use voice input'}
              style={{ width: 36, height: 36, borderRadius: 9, border: 'none', cursor: 'pointer', flexShrink: 0, background: isListening ? 'rgba(239,68,68,0.15)' : 'var(--surface-2)', display: 'grid', placeItems: 'center', transition: 'all 0.15s' }}>
              {isListening ? <MicOff size={15} color="#ef4444" style={{ animation: 'pulse 1s ease-in-out infinite' }} /> : <Mic size={15} color="var(--text-3)" />}
            </button>
            <button onClick={() => setLiveOpen(o => !o)}
              title={liveOpen ? 'Close voice mode' : 'Talk live'}
              aria-label={liveOpen ? 'Close voice mode' : 'Talk live'}
              aria-expanded={liveOpen}
              style={{ width: 36, height: 36, borderRadius: 9, border: 'none', cursor: 'pointer', flexShrink: 0,
                  background: liveOpen ? 'linear-gradient(135deg,#6366f1,#06b6d4)' : 'var(--surface-2)',
                  display: 'grid', placeItems: 'center', transition: 'all 0.15s',
                  boxShadow: liveOpen ? '0 2px 10px rgba(99,102,241,0.35)' : 'none' }}>
              <Radio size={15} color={liveOpen ? '#fff' : 'var(--text-3)'} />
            </button>
            <button onClick={() => handleSend()} disabled={!input.trim() || isStreaming}
              aria-label="Send message"
              style={{ minWidth: 80, height: 36, borderRadius: 10, border: 'none', cursor: input.trim() && !isStreaming ? 'pointer' : 'default', fontFamily: 'inherit', flexShrink: 0,
                  background: input.trim() && !isStreaming ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'var(--surface-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 14px',
                  color: input.trim() && !isStreaming ? '#fff' : 'var(--text-3)', fontSize: 13, fontWeight: 700,
                  transition: 'all 0.15s' }}>
              {isStreaming ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Send size={14} /> Send</>}
            </button>
          </div>

          {/* Live voice — only mounted when the user opens it (saves bandwidth + mic prompt) */}
          <AnimatePresence>
            {liveOpen && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }} style={{ overflow: 'hidden', marginTop: 10 }}>
                <LiveInlineGate active={liveOpen} compact />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* HISTORY DRAWER — slide-in panel from the right */}
      <AnimatePresence>
        {historyOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setHistoryOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, backdropFilter: 'blur(2px)' }} />
            <motion.aside
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              role="dialog" aria-label="Chat history"
              className="agent-history-drawer"
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(380px, 100vw)', background: 'var(--surface)', borderLeft: '1px solid var(--border)', zIndex: 61, display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 40px rgba(0,0,0,0.35)' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={15} color="var(--text-2)" />
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Chat history</h3>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{chatSessions.length}</span>
                </div>
                <button onClick={() => setHistoryOpen(false)} aria-label="Close history" title="Close"
                  style={{ width: 30, height: 30, borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
                  <X size={15} />
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 12 }} className="scroll-custom">
                {chatSessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 12px', color: 'var(--text-3)', fontSize: 12.5, lineHeight: 1.55 }}>
                    <MessageSquare size={28} color="var(--border-2)" style={{ margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-2)' }}>No saved chats yet</p>
                    <p style={{ margin: '6px 0 0' }}>When you start a new chat, the previous one is saved here so you can pick it up later.</p>
                  </div>
                ) : chatSessions.map(s => {
                  const isActive = s.id === currentSessionId;
                  return (
                    <div key={s.id} role="button" tabIndex={0}
                      onClick={() => loadSession(s)}
                      onKeyDown={(e) => { if (e.key === 'Enter') loadSession(s); }}
                      style={{ padding: '11px 12px 10px', borderRadius: 11, marginBottom: 6, background: isActive ? 'var(--primary-bg)' : 'var(--surface-2)', border: `1px solid ${isActive ? 'var(--primary-border)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--primary-border)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border)'; }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'var(--text-1)', fontSize: 12.5, fontWeight: 700, lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{s.title}</div>
                          <div style={{ color: 'var(--text-3)', fontSize: 10.5, marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>{s.msg_count} message{s.msg_count !== 1 ? 's' : ''}</span>
                            <span>·</span>
                            <Clock size={9} /> {new Date(s.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            {isActive && <span style={{ marginLeft: 'auto', color: 'var(--primary)', fontWeight: 700 }}>active</span>}
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                          title="Delete chat"
                          aria-label="Delete chat"
                          style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 7, border: '1px solid transparent', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer', display: 'grid', placeItems: 'center', transition: 'all 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgentHubView;
