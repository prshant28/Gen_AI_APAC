import { useState } from 'react';
import {
  LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PolarRadiusAxis, Cell
} from 'recharts';
import {
  Brain, TrendingUp, Database, Zap, Youtube, Globe, FileText,
  Mic, ChevronRight, Star, ArrowUpRight
} from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';

const STATS = [
  {
    label: 'Total Memories',
    value: '2,847',
    delta: '+24 today',
    color: '#00d4ff',
    icon: Brain,
    glow: 'rs-card-cyan',
  },
  {
    label: 'AI Queries',
    value: '1,203',
    delta: '+18 today',
    color: '#8b5cf6',
    icon: Zap,
    glow: 'rs-card-purple',
  },
  {
    label: 'Sources Indexed',
    value: '312',
    delta: '+5 today',
    color: '#f472b6',
    icon: Database,
    glow: 'rs-card-pink',
  },
  {
    label: 'Recall Score',
    value: '94%',
    delta: '+2.3% this week',
    color: '#10b981',
    icon: TrendingUp,
    glow: 'rs-card-green',
  },
];

const ACTIVITY_DATA = [
  { day: 'Mon', youtube: 4, web: 6, pdf: 2, notes: 8 },
  { day: 'Tue', youtube: 7, web: 4, pdf: 5, notes: 3 },
  { day: 'Wed', youtube: 3, web: 9, pdf: 1, notes: 6 },
  { day: 'Thu', youtube: 8, web: 5, pdf: 7, notes: 4 },
  { day: 'Fri', youtube: 5, web: 11, pdf: 3, notes: 9 },
  { day: 'Sat', youtube: 6, web: 7, pdf: 4, notes: 5 },
  { day: 'Sun', youtube: 9, web: 8, pdf: 6, notes: 7 },
];

const RADAR_DATA = [
  { topic: 'AI & ML', A: 92 },
  { topic: 'Science', A: 78 },
  { topic: 'Philosophy', A: 65 },
  { topic: 'Engineering', A: 88 },
  { topic: 'History', A: 55 },
  { topic: 'Business', A: 72 },
];

const TOPICS = [
  { name: 'Artificial Intelligence', count: 423, color: '#00d4ff' },
  { name: 'Machine Learning', count: 311, color: '#8b5cf6' },
  { name: 'Quantum Computing', count: 198, color: '#f472b6' },
  { name: 'Neuroscience', count: 167, color: '#10b981' },
  { name: 'Philosophy of Mind', count: 134, color: '#f59e0b' },
  { name: 'Data Science', count: 112, color: '#06b6d4' },
];

const RECENT_CAPTURES = [
  {
    id: 1,
    type: 'youtube',
    icon: Youtube,
    color: '#ff4444',
    title: 'The Future of AGI with Sam Altman',
    source: 'Lex Fridman Podcast',
    time: '2h ago',
    tags: ['AI', 'AGI', 'OpenAI'],
    thumbnail: 'https://images.unsplash.com/photo-1768327239584-e97d004f1830?w=400&q=80',
  },
  {
    id: 2,
    type: 'pdf',
    icon: FileText,
    color: '#f59e0b',
    title: 'Attention Is All You Need',
    source: 'arXiv Paper',
    time: '4h ago',
    tags: ['Transformers', 'NLP', 'Research'],
    thumbnail: 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?w=400&q=80',
  },
  {
    id: 3,
    type: 'web',
    icon: Globe,
    color: '#00d4ff',
    title: 'Neural Scaling Laws Explained',
    source: 'Anthropic Blog',
    time: '6h ago',
    tags: ['Scaling', 'LLMs', 'Research'],
    thumbnail: 'https://images.unsplash.com/photo-1762279801041-88a60aee22b7?w=400&q=80',
  },
  {
    id: 4,
    type: 'audio',
    icon: Mic,
    color: '#10b981',
    title: 'Consciousness & AI Podcast',
    source: 'Sean Carroll',
    time: '1d ago',
    tags: ['Consciousness', 'Philosophy', 'AI'],
    thumbnail: 'https://images.unsplash.com/photo-1769509068789-f242b5a6fc47?w=400&q=80',
  },
];

const SOURCE_DIST = [
  { name: 'YouTube', value: 34, color: '#ff4444' },
  { name: 'Web', value: 28, color: '#00d4ff' },
  { name: 'PDF', value: 18, color: '#f59e0b' },
  { name: 'Notes', value: 12, color: '#8b5cf6' },
  { name: 'Audio', value: 5, color: '#10b981' },
  { name: 'Images', value: 3, color: '#f472b6' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: 'rgba(10, 10, 25, 0.95)',
          border: '1px solid rgba(0, 212, 255, 0.2)',
          borderRadius: 10,
          padding: '10px 14px',
          backdropFilter: 'blur(20px)',
        }}
      >
        <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 6 }}>{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color, fontSize: 13, margin: '2px 0' }}>
            {entry.name}: <span style={{ color: '#e2e8f0' }}>{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const [activeSource, setActiveSource] = useState<number | null>(null);
  const { isMobile, isTablet } = useWindowSize();

  const statsColumns = isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';
  const chartsRow1Columns = isMobile ? '1fr' : isTablet ? '1fr' : '2fr 1fr';
  const chartsRow2Columns = isMobile ? '1fr' : '1fr 1fr';
  const capturesColumns = isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';

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
            <h1
              style={{
                color: '#fff',
                fontSize: isMobile ? 22 : 26,
                fontWeight: 700,
                margin: 0,
                letterSpacing: '-0.3px',
              }}
            >
              Neural Command Center
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
              Monday, March 9, 2026 · Your memory is{' '}
              <span style={{ color: '#00d4ff' }}>94% optimized</span>
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(0, 212, 255, 0.06)',
              border: '1px solid rgba(0, 212, 255, 0.15)',
              borderRadius: 10,
              padding: '8px 14px',
              flexShrink: 0,
            }}
          >
            <Star size={14} color="#00d4ff" />
            <span style={{ color: '#00d4ff', fontSize: 13 }}>
              {isMobile ? '24 new memories' : 'Today: 24 new memories indexed'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div
        className="fade-in-up"
        style={{ display: 'grid', gridTemplateColumns: statsColumns, gap: isMobile ? 10 : 16 }}
      >
        {STATS.map(({ label, value, delta, color, icon: Icon, glow }) => (
          <div key={label} className={`rs-card ${glow}`} style={{ padding: isMobile ? 16 : 20 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div
                style={{
                  width: isMobile ? 36 : 42,
                  height: isMobile ? 36 : 42,
                  borderRadius: 11,
                  background: `${color}15`,
                  border: `1px solid ${color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={isMobile ? 17 : 20} color={color} />
              </div>
              <ArrowUpRight size={14} color={color} style={{ opacity: 0.6 }} />
            </div>
            <div style={{ color: '#fff', fontSize: isMobile ? 22 : 28, fontWeight: 700, letterSpacing: '-0.5px' }}>
              {value}
            </div>
            <div style={{ color: '#6b7280', fontSize: isMobile ? 11 : 13, marginTop: 2 }}>{label}</div>
            <div style={{ color: color, fontSize: 11, marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={11} />
              {delta}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: chartsRow1Columns, gap: 20 }}>
        {/* Capture Activity */}
        <div className="rs-card rs-card-cyan" style={{ padding: isMobile ? 16 : 22 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 }}>Capture Activity</h3>
              <p style={{ color: '#6b7280', fontSize: 12, marginTop: 3 }}>Weekly knowledge ingestion by source</p>
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 8 : 12, flexWrap: 'wrap' }}>
              {[
                { key: 'youtube', color: '#ff4444', label: 'Video' },
                { key: 'web', color: '#00d4ff', label: 'Web' },
                { key: 'pdf', color: '#f59e0b', label: 'PDF' },
                { key: 'notes', color: '#8b5cf6', label: 'Notes' },
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                  <span style={{ color: '#9ca3af', fontSize: 11 }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
            <LineChart id="activity-line-chart" data={ACTIVITY_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#4b5563', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="youtube" stroke="#ff4444" strokeWidth={2} dot={false} name="Video" />
              <Line type="monotone" dataKey="web" stroke="#00d4ff" strokeWidth={2} dot={false} name="Web" />
              <Line type="monotone" dataKey="pdf" stroke="#f59e0b" strokeWidth={2} dot={false} name="PDF" />
              <Line type="monotone" dataKey="notes" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Notes" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Knowledge Radar */}
        <div className="rs-card rs-card-purple" style={{ padding: isMobile ? 16 : 22 }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0, marginBottom: 4 }}>
            Knowledge Map
          </h3>
          <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 12 }}>Domain expertise levels</p>
          <ResponsiveContainer width="100%" height={isMobile ? 180 : 210}>
            <RadarChart id="knowledge-radar-chart" data={RADAR_DATA}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="topic" tick={{ fill: '#6b7280', fontSize: isMobile ? 10 : 11 }} />
              <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
              <Radar
                name="Knowledge"
                dataKey="A"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: chartsRow2Columns, gap: 20 }}>
        {/* Top Topics */}
        <div className="rs-card" style={{ padding: isMobile ? 16 : 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 }}>Top Topics</h3>
              <p style={{ color: '#6b7280', fontSize: 12, marginTop: 3 }}>Most captured knowledge areas</p>
            </div>
            <button
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#00d4ff',
                fontSize: 12,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {TOPICS.map(({ name, count, color }) => (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ color: '#d1d5db', fontSize: 13 }}>{name}</span>
                  <span style={{ color: color, fontSize: 12 }}>{count} items</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(count / 423) * 100}%`,
                      background: `linear-gradient(90deg, ${color}cc, ${color})`,
                      borderRadius: 2,
                      boxShadow: `0 0 8px ${color}60`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Source Distribution */}
        <div className="rs-card" style={{ padding: isMobile ? 16 : 22 }}>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 }}>Source Distribution</h3>
            <p style={{ color: '#6b7280', fontSize: 12, marginTop: 3 }}>Knowledge by input type</p>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart id="source-bar-chart" data={SOURCE_DIST} margin={{ top: 0, right: 5, left: -25, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#4b5563', fontSize: isMobile ? 10 : 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#4b5563', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Percentage">
                {SOURCE_DIST.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {SOURCE_DIST.map(({ name, value, color }) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                <span style={{ color: '#9ca3af', fontSize: 11 }}>{name} {value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Captures */}
      <div className="rs-card" style={{ padding: isMobile ? 16 : 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 }}>Recent Captures</h3>
            <p style={{ color: '#6b7280', fontSize: 12, marginTop: 3 }}>Latest knowledge ingested by your neural engine</p>
          </div>
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#00d4ff',
              fontSize: 12,
              background: 'rgba(0,212,255,0.08)',
              border: '1px solid rgba(0,212,255,0.2)',
              borderRadius: 8,
              padding: '6px 12px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            View all <ChevronRight size={12} />
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: capturesColumns, gap: 14 }}>
          {RECENT_CAPTURES.map(({ id, icon: Icon, color, title, source, time, tags, thumbnail }) => (
            <div
              key={id}
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 12,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${color}40`;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 20px ${color}15`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ height: 90, overflow: 'hidden', position: 'relative' }}>
                <img
                  src={thumbnail}
                  alt={title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(to bottom, transparent 40%, rgba(5,5,15,0.9) 100%)`,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: `${color}25`,
                    border: `1px solid ${color}40`,
                    borderRadius: 6,
                    padding: '3px 7px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  <Icon size={11} color={color} />
                </div>
              </div>
              <div style={{ padding: '12px' }}>
                <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>
                  {title}
                </div>
                <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 8 }}>{source} · {time}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {tags.slice(0, 2).map(tag => (
                    <span
                      key={tag}
                      style={{
                        background: `${color}10`,
                        color: color,
                        border: `1px solid ${color}25`,
                        borderRadius: 4,
                        padding: '2px 6px',
                        fontSize: 10,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
