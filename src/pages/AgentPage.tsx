import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Send, Mic, MicOff, Loader2, Sparkles, CheckSquare, BarChart2 } from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { motion } from 'motion/react';
import type { AgentMsg, AgentStepData } from '../lib/types';

const AGENT_COLORS: Record<string, string> = {
  Orchestrator: '#00d4ff', CaptureAgent: '#f43f5e', RecallAgent: '#8b5cf6',
  TaskAgent: '#10b981', CalendarAgent: '#f59e0b', BriefingAgent: '#06b6d4', AnalyticsAgent: '#3b82f6'
};

const QUICK_PROMPTS = [
  { label: 'Daily briefing', icon: Sparkles, msg: 'Give me my AI daily briefing with learning summary' },
  { label: 'Review tasks', icon: CheckSquare, msg: 'Show me all my pending tasks and prioritize them' },
  { label: 'What did I learn?', icon: Brain, msg: 'Recall the most important things I have saved recently' },
  { label: 'Study schedule', icon: CalendarIcon, msg: 'Create a study plan for this week based on my knowledge base' },
  { label: 'Knowledge stats', icon: BarChart2, msg: 'Analyze my knowledge base and give me learning insights' },
];

const AgentHubView = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<AgentMsg[]>([
    {
      id: 'welcome', role: 'assistant', type: 'welcome', ts: new Date().toISOString(),
      content: 'Hello! I am the Neural AI Orchestrator.\n\nI coordinate a team of specialized sub-agents to help you capture knowledge, manage tasks, schedule study sessions, and recall anything from your Second Brain.\n\nWhat would you like to accomplish today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, 'idle' | 'running' | 'done'>>({});
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activePanel, setActivePanel] = useState<'agents' | 'history'>('agents');
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const thinkingIdRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);

  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setInput(transcript);
    };
    rec.onend = () => { setIsListening(false); };
    rec.onerror = () => { setIsListening(false); };
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [isListening]);

  const agentList = [
    { name: 'Orchestrator', role: 'Primary coordinator', color: '#00d4ff', tools: ['plan', 'delegate', 'synthesize'] },
    { name: 'CaptureAgent', role: 'Captures YouTube, web, notes', color: '#f43f5e', tools: ['youtube', 'web', 'note'] },
    { name: 'RecallAgent', role: 'Semantic knowledge search', color: '#8b5cf6', tools: ['search', 'filter'] },
    { name: 'TaskAgent', role: 'Task creation & management', color: '#10b981', tools: ['create', 'list', 'complete'] },
    { name: 'CalendarAgent', role: 'Event scheduling', color: '#f59e0b', tools: ['schedule', 'list'] },
    { name: 'BriefingAgent', role: 'Daily briefings & study plans', color: '#06b6d4', tools: ['briefing', 'plan'] },
    { name: 'AnalyticsAgent', role: 'Stats & learning insights', color: '#3b82f6', tools: ['stats', 'graph'] },
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const data = await fetch('/workflows?limit=10').then(r => r.json());
      setWorkflows(Array.isArray(data) ? data : []);
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
    setInput('');
    setIsStreaming(true);
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
            try {
              const event = JSON.parse(line.slice(6));
              handleSSEEvent(event);
            } catch { }
          }
        }
      }
    } catch (e: any) {
      setMessages(prev => prev.map(m => m.id === thinkingIdRef.current
        ? { ...m, type: 'text', content: `Error: ${e.message || 'Connection failed'}` }
        : m
      ));
    } finally {
      setIsStreaming(false);
      setAgentStatuses({});
      fetchWorkflows();
    }
  };

  const handleSSEEvent = (event: any) => {
    const thinkId = thinkingIdRef.current;
    switch (event.type) {
      case 'thinking':
        setAgentStatuses(prev => ({ ...prev, Orchestrator: 'running' }));
        break;
      case 'agent_start':
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'running', Orchestrator: 'running' }));
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, type: 'steps', steps: [...(m.steps || []), { step_id: event.step_id, agent: event.agent, tool: event.tool, name: event.name, status: 'running', input: event.input }] }
          : m
        ));
        break;
      case 'agent_complete':
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'done' }));
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, steps: (m.steps || []).map(s => s.step_id === event.step_id ? { ...s, status: 'completed', output_summary: event.output_summary, duration_ms: event.duration_ms } : s) }
          : m
        ));
        break;
      case 'agent_error':
        setAgentStatuses(prev => ({ ...prev, [event.agent]: 'idle' }));
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, steps: (m.steps || []).map(s => s.step_id === event.step_id ? { ...s, status: 'failed', error: event.error } : s) }
          : m
        ));
        break;
      case 'token':
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, type: 'streaming' as const, content: (m.content || '') + event.text }
          : m
        ));
        break;
      case 'workflow_complete':
        setMessages(prev => [
          ...prev.filter(m => m.id !== thinkId),
          { id: event.workflow_id, role: 'assistant' as const, type: 'text' as const, content: event.reply, steps: event.steps, agents: event.agents_called, workflow_id: event.workflow_id, ts: event.timestamp || new Date().toISOString() }
        ]);
        setAgentStatuses({});
        break;
      case 'error':
        setMessages(prev => prev.map(m => m.id === thinkId
          ? { ...m, type: 'text', content: `Neural AI error: ${event.message}` }
          : m
        ));
        break;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="agent-hub-layout">

      {/* Left Panel */}
      <div style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }} className="agent-hub-left hidden lg:flex">
        <div style={{ display: 'flex', background: 'var(--surface-3)', borderRadius: 10, padding: 3, border: '1px solid var(--border)' }}>
          {(['agents', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActivePanel(tab)}
              style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit', background: activePanel === tab ? 'var(--surface)' : 'transparent', color: activePanel === tab ? 'var(--primary)' : 'var(--text-3)', fontSize: 11, fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.2s', boxShadow: activePanel === tab ? 'var(--shadow-sm)' : 'none' }}>
              {tab === 'agents' ? 'Agents' : 'History'}
            </button>
          ))}
        </div>

        {activePanel === 'agents' ? (
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '11px 14px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ color: '#94a3b8', fontSize: 10, letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase' }}>Agent Registry</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }} className="scroll-custom">
              {agentList.map(agent => {
                const status = agentStatuses[agent.name] || 'idle';
                return (
                  <div key={agent.name} style={{ padding: '8px 10px', borderRadius: 9, marginBottom: 2, background: status === 'running' ? `${agent.color}10` : 'transparent', border: `1px solid ${status === 'running' ? agent.color + '30' : 'transparent'}`, transition: 'all 0.25s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ position: 'relative', width: 7, height: 7, flexShrink: 0 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: status === 'running' ? agent.color : status === 'done' ? '#10b981' : 'var(--border-2)' }} />
                        {status === 'running' && (
                          <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: `1px solid ${agent.color}`, animation: 'ping 1s cubic-bezier(0,0,0.2,1) infinite', opacity: 0.6 }} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: status === 'running' ? agent.color : 'var(--text-1)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.name}</div>
                        <div style={{ color: 'var(--text-3)', fontSize: 9.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{agent.role}</div>
                      </div>
                    </div>
                    {status === 'running' && (
                      <div style={{ marginTop: 5, display: 'flex', gap: 3 }}>
                        {[1,2,3].map(i => (
                          <div key={i} style={{ height: 2, flex: 1, background: agent.color, borderRadius: 2, opacity: 0.5, animation: `pulse ${0.6 + i * 0.2}s ease-in-out infinite alternate` }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '9px 14px', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ color: 'var(--text-2)', fontSize: 10 }}>{agentList.length} agents ready</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ padding: '11px 14px 8px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '1.5px', fontWeight: 700, textTransform: 'uppercase' }}>Workflow History</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }} className="scroll-custom">
              {workflows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-3)', fontSize: 11 }}>No workflows yet</div>
              ) : workflows.map(wf => (
                <div key={wf.id} style={{ padding: '8px 10px', borderRadius: 9, marginBottom: 4, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: wf.status === 'completed' ? '#10b981' : wf.status === 'failed' ? '#ef4444' : '#f59e0b', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-1)', fontSize: 10, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.description || wf.name}</span>
                  </div>
                  <div style={{ color: 'var(--text-3)', fontSize: 9.5 }}>{wf.agents_called?.join(' › ')} · {wf.steps?.length || 0} steps</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ color: 'var(--text-3)', fontSize: 9.5, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8, fontWeight: 700 }}>Quick Access</div>
          {[
            { label: 'Vault', path: '/vault', color: '#ec4899' },
            { label: 'Tasks', path: '/tasks', color: '#10b981' },
            { label: 'Calendar', path: '/calendar', color: '#f59e0b' },
          ].map(link => (
            <button key={link.path} onClick={() => navigate(link.path)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '5px 8px', borderRadius: 7, border: 'none', background: 'transparent', color: link.color, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'background 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
              → {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel: Chat */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
          <div>
            <h2 style={{ color: 'var(--text-1)', fontSize: 20, fontWeight: 800, margin: 0, letterSpacing: '-0.4px' }}>
              Agent Hub <span style={{ color: 'var(--primary)', marginLeft: 4 }}>✦</span>
            </h2>
            <p style={{ color: 'var(--text-3)', fontSize: 12, margin: '2px 0 0' }}>Multi-agent AI system · Real-time coordination · SSE streaming</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isStreaming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1s ease-in-out infinite' }} />
                <span style={{ color: 'var(--primary)', fontSize: 11, fontWeight: 600 }}>Agents active</span>
              </div>
            )}
            <button onClick={() => { setMessages([{ id: 'welcome', role: 'assistant', type: 'welcome', ts: new Date().toISOString(), content: 'Session cleared. How can I help you?' }]); setAgentStatuses({}); }}
              style={{ padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-2)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
              Clear
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', borderRadius: 14, border: '1px solid var(--border)', background: 'var(--surface-2)', padding: 16, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 14 }} className="scroll-custom agent-messages">
          {messages.map(msg => (
            <div key={msg.id} style={{ display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1,#9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(99,102,241,0.25)' }}>
                  <Brain size={15} color="white" />
                </div>
              )}
              <div style={{ maxWidth: msg.role === 'user' ? '70%' : '85%', minWidth: 0 }}>
                {msg.type === 'thinking' && (msg.steps || []).length === 0 && (
                  <div style={{ padding: '10px 14px', background: 'var(--primary-bg)', border: '1px solid var(--primary-border)', borderRadius: '4px 14px 14px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', animation: `bounce 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                      ))}
                    </div>
                    <span style={{ color: 'var(--primary)', fontSize: 12, fontWeight: 500 }}>Orchestrator is planning...</span>
                  </div>
                )}
                {msg.type === 'steps' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(msg.steps || []).map(step => {
                      const color = AGENT_COLORS[step.agent] || '#6366f1';
                      return (
                        <div key={step.step_id} style={{ padding: '10px 14px', background: `${color}08`, border: `1px solid ${color}20`, borderRadius: '4px 14px 14px 14px', transition: 'all 0.3s' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: step.status !== 'running' ? 6 : 0 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: step.status === 'completed' ? '#10b981' : step.status === 'failed' ? '#ef4444' : color, ...(step.status === 'running' ? { animation: 'pulse 1s ease-in-out infinite' } : {}) }} />
                            <span style={{ color, fontSize: 10.5, fontWeight: 700 }}>{step.agent}</span>
                            <span style={{ color: 'var(--text-3)', fontSize: 10 }}>›</span>
                            <span style={{ color: 'var(--text-2)', fontSize: 10.5 }}>{step.name}</span>
                            {step.status === 'running' && <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 9.5 }}>Running...</span>}
                            {step.status === 'completed' && <span style={{ marginLeft: 'auto', color: '#10b981', fontSize: 9.5 }}>✓ {step.duration_ms?.toFixed(0)}ms</span>}
                            {step.status === 'failed' && <span style={{ marginLeft: 'auto', color: '#ef4444', fontSize: 9.5 }}>✗ Failed</span>}
                          </div>
                          {step.status === 'completed' && step.output_summary && (
                            <div style={{ color: 'var(--text-2)', fontSize: 11, paddingLeft: 14, borderLeft: `2px solid ${color}40`, marginTop: 4 }}>{step.output_summary}</div>
                          )}
                          {step.status === 'failed' && step.error && (
                            <div style={{ color: '#ef4444', fontSize: 10.5, marginTop: 4 }}>{step.error}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {msg.type === 'streaming' && (
                  <div style={{ padding: '11px 15px', borderRadius: '4px 14px 14px 14px', background: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <p style={{ color: '#0f172a', fontSize: 13, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                      {msg.content}
                      <span style={{ display: 'inline-block', width: 2, height: '1em', background: '#6366f1', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'bounce 1s ease-in-out infinite', opacity: 0.8 }} />
                    </p>
                  </div>
                )}
                {(msg.type === 'text' || msg.type === 'welcome') && (
                  <div>
                    <div style={{ padding: '11px 15px', borderRadius: msg.role === 'user' ? '14px 4px 14px 14px' : '4px 14px 14px 14px', background: msg.role === 'user' ? '#6366f1' : msg.type === 'welcome' ? '#eef2ff' : '#ffffff', border: msg.role === 'user' ? 'none' : `1px solid ${msg.type === 'welcome' ? '#c7d2fe' : '#e2e8f0'}`, boxShadow: msg.role === 'user' ? '0 2px 8px rgba(99,102,241,0.25)' : '0 1px 3px rgba(0,0,0,0.04)' }}>
                      <p style={{ color: msg.role === 'user' ? '#ffffff' : '#0f172a', fontSize: 13, margin: 0, lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    </div>
                    {msg.steps && msg.steps.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {msg.steps.map(s => {
                          const color = AGENT_COLORS[s.agent] || '#6366f1';
                          return (
                            <span key={s.step_id} style={{ padding: '2px 8px', background: `${color}10`, border: `1px solid ${color}20`, borderRadius: 20, color, fontSize: 9.5, fontWeight: 700 }}>
                              {s.agent.replace('Agent', '')} · {s.name}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {msg.role === 'assistant' && msg.ts && (
                      <div style={{ color: '#94a3b8', fontSize: 9.5, marginTop: 4, paddingLeft: 2 }}>
                        {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.agents && msg.agents.length > 0 && ` · ${msg.agents.length} agents`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {messages.length <= 2 && !isStreaming && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, flexShrink: 0 }}>
            {QUICK_PROMPTS.map(qp => (
              <button key={qp.label} onClick={() => handleSend(qp.msg)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-2)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--primary-bg)'; e.currentTarget.style.borderColor = 'var(--primary-border)'; e.currentTarget.style.color = 'var(--primary)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
                <qp.icon size={11} /> {qp.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ flexShrink: 0, background: 'var(--surface)', border: `1px solid ${isListening ? 'rgba(239,68,68,0.5)' : 'var(--border)'}`, borderRadius: 13, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-end', boxShadow: isListening ? '0 0 0 3px rgba(239,68,68,0.12)' : 'var(--shadow-sm)', transition: 'all 0.2s' }}>
          <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={isListening ? '🎙 Listening...' : 'Ask Neural AI anything... (Enter to send, Shift+Enter for new line)'}
            disabled={isStreaming}
            rows={1}
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-1)', fontSize: 13, resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 120, overflow: 'auto' }}
          />
          <button onClick={toggleVoice} title={isListening ? 'Stop listening' : 'Voice input'}
            style={{ width: 34, height: 34, borderRadius: 9, border: 'none', cursor: 'pointer', flexShrink: 0, background: isListening ? 'rgba(239,68,68,0.12)' : 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
            {isListening
              ? <MicOff size={14} color="#ef4444" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
              : <Mic size={14} color="var(--text-3)" />}
          </button>
          <button onClick={() => handleSend()} disabled={!input.trim() || isStreaming}
            style={{ width: 34, height: 34, borderRadius: 9, border: 'none', cursor: input.trim() && !isStreaming ? 'pointer' : 'default', fontFamily: 'inherit', flexShrink: 0, background: input.trim() && !isStreaming ? 'var(--primary)' : 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', boxShadow: input.trim() && !isStreaming ? '0 2px 8px rgba(99,102,241,0.3)' : 'none' }}>
            {isStreaming ? <Loader2 size={15} color="var(--text-3)" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} color={input.trim() ? 'white' : 'var(--text-3)'} />}
          </button>
        </div>

        <p style={{ color: 'var(--text-3)', fontSize: 9.5, textAlign: 'center', marginTop: 8, flexShrink: 0 }}>
          Powered by Google Gemini 2.0 · Multi-agent orchestration · Real-time SSE streaming
        </p>
      </div>
    </div>
  );
};

export default AgentHubView;
