import { useState } from 'react';
import {
  Youtube, Globe, FileText, StickyNote, Image, Mic,
  Clock, Tag, ChevronDown, ChevronUp, Star, Trash2,
  Share2, Bookmark, Eye, MoreHorizontal, Filter, Search,
  Calendar, Zap, TrendingUp
} from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';

type SourceFilter = 'all' | 'youtube' | 'web' | 'pdf' | 'note' | 'image' | 'audio';

const SOURCE_FILTERS: { id: SourceFilter; icon: any; label: string; color: string }[] = [
  { id: 'all', icon: Zap, label: 'All', color: '#00d4ff' },
  { id: 'youtube', icon: Youtube, label: 'YouTube', color: '#ff4444' },
  { id: 'web', icon: Globe, label: 'Web', color: '#00d4ff' },
  { id: 'pdf', icon: FileText, label: 'PDF', color: '#f59e0b' },
  { id: 'note', icon: StickyNote, label: 'Notes', color: '#8b5cf6' },
  { id: 'audio', icon: Mic, label: 'Audio', color: '#10b981' },
  { id: 'image', icon: Image, label: 'Images', color: '#f472b6' },
];

interface Memory {
  id: number;
  type: SourceFilter;
  title: string;
  source: string;
  summary: string;
  tags: string[];
  color: string;
  icon: any;
  thumbnail?: string;
  date: string;
  time: string;
  insights: number;
  starred: boolean;
  duration?: string;
}

const MEMORIES: Memory[] = [
  {
    id: 1,
    type: 'youtube',
    title: 'The Future of AGI with Sam Altman',
    source: 'Lex Fridman Podcast #367',
    summary: 'Sam Altman discusses OpenAI\'s trajectory toward AGI, safety considerations, and the timeline for superhuman AI systems. Key insights about alignment and the Turing test.',
    tags: ['AI', 'AGI', 'OpenAI', 'Safety'],
    color: '#ff4444',
    icon: Youtube,
    thumbnail: 'https://images.unsplash.com/photo-1768327239584-e97d004f1830?w=200&q=80',
    date: 'Today',
    time: '09:14 AM',
    insights: 23,
    starred: true,
    duration: '3h 12m',
  },
  {
    id: 2,
    type: 'pdf',
    title: 'Attention Is All You Need',
    source: 'Vaswani et al. · arXiv 2017',
    summary: 'The seminal transformer paper proposing the self-attention mechanism. The architecture entirely replaces recurrence and convolutions, achieving state-of-the-art on NLP tasks.',
    tags: ['Transformers', 'NLP', 'Attention', 'Research'],
    color: '#f59e0b',
    icon: FileText,
    thumbnail: 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=200&q=80',
    date: 'Today',
    time: '07:42 AM',
    insights: 18,
    starred: true,
  },
  {
    id: 3,
    type: 'web',
    title: 'Neural Scaling Laws: What We\'ve Learned',
    source: 'Anthropic Research Blog',
    summary: 'Comprehensive breakdown of scaling laws in neural networks — how model performance predictably improves with more parameters, data, and compute.',
    tags: ['Scaling', 'LLMs', 'Research', 'Compute'],
    color: '#00d4ff',
    icon: Globe,
    thumbnail: 'https://images.unsplash.com/photo-1762279801041-88a60aee22b7?w=200&q=80',
    date: 'Today',
    time: '06:30 AM',
    insights: 12,
    starred: false,
  },
  {
    id: 4,
    type: 'note',
    title: 'Thoughts on Consciousness and Computation',
    source: 'Personal Note',
    summary: 'Reflections after reading Penrose\'s Emperor\'s New Mind. Exploring the relationship between quantum mechanics, microtubules, and conscious experience. Connecting to IIT and Global Workspace Theory.',
    tags: ['Consciousness', 'Philosophy', 'Quantum', 'IIT'],
    color: '#8b5cf6',
    icon: StickyNote,
    date: 'Yesterday',
    time: '11:20 PM',
    insights: 8,
    starred: true,
  },
  {
    id: 5,
    type: 'audio',
    title: 'Mindscape Podcast: The Arrow of Time',
    source: 'Sean Carroll · Episode 241',
    summary: 'Deep exploration of thermodynamic arrow of time, entropy, and the Boltzmann brain problem. Connections to the anthropic principle and multiverse cosmology.',
    tags: ['Physics', 'Time', 'Entropy', 'Cosmology'],
    color: '#10b981',
    icon: Mic,
    thumbnail: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?w=200&q=80',
    date: 'Yesterday',
    time: '08:45 PM',
    insights: 15,
    starred: false,
    duration: '1h 24m',
  },
  {
    id: 6,
    type: 'youtube',
    title: 'Andrej Karpathy: State of GPT',
    source: 'Microsoft Build 2023',
    summary: 'Karpathy\'s comprehensive breakdown of how GPT models work, training pipeline, RLHF, and practical guidance on using LLMs effectively. The best technical overview available.',
    tags: ['GPT', 'LLMs', 'RLHF', 'Training'],
    color: '#ff4444',
    icon: Youtube,
    thumbnail: 'https://images.unsplash.com/photo-1634744888346-88825a64548b?w=200&q=80',
    date: 'Yesterday',
    time: '03:20 PM',
    insights: 31,
    starred: true,
    duration: '43m',
  },
  {
    id: 7,
    type: 'image',
    title: 'Architecture diagram: Mixture of Experts',
    source: 'Screenshot · Research Paper',
    summary: 'Visual diagram of the Mixture of Experts architecture showing how different expert networks are activated by a gating mechanism for different input tokens.',
    tags: ['MoE', 'Architecture', 'Diagram'],
    color: '#f472b6',
    icon: Image,
    thumbnail: 'https://images.unsplash.com/photo-1758404196311-70c62a445e9c?w=200&q=80',
    date: '2 days ago',
    time: '02:00 PM',
    insights: 6,
    starred: false,
  },
  {
    id: 8,
    type: 'web',
    title: 'The Case for AI Safety Research',
    source: 'Alignment Forum · Paul Christiano',
    summary: 'A detailed argument for why AI safety is the most important problem of our time, covering deceptive alignment, inner misalignment, and the treacherous turn hypothesis.',
    tags: ['AI Safety', 'Alignment', 'Research'],
    color: '#00d4ff',
    icon: Globe,
    thumbnail: 'https://images.unsplash.com/photo-1768327239584-e97d004f1830?w=200&q=80',
    date: '2 days ago',
    time: '10:15 AM',
    insights: 19,
    starred: false,
  },
];

function MemoryCard({ memory, expanded, onToggle }: {
  memory: Memory;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [starred, setStarred] = useState(memory.starred);
  const { icon: Icon, color } = memory;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${expanded ? color + '30' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 14,
        overflow: 'hidden',
        transition: 'all 0.25s ease',
        boxShadow: expanded ? `0 0 25px ${color}10` : 'none',
      }}
    >
      <div
        style={{ display: 'flex', gap: 0, cursor: 'pointer' }}
        onClick={onToggle}
      >
        {/* Color accent bar */}
        <div
          style={{
            width: 3,
            background: color,
            boxShadow: `0 0 10px ${color}80`,
            flexShrink: 0,
          }}
        />

        {/* Thumbnail */}
        {memory.thumbnail && (
          <div style={{ width: 90, flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
            <img
              src={memory.thumbnail}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(to right, transparent 60%, rgba(5,5,15,0.9) 100%)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                background: `${color}25`,
                border: `1px solid ${color}40`,
                borderRadius: 5,
                padding: '2px 6px',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Icon size={10} color={color} />
            </div>
          </div>
        )}

        {!memory.thumbnail && (
          <div
            style={{
              width: 70,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${color}08`,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `${color}18`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon size={18} color={color} />
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: '#e2e8f0',
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {memory.title}
              </div>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 8 }}>
                {memory.source}
                {memory.duration && (
                  <span style={{ marginLeft: 8, color: color, opacity: 0.8 }}>
                    · {memory.duration}
                  </span>
                )}
              </div>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {memory.tags.slice(0, 4).map(tag => (
                  <span
                    key={tag}
                    style={{
                      background: `${color}10`,
                      color: color,
                      border: `1px solid ${color}20`,
                      borderRadius: 4,
                      padding: '1px 6px',
                      fontSize: 10,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Right side */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={e => { e.stopPropagation(); setStarred(!starred); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: starred ? '#f59e0b' : '#4b5563',
                    padding: 4,
                    display: 'flex',
                  }}
                >
                  <Star size={14} fill={starred ? '#f59e0b' : 'none'} />
                </button>
                <button
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#4b5563',
                    padding: 4,
                    display: 'flex',
                  }}
                >
                  <MoreHorizontal size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4b5563', fontSize: 11 }}>
                <Clock size={10} />
                {memory.time}
              </div>
              <div
                style={{
                  background: `${color}10`,
                  border: `1px solid ${color}20`,
                  borderRadius: 5,
                  padding: '2px 7px',
                  color: color,
                  fontSize: 11,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <TrendingUp size={9} />
                {memory.insights} insights
              </div>
              {expanded ? <ChevronUp size={14} color="#6b7280" /> : <ChevronDown size={14} color="#6b7280" />}
            </div>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            padding: '14px 16px 16px',
            borderTop: `1px solid ${color}15`,
            background: `${color}04`,
            marginLeft: 3,
          }}
        >
          <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.65, margin: '0 0 14px' }}>
            {memory.summary}
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { icon: Eye, label: 'View full' },
              { icon: Share2, label: 'Share' },
              { icon: Bookmark, label: 'Save' },
              { icon: Trash2, label: 'Delete' },
            ].map(({ icon: BtnIcon, label }) => (
              <button
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 10px',
                  background: label === 'Delete' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${label === 'Delete' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 7,
                  color: label === 'Delete' ? '#ef4444' : '#9ca3af',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <BtnIcon size={12} />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function MemoryTimeline() {
  const [activeFilter, setActiveFilter] = useState<SourceFilter>('all');
  const [expandedId, setExpandedId] = useState<number | null>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const { isMobile, isTablet } = useWindowSize();

  const filtered = MEMORIES.filter(m => {
    const matchesFilter = activeFilter === 'all' || m.type === activeFilter;
    const matchesSearch =
      !searchQuery ||
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const grouped = filtered.reduce((acc, m) => {
    if (!acc[m.date]) acc[m.date] = [];
    acc[m.date].push(m);
    return acc;
  }, {} as Record<string, Memory[]>);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 18 : 24 }}>
      {/* Header */}
      <div className="fade-in-up">
        <div
          style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 12 : 0,
          }}
        >
          <div>
            <h1 style={{ color: '#fff', fontSize: isMobile ? 22 : 26, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
              Memory Timeline
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              Chronological stream of your knowledge captures
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!isMobile && (
              <button className="rs-btn rs-btn-ghost" style={{ gap: 6, fontSize: 13, padding: '8px 14px' }}>
                <Calendar size={14} />
                Date Range
              </button>
            )}
            <button className="rs-btn rs-btn-ghost" style={{ gap: 6, fontSize: 13, padding: '8px 14px' }}>
              <Filter size={14} />
              {isMobile ? 'Filter' : 'Advanced Filter'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters + Search */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10,
            padding: '9px 14px',
            flex: isMobile ? '1 1 100%' : '0 0 220px',
          }}
        >
          <Search size={14} color="#4b5563" />
          <input
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e2e8f0',
              fontSize: 13,
              width: '100%',
            }}
            placeholder="Search memories..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Source filters — scrollable on mobile */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: isMobile ? 'nowrap' : 'wrap',
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? 4 : 0,
            flex: isMobile ? '1 1 100%' : 'none',
          }}
        >
          {SOURCE_FILTERS.map(({ id, icon: Icon, label, color }) => {
            const active = activeFilter === id;
            return (
              <button
                key={id}
                onClick={() => setActiveFilter(id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 11px',
                  borderRadius: 8,
                  border: `1px solid ${active ? color + '40' : 'rgba(255,255,255,0.07)'}`,
                  background: active ? `${color}12` : 'rgba(255,255,255,0.03)',
                  color: active ? color : '#6b7280',
                  fontSize: 12,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? `0 0 15px ${color}15` : 'none',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={12} />
                {label}
              </button>
            );
          })}
        </div>

        {!isMobile && (
          <div style={{ marginLeft: 'auto', color: '#4b5563', fontSize: 13 }}>
            {filtered.length} memories
          </div>
        )}
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', gap: 20 }}>
        {/* Main timeline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 28, minWidth: 0 }}>
          {Object.entries(grouped).map(([date, memories]) => (
            <div key={date}>
              {/* Date header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    background: 'rgba(0, 212, 255, 0.08)',
                    border: '1px solid rgba(0, 212, 255, 0.2)',
                    borderRadius: 8,
                    padding: '5px 12px',
                    flexShrink: 0,
                  }}
                >
                  <Calendar size={12} color="#00d4ff" />
                  <span style={{ color: '#00d4ff', fontSize: 13, fontWeight: 600 }}>{date}</span>
                </div>
                <div
                  style={{
                    flex: 1,
                    height: 1,
                    background: 'linear-gradient(to right, rgba(0, 212, 255, 0.15), transparent)',
                  }}
                />
                <span style={{ color: '#4b5563', fontSize: 12, flexShrink: 0 }}>{memories.length} captured</span>
              </div>

              {/* Timeline items */}
              <div style={{ display: 'flex', gap: 0 }}>
                {/* Timeline line — hide on mobile */}
                {!isMobile && (
                  <div
                    style={{
                      width: 24,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      marginRight: 16,
                      flexShrink: 0,
                    }}
                  >
                    {memories.map((_, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: i < memories.length - 1 ? 1 : 0 }}>
                        <div
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: memories[i].color,
                            boxShadow: `0 0 10px ${memories[i].color}80`,
                            flexShrink: 0,
                            marginTop: i === 0 ? 20 : 30,
                          }}
                        />
                        {i < memories.length - 1 && (
                          <div
                            style={{
                              flex: 1,
                              width: 1,
                              background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(255,255,255,0.04))',
                              margin: '4px 0',
                              minHeight: 60,
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Memory cards */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
                  {memories.map(memory => (
                    <MemoryCard
                      key={memory.id}
                      memory={memory}
                      expanded={expandedId === memory.id}
                      onToggle={() => setExpandedId(expandedId === memory.id ? null : memory.id)}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right mini panel — hide on mobile and tablet */}
        {!isMobile && !isTablet && (
          <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Activity heatmap */}
            <div className="rs-card" style={{ padding: 16 }}>
              <div style={{ color: '#6b7280', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                Capture Frequency
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                {Array.from({ length: 35 }, (_, i) => {
                  const intensity = Math.random();
                  const opacity = intensity > 0.7 ? 0.9 : intensity > 0.4 ? 0.5 : intensity > 0.15 ? 0.2 : 0.05;
                  return (
                    <div
                      key={i}
                      title={`${Math.floor(intensity * 10)} captures`}
                      style={{
                        width: '100%',
                        paddingTop: '100%',
                        borderRadius: 2,
                        background: `rgba(0, 212, 255, ${opacity})`,
                        cursor: 'pointer',
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ color: '#4b5563', fontSize: 10 }}>Less</span>
                <span style={{ color: '#4b5563', fontSize: 10 }}>More</span>
              </div>
            </div>

            {/* Quick stats */}
            <div className="rs-card" style={{ padding: 16 }}>
              <div style={{ color: '#6b7280', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                Quick Stats
              </div>
              {[
                { label: 'Total memories', value: '2,847', color: '#00d4ff' },
                { label: 'Starred', value: '234', color: '#f59e0b' },
                { label: 'This month', value: '312', color: '#8b5cf6' },
                { label: 'Total insights', value: '14.2k', color: '#10b981' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '7px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>{label}</span>
                  <span style={{ color, fontSize: 13, fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Tag cloud */}
            <div className="rs-card" style={{ padding: 16 }}>
              <div style={{ color: '#6b7280', fontSize: 11, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12 }}>
                Top Tags
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {[
                  { tag: 'AI', color: '#00d4ff', size: 14 },
                  { tag: 'Research', color: '#8b5cf6', size: 13 },
                  { tag: 'LLMs', color: '#f472b6', size: 13 },
                  { tag: 'Alignment', color: '#10b981', size: 12 },
                  { tag: 'NLP', color: '#f59e0b', size: 12 },
                  { tag: 'Philosophy', color: '#00d4ff', size: 12 },
                  { tag: 'Transformers', color: '#8b5cf6', size: 11 },
                  { tag: 'Scaling', color: '#f472b6', size: 11 },
                  { tag: 'Consciousness', color: '#10b981', size: 11 },
                  { tag: 'Training', color: '#00d4ff', size: 10 },
                  { tag: 'MoE', color: '#f59e0b', size: 10 },
                ].map(({ tag, color, size }) => (
                  <button
                    key={tag}
                    style={{
                      background: `${color}10`,
                      border: `1px solid ${color}25`,
                      color: color,
                      borderRadius: 5,
                      padding: '3px 7px',
                      fontSize: size,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = `${color}20`;
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = `${color}10`;
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}