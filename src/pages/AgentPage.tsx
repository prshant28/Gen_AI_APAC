import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Send, Mic, MicOff, Loader2, Sparkles, CheckSquare, BarChart2,
  Bot, Cpu, Zap, Calendar as CalendarIcon, X, ArrowRight, Search,
  Database, ChevronDown, Activity, Clock, Layers, TrendingUp,
  Workflow as WorkflowIcon, Gauge, Eye, EyeOff, Pin, PinOff,
  Download, Copy, Check, Hash, Rocket, Radio, Flame, Wand2,
  Terminal, Code2, Settings as SettingsIcon, Maximize2, Minimize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { AgentMsg } from '../lib/types';

const AGENT_COLORS: Record<string, string> = {
  Orchestrator: '#00d4ff', CaptureAgent: '#f43f5e', RecallAgent: '#8b5cf6',
  TaskAgent: '#10b981', CalendarAgent: '#f59e0b', BriefingAgent: '#06b6d4', AnalyticsAgent: '#3b82f6'
};

const AGENT_ICONS: Record<string, any> = {
  Orchestrator: Brain, CaptureAgent: Database, RecallAgent: Search,
  TaskAgent: CheckSquare, CalendarAgent: CalendarIcon, BriefingAgent: Sparkles, AnalyticsAgent: BarChart2
};

const AGENT_LIST = [
  { name: 'Orchestrator', role: 'Primary coordinator', color: '#00d4ff', tools: ['plan', 'delegate', 'synthesize'], description: 'Routes tasks to the right agents and combines their outputs into a coherent reply.', model: 'gemini-2.0-flash', tier: 'core' },
  { name: 'CaptureAgent', role: 'Knowledge capture', color: '#f43f5e', tools: ['youtube', 'web', 'note', 'pdf'], description: 'Captures and processes YouTube, web articles, PDFs and free-form notes.', model: 'gemini-2.0-flash', tier: 'core' },
  { name: 'RecallAgent', role: 'Semantic search', color: '#8b5cf6', tools: ['search', 'filter', 'embed'], description: 'Searches your knowledge base using semantic similarity and vector recall.', model: 'gemini-embed', tier: 'core' },
  { name: 'TaskAgent', role: 'Task management', color: '#10b981', tools: ['create', 'list', 'complete', 'priority'], description: 'Creates, updates and prioritises your task list with smart scheduling.', model: 'gemini-2.0-flash', tier: 'productivity' },
  { name: 'CalendarAgent', role: 'Event scheduling', color: '#f59e0b', tools: ['schedule', 'list', 'remind'], description: 'Schedules events and manages your study calendar across contexts.', model: 'gemini-2.0-flash', tier: 'productivity' },
  { name: 'BriefingAgent', role: 'Daily briefings', color: '#06b6d4', tools: ['briefing', 'study-plan'], description: 'Generates personalised daily briefings and adaptive study plans.', model: 'gemini-2.0-flash', tier: 'insight' },
  { name: 'AnalyticsAgent', role: 'Learning insights', color: '#3b82f6', tools: ['stats', 'graph', 'trends'], description: 'Analyses learning patterns, knowledge growth and behavioural trends.', model: 'gemini-2.0-flash', tier: 'insight' },
];

const QUICK_TEMPLATES = [
  { title: 'Daily Briefing', desc: 'Morning briefing with focus + study plan', icon: Sparkles, color: '#f59e0b', agents: ['Orchestrator', 'BriefingAgent', 'AnalyticsAgent'], msg: 'Give me my AI daily briefing with learning summary and what I should focus on today.' },
  { title: 'Review Tasks', desc: 'Pending tasks + smart prioritisation', icon: CheckSquare, color: '#10b981', agents: ['Orchestrator', 'TaskAgent'], msg: 'Show me all my pending tasks and help me prioritise them.' },
  { title: 'Recall Memory', desc: 'Surface most important saved knowledge', icon: Brain, color: '#8b5cf6', agents: ['Orchestrator', 'RecallAgent'], msg: 'Recall the most important things I have saved and learned recently.' },
  { title: 'Build Study Plan', desc: 'Multi-day plan synced to calendar', icon: CalendarIcon, color: '#f472b6', agents: ['Orchestrator', 'BriefingAgent', 'CalendarAgent'], msg: 'Create a study plan for this week based on my knowledge base and put it on my calendar.' },
  { title: 'Knowledge Stats', desc: 'Deep analytics on learning patterns', icon: BarChart2, color: '#3b82f6', agents: ['Orchestrator', 'AnalyticsAgent'], msg: 'Analyse my knowledge base and give me detailed learning insights.' },
  { title: 'Capture & Link', desc: 'Capture URL and link to memory graph', icon: Zap, color: '#00d4ff', agents: ['Orchestrator', 'CaptureAgent', 'RecallAgent'], msg: 'Help me capture a new URL into my brain and link it to related memories.' },
];

const AgentHubView = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AgentMsg[]>([
    {
      id: 'welcome', role: 'assistant', type: 'welcome', ts: new Date().toISOString(),
      content: `Hello! I'm the Neural AI Orchestrator — your central command for the 7-agent AI system.\n\nUnlike Recall AI (which answers quick questions from your knowledge base), I coordinate a team of specialised agents to help you with complex, multi-step workflows:\n\n• Capture new knowledge from YouTube, web or notes\n• Deep-search and analyse your memory bank\n• Manage and prioritise your task list\n• Schedule study sessions on your calendar\n• Generate detailed learning insights\n• Create personalised daily briefings\n\nWhat would you like to accomplish today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'idle' | 'running' | 'done'>>({});
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activePanel, setActivePanel] = useState<'agents' | 'history' | 'inspector'>('agents');
  const [isListening, setIsListening] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [totalRuns, setTotalRuns] = useState(0);
  const [pinnedAgents, setPinnedAgents] = useState<string[]>([]);
  const [tierFilter, setTierFilter] = useState<'all' | 'core' | 'productivity' | 'insight'>('all');
  const [agentMetrics, setAgentMetrics] = useState<Record<string, { uses: number; avgMs: number; success: number; fails: number }>>({});
  const [latencies, setLatencies] = useState<number[]>([]);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pipelineMode, setPipelineMode] = useState<'compact' | 'expanded'>('expanded');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const thinkingIdRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);
  const startTimeRef = useRef<Record<string, number>>({});

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

  const togglePin = (name: string) => {
    setPinnedAgents(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
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
    setInput(''); setIsStreaming(true);
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
        startTimeRef.current[event.step_id] = Date.now();
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'running', Orchestrator: 'running' }));
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, type: 'steps', steps: [...(m.steps || []), { step_id: event.step_id, agent: event.agent, tool: event.tool, name: event.name, status: 'running', input: event.input }] }
          : m));
        break;
      case 'agent_complete':
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'done' }));
        setLatencies(prev => [...prev.slice(-19), event.duration_ms || 0]);
        setAgentMetrics(prev => {
          const cur = prev[event.agent] || { uses: 0, avgMs: 0, success: 0, fails: 0 };
          const newUses = cur.uses + 1;
          const newAvg = (cur.avgMs * cur.uses + (event.duration_ms || 0)) / newUses;
          return { ...prev, [event.agent]: { uses: newUses, avgMs: newAvg, success: cur.success + 1, fails: cur.fails } };
        });
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, steps: (m.steps || []).map(s => s.step_id === event.step_id ? { ...s, status: 'completed', output_summary: event.output_summary, duration_ms: event.duration_ms } : s) }
          : m));
        break;
      case 'agent_error':
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'idle' }));
        setAgentMetrics(prev => {
          const cur = prev[event.agent] || { uses: 0, avgMs: 0, success: 0, fails: 0 };
          return { ...prev, [event.agent]: { ...cur, uses: cur.uses + 1, fails: cur.fails + 1 } };
        });
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, steps: (m.steps || []).map(s => s.step_id === event.step_id ? { ...s, status: 'failed', error: event.error } : s) }
          : m));
        break;
      case 'token':
        setTokensUsed(prev => prev + Math.max(1, Math.round((event.text || '').length / 4)));
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

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const exportWorkflow = () => {
    const blob = new Blob([JSON.stringify({ messages, workflows, metrics: agentMetrics, exported_at: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `agent-session-${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const activeAgentCount = Object.values(agentStatuses).filter(s => s === 'running').length;
  const completedAgentCount = Object.values(agentStatuses).filter(s => s === 'done').length;

  const avgLatency = useMemo(() => {
    if (latencies.length === 0) return 0;
    return Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  }, [latencies]);

  const successRate = useMemo(() => {
    const vals = Object.values(agentMetrics) as Array<{ uses: number; avgMs: number; success: number; fails: number }>;
    const total = vals.reduce((acc, m) => acc + m.uses, 0);
    if (total === 0) return 100;
    const success = vals.reduce((acc, m) => acc + m.success, 0);
    return Math.round((success / total) * 100);
  }, [agentMetrics]);

  const totalAgentUses = useMemo(() => {
    const vals = Object.values(agentMetrics) as Array<{ uses: number; avgMs: number; success: number; fails: number }>;
    return vals.reduce((a, m) => a + m.uses, 0);
  }, [agentMetrics]);

  const filteredAgents = useMemo(() => {
    let list = AGENT_LIST.slice();
    if (tierFilter !== 'all') list = list.filter(a => a.tier === tierFilter);
    list.sort((a, b) => {
      const ap = pinnedAgents.includes(a.name) ? 0 : 1;
      const bp = pinnedAgents.includes(b.name) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return 0;
    });
    return list;
  }, [tierFilter, pinnedAgents]);

  const lastSteps = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].steps && messages[i].steps!.length > 0) return messages[i].steps!;
    }
    return [];
  }, [messages]);

  return (
    <div className="agent-hub-v2" style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '14px 0 28px', minHeight: 'calc(100vh - 5rem)' }}>

      {/* ───────── HERO HEADER ───────── */}
      <div className="agent-hero" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.18))', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 28px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.06)' }}>
              <Cpu size={24} color="#a78bfa" />
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, marginBottom: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.5px' }}>NEURAL OS · 7 AGENTS ONLINE · GEMINI 2.0</span>
              </div>
              <h2 style={{ fontSize: 'clamp(22px,3.5vw,30px)', fontWeight: 900, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.6px', lineHeight: 1.05 }}>
                Agent Hub <span style={{ color: '#a78bfa' }}>✦</span>
              </h2>
              <p style={{ color: 'var(--text-3)', fontSize: 13.5, margin: '4px 0 0' }}>
                Multi-agent orchestration · Real-time SSE streaming · Live pipeline visualisation
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {isStreaming && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 22 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4ff', animation: 'pulse 1s ease-in-out infinite', boxShadow: '0 0 10px #00d4ff' }} />
                <span style={{ color: '#00d4ff', fontSize: 12, fontWeight: 700 }}>{activeAgentCount > 0 ? `${activeAgentCount} agents active` : 'Processing...'}</span>
              </motion.div>
            )}
            <button onClick={exportWorkflow} title="Export session" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Download size={13} /> Export
            </button>
            <button
              onClick={async () => {
                try {
                  await fetch('/agent/chat/clear', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: '', session_id: 'agent-hub' }),
                  });
                } catch {}
                setMessages([{ id: 'welcome', role: 'assistant', type: 'welcome', ts: new Date().toISOString(), content: `New chat started. I'm your Neural AI Orchestrator — ready to capture, recall, plan or schedule. What's next?` }]);
                setAgentStatuses({});
                setTokensUsed(0);
                setLatencies([]);
              }}
              title="Start a new chat — clears AI memory of this session"
              style={{ padding: '8px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              + New chat
            </button>
          </div>
        </div>

        {/* ───────── STATS STRIP (4 metric cards) ───────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          {[
            { icon: Bot, color: '#00d4ff', label: 'Agents Online', value: '7', sub: 'all systems ready' },
            { icon: Activity, color: '#10b981', label: 'Workflows Run', value: String(totalRuns + workflows.length), sub: `${totalAgentUses} agent calls` },
            { icon: Gauge, color: '#3b82f6', label: 'Avg Latency', value: avgLatency > 0 ? `${avgLatency}ms` : '—', sub: 'per agent step' },
            { icon: TrendingUp, color: '#a78bfa', label: 'Success Rate', value: `${successRate}%`, sub: `${tokensUsed.toLocaleString()} tokens used` },
          ].map(stat => (
            <div key={stat.label} className="view-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, transition: 'all 0.2s' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${stat.color}15`, border: `1px solid ${stat.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <stat.icon size={18} color={stat.color} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 2 }}>{stat.label}</div>
                <div style={{ color: 'var(--text-1)', fontSize: 20, fontWeight: 800, lineHeight: 1, letterSpacing: '-0.4px' }}>{stat.value}</div>
                <div style={{ color: 'var(--text-3)', fontSize: 10.5, marginTop: 3 }}>{stat.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ───────── LIVE PIPELINE VISUALIZER (when streaming or last steps exist) ───────── */}
      {(isStreaming || lastSteps.length > 0) && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="view-card" style={{ padding: '14px 18px', background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(0,212,255,0.04))', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <WorkflowIcon size={16} color="#a78bfa" />
              <span style={{ color: '#a78bfa', fontSize: 12, fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase' }}>Live Agent Pipeline</span>
              {isStreaming && <span style={{ fontSize: 10.5, color: '#10b981', fontWeight: 600, padding: '2px 8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12 }}>● Streaming</span>}
              <span style={{ color: 'var(--text-3)', fontSize: 11 }}>{lastSteps.length} step{lastSteps.length !== 1 ? 's' : ''} · {completedAgentCount} done</span>
            </div>
            <button onClick={() => setPipelineMode(pipelineMode === 'expanded' ? 'compact' : 'expanded')}
              style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {pipelineMode === 'expanded' ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }} className="scroll-custom">
            {lastSteps.map((step, idx) => {
              const color = AGENT_COLORS[step.agent] || '#6366f1';
              const Icon = AGENT_ICONS[step.agent] ?? Bot;
              return (
                <React.Fragment key={step.step_id}>
                  {idx > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: 22, height: 1.5, background: step.status === 'running' ? `linear-gradient(90deg, ${AGENT_COLORS[lastSteps[idx-1].agent] || '#6366f1'}, ${color})` : 'var(--border-2)' }} />
                      <div style={{ width: 0, height: 0, borderLeft: `5px solid ${step.status === 'running' ? color : 'var(--border-2)'}`, borderTop: '4px solid transparent', borderBottom: '4px solid transparent' }} />
                    </div>
                  )}
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    style={{ flexShrink: 0, padding: pipelineMode === 'expanded' ? '8px 12px' : '6px 10px', background: step.status === 'running' ? `${color}18` : step.status === 'completed' ? `${color}10` : `${color}08`, border: `1.5px solid ${step.status === 'running' ? color : `${color}40`}`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8, position: 'relative', boxShadow: step.status === 'running' ? `0 0 18px ${color}40` : 'none', transition: 'all 0.3s' }}>
                    <div style={{ width: pipelineMode === 'expanded' ? 28 : 22, height: pipelineMode === 'expanded' ? 28 : 22, borderRadius: 7, background: `${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={pipelineMode === 'expanded' ? 14 : 11} color={color} />
                    </div>
                    {pipelineMode === 'expanded' && (
                      <div>
                        <div style={{ color, fontSize: 11.5, fontWeight: 700, lineHeight: 1.1 }}>{step.agent.replace('Agent', '')}</div>
                        <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 1 }}>
                          {step.status === 'running' ? 'running…' : step.status === 'completed' ? `${step.duration_ms?.toFixed(0)}ms` : step.status === 'failed' ? 'failed' : ''}
                        </div>
                      </div>
                    )}
                    {step.status === 'running' && (
                      <div style={{ position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}`, animation: 'pulse 1s ease-in-out infinite' }} />
                    )}
                    {step.status === 'completed' && (
                      <Check size={11} color="#10b981" style={{ marginLeft: pipelineMode === 'expanded' ? 4 : 0 }} />
                    )}
                  </motion.div>
                </React.Fragment>
              );
            })}
            {isStreaming && lastSteps.length === 0 && (
              <div style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#a78bfa', fontSize: 12 }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Orchestrator planning workflow...
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ───────── BODY: 2 columns ───────── */}
      <div className="agent-body-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(290px, 320px) 1fr', gap: 16, alignItems: 'start', minHeight: 580 }}>

        {/* ═══ LEFT: Agent Registry / History / Inspector (sticky, capped height) ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0, position: 'sticky', top: 12, alignSelf: 'start', maxHeight: 'calc(100vh - 80px)' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 11, padding: 4, border: '1px solid var(--border)', gap: 2 }}>
            {([
              { key: 'agents', label: 'Agents', icon: Bot },
              { key: 'history', label: 'History', icon: Clock },
              { key: 'inspector', label: 'Inspector', icon: Terminal },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setActivePanel(tab.key)}
                style={{ flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: activePanel === tab.key ? 'var(--surface)' : 'transparent', color: activePanel === tab.key ? 'var(--primary)' : 'var(--text-3)', fontSize: 12, fontWeight: 700, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: activePanel === tab.key ? 'var(--shadow-sm)' : 'none' }}>
                <tab.icon size={13} /> {tab.label}
              </button>
            ))}
          </div>

          {/* AGENTS PANEL */}
          {activePanel === 'agents' && (
            <div className="view-card" style={{ flex: '1 1 auto', minHeight: 320, maxHeight: 460, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '1.5px', fontWeight: 800, textTransform: 'uppercase' }}>Agent Registry</div>
                  {isStreaming && <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1s ease-in-out infinite' }} />
                    <span style={{ color: '#10b981', fontSize: 10, fontWeight: 700 }}>{activeAgentCount} ACTIVE</span>
                  </div>}
                </div>
                {/* Tier filter */}
                <div style={{ display: 'flex', gap: 4 }}>
                  {(['all', 'core', 'productivity', 'insight'] as const).map(t => (
                    <button key={t} onClick={() => setTierFilter(t)}
                      style={{ flex: 1, padding: '4px 6px', borderRadius: 6, border: '1px solid', borderColor: tierFilter === t ? 'var(--primary-border)' : 'var(--border)', background: tierFilter === t ? 'var(--primary-bg)' : 'transparent', color: tierFilter === t ? 'var(--primary)' : 'var(--text-3)', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.3px', transition: 'all 0.15s' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 5 }} className="scroll-custom">
                {filteredAgents.map(agent => {
                  const status = agentStatuses[agent.name] || 'idle';
                  const Icon = AGENT_ICONS[agent.name] ?? Bot;
                  const isExpanded = expandedAgent === agent.name;
                  const isPinned = pinnedAgents.includes(agent.name);
                  const metrics = agentMetrics[agent.name];
                  return (
                    <div key={agent.name}>
                      <button onClick={() => setExpandedAgent(isExpanded ? null : agent.name)}
                        style={{ width: '100%', padding: '10px 11px', borderRadius: 10, background: status === 'running' ? `${agent.color}10` : isExpanded ? 'var(--surface-2)' : 'transparent', border: `1px solid ${status === 'running' ? agent.color + '40' : isExpanded ? 'var(--border)' : 'transparent'}`, transition: 'all 0.25s', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ position: 'relative', width: 34, height: 34, flexShrink: 0 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 9, background: `${agent.color}15`, border: `1px solid ${agent.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Icon size={16} color={agent.color} />
                            </div>
                            {status === 'running' && (
                              <div style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: agent.color, border: '2px solid var(--surface)', animation: 'pulse 1s ease-in-out infinite' }} />
                            )}
                            {status === 'done' && (
                              <div style={{ position: 'absolute', top: -2, right: -2, width: 9, height: 9, borderRadius: '50%', background: '#10b981', border: '2px solid var(--surface)' }} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ color: status === 'running' ? agent.color : 'var(--text-1)', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.1px' }}>{agent.name}</div>
                              {isPinned && <Pin size={9} color="#f59e0b" style={{ flexShrink: 0 }} />}
                            </div>
                            <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 1 }}>{agent.role}</div>
                            {metrics && metrics.uses > 0 && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 4, color: 'var(--text-3)', fontSize: 10, fontWeight: 600 }}>
                                <span><Hash size={8} style={{ verticalAlign: 'middle' }} /> {metrics.uses}</span>
                                <span style={{ color: 'var(--text-2)' }}>{metrics.avgMs.toFixed(0)}ms avg</span>
                                {metrics.fails > 0 && <span style={{ color: '#ef4444' }}>{metrics.fails} fails</span>}
                              </div>
                            )}
                          </div>
                          <ChevronDown size={13} color="var(--text-3)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
                        </div>
                        {status === 'running' && (
                          <div style={{ marginTop: 7, display: 'flex', gap: 3 }}>
                            {[1,2,3].map(i => (
                              <div key={i} style={{ height: 2.5, flex: 1, background: agent.color, borderRadius: 2, opacity: 0.65, animation: `pulse ${0.6 + i * 0.2}s ease-in-out infinite alternate` }} />
                            ))}
                          </div>
                        )}
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}>
                            <div style={{ margin: '4px 4px 6px', padding: '11px 12px', background: 'var(--surface-2)', border: `1px solid ${agent.color}25`, borderRadius: 10 }}>
                              <p style={{ color: 'var(--text-2)', fontSize: 11.5, margin: '0 0 9px', lineHeight: 1.55 }}>{agent.description}</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 9 }}>
                                {agent.tools.map(t => (
                                  <span key={t} style={{ padding: '3px 8px', background: `${agent.color}12`, border: `1px solid ${agent.color}30`, borderRadius: 14, color: agent.color, fontSize: 9.5, fontWeight: 700 }}>{t}</span>
                                ))}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: `1px solid ${agent.color}20` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', fontSize: 10 }}>
                                  <Code2 size={10} /> <code style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9.5, color: 'var(--text-2)' }}>{agent.model}</code>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); togglePin(agent.name); }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: isPinned ? 'rgba(245,158,11,0.12)' : 'var(--surface)', border: `1px solid ${isPinned ? 'rgba(245,158,11,0.35)' : 'var(--border)'}`, borderRadius: 6, color: isPinned ? '#f59e0b' : 'var(--text-3)', fontSize: 9.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  {isPinned ? <><PinOff size={9} /> Unpin</> : <><Pin size={9} /> Pin</>}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                  <span style={{ color: 'var(--text-2)', fontSize: 11, fontWeight: 600 }}>{filteredAgents.length}/{AGENT_LIST.length} agents</span>
                </div>
                {pinnedAgents.length > 0 && <span style={{ color: '#f59e0b', fontSize: 10.5, fontWeight: 700 }}>{pinnedAgents.length} pinned</span>}
              </div>
            </div>
          )}

          {/* HISTORY PANEL */}
          {activePanel === 'history' && (
            <div className="view-card" style={{ flex: '1 1 auto', minHeight: 320, maxHeight: 460, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '1.5px', fontWeight: 800, textTransform: 'uppercase' }}>Workflow History</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 10 }} className="scroll-custom">
                {workflows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 12 }}>
                    <Activity size={28} color="var(--border-2)" style={{ margin: '0 auto 10px' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No workflows yet</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11 }}>Send a message to start orchestrating</p>
                  </div>
                ) : workflows.map(wf => (
                  <div key={wf.id} style={{ padding: '10px 12px', borderRadius: 10, marginBottom: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary-border)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: wf.status === 'completed' ? '#10b981' : wf.status === 'failed' ? '#ef4444' : '#f59e0b', flexShrink: 0, boxShadow: wf.status === 'completed' ? '0 0 6px #10b981' : 'none' }} />
                      <span style={{ color: 'var(--text-1)', fontSize: 11.5, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.description || wf.name}</span>
                    </div>
                    <div style={{ color: 'var(--text-3)', fontSize: 10.5, lineHeight: 1.4 }}>
                      {wf.agents_called?.join(' › ')} · {wf.steps?.length || 0} steps
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* INSPECTOR PANEL */}
          {activePanel === 'inspector' && (
            <div className="view-card" style={{ flex: '1 1 auto', minHeight: 320, maxHeight: 460, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Terminal size={13} color="var(--primary)" />
                <div style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '1.5px', fontWeight: 800, textTransform: 'uppercase' }}>Tool Call Inspector</div>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 10, fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5 }} className="scroll-custom">
                {lastSteps.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-3)', fontSize: 12, fontFamily: 'inherit' }}>
                    <Terminal size={28} color="var(--border-2)" style={{ margin: '0 auto 10px' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No tool calls yet</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11 }}>Run a workflow to inspect calls</p>
                  </div>
                ) : lastSteps.map((step, i) => {
                  const color = AGENT_COLORS[step.agent] || '#6366f1';
                  return (
                    <div key={step.step_id} style={{ marginBottom: 8, padding: '9px 11px', background: 'var(--surface-2)', borderLeft: `3px solid ${color}`, borderRadius: 7 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{ color: 'var(--text-3)' }}>#{i + 1}</span>
                        <span style={{ color, fontWeight: 700 }}>{step.agent}</span>
                        <span style={{ color: 'var(--text-3)' }}>·</span>
                        <span style={{ color: 'var(--text-2)' }}>{step.tool || step.name}</span>
                        <span style={{ marginLeft: 'auto', fontSize: 9.5, color: step.status === 'completed' ? '#10b981' : step.status === 'failed' ? '#ef4444' : '#f59e0b' }}>{step.status}</span>
                      </div>
                      {step.input && (
                        <div style={{ color: 'var(--text-3)', fontSize: 10, marginTop: 3, paddingLeft: 8, borderLeft: '1.5px solid var(--border)' }}>
                          → {typeof step.input === 'string' ? step.input.slice(0, 80) : JSON.stringify(step.input).slice(0, 80)}{(typeof step.input === 'string' ? step.input : JSON.stringify(step.input)).length > 80 ? '…' : ''}
                        </div>
                      )}
                      {step.output_summary && (
                        <div style={{ color: 'var(--text-2)', fontSize: 10, marginTop: 4, paddingLeft: 8, borderLeft: '1.5px solid #10b98140' }}>
                          ✓ {step.output_summary.slice(0, 100)}{step.output_summary.length > 100 ? '…' : ''}
                        </div>
                      )}
                      {step.duration_ms !== undefined && (
                        <div style={{ marginTop: 4, fontSize: 9.5, color: 'var(--text-3)' }}>⏱ {step.duration_ms.toFixed(0)}ms</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Access */}
          <div className="view-card" style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13 }}>
            <div style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 9, fontWeight: 800 }}>Quick Access</div>
            {[
              { label: 'Vault', path: '/vault', color: '#ec4899', icon: Database },
              { label: 'Tasks', path: '/tasks', color: '#10b981', icon: CheckSquare },
              { label: 'Calendar', path: '/calendar', color: '#f59e0b', icon: CalendarIcon },
              { label: 'Neural Recall', path: '/recall', color: '#818cf8', icon: Search },
            ].map(link => (
              <button key={link.path} onClick={() => navigate(link.path)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', padding: '7px 9px', borderRadius: 8, border: 'none', background: 'transparent', color: link.color, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'background 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                <link.icon size={13} /> {link.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ RIGHT: Templates + Chat + Input ═══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>

          {/* QUICK TEMPLATES (cards, not pills) */}
          {messages.length <= 1 && !isStreaming && (
            <div className="view-card" style={{ padding: '14px 16px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Wand2 size={14} color="var(--primary)" />
                  <span style={{ color: 'var(--text-3)', fontSize: 10.5, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase' }}>Workflow Templates</span>
                </div>
                <span style={{ color: 'var(--text-3)', fontSize: 10.5 }}>{QUICK_TEMPLATES.length} ready</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {QUICK_TEMPLATES.map(t => (
                  <button key={t.title} onClick={() => handleSend(t.msg)}
                    style={{ padding: '11px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 11, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.18s', display: 'flex', flexDirection: 'column', gap: 6 }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = `${t.color}50`; e.currentTarget.style.background = `${t.color}08`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${t.color}15`, border: `1px solid ${t.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <t.icon size={14} color={t.color} />
                      </div>
                      <span style={{ color: 'var(--text-1)', fontSize: 12.5, fontWeight: 700 }}>{t.title}</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-3)', fontSize: 11, lineHeight: 1.4 }}>{t.desc}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
                      {t.agents.map(a => {
                        const c = AGENT_COLORS[a] || '#6366f1';
                        return <span key={a} style={{ padding: '1px 6px', background: `${c}10`, border: `1px solid ${c}25`, borderRadius: 10, color: c, fontSize: 9, fontWeight: 700 }}>{a.replace('Agent','')}</span>;
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* MESSAGES */}
          <div style={{ flex: 1, overflowY: 'auto', borderRadius: 14, border: '1px solid rgba(99,102,241,0.18)', background: 'var(--surface-2)', padding: '18px 18px 10px', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 0 0 1px rgba(99,102,241,0.05), 0 8px 32px rgba(0,0,0,0.15)', minHeight: 320 }} className="scroll-custom agent-messages">

            {messages.map(msg => (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 11, alignItems: 'flex-start' }}>

                {/* Avatar */}
                {msg.role === 'assistant' && (
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#312e81,#1e1b4b)', border: '1px solid rgba(99,102,241,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.2)' }}>
                    <Cpu size={17} color="#a78bfa" />
                  </div>
                )}

                <div style={{ maxWidth: msg.role === 'user' ? '76%' : '90%', minWidth: 0 }}>

                  {/* Thinking */}
                  {msg.type === 'thinking' && (msg.steps || []).length === 0 && (
                    <div style={{ padding: '11px 16px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '4px 14px 14px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#a78bfa', animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />)}
                      </div>
                      <span style={{ color: '#a78bfa', fontSize: 13, fontWeight: 600 }}>Orchestrator is planning...</span>
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
                            style={{ padding: '11px 15px', background: `${color}08`, border: `1px solid ${color}25`, borderRadius: '4px 14px 14px 14px', transition: 'all 0.3s' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: step.status !== 'running' ? 7 : 0 }}>
                              <div style={{ width: 26, height: 26, borderRadius: 7, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <Icon size={13} color={color} />
                              </div>
                              <span style={{ color, fontSize: 12, fontWeight: 700 }}>{step.agent}</span>
                              <span style={{ color: 'var(--text-3)', fontSize: 11 }}>›</span>
                              <span style={{ color: 'var(--text-2)', fontSize: 12 }}>{step.name}</span>
                              {step.status === 'running' && <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 10.5, display: 'flex', alignItems: 'center', gap: 4 }}><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Running...</span>}
                              {step.status === 'completed' && <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: 10.5, fontWeight: 600 }}>✓ {step.duration_ms?.toFixed(0)}ms</span>}
                              {step.status === 'failed' && <span style={{ marginLeft: 'auto', color: '#ef4444', fontSize: 10.5 }}>✗ Failed</span>}
                            </div>
                            {step.status === 'completed' && step.output_summary && (
                              <div style={{ color: 'var(--text-2)', fontSize: 12, paddingLeft: 32, borderLeft: `2px solid ${color}50`, marginTop: 4, lineHeight: 1.5 }}>{step.output_summary}</div>
                            )}
                            {step.status === 'failed' && step.error && (
                              <div style={{ color: '#ef4444', fontSize: 11.5, marginTop: 4 }}>{step.error}</div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Streaming */}
                  {msg.type === 'streaming' && (
                    <div style={{ padding: '12px 16px', borderRadius: '4px 14px 14px 14px', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                      <p style={{ color: 'var(--text-1)', fontSize: 14, margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                        {msg.content}
                        <span style={{ display: 'inline-block', width: 2, height: '1em', background: '#a78bfa', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'bounce 1s ease-in-out infinite', opacity: 0.8 }} />
                      </p>
                    </div>
                  )}

                  {/* Text / Welcome */}
                  {(msg.type === 'text' || msg.type === 'welcome') && (
                    <div>
                      <div style={{
                        padding: '13px 17px',
                        borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                        background: msg.role === 'user' ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : msg.type === 'welcome' ? 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.06))' : 'var(--surface)',
                        border: msg.role === 'user' ? 'none' : msg.type === 'welcome' ? '1px solid rgba(99,102,241,0.25)' : '1px solid var(--border)',
                        boxShadow: msg.role === 'user' ? '0 2px 12px rgba(99,102,241,0.35)' : '0 1px 4px rgba(0,0,0,0.06)',
                        position: 'relative',
                      }}>
                        <p style={{ color: msg.role === 'user' ? '#fff' : 'var(--text-1)', fontSize: 14, margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                      </div>

                      {/* Agent tags + actions */}
                      <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                        {msg.steps && msg.steps.length > 0 && msg.steps.filter(s => s.status === 'completed').map(s => {
                          const color = AGENT_COLORS[s.agent] || '#6366f1';
                          const Icon = AGENT_ICONS[s.agent] ?? Bot;
                          return (
                            <span key={s.step_id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', background: `${color}10`, border: `1px solid ${color}25`, borderRadius: 20, color, fontSize: 10.5, fontWeight: 700 }}>
                              <Icon size={10} /> {s.agent.replace('Agent', '')}
                            </span>
                          );
                        })}
                        {msg.steps && msg.steps.filter(s => s.duration_ms).length > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-3)', fontSize: 10.5 }}>
                            <Clock size={9} /> {msg.steps.reduce((acc, s) => acc + (s.duration_ms || 0), 0).toFixed(0)}ms
                          </span>
                        )}
                        {msg.role === 'assistant' && msg.type === 'text' && (
                          <button onClick={() => copyMessage(msg.id, msg.content || '')}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 20, color: copiedId === msg.id ? '#10b981' : 'var(--text-3)', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {copiedId === msg.id ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
                          </button>
                        )}
                      </div>

                      {msg.role === 'assistant' && msg.ts && (
                        <div style={{ color: 'var(--text-3)', fontSize: 10.5, marginTop: 5, paddingLeft: 2 }}>
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

          {/* INPUT */}
          <div style={{ flexShrink: 0, background: 'var(--surface)', border: `1px solid ${isListening ? 'rgba(239,68,68,0.5)' : isStreaming ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-end', boxShadow: isListening ? '0 0 0 3px rgba(239,68,68,0.12)' : '0 0 0 1px rgba(99,102,241,0.06)', transition: 'all 0.2s' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'linear-gradient(135deg, rgba(99,102,241,0.18), rgba(139,92,246,0.12))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, alignSelf: 'center' }}>
              <Cpu size={17} color="#a78bfa" />
            </div>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={isListening ? '🎙 Listening...' : isStreaming ? 'Agents are working...' : 'Ask agents to capture, recall, schedule, analyse... (Enter to send, Shift+Enter for new line)'}
              disabled={isStreaming}
              rows={1}
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 14, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 140, overflow: 'auto', padding: '6px 0' }}
            />
            <button onClick={toggleVoice}
              style={{ width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0, background: isListening ? 'rgba(239,68,68,0.15)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
              {isListening ? <MicOff size={16} color="#ef4444" style={{ animation: 'pulse 1s ease-in-out infinite' }} /> : <Mic size={16} color="var(--text-3)" />}
            </button>
            <button onClick={() => handleSend()} disabled={!input.trim() || isStreaming}
              style={{ minWidth: 84, height: 38, borderRadius: 10, border: 'none', cursor: input.trim() && !isStreaming ? 'pointer' : 'default', fontFamily: 'inherit', flexShrink: 0, background: input.trim() && !isStreaming ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0 14px', color: input.trim() && !isStreaming ? '#fff' : 'var(--text-3)', fontSize: 13, fontWeight: 700, transition: 'all 0.15s', boxShadow: input.trim() && !isStreaming ? '0 2px 12px rgba(99,102,241,0.4)' : 'none' }}>
              {isStreaming ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <><Send size={14} /> Send</>}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, padding: '0 4px' }}>
            <p style={{ color: 'var(--text-3)', fontSize: 11, margin: 0 }}>
              <Radio size={10} style={{ verticalAlign: 'middle', color: '#10b981' }} /> Powered by Google Gemini 2.0 · Multi-agent · Real-time SSE
            </p>
            <p style={{ color: 'var(--text-3)', fontSize: 11, margin: 0, display: 'flex', gap: 12 }}>
              <span><Hash size={10} style={{ verticalAlign: 'middle' }} /> {tokensUsed.toLocaleString()} tokens</span>
              <span><Flame size={10} style={{ verticalAlign: 'middle', color: '#f59e0b' }} /> {totalAgentUses} calls</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentHubView;
