import { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Brain, Sparkles, ChevronRight,
  Youtube, Globe, FileText, Mic, Copy, ThumbsUp,
  ThumbsDown, RefreshCw, Zap, Clock, BookOpen
} from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: { type: string; title: string; color: string }[];
  thinking?: boolean;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: 'assistant',
    content: "Hello Alex. I'm your RecallSense Neural AI — I have full access to your memory bank of **2,847 knowledge items**. I can help you recall, connect, and synthesize information from across all your captured sources.\n\nWhat would you like to explore today?",
    timestamp: '09:00 AM',
  },
  {
    id: 2,
    role: 'user',
    content: 'What are the key differences between transformers and recurrent neural networks based on my research?',
    timestamp: '09:02 AM',
  },
  {
    id: 3,
    role: 'assistant',
    content: "Based on **14 items** in your memory bank, here's a synthesis:\n\n**Transformers** (from your Attention Is All You Need paper notes):\n• Process entire sequences in parallel using self-attention\n• No sequential bottleneck — excellent for long-range dependencies\n• Scale extremely well with compute and data\n• Require O(n²) memory for attention computation\n\n**Recurrent Neural Networks** (from your ML course captures):\n• Process sequences token by token — sequential by design\n• Struggle with very long sequences due to vanishing gradients\n• More memory efficient for short sequences\n• Better suited for streaming/real-time tasks\n\n**The key insight** from your Hinton lecture notes: transformers essentially 'remember everything at once' while RNNs 'remember one step at a time.' This fundamental architectural difference explains why transformers dominate language tasks but RNNs still appear in certain time-series applications.",
    timestamp: '09:02 AM',
    sources: [
      { type: 'pdf', title: 'Attention Is All You Need', color: '#f59e0b' },
      { type: 'youtube', title: 'Geoffrey Hinton Lecture', color: '#ff4444' },
      { type: 'web', title: 'ML Course Notes', color: '#00d4ff' },
    ],
  },
];

const SUGGESTED_PROMPTS = [
  { text: 'Summarize my AI research from this week', icon: Brain, color: '#00d4ff' },
  { text: 'What connections exist between consciousness and AI?', icon: Sparkles, color: '#8b5cf6' },
  { text: 'Find memories related to neural scaling laws', icon: Zap, color: '#f472b6' },
  { text: 'What did I learn from the Lex Fridman podcast?', icon: Mic, color: '#10b981' },
  { text: 'Create a study plan from my recent captures', icon: BookOpen, color: '#f59e0b' },
  { text: 'Compare my notes on LLMs vs traditional ML', icon: RefreshCw, color: '#06b6d4' },
];

const RELATED_MEMORIES = [
  {
    title: 'Attention Is All You Need',
    type: 'pdf',
    color: '#f59e0b',
    icon: FileText,
    date: '2d ago',
    relevance: 98,
  },
  {
    title: 'Geoffrey Hinton on Neural Nets',
    type: 'youtube',
    color: '#ff4444',
    icon: Youtube,
    date: '2h ago',
    relevance: 94,
  },
  {
    title: 'Neural Scaling Laws Blog',
    type: 'web',
    color: '#00d4ff',
    icon: Globe,
    date: '6h ago',
    relevance: 87,
  },
  {
    title: 'Consciousness & AI Podcast',
    type: 'audio',
    color: '#10b981',
    icon: Mic,
    date: '1d ago',
    relevance: 72,
  },
];

const THINKING_STEPS = [
  'Scanning memory bank...',
  'Analyzing 2,847 knowledge items...',
  'Building knowledge graph connections...',
  'Synthesizing response...',
];

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#e2e8f0', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function formatContent(content: string) {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('• ')) {
      return (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ color: '#00d4ff', flexShrink: 0 }}>•</span>
          <span>{renderMarkdown(line.slice(2))}</span>
        </div>
      );
    }
    if (line === '') return <div key={i} style={{ height: 8 }} />;
    return <div key={i} style={{ marginBottom: 2 }}>{renderMarkdown(line)}</div>;
  });
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStep, setThinkingStep] = useState(0);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isMobile, isTablet } = useWindowSize();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const sendMessage = (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMsg: Message = {
      id: Date.now(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsThinking(true);
    setThinkingStep(0);

    const stepInterval = setInterval(() => {
      setThinkingStep(s => Math.min(s + 1, THINKING_STEPS.length - 1));
    }, 600);

    setTimeout(() => {
      clearInterval(stepInterval);
      setIsThinking(false);
      const aiMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Based on your memory bank, I found **${Math.floor(Math.random() * 20) + 5} relevant memories** related to your query about "${messageText.slice(0, 40)}${messageText.length > 40 ? '...' : ''}"\n\nFrom your captured sources, the key insights are:\n\n• This connects directly to your recent research on neural architectures and scaling\n• Your notes from the Anthropic blog post highlight the importance of emergent behaviors\n• The podcast episode with Sean Carroll provides philosophical context around consciousness\n\n**Key takeaway:** Your knowledge base shows a consistent theme around the intersection of computational intelligence and cognitive science. RecallSense has detected **3 new connection opportunities** between this query and your existing memories.`,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        sources: [
          { type: 'web', title: 'Anthropic Blog', color: '#00d4ff' },
          { type: 'audio', title: 'Sean Carroll Podcast', color: '#10b981' },
        ],
      };
      setMessages(prev => [...prev, aiMsg]);
    }, 2800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const chatHeight = isMobile ? 'calc(100vh - 320px)' : 'calc(100vh - 240px)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header */}
      <div className="fade-in-up" style={{ marginBottom: 20 }}>
        <h1 style={{ color: '#fff', fontSize: isMobile ? 22 : 26, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
          AI Neural Assistant
        </h1>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
          Powered by your personal memory bank · <span style={{ color: '#00d4ff' }}>2,847 memories indexed</span>
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile || isTablet ? '1fr' : '1fr 320px', gap: 20 }}>
        {/* Chat Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minHeight: 0 }}>
          {/* Messages */}
          <div
            className="rs-card scroll-custom"
            style={{
              height: chatHeight,
              overflowY: 'auto',
              padding: isMobile ? 14 : 20,
              marginBottom: 14,
            }}
          >
            {/* Suggested prompts if at start */}
            {messages.length <= 1 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 12, letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Ask your memory anything
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                  {SUGGESTED_PROMPTS.map(({ text, icon: Icon, color }) => (
                    <button
                      key={text}
                      onClick={() => sendMessage(text)}
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 10,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}30`;
                        (e.currentTarget as HTMLButtonElement).style.background = `${color}08`;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
                        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.03)';
                      }}
                    >
                      <Icon size={14} color={color} style={{ marginTop: 1, flexShrink: 0 }} />
                      <span style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.4 }}>{text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map(msg => (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    gap: 12,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background:
                        msg.role === 'assistant'
                          ? 'linear-gradient(135deg, #00d4ff, #8b5cf6)'
                          : 'linear-gradient(135deg, #8b5cf6, #f472b6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow:
                        msg.role === 'assistant'
                          ? '0 0 15px rgba(0, 212, 255, 0.3)'
                          : '0 0 15px rgba(139, 92, 246, 0.3)',
                    }}
                  >
                    {msg.role === 'assistant' ? (
                      <Bot size={16} color="white" />
                    ) : (
                      <User size={16} color="white" />
                    )}
                  </div>

                  {/* Message bubble */}
                  <div style={{ maxWidth: isMobile ? '88%' : '78%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div
                      style={{
                        padding: isMobile ? '11px 13px' : '13px 16px',
                        borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                        background:
                          msg.role === 'user'
                            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(244, 114, 182, 0.15))'
                            : 'rgba(255,255,255,0.04)',
                        border:
                          msg.role === 'user'
                            ? '1px solid rgba(139, 92, 246, 0.25)'
                            : '1px solid rgba(255,255,255,0.07)',
                        color: '#d1d5db',
                        fontSize: isMobile ? 13 : 14,
                        lineHeight: 1.65,
                      }}
                    >
                      {formatContent(msg.content)}
                    </div>

                    {/* Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ color: '#4b5563', fontSize: 11 }}>Sources:</span>
                        {msg.sources.map((s, i) => (
                          <span
                            key={i}
                            style={{
                              background: `${s.color}10`,
                              border: `1px solid ${s.color}25`,
                              color: s.color,
                              borderRadius: 5,
                              padding: '2px 7px',
                              fontSize: 11,
                            }}
                          >
                            {s.title}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    {msg.role === 'assistant' && (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => copyMessage(msg.id, msg.content)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: copiedId === msg.id ? '#10b981' : '#4b5563',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11,
                            padding: '3px 6px',
                            borderRadius: 5,
                          }}
                        >
                          <Copy size={11} />
                          {copiedId === msg.id ? 'Copied!' : 'Copy'}
                        </button>
                        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '3px 6px' }}>
                          <ThumbsUp size={11} />
                        </button>
                        <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '3px 6px' }}>
                          <ThumbsDown size={11} />
                        </button>
                        <span style={{ color: '#374151', fontSize: 11, marginLeft: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} />
                          {msg.timestamp}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Thinking indicator */}
              {isThinking && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #00d4ff, #8b5cf6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: '0 0 15px rgba(0, 212, 255, 0.4)',
                    }}
                  >
                    <Bot size={16} color="white" />
                  </div>
                  <div
                    style={{
                      padding: '13px 16px',
                      borderRadius: '4px 16px 16px 16px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(0, 212, 255, 0.15)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#00d4ff',
                              boxShadow: '0 0 6px #00d4ff',
                              animation: `blink 1.4s ease-in-out ${i * 0.2}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                      <span style={{ color: '#00d4ff', fontSize: 13 }}>
                        {THINKING_STEPS[thinkingStep]}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {THINKING_STEPS.map((_, i) => (
                        <div
                          key={i}
                          style={{
                            height: 2,
                            flex: 1,
                            borderRadius: 1,
                            background: i <= thinkingStep ? '#00d4ff' : 'rgba(255,255,255,0.08)',
                            transition: 'background 0.3s ease',
                            boxShadow: i <= thinkingStep ? '0 0 6px #00d4ff' : 'none',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '12px 14px',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-end',
            }}
          >
            <textarea
              ref={inputRef}
              className="scroll-custom"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isMobile ? 'Ask about your memories...' : 'Ask about your memories... (Enter to send, Shift+Enter for new line)'}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e2e8f0',
                fontSize: 14,
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
                minHeight: 40,
                maxHeight: 120,
              }}
              rows={1}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isThinking}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background:
                  input.trim() && !isThinking
                    ? 'linear-gradient(135deg, #00d4ff, #0099cc)'
                    : 'rgba(255,255,255,0.06)',
                border: 'none',
                cursor: input.trim() && !isThinking ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s ease',
                boxShadow: input.trim() && !isThinking ? '0 0 20px rgba(0,212,255,0.3)' : 'none',
              }}
            >
              <Send size={16} color={input.trim() && !isThinking ? '#fff' : '#4b5563'} />
            </button>
          </div>

          {/* Quick prompts bar */}
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {SUGGESTED_PROMPTS.slice(0, isMobile ? 2 : 3).map(({ text, color }) => (
              <button
                key={text}
                onClick={() => sendMessage(text)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 20,
                  padding: '5px 12px',
                  color: '#6b7280',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = `${color}40`;
                  (e.currentTarget as HTMLButtonElement).style.color = color;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
                  (e.currentTarget as HTMLButtonElement).style.color = '#6b7280';
                }}
              >
                {text.length > 30 ? text.slice(0, 30) + '...' : text}
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Related Memories — hidden on mobile */}
        {!isMobile && !isTablet && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto', maxHeight: 'calc(100vh - 180px)' }} className="scroll-custom">
            {/* Memory Context */}
            <div className="rs-card rs-card-cyan" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Brain size={15} color="#00d4ff" />
                <span style={{ color: '#00d4ff', fontSize: 13, fontWeight: 600 }}>Active Memory Context</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {RELATED_MEMORIES.map(({ title, color, icon: Icon, date, relevance }) => (
                  <div
                    key={title}
                    style={{
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 9,
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
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 7,
                          background: `${color}18`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={13} color={color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            color: '#d1d5db',
                            fontSize: 12,
                            fontWeight: 500,
                            marginBottom: 3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: '#4b5563', fontSize: 10 }}>{date}</span>
                          <span style={{ color: color, fontSize: 10 }}>{relevance}% match</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${relevance}%`,
                            background: `linear-gradient(90deg, ${color}80, ${color})`,
                            borderRadius: 1,
                            boxShadow: `0 0 6px ${color}60`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Capabilities */}
            <div className="rs-card" style={{ padding: 18 }}>
              <div style={{ color: '#6b7280', fontSize: 12, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                Neural Capabilities
              </div>
              {[
                { label: 'Cross-source synthesis', value: 94, color: '#00d4ff' },
                { label: 'Contextual recall', value: 89, color: '#8b5cf6' },
                { label: 'Insight generation', value: 82, color: '#f472b6' },
                { label: 'Knowledge linking', value: 91, color: '#10b981' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#9ca3af', fontSize: 12 }}>{label}</span>
                    <span style={{ color, fontSize: 12 }}>{value}%</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${value}%`,
                        background: `linear-gradient(90deg, ${color}60, ${color})`,
                        borderRadius: 2,
                        boxShadow: `0 0 6px ${color}40`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Memory Stats */}
            <div className="rs-card" style={{ padding: 18 }}>
              <div style={{ color: '#6b7280', fontSize: 12, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                Session Stats
              </div>
              {[
                { label: 'Memories accessed', value: '47', color: '#00d4ff' },
                { label: 'Connections found', value: '12', color: '#8b5cf6' },
                { label: 'Queries this session', value: '3', color: '#f472b6' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>{label}</span>
                  <span style={{ color, fontSize: 14, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}