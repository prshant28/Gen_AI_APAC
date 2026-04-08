import { useState } from 'react';
import { Link } from 'react-router';
import {
  Database, CheckCircle, Clock, FolderOpen, Brain, Zap,
  ArrowUpRight, ChevronRight, Sparkles, BookOpen, Globe,
  Youtube, FileText, Mic, Play, Eye, TrendingUp, Layers
} from 'lucide-react';
import { useWindowSize } from '../hooks/useWindowSize';

const OVERVIEW_STATS = [
  {
    label: 'Total Sources Saved',
    value: '1,247',
    delta: '+32 this week',
    icon: Database,
    color: '#00d4ff',
    glow: 'rs-card-cyan',
    progress: 78,
  },
  {
    label: 'Sources Reviewed',
    value: '843',
    delta: '67.6% reviewed',
    icon: CheckCircle,
    color: '#10b981',
    glow: 'rs-card-green',
    progress: 67.6,
  },
  {
    label: 'Pending Sources',
    value: '404',
    delta: '12 high priority',
    icon: Clock,
    color: '#f59e0b',
    glow: '',
    progress: 32.4,
  },
  {
    label: 'Active Project',
    value: 'AGI Research',
    delta: '38 sources linked',
    icon: FolderOpen,
    color: '#8b5cf6',
    glow: 'rs-card-purple',
    progress: 85,
  },
];

const CONTINUE_LEARNING = [
  {
    id: 1,
    type: 'video',
    icon: Youtube,
    color: '#ff4444',
    title: 'Transformers Explained: Attention Mechanisms in Deep Learning',
    source: 'Andrej Karpathy',
    time: '35 min ago',
    progress: 62,
    tags: ['Transformers', 'Deep Learning'],
    thumbnail: 'https://images.unsplash.com/photo-1647356191320-d7a1f80ca777?w=400&q=80',
  },
  {
    id: 2,
    type: 'article',
    icon: Globe,
    color: '#00d4ff',
    title: 'Scaling Laws for Neural Language Models — Research Deep Dive',
    source: 'Anthropic Blog',
    time: '2h ago',
    progress: 30,
    tags: ['LLMs', 'Scaling'],
    thumbnail: 'https://images.unsplash.com/photo-1695391533460-67a12aa6b9d3?w=400&q=80',
  },
  {
    id: 3,
    type: 'paper',
    icon: FileText,
    color: '#f59e0b',
    title: 'Constitutional AI: Harmlessness from AI Feedback',
    source: 'arXiv • Bai et al. 2022',
    time: '5h ago',
    progress: 15,
    tags: ['Alignment', 'Safety'],
    thumbnail: 'https://images.unsplash.com/photo-1768724058913-35fe2fb844eb?w=400&q=80',
  },
  {
    id: 4,
    type: 'podcast',
    icon: Mic,
    color: '#8b5cf6',
    title: 'The Nature of Consciousness & Machine Sentience',
    source: 'Sean Carroll • Mindscape',
    time: '1d ago',
    progress: 88,
    tags: ['Consciousness', 'Philosophy'],
    thumbnail: 'https://images.unsplash.com/photo-1762279389083-abf71f22d338?w=400&q=80',
  },
  {
    id: 5,
    type: 'video',
    icon: Youtube,
    color: '#ff4444',
    title: 'Building AGI: Multi-Agent Systems & Emergent Behavior',
    source: 'Two Minute Papers',
    time: '2d ago',
    progress: 45,
    tags: ['AGI', 'Multi-Agent'],
    thumbnail: 'https://images.unsplash.com/photo-1756908992154-c8a89f5e517f?w=400&q=80',
  },
  {
    id: 6,
    type: 'article',
    icon: Globe,
    color: '#00d4ff',
    title: 'Reinforcement Learning from Human Feedback in Practice',
    source: 'OpenAI Research',
    time: '3d ago',
    progress: 0,
    tags: ['RLHF', 'Training'],
    thumbnail: 'https://images.unsplash.com/photo-1738707060236-42d641096f96?w=400&q=80',
  },
];

const QUICK_ACTIONS = [
  { label: 'Capture URL', icon: Globe, color: '#00d4ff', path: '/capture' },
  { label: 'Ask AI', icon: Sparkles, color: '#8b5cf6', path: '/assistant' },
  { label: 'Timeline', icon: Clock, color: '#10b981', path: '/timeline' },
  { label: 'Insights', icon: TrendingUp, color: '#f472b6', path: '/insights' },
];

const ACTIVE_PROJECTS = [
  { name: 'AGI Research', sources: 38, color: '#8b5cf6', progress: 85 },
  { name: 'ML Engineering', sources: 24, color: '#00d4ff', progress: 62 },
  { name: 'Philosophy of Mind', sources: 17, color: '#f472b6', progress: 43 },
];

function getTypeLabel(type: string) {
  switch (type) {
    case 'video': return 'Video';
    case 'article': return 'Article';
    case 'paper': return 'Paper';
    case 'podcast': return 'Podcast';
    default: return type;
  }
}

export function HomeDashboard() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const { isMobile, isTablet } = useWindowSize();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const statsColumns = isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';
  const mainColumns = isMobile || isTablet ? '1fr' : '1fr 320px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 28 }}>
      {/* Welcome Header */}
      <div className="fade-in-up">
        <div
          style={{
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'flex-start',
            justifyContent: 'space-between',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 12 : 0,
          }}
        >
          <div>
            <h1
              style={{
                color: '#fff',
                fontSize: isMobile ? 22 : 28,
                fontWeight: 700,
                margin: 0,
                letterSpacing: '-0.5px',
              }}
            >
              {greeting}, Alex
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, marginTop: 6, maxWidth: 480 }}>
              Your neural engine has processed{' '}
              <span style={{ color: '#00d4ff' }}>32 new sources</span> this week.
              You have <span style={{ color: '#f59e0b' }}>12 high-priority</span> items waiting.
            </p>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: 12,
              padding: '10px 18px',
              flexShrink: 0,
            }}
          >
            <Brain size={16} color="#8b5cf6" style={{ filter: 'drop-shadow(0 0 6px #8b5cf6)' }} />
            <div>
              <div style={{ color: '#8b5cf6', fontSize: 12, opacity: 0.8 }}>Active Project</div>
              <div style={{ color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>AGI Research</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        className="fade-in-up"
        style={{
          display: 'flex',
          gap: isMobile ? 8 : 10,
          flexWrap: 'wrap',
        }}
      >
        {QUICK_ACTIONS.map(({ label, icon: Icon, color, path }) => (
          <Link
            key={label}
            to={path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: isMobile ? '9px 14px' : '10px 18px',
              background: `${color}0a`,
              border: `1px solid ${color}25`,
              borderRadius: 10,
              color: color,
              fontSize: isMobile ? 12 : 13,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              flex: isMobile ? '1 1 calc(50% - 4px)' : '0 0 auto',
              justifyContent: isMobile ? 'center' : 'flex-start',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = `${color}18`;
              (e.currentTarget as HTMLAnchorElement).style.borderColor = `${color}40`;
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 0 20px ${color}15`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.background = `${color}0a`;
              (e.currentTarget as HTMLAnchorElement).style.borderColor = `${color}25`;
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
            }}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}
      </div>

      {/* Stats Cards */}
      <div
        className="fade-in-up"
        style={{ display: 'grid', gridTemplateColumns: statsColumns, gap: isMobile ? 10 : 16 }}
      >
        {OVERVIEW_STATS.map(({ label, value, delta, icon: Icon, color, glow, progress }) => (
          <div key={label} className={`rs-card ${glow}`} style={{ padding: isMobile ? 16 : 22, position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 120,
                height: 120,
                background: `radial-gradient(circle at top right, ${color}08, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: isMobile ? 10 : 16, position: 'relative' }}>
              <div
                style={{
                  width: isMobile ? 36 : 44,
                  height: isMobile ? 36 : 44,
                  borderRadius: 12,
                  background: `${color}12`,
                  border: `1px solid ${color}25`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={isMobile ? 16 : 20} color={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
              </div>
              <ArrowUpRight size={14} color={color} style={{ opacity: 0.5 }} />
            </div>
            <div style={{ color: '#fff', fontSize: isMobile ? 20 : 26, fontWeight: 700, letterSpacing: '-0.5px', position: 'relative' }}>
              {value}
            </div>
            <div style={{ color: '#6b7280', fontSize: isMobile ? 11 : 13, marginTop: 3 }}>{label}</div>
            <div
              style={{
                height: 3,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: 2,
                marginTop: 12,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                  borderRadius: 2,
                  boxShadow: `0 0 8px ${color}50`,
                  transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
            <div style={{ color: color, fontSize: 11, marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, opacity: 0.9 }}>
              <Zap size={10} />
              {delta}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: mainColumns, gap: 20 }}>
        {/* Continue Learning Section */}
        <div className="rs-card" style={{ padding: isMobile ? 16 : 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(0, 212, 255, 0.1)',
                  border: '1px solid rgba(0, 212, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <BookOpen size={17} color="#00d4ff" />
              </div>
              <div>
                <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: 0 }}>Continue Learning</h3>
                <p style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>Pick up where you left off</p>
              </div>
            </div>
            <Link
              to="/timeline"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                color: '#00d4ff',
                fontSize: 12,
                textDecoration: 'none',
                opacity: 0.8,
                flexShrink: 0,
              }}
            >
              View all <ChevronRight size={13} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {CONTINUE_LEARNING.map((item) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: isMobile ? 10 : 14,
                  padding: isMobile ? 10 : 12,
                  borderRadius: 12,
                  background: hoveredCard === item.id ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${hoveredCard === item.id ? `${item.color}30` : 'rgba(255,255,255,0.05)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.25s ease',
                  boxShadow: hoveredCard === item.id ? `0 0 20px ${item.color}10` : 'none',
                }}
                onMouseEnter={() => setHoveredCard(item.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: isMobile ? 64 : 80,
                    height: isMobile ? 48 : 60,
                    borderRadius: 8,
                    overflow: 'hidden',
                    position: 'relative',
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(135deg, ${item.color}30, transparent)`,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: hoveredCard === item.id ? 1 : 0,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: `${item.color}dd`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {item.type === 'video' || item.type === 'podcast' ? (
                        <Play size={10} color="#fff" style={{ marginLeft: 1 }} />
                      ) : (
                        <Eye size={10} color="#fff" />
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 3,
                      left: 3,
                      background: `${item.color}cc`,
                      borderRadius: 3,
                      padding: '1px 5px',
                      fontSize: 8,
                      color: '#fff',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {getTypeLabel(item.type)}
                  </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: '#e2e8f0',
                      fontSize: isMobile ? 12 : 13,
                      fontWeight: 600,
                      lineHeight: 1.35,
                      marginBottom: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 11, marginBottom: 8 }}>
                    {item.source} · {item.time}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div
                      style={{
                        flex: 1,
                        height: 3,
                        background: 'rgba(255,255,255,0.06)',
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${item.progress}%`,
                          background: item.progress === 0
                            ? 'transparent'
                            : `linear-gradient(90deg, ${item.color}88, ${item.color})`,
                          borderRadius: 2,
                          boxShadow: item.progress > 0 ? `0 0 6px ${item.color}40` : 'none',
                        }}
                      />
                    </div>
                    <span style={{ color: '#4b5563', fontSize: 10, flexShrink: 0 }}>
                      {item.progress === 0 ? 'New' : `${item.progress}%`}
                    </span>
                  </div>
                </div>

                {/* Tags — hide on mobile to save space */}
                {!isMobile && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end', flexShrink: 0 }}>
                    {item.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          background: `${item.color}0d`,
                          color: item.color,
                          border: `1px solid ${item.color}20`,
                          borderRadius: 4,
                          padding: '2px 7px',
                          fontSize: 10,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Neural Recall Score */}
          <div className="rs-card rs-card-cyan" style={{ padding: isMobile ? 16 : 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <Sparkles size={16} color="#00d4ff" />
              <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0 }}>Neural Recall Score</h3>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <div style={{ position: 'relative', width: 120, height: 120 }}>
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                  <circle
                    cx="60" cy="60" r="50"
                    fill="none"
                    stroke="url(#scoreGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${94 * 3.14} ${100 * 3.14}`}
                    transform="rotate(-90 60 60)"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.5))' }}
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00d4ff" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ color: '#fff', fontSize: 32, fontWeight: 700, lineHeight: 1 }}>94</span>
                  <span style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>out of 100</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Retention Rate', value: '96%', color: '#10b981' },
                { label: 'Source Diversity', value: '82%', color: '#f59e0b' },
                { label: 'Review Frequency', value: '91%', color: '#8b5cf6' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>{item.label}</span>
                  <span style={{ color: item.color, fontSize: 12, fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Projects */}
          <div className="rs-card" style={{ padding: isMobile ? 16 : 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={15} color="#8b5cf6" />
                <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 600, margin: 0 }}>Active Projects</h3>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ACTIVE_PROJECTS.map(project => (
                <div key={project.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: '#d1d5db', fontSize: 13 }}>{project.name}</span>
                    <span style={{ color: '#6b7280', fontSize: 11 }}>{project.sources} sources</span>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${project.progress}%`,
                        background: `linear-gradient(90deg, ${project.color}88, ${project.color})`,
                        borderRadius: 2,
                        boxShadow: `0 0 6px ${project.color}40`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Streak */}
          <div
            className="rs-card"
            style={{
              padding: isMobile ? 16 : 22,
              background: 'linear-gradient(135deg, rgba(139,92,246,0.06), rgba(0,212,255,0.04))',
              border: '1px solid rgba(139,92,246,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #f59e0b, #f97316)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(245,158,11,0.4)',
                  flexShrink: 0,
                }}
              >
                <Zap size={18} color="#fff" />
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, lineHeight: 1 }}>14 days</div>
                <div style={{ color: '#f59e0b', fontSize: 11, marginTop: 2 }}>Learning Streak</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
              {Array.from({ length: 14 }).map((_, i) => (
                <div
                  key={`streak-${i}`}
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: 'linear-gradient(90deg, #f59e0b, #f97316)',
                    boxShadow: '0 0 4px rgba(245,158,11,0.4)',
                  }}
                />
              ))}
            </div>
            <p style={{ color: '#9ca3af', fontSize: 11, marginTop: 10 }}>
              Keep going! You're in the top 5% of RecallSense users.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
