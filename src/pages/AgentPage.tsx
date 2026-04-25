import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Send, Mic, MicOff, Loader2, Sparkles, CheckSquare, BarChart2,
  Bot, Cpu, Zap, Calendar as CalendarIcon, X, ArrowRight, Search,
  Network, Database, GitBranch, ChevronDown, Activity, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AgentMsg, AgentStepData } from '../lib/types';

const AGENT_COLORS: Record<string, string> = {
  Orchestrator: '#00d4ff', CaptureAgent: '#f43f5e', RecallAgent: '#8b5cf6',
  TaskAgent: '#10b981', CalendarAgent: '#f59e0b', BriefingAgent: '#06b6d4', AnalyticsAgent: '#3b82f6'
};

const AGENT_ICONS: Record<string, any> = {
  Orchestrator: Brain, CaptureAgent: Database, RecallAgent: Search,
  TaskAgent: CheckSquare, CalendarAgent: CalendarIcon, BriefingAgent: Sparkles, AnalyticsAgent: BarChart2
};

const QUICK_PROMPTS = [
  { label: 'Daily briefing', icon: Sparkles, color: '#f59e0b', msg: 'Give me my AI daily briefing with learning summary and what I should focus on today.' },
  { label: 'Review tasks', icon: CheckSquare, color: '#10b981', msg: 'Show me all my pending tasks and help me prioritize them.' },
  { label: 'What did I learn?', icon: Brain, color: '#8b5cf6', msg: 'Recall the most important things I have saved and learned recently.' },
  { label: 'Study schedule', icon: CalendarIcon, color: '#f472b6', msg: 'Create a study plan for this week based on my knowledge base.' },
  { label: 'Knowledge stats', icon: BarChart2, color: '#3b82f6', msg: 'Analyze my knowledge base and give me detailed learning insights.' },
];

const AGENT_LIST = [
  { name: 'Orchestrator', role: 'Primary coordinator', color: '#00d4ff', tools: ['plan', 'delegate', 'synthesize'], description: 'Routes tasks to the right agents and combines their outputs' },
  { name: 'CaptureAgent', role: 'Knowledge capture', color: '#f43f5e', tools: ['youtube', 'web', 'note', 'pdf'], description: 'Captures and processes YouTube, web articles, PDFs & notes' },
  { name: 'RecallAgent', role: 'Semantic search', color: '#8b5cf6', tools: ['search', 'filter', 'embed'], description: 'Searches your knowledge base using semantic similarity' },
  { name: 'TaskAgent', role: 'Task management', color: '#10b981', tools: ['create', 'list', 'complete', 'priority'], description: 'Creates, updates, and manages your task list' },
  { name: 'CalendarAgent', role: 'Event scheduling', color: '#f59e0b', tools: ['schedule', 'list', 'remind'], description: 'Schedules events and manages your study calendar' },
  { name: 'BriefingAgent', role: 'Daily briefings', color: '#06b6d4', tools: ['briefing', 'study-plan'], description: 'Generates personalized daily briefings and study plans' },
  { name: 'AnalyticsAgent', role: 'Learning insights', color: '#3b82f6', tools: ['stats', 'graph', 'trends'], description: 'Analyzes your learning patterns and knowledge growth' },
];

const AgentHubView = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AgentMsg[]>([
    {
      id: 'welcome', role: 'assistant', type: 'welcome', ts: new Date().toISOString(),
      content: `Hello! I'm the Neural AI Orchestrator — your central command for the 7-agent AI system.\n\nUnlike Recall AI (which answers quick questions from your knowledge base), I coordinate a team of specialized agents to help you with complex, multi-step workflows:\n\n• 📥 Capture new knowledge from YouTube, web or notes\n• 🔍 Deep-search and analyze your memory bank\n• ✅ Manage and prioritize your task list\n• 📅 Schedule study sessions on your calendar\n• 📊 Generate detailed learning insights\n• 📝 Create personalized daily briefings\n\nWhat would you like to accomplish today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'idle' | 'running' | 'done'>>({});
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activePanel, setActivePanel] = useState<'agents' | 'history'>('agents');
  const [isListening, setIsListening] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showDiffBanner, setShowDiffBanner] = useState(true);
  const [totalRuns, setTotalRuns] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const thinkingIdRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { fetchWorkflows(); }, []);

  const fetchWorkflows = async () => {
    try {
      const data = await fetch('/workflows?limit=10').then(r => r.json());
      const wfs = Array.isArray(data) ? data : [];
      setWorkflows(wfs);
      setTotalRuns(wfs.filter((w: any) => w.status === 'completed').length);
    } catch { setWorkflows([]); }
  };

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isStreaming) return;
    const userMsgId = `u-${Date.now()}`;
    const thinkId = `t-${Date.now()}`;
    thinkingIdRef.current = thinkId;
    setMessages(prev => [...prev,
      { id: userMsgId, role: 'user', type: 'text', content: msg, ts: new Date().toISOString() },
      { id: thinkId, role: 'assistant', type: 'thinking', content: '', ts: new Date().toISOString(), steps: [] }
    ]);
    setInput(''); setIsStreaming(true); setShowDiffBanner(false);
    setAgentStatuses({ Orchestrator: 'running' });

    try {
      const response = await fetch('/agent/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_id: 'agent-hub' })
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
            try { handleSSEEvent(JSON.parse(line.slice(6))); } catch { }
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => prev.map(m => m.id === thinkingIdRef.current
        ? { ...m, type: 'text', content: `Error: ${e.message || 'Connection failed'}` }
        : m
      ));
    } finally {
      setIsStreaming(false); setAgentStatuses({}); fetchWorkflows();
    }
  };

  const handleSSEEvent = (event: any) => {
    const thinkId = thinkingIdRef.current;
    switch (event.type) {
      case 'thinking': setAgentStatuses(prev => ({ ...prev, Orchestrator: 'running' })); break;
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
          { id: event.workflow_id, role: 'assistant' as const, type: 'text' as const, content: event.reply, steps: event.steps, agents: event.agents_called, workflow_id: event.workflow_id, ts: event.timestamp || new Date().toISOString() }
        ]);
        setAgentStatuses({});
        break;
      case 'error':
        setMessages(prev => prev.map(m => m.id === thinkId ? { ...m, type: 'text', content: `Neural AI error: ${event.message}` } : m));
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const activeAgentCount = Object.values(agentStatuses).filter(s => s === 'running').length;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 8rem)', gap: 12, padding: '20px 0 0' }} className="agent-hub-layout">

      {/* ── Left Panel ── */}
      <div style={{ width: 248, flexShrink: 0, flexDirection: 'column', gap: 10 }} className="agent-hub-left">

        {/* Panel tabs */}
        <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
          {(['agents', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActivePanel(tab)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: activePanel === tab ? 'var(--surface)' : 'transparent', color: activePanel === tab ? 'var(--primary)' : 'var(--text-3)', fontSize: 11, fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.2s', boxShadow: activePanel === tab ? 'var(--shadow-sm)' : 'none' }}>
              {tab === 'agents' ? '🤖 Agents' : '📋 History'}
            </button>
          ))}
        </div>

        {/* Agent Registry */}
        {activePanel === 'agents' && (
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color: 'var(--text-3)', fontSize: 9, letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase' }}>Agent Registry</div>
              {isStreaming && <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', animation: 'pulse 1s ease-in-out infinite' }} />
                <span style={{ color: '#10b981', fontSize: 9, fontWeight: 700 }}>{activeAgentCount} ACTIVE</span>
              </div>}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 3 }} className="scroll-custom">
              {AGENT_LIST.map(agent => {
                const status = agentStatuses[agent.name] || 'idle';
                const Icon = AGENT_ICONS[agent.name] ?? Bot;
                const isExpanded = expandedAgent === agent.name;
                return (
                  <div key={agent.name}>
                    <button onClick={() => setExpandedAgent(isExpanded ? null : agent.name)}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 9, background: status === 'running' ? `${agent.color}10` : isExpanded ? 'var(--surface-2)' : 'transparent', border: `1px solid ${status === 'running' ? agent.color + '30' : isExpanded ? 'var(--border)' : 'transparent'}`, transition: 'all 0.25s', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${agent.color}15`, border: `1px solid ${agent.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={13} color={agent.color} />
                          </div>
                          {status === 'running' && (
                            <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: agent.color, border: '2px solid var(--surface)', animation: 'pulse 1s ease-in-out infinite' }} />
                          )}
                          {status === 'done' && (
                            <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: '#10b981', border: '2px solid var(--surface)' }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: status === 'running' ? agent.color : 'var(--text-1)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.1px' }}>{agent.name}</div>
                          <div style={{ color: 'var(--text-3)', fontSize: 9.5 }}>{agent.role}</div>
                        </div>
                        <ChevronDown size={11} color="var(--text-3)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                      </div>
                      {status === 'running' && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 3 }}>
                          {[1,2,3].map(i => (
                            <div key={i} style={{ height: 2, flex: 1, background: agent.color, borderRadius: 2, opacity: 0.6, animation: `pulse ${0.6 + i * 0.2}s ease-in-out infinite alternate` }} />
                          ))}
                        </div>
                      )}
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden' }}>
                          <div style={{ margin: '2px 4px 6px', padding: '9px 11px', background: 'var(--surface-2)', border: `1px solid ${agent.color}20`, borderRadius: 9 }}>
                            <p style={{ color: 'var(--text-3)', fontSize: 10.5, margin: '0 0 7px', lineHeight: 1.5 }}>{agent.description}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                              {agent.tools.map(t => (
                                <span key={t} style={{ padding: '2px 7px', background: `${agent.color}10`, border: `1px solid ${agent.color}20`, borderRadius: 12, color: agent.color, fontSize: 9, fontWeight: 700 }}>{t}</span>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                <span style={{ color: 'var(--text-2)', fontSize: 10 }}>{AGENT_LIST.length} agents ready</span>
              </div>
              {totalRuns > 0 && <span style={{ color: 'var(--text-3)', fontSize: 9.5 }}>{totalRuns} runs total</span>}
            </div>
          </div>
        )}

        {/* History */}
        {activePanel === 'history' && (
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-3)', fontSize: 9, letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase' }}>Workflow History</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }} className="scroll-custom">
              {workflows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-3)', fontSize: 11 }}>
                  <Activity size={22} color="var(--border-2)" style={{ margin: '0 auto 8px' }} />
                  <p style={{ margin: 0 }}>No workflows yet</p>
                  <p style={{ margin: '4px 0 0', fontSize: 10 }}>Send a message to start</p>
                </div>
              ) : workflows.map(wf => (
                <div key={wf.id} style={{ padding: '8px 10px', borderRadius: 9, marginBottom: 5, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: wf.status === 'completed' ? '#10b981' : wf.status === 'failed' ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-1)', fontSize: 10, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.description || wf.name}</span>
                  </div>
                  <div style={{ color: 'var(--text-3)', fontSize: 9.5 }}>
                    {wf.agents_called?.join(' › ')} · {wf.steps?.length || 0} steps
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Access */}
        <div style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ color: 'var(--text-3)', fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 7, fontWeight: 700 }}>Quick Access</div>
          {[
            { label: 'Vault', path: '/vault', color: '#ec4899', icon: Database },
            { label: 'Tasks', path: '/tasks', color: '#10b981', icon: CheckSquare },
            { label: 'Calendar', path: '/calendar', color: '#f59e0b', icon: CalendarIcon },
            { label: 'Neural Recall', path: '/recall', color: '#818cf8', icon: Search },
          ].map(link => (
            <button key={link.path} onClick={() => navigate(link.path)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', padding: '5px 7px', borderRadius: 7, border: 'none', background: 'transparent', color: link.color, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'background 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              <link.icon size={11} /> {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Right Panel: Chat ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, gap: 12 }} className="agent-hub-right">

        {/* Header + diff banner */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(99,102,241,0.15)' }}>
                  <Cpu size={17} color="#a78bfa" />
                </div>
                <div>
                  <h2 style={{ color: 'var(--text-1)', fontSize: 21, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>
                    Agent Hub <span style={{ color: '#a78bfa' }}>✦</span>
                  </h2>
                  <p style={{ color: 'var(--text-3)', fontSize: 11, margin: '1px 0 0' }}>7 specialist agents · Multi-step workflows · Real-time SSE</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isStreaming && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', borderRadius: 20 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4ff', animation: 'pulse 1s ease-in-out infinite' }} />
                  <span style={{ color: '#00d4ff', fontSize: 11, fontWeight: 600 }}>{activeAgentCount > 0 ? `${activeAgentCount} agents active` : 'Processing...'}</span>
                </motion.div>
              )}
              <button onClick={() => { setMessages([{ id: 'welcome', role: 'assistant', type: 'welcome', ts: new Date().toISOString(), content: `Hello! I'm the Neural AI Orchestrator. Session cleared — what would you like to accomplish?` }]); setAgentStatuses({}); setShowDiffBanner(true); }}
                style={{ padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear
              </button>
            </div>
          </div>

          {/* Differentiation banner for first-time users */}
          <AnimatePresence>
            {showDiffBanner && messages.length <= 1 && (
              <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }}
                style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.07), rgba(139,92,246,0.05))', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 2 }}>
                <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Cpu size={11} color="#818cf8" />
                    </div>
                    <div>
                      <span style={{ color: '#818cf8', fontSize: 10.5, fontWeight: 700 }}>Agent Hub</span>
                      <span style={{ color: 'var(--text-3)', fontSize: 10, marginLeft: 6 }}>Complex multi-step tasks using 7 specialized agents</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-3)', fontSize: 10, display: 'flex', alignItems: 'center' }}>vs</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: 'rgba(129,140,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Search size={11} color="#6366f1" />
                    </div>
                    <div>
                      <span style={{ color: '#6366f1', fontSize: 10.5, fontWeight: 700 }}>Neural Recall</span>
                      <span style={{ color: 'var(--text-3)', fontSize: 10, marginLeft: 6 }}>Fast Q&A directly from your saved knowledge</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => navigate('/recall')}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, color: '#818cf8', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Go to Recall <ArrowRight size={9} />
                  </button>
                  <button onClick={() => setShowDiffBanner(false)}
                    style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', borderRadius: 6 }}>
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', borderRadius: 14, border: '1px solid rgba(99,102,241,0.15)', background: 'var(--surface-2)', padding: '16px 16px 8px', display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 0 0 1px rgba(99,102,241,0.05), 0 8px 32px rgba(0,0,0,0.15)' }} className="scroll-custom agent-messages">

          {messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>

              {/* Avatar */}
              {msg.role === 'assistant' && (
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#312e81,#1e1b4b)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.2)' }}>
                  <Cpu size={15} color="#a78bfa" />
                </div>
              )}

              <div style={{ maxWidth: msg.role === 'user' ? '72%' : '88%', minWidth: 0 }}>

                {/* Thinking */}
                {msg.type === 'thinking' && (msg.steps || []).length === 0 && (
                  <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '4px 14px 14px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#a78bfa', animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />)}
                    </div>
                    <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 500 }}>Orchestrator is planning...</span>
                  </div>
                )}

                {/* Steps */}
                {msg.type === 'steps' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(msg.steps || []).map(step => {
                      const color = AGENT_COLORS[step.agent] || '#6366f1';
                      const Icon = AGENT_ICONS[step.agent] ?? Bot;
                      return (
                        <motion.div key={step.step_id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                          style={{ padding: '10px 14px', background: `${color}08`, border: `1px solid ${color}20`, borderRadius: '4px 14px 14px 14px', transition: 'all 0.3s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: step.status !== 'running' ? 6 : 0 }}>
                            <div style={{ width: 22, height: 22, borderRadius: 6, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon size={11} color={color} />
                            </div>
                            <span style={{ color, fontSize: 10.5, fontWeight: 700 }}>{step.agent}</span>
                            <span style={{ color: 'var(--text-3)', fontSize: 10 }}>›</span>
                            <span style={{ color: 'var(--text-2)', fontSize: 10.5 }}>{step.name}</span>
                            {step.status === 'running' && <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 9.5, display: 'flex', alignItems: 'center', gap: 4 }}><Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> Running...</span>}
                            {step.status === 'completed' && <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: 9.5 }}>✓ {step.duration_ms?.toFixed(0)}ms</span>}
                            {step.status === 'failed' && <span style={{ marginLeft: 'auto', color: '#ef4444', fontSize: 9.5 }}>✗ Failed</span>}
                          </div>
                          {step.status === 'completed' && step.output_summary && (
                            <div style={{ color: 'var(--text-2)', fontSize: 11, paddingLeft: 30, borderLeft: `2px solid ${color}40`, marginTop: 4, lineHeight: 1.5 }}>{step.output_summary}</div>
                          )}
                          {step.status === 'failed' && step.error && (
                            <div style={{ color: '#ef4444', fontSize: 10.5, marginTop: 4 }}>{step.error}</div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Streaming */}
                {msg.type === 'streaming' && (
                  <div style={{ padding: '11px 15px', borderRadius: '4px 14px 14px 14px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <p style={{ color: 'var(--text-1)', fontSize: 13.5, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                      <span style={{ display: 'inline-block', width: 2, height: '1em', background: '#a78bfa', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'bounce 1s ease-in-out infinite', opacity: 0.8 }} />
                    </p>
                  </div>
                )}

                {/* Text / Welcome */}
                {(msg.type === 'text' || msg.type === 'welcome') && (
                  <div>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                      background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : msg.type === 'welcome' ? 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05))' : 'var(--surface)',
                      border: msg.role === 'user' ? 'none' : msg.type === 'welcome' ? '1px solid rgba(99,102,241,0.2)' : '1px solid var(--border)',
                      boxShadow: msg.role === 'user' ? '0 2px 12px rgba(99,102,241,0.35)' : '0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                      <p style={{ color: msg.role === 'user' ? '#fff' : 'var(--text-1)', fontSize: 13.5, margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    </div>

                    {/* Agent tags after response */}
                    {msg.steps && msg.steps.length > 0 && (
                      <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {msg.steps.filter(s => s.status === 'completed').map(s => {
                          const color = AGENT_COLORS[s.agent] || '#6366f1';
                          const Icon = AGENT_ICONS[s.agent] ?? Bot;
                          return (
                            <span key={s.step_id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: `${color}10`, border: `1px solid ${color}20`, borderRadius: 20, color, fontSize: 9.5, fontWeight: 700 }}>
                              <Icon size={9} /> {s.agent.replace('Agent', '')}
                            </span>
                          );
                        })}
                        {msg.steps.filter(s => s.duration_ms).length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '2px 8px', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-3)', fontSize: 9.5 }}>
                            <Clock size={8} /> {msg.steps.reduce((acc, s) => acc + (s.duration_ms || 0), 0).toFixed(0)}ms total
                          </span>
                        )}
                      </div>
                    )}

                    {msg.role === 'assistant' && msg.ts && (
                      <div style={{ color: 'var(--text-3)', fontSize: 9.5, marginTop: 5, paddingLeft: 2 }}>
                        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {(msg as any).agents && (msg as any).agents.length > 0 && ` · ${(msg as any).agents.length} agents coordinated`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Quick Prompts */}
        <AnimatePresence>
          {messages.length <= 1 && !isStreaming && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
              {QUICK_PROMPTS.map(qp => (
                <button key={qp.label} onClick={() => handleSend(qp.msg)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-2)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = `${qp.color}10`; e.currentTarget.style.borderColor = `${qp.color}40`; e.currentTarget.style.color = qp.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
                  <qp.icon size={11} /> {qp.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div style={{ flexShrink: 0, background: 'var(--surface)', border: `1px solid ${isListening ? 'rgba(239,68,68,0.5)' : isStreaming ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.15)'}`, borderRadius: 13, padding: '10px 12px', display: 'flex', gap: 8, alignItems: 'flex-end', boxShadow: isListening ? '0 0 0 3px rgba(239,68,68,0.12)' : '0 0 0 1px rgba(99,102,241,0.05)', transition: 'all 0.2s' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'center' }}>
            <Cpu size={14} color="#a78bfa" />
          </div>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={isListening ? '🎙 Listening...' : isStreaming ? 'Agents are working...' : 'Ask agents to capture, recall, schedule, analyze... (Enter to send, Shift+Enter for new line)'}
            disabled={isStreaming}
            rows={1}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, overflow: 'auto' }}
          />
          <button onClick={toggleVoice}
            style={{ width: 34, height: 34, borderRadius: 9, border: 'none', cursor: 'pointer', flexShrink: 0, background: isListening ? 'rgba(239,68,68,0.12)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
            {isListening ? <MicOff size={14} color="#ef4444" style={{ animation: 'pulse 1s ease-in-out infinite' }} /> : <Mic size={14} color="var(--text-3)" />}
          </button>
          <button onClick={() => handleSend()} disabled={!input.trim() || isStreaming}
            style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: input.trim() && !isStreaming ? 'pointer' : 'default', fontFamily: 'inherit', flexShrink: 0, background: input.trim() && !isStreaming ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', boxShadow: input.trim() && !isStreaming ? '0 2px 10px rgba(99,102,241,0.4)' : 'none' }}>
            {isStreaming ? <Loader2 size={15} color="var(--text-3)" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} color={input.trim() ? '#fff' : 'var(--text-3)'} />}
          </button>
        </div>

        <p style={{ color: 'var(--text-3)', fontSize: 9.5, textAlign: 'center', margin: '-4px 0 0', flexShrink: 0 }}>
          Powered by Google Gemini 2.0 · Multi-agent orchestration · Real-time SSE streaming
        </p>
      </div>
    </div>
  );
};

export default AgentHubView;
